// interiors.js — R41 Worker C: pintu berayun + interior berfurnitur.
// Juna (18:15 WIB): (1) ANIMASI pintu membuka/menutup saat Jax masuk gedung
// (pintu BERAYUN, bukan teleport / bukan pintu yang hilang); (2) ruangan dalam
// gedung TIDAK BOLEH polos — interior ada isinya sesuai jenis gedung.
//
// Dimuat via dynamic import dari webgl2.js (pola post-cut, sama seperti
// onfoot.js Worker A): 0 byte dossier — scanner dossier hanya membaca static
// import, dan `import('./interiors.js')` eksplisit dilewati (vendor
// makefun-game.ts sourceImports: `import(` -> continue).
//
// GEDUNG YANG BISA DIMASUKI (dipilih runtime dari city.js, deterministik per
// seed — BUKAN koordinat hardcode, karena rect gedung hasil RNG):
//   shop    "Harbor Market" — gedung penuh terdekat ke blok (640,640)
//   cafe    "Neon Café"     — gedung penuh terdekat ke blok (1280,320)
//   hideout "Jax Hideout"   — gedung penuh terdekat ke blok (640,1600)
//   casino  landmark casino (gedung terdekat ke (1440,800), apa pun ukurannya)
// Aturan pilih: gedung penuh (w,h >= 150px) terdekat ke anchor dalam 520px;
// kalau tidak ada, gedung terdekat apa pun. TROTOAR: blok besar menyusut
// 200->160, jadi ambang ikut turun (180->150) — kalau tetap 180, TIDAK ADA
// gedung yang lolos dan shop/cafe/hideout jatuh ke gedung kecil 72px
// (inner 52px, su 0.45) padahal gedung besar 160px tersedia (inner 140px,
// su 0.7 = layout penuh, guard sumbu pintu tidak terpicu). Lighthouse
// (44x44) DICORET — terlalu kecil untuk interior; gas station DICORET —
// bukan gedung; semua gedung lain DICORET — hanya 4 kunci ini yang bisa
// dimasuki.
// Pintu: di sisi gedung yang paling dekat ke jalan (tie-break S,W,N,E),
// di tengah sisi itu (aman dari chamfer sudut). Interior diskalakan ke ukuran
// gedung (kasino 102px di seed tertentu tetap dapat interior, versi ringkas).
//
// ANTARMUKA (untuk koordinator — gabung patch A + C tanpa tabrakan):
//   webgl2.js (hook, dossier-neutral — lihat bawah file):
//     loader: let INT=null; import('./interiors.js').then(m=>{INT=m;window.__INT=m;}).catch(()=>{});
//     render():            if (INT) INT.update(state, dt);        // sebelum buildFrame
//     buildFrame loop gedung: if (INT && INT.hideShell(state, b)) { bi++; continue; }
//     setelah loop gedung:  if (INT) INT.draw(state, OP, GL, t, { boxR, box, flat });
//   city.js collides() (hook 3 baris, dossier-neutral):
//     const G = (typeof window !== 'undefined') ? window.__INT : null;
//     if (G) { const v = G.collide(city, x, y, r); if (v !== null) return v; }
//     (diletakkan SETELAH cek bounds/air, SEBELUM buildingAt — lihat collide()).
//     Efek: walkPlayer (world.js, moveCircle) TIDAK BERUBAH — Jax lewat pintu
//     karena collides() sendiri yang memberi celah di koridor pintu saat pintu
//     terbuka. Logika mobil R34 tidak tersentuh (mobil tidak pakai collides()).
//   Worker A (onfoot.js): TIDAK PERLU berubah. Yang dibaca dari sini:
//     state.player.insideId — id gedung ('shop'|'cafe'|'hideout'|'casino')
//       saat Jax di dalam, null kalau di luar (ditulis update() tiap frame).
//     state.onfoot.active (milik A) TIDAK dibaca di sini; pintu merespons
//     Jax jalan kaki = !inCar && !inBoat && !inPlane (atau player.onFoot
//     eksplisit bila A nanti menyetelnya). Pintu TIDAK berayun saat mobil
//     lewat — trigger hanya untuk pejalan kaki.
//   Verifikasi/debug: setDoorAngle(id, rad) (pin sudut pintu — update()
//     tidak melawannya sampai unpinDoor(id)); enterables(state) ringkasan.
//   TIDAK termasuk: misi/combat/NPC di dalam gedung (round lanjutan).
//
// CATATAN BATAS (jujur): interior hanya dirender di jalur WebGL2 (chase-cam).
// Di 2D top-down (V) webgl2.js tidak jalan -> pintu tidak berayun dan Jax
// tidak bisa masuk (gedung tetap solid seperti hari ini). NPC pejalan kaki
// tidak masuk gedung (mereka tidak memakai interiorCollides; paling jauh
// mereka menyenggol koridor pintu saat pintu terbuka, lalu meluncur pergi
// menyusuri dinding seperti biasa).

