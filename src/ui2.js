// ui2.js — Neon Harbor UI v2 (Laras UI team, 2026-11-18)
// Pure Canvas 2D, same neon palette as config.js. Drop-in as game/src/ui2.js.
// Post-cut module: integration wiring is only a few calls in render.js.
// All content is our own (Neon Harbor / Jax / Mara) — no rival text or art.
// UI-TOP (batch a, base cb4130f): Bug 7 numbering fix + MILITARY banner slot +
// stats-panel tidy + ROAD TO #1 1px border. See PATCH-SPEC-UI-TOP.md.
import { COLORS as C, RADIO_STATIONS, UPGRADES, WEAPON_ORDER, WEAPONS, WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';
import { drawMinimap } from './minimap.js';
import { activeSlot, autosaveTick, listSlots, slotLabel, slotRowRect, SLOT_PANEL } from './saves.js';
import { rankProgress } from './rank.js';
import { DISTRICT7, districtPrice, ensureDistricts, garageStandingLine, policeEffectLine, standingColor, standingLabel } from './districts.js';
import { drawWheel } from './wheel.js';
import { CREW, applyCrew, getActiveCrew, policeWarning } from './crew.js';
import { drawJaxPortrait, drawMaraPortrait, drawRenoPortrait } from './portraits.js';
// R35-F3: mission ratings + career stats (career.js is post-cut too).
import { careerIsOpen, careerNoteScreen, careerObserve, careerPanel, careerScreenStats, careerSummary, drawCareerScreen, drawRatingPanel } from './career.js';
import { EXPORT_LIST, JOB_ZONES, jobsHud } from './jobs.js'; // R35-F7

// Touch controls (post-cut wiring, 0 bytes in the dossier text): on touch
// devices only, load touch.js with a dynamic import — the dossier's static
// import walk skips dynamic import(), so this adds nothing to the dossier.
// Desktop stays completely clean: no elements, no listeners, no import.
if (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) {
  import('./touch.js').catch(() => {});
}

const FONT = 'system-ui';
function T(c, s, x, y, z, k, a, w) {
  c.font = (w || '') + ' ' + z + 'px ' + FONT;
  c.fillStyle = k || '#eef1f5';
  c.textAlign = a || 'left';
  c.textBaseline = 'middle';
  c.fillText(s, x, y);
}
function W(c, s, x, y, w, z, k, lh) {
  // word-wrap text inside width w; returns lines drawn
  c.font = z + 'px ' + FONT;
  const words = String(s).split(' ');
  const lines = [];
  let line = '';
  for (const wd of words) {
    const t = line ? line + ' ' + wd : wd;
    if (c.measureText(t).width > w && line) { lines.push(line); line = wd; }
    else line = t;
  }
  if (line) lines.push(line);
  lines.forEach((ln, i) => T(c, ln, x, y + i * (lh || z + 6), z, k, 'left'));
  return lines.length;
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
export function drawPanel(c, x, y, w, h, a) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#151d2ee8'); g.addColorStop(1, '#0a0f1cd9');
  c.save();
  c.shadowColor = a || C.neonCyan; c.shadowBlur = 16;
  c.fillStyle = g; rr(c, x, y, w, h, 10); c.fill();
  c.restore();
  c.lineWidth = 2; c.strokeStyle = a || C.neonCyan; rr(c, x, y, w, h, 10); c.stroke();
  // corner ticks
  c.lineWidth = 3; c.strokeStyle = a || C.neonCyan;
  const L = 12;
  [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([px, py, sx, sy]) => {
    c.beginPath(); c.moveTo(px + sx * L, py); c.lineTo(px, py); c.lineTo(px, py + sy * L); c.stroke();
  });
}
export function drawPill(c, x, y, w, h, fill, stroke) {
  c.fillStyle = fill; rr(c, x, y, w, h, h / 2); c.fill();
  if (stroke) { c.lineWidth = 1.5; c.strokeStyle = stroke; rr(c, x, y, w, h, h / 2); c.stroke(); }
}
function starPath(c, x, y, s) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -1.57 + i * 0.63, r = (i % 2 ? 0.45 : 1) * s;
    c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
}
export function drawStar2(c, x, y, s, filled, military) {
  c.save();
  if (filled) {
    c.shadowColor = military ? '#ff3b30' : '#ffd23e'; c.shadowBlur = 10;
    c.fillStyle = military ? '#ff5a3c' : '#ffd23e';
    starPath(c, x, y, s); c.fill();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.55)';
    starPath(c, x - s * 0.15, y - s * 0.2, s * 0.35); c.fill();
  } else {
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(238,241,245,0.4)';
    starPath(c, x, y, s); c.stroke();
  }
  c.restore();
}
export function drawWantedRow2(c, x, y, s, n, filled) {
  for (let i = 0; i < n; i++) drawStar2(c, x + i * s * 1.35, y, s, i < filled, i >= 5);
}
export function drawCashIcon2(c, x, y, s) {
  c.save(); c.shadowColor = C.cash; c.shadowBlur = 8;
  c.fillStyle = C.cash; c.beginPath(); c.arc(x, y, s * 0.55, 0, 7); c.fill();
  c.shadowBlur = 0; c.fillStyle = '#0e1420';
  c.font = 'bold ' + Math.round(s * 0.7) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('$', x, y + 1); c.restore();
}
export function drawHeart2(c, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = '#ff4d9d';
  c.beginPath(); c.arc(-0.22, -0.08, 0.28, 0, 7); c.arc(0.22, -0.08, 0.28, 0, 7); c.fill();
  c.beginPath(); c.moveTo(-0.5, 0); c.lineTo(0.5, 0); c.lineTo(0, 0.55); c.closePath(); c.fill();
  c.restore();
}
// ---- minimap icons: redrawn BIGGER + white keylines (fixes the promised fix) ----
function M(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); }
function ME(c) { c.restore(); }
export function drawMapPlayer2(c, x, y, s, g) {
  M(c, x, y, s); c.rotate(g || 0);
  c.shadowColor = C.player; c.shadowBlur = 6;
  c.fillStyle = C.player;
  c.beginPath(); c.moveTo(0, -0.7); c.lineTo(0.55, 0.55); c.lineTo(0, 0.25); c.lineTo(-0.55, 0.55); c.closePath(); c.fill();
  c.shadowBlur = 0; c.lineWidth = 0.12; c.strokeStyle = '#fff'; c.stroke(); ME(c);
}
export function drawMapPolice2(c, x, y, s, roadblock) {
  const r = roadblock ? s * 0.62 : s * 0.5;
  c.save(); c.shadowColor = '#ff3b30'; c.shadowBlur = roadblock ? 8 : 0;
  c.fillStyle = roadblock ? '#ff3b30' : C.police;
  rr(c, x - r, y - r, r * 2, r * 2, 2); c.fill();
  c.shadowBlur = 0; c.lineWidth = 1.5; c.strokeStyle = '#fff';
  rr(c, x - r, y - r, r * 2, r * 2, 2); c.stroke(); c.restore();
}
export function drawMapMission2(c, x, y, s, t) {
  const p = 1 + 0.18 * Math.sin(t * 4);
  c.save();
  c.strokeStyle = C.player; c.lineWidth = 2.5;
  c.beginPath(); c.arc(x, y, s * 0.55 * p, 0, 7); c.stroke();
  c.fillStyle = C.player;
  c.beginPath(); c.moveTo(x, y - s * 0.4); c.lineTo(x + s * 0.4, y); c.lineTo(x, y + s * 0.4); c.lineTo(x - s * 0.4, y); c.closePath(); c.fill();
  c.fillStyle = '#0e1420'; c.font = 'bold ' + Math.round(s * 0.55) + 'px ' + FONT;
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', x, y + 0.5); c.restore();
}
export function drawMapWrench2(c, x, y, s) {
  M(c, x, y, s); c.lineWidth = 0.22; c.strokeStyle = C.neonCyan;
  c.beginPath(); c.moveTo(-0.4, 0.4); c.lineTo(0.25, -0.25); c.stroke();
  c.lineWidth = 0.14; c.strokeStyle = '#fff';
  c.beginPath(); c.arc(0.38, -0.38, 0.3, 0, 7); c.stroke(); ME(c);
}
export function drawMapGas2(c, x, y, s) {
  M(c, x, y, s);
  c.fillStyle = '#ff9d4d'; c.fillRect(-0.34, -0.45, 0.68, 0.9);
  c.fillRect(0.34, -0.1, 0.2, 0.45);
  c.fillStyle = '#0e1420'; c.fillRect(-0.2, -0.25, 0.4, 0.2);
  c.lineWidth = 0.1; c.strokeStyle = '#fff'; c.strokeRect(-0.34, -0.45, 0.68, 0.9); ME(c);
}
export function drawMapHydrant2(c, x, y, s) {
  M(c, x, y, s);
  c.fillStyle = '#ff3b30'; c.fillRect(-0.32, -0.34, 0.64, 0.85);
  c.fillRect(-0.46, -0.06, 0.92, 0.18);
  c.fillStyle = C.player; c.fillRect(-0.16, -0.52, 0.32, 0.18);
  c.lineWidth = 0.1; c.strokeStyle = '#fff'; c.strokeRect(-0.32, -0.34, 0.64, 0.85); ME(c);
}
export function drawMapBridge2(c, x, y, s, up) {
  M(c, x, y, s);
  c.fillStyle = C.player; c.fillRect(-0.55, -0.14, 1.1, 0.28);
  c.fillStyle = '#0e1420';
  for (let i = 0; i < 3; i++) c.fillRect(-0.55 + i * 0.37, -0.14, 0.18, 0.28);
  if (up) { c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(0.45, -0.35, 0.16, 0, 7); c.fill(); }
  c.lineWidth = 0.1; c.strokeStyle = '#fff'; c.strokeRect(-0.55, -0.14, 1.1, 0.28); ME(c);
}
export function drawMapDot2(c, x, y, r, fill, ring) {
  c.save();
  c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  c.lineWidth = 1.5; c.strokeStyle = ring || '#fff';
  c.beginPath(); c.arc(x, y, r + 1.5, 0, 7); c.stroke(); c.restore();
}

