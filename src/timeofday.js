// Neon Harbor — 4 palet suasana waktu (pagi / siang / sore / malam).
// ES module, post-cut, tanpa library. Dibaca dari game state, BUKAN dari

export const PRESETS = {
  // PAGI — fajar biru-pink dingin, 07:00. Matahari rendah di timur, cahaya
  // lembut, jalan basah embun (wet 0.7), neon mulai padam, kabut tipis.
  pagi: {
    name: 'pagi', label: 'Pagi — fajar', hour: 7, daylight: 0.32, nightF: 0.30,
    // langit WebGL, horizon -> zenit (5 stop, sama seperti band SKYF)
    sky5: [[1.00, 0.79, 0.54], [0.95, 0.63, 0.71], [0.72, 0.78, 0.88], [0.42, 0.56, 0.75], [0.18, 0.29, 0.48]],
    // langit Canvas, [top, mid, horizon, haze] (format SKY city3d.js)
    sky4: [[46, 74, 122], [150, 170, 210], [255, 201, 138], [232, 217, 200]],
    sun: { y: 0.18, col: [1.00, 0.82, 0.60], disc: [1.00, 0.88, 0.65], glow: [1.00, 0.80, 0.55], pos: [0.55, 0.52] },
    moon: 0, moonCol: [0.90, 0.93, 1.00],
    ambG: [0.30, 0.32, 0.45], ambS: [0.55, 0.55, 0.62],
    hz: [0.91, 0.85, 0.78],
    winLit: 0.25, winTint: [1.00, 0.90, 0.85],
    neonGain: 1.6, lamp: 0.35, headlight: 0.30, wet: 0.70,
    waterDeep: [0.10, 0.25, 0.38], waterSky: [0.95, 0.70, 0.65],
    stars: 0, cloud: [0.95, 0.75, 0.85], cloudK: 0.22, smog: 0.50,
    skyDim: 0.55, exposure: 0.90,
    facK: 0.55, winCell: [2.2, 2.6], winGlass: 0.7, winWarm: 1, // GEDUNG: sel jendela netral lebih kecil+rapat, kaca gelap di semua waktu
    contrast: 0, shadowK: 0.5, roadTex: 0, fogK: 1, sunK: 1,
    bldShadow: false, heroReal: true, // GEDUNG R2: hero v14 realistis di semua waktu (arah R26, hapus gate),
  },
  // SIANG — tengah hari biru cerah, 12:00. Matahari tinggi, bayangan keras /
  // pendek, warna vivid, neon hampir tak terlihat, jalan kering.
  siang: {
    name: 'siang', label: 'Siang — tengah hari', hour: 12, daylight: 1.00, nightF: 0.00,
    sky5: [[0.82, 0.90, 0.97], [0.62, 0.80, 0.94], [0.38, 0.62, 0.88], [0.20, 0.45, 0.80], [0.08, 0.28, 0.65]],
    sky4: [[20, 71, 166], [70, 130, 200], [170, 205, 235], [150, 180, 205]],
    sun: { y: 1.35, col: [1.00, 0.98, 0.92], disc: [1.00, 1.00, 0.96], glow: [1.00, 0.98, 0.88], pos: [0.55, 0.78] },
    moon: 0, moonCol: [0.90, 0.93, 1.00],
    ambG: [0.32, 0.38, 0.50], ambS: [0.48, 0.56, 0.70],
    hz: [0.78, 0.86, 0.94],
    winLit: 0.06, winTint: [0.70, 0.82, 1.00],
    neonGain: 0.9, lamp: 0.00, headlight: 0.00, wet: 0.05,
    waterDeep: [0.05, 0.30, 0.50], waterSky: [0.45, 0.65, 0.90],
    stars: 0, cloud: [0.98, 0.99, 1.00], cloudK: 0.35, smog: 0.15,
    skyDim: 1.00, exposure: 1.12,
    facK: 0.72, winCell: [2.0, 2.4], winGlass: 0.7, winWarm: 0.1,
    contrast: 0.55, shadowK: 0.75, roadTex: 1.0, fogK: 0.45, sunK: 1.1,
    bldShadow: true, heroReal: true,
  },
  // SORE — sunset yang sudah ada, 18:30. BASELINE — semua nilai di bawah
  sore: {
    name: 'sore', label: 'Sore — sunset (baseline)', hour: 18.5, daylight: 0.45, nightF: 0.43,
    sky5: [[1.00, 0.77, 0.52], [1.00, 0.60, 0.34], [0.85, 0.28, 0.38], [0.45, 0.14, 0.42], [0.12, 0.05, 0.28]], // = stop SKYF
    sky4: [[30, 11, 51], [107, 35, 85], [255, 179, 92], [255, 150, 110]], // = SKY[1] city3d
    sun: { y: 0.30, col: [1.00, 0.72, 0.55], disc: [1.00, 0.91, 0.66], glow: [1.00, 0.75, 0.45], pos: [0.55, 0.56] }, // FIX1 v2: sun.col (0.66,0.45 -> 0.72,0.55) — hangat netral; disc/glow TIDAK diubah (piringan matahari tetap sunset)
    moon: 0, moonCol: [0.90, 0.93, 1.00],
    ambG: [0.38, 0.33, 0.46], ambS: [0.55, 0.45, 0.60], // FIX1 v2: ambient lebih dingin lagi (R/B campuran ≈1,0) — v1 hanya 1.94->1.52, kurang; fasad biru harus <1,2
    hz: [0.92, 0.80, 0.78], // FIX1 v2: kabut dusty-rose pucat, bukan oranye — SKYF TIDAK pakai uHz (langit murni sky5), jadi langit sunset aman; hz hanya fog geometri + kaca + air
    winLit: 0.58, winTint: [0.88, 0.94, 1.05], // FIX1: jendela menyala sedikit putih-dingin — kontras lawan fasad hangat
    neonGain: 2.2, lamp: 0.70, headlight: 0.50, wet: 0.40, // = base * 2.2 emissive
    waterDeep: [0.05, 0.20, 0.32], waterSky: [1.00, 0.55, 0.35], // = FS air
    stars: 0.10, cloud: [1.00, 0.55, 0.55], cloudK: 0.20, smog: 0.35,
    skyDim: 0.30, exposure: 1.00,
    facK: 0.75, winCell: [2.2, 2.6], winGlass: 0.7, winWarm: 1, // FIX1 v2: facK 0.68->0.75 — fasad lebih terang lagi (efektif sore 0.75*dayK 0,64 masih jauh di bawah siang 0.72*1,12)
    contrast: 0.35, shadowK: 0.5, roadTex: 0, fogK: 0.45, sunK: 0.9, // FIX1 v2: fogK 0.8->0.45 (= siang) — v1 terbukti fog masih mendominasi (clamp 0,85; f≈0,46 di 70u). contrast 0.35 tetap; R27c SUN: sunK 0.9 = kode sunset di SKYF webgl2.js (disc 0.045->0.032, glow 0.9->0.55, falloff 7->12, streak 0.4->0.22) — perbaikan blown-out VIDEO-REVIEW #2
    bldShadow: true, heroReal: true, // FIX1: bldShadow false->true (siang sudah true) — bayangan kontak gedung terlihat, gedung terpisah dari tanah
  },
  // MALAM — blue hour -> malam, 22:00. Langit biru dalam (bible §2.3) +
  // horizon oranye tipis, bulan, bintang, neon + lampu jalan dominan,
  // kerucut lampu depan mobil, jendela menyala lebih banyak.
  malam: {
    name: 'malam', label: 'Malam — blue hour', hour: 22, daylight: 0.08, nightF: 1.00,
    sky5: [[0.55, 0.30, 0.25], [0.10, 0.14, 0.28], [0.07, 0.10, 0.22], [0.05, 0.07, 0.19], [0.02, 0.03, 0.06]],
    sky4: [[5, 7, 15], [13, 19, 48], [28, 37, 71], [16, 22, 44]], // = SKY[0] city3d
    sun: { y: 0.45, col: [0.72, 0.80, 1.00], disc: [0.90, 0.93, 1.00], glow: [0.70, 0.78, 1.00], pos: [0.55, 0.85] },
    moon: 1, moonCol: [0.90, 0.93, 1.00],
    ambG: [0.10, 0.12, 0.22], ambS: [0.16, 0.20, 0.32],
    hz: [0.08, 0.11, 0.20],
    winLit: 0.75, winTint: [1.05, 0.85, 0.55],
    neonGain: 2.6, lamp: 1.00, headlight: 1.00, wet: 0.50,
    waterDeep: [0.03, 0.08, 0.18], waterSky: [0.20, 0.30, 0.55],
    stars: 1.00, cloud: [0.40, 0.50, 0.70], cloudK: 0.12, smog: 0.15,
    skyDim: 0.90, exposure: 0.80,
    facK: 0.55, winCell: [2.2, 2.6], winGlass: 0.7, winWarm: 1, // GEDUNG: sel jendela netral lebih kecil+rapat, kaca gelap di semua waktu
    contrast: 0, shadowK: 0.5, roadTex: 0, fogK: 1, sunK: 1,
    bldShadow: false, heroReal: true, // GEDUNG R2: hero v14 realistis di semua waktu (arah R26, hapus gate),
  },
};