const S = 0.1; // game px -> unit WebGL (sama seperti webgl2.js)
export const TRIGGER_PX = 120; // jarak Jax ke pintu -> pintu mulai membuka
export const DOOR_W_PX = 26; // lebar pintu (px) = 2.6 unit
export const DOOR_OPEN_RAD = 1.9; // ayunan penuh ~109 derajat
const WALL_INSET_PX = 10; // dinding interior ke dalam dari fasad
const OPEN_RATE = 3.4; // rad/detik membuka (~0,55 dtk)
const CLOSE_RATE = 2.4; // rad/detik menutup
const CROSS_PX = 55; // jarak ke pintu -> cangkang gedung disembunyikan
const DOOR_HALF = DOOR_W_PX / 2;

const KINDS = {
  shop: {
    label: 'Harbor Market', anchor: [640, 640],
    floor: [0.42, 0.30, 0.18], wall: [0.78, 0.70, 0.58], sign: [1.0, 0.82, 0.25],
    doorCol: [0.30, 0.20, 0.12],
  },
  cafe: {
    label: 'Neon Café', anchor: [1280, 320],
    floor: [0.30, 0.20, 0.14], wall: [0.72, 0.55, 0.42], sign: [1.0, 0.30, 0.60],
    doorCol: [0.20, 0.14, 0.10],
  },
  hideout: {
    label: 'Jax Hideout', anchor: [640, 1600],
    floor: [0.22, 0.22, 0.24], wall: [0.35, 0.38, 0.30], sign: [0.22, 0.88, 0.90],
    doorCol: [0.18, 0.22, 0.18],
  },
  casino: {
    label: 'Golden Harbor Casino', anchor: [1440, 800],
    floor: [0.35, 0.10, 0.14], wall: [0.30, 0.16, 0.38], sign: [1.0, 0.82, 0.25],
    doorCol: [0.12, 0.10, 0.16],
  },
};

