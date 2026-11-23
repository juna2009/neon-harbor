// wheel.js — Neon Harbor weapon wheel (R35-F4, vs Karimbu's 5-weapon wheel).
// Post-cut module: imported ONLY by ui2.js, so 0 bytes in the dossier text.
// Behaviour: TAP Q cycles owned weapons (wheel.js onKeyUp, E-01 — the old
// keydown cycle in world.js is deleted so a hold never cycles). HOLD Q >= 180ms
// opens the radial wheel; hover a wedge (mouse), press 1-5, or click a wedge,
// then RELEASE Q to equip. The wheel reads/writes the live game state through
// window.__neonHarbor (exposed by main.js) — no counted file imports this.
// All DOM listeners are guarded so the module also loads in node (tests).
import { WEAPONS, WEAPON_ORDER } from './config.js';

export const WHEEL_ORDER = WEAPON_ORDER;
export const WHEEL_HOLD_MS = 180;
const SLOT_DEG = 360 / WHEEL_ORDER.length;

const wheel = { open: false, qDown: false, qDownAt: 0, sel: null, mouse: { x: -1, y: -1 } };

function now() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}
export function gameState() {
  try {
    return (typeof window !== 'undefined' && window.__neonHarbor) ? window.__neonHarbor.state : null;
  } catch {
    return null;
  }
}
export function wheelScale(view) {
  if (!view) return 1;
  return Math.max(0.5, Math.min(1, view.w / 1280, view.h / 800));
}
export function wheelGeom(view) {
  const k = wheelScale(view);
  return { cx: view.w / 2, cy: view.h / 2, k, rO: 150 * k, rI: 58 * k };
}
// Centre angle (deg, canvas coords, 0 = east, clockwise) of slot i.
export function slotAngle(i) {
  return -90 + i * SLOT_DEG;
}
// Slot index under point (x,y), or -1 (centre dead zone / outside wheel).
export function slotAtPoint(x, y, view) {
  if (!view) return -1;
  const g = wheelGeom(view);
  const dx = x - g.cx, dy = y - g.cy;
  const d = Math.hypot(dx, dy);
  if (d < g.rI - 6 || d > g.rO + 14) return -1;
  const deg = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
  return Math.floor((((deg - slotAngle(0) + 360) % 360) + SLOT_DEG / 2) / SLOT_DEG) % WHEEL_ORDER.length;
}
export function wheelOwned(state, key) {
  const p = state && state.player;
  if (!p) return false;
  if (key === 'fists') return true; // fists never run out (9999/9999 in world.js)
  const w = p.weapons && p.weapons[key];
  return !!w && (w.ammo + w.reserve) > 0;
}
export function wheelAmmoLabel(state, key) {
  const p = state && state.player;
  if (key === 'fists') return '∞';
  const w = p && p.weapons && p.weapons[key];
  if (!w || (w.ammo + w.reserve) <= 0) return '—';
  return w.ammo + '/' + w.reserve;
}
// Equip key on the live state (and sync the top-level ammo fields the
// firing code reads). Returns false when the slot is unowned/unknown.
export function applyWheelSelection(state, key) {
  if (!state || !state.player || !WHEEL_ORDER.includes(key)) return false;
  if (!wheelOwned(state, key)) return false;
  const p = state.player;
  p.weapon = key;
  const w = p.weapons[key] || { ammo: 0, reserve: 0 };
  p.ammo = w.ammo;
  p.reserve = w.reserve;
  if (state.events) state.events.weaponSwitch = key;
  wheel.sel = key;
  return true;
}
export function isWheelOpen() {
  return wheel.open;
}
export function wheelSelection() {
  return wheel.sel;
}

