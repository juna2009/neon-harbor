// ui2.js — Neon Harbor UI v2 (Laras UI team, 2026-11-18)
// Pure Canvas 2D, same neon palette as config.js. Drop-in as game/src/ui2.js.
// Post-cut module: integration wiring is only a few calls in render.js.
// All content is our own (Neon Harbor / Jax / Mara) — no rival text or art.
// UI-TOP (batch a, base cb4130f): Bug 7 numbering fix + MILITARY banner slot +
// stats-panel tidy + ROAD TO #1 1px border. See PATCH-SPEC-UI-TOP.md.
import { COLORS as C, UPGRADES, WEAPONS, WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';

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
// shape-only. Title screen keeps its own round minimap (city3d.js, not here).
function minimapShape() {
  try {
    return new URLSearchParams(window.location.search).get('minimap') === 'round' ? 'round' : 'square';
  } catch (e) { return 'square'; }
}
export function drawMinimap2(c, st, x, y, w, h) {
  const sx = w / WORLD_W, sy = h / WORLD_H;
  const round = minimapShape() === 'round';
  const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
  c.save();
  if (round) {
    // dark disc backing so the clipped corners read as panel, not void
    c.fillStyle = 'rgba(10,15,28,0.85)';
    c.beginPath(); c.arc(cx, cy, r + 6, 0, 7); c.fill();
    c.beginPath(); c.arc(cx, cy, r, 0, 7); c.clip();
  } else {
    drawPanel(c, x - 6, y - 6, w + 12, h + 30, C.neonCyan);
  }
  // ---- world (identical for both shapes — only the clip/frame differs) ----
  c.fillStyle = '#2e6b3a'; c.fillRect(x, y, w, h);
  c.fillStyle = '#1d6f9e'; c.fillRect(x + WATER_X * sx, y, (WORLD_W - WATER_X) * sx, h);
  c.fillStyle = '#4a4f57';
  for (const rx of st.city.roadsV) c.fillRect(x + rx * sx - 2.5, y, 5, h);
  for (const ry of st.city.roadsH) c.fillRect(x, y + ry * sy - 2.5, w, 5);
  c.fillStyle = '#3f8f4f';
  for (const pk of st.city.parks) c.fillRect(x + pk.x * sx, y + pk.y * sy, Math.max(3, pk.w * sx), Math.max(3, pk.h * sy));
  c.fillStyle = '#ffd23e';
  for (const cl of st.collectibles) if (!cl.taken) c.fillRect(x + cl.x * sx - 1.5, y + cl.y * sy - 1.5, 3, 3);
  if (st.mission.target) drawMapMission2(c, x + st.mission.target.x * sx, y + st.mission.target.y * sy, 13, st.elapsed);
  const gas = st.gasStation;
  drawMapGas2(c, x + (gas.x + gas.w / 2) * sx, y + (gas.y + gas.h / 2) * sy, 13);
  if (st.city.garage) drawMapWrench2(c, x + st.city.garage.x * sx, y + st.city.garage.y * sy, 13);
  for (const hd of st.hydrants) drawMapHydrant2(c, x + hd.x * sx, y + hd.y * sy, 11);
  if (st.city.casino) drawMapDot2(c, x + st.city.casino.x * sx, y + st.city.casino.y * sy, 4, '#ffd23e');
  if (st.city.lighthouse) drawMapDot2(c, x + st.city.lighthouse.x * sx, y + st.city.lighthouse.y * sy, 4, '#ffffff');
  if (st.bridge) drawMapBridge2(c, x + 2400 * sx, y + 1680 * sy, 13, st.bridge.up);
  for (const b of st.boats || []) if (b.alive) drawMapDot2(c, x + b.x * sx, y + b.y * sy, 4, '#ffffff', '#37e0e6');
  for (const u of st.police.units) {
    const ux = u.kind === 'car' ? u.car.x : u.x, uy = u.kind === 'car' ? u.car.y : u.y;
    if (u.kind === 'gunman') drawMapDot2(c, x + ux * sx, y + uy * sy, 4, '#ff5a3c');
    else drawMapPolice2(c, x + ux * sx, y + uy * sy, 9, !!u.roadblock);
  }
  if (st.police.heli && st.police.heli.active) drawMapDot2(c, x + st.police.heli.x * sx, y + st.police.heli.y * sy, 5, '#ffffff', '#ff5a3c');
  const p = st.player;
  drawMapPlayer2(c, x + p.x * sx, y + p.y * sy, 14, p.angle);
  c.restore();
  // ---- frame (shape-specific) ----
  if (round) {
    c.save();
    c.shadowColor = C.neonCyan; c.shadowBlur = 12;
    c.lineWidth = 2; c.strokeStyle = C.neonCyan;
    c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke();
    c.restore();
    c.lineWidth = 1; c.strokeStyle = 'rgba(238,241,245,0.5)';
    c.beginPath(); c.arc(cx, cy, r - 3, 0, 7); c.stroke();
  } else {
    // 1px inner hairline so the map reads as its own surface (bible §6.5)
    c.lineWidth = 1; c.strokeStyle = 'rgba(238,241,245,0.35)';
    c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  // label + north arrow (same strip, both shapes)
  drawPill(c, x + 2, y + h + 2, 104, 20, '#0e1420e6', C.neonCyan);
  T(c, 'NEON HARBOR', x + 54, y + h + 13, 11, C.neonCyan, 'center', 'bold');
  T(c, 'N ↑', x + w - 4, y + h + 13, 11, '#eef1f5', 'right', 'bold');
  // PD response panel: right column, below the minimap frame (own function,
  // appended at the end of this file). Called here because this batch owns
  // drawMinimap2 only — render.js / drawHud2 are untouched. Panel is 232 px
  // wide, right edge aligned with the minimap frame's right edge.
  drawPdPanel2(c, st, x + w + 6 - 232, y + h + 34, 232);
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
function segBar(c, x, y, w, h, frac, color, segs) {
  const sw = (w - (segs - 1) * 2) / segs, n = Math.round(frac * segs);
  for (let i = 0; i < segs; i++) {
    c.fillStyle = i < n ? color : '#2a3242';
    rr(c, x + i * (sw + 2), y, sw, h, 3); c.fill();
  }
}
export function drawHud2(c, st, best, ui, view) {
  const p = st.player, W2 = view.w, H2 = view.h;
  const collected = st.collectibles.filter((k) => k.taken).length;
  // top-left cluster
  drawPanel(c, 12, 12, 284, 176, C.neonCyan);
  drawCashIcon2(c, 32, 36, 13);
  T(c, '$' + st.cash.toLocaleString('en-US'), 50, 36, 28, C.cash, 'left', 'bold');
  // UI-TOP: right-edge numbers share one inner margin (x 284 = panel edge
  // 296 minus 12) and are right-aligned, so they never creep toward the
  // panel edge or jitter when a digit is added/removed (bible §6.2).
  T(c, 'BEST $' + best.toLocaleString('en-US'), 284, 30, 12, '#c8cdd6', 'right');
  drawHeart2(c, 32, 66, 9);
  segBar(c, 48, 58, 190, 16, Math.max(0, p.health / 100), p.health > 30 ? '#4ade80' : '#ef4444', 10);
  T(c, Math.round(p.health) + '%', 284, 66, 13, '#eef1f5', 'right', 'bold');
  T(c, 'WANTED', 24, 96, 11, '#c8cdd6', 'left', 'bold');
  drawWantedRow2(c, 96, 96, 12, 6, Math.floor(st.wanted));
  const wp = WEAPONS[p.weapon];
  T(c, wp.name.toUpperCase(), 24, 122, 13, '#eef1f5', 'left', 'bold');
  // UI-TOP: 10 ammo pips (was 12) to match the 10-segment HP bar above;
  // same info, one rhythm. Count is compact ("24/120") + right-aligned.
  const pips = 10, filled = Math.ceil((p.ammo / wp.mag) * pips);
  for (let i = 0; i < pips; i++) {
    c.fillStyle = i < filled ? '#ffd23e' : '#2a3242';
    rr(c, 96 + i * 13, 115, 8, 14, 2); c.fill();
  }
  T(c, p.ammo + '/' + p.reserve, 284, 122, 13, '#eef1f5', 'right', 'bold');
  T(c, '◆ ' + collected + '/' + st.collectibles.length + ' HARBOR TOKENS', 24, 148, 13, C.neonYellow, 'left', 'bold');
  if (ui && ui.stationName) {
    drawPill(c, 12, 196, 132, 24, '#0e1420e6', C.neonPink);
    T(c, '♪ ' + ui.stationName, 78, 209, 13, C.neonPink, 'center', 'bold');
  }
  // top-center readout + ROAD TO #1
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
  // R25h: the PD panel (drawn by drawMinimap2 below) starts at y200 and
  // covers this slot, so the fixed pill is drawn ONLY when the panel
  // will not show (no responding unit/heli). When the panel shows, the
  // pill is drawn below it by drawPdPanel2 instead — never twice, never hidden.
  const pol = st.police || {};
  const pdShow = (pol.units || []).some((u) => u.kind === 'car' || u.kind === 'boat' || u.kind === 'soldier') || (pol.heli && pol.heli.active);
  if (st.wanted >= 6 && !pdShow) {
    // UI-TOP: FIXED slot under the minimap (right rail: x W2-234, y 198).
    // The old full-width band at y 118..148 sat ON the stats panel (red
    // wash over WANTED/PISTOL rows) and ON the compass label
    // ("Lighthouse — 1021m" at y ~134). This pill never moves and never
    // overlaps the meter, the compass or the stats.
    drawPill(c, W2 - 234, 198, 212, 30, '#ff3b30', '#ffffff');
    T(c, '⚠  MILITARY RESPONSE  ⚠', W2 - 128, 213, 13, '#ffffff', 'center', 'bold');
  }
  // minimap (top-right)
  drawMinimap2(c, st, W2 - 228, 16, 200, 150);
  // speed cluster (bottom-right)
  if ((p.inCar && p.car) || (p.inBoat && p.boat)) {
    const veh = p.inCar ? p.car : p.boat;
    const spd = Math.round(Math.abs(veh.speed) * 0.36);
    drawPanel(c, W2 - 212, H2 - 116, 200, 104, C.neonCyan);
    c.lineWidth = 6; c.strokeStyle = '#2a3242';
    c.beginPath(); c.arc(W2 - 176, H2 - 64, 26, 2.36, 5.5); c.stroke();
    c.lineWidth = 6; c.strokeStyle = C.neonCyan;
    c.beginPath(); c.arc(W2 - 176, H2 - 64, 26, 2.36, 2.36 + Math.min(1, Math.abs(veh.speed) / 540) * 3.14); c.stroke();
    T(c, String(spd), W2 - 132, H2 - 78, 34, '#ffffff', 'left', 'bold');
    T(c, 'km/h', W2 - 132, H2 - 48, 13, '#c8cdd6', 'left');
    const hp = Math.max(0, Math.round(veh.hp || 0));
    T(c, (p.inCar ? 'CAR' : 'BOAT') + ' ' + hp + '%', W2 - 196, H2 - 52, 12, '#c8cdd6', 'left', 'bold');
    segBar(c, W2 - 196, H2 - 36, 110, 8, hp / 100, hp > 30 ? '#4ade80' : '#ef4444', 8);
    if (p.car && p.car.tiresPopped) {
      drawPill(c, W2 - 300, H2 - 150, 288, 26, '#ff3b30', '#fff');
      T(c, 'TIRES POPPED — GARAGE $150 (G)', W2 - 156, H2 - 136, 13, '#fff', 'center', 'bold');
    }
  }
  // hints pill
  const hints = p.inCar ? 'E exit · Q weapon · C radio · G repair/respray · M mute'
    : p.inBoat ? 'E step ashore · C radio · M mute'
    : 'E enter car / boat · R reload · Q weapon · C radio · M mute';
  c.font = '13px ' + FONT;
  const hw = c.measureText(hints).width + 24;
  drawPill(c, W2 - hw - 16, H2 - 148, hw, 24, '#0e1420b8', 'rgba(238,241,245,0.35)');
  T(c, hints, W2 - hw / 2 - 16, H2 - 135, 13, '#c8cdd6', 'center');
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
  // dialogue card
  if (st.dialogue) {
    drawPanel(c, 16, H2 - 246, 108, 128, C.neonPink);
    if (st.portrait) st.portrait(c, 22, H2 - 240, 96, 116, st.dialogueMood || 'alert');
    drawPill(c, 132, H2 - 246, 168, 22, C.neonPink);
    T(c, 'MARA — HARBOR CREW', 216, H2 - 234, 12, '#fff', 'center', 'bold');
    c.fillStyle = 'rgba(14,20,32,0.88)'; rr(c, 132, H2 - 218, 560, 100, 10); c.fill();
    c.fillStyle = C.neonPink; c.fillRect(132, H2 - 218, 4, 100);
    W(c, st.dialogue, 148, H2 - 196, 528, 16, '#ffffff', 24);
  }
  if (st.wanted >= 3) { c.fillStyle = 'rgba(239,68,68,0.07)'; c.fillRect(0, 0, W2, H2); }
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
export function drawTitle2(c, view, best, prog, backdrop, live) {
  const W2 = view.w, H2 = view.h;
  if (backdrop) backdrop(c);
  else { c.fillStyle = '#0e1420'; c.fillRect(0, 0, W2, H2); }
  // TITLE-FIX (Bug 6): the 3D backdrop (city3d frame) paints a HARDCODED
  // staging HUD — CHAPTER 12/12, $2,150, 4 stars, 142 MPH, GEAR 6 — that
  // contradicts the real progress. city3d.js is out of scope, so the live
  // values are painted over it here, from `live` (render.js title branch).
  if (live) {
    const CX = W2 / 2;
    // --- chapter banner (was: CHAPTER 12/12: THE HARBOR KING) ---
    const chLabel = 'CHAPTER ' + live.chapter + '/' + live.total + ': ' + live.chapterTitle.toUpperCase();
    const chSub = live.objective.toUpperCase();
    c.font = 'bold 15px ' + FONT;
    const bw = Math.min(W2 - 48, Math.max(400, c.measureText(chSub).width + 56));
    const bx = CX - bw / 2;
    const ux = Math.min(CX - 200, bx), uw = Math.max(CX + 200, bx + bw) - ux;
    c.fillStyle = '#0e081e';
    rr(c, ux, 16, uw, 46, 8); c.fill();
    c.fillStyle = 'rgba(8,8,24,0.75)';
    rr(c, bx, 16, bw, 46, 8); c.fill();
    c.lineWidth = 1.5; c.strokeStyle = '#c9a227'; rr(c, bx, 16, bw, 46, 8); c.stroke();
    c.fillStyle = '#ffd23e'; c.font = 'bold 11px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText(chLabel, CX, 33);
    c.fillStyle = '#ffffff'; c.font = 'bold 15px ' + FONT;
    c.fillText(chSub, CX, 52);
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
    // --- speed panel: erase with a live copy of the clean road strip left of it ---
    if (W2 > 640) c.drawImage(c.canvas, W2 - 396, H2 - 88, 180, 72, W2 - 196, H2 - 88, 180, 72);
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
  // BEST CASH stays centered on the SCREEN (card is narrow now; cx would
  // collide with the clock pill at bottom-left).
  drawPill(c, W2 / 2 - 78, H2 - 34, 156, 24, '#0e1420e6', C.cash);
  T(c, 'BEST CASH $' + best.toLocaleString('en-US'), W2 / 2, H2 - 21, 13, C.cash, 'center', 'bold');
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
  const W2 = view.w, H2 = view.h;
  const w = Math.min(680, W2 - 48), lineH = 56;
  const closed = st.garageClosed;
  const h = 170 + UPGRADES.length * lineH + 50 + (closed ? 34 : 0);
  const x = (W2 - w) / 2, y = (H2 - h) / 2;
  drawPanel(c, x, y, w, h, C.neonCyan);
  const hg = c.createLinearGradient(x, y, x + w, y);
  hg.addColorStop(0, '#37e0e655'); hg.addColorStop(1, '#ff4d9d55');
  c.fillStyle = hg; rr(c, x + 2, y + 2, w - 4, 46, 8); c.fill();
  T(c, 'GARAGE — UPGRADE SHOP', W2 / 2, y + 26, 24, '#ffffff', 'center', 'bold');
  drawPill(c, x + w - 150, y + 58, 130, 24, '#0e1420e6', C.cash);
  T(c, 'CASH $' + st.cash.toLocaleString('en-US'), x + w - 85, y + 71, 13, C.cash, 'center', 'bold');
  T(c, 'Fitted for good, kept for this visit', x + 28, y + 70, 14, '#c8cdd6', 'left');
  if (closed) {
    drawPill(c, x + 20, y + 92, w - 40, 28, '#ff3b3026', '#ff8a7a');
    T(c, 'CLOSED — district too hot (HEAT ' + Math.round(st.heat || 0) + '). Come back when it cools.', W2 / 2, y + 107, 14, '#ff8a7a', 'center', 'bold');
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
      T(c, '$' + u.cost, x + w - 69, ry + 26, 15, C.cash, 'center', 'bold');
    }
  });
  T(c, 'Up / Down to choose  ·  Enter to buy  ·  Esc to close', W2 / 2, y + h - 24, 15, C.neonYellow, 'center', 'bold');
}
// ---- pause panel v2 ----
export function drawPause2(c, view) {
  const W2 = view.w, H2 = view.h;
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
