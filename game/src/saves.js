// saves.js — Neon Harbor save slots (R35-F6, vs Karimbu's 3 save slots).
// Post-cut module: imported ONLY from ui2.js (post-cut), so it costs 0
// bytes in the dossier text (the cut falls in render.js, before ui2.js).
// NEVER import this from a counted file (main/world/missions/render/...):
// that would pull it before the cut and blow the 163,840 B cap.
// Each slot stores: mission progress + cash + upgrades + collectibles +
// district heat + all-missions-done + timestamp. Slot 1 mirrors the
// legacy single save (PROGRESS_KEY) so old progress is not lost.
import { PROGRESS_KEY } from './config.js';
import { MISSION_DEFS } from './missions.js';

export const SLOT_COUNT = 3;
// Title-screen panel geometry (drawn by ui2.js drawTitle2, design 1280x800).
// Click hit-testing in titleInput() MUST use these same rects.
export const SLOT_PANEL = { x: 24, y: 588, w: 360, h: 168 };
const ROW_H = 46; // row pitch (42 px row + 4 px gap)
const ROW_TOP = 28; // header height
export function slotRowRect(i) {
  return { x: SLOT_PANEL.x + 10, y: SLOT_PANEL.y + ROW_TOP + (i - 1) * ROW_H, w: SLOT_PANEL.w - 20, h: 42 };
}

const ACTIVE_KEY = 'neon-harbor-active-slot';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function slotKey(i) { return 'neon-harbor-slot-' + i; }
function lsGet(k) {
  try { return window.localStorage.getItem(k); } catch { return null; }
}
function lsSet(k, v) {
  try { window.localStorage.setItem(k, v); } catch { /* storage unavailable */ }
}
function lsDel(k) {
  try { window.localStorage.removeItem(k); } catch { /* storage unavailable */ }
}
function clampMission(n) {
  return Math.min(12, Math.max(0, Number.isFinite(n) ? Math.floor(n) : 0));
}

export function readSlot(i) {
  if (i < 1 || i > SLOT_COUNT) return null;
  try {
    const raw = lsGet(slotKey(i));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d !== 'object' || d === null) return null;
    if (typeof d.mission !== 'number' || typeof d.cash !== 'number') return null;
    return {
      mission: clampMission(d.mission),
      cash: Math.max(0, Math.floor(d.cash)),
      done: d.done === true,
      upgrades: (d.upgrades && typeof d.upgrades === 'object') ? d.upgrades : {},
      taken: Array.isArray(d.taken) ? d.taken.filter((n) => Number.isInteger(n)) : [],
      heat: Array.isArray(d.heat) && d.heat.length === 3 ? d.heat.map((n) => (Number.isFinite(n) ? n : 0)) : [0, 0, 0],
      updated: typeof d.updated === 'number' ? d.updated : 0,
    };
  } catch { return null; }
}
export function writeSlot(i, d) {
  if (i < 1 || i > SLOT_COUNT) return;
  lsSet(slotKey(i), JSON.stringify(d));
}
export function listSlots() {
  return [1, 2, 3].map((i) => readSlot(i));
}
export function activeSlot() {
  const n = Number.parseInt(lsGet(ACTIVE_KEY) ?? '', 10);
  return n >= 1 && n <= SLOT_COUNT ? n : 1;
}
function previewState(d) {
  // Live title preview: the title banner + ROAD TO #1 read world.state,
  // so selecting a slot updates them immediately (startGame resets first).
  try {
    const nh = typeof window !== 'undefined' ? window.__neonHarbor : null;
    if (!nh || !nh.state || !nh.state.mission) return;
    nh.state.mission.index = d ? d.mission : 0;
    nh.state.mission.done = !!(d && d.done);
    nh.state.cash = d ? d.cash : 0;
  } catch { /* preview is cosmetic */ }
}
export function setActiveSlot(i) {
  if (i < 1 || i > SLOT_COUNT) return null;
  lsSet(ACTIVE_KEY, String(i));
  const d = readSlot(i);
  lsSet(PROGRESS_KEY, String(d ? d.mission : 0));
  lastSave = null;
  previewState(d);
  return d;
}
export function deleteSlot(i) {
  if (i < 1 || i > SLOT_COUNT) return;
  lsDel(slotKey(i));
  if (i === activeSlot()) lsSet(PROGRESS_KEY, '0');
  lastSave = null;
  previewState(null);
}