// Furnitur per jenis: [fx, fz, w, d, h, y0, [r,g,b], material, solid]
// Layout digambar di ruang "pintu-di-selatan" lalu diputar ke sisi pintu
// nyata (S as-is, N 180der, E/W 90der) supaya jalan masuk tidak tertutup.
const LAYOUTS = {
  shop: [
    [0.28, 0.30, 7.0, 1.1, 1.7, 0, [0.45, 0.32, 0.18], 5, 1], // rak 1
    [0.20, 0.30, 0.9, 0.9, 0.5, 1.7, [0.90, 0.30, 0.30], 5, 0], // barang
    [0.28, 0.30, 0.9, 0.9, 0.5, 1.7, [0.30, 0.75, 0.30], 5, 0],
    [0.36, 0.30, 0.9, 0.9, 0.5, 1.7, [1.00, 0.82, 0.25], 5, 0],
    [0.72, 0.30, 7.0, 1.1, 1.7, 0, [0.45, 0.32, 0.18], 5, 1], // rak 2
    [0.64, 0.30, 0.9, 0.9, 0.5, 1.7, [0.22, 0.88, 0.90], 5, 0],
    [0.72, 0.30, 0.9, 0.9, 0.5, 1.7, [0.90, 0.30, 0.55], 5, 0],
    [0.80, 0.30, 0.9, 0.9, 0.5, 1.7, [0.30, 0.75, 0.30], 5, 0],
    [0.80, 0.78, 3.4, 1.3, 1.1, 0, [0.25, 0.22, 0.28], 5, 1], // kasir
    [0.80, 0.78, 0.8, 0.8, 0.6, 1.1, [0.15, 0.15, 0.18], 5, 0], // mesin kasir
    [0.14, 0.82, 1.5, 1.5, 1.0, 0, [0.55, 0.42, 0.22], 5, 1], // peti
    [0.15, 0.64, 1.2, 1.2, 0.8, 0, [0.55, 0.42, 0.22], 5, 1], // peti 2
    [0.50, 0.50, 0.7, 0.7, 0.25, 2.55, [1.0, 0.85, 0.50], 4, 0], // lampu
  ],
  cafe: [
    [0.50, 0.10, 8.5, 1.3, 1.15, 0, [0.35, 0.25, 0.18], 5, 1], // counter
    [0.28, 0.075, 2.8, 0.18, 1.5, 1.15, [1.0, 0.80, 0.40], 4, 0], // papan menu
    [0.28, 0.45, 1.8, 1.8, 0.14, 0.85, [0.60, 0.45, 0.30], 5, 0], // meja 1
    [0.28, 0.45, 1.8, 1.8, 0.85, 0, [0.30, 0.22, 0.16], 5, 1],
    [0.72, 0.45, 1.8, 1.8, 0.14, 0.85, [0.60, 0.45, 0.30], 5, 0], // meja 2
    [0.72, 0.45, 1.8, 1.8, 0.85, 0, [0.30, 0.22, 0.16], 5, 1],
    [0.50, 0.28, 1.8, 1.8, 0.14, 0.85, [0.60, 0.45, 0.30], 5, 0], // meja 3 (dekat counter — sumbu pintu tetap kosong)
    [0.50, 0.28, 1.8, 1.8, 0.85, 0, [0.30, 0.22, 0.16], 5, 1],
    [0.28, 0.32, 0.6, 0.6, 0.55, 0, [0.50, 0.30, 0.25], 5, 1], // kursi
    [0.28, 0.58, 0.6, 0.6, 0.55, 0, [0.50, 0.30, 0.25], 5, 1],
    [0.72, 0.32, 0.6, 0.6, 0.55, 0, [0.50, 0.30, 0.25], 5, 1],
    [0.72, 0.58, 0.6, 0.6, 0.55, 0, [0.50, 0.30, 0.25], 5, 1],
    [0.36, 0.28, 0.6, 0.6, 0.55, 0, [0.50, 0.30, 0.25], 5, 1],
    [0.64, 0.28, 0.6, 0.6, 0.55, 0, [0.50, 0.30, 0.25], 5, 1],
    [0.28, 0.45, 0.5, 0.5, 0.20, 2.50, [1.0, 0.75, 0.40], 4, 0], // lampu gantung
    [0.72, 0.45, 0.5, 0.5, 0.20, 2.50, [1.0, 0.75, 0.40], 4, 0],
    [0.50, 0.28, 0.5, 0.5, 0.20, 2.50, [1.0, 0.75, 0.40], 4, 0],
  ],
  hideout: [
    [0.50, 0.38, 4.4, 2.1, 1.0, 0, [0.40, 0.32, 0.22], 5, 1], // meja rencana
    [0.42, 0.35, 0.9, 0.6, 0.06, 1.0, [0.92, 0.90, 0.85], 5, 0], // kertas
    [0.55, 0.42, 0.9, 0.6, 0.06, 1.0, [0.92, 0.90, 0.85], 5, 0],
    [0.50, 0.32, 0.9, 0.6, 0.06, 1.0, [0.85, 0.88, 0.92], 5, 0],
    [0.50, 0.055, 4.6, 0.22, 2.0, 1.2, [0.20, 0.22, 0.28], 5, 0], // papan pin
    [0.32, 0.055, 0.16, 0.16, 0.16, 1.5, [1.0, 0.30, 0.30], 4, 0], // pin
    [0.45, 0.055, 0.16, 0.16, 0.16, 1.9, [1.0, 0.85, 0.30], 4, 0],
    [0.58, 0.055, 0.16, 0.16, 0.16, 1.6, [0.30, 0.90, 0.90], 4, 0],
    [0.68, 0.055, 0.16, 0.16, 0.16, 2.1, [1.0, 0.30, 0.55], 4, 0],
    [0.13, 0.70, 1.7, 3.4, 0.9, 0, [0.45, 0.12, 0.14], 5, 1], // sofa
    [0.075, 0.70, 0.5, 3.4, 1.3, 0, [0.40, 0.10, 0.12], 5, 0], // sandaran sofa
    [0.87, 0.68, 1.3, 3.2, 1.9, 0, [0.35, 0.28, 0.20], 5, 1], // rak senjata
    [0.87, 0.60, 0.7, 0.7, 0.5, 1.9, [0.55, 0.55, 0.60], 5, 0], // kotak di rak
    [0.50, 0.50, 0.6, 0.6, 0.25, 2.55, [1.0, 0.80, 0.45], 4, 0], // lampu
    [0.50, 0.62, 3.6, 2.6, 0.07, 0.02, [0.35, 0.10, 0.12], 5, 0], // karpet
  ],
  casino: [
    [0.30, 0.38, 3.0, 1.7, 1.0, 0, [0.25, 0.20, 0.30], 5, 1], // meja judi 1
    [0.30, 0.38, 2.7, 1.4, 0.08, 1.0, [0.10, 0.45, 0.20], 5, 0], // taplak hijau
    [0.70, 0.38, 3.0, 1.7, 1.0, 0, [0.25, 0.20, 0.30], 5, 1], // meja judi 2
    [0.70, 0.38, 2.7, 1.4, 0.08, 1.0, [0.10, 0.45, 0.20], 5, 0],
    [0.20, 0.88, 1.15, 0.95, 1.9, 0, [0.16, 0.14, 0.20], 5, 1], // slot 1 (flank pintu — sumbu masuk kosong)
    [0.20, 0.88, 0.5, 0.5, 0.30, 1.9, [1.0, 0.80, 0.30], 4, 0], // lampu slot
    [0.32, 0.88, 1.15, 0.95, 1.9, 0, [0.16, 0.14, 0.20], 5, 1], // slot 2
    [0.32, 0.88, 0.5, 0.5, 0.30, 1.9, [1.0, 0.80, 0.30], 4, 0],
    [0.68, 0.88, 1.15, 0.95, 1.9, 0, [0.16, 0.14, 0.20], 5, 1], // slot 3
    [0.68, 0.88, 0.5, 0.5, 0.30, 1.9, [1.0, 0.80, 0.30], 4, 0],
    [0.80, 0.88, 1.15, 0.95, 1.9, 0, [0.16, 0.14, 0.20], 5, 1], // slot 4
    [0.80, 0.88, 0.5, 0.5, 0.30, 1.9, [1.0, 0.80, 0.30], 4, 0],
    [0.50, 0.12, 6.6, 1.4, 1.2, 0, [0.30, 0.20, 0.15], 5, 1], // bar (dinding jauh — tidak menghadang pintu)
    [0.38, 0.12, 0.3, 0.3, 0.5, 1.2, [0.30, 0.90, 0.30], 4, 0], // botol
    [0.50, 0.12, 0.3, 0.3, 0.6, 1.2, [1.0, 0.30, 0.30], 4, 0],
    [0.62, 0.12, 0.3, 0.3, 0.5, 1.2, [1.0, 0.80, 0.30], 4, 0],
    [0.50, 0.55, 7.0, 4.5, 0.07, 0.02, [0.50, 0.10, 0.14], 5, 0], // karpet
    [0.50, 0.50, 1.1, 1.1, 0.30, 2.50, [1.0, 0.85, 0.40], 4, 0], // lampu gantung
  ],
};

