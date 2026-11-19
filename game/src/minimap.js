import { ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';
import { DISTRICT7, standingLabel, updateStanding } from './districts.js';
import { drawMapBridge, drawMapGas, drawMapHydrant, drawMapMission, drawMapPlayer, drawMapWrench } from './ui-art.js';
// Neon Harbor minimap — redrawn as a REAL MAP (BEAT-GHK A1, 2026-11-19).
// Juna (13:27 WIB): "MAPNYA JELEK — isinya cuma kotak-kotak." The old map
// was a flat green field with 5px road bars and square markers, so the whole
// thing read as a grid of boxes. This version:
//   - roads are LINES: dark casing + asphalt + dashed centreline;
//   - city blocks are district-tinted parcels that follow the road grid
//     (Old Town tan, Downtown slate, Harbor teal), each with roof-coloured
//     building footprints inside, so blocks are never uniform squares;
//   - the harbour is a BLUE water band with a pale shoreline, sand edge,
//     wave ticks and piers at the marina/docks;
//   - cars/police/boats are GLYPHS (player arrow, police star badge, boat
//     hull triangle, heli rotor), never boxes; mission target keeps its
//     pulsing diamond + "!" and gains a dashed route line from the player.
// Same slot (160x120, R27c — do NOT enlarge), same ?minimap=round switch,
// same label, same exported shape, so it stays a drop-in for drawMinimap2
// in ui2.js (which owns the live HUD call + the PD panel below the map).
// NOTE: this module was unimported — the live minimap was drawMinimap2
// in ui2.js. The wiring lives in this same patch (ui2.js hunk, A1b):
// ui2.js imports drawMinimap and delegates its world/frame/label to it
// (0 dossier bytes — ui2.js is post-cut too; see STATUS.md in the
// BEAT-GHK minimap scratch dir).
function minimapShape() {
  try {
    return new URLSearchParams(window.location.search).get('minimap') === 'round' ? 'round' : 'square';
  } catch (e) { return 'square'; }
}
// District parcel tones (3 shades each, picked by block index so the city
// never reads as one flat colour). Darker than the 3D ground tones: a map
// this small needs contrast against the roads, not fidelity.
const BLOCK_TONES = [
  ['#6a5c36', '#74683d', '#5d4f2e'], // Old Town (x < 1120): tan/olive
  ['#3d434f', '#454c5a', '#353b46'], // Downtown (x < 1760): slate
  ['#2d4a3c', '#345544', '#264233'], // Harbor: teal-green
];
function districtOf(cx) { return cx < 1120 ? 0 : cx < 1760 ? 1 : 2; }
function poly(c, pts) {
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  c.closePath();
}
function diamond(c, x, y, r) { poly(c, [x, y - r, x + r, y, x, y + r, x - r, y]); }
function star(c, x, y, r, points, rot) {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = (rot || 0) + (i * Math.PI) / points - Math.PI / 2;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) c.lineTo(px, py); else c.moveTo(px, py);
  }
  c.closePath();
}
function dot(c, x, y, r, fill, ring, ringW) {
  c.save();
  c.fillStyle = fill; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  if (ring) { c.lineWidth = ringW || 1.2; c.strokeStyle = ring; c.beginPath(); c.arc(x, y, r + 1.2, 0, Math.PI * 2); c.stroke(); }
  c.restore();
}
function boatGlyph(c, px, py, s, ang) {
  c.save(); c.translate(px, py); c.rotate(ang || 0);
  c.fillStyle = '#ffffff';
  poly(c, [0, -s * 0.75, s * 0.55, s * 0.55, -s * 0.55, s * 0.55]); c.fill();
  c.lineWidth = 1; c.strokeStyle = '#37e0e6'; c.stroke();
  c.strokeStyle = '#0e1420'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(0, -s * 0.75); c.lineTo(0, s * 0.2); c.stroke();
  c.restore();
}
function policeGlyph(c, px, py, s, roadblock) {
  c.save();
  if (roadblock) { c.shadowColor = '#ff3b30'; c.shadowBlur = 7; }
  c.fillStyle = roadblock ? '#ff3b30' : '#3b82f6';
  star(c, px, py, s, 5, 0); c.fill();
  c.shadowBlur = 0; c.lineWidth = 1.2; c.strokeStyle = '#ffffff'; c.stroke();
  c.restore();
}
export function drawMinimap(ctx, state, x, y, w, h) {
  const sx = w / WORLD_W;
  const sy = h / WORLD_H;
  // R35-F2: district standing — per-frame update (mission/wanted deltas)
  // + police-response effect live here, in the post-cut HUD layer.
  const st7 = updateStanding(state);
  const here = st7.current;
  const round = minimapShape() === 'round';
  const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2;
  const city = state.city || {};
  const roadsV = city.roadsV || [], roadsH = city.roadsH || [];
  ctx.save();
  if (round) {
    // dark disc backing so the clipped corners read as panel, not void
    ctx.fillStyle = 'rgba(10,15,28,0.92)';
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  } else {
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(x - 4, y - 4, w + 8, h + 26);
    ctx.globalAlpha = 1;
    // clip markers to the map rect: boats at the marina/docks and the
    // lighthouse star sit on the map edge — without this they poke 1-2 px
    // over the frame (the old dots did the same). Frame + label are drawn
    // after ctx.restore(), so they are not clipped.
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  }
  // ---- land base ----
  ctx.fillStyle = '#20261f';
  ctx.fillRect(x, y, w, h);
  // ---- water: blue band east of the shore, pale shoreline, sand edge ----
  const wx = x + WATER_X * sx;
  const wg = ctx.createLinearGradient(wx, 0, x + w, 0);
  wg.addColorStop(0, '#1668a0'); wg.addColorStop(1, '#2fa8e0');
  ctx.fillStyle = wg;
  ctx.fillRect(wx, y, x + w - wx, h);
  ctx.fillStyle = '#b39b62'; // sand strip between last road and shore
  ctx.fillRect(x + 2400 * sx, y, (WATER_X - 2400) * sx, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(wx, y); ctx.lineTo(wx, y + h); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
  for (const fy of [0.3, 0.62]) {
    ctx.beginPath(); ctx.moveTo(wx + 2, y + h * fy); ctx.lineTo(x + w - 1.5, y + h * fy); ctx.stroke();
  }
  // ---- city blocks: district parcels following the road grid ----
  const half = (ROAD_W / 2) * sx;
  for (let i = 0; i < roadsV.length - 1; i++) {
    for (let j = 0; j < roadsH.length - 1; j++) {
      const bx = x + roadsV[i] * sx + half, by = y + roadsH[j] * sy + half;
      const bw = (roadsV[i + 1] - roadsV[i]) * sx - half * 2;
      const bh = (roadsH[j + 1] - roadsH[j]) * sy - half * 2;
      const tones = BLOCK_TONES[districtOf((roadsV[i] + roadsV[i + 1]) / 2)];
      ctx.fillStyle = tones[(i * 7 + j * 13) % 3];
      ctx.beginPath(); ctx.roundRect(bx + 0.5, by + 0.5, bw - 1, bh - 1, 2); ctx.fill();
    }
  }
  // ---- gas-station lot: asphalt apron (its cell has no buildings) ----
  const gas = state.gasStation;
  if (gas) { ctx.fillStyle = '#33383f'; ctx.fillRect(x + gas.x * sx, y + gas.y * sy, gas.w * sx, gas.h * sy); }
  // ---- parks: green parcels with tree dots ----
  for (const park of city.parks || []) {
    const px = x + park.x * sx, py = y + park.y * sy, pw = park.w * sx, ph = park.h * sy;
    ctx.fillStyle = '#2f7a3d';
    ctx.beginPath(); ctx.roundRect(px + 0.5, py + 0.5, Math.max(2, pw - 1), Math.max(2, ph - 1), 2); ctx.fill();
    ctx.fillStyle = '#1d5c2a';
    const tx = px + pw / 2, ty = py + ph / 2;
    for (const [dx, dy] of [[-0.22, -0.18], [0.2, -0.12], [0, 0.22]]) {
      ctx.beginPath(); ctx.arc(tx + dx * pw, ty + dy * ph, 1.3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // ---- buildings: roof-coloured footprints inside the parcels ----
  ctx.globalAlpha = 0.6;
  for (const b of city.buildings || []) {
    ctx.fillStyle = b.color || '#888888';
    ctx.fillRect(x + b.x * sx + 0.5, y + b.y * sy + 0.5, Math.max(1.5, b.w * sx - 1), Math.max(1.5, b.h * sy - 1));
  }
  ctx.globalAlpha = 1;
  // ---- marina / docks: concrete aprons + wooden piers into the water ----
  ctx.fillStyle = '#4a4438';
  if (city.marina) ctx.fillRect(x + city.marina.x * sx, y + city.marina.y * sy, city.marina.w * sx, city.marina.h * sy);
  if (city.docks) ctx.fillRect(x + city.docks.x * sx, y + city.docks.y * sy, city.docks.w * sx, city.docks.h * sy);
  ctx.strokeStyle = '#8a6b45'; ctx.lineWidth = 2;
  for (const py of [200, 1560, 1640]) {
    ctx.beginPath(); ctx.moveTo(x + 2420 * sx, y + py * sy); ctx.lineTo(x + w - 1, y + py * sy); ctx.stroke();
  }
  // ---- roads as LINES: dark casing + asphalt + dashed centreline ----
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#0f141a'; ctx.lineWidth = 6;
  for (const rx of roadsV) { ctx.beginPath(); ctx.moveTo(x + rx * sx, y); ctx.lineTo(x + rx * sx, y + h); ctx.stroke(); }
  for (const ry of roadsH) { ctx.beginPath(); ctx.moveTo(x, y + ry * sy); ctx.lineTo(x + w, y + ry * sy); ctx.stroke(); }
  ctx.strokeStyle = '#454d58'; ctx.lineWidth = 4.2;
  for (const rx of roadsV) { ctx.beginPath(); ctx.moveTo(x + rx * sx, y); ctx.lineTo(x + rx * sx, y + h); ctx.stroke(); }
  for (const ry of roadsH) { ctx.beginPath(); ctx.moveTo(x, y + ry * sy); ctx.lineTo(x + w, y + ry * sy); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(232,210,122,0.85)'; ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (const rx of roadsV) { ctx.beginPath(); ctx.moveTo(x + rx * sx, y); ctx.lineTo(x + rx * sx, y + h); ctx.stroke(); }
  for (const ry of roadsH) { ctx.beginPath(); ctx.moveTo(x, y + ry * sy); ctx.lineTo(x + w, y + ry * sy); ctx.stroke(); }
  ctx.setLineDash([]);
  // ---- R35-F2: district standing tint (Friendly green / Wary red wash
  // over each of the 7 districts, current district outlined + coded) ----
  for (let i = 0; i < 7; i++) {
    const d = DISTRICT7[i];
    const lab = standingLabel(st7.scores[i]);
    if (lab !== 'NEUTRAL') {
      ctx.fillStyle = lab === 'FRIENDLY' ? 'rgba(47,191,113,0.20)' : 'rgba(255,90,60,0.22)';
      ctx.fillRect(x + d.x * sx, y + d.y * sy, d.w * sx, d.h * sy);
    }
  }
  const hd = DISTRICT7[here];
  ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.strokeRect(x + hd.x * sx + 0.5, y + hd.y * sy + 0.5, hd.w * sx - 1, hd.h * sy - 1);
  ctx.font = 'bold 7px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 7; i++) {
    const d = DISTRICT7[i];
    if (d.w * sx < 24) continue; // Marina strip is too narrow for a code
    ctx.fillText(d.short, x + (d.x + d.w / 2) * sx, y + (d.y + d.h / 2) * sy);
  }
  ctx.textAlign = 'left';
  // ---- route line: dashed from player to the mission target ----
  const p = state.player;
  if (state.mission.target && p) {
    const t = state.mission.target;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(x + p.x * sx, y + p.y * sy); ctx.lineTo(x + t.x * sx, y + t.y * sy); ctx.stroke();
    ctx.setLineDash([]);
  }
  // ---- markers: icons, never plain boxes ----
  ctx.fillStyle = '#ffd23e';
  for (const c of state.collectibles) {
    if (!c.taken) { diamond(ctx, x + c.x * sx, y + c.y * sy, 2.5); ctx.fill(); }
  }
  if (state.race) {
    // start: checkered flag on a pole
    const rs = state.race.start;
    const fx = x + rs.x * sx, fy = y + rs.y * sy;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 8); ctx.stroke();
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#0e1420' : '#ffffff';
      ctx.fillRect(fx + i * 3, fy - 8 + j * 3, 3, 3);
    }
    if (state.race.active) {
      const t = state.race.points[state.race.index];
      ctx.fillStyle = '#37e0e6'; diamond(ctx, x + t.x * sx, y + t.y * sy, 4); ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    }
  }
  if (state.mission.target) {
    const t = state.mission.target;
    drawMapMission(ctx, x + t.x * sx, y + t.y * sy, 11, state.elapsed);
  }
  if (gas) drawMapGas(ctx, x + (gas.x + gas.w / 2) * sx, y + (gas.y + gas.h / 2) * sy, 9);
  if (city.garage) drawMapWrench(ctx, x + city.garage.x * sx, y + city.garage.y * sy, 9);
  for (const hd of state.hydrants) drawMapHydrant(ctx, x + hd.x * sx, y + hd.y * sy, 7);
  if (city.casino) {
    ctx.fillStyle = '#ffd23e';
    star(ctx, x + city.casino.x * sx, y + city.casino.y * sy, 5, 4, 0); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }
  if (city.lighthouse) {
    ctx.fillStyle = '#ffffff';
    star(ctx, x + city.lighthouse.x * sx, y + city.lighthouse.y * sy, 5, 4, 0); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#ffd23e'; ctx.stroke();
  }
  if (state.bridge) drawMapBridge(ctx, x + 2400 * sx, y + 1680 * sy, 9, state.bridge.up);
  if (state.taxi && state.taxi.state === 'pickup' && state.taxi.fare) {
    dot(ctx, x + state.taxi.fare.x * sx, y + state.taxi.fare.y * sy, 3.5, '#7be382', '#ffffff');
  }
  if (state.taxi && state.taxi.state === 'dropoff' && state.taxi.dest) {
    ctx.fillStyle = '#7be382';
    diamond(ctx, x + state.taxi.dest.x * sx, y + state.taxi.dest.y * sy, 4); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }
  for (const strip of state.police.strips) {
    ctx.fillStyle = '#ff5a3c';
    poly(ctx, [x + strip.x * sx, y + strip.y * sy - 4.5, x + strip.x * sx + 4.5, y + strip.y * sy + 3.5, x + strip.x * sx - 4.5, y + strip.y * sy + 3.5]);
    ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }
  for (const boat of state.boats || []) {
    if (!boat.alive) continue;
    boatGlyph(ctx, x + boat.x * sx, y + boat.y * sy, 6, boat.angle);
  }
  for (const unit of state.police.units) {
    const ux = unit.kind === 'car' ? unit.car.x : unit.x;
    const uy = unit.kind === 'car' ? unit.car.y : unit.y;
    if (unit.kind === 'gunman') {
      ctx.fillStyle = '#ff5a3c';
      diamond(ctx, x + ux * sx, y + uy * sy, 4); ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    } else {
      policeGlyph(ctx, x + ux * sx, y + uy * sy, unit.roadblock ? 6.5 : 5.5, !!unit.roadblock);
    }
  }
  if (state.police.heli && state.police.heli.active) {
    const hx = x + state.police.heli.x * sx, hy = y + state.police.heli.y * sy;
    dot(ctx, hx, hy, 4, '#ffffff', '#ff5a3c', 1.5);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate((state.elapsed || 0) * 3);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke();
    ctx.restore();
  }
  for (const car of state.traffic.cars) {
    if (car.pink && car.alive) dot(ctx, x + car.x * sx, y + car.y * sy, 4, '#ff7fc0', '#ffffff');
  }
  if (state.ufo && state.ufo.active) {
    ctx.fillStyle = '#78ff8c';
    diamond(ctx, x + state.ufo.x * sx, y + state.ufo.y * sy, 4.5); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke();
  }
  if (p) drawMapPlayer(ctx, x + p.x * sx, y + p.y * sy, 11, p.angle);
  ctx.restore();
  // ---- frame (shape-specific) + label strip (same for both shapes) ----
  if (round) {
    ctx.lineWidth = 2; ctx.strokeStyle = '#37e0e6';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(238,241,245,0.5)';
    ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.lineWidth = 1; ctx.strokeStyle = '#37e0e6';
    ctx.strokeRect(x - 4.5, y - 4.5, w + 9, h + 27);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(238,241,245,0.35)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#37e0e6';
  ctx.fillText('NEON HARBOR', x + w / 2, y + h + 12);
  // R38-minimap (item 4): the compass used to be right-aligned at x+w-4
  // with a font '↑' glyph — in headless Chromium that glyph renders as a
  // hairline tick jammed against the frame edge, so Juna read the 'N' as
  // clipped at the right edge. Now: 12px clearance from the frame edge
  // and a DRAWN triangle arrow (font-independent), so the compass reads
  // whole at 1x. 'NEON HARBOR' (ends ~x+w/2+40) keeps ~10px clear.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#eef1f5';
  const ly = y + h + 12;       // label-strip centre line
  const cRight = x + w - 12;   // compass group right edge (12px clear of frame)
  ctx.fillText('N', cRight - 11, ly);
  ctx.beginPath();
  ctx.moveTo(cRight - 4, ly + 4);
  ctx.lineTo(cRight + 4, ly + 4);
  ctx.lineTo(cRight, ly - 5);
  ctx.closePath(); ctx.fill();
  ctx.textAlign = 'left';
}
