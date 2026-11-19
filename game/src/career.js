// R35-F3 — Mission ratings + career stats.
// Post-cut file: imported ONLY from ui2.js (itself post-cut), so it adds
// 0 bytes to the dossier text field (the cut ends inside render.js).
// Ratings are computed from REAL run data observed in the ui2 layer:
// mission timer (elapsed), worst car/player damage seen during the run,
// and the highest wanted level reached. No counted file is edited and no
// new screen state is added to main.js — the career screen is an overlay
// toggled with C on the title / pause screens (ui2 owns the drawing).
import { MISSION_DEFS } from './missions.js';
import { COLLECTIBLE_COUNT, GARAGE_REPAIR } from './config.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const STORE_KEY = 'neon-harbor-career-v1';
const PANEL_MS = 6000;
const RELATCH_MS = 7000;

// Generous par times (seconds) per mission — a clean run beats par, a
// slow or messy run does not. Index 12 is Rocket Heist (45 s in the air
// plus steal + landing).
const PAR = [90, 120, 180, 150, 180, 200, 50, 120, 180, 240, 240, 150, 150];
// Max wanted the "clean" star tolerates. Heat missions (2 lose-the-heat,
// 6 hold 3 stars, 10 lose 4 stars, 12 HAF at 5 stars) expect heat, so
// their cap is 5; the rest must stay at 2 or below.
const HEAT_CAP = [2, 2, 5, 3, 3, 2, 5, 2, 2, 2, 5, 2, 5];
const DAMAGE_CAP = 25; // clean star needs <=25% worst damage

export function rateMission(idx, time, damagePct, maxWanted) {
  const par = PAR[Math.min(12, Math.max(0, idx || 0))];
  const cap = HEAT_CAP[Math.min(12, Math.max(0, idx || 0))];
  const timeStar = time <= par;
  const cleanStar = damagePct <= DAMAGE_CAP && maxWanted <= cap;
  const stars = 1 + (timeStar ? 1 : 0) + (cleanStar ? 1 : 0);
  const score = stars * 1000
    + Math.max(0, Math.round(par - time)) * 10
    + Math.max(0, Math.round(100 - damagePct));
  return { stars, score, timeStar, cleanStar, par, cap };
}

function titles() {
  const t = MISSION_DEFS.map((d) => d.title);
  while (t.length < 13) t.push(t.length === 12 ? 'Rocket Heist' : 'Mission ' + (t.length + 1));
  return t;
}

function fmtTime(s) {
  const v = Math.max(0, Math.round(s || 0));
  return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0');
}

// ---- persistent career store (localStorage, guarded) ----
function loadStore() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d !== 'object') return null;
    return d;
  } catch { return null; }
}
let career = loadStore() || {};
if (!career.ratings || typeof career.ratings !== 'object') career.ratings = {};
for (const k of ['missionCash', 'tokens', 'raceWins', 'taxiFares', 'elapsed', 'bestCash']) {
  if (typeof career[k] !== 'number') career[k] = 0;
}
let lastSave = 0;
function saveStore(force) {
  const now = Date.now();
  if (!force && now - lastSave < 10000) return;
  lastSave = now;
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORE_KEY, JSON.stringify(career));
  } catch { /* storage unavailable — career lives for the session only */ }
}

// ---- live run tracking (observed from drawHud2, once per frame) ----
let track = { idx: -1, minCar: 1, minHp: 1, maxWanted: 0 };
let lastPanel = null; // { rec, title, idx, reward, cash, at }
let careerOpen = false;
let careerOpenedOn = null; // screen the overlay was opened from
let careerScreen = null; // 'title' | 'pause' | null

export function careerNoteScreen(name) {
  // drawHud2 calls this with null on EVERY live frame — including paused
  // frames (render.js draws the HUD under the pause panel). So null must
  // NOT close unconditionally: it only closes an overlay opened on the
  // title screen (title -> play transition). An overlay opened on pause
  // stays open across resume and reappears on the next pause, like any
  // pause-menu panel.
  if (name === null && careerOpen && careerOpenedOn === 'title') {
    careerOpen = false;
    careerOpenedOn = null;
  }
  careerScreen = name;
}
export function careerIsOpen() { return careerOpen; }
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.code !== 'KeyC') return;
    if (careerScreen === 'title' || careerScreen === 'pause') {
      careerOpen = !careerOpen;
      careerOpenedOn = careerOpen ? careerScreen : null;
    }
  });
}

