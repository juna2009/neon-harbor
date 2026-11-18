// ships3d.js — Neon Harbor: kapal pesiar + yacht besar prosedural untuk WebGL2
// R27b DE-BOXING (2026-11-19): Juna minta kapal GEDE + kapal pesiar, jangan
// kotak-kotak. Lambung DILOFT (penampang melengkung haluan-buritan, bukan balok),
// superstruktur multi-dek bertingkat, deretan jendela, cerobong miring,
// sekoci, rel — dua penempatan STATIS, tanpa gameplay, tanpa kolisi baru:
//   (1) kapal pesiar BESAR bersandar di dermaga pelabuhan, haluan ke utara
//       (pusat game 2480,680 — sisi barat menempel garis air, buritan 35 px
//       di selatan SHIP_RECT, sisi timur 13 px di barat jalur M11 boat2
//       x=2535, 90 px di utara buoy 900; perahu M11 TIDAK pernah menyentuhnya);
//   (2) satu yacht besar berlabuh di teluk selatan dermaga (2530,1750 —
//       130 px di selatan spawn boat #2, di luar semua waypoint M11).
// ES module, tanpa dependensi, tanpa network. Konvensi SAMA dengan
// cars3d.js/webgl2.js: bucket { p, n, u, c, m, i }, material 1 cat · 2 kaca ·
// 4 emissive · 5 matte · 9 bayangan kontak (bucket G, di-split ke SH).
// Koordinat dunia WebGL: X = game x*0.1, Z = game y*0.1, Y = atas.
// Lokal kapal: +Z = haluan, +X = kanan; yaw = PI/2 - angle game.
// Geometri kit di bawah ini DUPLIKASI kecil dari cars3d.js (sengaja — modul
// ini harus jalan sendiri; salinan kanonis tetap di webgl2.js).

