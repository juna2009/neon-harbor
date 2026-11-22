// cars3d.js — Neon Harbor: model mobil 3D prosedural untuk WebGL2
// Track MOBIL-REALISTIS (instruksi Juna 12:47 WIB: mobil terus dikembangkan
// sampai serealistis mungkin). ES module, tanpa dependensi, tanpa network.
// v13 (2026-11-18): KAWAH — hz 0,80→0,92 (+15% lebar, 0 tris; A/B v13a: nyata di rect, marginal di full shot) + 2 RETAK CAT di sekitar kawah (A/B v13c: terbukti di zoom 3x, tak terlihat di full shot; +4 tris damage-only) + KAMERA damage 15% lebih dekat + target +0,5 & sedan 2,7 (staging demo v13d3 — sedan utuh, kawah ~150 px di layar) + SPOKE — kombinasi [0,88]+stripe[0,98] DITOLAK A/B (identik v12 di full shot 3/4; di macro kontras spine malah melemah 0,16→0,10) → spoke v12 DIPERTAHANKAN ([0,82]+stripe[0,98]); topik SPOKE DITUTUP. v12 (2026-11-18): KAWAH — bibir bawah DIHAPUS + bibir samping tipis/redup/pendek + tepi kawah TAK PERSEGI (sudut digeser ±0,03..0,07) + bibir atas DIPERPENDEK 72% (A/B v12b vs v12a vs v11 di crop-damage: v12a nyaris tak berubah — bingkai bertahan; v12b outline tak beraturan = terbaca 'penyok', bukan 'bingkai foto'; kedalaman TETAP 0,25; -2 tris damage-only) + SPOKE — stripe highlight tengah spoke [0,98] (A/B v12b vs v12a vs v11 di macro: v12a [0,88] marginal — lebih terang tapi datar; v12b stripe = tiap spoke punya highlight spine = terbaca LOGAM, celah gelap tetap, TIDAK jadi bunga; +40 tris, dibayar ban hi 16->14 sisi = -32 tris, hero 1526 <= 1550; A/B macro: ban 14 sisi siluetnya identik 16 di tepi bawah) + FOREGROUND wheel 3/4 — kamera lebih rendah (v12c1) DITOLAK (void makin besar) + kamera mundur/fov 44 (v12c2) DITOLAK (mobil mengecil, void tetap) — solusinya STAGING T4 (bukan modul): marka + manhole di (x 2,2-3,2, z -1,8..+0,2) demo TERBUKTI mengisi void (v12c5, 20.782 px berubah di dalam void). A/B DITOLAK: spoke [0,88] (marginal), bibir kawah v12a (tak terlihat), kamera wheel c1/c2, marka di (4,0,-2,5) v12c3 (di luar frustum). Larangan permanen tetap: flank 7, kap 11, lug besar, kawah >0,25, spoke >0,20, garis panel kuarter, macro lebih ketat.
// v16 (2026-11-19, CARS v16 — Juna: "mobilnya MASIH jelek banget").
// FINAL v16c: perbaikan 0-TRIS (biaya vertex <= v15 di semua scene).
// Kaca belakang DIGELAPKAN (skyGlass kusam, bukan kaca pucat — cacat
// v15 #1); lampu belakang BARISAN BARU — 2 klaster + bar tengah redup
// + wrap ke flank (bukan slab pink; net -2 tris); bumper belakang
// menyempit (W*0,68 — ban kebaca di sudut) + bumper depan W*0,72;
// pelek 0,34×wheelD + wheelD +0,04 (hero 0,72 — roda terbaca, cacat
// v15 #2); lampu depan lebih besar (0,55×0,16 + DRL 0,05) + knalpot
// lebih besar; spoiler WARNA BODI (bukan bar hitam); spion lebih besar
// (0,14×0,12). BUS/API/MEDIC: kaca depan pemadam+ambulans DIPINDAH ke
// muka depan (v15 TERKUBUR di dalam badan — BUG, kini terlihat); visor
// + divider pemadam; glacis APC. Hero hi 1430 tris (v15: 1432; plafon
// 1550). Ukur deterministik (scene padat beku, seed 7): bucket OP
// v16c 73.836 vertex vs v15 73.904 (-68) — v16c TIDAK menambah beban
// renderer apa pun.
// SEJARAH v16 PENUH (DICABUT — jangan kembalikan tanpa Uint32):
// haunch, skirt, valance, arch, ducktail, recess, splitter, fin,
// cakram rem, sunroof, sweep lampu. v16 penuh memunculkan BALOK CAHAYA
// raksasa di langit pada scene lineup; bisect membuktikan pemicunya
// quad SWEEP lampu depan (HEADLIGHT mat 4), BUKAN total vertex —
// v15 sendiri sudah 73.904 vertex di scene padat yang sama (di atas
// batas Uint16 65.536) tapi bersih. Geometri yang dicabut kembali
// SETELAH perbaikan indeks Uint32 di webgl2.js (jatah R27c, BUKAN
// file ini). Geometri yang dicabut didokumentasi lengkap di STATUS.md
// (bagian "v16 penuh — yang dicabut") untuk diterapkan kembali nanti.
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
export { quad, boxR, box, flat, billDir, quadN };
// Quad dengan normal PER-VERTEX (R36V2-SMOOTH): untuk strip melengkung —
// normal tiap sudut dirata-rata dari faset tetangga; shader menginterpolasi
// vN (tanpa culling, tanpa gl_FrontFacing — winding tak berpengaruh,
// hanya atribut normal) → permukaan terbaca melengkung, bukan faset.
// 0 tris tambahan: quad yang sama, normal berbeda.
function quadN(B, a, b, c, d, na, nb, nc, nd, uvs, col, m) {
  const base = B.p.length / 3;
  push(B, a, na, uvs[0], col, m); push(B, b, nb, uvs[1], col, m);
  push(B, c, nc, uvs[2], col, m); push(B, d, nd, uvs[3], col, m);
  B.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
}
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
  hero:      { label: 'Hero Neon GT',  kind: 'sport',  len: 5.4, wid: 2.3, bodyH: 0.80, cabFrac: 0.48, cabW: 0.78, wheels: 4, wheelD: 0.88, paint: '#e33e5f', spoiler: true,  lightbar: true },
  bus:       { label: 'Bus Kota',     kind: 'bus',    len: 9.6, wid: 2.6, bodyH: 1.70, cabFrac: 0.90, cabW: 1.00, wheels: 6, wheelD: 1.00, paint: '#e8b93c', spoiler: false, lightbar: false },
  fire:      { label: 'Pemadam',      kind: 'fire',   len: 8.4, wid: 2.6, bodyH: 1.50, cabFrac: 0.50, cabW: 0.90, wheels: 4, wheelD: 0.86, paint: '#c0392b', spoiler: false, lightbar: true },
  medic:     { label: 'Ambulans',     kind: 'medic',  len: 6.2, wid: 2.4, bodyH: 1.40, cabFrac: 0.60, cabW: 0.90, wheels: 4, wheelD: 0.86, paint: '#f5f5f5', spoiler: false, lightbar: true },
  apc:       { label: 'APC Tentara',  kind: 'apc',    len: 6.8, wid: 2.6, bodyH: 1.30, cabFrac: 0.40, cabW: 0.70, wheels: 6, wheelD: 0.45, paint: '#4a5a2a', spoiler: false, lightbar: false },
  armored:   { label: 'Truk Lapis Baja', kind: 'armored', len: 5.4, wid: 2.4, bodyH: 1.50, cabFrac: 0.30, cabW: 0.92, wheels: 6, wheelD: 0.86, paint: '#4a5240', spoiler: false, lightbar: false },
  hatchback: { label: 'Hatchback',    kind: 'hatch',  len: 4.2, wid: 2.2, bodyH: 0.80, cabFrac: 0.62, cabW: 0.80, wheels: 4, wheelD: 0.84, paint: '#2e8b9e', spoiler: true,  lightbar: true },
  sedanL:    { label: 'Sedan Panjang',kind: 'sedan',  len: 5.4, wid: 2.2, bodyH: 0.80, cabFrac: 0.45, cabW: 0.78, wheels: 4, wheelD: 0.86, paint: '#7d8ea3', spoiler: false, lightbar: true },
  pickup:    { label: 'Pickup',       kind: 'pickup', len: 5.2, wid: 2.2, bodyH: 0.80, cabFrac: 0.42, cabW: 0.80, wheels: 4, wheelD: 0.86, paint: '#d97b2b', spoiler: false, lightbar: true },
  police:    { label: 'Polisi',       kind: 'sedan',  len: 4.6, wid: 2.2, bodyH: 0.80, cabFrac: 0.50, cabW: 0.78, wheels: 4, wheelD: 0.86, paint: '#141c3c', spoiler: false, lightbar: true, police: true },
  // ---- CARS v18: jenis baru (varian visual — slot traffic tetap) ----
  // SUV: varian slot sedanL traffic — reuse cabang 'hatch' (belakang tegak),
  // bodyH 1,30 (skala game) + cabFrac 0,55 + ban serep di belakang. wb/L
  // 0,533 (estimasi suv-luxury, MEASUREMENTS.md A5) — posisi as dicek
  // visual di screenshot samping, bukan dipercaya buta.
  suv:      { label: 'SUV',          kind: 'hatch',  len: 5.4, wid: 2.2, bodyH: 1.30, cabFrac: 0.55, cabW: 0.80, wheels: 4, wheelD: 0.88, paint: '#8a9bb0', spoiler: false, lightbar: false, wb: 0.533, spare: true },
  // Race: varian langka slot sedanL PARKIR SAJA — reuse cabang 'sport'
  // (bodyH rendah + cabFrac 0,15 + spoiler besar). wb/L 0,594 (kit race).
  race:     { label: 'Mobil Balap',  kind: 'sport',  len: 5.4, wid: 2.2, bodyH: 0.62, cabFrac: 0.15, cabW: 0.78, wheels: 4, wheelD: 0.86, paint: '#d7263d', spoiler: true,  lightbar: false },
  // Delivery: varian visual slot van — cabang BARU drawDelivery (klon
  // drawArmored minus detail kas). wb/L 0,498 (kit delivery).
  delivery: { label: 'Van Delivery', kind: 'delivery', len: 5.4, wid: 2.4, bodyH: 1.50, cabFrac: 0.30, cabW: 0.92, wheels: 4, wheelD: 0.86, paint: '#e8e8e8', spoiler: false, lightbar: false, wb: 0.498 },
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
//           detail:'low'|'mid' (LOD), damage:boolean (penyok + kaca retak),
//           heavy:boolean (level 2: lampu pecah + bumper + jelaga),
//           charred:number (0 = utuh, 0.55 Heavily, 0.35 Wrecked — pengali cat),
//           wreck:boolean (bangkai: kedua lampu mati, pintu selalu tertutup),
//           tl:number (gain lampu rem ikut waktu — R38 Item 7, default 1),
//           door:number (sudut pintu depan 0..1,2 rad — DOOR-ANIM, default 0),
//           doorSide:number (-1 flank kiri | +1 kanan, default -1) }
//   Return: jumlah segitiga yang ditambahkan.
// ---------------------------------------------------------------------------
export function drawCarRealistic(B, G, type, cx, cz, yaw, len, wid, paint, opts) {
  const spec = carSpec(type);
  const tri0 = (B.i.length + G.i.length) / 3;
  const L = len || spec.len, W = wid || spec.wid;
  let col = Array.isArray(paint) ? paint : paint ? hx(paint) : hx(spec.paint);
  // R36V2-POLICE: unit polisi datang dengan cat biru #2f6fd0 (police.js)
  // — di 3D terbaca sedan biru, bukan Charger hitam-putih target. Paksa
  // cat 3D jadi hitam-navy; 2D top-down tetap biru (readability gameplay),
  // hanya model 3D yang berubah. paintDark/Light turun dari col ini.
  if (type === 'police') col = [0.07, 0.08, 0.12];
  // Nada cat v2 (cat 3 lapis TERBACA): badan bawah lebih gelap (pantulan
  // tanah), pita atap lebih terang (clear-coat kena matahari).
  // v3: kontras diperkuat (×0,66 / ×1,35) — batch 5: flop sisi matahari
  // masih tipis, flank masih satu warna datar di sebagian besar bodi.
  const o = opts || {};
  // VEHICLE-DAMAGE-P1: cat hangus — pengali dihitung SEBELUM paintDark /
  // paintLight turun dari col, jadi seluruh bodi (flank, kap, atap) ikut
  // gelap seragam; kaca + lampu tidak ikut (punya warna sendiri).
  if (o.charred) col = col.map((c) => c * o.charred);
  const paintDark = col.map((c) => c * 0.66);
  const paintLight = col.map((c) => Math.min(1, c * 1.35 + 0.06));
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
  // ---- quadOut (v15 R27b): quad dengan normal dari geometri ----
  // quad a-b-c-d; normal = (b-a)x(c-a); kalau menghadap berlawanan hint,
  // winding dibalik. Untuk cangkang faset (atap/kap/kaca/pilar/bevel) yang
  // normalnya tak bisa di-hardcode.
  const quadOut = (a, b, c, d, hint, col, m) => {
    let n = norm(cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
    if (n[0] * hint[0] + n[1] * hint[1] + n[2] * hint[2] < 0) {
      quad(B, a, d, c, b, [-n[0], -n[1], -n[2]], [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
    } else {
      quad(B, a, b, c, d, n, [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
    }
  };
  // ---- R36V2-SMOOTH: strip 2-titik sepanjang z, normal halus per stasiun ----
  // sec(t) -> [P0, P1] titik LOKAL (kiri, kanan) di stasiun t (0..1);
  // hint = arah luar (konvensi sama seperti quadOut — normal muka dicek
  // hint lalu dibalik bila berlawanan). Normal stasiun k = rata-rata
  // normal muka segmen k-1 dan k (ujung = segmen terdekat). Crease antar
  // band TIDAK dihaluskan (tiap band strip sendiri: bahu, punggung atap,
  // garis kap). 0 tris baru — strip yang sama, normal berbeda.
  const smoothStripZ = (n, sec, hint, col, m) => {
    const S = [];
    for (let k = 0; k <= n; k += 1) S.push(sec(k / n));
    const wpt = (p) => at(p[0], p[1], p[2]);
    const faceN = [];
    for (let i = 0; i < n; i += 1) {
      const a = wpt(S[i][0]), b = wpt(S[i + 1][0]), c = wpt(S[i + 1][1]);
      let nn = norm(cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
      if (nn[0] * hint[0] + nn[1] * hint[1] + nn[2] * hint[2] < 0) nn = [-nn[0], -nn[1], -nn[2]];
      faceN.push(nn);
    }
    const statN = S.map((_, k) => {
      if (k === 0) return faceN[0];
      if (k === n) return faceN[n - 1];
      return norm([faceN[k - 1][0] + faceN[k][0], faceN[k - 1][1] + faceN[k][1], faceN[k - 1][2] + faceN[k][2]]);
    });
    for (let i = 0; i < n; i += 1) {
      const a = wpt(S[i][0]), b = wpt(S[i + 1][0]), c = wpt(S[i + 1][1]), d = wpt(S[i][1]);
      quadN(B, a, b, c, d, statN[i], statN[i + 1], statN[i + 1], statN[i], [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
    }
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
  // Pita HORIZONTAL (sudut 0°) di muka kaca — pantulan langit yang tenang,
  // bukan garis miring. R38 Item 3: glassStreak 20° di kaca belakang terbaca
  // garis diagonal di shot chase (probe warna magenta/lime terbukti);
  // pantulan horizontal tetap membuat kaca kebaca kaca. Geometri sama
  // seperti glassStreak (bidang kaca miring rx, offset muka face*0.045),
  // hanya sudutnya 0° — 0 tris tambahan vs streak (1 quad ganti 2).
  const glassSheen = (lx, ly, lz, w, h, rx, face, col, du, dv) => {
    const hl = w / 2, hw = h / 2, ou = du || 0, ov = dv || 0;
    const corners = [];
    for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      corners.push(glassPt(lx, ly, lz, ou + su * hl, ov + sv * hw, face * 0.045, rx));
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
  // v16: DIGELAPKAN — v15 terlalu pucat (kaca belakang terbaca seperti
  // layar putih di chase-cam sore/siang); kaca mobil asli gelap.
  // v18-P3: pita ATAS digelapkan lagi ([0,24,0,28,0,40] -> [0,16,0,19,0,28],
  // mendekati pita tengah) — di close-up, pita atas masih terbaca
  // lavender-putih vs kaca samping yang gelap.
  // FOLLOW-UP P3 (v18+): pita diukur 167 lum di close-up vs kaca samping
  // ~30 — strip sheen saja tidak cukup (tanpa strip pun 167). Pita ke
  // [0,07,0,08,0,12] / [0,05,0,06,0,09]: emissive x2.2 di shader, jadi
  // render ~82 — mendekati gelapnya kaca samping. Langkah 2: [0,05,0,055,
  // 0,085] / [0,035,0,04,0,06] -> render ~60 (kaca tetap biru-abu, bukan
  // lubang hitam). Gradasi 3 pita dipertahankan.
  const skyGlass = (lx, ly, lz, w, h, rx) => {
    const hw = w / 2, hh = h / 2;
    faceQuad(lx, ly, lz, -hw, hw, hh * 0.35, hh, 0.035, rx, 0.006, [0.05, 0.055, 0.085], 4);
    faceQuad(lx, ly, lz, -hw, hw, -hh * 0.35, hh * 0.35, 0.035, rx, 0.006, [0.05, 0.055, 0.085], 4);
    faceQuad(lx, ly, lz, -hw, hw, -hh, -hh * 0.35, 0.035, rx, 0.006, [0.035, 0.04, 0.06], 4);
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
  // material 1 + pantulan horizontal halus. face = -1 belakang / +1 depan.
  const flatGlass = (lx, ly, lz, w, h, face, sheen) => {
    p(lx, ly, lz - face * 0.02, w + 0.08, h + 0.08, 0.05, DARK, 5); // bingkai karet
    p(lx, ly, lz, w, h, 0.06, GLASS, 1); // kaca glossy (bukan material 2)
    glassSheen(lx, ly, lz, w * 0.6, 0.10, 0, face, sheen || [0.30, 0.37, 0.48], 0, 0.05); // R38 Item 3: pantulan horizontal halus (dulu streak diagonal 20° — garis miring di kaca belakang bus)
  };
  // Bevel belakang v15: talang antara muka belakang dan deck — dari
  // (topY-0,10, -L/2-0,03) ke (topY+0,01, -L/2+0,08). Sedan: topY 1,06
  // (di bawah deck bagasi); bus/api/medic: topY = bodyTop (lebih landai).
  const rearBevel = (topY, w) => {
    const nrm = dir(0, 0.707, -0.707);
    quad(B, at(-w / 2, topY - 0.10, -L / 2 - 0.03), at(w / 2, topY - 0.10, -L / 2 - 0.03),
      at(w / 2, topY + 0.01, -L / 2 + 0.08), at(-w / 2, topY + 0.01, -L / 2 + 0.08),
      nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], paintDark, 1);
  };
  const wheelD = spec.wheelD, wheelY = wheelD / 2;
  // CARS v18: wheelbase per-spec (wb = wheelbase / L). Default 0,58
  // (= 2 x 0,29, perilaku lama); SUV 0,533 + delivery 0,498 (kit Kenney,
  // MEASUREMENTS.md) — as depan/belakang lebih masuk, overhang lebih
  // panjang, sesuai kendaraan tinggi. 6-roda tetap global (as tengah 0).
  const wbFrac = spec.wb || 0.58;
  const axleZ = spec.wheels === 6 ? [-L * 0.29, 0, L * 0.29] : [-L * wbFrac / 2, L * wbFrac / 2];

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
      // R36V2-SMOOTH: tapak ban bulat — normal tiap sudut = arah radial
      // di sudut ITU (a0/a1), bukan mid-angle datar → ban terbaca
      // silinder halus, bukan prisma 14-sisi. 0 tris (quad yang sama).
      quadN(B, pt(a0, -len / 2), pt(a0, len / 2), pt(a1, len / 2), pt(a1, -len / 2),
        dir(0, Math.cos(a0), Math.sin(a0)), dir(0, Math.cos(a0), Math.sin(a0)),
        dir(0, Math.cos(a1), Math.sin(a1)), dir(0, Math.cos(a1), Math.sin(a1)),
        [[0, 0], [1, 0], [1, 1], [0, 1]], colM, m);
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
    // R36V2-WHEEL: hero = velg hitam + kaliper merah (Huracan); polisi =
    // velg baja hitam + hub krom, tanpa kaliper merah (Charger steelies);
    // sisanya velg alloy perak. Hanya warna (+ skip kaliper polisi) — 0 tris.
    const wheelMode = type === 'hero' ? 'black' : type === 'police' ? 'steel' : 'alloy';
    const spokeCol = wheelMode === 'alloy' ? [0.82, 0.82, 0.86] : wheelMode === 'black' ? [0.13, 0.13, 0.15] : [0.10, 0.10, 0.11];
    const spokeHi = wheelMode === 'alloy' ? [0.98, 0.98, 0.98] : [0.30, 0.30, 0.34];
    const r = wheelD / 2, seg = hi ? 14 : mid ? 12 : 8; // v12: hi 14 sisi (dari 16) — BAYAR stripe highlight spoke: -8 tris/ban x 4 = -32 tris. A/B macro v12b: siluet tepi bawah ban 14 vs 16 IDENTIK (12 lug tapak yang mendominasi outline); 12 sisi = stop sign (v10a) — 14 aman.
    wheelCyl(C, r, 0.26, seg, TIRE, 5, [0.07, 0.07, 0.07]); // ban + dinding samping
    const rimR = wheelD * 0.34; // v16: pelek LEBIH BESAR (0,30->0,34) — velg terbaca sebagai velg, bukan bintik
    // v6 — cakram velg GELAP ([0.16]) supaya spoke TERANG terbaca di
    // atasnya (v3: cakram + spoke sama-sama RIM → spoke tak terlihat).
    wheelCyl(C, rimR, 0.32, 8, [0.07, 0.07, 0.09], 1, [0.07, 0.07, 0.09]); // v11: cakram HAMPIR HITAM (0,16 render abu-abu pucat di macro — celah antar-spoke harus gelap supaya 5 spoke terbaca terpisah)
    // (v16c: cakram rem DICABUT — lihat header. Velg 0,34×wheelD sudah membuat roda terbaca.)
    // v19-MULUS (kembali, hi-only): CAKRAM REM — quad baja di belakang
    // spoke (dx s*0,165, 0,005 di dalam bidang spoke 0,17), setengah
    // ukuran rimR*0,70 — terbaca lewat celah antar-spoke. 2 tris/roda.
    if (hi) {
      const discR = rimR * 0.70;
      const up = dir(0, 1, 0), fw = dir(0, 0, 1);
      const dc = [C[0] + rgt[0] * s * 0.165, C[1], C[2] + rgt[1] * s * 0.165];
      const dp = (su, sv) => [dc[0] + up[0] * su * discR + fw[0] * sv * discR, dc[1] + up[1] * su * discR + fw[1] * sv * discR, dc[2] + up[2] * su * discR + fw[2] * sv * discR];
      quad(B, dp(-1, -1), dp(1, -1), dp(1, 1), dp(-1, 1), [rgt[0] * s, 0, rgt[1] * s], [[0, 0], [1, 0], [1, 1], [0, 1]], [0.55, 0.56, 0.58], 1);
    }
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
        quad(B, mk(-1, -1), mk(1, -1), mk(1, 1), mk(-1, 1), [rgt[0] * s, 0, rgt[1] * s], [[0, 0], [1, 0], [1, 1], [0, 1]], spokeCol, 1);
        // v12: STRIPE HIGHLIGHT tengah spoke [0,98] — garis terang tipis (22% lebar spoke, 85% panjang), 0,005 unit di depan bidang spoke (anti z-fight). Tiap spoke punya highlight spine = terbaca LOGAM; celah gelap antar-spoke tetap (TIDAK jadi bunga v6a). +2 tris/spoke x 5 x 4 roda = +40 tris, dibayar ban 14 sisi (-32) -> hero 1526 (<=1550).
        const mkH = (sd, sp) => [base[0] + rgt[0] * s * 0.005 + d[0] * sd * sl * 0.85 / 2 + pp[0] * sp * sw * 0.22 / 2, base[1] + d[1] * sd * sl * 0.85 / 2 + pp[1] * sp * sw * 0.22 / 2, base[2] + rgt[1] * s * 0.005 + d[2] * sd * sl * 0.85 / 2 + pp[2] * sp * sw * 0.22 / 2];
        quad(B, mkH(-1, -1), mkH(1, -1), mkH(1, 1), mkH(-1, 1), [rgt[0] * s, 0, rgt[1] * s], [[0, 0], [1, 0], [1, 1], [0, 1]], spokeHi, 1);
      }
      wheelCyl(C, 0.08, 0.34, 6, wheelMode === 'black' ? [0.15, 0.15, 0.17] : CHROME, 1); // hub tengah v6 (0,07→0,08 — lebih besar/terang, pusat velg; R36V2: hero hub gelap)
      // Kaliper rem v7: LEBIH BESAR (0,12×0,24×0,18 — dari 0,10×0,20×0,16)
      // + LEBIH TERANG [0,90, 0,14, 0,08] + digeser keluar (dx 0,08→0,09) —
      // batch 10: kaliper v6 cuma bintik merah kecil, hampir tak terbaca
      // tanpa crop zoom. v7a 0,14×0,28 TERLALU BESAR — jadi balok merah
      // yang menutupi velg; 0,12×0,24 jalan tengah. Hi-only, v4 LOD mid.
      if (hi && wheelMode !== 'steel') { // R36V2: polisi steelies tanpa kaliper merah
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
      const fxc = s * (W / 2 + 0.10), fR = r + 0.10, iR = r + 0.02; // v9: fender DIPISAH dari roda (tetap W/2+0,14, tepi luar W/2+0,22) — roda geser, fender tidak ikut
      for (let j = 0; j < 6; j += 1) {
        const a0 = (-75 + j * 25) * Math.PI / 180, a1 = (-75 + (j + 1) * 25) * Math.PI / 180;
        // R36V2-SMOOTH: lengkung roda — normal tiap sudut = arah radial
        // di sudut ITU (bukan mid-angle) → busur fender terbaca melengkung
        // halus, bukan 6 faset. 0 tris (2 quad yang sama).
        const ptF = (a, dx) => at(fxc + dx, wheelY + fR * Math.cos(a), lz + fR * Math.sin(a));
        quadN(B, ptF(a0, 0.13), ptF(a0, -0.13), ptF(a1, -0.13), ptF(a1, 0.13),
          dir(0, Math.cos(a0), Math.sin(a0)), dir(0, Math.cos(a0), Math.sin(a0)),
          dir(0, Math.cos(a1), Math.sin(a1)), dir(0, Math.cos(a1), Math.sin(a1)),
          [[0, 0], [1, 0], [1, 1], [0, 1]], col, 1); // v11: pita fender LEBIH TEBAL (±0,13, dari ±0,08) — di macro v10 fender terbaca seperti garis wireframe karena dilihat nyaris edge-on; 0 tris
        const ptI = (a, dx) => at(lx + s * 0.02 + dx, wheelY + iR * Math.cos(a), lz + iR * Math.sin(a));
        quadN(B, ptI(a0, 0.05), ptI(a0, -0.05), ptI(a1, -0.05), ptI(a1, 0.05),
          dir(0, Math.cos(a0), Math.sin(a0)), dir(0, Math.cos(a0), Math.sin(a0)),
          dir(0, Math.cos(a1), Math.sin(a1)), dir(0, Math.cos(a1), Math.sin(a1)),
          [[0, 0], [1, 0], [1, 1], [0, 1]], DARK, 5);
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
        // R36-LUG (item 15): lug terang [0,68] di kuadran belakang ban
        // menghadap langsung ke chase-cam dan kebaca kotak lampu pucat
        // di belakang mobil (probe: lug oranye = patch oranye di kedua
        // roda belakang). Lug yang paling menghadap ke belakang
        // (sin(am)<-0,7) digelapkan ke 0,22 — pola tapak tetap terbaca
        // dari samping/3-4, tapi muka belakang ban gelap, bukan lampu.
        const lug = j % 2 === 0 ? (Math.sin(am) < -0.7 ? [0.22, 0.22, 0.22] : [0.68, 0.68, 0.68]) : [0.04, 0.04, 0.04];
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
        const gcol = j % 2 === 0 ? (wheelMode === 'alloy' ? [0.88, 0.88, 0.88] : [0.30, 0.30, 0.30]) : [0.02, 0.02, 0.02]; // R36V2: alur dinding ban ikut gelap di velg hitam/baja
        const r1 = rimR * 1.12, r2 = r * 0.97;
        const gp = (a, rr) => at(lx + s * 0.20, wheelY + rr * Math.cos(a), lz + rr * Math.sin(a)); // v8: dx 0,20 — lebih menonjol dari dinding ban
        quad(B, gp(am - hw3, r1), gp(am - hw3, r2), gp(am + hw3, r2), gp(am + hw3, r1),
          [rgt[0] * s, 0, rgt[1] * s], [[0, 0], [1, 0], [1, 1], [0, 1]], gcol, 5);
      }
    }
  };
  for (const lz of axleZ) {
    for (const s of [-1, 1]) drawWheel(s * (W / 2 - 0.04), lz, s); // v15: ban +0,04 keluar (muka luar ban 1,54 ≈ tonjolan flank 1,55 — ban kebaca dari belakang di bawah beltline)
  }

  // ---- DOOR-ANIM (visual-only): pintu depan berayun saat masuk/keluar ----
  // Emit HANYA saat o.door > 0,01 (hemat vertex: 1 quad + 1 box gagang =
  // 28 verts, maks 1 mobil berayun) dan HANYA keluarga sedan (dispatch di
  // bawah sudah mengembalikan bus/fire/medic/apc/armored lebih dulu).
  // Geometri = pola pintu gedung interiors.js:529-539: engsel di tepi DEPAN
  // pintu, pusat panel = engsel + vektor-tutup yang diputar sebesar ayunan.
  // Panel 1,7u (z) x 0,8u (y 0,34-1,14). Bidang panel di W/2+0,22 — BUKAN
  // W/2+0,02: tonjolan flank (faset B) mencapai W/2+0,20, jadi offset 0,02
  // menenggelamkan panel ke dalam bodi di sudut kecil (B1); preseden strip
  // krom flank di W/2+0,21. swing = -doorSide (pintu kiri berayun ke kiri).
  function drawDoor() {
    const ang = o.door || 0;
    if (ang <= 0.01) return;
    const side = o.doorSide || -1;
    const swing = -side, th = swing * ang;
    const hx = side * (W / 2 + 0.22), hz = 0.6; // engsel (lokal)
    const dx = -Math.sin(th), dz = -Math.cos(th); // arah engsel -> ujung bebas
    const a = at(hx, 1.14, hz), b = at(hx + dx * 1.7, 1.14, hz + dz * 1.7);
    const c = at(hx + dx * 1.7, 0.34, hz + dz * 1.7), d = at(hx, 0.34, hz);
    const hint = dir(side * Math.cos(th), 0, -side * Math.sin(th));
    quadOut(a, b, c, d, hint, paintDark, 1);
    // Gagang: box kecil menembus panel dekat ujung bebas (0,35u dari ujung),
    // ikut berputar (ry = yaw + ayunan) — pola interiors.js:544-546.
    const gq = at(hx + dx * 1.35, 0, hz + dz * 1.35);
    boxR(B, gq[0], 0.95, gq[2], 0.16, 0.14, 0.42, yaw + th, 0, DARK, 5);
  }

  if (spec.kind === 'bus') return drawBus();
  if (spec.kind === 'fire') return drawFire();
  if (spec.kind === 'medic') return drawMedic();
  if (spec.kind === 'apc') return drawApc();
  if (spec.kind === 'armored') return drawArmored();
  // CARS v18: delivery BUKAN drawSedanFamily (bentuk van kotak) dan
  // BUKAN drawArmored (tanpa detail kas) — cabang sendiri di bawah.
  if (spec.kind === 'delivery') return drawDelivery();
  drawDoor();
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
    flatGlass(0, 1.7, -L / 2 - 0.01, W * 0.8, 0.72, -1, [0.05, 0.055, 0.085]); // kaca belakang + bingkai + streak redup (FOLLOW-UP P3: strip putih 163 lum di kaca gelap 52 lum — sheen ikut gelap, langkah 2 samakan sedan; kaca depan tetap default)
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
      qS(s * (W / 2 + 0.02), 0.95, -L * 0.2, 0.05, 0.7, DARK, 5);          // v16: divider kompartemen (flank tak lagi satu bidang)
    }
    // Pita bawah gelap + trim terang v6 — flank pemadam tidak lagi satu warna datar.
    for (const s of [-1, 1]) {
      qS(s * (W / 2 + 0.01), 0.72, 0, L * 0.85, 0.28, paintDark, 1);
      qS(s * (W / 2 + 0.01), 1.32, 0, L * 0.85, 0.05, paintLight, 1);
    }
    for (const s of [-0.5, 0.5]) p(s, bodyTop + 0.12, 0, 0.12, 0.1, L * 0.7, [0.72, 0.74, 0.77], 1);
    for (let i = 0; i < 6; i += 1) p(-L * 0.3 + (i * L * 0.6) / 5, bodyTop + 0.12, 0, 1.0, 0.06, 0.12, [0.49, 0.51, 0.55], 1);
    // v16: kaca depan PINDAH ke muka depan (L/2+0,01) — v15 di L*0,32
    // TERKUBUR di dalam badan (muka depan di L/2), kaca tak pernah terlihat.
    flatGlass(0, 1.55, L / 2 + 0.01, W * 0.88, 0.7, 1);                     // kaca depan kabin + bingkai + streak (v3: lebih besar)
    qF(0, 1.95, L / 2 + 0.02, W * 0.9, 0.08, DARK, 5);                     // v16: visor atas kaca
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
    // v16: kaca depan PINDAH ke muka depan (L/2+0,01) — v15 di L*0,3
    // TERKUBUR di dalam badan (muka depan di L/2), kaca tak pernah terlihat.
    flatGlass(0, 1.5, L / 2 + 0.01, W * 0.88, 0.7, 1);                     // kaca depan + bingkai + streak (v3: lebih besar)
    qF(0, 1.89, L / 2 + 0.02, W * 0.9, 0.08, DARK, 5);                     // v16: visor atas kaca
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
    // v16: GLACIS — pelat depan miring di antara grill dan bumper (bukan
    // muka tegak): APC terbaca lapis baja. Dangkal (0,10) supaya grill +
    // bumper tetap menonjol di depannya.
    quadOut(at(-W * 0.45, 0.80, L / 2 + 0.01), at(W * 0.45, 0.80, L / 2 + 0.01),
      at(W * 0.45, 0.50, L / 2 + 0.10), at(-W * 0.45, 0.50, L / 2 + 0.10),
      [0, 0.5, 1], OLIVE2, 1);
    for (const s of [-1, 1]) {
      p(s * (W / 2 + 0.01), 0.75, 0, 0.05, 0.25, L * 0.85, [0.20, 0.22, 0.12], 1); // band gelap
    }
    drawRearLights();
    drawFrontLights();
    return finish();
  }

  // ================= TRUK LAPIS BAJA (R27c de-box) =================
  // Cash-in-transit: kabin depan + bak kargo lapis baja tinggi di belakang
  // (bukan sedan — dulu digambar car() lama = slab + kaca + spoiler).
  // Dari chase-cam (belakang): pintu ganda + lampu marker atap + lampu rem;
  // dari samping: bak bertingkat (lambung atas menyempit = pelat miring)
  // + strip amber + sambungan pelat; dari depan: kaca kabin + grill.
  // Semua shell ada di semua LOD (bentuk tak boleh berubah dengan jarak).
  function drawArmored() {
    const AMBER = [0.72, 0.55, 0.15]; // strip identitas truk kas
    const ARMOR = col.map((v) => v * 0.8); // pelat atas lebih gelap
    const cargoZ = -L * 0.16, cargoL = L * 0.68; // bak: z -L/2 .. +L*0.18
    const cabZ = L * 0.34, cabL = L * 0.32; // kabin: z +L*0.18 .. +L/2
    // Bak kargo: bawah penuh + atas menyempit (pelat miring lapis baja)
    p(0, 0.95, cargoZ, W, 1.0, cargoL, col, 1);                            // bak bawah (0,45–1,45)
    p(0, 1.70, cargoZ, W * 0.90, 0.5, cargoL * 0.94, ARMOR, 1);            // bak atas (1,45–1,95)
    p(0, 1.99, cargoZ, W * 0.88, 0.08, cargoL * 0.92, paintLight, 1);       // atap bak
    p(0, 2.06, cargoZ - cargoL * 0.24, W * 0.42, 0.08, 0.8, paintDark, 1);  // palka atap
    p(0, 2.05, cargoZ + cargoL * 0.34, 0.5, 0.1, 0.5, [0.6, 0.62, 0.65], 5); // ventilasi atap
    // Kabin: badan + atap + kaca depan/samping
    p(0, 1.02, cabZ, W * 0.96, 1.14, cabL, col, 1);                         // kabin (0,45–1,59)
    p(0, 1.63, cabZ, W * 0.94, 0.08, cabL, paintLight, 1);                  // atap kabin
    for (const s of [-1, 1]) p(s * (W / 2 + 0.01), 1.30, cabZ, 0.05, 0.5, cabL * 0.64, GLASS, 1); // kaca samping kabin
    flatGlass(0, 1.30, L / 2 + 0.01, W * 0.80, 0.55, 1);                    // kaca depan + bingkai + streak
    // Flank: pita bawah gelap + strip amber + trim terang + sambungan pelat
    for (const s of [-1, 1]) {
      qS(s * (W / 2 + 0.01), 0.72, cargoZ, cargoL * 0.85, 0.28, paintDark, 1);
      qS(s * (W / 2 + 0.01), 1.08, cargoZ, cargoL * 0.82, 0.16, AMBER, 1);
      qS(s * (W / 2 + 0.01), 1.45, cargoZ, cargoL * 0.85, 0.05, paintLight, 1);
      qS(s * (W / 2 + 0.02), 1.20, cargoZ - cargoL * 0.28, 0.05, 1.15, DARK, 5); // sambungan pelat 1
      qS(s * (W / 2 + 0.02), 1.20, cargoZ + cargoL * 0.22, 0.05, 1.15, DARK, 5); // sambungan pelat 2
      qS(s * (W / 2 + 0.02), 1.0, cabZ - cabL * 0.45, 0.05, 1.0, DARK, 5);  // garis pintu kabin
      qS(s * (W / 2 + 0.02), 1.05, cabZ + cabL * 0.22, 0.25, 0.06, CHROME, 1); // gagang pintu
    }
    // Muka belakang: pintu ganda (sambungan tengah + engsel + gagang) +
    // 3 lampu marker amber di tepi atas atap
    qB(0, 1.20, -L / 2 - 0.03, 0.06, 1.3, DARK, 5);                         // sambungan pintu ganda
    for (const s of [-1, 1]) qB(s * W * 0.38, 1.20, -L / 2 - 0.03, 0.06, 1.3, DARK, 5); // engsel
    for (const s of [-1, 1]) qB(s * 0.22, 1.10, -L / 2 - 0.04, 0.08, 0.28, CHROME, 1); // gagang pintu
    for (const lx of [-0.6, 0, 0.6]) qB(lx, 1.98, -L / 2 - 0.02, 0.14, 0.08, [1.0, 0.7, 0.2], 4); // marker atap
    // Marker amber di tepi depan atap kabin (terbaca saat berpapasan)
    for (const s of [-1, 1]) qF(s * 0.6, 1.66, L / 2 + 0.03, 0.14, 0.08, [1.0, 0.7, 0.2], 4);
    rearBevel(1.95, W * 0.8);
    drawRearLights();
    drawFrontLights();
    return finish();
  }

  // ---- CARS v18 — VAN DELIVERY: varian visual slot van. Klon drawArmored
  // (bentuk van kotak: bak + kabin) MINUS detail kas: tanpa strip amber,
  // palka atap, ventilasi, pintu ganda kas, marker amber. Ganti: pintu
  // geser di flank bak (2 sambungan + rel atas + gagang) + boks warna
  // usaha (teal) + panel atap putih. TANPA palang merah / tangga /
  // strip amber — delivery BUKAN ambulans/pemadam (B8).
  // Semua shell ada di semua LOD (bentuk tak boleh berubah dengan jarak).
  function drawDelivery() {
    const BOX = [0.16, 0.55, 0.60]; // teal usaha — beda dari pemadam/ambulans
    const BOXD = BOX.map((v) => v * 0.8); // pelat atas lebih gelap
    const cargoZ = -L * 0.16, cargoL = L * 0.68; // bak: z -L/2 .. +L*0.18
    const cabZ = L * 0.34, cabL = L * 0.32; // kabin: z +L*0.18 .. +L/2
    // Bak kargo teal: bawah penuh + atas menyempit + atap putih
    p(0, 0.95, cargoZ, W, 1.0, cargoL, BOX, 1);                           // bak bawah (0,45–1,45)
    p(0, 1.70, cargoZ, W * 0.90, 0.5, cargoL * 0.94, BOXD, 1);            // bak atas (1,45–1,95)
    p(0, 1.99, cargoZ, W * 0.88, 0.08, cargoL * 0.92, paintLight, 1);      // atap bak
    // Kabin: badan + atap + kaca depan/samping (warna mobil)
    p(0, 1.02, cabZ, W * 0.96, 1.14, cabL, col, 1);                        // kabin (0,45–1,59)
    p(0, 1.63, cabZ, W * 0.94, 0.08, cabL, paintLight, 1);                 // atap kabin
    for (const s of [-1, 1]) p(s * (W / 2 + 0.01), 1.30, cabZ, 0.05, 0.5, cabL * 0.64, GLASS, 1); // kaca samping kabin
    flatGlass(0, 1.30, L / 2 + 0.01, W * 0.80, 0.55, 1);                   // kaca depan + bingkai + streak
    // Flank bak: pita bawah gelap + PINTU GESER (sambungan depan/belakang
    // + rel atas + gagang) + trim terang; kabin: garis pintu + gagang
    for (const s of [-1, 1]) {
      qS(s * (W / 2 + 0.01), 0.72, cargoZ, cargoL * 0.85, 0.28, paintDark, 1);
      qS(s * (W / 2 + 0.02), 1.20, cargoZ + cargoL * 0.30, 0.06, 1.15, DARK, 5); // sambungan pintu geser (depan)
      qS(s * (W / 2 + 0.02), 1.20, cargoZ - cargoL * 0.10, 0.06, 1.15, DARK, 5); // sambungan pintu geser (belakang)
      qS(s * (W / 2 + 0.02), 1.45, cargoZ + cargoL * 0.10, 0.05, 1.15, DARK, 5); // rel atas pintu geser
      qS(s * (W / 2 + 0.02), 1.05, cargoZ + cargoL * 0.18, 0.22, 0.07, CHROME, 1); // gagang pintu geser
      qS(s * (W / 2 + 0.01), 1.45, cargoZ, cargoL * 0.85, 0.05, paintLight, 1); // trim terang
      qS(s * (W / 2 + 0.02), 1.0, cabZ - cabL * 0.45, 0.05, 1.0, DARK, 5);  // garis pintu kabin
      qS(s * (W / 2 + 0.02), 1.05, cabZ + cabL * 0.22, 0.25, 0.06, CHROME, 1); // gagang pintu kabin
    }
    // Muka belakang: pintu TUNGGAL (tanpa sambungan tengah ganda kas) +
    // engsel + gagang; TANPA marker amber.
    for (const s of [-1, 1]) qB(s * W * 0.38, 1.20, -L / 2 - 0.03, 0.06, 1.3, DARK, 5); // engsel
    for (const s of [-1, 1]) qB(s * 0.22, 1.10, -L / 2 - 0.04, 0.08, 0.28, CHROME, 1); // gagang pintu
    rearBevel(1.95, W * 0.8);
    drawRearLights();
    drawFrontLights();
    return finish();
  }

  // ================= KELUARGA SEDAN (hero / hatchback / sedanL / pickup / polisi) =================
  function drawSedanFamily() {
    const bodyBot = 0.34, bodyTop = bodyBot + spec.bodyH; // 0.34–1.14
    const cabZ = -L * 0.05, cabH = 0.44;
    const cabY = bodyTop + 0.22; // pusat kabin
    // ---- v15 R27b DE-BOXING: siluet samping kini mobil, bukan papan ----
    // Kap menurun ke hidung, atap melengkung, kaca depan/belakang miring
    // lebar, kabin menyempit ke atap (tumblehome), sudut membulat.
    // Kap/bagasi = cangkang faset (bukan 9 kotak); flank atas menurun ke
    // depan/belakang mengikuti garis kap/bagasi. Semua shell ada di semua
    // LOD (bentuk tak boleh berubah dengan jarak); hanya segmen yang turun.
    const nRoof = hi ? 5 : mid ? 4 : 3;
    const nHood = hi ? 4 : mid ? 3 : 2;
    const nTrunk = hi ? 3 : mid ? 2 : 2;
    const cowlZ = 0.185 * L, noseZ = 0.5 * L, flankZ = 0.44 * L;
    // Kaca depan per jenis (rx = miring dari vertikal): sport tajam,
    // sedan agak tegak, pickup hampir tegak.
    // CARS v18 — SUV: kaca depan HAMPIR TEGAK + h 0,42 (bukan 0,63) —
    // kalau tidak, kaca menembus atap (cowlZ 0,185×L = 1,00 vs atap 1,64)
    // dan mobil terbaca sedan tinggi, bukan SUV kotak. RACE: kaca depan
    // tetap 'sport' (rx 0,92, h 0,63) — tanpa 'hatch' roofline.
    const wind = spec.kind === 'pickup' ? { rx: 0.70, h: 0.55, w: 0.80 }
      : spec.kind === 'sedan' ? { rx: 0.80, h: 0.60, w: 0.78 }
      : (spec.bodyH >= 1.15 && spec.kind === 'hatch') ? { rx: 0.52, h: 0.42, w: 0.80 }
      : { rx: 0.92, h: 0.63, w: 0.78 };
    // CARS v18 — SUV: semua geometri atap/kaca/kabin naik +0,50 (bodyH
    // 1,30 vs sedan 0,80): atap 1,64, bahu 1,66 — mobil terbaca TINGGI.
    // HANYA jenis dengan bodyH >= 1,15 (SUV); RACE pakai lift 0.
    const lift = spec.bodyH >= 1.15 ? spec.bodyH - 0.80 : 0;
    const beltY = 1.16 + lift; // garis pinggang = atas bahu
    const shieldBaseZ = cowlZ - 0.25; // dasar kaca depan (strip cowl 0,25)
    const shieldTopZ = shieldBaseZ - wind.h * Math.sin(wind.rx);
    const shieldTopY = beltY + wind.h * Math.cos(wind.rx);
    const roofFZ = shieldTopZ + 0.12; // tepi depan atap (menutupi kaca depan)
    const roofRZ = cabZ - (L * spec.cabFrac) / 2 + 0.10; // tepi belakang atap
    const roofFY = shieldTopY, roofRY = shieldTopY - 0.02;
    const roofHalf = (W * spec.cabW) / 2 - 0.075;
    // Lengkung atap: tepi depan -> puncak (tengah, +0,085) -> tepi belakang.
    const roofEdgeY = (z) => {
      const t = (z - roofFZ) / (roofRZ - roofFZ);
      return roofFY + (roofRY - roofFY) * t + 0.085 * Math.sin(Math.PI * t);
    };
    // Kaca belakang: atas di bawah tepi belakang atap, bawah di deck.
    const rearTopZ = roofRZ + 0.15, rearTopY = roofRY;
    let rearBotZ, rearBotY;
    if (spec.kind === 'hatch') { rearBotZ = -L / 2 + 0.12; rearBotY = 1.12; }
    else if (spec.kind === 'pickup') { rearBotZ = rearTopZ - 0.20; rearBotY = 1.15; }
    else { rearBotZ = rearTopZ - 0.52; rearBotY = rearTopY - 0.36; }
    const rearRun = rearTopZ - rearBotZ, rearRise = rearTopY - rearBotY;
    const rearRx = Math.atan2(rearRun, rearRise);
    const rearH = Math.hypot(rearRun, rearRise);
    const rearZ = (rearTopZ + rearBotZ) / 2, rearY = (rearTopY + rearBotY) / 2;
    const rearW = spec.kind === 'pickup' ? 0.80 : spec.kind === 'hatch' ? 0.86 : 0.90;
    const trunkZ0 = rearBotZ; // awal deck bagasi = dasar kaca belakang
    // Penurunan tepi atas flank: 0 di tengah, 0,10 di hidung, 0,06 di ekor.
    const flankDrop = (z) => (z > cowlZ ? 0.10 * Math.min(1, (z - cowlZ) / (flankZ - cowlZ))
      : z < trunkZ0 ? 0.06 * Math.min(1, (trunkZ0 - z) / (flankZ + trunkZ0)) : 0);
    // Badan: kotak bawah (tutup 0,99 = tepi depan kap) + bahu tengah.
    p(0, 0.691, 0, W, 0.598, L, paintDark, 1); // bawah (0,39–0,99)
    p(0, 1.06 + lift, (trunkZ0 + cowlZ) / 2, W * 0.97, 0.2, cowlZ - trunkZ0, col, 1); // bahu (0,96–1,16; SUV +lift)
    // FLANK v15: 5 faset × 3 segmen (depan/tengah/belakang) — tepi atas
    // menurun mengikuti kap/bagasi; normal dari geometri (quadOut).
    const flankSegs = [[cowlZ, flankZ], [trunkZ0, cowlZ], [-flankZ, trunkZ0]];
    const flankQuad = (s, ax0, ay0, ax1, ay1, col) => {
      for (const [zA, zB] of flankSegs) {
        quadOut(at(s * ax0, ay0 - flankDrop(zA), zA), at(s * ax0, ay0 - flankDrop(zB), zB),
          at(s * ax1, ay1 - flankDrop(zB), zB), at(s * ax1, ay1 - flankDrop(zA), zA),
          [s, 0.5, 0], col, 1);
      }
    };
    // R36V2-SMOOTH: flank — 5 faset penampang dibulatkan: normal di tiap
    // sambungan = rata-rata normal faset tetangga (bukan flat per faset)
    // → tonjolan samping terbaca melengkung halus. Tepi atas (bahu) +
    // bawah (skirt) tetap tajam = crease desain. 0 tris baru.
    const flankProfile = [
      [W * 0.485, 1.06 + lift, W / 2 + 0.14, 0.95, paintLight], // (A1) — v18: SUV meregangkan faset atas (pintu lebih tinggi), bawah tetap 0,95
      [W / 2 + 0.14, 0.95, W / 2 + 0.20, 0.80, paintLight], // (A2)
      [W / 2 + 0.20, 0.80, W / 2 + 0.20, 0.55, col], // (B) — tonjolan 0,20
      [W / 2 + 0.20, 0.55, W / 2 + 0.10, 0.45, paintDark], // (C1)
      [W / 2 + 0.10, 0.45, W * 0.46, 0.34, paintDark], // (C2)
    ];
    const flankStrip = (s, profile) => {
      for (const [zA, zB] of flankSegs) {
        const fn = profile.map(([ax0, ay0, ax1, ay1]) => {
          const a = at(s * ax0, ay0 - flankDrop(zA), zA);
          const b = at(s * ax0, ay0 - flankDrop(zB), zB);
          const c = at(s * ax1, ay1 - flankDrop(zB), zB);
          let nn = norm(cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c[0] - a[0], c[1] - a[1], c[2] - a[2]]));
          if (nn[0] * s + nn[1] * 0.5 < 0) nn = [-nn[0], -nn[1], -nn[2]];
          return nn;
        });
        const jn = [fn[0]];
        for (let k = 1; k < 5; k += 1) jn.push(norm([fn[k - 1][0] + fn[k][0], fn[k - 1][1] + fn[k][1], fn[k - 1][2] + fn[k][2]]));
        jn.push(fn[4]);
        profile.forEach(([ax0, ay0, ax1, ay1, cc], k) => {
          const a = at(s * ax0, ay0 - flankDrop(zA), zA);
          const b = at(s * ax0, ay0 - flankDrop(zB), zB);
          const c = at(s * ax1, ay1 - flankDrop(zB), zB);
          const d = at(s * ax1, ay1 - flankDrop(zA), zA);
          quadN(B, a, b, c, d, jn[k], jn[k], jn[k + 1], jn[k + 1], [[0, 0], [1, 0], [1, 1], [0, 1]], cc, 1);
        });
      }
    };
    for (const s of [-1, 1]) flankStrip(s, flankProfile);
    // KAP v15: cangkang 3 faset (tengah + 2 sisi menurun ke fender) —
    // 1,14 di cowl menurun ke 0,99 di hidung; sisi luar turun sampai tepi
    // atas flank (tanpa celah). BAGASI v15: sama, 1,16 -> 1,06 ke ekor
    // (pickup: tidak ada — bak terbuka; hatch: deck pendek 1 segmen).
    const hoodY = (t) => 1.14 - 0.15 * Math.pow(t, 1.25);
    const hoodZ = (t) => cowlZ + (noseZ - cowlZ) * t;
    // R36V2-SMOOTH: kap — normal halus sepanjang z (tengah + 2 sisi).
    smoothStripZ(nHood, (t) => [[-0.55, hoodY(t), hoodZ(t)], [0.55, hoodY(t), hoodZ(t)]], [0, 1, 0.2], col, 1);
    for (const s of [-1, 1]) {
      smoothStripZ(nHood, (t) => [[s * 0.55, hoodY(t), hoodZ(t)], [s * (W * 0.485), 1.06 - flankDrop(hoodZ(t)) - 0.01, hoodZ(t)]], [s * 0.3, 1, 0.2], col, 1);
    }
    if (spec.kind !== 'pickup') {
      const nTrunkH = spec.kind === 'hatch' ? 1 : nTrunk;
      const trunkY = (t) => rearBotY - (rearBotY - 1.06) * Math.pow(t, 1.2);
      const trunkZ = (t) => trunkZ0 + (-noseZ - trunkZ0) * t;
      // R36V2-SMOOTH: bagasi — normal halus sepanjang z (tengah + 2 sisi).
      smoothStripZ(nTrunkH, (t) => [[-0.55, trunkY(t), trunkZ(t)], [0.55, trunkY(t), trunkZ(t)]], [0, 1, -0.2], col, 1);
      for (const s of [-1, 1]) {
        smoothStripZ(nTrunkH, (t) => [[s * 0.55, trunkY(t), trunkZ(t)], [s * (W * 0.485), 1.06 - flankDrop(trunkZ(t)) - 0.01, trunkZ(t)]], [s * 0.3, 1, -0.2], col, 1);
      }
    }
    // HIDUNG v15: bevel miring (0,99 -> 0,45) + chamfer sudut 45° depan &
    // belakang (kotak tak lagi siku 90°). Chamfer DI LUAR kotak (aditif) —
    // sudut kotak tertutup di belakangnya, tak menembus.
    quadOut(at(-W * 0.48, 0.99, noseZ), at(W * 0.48, 0.99, noseZ),
      at(W * 0.48, 0.45, noseZ + 0.10), at(-W * 0.48, 0.45, noseZ + 0.10), [0, 0.9, 0.4], col, 1);
    for (const s of [-1, 1]) {
      quadOut(at(s * (W / 2), 0.99, noseZ + 0.08), at(s * (W / 2), 0.40, noseZ + 0.08),
        at(s * (W / 2 + 0.08), 0.40, noseZ), at(s * (W / 2 + 0.08), 0.99, noseZ), [s, 0, 1], col, 1);
      quadOut(at(s * (W / 2), 1.06, -noseZ - 0.08), at(s * (W / 2), 0.40, -noseZ - 0.08),
        at(s * (W / 2 + 0.08), 0.40, -noseZ), at(s * (W / 2 + 0.08), 1.06, -noseZ), [s, 0, -1], col, 1);
    }
    // Kabin: inti MENYEMPIT (0,84×) + RENDAH (atas 1,50, di bawah atap) —
    // sisi kabin dibentuk kaca miring (tumblehome), bukan inti kotak.
    const coreFrontZ = shieldTopZ - 0.05, coreRearZ = rearTopZ - 0.05;
    p(0, 1.36 + lift, (coreFrontZ + coreRearZ) / 2, W * spec.cabW * 0.84, 0.28, coreFrontZ - coreRearZ, col, 1); // v18: SUV +lift (atas 2,00)
    // ATAP v15: cangkang lengkung (depan -> puncak -> belakang) × V
    // melintang (punggung +0,05) — atap datar MATI.
    // R36V2-SMOOTH: atap — normal halus sepanjang z per paruh (punggung
    // tengah tetap crease); kap hitam hero ikut strip yang sama.
    const roofSec = (half, eOff) => (t) => {
      const z = roofFZ + (roofRZ - roofFZ) * t, e = roofEdgeY(z) + eOff;
      return [[0, e + 0.05, z], [half * roofHalf, e, z]];
    };
    smoothStripZ(nRoof, roofSec(-1, 0), [-0.25, 1, 0], col, 1);
    smoothStripZ(nRoof, roofSec(1, 0), [0.25, 1, 0], col, 1);
    if (spec.kind === 'sport') {
      // R36V2-HERO-ROOF: atap hitam (Huracan) — panel mengikuti lengkung
      // atap, 0,02 di atas permukaan, nRoof segmen × 2 sisi (20 tris hi).
      // nCap HARUS = nRoof: kap 3 segmen (v2) talinya datar menembus
      // lengkung atap (puncak arch +0,085, deviasi tali 0,0114 > offset
      // 0,012) → cat merah atap menembus kap hitam di tengah atap
      // (terlihat di crop v3/v5). 5 segmen + 0,02 = margin 0,016.
      const nCap = nRoof, capHalf = roofHalf * 0.80;
      const capSec = (half) => (t) => {
        const z = roofFZ + (roofRZ - roofFZ) * t, e = roofEdgeY(z) + 0.02;
        return [[0, e + 0.05, z], [half * capHalf, e, z]];
      };
      smoothStripZ(nCap, capSec(-1), [-0.25, 1, 0], DARK, 5);
      smoothStripZ(nCap, capSec(1), [0.25, 1, 0], DARK, 5);
      // R36V2-HERO-HOOD: kap tengah hitam + 2 ventilasi (Huracan) —
      // panel mengikuti faset kap, 0,012 di atas permukaan (8 + 2 tris).
      smoothStripZ(nHood, (t) => [[-0.30, hoodY(t) + 0.012, hoodZ(t)], [0.30, hoodY(t) + 0.012, hoodZ(t)]], [0, 1, 0.2], DARK, 5);
      for (const s of [-1, 1]) {
        quadOut(at(s * 0.38, hoodY(0.15) + 0.012, hoodZ(0.15)), at(s * 0.38, hoodY(0.45) + 0.012, hoodZ(0.45)),
          at(s * 0.58, hoodY(0.45) + 0.012, hoodZ(0.45)), at(s * 0.58, hoodY(0.15) + 0.012, hoodZ(0.15)), [s * 0.3, 1, 0.2], DARK, 5);
      }
    }
    // KACA SAMPING v15: miring ke dalam (tumblehome) + tepi atas mengikuti
    // lengkung atap; pilar B membagi jendela depan/belakang (hi/mid).
    const glassBotX = (W * spec.cabW) / 2, glassTopX = roofHalf - 0.025;
    const sideFZ = roofFZ - 0.05, sideRZ = spec.kind === 'pickup' ? -0.40 : roofRZ + 0.05;
    for (const s of [-1, 1]) {
      // R36V2-SMOOTH: kaca samping — normal halus sepanjang z.
      smoothStripZ(nRoof, (t) => {
        const z = sideFZ + (sideRZ - sideFZ) * t;
        return [[s * glassBotX, beltY, z], [s * glassTopX, roofEdgeY(z) - 0.015, z]];
      }, [s, 0.4, 0], GLASS, 1);
      if (hi || mid) {
        const bz = cabZ;
        quadOut(at(s * glassBotX, beltY, bz - 0.03), at(s * glassBotX, beltY, bz + 0.03),
          at(s * glassTopX, roofEdgeY(bz + 0.03) - 0.015, bz + 0.03), at(s * glassTopX, roofEdgeY(bz - 0.03) - 0.015, bz - 0.03),
          [s, 0.4, 0], col, 1);
      }
      // Pilar A + pilar C: satu quad tiap sisi (daerahnya memang quad;
      // normal tunggal dari quadOut — lipatan diagonal kecil tak kentara).
      const aw = wind.w * (W * spec.cabW) / 2; // setengah lebar kaca depan
      quadOut(at(s * aw, beltY, shieldBaseZ), at(s * glassBotX, beltY, sideFZ),
        at(s * glassTopX, roofEdgeY(sideFZ) - 0.015, sideFZ), at(s * aw, shieldTopY, shieldTopZ), [s, 0.2, 0.5], col, 1);
      if (spec.kind !== 'pickup') {
        const rw = rearW * (W * spec.cabW) / 2; // setengah lebar kaca belakang
        quadOut(at(s * rw, rearBotY, rearBotZ), at(s * glassBotX, beltY, sideRZ),
          at(s * glassTopX, roofEdgeY(sideRZ) - 0.015, sideRZ), at(s * rw, rearTopY, rearTopZ), [s, 0.2, -0.5], col, 1);
      }
    }
    // Kaca belakang BESAR + MIRING (rx ~0,97 sedan, ~1,10 hatch) + kaca
    // depan miring — kaca strip tipis v14 MATI. Bingkai + langit + streak
    // tetap pakai mesin lama (faceQuad/glassStreak), hanya ukuran/posisi baru.
    glassBorder(0, rearY, rearZ, W * spec.cabW * rearW, rearH, rearRx);
    p(0, rearY, rearZ, W * spec.cabW * rearW, rearH, 0.07, GLASS, 1, rearRx);
    skyGlass(0, rearY, rearZ, W * spec.cabW * rearW, rearH, rearRx);
    glassSheen(0, rearY, rearZ, W * spec.cabW * 0.55, 0.10, rearRx, -1, [0.05, 0.055, 0.085], 0, 0.08); // R38 Item 3: pantulan horizontal halus — ganti 2 streak diagonal 20° (probe: garis diagonal di kaca = streak ini). FOLLOW-UP P3: [0,34,0,41,0,54] -> [0,07,0,08,0,12] -> [0,05,0,055,0,085] (ikuti pita skyGlass langkah 2, supaya sheen tak jadi bilah terang di atas kaca yang makin gelap); kaca depan (glassStreak) TIDAK disentuh.
    const shieldY = beltY + (wind.h * Math.cos(wind.rx)) / 2;
    const shieldZ = (shieldBaseZ + shieldTopZ) / 2;
    p(0, shieldY, shieldZ - 0.02, W * spec.cabW * (wind.w + 0.04), wind.h + 0.04, 0.05, DARK, 5, -wind.rx); // bingkai
    p(0, shieldY, shieldZ, W * spec.cabW * wind.w, wind.h, 0.07, GLASS, 1, -wind.rx);
    glassStreak(0, shieldY, shieldZ, W * spec.cabW * 0.6, 0.12, -wind.rx, 1, [0.22, 0.28, 0.38], 0, 0.05);
    rearBevel(1.06, W * 0.88);
    // ---- v16c: SEMUA geometri tambahan DICABUT (haunch, skirt, valance,
    // arch, ducktail, recess, splitter, fin — lihat v16b). Renderer
    // webgl2.js pakai indeks Uint16 (maks 65.536 vertex/bucket) dan v15
    // sudah 64.620 di scene padat: geometri apa pun mendorong index wrap
    // -> segitiga raksasa di langit. Yang TINGGAL di v16c adalah perbaikan
    // 0-tris: kaca gelap, klaster lampu (net -2), bumper menyempit, roda/
    // velg lebih besar, lampu depan lebih besar, spoiler warna bodi, spion
    // lebih besar, kaca pemadam/ambulans (bug v15) + visor/glacis. Biaya
    // vertex v16c <= v15 di SEMUA scene — aman digabung apa pun keadaan
    // bucket. Geometri (haunch/disk/sunroof/sweep) kembali SETELAH
    // perbaikan Uint32 di webgl2.js (jatah R27c). ----
    // ---- v19-MULUS PHASE 1: geometri v16-penuh KEMBALI (minus sweep) ----
    // Uint32 (R28) sudah di webgl2.js — bucket tidak lagi wrap di 65.536,
    // jadi geometri ini aman kembali. Koordinat PERSIS STATUS.md
    // §"v16 penuh — yang dicabut". SWEEP LAMPU DEPAN TIDAK KEMBALI
    // (pemicu beam terbukti lewat bisect — gate beam di lineup).
    // Side skirt v16 TIDAK kembali: R36-SKIRT sudah memberi pita gelap
    // bawah; posisi v16 (x W/2+0,16) kini DI DALAM tonjolan flank B
    // (W/2+0,20) — tersembunyi, 4 tris sia-sia.
    // Splitter depan (12 tris): bibir gelap di bawah bumper depan.
    p(0, 0.35, L / 2 + 0.10, W * 0.78, 0.08, 0.22, DARK, 5);
    // Fin diffuser (12 tris): 3 sirip dua sisi di bawah bumper belakang.
    for (const fx of [-0.32, 0, 0.32]) {
      for (const s of [-1, 1]) qS(fx + s * 0.01, 0.35, -L / 2 - 0.18, 0.08, 0.14, DARK, 5);
    }
    // Haunch belakang (8 tris) + tonjolan fender depan (8 tris): quad
    // miring di atas roda — tepi atas di dalam flank, tepi bawah keluar
    // (W/2+0,20→0,23) = flare fender. B3: vs fender saat belok penuh.
    for (const s of [-1, 1]) {
      quadOut(at(s * (W / 2 + 0.05), 1.02, -L * 0.16), at(s * (W / 2 + 0.05), 1.02, -L * 0.46),
        at(s * (W / 2 + 0.23), 0.88, -L * 0.46), at(s * (W / 2 + 0.20), 0.88, -L * 0.16), [s, 0.3, 0], col, 1);
      quadOut(at(s * (W / 2 + 0.05), 1.02, L * 0.16), at(s * (W / 2 + 0.05), 1.02, L * 0.46),
        at(s * (W / 2 + 0.23), 0.88, L * 0.46), at(s * (W / 2 + 0.20), 0.88, L * 0.16), [s, 0.3, 0], col, 1);
    }
    // Valance belakang (2 tris): panel gelap di bawah bumper belakang.
    qB(0, 0.35, -L / 2 - 0.14, W * 0.66, 0.10, DARK, 5);
    // Arch gelap (4 tris): bayangan lengkung roda di muka belakang.
    // B2: jangan menutupi roda / terbaca noda hitam — bila terbaca noda,
    // kecilkan 20% (0,26×0,24 -> 0,21×0,19).
    for (const s of [-1, 1]) qB(s * 0.95, 0.54, -L / 2 - 0.02, 0.26, 0.24, [0.03, 0.03, 0.04], 5);
    // Ducktail (2 tris): bibir miring warna bodi di tepi deck belakang.
    // B5: + spoiler bukan tonjolan ganda — ducktail di deck (bodyTop+0,04),
    // sayap sport di bodyTop+0,30, spoiler kotak di bodyTop+0,02 (menyatu).
    quadOut(at(-W * 0.44, bodyTop + 0.04, -L / 2 - 0.02), at(W * 0.44, bodyTop + 0.04, -L / 2 - 0.02),
      at(W * 0.44, bodyTop + 0.09, -L / 2 - 0.14), at(-W * 0.44, bodyTop + 0.09, -L / 2 - 0.14), [0, 0.4, -1], col, 1);
    // Recess plat (2 tris): ceruk gelap pelat nomor di bumper belakang.
    qB(0, 0.52, -L / 2 - 0.145, 0.64, 0.20, DARK, 5);
    // Sunroof (4 tris, hi): 2 quad kaca mengikuti lengkung V atap,
    // z 30–65% atap. B6: bukan lubang hitam — kaca GLASS (bukan DARK).
    if (hi) {
      const srF = roofFZ + (roofRZ - roofFZ) * 0.30, srR = roofFZ + (roofRZ - roofFZ) * 0.65;
      for (const s of [-1, 1]) {
        quadOut(at(0, roofEdgeY(srF) + 0.015, srF), at(s * roofHalf * 0.85, roofEdgeY(srF) + 0.015, srF),
          at(s * roofHalf * 0.85, roofEdgeY(srR) + 0.015, srR), at(0, roofEdgeY(srR) + 0.015, srR), [0, 1, 0], GLASS, 1);
      }
    }
    // ---- v18 — SUV: BAN SEREP di muka belakang (semua LOD) ----
    // Cakram gelap + hub terang, menempel di pintu belakang DI BAWAH
    // kaca (bukan di atas kaca): kaca belakang 'hatch' SUV turun sampai
    // y 1,12, jadi ban di y 1,80 menutupi kaca + menjulang di atas atap.
    // Ban = boks (12 tris, tebal 0,16, menempel di pintu, muka belakang
    // di -L/2-0,16, di belakang bumper -L/2-0,13) + hub quad di mukanya.
    if (spec.spare) {
      p(0, 0.80, -L / 2 - 0.08, 0.62, 0.62, 0.16, [0.05, 0.05, 0.06], 5);
      qB(0, 0.80, -L / 2 - 0.17, 0.30, 0.30, [0.55, 0.56, 0.58], 1);
    }
    // Garis pinggang (panel line) di flank — batch 5: sisi masih slab datar.
    for (const s of [-1, 1]) {
      if (hi) qS(s * (W / 2 + 0.21), 0.98, 0, L * 0.85, 0.03, DARK, 5); // garis pinggang (v7: di atas faset B v7)
    }
    // R36-SKIRT: side skirt — pita gelap di paruh bawah faset C2
    // (mengikuti kemiringan flank, +0,012 keluar dari bidang faset anti
    // z-fight). Sisi bawah tak lagi slab datar; strip terputus di roda
    // karena ban lebih keluar dari bidang strip (seperti skirt asli).
    for (const s of [-1, 1]) {
      flankQuad(s, (W / 2 + 0.10 + W * 0.46) / 2 + 0.012, 0.395, W * 0.46 + 0.012, 0.34, DARK);
    }
    if (spec.kind === 'sport' && hi) {
      // R36V2-HERO-INTAKE: intake samping hitam di kuarter belakang
      // (Huracan) — di bidang detail 0,225, di atas fender + tutup
      // tangki supaya tak z-fight (4 tris).
      for (const s of [-1, 1]) qS(s * (W / 2 + 0.225), 0.98, -L * 0.32, 0.42, 0.14, DARK, 5);
    }
    // Rim light hangat di tepi belakang atap (jurus GTA V — bible §1.2 butir 8)
    // FOLLOW-UP P3: [0,9,0,55,0,28] emissive x2,2 -> strip putih ~220 lum di
    // tepi atas kaca belakang (bukan glassSheen — sheen sudah diredup, strip
    // tetap 218). Ke [0,12,0,08,0,05] -> 88 lum; langkah 2 [0,08,0,055,0,035]
    // -> ~65 lum (ikuti kaca yang makin gelap). Bus TIDAK punya rim light
    // (builder lain).
    if (hi) p(0, roofEdgeY(roofRZ) + 0.02, roofRZ + 0.02, W * spec.cabW * 0.78, 0.04, 0.04, [0.08, 0.055, 0.035], 4);
    // v16c: sunroof KEMBALI di blok v19 di atas (4 tris hi, GLASS);
    // sweep TETAP DICABUT (pemicu beam — jangan kembalikan).
    // ---- detail kecil (bible §1.7): spion, gagang pintu, panel line, antena ----
    for (const s of [-1, 1]) {
      p(s * (W / 2 + 0.10), bodyTop + 0.08, L * 0.12, 0.14, 0.12, 0.22, col, 1); // spion (v16: lebih besar; muka gelap dicabut v16b — 4 tris)
      // v19-MULUS: MUKA SPION GELAP kembali (4 tris, hi) — quad gelap di
      // muka BELAKANG spion (z L*0.12-0.115, menghadap pengemudi),
      // 0,10×0,08. Koordinat STATUS.md (qB).
      if (hi) qB(s * (W / 2 + 0.10), bodyTop + 0.08, L * 0.12 - 0.115, 0.10, 0.08, DARK, 5);
      if (hi) {
        // v7: digeser ke W/2+0,13 — duduk di faset flank B v7 (bukan tertimbun).
        qS(s * (W / 2 + 0.21), 0.82, L * 0.08, 0.3, 0.045, DARK, 5);               // gagang pintu depan
        qS(s * (W / 2 + 0.21), 0.82, -L * 0.08, 0.3, 0.045, DARK, 5);              // gagang pintu belakang
        qS(s * (W / 2 + 0.21), 0.72, -L * 0.05, 0.05, 0.5, DARK, 5);               // garis pintu belakang
        qS(s * (W / 2 + 0.21), 0.72, L * 0.18, 0.05, 0.5, DARK, 5);                // garis pintu depan
        // (v11c3: garis panel kuarter belakang DITOLAK — di macro 0,05 lebar × 0,5 tinggi = pilar hitam 30×330 px di tengah frame; detail apa pun setinggi itu tidak bisa subtil di jarak macro. Dinding di atas roda diisi tutup tangki saja; macro jadi shot bukti, bukan gambar final.)
        if (s > 0) { // tutup tangki — sisi kanan saja (v11: isi dinding merah kosong di shot macro roda; 6 tris)
          const fx2 = s * (W / 2 + 0.215), fy = 0.80, fz = -L * 0.26, fr2 = 0.09; // v16: fy 0,80 (dulu 0,88 — di bawah haunch, tak tertutup)
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
    drawRearLights(true); // v16: klaster (bukan bar slab)
    if (spec.kind === 'pickup') drawPickupBed(bodyTop);
    if (spec.spoiler) {
      if (spec.kind === 'sport') {
        // R36V2-WING: sayap belakang Huracan — bilah hitam di atas 2 kaki
        // + endplate; bilah = quad atas + muka belakang (12 tris, bukan
        // 38 tris balok v16 — hemat + terbaca sayap dari belakang).
        const wy = bodyTop + 0.30, wz = -L * 0.47;
        quad(B, at(-W * 0.44, wy, wz - 0.17), at(W * 0.44, wy, wz - 0.17), at(W * 0.44, wy, wz + 0.17), at(-W * 0.44, wy, wz + 0.17), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], DARK, 5); // bilah atas
        qB(0, wy - 0.025, wz - 0.17, W * 0.88, 0.05, DARK, 5); // muka belakang bilah
        for (const s of [-1, 1]) {
          qB(s * W * 0.30, bodyTop + 0.12, wz, 0.08, 0.36, DARK, 5); // kaki sayap (dari deck 1,06 ke bilah)
          qS(s * (W * 0.44), wy, wz, 0.34, 0.16, DARK, 5); // endplate
        }
      } else {
        p(0, bodyTop + 0.02, -L * 0.47, W * 0.85, 0.07, 0.4, col, 1);              // spoiler WARNA BODI (v16: bukan bar hitam — menyatu dengan deck + ducktail)
        if (hi) {
          p(0, bodyTop + 0.06, -L * 0.47, W * 0.8, 0.04, 0.05, RIMWARM, 4);        // rim di spoiler
          for (const s of [-1, 1]) p(s * W * 0.3, bodyTop - 0.04, -L * 0.47, 0.08, 0.12, 0.1, DARK, 5);
        }
      }
    }
    if (hi && spec.kind === 'sedan') {
      for (const s of [-1, 1]) p(s * (W / 2 + 0.21), 0.78, 0, 0.06, 0.06, L * 0.8, CHROME, 1); // strip krom flank (v8: 0,21 — di atas faset B 0,20)
    }
    if (spec.kind === 'sedan') {
      // R36V2-CHROME2: lis krom garis pinggang bawah kaca (Accord) —
      // sepanjang kaca samping saja (tengah z -L*0,10, panjang L*0,30),
      // 2 quad/sisi (4 tris).
      for (const s of [-1, 1]) qS(s * (W / 2 + 0.215), 1.02, -L * 0.10, L * 0.30, 0.035, CHROME, 1);
    }
    if (spec.police || o.police) {
      // R36V2-POLICE: Charger hitam-putih — panel putih digeser ke
      // belakang (pintu belakang + kuarter, bukan tengah) + bagasi putih.
      for (const s of [-1, 1]) p(s * (W / 2 + 0.21), 0.72, -L * 0.14, 0.06, 0.4, L * 0.56, WHITE, 1); // pintu belakang + kuarter putih
      // Bagasi putih: 2 segmen mengikuti lengkung bagasi (+0,012).
      // trunkY/Z didefinisikan di blok bagasi (scope blok) — hitung ulang.
      const trY = (t) => rearBotY - (rearBotY - 1.06) * Math.pow(t, 1.2);
      const trZ = (t) => trunkZ0 + (-noseZ - trunkZ0) * t;
      // R36V2-SMOOTH: bagasi putih — normal halus (t 0,5–1,0).
      smoothStripZ(2, (u) => {
        const t = 0.5 + u * 0.5;
        return [[-0.55, trY(t) + 0.012, trZ(t)], [0.55, trY(t) + 0.012, trZ(t)]];
      }, [0, 1, -0.2], WHITE, 1);
      // R36V2-LIGHTBAR: light bar 3D — alas hitam di atap + merah/biru di
      // muka DEPAN dan BELAKANG (dulu cuma qF: dari belakang tak terbaca).
      const lbY = cabY + cabH / 2 + 0.12;
      p(0, lbY, cabZ, 1.15, 0.10, 0.30, DARK, 5); // alas
      const lbR = blink ? RED_TAIL : [0.35, 0.1, 0.12], lbRm = blink ? 4 : 5;
      const lbB = blink ? [0.1, 0.15, 0.45] : [0.15, 0.3, 1.0], lbBm = blink ? 5 : 4;
      qF(-0.29, lbY, cabZ + 0.16, 0.5, 0.12, lbR, lbRm);
      qF(0.29, lbY, cabZ + 0.16, 0.5, 0.12, lbB, lbBm);
      qB(-0.29, lbY, cabZ - 0.16, 0.5, 0.12, lbR, lbRm);
      qB(0.29, lbY, cabZ - 0.16, 0.5, 0.12, lbB, lbBm);
      qGlowB(0, lbY, cabZ + 0.2, 1.3, 0.45, [0.7, 0.2, 0.6]);
      // R36V2-PUSHBAR: push bar depan — 2 vertikal + 2 horizontal +
      // 2 lampu amber (12 tris, quad saja — dari depan terbaca bull bar).
      for (const s of [-1, 1]) qF(s * 0.55, 0.68, L / 2 + 0.14, 0.09, 0.52, DARK, 5);
      qF(0, 0.92, L / 2 + 0.14, 1.2, 0.08, DARK, 5);
      qF(0, 0.46, L / 2 + 0.14, 1.2, 0.08, DARK, 5);
      for (const s of [-1, 1]) qF(s * 0.35, 0.92, L / 2 + 0.15, 0.14, 0.06, [1.0, 0.7, 0.2], 4);
    }
    if (o.taxi) {
      // R36V2-TAXI: papan TAXI menyala di atap + strip kotak-kotak di
      // flank (Camry target). Papan = alas hitam + kotak amber mat 4
      // (24 tris); strip = pita putih + 5 kotak hitam per sisi (24 tris).
      const signY = roofEdgeY(cabZ) + 0.05;
      p(0, signY + 0.03, cabZ, 0.50, 0.06, 0.30, DARK, 5); // alas papan
      p(0, signY + 0.13, cabZ, 0.62, 0.16, 0.24, [1.0, 0.62, 0.08], 4); // papan TAXI menyala
      for (const s of [-1, 1]) {
        qS(s * (W / 2 + 0.215), 0.90, 0, L * 0.58, 0.10, [0.93, 0.93, 0.90], 1); // pita putih
        for (let k = 0; k < 10; k += 2) { // 5 kotak hitam berselang
          const zc = -L * 0.29 + (k + 0.5) * (L * 0.58 / 10);
          qS(s * (W / 2 + 0.225), 0.90, zc, L * 0.58 / 10, 0.10, [0.05, 0.05, 0.06], 5);
        }
      }
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
      const crack = (du, dv) => { // v15: retak di kaca belakang BARU (rearRx, pusat rearY+0,08; vektor ×0,7 supaya muat — setengah tinggi kaca 0,315)
        const l = Math.hypot(du, dv) || 1, pu = -dv / l * 0.014, pv = du / l * 0.014;
        const a = glassPt(0, rearY + 0.08, rearZ, -pu, -pv, -0.045, rearRx);
        const b = glassPt(0, rearY + 0.08, rearZ, du - pu, dv - pv, -0.045, rearRx);
        const c = glassPt(0, rearY + 0.08, rearZ, du + pu, dv + pv, -0.045, rearRx);
        const d = glassPt(0, rearY + 0.08, rearZ, pu, pv, -0.045, rearRx);
        quad(B, a, b, c, d, dir(0, Math.sin(rearRx), -Math.cos(rearRx)),
          [[0, 0], [1, 0], [1, 1], [0, 1]], [0.90, 0.92, 0.96], 4);
      };
      crack(0.22, 0.15); crack(-0.21, 0.11); crack(0.06, -0.24);
      crack(0.20, -0.10); crack(-0.08, -0.21); crack(-0.24, -0.06);
    }
    // VEHICLE-DAMAGE-P1 level 2 (Heavily/Wrecked): jelaga di kap + patch
    // bumper depan gelap. Kap miring 1,14 (cowl) -> 0,99 (hidung); quad
    // diletakkan 0,03-0,04 di atas permukaan (tanpa z-fight, pola strip
    // kap hitam hero) — di bus/apc (bodi kotak, tanpa kap) quad ini
    // jatuh DI DALAM bodi = tidak terlihat, tidak merusak. +4 tris.
    function drawDamageHeavy() {
      // Jelaga kap: quad miring mengikuti kemiringan kap (depan lebih
      // rendah), tepi tidak persegi (sisi depan lebih sempit).
      quadOut(at(-0.42, 1.12, L * 0.26), at(0.42, 1.12, L * 0.26),
        at(0.30, 1.05, L * 0.43), at(-0.30, 1.05, L * 0.43), [0, 1, 0.2], [0.07, 0.06, 0.06], 5);
      // Patch bumper depan: gelap pekat di tengah bumper (di depan muka
      // bumper, bukan menembus) + goresan kedua yang lebih kecil.
      qF(0, 0.45, L / 2 + 0.13, W * 0.5, 0.16, [0.05, 0.05, 0.05], 5);
      qF(-W * 0.2, 0.52, L / 2 + 0.13, W * 0.22, 0.07, [0.09, 0.08, 0.08], 5);
    }
    if (o.damage) drawDamage();
    if (o.heavy) drawDamageHeavy();
    drawFrontLights(0.183); // v15: lampu/grill miring mengikuti bevel hidung
    return finish();
  }

  // ---- bak pickup terbuka (bible §1.6) ----
  function drawPickupBed(bodyTop) {
    p(0, bodyTop - 0.03, -L * 0.28, W * 0.9, 0.08, L * 0.42, DARK, 5);           // lantai bak (v15: -0,03, atas 1,15 = dasar kaca belakang; dulu -0,02 z-fight dengan bahu)
    // Dinding bak + tailgate DIPANJANGKAN ke bawah (v15: bahu v15 berhenti
    // di trunkZ0, jadi dinding harus menutup celah ke flank — bawah 0,99).
    for (const s of [-1, 1]) p(s * (W * 0.46), bodyTop + 0.07, -L * 0.28, 0.06, 0.44, L * 0.42, col, 1); // dinding bak
    p(0, bodyTop + 0.09, -L / 2 - 0.01, W * 0.9, 0.36, 0.06, col, 1);            // tailgate
    qB(0, bodyTop + 0.12, -L / 2 - 0.05, W * 0.7, 0.04, DARK, 5);                // garis tailgate
  }

  // ---- lampu belakang: light bar penuh + bumper + knalpot + plat (bible §1.2) ----
  // v16: sedan (clusters=true) — bar slab PINK v15 MATI; gantinya 2 KLASTER
  // lampu (kiri-kanan, seperti mobil asli) + bar tengah REDUP + wrap ke
  // flank (lampu membelok ke sudut, terbaca dari 3/4). Bus/api/medic/apc
  // tetap pakai bar penuh (realistis untuk kendaraan besar).
  function drawRearLights(clusters) {
    const barY = 0.86;
    // R38 Item 7: gain lampu rem ikut waktu (o.tl dari webgl2.js — langkah
    // sama seperti TITLE_PAL.tlGain di city3d.js: siang 0.12 = nyaris mati,
    // sore/malam 1, pagi 0.45). Default 1 = perilaku lama. Diskalakan ke
    // klaster + bar + glow supaya siang tidak ada halo pink sama sekali.
    const tlGain = o.tl ?? 1;
    const tailCol = (o.brake ? [1.0, 0.25, 0.25] : [0.85, 0.10, 0.13]).map((c) => c * tlGain);
    const tailGlow = [1.0 * tlGain, 0.15 * tlGain, 0.2 * tlGain];
    const tailBar = [0.45 * tlGain, 0.05 * tlGain, 0.08 * tlGain];
    p(0, 0.48, -L / 2 - 0.05, W * 0.68, 0.18, 0.16, DARK, 5);                    // bumper belakang (v16: W*0,68 — ban kebaca di sudut; v15 W*0,84)
    if (clusters) {
      for (const s of [-1, 1]) {
        qB(s * 0.62, barY, -L / 2 - 0.02, 0.68, 0.13, tailCol, 4);               // klaster lampu belakang
        // Wrap sudut: quad miring mengikuti faset A2 (tepi atas masuk,
        // tepi bawah keluar) — lampu membelok ke flank, bukan mengambang.
        quadOut(at(s * (W / 2 + 0.15), 0.93, -L / 2 - 0.02), at(s * (W / 2 + 0.15), 0.93, -L / 2 + 0.30),
          at(s * (W / 2 + 0.21), 0.80, -L / 2 + 0.30), at(s * (W / 2 + 0.21), 0.80, -L / 2 - 0.02),
          [s, 0.3, 0], tailCol, 4);
      }
      qB(0, barY, -L / 2 - 0.02, 0.52, 0.06, tailBar, 4);             // bar tengah redup (penghubung, bukan lampu)
    } else {
      p(0, barY, -L / 2 - 0.03, W * 0.72, 0.15, 0.06, tailCol, 4);               // light bar (kendaraan besar)
    }
    qGlowB(0, barY, -L / 2 - 0.14, W * 0.95, 0.4, tailGlow);
    p(0, barY - 0.1, -L / 2 - 0.03, W * 0.72, 0.04, 0.06, CHROME, 1);            // strip krom bawah lampu
    for (const s of [-1, 1]) {
      p(s * W * 0.32, 0.30, -L / 2 - 0.10, 0.22, 0.14, 0.1, DARK, 5);            // knalpot (v16: lebih besar + keluar)
      p(s * W * 0.32, 0.30, -L / 2 - 0.16, 0.14, 0.10, 0.04, [0.30, 0.30, 0.33], 1); // R36-EXH: ujung knalpot [0,7] kebaca lampu kotak kecil di bawah bumper (probe: cyan) — baja gelap
    }
    qB(0, 0.52, -L / 2 - 0.15, 0.5, 0.14, WHITE, 5);                            // plat nomor
    // Plat BERTEKS (v2): strip biru kiri + 4 bar karakter + bingkai atas/bawah.
    qB(-0.19, 0.52, -L / 2 - 0.16, 0.06, 0.14, [0.15, 0.3, 0.8], 5);
    for (const lx of [-0.10, -0.02, 0.06, 0.14]) qB(lx, 0.52, -L / 2 - 0.16, 0.035, 0.09, DARK, 5);
    qB(0, 0.52 + 0.075, -L / 2 - 0.16, 0.5, 0.015, DARK, 5);
    qB(0, 0.52 - 0.075, -L / 2 - 0.16, 0.5, 0.015, DARK, 5);
  }

  // ---- lampu depan: grill + headlight + DRL (bible §1.4) ----
  // v15: noseRx = kemiringan bevel hidung (0,183 sedan; 0 = bus/api/medic
  // lama). Lampu/grill/DRL = kotak miring (rx=-noseRx) yang duduk DI ATAS
  // bevel (pusat z = bevZ(y)+0,03) — bukan lagi kotak tegak yang menembus.
  function drawFrontLights(noseRx = 0) {
    // Muka depan datar (bus/api/medic, noseRx=0): bevel = muka L/2;
    // sedan: bevel miring — kotak duduk DI ATAS bevel, bukan melayang.
    const bevZ = (y) => noseRx ? L / 2 + (0.99 - y) * 0.10 / 0.54 : L / 2;
    const pitched = (lx, y, w, h, colM, m) => {
      const z = bevZ(y) + 0.03;
      p(lx, y, z, w, h, 0.06, colM, m, -noseRx);
    };
    pitched(0, 0.68, W * 0.6, 0.16, DARK, 5);                                    // grill
    if (spec.kind === 'sedan') {
      // R36V2-CHROME: bilah krom melintang di grill (Accord) — quad di
      // bidang bevel, 0,015 di depan muka grill (2 tris).
      quadOut(at(-W * 0.30, 0.655, bevZ(0.655) + 0.075), at(W * 0.30, 0.655, bevZ(0.655) + 0.075),
        at(W * 0.30, 0.705, bevZ(0.705) + 0.075), at(-W * 0.30, 0.705, bevZ(0.705) + 0.075), [0, 0.9, 0.4], CHROME, 1);
    }
    // VEHICLE-DAMAGE-P1: lampu pecah — Heavily: satu sisi (kiri, s<0)
    // gelap + DRL-nya mati; Wrecked: kedua sisi mati (tidak ada cahaya).
    const lampDead = (s) => o.wreck || (o.heavy && s < 0);
    for (const s of [-1, 1]) {
      pitched(s * W * 0.3, 0.82, 0.55, 0.16, lampDead(s) ? [0.10, 0.09, 0.09] : HEADLIGHT, 4); // headlight (v16: lebih besar — 0,45->0,55, 0,13->0,16)
      if (hi && !lampDead(s)) pitched(s * W * 0.3, 0.60, 0.55, 0.05, [1.0, 0.95, 0.8], 4); // DRL
    }
    if (spec.kind === 'sport' && hi) {
      // R36V2-HERO-LED: strip LED diagonal tajam di atas headlight
      // (Huracan Y-LED — low-poly: satu diagonal per sisi, putih mat 4,
      // 0,015 di depan muka headlight; 4 tris).
      for (const s of [-1, 1]) {
        const y0 = 0.76, y1 = 0.90, x0 = s * W * 0.14, x1 = s * W * 0.44, hw = 0.028;
        quadOut(at(x0, y0 - hw, bevZ(y0) + 0.075), at(x1, y1 - hw, bevZ(y1) + 0.075),
          at(x1, y1 + hw, bevZ(y1) + 0.075), at(x0, y0 + hw, bevZ(y0) + 0.075), [0, 0.9, 0.4], [1.0, 0.98, 0.9], 4);
      }
    }
    p(0, 0.45, L / 2 + 0.05, W * 0.72, 0.2, 0.14, DARK, 5);                      // bumper depan (v16: W*0,72 — ban depan kebaca; v15 W*0,88)
  }

  function finish() {
    return (B.i.length + G.i.length) / 3 - tri0;
  }
}