// ---- minimap v2: same world, bigger icons, framed + labeled ----
// Shape: 'square' (shipped default) or 'round' — preview with ?minimap=round
// in the URL (shot harness). Juna picks the shipped default; the round
// variant clips the SAME world to a circle in the SAME slot, so the A/B is
// shape-only. Title screen uses this same square map now (drawTitle2 calls
// drawMinimap in the old radar's slot) — the round radar in city3d.js
// frame() was deleted (Juna: "dari mapnya beda banget").
function minimapShape() {
  try {
    return new URLSearchParams(window.location.search).get('minimap') === 'round' ? 'round' : 'square';
  } catch (e) { return 'square'; }
}
export function drawMinimap2(c, st, x, y, w, h) {
  // BEAT-GHK A1b: delegate the world + frame + label to the redrawn
  // drawMinimap in minimap.js (the live minimap was drawMinimap2 inline;
  // minimap.js was unimported, so the redraw alone changed nothing).
  drawMinimap(c, st, x, y, w, h);
  // R35-F2: district standing panel rides on the minimap's own call
  // (same pattern as the PD panel). Fixed height so the PD panel below
  // it never moves: panel y = minimap bottom + 34, PD y = panel + 8.
  const dpx = x + w + 6 - 232, dpy = y + h + 34;
  drawDistrictPanel2(c, st, dpx, dpy, 232);
  drawPdPanel2(c, st, dpx, dpy + DISTRICT_PANEL_H + 8, 232);
}
// R35-F2: DISTRICT STANDING panel — 7 districts, Friendly/Neutral/Wary.
// Height is FIXED (header 22 + 7 rows x 15 + footer 18 + padding) so the
// PD panel + military pill below it never shift when rows change.
export const DISTRICT_PANEL_H = 164;
export function drawDistrictPanel2(c, st, x, y, w) {
  const s = ensureDistricts(st);
  const h = DISTRICT_PANEL_H;
  drawPanel(c, x, y, w, h, C.neonCyan);
  T(c, 'DISTRICT STANDING', x + 12, y + 16, 12, C.neonCyan, 'left', 'bold');
  T(c, '7 DISTRICTS', x + w - 10, y + 16, 10, '#c8cdd6', 'right', 'bold');
  s.scores.forEach((sc, i) => {
    const ry = y + 28 + i * 15;
    const d = DISTRICT7[i];
    const lab = standingLabel(sc);
    if (i === s.current) { c.fillStyle = 'rgba(55,224,230,0.14)'; rr(c, x + 6, ry - 1, w - 12, 14, 4); c.fill(); }
    c.fillStyle = standingColor(sc);
    c.beginPath(); c.arc(x + 16, ry + 6, 3.5, 0, 7); c.fill();
    T(c, d.name.toUpperCase(), x + 26, ry + 6, 11, i === s.current ? '#ffffff' : '#eef1f5', 'left', 'bold');
    T(c, lab + ' ' + (sc > 0 ? '+' : '') + sc, x + w - 10, ry + 6, 11, standingColor(sc), 'right', 'bold');
  });
  T(c, '★ ' + policeEffectLine(st), x + 12, y + h - 12, 10, '#c8cdd6', 'left', 'bold');
}
// ---- ROAD TO #1: progress meter toward rank 1 (13 missions = 100%) ----
// UI-TOP: the meter counts missions DONE (0-based completed count). The
// count is labelled DONE so it can never be read as the current mission
// number; the bottom objective bar carries the current mission instead.
export function drawRoadTo1(c, x, y, w, done, total, next, big) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  const complete = done >= total;
  const h = big ? 18 : 12;
  // backing card so the meter stays readable over busy backdrops
  c.fillStyle = 'rgba(10,15,28,0.72)';
  rr(c, x - 8, y - 8, w + 16, big ? 80 : 54, 10); c.fill();
  // UI-TOP (bible §6.5): 1px accent border, radius 10 like drawPanel.
  c.lineWidth = 1.5; c.strokeStyle = complete ? '#ffd23e' : 'rgba(55,224,230,0.65)';
  rr(c, x - 8, y - 8, w + 16, big ? 80 : 54, 10); c.stroke();
  T(c, 'ROAD TO #1', x, y, big ? 16 : 13, complete ? '#ffd23e' : C.neonCyan, 'left', 'bold');
  T(c, done + '/' + total + ' DONE  ·  ' + pct + '%', x + w, y, big ? 16 : 13, complete ? '#ffd23e' : '#eef1f5', 'right', 'bold');
  const by = y + (big ? 16 : 12);
  c.fillStyle = '#0a0f1c'; rr(c, x, by, w, h, h / 2); c.fill();
  const segW = (w - (total - 1) * 3) / total;
  for (let i = 0; i < total; i++) {
    if (i >= done) break;
    const g = c.createLinearGradient(x, 0, x + w, 0);
    if (complete) { g.addColorStop(0, '#ffd23e'); g.addColorStop(1, '#ff9a3c'); }
    else { g.addColorStop(0, '#37e0e6'); g.addColorStop(0.55, '#ff4d9d'); g.addColorStop(1, '#ffd23e'); }
    c.save(); if (complete) { c.shadowColor = '#ffd23e'; c.shadowBlur = 10; }
    c.fillStyle = g; rr(c, x + i * (segW + 3), by, segW, h, h / 2); c.fill(); c.restore();
  }
  c.lineWidth = 1.5; c.strokeStyle = complete ? '#ffd23e' : 'rgba(238,241,245,0.35)';
  rr(c, x, by, w, h, h / 2); c.stroke();
  if (complete) {
    drawPill(c, x + w / 2 - 92, by + h + 8, 184, 24, '#ffd23e', '#fff');
    T(c, '★ HARBOR KING #1 ★', x + w / 2, by + h + 21, 13, '#0e1420', 'center', 'bold');
  } else if (next) {
    T(c, 'NEXT: ' + next, x, by + h + 12, 12, '#c8cdd6', 'left', 'bold');
  }
}
// ---- HUD v2 ----
// ---- HUD layout: scale-aware clusters (R27c HUD fix) ----
// Design space is 1280x800 — the size every HUD panel was measured for.
// Live-play video is recorded at a 640x360 viewport (upscaled to 1280x720),
// where the fixed-pixel HUD is ~2x too big for the screen: the day pill
// runs under the minimap, the ROAD TO #1 card collides with the stats panel
// and the minimap, the target compass lands on the stats panel (covering
// PISTOL / HARBOR TOKENS), the mission bar covers the speedo's KM/H, and
// the Mara dialogue covers ~40% of the screen. Each HUD cluster is
// therefore drawn in design coords under a uniform scale
// s = clamp(min(w/1280, h/800), 0.5, 1), anchored at its screen corner, so
// clusters keep their relative layout at ANY viewport and can never overlap
// each other. At 1280x800 s = 1 (pixel-identical to the sealed R27b HUD).
export const HUD_DESIGN_W = 1280;
export const HUD_DESIGN_H = 800;
export function hudScaleFor(view) {
  return Math.max(0.5, Math.min(1, view.w / HUD_DESIGN_W, view.h / HUD_DESIGN_H));
}
// Draw fn() in design coords, with design point (ax,ay) pinned to screen
// point (sx,sy), uniformly scaled by k.
export function hudCluster(c, ax, ay, sx, sy, k, fn) {
  c.save();
  c.translate(sx, sy); c.scale(k, k); c.translate(-ax, -ay);
  fn();
  c.restore();
}
function segBar(c, x, y, w, h, frac, color, segs) {
  const sw = (w - (segs - 1) * 2) / segs, n = Math.round(frac * segs);
  for (let i = 0; i < segs; i++) {
    c.fillStyle = i < n ? color : '#2a3242';
    rr(c, x + i * (sw + 2), y, sw, h, 3); c.fill();
  }
}
// ---- HUD-BEAT-GHK: weapon slot bar (own design) ----
// One slot per weapon in WEAPON_ORDER (R35-F4: 5 slots — fists first, rifle
// last; slot width 48 so 5 x 48 + 4 x 5 = 260 fits the 284-wide panel).
// Owned = ammo+reserve > 0 (fists always owned); active slot gets its weapon
// colour border + tint + top tick; unowned slots stay dimmed, never hidden,
// so the full arsenal is always visible. Ammo is per slot; fists shows ∞.
function drawWeaponSlots(c, x, y, w, p) {
  const ws = (p && p.weapons) || {};
  WEAPON_ORDER.forEach((key, i) => {
    const def = WEAPONS[key];
    const have = ws[key] || { ammo: 0, reserve: 0 };
    const owned = key === 'fists' || have.ammo + have.reserve > 0;
    const active = owned && p.weapon === key;
    const sx = x + i * (w + 5);
    c.fillStyle = active ? def.color + '30' : '#0e1420';
    rr(c, sx, y, w, 32, 6); c.fill();
    c.lineWidth = active ? 2 : 1.5;
    c.strokeStyle = active ? def.color : 'rgba(238,241,245,0.25)';
    rr(c, sx, y, w, 32, 6); c.stroke();
    if (active) { c.fillStyle = def.color; c.fillRect(sx + 4, y, w - 8, 3); }
    T(c, def.name.toUpperCase(), sx + w / 2, y + 11, 9, owned ? '#ffffff' : '#5a6270', 'center', 'bold');
    T(c, key === 'fists' ? '∞' : owned ? have.ammo + '/' + have.reserve : '—', sx + w / 2, y + 24, 10, active ? '#ffd23e' : owned ? '#eef1f5' : '#5a6270', 'center', 'bold');
  });
}
// ---- R35-F5: Rank + RP replaces the old RESPECT tiers ----
// Same panel slot, real progression now: RP comes from rank.js, derived
// from missions actually finished (reward/10) + Harbor Tokens actually
// collected (25 each) — see game/src/rank.js. The bar is progress to the
// NEXT rank, not the mission count (ROAD TO #1 already shows that).
// ---- HUD-BEAT-GHK: vehicle display names (own labels) ----
// car.body values come from traffic.js / vehicles.js (sedan, van, taxi,
// bus, fire, medic, apc, hatchback, sedanL, pickup, police); no import —
// this map is display-only and a fallback uppercases anything unknown.
const VEHICLE_LABELS = { sedan: 'SEDAN', sedanL: 'SEDAN', hatch: 'HATCHBACK', hatchback: 'HATCHBACK', van: 'VAN', taxi: 'TAXI', bus: 'CITY BUS', fire: 'FIRE TRUCK', medic: 'AMBULANCE', apc: 'APC', pickup: 'PICKUP', police: 'PD CRUISER' };
function vehicleLabel(body) {
  return VEHICLE_LABELS[body] || (body ? String(body).toUpperCase() : 'STREET CAR');
}
// ---- HUD-BEAT-GHK: radio mini-panel (station + genre/BPM) ----
// No song titles exist in state (the radio is generative WebAudio loops in
// music.js), so line 2 is the station's real tag + BPM from RADIO_STATIONS.
// Same 132 px slot as the old pill, so the mode badge in render.js (x 152,
// same row) stays glued to its right edge.
function drawRadioPanel2(c, x, y, w, stationName) {
  const stn = RADIO_STATIONS.find((s) => s.name === stationName);
  const sub = stn ? stn.tag.toUpperCase() + ' · ' + stn.bpm + ' BPM' : 'ON AIR';
  c.fillStyle = '#0e1420e6'; rr(c, x, y, w, 38, 8); c.fill();
  c.lineWidth = 1.5; c.strokeStyle = C.neonPink; rr(c, x, y, w, 38, 8); c.stroke();
  T(c, '♪ ' + stationName.toUpperCase(), x + w / 2, y + 13, 11, C.neonPink, 'center', 'bold');
  T(c, sub, x + w / 2, y + 28, 10, '#c8cdd6', 'center', 'bold');
}
// R35-F1: Harbor Crew panel — always in the HUD (left column, under the
// radio pill which ends y234). Three members, one active at a time: JAX
// driver, MARA lookout, RENO mechanic. B cycles, 1/2/3 select (crew.js).
// The active row is highlighted with its live effect; when Mara is active
// and police are out, her row's blurb becomes the early warning with the
// distance to the nearest unit.
function drawCrewPanel(c, st, x, y, w) {
  const act = getActiveCrew();
  const h = 118;
  drawPanel(c, x, y, w, h, C.neonCyan);
  T(c, 'CREW', x + 12, y + 14, 11, C.neonCyan, 'left', 'bold');
  T(c, 'B switch · 1/2/3 select', x + w - 12, y + 14, 10, '#c8cdd6', 'right');
  // Mara's early warning rides on HER row (no separate pill: the target
  // compass slides along the left edge here, and a pill under the panel
  // would collide with it).
  const warn = policeWarning(st);
  CREW.forEach((m, i) => {
    const ry = y + 24 + i * 30;
    const on = m.id === act;
    if (on) {
      c.fillStyle = 'rgba(55,224,230,0.14)'; rr(c, x + 6, ry, w - 12, 28, 6); c.fill();
      c.fillStyle = m.color; c.fillRect(x + 6, ry, 3, 28);
    }
    const face = m.id === 'jax' ? drawJaxPortrait : m.id === 'mara' ? drawMaraPortrait : drawRenoPortrait;
    face(c, x + 12, ry + 2, 22, 24);
    T(c, m.name + ' — ' + m.role, x + 42, ry + 10, 12, on ? '#ffffff' : '#eef1f5', 'left', 'bold');
    const alarming = m.id === 'mara' && warn !== null;
    T(c, alarming ? '⚠ POLICE INBOUND — ' + warn + 'm' : m.blurb, x + 42, ry + 21, 9, on ? (alarming ? '#ff8a7a' : '#ffd23e') : '#c8cdd6', 'left');
    if (on) {
      drawPill(c, x + w - 60, ry + 6, 52, 16, m.color, '#fff');
      T(c, 'ACTIVE', x + w - 34, ry + 15, 9, '#0e1420', 'center', 'bold');
    }
  });
}
export function drawHud2(c, st, best, ui, view) {
  autosaveTick(st); // R35-F6: autosave the active slot as mission/cash change
  const p = st.player;
  applyCrew(st); // R35-F1: sync active crew member + Reno garage discount.
  // R27c HUD fix: all coordinates below are DESIGN coords (1280x800).
  // Each cluster is drawn under a uniform scale anchored at its screen
  // corner (see hudCluster above), so the layout is identical at 1280x800
  // and overlap-free at any smaller viewport (640x360 live-play recording,
  // 1280x720 re-record). SW/SH are the real screen size.
  const W2 = HUD_DESIGN_W, H2 = HUD_DESIGN_H;
  const SW = view.w, SH = view.h;
  const s = hudScaleFor(view);
  const collected = st.collectibles.filter((k) => k.taken).length;
  careerNoteScreen(null); // R35-F3: closes a title-opened overlay on play
  careerObserve(st, best); // R35-F3: mission tracking + completion latch
  const jh = jobsHud(st); // R35-F7: district jobs + exports
  // ---- top-left cluster: stats panel + radio pill (anchor 0,0) ----
  hudCluster(c, 0, 0, 0, 0, s, () => {
  drawPanel(c, 12, 12, 284, 176, C.neonCyan);
  drawCashIcon2(c, 32, 36, 13);
  T(c, '$' + st.cash.toLocaleString('en-US'), 50, 36, 28, C.cash, 'left', 'bold');
  // UI-TOP: right-edge numbers share one inner margin (x 284 = panel edge
  // 296 minus 12) and are right-aligned, so they never creep toward the
  // panel edge or jitter when a digit is added/removed (bible §6.2).
  T(c, 'BEST $' + best.toLocaleString('en-US'), 284, 30, 12, '#c8cdd6', 'right');
  drawHeart2(c, 32, 66, 9);
  segBar(c, 48, 58, 190, 16, Math.max(0, p.health / 100), p.health > 30 ? '#4ade80' : '#ef4444', 10);
  T(c, Math.round(p.health) + ' HP', 284, 66, 13, '#eef1f5', 'right', 'bold');
  T(c, 'WANTED', 24, 96, 11, '#c8cdd6', 'left', 'bold');
  drawWantedRow2(c, 96, 96, 12, 6, Math.floor(st.wanted));
  // R35-F4+F5: 5 weapon slots (F4 wheel) + RANK/RP meter (F5) + tokens
  // (panel unchanged 284x176 — the slots replace the old weapon row + pips
  // at the same band, RANK/RP takes the old RESPECT row's slot, tokens
  // shrink to 11 px at the panel bottom; the radio pill below stays in
  // its 132 px slot).
  drawWeaponSlots(c, 24, 108, 48, p);
  const rp = rankProgress(st);
  T(c, 'RANK  ·  ' + rp.rank, 24, 150, 11, C.neonCyan, 'left', 'bold');
  T(c, rp.rp + ' RP', 284, 150, 11, '#ffd23e', 'right', 'bold');
  segBar(c, 24, 156, 260, 10, rp.frac, '#ffd23e', 10);
  T(c, '◆ ' + collected + '/' + st.collectibles.length + ' HARBOR TOKENS', 24, 180, 11, C.neonYellow, 'left', 'bold');
  if (ui && ui.stationName) {
    drawRadioPanel2(c, 12, 196, 132, ui.stationName);
  }
  // R35-F1: crew panel (radio ends y234).
  drawCrewPanel(c, st, 12, 244, 284);
  });
  // ---- right rail: district jobs / exports (R35-F7) ----
  // F7-B jobs panel + F7-A/F7-C counters. RIGHT rail, y 540..644 (MERGE
  // FIX: the F7 slot y336..440 collided with the PD panel in the merged
  // build — F2's district panel (y170..334, H164 fixed) pushes the PD
  // panel to y342, max 152 tall (ends 494), + military pill at wanted
  // >=6 (ends 532). The LEFT rail is unusable — the target compass
  // (render.js drawTargetCompass) is guaranteed to slide into left y
  // [272,480]. Vehicle panel top is y664, so 540..644 is clear of all
  // three (compass right floor y448, PD max 494, pill max 532).
  hudCluster(c, W2, 0, SW, 0, s, () => {
  drawPanel(c, W2 - 312, 540, 284, 104, C.neonYellow);
  T(c, '★ DISTRICT JOBS', W2 - 300, 560, 13, '#ffd23e', 'left', 'bold');
  T(c, jh.jobsDone + '/' + jh.jobsTotal, W2 - 40, 560, 12, '#c8cdd6', 'right', 'bold');
  if (jh.job) {
    T(c, jh.job.title, W2 - 300, 578, 14, '#ffffff', 'left', 'bold');
    T(c, jh.job.kind, W2 - 300, 594, 11, '#c8cdd6', 'left');
    T(c, JOB_ZONES[jh.job.zone].name.toUpperCase() + ' · ' + jh.jobDist + 'm · +$' + jh.job.reward, W2 - 300, 610, 11, C.neonCyan, 'left', 'bold');
  } else {
    T(c, 'ALL JOBS DONE — HARBOR LEGEND', W2 - 300, 578, 13, '#7be382', 'left', 'bold');
  }
  T(c, '◆ EXPORTS ' + jh.exportsDone + '/' + jh.exportsTotal, W2 - 300, 628, 11, '#eef1f5', 'left', 'bold');
  });
  // ---- top-center cluster: day readout + ROAD TO #1 (anchor W2/2,0) ----
  hudCluster(c, W2 / 2, 0, SW / 2, 0, s, () => {
  const total = st.clock ? st.clock.total : 0;
  const day = 1 + Math.floor(total / 1440);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(Math.floor(total) % 60).padStart(2, '0');
  const dist = st.districtName || 'DOWNTOWN';
  const heat = Math.round(st.heat || 0), hot = heat >= 60;
  const blackout = st.blackout && st.blackout.active;
  const readout = 'DAY ' + day + ' · ' + hh + ':' + mm + ' · ' + dist + ' · HEAT ' + heat + (hot ? ' HOT!' : '') + (blackout ? ' · BLACKOUT' : '');
  c.font = 'bold 15px ' + FONT;
  const rw = c.measureText(readout).width + 32;
  drawPill(c, (W2 - rw) / 2, 12, rw, 30, '#0e1420e6', hot ? '#ff8a7a' : C.neonCyan);
  T(c, readout, W2 / 2, 28, 15, hot ? '#ff8a7a' : '#ffffff', 'center', 'bold');
  drawRoadTo1(c, (W2 - 360) / 2, 52, 360, st.missionDone || 0, st.missionTotal || 12, st.nextMission || '');
  });
  // ---- top-right cluster: military pill + minimap (anchor W2,0) ----
  // R27c (g): minimap 200x150 -> 160x120, moved right (x W2-188) so its
  // frame keeps the same 22 px right margin — Juna (08:15 WIB): "layar
  // penuh banget, gameplay nggak kelihatan". Markers/roads inside are
  // untouched (drawMinimap2 draws icons at fixed px sizes, so hero + markers
  // stay just as legible on the smaller map). The smaller + righter minimap
  // also clears the day pill / ROAD TO #1 card at every viewport (a).
  hudCluster(c, W2, 0, SW, 0, s, () => {
  // R25h: the PD panel (drawn by drawMinimap2 below) starts at y170 and
  // covers this slot, so the fixed pill is drawn ONLY when the panel
  // will not show (no responding unit/heli). When the panel shows, the
  // pill is drawn below it by drawPdPanel2 instead — never twice, never hidden.
  const pol = st.police || {};
  const pdShow = (pol.units || []).some((u) => u.kind === 'car' || u.kind === 'boat' || u.kind === 'soldier') || (pol.heli && pol.heli.active);
  if (st.wanted >= 6 && !pdShow) {
    // UI-TOP: FIXED slot under the minimap (right rail: x W2-234, y 198).
    // R35-F2: moved to y336 — the district standing panel now occupies
    // y170..334, so the old y198 slot would sit ON it. The PD panel (when
    // it shows) starts at y336 too, but this pill only draws when the PD
    // panel will not show (no responding unit/heli), so they never collide.
    drawPill(c, W2 - 234, 336, 212, 30, '#ff3b30', '#ffffff');
    T(c, '⚠  MILITARY RESPONSE  ⚠', W2 - 128, 351, 13, '#ffffff', 'center', 'bold');
  }
  drawMinimap2(c, st, W2 - 188, 16, 160, 120);
  });
  // ---- bottom-right cluster: vehicle panel (anchor W2,H2) ----
  // HUD-BEAT-GHK: the loose big number + "CAR · 100%" text become a proper
  // panel (own design): vehicle name + CONDITION bar + big tabular speed +
  // KM/H + gear chip (cars only — boats have no gears). Same bottom-right
  // anchor and same on-foot-hidden behaviour as the old speedo; the
  // tires-popped pill moves 18 px up so it clears the panel top.
  // On foot the whole block stays hidden (no empty box left behind).
  hudCluster(c, W2, H2, SW, SH, s, () => {
  if ((p.inCar && p.car) || (p.inBoat && p.boat)) {
    const veh = p.inCar ? p.car : p.boat;
    const spd = Math.round(Math.abs(veh.speed) * 0.36);
    const hp = Math.max(0, Math.round(veh.hp || 0));
    const px = W2 - 268, py = H2 - 136, pw = 244, ph = 108;
    drawPanel(c, px, py, pw, ph, C.neonCyan);
    T(c, p.inCar ? vehicleLabel(p.car.body) : 'SPEEDBOAT', px + 12, py + 20, 13, '#ffffff', 'left', 'bold');
    T(c, (p.inCar ? 'CAR' : 'BOAT') + ' · ' + hp + '%', px + pw - 12, py + 20, 12, hp > 50 ? '#7be382' : hp > 25 ? '#ffd23e' : '#ff5a3c', 'right', 'bold');
    T(c, 'CONDITION', px + 12, py + 40, 10, '#c8cdd6', 'left', 'bold');
    segBar(c, px + 12, py + 46, pw - 24, 10, hp / 100, hp > 50 ? '#4ade80' : hp > 25 ? '#ffd23e' : '#ef4444', 10);
    c.save();
    c.font = 'bold 46px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.lineWidth = 4; c.strokeStyle = 'rgba(8,12,24,0.6)';
    c.strokeText(String(spd), px + 12, py + 96);
    c.shadowColor = 'rgba(5,8,16,0.75)'; c.shadowBlur = 8; c.shadowOffsetY = 2;
    c.fillStyle = '#ffffff';
    c.fillText(String(spd), px + 12, py + 96);
    const sw = c.measureText(String(spd)).width;
    c.restore();
    T(c, 'KM/H', px + 12 + sw + 8, py + 96, 13, '#ffd23e', 'left', 'bold');
    if (p.inCar) {
      const gear = Math.min(6, 1 + Math.floor(Math.abs(veh.speed) / 90));
      drawPill(c, px + pw - 56, py + 66, 44, 28, '#ffd23e', '#fff');
      T(c, 'G' + gear, px + pw - 34, py + 81, 14, '#0e1420', 'center', 'bold');
    }
    if (p.car && p.car.tiresPopped) {
      drawPill(c, W2 - 300, H2 - 168, 288, 26, '#ff3b30', '#fff');
      T(c, 'TIRES POPPED — GARAGE $150 (G)', W2 - 156, H2 - 154, 13, '#fff', 'center', 'bold');
    }
  }
  });
  // ---- bottom-center cluster: hints pill (anchor W2/2,H2) ----
  // ONE pill, bottom-center (ref. shot: single centred pill
  // "WASD drive · Shift handbrake · E exit car · F horn"). Contextual per
  // state, progressive disclosure (bible §6.4): only keys that do something
  // right now. Hidden in the plane — space.js draws its own flight hint
  // at the same bottom-center spot.
  hudCluster(c, W2 / 2, H2, SW / 2, SH, s, () => {
  if (!p.inPlane) {
    const hints = p.inCar ? 'WASD drive · E exit · Hold Q wheel · C radio · B crew'
      : p.inBoat ? 'E step ashore · C radio · M mute · B crew'
      : 'E enter car/boat · R reload · Hold Q wheel · C radio · B crew';
    c.font = '13px ' + FONT;
    const hw = c.measureText(hints).width + 24;
    drawPill(c, (W2 - hw) / 2, H2 - 30, hw, 24, '#0e1420b8', 'rgba(238,241,245,0.35)');
    T(c, hints, W2 / 2, H2 - 17, 13, '#c8cdd6', 'center');
  }
  });
  // ---- bottom-left cluster: objective bar + Mara dialogue (anchor 0,H2) ----
  hudCluster(c, 0, H2, 0, SH, s, () => {
  // objective bar with counter pill
  const obj = st.objective || '';
  c.font = 'bold 16px ' + FONT;
  const ow = Math.min(W2 - 32, c.measureText(obj).width + 110);
  // JETFIX: the space-HUD hint pill (space.js, y H2-34..H2-10) overlapped
  // this bar's bottom edge (panel ended H2-28). Bar moved up 12 px.
  drawPanel(c, 16, H2 - 76, ow, 36, C.neonCyan);
  // UI-TOP (Bug 7): the pill is the CURRENT mission number (done + 1),
  // matching the "n/13 Title: ..." prefix of the objective text beside
  // it. The ROAD TO #1 meter above is the one that counts missions DONE.
  const curMission = Math.min((st.missionDone || 0) + 1, st.missionTotal || 13);
  drawPill(c, 24, H2 - 68, 52, 20, C.neonCyan);
  T(c, curMission + '/' + (st.missionTotal || 13), 50, H2 - 57, 12, '#0e1420', 'center', 'bold');
  T(c, obj, 86, H2 - 57, 16, '#ffffff', 'left', 'bold');
  // dialogue card — R27c HUD fix (e)/(f): the card was 556 px wide and
  // 128 tall in design coords, i.e. 89% of the width at a 640x360 viewport,
  // covering the road ahead at every mission/race start. It is now drawn
  // at 0.8x about its bottom-left corner (same text, same portrait, same
  // wrap — only rendered smaller), and the global cluster scale shrinks it
  // further on small viewports. The hero car/boat sits centre-frame (left
  // edge ≥ ~620 design px), so the dialog never covers it or the road.
  if (st.dialogue) {
    c.save();
    c.translate(16, H2 - 118); c.scale(0.8, 0.8); c.translate(-16, -(H2 - 118));
    drawPanel(c, 16, H2 - 246, 108, 128, C.neonPink);
    if (st.portrait) st.portrait(c, 22, H2 - 240, 96, 116, st.dialogueMood || 'alert');
    drawPill(c, 132, H2 - 246, 168, 22, C.neonPink);
    T(c, 'MARA — HARBOR CREW', 216, H2 - 234, 12, '#fff', 'center', 'bold');
    c.fillStyle = 'rgba(14,20,32,0.88)'; rr(c, 132, H2 - 218, 440, 100, 10); c.fill();
    c.fillStyle = C.neonPink; c.fillRect(132, H2 - 218, 4, 100);
    W(c, st.dialogue, 148, H2 - 196, 408, 16, '#ffffff', 24);
    c.restore();
  }
  });
  // ---- top-center toast: job / export reward banner (R35-F7) ----
  // Under the ROAD TO #1 card (ends ~y 96), drawn last so it sits on top.
  if (jh.toast) {
    hudCluster(c, W2 / 2, 0, SW / 2, 0, s, () => {
    c.font = 'bold 20px ' + FONT;
    const tw2 = Math.max(360, c.measureText(jh.toast.text).width + 48);
    drawPill(c, (W2 - tw2) / 2, 104, tw2, 44, '#ffd23e', '#fff');
    T(c, jh.toast.text, W2 / 2, 122, 20, '#0e1420', 'center', 'bold');
    c.font = '13px ' + FONT;
    const sw2 = c.measureText(jh.toast.sub).width + 32;
    drawPill(c, (W2 - sw2) / 2, 152, sw2, 26, '#0e1420e6', C.neonYellow);
    T(c, jh.toast.sub, W2 / 2, 164, 13, '#ffd23e', 'center', 'bold');
    });
  }
  if (st.wanted >= 3) { c.fillStyle = 'rgba(239,68,68,0.07)'; c.fillRect(0, 0, SW, SH); }
  // R35-F3: mission-complete rating panel (latched in careerObserve).
  const rp = careerPanel();
  if (rp) drawRatingPanel(c, view, rp);
  // R35-F4: weapon wheel overlay (radial, hold Q) — drawn last, screen coords.
  drawWheel(c, st, view);
}