// ---------------------------------------------------------------------------
// Geometri kit (format bucket = webgl2.js)
// ---------------------------------------------------------------------------
export function newBucket() { return { p: [], n: [], u: [], c: [], m: [], i: [] }; }
export { quad, boxR, box, flat, billDir };
function push(B, v, n, uv, col, m) {
  B.p.push(v[0], v[1], v[2]); B.n.push(n[0], n[1], n[2]);
  B.u.push(uv[0], uv[1]); B.c.push(col[0], col[1], col[2]); B.m.push(m);
}
function quad(B, a, b, c, d, n, uvs, col, m) {
  const base = B.p.length / 3;
  push(B, a, n, uvs[0], col, m); push(B, b, n, uvs[1], col, m);
  push(B, c, n, uvs[2], col, m); push(B, d, n, uvs[3], col, m);
  B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
}
function tri(B, a, b, c, n, uvs, col, m) {
  const base = B.p.length / 3;
  push(B, a, n, uvs[0], col, m); push(B, b, n, uvs[1], col, m); push(B, c, n, uvs[2], col, m);
  B.i.push(base, base + 1, base + 2);
}
function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
// Quad dengan normal geometris + winding dibalik bila normal menunjuk ke
// dalam (wantN = arah luar yang diinginkan). Shader tidak pakai culling,
// tapi normal yang benar = pencahayaan yang benar.
function quadAuto(B, a, b, c, d, col, m, wantN) {
  const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
  let n = norm(cross(sub(b, a), sub(c, a)));
  if (dot(n, wantN) < 0) { n = [-n[0], -n[1], -n[2]]; quad(B, a, d, c, b, n, uvs, col, m); }
  else quad(B, a, b, c, d, n, uvs, col, m);
}
// Box dengan yaw (sumbu Y) + pitch (sumbu X LOKAL, pitch dulu baru yaw —
// sama seperti cars3d.js v16: urutan lama memutar rx mengelilingi sumbu-X
// dunia, bukan pitch lokal).
function boxR(B, cx, cy, cz, w, h, d, ry, rx, col, m) {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const cy2 = Math.cos(ry), sy2 = Math.sin(ry), cx2 = Math.cos(rx), sx2 = Math.sin(rx);
  const rot = (x, y, z) => {
    const y1 = y * cx2 - z * sx2, z1 = y * sx2 + z * cx2;
    const x2 = x * cy2 + z1 * sy2, z2 = -x * sy2 + z1 * cy2;
    return [cx + x2, cy + y1, cz + z2];
  };
  const nrm = (x, y, z) => {
    const y1 = y * cx2 - z * sx2, z1 = y * sx2 + z * cx2;
    const x2 = x * cy2 + z1 * sy2, z2 = -x * sy2 + z1 * cy2;
    const l = Math.hypot(x2, y1, z2) || 1;
    return [x2 / l, y1 / l, z2 / l];
  };
  const F = [
    { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]], uv: [[cx - hx, cy - hy], [cx + hx, cy - hy], [cx + hx, cy + hy], [cx - hx, cy + hy]] },
    { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]], uv: [[cx + hx, cy - hy], [cx - hx, cy - hy], [cx - hx, cy + hy], [cx + hx, cy + hy]] },
    { n: [0, 1, 0], v: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]], uv: [[cx - hx, cz + hz], [cx + hx, cz + hz], [cx + hx, cz - hz], [cx - hx, cz - hz]] },
    { n: [0, -1, 0], v: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]], uv: [[cx - hx, cz - hz], [cx + hx, cz - hz], [cx + hx, cz + hz], [cx - hx, cz + hz]] },
    { n: [1, 0, 0], v: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]], uv: [[cz + hz, cy - hy], [cz - hz, cy - hy], [cz - hz, cy + hy], [cz + hz, cy + hy]] },
    { n: [-1, 0, 0], v: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]], uv: [[cz - hz, cy - hy], [cz + hz, cy - hy], [cz + hz, cy + hy], [cz - hz, cy + hy]] },
  ];
  for (const f of F) {
    const vs = f.v.map((q) => rot(q[0], q[1], q[2]));
    quad(B, vs[0], vs[1], vs[2], vs[3], nrm(f.n[0], f.n[1], f.n[2]), f.uv, col, m);
  }
}
function box(B, cx, cy, cz, w, h, d, col, m) { boxR(B, cx, cy, cz, w, h, d, 0, 0, col, m); }
function flat(B, x, y, z, w, d, col, m, uvs) {
  const hw = w / 2, hd = d / 2;
  quad(B, [x - hw, y, z - hd], [x + hw, y, z - hd], [x + hw, y, z + hd], [x - hw, y, z + hd], [0, 1, 0],
    uvs || [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
}
// Quad datar (y = const) dengan yaw kapal — bayangan kontak, kolam, dek.
// PENTING: bayangan mat 9 HARUS masuk bucket G (bukan OP): render() memecah
// G per material dan mat 9 masuk SH (blending normal); di OP blending mati
// dan alfa elips diabaikan -> hitam pekat.
function flatYaw(B, cx, cy, cz, yaw, w, d, col, m) {
  const fwd = [Math.sin(yaw), Math.cos(yaw)], rgt = [Math.cos(yaw), -Math.sin(yaw)];
  const at = (lx, lz) => [cx + rgt[0] * lx + fwd[0] * lz, cy, cz + rgt[1] * lx + fwd[1] * lz];
  quad(B, at(-w / 2, -d / 2), at(w / 2, -d / 2), at(w / 2, d / 2), at(-w / 2, d / 2), [0, 1, 0],
    [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
}
// Quad vertikal dengan normal bebas (kaca, lampu, panel).
function billDir(B, cx, cy, cz, w, h, nrm, col, m) {
  const r = norm(cross([0, 1, 0], nrm));
  const hw = w / 2, hh = h / 2;
  const c = (sr, sh) => [cx + r[0] * sr * hw, cy + sh * hh, cz + r[2] * sr * hw];
  quad(B, c(-1, -1), c(1, -1), c(1, 1), c(-1, 1), nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
}

// ---------------------------------------------------------------------------
// Palet kapal
// ---------------------------------------------------------------------------
const WHITE = [0.93, 0.93, 0.90];
const DECK = [0.78, 0.78, 0.76];
const NAVY = [0.07, 0.14, 0.30];
const TEAL = [0.05, 0.72, 0.82];
const GLASS = [0.10, 0.16, 0.28];
const WARM = [1.0, 0.72, 0.32];
const DARK = [0.05, 0.05, 0.07];
const ORANGE = [1.0, 0.45, 0.10];
const RED = [0.85, 0.12, 0.15];
const POOL = [0.15, 0.50, 0.85];
const M = { paint: 1, glass: 2, emissive: 4, matte: 5, shadow: 9 };

// ---------------------------------------------------------------------------
// Loft: lambung / superstruktur dari stasiun penampang
// stations: [{ z, hw, hwB, yBot, yDeck, cLo, cUp, cDeck }] — z absolut lokal,
// hw = setengah lebar di geladak, hwB = setengah lebar di lunas, yBot/yDeck
// = tinggi bawah/atas. Penampang: lunas -> bilge (cLo) -> sisi atas (cUp)
// -> geladak (cDeck). Stasiun haluan hw=0 = stem meruncing ke garis tegak.
// ---------------------------------------------------------------------------
function loft(B, P, D, stations) {
  const prof = (st) => {
    const yMid = (st.yBot + st.yDeck) / 2;
    const hwM = st.hwB + (st.hw - st.hwB) * 0.55;
    return { yMid, hwM };
  };
  for (let i = 0; i < stations.length - 1; i += 1) {
    const A = stations[i], C = stations[i + 1];
    const pA = prof(A), pC = prof(C);
    for (const s of [1, -1]) {
      const want = D(s, 0, 0);
      // pita bawah (lunas -> bilge)
      quadAuto(B, P(s * A.hwB, A.yBot, A.z), P(s * C.hwB, C.yBot, C.z),
        P(s * pC.hwM, pC.yMid, C.z), P(s * pA.hwM, pA.yMid, A.z), A.cLo, M.matte, want);
      // pita atas (bilge -> geladak)
      quadAuto(B, P(s * pA.hwM, pA.yMid, A.z), P(s * pC.hwM, pC.yMid, C.z),
        P(s * C.hw, C.yDeck, C.z), P(s * A.hw, A.yDeck, A.z), A.cUp, M.matte, want);
    }
    // geladak (atap) antar-stasiun — di haluan menyempit jadi segitiga
    if (A.hw > 0.03 || C.hw > 0.03) {
      quadAuto(B, P(-A.hw, A.yDeck, A.z), P(A.hw, A.yDeck, A.z),
        P(C.hw, C.yDeck, C.z), P(-C.hw, C.yDeck, C.z), A.cDeck, M.matte, [0, 1, 0]);
    }
  }
  // Transom (tutup buritan, trapesium melebar ke atas)
  const S0 = stations[0];
  quadAuto(B, P(-S0.hwB, S0.yBot, S0.z), P(S0.hwB, S0.yBot, S0.z),
    P(S0.hw, S0.yDeck, S0.z), P(-S0.hw, S0.yDeck, S0.z), S0.cUp, M.matte, D(0, 0, -1));
}
// Setengah lebar sisi pada (z, y) — interpolasi stasiun + profil.
function sideX(stations, z, y) {
  let i = 0;
  while (i < stations.length - 2 && z > stations[i + 1].z) i += 1;
  const A = stations[i], C = stations[i + 1];
  const t = C.z === A.z ? 0 : Math.max(0, Math.min(1, (z - A.z) / (C.z - A.z)));
  const lerp = (a, b) => a + (b - a) * t;
  const hw = lerp(A.hw, C.hw), hwB = lerp(A.hwB, C.hwB);
  const yBot = lerp(A.yBot, C.yBot), yDeck = lerp(A.yDeck, C.yDeck);
  const yMid = (yBot + yDeck) / 2, hwM = hwB + (hw - hwB) * 0.55;
  if (y <= yMid) return hwB + (hwM - hwB) * Math.max(0, (y - yBot) / Math.max(0.001, yMid - yBot));
  return hwM + (hw - hwM) * Math.max(0, Math.min(1, (y - yMid) / Math.max(0.001, yDeck - yMid)));
}
// Pita warna (mis. sheer stripe) mengikuti sisi loft, sedikit menonjol.
function stripe(B, P, D, stations, side, yOffTop, hgt, col, m) {
  for (let i = 0; i < stations.length - 1; i += 1) {
    const A = stations[i], C = stations[i + 1];
    const yT0 = A.yDeck - yOffTop, yB0 = yT0 - hgt;
    const yT1 = C.yDeck - yOffTop, yB1 = yT1 - hgt;
    quadAuto(B, P(side * (sideX(stations, A.z, yB0) + 0.02), yB0, A.z),
      P(side * (sideX(stations, C.z, yB1) + 0.02), yB1, C.z),
      P(side * (sideX(stations, C.z, yT1) + 0.02), yT1, C.z),
      P(side * (sideX(stations, A.z, yT0) + 0.02), yT0, A.z), col, m, D(side, 0, 0));
  }
}
// Deretan jendela di sisi loft (kaca gelap; tiap ke-N menyala hangat).
// Quad DIMIRINGKAN mengikuti sisi (x atas/bawah dihitung terpisah): sisi
// lambung miring ke luar ke atas — quad tegak akan terkubur setengahnya.
function winRow(B, P, D, stations, yC, zA, zB, pitch, w, h, litEvery) {
  let k = 0;
  for (let z = zA; z <= zB + 0.001; z += pitch, k += 1) {
    for (const s of [1, -1]) {
      const xT = sideX(stations, z, yC + h / 2) + 0.02;
      const xB = sideX(stations, z, yC - h / 2) + 0.02;
      const lit = litEvery && k % litEvery === 0;
      quadAuto(B, P(s * xB, yC - h / 2, z - w / 2), P(s * xB, yC - h / 2, z + w / 2),
        P(s * xT, yC + h / 2, z + w / 2), P(s * xT, yC + h / 2, z - w / 2),
        lit ? WARM : GLASS, lit ? M.emissive : M.glass, D(s, -(xT - xB) / h, 0));
    }
  }
}
// Cerobong (funnel) miring ke buritan: frustum 4 sisi + tutup atas gelap.
// Dua panggilan bertumpuk = badan putih + pita atas warna.
function frustum(B, P, D, zc, y0, y1, bx0, bz0, bx1, bz1, sh0, sh1, col, m, cap) {
  const c0 = zc + sh0, c1 = zc + sh1;
  quadAuto(B, P(-bx0, y0, c0 + bz0), P(bx0, y0, c0 + bz0), P(bx1, y1, c1 + bz1), P(-bx1, y1, c1 + bz1), col, m, D(0, 0, 1));
  quadAuto(B, P(bx0, y0, c0 - bz0), P(-bx0, y0, c0 - bz0), P(-bx1, y1, c1 - bz1), P(bx1, y1, c1 - bz1), col, m, D(0, 0, -1));
  quadAuto(B, P(bx0, y0, c0 - bz0), P(bx0, y0, c0 + bz0), P(bx1, y1, c1 + bz1), P(bx1, y1, c1 - bz1), col, m, D(1, 0, 0));
  quadAuto(B, P(-bx0, y0, c0 + bz0), P(-bx0, y0, c0 - bz0), P(-bx1, y1, c1 - bz1), P(-bx1, y1, c1 + bz1), col, m, D(-1, 0, 0));
  if (cap) {
    quadAuto(B, P(-bx1, y1, c1 - bz1), P(bx1, y1, c1 - bz1), P(bx1, y1, c1 + bz1), P(-bx1, y1, c1 + bz1), DARK, M.matte, [0, 1, 0]);
  }
}
// Frame lokal kapal: P = titik lokal -> dunia, D = arah lokal -> dunia.
function frame(cx, cz, yaw) {
  const fwd = [Math.sin(yaw), Math.cos(yaw)];
  const rgt = [Math.cos(yaw), -Math.sin(yaw)];
  const P = (lx, ly, lz) => [cx + rgt[0] * lx + fwd[0] * lz, ly, cz + rgt[1] * lx + fwd[1] * lz];
  const D = (lx, ly, lz) => norm([rgt[0] * lx + fwd[0] * lz, ly, rgt[1] * lx + fwd[1] * lz]);
  return { P, D };
}
const st = (L, W, zf, hwf, hwBf, yBot, yDeck, cLo, cUp, cDeck) => ({
  z: zf * L, hw: hwf * W, hwB: hwBf * W, yBot, yDeck,
  cLo: cLo || NAVY, cUp: cUp || WHITE, cDeck: cDeck || DECK,
});

// ---------------------------------------------------------------------------
// Kapal pesiar — lambung loft 6 stasiun, 3 dek, cerobong, sekoci, kolam.
// ---------------------------------------------------------------------------
export function drawCruiseShip(B, G, cx, cz, yaw, len, wid) {
  const { P, D } = frame(cx, cz, yaw);
  const L = len, W = wid;
  const hull = [
    st(L, W, -0.50, 0.30, 0.16, 0.10, 1.50),
    st(L, W, -0.30, 0.50, 0.40, 0.00, 1.60),
    st(L, W, 0.00, 0.50, 0.43, 0.00, 1.65),
    st(L, W, +0.25, 0.50, 0.43, 0.00, 1.75),
    st(L, W, +0.40, 0.36, 0.28, 0.08, 1.95),
    st(L, W, +0.50, 0.00, 0.00, 0.40, 2.40),
  ];
  loft(B, P, D, hull);
  for (const s of [1, -1]) stripe(B, P, D, hull, s, 0.22, 0.18, TEAL, M.paint);
  winRow(B, P, D, hull, 1.08, -0.38 * L, +0.22 * L, 1.7, 0.34, 0.34, 0); // porthole lambung (tengah saja — haluan/buritan melengkung)
  // Dek 1 (utama) + anjungan miring, Dek 2, Dek 3 — makin sempit ke atas.
  const d1 = [
    st(L, W, -0.36, 0.44, 0.44, 1.60, 2.95, WHITE, WHITE, WHITE),
    st(L, W, +0.26, 0.44, 0.44, 1.65, 2.95, WHITE, WHITE, WHITE),
    st(L, W, +0.36, 0.42, 0.42, 1.70, 2.55, WHITE, WHITE, WHITE),
    st(L, W, +0.40, 0.38, 0.38, 1.72, 2.30, WHITE, WHITE, WHITE),
  ];
  loft(B, P, D, d1);
  const d2 = [
    st(L, W, -0.28, 0.37, 0.37, 2.95, 4.05, WHITE, WHITE, WHITE),
    st(L, W, +0.20, 0.37, 0.37, 2.95, 4.05, WHITE, WHITE, WHITE),
    st(L, W, +0.24, 0.33, 0.33, 2.95, 3.80, WHITE, WHITE, WHITE),
  ];
  loft(B, P, D, d2);
  const d3 = [
    st(L, W, -0.20, 0.29, 0.29, 4.05, 5.00, WHITE, WHITE, WHITE),
    st(L, W, +0.12, 0.29, 0.29, 4.05, 5.00, WHITE, WHITE, WHITE),
    st(L, W, +0.16, 0.25, 0.25, 4.05, 4.75, WHITE, WHITE, WHITE),
  ];
  loft(B, P, D, d3);
  winRow(B, P, D, d1, 2.45, -0.33 * L, +0.22 * L, 1.05, 0.55, 0.50, 5);
  winRow(B, P, D, d2, 3.55, -0.25 * L, +0.17 * L, 1.05, 0.55, 0.50, 5);
  winRow(B, P, D, d3, 4.55, -0.17 * L, +0.09 * L, 1.05, 0.55, 0.45, 4);
  // Kaca depan anjungan (miring mengikuti atap dek 1).
  quadAuto(B, P(-0.36 * W, 2.32, +0.40 * L), P(0.36 * W, 2.32, +0.40 * L),
    P(0.34 * W, 2.53, +0.36 * L), P(-0.34 * W, 2.53, +0.36 * L), GLASS, M.glass, D(0, 0.75, 0.66));
  // Sayap anjungan (bridge wings) kiri-kanan.
  for (const s of [1, -1]) {
    const w = P(s * 0.47 * W, 2.55, +0.30 * L);
    boxR(B, w[0], w[1], w[2], 0.5, 0.22, 1.4, yaw, 0, WHITE, M.matte);
  }
  // Cerobong: putih + pita teal, miring ke buritan.
  frustum(B, P, D, -0.08 * L, 5.00, 6.25, 1.05, 1.50, 0.87, 1.20, 0, -0.36, WHITE, M.matte, false);
  frustum(B, P, D, -0.08 * L, 6.25, 6.90, 0.87, 1.20, 0.78, 1.05, -0.36, -0.55, TEAL, M.paint, true);
  // Tiang radar + kubah di atap dek 3; kolam renang di atap dek 3.
  const m0 = P(0, 5.75, +0.10 * L);
  boxR(B, m0[0], m0[1], m0[2], 0.16, 1.5, 0.16, yaw, 0, WHITE, M.matte);
  const m1 = P(0, 6.45, +0.10 * L);
  boxR(B, m1[0], m1[1], m1[2], 1.3, 0.10, 0.28, yaw, 0, WHITE, M.matte);
  const m2 = P(0, 5.20, -0.02 * L);
  boxR(B, m2[0], m2[1], m2[2], 0.5, 0.4, 0.5, yaw, 0, WHITE, M.matte);
  quadAuto(B, P(-1.0, 5.03, -0.08 * L - 1.3), P(1.0, 5.03, -0.08 * L - 1.3),
    P(1.0, 5.03, -0.08 * L + 1.3), P(-1.0, 5.03, -0.08 * L + 1.3), POOL, M.matte, [0, 1, 0]);
  // Tiang haluan + bendera merah kecil.
  const b0 = P(0, 2.90, +0.44 * L);
  boxR(B, b0[0], b0[1], b0[2], 0.12, 1.1, 0.12, yaw, 0, WHITE, M.matte);
  quadAuto(B, P(0.06, 3.20, +0.44 * L), P(0.06, 3.20, +0.40 * L),
    P(0.06, 3.50, +0.40 * L), P(0.06, 3.50, +0.44 * L), RED, M.matte, D(1, 0, 0));
  // Sekoci oranye-putih (3 per sisi, menggantung di sisi dek 1).
  for (const s of [1, -1]) {
    for (const zf of [-0.22, -0.02, +0.18]) {
      const c = P(s * 3.02, 2.55, zf * L);
      boxR(B, c[0], c[1], c[2], 0.55, 0.42, 1.7, yaw, 0, WHITE, M.matte);
      const t = P(s * 3.02, 2.80, zf * L);
      boxR(B, t[0], t[1], t[2], 0.57, 0.12, 1.7, yaw, 0, ORANGE, M.matte);
    }
  }
  // Bayangan kontak lembut di air (elips mat 9 — di-split ke bucket SH).
  flatYaw(G, cx, 0.05, cz, yaw, W + 0.8, L + 0.8, [0, 0, 0], M.shadow);
}

// ---------------------------------------------------------------------------
// Yacht besar — lambung loft kecil, 1 deckhouse + flybridge, tiang radar.
// ---------------------------------------------------------------------------
export function drawYacht(B, G, cx, cz, yaw, len, wid) {
  const { P, D } = frame(cx, cz, yaw);
  const L = len, W = wid;
  const hull = [
    st(L, W, -0.50, 0.26, 0.14, 0.08, 1.15),
    st(L, W, -0.28, 0.50, 0.38, 0.00, 1.20),
    st(L, W, 0.00, 0.50, 0.42, 0.00, 1.25),
    st(L, W, +0.28, 0.46, 0.38, 0.00, 1.35),
    st(L, W, +0.42, 0.28, 0.20, 0.06, 1.50),
    st(L, W, +0.50, 0.00, 0.00, 0.30, 1.85),
  ];
  loft(B, P, D, hull);
  for (const s of [1, -1]) stripe(B, P, D, hull, s, 0.20, 0.16, TEAL, M.paint);
  winRow(B, P, D, hull, 0.85, -0.30 * L, +0.20 * L, 1.4, 0.30, 0.30, 0);
  const house = [
    st(L, W, -0.22, 0.34, 0.34, 1.20, 2.15, WHITE, WHITE, WHITE),
    st(L, W, +0.20, 0.34, 0.34, 1.25, 2.15, WHITE, WHITE, WHITE),
    st(L, W, +0.28, 0.30, 0.30, 1.28, 1.85, WHITE, WHITE, WHITE),
  ];
  loft(B, P, D, house);
  winRow(B, P, D, house, 1.75, -0.18 * L, +0.15 * L, 0.95, 0.50, 0.45, 0);
  // Kaca depan deckhouse (miring).
  quadAuto(B, P(-0.28 * W, 1.87, +0.28 * L), P(0.28 * W, 1.87, +0.28 * L),
    P(0.26 * W, 2.13, +0.20 * L), P(-0.26 * W, 2.13, +0.20 * L), GLASS, M.glass, D(0, 0.75, 0.66));
  // Tiang radar di atap deckhouse + platform renang di buritan.
  const m0 = P(0, 2.85, -0.10 * L);
  boxR(B, m0[0], m0[1], m0[2], 0.12, 1.4, 0.12, yaw, 0, WHITE, M.matte);
  const m1 = P(0, 3.50, -0.10 * L);
  boxR(B, m1[0], m1[1], m1[2], 0.9, 0.08, 0.22, yaw, 0, WHITE, M.matte);
  const p0 = P(0, 0.32, -0.53 * L);
  boxR(B, p0[0], p0[1], p0[2], 0.62 * W, 0.14, 0.7, yaw, 0, WHITE, M.matte);
  flatYaw(G, cx, 0.05, cz, yaw, W + 0.8, L + 0.8, [0, 0, 0], M.shadow);
}

// ---------------------------------------------------------------------------
// Hook yang dipanggil webgl2.js (1 baris) — kedua kapal statis.
// ---------------------------------------------------------------------------
export function drawCruiseShips(OP, GL) {
  // Kapal pesiar GEDE bersandar di dermaga pelabuhan, haluan ke utara
  // (game 2480,680 — sisi barat di garis air x=2448).
  drawCruiseShip(OP, GL, 248.0, 68.0, Math.PI, 26, 6.4);
  // Yacht besar berlabuh di teluk selatan dermaga (game 2530,1750).
  drawYacht(OP, GL, 253.0, 175.0, Math.PI, 11, 3.4);
}
