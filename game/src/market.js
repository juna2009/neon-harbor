// Night market — Pasar Malam Neon Harbor (R35-F9).
// Karimbu (#1) has night-market on-foot combat; we had the combat (world.js
// walkPlayer + shoot on foot, combat.js bullets vs peds/cars/police gunmen)
// but NO market place anywhere (zero "market" hits in game/src before this
// file). This file adds the place only — no new systems.
//
// SITE: the Downtown park (first park whose centre is in x 1120..1760),
// else the largest park. Deterministic from the city object, so it works
// for every seed (seed 7: park 1490,530,220,220 — centre 1600,640).
// STALLS ARE VISUAL ONLY: no collision (city.js untouched) — the player
// walks and fights down the centre aisle; in the 2D view a stall rect
// underfoot reads as standing at the stall. No imports: this file stays
// post-cut no matter which post-cut file imports it (city3d.js, render.js,
// shots.js).
export function marketSite(city) {
  let best = null;
  for (const p of city.parks) {
    const cx = p.x + p.w / 2;
    if (cx >= 1120 && cx < 1760) return p;
    if (!best || p.w * p.h > best.w * best.h) best = p;
  }
  return best;
}
function nearTree(city, x, y, w, d) {
  // skip only when the tree disc actually touches the stall rect (+4 px):
  // a centre-distance test with a 30 px radius killed 6 of 8 stalls on
  // seed 7 (7 trees share the 220x220 plaza).
  for (const t of city.trees || []) {
    const nx = Math.max(x, Math.min(t.x, x + w));
    const ny = Math.max(y, Math.min(t.y, y + d));
    const dx = t.x - nx, dy = t.y - ny;
    if (dx * dx + dy * dy < (t.r + 4) * (t.r + 4)) return true;
  }
  return false;
}
// Stall rects (world px): two rows, centre aisle kept clear for walking
// and for the firing lane. {x, y, w, d, hue} — d is the depth (world y).
export function marketStalls(city) {
  const s = marketSite(city);
  if (!s) return [];
  const hues = ['#ff4d9d', '#ffd23e', '#37e0e6', '#ff8c42', '#9d6bff', '#7be382'];
  const out = [];
  const rows = [s.y + 62, s.y + s.h - 82];
  for (let r = 0; r < 2; r += 1) {
    for (let x = s.x + 16; x + 36 <= s.x + s.w - 16; x += 44) {
      if (nearTree(city, x, rows[r], 36, 20)) continue;
      out.push({ x, y: rows[r], w: 36, d: 20, hue: hues[out.length % hues.length] });
    }
  }
  return out;
}
export function marketAisle(city) {
  const s = marketSite(city);
  if (!s) return null;
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}
// ---- 2D top-down (render.js static layer) ----
export function drawMarket2D(g, city) {
  const s = marketSite(city);
  if (!s) return;
  g.fillStyle = '#7a5c3e';
  g.fillRect(s.x + 10, s.y + 10, s.w - 20, s.h - 20);
  g.strokeStyle = '#5a4028';
  g.lineWidth = 3;
  g.strokeRect(s.x + 10, s.y + 10, s.w - 20, s.h - 20);
  for (const st of marketStalls(city)) {
    g.fillStyle = '#8a5a33';
    g.fillRect(st.x, st.y, st.w, st.d);
    for (let i = 0; i < 3; i += 1) {
      g.fillStyle = i % 2 === 0 ? st.hue : '#fff3d6';
      g.fillRect(st.x + (i * st.w) / 3, st.y, st.w / 3, 7);
    }
    g.fillStyle = st.hue;
    g.fillRect(st.x + 6, st.y + 11, 6, 5);
    g.fillStyle = '#fff3d6';
    g.fillRect(st.x + 17, st.y + 11, 6, 5);
    g.fillStyle = '#7be382';
    g.fillRect(st.x + 28, st.y + 11, 6, 5);
  }
  g.fillStyle = '#ffd23e';
  for (const [px, py] of [[s.x + 16, s.y + 16], [s.x + s.w - 16, s.y + 16], [s.x + 16, s.y + s.h - 16], [s.x + s.w - 16, s.y + s.h - 16]]) {
    g.beginPath(); g.arc(px, py, 3, 0, 6.283); g.fill();
  }
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.fillRect(s.x + s.w / 2 - 78, s.y + 16, 156, 24);
  g.fillStyle = '#ffd23e';
  g.font = 'bold 20px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('PASAR MALAM', s.x + s.w / 2, s.y + 28);
}
// ---- 3D chase view (city3d.js drawChase3D) ----
// H: {box3, vQuad, flatQuad, inRange, sh, hx3, hz, CS, dist} — city3d.js
// module-level helpers, passed in (no circular import). nightF 0..1.
export function drawMarket3D(H, city, nightF) {
  const s = marketSite(city);
  if (!s) return;
  const cx = (s.x + s.w / 2) * H.CS, cz = (s.y + s.h / 2) * H.CS;
  if (!H.inRange(s.x + s.w / 2, s.y + s.h / 2, 170, 130)) return;
  const pd = H.dist(s.x + s.w / 2, s.y + s.h / 2);
  const lit = nightF > 0.4;
  // packed-earth plaza, inset so it never touches the road quads (the road
  // sidewalk overlaps the park edge by ~8 px — see drawChase3D roads).
  H.flatQuad(s.x + 12, s.y + 12, s.x + s.w - 12, s.y + s.h - 12, 0.04, H.sh(H.hx3('#7a5c3e'), 0.9, H.hz(pd)));
  // sign board on the EAST edge (backdrop behind the gunmen): the west
  // edge sits ~10 units from the chase camera and a board there filled
  // the whole frame and hid the hero (shot v1).
  const sx = (s.x + s.w - 8) * H.CS;
  H.box3(sx, 0, cz - 3.2, 0.3, 2.6, 0.3, 0, '#241f28', pd);
  H.box3(sx, 0, cz + 3.2, 0.3, 2.6, 0.3, 0, '#241f28', pd);
  H.box3(sx, 1.3, cz, 0.35, 1.5, 7, 0, lit ? '#ff4d9d' : '#b8455a', pd);
  H.box3(sx, 2.85, cz, 0.45, 0.28, 7.3, 0, lit ? '#37e0e6' : '#2f6b5a', pd);
  // stalls: wooden counter + colourful goods + two-tone striped awning.
  for (const st of marketStalls(city)) {
    const scx = (st.x + st.w / 2) * H.CS, scz = (st.y + st.d / 2) * H.CS;
    const sw = st.w * H.CS, sd = st.d * H.CS;
    H.box3(scx, 0, scz, sd, 1.1, sw, 0, '#7a4a28', pd);
    H.box3(scx, 1.1, scz, sd * 0.6, 0.35, sw * 0.8, 0, st.hue, pd);
    H.box3(scx - sw / 4, 1.9, scz, sd + 0.6, 0.18, sw / 2 + 0.3, 0, st.hue, pd);
    H.box3(scx + sw / 4, 1.9, scz, sd + 0.6, 0.18, sw / 2 + 0.3, 0, '#fff3d6', pd);
  }
  // string lights: 4 poles + sagging spans of warm bulbs across the aisle.
  const poles = [[s.x + 18, s.y + 18], [s.x + s.w - 18, s.y + 18], [s.x + 18, s.y + s.h - 18], [s.x + s.w - 18, s.y + s.h - 18]];
  for (const [px, py] of poles) {
    H.box3(px * H.CS, 0, py * H.CS, 0.22, 2.7, 0.22, 0, '#241f28', pd);
    H.box3(px * H.CS, 2.7, py * H.CS, 0.26, 0.26, 0.26, 0, lit ? '#ffd9a0' : '#cbb98a', pd);
  }
  const spans = [[[poles[0][0], poles[0][1]], [poles[1][0], poles[1][1]]], [[poles[2][0], poles[2][1]], [poles[3][0], poles[3][1]]], [[poles[0][0], poles[0][1]], [poles[2][0], poles[2][1]]], [[poles[1][0], poles[1][1]], [poles[3][0], poles[3][1]]]];
  for (const [[x0, y0], [x1, y1]] of spans) {
    for (let i = 1; i < 6; i += 1) {
      const k = i / 6;
      const bx = (x0 + (x1 - x0) * k) * H.CS, bz = (y0 + (y1 - y0) * k) * H.CS;
      const sag = 2.55 - 0.35 * Math.sin(k * Math.PI);
      H.box3(bx, sag, bz, 0.24, 0.24, 0.24, 0, lit ? '#ffd9a0' : '#cbb98a', pd);
    }
  }
  if (lit) {
    H.flatQuad(s.x + 12, s.y + 12, s.x + s.w - 12, s.y + s.h - 12, 0.08, 'rgba(255,200,120,0.10)');
  }
}