// ---- title screen v2: compact card, measured text (no overflow), no faces ----
function keyChip(c, x, y, key, label) {
  c.font = 'bold 12px ' + FONT;
  const kw = Math.max(48, c.measureText(key).width + 18);
  c.fillStyle = '#0e1420e6'; rr(c, x, y, kw, 26, 6); c.fill();
  c.lineWidth = 1.5; c.strokeStyle = C.neonCyan; rr(c, x, y, kw, 26, 6); c.stroke();
  T(c, key, x + kw / 2, y + 14, 12, '#ffffff', 'center', 'bold');
  T(c, label, x + kw + 8, y + 14, 13, '#c8cdd6', 'left');
}
// ---- title screen v2.2: COMPACT left card (Juna 2026-11-18 19:05 WIB) ----
// 360x400 at (24,176), under the minimap — 14.1% of the frame. The old
// 470x688 poster (31.6%) + two framed portraits hid the street and half
// the hero car; the portraits are deleted outright (asset team owns faces
// separately). Logo + short tagline + ROAD TO #1 + START only; the 3D
// sunset street sells the world. (v2.1: narrow LEFT poster panel, portraits
// inside the panel — superseded.)
// ---- save slots (R35-F6): 3 slots on the title/load screen, like rival
// Karimbu. Panel sits under the left card (x24 y588), clear of the 3D
// street, the clock pill and the BEST CASH pill. Rows use slotRowRect()
// from saves.js so click hit-testing matches the drawing exactly.
function drawSaveSlots(c) {
  const P = SLOT_PANEL;
  const slots = listSlots();
  const act = activeSlot();
  drawPanel(c, P.x, P.y, P.w, P.h, C.neonCyan);
  T(c, 'SAVE SLOTS', P.x + 16, P.y + 15, 12, C.neonCyan, 'left', 'bold');
  T(c, '1/2/3 SELECT · DEL CLEAR', P.x + P.w - 14, P.y + 15, 10, '#9aa3b2', 'right');
  slots.forEach((d, k) => {
    const i = k + 1;
    const r = slotRowRect(i);
    const sel = i === act;
    c.fillStyle = sel ? 'rgba(55,224,230,0.16)' : 'rgba(255,255,255,0.05)';
    rr(c, r.x, r.y, r.w, r.h, 6); c.fill();
    if (sel) { c.lineWidth = 2; c.strokeStyle = C.neonCyan; rr(c, r.x, r.y, r.w, r.h, 6); c.stroke(); }
    const L = slotLabel(i, d);
    T(c, (sel ? '▶ ' : '  ') + L.line1, r.x + 12, r.y + 14, 13, sel ? '#ffffff' : '#eef1f5', 'left', 'bold');
    T(c, L.line2, r.x + 12, r.y + 31, 11, d ? C.cash : '#8b93a3', 'left');
  });
}
export function drawTitle2(c, view, best, prog, backdrop, live) {
  const W2 = view.w, H2 = view.h;
  careerNoteScreen('title'); // R35-F3: C toggles the career overlay here
  if (backdrop) backdrop(c);
  else { c.fillStyle = '#0e1420'; c.fillRect(0, 0, W2, H2); }
  // TITLE-MINIMAP (unified): the title used to paint its own round radar
  // in city3d.js frame() while gameplay uses the square map (drawMinimap)
  // — Juna: "dari mapnya beda banget". Now one design, one code: the
  // shared square minimap in the same slot (24,24) and size (160x120)
  // as the gameplay HUD. State from window.__neonHarbor (live game) or
  // stageShot (shot mode — runShot never runs runGame's exposure).
  // NOTE: drawMinimap (not drawMinimap2) — drawMinimap2 also paints the
  // district + PD panels, which would land on the title card.
  const nhState = (typeof window !== 'undefined' && window.__neonHarbor) ? window.__neonHarbor.state : null;
  if (nhState) drawMinimap(c, nhState, 24, 24, 160, 120);
  // TITLE-A6: banner height (46, or 64 when the objective wraps to two
  // lines) — the BEST CASH pill needs it on short viewports (see below).
  let titleBannerH = 46;
  // TITLE-FIX (Bug 6): the 3D backdrop (city3d frame) paints a HARDCODED
  // staging HUD — CHAPTER 12/12, $2,150, 4 stars, 142 MPH, GEAR 6 — that
  // contradicts the real progress. city3d.js is out of scope, so the live
  // values are painted over it here, from `live` (render.js title branch).
  if (live) {
    const CX = W2 / 2;
    // --- chapter banner (was: CHAPTER 12/12: THE HARBOR KING) ---
    // TITLE-A6: the banner must never run under the top-right status panel
    // (at 640x360 the panel covered the banner's right end and the objective
    // was cut: "STEAL A CAR, THEN DRIVE TO THE I"). Text is centered in the
    // VISIBLE part of the box, shrunk 15->13->11px, and wrapped to two lines
    // (taller box) if it still does not fit. At >=1280x720 the old geometry
    // is unchanged (mission-1 text fits at 15px, box clear of the panel).
    const chLabel = 'CHAPTER ' + live.chapter + '/' + live.total + ': ' + live.chapterTitle.toUpperCase();
    const chSub = live.objective.toUpperCase();
    const panelX = W2 - 216;
    let chFont = 15, chLines = [chSub];
    c.font = 'bold 15px ' + FONT;
    const bw = Math.min(W2 - 48, Math.max(400, c.measureText(chSub).width + 56));
    const bx = CX - bw / 2;
    const visR = Math.min(bx + bw, panelX - 8);
    const visCX = (bx + visR) / 2;
    const fitW = visR - bx - 56;
    for (const f of [15, 13, 11]) {
      c.font = 'bold ' + f + 'px ' + FONT;
      if (c.measureText(chSub).width <= fitW) { chFont = f; chLines = [chSub]; break; }
      chFont = f;
    }
    if (c.measureText(chSub).width > fitW) {
      const words = chSub.split(' ');
      const half = Math.ceil(words.length / 2);
      let l1 = words.slice(0, half).join(' '), l2 = words.slice(half).join(' ');
      while (c.measureText(l1).width > fitW && l1.includes(' ')) {
        const w = l1.slice(l1.lastIndexOf(' ') + 1);
        l1 = l1.slice(0, l1.lastIndexOf(' ')); l2 = w + ' ' + l2;
      }
      chLines = [l1, l2]; chFont = 11;
    }
    const bh = 46 + (chLines.length - 1) * 18;
    titleBannerH = bh;
    const ux = Math.min(CX - 200, bx), uw = Math.max(CX + 200, bx + bw) - ux;
    c.fillStyle = '#0e081e';
    rr(c, ux, 16, uw, bh, 8); c.fill();
    c.fillStyle = 'rgba(8,8,24,0.75)';
    rr(c, bx, 16, bw, bh, 8); c.fill();
    c.lineWidth = 1.5; c.strokeStyle = '#c9a227'; rr(c, bx, 16, bw, bh, 8); c.stroke();
    c.fillStyle = '#ffd23e'; c.font = 'bold 11px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(chLabel, visCX, 33);
    c.fillStyle = '#ffffff'; c.font = 'bold ' + chFont + 'px ' + FONT;
    chLines.forEach((ln, i) => c.fillText(ln, visCX, 52 + i * 18));
    // --- top-right status panel (was: 4 stars, $2,150, two bare bars) ---
    const px = W2 - 216, py = 16, pw = 200, ph = 92;
    c.fillStyle = '#0e0a1e';
    rr(c, px, py, pw, ph, 8); c.fill();
    c.fillStyle = 'rgba(8,8,24,0.75)';
    rr(c, px, py, pw, ph, 8); c.fill();
    for (let i = 0; i < 5; i++) drawStar2(c, px + 19 + i * 21, py + 17, 8, i < live.wanted);
    T(c, '$' + live.cash.toLocaleString('en-US'), px + 12, py + 42, 22, C.cash, 'left', 'bold');
    drawHeart2(c, px + 18, py + 61, 7);
    c.fillStyle = '#333';
    rr(c, px + 28, py + 58, 106, 7, 3); c.fill();
    c.fillStyle = live.health > 30 ? '#4ade80' : '#ef4444';
    rr(c, px + 28, py + 58, Math.round(106 * Math.max(0, live.health) / 100), 7, 3); c.fill();
    T(c, 'HP ' + Math.round(live.health) + '%', px + 140, py + 62, 10, '#eef1f5', 'left', 'bold');
    T(c, 'JAX MARLOWE', px + 12, py + 82, 10, '#35f0ff', 'left');
    // R31: the backdrop no longer paints a speedo on title, so no cover
    // is needed here (the old cover left a faint pasted rectangle).
    // --- clock line (was: DAY 1 · 21:02 · HARBOR · HEAT 30) ---
    const clock = 'DAY ' + live.day + ' · ' + live.time + ' · ' + live.district + ' · HEAT ' + live.heat;
    c.font = 'bold 12px ' + FONT;
    const cw = c.measureText(clock).width + 24;
    drawPill(c, 8, H2 - 36, cw, 24, '#0e1420', C.neonCyan);
    T(c, clock, 20, H2 - 24, 12, '#ffffff', 'left', 'bold');
  }
  // TITLE-COMPACT (Juna 2026-11-18 19:05 WIB): no big faces on title —
  // the portraits are gone (they read as ugly flat masks and the panel
  // hid half the street + the hero car). One slim card, left edge under
  // the minimap: 360x400 = 14.1% of a 1280x800 frame. The 3D street,
  // buildings and cars stay visible; logo + tagline + ROAD TO #1 + START.
  const tw = 360, tx = 24, ty = 176, th = 400;
  const cx = tx + tw / 2;
  drawPanel(c, tx, ty, tw, th, C.neonCyan);
  let y = ty + 44;
  // logo with glow
  c.save();
  c.shadowColor = C.neonCyan; c.shadowBlur = 22;
  T(c, 'NEON HARBOR', cx, y, 40, '#eafcff', 'center', 'bold');
  c.restore();
  y += 36;
  c.save();
  c.shadowColor = C.neonPink; c.shadowBlur = 12;
  T(c, 'THE MARA JOB', cx, y, 18, C.neonPink, 'center', 'bold');
  c.restore();
  y += 20;
  c.strokeStyle = C.neonCyan; c.lineWidth = 2;
  c.beginPath(); c.moveTo(tx + 32, y); c.lineTo(tx + tw - 32, y); c.stroke();
  y += 22;
  // tagline, wrapped to fit the narrow card (short: vault line dropped)
  y += W(c, 'Jax Marlowe came to drive. His fixer Mara set him up — to save his life.', tx + 32, y, tw - 64, 14, '#eef1f5', 19) * 19 + 6;
  y += W(c, 'Steal a car or a speedboat, run the package, lose the heat — thirteen missions across three days.', tx + 32, y, tw - 64, 14, '#c8cdd6', 19) * 19 + 10;
  // (portraits deleted 2026-11-18 19:05 WIB — Juna: faces were ugly and the
  // duo cards ate the street. No faces on title; asset team owns portraits.)
  // ROAD TO #1 (title version)
  // R25g fix (HUD-TOP §5.1 trade-off): on title, NEXT is the mission you are
  // about to play — the current chapter — not missionProgress's next (the
  // mission AFTER the current one, right for the in-game HUD but reads
  // "NEXT: The Package" on a fresh game while the banner says HOT WHEELS).
  drawRoadTo1(c, tx + 32, y + 8, tw - 64, prog.done, prog.total, (live && live.chapterTitle) || prog.next, true);
  y += 80 + 8;
  // (controls grid deleted — title is a storefront now: logo, tagline,
  // ROAD TO #1, START. keyChip is now unused on title; kept, tiny helper.)
  // start button with pulse (centered on the card, not the screen)
  const pulse = 1 + 0.06 * Math.sin(Date.now() / 280);
  c.save(); c.translate(cx, y + 19); c.scale(pulse, pulse);
  c.shadowColor = C.neonCyan; c.shadowBlur = 18;
  c.fillStyle = '#37e0e633'; rr(c, -140, -19, 280, 38, 8); c.fill();
  c.restore();
  c.lineWidth = 2.5; c.strokeStyle = C.neonCyan; rr(c, cx - 140, y, 280, 38, 8); c.stroke();
  T(c, 'PRESS ENTER TO START', cx, y + 19, 16, '#ffffff', 'center', 'bold');
  // R35-F3: career strip (stars / avg / missions) + C hint, inside the card.
  const cs = careerSummary(prog);
  const stripY = Math.min(y + 56, ty + th - 34);
  T(c, '★ ' + cs.totalStars + '/39  ·  AVG ' + (cs.rated ? cs.avg.toFixed(1) : '–') + '  ·  ' + cs.done + '/13 MISSIONS', cx, stripY, 12, '#ffd23e', 'center', 'bold');
  T(c, 'Press C — CAREER STATS', cx, stripY + 20, 12, '#c8cdd6', 'center');
  // SAVE SLOTS (R35-F6): 3 slots under the left card.
  drawSaveSlots(c);
  // BEST CASH stays centered on the SCREEN (card is narrow now; cx would
  // collide with the clock pill at bottom-left).
  // TITLE-A6: on short viewports the 400-tall card overflows the bottom and
  // the pill lands on the intro paragraph (640x360). There it sits just
  // below the chapter banner instead; at >=480px tall it stays bottom-center.
  const bcY = H2 < 480 ? 16 + titleBannerH + 8 : H2 - 34;
  drawPill(c, W2 / 2 - 78, bcY, 156, 24, '#0e1420e6', C.cash);
  T(c, 'BEST CASH $' + best.toLocaleString('en-US'), W2 / 2, bcY + 13, 13, C.cash, 'center', 'bold');
  // R35-F7: new-features strip, bottom-right (clock is bottom-left,
  // BEST CASH bottom-center).
  const nf = 'NEW: DISTRICT JOBS · EXPORT LIST';
  c.font = 'bold 12px ' + FONT;
  const nw = c.measureText(nf).width + 28;
  drawPill(c, W2 - nw - 12, H2 - 36, nw, 24, '#0e1420e6', C.neonYellow);
  T(c, nf, W2 - nw / 2 - 12, H2 - 24, 12, '#ffd23e', 'center', 'bold');
  // R35-F3: full career screen overlay (C toggles; drawn last, on top).
  if (careerIsOpen()) drawCareerScreen(c, view, careerScreenStats(null, best, live, prog));
}
// ---- mission banner v2 ----
export function drawMissionBanner2(c, view, chapter, total, title) {
  const W2 = view.w;
  const label = 'CHAPTER ' + chapter + '/' + total;
  c.font = 'bold 15px ' + FONT;
  const tw = Math.max(c.measureText(title).width, c.measureText(label).width) + 56;
  const x = (W2 - tw) / 2;
  drawPanel(c, x, 16, tw, 62, '#ffd23e');
  T(c, label, W2 / 2, 34, 13, '#ffd23e', 'center', 'bold');
  T(c, title, W2 / 2, 58, 19, '#ffffff', 'center', 'bold');
}
// ---- shop v2: header band + icon chips + price pills + OWNED stamp ----
const SHOP_GLYPHS = ['bolt', 'shield', 'wheel', 'spray', 'nitro', 'key'];
function glyph(c, kind, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = C.neonCyan; c.fillStyle = C.neonCyan; c.lineWidth = 0.16;
  if (kind === 'bolt') { c.beginPath(); c.moveTo(0.1, -0.6); c.lineTo(-0.35, 0.1); c.lineTo(-0.02, 0.1); c.lineTo(-0.1, 0.6); c.lineTo(0.35, -0.1); c.lineTo(0.02, -0.1); c.closePath(); c.fill(); }
  else if (kind === 'shield') { c.beginPath(); c.moveTo(0, -0.55); c.lineTo(0.45, -0.35); c.lineTo(0.45, 0.1); c.quadraticCurveTo(0.45, 0.45, 0, 0.6); c.quadraticCurveTo(-0.45, 0.45, -0.45, 0.1); c.lineTo(-0.45, -0.35); c.closePath(); c.stroke(); }
  else if (kind === 'wheel') { c.beginPath(); c.arc(0, 0, 0.5, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 0.18, 0, 7); c.stroke(); for (let i = 0; i < 5; i++) { const a = i * 1.26; c.beginPath(); c.moveTo(Math.cos(a) * 0.18, Math.sin(a) * 0.18); c.lineTo(Math.cos(a) * 0.5, Math.sin(a) * 0.5); c.stroke(); } }
  else if (kind === 'spray') { c.fillRect(-0.3, -0.5, 0.6, 0.7); c.fillRect(-0.12, 0.2, 0.24, 0.35); c.beginPath(); c.arc(0.45, -0.4, 0.1, 0, 7); c.fill(); }
  else if (kind === 'nitro') { c.beginPath(); c.moveTo(-0.4, 0.4); c.quadraticCurveTo(0, -0.6, 0.45, -0.35); c.quadraticCurveTo(0.1, 0.1, 0.4, 0.45); c.closePath(); c.stroke(); }
  else { c.beginPath(); c.arc(-0.15, -0.15, 0.28, 0, 7); c.stroke(); c.beginPath(); c.moveTo(0.05, 0.05); c.lineTo(0.45, 0.45); c.stroke(); }
  c.restore();
}
export function drawShop2(c, st, ui, view) {
  applyCrew(st); // R35-F1: Reno discount must apply on the shop screen too (no HUD here).
  const W2 = view.w, H2 = view.h;
  const w = Math.min(680, W2 - 48), lineH = 56;
  const closed = st.garageClosed;
  const h = 170 + UPGRADES.length * lineH + 50 + (closed ? 34 : 0) + 50 + EXPORT_LIST.length * 24;
  const x = (W2 - w) / 2, y = (H2 - h) / 2;
  drawPanel(c, x, y, w, h, C.neonCyan);
  const hg = c.createLinearGradient(x, y, x + w, y);
  hg.addColorStop(0, '#37e0e655'); hg.addColorStop(1, '#ff4d9d55');
  c.fillStyle = hg; rr(c, x + 2, y + 2, w - 4, 46, 8); c.fill();
  T(c, 'GARAGE — UPGRADE SHOP', W2 / 2, y + 26, 24, '#ffffff', 'center', 'bold');
  drawPill(c, x + w - 150, y + 58, 130, 24, '#0e1420e6', C.cash);
  T(c, 'CASH $' + st.cash.toLocaleString('en-US'), x + w - 85, y + 71, 13, C.cash, 'center', 'bold');
  T(c, 'Fitted for good · ' + garageStandingLine(st), x + 28, y + 70, 14, '#c8cdd6', 'left');
  if (closed) {
    drawPill(c, x + 20, y + 92, w - 40, 28, '#ff3b3026', '#ff8a7a');
    T(c, 'CLOSED — district too hot (HEAT ' + Math.round(st.heat || 0) + '). Come back when it cools.', W2 / 2, y + 107, 14, '#ff8a7a', 'center', 'bold');
  } else if (getActiveCrew() === 'reno') {
    // R35-F1: prices below already show the -25% (crew.js rewrites UPGRADES).
    drawPill(c, x + 20, y + 92, w - 40, 26, '#ffd23e26', '#ffd23e');
    T(c, 'RENO CREW DISCOUNT −25% — prices below already reduced', W2 / 2, y + 106, 13, '#ffd23e', 'center', 'bold');
  }
  UPGRADES.forEach((u, i) => {
    const owned = st.upgrades && st.upgrades[u.id];
    const sel = i === (ui ? ui.shopIndex : 0);
    const ry = y + 128 + (closed ? 34 : 0) + i * lineH;
    if (sel) { c.fillStyle = 'rgba(55,224,230,0.16)'; rr(c, x + 16, ry, w - 32, lineH - 8, 8); c.fill(); }
    c.fillStyle = '#0e1420e6'; rr(c, x + 28, ry + 6, 40, 40, 8); c.fill();
    c.lineWidth = 1.5; c.strokeStyle = owned ? C.cash : C.neonCyan; rr(c, x + 28, ry + 6, 40, 40, 8); c.stroke();
    glyph(c, SHOP_GLYPHS[i % SHOP_GLYPHS.length], x + 48, ry + 26, 26);
    T(c, u.name, x + 80, ry + 20, 18, sel ? '#ffffff' : '#eef1f5', 'left', 'bold');
    T(c, u.desc, x + 80, ry + 40, 13, '#c8cdd6', 'left');
    if (owned) {
      drawPill(c, x + w - 96, ry + 12, 68, 26, '#ffd23e', '#fff');
      T(c, 'OWNED', x + w - 62, ry + 26, 13, '#0e1420', 'center', 'bold');
    } else {
      drawPill(c, x + w - 110, ry + 12, 82, 26, '#0e1420e6', C.cash);
      // R35-F2: price follows the garage district's standing (Friendly
      // −20%, Wary +25%) — same districtPrice() the buy hook charges.
      T(c, '$' + districtPrice(st, u.cost), x + w - 69, ry + 26, 15, C.cash, 'center', 'bold');
    }
  });
  // ---- R35-F7: export list — steal a wanted car, deliver it here ----
  const ejh = jobsHud(st);
  const ey = y + 128 + (closed ? 34 : 0) + UPGRADES.length * lineH + 8;
  c.strokeStyle = C.neonYellow; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x + 28, ey + 2); c.lineTo(x + w - 28, ey + 2); c.stroke();
  T(c, 'EXPORT LIST — STEAL & DELIVER TO THIS GARAGE', x + 28, ey + 24, 15, '#ffd23e', 'left', 'bold');
  EXPORT_LIST.forEach((ex, i) => {
    const done = ejh.J.exports[ex.body];
    const ry2 = ey + 34 + i * 24;
    c.fillStyle = done ? '#7be382' : '#ffd23e';
    c.beginPath(); c.arc(x + 38, ry2 + 7, 5, 0, 7); c.fill();
    T(c, ex.label, x + 52, ry2 + 11, 14, done ? '#7be382' : '#ffffff', 'left', 'bold');
    T(c, ex.note, x + 200, ry2 + 11, 12, '#c8cdd6', 'left');
    if (done) T(c, '✓ DELIVERED', x + w - 28, ry2 + 11, 13, '#7be382', 'right', 'bold');
    else T(c, '$' + ex.value, x + w - 28, ry2 + 11, 14, C.cash, 'right', 'bold');
  });
  T(c, 'Up / Down to choose  ·  Enter to buy  ·  Esc to close', W2 / 2, y + h - 24, 15, C.neonYellow, 'center', 'bold');
}
// ---- pause panel v2 ----
export function drawPause2(c, view) {
  const W2 = view.w, H2 = view.h;
  careerNoteScreen('pause'); // R35-F3: C toggles the career overlay here
  const w = 520, h = 220, x = (W2 - w) / 2, y = (H2 - h) / 2;
  drawPanel(c, x, y, w, h, C.neonCyan);
  const hg = c.createLinearGradient(x, y, x + w, y);
  hg.addColorStop(0, '#37e0e655'); hg.addColorStop(1, '#ff4d9d55');
  c.fillStyle = hg; rr(c, x + 2, y + 2, w - 4, 52, 8); c.fill();
  T(c, 'PAUSED', W2 / 2, y + 30, 30, '#ffffff', 'center', 'bold');
  T(c, 'The city waits for no one — except right now.', W2 / 2, y + 96, 17, '#c8cdd6', 'center');
  T(c, 'O — settings', W2 / 2, y + 128, 17, '#c8cdd6', 'center');
  drawPill(c, W2 / 2 - 120, y + h - 48, 240, 30, '#0e1420e6', C.neonYellow);
  T(c, 'Press P or Esc to resume', W2 / 2, y + h - 32, 15, C.neonYellow, 'center', 'bold');
  // R35-F3: career stats live on the pause screen too (C toggles).
  // Hint on a dark pill — the world behind it is busy (red roofs).
  drawPill(c, W2 / 2 - 90, y + h + 14, 180, 26, '#0e1420e6', C.neonCyan);
  T(c, 'C — career stats', W2 / 2, y + h + 28, 14, '#ffffff', 'center', 'bold');
  if (careerIsOpen()) drawCareerScreen(c, view, careerScreenStats(null, 0, null, null));
}

