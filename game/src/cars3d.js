// cars3d.js — Neon Harbor: model mobil 3D prosedural untuk WebGL2
// Track MOBIL-REALISTIS (instruksi Juna 12:47 WIB: mobil terus dikembangkan
// sampai serealistis mungkin). ES module, tanpa dependensi, tanpa network.
// v13 (2026-11-18): KAWAH — hz 0,80→0,92 (+15% lebar, 0 tris; A/B v13a: nyata di rect, marginal di full shot) + 2 RETAK CAT di sekitar kawah (A/B v13c: terbukti di zoom 3x, tak terlihat di full shot; +4 tris damage-only) + KAMERA damage 15% lebih dekat + target +0,5 & sedan 2,7 (staging demo v13d3 — sedan utuh, kawah ~150 px di layar) + SPOKE — kombinasi [0,88]+stripe[0,98] DITOLAK A/B (identik v12 di full shot 3/4; di macro kontras spine malah melemah 0,16→0,10) → spoke v12 DIPERTAHANKAN ([0,82]+stripe[0,98]); topik SPOKE DITUTUP. v12 (2026-11-18): KAWAH — bibir bawah DIHAPUS + bibir samping tipis/redup/pendek + tepi kawah TAK PERSEGI (sudut digeser ±0,03..0,07) + bibir atas DIPERPENDEK 72% (A/B v12b vs v12a vs v11 di crop-damage: v12a nyaris tak berubah — bingkai bertahan; v12b outline tak beraturan = terbaca 'penyok', bukan 'bingkai foto'; kedalaman TETAP 0,25; -2 tris damage-only) + SPOKE — stripe highlight tengah spoke [0,98] (A/B v12b vs v12a vs v11 di macro: v12a [0,88] marginal — lebih terang tapi datar; v12b stripe = tiap spoke punya highlight spine = terbaca LOGAM, celah gelap tetap, TIDAK jadi bunga; +40 tris, dibayar ban hi 16->14 sisi = -32 tris, hero 1526 <= 1550; A/B macro: ban 14 sisi siluetnya identik 16 di tepi bawah) + FOREGROUND wheel 3/4 — kamera lebih rendah (v12c1) DITOLAK (void makin besar) + kamera mundur/fov 44 (v12c2) DITOLAK (mobil mengecil, void tetap) — solusinya STAGING T4 (bukan modul): marka + manhole di (x 2,2-3,2, z -1,8..+0,2) demo TERBUKTI mengisi void (v12c5, 20.782 px berubah di dalam void). A/B DITOLAK: spoke [0,88] (marginal), bibir kawah v12a (tak terlihat), kamera wheel c1/c2, marka di (4,0,-2,5) v12c3 (di luar frustum). Larangan permanen tetap: flank 7, kap 11, lug besar, kawah >0,25, spoke >0,20, garis panel kuarter, macro lebih ketat.
// v14 (2026-11-18): KAWAH TETESAN — ujung runcing ke depan, ujung lebar membulat di belakang, kipas 6 segitiga, pusat digeser ke belakang (sisi lebar lebih dalam); bibir hanya 1 dash pendek di tepi atas (depan+belakang DIHAPUS); kedalaman TETAP 0,25; retak v13 + spoke v12 TIDAK disentuh. A/B vs v13, dinilai di FULL shot.
// v8 (2026-11-18): flank LEBIH DRAMATIS (tonjolan W/2+0,20 — A/B vs v7:
// siluet melengkung TERBUKTI tanpa kartun, fender/detail ikut keluar) +
// tapak samping LEBIH KONTRAS (alur 0,88, gelap 0,02, lebar 0,17, dx 0,20;
// A/B: emissive ringan DITOLAK — cincin flat 0,66 terbaca seperti trim
// menyala, bukan tapak) + kap/bagasi 9 SEGMEN (A/B: deck lebih halus,
// +48 tris/mobil, hero 1448 — masih dalam anggaran ~1400-1500) + velg
// spoke 0,16 + terang 0,88 (A/B: lebih terbaca, TIDAK jadi "bunga" v6a)
// + kawah penyok LEBIH DALAM (0,20) + dinding bawah lebih terang (0,72).
// Bayangan blur tetap di luar scope (butuh render target) — bayangan
// 6 lapis inti 0,04 dipertahankan.
// v7 (2026-11-18): sisi bodi LEBIH MENONJOL (flank 5 faset, tonjolan
// W/2+0,12 — v6 cuma +0,05, siluet tetap lurus) + tapak samping LEBIH
// TERANG (alur 0,75, dx 0,18, lebar 0,15) + lug keliling lebih terang
// (0,68) + velg spoke lebih lebar (0,14) + kaliper LEBIH BESAR/TERANG +
// penyok GEOMETRI (kawah cekung tertekuk, bukan cuma patch gelap).
// v6 (2026-11-18): sisi bodi MELENGKUNG (flank 3 faset, bukan slab datar)
// + tapak ban di DINDING SAMPING (terbaca dari belakang/chase-cam) +
// kap/bagasi 7 SEGMEN (dari 5) + velg lebih terbaca dari jauh (spoke lebih
// lebar/terang, hub lebih besar, kaliper merah terang) + trim/pita bawah
// bus/pemadam/ambulans. Bayangan blur tetap di luar scope (butuh render
// target) — bayangan 6 lapis inti 0,04 dipertahankan.
// v5 (2026-11-18): kap/bagasi 5 SEGMEN faset (bukan 3+2) + tapak ban
// LEBIH BESAR/kontras (terbaca dari chase-cam) + kerusakan DIPERKUAT
// (penyok besar + retak laba-laba 6 garis) + bayangan kontak 6 lapis,
// inti 0,045 (di bawah 0,06).
// v4 (2026-11-18): kap/bagasi MELENGKUNG (3+2 segmen faset) + mahkota bahu/
// atap + velg 5-spoke kontras (cakram gelap, spoke terang) + tapak ban
// menonjol + bayangan kontak 5 lapis fade + LOD 'mid' + opts.damage.
// v3 (2026-11-18): fender membulat + tapak ban + kaca belakang lebih besar +
// bevel bahu + garis pinggang + cat lebih kontras + bayangan kontak oktagon.
// v2: roda bulat + velg 5-spoke, kaca material 1 + streak halus, cat 3 lapis,
// bevel 45° + plat berteks, bayangan kontak 2 lapis.
//
// KONVENSI (SAMA dengan webgl2.js T4 — supaya drop-in):
//   - Bucket: { p:[], n:[], u:[], c:[], m:[], i:[] } (posisi, normal, uv,
//     warna, material, indeks). B = bucket opaque, G = bucket glow/shadow.
//   - Material: 1 cat (Forza 3 lapis di shader) · 2 kaca (streak) ·
//     4 emissive (lampu/neon) · 5 matte · 7 glow aditif (bucket G) ·
//     9 contact shadow (bucket G).
//   - Koordinat dunia WebGL: X = game x*0.1, Z = game y*0.1, Y = atas.
//   - Mobil lokal: +Z = depan, +X = kanan. yaw = PI/2 - angle game.
//   - Geometri kit di bawah ini DUPLIKASI kecil dari webgl2.js (sengaja —
//     modul ini harus jalan sendiri di demo; salinan kanonis tetap di
//     webgl2.js, lihat INTEGRATION.md opsi B untuk menghilangkan duplikasi).
//
// REFERENSI DESAIN (bukan salinan kode/aset):
//   - gta6-01-graphics-bible/vehicles-city.md §1 (proporsi sedan, anatomi
//     belakang chase-cam, kaca, roda+arch, resep 12 kendaraan)
//   - gta6-01-graphics-bible/webgl-techniques.md §1 (cat 3 lapis, kaca
//     streak, emissive)
//   - Ukuran + warna tiap tipe: gta6-01-vehicles/vehicles.js (T1, read-only)

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
// Segitiga (kipas tutup silinder) — v2 roda bulat.
function tri(B, a, b, c, n, uvs, col, m) {
  const base = B.p.length / 3;
  push(B, a, n, uvs[0], col, m); push(B, b, n, uvs[1], col, m); push(B, c, n, uvs[2], col, m);
  B.i.push(base, base + 1, base + 2);
}
function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
// Box dengan yaw (sumbu Y) + pitch (sumbu X LOKAL, untuk kaca miring/kap).
// v16 (R26b GLASS): pitch DULU di frame lokal, baru yaw. Urutan lama
// (Rx sesudah Ry) memutar rx mengelilingi sumbu-X DUNIA: untuk yaw PI/2
// itu ROLL 30° mengelilingi sumbu-maju, bukan pitch — kaca belakang jadi
// slab miring-menyamping, hanya baji segitiga yang menyembul di atas atap.
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
// Oktagon datar (kipas 8 segitiga) — v3 bayangan kontak: tepi lebih lembut
// dari persegi panjang (STATUS-V2.md: bayangan v2 masih slab hitam keras).
function flatOct(B, x, y, z, w, d, col, m) {
  const hw = w / 2, hd = d / 2, c = [x, y, z];
  const vs = [];
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    vs.push([x + hw * Math.cos(a), y, z + hd * Math.sin(a)]);
  }
  for (let k = 0; k < 8; k += 1) tri(B, c, vs[k], vs[(k + 1) % 8], [0, 1, 0], [[0.5, 0.5], [0, 0], [1, 0]], col, m);
}
// Quad vertikal dengan normal bebas (kaca, lampu, panel, plat nomor).
function billDir(B, cx, cy, cz, w, h, nrm, col, m) {
  const r = norm(cross([0, 1, 0], nrm));
  const hw = w / 2, hh = h / 2;
  const c = (sr, sh) => [cx + r[0] * sr * hw, cy + sh * hh, cz + r[2] * sr * hw];
  quad(B, c(-1, -1), c(1, -1), c(1, 1), c(-1, 1), nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
}

// ---------------------------------------------------------------------------
// Warna util + konstanta
// ---------------------------------------------------------------------------
export function hx(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const DARK = [0.05, 0.04, 0.06];      // ban / bumper / housing lampu
const TIRE = [0.02, 0.02, 0.02];      // ban: hitam pekat (bible §1.5)
const RIM = [0.72, 0.72, 0.76];       // velg logam
const GLASS = [0.10, 0.11, 0.16];     // kaca: hampir hitam (bible §1.3)
const WHITE = [0.92, 0.92, 0.90];
const CHROME = [0.62, 0.63, 0.66];
const RED_TAIL = [1.0, 0.12, 0.15];   // lampu rem
const HEADLIGHT = [1.0, 0.9, 0.6];    // lampu depan
const RIMWARM = [1.0, 0.6, 0.3];      // rim light hangat (tepi atap)

// ---------------------------------------------------------------------------
// Spesifikasi mobil — ukuran game px × 0.1 = unit WebGL (sama seperti T1).
// bodyH = tinggi badan (tanpa roda), cabFrac = panjang kabin / panjang mobil,
// cabW = lebar kabin / lebar badan, wheelD = diameter roda.
// Proporsi: bible §1.1 (wheelbase 58–62%, tinggi 30–32% panjang sedan,
// kabin 12–15% lebih sempit) + §1.6 (resep per kendaraan).
// ---------------------------------------------------------------------------
export const CAR_SPECS = {
  hero:      { label: 'Hero Neon GT',  kind: 'sport',  len: 5.4, wid: 2.3, bodyH: 0.80, cabFrac: 0.48, cabW: 0.78, wheels: 4, wheelD: 0.62, paint: '#e33e5f', spoiler: true,  lightbar: true },
  bus:       { label: 'Bus Kota',     kind: 'bus',    len: 9.6, wid: 2.6, bodyH: 1.70, cabFrac: 0.90, cabW: 1.00, wheels: 6, wheelD: 0.70, paint: '#e8b93c', spoiler: false, lightbar: false },
  fire:      { label: 'Pemadam',      kind: 'fire',   len: 8.4, wid: 2.6, bodyH: 1.50, cabFrac: 0.50, cabW: 0.90, wheels: 4, wheelD: 0.70, paint: '#c0392b', spoiler: false, lightbar: true },
  medic:     { label: 'Ambulans',     kind: 'medic',  len: 6.2, wid: 2.4, bodyH: 1.40, cabFrac: 0.60, cabW: 0.90, wheels: 4, wheelD: 0.66, paint: '#f5f5f5', spoiler: false, lightbar: true },
  apc:       { label: 'APC Tentara',  kind: 'apc',    len: 6.8, wid: 2.6, bodyH: 1.30, cabFrac: 0.40, cabW: 0.70, wheels: 6, wheelD: 0.45, paint: '#4a5a2a', spoiler: false, lightbar: false },
  hatchback: { label: 'Hatchback',    kind: 'hatch',  len: 4.2, wid: 2.2, bodyH: 0.80, cabFrac: 0.62, cabW: 0.80, wheels: 4, wheelD: 0.58, paint: '#2e8b9e', spoiler: true,  lightbar: true },
  sedanL:    { label: 'Sedan Panjang',kind: 'sedan',  len: 5.4, wid: 2.2, bodyH: 0.80, cabFrac: 0.45, cabW: 0.78, wheels: 4, wheelD: 0.60, paint: '#7d8ea3', spoiler: false, lightbar: true },
  pickup:    { label: 'Pickup',       kind: 'pickup', len: 5.2, wid: 2.2, bodyH: 0.80, cabFrac: 0.42, cabW: 0.80, wheels: 4, wheelD: 0.60, paint: '#d97b2b', spoiler: false, lightbar: true },
  police:    { label: 'Polisi',       kind: 'sedan',  len: 4.6, wid: 2.2, bodyH: 0.80, cabFrac: 0.50, cabW: 0.78, wheels: 4, wheelD: 0.60, paint: '#141c3c', spoiler: false, lightbar: true, police: true },
};
export function carSpec(type) { return CAR_SPECS[type] || CAR_SPECS.hero; }

// ---------------------------------------------------------------------------
// drawCarRealistic(B, G, type, cx, cz, yaw, len, wid, paint, opts)
//   B, G  : bucket opaque + glow/shadow (format webgl2.js)
//   type  : kunci CAR_SPECS ('hero','bus','fire','medic','apc','hatchback',
//           'sedanL','pickup','police','sedan')
//   cx,cz : pusat mobil (unit WebGL), yaw = PI/2 - angle game
//   len,wid: panjang/lebar unit (kosongkan = pakai spec)
//   paint : [r,g,b] atau '#rrggbb' (kosongkan = warna spec)
//   opts  : { brake:boolean, t:number (waktu — strobo), police:boolean,
//           detail:'low'|'mid' (LOD), damage:boolean (penyok + kaca retak) }
//   Return: jumlah segitiga yang ditambahkan.
// ---------------------------------------------------------------------------
export function drawCarRealistic(B, G, type, cx, cz, yaw, len, wid, paint, opts) {
  const spec = carSpec(type);
  const tri0 = (B.i.length + G.i.length) / 3;
  const L = len || spec.len, W = wid || spec.wid;
  const col = Array.isArray(paint) ? paint : paint ? hx(paint) : hx(spec.paint);
  // Nada cat v2 (cat 3 lapis TERBACA): badan bawah lebih gelap (pantulan
  // tanah), pita atap lebih terang (clear-coat kena matahari).
  // v3: kontras diperkuat (×0,66 / ×1,35) — batch 5: flop sisi matahari
  // masih tipis, flank masih satu warna datar di sebagian besar bodi.
  const paintDark = col.map((c) => c * 0.66);
  const paintLight = col.map((c) => Math.min(1, c * 1.35 + 0.06));
  const o = opts || {};
  const blink = Math.floor((o.t || 0) * 6) % 2 === 0;
  const fwd = [Math.sin(yaw), Math.cos(yaw)];
  const rgt = [Math.cos(yaw), -Math.sin(yaw)];
  const at = (lx, ly, lz) => [cx + rgt[0] * lx + fwd[0] * lz, ly, cz + rgt[1] * lx + fwd[1] * lz];
  // Arah lokal (dx,dy,dz) diputar yaw → dunia (untuk normal diagonal/bevel).
  const dir = (dx, dy, dz) => [rgt[0] * dx + fwd[0] * dz, dy, rgt[1] * dx + fwd[1] * dz];
  // p = box yawed (+pitch rx opsional) di koordinat lokal mobil.
  const p = (lx, ly, lz, w, h, d, c, m, rx) => {
    const q = at(lx, ly, lz);
    boxR(B, q[0], q[1], q[2], w, h, d, yaw, rx || 0, c, m);
  };
  // Quad di muka belakang (-Z lokal), depan (+Z), atau flank (±X).
  const qB = (lx, ly, lz, w, h, c, m) => {
    const q = at(lx, ly, lz);
    billDir(B, q[0], q[1], q[2], w, h, [-fwd[0], 0, -fwd[1]], c, m);
  };
  const qF = (lx, ly, lz, w, h, c, m) => {
    const q = at(lx, ly, lz);
    billDir(B, q[0], q[1], q[2], w, h, [fwd[0], 0, fwd[1]], c, m);
  };
  const qS = (lx, ly, lz, w, h, c, m) => {
    const s = lx < 0 ? -1 : 1;
    const q = at(lx, ly, lz);
    billDir(B, q[0], q[1], q[2], w, h, [rgt[0] * s, 0, rgt[1] * s], c, m);
  };
  const qGlowB = (lx, ly, lz, w, h, c) => {
    const q = at(lx, ly, lz);
    billDir(G, q[0], q[1], q[2], w, h, [-fwd[0], 0, -fwd[1]], c, 7);
  };
  // ---- KACA v2: streak HALUS (bukan zebra shader) + bingkai karet ----
  // Material 2 (kaca) di shader T4 memakai streak ruang-layar yang berulang
  // tiap ~83 px → di kaca besar terbaca seperti garis zebra. v2: kaca pakai
  // material 1 (glossy gelap, Fresnel halus) + 1–2 pita diagonal geometri
  // (material 4, warna langit pucat) + bingkai karet gelap di belakang kaca.
  // glassPt: titik (u,v,w) di bidang kaca miring rx → dunia.
  const glassPt = (lx, ly, lz, u, v, w, rx) => {
    const y2 = v * Math.cos(rx) - w * Math.sin(rx);
    const z2 = v * Math.sin(rx) + w * Math.cos(rx);
    return at(lx + u, ly + y2, lz + z2);
  };
  // Pita diagonal (sudut 20°) di muka kaca: jajaran genjang di bidang kaca.
  // w = panjang pita, h = lebar pita, face = -1 belakang / +1 depan,
  // (du,dv) = geser pusat pita di bidang kaca. w/h HARUS muat di kaca
  // (v: w/2*sin20° + h/2*cos20° < setengah tinggi kaca).
  const glassStreak = (lx, ly, lz, w, h, rx, face, col, du, dv) => {
    const a = (20 * Math.PI) / 180, d = [Math.cos(a), Math.sin(a)], n = [-Math.sin(a), Math.cos(a)];
    const hl = w / 2, hw = h / 2, ou = du || 0, ov = dv || 0;
    const corners = [];
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const u = ou + su * hl * d[0] + sv * hw * n[0];
      const v = ov + su * hl * d[1] + sv * hw * n[1];
      corners.push(glassPt(lx, ly, lz, u, v, face * 0.045, rx));
    }
    const nrm = dir(0, -face * Math.sin(rx), face * Math.cos(rx));
    quad(B, corners[0], corners[1], corners[2], corners[3], nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], col, 4);
  };
  // v15c: pantulan langit + border — HARUS sebidang muka kaca boxR
  // (faceQuad memakai rot boxR yg sama). v16: diagnosis "menyilang" itu
  // ternyata urutan rotasi boxR (roll, bukan pitch) — kini diperbaiki.
  // Lapisan (eps dari muka kaca): langit 0.006, border 0.009.
  const faceQuad = (lx, ly, lz, x0, x1, y0, y1, hz, rx, eps, col, m) => {
    const q = at(lx, ly, lz); // pusat kotak (dunia)
    const cy2 = Math.cos(yaw), sy2 = Math.sin(yaw), cx2 = Math.cos(rx), sx2 = Math.sin(rx);
    // v16 (R26b GLASS): rotasi sama seperti boxR v16 — pitch lokal dulu,
    // baru yaw. Urutan lama = roll (lihat boxR); quad langit/border harus
    // sebidang dengan muka kaca boxR yang sudah diperbaiki.
    const rot = (x, y, z) => {
      const y1 = y * cx2 - z * sx2, z1 = y * sx2 + z * cx2;
      const a = x * cy2 + z1 * sy2, b = -x * sy2 + z1 * cy2;
      return [q[0] + a, q[1] + y1, q[2] + b];
    };
    // Normal muka belakang (0,0,-1) sesudah rot (arah ke kamera).
    const nx = -cx2 * sy2, ny = sx2, nz = -cx2 * cy2;
    const nl = Math.hypot(nx, ny, nz) || 1;
    const n = [nx / nl, ny / nl, nz / nl];
    const pt = (x, y) => {
      const p = rot(x, y, -hz);
      return [p[0] + n[0] * eps, p[1] + n[1] * eps, p[2] + n[2] * eps];
    };
    quad(B, pt(x0, y0), pt(x1, y0), pt(x1, y1), pt(x0, y1), n, [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
  };
  // Gradasi langit 3 pita di muka kaca miring (belakang saja).
  const skyGlass = (lx, ly, lz, w, h, rx) => {
    const hw = w / 2, hh = h / 2;
    faceQuad(lx, ly, lz, -hw, hw, hh * 0.35, hh, 0.035, rx, 0.006, [0.36, 0.42, 0.56], 4);
    faceQuad(lx, ly, lz, -hw, hw, -hh * 0.35, hh * 0.35, 0.035, rx, 0.006, [0.28, 0.33, 0.46], 4);
    faceQuad(lx, ly, lz, -hw, hw, -hh, -hh * 0.35, 0.035, rx, 0.006, [0.20, 0.24, 0.36], 4);
  };
  // Border karet tipis (0.04) — sisi + bawah saja (tanpa strip atas).
  // v15d: strip sisi DIPENDEK (ujung atas hh*0.7) supaya tak menjulur di atas atap.
  const glassBorder = (lx, ly, lz, w, h, rx) => {
    const hw = w / 2, hh = h / 2, b = 0.04;
    faceQuad(lx, ly, lz, -hw - b, hw + b, -hh - b, -hh, 0.035, rx, 0.009, DARK, 5); // bawah
    faceQuad(lx, ly, lz, -hw - b, -hw, -hh, hh * 0.7, 0.035, rx, 0.009, DARK, 5); // kiri (v15d: pendek)
    faceQuad(lx, ly, lz, hw, hw + b, -hh, hh * 0.7, 0.035, rx, 0.009, DARK, 5); // kanan (v15d: pendek)
  };
  // Kaca tegak (rx=0): bingkai (kotak lebih besar, 0.02 ke dalam) + kaca
  // material 1 + streak diagonal. face = -1 belakang / +1 depan.
  const flatGlass = (lx, ly, lz, w, h, face) => {
    p(lx, ly, lz - face * 0.02, w + 0.08, h + 0.08, 0.05, DARK, 5); // bingkai karet
    p(lx, ly, lz, w, h, 0.06, GLASS, 1); // kaca glossy (bukan material 2)
    glassStreak(lx, ly, lz, w * 0.6, 0.12, 0, face, [0.22, 0.28, 0.38], 0, 0.05);
  };
  // Bevel belakang: talang 45° antara muka belakang dan deck (normal diagonal
  // → shader memberi gradasi; bodi tidak lagi siku 90° di tepi atas belakang).
  const rearBevel = (bodyTop, w) => {
    const nrm = dir(0, 0.707, -0.707);
    quad(B, at(-w / 2, bodyTop - 0.20, -L / 2 - 0.03), at(w / 2, bodyTop - 0.20, -L / 2 - 0.03),
      at(w / 2, bodyTop - 0.02, -L / 2 + 0.10), at(-w / 2, bodyTop - 0.02, -L / 2 + 0.10),
      nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], paintDark, 1);
  };
  const wheelD = spec.wheelD, wheelY = wheelD / 2;
  const axleZ = spec.wheels === 6 ? [-L * 0.33, 0, L * 0.33] : [-L * 0.33, L * 0.33];

  // Bayangan kontak v3 — oktagon (bukan persegi panjang): tepi lebih lembut.
  // DUA lapis (alasan di STATUS-V2.md): (a) elips lembut material 9 di G
  // (terlihat SETELAH T4 membelah bucket G); (b) 3 lapis nested di B
  // (material 5, terlihat SEKARANG tanpa perubahan renderer).
  // v5 — 6 lapis fade di B (bukan 5): inti 0,04 (di bawah 0,06 — batch 8)
  // + langkah warna lebih kecil supaya tidak ada cincin terlihat.
  // v5b: ukuran diperkecil (terluar W+2,2, bukan W+3,0) + opasitas diturunkan
  // — v5a bayangan masih karpet gelap 1,8× lebar mobil di shot hero.
  // y 0.02–0.08: memotong tipis bagian bawah ban, tidak terlihat dari chase-cam.
  flatOct(G, cx, 0.05, cz, W + 0.7, L + 0.9, [0, 0, 0], 9);
  flatOct(G, cx, 0.07, cz, W + 1.6, L + 1.8, [0, 0, 0], 9);
  flatOct(B, cx, 0.02, cz, W + 1.2, L + 1.5, [0.16, 0.15, 0.16], 5); // v10: halo lebih lembut (batch 13 #3 — tepi oktagon jangan terlalu tegas; ukuran tetap seperti v9c2)
  flatOct(B, cx, 0.03, cz, W + 0.95, L + 1.2, [0.14, 0.135, 0.14], 5); // v10: halo lebih lembut
  flatOct(B, cx, 0.04, cz, W + 0.7, L + 0.95, [0.095, 0.09, 0.095], 5);
  flatOct(B, cx, 0.05, cz, W + 0.5, L + 0.7, [0.08, 0.075, 0.08], 5);
  flatOct(B, cx, 0.065, cz, W + 0.32, L + 0.5, [0.068, 0.065, 0.068], 5);
  flatOct(B, cx, 0.08, cz, W + 0.15, L + 0.3, [0.058, 0.055, 0.058], 5); // v9: inti JAUH lebih kecil + lebih terang (A/B v9c2 vs v9c — v9c terlalu timid, beda tak terlihat; elips G lembut kini yang meng-grounding)

  // ---- RODA BULAT v2 (bukan kotak) — cacat #1 batch 4 ----
  // Ban: prisma N-sisi dengan sumbu lokal X (sisi = quad normal radial,
  // tutup = kipas segitiga). Velg: silinder lebih kecil + 5 jari + hub +
  // kaliper rem di belakang jari-jari. opts.detail === 'low' (LOD jauh):
  // 8 sisi, tanpa jari/kaliper/arch — tapi TETAP bulat.
  // LOD v4: 'mid' di antara high/low — ban 10-sisi + spoke + fender, tanpa
  // tapak/kaliper (hi-only). Low tetap 8-sisi, tanpa detail.
  const hi = o.detail !== 'low' && o.detail !== 'mid';
  const mid = o.detail === 'mid';
  const wheelCyl = (C, r, len, seg, colM, m, capCol) => {
    const pt = (a, dx) => [C[0] + rgt[0] * dx + fwd[0] * r * Math.sin(a), C[1] + r * Math.cos(a), C[2] + rgt[1] * dx + fwd[1] * r * Math.sin(a)];
    for (let j = 0; j < seg; j += 1) {
      const a0 = (j / seg) * Math.PI * 2, a1 = ((j + 1) / seg) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      quad(B, pt(a0, -len / 2), pt(a0, len / 2), pt(a1, len / 2), pt(a1, -len / 2),
        dir(0, Math.cos(am), Math.sin(am)), [[0, 0], [1, 0], [1, 1], [0, 1]], colM, m);
    }
    for (const s of [1, -1]) {
      const nrm = [rgt[0] * s, 0, rgt[1] * s];
      const cc = [C[0] + rgt[0] * s * len / 2, C[1], C[2] + rgt[1] * s * len / 2];
      const cCol = s > 0 && capCol ? capCol : colM;
      for (let j = 0; j < seg; j += 1) {
        const a0 = (j / seg) * Math.PI * 2, a1 = ((j + 1) / seg) * Math.PI * 2;
        if (s > 0) tri(B, cc, pt(a0, s * len / 2), pt(a1, s * len / 2), nrm, [[0.5, 0.5], [0, 0], [1, 0]], cCol, m);
        else tri(B, cc, pt(a1, s * len / 2), pt(a0, s * len / 2), nrm, [[0.5, 0.5], [1, 0], [0, 0]], cCol, m);
      }
    }
  };
  const drawWheel = (lx, lz, s) => {
    const C = at(lx, wheelY, lz);
    const r = wheelD / 2, seg = hi ? 14 : mid ? 12 : 8; // v12: hi 14 sisi (dari 16) — BAYAR stripe highlight spoke: -8 tris/ban x 4 = -32 tris. A/B macro v12b: siluet tepi bawah ban 14 vs 16 IDENTIK (12 lug tapak yang mendominasi outline); 12 sisi = stop sign (v10a) — 14 aman.
    wheelCyl(C, r, 0.26, seg, TIRE, 5, [0.07, 0.07, 0.07]); // ban + dinding samping
    const rimR = wheelD * 0.30;
    // v6 — cakram velg GELAP ([0.16]) supaya spoke TERANG terbaca di
    // atasnya (v3: cakram + spoke sama-sama RIM → spoke tak terlihat).
    wheelCyl(C, rimR, 0.32, 8, [0.07, 0.07, 0.09], 1, [0.07, 0.07, 0.09]); // v11: cakram HAMPIR HITAM (0,16 render abu-abu pucat di macro — celah antar-spoke harus gelap supaya 5 spoke terbaca terpisah)
    if (hi || mid) {
      // 5 spoke di muka luar velg (bidang x = +0.17 dari pusat roda)
      // v6: spoke LEBIH TERANG [0,92] di atas cakram gelap — batch 9: velg
      // harus lebih terbaca dari jauh. Lebar 0,12 (v6a 0,16 + [0,95]
      // terlalu lebar — velg jadi bunga pink padat di close-up) + panjang
      // 0,9×rimR supaya cakram gelap terbaca di antara spoke.
      // v7: lebar 0,12→0,14 (batch 10: velg belakang masih blob di jarak
      // lineup — 0,14 masih aman dari "bunga" v6a, dicek crop zoom).
      const dx = s * 0.17;
      for (let i = 0; i < 5; i += 1) {
        const th = Math.PI / 2 + (i * Math.PI * 2) / 5;
        const d = dir(0, Math.cos(th), Math.sin(th));
        const pp = dir(0, -Math.sin(th), Math.cos(th));
        const rc = rimR * 0.52, sl = rimR * 0.95, sw = 0.12; // v11: spoke LEBIH SEMPIT (0,12) + lebih panjang (0,95) — v10 0,20 LEBIH LEBAR dari jarak antar-spoke (0,20 > 2*0,093*sin36°=0,109 di dekat hub) sehingga 5 spoke menyatu jadi cakram pucat solid; 0,12 membuka celah gelap antar-spoke. Lebar 0,20 tetap PLAFON (jangan lebarkan lagi).
        const base = [C[0] + rgt[0] * dx + d[0] * rc, C[1] + d[1] * rc, C[2] + rgt[1] * dx + d[2] * rc];
        const mk = (sd, sp) => [base[0] + d[0] * sd * sl / 2 + pp[0] * sp * sw / 2, base[1] + d[1] * sd * sl / 2 + pp[1] * sp * sw / 2, base[2] + d[2] * sd * sl / 2 + pp[2] * sp * sw / 2];
        quad(B, mk(-1, -1), mk(1, -1), mk(1, 1), mk(-1, 1), [rgt[0] * s, 0, rgt[1] * s], [[0, 0], [1, 0], [1, 1], [0, 1]], [0.82, 0.82, 0.86], 1);
        // v12: STRIPE HIGHLIGHT tengah spoke [0,98] — garis terang tipis (22% lebar spoke, 85% panjang), 0,005 unit di depan bidang spoke (anti z-fight). Tiap spoke punya highlight spine = terbaca LOGAM; celah gelap antar-spoke tetap (TIDAK jadi bunga v6a). +2 tris/spoke x 5 x 4 roda = +40 tris, dibayar ban 14 sisi (-32) -> hero 1526 (<=1550).
        const mkH = (sd, sp) => [base[0] + rgt[0] * s * 0.005 + d[0] * sd * sl * 0.85 / 2 + pp[0] * sp * sw * 0.22 / 2, base[1] + d[1] * sd * sl * 0.85 / 2 + pp[1] * sp * sw * 0.22 / 2, base[2] + rgt[1] * s * 0.005 + d[2] * sd * sl * 0.85 / 2 + pp[2] * sp * sw * 0.22 / 2];
        quad(B, mkH(-1, -1), mkH(1, -1), mkH(1, 1), mkH(-1, 1), [rgt[0] * s, 0, rgt[1] * s], [[0, 0], [1, 0], [1, 1], [0, 1]], [0.98, 0.98, 0.98], 1);
      }
      wheelCyl(C, 0.08, 0.34, 6, CHROME, 1); // hub tengah v6 (0,07→0,08 — lebih besar/terang, pusat velg)
      // Kaliper rem v7: LEBIH BESAR (0,12×0,24×0,18 — dari 0,10×0,20×0,16)
      // + LEBIH TERANG [0,90, 0,14, 0,08] + digeser keluar (dx 0,08→0,09) —
      // batch 10: kaliper v6 cuma bintik merah kecil, hampir tak terbaca
      // tanpa crop zoom. v7a 0,14×0,28 TERLALU BESAR — jadi balok merah
      // yang menutupi velg; 0,12×0,24 jalan tengah. Hi-only, v4 LOD mid.
      if (hi) {
        const thc = -2.4;
        const cq = at(lx + s * 0.09, wheelY + Math.cos(thc) * rimR * 0.7, lz + Math.sin(thc) * rimR * 0.7);
        boxR(B, cq[0], cq[1], cq[2], 0.12, 0.24, 0.18, yaw, 0, [0.90, 0.14, 0.08], 5);
      }
      // FENDER MEMBULAT v3 (bukan kotak): pita melengkung warna bodi di atas
      // roda (±75°, 6 segmen) + cincin gelap di dalamnya sebagai celah sumur
      // roda. Ujung busur (±75°) menyentuh flank bodi — tidak mengambang.
      // v7: fxc 0,12→0,16 (tepi luar W/2+0,14) — flank v7 menonjol ke
      // W/2+0,12, fender HARUS tetap di luar flank supaya lengkung roda
      // terbaca (v6: tepi luar W/2+0,10 di atas flank W/2+0,05).
      const fxc = s * (W / 2 + 0.14), fR = r + 0.10, iR = r + 0.02; // v9: fender DIPISAH dari roda (tetap W/2+0,14, tepi luar W/2+0,22) — roda geser, fender tidak ikut
      for (let j = 0; j < 6; j += 1) {
        const a0 = (-75 + j * 25) * Math.PI / 180, a1 = (-75 + (j + 1) * 25) * Math.PI / 180;
        const am = (a0 + a1) / 2, nrm = dir(0, Math.cos(am), Math.sin(am));
        const ptF = (a, dx) => at(fxc + dx, wheelY + fR * Math.cos(a), lz + fR * Math.sin(a));
        quad(B, ptF(a0, 0.13), ptF(a0, -0.13), ptF(a1, -0.13), ptF(a1, 0.13), nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], col, 1); // v11: pita fender LEBIH TEBAL (±0,13, dari ±0,08) — di macro v10 fender terbaca seperti garis wireframe karena dilihat nyaris edge-on; 0 tris
        const ptI = (a, dx) => at(lx + s * 0.02 + dx, wheelY + iR * Math.cos(a), lz + iR * Math.sin(a));
        quad(B, ptI(a0, 0.05), ptI(a0, -0.05), ptI(a1, -0.05), ptI(a1, 0.05), nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], DARK, 5);
      }
      // TAPAK BAN v5 (hi-only): 12 lug LEBIH BESAR + kontras KUAT — v4 tapak
      // tidak terbaca di shot mana pun (batch 8). Lug kini menonjol 0,022,
      // lebar sudut 0,34 rad (dari 0,20), warna terang 0,55 vs gelap 0,04
      // (dari 0,16/0,05) — dari chase-cam, pola terang-gelap di kuadran
      // belakang-bawah ban terbaca sebagai tapak. v5b: terang dinaikkan
      // 0,42→0,55 karena shader Half-Lambert menggelapkan lug yang
      // menghadap bawah (v5a masih tenggelam di shot hero).
      // v7: lug terang 0,55→0,68 (batch 10: tapak dari belakang lurus masih
      // hilang di jarak lineup — lug keliling adalah satu-satunya tapak
      // yang menghadap kamera chase-cam).
      if (hi) for (let j = 0; j < 12; j += 1) {
        const am = ((j + 0.5) / 12) * Math.PI * 2, hw2 = 0.34;
        const lug = j % 2 === 0 ? [0.68, 0.68, 0.68] : [0.04, 0.04, 0.04];
        const lp = (a, dx) => at(lx + dx, wheelY + (r + 0.022) * Math.cos(a), lz + (r + 0.022) * Math.sin(a));
        quad(B, lp(am - hw2, 0.15), lp(am - hw2, -0.15), lp(am + hw2, -0.15), lp(am + hw2, 0.15),
          dir(0, Math.cos(am), Math.sin(am)), [[0, 0], [1, 0], [1, 1], [0, 1]], lug, 5);
      }
      // TAPAK SAMPING v6 (hi-only): 6 alur radial di DINDING SAMPING ban
      // (annulus di luar velg, di muka luar ban) — supaya tapak terbaca
      // dari BELAKANG (chase-cam lurus), bukan cuma dari close-up roda.
      // Alur terang/gelap berselang (0,60 vs 0,05); muka luar saja (s) —
      // muka dalam tertutup bodi. 2 alur atas (±30°) tertutup fender, 4
      // sisanya terlihat dari belakang/bawah (kuadran chase-cam).
      // v6b: dx 0,135→0,16 (jarak dari tutup ban 0,13 — v6a 0,005 terlalu
      // rapat, alur tenggelam/z-fight) + terang 0,45→0,60 + lebar 0,13.
      // v7: terang 0,60→0,75 + dx 0,16→0,18 (lebih menonjol dari dinding
      // ban) + lebar 0,13→0,15 — batch 10: alur v6 render abu-abu sedang
      // (normal samping menghadap jauh dari matahari), harus dicari dulu
      // di close-up; dari chase-cam lurus tetap tidak terbaca.
      if (hi) for (let j = 0; j < 6; j += 1) {
        const am = ((j * 60 + 30) * Math.PI) / 180, hw3 = 0.17;
        const gcol = j % 2 === 0 ? [0.88, 0.88, 0.88] : [0.02, 0.02, 0.02];
        const r1 = rimR * 1.12, r2 = r * 0.97;
        const gp = (a, rr) => at(lx + s * 0.20, wheelY + rr * Math.cos(a), lz + rr * Math.sin(a)); // v8: dx 0,20 — lebih menonjol dari dinding ban
        quad(B, gp(am - hw3, r1), gp(am - hw3, r2), gp(am + hw3, r2), gp(am + hw3, r1),
          [rgt[0] * s, 0, rgt[1] * s], [[0, 0], [1, 0], [1, 1], [0, 1]], gcol, 5);
      }
    }
  };
  for (const lz of axleZ) {
    for (const s of [-1, 1]) drawWheel(s * (W / 2 + 0.02), lz, s); // v9: ban +0,12 keluar (A/B v9a vs v9b — +0,16 tidak tambah apa-apa di jarak lineup, +0,12 cukup)
  }

  if (spec.kind === 'bus') return drawBus();
  if (spec.kind === 'fire') return drawFire();
  if (spec.kind === 'medic') return drawMedic();
  if (spec.kind === 'apc') return drawApc();
  return drawSedanFamily();

  // ================= BUS =================
  function drawBus() {
    const bodyBot = 0.55, bodyTop = bodyBot + spec.bodyH; // 0.55–2.25
    p(0, (bodyBot + bodyTop) / 2, 0, W, spec.bodyH, L, col, 1);            // badan = kabin
    p(0, bodyTop + 0.04, 0, W * 0.98, 0.08, L * 0.98, col, 1);             // atap
    // Jendela pita (ribbon) kedua flank + divider — bible §1.6
    for (const s of [-1, 1]) {
      p(s * (W / 2 + 0.01), 1.75, 0, 0.05, 0.65, L * 0.82, GLASS, 1); // pita jendela (v2: material 1)
      for (let i = 1; i < 8; i += 1) {
        p(s * (W / 2 + 0.03), 1.75, -L * 0.41 + (i * L * 0.82) / 8, 0.06, 0.65, 0.1, col, 1);
      }
      // pintu lipat depan (sisi kanan) + garis panel bawah
      qS(s * (W / 2 + 0.02), 1.0, L * 0.32, 0.9, 1.3, DARK, 5);
      qS(s * (W / 2 + 0.02), 0.72, 0, L * 0.8, 0.04, DARK, 5);
    }
    // Pita bawah gelap + trim terang v6 — flank bus tidak lagi satu warna datar.
    for (const s of [-1, 1]) {
      qS(s * (W / 2 + 0.01), 0.75, 0, L * 0.85, 0.3, paintDark, 1);
      qS(s * (W / 2 + 0.01), 1.45, 0, L * 0.85, 0.05, paintLight, 1);
    }
    flatGlass(0, 1.7, L / 2 + 0.01, W * 0.88, 0.85, 1);                    // kaca depan + bingkai + streak (v3: lebih besar)
    qF(0, 2.18, L / 2 + 0.03, W * 0.5, 0.18, [1.0, 0.7, 0.2], 4);         // papan tujuan
    flatGlass(0, 1.7, -L / 2 - 0.01, W * 0.8, 0.72, -1);                   // kaca belakang + bingkai + streak (v3: lebih besar)
    p(0, bodyTop + 0.14, -L * 0.2, W * 0.5, 0.18, L * 0.2, [0.6, 0.62, 0.65], 5); // AC atap
    p(0, bodyTop + 0.10, 0, W * 0.5, 0.06, L * 0.8, paintLight, 1);       // pita atap (clear-coat)
    rearBevel(bodyTop, W * 0.8);
    drawRearLights();
    drawFrontLights();
    return finish();
  }

  // ================= PEMADAM =================

  // ================= PEMADAM =================
  function drawFire() {
    const bodyBot = 0.5, bodyTop = bodyBot + spec.bodyH; // 0.5–2.0
    p(0, (bodyBot + bodyTop) / 2, 0, W, spec.bodyH, L, col, 1);            // badan merah
    p(0, bodyTop + 0.04, 0, W * 0.96, 0.08, L * 0.96, col, 1);             // atap
    // Garis putih flank + tangga atap (2 rel + 6 anak tangga) — bible §1.6
    for (const s of [-1, 1]) {
      p(s * (W / 2 + 0.01), 1.0, 0, 0.05, 0.28, L * 0.8, WHITE, 1);
      p(s * (W / 2 + 0.01), 1.6, 0, 0.05, 0.4, L * 0.7, GLASS, 1);        // jendela kabin (v2: material 1)
    }
    // Pita bawah gelap + trim terang v6 — flank pemadam tidak lagi satu warna datar.
    for (const s of [-1, 1]) {
      qS(s * (W / 2 + 0.01), 0.72, 0, L * 0.85, 0.28, paintDark, 1);
      qS(s * (W / 2 + 0.01), 1.32, 0, L * 0.85, 0.05, paintLight, 1);
    }
    for (const s of [-0.5, 0.5]) p(s, bodyTop + 0.12, 0, 0.12, 0.1, L * 0.7, [0.72, 0.74, 0.77], 1);
    for (let i = 0; i < 6; i += 1) p(-L * 0.3 + (i * L * 0.6) / 5, bodyTop + 0.12, 0, 1.0, 0.06, 0.12, [0.49, 0.51, 0.55], 1);
    flatGlass(0, 1.55, L * 0.32, W * 0.88, 0.7, 1);                       // kaca depan kabin + bingkai + streak (v3: lebih besar)
    // Light bar strobo di atap kabin (merah-biru bergantian)
    qF(-0.35, bodyTop + 0.16, L * 0.3, 0.5, 0.18, blink ? RED_TAIL : [0.35, 0.1, 0.12], blink ? 4 : 5);
    qF(0.35, bodyTop + 0.16, L * 0.3, 0.5, 0.18, blink ? [0.1, 0.15, 0.45] : [0.15, 0.3, 1.0], blink ? 5 : 4);
    // Chevron belakang (panel amber + strip gelap)
    qB(0, 0.9, -L / 2 - 0.03, W * 0.85, 0.4, [0.95, 0.77, 0.06], 5);
    for (const lx of [-W * 0.25, 0, W * 0.25]) qB(lx, 0.9, -L / 2 - 0.04, 0.12, 0.4, DARK, 5);
    p(0, bodyTop + 0.10, 0, W * 0.5, 0.06, L * 0.8, paintLight, 1);       // pita atap (clear-coat)
    rearBevel(bodyTop, W * 0.8);
    drawRearLights();
    drawFrontLights();
    return finish();
  }

  // ================= AMBULANS =================
  function drawMedic() {
    const bodyBot = 0.5, bodyTop = bodyBot + spec.bodyH; // 0.5–1.9
    p(0, (bodyBot + bodyTop) / 2, 0, W, spec.bodyH, L, col, 1);            // badan putih
    p(0, bodyTop + 0.04, 0, W * 0.96, 0.08, L * 0.96, col, 1);             // atap
    const RED = [0.75, 0.22, 0.17];
    for (const s of [-1, 1]) {
      p(s * (W / 2 + 0.01), 1.0, 0, 0.05, 0.3, L * 0.8, RED, 1);           // garis merah
      p(s * (W / 2 + 0.01), 1.55, 0, 0.05, 0.4, L * 0.6, GLASS, 1);        // jendela gelap (v2: material 1)
      // Palang merah di flank (2 kotak bersilang)
      p(s * (W / 2 + 0.03), 1.25, 0, 0.05, 0.5, 0.18, RED, 1);
      p(s * (W / 2 + 0.03), 1.25, 0, 0.05, 0.18, 0.5, RED, 1);
    }
    // Pita bawah gelap + trim terang v6 — flank ambulans tidak lagi satu warna datar.
    for (const s of [-1, 1]) {
      qS(s * (W / 2 + 0.01), 0.72, 0, L * 0.85, 0.28, paintDark, 1);
      qS(s * (W / 2 + 0.01), 1.32, 0, L * 0.85, 0.05, paintLight, 1);
    }
    // Palang merah di atap
    p(0, bodyTop + 0.09, 0, 0.18, 0.05, 0.5, RED, 1);
    p(0, bodyTop + 0.09, 0, 0.5, 0.05, 0.18, RED, 1);
    flatGlass(0, 1.5, L * 0.3, W * 0.88, 0.7, 1);                         // kaca depan + bingkai + streak (v3: lebih besar)
    p(0, bodyTop + 0.16, L * 0.25, 0.6, 0.14, 0.3, blink ? RED_TAIL : [0.48, 0.12, 0.1], blink ? 4 : 5); // strobo merah
    p(0, bodyTop + 0.10, 0, W * 0.5, 0.06, L * 0.8, paintLight, 1);       // pita atap (clear-coat)
    rearBevel(bodyTop, W * 0.8);
    drawRearLights();
    drawFrontLights();
    return finish();
  }

  // ================= APC =================
  function drawApc() {
    const OLIVE2 = [0.23, 0.27, 0.15];
    p(0, 0.55, 0, W, 0.7, L, col, 1);                                      // lambung bawah
    p(0, 1.15, 0, W * 0.8, 0.6, L * 0.9, OLIVE2, 1);                       // lambung atas (menyempit = lapis baja miring)
    p(0, 1.6, L * 0.1, W * 0.4, 0.35, L * 0.18, OLIVE2, 1);                // menara
    p(0, 1.65, L * 0.38, 0.12, 0.12, L * 0.28, DARK, 5);                   // laras
    for (const s of [-1, 1]) {
      p(s * (W / 2 + 0.01), 0.75, 0, 0.05, 0.25, L * 0.85, [0.20, 0.22, 0.12], 1); // band gelap
    }
    drawRearLights();
    drawFrontLights();
    return finish();
  }

  // ================= KELUARGA SEDAN (hero / hatchback / sedanL / pickup / polisi) =================
  function drawSedanFamily() {
    const bodyBot = 0.34, bodyTop = bodyBot + spec.bodyH; // 0.34–1.14
    const cabZ = -L * 0.05, cabH = 0.44;
    const cabY = bodyTop + 0.22; // pusat kabin
    // Badan: 3 kotak bertumpuk (bawah + bahu + kap) — bible §1.1
    // v2: kotak bawah pakai paintDark (nada gelap = pantulan tanah).
    p(0, (bodyBot + bodyTop) / 2 - 0.06, 0, W, spec.bodyH * 0.72, L, paintDark, 1);
    p(0, bodyTop - 0.08, 0, W * 0.97, 0.2, L * 0.97, col, 1);              // bahu
    // MAHKOTA BAHU v4: 2 quad membentuk V-terbalik dangkal di atas bahu
    // (punggung bodyTop+0,045, tepi bodyTop-0,005) — dari belakang, garis
    // atap bahu kini melengkung, bukan garis datar. Normal diagonal →
    // gradasi shader (pita terang di tengah).
    {
      const zA = -L * 0.42, zB = L * 0.42;
      const nL = dir(-0.35, 0.94, 0), nR = dir(0.35, 0.94, 0);
      quad(B, at(0, bodyTop + 0.045, zB), at(0, bodyTop + 0.045, zA),
        at(-W * 0.48, bodyTop - 0.005, zA), at(-W * 0.48, bodyTop - 0.005, zB),
        nL, [[0, 0], [1, 0], [1, 1], [0, 1]], paintLight, 1);
      quad(B, at(0, bodyTop + 0.045, zA), at(0, bodyTop + 0.045, zB),
        at(W * 0.48, bodyTop - 0.005, zB), at(W * 0.48, bodyTop - 0.005, zA),
        nR, [[0, 0], [1, 0], [1, 1], [0, 1]], paintLight, 1);
    }
    // FLANK MELENGKUNG v7 (bukan slab datar): 5 faset per sisi — (A1) lereng
    // atas, (A2) lereng tengah-atas, (B) vertikal di garis pinggang, (C1)
    // lereng bawah-atas, (C2) lereng bawah. Tonjolan garis pinggang
    // W/2+0,12 (v6 cuma +0,05 — siluet samping tetap lurus, flank cuma
    // terbaca sebagai shading 3 nada; batch 10 minta tonjolan >0,05 +
    // faset lebih banyak supaya LENGKUNG SILUET terbaca). Normal dihitung
    // dari geometri faset (bukan hardcode) supaya konsisten di semua W.
    // Detail sisi (gagang pintu, garis pintu, strip krom, pintu putih,
    // penyok) digeser ke W/2+0,13 supaya duduk DI ATAS faset B, bukan
    // tertimbun (v6: W/2+0,06 di atas faset B v6 di W/2+0,05).
    // Fender juga digeser keluar (fxc 0,16 — tepi luar W/2+0,14) supaya
    // lengkung roda tetap di luar flank (lihat drawWheel).
    const flankQuad = (s, ax0, ay0, ax1, ay1, col) => {
      const x0 = s * ax0, x1 = s * ax1, dx = x1 - x0, dy = ay1 - ay0;
      const nl = s > 0 ? [-dy, dx] : [dy, -dx];
      const l = Math.hypot(nl[0], nl[1]) || 1;
      const nrm = dir(nl[0] / l, nl[1] / l, 0);
      const z0 = -L * 0.44, z1 = L * 0.44;
      quad(B, at(x0, ay0, z1), at(x0, ay0, z0), at(x1, ay1, z0), at(x1, ay1, z1),
        nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], col, 1);
    };
    for (const s of [-1, 1]) {
      flankQuad(s, W * 0.485, 1.06, W / 2 + 0.14, 0.95, paintLight); // (A1) v8
      flankQuad(s, W / 2 + 0.14, 0.95, W / 2 + 0.20, 0.80, paintLight); // (A2) v8
      flankQuad(s, W / 2 + 0.20, 0.80, W / 2 + 0.20, 0.55, col); // (B) v8 — tonjolan 0,20
      flankQuad(s, W / 2 + 0.20, 0.55, W / 2 + 0.10, 0.45, paintDark); // (C1) v8
      flankQuad(s, W / 2 + 0.10, 0.45, W * 0.46, 0.34, paintDark); // (C2) v8
    }
    // KAP MELENGKUNG v6 (7 segmen, dari 5): pitch -0,02 → -0,55 progresif —
    // tiap segmen turun sedikit; dari samping garis kap kini lengkung halus,
    // dari close-up undakan lebih kecil lagi. Normal per-faset otomatis
    // dari pitch boxR (shader memberi gradasi).
    const hoodSegs = [[0.25, -0.02, -0.005], [0.2825, -0.06, -0.012], [0.315, -0.11, -0.022], [0.3475, -0.17, -0.035], [0.38, -0.24, -0.05], [0.4125, -0.32, -0.068], [0.445, -0.40, -0.088], [0.4775, -0.48, -0.11], [0.51, -0.56, -0.135]]; // v8: 9 segmen (A/B — deck lebih halus)
    for (const [zf, rx, yo] of hoodSegs) p(0, bodyTop + yo, L * zf, W * 0.88, 0.13, L * 0.07, col, 1, rx);
    if (spec.kind !== 'pickup') {
      // BAGASI MELENGKUNG v6: 7 segmen naik ke ekor (pitch +0,02 → +0,45).
      const trunkSegs = [[0.25, 0.02, -0.06], [0.2825, 0.05, -0.058], [0.315, 0.09, -0.055], [0.3475, 0.14, -0.05], [0.38, 0.20, -0.044], [0.4125, 0.26, -0.036], [0.445, 0.33, -0.027], [0.4775, 0.40, -0.017], [0.51, 0.47, -0.008]]; // v8: 9 segmen (A/B)
      for (const [zf, rx, yo] of trunkSegs) p(0, bodyTop + yo, -L * zf, W * 0.9, 0.12, L * 0.07, col, 1, rx);
    }
    // Kabin: inti cat + kaca terpisah (bukan balok kaca utuh — bible §1.3)
    p(0, cabY, cabZ, W * spec.cabW, cabH, L * spec.cabFrac, col, 1);        // inti kabin
    p(0, cabY + cabH / 2 + 0.02, cabZ, W * spec.cabW * 0.96, 0.07, L * spec.cabFrac * 0.92, col, 1); // atap
    // MAHKOTA ATAP v4: V-terbalik dangkal di atas atap kabin (punggung
    // cabY+cabH/2+0,09, tepi +0,05) — atap tidak lagi datar dari belakang.
    {
      const zA = cabZ - L * spec.cabFrac * 0.42, zB = cabZ + L * spec.cabFrac * 0.42;
      const nL = dir(-0.35, 0.94, 0), nR = dir(0.35, 0.94, 0);
      const e = W * spec.cabW * 0.44, rY = cabY + cabH / 2 + 0.09, eY = cabY + cabH / 2 + 0.05;
      quad(B, at(0, rY, zB), at(0, rY, zA), at(-e, eY, zA), at(-e, eY, zB),
        nL, [[0, 0], [1, 0], [1, 1], [0, 1]], paintLight, 1);
      quad(B, at(0, rY, zA), at(0, rY, zB), at(e, eY, zB), at(e, eY, zA),
        nR, [[0, 0], [1, 0], [1, 1], [0, 1]], paintLight, 1);
    }
    for (const s of [-1, 1]) {
      p(s * (W * spec.cabW / 2 + 0.01), cabY, cabZ, 0.05, 0.34, L * spec.cabFrac * 0.8, GLASS, 1); // kaca samping (v2: material 1, bukan 2-zebra)
    }
    // Kaca belakang MIRING 30° (rx +0.52) + kaca depan miring (rx -0.48) — bible §1.2
    // Kaca LEBIH SEMPIT dari muka kabin supaya cat membingkainya (bukan papan hitam).
    // v2: bingkai karet + kaca material 1 + streak diagonal halus (bukan zebra).
    const rearZ = cabZ - (L * spec.cabFrac) / 2 + 0.05;
    const frontZ = cabZ + (L * spec.cabFrac) / 2 - 0.02;
    if (spec.kind === 'hatch') {
      // Hatchback: kaca sampai ke ekor (atap kaca panjang)
      // v3: kaca LEBIH BESAR (0,55→0,64 tinggi, 0,78→0,86 lebar) — batch 5:
      // area kaca terlalu sempit untuk jadi ciri hero.
      glassBorder(0, cabY + 0.02, -L * 0.28, W * spec.cabW * 0.86, 0.64, 0.55); // v15: border tipis (bukan panel padat)
      p(0, cabY + 0.02, -L * 0.28, W * spec.cabW * 0.86, 0.64, 0.07, GLASS, 1, 0.55);
      skyGlass(0, cabY + 0.02, -L * 0.28, W * spec.cabW * 0.86, 0.64, 0.55); // v15: pantulan langit
      glassStreak(0, cabY + 0.02, -L * 0.28, W * spec.cabW * 0.55, 0.14, 0.55, -1, [0.22, 0.28, 0.38], 0, 0.05); // v15d: w 0.72->0.55 (top 0.363>hh 0.32, menjulur)
      glassStreak(0, cabY + 0.02, -L * 0.28, W * spec.cabW * 0.5, 0.07, 0.55, -1, [0.35, 0.42, 0.55], 0, -0.10);
    } else {
      // v3: kaca LEBIH BESAR (0,42→0,52 tinggi, 0,78→0,86 lebar) + streak
      // lebih lebar (2 pita: terang sempit + pudar lebar = gradasi langit).
      glassBorder(0, cabY - 0.01, rearZ, W * spec.cabW * 0.86, 0.46, 0.52); // v15b: border tipis; kaca dipendek (0.52->0.46) + turun 0.03: tepi atas 1.55 bersih di bawah atap (1.565), tak lagi menembus atap -> tak ada baji segitiga
      p(0, cabY - 0.01, rearZ, W * spec.cabW * 0.86, 0.46, 0.07, GLASS, 1, 0.52);
      skyGlass(0, cabY - 0.01, rearZ, W * spec.cabW * 0.86, 0.46, 0.52); // v15b: pantulan langit
      glassStreak(0, cabY - 0.01, rearZ, W * spec.cabW * 0.42, 0.12, 0.52, -1, [0.22, 0.28, 0.38], 0, 0.0); // v15d: w 0.50->0.42, h 0.14->0.12, dv 0.05->0 (top 0.269>hh 0.23, menjulur di atas kaca/atap)
      glassStreak(0, cabY - 0.01, rearZ, W * spec.cabW * 0.42, 0.06, 0.52, -1, [0.35, 0.42, 0.55], 0, -0.04); // v15d: w 0.5->0.42, h 0.08->0.06, dv -0.10->-0.04 (bawah -0.291<-hh, menjulur)
    }
    p(0, cabY + 0.02, frontZ - 0.02, W * spec.cabW * 0.82, 0.46, 0.05, DARK, 5, -0.48); // bingkai
    p(0, cabY + 0.02, frontZ, W * spec.cabW * 0.78, 0.42, 0.07, GLASS, 1, -0.48);
    glassStreak(0, cabY + 0.02, frontZ, W * spec.cabW * 0.6, 0.12, -0.48, 1, [0.22, 0.28, 0.38], 0, 0.05);
    // Pita atap (clear-coat) + bevel belakang — cat 3 lapis TERBACA (v2).
    // v3: pita dilebarkan (0,42→0,50 lebar kabin) supaya terbaca dari jauh.
    p(0, cabY + cabH / 2 + 0.06, cabZ, W * spec.cabW * 0.50, 0.05, L * spec.cabFrac * 0.7, paintLight, 1);
    rearBevel(bodyTop, W * 0.88);
    // BEVEL BAHU v3: talang 45° di tepi atas kabin (normal diagonal → gradasi
    // shader; sisi kabin tidak lagi siku 90° ke atap) + garis pinggang
    // (panel line) di flank — batch 5: sisi masih slab datar.
    for (const s of [-1, 1]) {
      const nrm = dir(s * 0.707, 0.707, 0);
      const x0 = s * W * spec.cabW / 2, x1 = s * W * spec.cabW * 0.44;
      const y0 = cabY + 0.06, y1 = cabY + 0.26;
      const z0 = cabZ - L * spec.cabFrac * 0.45, z1 = cabZ + L * spec.cabFrac * 0.45;
      const cs = s > 0
        ? [at(x0, y0, z1), at(x0, y0, z0), at(x1, y1, z0), at(x1, y1, z1)]
        : [at(x0, y0, z0), at(x0, y0, z1), at(x1, y1, z1), at(x1, y1, z0)];
      quad(B, cs[0], cs[1], cs[2], cs[3], nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], paintLight, 1);
      if (hi) qS(s * (W / 2 + 0.21), 0.98, 0, L * 0.85, 0.03, DARK, 5); // garis pinggang (v7: di atas faset B v7)
    }
    // Rim light hangat di tepi belakang atap (jurus GTA V — bible §1.2 butir 8)
    if (hi) p(0, cabY + cabH / 2 + 0.05, rearZ + 0.06, W * spec.cabW * 0.78, 0.04, 0.04, [0.9, 0.55, 0.28], 4);
    // ---- detail kecil (bible §1.7): spion, gagang pintu, panel line, antena ----
    for (const s of [-1, 1]) {
      p(s * (W / 2 + 0.10), bodyTop + 0.08, L * 0.12, 0.12, 0.1, 0.22, col, 1); // spion
      if (hi) {
        // v7: digeser ke W/2+0,13 — duduk di faset flank B v7 (bukan tertimbun).
        qS(s * (W / 2 + 0.21), 0.82, L * 0.08, 0.3, 0.045, DARK, 5);               // gagang pintu depan
        qS(s * (W / 2 + 0.21), 0.82, -L * 0.08, 0.3, 0.045, DARK, 5);              // gagang pintu belakang
        qS(s * (W / 2 + 0.21), 0.72, -L * 0.05, 0.05, 0.5, DARK, 5);               // garis pintu belakang
        qS(s * (W / 2 + 0.21), 0.72, L * 0.18, 0.05, 0.5, DARK, 5);                // garis pintu depan
        // (v11c3: garis panel kuarter belakang DITOLAK — di macro 0,05 lebar × 0,5 tinggi = pilar hitam 30×330 px di tengah frame; detail apa pun setinggi itu tidak bisa subtil di jarak macro. Dinding di atas roda diisi tutup tangki saja; macro jadi shot bukti, bukan gambar final.)
        if (s > 0) { // tutup tangki — sisi kanan saja (v11: isi dinding merah kosong di shot macro roda; 6 tris)
          const fx2 = s * (W / 2 + 0.215), fy = 0.88, fz = -L * 0.26, fr2 = 0.09;
          for (let k = 0; k < 6; k += 1) {
            const a0 = (k / 6) * Math.PI * 2, a1 = ((k + 1) / 6) * Math.PI * 2;
            const fc = at(fx2, fy, fz);
            const fp = (a) => at(fx2, fy + fr2 * Math.cos(a), fz + fr2 * Math.sin(a));
            let n2 = norm(cross([fp(a0)[0] - fc[0], fp(a0)[1] - fc[1], fp(a0)[2] - fc[2]], [fp(a1)[0] - fc[0], fp(a1)[1] - fc[1], fp(a1)[2] - fc[2]]));
            let b2 = fp(a0), c2 = fp(a1);
            if (n2[0] * s < 0) { const t = b2; b2 = c2; c2 = t; n2 = [-n2[0], -n2[1], -n2[2]]; }
            tri(B, fc, b2, c2, n2, [[0.5, 0.5], [0, 0], [1, 0]], [0.10, 0.10, 0.12], 5);
          }
        }
      }
    }
    if (hi) p(0, cabY + cabH / 2 + 0.16, -L * 0.18, 0.05, 0.22, 0.05, DARK, 5);          // antena
    // ---- belakang (bible §1.2): light bar + bumper + knalpot + plat + garis bagasi ----
    drawRearLights();
    qB(0, bodyTop - 0.12, -L / 2 - 0.03, W * 0.8, 0.04, DARK, 5);                // garis bagasi
    if (spec.kind === 'pickup') drawPickupBed(bodyTop);
    if (spec.spoiler) {
      p(0, bodyTop + 0.02, -L * 0.47, W * 0.85, 0.07, 0.4, DARK, 5);             // spoiler
      if (hi) {
        p(0, bodyTop + 0.06, -L * 0.47, W * 0.8, 0.04, 0.05, RIMWARM, 4);        // rim di spoiler
        for (const s of [-1, 1]) p(s * W * 0.3, bodyTop - 0.04, -L * 0.47, 0.08, 0.12, 0.1, DARK, 5);
      }
    }
    if (hi && spec.kind === 'sedan') {
      for (const s of [-1, 1]) p(s * (W / 2 + 0.21), 0.78, 0, 0.06, 0.06, L * 0.8, CHROME, 1); // strip krom flank (v8: 0,21 — di atas faset B 0,20)
    }
    if (spec.police || o.police) {
      for (const s of [-1, 1]) p(s * (W / 2 + 0.21), 0.72, 0, 0.06, 0.4, L * 0.5, WHITE, 1); // pintu putih (v8: 0,21)
      qF(-0.35, cabY + cabH / 2 + 0.12, cabZ, 0.5, 0.18, blink ? RED_TAIL : [0.35, 0.1, 0.12], blink ? 4 : 5);
      qF(0.35, cabY + cabH / 2 + 0.12, cabZ, 0.5, 0.18, blink ? [0.1, 0.15, 0.45] : [0.15, 0.3, 1.0], blink ? 5 : 4);
      qGlowB(0, cabY + cabH / 2 + 0.12, cabZ + 0.2, 1.3, 0.45, [0.7, 0.2, 0.6]);
    }
    // ---- kerusakan/penyok + kaca retak v5 (opts.damage) ----
    // Untuk mobil parkir tua / mobil misi — BUKAN untuk hero utama.
    // v5 DIPERKUAT (batch 8: v4 tidak terbaca): penyok LEBIH BESAR (0,9×0,45
    // + highlight tebal + penyok kedua di kuarter belakang + garis lipatan),
    // retak LABA-LABA 6 garis (dari 3) — lebih panjang, lebih terang
    // (0,9), lebih lebar (0,014) — harus terbaca di close-up khusus.
    // v7 — PENYOK GEOMETRI (batch 10: patch gelap + lipatan masih bisa
    // dibaca sebagai noda): kawah cekung yang benar-benar TERTEKUK ke
    // dalam — pusat 0,09 unit lebih dalam dari permukaan flank (bibir di
    // W/2+0,13, pusat di W/2+0,03). 4 segitiga dengan normal miring →
    // shader memberi shading lekuk: dinding ATAS kawah menghadap bawah
    // (gelap), dinding BAWAH menghadap atas (terang, menangkap langit) —
    // persis seperti lekuk bodi asli. Plus highlight di dasar kawah.
    function drawDamage() {
      // triOut: segitiga dengan normal menghadap ke LUAR flank kiri (-x).
      // Normal geometri dihitung dari winding; kalau menghadap +x (ke
      // dalam bodi), winding dibalik.
      const triOut = (a, b, c, col) => {
        let n = norm(cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
        if (n[0] > 0) { const t = b; b = c; c = t; n = [-n[0], -n[1], -n[2]]; }
        tri(B, a, b, c, n, [[0, 0], [1, 0], [0.5, 1]], col, 5);
      };
      const dxR = -(W / 2 + 0.21), dxC = -(W / 2 - 0.04); // v9: kedalaman 0,25 (A/B — pusat 0,04 di dalam muka kotak bodi, dinding lebih curam = shading lebih dramatis)
      const cy = 0.78, cz = -L * 0.05, hy = 0.34, hz = 0.92; // v14: KAWAH TETESAN (AD batch 17: bentuk diubah, SATU KALI TERAKHIR) — outline BUKAN persegi: ujung runcing ke depan (+z), ujung lebar membulat di belakang, 6 titik rim → kipas 6 segitiga (+2 tris damage-only). Pusat digeser ke belakang (cz-0,30) = sisi lebar LEBIH DALAM (dinding belakang pendek/curam, dinding depan panjang/landai). Batas v13 dipertahankan: depan z=+0,71, belakang z=-1,09, atas y=1,11, bawah y=0,48. Kedalaman TETAP 0,25 (plafon final, jangan diulang). Penilaian HANYA di full shot.
      // Rim tetesan (dy, dz) dari (cy, cz), urutan mengelilingi outline — poligon sederhana, tanpa sisi sejajar = tidak bisa dibaca sebagai jendela/panel.
      const rimPts = [[0.00, 0.92], [0.28, 0.60], [0.33, -0.25], [0.08, -0.88], [-0.30, -0.55], [-0.26, 0.40]];
      const rimAt = (p) => at(dxR, cy + p[0], cz + p[1]);
      const ctr = at(dxC, cy - 0.02, cz - 0.30);
      const wallCol = (a, b) => { const m = (a[0] + b[0]) / 2; return m > 0.08 ? [0.04, 0.035, 0.04] : m < -0.08 ? [0.30, 0.26, 0.28] : [0.12, 0.10, 0.11]; };
      for (let i = 0; i < rimPts.length; i += 1) { const a = rimPts[i], b = rimPts[(i + 1) % rimPts.length]; triOut(rimAt(a), rimAt(b), ctr, wallCol(a, b)); }
      // BIBIR KAWAH v14 — bukan bingkai: hanya 1 dash pendek di sepanjang tepi atas (bukan strip selebar kawah). Bibir DEPAN + BELAKANG DIHAPUS (ujung meruncing tidak perlu bibir; ujung belakang membulat, bibir vertikal berisiko jadi goresan acak). Top lip [0,92] tetap ada (1 quad = 4 vertex, regression v11 terpenuhi). -4 tris lip vs v13.
      const dxLip = -(W / 2 + 0.235), lipN = dir(-1, 0, 0);
      const lip = (lx, ly, lz, w, h, c) => { const q = at(lx, ly, lz); billDir(B, q[0], q[1], q[2], w, h, lipN, c, 5); };
      lip(dxLip, cy + hy, cz - 0.05, 0.45, 0.05, [0.92, 0.88, 0.85]); // bibir ATAS v14 — DIPERPENDEK (0,45, bukan 1,37): dash terang menempel tepi atas, bukan strip selebar kawah
      // Penyok kedua (kuarter belakang) — tetap patch + highlight (sekunder).
      // v7b: digeser ke -L*0,36 (dari -L*0,30) — v7a terlalu dekat kawah utama, keduanya menyatu jadi satu noda di frame.
      qS(-(W / 2 + 0.21), 0.80, -L * 0.36, 0.5, 0.3, [0.09, 0.07, 0.08], 5);
      qS(-(W / 2 + 0.22), 0.80, -L * 0.36, 0.35, 0.18, [0.24, 0.19, 0.20], 5);
      // v13: RETAK CAT di sekitar kawah — 2 garis tipis gelap merambat dari
      // bibir kawah (A/B v13c vs v12: terbukti ada di zoom 3x, 321 px berubah di rect kawah — TAPI tak terlihat di full shot (garis 2-3 px di flank gelap). DITERIMA sebagai detail crop-level, bukan penentu skor.
      // patch). Retak cat memang menyeberang garis panel (realistis). Quad tipis
      // di bidang flank (normal -x via dir), dx = W/2+0,215 (di luar garis pintu
      // 0,21, di dalam bibir 0,235 — tanpa z-fight). +4 tris damage-only.
      const flankCrack = (y0, z0, y1, z1) => {
        const dy = y1 - y0, dz = z1 - z0, l = Math.hypot(dy, dz) || 1;
        const py = -dz / l * 0.018, pz = dy / l * 0.018; // lebar 0,036 tegak lurus arah retak
        const dx = -(W / 2 + 0.215);
        quad(B, at(dx, y0 - py, z0 - pz), at(dx, y1 - py, z1 - pz), at(dx, y1 + py, z1 + pz), at(dx, y0 + py, z0 + pz), dir(-1, 0, 0), [[0, 0], [1, 0], [1, 1], [0, 1]], [0.10, 0.09, 0.10], 5);
      };
      flankCrack(1.04, 0.42, 1.10, 0.78); // retak 1: dari bibir atas kawah merambat ke depan-atas
      flankCrack(0.50, -0.92, 0.44, -1.22); // retak 2: dari bibir bawah-belakang merambat ke belakang-bawah (berhenti sebelum penyok kuarter -1,26)
      const crack = (du, dv) => {
        const l = Math.hypot(du, dv) || 1, pu = -dv / l * 0.014, pv = du / l * 0.014;
        const a = glassPt(0, cabY + 0.10, rearZ, -pu, -pv, -0.045, 0.52);
        const b = glassPt(0, cabY + 0.10, rearZ, du - pu, dv - pv, -0.045, 0.52);
        const c = glassPt(0, cabY + 0.10, rearZ, du + pu, dv + pv, -0.045, 0.52);
        const d = glassPt(0, cabY + 0.10, rearZ, pu, pv, -0.045, 0.52);
        quad(B, a, b, c, d, dir(0, Math.sin(0.52), -Math.cos(0.52)),
          [[0, 0], [1, 0], [1, 1], [0, 1]], [0.90, 0.92, 0.96], 4);
      };
      crack(0.32, 0.22); crack(-0.30, 0.16); crack(0.08, -0.34);
      crack(0.28, -0.14); crack(-0.12, -0.30); crack(-0.34, -0.08);
    }
    if (o.damage) drawDamage();
    drawFrontLights();
    return finish();
  }

  // ---- bak pickup terbuka (bible §1.6) ----
  function drawPickupBed(bodyTop) {
    p(0, bodyTop - 0.02, -L * 0.28, W * 0.9, 0.08, L * 0.42, DARK, 5);           // lantai bak
    for (const s of [-1, 1]) p(s * (W * 0.46), bodyTop + 0.12, -L * 0.28, 0.06, 0.3, L * 0.42, col, 1); // dinding bak
    p(0, bodyTop + 0.12, -L / 2 - 0.01, W * 0.9, 0.3, 0.06, col, 1);            // tailgate
    qB(0, bodyTop + 0.12, -L / 2 - 0.05, W * 0.7, 0.04, DARK, 5);                // garis tailgate
  }

  // ---- lampu belakang: light bar penuh + bumper + knalpot + plat (bible §1.2) ----
  function drawRearLights() {
    const barY = 0.86;
    p(0, 0.45, -L / 2 - 0.05, W * 0.98, 0.22, 0.16, DARK, 5);                    // bumper belakang
    p(0, barY, -L / 2 - 0.03, W * 0.72, 0.15, 0.06, o.brake ? [1.0, 0.25, 0.25] : [0.85, 0.10, 0.13], 4); // light bar
    qGlowB(0, barY, -L / 2 - 0.14, W * 0.95, 0.4, [1.0, 0.15, 0.2]);
    p(0, barY - 0.1, -L / 2 - 0.03, W * 0.72, 0.04, 0.06, CHROME, 1);            // strip krom bawah lampu
    for (const s of [-1, 1]) {
      p(s * W * 0.28, 0.30, -L / 2 - 0.10, 0.16, 0.12, 0.1, DARK, 5);            // knalpot
      p(s * W * 0.28, 0.30, -L / 2 - 0.16, 0.1, 0.08, 0.04, [0.7, 0.7, 0.72], 1); // ujung knalpot
    }
    qB(0, 0.52, -L / 2 - 0.15, 0.5, 0.14, WHITE, 5);                            // plat nomor
    // Plat BERTEKS (v2): strip biru kiri + 4 bar karakter + bingkai atas/bawah.
    qB(-0.19, 0.52, -L / 2 - 0.16, 0.06, 0.14, [0.15, 0.3, 0.8], 5);
    for (const lx of [-0.10, -0.02, 0.06, 0.14]) qB(lx, 0.52, -L / 2 - 0.16, 0.035, 0.09, DARK, 5);
    qB(0, 0.52 + 0.075, -L / 2 - 0.16, 0.5, 0.015, DARK, 5);
    qB(0, 0.52 - 0.075, -L / 2 - 0.16, 0.5, 0.015, DARK, 5);
  }

  // ---- lampu depan: grill + headlight + DRL (bible §1.4) ----
  function drawFrontLights() {
    p(0, 0.58, L / 2 + 0.01, W * 0.6, 0.16, 0.06, DARK, 5);                      // grill
    for (const s of [-1, 1]) {
      qF(s * W * 0.3, 0.66, L / 2 + 0.03, 0.45, 0.13, HEADLIGHT, 4);              // headlight
      if (hi) qF(s * W * 0.3, 0.56, L / 2 + 0.03, 0.45, 0.04, [1.0, 0.95, 0.8], 4); // DRL
    }
    p(0, 0.45, L / 2 + 0.05, W * 0.98, 0.2, 0.14, DARK, 5);                      // bumper depan
  }

  function finish() {
    return (B.i.length + G.i.length) / 3 - tri0;
  }
}