export function careerObserve(st, best) {
  // Latch FIRST: on the frame a mission completes, mission.index has
  // already advanced but mission.timer still holds the finished run's
  // elapsed time (startMission for the next mission runs next step).
  // track still holds the finished run's worst damage / max wanted.
  const ev = st.events && st.events.missionComplete;
  if (ev) {
    const now = Date.now();
    if (!lastPanel || now - lastPanel.at > RELATCH_MS) {
      const done = !!(st.mission && st.mission.done);
      const cIdx = done ? 12 : Math.max(0, (st.mission ? st.mission.index : 1) - 1);
      const time = st.mission ? (st.mission.timer || 0) : 0;
      const damagePct = Math.round(100 * (1 - Math.min(track.minCar, track.minHp)));
      const rec = {
        ...rateMission(cIdx, time, damagePct, track.maxWanted),
        time: Math.round(time), damage: damagePct, maxWanted: track.maxWanted,
      };
      const first = !career.ratings[cIdx];
      career.ratings[cIdx] = rec;
      if (first) career.missionCash += ev.reward || 0;
      lastPanel = { rec, title: ev.title || titles()[cIdx], idx: cIdx, reward: ev.reward || 0, cash: st.cash || 0, at: now };
      saveStore(true);
    }
  }
  // Tracking for the CURRENT mission (resets when the index changes).
  const idx = st.mission ? st.mission.index : 0;
  if (idx !== track.idx) track = { idx, minCar: 1, minHp: 1, maxWanted: 0 };
  const p = st.player;
  if (p) {
    if (p.inCar && p.car && typeof p.car.hp === 'number') {
      const max = (st.upgrades && st.upgrades.armor) ? 150 : GARAGE_REPAIR;
      track.minCar = Math.min(track.minCar, Math.max(0, p.car.hp) / max);
    }
    if (typeof p.health === 'number') track.minHp = Math.min(track.minHp, Math.max(0, p.health) / 100);
  }
  if (typeof st.wanted === 'number') track.maxWanted = Math.max(track.maxWanted, Math.floor(st.wanted));
  // Career totals (max of stored / live — the store survives reloads).
  if (st.collectibles) {
    let taken = 0;
    for (const c of st.collectibles) if (c.taken) taken += 1;
    if (taken > career.tokens) career.tokens = taken;
  }
  if (typeof st.raceWins === 'number' && st.raceWins > career.raceWins) career.raceWins = st.raceWins;
  if (typeof st.taxiFaresDone === 'number' && st.taxiFaresDone > career.taxiFares) career.taxiFares = st.taxiFaresDone;
  if (typeof st.elapsed === 'number' && st.elapsed > career.elapsed) career.elapsed = Math.round(st.elapsed);
  if (typeof st.cash === 'number' && st.cash > career.bestCash) career.bestCash = st.cash;
  if (typeof best === 'number' && best > career.bestCash) career.bestCash = best;
  saveStore(false);
}

export function careerPanel() {
  if (!lastPanel) return null;
  if (Date.now() - lastPanel.at > PANEL_MS) return null;
  return lastPanel;
}

export function careerSummary(prog) {
  const ids = Object.keys(career.ratings);
  const totalStars = ids.reduce((a, k) => a + (career.ratings[k].stars || 0), 0);
  const bestScore = ids.reduce((a, k) => Math.max(a, career.ratings[k].score || 0), 0);
  const done = Math.max(ids.length, prog ? (prog.done || 0) : 0);
  return {
    done, rated: ids.length, totalStars,
    avg: ids.length ? totalStars / ids.length : 0,
    bestScore, missionCash: career.missionCash,
  };
}

