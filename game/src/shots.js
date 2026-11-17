// Neon Harbor — the four screenshot scenes behind ?shot=chase|onfoot|
// mission|police. Each one stages a real world from the seed, places the
// player and the police where the scene needs them, then plays the real
// rules forward with a scripted driver, so the frame is what a short
// game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { startMission } from './missions.js';
import { addWanted, spawnPoliceUnit } from './police.js';
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
    // Cover: a driving chase with wanted stars, police cars and the minimap.
    placePlayerInCar(world, 800, 1120, 0);
    startMission(state, 0);
    state.mission.stage = 1;
    state.mission.dialogue = ['MARA: Nice ride. Now get to the docks.'];
    state.mission.dialogueTimer = 30;
    addWanted(state, 3);
    for (let i = 0; i < 3; i += 1) {
      spawnPoliceUnit(state.police, state.player, state.rng, 'car', state.city);
      const unit = state.police.units[state.police.units.length - 1];
      unit.car.x = 800 - 300 - i * 120;
      unit.car.y = 1120 + (i % 2 === 0 ? 18 : -18);
      unit.car.angle = 0;
      unit.car.speed = 320;
    }
    driveEastFor(world, input, 2.4);
  } else if (name === 'mission') {
    // A mission in progress: package pickup with the objective and dialogue.
    placePlayerOnFoot(world, 760, 800);
    startMission(state, 1);
    state.mission.dialogue = ['MARA: Good driving. Now grab the package at the plaza, north side.'];
    state.mission.dialogueTimer = 30;
    state.cash = 250;
    walkFor(world, input, 1.2, 1, 0);
  } else if (name === 'police') {
    // High wanted level: the player on foot, police closing in.
    placePlayerOnFoot(world, 1120, 1120);
    addWanted(state, 5);
    state.mission.done = true;
    for (let i = 0; i < 4; i += 1) spawnPoliceUnit(state.police, state.player, state.rng, 'foot', state.city);
    for (let i = 0; i < 2; i += 1) spawnPoliceUnit(state.police, state.player, state.rng, 'car', state.city);
    input.setShoot(true);
    walkFor(world, input, 1.4, 0, 0);
  } else {
    // onfoot: downtown on foot, pedestrians and traffic all around.
    placePlayerOnFoot(world, 1120, 1120);
    state.mission.done = true;
    state.cash = 120;
    walkFor(world, input, 1.5, 1, 0);
  }
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
  return { screen: SCREEN_PLAY, best: state.cash };
}