// Layout ringkas (gedung kecil, su < 0,7 — sejauh ini hanya kasino yang bisa
// sekecil ini, karena kasino = landmark apa pun ukurannya): furnitur menempel
// dinding, TANPA meja tengah (di ruangan 82px, satu meja di tengah + radius
// Jax 14px = jalur masuk tertutup); sumbu pintu dan jalan keliling ruangan
// dijamin kosong.
const LAYOUTS_COMPACT = {
  casino: [
    [0.15, 0.88, 1.15, 0.95, 1.9, 0, [0.16, 0.14, 0.20], 5, 1], // slot (flank pintu)
    [0.15, 0.88, 0.5, 0.5, 0.30, 1.9, [1.0, 0.80, 0.30], 4, 0],
    [0.85, 0.88, 1.15, 0.95, 1.9, 0, [0.16, 0.14, 0.20], 5, 1],
    [0.85, 0.88, 0.5, 0.5, 0.30, 1.9, [1.0, 0.80, 0.30], 4, 0],
    [0.50, 0.12, 6.6, 1.4, 1.2, 0, [0.30, 0.20, 0.15], 5, 1], // bar
    [0.38, 0.12, 0.3, 0.3, 0.5, 1.2, [0.30, 0.90, 0.30], 4, 0],
    [0.50, 0.12, 0.3, 0.3, 0.6, 1.2, [1.0, 0.30, 0.30], 4, 0],
    [0.62, 0.12, 0.3, 0.3, 0.5, 1.2, [1.0, 0.80, 0.30], 4, 0],
    [0.50, 0.55, 7.0, 4.5, 0.07, 0.02, [0.50, 0.10, 0.14], 5, 0], // karpet
    [0.50, 0.50, 1.1, 1.1, 0.30, 2.50, [1.0, 0.85, 0.40], 4, 0], // lampu gantung
  ],
};

const cache = new WeakMap(); // city object -> enterables[]
const byBuilding = new WeakMap(); // building object -> enterable

function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

// Sisi gedung yang paling dekat ke jalan (jarak fasad ke garis jalan
// terdekat di luar gedung). Tie-break: S, W, N, E — deterministik.
function doorSide(b, city) {
  const gaps = { S: 1e9, W: 1e9, N: 1e9, E: 1e9 };
  for (const rx of city.roadsV) {
    if (rx < b.x) gaps.W = Math.min(gaps.W, b.x - rx);
    if (rx > b.x + b.w) gaps.E = Math.min(gaps.E, rx - (b.x + b.w));
  }
  for (const ry of city.roadsH) {
    if (ry < b.y) gaps.N = Math.min(gaps.N, b.y - ry);
    if (ry > b.y + b.h) gaps.S = Math.min(gaps.S, ry - (b.y + b.h));
  }
  let best = 'S';
  for (const s of ['W', 'N', 'E']) if (gaps[s] < gaps[best]) best = s;
  return best;
}

// Putar layout "pintu-di-selatan" ke sisi pintu nyata. (fx,fz) fraksi interior.
function rotLayout(side, fx, fz, w, d) {
  if (side === 'S') return [fx, fz, w, d];
  if (side === 'N') return [1 - fx, 1 - fz, w, d];
  if (side === 'E') return [fz, 1 - fx, d, w];
  return [1 - fz, fx, d, w]; // 'W'
}

