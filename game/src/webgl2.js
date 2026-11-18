// Neon Harbor — WebGL2 game-state renderer + PALET SUASANA WAKTU (fork bukti
// untuk timeofday.js — lihat PATCH-SPEC.md §2. Asli: gta6-01-webgl-proto/webgl2.js.
// Bedanya dari aslinya: SEMUA warna hardcode sunset menjadi uniform yang diisi
// dari state.timeOfDay; tanpa preset, fallback = PRESETS.sore (nilai lama persis).
// Neon Harbor — WebGL2 game-state renderer (raw WebGL2, tanpa library, tanpa network).
// Port mekanis dari prototipe WebGL1 (webgl.js, ~8/10): shader GLSL ES 1.00
// tetap dipakai — terbukti bisa di-link di konteks webgl2 (lihat laporan
// gta6-01-better-than-webgl.md). Konteks: webgl2 dulu, fallback webgl,
// lalu null (pemanggil kembali ke Canvas 2D city3d.js).
//
// BUKAN scene statis: render(state, dt) membaca state dunia 2D game yang HIDUP
// tiap frame — posisi mobil hero, traffic, polisi, heli, perahu, drawbridge,
// gedung, jalan, waktu, wanted — lalu menggambar chase-cam 3D.
// Skala: S = 0.1 (1 px game = 0.1 unit WebGL), sama seperti city3d.js (CS).
// Matahari sengaja mengikuti arah kamera (golden hour selalu di depan,
// seperti prototipe dan sky city3d) — bukan matahari dunia yang tetap.
//
// Perbaikan dari gta6-01-graphics-bible/webgl-techniques.md yang masuk v1:
//  - §1.4: streak refleksi diagonal di kaca (kabin bukan lagi kotak hitam).
//  - §1.5: emissive tidak kena fog penuh (×0.25) — lampu tetap menyala jauh.
//  - §7.2: batching — 1 program, 4 draw call/frame (langit + opaque + shadow + glow).
//  - §9 #13 (sebagian): resize(w, h, ss) — supersampling 2x untuk shot final.
// Yang BELUM di v1 (rencana hari integrasi 19-20 Nov): instancing (WebGL2),
// MRT bloom, shadow mapping, ACES — lihat GO-NOGO.md.

import { PRESETS, webglUniforms } from './timeofday.js';
import { drawCarRealistic } from './cars3d.js'; // R26: cars3d v15d di game/src/
import { drawCruiseShips } from './ships3d.js'; // R27b: kapal pesiar + yacht (statis, visual saja)