// ---- interpolasi ----
// Lerp semua field numerik dua preset (array di-lerp per elemen). Dipakai
// untuk transisi halus (timeOfDayBlend) dan siklus jam (presetForHour).
export function lerpPreset(a, b, t) {
  const lerp = (x, y) => x + (y - x) * t;
  const la = (x, y) => x.map((v, i) => lerp(v, y[i]));
  const out = { name: t < 0.5 ? a.name : b.name, blend: t };
  for (const k of ['hour', 'daylight', 'nightF', 'moon', 'winLit', 'neonGain',
    'lamp', 'headlight', 'wet', 'stars', 'cloudK', 'smog', 'skyDim', 'exposure',
    'facK', 'winGlass', 'winWarm', 'contrast', 'shadowK', 'roadTex', 'fogK', 'sunK']) {
    out[k] = lerp(a[k], b[k]);
  }
  out.bldShadow = t < 0.5 ? a.bldShadow : b.bldShadow;
  out.heroReal = t < 0.5 ? a.heroReal : b.heroReal;
  out.winCell = la(a.winCell, b.winCell);
  out.sky5 = a.sky5.map((s, i) => la(s, b.sky5[i]));
  out.sky4 = a.sky4.map((s, i) => la(s, b.sky4[i]));
  out.sun = {
    y: lerp(a.sun.y, b.sun.y), col: la(a.sun.col, b.sun.col),
    disc: la(a.sun.disc, b.sun.disc), glow: la(a.sun.glow, b.sun.glow),
    pos: la(a.sun.pos, b.sun.pos),
  };
  out.moonCol = la(a.moonCol, b.moonCol);
  out.ambG = la(a.ambG, b.ambG); out.ambS = la(a.ambS, b.ambS);
  out.hz = la(a.hz, b.hz); out.winTint = la(a.winTint, b.winTint);
  out.waterDeep = la(a.waterDeep, b.waterDeep); out.waterSky = la(a.waterSky, b.waterSky);
  out.cloud = la(a.cloud, b.cloud);
  return out;
}