function buildEnterable(id, kind, b, city) {
  const def = KINDS[kind];
  const side = doorSide(b, city);
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  // Pusat pintu di tengah sisi + engsel di ujung pintu (searah dinding).
  let dx, dy, ux, uy, nx, ny;
  if (side === 'S') { dx = cx; dy = b.y + b.h; ux = 1; uy = 0; nx = 0; ny = 1; }
  else if (side === 'N') { dx = cx; dy = b.y; ux = 1; uy = 0; nx = 0; ny = -1; }
  else if (side === 'E') { dx = b.x + b.w; dy = cy; ux = 0; uy = 1; nx = 1; ny = 0; }
  else { dx = b.x; dy = cy; ux = 0; uy = 1; nx = -1; ny = 0; }
  const yaw0 = (side === 'S' || side === 'N') ? 0 : -Math.PI / 2;
  const swing = (side === 'S' || side === 'W') ? -1 : 1;
  const inner = {
    x: b.x + WALL_INSET_PX, y: b.y + WALL_INSET_PX,
    w: b.w - WALL_INSET_PX * 2, h: b.h - WALL_INSET_PX * 2,
  };
  // Skala furnitur ikut ukuran interior (gedung penuh 200px -> 1.0).
  const su = clamp(Math.min(inner.w, inner.h) / 200, 0.45, 1);
  const compact = su < 0.7 && !!LAYOUTS_COMPACT[kind];
  const layout = compact ? LAYOUTS_COMPACT[kind] : LAYOUTS[kind];
  const items = [];
  const solids = [];
  for (const it of layout) {
    const [fx0, fz0, w0, d0, h, y0, col, mat, solid] = it;
    // Pengaman ruangan kecil (layout penuh di gedung setengah blok): buang
    // furnitur yang menutup sumbu pintu — Jax harus selalu bisa masuk.
    if (!compact && su < 0.7 && Math.abs(fx0 - 0.5) < 0.20 && fz0 > 0.55) continue;
    const [fx, fz, w, d] = rotLayout(side, fx0, fz0, w0, d0);
    const px = inner.x + fx * inner.w;
    const py = inner.y + fz * inner.h;
    const wu = w * su, du = d * su;
    items.push({ x: px, y: py, w: wu, d: du, h, y0, col, mat });
    if (solid) {
      solids.push({
        x: px - (wu / S) / 2, y: py - (du / S) / 2,
        w: wu / S, h: du / S,
      });
    }
  }
  const ent = {
    id, kind, label: def.label, b, side,
    door: {
      x: dx, y: dy, hx: dx - ux * DOOR_HALF, hy: dy - uy * DOOR_HALF,
      ux, uy, nx, ny, yaw0, swing,
    },
    inner, items, solids, su,
    floor: def.floor, wall: def.wall, sign: def.sign, doorCol: def.doorCol,
    angle: 0, open: false, pinned: false,
  };
  byBuilding.set(b, ent);
  return ent;
}

function pickNear(city, ax, ay, excludeLandmarks) {
  let best = null, bestD = Infinity, bestBig = null, bestBigD = Infinity;
  for (const b of city.buildings) {
    if (excludeLandmarks && b.landmark) continue;
    const d = dist(b.x + b.w / 2, b.y + b.h / 2, ax, ay);
    if (d < bestD) { bestD = d; best = b; }
    if (b.w >= 150 && b.h >= 150 && d < 520 && d < bestBigD) { bestBigD = d; bestBig = b; }
  }
  return bestBig || best;
}

export function getEnterables(state) {
  const city = state.city;
  if (!city) return [];
  const hit = cache.get(city);
  if (hit) return hit;
  const list = [];
  const used = new Set();
  const cas = city.buildings.find((b) => b.landmark === 'casino');
  if (cas) { list.push(buildEnterable('casino', 'casino', cas, city)); used.add(cas); }
  for (const kind of ['shop', 'cafe', 'hideout']) {
    const def = KINDS[kind];
    let b = pickNear(city, def.anchor[0], def.anchor[1], true);
    if (b && used.has(b)) b = null;
    if (!b) continue;
    // Jangan pakai gedung yang sudah dipakai jenis lain.
    if (list.some((e) => e.b === b)) continue;
    used.add(b);
    list.push(buildEnterable(kind, kind, b, city));
  }
  cache.set(city, list);
  return list;
}

export function enterables(state) {
  return getEnterables(state).map((e) => ({
    id: e.id, kind: e.kind, label: e.label, side: e.side,
    building: { x: e.b.x, y: e.b.y, w: e.b.w, h: e.b.h },
    door: { x: e.door.x, y: e.door.y },
    inner: { x: e.inner.x, y: e.inner.y, w: e.inner.w, h: e.inner.h },
    angle: +e.angle.toFixed(3), open: e.open, solids: e.solids.length,
    items: e.items.length,
  }));
}