const S = 0.1; // game px -> unit WebGL
const W = 1280, H = 800;
function hx(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
function hash2(a, b) {
  let v = (a * 73856093) ^ (b * 19349663);
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const angDiff = (a, b) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

// ---- mat4 helpers (column-major) ----
function ident() { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }
function persp(fov, a, n, f) {
  const t = 1 / Math.tan(fov / 2), d = n - f;
  return [t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / d, -1, 0, 0, 2 * f * n / d, 0];
}
function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function norm(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function lookAt(e, t, up) {
  const z = norm(sub(e, t)), x = norm(cross(up, z)), y = cross(z, x);
  return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
}

// ---- shaders (GLSL ES 1.00 — jalan di konteks webgl DAN webgl2) ----
// Material: 0 gedung(jendela) 1 cat 2 kaca 3 jalan 4 emissive 5 matte
//           6 trotoar 7 glow(additif) 8 smear(additif) 9 contact shadow 10 air
const VS = `
attribute vec3 aP; attribute vec3 aN; attribute vec2 aU; attribute vec3 aC; attribute float aM;
uniform mat4 uP, uV;
varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vC; varying float vM;
void main(){
  vW = aP; vN = aN; vU = aU; vC = aC; vM = aM;
  gl_Position = uP * uV * vec4(aP, 1.0);
}`;
const FS = `
precision mediump float;
varying vec3 vN; varying vec3 vW; varying vec2 vU; varying vec3 vC; varying float vM;
uniform vec3 uCam; uniform vec3 uSun; uniform float uDay; uniform float uDark;
// TOD (timeofday.js): semua warna sunset hardcode dulu diganti uniform ini.
// SORE = nilai lama persis — lihat webglUniforms() di timeofday.js.
uniform vec3 uSunCol; uniform vec3 uHz; uniform vec3 uAmbG; uniform vec3 uAmbS;
uniform float uWinLit; uniform vec3 uWinTint; uniform float uNeon;
uniform vec3 uWaterDeep; uniform vec3 uWaterSky; uniform float uExposure;
uniform vec2 uWinCell; uniform float uWinGlass; uniform float uWinWarm; // SIANG v2: jendela
uniform float uContrast; uniform float uShadowK; uniform float uRoadTex; uniform float uFogK; // SIANG v2: kontras/bayangan/jalan/kabut
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  float dist = length(uCam - vW);
  vec3 base = vC;
  float emit = 0.0, spec = 0.0, shin = 30.0;
  float dayK = (0.35 + 0.65 * uDay) * uExposure;
  if (vM < 0.5 && abs(N.y) < 0.5) { // gedung: fasad 3 zona (GEDUNG §11 — bible 3.1/3.4)
    // Hash stabil per gedung dari warna fasad (sama di semua vertex gedung).
    float bh = h21(floor(vC.xy * 61.0));
    float wtype = floor(bh * 3.0); // 0 punched, 1 ribbon, 2 curtain
    // Variasi tint fasad +-15% + garis lantai tiap 3.2 unit + strip aksen vertikal.
    base *= 0.85 + 0.30 * fract(bh * 7.31); // tint dari bh (hemat 1 h21)
    base *= 1.0 - step(fract(vU.y / 3.2), 0.05) * 0.22;
    float acc = step(0.82, h21(vec2(floor(vU.x / 2.0), floor(vC.r * 61.0))));
    base *= 1.0 + acc * 0.18;
    // Sel jendela per tipe (punched kecil-rapat; ribbon pita per lantai; curtain kaca penuh).
    vec2 wcell = uWinCell;
    if (wtype > 1.5) wcell = vec2(uWinCell.x, 3.2);
    else if (wtype > 0.5) wcell = vec2(uWinCell.x * 3.0, 3.2);
    vec2 id = floor(vU / wcell);
    vec2 cell = fract(vU / wcell);
    float wx0 = 0.30, wx1 = 0.70, wy0 = 0.34, wy1 = 0.80;
    if (wtype > 1.5) { wx0 = 0.14; wx1 = 0.86; wy0 = 0.16; wy1 = 0.84; } // R2: curtain lebih kecil, frame lebih lebar
    else if (wtype > 0.5) { wx0 = 0.06; wx1 = 0.94; wy0 = 0.38; wy1 = 0.66; }
    float win = step(wx0, cell.x) * step(cell.x, wx1) * step(wy0, cell.y) * step(cell.y, wy1);
    float lit = step(uWinLit, h21(id));
    vec3 warm = mix(vec3(1.0, 0.72, 0.32), vec3(1.0, 0.42, 0.55), fract(id.x * 0.37 + id.y * 0.13));
    vec3 wc = mix(vec3(0.75, 0.88, 1.05), warm, uWinWarm); // SIANG v2: jendela menyala = pantulan langit
    float winI = mix(0.8, 1.5, uWinWarm); // SIANG v2b: pantulan langit siang tidak blown white
    base = mix(base, wc * uWinTint * winI, win * lit);
    // Bingkai gelap tiap jendela (cincin di luar rect jendela).
    float fr = step(wx0 - 0.08, cell.x) * step(cell.x, wx1 + 0.08) * step(wy0 - 0.08, cell.y) * step(cell.y, wy1 + 0.08);
    base *= 1.0 - fr * (1.0 - win) * 0.45;
    // Kaca gelap untuk jendela mati — terbaca sebagai lubang, bukan stiker.
    vec3 glass = mix(vec3(0.07, 0.09, 0.13), uHz * 0.7 + vec3(0.04), 0.35); // R2: kaca lebih gelap/dingin
    base = mix(base, glass, win * (1.0 - lit) * uWinGlass); // SIANG v2: jendela mati tetap terbaca
    emit = win * lit;
    // Lantai dasar (y < 2.6): etalase kaca + tiang; awning (2.6-3.1); pita neon (3.1-3.7).
    float shop = step(vU.y, 2.6);
    emit *= 1.0 - shop; // jendela menyala tidak berlaku di etalase
    vec3 shopGlass = mix(vec3(0.12, 0.14, 0.18), vec3(0.50, 0.32, 0.15), fract(bh * 3.7 + floor(vU.x / 1.1) * 0.37) * 0.8); // R2: kaca toko lebih terang, bukan pagar
    base = mix(base, shopGlass, shop * 0.92);
    float mull = step(0.90, fract(vU.x / 1.1)); // tiang etalase tiap 1.1 unit
    base = mix(base, vec3(0.08, 0.09, 0.11), shop * mull * 0.55); // R2: mullion lebih lembut
    float awn = step(2.6, vU.y) * step(vU.y, 3.1);
    float stripe = step(0.5, fract(vU.x / 0.8));
    vec3 awnCol = mix(vec3(0.75, 0.15, 0.25), vec3(0.95, 0.92, 0.85), stripe);
    base = mix(base, awnCol, awn);
    float neonB = step(3.1, vU.y) * step(vU.y, 3.7);
    vec3 neonCol = mix(vec3(1.0, 0.18, 0.55), mix(vec3(0.05, 0.85, 0.95), vec3(1.0, 0.62, 0.12), step(0.66, bh)), step(0.33, bh));
    base = mix(base, neonCol * 1.6, neonB);
    emit = max(emit, neonB * 0.85);
  } else if (vM < 1.5) { // cat mobil 3 lapis ala Forza (bible §1.3) + Fresnel palsu
    spec = 0.9; shin = 60.0;
    float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    base = mix(base, uSunCol, fr * 0.6); // TOD: Fresnel ikut warna matahari
    // LAPIS 1 — pigmen flop: warna bergeser gelap-ungu di sudut miring
    base = mix(base, base * vec3(0.55, 0.45, 0.85) + vec3(0.03, 0.0, 0.05), pow(1.0 - max(dot(N, V), 0.0), 2.0) * 0.5);
    // LAPIS 2 — metallic flakes: kilau glitter (hanya material mobil)
    float flake = fract(sin(dot(floor(vW * 14.0), vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    float flakeOn = step(0.93, flake) * max(dot(N, uSun), 0.0);
    base += vec3(1.0, 0.9, 0.7) * flakeOn * 0.5;
    // LAPIS 3 — clear coat: Fresnel Schlick (di blok lighting bawah, via spec)
  } else if (vM < 2.5) { // kaca — bible §1.4: streak diagonal, bukan kotak hitam
    spec = 1.0; shin = 90.0;
    float fr = pow(1.0 - max(dot(N, V), 0.0), 2.0);
    base = mix(base, mix(uSunCol, vec3(1.0, 0.95, 0.85), 0.4), fr * 0.8);
    float streak = smoothstep(0.06, 0.0, abs(fract((gl_FragCoord.x + gl_FragCoord.y * 0.7) * 0.012) - 0.5) - 0.32);
    base += mix(uSunCol, vec3(1.0, 0.95, 0.85), 0.5) * streak * 0.55;
    base = mix(base, vec3(0.02), pow(1.0 - abs(dot(N, V)), 2.0) * 0.3);
  } else if (vM < 3.5) { // jalan: marka (dari UV: u=sepanjang jalan, v=melintang) + streak matahari
    float dash = step(0.45, fract(vU.x * 0.06)) * step(abs(vU.y - 0.5), 0.03);
    base = mix(base, vec3(0.85, 0.7, 0.25), dash);
    float asp = h21(floor(vW.xz * vec2(2.5, 2.5))); // SIANG v2: tekstur aspal (variasi butir)
    base *= 1.0 + (asp - 0.5) * 0.16 * uRoadTex;
    float stain = step(0.93, h21(floor(vU * vec2(0.35, 1.4)))); // SIANG v2: noda oli / tambalan
    base *= 1.0 - stain * 0.30 * uRoadTex;
    vec2 rel = vW.xz - uCam.xz;
    vec2 sd = normalize(uSun.xz + vec2(0.0001));
    vec2 pd = vec2(-sd.y, sd.x);
    float lat = dot(rel, pd);
    float along = dot(rel, sd);
    float streak = exp(-lat * lat * 0.06) * exp(-max(along - 6.0, 0.0) * 0.012);
    base += uSunCol * streak * 0.32; // TOD: streak jalan ikut matahari
    spec = 0.5; shin = 24.0;
  } else if (vM < 4.5) { // emissive (lampu rem, neon, jendela menyala) — bible §1.5
    emit = 1.0;
    float f = 1.0 - exp(-dist * 0.011);
    vec3 col = base * uNeon; // TOD: neonGain preset (sore 2.2 = lama)
    col = mix(col, uHz, clamp(f, 0.0, 0.85) * 0.25);
    gl_FragColor = vec4(col * (1.0 - uDark * 0.4), 1.0);
    return;
  } else if (vM > 9.5) { // air: warna akhir SENDIRI (early return) — R26: lewat lighting umum, multiply hangat sunset mengubah biru dalam jadi oranye seperti aspal. Di sini: biru dalam dominan + jalur matahari + glitter + fog, tanpa warm multiply.
    float fr = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    vec3 deep = uWaterDeep; // TOD
    vec3 skyc = uWaterSky; // TOD
    vec3 wcol = mix(deep, skyc, fr * 0.20);
    vec2 rel = vW.xz - uCam.xz;
    vec2 sd = normalize(uSun.xz + vec2(0.0001));
    float lat = dot(rel, vec2(-sd.y, sd.x));
    float along = dot(rel, sd);
    float streak = exp(-lat * lat * 0.08) * exp(-max(along - 4.0, 0.0) * 0.008);
    wcol += uSunCol * streak * 0.45;
    vec3 Hv = normalize(uSun + V);
    wcol += mix(uSunCol, vec3(1.0), 0.45) * pow(max(dot(N, Hv), 0.0), 80.0) * 0.8;
    float f = 1.0 - exp(-dist * 0.011 * uFogK);
    wcol = mix(wcol, uHz, clamp(f, 0.0, 0.85));
    wcol *= (1.0 - uDark * 0.75);
    wcol *= (0.35 + 0.65 * uDay) * uExposure;
    gl_FragColor = vec4(wcol, 1.0);
    return;
  }
  if (vM > 6.5 && vM < 7.5) { // glow quad: alpha radial dari UV
    float a = smoothstep(0.5, 0.05, length(vU - 0.5));
    gl_FragColor = vec4(base * 1.8, a * 0.55);
    return;
  }
  if (vM > 7.5 && vM < 8.5) { // smear: memudar sepanjang v
    gl_FragColor = vec4(base * 1.5, (1.0 - vU.y) * 0.4);
    return;
  }
  if (vM > 8.5 && vM < 9.5) { // contact shadow: elips gelap
    float a = smoothstep(0.5, 0.12, length((vU - 0.5) * vec2(1.0, 2.4))) * uShadowK; // SIANG v2: bayangan kontak lebih gelap di siang (0.75; sore 0.5 = lama)
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  // Half-Lambert (bible §1.2): bayangan tidak pernah hitam pekat (Valorant)
  float ndl = max(dot(N, uSun), 0.0);
  float halfLam = ndl * 0.5 + 0.5;
  halfLam *= halfLam;
  halfLam = mix(halfLam, ndl, uContrast); // SIANG v2: cahaya terarah keras (siang 0.55; sore 0 = lama)
  vec3 amb = mix(uAmbG, uAmbS, N.y * 0.5 + 0.5); // TOD
  vec3 col = base * (amb + uSunCol * halfLam * 1.1) * dayK;
  if (spec > 0.0) {
    vec3 Hv = normalize(uSun + V);
    col += mix(uSunCol, vec3(1.0), 0.45) * pow(max(dot(N, Hv), 0.0), shin) * spec * dayK;
  }
  // Rim light (bible §1.2): tepi siluet menyala — kuat di material mengkilap
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += uSunCol * rim * (spec > 0.0 ? 0.45 : 0.12) * dayK;
  col = mix(col, col + vec3(1.2, 0.7, 0.4) * 0.8, emit * uWinWarm); // SIANG v2b: boost hangat ikut preset (siang 0.1; sore/malam 1 = lama)
  float f = 1.0 - exp(-dist * 0.011 * uFogK); // SIANG v2: udara jernih (siang 0.45; sore 1 = lama)
  col = mix(col, uHz, clamp(f, 0.0, 0.85)); // TOD: fog ikut palet
  col *= (1.0 - uDark * 0.75);
  gl_FragColor = vec4(col, 1.0);
}`;
const SKYV = `
attribute vec2 aP; varying vec2 vU;
void main(){ vU = aP * 0.5 + 0.5; gl_Position = vec4(aP, 0.0, 1.0); }`;
const SKYF = `
precision mediump float;
varying vec2 vU;
uniform float uDay;
// TOD: gradient 5 stop + posisi/warna matahari-bulan + awan + bintang.
uniform vec3 uSky0; uniform vec3 uSky1; uniform vec3 uSky2; uniform vec3 uSky3; uniform vec3 uSky4;
uniform vec2 uSunPos; uniform vec3 uSunDisc; uniform vec3 uSunGlow; uniform float uMoon;
uniform float uStars; uniform vec3 uCloud; uniform float uCloudK; uniform float uSmog; uniform float uSkyDim;
uniform float uSunK; // SIANG v2: intensitas matahari
uniform float uAsp; // R26b: aspek layar (matahari/bulan bulat)
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  float y = vU.y;
  vec3 c = mix(uSky0, uSky1, smoothstep(0.42, 0.55, y));
  c = mix(c, uSky2, smoothstep(0.55, 0.68, y));
  c = mix(c, uSky3, smoothstep(0.68, 0.82, y));
  c = mix(c, uSky4, smoothstep(0.82, 1.0, y));
  vec2 S = uSunPos;
  float d = length(vec2((vU.x - S.x) * uAsp, vU.y - S.y)); // R26b: jarak koreksi aspek
  float noon = step(1.05, uSunK); // R27a: 1 hanya siang (sunK siang 1.1, lain 1.0)
  c += uSunGlow * exp(-d * mix(7.0, 18.0, noon)) * mix(0.9, 0.35, noon) * uSunK;
  c += uSunDisc * smoothstep(mix(mix(0.045, 0.041, noon), 0.020, uMoon), mix(0.038, 0.014, uMoon), d) * uSunK; // TOD: bulan lebih kecil
  c += uSunGlow * exp(-abs(vU.y - S.y) * 90.0) * exp(-abs(vU.x - S.x) * 5.0) * mix(0.4, 0.15, noon) * uSunK * (1.0 - uMoon); // TOD: bulan tanpa streak
  float smog = exp(-abs(y - 0.47) * 22.0) * uSmog; // TOD: pagi berkabut, siang jernih
  c = mix(c, uSky0, smog);
  float cl1 = smoothstep(0.16, 0.0, distance(vU, vec2(0.22, 0.78)));
  float cl2 = smoothstep(0.12, 0.0, distance(vU, vec2(0.80, 0.84)));
  float cl3 = smoothstep(0.10, 0.0, distance(vU, vec2(0.45, 0.88)));
  c = mix(c, uCloud, (cl1 * 0.22 + cl2 * 0.18 + cl3 * 0.15) * uCloudK / 0.2); // TOD: awan ikut palet
  if (uStars > 0.01) { // TOD: bintang malam (hash grid, hanya langit atas)
    float st = step(0.994, h21(floor(vU * vec2(160.0, 90.0)))) * smoothstep(0.42, 0.18, length(fract(vU * vec2(160.0, 90.0)) - 0.5));
    c += vec3(0.9, 0.95, 1.0) * st * uStars * smoothstep(0.55, 0.85, y);
  }
  c = mix(c * uSkyDim + vec3(0.02, 0.02, 0.08), c, smoothstep(0.15, 0.75, uDay)); // TOD: palet gelap jangan digelapkan 2x
  gl_FragColor = vec4(c, 1.0);
}`;

// ---- compile helpers (dibuat per renderer — gl di-closure) ----
function makeGL(gl) {
  function sh(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('SHADER ERROR: ' + gl.getShaderInfoLog(s));
      throw new Error('shader compile failed');
    }
    return s;
  }
  function prog(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error('LINK ERROR: ' + gl.getProgramInfoLog(p));
      throw new Error('program link failed');
    }
    return p;
  }
  return { sh, prog };
}

// ---- geometri: bucket OP (opaque) / SH (shadow) / GL (glow+smear) ----
// Bucket dipakai ulang tiap frame (length = 0), buffer DYNAMIC_DRAW.
function newBucket() { return { p: [], n: [], u: [], c: [], m: [], i: [] }; }
// Belah bucket G per material (INTEGRATION.md §6 — WAJIB R26): G digambar
// aditif, jadi elips bayangan kontak material 9 (hitam) tidak terlihat
// kalau tetap di G. Material 9 -> bucket bayangan (blending normal),
// sisanya (glow 7 / smear 8) tetap aditif. Algoritma = splitBucket di
// demo.js; di sini bucket tujuan dipakai ulang (tanpa alokasi per frame).
function splitBucketInto(src, sh, gl) {
  sh.p.length = 0; sh.n.length = 0; sh.u.length = 0; sh.c.length = 0; sh.m.length = 0; sh.i.length = 0;
  gl.p.length = 0; gl.n.length = 0; gl.u.length = 0; gl.c.length = 0; gl.m.length = 0; gl.i.length = 0;
  for (let t = 0; t < src.i.length; t += 3) {
    const m = src.m[src.i[t]];
    const dst = (m > 8.5 && m < 9.5) ? sh : gl;
    for (let k = 0; k < 3; k += 1) {
      const vi = src.i[t + k];
      dst.p.push(src.p[vi * 3], src.p[vi * 3 + 1], src.p[vi * 3 + 2]);
      dst.n.push(src.n[vi * 3], src.n[vi * 3 + 1], src.n[vi * 3 + 2]);
      dst.u.push(src.u[vi * 2], src.u[vi * 2 + 1]);
      dst.c.push(src.c[vi * 3], src.c[vi * 3 + 1], src.c[vi * 3 + 2]);
      dst.m.push(src.m[vi]);
      dst.i.push(dst.p.length / 3 - 1);
    }
  }
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
// Rotasi sudut (x, z) mengelilingi sumbu Y sebesar phi (radian).
// local +Z -> (sin phi, cos phi). Untuk mobil game angle a: phi = PI/2 - a.
function rotY(x, z, phi) {
  const c = Math.cos(phi), s = Math.sin(phi);
  return [x * c + z * s, -x * s + z * c];
}
// Box dengan yaw (putar sumbu Y) + pitch (putar sumbu X, untuk drawbridge).
// Sudut dalam radian. UV dalam satuan dunia (jendela konsisten).
function boxR(B, cx, cy, cz, w, h, d, ry, rx, col, m) {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const cy2 = Math.cos(ry), sy2 = Math.sin(ry), cx2 = Math.cos(rx), sx2 = Math.sin(rx);
  const rot = (x, y, z) => {
    // yaw dulu, lalu pitch
    const x1 = x * cy2 + z * sy2, z1 = -x * sy2 + z * cy2;
    const y2 = y * cx2 - z1 * sx2, z2 = y * sx2 + z1 * cx2;
    return [cx + x1, cy + y2, cz + z2];
  };
  const nrm = (x, y, z) => {
    const x1 = x * cy2 + z * sy2, z1 = -x * sy2 + z * cy2;
    const y2 = y * cx2 - z1 * sx2, z2 = y * sx2 + z1 * cx2;
    const l = Math.hypot(x1, y2, z2) || 1;
    return [x1 / l, y2 / l, z2 / l];
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
// Quad datar (y = const) menghadap +Y — jalan, trotoar, air, shadow, smear.
function flat(B, x, y, z, w, d, col, m, uvs) {
  const hw = w / 2, hd = d / 2;
  quad(B, [x - hw, y, z - hd], [x + hw, y, z - hd], [x + hw, y, z + hd], [x - hw, y, z + hd], [0, 1, 0],
    uvs || [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
}
// Quad vertikal dengan normal bebas (neon sign, lampu, kaca depan/belakang).
// nrm = normal (ternormalisasi), right = arah lebar, up = (0,1,0).
function billDir(B, cx, cy, cz, w, h, nrm, col, m) {
  const r = norm(cross([0, 1, 0], nrm));
  const hw = w / 2, hh = h / 2;
  const c = (sr, sh) => [cx + r[0] * sr * hw, cy + sh * hh, cz + r[2] * sr * hw];
  quad(B, c(-1, -1), c(1, -1), c(1, 1), c(-1, 1), nrm, [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
}

// ---- DEBOX R27b: geometri non-kotak (sudut chamfer, silinder, balok antar-titik) ----
// Prisma segi-N: ring = [[dx,dz],...] (offset dari pusat). Normal luar dihitung
// dari posisi (bukan urutan ring). Sisi pakai UV dunia (seperti boxR) supaya
// fasad material 0 tetap berjendela; atap = kipas segitiga.
function deboxPoly(B, cx, y0, cz, ring, h, col, m) {
  const n = ring.length;
  for (let i = 0; i < n; i += 1) {
    const a = ring[i], b = ring[(i + 1) % n];
    const ex = b[0] - a[0], ez = b[1] - a[1];
    const el = Math.hypot(ex, ez) || 1, ux = ex / el, uz = ez / el;
    let nx = uz, nz = -ux;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
    const A = [cx + a[0], y0, cz + a[1]], Bp = [cx + b[0], y0, cz + b[1]];
    const C = [cx + b[0], y0 + h, cz + b[1]], D = [cx + a[0], y0 + h, cz + a[1]];
    const uA = A[0] * ux + A[2] * uz, uB = Bp[0] * ux + Bp[2] * uz;
    quad(B, A, Bp, C, D, [nx, 0, nz], [[uA, y0], [uB, y0], [uB, y0 + h], [uA, y0 + h]], col, m);
  }
  const base = B.p.length / 3; // kipas atap (normal +Y — cabang fasad shader tak kena)
  push(B, [cx, y0 + h, cz], [0, 1, 0], [0, 0], col, m);
  for (let i = 0; i < n; i += 1) push(B, [cx + ring[i][0], y0 + h, cz + ring[i][1]], [0, 1, 0], [0, 0], col, m);
  for (let i = 0; i < n; i += 1) B.i.push(base, base + 1 + i, base + 1 + ((i + 1) % n));
}
// Kerucut / atap limas di atas ring (puncak di y0+ph).
function deboxCone(B, cx, y0, cz, ring, ph, col, m) {
  const n = ring.length, base = B.p.length / 3;
  push(B, [cx, y0 + ph, cz], [0, 1, 0], [0, 0], col, m);
  for (let i = 0; i < n; i += 1) {
    const a = ring[i], r = Math.hypot(a[0], a[1]) || 1;
    push(B, [cx + a[0], y0, cz + a[1]], norm([ph * a[0] / r, r, ph * a[1] / r]), [0, 0], col, m);
  }
  for (let i = 0; i < n; i += 1) B.i.push(base, base + 1 + i, base + 1 + ((i + 1) % n));
}
// Ring segi-4 dengan sudut chamfer (massa gedung tidak lagi balok polos).
function deboxRingRect(w, d, ch) {
  const hx2 = w / 2, hz2 = d / 2, c = Math.min(ch, hx2 * 0.9, hz2 * 0.9);
  return [[-hx2 + c, -hz2], [hx2 - c, -hz2], [hx2, -hz2 + c], [hx2, hz2 - c],
    [hx2 - c, hz2], [-hx2 + c, hz2], [-hx2, hz2 - c], [-hx2, -hz2 + c]];
}
// Ring lingkaran segi-n (tangki air, hydrant).
function deboxRingCircle(r, n) {
  const ring = [];
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    ring.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return ring;
}
// Balok antar dua titik (batang palem melengkung, lengan lampu): tebal w, sumbu lokal +Z.
function deboxBeam(B, ax, ay, az, bx, by, bz, w, col, m) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const ry = Math.asin(Math.max(-1, Math.min(1, dx / len)));
  const rx = Math.atan2(-dy, dz);
  boxR(B, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, w, w, len, ry, rx, col, m);
}

// ---- builder objek (koordinat dunia WebGL: X = game x*S, Z = game y*S, Y = atas) ----
const DARK = [0.05, 0.04, 0.06];
// Mobil: (cx, cz) pusat, yaw = PI/2 - angle game, len/wid dalam unit.
// Local +Z = depan mobil. Kabin kaca di belakang-tengah, kap depan, spoiler.
function car(B, G, cx, cz, yaw, len, wid, paint, police, SHB) { // SIANG v2: SHB = bucket bayangan kontak (SH bila preset minta, G = lama)
  const fwd = [Math.sin(yaw), Math.cos(yaw)]; // local +Z di dunia (X, Z)
  const rgt = [Math.cos(yaw), -Math.sin(yaw)];
  const at = (lx, ly, lz) => [cx + rgt[0] * lx + fwd[0] * lz, ly, cz + rgt[1] * lx + fwd[1] * lz];
  const p = (lx, ly, lz, w, h, d, col, m) => {
    const q = at(lx, ly, lz);
    boxR(B, q[0], q[1], q[2], w, h, d, yaw, 0, col, m);
  };
  p(0, 0.62, 0, wid, 0.55, len, paint, 1); // badan
  p(0, 1.12, -0.3, wid * 0.8, 0.5, len * 0.5, [0.10, 0.11, 0.16], 2); // kabin kaca
  p(0, 0.90, len * 0.43, wid * 0.9, 0.22, len * 0.16, paint, 1); // kap depan
  p(0, 0.96, -len * 0.47, wid * 0.95, 0.16, 0.35, DARK, 5); // spoiler
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    p(sx * (wid / 2 - 0.08), 0.35, sz * len * 0.33, 0.28, 0.7, 0.75, [0.02, 0.02, 0.02], 5); // roda
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) // velg: cakram logam di sisi luar roda
    p(sx * (wid / 2 + 0.07), 0.35, sz * len * 0.33, 0.06, 0.45, 0.5, [0.72, 0.72, 0.76], 1);
  p(0, 0.55, len / 2 + 0.03, wid * 0.7, 0.18, 0.08, [0.05, 0.05, 0.06], 5); // grill depan
  for (const sx of [-1, 1]) p(sx * (wid / 2 + 0.12), 1.05, len * 0.12, 0.12, 0.1, 0.22, paint, 1); // spion
  // lampu rem (belakang, local -Z) + lampu depan (local +Z)
  const zb = at(0, 0.72, -len / 2 - 0.02), zf = at(0, 0.68, len / 2 + 0.02);
  const nb = [-fwd[0], 0, -fwd[1]], nf = [fwd[0], 0, fwd[1]];
  for (const sx of [-0.62, 0.62]) {
    const pb = at(sx, 0.72, -len / 2 - 0.02);
    billDir(B, pb[0], pb[1], pb[2], 0.5, 0.16, nb, [1.0, 0.12, 0.15], 4);
    const gb = at(sx, 0.72, -len / 2 - 0.12);
    billDir(G, gb[0], gb[1], gb[2], 1.1, 0.5, nb, [1.0, 0.15, 0.2], 7);
    const pf = at(sx, 0.68, len / 2 + 0.02);
    billDir(B, pf[0], pf[1], pf[2], 0.45, 0.14, nf, [1.0, 0.9, 0.6], 4);
  }
  if (police) {
    const p1 = at(-0.35, 1.45, -0.3), p2 = at(0.35, 1.45, -0.3), p3 = at(0, 1.45, -0.3);
    billDir(B, p1[0], p1[1], p1[2], 0.5, 0.18, nb, [1.0, 0.1, 0.15], 4);
    billDir(B, p2[0], p2[1], p2[2], 0.5, 0.18, nb, [0.15, 0.3, 1.0], 4);
    billDir(G, p3[0], p3[1], p3[2], 1.6, 0.6, nb, [0.7, 0.2, 0.6], 7);
  }
  flat(SHB || G, cx, 0.06, cz, wid + 0.7, len + 0.9, [0, 0, 0], 9); // contact shadow (bucket SH = blending normal; di G aditif hitam = 0 — lihat INTEGRATION.md §6)
}
// Perahu — lambung LOFT melengkung (bukan balok): 6 stasiun, haluan tirus ke
// satu titik + sheer naik ke stem, sisi-V (lunas lebih sempit dari sheer),
// dek ikut menyempit, rub rail putih ikut lekuk sheer. Visual +25% (len/wid
// di sini saja — footprint/kolisi di boats.js TIDAK berubah).
// opts: {driver} hero/sipil, {pol} polisi (lambung sama, biru + light bar).
function boat(B, G, cx, cz, yaw, len, wid, paint, opts) {
  len *= 1.25; wid *= 1.25;
  const fwd = [Math.sin(yaw), Math.cos(yaw)];
  const rgt = [Math.cos(yaw), -Math.sin(yaw)];
  const at = (lx, ly, lz) => [cx + rgt[0] * lx + fwd[0] * lz, ly, cz + rgt[1] * lx + fwd[1] * lz];
  const p = (lx, ly, lz, w, h, d, col, m) => {
    const q = at(lx, ly, lz);
    boxR(B, q[0], q[1], q[2], w, h, d, yaw, 0, col, m);
  };
  const pp = (lx, ly, lz, w, h, d, col, m, rx) => {
    const q = at(lx, ly, lz);
    boxR(B, q[0], q[1], q[2], w, h, d, yaw, rx, col, m);
  };
  const Q = (a, b, c, d, n, col, m) => quad(B, a, b, c, d, n, [[0, 0], [1, 0], [1, 1], [0, 1]], col, m);
  const pol = opts && opts.pol;
  const nb = [-fwd[0], 0, -fwd[1]];
  const dk = [0.92, 0.92, 0.9], wt = [0.95, 0.95, 0.93];
  const dk2 = paint.map((v) => v * 0.45);
  // stasiun: [z/len, setengah-lebar, y sheer, y lunas, lunas/shear]
  const S = [[-0.5, 1, 0.92, 0.16, 0.68], [-0.28, 1, 0.92, 0.12, 0.68], [0, 0.97, 0.96, 0.12, 0.68], [0.24, 0.85, 1.04, 0.2, 0.7], [0.4, 0.6, 1.18, 0.36, 0.72], [0.5, 0.04, 1.36, 0.6, 0.8]];
  for (let i = 0; i < 5; i++) {
    const a = S[i], b = S[i + 1];
    for (const sg of [-1, 1]) {
      Q(at(sg * a[1] * a[4] * wid / 2, a[3], a[0] * len), at(sg * b[1] * b[4] * wid / 2, b[3], b[0] * len),
        at(sg * b[1] * wid / 2, b[2], b[0] * len), at(sg * a[1] * wid / 2, a[2], a[0] * len),
        [rgt[0] * sg, -0.35, rgt[1] * sg], paint, 1); // sisi lambung miring-V
      Q(at(sg * a[1] * wid / 2, a[2] - 0.02, a[0] * len), at(sg * b[1] * wid / 2, b[2] - 0.02, b[0] * len),
        at(sg * b[1] * wid / 2, b[2] + 0.07, b[0] * len), at(sg * a[1] * wid / 2, a[2] + 0.07, a[0] * len),
        [rgt[0] * sg, 0, rgt[1] * sg], wt, 5); // rub rail putih ikut sheer
    }
    Q(at(-a[1] * wid / 2, a[2], a[0] * len), at(a[1] * wid / 2, a[2], a[0] * len),
      at(b[1] * wid / 2, b[2], b[0] * len), at(-b[1] * wid / 2, b[2], b[0] * len), [0, 1, 0], dk, 5); // dek
    Q(at(-a[1] * a[4] * wid / 2, a[3], a[0] * len), at(a[1] * a[4] * wid / 2, a[3], a[0] * len),
      at(b[1] * b[4] * wid / 2, b[3], b[0] * len), at(-b[1] * b[4] * wid / 2, b[3], b[0] * len), [0, -1, 0], dk2, 5); // lunas
  }
  Q(at(-0.68 * wid / 2, 0.16, -len / 2), at(0.68 * wid / 2, 0.16, -len / 2),
    at(wid / 2, 0.92, -len / 2), at(-wid / 2, 0.92, -len / 2), nb, paint, 1); // transom
  p(0, 0.86, -len / 2 - 0.02, wid * 0.9, 0.08, 0.06, wt, 5); // strip putih transom
  p(0, 1.45, len * 0.48, 0.14, 0.45, 0.14, pol ? wt : paint, 1); // stem peak
  p(0, 1.15, -0.7, wid * 0.55, 0.45, len * 0.22, [0.12, 0.13, 0.16], 2); // konsol + kaca
  pp(0, 1.38, -0.42, wid * 0.5, 0.5, 0.06, [0.10, 0.16, 0.28], 2, -0.5); // kaca depan miring
  if (pol) { // light bar polisi di atap konsol (identitas dari belakang)
    p(0, 1.48, -0.7, 1.1, 0.22, 0.4, [0.08, 0.08, 0.10], 5);
    const l1 = at(-0.28, 1.48, -0.92), l2 = at(0.28, 1.48, -0.92);
    billDir(B, l1[0], l1[1], l1[2], 0.4, 0.18, nb, [1.0, 0.12, 0.15], 4);
    billDir(B, l2[0], l2[1], l2[2], 0.4, 0.18, nb, [0.15, 0.35, 1.0], 4);
  } else if (opts && opts.driver) { // driver: rompi oranye + helm kuning
    p(0, 1.18, -1.7, 0.62, 0.42, 0.34, [1.0, 0.35, 0.12], 5);
    p(0, 1.58, -1.7, 0.38, 0.32, 0.38, [1.0, 0.82, 0.24], 4);
    const vs = at(0, 1.58, -1.9);
    billDir(B, vs[0], vs[1], vs[2], 0.3, 0.12, nb, [0.10, 0.10, 0.12], 5); // visor belakang
  }
  for (const sx of [-0.32, 0.32]) { // motor tempel: kaki pendek (ujung = garis lunas, bukan roda) + cowl gede
    p(sx * wid, 0.38, -len / 2 - 0.15, 0.18, 0.4, 0.24, [0.15, 0.15, 0.17], 5);
    p(sx * wid, 0.95, -len / 2 - 0.12, 0.42, 0.42, 0.42, paint, 1);
    const bs = at(sx * wid, 0.55, -len / 2 - 0.34);
    billDir(B, bs[0], bs[1], bs[2], 0.3, 0.12, nb, wt, 5);
  }
  const ps = at(0, 0.45, -len / 2 - 0.35);
  billDir(G, ps[0], ps[1], ps[2], wid * 0.9, 0.4, nb, [0.9, 0.95, 1.0], 7); // sembur prop wash
  // V-wake Kelvin (~19.5 deg) + buih + rooster tail (Canvas boat3d)
  const wc = [0.9, 0.95, 1.0];
  for (const sg of [-1, 1]) {
    const a = 19.5 * Math.PI / 180;
    const dx = -fwd[0] * Math.cos(a) + sg * rgt[0] * Math.sin(a);
    const dz = -fwd[1] * Math.cos(a) + sg * rgt[1] * Math.sin(a);
    const S0 = at(sg * wid * 0.32, 0.09, len * 0.30);
    const L1 = len * 1.1, px = -dz, pz = dx;
    quad(G, [S0[0] - px * 0.08, 0.09, S0[2] - pz * 0.08], [S0[0] + px * 0.08, 0.09, S0[2] + pz * 0.08],
      [S0[0] + dx * L1 + px * 0.35, 0.09, S0[2] + dz * L1 + pz * 0.35],
      [S0[0] + dx * L1 - px * 0.35, 0.09, S0[2] + dz * L1 - pz * 0.35],
      [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], wc, 8);
    const sf = at(sg * wid * 0.5, 0.09, -len * 0.42); // spray sudut transom
    quad(G, [sf[0] - px * 0.05, 0.09, sf[2] - pz * 0.05], [sf[0] + px * 0.05, 0.09, sf[2] + pz * 0.05],
      [sf[0] + dx * 0.9 + px * 0.3, 0.09, sf[2] + dz * 0.9 + pz * 0.3],
      [sf[0] + dx * 0.9 - px * 0.3, 0.09, sf[2] + dz * 0.9 - pz * 0.3],
      [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], wc, 8);
  }
  for (let i = 0; i < 3; i += 1) { // buih diamond di belakang transom
    const fc = -len / 2 - (0.7 + i * 0.8), sd = i % 2 === 0 ? -1 : 1;
    const rc = sd * (0.18 + i * 0.26), hs = 0.3 + i * 0.05;
    const d0 = at(rc, 0.09, fc - hs), d1 = at(rc - hs * 0.7, 0.09, fc);
    const d2 = at(rc, 0.09, fc + hs), d3 = at(rc + hs * 0.7, 0.09, fc);
    quad(G, [d0[0], 0.09, d0[2]], [d1[0], 0.09, d1[2]], [d2[0], 0.09, d2[2]], [d3[0], 0.09, d3[2]],
      [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], wc, 8);
  }
  const r0 = at(-0.26, 0.5, -len / 2 - 0.25), r1 = at(0.26, 0.5, -len / 2 - 0.25);
  const r2 = at(0.07, 0.9, -len / 2 - 0.95), r3 = at(-0.07, 0.9, -len / 2 - 0.95);
  quad(G, [r0[0], 0.5, r0[2]], [r1[0], 0.5, r1[2]], [r2[0], 0.9, r2[2]], [r3[0], 0.9, r3[2]],
    nb, [[0, 0], [1, 0], [1, 1], [0, 1]], wc, 8); // rooster tail miring
}
// Gedung DEBOX R27b: massa prisma segi-8 (sudut chamfer, bukan balok) +
// lantai atas setback (tinggi>=3) / lis atap (rendah) + rooftop props di
// atap setback: tangki air SILINDER + antena + dish + AC. Tapak/posisi
// TIDAK berubah (kolisi + minimap aman); hanya siluet + atap dibentuk ulang.
function bld(B, G, b, idx, facK) { // SIANG v2: facK = pengali kecerahan fasad ikut preset (siang 0.72; lainnya 0.55 = lama)
  const cx = (b.x + b.w / 2) * S, cz = (b.y + b.h / 2) * S;
  const w = b.w * S, d = b.h * S;
  const h = (b.height || 2) * 6.5;
  const col = hx(b.color || '#333344').map((v) => v * (facK === undefined ? 0.55 : facK));
  const dark = col.map((v) => v * 0.82);
  const ch = Math.min(w, d) * 0.12;
  deboxPoly(B, cx, 0, cz, deboxRingRect(w, d, ch), h, col, 0); // massa chamfer
  const tall = (b.height || 2) >= 3;
  const topY = tall ? h + 3.0 : h; // atap setback (tinggi) / atap utama (rendah)
  if (tall) { // lantai atas setback (menara berundak, bukan menara balok)
    deboxPoly(B, cx, h, cz, deboxRingRect(w * 0.5, d * 0.5, ch * 0.5), 3.0, dark, 0);
  } else { // lis atap tipis (parapet) untuk gedung rendah
    deboxPoly(B, cx, h, cz, deboxRingRect(w * 0.96, d * 0.96, ch * 0.96), 0.5, dark, 0);
  }
  if (tall) { // GEDUNG: rooftop props di atap setback (sudut berlawanan, tak tumpang tindih)
    if (hash2(idx, 31) < 0.5) { // tangki air SILINDER + atap kerucut
      const tx = cx - w * 0.10, tz = cz + d * 0.10;
      const ring = deboxRingCircle(Math.min(0.95, w * 0.09, d * 0.09), 10);
      deboxPoly(B, tx, topY, tz, ring, 1.8, [0.45, 0.38, 0.30], 5);
      deboxCone(B, tx, topY + 1.8, tz, ring, 0.7, [0.38, 0.32, 0.26], 5);
    }
    if (hash2(idx, 37) < 0.6) box(B, cx - w * 0.16, topY + 1.8, cz - d * 0.12, 0.15, 3.6, 0.15, DARK, 5); // antena
    if (hash2(idx, 43) < 0.4) { // dish (ukuran ikut gedung supaya muat di atap setback)
      const ds = Math.min(1.4, w * 0.12, d * 0.12);
      boxR(B, cx + w * 0.10, topY + 0.7, cz + d * 0.12, ds, 0.15, ds, 0, 0.6, [0.8, 0.8, 0.85], 5);
    }
    box(B, cx + w * 0.14, topY + 0.4, cz - d * 0.12, w * 0.16, 0.8, d * 0.16, DARK, 5); // AC rooftop
  }
  if (b.landmark === 'lighthouse') {
    box(B, cx, h + 2.2, cz, 1.2, 3.2, 1.2, [0.9, 0.88, 0.8], 5);
    billDir(B, cx, h + 3.4, cz - d / 2 - 0.1, 0.9, 0.9, [0, 0, -1], [1.0, 0.85, 0.4], 4);
    billDir(G, cx, h + 3.4, cz - d / 2 - 0.2, 2.4, 2.4, [0, 0, -1], [1.0, 0.8, 0.4], 7);
    return;
  }
  if (hash2(idx, 7) < 0.35) { // neon sign di satu muka gedung (agak rendah)
    const neon = hx(b.neon || '#ff4d9d');
    const face = hash2(idx, 13) < 0.5 ? 1 : -1;
    const sy = h * (0.42 + hash2(idx, 29) * 0.20);
    const sw = Math.min(4.5, w * 0.55);
    if (face > 0) billDir(B, cx, sy, cz - d / 2 - 0.06, sw, 1.0, [0, 0, -1], neon, 4);
    else billDir(B, cx, sy, cz + d / 2 + 0.06, sw, 1.0, [0, 0, 1], neon, 4);
  }
  if (hash2(idx, 53) < 0.45) { // GEDUNG: neon blade vertikal tegak di muka gedung
    const bn = hx(b.neon || '#ff4d9d');
    const f2 = hash2(idx, 13) < 0.5 ? 1 : -1;
    const by = h * (0.30 + hash2(idx, 61) * 0.25);
    const bx2 = cx + w * 0.35 * (hash2(idx, 67) < 0.5 ? 1 : -1);
    const bz2 = cz - f2 * (d / 2 + 0.35);
    billDir(B, bx2, by, bz2, 0.6, 2.6, [1, 0, 0], bn, 4);
    billDir(G, bx2, by, bz2, 1.4, 3.4, [1, 0, 0], bn, 7);
  }
}
const LAMP_STEEL = [0.30, 0.32, 0.36]; // baja terang — tiang hitam lama hilang di kejauhan
// Lampu jalan DEBOX R27b (GROUNDING #1 — kepala lampu melayang): tiang baja
// 0.40 (dulu 0.18 hitam — tak kelihatan di jarak chase-cam) + pondasi beton +
// lengan 2 segmen ke arah persimpangan + kepala lampu yang NEMPEL di ujung
// lengan (housing + panel cahaya bawah + halo). (dx, dz) = arah mendatar ke
// pusat persimpangan (normalisasi). TOD: k = preset.lamp (0 siang — 1 malam).
// Tiang selalu digambar; kepala/glow/kolam cahaya HANYA bila k > 0.02 — mat 4
// alpha-nya 1.0 (kotak hitam kalau warnanya 0) dan mat 8 alpha-nya tetap
// (noda gelap kalau warnanya 0).
function lamp(B, G, x, z, k, dx, dz) {
  if (dx === undefined) { dx = 0; dz = 1; }
  box(B, x, 0.35, z, 0.7, 0.7, 0.7, [0.32, 0.32, 0.34], 5); // pondasi beton
  box(B, x, 2.5, z, 0.40, 5, 0.40, LAMP_STEEL, 5); // tiang tebal, baja terang
  const hx2 = x + dx * 1.7, hz2 = z + dz * 1.7; // kepala menggantung di atas jalan
  deboxBeam(B, x, 4.85, z, x + dx * 0.9, 5.15, z + dz * 0.9, 0.22, LAMP_STEEL, 5); // lengan naik
  deboxBeam(B, x + dx * 0.9, 5.15, z + dz * 0.9, hx2, 5.05, hz2, 0.22, LAMP_STEEL, 5); // lengan datar
  const ry = Math.atan2(dx, dz);
  boxR(B, hx2, 4.95, hz2, 0.5, 0.28, 0.95, ry, 0, LAMP_STEEL, 5); // housing kepala
  if (k === undefined) k = 1;
  if (k <= 0.02) return;
  const sc = (c) => [c[0] * k, c[1] * k, c[2] * k];
  const pc = (lx, lz) => { const q = rotY(lx, lz, ry); return [hx2 + q[0], 4.80, hz2 + q[1]]; };
  quad(B, pc(-0.35, -0.18), pc(0.35, -0.18), pc(0.35, 0.18), pc(-0.35, 0.18), // panel cahaya di bawah housing (menghadap bawah)
    [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], sc([1.0, 0.8, 0.45]), 4);
  billDir(G, hx2, 4.95, hz2, 2.2, 1.1, [0, 0, -1], sc([1.0, 0.75, 0.4]), 7); // halo
  flat(G, hx2, 0.08, hz2, 2.2, 2.2, sc([1.0, 0.7, 0.35]), 8); // kolam cahaya di tanah (bundar di bawah kepala — dulu 1.4x7 = streak laser)
}
// Palem DEBOX R27b: batang melengkung (3 segmen) + kanopi pelepah berlapis
// (8 pelepah × 2 ruas menjuntai, bukan slab hijau) + tandan kelapa.
function palm(B, x, z) {
  const ang = hash2(Math.round(x), Math.round(z)) * Math.PI * 2;
  const lx = Math.cos(ang) * 0.9, lz = Math.sin(ang) * 0.9; // arah lengkung batang
  const TRUNK = [0.23, 0.16, 0.11];
  deboxBeam(B, x, 0, z, x + lx * 0.30, 1.6, z + lz * 0.30, 0.34, TRUNK, 5);
  deboxBeam(B, x + lx * 0.30, 1.6, z + lz * 0.30, x + lx * 0.65, 3.1, z + lz * 0.65, 0.30, TRUNK, 5);
  deboxBeam(B, x + lx * 0.65, 3.1, z + lz * 0.65, x + lx * 1.0, 4.4, z + lz * 1.0, 0.26, TRUNK, 5);
  const tx = x + lx, tz = z + lz, ty = 4.5; // puncak batang
  box(B, tx, ty, tz, 0.5, 0.5, 0.5, [0.10, 0.30, 0.14], 5); // mahkota
  const GREENS = [[0.16, 0.46, 0.22], [0.11, 0.37, 0.17]];
  for (let k = 0; k < 8; k += 1) {
    const a = (k / 8) * Math.PI * 2 + hash2(Math.round(x), k) * 0.5;
    const dx = Math.cos(a), dz = Math.sin(a);
    const px = -dz, pz = dx; // tegak lurus pelepah (lebar)
    const L = 1.5 + hash2(k, Math.round(z)) * 0.6; // panjang pelepah bervariasi
    const M = [tx + dx * L * 0.55, ty + 0.45, tz + dz * L * 0.55]; // ruas naik
    const P = [tx + dx * L, ty - 0.85, tz + dz * L]; // ujung menjuntai
    const col = GREENS[k % 2];
    const frond = (A, Bp, wA, wB) => {
      const e = [Bp[0] - A[0], Bp[1] - A[1], Bp[2] - A[2]];
      const n = norm(cross(e, [px, 0, pz]));
      const nn = n[1] < 0 ? [-n[0], -n[1], -n[2]] : n;
      quad(B, [A[0] - px * wA, A[1], A[2] - pz * wA], [A[0] + px * wA, A[1], A[2] + pz * wA],
        [Bp[0] + px * wB, Bp[1], Bp[2] + pz * wB], [Bp[0] - px * wB, Bp[1], Bp[2] - pz * wB],
        nn, [[0, 0], [1, 0], [1, 1], [0, 1]], col, 5);
    };
    frond([tx, ty, tz], M, 0.30, 0.24);
    frond(M, P, 0.24, 0.05);
  }
  for (let i = 0; i < 3; i += 1) // tandan kelapa di bawah mahkota
    box(B, tx + (i - 1) * 0.22, ty - 0.35, tz + 0.1, 0.2, 0.2, 0.2, [0.45, 0.30, 0.12], 5);
}
// HELI R27b: putih-biru, disc, profil, skid+fin.
function heli(B,G,x,z,rotor,t,v){
 const y=14,yw=Math.atan2(v[0],v[1])+1.5708;
 const F=[Math.sin(yw),Math.cos(yw)],R=[Math.cos(yw),-Math.sin(yw)];
 const at=(a,b,c)=>[x+R[0]*a+F[0]*c,y+b,z+R[1]*a+F[1]*c];
 const p=(a,b,c,w,h,d,c2,m)=>{const q=at(a,b,c);boxR(B,q[0],q[1],q[2],w,h,d,yw,0,c2,m);};
 const W=[0.88,0.9,0.94],U=[0.13,0.32,0.78],L=[0.78,0.8,0.84],K=[0.55,0.8,1];
 p(0,0.1,0,2.2,1.3,3.8,W,1);
 p(0,-0.55,0,2,0.5,3.6,U,4);
 p(0,-0.1,0,2.32,0.34,3.9,U,4);
 p(0,0.9,0,1.8,0.35,3,W,1);
 p(0,0,2.25,1.9,1,1,W,1);
 p(0,0.25,0.9,2.34,0.85,1.9,K,4);
 p(0,0.35,-3.6,0.55,0.55,3.2,W,1);
 p(0,0.6,-5,0.25,1.2,1,U,4);
 p(0,0.55,-4.6,2.4,0.1,0.6,L,5);
 const q=at(0.42,0.95,-5);
 billDir(G,q[0],q[1],q[2],1.7,1.7,[R[0],0,R[1]],[0.9,0.92,0.95],7);
 boxR(B,x,y+1.35,z,1.1,0.14,13.5,rotor,0,L,4);
 flat(G,x,y+1.5,z,13,13,[0.72,0.78,0.86],7);
 for(const s of[-1,1])p(s*0.85,-1.25,0,0.16,0.16,4.4,L,5);
 for(const s of[-1,1])for(const q2 of[-1,1])p(s*0.85,-0.95,q2*1.2,0.14,0.6,0.14,L,5);
 p(0,-0.95,1.2,0.5,0.3,0.5,[0.1,0.1,0.12],5);
 if(Math.sin(t*6)>0)p(0,1.2,0,0.5,0.25,0.5,[1,0.1,0.1],4);
}
// Orang jalan kaki: badan + kepala.
function person(B, x, z, yaw, col) {
  const p = (lx, ly, lz, w, h, d, c, m) => {
    const q = rotY(lx, lz, yaw);
    boxR(B, x + q[0], ly, z + q[1], w, h, d, yaw, 0, c, m);
  };
  p(0, 0.85, 0, 0.55, 1.1, 0.35, col, 5);
  p(0, 1.65, 0, 0.4, 0.4, 0.4, [0.85, 0.65, 0.5], 5);
}

// ---- jembatan state: bangun geometri frame dari state game yang hidup ----
const BRIDGE_POS = { x: 2400, y: 1680, top: 1640, bottom: 1720 }; // dari drawbridge.js
const WATER_X = 2448;
function heroOf(state) {
  const p = state.player;
  if (p.inCar && p.car) return p.car;
  if (p.inBoat && p.boat) return p.boat;
  return p;
}
function distPx(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function buildFrame(state, cam, OP, SH, GL, t) {
  const tod = state.timeOfDay || PRESETS.sore; // TOD: tanpa preset = sore (nilai lama)
  const SHB = tod.bldShadow ? SH : GL; // SIANG v2: bucket bayangan kontak — SH = blending normal (terlihat), G = lama (aditif, hitam = 0)
  // SIANG v2: bayangan gedung + palem (hanya bila preset minta — siang;
  // sore/pagi/malam TIDAK berubah). Matahari mengikuti kamera: arah bayangan
  // = -arah matahari horizontal; panjang = tinggi * |SUN.xz| / SUN.y.
  const shDir = (() => {
    const fx2 = cam.fwd[0], fz2 = cam.fwd[1];
    const rx2 = fz2, rz2 = -fx2;
    const sx2 = fx2 * 0.85 + rx2 * 0.18, sz2 = fz2 * 0.85 + rz2 * 0.18;
    const sl2 = Math.hypot(sx2, sz2) || 1;
    return { dx: -sx2 / sl2, dz: -sz2 / sl2, len: sl2 / tod.sun.y };
  })();
  const groundShadow = (cx, cz, w, d, h) => {
    // Quad gelap di tanah dari tengah gedung ke arah bayangan; setengah yang
    // di dalam gedung tersembunyi (depth test); ujung jauh memudar (UV v 0.5->0.85).
    const L = h * shDir.len + Math.max(w, d) * 0.5;
    const px2 = -shDir.dz, pz2 = shDir.dx;
    const hw2 = Math.max(w, d) * 0.45;
    const bx2 = cx + shDir.dx * (L / 2), bz2 = cz + shDir.dz * (L / 2);
    quad(SH, [bx2 - px2 * hw2 - shDir.dx * L / 2, 0.03, bz2 - pz2 * hw2 - shDir.dz * L / 2],
      [bx2 + px2 * hw2 - shDir.dx * L / 2, 0.03, bz2 + pz2 * hw2 - shDir.dz * L / 2],
      [bx2 + px2 * hw2 + shDir.dx * L / 2, 0.03, bz2 + pz2 * hw2 + shDir.dz * L / 2],
      [bx2 - px2 * hw2 + shDir.dx * L / 2, 0.03, bz2 - pz2 * hw2 + shDir.dz * L / 2],
      [0, 1, 0], [[0, 0.5], [1, 0.5], [1, 0.85], [0, 0.85]], [0, 0, 0], 9);
  };
  const city = state.city;
  const hero = heroOf(state);
  const hx0 = hero.x, hy0 = hero.y;
  const near = (x, y, r) => distPx(x, y, hx0, hy0) < r;
  const R = 1700; // jangkauan gambar (px game)

  // Tanah: bidang gelap di bawah seluruh area pandang (tanpa ini, antar-jalan
  // berlubang dan langit oranye terlihat menembus ke bawah horizon).
  flat(OP, hx0 * S, -0.1, hy0 * S, 340, 340, [0.11, 0.13, 0.10], 5);

  // Jalan: segmen di sekitar hero (u = sepanjang jalan, v = melintang, untuk marka).
  const roadCol = [0.10, 0.09, 0.11], walkCol = [0.22, 0.20, 0.24];
  const roadSeg = (x0, y0, x1, y1, vertical) => {
    const len = Math.hypot(x1 - x0, y1 - y0) * S;
    const hw = 36 * S;
    if (vertical) {
      const X = x0 * S, z0 = y0 * S, z1 = y1 * S;
      quad(OP, [X - hw, -0.05, z0], [X + hw, -0.05, z0], [X + hw, -0.05, z1], [X - hw, -0.05, z1],
        [0, 1, 0], [[0, 0], [0, 1], [len, 1], [len, 0]], roadCol, 3);
      flat(OP, X - (hw + 1.2), 0.02, (z0 + z1) / 2, 2.4, (z1 - z0), walkCol, 6);
      flat(OP, X + (hw + 1.2), 0.02, (z0 + z1) / 2, 2.4, (z1 - z0), walkCol, 6);
    } else {
      const Z = y0 * S, x0u = x0 * S, x1u = x1 * S;
      quad(OP, [x0u, -0.05, Z - hw], [x1u, -0.05, Z - hw], [x1u, -0.05, Z + hw], [x0u, -0.05, Z + hw],
        [0, 1, 0], [[0, 0], [len, 0], [len, 1], [0, 1]], roadCol, 3);
      flat(OP, (x0u + x1u) / 2, 0.02, Z - (hw + 1.2), (x1u - x0u), 2.4, walkCol, 6);
      flat(OP, (x0u + x1u) / 2, 0.02, Z + (hw + 1.2), (x1u - x0u), 2.4, walkCol, 6);
    }
  };
  for (const rx of city.roadsV) {
    if (Math.abs(rx - hx0) > R) continue;
    roadSeg(rx, Math.max(0, hy0 - 1500), rx, Math.min(1920, hy0 + 1500), true);
  }
  for (const ry of city.roadsH) {
    if (Math.abs(ry - hy0) > R) continue;
    roadSeg(Math.max(0, hx0 - 1500), ry, Math.min(WATER_X, hx0 + 1500), ry, false); // R26: jalan berhenti di tepi air (WATER_X) — dulu sampai 2560, aspal + marka masuk ke laut dan menembus permukaan air (boat3d: perahu terbaca jalan di darat)
  }


  // Gedung (dekat hero saja) + taman + pohon.
  // Cull: gedung yang terlalu dekat dengan kamera dihilangkan (seperti
  // city3d round 22) — kalau tidak, satu dinding memenuhi sepertiga frame.
  const camX = cam.eye[0], camZ = cam.eye[2];
  let bi = 0;
  for (const b of city.buildings) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!near(cx, cy, R + 200)) { bi++; continue; }
    // GEDUNG: cull by jarak TERDEKAT fasad ke kamera (AABB), bukan pusat gedung.
    // Pusat 16 unit tapi fasad 1 unit dari kamera = tembok raksasa (VB-13).
    const bMinX = b.x * S, bMaxX = (b.x + b.w) * S, bMinZ = b.y * S, bMaxZ = (b.y + b.h) * S;
    const ddx = Math.max(bMinX - camX, 0, camX - bMaxX);
    const ddz = Math.max(bMinZ - camZ, 0, camZ - bMaxZ);
    if (Math.hypot(ddx, ddz) < 12) { bi++; continue; }
    bld(OP, GL, b, bi, tod.facK);
    if (tod.bldShadow) groundShadow(cx * S, cy * S, b.w * S, b.h * S, (b.height || 2) * 6.5); // SIANG v2: bayangan gedung di tanah
    bi++;
  }
  for (const pk of city.parks || []) {
    if (!near(pk.x + pk.w / 2, pk.y + pk.h / 2, R)) continue;
    flat(OP, (pk.x + pk.w / 2) * S, 0.03, (pk.y + pk.h / 2) * S, pk.w * S, pk.h * S, [0.12, 0.30, 0.16], 5);
  }
  for (const tr of city.trees || []) {
    if (!near(tr.x, tr.y, 1200)) continue;
    palm(OP, tr.x * S, tr.y * S);
    if (tod.bldShadow) groundShadow(tr.x * S, tr.y * S, 1.2, 1.2, 4.4); // SIANG v2: bayangan palem
  }

  // Air + dermaga + marina (kalau hero dekat pelabuhan).
  if (hx0 > 2250) {
    const y0 = Math.max(0, hy0 - 1500), y1 = Math.min(1920, hy0 + 1500);
    flat(OP, (WATER_X + 56) * S, 0.0, ((y0 + y1) / 2) * S, 112 * S, (y1 - y0) * S, [0.05, 0.20, 0.32], 10);
    const dk = city.docks;
    box(OP, (dk.x + dk.w / 2) * S, 0.25, (dk.y + dk.h / 2) * S, dk.w * S, 0.5, dk.h * S, [0.35, 0.30, 0.22], 5);
    const mr = city.marina;
    box(OP, (mr.x + mr.w / 2) * S, 0.25, (mr.y + mr.h / 2) * S, mr.w * S, 0.5, mr.h * S, [0.35, 0.30, 0.22], 5);
    drawCruiseShips(OP, GL); // R27b: kapal pesiar + yacht (statis, visual saja)
  }
  // Pom bensin + garasi (kalau dekat).
  if (near(955, 1595, R)) {
    box(OP, 955 * S, 2.5, 1490 * S, 210 * S, 0.4, 60 * S, [0.7, 0.7, 0.72], 5); // kanopi
    for (const px of [900, 960, 1020]) box(OP, px * S, 0.6, 1610 * S, 1.2, 1.2, 0.8, [0.9, 0.2, 0.2], 5);
  }
  if (near(480, 1440, R)) {
    box(OP, 480 * S, 2.0, 1440 * S, 8, 4, 6, [0.15, 0.16, 0.22], 0);
    billDir(OP, 480 * S, 4.5, 1440 * S - 3.1, 5, 1.0, [0, 0, -1], [0.05, 0.85, 0.95], 4);
  }

  // Drawbridge (x=2400, gap y 1640-1720).
  if (near(BRIDGE_POS.x, BRIDGE_POS.y, R)) {
    const bx = BRIDGE_POS.x * S;
    if (!state.bridge || !state.bridge.up) {
      flat(OP, bx, -0.02, BRIDGE_POS.y * S, 7.2, 8, [0.16, 0.16, 0.18], 3);
    } else {
      // dua daun terangkat ~70 derajat, engsel di tepi gap
      const leaf = (hingeZ, dir) => {
        const rx = dir * 1.2;
        const off = [0, 2 * Math.sin(1.2), dir * 2 * Math.cos(1.2)];
        boxR(OP, bx, 0.25 + off[1], hingeZ + off[2], 7.2, 0.5, 4, 0, rx, [0.16, 0.16, 0.18], 3);
      };
      leaf(BRIDGE_POS.top * S, 1);
      leaf(BRIDGE_POS.bottom * S, -1);
      if (Math.sin(t * 10) > 0) {
        for (const [lx, ly] of [[-3.6, BRIDGE_POS.top], [3.6, BRIDGE_POS.top], [-3.6, BRIDGE_POS.bottom], [3.6, BRIDGE_POS.bottom]]) {
          billDir(OP, bx + lx, 0.8, ly * S, 0.5, 0.5, [0, 0, -1], [1.0, 0.15, 0.1], 4);
        }
      }
    }
  }

  // Hero (mobil / perahu / jalan kaki).
  const p = state.player;
  const yawOf = (o) => Math.PI / 2 - (o.angle || 0);
  if (p.inCar && p.car) {
    const c = p.car;
    drawCarRealistic(OP, GL, 'hero', c.x * S, c.y * S, yawOf(c), (c.length || 46) * S, (c.width || 22) * S, hx(c.color || '#e33e5f'), { t }); // R26: hero selalu realistis v15d (gate heroReal dihapus)
    if (tod.headlight > 0.02) { // TOD: kerucut lampu depan (malam) — trapesium mat 8,
      // v=0 di bemper (terang) -> v=1 jauh (memudar, ikut shader smear).
      const yaw = yawOf(c), fw = [Math.sin(yaw), Math.cos(yaw)], rg = [Math.cos(yaw), -Math.sin(yaw)];
      const L = (c.length || 46) * S, Wd = (c.width || 22) * S, cx = c.x * S, cz = c.y * S;
      const at = (lx, lz) => [cx + rg[0] * lx + fw[0] * lz, 0.07, cz + rg[1] * lx + fw[1] * lz];
      const hc = [1.0 * tod.headlight, 0.85 * tod.headlight, 0.55 * tod.headlight];
      quad(GL, at(-Wd * 0.28, L / 2), at(Wd * 0.28, L / 2), at(Wd * 0.85, L / 2 + 14), at(-Wd * 0.85, L / 2 + 14),
        [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], hc, 8);
    }
  } else if (p.inBoat && p.boat) {
    const b = p.boat;
    boat(OP, GL, b.x * S, b.y * S, yawOf(b), (b.length || 54) * S, (b.width || 20) * S, hx(b.color || '#e8e4d8'), { driver: true });
  } else {
    person(OP, p.x * S, p.y * S, yawOf(p), [0.95, 0.8, 0.2]);
  }

  // Traffic + parkir — cars3d v14 (INTEGRATION.md §6 OPSI A) + LOD WAJIB:
  // hero + mobil <250 px game dari hero = high, sisanya 'low' (hemat ~43%).
  // Pemetaan body: 7 tipe T1 sama nama; body lama (sedan/hatch/van/taxi) ->
  // 'sedanL' (sedan generik — CAR_SPECS v14 TIDAK punya 'sedan'; fallback
  // carSpec('sedan') = hero, jadi JANGAN pakai 'sedan' mentah).
  const CAR_TYPE = { bus: 'bus', fire: 'fire', medic: 'medic', apc: 'apc', hatchback: 'hatchback', sedanL: 'sedanL', pickup: 'pickup', hatch: 'hatchback', sedan: 'sedanL', van: 'sedanL', taxi: 'sedanL' };
  const drawCar = (c, police, unit) => {
    if (!c || c.alive === false) return;
    if (!near(c.x, c.y, R)) return;
    let type;
    if (police) type = (unit && unit.emergency && (c.body === 'fire' || c.body === 'medic')) ? c.body : 'police';
    else type = CAR_TYPE[c.body] || 'sedanL';
    const lod = distPx(c.x, c.y, hx0, hy0) < 250 ? undefined : 'low';
    drawCarRealistic(OP, GL, type, c.x * S, c.y * S, yawOf(c), (c.length || 46) * S, (c.width || 22) * S, hx(c.color || '#888888'), { t, detail: lod });
  };
  for (const c of state.traffic.cars || []) drawCar(c, false);
  for (const c of state.traffic.parked || []) drawCar(c, false);

  // Polisi + militer + roadblock + tentara jalan kaki.
  for (const u of (state.police.units || [])) {
    if (u.kind === 'car' && u.car) {
      if (u.car.alive === false) continue;
      if (!near(u.car.x, u.car.y, R)) continue;
      if (u.military) {
        if (u.car.body === 'apc') drawCar(u.car, false); // APC v14 (turret + 6 roda); mtruck tetap car() lama (tak ada spec truk v14)
        else car(OP, GL, u.car.x * S, u.car.y * S, yawOf(u.car), (u.car.length || 54) * S, (u.car.width || 24) * S, [0.35, 0.38, 0.20], false, SHB);
      } else {
        drawCar(u.car, true, u);
      }
      if (u.concrete) box(OP, u.car.x * S, 0.7, u.car.y * S, 3, 1.4, 1.2, [0.55, 0.55, 0.58], 5);
    } else if (u.kind === 'boat') { // perahu polisi: biru + light bar (Canvas city3d.js:1651)
      if (!near(u.x, u.y, R)) continue;
      boat(OP, GL, u.x * S, u.y * S, yawOf(u), 54 * S, 20 * S, [0.18, 0.44, 0.82], { pol: true });
    } else if (u.x !== undefined && near(u.x, u.y, 1200)) {
      person(OP, u.x * S, u.y * S, yawOf(u), [0.15, 0.30, 0.65]);
    }
  }
  const at = state.armored && state.armored.truck;
  if (at && at.alive && near(at.x, at.y, R)) {
    car(OP, GL, at.x * S, at.y * S, yawOf(at), 6.0, 2.6, [0.45, 0.45, 0.42], false, SHB);
  }

  // Helikopter polisi + kolam cahaya searchlight di hero.
  const hl = state.police.heli;
  if (hl && hl.active) {
    heli(OP, GL, hl.x * S, hl.y * S, hl.rotor || 0, t, cam.fwd);
    flat(GL, hx0 * S, 0.07, hy0 * S, 12, 12, [1.0, 0.9, 0.6], 7);
    const rx2 = cam.fwd[1], rz2 = -cam.fwd[0];
    const dx = hx0 * S - hl.x * S, dz = hy0 * S - hl.y * S, dl = Math.hypot(dx, dz) || 1;
    const ex = hl.x * S + dx / dl * 1.5 + rx2 * 4, ez = hl.y * S + dz / dl * 1.5 + rz2 * 4;
    quad(GL, [hl.x * S - rx2 * 0.45, 13.1, hl.y * S - rz2 * 0.45], [hl.x * S + rx2 * 0.45, 13.1, hl.y * S + rz2 * 0.45],
      [ex + rx2, 9.5, ez + rz2], [ex - rx2, 9.5, ez - rz2],
      [cam.fwd[0], 0, cam.fwd[1]], [[0, 0], [1, 0], [1, 1], [0, 1]], [1.0, 0.9, 0.6], 7);
  }

  // Perahu (bukan hero) + UFO + pejalan kaki + collectible.
  for (const b of state.boats || []) {
    if (!b || b.alive === false) continue;
    if (p.inBoat && p.boat === b) continue;
    if (!near(b.x, b.y, R)) continue;
    boat(OP, GL, b.x * S, b.y * S, yawOf(b), (b.length || 54) * S, (b.width || 20) * S, hx(b.color || '#e8e4d8'), { driver: true });
  }
  if (state.ufo && state.ufo.active) {
    box(OP, state.ufo.x * S, 30, state.ufo.y * S, 6, 1, 6, [0.7, 0.85, 0.9], 5);
    flat(GL, state.ufo.x * S, 29, state.ufo.y * S, 12, 12, [0.6, 0.9, 1.0], 7);
  }
  for (const pd of state.peds || []) {
    if (pd.alive === false) continue;
    if (!near(pd.x, pd.y, 1200)) continue;
    person(OP, pd.x * S, pd.y * S, yawOf(pd), hx(pd.color || '#e8e4d8'));
  }
  for (const cl of state.collectibles || []) {
    if (cl.taken) continue;
    if (!near(cl.x, cl.y, 1200)) continue;
    // DEBOX R27b: token = permata berputar (bukan kubus kuning melayang)
    boxR(OP, cl.x * S, 1.0, cl.y * S, 0.9, 0.9, 0.9, t * 1.5, 0.6, [1.0, 0.8, 0.2], 4);
  }

  // DEBOX R27b: hydrant merah (silinder + kubah + tutup samping) — dulu tidak digambar di 3D.
  for (const hd of state.hydrants || []) {
    if (!near(hd.x, hd.y, 1200)) continue;
    const hx2 = hd.x * S, hz2 = hd.y * S;
    const hring = deboxRingCircle(0.32, 8);
    deboxPoly(OP, hx2, 0, hz2, hring, 0.75, [0.85, 0.28, 0.26], 5);
    deboxCone(OP, hx2, 0.75, hz2, hring, 0.3, [0.55, 0.17, 0.20], 5);
    box(OP, hx2 + 0.32, 0.45, hz2, 0.18, 0.18, 0.18, [0.55, 0.17, 0.20], 5);
    box(OP, hx2 - 0.32, 0.45, hz2, 0.18, 0.18, 0.18, [0.55, 0.17, 0.20], 5);
  }

  // Lampu jalan di persimpangan dekat hero.
  for (const rx of city.roadsV) {
    for (const ry of city.roadsH) {
      if (!near(rx, ry, 1400)) continue;
      // TOD (cull): tiang lampu <14 unit dari kamera dihilangkan — sama seperti
      // gedung (round 22). Tanpa ini, satu tiang di depan lensa memenuhi frame
      // (kasus nyata: shot pagi v1, tiang 3,2 unit dari kamera jadi bar hitam).
      // POLE-FIX R26: tiang HARUS di sudut trotoar (±48, ±48). Kode lama
      // (±48, ±20) benar terhadap SATU jalan tapi salah terhadap jalan yang
      // menyilang: 20 < ROAD_W/2 (36) = tiang berdiri DI ATAS aspal jalan
      // horizontal, di tengah jalur mobil (depan hero, jalur lawan). 48 =
      // tengah trotoar (aspal 36 + 12; fasad gedung di 50) — sama seperti
      // Canvas 2D (render.js:442 drawLamp pt.x+48, pt.y-48; city3d POLEFIX2
      // walkLat 4.8 unit) dan roadSeg trotoar di file ini (hw+1.2 unit).
      const lampNear = (lx, lz) => Math.hypot(lx * S - camX, lz * S - camZ) < 14;
      if (!lampNear(rx - 48, ry + 48)) lamp(OP, GL, (rx - 48) * S, (ry + 48) * S, tod.lamp, 0.7071, -0.7071); // DEBOX: lengan ke pusat persimpangan
      if (!lampNear(rx + 48, ry - 48)) lamp(OP, GL, (rx + 48) * S, (ry - 48) * S, tod.lamp, -0.7071, 0.7071);
    }
  }
}

// ---- kamera chase-cam (smoothing seperti city3d.js round 22) ----
function updateCamera(state, dt, cam) {
  const hero = heroOf(state);
  const a = hero.angle || 0;
  const speed = Math.abs(hero.speed || 0);
  const dist = 13 + Math.min(1, speed / 540) * 3;
  const latOff = -2.0;
  const snap = !cam.init || Math.hypot(hero.x - cam.hx, hero.y - cam.hy) > 600;
  if (snap) cam.yaw = a;
  else cam.yaw += angDiff(a, cam.yaw) * Math.min(1, dt * 4.0);
  const fx = Math.cos(cam.yaw), fz = Math.sin(cam.yaw);
  const tx = hero.x * S - fx * dist - fz * latOff;
  const tz = hero.y * S - fz * dist + fx * latOff;
  const still = cam.init && hero.x === cam.hx && hero.y === cam.hy;
  if (snap || still) { cam.x = tx; cam.z = tz; cam.init = true; }
  else {
    cam.x += (tx - cam.x) * Math.min(1, dt * 8);
    cam.z += (tz - cam.z) * Math.min(1, dt * 8);
  }
  cam.hx = hero.x; cam.hy = hero.y;
  cam.eye = [cam.x, 4.4, cam.z];
  cam.target = [hero.x * S + fx * 40, 2.2, hero.y * S + fz * 40];
  cam.fwd = [fx, fz];
}


// ---- factory: webgl2 dulu, fallback webgl, lalu null (2D hidup) ----
export function createRenderer(glCanvas) { // R26: tanpa HUD demo — HUD asli dari ui2.js (canvas 2D)
  let gl = null, mode = null;
  try { gl = glCanvas.getContext('webgl2', { antialias: true, preserveDrawingBuffer: true }); if (gl) mode = 'webgl2'; } catch (e) { /* lanjut fallback */ }
  if (!gl) {
    try { gl = glCanvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true }); if (gl) mode = 'webgl'; } catch (e) { /* null */ }
  }
  if (!gl) { console.warn('WEBGL2/WEBGL UNAVAILABLE — fallback ke Canvas 2D'); return null; }
  console.log('WEBGL RENDERER (' + mode + '): ' + gl.getParameter(gl.RENDERER));
  const { prog } = makeGL(gl);
  const P = prog(VS, FS), PS = prog(SKYV, SKYF);
  const A = {
    p: gl.getAttribLocation(P, 'aP'), n: gl.getAttribLocation(P, 'aN'),
    u: gl.getAttribLocation(P, 'aU'), c: gl.getAttribLocation(P, 'aC'),
    m: gl.getAttribLocation(P, 'aM'),
    uP: gl.getUniformLocation(P, 'uP'), uV: gl.getUniformLocation(P, 'uV'),
    uCam: gl.getUniformLocation(P, 'uCam'), uSun: gl.getUniformLocation(P, 'uSun'),
    uDay: gl.getUniformLocation(P, 'uDay'), uDark: gl.getUniformLocation(P, 'uDark'),
    uSunCol: gl.getUniformLocation(P, 'uSunCol'), uHz: gl.getUniformLocation(P, 'uHz'),
    uAmbG: gl.getUniformLocation(P, 'uAmbG'), uAmbS: gl.getUniformLocation(P, 'uAmbS'),
    uWinLit: gl.getUniformLocation(P, 'uWinLit'), uWinTint: gl.getUniformLocation(P, 'uWinTint'),
    uNeon: gl.getUniformLocation(P, 'uNeon'), uWaterDeep: gl.getUniformLocation(P, 'uWaterDeep'),
    uWaterSky: gl.getUniformLocation(P, 'uWaterSky'), uExposure: gl.getUniformLocation(P, 'uExposure'),
    uWinCell: gl.getUniformLocation(P, 'uWinCell'), uWinGlass: gl.getUniformLocation(P, 'uWinGlass'),
    uWinWarm: gl.getUniformLocation(P, 'uWinWarm'), uContrast: gl.getUniformLocation(P, 'uContrast'),
    uShadowK: gl.getUniformLocation(P, 'uShadowK'), uRoadTex: gl.getUniformLocation(P, 'uRoadTex'),
    uFogK: gl.getUniformLocation(P, 'uFogK'),
  };
  const skyU = {
    day: gl.getUniformLocation(PS, 'uDay'),
    sky0: gl.getUniformLocation(PS, 'uSky0'), sky1: gl.getUniformLocation(PS, 'uSky1'),
    sky2: gl.getUniformLocation(PS, 'uSky2'), sky3: gl.getUniformLocation(PS, 'uSky3'),
    sky4: gl.getUniformLocation(PS, 'uSky4'), sunPos: gl.getUniformLocation(PS, 'uSunPos'),
    sunDisc: gl.getUniformLocation(PS, 'uSunDisc'), sunGlow: gl.getUniformLocation(PS, 'uSunGlow'),
    moon: gl.getUniformLocation(PS, 'uMoon'), stars: gl.getUniformLocation(PS, 'uStars'),
    cloud: gl.getUniformLocation(PS, 'uCloud'), cloudK: gl.getUniformLocation(PS, 'uCloudK'),
    smog: gl.getUniformLocation(PS, 'uSmog'), skyDim: gl.getUniformLocation(PS, 'uSkyDim'),
    sunK: gl.getUniformLocation(PS, 'uSunK'), asp: gl.getUniformLocation(PS, 'uAsp'),
  };
  const OP = newBucket(), SH = newBucket(), GL = newBucket(), GLSH = newBucket(), GL2 = newBucket();
  const bufOP = makeBufSet(), bufSH = makeBufSet(), bufGL = makeBufSet(), bufGLSH = makeBufSet(), bufGL2 = makeBufSet();
  const cam = { yaw: 0, x: 0, z: 0, hx: 0, hy: 0, init: false, eye: [0, 4.4, -8], target: [0, 2.2, 40], fwd: [0, 1] };
  const stats = { ms: 0, tris: 0, calls: 0, mode };

  function makeBufSet() {
    const mk = () => gl.createBuffer();
    return { p: mk(), n: mk(), u: mk(), c: mk(), m: mk(), i: mk(), count: 0 };
  }
  function upload(B, b) {
    gl.bindBuffer(gl.ARRAY_BUFFER, b.p); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(B.p), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.n); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(B.n), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.u); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(B.u), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.c); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(B.c), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.m); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(B.m), gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(B.i), gl.DYNAMIC_DRAW);
    b.count = B.i.length;
  }
  function drawBuf(b) {
    gl.bindBuffer(gl.ARRAY_BUFFER, b.p); gl.vertexAttribPointer(A.p, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.n); gl.vertexAttribPointer(A.n, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.n);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.u); gl.vertexAttribPointer(A.u, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.u);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.c); gl.vertexAttribPointer(A.c, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.c);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.m); gl.vertexAttribPointer(A.m, 1, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.m);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i);
    gl.drawElements(gl.TRIANGLES, b.count, gl.UNSIGNED_SHORT, 0);
  }
  const skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  let VW = W, VH = H;

  function resize(w, h, ss) {
    ss = ss || 1;
    VW = w; VH = h;
    glCanvas.width = Math.round(w * ss);
    glCanvas.height = Math.round(h * ss);
    glCanvas.style.width = w + 'px';
    glCanvas.style.height = h + 'px';
  }
  resize(W, H, 1);

  function render(state, dt) {
    const t0 = performance.now();
    const t = (state.elapsed || 0);
    dt = Math.min(Math.max(dt || 0.016, 0), 0.05);
    updateCamera(state, dt, cam);
    const daylight = state.daylight === undefined ? 1 : state.daylight;
    const dark = state.blackout && state.blackout.active ? 0.85 : 0;
    const tod = state.timeOfDay || PRESETS.sore; // TOD: tanpa preset = sore
    const U = webglUniforms(tod);
    // matahari mengikuti arah kamera (golden hour selalu di depan)
    const fx = cam.fwd[0], fz = cam.fwd[1];
    const rx = fz, rz = -fx; // right = up x fwd
    const SUN = norm([fx * 0.85 + rx * 0.18, U.sunY, fz * 0.85 + rz * 0.18]); // TOD: elevasi ikut preset
    const PVM = persp(55 * Math.PI / 180, VW / VH, 0.1, 400);
    const VVM = lookAt(cam.eye, cam.target, [0, 1, 0]);
    OP.p.length = 0; OP.n.length = 0; OP.u.length = 0; OP.c.length = 0; OP.m.length = 0; OP.i.length = 0;
    SH.p.length = 0; SH.n.length = 0; SH.u.length = 0; SH.c.length = 0; SH.m.length = 0; SH.i.length = 0;
    GL.p.length = 0; GL.n.length = 0; GL.u.length = 0; GL.c.length = 0; GL.m.length = 0; GL.i.length = 0;
    buildFrame(state, cam, OP, SH, GL, t);
    splitBucketInto(GL, GLSH, GL2); // R26 §6: material 9 (bayangan kontak) keluar dari G aditif
    upload(OP, bufOP); upload(SH, bufSH); upload(GLSH, bufGLSH); upload(GL2, bufGL2);
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clearColor(0.1, 0.05, 0.15, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // langit
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    gl.useProgram(PS);
    gl.uniform1f(skyU.day, daylight);
    gl.uniform3fv(skyU.sky0, new Float32Array(U.sky0)); gl.uniform3fv(skyU.sky1, new Float32Array(U.sky1));
    gl.uniform3fv(skyU.sky2, new Float32Array(U.sky2)); gl.uniform3fv(skyU.sky3, new Float32Array(U.sky3));
    gl.uniform3fv(skyU.sky4, new Float32Array(U.sky4)); gl.uniform2fv(skyU.sunPos, new Float32Array(U.sunPos));
    gl.uniform3fv(skyU.sunDisc, new Float32Array(U.sunDisc)); gl.uniform3fv(skyU.sunGlow, new Float32Array(U.sunGlow));
    gl.uniform1f(skyU.moon, U.moon); gl.uniform1f(skyU.stars, U.stars);
    gl.uniform3fv(skyU.cloud, new Float32Array(U.cloud)); gl.uniform1f(skyU.cloudK, U.cloudK);
    gl.uniform1f(skyU.smog, U.smog); gl.uniform1f(skyU.skyDim, U.skyDim); gl.uniform1f(skyU.sunK, U.sunK); gl.uniform1f(skyU.asp, VW / VH);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
    const sa = gl.getAttribLocation(PS, 'aP');
    gl.vertexAttribPointer(sa, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(sa);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disableVertexAttribArray(sa);
    // opaque
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.useProgram(P);
    gl.uniformMatrix4fv(A.uP, false, new Float32Array(PVM));
    gl.uniformMatrix4fv(A.uV, false, new Float32Array(VVM));
    gl.uniform3fv(A.uCam, cam.eye); gl.uniform3fv(A.uSun, SUN);
    gl.uniform1f(A.uDay, daylight); gl.uniform1f(A.uDark, dark);
    gl.uniform3fv(A.uSunCol, new Float32Array(U.sunCol)); gl.uniform3fv(A.uHz, new Float32Array(U.hz));
    gl.uniform3fv(A.uAmbG, new Float32Array(U.ambG)); gl.uniform3fv(A.uAmbS, new Float32Array(U.ambS));
    gl.uniform1f(A.uWinLit, U.winLit); gl.uniform3fv(A.uWinTint, new Float32Array(U.winTint));
    gl.uniform1f(A.uNeon, U.neonGain); gl.uniform3fv(A.uWaterDeep, new Float32Array(U.waterDeep));
    gl.uniform3fv(A.uWaterSky, new Float32Array(U.waterSky)); gl.uniform1f(A.uExposure, U.exposure);
    gl.uniform2fv(A.uWinCell, new Float32Array(U.winCell)); gl.uniform1f(A.uWinGlass, U.winGlass);
    gl.uniform1f(A.uWinWarm, U.winWarm); gl.uniform1f(A.uContrast, U.contrast);
    gl.uniform1f(A.uShadowK, U.shadowK); gl.uniform1f(A.uRoadTex, U.roadTex); gl.uniform1f(A.uFogK, U.fogK);
    drawBuf(bufOP);
    // contact shadow (normal blend — SH + elips material 9 hasil belah-G)
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    drawBuf(bufSH);
    drawBuf(bufGLSH);
    // glow + smear (additif)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    drawBuf(bufGL2);
    gl.disable(gl.BLEND); gl.depthMask(true);
    // matikan semua attribute array — buffer dipakai ulang tiap frame,
    // attribute yang tertinggal menyala + buffer terhapus = INVALID_OPERATION
    for (const loc of [A.p, A.n, A.u, A.c, A.m]) gl.disableVertexAttribArray(loc);
    stats.ms = performance.now() - t0;
    stats.tris = (OP.i.length + SH.i.length + GL.i.length) / 3;
    stats.calls = 5; // langit + OP + SH + GLSH + GL
    window.__webglFrames = (window.__webglFrames || 0) + 1;
    return stats;
  }

  return { mode, render, resize, stats, get camera() { return cam; } };
}
