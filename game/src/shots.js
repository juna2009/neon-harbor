// Neon Harbor — the four screenshot scenes behind ?shot=chase|onfoot|
// mission|police. Each one stages a real world from the seed, places the
// player and the police where the scene needs them, then plays the real
// rules forward with a scripted driver, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
// The cover is a night chase; on-foot is a street shootout with muzzle
// flash; mission is the package pickup; police is a sunset roadblock at
// the harbor — every officer and car placed on a road, never on grass.
import { STEP } from './config.js';
import { startMission } from './missions.js';
import { addWanted, spawnPoliceUnit } from './police.js';
import { makeCar } from './traffic.js';
import { SCREEN_PLAY } from './render.js';

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
      // Steer toward the nearest east-west road centre.
      const targetY = world.state.city.roadsH.reduce((a, b) => (Math.abs(b - p.car.y) < Math.abs(a - p.car.y) ? b : a));
      input.setMove(p.car.y > targetY + 6 ? -1 : p.car.y < targetY - 6 ? 1 : 0, 1);
    } else {
      input.setMove(0, 0);
    }
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

/** Pin the light for a scene: daylight 0..1, locked against the cycle. */
function setLight(world, daylight) {
  world.state.daylight = daylight;
  world.state.daylightManual = true;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best cash to show. Names: chase, onfoot, mission, police.
 */
export function stageShot(name, world) {
  const state = world.state;
  const input = scriptedInput();
  world.reset();
  state.cash = 650;
  if (name === 'chase') {
    // Cover: a high-speed chase at night — neon, headlights, 3 stars.
    // The player starts at speed with the patrol cars well behind, so
    // the frame reads as a chase, not a pile-up.
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
    startMission(state, 0);
    state.mission.stage = 1;
    state.mission.dialogue = ['MARA: Nice ride. Now get to the docks.'];
    state.mission.dialogueTimer = 30;
    addWanted(state, 3);
    for (let i = 0; i < 3; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'car', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.car.x = 800 - 460 - i * 140;
      unit.car.y = 1120 + (i % 2 === 0 ? 18 : -18);
      unit.car.angle = 0;
      unit.car.speed = 340;
    }
    driveEastFor(world, input, 1.2);
  } else if (name === 'mission') {
    // A mission in progress: the package pickup at the plaza, with the
    // SMG pickup crate and a harbor token in the same frame. The player
    // stands on the sidewalk south of the marker — close enough to see
    // it, far enough not to trigger the pickup yet.
    setLight(world, 0.9);
    placePlayerOnFoot(world, 760, 560);
    startMission(state, 1);
    state.mission.dialogue = ['MARA: Good driving. Now grab the package at the plaza, north side.'];
    state.mission.dialogueTimer = 30;
    state.cash = 250;
    walkFor(world, input, 0.3, 1, 0);
  } else if (name === 'police') {
    // Sunset at the harbor: the player drives into a police roadblock,
    // wanted 4, water and docks on the right of the frame. Zoom is
    // locked at 1.0 so the camera clamp at the world's east edge cannot
    // push the player off-centre.
    setLight(world, 0.5);
    state.zoom = 1.0;
    state.zoomLock = true;
    placePlayerInCar(world, 1700, 800, 0);
    state.mission.done = true;
    addWanted(state, 4);
    // Roadblock: two patrol cars parked across the road, lights flashing.
    for (let i = 0; i < 2; i += 1) {
      const car = makeCar(2000 + (i === 0 ? -26 : 26), 800 + (i === 0 ? -20 : 20), Math.PI / 2 + (i === 0 ? 0.5 : -0.5), '#2f6fd0', 'police');
      car.speed = 0;
      state.police.units.push({ kind: 'car', car, health: 3, ramTimer: 0, roadblock: true, static: true });
    }
    // Two officers standing on the road itself, never on the grass.
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'foot', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.x = 1940 + i * 30;
      unit.y = 800 + (i === 0 ? -18 : 18);
    }
    driveEastFor(world, input, 1.0);
  } else {
    // onfoot: a street shootout — Jax firing east at Harbor Crew gunmen
    // on the road, muzzle flash lit, pedestrians fleeing. Zoomed in so
    // the player reads large instead of a small dot. The gunmen stand
    // off the bullet line, so they survive the frame instead of dying
    // in it.
    setLight(world, 0.85);
    state.zoom = 1.3;
    state.zoomLock = true;
    placePlayerOnFoot(world, 1120, 1120);
    state.mission.done = true;
    state.cash = 120;
    for (let i = 0; i < 2; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'gunman', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      // On roads/sidewalks, never inside a building footprint: one
      // north on the cross street, one west on the south sidewalk.
      unit.x = i === 0 ? 1120 : 960;
      unit.y = i === 0 ? 900 : 1150;
    }
    input.setMouse(900, 400);
    input.setShoot(true);
    walkFor(world, input, 1.4, 0, 0);
  }
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
  return { screen: SCREEN_PLAY, best: state.cash };
}