function onKeyDown(e) {
  if (!e || !e.code) return;
  if (e.code === 'KeyQ' && !e.repeat) {
    wheel.qDown = true;
    wheel.qDownAt = now();
  }
  if (wheel.open && e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1 && n <= WHEEL_ORDER.length) {
      const st = gameState();
      const key = WHEEL_ORDER[n - 1];
      if (st && wheelOwned(st, key)) wheel.sel = key;
    }
  }
}
// E-01: the tap-cycle lives here now (was a keydown cycle in world.js).
// A Q tap must cycle only when the wheel never opened; a hold must not.
// Load-bearing guard: wheel.js listeners are window-global, so without
// this a Q tap on pause/shop/settings/over would newly cycle a weapon
// (the old keydown cycle could only fire where world.step() runs: play).
function screenIsPlay() {
  try {
    return typeof window !== 'undefined' && window.__neonHarbor && window.__neonHarbor.screen === 'play';
  } catch {
    return false;
  }
}
function onKeyUp(e) {
  if (!e || e.code !== 'KeyQ') return;
  wheel.qDown = false;
  if (wheel.open) {
    const st = gameState();
    if (st && wheel.sel) applyWheelSelection(st, wheel.sel);
    wheel.open = false;
    wheel.sel = null;
  } else if (now() - wheel.qDownAt < WHEEL_HOLD_MS) {
    // TAP (<180 ms): cycle one owned weapon. The old keydown cycle in
    // world.js is deleted — a hold must never cycle (E-01).
    const st = gameState();
    if (st && st.player && screenIsPlay()) {
      const owned = WHEEL_ORDER.filter((k) => wheelOwned(st, k));
      const idx = owned.indexOf(st.player.weapon);
      applyWheelSelection(st, owned[(idx + 1) % owned.length] || 'pistol');
      // A tap is not a wheel use: applyWheelSelection leaves wheel.sel set,
      // and a stale sel would override the current weapon on the NEXT hold
      // (drawWheel keeps an owned sel instead of defaulting to p.weapon —
      // e.g. after a weapon pickup changed p.weapon meanwhile). Reset it so
      // sel is null whenever the wheel is closed, as before E-01.
      wheel.sel = null;
    }
  }
}
function onMouseMove(e) {
  if (!e) return;
  wheel.mouse.x = e.clientX;
  wheel.mouse.y = e.clientY;
}
function onMouseDown(e) {
  if (!wheel.open || !e) return;
  // While the wheel is open every click belongs to the wheel, not the game:
  // stop the canvas mousedown below us (input.js) so a wedge click never fires.
  if (e.stopPropagation) e.stopPropagation();
  const st = gameState();
  if (!st) return;
  const view = { w: window.innerWidth, h: window.innerHeight };
  const idx = slotAtPoint(e.clientX, e.clientY, view);
  if (idx >= 0) {
    const key = WHEEL_ORDER[idx];
    if (wheelOwned(st, key)) applyWheelSelection(st, key);
  }
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  // Capture phase: a click on a wedge must equip, NOT shoot (input.js fires
  // on the canvas mousedown below us in the propagation path).
  window.addEventListener('mousedown', onMouseDown, true);
}