export function snapshotFromState(st) {
  const taken = [];
  if (Array.isArray(st.collectibles)) {
    st.collectibles.forEach((c, idx) => { if (c && c.taken) taken.push(idx); });
  }
  return {
    mission: clampMission(st.mission ? st.mission.index : 0),
    cash: Math.max(0, Math.floor(st.cash || 0)),
    done: !!(st.mission && st.mission.done),
    upgrades: { ...(st.upgrades || {}) },
    taken,
    heat: Array.isArray(st.heat) ? st.heat.slice(0, 3) : [0, 0, 0],
    updated: Date.now(),
  };
}
export function saveActive(st) {
  if (!st || !st.mission) return;
  writeSlot(activeSlot(), snapshotFromState(st));
}

// Autosave, called every frame from ui2.js drawHud2 (live state only):
// immediate write when the mission advances, throttled (1.5 s) for
// cash-only changes, so localStorage is not hammered every frame.
let lastSave = null;
export function autosaveTick(st) {
  if (!st || !st.mission) return;
  const snap = snapshotFromState(st);
  const now = Date.now();
  if (!lastSave) { lastSave = { mission: snap.mission, cash: snap.cash, done: snap.done, at: now }; return; }
  const missionChanged = snap.mission !== lastSave.mission || snap.done !== lastSave.done;
  const cashChanged = snap.cash !== lastSave.cash;
  if (missionChanged || (cashChanged && now - lastSave.at >= 1500)) {
    writeSlot(activeSlot(), snap);
    lastSave = { mission: snap.mission, cash: snap.cash, done: snap.done, at: now };
  }
}

// Called from main.js startGame() AFTER world.reset(): restores the active
// slot's progress into the fresh world (mission + cash + upgrades +
// collectibles + heat). The legacy PROGRESS_KEY line in startGame already
// set mission.index; this applies the rest.
export function applyStart(world) {
  const d = readSlot(activeSlot());
  if (!d || !world || !world.state) return false;
  const st = world.state;
  st.mission.index = d.mission;
  st.mission.done = d.done;
  st.cash = d.cash;
  if (d.upgrades) st.upgrades = { ...d.upgrades };
  if (Array.isArray(d.heat)) st.heat = d.heat.slice();
  if (Array.isArray(st.collectibles)) {
    for (const c of st.collectibles) c.taken = false;
    for (const idx of d.taken) if (st.collectibles[idx]) st.collectibles[idx].taken = true;
  }
  lsSet(PROGRESS_KEY, String(d.mission));
  lastSave = { mission: d.mission, cash: d.cash, done: d.done, at: Date.now() };
  return true;
}

// Display strings for the title panel (ui2.js draws them).
function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + hh + ':' + mm;
}
export function slotLabel(i, d) {
  if (!d) return { line1: 'SLOT ' + i + ' — NEW GAME', line2: '— EMPTY —' };
  const cur = d.done ? 'ALL 13 DONE' : 'MISSION ' + Math.min(13, d.mission + 1) + '/13';
  const title = (MISSION_DEFS[d.mission] && MISSION_DEFS[d.mission].title) || '';
  return {
    line1: 'SLOT ' + i + ' · ' + cur,
    line2: (title ? title.toUpperCase() + ' · ' : '') + '$' + d.cash.toLocaleString('en-US') + (d.updated ? ' · ' + fmtDate(d.updated) : ''),
  };
}

// Title-screen input (called every frame from main.js handleActions while
// on the title screen). Keys 1/2/3 select a slot, Backspace/Delete clears
// the selected slot, clicking a slot row selects it. Returns true when an
// input was consumed (so main.js must not start the game that frame).
const prevDown = new Set();
export function titleInput(input) {
  let consumed = false;
  const codes = ['Digit1', 'Digit2', 'Digit3', 'Backspace', 'Delete'];
  for (const code of codes) {
    const down = input.keys.has(code);
    if (down && !prevDown.has(code)) {
      if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
        setActiveSlot(Number(code.slice(5)));
      } else {
        deleteSlot(activeSlot());
      }
      consumed = true;
    }
    if (down) prevDown.add(code); else prevDown.delete(code);
  }
  if (input.mouse && input.mouse.clicked) {
    for (let i = 1; i <= SLOT_COUNT; i++) {
      const r = slotRowRect(i);
      if (input.mouse.x >= r.x && input.mouse.x <= r.x + r.w
        && input.mouse.y >= r.y && input.mouse.y <= r.y + r.h) {
        setActiveSlot(i);
        consumed = true;
        break;
      }
    }
  }
  return consumed;
}

if (typeof window !== 'undefined') {
  window.__NHSaves = { titleInput, applyStart, listSlots, activeSlot, setActiveSlot, deleteSlot, saveActive, autosaveTick };
}