// ---- API utama ----
export function applyTimeOfDay(state, name) {
  const p = PRESETS[name];
  if (!p) throw new Error('suasana tidak dikenal: ' + name);
  state.daylight = p.daylight;
  state.daylightManual = true;
  if (state.clock) state.clock.total = p.hour * 60;
  state.timeOfDay = p;
  return p;
}

// Transisi halus antar dua suasana: t 0..1. Dipakai untuk crossfade
// (misal cutscene pagi -> siang, atau siklus jam yang berjalan).
export function timeOfDayBlend(state, aName, bName, t) {
  const p = lerpPreset(PRESETS[aName], PRESETS[bName], Math.max(0, Math.min(1, t)));
  p.name = 'blend:' + aName + '->' + bName;
  state.daylight = p.daylight;
  state.daylightManual = true;
  if (state.clock) state.clock.total = p.hour * 60;
  state.timeOfDay = p;
  return p;
}

// Siklus jam -> preset (untuk game live, fase 2 — lihat PATCH-SPEC §5).
const KEYS = [
  [0, 'malam'], [5, 'malam'], [6.5, 'pagi'], [9.5, 'pagi'], [11, 'siang'],
  [15.5, 'siang'], [17.5, 'sore'], [19.5, 'sore'], [21, 'malam'], [24, 'malam'],
];
export function presetForHour(hour) {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < KEYS.length - 1; i += 1) {
    const [h0, n0] = KEYS[i], [h1, n1] = KEYS[i + 1];
    if (h >= h0 && h < h1) {
      if (n0 === n1) return PRESETS[n0];
      return lerpPreset(PRESETS[n0], PRESETS[n1], (h - h0) / (h1 - h0));
    }
  }
  return PRESETS.malam;
}