// ---- drawing (called from ui2.js drawHud2, after the HUD clusters) ----
function txt(c, s, x, y, z, k, a, w) {
  c.font = (w || '') + ' ' + z + 'px system-ui';
  c.fillStyle = k || '#eef1f5';
  c.textAlign = a || 'left';
  c.textBaseline = 'middle';
  c.fillText(s, x, y);
}
function glyph(c, key, x, y, k, color) {
  c.fillStyle = color;
  if (key === 'fists') {
    c.beginPath(); c.arc(x - 5 * k, y - 2 * k, 7 * k, 0, 7); c.fill();
    c.beginPath(); c.arc(x + 5 * k, y + 2 * k, 6 * k, 0, 7); c.fill();
  } else if (key === 'pistol') {
    c.fillRect(x - 9 * k, y - 3 * k, 18 * k, 5 * k);
    c.fillRect(x + 3 * k, y + 2 * k, 5 * k, 9 * k);
  } else if (key === 'smg') {
    c.fillRect(x - 12 * k, y - 3 * k, 24 * k, 6 * k);
    c.fillRect(x - 2 * k, y + 3 * k, 5 * k, 9 * k);
    c.fillRect(x - 16 * k, y - 2 * k, 5 * k, 4 * k);
  } else if (key === 'shotgun') {
    c.fillRect(x - 13 * k, y - 6 * k, 26 * k, 4 * k);
    c.fillRect(x - 13 * k, y + 1 * k, 26 * k, 4 * k);
    c.fillRect(x - 4 * k, y + 6 * k, 9 * k, 3 * k);
  } else { // rifle
    c.fillRect(x - 16 * k, y - 2 * k, 32 * k, 4 * k);
    c.fillRect(x - 2 * k, y - 7 * k, 8 * k, 4 * k);
    c.fillRect(x + 2 * k, y + 2 * k, 4 * k, 8 * k);
  }
}
export function drawWheel(c, st, view) {
  if (!c || !st || !view) return;
  if (wheel.qDown && now() - wheel.qDownAt >= WHEEL_HOLD_MS) wheel.open = true;
  if (!wheel.open) return;
  const p = st.player;
  if (!p) return;
  // Hovered wedge (mouse) wins; otherwise keep digit/click pick, else current.
  const hov = slotAtPoint(wheel.mouse.x, wheel.mouse.y, view);
  if (hov >= 0 && wheelOwned(st, WHEEL_ORDER[hov])) wheel.sel = WHEEL_ORDER[hov];
  if (!wheel.sel || !wheelOwned(st, wheel.sel)) wheel.sel = p.weapon;
  const g = wheelGeom(view);
  const { cx, cy, k, rO, rI } = g;
  c.save();
  c.fillStyle = 'rgba(6,10,20,0.45)';
  c.fillRect(0, 0, view.w, view.h);
  txt(c, 'WEAPON WHEEL', cx, cy - rO - 26 * k, Math.round(16 * k), '#ffd23e', 'center', 'bold');
  WHEEL_ORDER.forEach((key, i) => {
    const def = WEAPONS[key];
    const owned = wheelOwned(st, key);
    const active = p.weapon === key;
    const sel = wheel.sel === key;
    const aMid = slotAngle(i) * Math.PI / 180;
    const a0 = aMid - (SLOT_DEG / 2 - 2) * Math.PI / 180;
    const a1 = aMid + (SLOT_DEG / 2 - 2) * Math.PI / 180;
    const rSel = sel ? rO + 8 * k : rO;
    c.beginPath();
    c.arc(cx, cy, rSel, a0, a1);
    c.arc(cx, cy, rI, a1, a0, true);
    c.closePath();
    c.fillStyle = sel ? def.color + '55' : owned ? 'rgba(20,28,46,0.88)' : 'rgba(14,20,32,0.72)';
    c.fill();
    c.lineWidth = sel ? 3 : active ? 2 : 1.5;
    c.strokeStyle = sel || active ? def.color : 'rgba(238,241,245,0.25)';
    c.stroke();
    const gx = cx + Math.cos(aMid) * (rI + 34 * k);
    const gy = cy + Math.sin(aMid) * (rI + 34 * k);
    glyph(c, key, gx, gy, k, owned ? def.color : '#5a6270');
    const tx = cx + Math.cos(aMid) * (rI + 62 * k);
    const ty = cy + Math.sin(aMid) * (rI + 62 * k);
    txt(c, (i + 1) + '  ' + def.name.toUpperCase(), tx, ty - 8 * k, Math.round(11 * k), owned ? '#ffffff' : '#5a6270', 'center', 'bold');
    txt(c, wheelAmmoLabel(st, key), tx, ty + 8 * k, Math.round(11 * k), sel ? '#ffd23e' : owned ? '#eef1f5' : '#5a6270', 'center', 'bold');
  });
  // Centre disc: current selection.
  const selDef = WEAPONS[wheel.sel] || WEAPONS[p.weapon];
  c.beginPath();
  c.arc(cx, cy, rI - 6 * k, 0, 7);
  c.fillStyle = '#0e1420f2';
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = selDef.color;
  c.stroke();
  txt(c, selDef.name.toUpperCase(), cx, cy - 8 * k, Math.round(15 * k), '#ffffff', 'center', 'bold');
  txt(c, wheelAmmoLabel(st, wheel.sel), cx, cy + 12 * k, Math.round(12 * k), '#ffd23e', 'center', 'bold');
  txt(c, 'Hold Q · release to equip · 1–5 or click to pick', cx, cy + rO + 26 * k, Math.round(13 * k), '#c8cdd6', 'center');
  c.restore();
}
