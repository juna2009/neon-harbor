// onfoot.js — R41 mode jalan kaki / on-foot (Worker A core).
// Dimuat via dynamic import dari main.js (pola post-cut, seperti touch.js):
// 0 byte dossier. Modul ini TIDAK menyentuh logika mobil R34 (driveCar,
// stepTraffic, collision mobil) dan TIDAK menyentuh spawn-ped R34.
// Yang dilakukan modul ini, sekali per step (dipanggil main.js setelah
// world.step):
//   1. Turunkan status on-foot dari state.player (aktif kalau Jax TIDAK
//      inCar / inBoat / inPlane). Keluar mobil (E) sudah ditangani world.js
//      (exitCar); masuk mobil (E dekat mobil) juga sudah ada (enterCar).
//      Chase-cam tetap DEFAULT: mode on-foot hanya hidup saat Jax jalan kaki.
//   2. Ganti kamera F: 0 = POV first-person (mata Jax), 1 = third-person
//      belakang (default saat keluar mobil), 2 = third-person depan —
//      putar seperti Minecraft F5. F5 TIDAK BISA dipakai (browser refresh);
//      F TERVERIFIKASI BEBAS: tidak ada di DEFAULT_BINDINGS input.js, tidak
//      dipakai render.js (hanya KeyV), touch.js, atau ui2.js. F juga tombol
//      sentuh CAM (touch.js) untuk Juna yang main dari HP. Geometri kameranya
//      di webgl2.js updateCamera (baca state.onfoot {active, mode}).
//   3. Tabrakan jalan kaki vs MOBIL: Jax tidak tembus mobil parkir / lalu
//      lintas / polisi / truk lapis baja (dorong-keluar OBB). Gedung + air
//      sudah ditangani moveCircle/collides di walkPlayer (world.js) — modul
//      ini tidak menulis ulang collision itu.
// BUKAN scope modul ini: misi jalan kaki, combat jalan kaki, shot onfoot
// (Worker B), sprite Jax R39 (belum ada — placeholder 7-box person()).
//
// R39 (sprite turntable, nanti): walkPhase adalah radian yang maju per jarak
// tempuh (WALK_PHASE_PER_PX, config.js) — 1 langkah = π rad, 1 siklus penuh
// (2 langkah) = 2π rad. Frame sprite 4 fase = floor(walkPhase / (π/2)) % 4;
// sudut pandang sprite = 8 arah dari yaw Jax. Sistem gerak TIDAK berubah,
// hanya sumber gambarnya yang diganti dari person() ke sprite.
//
// Animasi jalan (prioritas Juna #1 + klarifikasi 18:15 WIB "semuanya, bukan
// Jax doang"): fase jalan SEMUA karakter maju dari JARAK tempuh, bukan waktu
// — Jax di modul ini (advanceWalkPhase: jarak BERSIH sesudah dorong-keluar,
// supaya tidak treadmill saat menabrak mobil), NPC di traffic.js
// stepPedestrians, unit jalan kaki polisi/tentara di police.js stepPolice;
// kaki naik-turun + badan merunduk di person() (webgl2.js). Kalau karakter
// diam, kakinya diam.
import { PLAYER, WALK_PHASE_PER_PX } from './config.js';
import { collides } from './city.js';

// Mode kamera on-foot: 0 = POV, 1 = belakang (default), 2 = depan.
export const CAM_MODES = ['pov', 'behind', 'front'];
export const CAM_LABELS = ['first-person (POV)', 'third-person behind', 'third-person front'];
export const CAM_DEFAULT = 1;

let prevF = false; // edge detection tombol F (sekali per tekan, bukan per frame)
let prevPos = null; // posisi Jax SETELAH dorong-keluar pada update sebelumnya

// Test-only: reset state modul (dipakai unit test — satu game = satu sesi,
// jadi di produksi tidak pernah dipanggil).
export function resetOnFootState() { prevF = false; prevPos = null; }

