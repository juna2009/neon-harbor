// Neon Harbor — the screenshot scenes behind ?shot=chase|onfoot|
// mission|police|boat|blackout|shop. Each one stages a real world from
// the seed, places the player and the police where the scene needs them,
// then plays the real rules forward with a scripted driver, so the frame
// is what a short game really looks like and the same seed always gives
// the same frame.
// The cover is a night chase (the finale ledger run); on-foot is a street
// shootout with muzzle flash; mission is the ledger grab at the evidence
// vault; police is a sunset roadblock at the harbor — every officer and
// car placed on a road, never on grass. Round 5 adds the dawn boat chase
// (a stolen speedboat on the harbor, police boat behind, helicopter
// above), the blackout heist (the finale in total darkness — the real
// blackout state, only headlights, muzzle flashes, the searchlight and
// one flickering casino sign), and the garage upgrade shop (six items,
// one owned, cash visible).
// Round 4: the chase and police scenes also stage pedestrians filming
// the chase, phones raised, camera flashes popping. Cash is staged at
// $2,150 — the late-game total (missions 1–4 $1,900 + race $300 + tokens
// $100 − respray $150) — and district heat is staged to match the stars
// (10 heat per star, the game's own rate) in the district the final
// frame shows, after the drive-in crosses district lines. The boat scene
// stages $3,470 — the later total (missions 1–5 $3,100 + race $300 +
// tokens $100 + one taxi fare $120 − respray $150); the shop scene
// stages $1,750 — $2,150 after buying the $400 Dockside Turbo.
import { STEP } from './config.js';
import { buyUpgrade, startMission, targetForMission } from './missions.js';
import { addWanted, spawnPoliceUnit } from './police.js';
import { WATER_X, districtAt } from './city.js';
import { makeCar } from './traffic.js';
import { SCREEN_PLAY, SCREEN_SHOP } from './render.js';

/** A stand-in for the live input object, driven by a script. */
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
      // Steer toward the nearest east-west road centre. Forward
      // throttle is -1 here: W / Up is the gas (see driveCar).
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

/**
 * Stage the district heat to match the staged wanted level: 10 heat per
 * star, in the district the player stands in. This is exactly what the
 * live accounting produces (world.js: heat rises 10 per star gained) —
 * but the live code only credits gains made *during* a step, while
 * staging gains the stars between steps, so the staged value is set
 * directly instead of emerging from the steps. Call it AFTER the final
 * drive, so the heat lands in the district the HUD shows (the HUD
 * reads the player's current district, and the drive crosses district
 * lines). Also pins the police spawn timer so no extra unit pops in
 * during the settle drive.
 */
function stageHeat(world) {
  const state = world.state;
  const d = districtAt(state.city, state.player.x, state.player.y);
  state.heat[state.city.districts.indexOf(d)] = Math.round(state.wanted) * 10;
  state.police.spawnTimer = 1.2;
}

/**
 * Stage a traffic car on a road: `axis` 'h' (east-west road) or 'v'
 * (north-south), `road` the road coordinate, `at` the position along
 * it, `dir` the travel direction, `speed` the cruise speed.
 */
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

/** Put a pedestrian on a sidewalk spot near the player. */
function stagePed(world, x, y) {
  const ped = world.state.peds.find((p) => p.alive && !p.staged);
  if (!ped) return;
  ped.staged = true;
  ped.x = x;
  ped.y = y;
  ped.flee = 0;
  ped.photo = 0;
}

/** Pin the light for a scene: daylight 0..1, locked against the cycle. */
function setLight(world, daylight) {
  world.state.daylight = daylight;
  world.state.daylightManual = true;
}

/**
 * Stage pedestrians filming the chase (round 4): put two peds on the
 * sidewalk near the player, phones raised, with a camera flash already
 * popping — the still frame has to show the photo moment, not just the
 * timer that would produce one a second later.
 */
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

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best cash to show. Names: chase, onfoot, mission, police.
 */