// ---- adaptor renderer ----
const GRADE = {
  pagi: { lift: [0.01, 0.01, 0.02], gain: [1.02, 1.00, 1.04], gamma: 1.05 },
  siang: { lift: [0.00, 0.00, 0.00], gain: [1.04, 1.03, 1.00], gamma: 0.98 },
  sore: { lift: [0.015, 0.005, 0.01], gain: [1.03, 1.00, 0.97], gamma: 0.95 }, // FIX1: gain [1.06,1.00,0.94]->[1.03,1.00,0.97] — grade hampir netral; langit tetap oranye lewat sky5
  malam: { lift: [0.02, 0.02, 0.035], gain: [0.98, 1.00, 1.06], gamma: 1.08 },
};
const _g = (name) => GRADE[name] || { lift: [0, 0, 0], gain: [1, 1, 1], gamma: 1 };
export function webglUniforms(p) {
  const g = _g(p.name);
  return {
    sunY: p.sun.y, sunCol: p.sun.col, sunDisc: p.sun.disc, sunGlow: p.sun.glow,
    sunPos: p.sun.pos, moon: p.moon,
    sky0: p.sky5[0], sky1: p.sky5[1], sky2: p.sky5[2], sky3: p.sky5[3], sky4: p.sky5[4],
    hz: p.hz, ambG: p.ambG, ambS: p.ambS,
    winLit: 1 - p.winLit, winTint: p.winTint, neonGain: p.neonGain,
    waterDeep: p.waterDeep, waterSky: p.waterSky,
    stars: p.stars, cloud: p.cloud, cloudK: p.cloudK, smog: p.smog,
    skyDim: p.skyDim, exposure: p.exposure,
    lamp: p.lamp, headlight: p.headlight,
    // SIANG v2: uniform realisme siang (netral di preset lain — lihat PRESETS)
    winCell: p.winCell, winGlass: p.winGlass, winWarm: p.winWarm,
    contrast: p.contrast, shadowK: p.shadowK, roadTex: p.roadTex,
    fogK: p.fogK, sunK: p.sunK,
    // R36 POSTFX: grade per TOD (0 byte dossier — file post-cut)
    gradeLift: g.lift, gradeGain: g.gain, gradeGamma: g.gamma,
  };
}


// T1: jam live -> preset TOD. Dipanggil tiap frame dari world.step:
// preset + daylight mengikuti jam HUD (presetForHour), sinus mati.
export function tickTimeOfDay(state) {
  const h = (state.clock.total / 60) % 24;
  const p = presetForHour(h);
  state.timeOfDay = p;
  state.daylight = p.daylight;
  state.daylightManual = true;
  return p;
}