export function enterableAt(state, x, y) {
  for (const e of getEnterables(state)) {
    const b = e.b;
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return e;
  }
  return null;
}

function isOnFoot(p) {
  if (!p) return false;
  if (p.onFoot !== undefined) return !!p.onFoot;
  return !p.inCar && !p.inBoat && !p.inPlane;
}

// Koridor pintu: strip selebar pintu menembus bidang dinding.
// out = jarak bertanda ke luar dari bidang dinding (positif = di luar gedung).
function corridor(e, x, y) {
  const d = e.door;
  const along = (x - d.x) * d.ux + (y - d.y) * d.uy;
  const out = (x - d.x) * d.nx + (y - d.y) * d.ny;
  if (Math.abs(along) > DOOR_HALF + 2) return null;
  // Ke dalam hanya 26px (pita dinding 10px + radius Jax 14px + margin) —
  // LEBIH DALAM dari itu koridor akan menembus furnitur di dekat pintu.
  if (out < -26 || out > 32) return null;
  return { along, out };
}

// Celah pintu boleh dilewati: pintu sudah berayun terbuka, ATAU titiknya sudah
// di sisi dalam (keluar gedung selalu boleh — Jax tidak boleh terkunci di dalam).
export function gapPass(e, x, y) {
  const c = corridor(e, x, y);
  if (!c) return false;
  return e.angle > 0.35 || c.out < 0;
}

export function doorGapAllows(state, x, y) {
  for (const e of getEnterables(state)) if (gapPass(e, x, y)) return true;
  return false;
}

function solidHit(e, x, y, r) {
  for (const s of e.solids) {
    if (x > s.x - r && x < s.x + s.w + r && y > s.y - r && y < s.y + s.h + r) return true;
  }
  return false;
}

function interiorCollides(e, x, y, r) {
  const I = e.inner;
  const c = corridor(e, x, y);
  // Koridor membuka dinding sisi pintu HANYA untuk titik yang sudah di sisi
  // dalam (out < 0 — Jax sedang keluar). Titik tepat di bidang dinding /
  // di luar dengan pintu tertutup tetap tertahan dinding (kalau tidak, Jax
  // bisa berdiri DI DALAM dinding saat pintu tertutup).
  const pass = c && c.out < 0;
  // Dinding dalam menahan Jax; koridor pintu membuka HANYA dinding sisi pintu.
  const wallHit = (() => {
    if (!pass) {
      return x < I.x + r || x > I.x + I.w - r || y < I.y + r || y > I.y + I.h - r;
    }
    if (e.side === 'S') return x < I.x + r || x > I.x + I.w - r || y < I.y + r;
    if (e.side === 'N') return x < I.x + r || x > I.x + I.w - r || y > I.y + I.h - r;
    if (e.side === 'E') return y < I.y + r || y > I.y + I.h - r || x < I.x + r;
    return y < I.y + r || y > I.y + I.h - r || x > I.x + I.w - r; // 'W'
  })();
  if (wallHit) return true;
  return solidHit(e, x, y, r);
}

// Jawaban untuk collides() di city.js: null = "bukan gedung enterable,
// pakai logika default"; true/false = jawaban final untuk gedung ini.
export function collide(city, x, y, r) {
  let b = null;
  for (const bb of city.buildings) {
    if (x > bb.x - r && x < bb.x + bb.w + r && y > bb.y - r && y < bb.y + bb.h + r) { b = bb; break; }
  }
  if (!b) return null;
  const e = byBuilding.get(b);
  if (!e) {
    // Gedung enterable belum dihitung untuk city ini (cache kosong karena
    // getEnterables belum dipanggil) — hitung dulu, lalu cek lagi.
    if (!cache.get(city)) getEnterables({ city });
    const e2 = byBuilding.get(b);
    if (!e2) return null;
    return collideFor(e2, x, y, r);
  }
  return collideFor(e, x, y, r);
}

function collideFor(e, x, y, r) {
  // Celah pintu boleh dilewati — TAPI furnitur tetap solid bahkan di koridor
  // (pertahanan kedua kalau ada furnitur yang tumpang tindih dengan koridor).
  if (gapPass(e, x, y) && !solidHit(e, x, y, r)) return false;
  const I = e.inner;
  if (x > I.x - r && x < I.x + I.w + r && y > I.y - r && y < I.y + I.h + r) {
    return interiorCollides(e, x, y, r);
  }
  return true; // di pita dinding luar / menabrak fasad di luar koridor
}

// Cangkang gedung disembunyikan saat Jax di dalam / sedang melangkah lewat
// pintu — kalau tidak, dinding menutupi interior dari kamera chase-cam.
// (Cull kamera <12 unit yang sudah ada menutupi sebagian kasus ini; hook ini
// yang membuatnya deterministik, tanpa kedip di ambang 12 unit.)
export function hideShell(state, b) {
  const e = byBuilding.get(b);
  if (!e) {
    if (!cache.get(state.city)) getEnterables(state);
    const e2 = byBuilding.get(b);
    if (!e2) return false;
    return hideShellFor(e2, state);
  }
  return hideShellFor(e, state);
}