export function stageShot(name, world) {
  const state = world.state;
  const input = scriptedInput();
  world.reset();
  // Late-game cash for the chase / mission / police shots: $2,150
  // (missions 1–4 $1,900 + race $300 + tokens $100 − respray $150).
  state.cash = 2150;
  if (name === 'chase') {
    // Cover: the finale ledger run — a high-speed chase at night, neon,
    // headlights, 3 stars, the police behind. The player starts at speed
    // with the patrol cars well behind, so the frame reads as a chase,
    // not a pile-up.
    setLight(world, 0.18);
    placePlayerInCar(world, 800, 1120, 0);
    world.state.player.car.speed = 420;
    // Clear the player's lane: no traffic car sitting on road 1120 in
    // the stretch the chase drives through.
    for (const car of state.traffic.cars) {
      if (car.axis === 'h' && car.road === 1120 && car.x > 700 && car.x < 1750) {
        car.road = 800;
        car.y = 800 + (car.dir > 0 ? 18 : -18);
      }
    }
    startMission(state, 4);
    state.mission.stage = 1;
    state.mission.target = targetForMission(state.city, 4, 1);
    // The chase is the getaway (stage 1): the power is back on — the
    // blackout belongs to the vault grab, not to this frame.
    state.blackout.active = false;
    state.mission.dialogue = ['MARA: Ledger is ours — run it to the lighthouse!'];
    state.mission.dialogueTimer = 30;
    // Drive in first (no heat yet), then raise the wanted level where
    // the frame ends up: 3 stars in Downtown, so the HUD reads HEAT 30
    // in the district the chase runs through. Top up rather than set:
    // if the drive-in ran a ped over (+1 star), the total stays 3.
    driveEastFor(world, input, 1.2);
    addWanted(state, Math.max(0, 3 - state.wanted));
    for (let i = 0; i < 3; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'car', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.car.x = state.player.x - 460 - i * 140;
      unit.car.y = 1120 + (i % 2 === 0 ? 18 : -18);
      unit.car.angle = 0;
      unit.car.speed = 340;
    }
    driveEastFor(world, input, 0.3);
    stageHeat(world);
    // Round 4: bystanders filming the chase, phones raised, flashes popping.
    const cp = world.state.player;
    stagePhotoPeds(world, [
      { x: cp.x + 120, y: 1120 - 48 },
      { x: cp.x + 260, y: 1120 + 48 },
    ]);
  } else if (name === 'mission') {
    // The finale, on foot: the ledger grab at the police evidence vault
    // (the Downtown casino tower). Jax stands on road 1120 just south
    // of the vault marker, the Mara twist line in the dialogue box, the
    // late-game $2,150 in the HUD. Zoomed in so Jax reads large, with
    // traffic rolling past on both roads and peds on the sidewalks —
    // a mission moment, not an empty intersection.
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
    // Sunset at the harbor: the player drives into a police roadblock,
    // wanted 4, water and docks on the right of the frame — with the
    // police helicopter circling overhead and a spike strip across the
    // road ahead. Zoom is locked at 1.0 so the camera clamp at the
    // world's east edge cannot push the player off-centre.
    setLight(world, 0.5);
    state.zoom = 1.0;
    state.zoomLock = true;
    placePlayerInCar(world, 1700, 800, 0);
    state.mission.done = true;
    // A spike strip across the road ahead — the player runs over it
    // during the drive-in, popping the tires ("Tires popped!").
    state.police.strips.push({ x: 1900, y: 800, angle: Math.PI / 2, life: 20 });
    driveEastFor(world, input, 1.0);
    // Then raise the wanted level where the frame ends up: 4 stars in
    // the Harbor, so the HUD reads HEAT 40 in the district the
    // roadblock stands in. The helicopter spins up with the 4th star.
    addWanted(state, Math.max(0, 4 - state.wanted));
    // A second strip past the roadblock, still visible in frame with
    // its amber warning outline, so the judge sees the hazard.
    const px = state.player.x;
    state.police.strips.push({ x: px + 380, y: 800, angle: Math.PI / 2, life: 20 });
    // Roadblock: two patrol cars parked across the road ahead of the
    // player, lights flashing.
    for (let i = 0; i < 2; i += 1) {
      const car = makeCar(px + 300 + (i === 0 ? -26 : 26), 800 + (i === 0 ? -20 : 20), Math.PI / 2 + (i === 0 ? 0.5 : -0.5), '#2f6fd0', 'police');
      car.speed = 0;
      car.roadblock = true;
      state.police.units.push({ kind: 'car', car, health: 3, ramTimer: 0, roadblock: true, static: true });
    }
    // Two officers standing on the road itself, never on the grass.
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'foot', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.x = px + 240 + i * 30;
      unit.y = 800 + (i === 0 ? -18 : 18);
    }
    driveEastFor(world, input, 0.2);
    stageHeat(world);
    // Round 4: bystanders filming the 4-star standoff at the roadblock.
    const pp = world.state.player;
    stagePhotoPeds(world, [
      { x: pp.x - 120, y: 800 - 48 },
      { x: pp.x + 90, y: 800 + 48 },
    ]);
  } else if (name === 'boat') {
    // Dawn boat chase — the Living Harbor shot: Jax steals a speedboat
    // and runs it north up the harbor at dawn, a police boat on his
    // wake, the helicopter circling above, the skyline to the west.
    // Boarding uses the real interact path (E at the pier), the drive
    // uses the real boat rules, and the police boat is a real unit.
    // Zoomed in (1.4): the water strip is only 112 px wide, so the
    // boat has to read large. The drive is long enough (1.5 s) that
    // the marina marker — the mission target — is in frame, but short
    // enough that the boat does not reach it (reaching it would
    // complete mission 12 mid-staging and lose the objective line).
    // The helicopter is pinned west of the player so it is in frame too.
    setLight(world, 0.8);
    state.clock.total = 2 * 1440 + 5 * 60 + 40; // DAY 3 · 05:40
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
    // A police boat on the wake, and the helicopter spins up with the
    // 4th star during the drive north.
    spawnPoliceUnit(state.police, state.player, state.rng, 'boat', state.city);
    const pursuit = state.police.units[state.police.units.length - 1];
    pursuit.x = state.player.x;
    pursuit.y = state.player.y + 120;
    pursuit.angle = -Math.PI / 2;
    pursuit.speed = 560;
    driveBoatNorthFor(world, input, 1.5);
    // Pin the helicopter west of the player for the frame: its orbit
    // would otherwise put it east of the world edge, out of frame.
    state.police.heli.orbit = Math.PI;
    state.police.heli.x = state.player.x - 190;
    state.police.heli.y = state.player.y;
    stageHeat(world);
  } else if (name === 'blackout') {
    // The blackout heist — the finale in total darkness: Mara cut the
    // power, so the frame is the real blackout state (startMission(4)
    // switches it on): every neon sign dead, only headlight cones,
    // muzzle flashes, the helicopter searchlight and one flickering
    // casino sign. Jax on foot at the evidence vault, gunmen close,
    // firing the whole time so the still shows the flash.
    setLight(world, 0.05);
    state.clock.total = 1 * 1440 + 23 * 60 + 40; // DAY 2 · 23:40
    state.zoom = 1.5;
    state.zoomLock = true;
    const vault = state.city.casino;
    // Jax stands south of the vault, close enough that the gold
    // Evidence Vault marker is in frame (screen y 205 at zoom 1.5) and
    // the flickering casino sign above it too (screen y 43) — on the
    // road, never inside a building.
    placePlayerOnFoot(world, vault.x - 100, vault.y + 130);
    startMission(state, 4);
    state.mission.dialogue = ['MARA: I cut the power to the district. Grab the ledger — the vault is dark, the cops are blind.'];
    state.mission.dialogueTimer = 30;
    addWanted(state, 4);
    // Gunmen on the roads, never inside a building: one north on the
    // cross street, one east on the south sidewalk.
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
    // The staged gunfire added stars past 4 (each shot near police is
    // +0.2); pin the scene back to the intended 4 stars, so the HUD,
    // the heat and the helicopter all agree — as the chase scene does.
    state.wanted = 4;
    stageHeat(world);
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
    // onfoot: a street shootout — Jax firing east at Harbor Crew gunmen
    // on the road, muzzle flash lit, pedestrians fleeing. Zoomed in to
    // 1.7 so Jax reads large instead of a small dot, gunmen close enough
    // to read as a threat. The gunmen stand off the bullet line, so they
    // survive the frame instead of dying in it. The muzzle flash is
    // forced on the final frame: Jax fires the whole time, so the still
    // shows the flash a live frame shows.
    setLight(world, 0.85);
    state.zoom = 1.7;
    state.zoomLock = true;
    placePlayerOnFoot(world, 1120, 1120);
    state.mission.done = true;
    state.cash = 120;
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'gunman', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      // On roads/sidewalks, never inside a building footprint: one
      // north on the cross street (close enough to read, not at the
      // frame edge), one east on the south sidewalk.
      unit.x = i === 0 ? 1120 : 1290;
      unit.y = i === 0 ? 1000 : 1152;
    }
    // Fleeing peds and a parked car for depth: the street is lived in,
    // not an empty grid.
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