// Full stats for the career screen. st/live/prog are optional (null on
// pause, where the stored totals are already fresh from drawHud2).
export function careerScreenStats(st, best, live, prog) {
  const s = careerSummary(prog);
  let cash = career.bestCash, tokens = career.tokens;
  let raceWins = career.raceWins, taxiFares = career.taxiFares, elapsed = career.elapsed;
  if (st) {
    if (typeof st.cash === 'number') cash = st.cash;
    if (st.collectibles) {
      let taken = 0;
      for (const c of st.collectibles) if (c.taken) taken += 1;
      tokens = Math.max(tokens, taken);
    }
    if (typeof st.raceWins === 'number') raceWins = Math.max(raceWins, st.raceWins);
    if (typeof st.taxiFaresDone === 'number') taxiFares = Math.max(taxiFares, st.taxiFaresDone);
    if (typeof st.elapsed === 'number') elapsed = Math.max(elapsed, Math.round(st.elapsed));
  }
  if (live && typeof live.cash === 'number') cash = live.cash;
  if (typeof best === 'number') career.bestCash = Math.max(career.bestCash, best);
  // R35 merge fix: token total follows the game (20 after F8), not the
  // hardcoded 12 the career screen was written against. st is null on
  // the title screen, so fall back to the config constant (20).
  const tokenTotal = (st && st.collectibles) ? st.collectibles.length : COLLECTIBLE_COUNT;
  return {
    ...s, cash, tokens, tokenTotal, raceWins, taxiFares,
    elapsed, bestCash: career.bestCash,
  };
}

// Test-only reset (node harness): clears the latch + trackers + store.
export function careerTestReset() {
  career = { ratings: {}, missionCash: 0, tokens: 0, raceWins: 0, taxiFares: 0, elapsed: 0, bestCash: 0 };
  track = { idx: -1, minCar: 1, minHp: 1, maxWanted: 0 };
  lastPanel = null;
  lastSave = 0;
  careerOpen = false;
  careerOpenedOn = null;
  careerScreen = null;
}

// ---- drawing (self-contained helpers; ui2.js is NOT imported back) ----
function T(c, s, x, y, z, k, a, w) {
  c.font = (w || '') + ' ' + z + 'px ' + FONT;
  c.fillStyle = k; c.textAlign = a || 'left'; c.textBaseline = 'alphabetic';
  c.fillText(s, x, y);
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function panel(c, x, y, w, h, accent) {
  c.fillStyle = 'rgba(10,14,26,0.94)'; rr(c, x, y, w, h, 10); c.fill();
  c.lineWidth = 2; c.strokeStyle = accent || '#37e0e6'; rr(c, x, y, w, h, 10); c.stroke();
}
function starPath(c, x, y, s) {
  c.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? s : s * 0.45;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
}
function drawStars(c, cx, y, s, n, gap) {
  for (let i = 0; i < 3; i += 1) {
    const x = cx + (i - 1) * gap;
    starPath(c, x, y, s);
    if (i < n) { c.fillStyle = '#ffd23e'; c.fill(); c.save(); c.shadowColor = '#ffd23e'; c.shadowBlur = 12; c.fill(); c.restore(); }
    else { c.fillStyle = 'rgba(238,241,245,0.14)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(238,241,245,0.5)'; c.stroke(); }
  }
}
function scaleFor(view) {
  return Math.max(0.5, Math.min(1, Math.min(view.w / 1280, view.h / 800)));
}
function fmtMoney(n) { return '$' + (n || 0).toLocaleString('en-US'); }

export function drawRatingPanel(c, view, p) {
  const s = scaleFor(view);
  const W = 480, H = 336;
  c.save();
  c.translate(view.w / 2, view.h / 2); c.scale(s, s); c.translate(-W / 2, -H / 2);
  panel(c, 0, 0, W, H, '#ffd23e');
  const hg = c.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, 'rgba(255,210,62,0.35)'); hg.addColorStop(1, 'rgba(255,77,157,0.35)');
  c.fillStyle = hg; rr(c, 2, 2, W - 4, 52, 8); c.fill();
  T(c, '★ MISSION COMPLETE ★', W / 2, 34, 22, '#ffffff', 'center', 'bold');
  T(c, 'CHAPTER ' + (p.idx + 1) + '/13 — ' + p.title.toUpperCase(), W / 2, 84, 15, '#37e0e6', 'center', 'bold');
  drawStars(c, W / 2, 128, 24, p.rec.stars, 64);
  T(c, 'SCORE ' + p.rec.score.toLocaleString('en-US'), W / 2, 184, 28, '#ffd23e', 'center', 'bold');
  const rows = [
    ['TIME  ' + fmtTime(p.rec.time) + '  ·  PAR ' + fmtTime(p.rec.par), p.rec.timeStar],
    ['DAMAGE  ' + p.rec.damage + '%  ·  CLEAN ≤ ' + DAMAGE_CAP + '%', p.rec.cleanStar && p.rec.damage <= DAMAGE_CAP],
    ['HEAT  ' + p.rec.maxWanted + '★ MAX  ·  CAP ' + p.rec.cap + '★', p.rec.maxWanted <= p.rec.cap],
  ];
  rows.forEach((r, i) => {
    const y = 214 + i * 26;
    T(c, r[0], 28, y, 15, '#eef1f5', 'left');
    T(c, r[1] ? '✓' : '✗', W - 28, y, 16, r[1] ? '#7be382' : '#ff5a3c', 'right', 'bold');
  });
  T(c, '+' + fmtMoney(p.reward) + '   ·   TOTAL CASH ' + fmtMoney(p.cash), W / 2, 306, 16, '#7be382', 'center', 'bold');
  T(c, 'Saved to your career record', W / 2, 326, 11, '#c8cdd6', 'center');
  c.restore();
}

