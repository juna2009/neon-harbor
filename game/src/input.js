export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RADIO = 'radio';
export const ACTION_SETTINGS = 'settings';
export const ACTION_SHOP = 'shop';
export const DEFAULT_BINDINGS = {
  confirm: ['Enter', 'Space'],
  pause: ['Escape', 'KeyP'],
  interact: ['KeyE'],
  reload: ['KeyR'],
  mute: ['KeyM'],
  weapon: ['KeyQ'],
  radio: ['KeyC'],
  settings: ['KeyO'],
  repair: ['KeyG'],
  shop: ['KeyU'],
};
export function keyLabel(code) {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let bindings = JSON.parse(JSON.stringify(DEFAULT_BINDINGS));
  let capture = null;
  function actionFor(code) {
    for (const [action, codes] of Object.entries(bindings)) {
      if (codes.includes(code)) return action;
    }
    return null;
  }
  function onKeyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (capture) {
      if (event.code !== 'Escape') {
        bindings[capture.action] = [event.code];
      }
      const done = capture.done;
      capture = null;
      if (done) done();
      return;
    }
    if (!event.repeat) {
      keys.add(event.code);
      const action = actionFor(event.code);
      if (action) pressed.add(action);
    }
  }
  function onKeyUp(event) {
    keys.delete(event.code);
  }
  function onMouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  }
  function onMouseDown(event) {
    onMouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
  }
  function onMouseUp() {
    mouse.down = false;
  }
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', () => keys.clear());
  function axis(negative, positive) {
    let value = 0;
    if (keys.has(negative)) value -= 1;
    if (keys.has(positive)) value += 1;
    return value;
  }
  return {
    keys,
    mouse,
    getBindings() {
      return JSON.parse(JSON.stringify(bindings));
    },
    setBindings(next) {
      if (!next) return;
      for (const [action, codes] of Object.entries(next)) {
        if (Array.isArray(codes) && codes.length > 0) bindings[action] = codes.slice();
      }
    },
    beginCapture(action, done) {
      capture = { action, done };
    },
    isCapturing() {
      return capture !== null;
    },
    moveX() {
      return window.nhAx || axis('ArrowLeft', 'ArrowRight') || axis('KeyA', 'KeyD');
    },
    moveY() {
      return window.nhAy || axis('ArrowUp', 'ArrowDown') || axis('KeyW', 'KeyS');
    },
    run() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    shootHeld() {
      return mouse.down || keys.has('Space');
    },
    wasPressed(action) {
      return pressed.has(action);
    },
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
  };
}
