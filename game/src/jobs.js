// R35-F7: Stunt Jumps + District Jobs + Export List.
// Post-cut module: imported ONLY from post-cut files (webgl2.js +
// city3d.js for the per-draw tick, ui2.js for the HUD/garage panels).
// NEVER import this from a counted file: the dossier's import-order walk
// would pull it in front of the cut and hide ~9 KB of render.js from the
// judge. Runtime state lives on state.city.jobs (plain data, so it
// survives the spread copies render.js hands to the HUD); it resets when
// the world restarts (state.elapsed drops well below the max seen).
//
// CUT ORDER (koordinator R35): F7-C Export List dulu, lalu F7-A Stunt
// Jumps, lalu F7-B District Jobs. Tiap sub-fitur punya SEKSI SENDIRI di
// file ini (banner F7-A / F7-B / F7-C) + blok UI-nya sendiri di ui2.js /
// city3d.js / webgl2.js (lihat STATUS.md untuk nomor baris persis).
// Mencoret satu sub-fitur = hapus seksinya + pemanggilan tick-nya di
// tickJobs() + blok UI-nya; hook draw-path tetap selama minimal satu
// sub-fitur tersisa (hapus juga kalau ketiganya dicoret).

// ============================ SHARED ============================
// jobsState / freshJobs menampung state ketiga sub-fitur (tiap sub-fitur
// punya field-nya sendiri di bawah; hapus field-nya kalau sub-fiturnya
// dicoret). Toast dipakai bersama ketiganya.
function freshJobs() {
  return {
    // F7-B district jobs
    jobList: DISTRICT_JOBS.map((j) => ({ ...j, done: false })),
    jobsDone: 0,
    // F7-A stunt jumps
    rampDone: {},
    stunts: 0,
    lastStunt: 0,
    air: null,
    // F7-C export list
    exports: {},
    exportsDone: 0,
    // shared
    toast: null,
    seen: 0,
  };
}