// Fase jalan Jax — dari JARAK BERSIH (net displacement) antar update, BUKAN
// dari gerak di walkPlayer saja. Alasan (temuan verifikasi v3): Jax yang
// menabrak mobil lalu didorong-keluar tiap step akan jalan-di-tempat —
// walkPlayer mengukur +2,9 px (maju), push-out mengembalikan −2,9 px,
// posisi NETTO 0 tapi fase terlanjur +0,145/step (treadmill — persis yang
// dilarang Juna: kaki melangkah padahal badan diam). Dengan mengukur dari
// posisi akhir-ke-akhir (sesudah SEMUA dorong-keluar), fase hanya maju kalau
// badan Jax BENAR-BENAR berpindah. Teleport (>60 px sekali update —
// checkpoint/restore/keluar-masuk mobil) tidak dihitung sebagai jalan.
function advanceWalkPhase(p) {
  if (!prevPos) { prevPos = { x: p.x, y: p.y }; return; }
  const d = Math.hypot(p.x - prevPos.x, p.y - prevPos.y);
  if (d > 0 && d <= 60) p.walkPhase = (p.walkPhase || 0) + d * WALK_PHASE_PER_PX;
  prevPos = { x: p.x, y: p.y };
}

// Dorong Jax keluar dari satu mobil (OBB: setengah panjang/lebar + radius).
// Kembalikan true kalau posisi berubah. Kalau dorongan malah menabrak gedung,
// coba sumbu lain; kalau keduanya menabrak, jangan gerakkan (mobil nempel
// tembok — kasus langka, lebih baik overlap 1 frame daripada tembus gedung).
function pushOutOfCar(p, car, city) {
  const hl = (car.length || 46) / 2 + PLAYER.radius - 2;
  const hw = (car.width || 22) / 2 + PLAYER.radius - 2;
  const ca = Math.cos(car.angle || 0), sa = Math.sin(car.angle || 0);
  const rx = p.x - car.x, ry = p.y - car.y;
  if (Math.abs(rx) > hl + hw || Math.abs(ry) > hl + hw) return false; // jauh — reject cepat
  const lx = rx * ca + ry * sa; // sumbu panjang mobil
  const lz = -rx * sa + ry * ca; // sumbu lebar mobil
  if (Math.abs(lx) >= hl || Math.abs(lz) >= hw) return false;
  const px = hl - Math.abs(lx), pz = hw - Math.abs(lz);
  const ox = p.x, oy = p.y;
  const tryPush = (dx, dy) => {
    p.x = ox + dx; p.y = oy + dy;
    if (collides(city, p.x, p.y, PLAYER.radius)) { p.x = ox; p.y = oy; return false; }
    return true;
  };
  // Sumbu penetrasi terkecil dulu (dorongan paling pendek = paling natural).
  if (px < pz) {
    const s = lx >= 0 ? 1 : -1;
    if (tryPush(s * px * ca, s * px * sa)) return true;
    const t = lz >= 0 ? 1 : -1;
    if (tryPush(-t * pz * sa, t * pz * ca)) return true;
  } else {
    const t = lz >= 0 ? 1 : -1;
    if (tryPush(-t * pz * sa, t * pz * ca)) return true;
    const s = lx >= 0 ? 1 : -1;
    if (tryPush(s * px * ca, s * px * sa)) return true;
  }
  return false;
}

export function updateOnFoot(state, input, dt) {
  const p = state.player;
  if (!state.onfoot) state.onfoot = { active: false, mode: CAM_DEFAULT };
  const st = state.onfoot;
  st.active = !p.inCar && !p.inBoat && !p.inPlane;
  let msg = null;
  // F: ganti kamera — hanya saat jalan kaki (di mobil, chase-cam tetap).
  const fDown = !!(input.keys && input.keys.has('KeyF'));
  if (fDown && !prevF && st.active) {
    st.mode = (st.mode + 1) % CAM_MODES.length;
    msg = `On-foot camera: ${CAM_LABELS[st.mode]} (F to cycle)`;
  }
  prevF = fDown;
  if (!st.active) { prevPos = null; return msg; }
  // Tabrakan jalan kaki vs mobil (gedung/air sudah di walkPlayer).
  const city = state.city;
  const cars = [];
  for (const c of state.traffic.cars || []) if (c && c.alive !== false) cars.push(c);
  for (const c of state.traffic.parked || []) if (c && c.alive !== false) cars.push(c);
  for (const u of state.police.units || []) if (u && u.kind === 'car' && u.car && u.car.alive !== false) cars.push(u.car);
  const at = state.armored && state.armored.truck;
  if (at && at.alive) cars.push(at);
  for (const c of cars) pushOutOfCar(p, c, city);
  // R41: fase jalan dari jarak BERSIH sesudah dorong-keluar (lihat
  // advanceWalkPhase) — bukan dari walkPlayer, supaya tidak treadmill.
  advanceWalkPhase(p);
  return msg;
}
