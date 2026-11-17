// Neon Harbor — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. Screens: title, play, paused, game over (busted / wasted).
//
// ?seed=N fixes the city. ?shot=chase|onfoot|mission|police (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, PROGRESS_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

function readNumber(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be off (private windows): progress then lasts this visit only.
  }
}

const savedMission = Math.min(3, Math.max(0, readNumber(PROGRESS_KEY)));
const world = createWorld(createRandom(seed), savedMission);
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readNumber(BEST_KEY);
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    world.state.mission.index = Math.min(3, Math.max(0, readNumber(PROGRESS_KEY)));
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Neon Harbor. Steal a car and drive to the docks.');
  }

  function endGame(kind) {
    screen = SCREEN_OVER;
    if (world.state.cash > best) {
      best = world.state.cash;
      saveNumber(BEST_KEY, best);
    }
    audio.engineOff();
    audio.stopSiren();
    audio.busted();
    announce(kind === 'busted' ? 'Busted. The Harbor Police caught Jax.' : 'Wasted. Jax went down in Neon Harbor.');
  }

  function handleActions() {
    if (input.wasPressed(ACTION_MUTE)) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (input.wasPressed(ACTION_CONFIRM) && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (input.wasPressed(ACTION_PAUSE) && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.engineOff();
      audio.stopSiren();
      announce('Paused.');
    } else if ((input.wasPressed(ACTION_PAUSE) || input.wasPressed(ACTION_CONFIRM)) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    if (input.mouse.clicked && screen === SCREEN_TITLE) startGame();
    else if (input.mouse.clicked && screen === SCREEN_OVER) startGame();
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const events = world.step(STEP, input, { w: renderer.view.w, h: renderer.view.h });
    const state = world.state;
    if (events & EVENT_OVER) endGame(state.overKind);
    else if (events & EVENT_BUSTED) endGame('busted');
    if (state.events.shot) audio.gunshot();
    if (state.events.pickup) audio.pickup();
    if (state.events.crash) audio.crash();
    if (state.events.missionComplete) {
      audio.missionJingle();
      audio.cash();
      if (state.cash > best) {
        best = state.cash;
        saveNumber(BEST_KEY, best);
      }
      announce(`${state.events.missionComplete.title} complete. $${state.events.missionComplete.reward} earned.`);
    }
    if (state.player.inCar && state.player.car) audio.engine(Math.abs(state.player.car.speed) / 540);
    else audio.engineOff();
    if (state.wanted >= 2) audio.startSiren();
    else audio.stopSiren();
    input.endFrame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Neon Harbor. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