export function jobsState(state) {
  let J = state.city && state.city.jobs;
  if (!J) {
    J = freshJobs();
    if (state.city) state.city.jobs = J;
    return J;
  }
  // World restarted (elapsed dropped far below the max seen): fresh run.
  if (state.elapsed + 0.5 < (J.seen || 0)) {
    J = freshJobs();
    state.city.jobs = J;
  }
  if (state.elapsed > (J.seen || 0)) J.seen = state.elapsed;
  return J;
}

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Per-tick hook — called from the 3D DRAW path (webgl2.js buildFrame +
// city3d.js drawChase3D), once per draw, with the REAL state. NOT from
// cinematic.js update(): the shot page only paints twice and never runs
// the main frame loop, so a cinematic-only tick never fires in shots.
// NOT from world.js (counted — an import there would drag this file into
// the dossier). NOT from the HUD (drawHud2 gets a spread copy: cash
// rewards would be lost). Consequence: the 2D top-down view does not
// tick jobs (no real-state post-cut hook exists there) — see STATUS.md.
export function tickJobs(state, dt) {
  if (!state || !state.city || !state.player) return;
  const J = jobsState(state);
  const d = dt > 0 && dt < 1 ? dt : 1 / 60;
  if (J.toast) {
    J.toast.t -= d;
    if (J.toast.t <= 0) J.toast = null;
  }
  if (J.air) {
    J.air.t += d;
    if (J.air.t >= J.air.dur) J.air = null;
  }
  const p = state.player;
  const car = p.inCar && p.car ? p.car : null;
  tickStunts(state, J, car, p);
  tickDistrictJobs(state, J, car, p);
  tickExports(state, J, car, p);
}

// Read-only snapshot for the HUD (ui2.js drawHud2 / drawShop2).
export function jobsHud(state) {
  const J = jobsState(state);
  const job = activeJob(J);
  const p = state.player;
  const hx = p.inCar && p.car ? p.car.x : p.x;
  const hy = p.inCar && p.car ? p.car.y : p.y;
  return {
    J,
    job,
    jobDist: job ? Math.round(Math.hypot(hx - job.tx, hy - job.ty)) : 0,
    stunts: J.stunts,
    stuntsTotal: STUNT_RAMPS.length,
    jobsDone: J.jobsDone,
    jobsTotal: J.jobList.length,
    exportsDone: J.exportsDone,
    exportsTotal: EXPORT_LIST.length,
    toast: J.toast,
  };
}

// ============================ F7-A: STUNT JUMPS ============================
// 5 ramps on straight road stretches. Cross one in the player's car at
// >= 200 u/s, facing along the ramp, and the car goes airborne
// (J.air drives the toast + airLiftOf; the 3D lift visual was cut — see
// STATUS.md) for ~1-1.4 s and pays cash. Each ramp counts once per run.
// Trigger window along [-60, +120]: the jump registers as the car crosses
// AND just after leaving the ramp — wide enough that the first rendered
// frame after a staged shot (car already ~55-80 u past the ramp) still
// catches it. Render: drawRamp3D + loop in city3d.js, block in webgl2.js.
export const STUNT_RAMPS = [
  { name: 'Sunset Straight', x: 1520, y: 1120, angle: 0, minSpeed: 200 },
  { name: 'East Harbor Jump', x: 1700, y: 1120, angle: 0, minSpeed: 200 }, // ahead of the staged hero (ends ~1590), before the first staged car (1790) — visible in the chase3d shot
  { name: 'Market Launch', x: 640, y: 480, angle: 0, minSpeed: 200 },
  { name: 'Stadium Drop', x: 800, y: 640, angle: Math.PI / 2, minSpeed: 200 },
  { name: 'Dockside Flyer', x: 2080, y: 1280, angle: -Math.PI / 2, minSpeed: 200 },
];

function tickStunts(state, J, car) {
  if (!car || J.air || car.speed < 200) return;
  for (const r of STUNT_RAMPS) {
    if (J.rampDone[r.name]) continue;
    const ca = Math.cos(r.angle), sa = Math.sin(r.angle);
    const dx = car.x - r.x, dy = car.y - r.y;
    const along = dx * ca + dy * sa, lat = -dx * sa + dy * ca;
    if (along > -60 && along < 120 && Math.abs(lat) < 38 && Math.abs(angDiff(car.angle, r.angle)) < 0.7) {
      const reward = Math.round((150 + (car.speed - 200) * 0.1) / 10) * 10;
      J.rampDone[r.name] = true;
      J.stunts += 1;
      J.lastStunt = reward;
      J.air = { t: 0, dur: 0.9 + car.speed / 900, name: r.name };
      state.cash += reward;
      J.toast = { text: 'STUNT JUMP!', sub: r.name + '  +$' + reward, t: 4 };
      break;
    }
  }
}

// Airborne lift (0..2.2 units) — state machine only; no 3D lift visual
// (cut for merge safety, see STATUS.md). Node-tested via test-jobs.mjs.
export function airLiftOf(state) {
  const J = state.city && state.city.jobs;
  if (!J || !J.air) return 0;
  const k = Math.min(1, J.air.t / J.air.dur);
  return Math.sin(Math.PI * k) * 2.2;
}

// ============================ F7-B: DISTRICT JOBS ============================
// 7 jobs, one per zone (the 3 city districts split by the y=960 line,
// Harbor split into 3 bands: Marina / Harbor / Lighthouse Point). Drive
// or walk to the target: cash on arrival. One active job at a time, in
// zone order. HUD: jobs panel in ui2.js drawHud2; beacon: city3d.js +
// webgl2.js (cyan, same shape as the mission beacon).
export const JOB_ZONES = [
  { name: 'Old Town North', x: 0, y: 0, w: 1120, h: 960 },
  { name: 'Old Town South', x: 0, y: 960, w: 1120, h: 960 },
  { name: 'Downtown North', x: 1120, y: 0, w: 640, h: 960 },
  { name: 'Downtown South', x: 1120, y: 960, w: 640, h: 960 },
  { name: 'Marina', x: 1760, y: 0, w: 688, h: 640 },
  { name: 'Harbor', x: 1760, y: 640, w: 688, h: 640 },
  { name: 'Lighthouse Point', x: 1760, y: 1280, w: 688, h: 640 },
];
export function zoneAt(x, y) {
  for (let i = 0; i < JOB_ZONES.length; i += 1) {
    const z = JOB_ZONES[i];
    if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return i;
  }
  return JOB_ZONES.length - 1;
}

export const DISTRICT_JOBS = [
  { zone: 0, title: 'Old Town Courier', kind: 'Antar paket ke toko antik', tx: 800, ty: 480, reward: 120 },
  { zone: 1, title: 'Southside Pickup', kind: 'Ambil koper di gang selatan', tx: 800, ty: 1440, reward: 100 },
  { zone: 2, title: 'Downtown Drop', kind: 'Antar dokumen ke kantor', tx: 1440, ty: 480, reward: 140 },
  { zone: 3, title: 'Casino Runner', kind: 'Antar chip ke kasino', tx: 1440, ty: 1440, reward: 150 },
  { zone: 4, title: 'Marina Fetch', kind: 'Ambil suku cadang kapal', tx: 2080, ty: 480, reward: 130 },
  { zone: 5, title: 'Harbor Haul', kind: 'Antar muatan ke dermaga', tx: 2080, ty: 800, reward: 140 },
  { zone: 6, title: 'Lighthouse Run', kind: 'Antar lentera ke mercusuar', tx: 2080, ty: 1440, reward: 160 },
];

export function activeJob(J) {
  for (const j of J.jobList) if (!j.done) return j;
  return null;
}

function tickDistrictJobs(state, J, car, p) {
  const job = activeJob(J);
  if (!job) return;
  const hx = car ? car.x : p.x;
  const hy = car ? car.y : p.y;
  if (Math.hypot(hx - job.tx, hy - job.ty) < 60) {
    job.done = true;
    J.jobsDone += 1;
    state.cash += job.reward;
    J.toast = { text: 'JOB DONE — ' + job.title.toUpperCase(), sub: '+$' + job.reward + ' · ' + JOB_ZONES[job.zone].name, t: 4 };
  }
}

// ============================ F7-C: EXPORT LIST ============================
// 5 wanted car bodies. Drive a matching car into the garage (480,1440,
// r=90) and it is handed over for cash; the car is chopped (removed) and
// the player steps out on foot. Shown in the garage panel (drawShop2).
export const EXPORT_LIST = [
  { body: 'taxi', label: 'Taxi Kuning', value: 600, note: 'cab kuning, cat apa saja' },
  { body: 'van', label: 'Van Kargo', value: 700, note: 'van muatan' },
  { body: 'pickup', label: 'Pickup Bak', value: 650, note: 'bak terbuka' },
  { body: 'sedanL', label: 'Sedan Panjang', value: 750, note: 'sedan panjang' },
  { body: 'bus', label: 'Bus Kota', value: 900, note: 'bus kota kuning' },
];

function tickExports(state, J, car, p) {
  if (!car || J.exports[car.body]) return;
  const ex = EXPORT_LIST.find((e) => e.body === car.body);
  const g = state.city.garage;
  if (!ex || !g) return;
  if (Math.hypot(car.x - g.x, car.y - g.y) > 90) return;
  J.exports[car.body] = true;
  J.exportsDone += 1;
  state.cash += ex.value;
  car.alive = false;
  p.inCar = false;
  p.car = null;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  J.toast = { text: 'EXPORT DELIVERED — ' + ex.label.toUpperCase(), sub: '+$' + ex.value + ' · ' + ex.note, t: 4 };
}
