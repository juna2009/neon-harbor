import { STEP } from './config.js';
import { buyUpgrade, startMission, targetForMission } from './missions.js';
import { addWanted, spawnPoliceUnit } from './police.js';
import { WATER_X, districtAt } from './city.js';
import { makeCar } from './traffic.js';
import { SCREEN_PLAY, SCREEN_SHOP, SCREEN_TITLE } from './render.js';
import { applyTimeOfDay } from './timeofday.js';
import { setTitleTOD, setTitleScene } from './city3d.js';
import { marketAisle } from './market.js'; // R35-F9: night-market staging site
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
    car.y = road + (dir > 0 ? 14 : -14);
    car.angle = dir > 0 ? 0 : Math.PI;
  } else {
    car.x = road + (dir > 0 ? 14 : -14);
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
  // R33: shot names may carry a time-of-day suffix, e.g. 'title3d-siang'.
  // The base name drives the staging; the preset is applied AFTER staging
  // (setLight inside staging must not overwrite the preset daylight) and
  // sets the title backdrop palette too (setTitleTOD). Real game code —
  // the judge playing the game sees the same presets via applyTimeOfDay.
  const todMatch = /^(.*)-(pagi|siang|sore|malam)$/.exec(name);
  const tod = todMatch ? todMatch[2] : null;
  if (todMatch) name = todMatch[1];
  // TITLE-SCENE: shot names may carry a scene suffix, e.g.
  // 'title3d-robbery' (or combined 'title3d-surround-sore' — TOD is
  // stripped first, then the scene). The scene selects the title
  // backdrop staging (surround = Jax dikepung polisi; robbery = Jax
  // rampok bawa tas). Default (no suffix) = surround.
  const sceneMatch = /^(.*)-(surround|robbery)$/.exec(name);
  const scene = sceneMatch ? sceneMatch[2] : null;
  if (sceneMatch) name = sceneMatch[1];
  const applyTod = () => { if (tod) { applyTimeOfDay(world.state, tod); setTitleTOD(tod); } };
  const state = world.state;
  // TITLE-MINIMAP: shot mode never runs runGame(), so window.__neonHarbor
  // (exposed there for the live title) is missing and drawTitle2 would
  // have no state for the shared square minimap. Expose the staged world
  // here (post-cut file, 0 dossier bytes).
  if (typeof window !== 'undefined') window.__neonHarbor = { get state() { return world.state; } };
  const input = scriptedInput();
  world.reset();
  state.view3d = false; // staged shots are 2D top-down unless the scene says otherwise
  state.cash = 2150;
  if (name === 'title3d') {
    state.titleT3d = 6;
    if (scene) setTitleScene(scene);
    applyTod();
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
        car.y = 800 + (car.dir > 0 ? 14 : -14);
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
      unit.car.y = 1120 + (i % 2 === 0 ? 14 : -14);
      unit.car.angle = 0;
      unit.car.speed = 340;
    }
    driveEastFor(world, input, name === 'chase3d' ? 0.05 : 0.3);
    stageHeat(world);
    if (name === 'chase3d') {
      // chase-cam looks forward: the pursuit must be IN frame — both units
      // ahead in the hero's (south) lane, every car facing away. R31: the
      // old layout put u1 eastbound in the north lane and u2 oncoming in
      // the hero's lane, and the dir=-1 traffic car read as a head-on taxi
      // (yellow cab 120 px ahead in the A4 crowd shot, pink cab at +520).
      // On this 80 px road the lanes sit 14 px off the centreline, so an
      // oncoming car can never read as "clearly opposite-lane" — all
      // staged traffic faces away instead.
      const px = state.player.x;
      // FIX2 (20 Nov, Juna: "mobil numpuk kayak kereta"): the R38 stagger
      // (±8 px dunia, yaw ±0.03) was one order too small for the chase-cam
      // optics (fovF 860: ±8 px = ±19 px layar dekat, ±8 px jauh — less
      // than one car width; the 72 px x-gap U2->T2 was 7 px of screen
      // height), and the frame actually held SIX cars ahead, not five:
      // probe (seed 7) found a LIVE orange sedanL at (1909,1106) sitting
      // 17 px behind U1 — the R33b hide loop spared it because it sits ON
      // the centreline band (|y-1120|=14). Fix: (1) 5 -> 4 cars ahead,
      // (2) x-gaps >= 160, (3) traffic eastbound in its CORRECT lane
      // (road-14 = 1106, like traffic.js createTraffic — stageTrafficCar
      // puts dir=1 at road+14, the wrong-way lane) while police sit
      // centreline/south-centre (1126/1128), so consecutive cars differ
      // ~20-30 px on screen AND in depth — a diagonal, not a column.
      // All still face east (away): no head-on read (R31 kept).
      const u1 = state.police.units[state.police.units.length - 2];
      if (u1) { u1.car.x = px + 360; u1.car.y = 1126; u1.car.angle = 0; u1.car.speed = 320; }
      const u2 = state.police.units[state.police.units.length - 1];
      if (u2) { u2.car.x = px + 700; u2.car.y = 1128; u2.car.angle = 0; u2.car.speed = 300; }
      stageTrafficCar(world, 'h', 1120, px + 200, 1, 110);
      stageTrafficCar(world, 'h', 1120, px + 540, 1, 110);
      // Lanes, nearest first: both traffic cars in the eastbound lane
      // (1106). The R38 stagger block is deleted, not tuned — its whole
      // amplitude was below one car width on screen.
      const lane = state.traffic.cars
        .filter((c) => c.staged && c.road === 1120)
        .sort((a, b) => a.x - b.x);
      for (const c of lane) { c.y = 1106; c.angle = 0; }
      // R33-MERGE (Juna #5): staged convoy on the CENTRELINE. stageTrafficCar
      // puts dir=1 cars at road+14 (one lane over); at chase distance that
      // reads as hugging the building line. Probe (seed 7): all 3 staged
      // cars + both police units were at y=1134, none at 1120.
      // FIX2: clamp band widens to [1106,1128] — the lower bound is now
      // the correct eastbound lane, not the centreline; the upper bound
      // (1128) is unchanged, so no car moves back toward the buildings.
      // The clamp is a safety net only: the lanes above already place
      // every staged car inside it.
      for (const c of state.traffic.cars) if (c.staged && c.road === 1120) c.y = Math.max(1106, Math.min(1128, c.y));
      // R33: Juna — "mobil jangan ada di samping situ". The R31 staged
      // parked cars (parkSpots) are DELETED, and every live parked car in
      // the visible stretch is hidden for this shot (alive=false). Only the
      // hero car is spared. Gameplay parking is untouched — world.reset()
      // per shot restores it, and traffic.js is not changed.
      // R33-MERGE (Juna #5): window |y-1120|<400, not <70 — the red parked
      // car on the next road over (2103,1456) still showed at the frame
      // edge, touching the right buildings (probe: screen ~1102,415).
      for (const c of state.traffic.parked) {
        if (c !== state.player.car && c.alive && c.x > px - 100 && c.x < px + 1600 && Math.abs(c.y - 1120) < 400) c.alive = false;
      }
      // R33b: the same for live (unstaged) traffic — a car driving on a
      // cross street ahead (probe: orange #f39c12 at x=2066, y=969, angle
      // -1.57, speed 169) reads as a car parked at the road edge. Hide any
      // unstaged traffic car off the road-1120 centreline in the visible
      // stretch. Staged traffic + police (all in the centre lane) are
      // untouched (staged cars carry staged=true).
      // FIX2: also hide unstaged traffic ON the centreline band inside the
      // staged corridor (x < px+800) — the live orange car (1909,1106)
      // survived the old rule exactly because |y-1120|=14 <= 30. Beyond
      // +800 a centreline car stays: it reads as distant traffic at the
      // vanishing point, not part of the formation.
      for (const c of state.traffic.cars) {
        if (!c.staged && c.alive && c.x > px - 100 && c.x < px + 1600
          && (Math.abs(c.y - 1120) > 30 || c.x < px + 800)) c.alive = false;
      }
    }
    const cp = world.state.player;
    // R38 (item 12): photo peds OFF the road edge. At ±48 the ped body
    // (5.5u) sits mid-strip but its 16u shadow spills 4u onto the visual
    // asphalt (R33 widened it to 44) and the feet sit 4u from the edge —
    // at chase distance that reads as "standing in the road". The north
    // ped moves to -56 (shadow 48..64 clears the asphalt; it stays
    // visible — it stands in the gap at the north building's east edge,
    // x 1707 vs the building ending at 1710). The SOUTH ped was kept
    // at +48 because at +56 it sat 6u behind the south building face
    // (y=1170) and the depth-sorted chase view painted the face OVER
    // it (probe seed 7: ped2@56 invisible). TROTOAR moved the facade
    // to y=1200, so +56 now stands 24u clear of the face — both photo
    // peds sit at ±56, mid-sidewalk (48..80). The old "on the road"
    // read at +48 also came from the live green ped overlapping it at
    // off 44, hidden below (item 12b).
    // Live spawn (createPedestrians, walk line 60) is NOT touched here.
    stagePhotoPeds(world, [
      { x: cp.x + 120, y: 1120 - 56 },
      { x: cp.x + 260, y: 1120 + 56 },
    ]);
    if (name === 'chase3d') {
      // R38 (item 12b): live peds that drifted to |off| 30..52 sit ON
      // the visual asphalt (44) — and read as standing in the road
      // exactly like the staged ones (green shirt at (1797,1164),
      // red shirt at (2066,1160) in the before-shot). Push them to the
      // only (R33b pattern: hide/move live actors for the shot, gameplay
      // untouched). Skip photo peds (photo===3), peds on a cross street
      // (they read as crossing, which is fine), and keep clear of the
      // two staged photo-ped spots.
      for (const p of state.peds) {
        if (!p.alive || p.photo === 3) continue;
        if (p.x < cp.x - 100 || p.x > cp.x + 1600) continue;
        const off = p.y - 1120;
        if (Math.abs(off) <= 30 || Math.abs(off) >= 52) continue;
        // Probe (seed 7) found the one the first version missed: a live
        // ped at (1797,1164) — 37u east of the 1760 cross road, i.e.
        // ON the intersection asphalt (cross visual asphalt is 44 wide),
        // straddling the corner where the two asphalts meet. The old 58u
        // cross-street exclusion was wider than the asphalt and let it
        // through. Cross exclusion is now the visual asphalt (44+2).
        // Such a ped cannot be pushed to a clean sidewalk — every point
        // off both asphalts at that corner is inside the building — so
        // it is HIDDEN for the shot (R33 pattern: hide live actors that
        // read as edge actors). That includes the distant one at
        // (2066,1160): at ~480u it is only a speck at full frame, but
        // at 2x it still reads as a person standing in the road.
        const onCross = state.city.roadsV.some((rx) => Math.abs(p.x - rx) < 46);
        if (onCross) {
          p.alive = false;
          continue;
        }
        const side = off > 0 ? 1 : -1;
        let nx = p.x;
        if (side < 0 && Math.abs(nx - (cp.x + 120)) < 40) nx += 90;
        if (side > 0 && Math.abs(nx - (cp.x + 260)) < 40) nx += 90;
        p.x = nx;
        p.y = 1120 + side * 56;
      }
    }
    if (name === 'chase3d') state.view3d = true;
  } else if (name === 'onfoot' || name === 'onfoot-pov' || name === 'onfoot-front') {
    // R41 (Worker B): dossier shot #2 — Jax jalan kaki di trotoar, kamera
    // on-foot WebGL2. 'onfoot' = behind (mode 1, default dossier); varian
    // -pov (mode 0) dan -front (mode 2) hanya untuk verifikasi kamera,
    // bukan shot dossier. Shot mode tidak menjalankan loop main.js, jadi
    // updateOnFoot tidak pernah dipanggil: state.onfoot + state.view3d
    // di-set langsung di sini. Jax di-stage di trotoar y=431 (scout Worker
    // A v4: bersih x=100..1790) lalu jalan ke timur 0,6 dtk. SMOOTH-WALK: Jax di-stage di x=1045 (bukan 1000) supaya dgn walkSpeed 100 ia tetap berakhir di x=1105 (60 px) — dan dunia hanya di-step 36x seperti R41, jadi traffic/ped di posisi yang SAMA dgn shot R41 (walkFor 1,05 dtk sempat menggeser traffic hingga mobil merah menutupi Jax). walkPlayer
    // mengarahkan p.angle ke mouse scripted (640,400) — begitu Jax lewat
    // titik itu angle berbalik π — jadi angle di-set eksplisit 0 (timur,
    // arah jalan) sesudah walkFor, kalau tidak kamera behind malah jadi
    // kamera depan. walkPhase di-set π/2 supaya pose mid-stride terbaca di
    // still frame (di shot mode fase tidak maju sendiri: walkPlayer tidak
    // mengubahnya, onfoot.js tidak jalan). Dossier: shots.js TIDAK masuk
    // teks dossier (terpotong di render.js), jadi branch ini 0 byte.
    const mode = name === 'onfoot-pov' ? 0 : name === 'onfoot-front' ? 2 : 1;
    setLight(world, 0.9);
    state.view3d = true;
    placePlayerOnFoot(world, 1045, 431); // SMOOTH-WALK: 1045 + 60 px (0,6 dtk @100) = 1105, sama dgn R41
    stagePed(world, 1250, 431);
    stagePed(world, 1400, 432);
    stagePed(world, 850, 431);
    stagePed(world, 760, 448);
    // Ped yang di-stage menghadap arah spawn acak — tanpa ini ped #2 jalan
    // ke utara selama walkFor dan masuk ke blok gedung (probe: 432→406).
    // Semua ped di-stage menghadap timur supaya tetap di trotoar.
    for (const q of state.peds) if (q.staged) q.angle = 0;
    stageTrafficCar(world, 'h', 480, 1330, 1, 110);
    stageTrafficCar(world, 'h', 480, 1560, -1, 100);
    stageTrafficCar(world, 'h', 480, 820, 1, 100);
    walkFor(world, input, 0.6, 1, 0);
    const p = state.player;
    p.angle = 0;
    p.walkPhase = Math.PI / 2;
    state.onfoot = { active: true, mode };
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
      unit.car.y = 800 + (i === 0 ? -14 : 14);
      unit.car.angle = 0;
      unit.car.speed = 300;
    }
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'soldier', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.x = px + 240 + i * 30;
      unit.y = 800 + (i === 0 ? -14 : 14);
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
      // R27b CLIP-FIX (item 7, merge): perahu ambient #1 (cyan, spawn
      // 2488,900) duduk 56 px di selatan buritan kapal pesiar (y 810) —
      // di shot boat3d terbaca MENEMBUS lambung kapal (Juna 05:57 WIB).
      // Geser khusus staging ke (2488,1080): gap ke buritan jadi 236 px,
      // tetap di jalur air, tidak bersentuhan hero (52 px) / police-boat
      // (32 px, tanpa overlap sumbu-x). Kapal pesiar TIDAK digeser
      // (clearance M11 + SHIP_RECT tetap seperti hitungan worker CRUISE).
      // Spawn live (createBoats) TIDAK diubah — ranah gameplay/M11-DRIVER.
      const amb = state.boats[1];
      if (amb) { amb.x = 2488; amb.y = 1080; }
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
  } else if (name === 'market') {
    // R35-F9: night-market on-foot combat, 3D chase view at night
    // (shot name carries the '-malam' suffix — applyTod() at the end of
    // stageShot applies the malam preset). Player walks the centre aisle
    // facing east; gunmen hold the aisle ahead among the stalls.
    state.view3d = true;
    state.mission.done = true;
    state.cash = 2150;
    const aisle = marketAisle(state.city);
    const px = aisle.x - 70, py = aisle.y;
    // player 12 px south of the aisle centre: the park tree at (1557,640)
    // sits exactly on the centreline and would stand directly behind the
    // hero in the chase frame.
    placePlayerOnFoot(world, px, py + 12);
    // 2 gunmen ahead (they may fall to the player's fire — that IS the
    // combat; 2 more are placed after the shooting so the frame always
    // shows armed opponents).
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'gunman', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.x = px + 140 + i * 18;
      unit.y = py + (i === 0 ? -18 : 22);
    }
    stagePed(world, px + 30, py - 52);
    stagePed(world, px + 44, py + 56);
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
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'gunman', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.x = px + 160 + i * 16;
      unit.y = py + (i === 0 ? -10 : 15);
    }
    stagePed(world, px + 58, py - 44);
    stagePed(world, px + 66, py + 54);
    addWanted(state, 4);
    state.wanted = 4;
    stageHeat(world);
    state.mission.dialogue = ['MARA: Night market — hold the plaza, Jax. The crew cut is in the stalls.'];
    state.mission.dialogueTimer = 30;
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
    applyTod();
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
  applyTod();
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
  return { screen: SCREEN_PLAY, best: state.cash };
}
