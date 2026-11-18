import { STEP } from './config.js';
import { buyUpgrade, startMission, targetForMission } from './missions.js';
import { addWanted, spawnPoliceUnit } from './police.js';
import { WATER_X, districtAt } from './city.js';
import { makeCar } from './traffic.js';
import { SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE } from './render.js';
function scriptedInput() {
  const pressed = new Set();
  const state = { mx: 0, my: 0, shoot: false, mouseX: 640, mouseY: 400 };
  return {
    mouse: { x: 640, y: 400, down: false, clicked: false },
    moveX() { return state.mx; },
    moveY() { return state.my; },
    run() { return false; },
    shootHeld() { return state.shoot; },
    wasPressed(action) { return pressed.has(action); },
    setMove(x, y) { state.mx = x; state.my = y; },
    setShoot(value) { state.shoot = value; },
    setMouse(x, y) { state.mouseX = x; state.mouseY = y; this.mouse.x = x; this.mouse.y = y; },
    press(action) { pressed.add(action); },
    clearPresses() { pressed.clear(); },
  };
}
function driveEastFor(world, input, seconds) {
  const view = { w: 1280, h: 800 };
  for (let i = 0; i < seconds / STEP; i += 1) {
    const p = world.state.player;
    if (p.inCar && p.car) {
      const targetY = world.state.city.roadsH.reduce((a, b) => (Math.abs(b - p.car.y) < Math.abs(a - p.car.y) ? b : a));
      input.setMove(p.car.y > targetY + 6 ? -1 : p.car.y < targetY - 6 ? 1 : 0, -1);
    } else {
      input.setMove(0, 0);
    }
    world.step(STEP, input, view);
    input.clearPresses();
  }
}
function driveBoatNorthFor(world, input, seconds) {
  const view = { w: 1280, h: 800 };
  for (let i = 0; i < seconds / STEP; i += 1) {
    input.setMove(0, -1);
    world.step(STEP, input, view);
    input.clearPresses();
  }
}
function walkFor(world, input, seconds, dx, dy) {
  const view = { w: 1280, h: 800 };
  for (let i = 0; i < seconds / STEP; i += 1) {
    input.setMove(dx, dy);
    world.step(STEP, input, view);
    input.clearPresses();
  }
}
function placePlayerInCar(world, x, y, angle) {
  const car = world.state.traffic.parked[0];
  car.x = x;
  car.y = y;
  car.angle = angle;
  car.speed = 0;
  car.color = '#e33e5f';
  car.staged = true; // round 21: the hero car must never be re-staged as a parked car
  world.enterCar(car);
  world.state.player.x = x;
  world.state.player.y = y;
}
function placePlayerOnFoot(world, x, y) {
  const p = world.state.player;
  p.x = x;
  p.y = y;
  p.inCar = false;
  p.car = null;
  p.health = 100;
  world.state.camera.x = x;
  world.state.camera.y = y;
}
function stageHeat(world) {
  const state = world.state;
  const d = districtAt(state.city, state.player.x, state.player.y);
  state.heat[state.city.districts.indexOf(d)] = Math.round(state.wanted) * 10;
  state.police.spawnTimer = 1.2;
}
function stageTrafficCar(world, axis, road, at, dir, speed) {
  const car = world.state.traffic.cars.find((c) => !c.staged);
  if (!car) return;
  car.staged = true;
  car.axis = axis;
  car.road = road;
  car.dir = dir;
  car.speed = speed;
  car.cruise = speed;
  if (axis === 'h') {
    car.x = at;
    car.y = road + (dir > 0 ? 18 : -18);
    car.angle = dir > 0 ? 0 : Math.PI;
  } else {
    car.x = road + (dir > 0 ? 18 : -18);
    car.y = at;
    car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  }
}
function stagePed(world, x, y) {
  const ped = world.state.peds.find((p) => p.alive && !p.staged);
  if (!ped) return;
  ped.staged = true;
  ped.x = x;
  ped.y = y;
  ped.flee = 0;
  ped.photo = 0;
}
function setLight(world, daylight) {
  world.state.daylight = daylight;
  world.state.daylightManual = true;
}
function stagePhotoPeds(world, spots) {
  const state = world.state;
  let placed = 0;
  for (const ped of state.peds) {
    if (!ped.alive || placed >= spots.length) continue;
    const s = spots[placed];
    ped.x = s.x;
    ped.y = s.y;
    ped.angle = Math.atan2(state.player.y - s.y, state.player.x - s.x);
    ped.photo = 3;
    ped.flashTimer = 0.15;
    placed += 1;
  }
  for (const s of spots) {
    state.particles.push({
      x: s.x + 16, y: s.y - 8, vx: 0, vy: 0,
      life: 0.25, maxLife: 0.25, size: 10, color: '#ffffff', kind: 'flash',
    });
  }
}
export function stageShot(name, world) {
  const state = world.state;
  const input = scriptedInput();
  world.reset();
  state.view3d = false; // staged shots are 2D top-down unless the scene says otherwise
  state.cash = 2150;
  if (name === 'title3d') {
    state.titleT3d = 6;
    return { screen: SCREEN_TITLE, best: state.cash };
  } else if (name === 'explosion') {
    setLight(world, 0.9);
    state.zoom = 1.25; state.zoomLock = true;
    placePlayerOnFoot(world, 820, 1520);
    state.mission.done = true;
    state.peds.length = 0;
    for (const car of state.traffic.cars) car.alive = false;
    const h = state.hydrants[0];
    const car = state.traffic.cars[0];
    Object.assign(car, { x: h.x - 2, y: h.y, speed: 100, alive: true, kind: 'traffic' });
    walkFor(world, input, 0.02, 0, 0);
    car.alive = false;
    const pump = state.gasStation.pumps[0];
    state.bullets.push({ x: pump.x - 20, y: pump.y, vx: 760, vy: 0, life: 1, damage: 1, hostile: false });
    walkFor(world, input, 0.55, 0, 0);
    stageHeat(world);
  } else if (name === 'chase' || name === 'chase3d') {
    setLight(world, name === 'chase3d' ? 0.45 : 0.18);
    // chase3d: start just west of the 1440 cross street and drive only a
    // little, so the camera ends up INSIDE the intersection gap — the road
    // opens to the sun instead of the flanking walls looming over the lens
    placePlayerInCar(world, name === 'chase3d' ? 1400 : 800, 1120, 0);
    world.state.player.car.speed = 420;
    for (const car of state.traffic.cars) {
      if (car.axis === 'h' && car.road === 1120 && car.x > 700 && car.x < 1750) {
        car.road = 800;
        car.y = 800 + (car.dir > 0 ? 18 : -18);
      }
    }
    startMission(state, 4);
    state.mission.stage = 1;
    state.mission.target = targetForMission(state.city, 4, 1);
    state.blackout.active = false;
    state.mission.dialogue = ['MARA: Ledger is ours — run it to the lighthouse!'];
    state.mission.dialogueTimer = 30;
    driveEastFor(world, input, name === 'chase3d' ? 0.35 : 1.2);
    addWanted(state, Math.max(0, 3 - state.wanted));
    for (let i = 0; i < 3; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'car', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.car.x = state.player.x - 460 - i * 140;
      unit.car.y = 1120 + (i % 2 === 0 ? 18 : -18);
      unit.car.angle = 0;
      unit.car.speed = 340;
    }
    driveEastFor(world, input, name === 'chase3d' ? 0.05 : 0.3);
    stageHeat(world);
    if (name === 'chase3d') {
      // chase-cam looks forward: the pursuit must be IN frame — one unit
      // ahead in the same lane, one oncoming, one traffic car for depth
      const px = state.player.x;
      const u1 = state.police.units[state.police.units.length - 2];
      if (u1) { u1.car.x = px + 300; u1.car.y = 1120 - 18; u1.car.angle = 0; u1.car.speed = 320; }
      const u2 = state.police.units[state.police.units.length - 1];
      if (u2) { u2.car.x = px + 460; u2.car.y = 1120 + 18; u2.car.angle = Math.PI; u2.car.speed = 300; }
      stageTrafficCar(world, 'h', 1120, px + 200, 1, 110);
      // round 21: more traffic ahead for depth + 2 parked cars at the curb
      stageTrafficCar(world, 'h', 1120, px + 520, -1, 110);
      stageTrafficCar(world, 'h', 1120, px + 700, 1, 100);
      // JF4: parked at ±36, not ±44 — a 22-wide car centred at ±44 sinks
      // 5px into the building face (face at ±50, probe: chase3d seed 7).
      // At ±36 the outer edge stops 3px short of the face.
      const parkSpots = [[px + 260, 1120 - 36], [px + 430, 1120 + 36]];
      for (const [ppx, ppy] of parkSpots) {
        const parked = state.traffic.parked.find((c) => !c.staged && c !== state.player.car);
        if (!parked) break;
        parked.staged = true;
        parked.x = ppx; parked.y = ppy; parked.angle = 0;
        parked.speed = 0; parked.alive = true;
      }
    }
    const cp = world.state.player;
    stagePhotoPeds(world, [
      { x: cp.x + 120, y: 1120 - 48 },
      { x: cp.x + 260, y: 1120 + 48 },
    ]);
    if (name === 'chase3d') state.view3d = true;
  } else if (name === 'mission') {
    setLight(world, 0.9);
    state.zoom = 1.5;
    state.zoomLock = true;
    placePlayerOnFoot(world, 1280, 1120);
    startMission(state, 4);
    state.mission.dialogueTimer = 30;
    stageTrafficCar(world, 'h', 1120, 1000, 1, 130);
    stageTrafficCar(world, 'h', 1120, 1560, -1, 120);
    stageTrafficCar(world, 'v', 1440, 860, 1, 110);
    stagePed(world, 1180, 1092);
    stagePed(world, 1400, 1148);
    stagePed(world, 1080, 1148);
    walkFor(world, input, 0.3, 1, 0);
  } else if (name === 'police') {
    setLight(world, 0.5);
    state.zoom = 1.0;
    state.zoomLock = true;
    placePlayerInCar(world, 1700, 800, 0);
    state.mission.done = true;
    state.police.strips.push({ x: 1900, y: 800, angle: Math.PI / 2, life: 20 });
    driveEastFor(world, input, 1.0);
    addWanted(state, Math.max(0, 6 - state.wanted));
    const px = state.player.x;
    state.police.strips.push({ x: px + 380, y: 800, angle: Math.PI / 2, life: 20 });
    for (let i = 0; i < 2; i += 1) {
      const car = makeCar(px + 300 + (i === 0 ? -26 : 26), 800 + (i === 0 ? -20 : 20), Math.PI / 2 + (i === 0 ? 0.5 : -0.5), '#6b6f75', 'police', 'van');
      car.speed = 0;
      car.concrete = true;
      car.roadblock = true;
      state.police.units.push({ kind: 'car', car, health: 3, ramTimer: 0, roadblock: true, static: true, concrete: true });
    }
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'mtruck', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.car.x = i === 0 ? px + 180 : px - 220;
      unit.car.y = 800 + (i === 0 ? -18 : 18);
      unit.car.angle = 0;
      unit.car.speed = 300;
    }
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'soldier', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.x = px + 240 + i * 30;
      unit.y = 800 + (i === 0 ? -18 : 18);
    }
    driveEastFor(world, input, 0.2);
    stageHeat(world);
    const pp = world.state.player;
    stagePhotoPeds(world, [
      { x: pp.x - 120, y: 800 - 48 },
      { x: pp.x + 90, y: 800 + 48 },
    ]);
  } else if (name === 'storm') {
    setLight(world, 0.35);
    state.zoom = 1.1;
    state.zoomLock = true;
    placePlayerInCar(world, 800, 1120, 0);
    world.state.player.car.speed = 320;
    state.mission.done = true;
    stageTrafficCar(world, 'h', 1120, 1150, 1, 110);
    driveEastFor(world, input, 0.15);
    const sp = world.state.player;
    state.weather = { rain: true, timer: 0, duration: 25, storm: true, heavy: true, bolt: null, boltTimer: 5, flash: 2, thunderIn: 0.5 };
    const bx = sp.x + 60;
    const by = sp.y - 40;
    const pts = [{ x: bx, y: by - 280 }];
    for (let i = 1; i < 6; i += 1) pts.push({ x: bx + (i % 2 === 0 ? 14 : -14), y: by - 280 + (280 * i) / 6 });
    pts.push({ x: bx, y: by });
    state.weather.bolt = { x: bx, y: by, points: pts };
    for (let i = 0; i < 80; i += 1) {
      state.rainDrops.push({
        x: sp.x - 600 + ((i * 37) % 1200),
        y: sp.y - 400 + ((i * 53) % 800),
        speed: 800,
      });
    }
    state.mission.dialogue = ['HEAVY RAIN — roads are slick. Easy on the wheel.'];
    state.mission.dialogueTimer = 30;
    state.floaters.push({ x: bx, y: by - 30, value: 'LIGHTNING STRIKE!', color: '#ffd23e', life: 1.4 });
  } else if (name === 'armored') {
    setLight(world, 0.9);
    state.zoom = 1.2;
    state.zoomLock = true;
    placePlayerInCar(world, 900, 1120, 0);
    state.mission.done = true;
    const truck = makeCar(1150, 1120, 0, '#4a5240', 'armored', 'van');
    truck.hp = 0;
    truck.looted = true;
    truck.speed = 0;
    state.armored.truck = truck;
    state.cash = 2150 + 350;
    state.floaters.push({ x: 1150, y: 1090, value: '+$350', color: '#7be382', life: 1.4 });
    state.mission.dialogue = ['ARMORED TRUCK CRACKED — $350 haul. The heat is on you now.'];
    state.mission.dialogueTimer = 30;
    state.wanted = 1;
    stageHeat(world);
  } else if (name === 'pizza') {
    setLight(world, 0.85);
    state.zoom = 1.1;
    state.zoomLock = true;
    placePlayerInCar(world, 1000, 800, 0);
    state.mission.done = true;
    state.pizza.state = 'deliver';
    state.pizza.dest = { x: 1440, y: 800 };
    state.pizza.timer = 42;
    state.mission.dialogue = ['PIZZA: Hot box in hand — deliver it in 60s for $150.'];
    state.mission.dialogueTimer = 30;
    stageTrafficCar(world, 'h', 800, 1250, 1, 100);
  } else if (name === 'nightrace') {
    setLight(world, 0.15);
    state.zoom = 1.1;
    state.zoomLock = true;
    state.cash = 500;
    state.mission.done = true;
    placePlayerInCar(world, state.city.roadsV[4], state.city.roadsH[1], 0);
    world.step(STEP, input, { w: 1280, h: 800 });
    state.mission.dialogueTimer = 30;
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
  } else if (name === 'boat' || name === 'boat3d') {
    setLight(world, 0.8);
    state.clock.total = 2 * 1440 + 5 * 60 + 40;
    state.cash = 3470;
    state.zoom = 1.4;
    state.zoomLock = true;
    const boat = state.boats[2];
    boat.x = WATER_X + 40;
    boat.y = 1200;
    boat.angle = -Math.PI / 2;
    boat.speed = 0;
    placePlayerOnFoot(world, WATER_X - 18, 1200);
    input.press('interact');
    world.step(STEP, input, { w: 1280, h: 800 });
    input.clearPresses();
    state.player.boat.speed = 520;
    startMission(state, 11);
    state.mission.dialogue = ['MARA: Dawn run — take the boat to the marina and we are kings of the harbor!'];
    state.mission.dialogueTimer = 30;
    addWanted(state, 4);
    spawnPoliceUnit(state.police, state.player, state.rng, 'boat', state.city);
    const pursuit = state.police.units[state.police.units.length - 1];
    pursuit.x = state.player.x;
    pursuit.y = state.player.y + 120;
    pursuit.angle = -Math.PI / 2;
    pursuit.speed = 560;
    driveBoatNorthFor(world, input, 1.5);
    state.police.heli.orbit = Math.PI;
    state.police.heli.x = state.player.x - 190;
    state.police.heli.y = state.player.y;
    stageHeat(world);
    if (name === 'boat3d') {
      // round 20: chase-cam looks forward, so the pursuit must be IN
      // frame — the police boat staged behind the hero sits behind the
      // camera, and the heli staged 190 px west is outside the field of
      // view. Put the police boat ahead in the water strip and the heli
      // ahead-right in the sky (same trick as the chase3d staging above).
      state.view3d = true;
      const px = state.player.x, py = state.player.y;
      pursuit.x = px + 35; pursuit.y = py - 220; pursuit.angle = -Math.PI / 2; pursuit.speed = 480;
      state.police.heli.x = px + 60; state.police.heli.y = py - 450;
    }
  } else if (name === 'takeoff') {
    // misi 13: HA-1 di landasan 09 saat sunset, chase-cam 3D
    // FIX v2 (STATUS-R25 §6): startMission(state, 12) — startMission(world, 12)
    // crash karena createWorld tidak punya .mission/.city (milik state).
    setLight(world, 0.45);
    state.mission.index = 12;
    startMission(state, 12);
    const pl = state.space.plane;
    const p = state.player;
    p.inPlane = true; p.plane = pl;
    pl.x = 2260; pl.y = 660; pl.angle = -Math.PI / 2; pl.speed = 120; pl.alt = 0; pl.throttle = 1;
    // VB-33 (staging-misc): alt was 15 while the plane sits on the runway
    // — HUD read "ALT 15 m" for a parked plane. The game's own physics
    // wants alt 0 at this speed (space.js wantAlt = 0 below 200 km/h), and
    // the plane visually never left the tarmac, so stage alt 0.
    state.mission.stage = 2;
    state.mission.dialogueTimer = 0; // hide the Mara dialog for this hero shot
    state.wanted = 0;
    state.view3d = true;
    state.camera.x = pl.x; state.camera.y = pl.y;
  } else if (name === 'planehigh') {
    // R25 candidate: HA-1 high over the harbor at sunset (alt 340 m) — the
    // plane reads big against the sky, skyline silhouette below. Test scene
    // only — NOT in take-shots.mjs, never a dossier shot. (T2's 6-plane-high
    // proved the framing; this re-shoots it with the fixed HUD position.)
    setLight(world, 0.45);
    state.mission.index = 12;
    startMission(state, 12);
    const pl = state.space.plane;
    const p = state.player;
    p.inPlane = true; p.plane = pl;
    pl.x = 2260; pl.y = 620; pl.angle = -Math.PI / 2; pl.speed = 560; pl.alt = 340; pl.throttle = 1;
    state.mission.stage = 2;
    state.wanted = 0;
    state.view3d = true;
    state.camera.x = pl.x; state.camera.y = pl.y;
  } else if (name === 'jets') {
    // R25 visual check: HAF military jets at 6 stars, 3D chase view.
    // Test scene only — NOT in take-shots.mjs, never a dossier shot.
    // Jets fly at the hero plane's altitude in 3D (city3d.js:1092), so they
    // are staged ahead of the hero, in frame (spawnJet puts them 520 px
    // away in a random direction — usually behind the camera).
    setLight(world, 0.45);
    state.mission.index = 12;
    startMission(state, 12);
    const pl = state.space.plane;
    const p = state.player;
    p.inPlane = true; p.plane = pl;
    pl.x = 2260; pl.y = 720; pl.angle = -Math.PI / 2; pl.speed = 350; pl.alt = 150; pl.throttle = 1;
    state.mission.stage = 2;
    state.wanted = 6;
    state.view3d = true;
    state.camera.x = pl.x; state.camera.y = pl.y;
    // JETFIX v2: jets staged CLOSER (fwd ~14-17 units instead of ~30-40)
    // — at 30+ units a jet is ~65 px wide and its fins/wings/nozzles are
    // 2-3 px: it reads as a dark box. At ~15 units it is ~130 px wide and
    // the plane shape reads. Geometry is correct for a chase: the jets are
    // pursuing from behind-below the hero (south of it, nearer the camera).
    // Both stay above the Mara dialog box (y < 554) and clear of the
    // "MILITARY JETS INBOUND" pill (y 380-408).
    // Angle -PI/2 (north, same as the hero): the old PI/2 faced the jets
    // head-on at the camera, so only a small cross read. From behind, the
    // swept fins + nozzle rings + nav lights (the plane3d rear work) read.
    // JETFIX-3 (VB-08): jet 2 was 80 px west of the hero (~20 units from
    // the camera) — too far/small, it read as a dark block. Pulled to 55 px
    // west so both jets are big enough to read as planes.
    state.space.jets.push(
      { x: pl.x - 28, y: pl.y - 25, angle: -Math.PI / 2, speed: 560, fireTimer: 1 },
      { x: pl.x - 55, y: pl.y + 5, angle: -Math.PI / 2, speed: 560, fireTimer: 1 },
    );
  } else if (name === 'blackout') {
    setLight(world, 0.05);
    state.clock.total = 1 * 1440 + 23 * 60 + 40;
    state.zoom = 1.5;
    state.zoomLock = true;
    const vault = state.city.casino;
    placePlayerOnFoot(world, vault.x - 100, vault.y + 130);
    startMission(state, 4);
    state.mission.dialogue = ['MARA: I cut the power to the district. Grab the ledger — the vault is dark, the cops are blind.'];
    state.mission.dialogueTimer = 30;
    addWanted(state, 4);
    const gunSpots = [
      [state.city.roadsV[3], vault.y + 40],
      [vault.x + 50, state.city.roadsH[3] + 32],
    ];
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'gunman', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.x = gunSpots[i][0];
      unit.y = gunSpots[i][1];
    }
    input.setMouse(900, 400);
    input.setShoot(true);
    walkFor(world, input, 1.4, 0, 0);
    if (!state.events.muzzle) {
      const p = state.player;
      state.events.muzzle = {
        x: p.x + Math.cos(p.angle) * 22,
        y: p.y + Math.sin(p.angle) * 22,
        angle: p.angle,
      };
    }
    state.wanted = 4;
    stageHeat(world);
    // VB-38 (staging-misc): the lower-left quadrant (screen 0-300, 500-750)
    // reads as empty dark asphalt — the only world in it is one dark
    // building + a road, and the HUD boxes cover the rest. Two cops
    // searching the block fill it: a foot cop on the sidewalk north of the
    // building (screen ~250,508, P badge above) + a gunman south of it
    // (screen ~220,696, red alert dot). Placed AFTER walkFor + stageHeat
    // so the sim never moves them and nothing else in the shot shifts.
    const quadSpots = [
      ['foot', 920, 1162],
      ['gunman', 900, 1287],
    ];
    for (const [kind, qx, qy] of quadSpots) {
      spawnPoliceUnit(state.police, state.player, state.rng, kind, state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.x = qx;
      unit.y = qy;
    }
  } else if (name === 'shop' || name === 'shopclosed') {
    setLight(world, 0.9);
    state.cash = 2150;
    if (name === 'shopclosed') state.heat[0] = 70;
    const g = state.city.garage;
    placePlayerOnFoot(world, g.x, g.y);
    state.camera.x = g.x;
    state.camera.y = g.y;
    if (name === 'shop') buyUpgrade(state, 'turbo');
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
    return { screen: SCREEN_SHOP, best: state.cash, ui: { shopIndex: 2, stationName: 'Harbor FM' } };
  } else {
    setLight(world, 0.85);
    state.zoom = 1.7;
    state.zoomLock = true;
    placePlayerOnFoot(world, 1120, 1120);
    state.mission.done = true;
    state.cash = 120;
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'gunman', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.x = i === 0 ? 1120 : 1290;
      unit.y = i === 0 ? 1000 : 1152;
    }
    stagePed(world, 1000, 1080);
    stagePed(world, 1240, 1240);
    const parked = world.state.traffic.parked.find((c) => !c.staged);
    if (parked) {
      parked.staged = true;
      parked.x = 1450;
      parked.y = 1120;
      parked.angle = 0;
    }
    input.setMouse(900, 400);
    input.setShoot(true);
    walkFor(world, input, 1.4, 0, 0);
    if (!state.events.muzzle) {
      const p = state.player;
      state.events.muzzle = {
        x: p.x + Math.cos(p.angle) * 22,
        y: p.y + Math.sin(p.angle) * 22,
        angle: p.angle,
      };
    }
  }
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
  return { screen: SCREEN_PLAY, best: state.cash };
}