function hideShellFor(e, state) {
  const p = state.player;
  if (!p) return false;
  if (enterableAt(state, p.x, p.y) === e) return true;
  return dist(p.x, p.y, e.door.x, e.door.y) < CROSS_PX;
}

export function update(state, dt) {
  const p = state.player;
  if (!p) return;
  const list = getEnterables(state);
  const onFoot = isOnFoot(p);
  let insideId = null;
  let nearDoorId = null;
  let nearD = Infinity;
  for (const e of list) {
    const d = dist(p.x, p.y, e.door.x, e.door.y);
    const inside = enterableAt(state, p.x, p.y) === e;
    if (inside) insideId = e.id;
    if (d < nearD) { nearD = d; nearDoorId = e.id; }
    const target = (onFoot && (d < TRIGGER_PX || inside)) ? DOOR_OPEN_RAD : 0;
    if (!e.pinned) {
      const rate = target > e.angle ? OPEN_RATE : CLOSE_RATE;
      e.angle += clamp(target - e.angle, -rate * dt, rate * dt);
    }
    e.open = e.angle > 0.35;
  }
  p.insideId = insideId;
  p.nearDoorId = nearD < TRIGGER_PX ? nearDoorId : null;
}

// Pin sudut pintu (untuk staging shot / tes): update() tidak melawannya.
export function setDoorAngle(state, id, angle) {
  const e = getEnterables(state).find((x) => x.id === id);
  if (!e) return false;
  e.angle = clamp(angle, 0, DOOR_OPEN_RAD);
  e.open = e.angle > 0.35;
  e.pinned = true;
  return true;
}
export function unpinDoor(state, id) {
  const e = getEnterables(state).find((x) => x.id === id);
  if (!e) return false;
  e.pinned = false;
  return true;
}

// ---- Gambar (WebGL2, bucket yang sama seperti webgl2.js) ----
// api: { boxR, box, flat } dari webgl2.js; OP = bucket opaque, GL = glow.
// Pintu + kusen + papan nama digambar kalau hero dekat; interior HANYA saat
// cangkang disembunyikan (Jax di dalam / melintas pintu) — hemat tris.
export function draw(state, OP, GL, t, api) {
  const list = getEnterables(state);
  const p = state.player;
  const hx0 = p ? p.x : 0, hy0 = p ? p.y : 0;
  for (const e of list) {
    const d = e.door;
    if (dist(hx0, hy0, d.x, d.y) > 600 && !hideShellFor(e, state)) continue;
    // Saat Jax DI DALAM gedung, kamera chase duduk di luar dinding (13 unit
    // di belakang Jax) — kusen + papan nama eksterior (3,6 unit, di atas
    // dinding dollhouse 2,6) menutupi ruangan dan menyembunyikan Jax yang
    // tepat di sumbu pintu. Jadi saat inside: hanya panel + keset yang
    // digambar; kusen/lintel/papan nama muncul lagi begitu Jax keluar.
    drawDoor(e, OP, GL, api, p && p.insideId === e.id);
    if (hideShellFor(e, state)) drawInterior(e, OP, api);
  }
}

