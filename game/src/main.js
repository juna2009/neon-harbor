// Neon Harbor — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. Screens: title, play, paused, settings, game over (busted /
// wasted). The opening drops Jax straight into action: mission 1 starts
// with him already behind the wheel. Busted/Wasted offers a resume from
// the last mission checkpoint. C switches the procedural radio station,
// O opens settings (volume, station, key remap).
//
// ?seed=N fixes the city. ?shot=chase|onfoot|mission|police (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, PROGRESS_KEY, RADIO_STATIONS, SETTINGS_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RADIO, ACTION_SETTINGS, createInput, keyLabel } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_SETTINGS, SCREEN_TITLE } from './render.js';
import { loadCheckpoint } from './missions.js';
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

function loadSettings() {
  const defaults = { volume: 0.8, station: 0, bindings: null };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === 'number' ? parsed.volume : 0.8,
      station: typeof parsed.station === 'number' ? parsed.station : 0,
      bindings: parsed.bindings || null,
    };
  } catch {
    return defaults;
  }
}

const savedMission = Math.min(3, Math.max(0, readNumber(PROGRESS_KEY)));
const world = createWorld(createRandom(seed), savedMission);
const renderer = createRenderer(canvas);
const settings = loadSettings();

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { stationName: RADIO_STATIONS[settings.station].name });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  if (settings.bindings) input.setBindings(settings.bindings);
  audio.setVolume(settings.volume);
  audio.setStation(settings.station);
  let screen = SCREEN_TITLE;
  let previousScreen = SCREEN_TITLE;
  let best = readNumber(BEST_KEY);
  let accumulator = 0;
  let last = performance.now();
  let settingsIndex = 0;
  let capturingRow = -1;
  const prevKeys = { up: false, down: false, left: false, right: false };

  function saveSettings() {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        volume: settings.volume,
        station: settings.station,
        bindings: input.getBindings(),
      }));
    } catch {
      // Storage can be off; settings then last this visit only.
    }
  }

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    world.state.mission.index = Math.min(3, Math.max(0, readNumber(PROGRESS_KEY)));
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startRadio(settings.station);
    // The opening drops Jax straight into action: mission 1 starts with
    // him already behind the wheel of a parked car, engine running.
    if (world.state.mission.index === 0) {
      const car = world.nearestCar(400);
      if (car) world.enterCar(car);
    }
    announce('Playing Neon Harbor. Steal a car and drive to the docks.');
  }

  function resumeFromCheckpoint() {
    if (!loadCheckpoint()) return;
    world.restoreCheckpoint();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startRadio(settings.station);
    announce('Resumed from the last checkpoint.');
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

  function settingsUi() {
    const bindings = input.getBindings();
    return {
      stationName: RADIO_STATIONS[settings.station].name,
      hasCheckpoint: !!loadCheckpoint(),
      settings: {
        volume: settings.volume,
        stationName: RADIO_STATIONS[settings.station].name,
        bindings: {
          interact: keyLabel(bindings.interact[0]),
          reload: keyLabel(bindings.reload[0]),
          mute: keyLabel(bindings.mute[0]),
        },
      },
      settingsIndex,
      capturing: capturingRow,
    };
  }

  function handleSettingsKeys() {
    if (input.isCapturing()) return;
    const up = input.keys.has('ArrowUp');
    const down = input.keys.has('ArrowDown');
    const left = input.keys.has('ArrowLeft');
    const right = input.keys.has('ArrowRight');
    if (up && !prevKeys.up) settingsIndex = (settingsIndex + 5) % 6;
    if (down && !prevKeys.down) settingsIndex = (settingsIndex + 1) % 6;
    if (left && !prevKeys.left) {
      if (settingsIndex === 0) { settings.volume = Math.max(0, settings.volume - 0.1); audio.setVolume(settings.volume); }
      if (settingsIndex === 1) { settings.station = (settings.station + 2) % 3; audio.setStation(settings.station); }
      saveSettings();
    }
    if (right && !prevKeys.right) {
      if (settingsIndex === 0) { settings.volume = Math.min(1, settings.volume + 0.1); audio.setVolume(settings.volume); }
      if (settingsIndex === 1) { settings.station = (settings.station + 1) % 3; audio.setStation(settings.station); }
      saveSettings();
    }
    prevKeys.up = up;
    prevKeys.down = down;
    prevKeys.left = left;
    prevKeys.right = right;
    if (input.wasPressed(ACTION_CONFIRM)) {
      if (settingsIndex === 2 || settingsIndex === 3 || settingsIndex === 4) {
        const action = ['interact', 'reload', 'mute'][settingsIndex - 2];
        capturingRow = settingsIndex;
        input.beginCapture(action, () => {
          capturingRow = -1;
          saveSettings();
          announce('Key remapped.');
        });
      } else if (settingsIndex === 5) {
        screen = previousScreen;
      }
    } else if (input.wasPressed(ACTION_PAUSE)) {
      screen = previousScreen;
    }
  }

  function handleActions() {
    if (input.wasPressed(ACTION_MUTE)) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound muted.' : 'Sound on.');
    }
    if (input.wasPressed(ACTION_RADIO) && screen === SCREEN_PLAY) {
      const name = audio.nextStation();
      settings.station = audio.stationIndex();
      saveSettings();
      announce(`Radio: ${name}.`);
    }
    if (screen === SCREEN_SETTINGS) {
      handleSettingsKeys();
      return;
    }
    if (input.wasPressed(ACTION_SETTINGS) && (screen === SCREEN_TITLE || screen === SCREEN_PAUSED)) {
      previousScreen = screen;
      screen = SCREEN_SETTINGS;
      announce('Settings.');
      return;
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
    if (screen === SCREEN_OVER && input.keys.has('KeyC') && loadCheckpoint()) {
      resumeFromCheckpoint();
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
    if (state.events.enemyShotFired) audio.enemyShot();
    if (state.events.pickup) audio.pickup();
    if (state.events.crash) audio.crash();
    if (state.events.raceStart) audio.missionJingle();
    if (state.events.raceWin) {
      audio.missionJingle();
      audio.cash();
    }
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
    // Clear edge-triggered presses every frame, not only in step():
    // step() never runs on the title/pause/settings/over screens, so
    // without this a P press would stay latched and instantly unpause.
    input.endFrame();
    renderer.draw(world.state, screen, best, settingsUi());
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