export function drawCareerScreen(c, view, st) {
  const s = scaleFor(view);
  const W = 660, H = 540;
  c.save();
  c.translate(view.w / 2, view.h / 2); c.scale(s, s); c.translate(-W / 2, -H / 2);
  panel(c, 0, 0, W, H, '#37e0e6');
  const hg = c.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, 'rgba(55,224,230,0.35)'); hg.addColorStop(1, 'rgba(255,77,157,0.35)');
  c.fillStyle = hg; rr(c, 2, 2, W - 4, 56, 8); c.fill();
  T(c, 'CAREER STATS', W / 2, 34, 28, '#ffffff', 'center', 'bold');
  T(c, 'JAX MARLOWE  ·  NEON HARBOR', W / 2, 52, 12, '#37e0e6', 'center', 'bold');
  const cells = [
    ['MISSIONS DONE', st.done + '/13'],
    ['TOTAL STARS', '★ ' + st.totalStars + '/39'],
    ['AVG RATING', st.rated ? st.avg.toFixed(1) + ' ★' : '–'],
    ['BEST SCORE', st.bestScore.toLocaleString('en-US')],
    ['TOTAL CASH', fmtMoney(st.cash)],
    ['MISSION PAY', fmtMoney(st.missionCash)],
    ['HARBOR TOKENS', st.tokens + '/' + st.tokenTotal],
    ['TIME PLAYED', fmtTime(st.elapsed)],
  ];
  cells.forEach((cell, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 24 + col * 156, y = 76 + row * 66;
    c.fillStyle = 'rgba(14,20,32,0.85)'; rr(c, x, y, 144, 56, 8); c.fill();
    c.lineWidth = 1; c.strokeStyle = 'rgba(55,224,230,0.4)'; rr(c, x, y, 144, 56, 8); c.stroke();
    T(c, cell[0], x + 72, y + 18, 10, '#c8cdd6', 'center', 'bold');
    T(c, cell[1], x + 72, y + 44, 20, '#ffffff', 'center', 'bold');
  });
  T(c, 'RACE WINS ' + st.raceWins + '   ·   TAXI FARES ' + st.taxiFares + '   ·   BEST CASH ' + fmtMoney(st.bestCash),
    W / 2, 226, 13, '#c8cdd6', 'center');
  c.strokeStyle = 'rgba(55,224,230,0.4)'; c.lineWidth = 1;
  c.beginPath(); c.moveTo(24, 242); c.lineTo(W - 24, 242); c.stroke();
  T(c, 'MISSION RATINGS', 24, 268, 15, '#ffd23e', 'left', 'bold');
  const names = titles();
  names.forEach((name, i) => {
    const col = i < 7 ? 0 : 1, row = i < 7 ? i : i - 7;
    const x = 24 + col * 318, y = 292 + row * 26;
    const rec = career.ratings[i];
    T(c, String(i + 1).padStart(2, '0') + '  ' + name, x, y, 13, rec ? '#eef1f5' : '#8a919e', 'left');
    if (rec) {
      let stars = '';
      for (let k = 0; k < 3; k += 1) stars += k < rec.stars ? '★' : '☆';
      T(c, stars + '  ' + rec.score.toLocaleString('en-US'), x + 294, y, 13, '#ffd23e', 'right', 'bold');
    } else {
      T(c, '☆☆☆  not yet', x + 294, y, 13, '#8a919e', 'right');
    }
  });
  T(c, 'Ratings are earned from real runs — time vs par, damage, heat.   C — close',
    W / 2, H - 16, 12, '#c8cdd6', 'center');
  c.restore();
}