function drawDoor(e, OP, GL, api, inside) {
  const d = e.door;
  const S2 = S;
  // Kusen: 2 tiang + ambang atas, sedikit menonjol dari fasad.
  // (Disembunyikan saat Jax di dalam — lihat draw() di atas.)
  const px = d.x * S2, pz = d.y * S2;
  const nx = d.nx, nz = d.ny; // normal fasad dalam (x,z)
  const ux = d.ux, uz = d.uy; // arah dinding dalam (x,z)
  const out = 0.14; // tonjolan dari bidang fasad (hindari z-fight)
  if (!inside) {
    const post = (s) => {
      api.box(OP, px + ux * s * (DOOR_HALF + 0.15) * S2 + nx * out, 1.45, pz + uz * s * (DOOR_HALF + 0.15) * S2 + nz * out,
        0.30, 2.9, 0.30, [0.12, 0.11, 0.13], 5);
    };
    post(-1); post(1);
    // Ambang atas (lintel) sepanjang kusen.
    const lw = (DOOR_W_PX + 0.9) * S2;
    const lcx = px + nx * out, lcz = pz + nz * out;
    if (d.ux !== 0) api.box(OP, lcx, 2.85, lcz, lw, 0.45, 0.35, [0.12, 0.11, 0.13], 5);
    else api.box(OP, lcx, 2.85, lcz, 0.35, 0.45, lw, [0.12, 0.11, 0.13], 5);
    // Papan nama di atas pintu (emissive — menyala malam).
    const sw = 3.6;
    if (d.ux !== 0) api.box(OP, px + nx * 0.22, 3.55, pz + nz * 0.22, sw, 0.8, 0.16, e.sign, 4);
    else api.box(OP, px + nx * 0.22, 3.55, pz + nz * 0.22, 0.16, 0.8, sw, e.sign, 4);
  }
  // Keset di depan pintu.
  const mx = px + nx * 1.3, mz = pz + nz * 1.3;
  api.flat(OP, mx, 0.04, mz, d.ux !== 0 ? 3.0 : 1.6, d.ux !== 0 ? 1.6 : 3.0, [0.20, 0.16, 0.14], 5);
  // Daun pintu: berayun di engsel (gerak benda tegar — pusat panel = engsel
  // + vektor-tutup yang diputar sebesar ayunan; konvensi rotasi sama dengan
  // boxR: (vx,vz) -> (vx*cosA + vz*sinA, -vx*sinA + vz*cosA)).
  const ry = d.yaw0 + d.swing * e.angle;
  const rotXZ = (vx, vz, a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return [vx * c + vz * s, -vx * s + vz * c];
  };
  const v0 = [
    (d.ux * (DOOR_W_PX / 2) + d.nx * 0.15) * S2,
    (d.uy * (DOOR_W_PX / 2) + d.ny * 0.15) * S2,
  ];
  const [ocx, ocz] = rotXZ(v0[0], v0[1], d.swing * e.angle);
  api.boxR(OP, d.hx * S2 + ocx, 1.30, d.hy * S2 + ocz, DOOR_W_PX * S2, 2.6, 0.18, ry, 0, e.doorCol, 5);
  // Gagang menembus kedua sisi panel (lebih tebal dari daun) — tidak perlu
  // tahu sisi luar/dalam, dan tetap menempel saat pintu berayun.
  const v0h = [
    (d.ux * (DOOR_W_PX / 2 - 0.35)) * S2,
    (d.uy * (DOOR_W_PX / 2 - 0.35)) * S2,
  ];
  const [ghx, ghz] = rotXZ(v0h[0], v0h[1], d.swing * e.angle);
  api.boxR(OP, d.hx * S2 + ghx, 1.10, d.hy * S2 + ghz, 0.12, 0.30, 0.34, ry, 0, [1.0, 0.82, 0.25], 4);
}

function drawInterior(e, OP, api) {
  const I = e.inner;
  const cx = (I.x + I.w / 2) * S, cz = (I.y + I.h / 2) * S;
  const wu = I.w * S, du = I.h * S;
  // Lantai.
  api.flat(OP, cx, 0.06, cz, wu, du, e.floor, 5);
  // Dinding dalam (dollhouse, tinggi 2,6) — sisi pintu terbelah di koridor.
  const H = 2.6, TH = 0.35;
  const wallRun = (x, z, w, d) => api.box(OP, x, H / 2, z, w, H, d, e.wall, 5);
  const gapW = (DOOR_W_PX + 6) * S; // celah di dinding sisi pintu
  const d = e.door;
  // Sisi utara/selatan (sepanjang X) dan timur/barat (sepanjang Z), dalam
  // koordinat unit; posisi dihitung dari rect interior.
  const x0 = I.x * S, x1 = (I.x + I.w) * S, z0 = I.y * S, z1 = (I.y + I.h) * S;
  const midX = (x0 + x1) / 2, midZ = (z0 + z1) / 2;
  const segN = e.side === 'N', segS = e.side === 'S', segE = e.side === 'E', segW = e.side === 'W';
  const doorU = (d.ux !== 0 ? d.x : d.y) * S; // posisi pintu sepanjang dinding
  const wallSeg = (horizontal, fixed, from, to) => {
    if (to - from < 0.2) return;
    const c = (from + to) / 2, len = to - from;
    if (horizontal) wallRun(c, fixed, len, TH);
    else wallRun(fixed, c, TH, len);
  };
  if (segN) { wallSeg(true, z0, x0, doorU - gapW / 2); wallSeg(true, z0, doorU + gapW / 2, x1); }
  else wallRun(midX, z0, wu, TH);
  if (segS) { wallSeg(true, z1, x0, doorU - gapW / 2); wallSeg(true, z1, doorU + gapW / 2, x1); }
  else wallRun(midX, z1, wu, TH);
  if (segW) { wallSeg(false, x0, z0, doorU - gapW / 2); wallSeg(false, x0, doorU + gapW / 2, z1); }
  else wallRun(x0, midZ, TH, du);
  if (segE) { wallSeg(false, x1, z0, doorU - gapW / 2); wallSeg(false, x1, doorU + gapW / 2, z1); }
  else wallRun(x1, midZ, TH, du);
  // Furnitur.
  for (const it of e.items) {
    api.box(OP, it.x * S, it.y0 + it.h / 2, it.y * S, it.w, it.h, it.d, it.col, it.mat);
  }
}
