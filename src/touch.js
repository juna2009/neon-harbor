// touch.js — Neon Harbor touch controls (touch devices only).
// Virtual analog stick (left) + touch buttons (right). Self-contained ES
// module, no imports. It drives the game ONLY through synthetic
// KeyboardEvents dispatched on window: game/src/input.js listens for
// keydown/keyup and reads event.code, so these events move exactly like
// physical WASD / E / Q / C / Shift / P keys. This module never touches
// game state or the game's input object. Loaded dynamically from ui2.js
// (post-cut) on touch devices only — desktop never sees it.

const TOUCH = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

if (TOUCH) initTouch();

function initTouch() {
  const KEY = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ShiftLeft: 'Shift', KeyE: 'e', KeyQ: 'q', KeyC: 'c', KeyP: 'p', KeyF: 'f' };
  const held = new Set();

  function down(code) {
    if (held.has(code)) return;
    held.add(code);
    window.dispatchEvent(new KeyboardEvent('keydown', { code, key: KEY[code] || '', bubbles: true, cancelable: true }));
  }
  function up(code) {
    if (!held.has(code)) return;
    held.delete(code);
    window.dispatchEvent(new KeyboardEvent('keyup', { code, key: KEY[code] || '', bubbles: true, cancelable: true }));
  }
  function releaseAll() {
    for (const code of [...held]) up(code);
    stickHeld.clear();
    window.nhAx = 0; window.nhAy = 0;
    knob.style.transform = 'translate(0px, 0px)';
    document.querySelectorAll('.nh-btn.nh-on').forEach((b) => b.classList.remove('nh-on'));
  }

  const style = document.createElement('style');
  style.textContent = [
    '#nh-touch{position:fixed;inset:0;z-index:60;pointer-events:none;font-family:system-ui,sans-serif;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
    '#nh-stick{position:absolute;left:18px;bottom:104px;width:128px;height:128px;border-radius:50%;background:rgba(8,14,26,.38);border:2px solid rgba(34,211,238,.55);pointer-events:auto;touch-action:none}',
    '#nh-knob{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:rgba(34,211,238,.4);border:2px solid rgba(165,243,252,.9);box-shadow:0 0 14px rgba(34,211,238,.45)}',
    '#nh-btns{position:absolute;right:28px;bottom:142px;display:flex;flex-direction:column;gap:10px;align-items:flex-end;pointer-events:none}',
    '.nh-row{display:flex;gap:10px;align-items:center;pointer-events:none}',
    '.nh-btn{pointer-events:auto;touch-action:none;width:56px;height:56px;border-radius:50%;border:2px solid rgba(34,211,238,.6);background:rgba(8,14,26,.45);color:#eaf6ff;font:700 20px system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-shadow:0 0 8px rgba(34,211,238,.8)}',
    '.nh-btn.nh-big{width:64px;height:64px;font-size:24px}',
    '.nh-btn.nh-small{width:44px;height:44px;font-size:16px}',
    '.nh-btn.nh-shift{font-size:12px}',
    '.nh-btn.nh-on{background:rgba(34,211,238,.6)}',
  ].join('\n');
  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'nh-touch';
  root.innerHTML =
    '<div id="nh-stick"><div id="nh-knob"></div></div>' +
    '<div id="nh-btns">' +
    '<div class="nh-row"><button type="button" class="nh-btn" data-code="KeyC">C</button>' +
    '<button type="button" class="nh-btn nh-shift" data-code="ShiftLeft">SHIFT</button>' +
    '<button type="button" class="nh-btn nh-small" data-code="KeyP">II</button></div>' +
    '<div class="nh-row"><button type="button" class="nh-btn" data-code="KeyQ">Q</button>' +
    '<button type="button" class="nh-btn nh-big" data-code="KeyE">E</button>' +
    '<button type="button" class="nh-btn nh-small" data-code="KeyF">CAM</button></div>' +
    '</div>';
  document.body.appendChild(root);
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- analog stick: up = gas (W), down = brake/reverse (S), left/right = steer (A/D)
  const stick = root.querySelector('#nh-stick');
  const knob = root.querySelector('#nh-knob');
  const R = 64; // stick radius in px (base is 128px wide)
  const DEAD = 0.12; // dead zone, ~12% of radius
  const stickHeld = new Set();
  let stickId = null;
  let cx = 0;
  let cy = 0;

  function updateStick(dx, dy) {
    const mag = Math.hypot(dx, dy);
    const ux = mag ? dx / mag : 0;
    const uy = mag ? dy / mag : 0;
    const cl = Math.min(mag, R);
    const ex = ux * cl;
    const ey = uy * cl;
    knob.style.transform = 'translate(' + ex.toFixed(1) + 'px,' + ey.toFixed(1) + 'px)';
    // S1: stick progresif — teruskan magnitude ke game via window.nhAx/nhAy
    // (input.js moveX/moveY baca ini dulu; key event biner di bawah tetap
    // dikirim sebagai fallback). ex/R, ey/R di [-1,1]; 0 di dalam dead zone.
    window.nhAx = Math.abs(ex) / R > DEAD ? ex / R : 0;
    window.nhAy = Math.abs(ey) / R > DEAD ? ey / R : 0;
    const want = new Set();
    if (cl / R > DEAD) {
      if (ey < -DEAD * R) want.add('KeyW');
      if (ey > DEAD * R) want.add('KeyS');
      if (ex < -DEAD * R) want.add('KeyA');
      if (ex > DEAD * R) want.add('KeyD');
    }
    for (const code of [...stickHeld]) {
      if (!want.has(code)) { up(code); stickHeld.delete(code); }
    }
    for (const code of want) {
      if (!stickHeld.has(code)) { down(code); stickHeld.add(code); }
    }
  }
  function endStick(e) {
    if (e.pointerId !== stickId) return;
    stickId = null;
    window.nhAx = 0; window.nhAy = 0;
    knob.style.transform = 'translate(0px, 0px)';
    for (const code of [...stickHeld]) { up(code); stickHeld.delete(code); }
  }
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stickId = e.pointerId;
    try { stick.setPointerCapture(e.pointerId); } catch { /* already released */ }
    const r = stick.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    updateStick(e.clientX - cx, e.clientY - cy);
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId !== stickId) return;
    updateStick(e.clientX - cx, e.clientY - cy);
  });
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  // ---- buttons: tap = keydown + keyup ~60ms later; Shift = hold while pressed
  root.querySelectorAll('.nh-btn').forEach((btn) => {
    const code = btn.dataset.code;
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    if (code === 'ShiftLeft') {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch { /* noop */ }
        btn.classList.add('nh-on');
        down(code);
      });
      const off = () => { btn.classList.remove('nh-on'); up(code); };
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      return;
    }
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch { /* noop */ }
      btn.classList.add('nh-on');
      down(code);
      setTimeout(() => { up(code); btn.classList.remove('nh-on'); }, 60);
    });
  });

  // ---- CHARFIX swipe orbit: geser horizontal di canvas #game -> orbit kamera.
  // Ambang 12 px (B4): gerak >12 px membatalkan tembakan yang sempat dimulai
  // mousedown sintetis touch — dispatch mouseup sintetis pada window (input.js
  // mendengarkan mouseup di window) + abaikan mousedown kompatibel berikutnya
  // (klik susulan sesudah swipe) via capture-phase stopImmediatePropagation.
  // Geser vertikal diabaikan. Canvas sudah touch-action:none (index.html).
  const gameCanvas = document.getElementById('game');
  if (gameCanvas) {
    let swId = null, swX = 0, swMoved = false, swSuppressDown = false;
    gameCanvas.addEventListener('mousedown', (e) => {
      if (swSuppressDown) { swSuppressDown = false; e.stopImmediatePropagation(); e.preventDefault(); }
    }, true);
    gameCanvas.addEventListener('pointerdown', (e) => {
      swId = e.pointerId; swX = e.clientX; swMoved = false;
    });
    gameCanvas.addEventListener('pointermove', (e) => {
      if (e.pointerId !== swId) return;
      const dx = e.clientX - swX;
      if (Math.abs(dx) >= 12) {
        window.dispatchEvent(new CustomEvent('nh-orbit', { detail: { dx } }));
        swX = e.clientX;
        if (!swMoved) {
          swMoved = true;
          window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          swSuppressDown = true;
        }
      }
    });
    const swEnd = (e) => { if (e.pointerId === swId) swId = null; };
    gameCanvas.addEventListener('pointerup', swEnd);
    gameCanvas.addEventListener('pointercancel', swEnd);
  }

  window.addEventListener('blur', releaseAll);
  window.__nhTouch = true; // trace for smoke tests: controls mounted
}