// ---- BAY PD RESPONSE: active pursuing units (UI-MINIMAP-PD batch) ----
// Wiring: called from drawMinimap2 (the only HUD hook this batch owns —
// render.js / drawHud2 are untouched, so the panel rides on the minimap's
// own call). Shows only when wanted >= 1 (progressive disclosure, bible
// §6.4); hidden at wanted 0. Data is read-only from state.police —
// police.js is never edited. Callsigns are display-only derivations:
// police.js stores no callsigns or officer names, so units are numbered
// per kind (UNIT-1, BOAT-1, HELI-1, BLOCK-1, APC-1, ...). Gunmen are
// harbor crew, not PD, so they are deliberately NOT listed. Rows are
// nearest-first, max 4, with a "+N MORE UNITS" footer when more respond.
// Panel: right column under the minimap, right edge aligned with the
// minimap frame; drawPanel house style (dark translucent + cyan border +
// radius 10, bible §6.5).
export function drawPdPanel2(c, st, x, y, w) {
  if (Math.floor(st.wanted || 0) < 1) return;
  const p = st.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  const rows = [];
  const seen = {};
  const tag = (k) => { seen[k] = (seen[k] || 0) + 1; return seen[k]; };
  for (const u of st.police.units || []) {
    let row = null;
    if (u.kind === 'car') {
      if (u.roadblock) {
        const i = tag('BLOCK');
        row = { call: 'BLOCK-' + i, type: u.concrete ? 'WALL' : 'AHEAD', status: 'ROADBLOCK', x: u.car.x, y: u.car.y };
      } else if (u.military) {
        const apc = u.car.body === 'apc';
        const i = tag(apc ? 'APC' : 'MIL');
        row = { call: (apc ? 'APC-' : 'MIL-') + i, type: apc ? 'APC' : 'MIL', status: 'PURSUING', x: u.car.x, y: u.car.y };
      } else if (u.emergency) {
        const fire = u.car.body === 'fire';
        const i = tag(fire ? 'FIRE' : 'MEDIC');
        row = { call: (fire ? 'FIRE-' : 'MEDIC-') + i, type: fire ? 'FIRE' : 'EMS', status: 'RESPONDING', x: u.car.x, y: u.car.y };
      } else {
        const i = tag('UNIT');
        row = { call: 'UNIT-' + i, type: 'PD', status: 'PURSUING', x: u.car.x, y: u.car.y };
      }
    } else if (u.kind === 'boat') {
      const i = tag('BOAT');
      row = { call: 'BOAT-' + i, type: 'SEA', status: 'PURSUING', x: u.x, y: u.y };
    } else if (u.kind === 'soldier') {
      const i = tag('SOLDIER');
      row = { call: 'SOLDIER-' + i, type: 'MIL', status: 'PURSUING', x: u.x, y: u.y };
    }
    if (row) { row.d = Math.hypot(row.x - px, row.y - py); rows.push(row); }
  }
  if (st.police.heli && st.police.heli.active) {
    rows.push({ call: 'HELI-1', type: 'AIR', status: 'OVERHEAD',
      d: Math.hypot(st.police.heli.x - px, st.police.heli.y - py) });
  }
  if (!rows.length) return;
  rows.sort((a, b) => a.d - b.d);
  const shown = rows.slice(0, 4);
  const extra = rows.length - shown.length;
  const rowH = 22, headH = 26;
  const h = 10 + headH + shown.length * rowH + (extra ? 20 : 0) + 8;
  drawPanel(c, x, y, w, h, C.neonCyan);
  // header: police light bar + title + unit count
  c.fillStyle = '#2f6fd0'; c.fillRect(x + 12, y + 20, 8, 6);
  c.fillStyle = '#ff3b30'; c.fillRect(x + 21, y + 20, 8, 6);
  T(c, 'BAY PD RESPONSE', x + 34, y + 23, 13, C.neonCyan, 'left', 'bold');
  T(c, rows.length + (rows.length === 1 ? ' UNIT' : ' UNITS'), x + w - 10, y + 23, 11, '#c8cdd6', 'right', 'bold');
  const STATUS_COLOR = { PURSUING: C.neonCyan, OVERHEAD: '#ffd23e', ROADBLOCK: '#ff5a3c', RESPONDING: '#7be382' };
  shown.forEach((r, i) => {
    const ry = y + 10 + headH + i * rowH;
    const col = STATUS_COLOR[r.status] || '#eef1f5';
    const dist = r.d >= 1000 ? (r.d / 1000).toFixed(1) + 'km' : Math.round(r.d) + 'm';
    c.font = 'bold 11px ' + FONT;
    const statusW = c.measureText(r.status).width;
    c.font = 'bold 12px ' + FONT;
    const distW = c.measureText(dist).width;
    const rightX = x + w - 10 - statusW - 8 - distW;
    c.fillStyle = col; c.beginPath(); c.arc(x + 16, ry + 11, 3.5, 0, 7); c.fill();
    T(c, r.call, x + 26, ry + 11, 12, '#ffffff', 'left', 'bold');
    // type tag only when it fits clear of the distance column
    c.font = 'bold 12px ' + FONT;
    const callW = c.measureText(r.call).width;
    c.font = '11px ' + FONT;
    const typeW = c.measureText(r.type).width;
    if (x + 26 + callW + 8 + typeW + 12 < rightX) {
      T(c, r.type, x + 26 + callW + 8, ry + 11, 11, '#c8cdd6', 'left');
    }
    T(c, dist, rightX, ry + 11, 12, '#eef1f5', 'left', 'bold');
    T(c, r.status, x + w - 10, ry + 11, 11, col, 'right', 'bold');
  });
  if (extra) T(c, '+' + extra + ' MORE UNIT' + (extra === 1 ? '' : 'S'), x + w / 2, y + 10 + headH + shown.length * rowH + 10, 11, '#c8cdd6', 'center', 'bold');
  // R25h: at wanted >= 6 the military pill moves BELOW the panel (the
  // fixed y198 slot is covered by this panel). Same size as the R25g
  // pill, right edge aligned with the panel.
  if (Math.floor(st.wanted || 0) >= 6) {
    drawPill(c, x + w - 212, y + h + 8, 212, 30, '#ff3b30', '#ffffff');
    T(c, '⚠  MILITARY RESPONSE  ⚠', x + w - 106, y + h + 23, 13, '#ffffff', 'center', 'bold');
  }
}
