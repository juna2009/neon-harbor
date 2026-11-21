// WebGL2 renderer (raw, tanpa library/network): render(state,dt) gambar
// chase-cam 3D dari state 2D hidup (hero/traffic/polisi/heli/perahu/jalan);
// S=0.1 px->unit; TOD fallback sore, matahari ikut kamera; konteks
// webgl2->webgl->null (fallback city3d.js); 1 program, 5 draw call/frame.

import { PRESETS, webglUniforms } from './timeofday.js';
import { drawCarRealistic } from './cars3d.js'; // R26: cars3d v15d di game/src/
import { carVariant } from './vehicles.js'; // CARS v18: varian visual (suv/race/delivery)
import { drawCruiseShips } from './ships3d.js'; // R27b: kapal pesiar + yacht (statis, visual saja)
import { marketSite, marketStalls } from './market.js'; // R35-F9: night market (Pasar Malam) — geometri dari market.js
import { activeJob, jobsState, tickJobs } from './jobs.js'; // R35-F7
import { shoreX } from './districts.js'; // A-WORLD: garis pantai berlekuk (lekuk maks 12u — lihat districts.js)
// R41 Worker C (pintu+interior): dynamic import — 0 byte dossier (scanner
// hanya baca static import). INT=null sampai modul termuat; semua hook di
// bawah guard `if(INT)`, jadi game jalan normal sebelum/saat gagal muat.
let INT=null;import('./interiors.js').then(m=>{INT=m;window.__INT=m;}).catch(()=>{});

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
// GEDUNG-BLD (Poly Pizza CC0 — rebuild prosedural): remap fasad kuning +
// tipe gedung. Rumus SAMA dengan city3d.js (hash2 == h2) supaya kedua
// renderer sepakat (B10). Bata merah 1 dari 4 varian remap (~25%).
function facQ(bx, by) { return hash2(bx ^ by, bx + by); }
function facRemap(hex, bx, by) {
  if (hex !== '#c98a3d' && hex !== '#a85a32') return hex;
  const q = facQ(bx, by);
  return q < 0.25 ? '#a4442f' : q < 0.5 ? '#8a8f98' : q < 0.75 ? '#5a6b8a' : '#c9b8a3';
}
function bldType(b) {
  if (b.district === 0 && b.roof === 1) return 1; // town
  if (b.district === 1 && b.height === 3) return 2; // apart
  if ((b.color === '#c98a3d' || b.color === '#a85a32') && facQ(b.x, b.y) < 0.25) return 3; // brick
  return 0; // plain
}
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// 1A-TREES: cache slot (px game, dibulatkan) -> jatuh di dalam footprint gedung.
// Posisi slot kamera-relatif stabil antar frame (along dijepit mod 16), jadi
// cache hit terus; invalidasi bila array buildings berganti (seed/load baru).
const _bldHitCache = new Map();
let _bldHitCity = null;
function slotInBuilding(city, wx, wy) { // true bila titik (px game) di dalam footprint gedung
  if (city.buildings !== _bldHitCity) { _bldHitCache.clear(); _bldHitCity = city.buildings; }
  const key = Math.round(wx) + ',' + Math.round(wy);
  let hit = _bldHitCache.get(key);
  if (hit === undefined) {
    hit = false;
    for (const b of city.buildings || []) if (wx > b.x && wx < b.x + b.w && wy > b.y && wy < b.y + b.h) { hit = true; break; }
    if (_bldHitCache.size > 2000) _bldHitCache.clear();
    _bldHitCache.set(key, hit);
  }
  return hit;
}
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

// ---- shaders (GLSL ES 1.00 — webgl DAN webgl2); material: 0 gedung 1 cat 2 kaca 3 jalan 4 emissive 5 matte 6 trotoar 7 glow 8 smear 9 shadow 10 air 11 groundShadow 12 sprite | R40: 13 aspal 14 trotoar 15 pasir | FIX3-B: 16 ramp ----
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
uniform sampler2D uAtlas; // R39 SPRITE: atlas ped turntable (Quaternius CC0) — material 12
uniform sampler2D uTexRoad; uniform sampler2D uTexWalk; uniform sampler2D uTexSand; uniform sampler2D uTexFac; // R40: tekstur permukaan (unit 1-4, REPEAT + mipmap) — material 13/14/15 + fasad 0
uniform float uTexK; // R40: 1.0 = tekstur aktif di SEMUA preset TOD (bukan uRoadTex yang 0 di sore)
const float R40T = 2.2; // R40: 1 tile = 2.2 unit dunia (rekomendasi Worker B) — diuji vs T=4.0 di shots-r40-k3-t22 (lihat REPORT.md)
const float R40K = 3.0; // R40: gain kontras tekstur — K=2 terlalu halus di crop on-foot (hpSD +0.3); K=3 diuji di shots-r40-k3 (lihat REPORT.md)
uniform vec3 uGradeLift; uniform vec3 uGradeGain; uniform float uGradeGamma; uniform vec2 uRes; uniform float uTime; // R36 POSTFX
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// R36 POSTFX: ACES (highlight tidak pecah) + lift/gamma/gain per TOD +
// vignette (fokus tengah) + grain film (sembunyikan banding). Dipakai di
// ekor jalur utama + air + emissive; glow/smear/shadow overlay dibiarkan.
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
vec3 postfx(vec3 c){
  c = aces(c);
  c = pow(max(c+uGradeLift,0.0),vec3(uGradeGamma))*uGradeGain;
  vec2 uv = gl_FragCoord.xy/uRes;
  float d = length((uv-0.5)*vec2(1.2,1.0));
  c *= 1.0-0.30*smoothstep(0.55,0.95,d);
  c += (h21(gl_FragCoord.xy+fract(uTime)*61.7)-0.5)*0.02;
  return clamp(c,0.0,1.0);
}
// R40: multiplier tekstur permukaan — PNG grayscale Worker A: piksel = 128 x
// multiplier, jadi tex.r (0..1) x 255/128 = multiplier; clamp 0.85-1.15
// (ekstrem retak/bintik di luar itu dijepit, bulk 0.86-1.14 tak tersentuh).
// uTexK=1: tekstur aktif; placeholder GL 1x1 abu-128 = multiplier 1.0 persis,
// jadi sebelum PNG tiba frame tetap tampil polos-lama (bukan hitam) — tanpa
// race, tanpa flag baru di main.js (0 byte dossier).
float r40tx(sampler2D s, vec2 uv){ float m = clamp(texture2D(s, uv).r * 1.9922, 0.85, 1.15); return mix(1.0, 1.0 + (m - 1.0) * R40K, uTexK); }
void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(uCam - vW);
  float dist = length(uCam - vW);
  vec3 base = vC;
  float emit = 0.0, spec = 0.0, shin = 30.0;
  float dayK = (0.35 + 0.65 * uDay) * uExposure;
  if (vM < 0.5 && abs(N.y) < 0.5) { // gedung: fasad 3 zona (GEDUNG §11 — bible 3.1/3.4)
    base *= r40tx(uTexFac, vU / 8.0); // R40: grain fasad (vU = satuan dunia) — SEBELUM logika jendela, jadi jendela/etalase/neon tetap di atas tekstur
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
    if (wtype > 0.5) { // R36-BLD: ribbon + curtain dulu pita/panel kaca
      float mx = fract(vU.x / 1.5); // tiang vertikal tiap 1.5 unit: pita
      win *= step(0.08, mx) * step(mx, 0.92); // jadi deretan jendela
    }
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
    // GEDUNG-BLD kisi jendela (0 vertex): tiang tengah vertikal di
    // jendela punched + ambang tengah horizontal di semua tipe — bingkai
    // saja (di atas) masih terbaca stiker kaca dari dekat.
    if (wtype < 0.5) {
      float mullV = step(0.46, cell.x) * step(cell.x, 0.54);
      base = mix(base, vec3(0.08, 0.09, 0.11), win * mullV * 0.7);
    }
    float mullH = step(0.47, cell.y) * step(cell.y, 0.53);
    base = mix(base, vec3(0.08, 0.09, 0.11), win * mullH * 0.7);
    // Lantai dasar (y < 2.6): etalase kaca + tiang; awning (2.6-3.1); pita neon (3.1-3.7).
    // GEDUNG-BLD: varian residensial (vM 0.25, dari bld() — town/brick)
    // vs toko. Residensial: plinth bata + pintu masuk reses berlengkung,
    // tanpa etalase/awning/neon.
    float res = step(0.1, vM);
    float shop = step(vU.y, 2.6) * (1.0 - res);
    emit *= 1.0 - shop; // jendela menyala tidak berlaku di etalase
    vec3 shopGlass = mix(vec3(0.12, 0.14, 0.18), vec3(0.50, 0.32, 0.15), fract(bh * 3.7 + floor(vU.x / 1.1) * 0.37) * 0.8); // R2: kaca toko lebih terang, bukan pagar
    base = mix(base, shopGlass, shop * 0.92);
    float mull = step(0.90, fract(vU.x / 1.1)); // tiang etalase tiap 1.1 unit
    base = mix(base, vec3(0.08, 0.09, 0.11), shop * mull * 0.55); // R2: mullion lebih lembut
    float awn = step(2.6, vU.y) * step(vU.y, 3.1) * (1.0 - res);
    float stripe = step(0.5, fract(vU.x / 0.8));
    vec3 awnCol = mix(vec3(0.75, 0.15, 0.25), vec3(0.95, 0.92, 0.85), stripe);
    base = mix(base, awnCol, awn);
    float neonB = step(3.1, vU.y) * step(vU.y, 3.7) * (1.0 - res);
    vec3 neonCol = mix(vec3(1.0, 0.18, 0.55), mix(vec3(0.05, 0.85, 0.95), vec3(1.0, 0.62, 0.12), step(0.66, bh)), step(0.33, bh));
    base = mix(base, neonCol * 1.6, neonB);
    emit = max(emit, neonB * 0.85);
    float plinth = step(vU.y, 0.9) * res;
    base = mix(base, vec3(0.55, 0.32, 0.22), plinth * 0.85);
    float doorX = abs(fract(vU.x * 0.05 + bh) - 0.5);
    float arch = 2.1 + 0.5 * cos(doorX / 0.045 * 1.5708);
    float door = step(doorX, 0.045) * step(vU.y, arch) * res;
    base = mix(base, vec3(0.10, 0.08, 0.07), door * 0.9);
    emit *= 1.0 - door; // pintu reses tidak menyala walau jendela di belakangnya menyala
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
  } else if (vM < 3.5 || (vM > 12.5 && vM < 13.5)) { // jalan: marka (dari UV: u=sepanjang jalan, v=melintang) + streak matahari
    // ZEBRA-STRIPES: mat 13 (aspal roadSeg, UV absolut-dunia) — dash periode
    // 32u (320px), OFF di jendela ±80px sekitar tiap persimpangan (pusat di
    // vU.x ≡ 16 mod 32, karena jalan di 160+320k px = 16+32k u; OFF bila
    // fract(vU.x/32) ∈ [0.25, 0.75)). Mat 3 (dek jembatan, UV 0..1)
    // PERTAHANKAN rumus lama — tanpanya dek kena garis kuning.
    float dash;
    if (vM > 12.5) {
      float f = fract(vU.x / 32.0);
      dash = (1.0 - step(0.25, f) * step(f, 0.75)) * step(abs(vU.y - 0.5), 0.03);
    } else {
      dash = step(0.45, fract(vU.x * 0.06)) * step(abs(vU.y - 0.5), 0.03);
    }
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
    // R40: aspal mat 13 (roadSeg) bertekstur — vU.x = sepanjang jalan (unit
    // dunia), vU.y = 0..1 melintang per 8.8 unit lebar. Mat 3 (dek jembatan)
    // TIDAK kena tekstur (gate vM>12.5). Tekstur dikali SETELAH streak:
    // permukaan jalan yang bikin pusing justru piringan kuning streak
    // (base-share slab chase ~0,3% — pengali base saja tidak bergerak);
    // glare matahari di aspal kasar ASLI juga pecah oleh butir permukaan,
    // jadi streak ikut berbutir — warna rata-rata tetap (mean mult ~1.0).
    // Dash di atas ikut berbutir sedikit (cat di atas aspal kasar) — wajar.
    if (vM > 12.5) base *= r40tx(uTexRoad, vec2(vU.x / R40T, vU.y * 8.8 / R40T));
    spec = 0.5; shin = 24.0;
  } else if (vM < 4.5) { // emissive (lampu rem, neon, jendela menyala) — bible §1.5
    emit = 1.0;
    float f = 1.0 - exp(-dist * 0.011);
    vec3 col = base * uNeon; // TOD: neonGain preset (sore 2.2 = lama)
    col = mix(col, uHz, clamp(f, 0.0, 0.85) * 0.25);
    gl_FragColor = vec4(postfx(col * (1.0 - uDark * 0.4)), 1.0);
    return;
  } else if (vM > 9.5 && vM < 10.5) { // air: warna akhir SENDIRI (early return) — R26: lewat lighting umum, multiply hangat sunset mengubah biru dalam jadi oranye seperti aspal. Di sini: biru dalam dominan + jalur matahari + glitter + fog, tanpa warm multiply.
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
    gl_FragColor = vec4(postfx(wcol), 1.0);
    return;
  }
  if (vM > 6.5 && vM < 7.5) { // glow quad: alpha radial dari UV
    float a = smoothstep(0.5, 0.05, length(vU - 0.5));
    gl_FragColor = vec4(base * 1.8, a * 0.55);
    return;
  }
  if (vM > 16.5 && vM < 17.5) { // PARTICLES: asap abu-abu (mirror city3d rgba(140,140,150)) — EXPLOSION-VFX S1 CEL-SHADED v2: tepi tegas tapi TIDAK keras (0.5->0.38) + rim tipis x0.75 di band 0.40<r<0.5; alpha maks 0.35 (BUKAN 0.5: frame G1 v1 membuktikan 0.5 + tepi keras + 40 quad menumpuk = gelembung solid tak tembus; langit >180 naik 4.8%->69.5%)
    float r = length(vU - 0.5);
    float al = smoothstep(0.5, 0.38, r) * vC.r; // tepi tegas x life-fade
    float rimK = mix(1.0, 0.75, smoothstep(0.40, 0.44, r) * (1.0 - smoothstep(0.46, 0.5, r)));
    gl_FragColor = vec4(vec3(0.55, 0.55, 0.59) * rimK, al * 0.35);
    return;
  }
  if (vM > 17.5 && vM < 18.5) { // PARTICLES: api oranye (mirror city3d rgba(255,140,40)) — blend NORMAL, bukan aditif: 14 flame aditif yang tumpang tindih menembus putih (G1: api harus ORANYE, bukan putih); normal-blend menumpuk ke arah oranye. vC.r = carrier alpha (life-fade).
    float al = smoothstep(0.5, 0.05, length(vU - 0.5)) * vC.r; // radial x life-fade
    gl_FragColor = vec4(vec3(1.0, 0.55, 0.16), al * 0.85);
    return;
  }
  if (vM > 18.5 && vM < 19.5) { // EXPLOSION-VFX S1: shockwave ring — annulus SDF dari length(vU-0.5) (first principles, bukan salinan shader mana pun); band 0.42-0.5, warna [1.0,0.9,0.6], alpha via vC.r (0.8->0)
    float r = length(vU - 0.5);
    float band = smoothstep(0.42, 0.46, r) * (1.0 - smoothstep(0.46, 0.5, r));
    gl_FragColor = vec4(vec3(1.0, 0.9, 0.6), band * vC.r);
    return;
  }
  if (vM > 19.5 && vM < 20.5) { // EXPLOSION-VFX S1: flash disc — inti putih -> tepi emas, tepi TEGAS via smoothstep (bukan radial lembut); NORMAL blend (bucket SH, BUKAN aditif — pelajaran G1); alpha via vC.r (0.9->0)
    float r = length(vU - 0.5);
    float edge = smoothstep(0.5, 0.44, r);
    float core = smoothstep(0.30, 0.05, r);
    vec3 col = mix(vec3(1.0, 0.75, 0.25), vec3(1.0), core);
    gl_FragColor = vec4(col, edge * vC.r);
    return;
  }
  if (vM > 20.5 && vM < 21.5) { // EXPLOSION-VFX S1: debu tan #c9b18a, ground-hugging; alpha = radial x vC.r x 0.3 (maks 0.3)
    float al = smoothstep(0.5, 0.08, length(vU - 0.5)) * vC.r;
    gl_FragColor = vec4(vec3(0.788, 0.694, 0.541), al * 0.3);
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
  if (vM > 10.5 && vM < 11.5) { // R36 POSTFX: bayangan tanah lunak berarah (groundShadow) — alpha bergradasi: penuh di pangkal (dinding), 0 di ujung; tepi samping lembut
    float along = clamp((vU.y - 0.5) / 0.35, 0.0, 1.0); // 0 pangkal (dinding) -> 1 ujung jauh
    float side = 1.0 - smoothstep(0.08, 0.5, abs(vU.x - 0.5));
    float a = (1.0 - smoothstep(0.75, 1.0, along)) * side * uShadowK * 0.85; // penuh di sepanjang bayangan, baru memudar di 25% ujung (fade kuadrat ke nol membuat bayangan panjang hilang sebelum sampai kamera)
    gl_FragColor = vec4(0.0, 0.0, 0.0, a);
    return;
  }
  if (vM > 11.5 && vM < 12.5) { // R39 SPRITE: billboard ped bertekstur (atlas turntable, material 12 — BUKAN 11: 11 = groundShadow R36). postfx() seperti jalur lain (ACES/vignette/grain R36).
    vec4 tex = texture2D(uAtlas, vU);
    if (tex.a < 0.05) discard;
    float sh = 0.82 + 0.18 * max(dot(N, uSun), 0.0);
    vec3 col = tex.rgb * sh * dayK;
    float f = 1.0 - exp(-dist * 0.011 * uFogK);
    col = mix(col, uHz, clamp(f, 0.0, 0.85));
    col *= (1.0 - uDark * 0.75);
    gl_FragColor = vec4(postfx(col), tex.a * vC.r);
    return;
  }
  // R40: trotoar (14) + pasir (15) — UV SUDAH skala dunia dari emitter
  // (flat uvs eksplisit), dibagi R40T di sini; dikali ke base SEBELUM
  // lighting generik supaya grading TOD tetap menguasai warna.
  if (vM > 13.5 && vM < 14.5) base *= r40tx(uTexWalk, vU / R40T);
  else if (vM > 14.5 && vM < 15.5) base *= r40tx(uTexSand, vU / R40T);
  else if (vM > 15.5 && vM < 16.5) { // FIX3-B: ramp — chevron diagonal + grain halus (vW = koordinat dunia, sama di semua sisi box): permukaan ramp terbaca bertekstur, bukan bidang kuning polos. Pengali murni sebelum lighting generik, tanpa uniform/sampler baru.
    float ch = step(0.5, fract((vW.x + vW.z) * 0.9));
    float gr = h21(floor(vW.xz * 3.0));
    base *= mix(1.0, 0.55, ch) * (0.94 + 0.12 * gr);
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
  // R36-RED (item 14): cat merah (hero #e33e5f) digeser ke pink di siang —
  // ambient langit biru + Fresnel/specular putih + fog pucat menaikkan G/B
  // sampai mendekati R (B/R 0,98 di siang vs 0,36 di sore; G/R 0,93 vs
  // 0,44). Clamp HARUS di warna akhir: versi sebelum fog hanya menurunkan
  // B 235->191 (fog biru mengembalikan pink). Rasio 0,50 untuk cat yang
  // dasarnya merah-dominan — merah tetap merah, shading tetap hidup.
  // Hanya mat 1 (cat); lampu (mat 4), kaca (mat 2), gedung (mat 0) tak
  // tersentuh. Di sore clamp tidak mengikat (B/R sudah <0,55).
  if (vM > 0.5 && vM < 1.5 && vC.r > vC.g * 1.8 && vC.r > vC.b * 1.5) {
    // R36-RED2: col.r bisa >1 (tanpa tonemapping, R terpotong di layar)
    // sehingga clamp terhadap col.r mentah membiarkan B sampai 0,70 —
    // di layar B/R tetap 0,71 (pink). Clamp terhadap R yang SUDAH
    // dijepit 1,0: B/G akhir <= 0,50 mutlak -> di layar merah penuh.
    // (Catatan: assignment komponen col.g/col.b sempat dicurigai, tapi
    // probe membuktikan keduanya identik — penyebabnya HDR di atas.)
    float rC = min(col.r, 1.0);
    col = vec3(col.r, min(col.g, rC * 0.50), min(col.b, rC * 0.50));
  }
  col *= (1.0 - uDark * 0.75);
  gl_FragColor = vec4(postfx(col), 1.0);
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
uniform float uSunK; // SIANG v2 + R27c: intensitas/kode matahari (siang 1.1 = noon, sore 0.9 = sunset, lain 1.0)
uniform float uAsp; // R26b: aspek layar (matahari/bulan bulat)
uniform vec3 uGradeLift; uniform vec3 uGradeGain; uniform float uGradeGamma; uniform vec2 uRes; uniform float uTime; // R36 POSTFX
float h21(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
// R36 POSTFX: sama seperti FS utama (ACES + grade + vignette + grain) supaya
// langit dan geometri punya satu kurva filmis yang sama.
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
vec3 postfx(vec3 c){
  c = aces(c);
  c = pow(max(c+uGradeLift,0.0),vec3(uGradeGamma))*uGradeGain;
  vec2 uv = gl_FragCoord.xy/uRes;
  float d = length((uv-0.5)*vec2(1.2,1.0));
  c *= 1.0-0.30*smoothstep(0.55,0.95,d);
  c += (h21(gl_FragCoord.xy+fract(uTime)*61.7)-0.5)*0.02;
  return clamp(c,0.0,1.0);
}
void main(){
  float y = vU.y;
  vec3 c = mix(uSky0, uSky1, smoothstep(0.42, 0.55, y));
  c = mix(c, uSky2, smoothstep(0.55, 0.68, y));
  c = mix(c, uSky3, smoothstep(0.68, 0.82, y));
  c = mix(c, uSky4, smoothstep(0.82, 1.0, y));
  vec2 S = uSunPos;
  float d = length(vec2((vU.x - S.x) * uAsp, vU.y - S.y)); // R26b: jarak koreksi aspek
  float noon = step(1.05, uSunK); // R27a: 1 hanya siang (sunK siang 1.1, lain 1.0)
  float sunset = step(0.85, uSunK) * (1.0 - step(0.95, uSunK)); // R27c: 1 hanya sore (sunK sore 0.9) — matahari sunset diperkecil + glow dikurangi (VIDEO-REVIEW #2: blown-out), pola yang sama seperti noon R27a tapi lebih ringan supaya sunset tetap dramatis
  c += uSunGlow * exp(-d * mix(mix(7.0, 12.0, sunset), 18.0, noon)) * mix(mix(0.9, 0.55, sunset), 0.52, noon) * uSunK; // R36-ROADS item 11: halo siang 0.35->0.52 (matahari siang polos) — sunset/pagi/malam tak berubah
  c += uSunDisc * smoothstep(mix(mix(mix(0.045, 0.041, noon), 0.032, sunset), 0.020, uMoon), mix(mix(0.038, 0.027, sunset), 0.014, uMoon), d) * uSunK; // TOD: bulan lebih kecil
  c += uSunGlow * exp(-abs(vU.y - S.y) * 90.0) * exp(-abs(vU.x - S.x) * 5.0) * mix(mix(0.4, 0.22, sunset), 0.15, noon) * uSunK * (1.0 - uMoon); // TOD: bulan tanpa streak
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
  gl_FragColor = vec4(postfx(c), 1.0);
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

// Geometri: bucket OP/SH/GL dipakai ulang tiap frame (length=0), buffer DYNAMIC_DRAW.
function newBucket() { return { p: [], n: [], u: [], c: [], m: [], i: [] }; }
// Belah bucket G per material (R26, WAJIB): G aditif -> elips bayangan kontak
// (mat 9, hitam) harus ke bucket bayangan (blending normal).
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
// Box dengan yaw (putar sumbu Y) + pitch (putar sumbu X LOKAL, untuk kaca miring/kap).
// R27c ROTATION: pitch DULU di frame lokal, baru yaw — sama seperti cars3d.js
// v16 (R26b GLASS) dan ships3d.js. Urutan lama (yaw dulu, lalu pitch = R_x·R_y)
// memutar rx mengelilingi sumbu-X DUNIA: untuk yaw PI/2 itu ROLL mengelilingi
// sumbu-maju, bukan pitch — kaca depan perahu jadi slab miring-menyamping
// (bukti numerik: /tmp/rot-proof.mjs; visual: shots-rotation/crop-yaw90-console2x.jpg).
function boxR(B, cx, cy, cz, w, h, d, ry, rx, col, m) {
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const cy2 = Math.cos(ry), sy2 = Math.sin(ry), cx2 = Math.cos(rx), sx2 = Math.sin(rx);
  const rot = (x, y, z) => {
    // pitch lokal dulu, baru yaw
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
// R27c ROTATION: sudut dihitung untuk urutan boxR BARU (pitch lokal dulu, baru
// yaw: +Z -> (cos rx·sin ry, -sin rx, cos rx·cos ry)). Rumus lama
// (ry=asin(dx/len), rx=atan2(-dy,dz)) hanya benar untuk urutan lama R_x·R_y;
// dengan boxR baru ia menyimpangkan balok (bukti: /tmp/rot-proof.mjs).
function deboxBeam(B, ax, ay, az, bx, by, bz, w, col, m) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz) || 1;
  const ry = Math.atan2(dx, dz);
  const rx = Math.asin(Math.max(-1, Math.min(1, -dy / len)));
  boxR(B, (ax + bx) / 2, (ay + by) / 2, (az + bz) / 2, w, w, len, ry, rx, col, m);
}

// R32-COIN: token = koin emas BULAT menghadap kamera (billboard), bukan
// kotak kuning berputar (Juna: "jelek banget"). Cakram emas mengkilap +
// cincin dalam + simbol $ + ring glow aditif di sekelilingnya. Selalu
// bundar dari sudut mana pun karena muka koin mengikuti kamera.
// nrm = normal muka koin (ke arah kamera); G = bucket glow (mat 7 aditif).
function coinToken(B, G, cx, cy, cz, R, nrm, t) {
  const nl = Math.hypot(nrm[0], nrm[2]) || 1;
  const n = [nrm[0] / nl, 0, nrm[2] / nl];
  const rgt = [-n[2], 0, n[0]]; // kanan kamera (cross(n, up))
  const bob = Math.sin(t * 2) * 0.08;
  const C = [cx, cy + bob, cz];
  const N = 20, TH = 0.05; // ketebalan koin (setengah)
  const GOLD = [1.0, 0.85, 0.35], GOLD_DK = [0.82, 0.62, 0.18], RIM = [0.85, 0.65, 0.2], DOLLAR = [0.5, 0.34, 0.06];
  const rimPt = (a, rad, off) => [C[0] + rgt[0] * Math.cos(a) * rad + n[0] * off, C[1] + Math.sin(a) * rad, C[2] + rgt[2] * Math.cos(a) * rad + n[2] * off];
  const fan = (B2, rad, off, front, col, m) => {
    const nrm2 = front ? n : [-n[0], 0, -n[2]];
    const base = B2.p.length / 3;
    push(B2, [C[0] + n[0] * off, C[1], C[2] + n[2] * off], nrm2, [0.5, 0.5], col, m);
    for (let i = 0; i < N; i += 1) push(B2, rimPt((i / N) * Math.PI * 2, rad, off), nrm2, [0, 0], col, m);
    for (let i = 0; i < N; i += 1) {
      if (front) B2.i.push(base, base + 1 + i, base + 1 + ((i + 1) % N));
      else B2.i.push(base, base + 1 + ((i + 1) % N), base + 1 + i);
    }
  };
  fan(B, R, TH, true, GOLD, 4); // muka depan
  fan(B, R * 0.72, TH + 0.02, true, GOLD_DK, 4); // cincin dalam (lebih gelap)
  fan(B, R, -TH, false, GOLD, 4); // muka belakang (polos)
  for (let i = 0; i < N; i += 1) { // pelek tebal koin
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) % N) / N * Math.PI * 2;
    quad(B, rimPt(a0, R, TH), rimPt(a1, R, TH), rimPt(a1, R, -TH), rimPt(a0, R, -TH), rgt, [[0, 0], [1, 0], [1, 1], [0, 1]], RIM, 4);
  }
  // simbol $ di muka depan: S (5 batang) + garis vertikal tengah
  const gq = (u0, v0, u1, v1) => {
    const P = (u, v, off) => [C[0] + rgt[0] * u + n[0] * off, C[1] + v, C[2] + rgt[2] * u + n[2] * off];
    quad(B, P(u0, v0, TH + 0.04), P(u1, v0, TH + 0.04), P(u1, v1, TH + 0.04), P(u0, v1, TH + 0.04), n, [[0, 0], [1, 0], [1, 1], [0, 1]], DOLLAR, 4);
  };
  const s = R * 0.55; // setengah lebar $ (diskalakan dgn radius koin)
  gq(-s, s * 0.76, s, s); // batang atas S
  gq(-s, s * 0.14, -s * 0.55, s * 0.76); // kaki kiri atas S
  gq(-s, -s * 0.12, s, s * 0.12); // batang tengah S
  gq(s * 0.55, -s * 0.76, s, -s * 0.14); // kaki kanan bawah S
  gq(-s, -s, s, -s * 0.76); // batang bawah S
  gq(-s * 0.12, -s * 1.15, s * 0.12, s * 1.15); // garis vertikal $
  // ring glow: annulus aditif di belakang koin (tidak menutupi muka koin)
  for (let i = 0; i < N; i += 1) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) % N) * Math.PI * 2;
    quad(G, rimPt(a0, R * 1.08, -0.03), rimPt(a1, R * 1.08, -0.03), rimPt(a1, R * 1.55, -0.03), rimPt(a0, R * 1.55, -0.03), n, [[0, 0], [1, 0], [1, 1], [0, 1]], [1.0, 0.9, 0.55], 7);
  }
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
// VIPER R36: hero boat = NH-90 VIPER (target Juna 18:00 WIB) — lambung hitam
// + trim neon cyan, kokpit terbuka 2 kursi, twin hydrojet (bukan outboard).
// Hanya hero (opts.hero); sipil + polisi TIDAK berubah. Post-cut: 0 byte dossier.
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
  const hero = opts && opts.hero && !pol;
  const CY = [0.10, 0.85, 1.0]; // neon cyan VIPER
  if (hero) paint = [0.05, 0.06, 0.09]; // lambung hitam (cat m=1: glossy + Fresnel)
  const nb = [-fwd[0], 0, -fwd[1]];
  const dk = hero ? [0.15, 0.17, 0.21] : [0.92, 0.92, 0.9], wt = hero ? CY : [0.95, 0.95, 0.93];
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
        [rgt[0] * sg, 0, rgt[1] * sg], wt, hero ? 4 : 5); // rub rail ikut sheer (VIPER: neon cyan, emissive)
      if (hero) { // garis neon cyan di sisi lambung (waterline), ikut lekuk loft
        const sxAt = (st, y) => { const f = (y - st[3]) / (st[2] - st[3]); return st[1] * wid / 2 * (st[4] + (1 - st[4]) * f) + 0.03; };
        Q(at(sg * sxAt(a, 0.3), 0.3, a[0] * len), at(sg * sxAt(b, 0.3), 0.3, b[0] * len),
          at(sg * sxAt(b, 0.38), 0.38, b[0] * len), at(sg * sxAt(a, 0.38), 0.38, a[0] * len),
          [rgt[0] * sg, 0, rgt[1] * sg], CY, 4);
      }
    }
    Q(at(-a[1] * wid / 2, a[2], a[0] * len), at(a[1] * wid / 2, a[2], a[0] * len),
      at(b[1] * wid / 2, b[2], b[0] * len), at(-b[1] * wid / 2, b[2], b[0] * len), [0, 1, 0], dk, 5); // dek
    Q(at(-a[1] * a[4] * wid / 2, a[3], a[0] * len), at(a[1] * a[4] * wid / 2, a[3], a[0] * len),
      at(b[1] * b[4] * wid / 2, b[3], b[0] * len), at(-b[1] * b[4] * wid / 2, b[3], b[0] * len), [0, -1, 0], dk2, 5); // lunas
  }
  Q(at(-0.68 * wid / 2, 0.16, -len / 2), at(0.68 * wid / 2, 0.16, -len / 2),
    at(wid / 2, 0.92, -len / 2), at(-wid / 2, 0.92, -len / 2), nb, paint, 1); // transom
  p(0, 0.86, -len / 2 - 0.02, wid * 0.9, 0.08, 0.06, wt, hero ? 4 : 5); // strip transom (VIPER: cyan)
  if (hero) p(0, 0.32, -len / 2 - 0.02, wid * 0.85, 0.07, 0.06, CY, 4); // garis cyan bawah transom
  p(0, 1.45, len * 0.48, 0.14, 0.45, 0.14, pol ? wt : paint, 1); // stem peak
  p(0, 1.15, -0.7, wid * 0.55, 0.45, len * 0.22, [0.12, 0.13, 0.16], 2); // konsol + kaca
  pp(0, 1.38, -0.42, wid * 0.5, 0.5, 0.06, [0.10, 0.16, 0.28], 2, -0.5); // kaca depan miring
  if (hero) { // VIPER kokpit terbuka: kursi penumpang + sandaran driver + setir
    p(-0.78, 1.12, -1.7, 0.55, 0.5, 0.35, [0.10, 0.11, 0.14], 5); // kursi penumpang
    p(-0.78, 1.42, -1.7, 0.55, 0.1, 0.35, CY, 4); // strip cyan kursi penumpang
    p(0, 1.12, -2.05, 0.7, 0.55, 0.25, [0.10, 0.11, 0.14], 5); // sandaran kursi driver
    p(0, 1.44, -2.05, 0.7, 0.09, 0.25, CY, 4); // strip cyan sandaran driver
    pp(0, 1.32, -1.08, 0.34, 0.34, 0.05, [0.08, 0.08, 0.10], 5, -0.6); // setir miring
  }
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
  if (hero) { // VIPER twin hydrojet: nosel tanam di transom + mulut cyan (tanpa outboard)
    for (const sx of [-0.32, 0.32]) {
      p(sx * wid, 0.42, -len / 2 - 0.22, 0.34, 0.3, 0.5, [0.07, 0.08, 0.10], 5); // badan nosel
      p(sx * wid, 0.42, -len / 2 - 0.5, 0.36, 0.32, 0.05, CY, 4); // mulut nosel cyan menyala
    }
  } else for (const sx of [-0.32, 0.32]) { // motor tempel: kaki pendek (ujung = garis lunas, bukan roda) + cowl gede
    p(sx * wid, 0.38, -len / 2 - 0.15, 0.18, 0.4, 0.24, [0.15, 0.15, 0.17], 5);
    p(sx * wid, 0.95, -len / 2 - 0.12, 0.42, 0.42, 0.42, paint, 1);
    const bs = at(sx * wid, 0.55, -len / 2 - 0.34);
    billDir(B, bs[0], bs[1], bs[2], 0.3, 0.12, nb, wt, 5);
  }
  if (hero) { // sembur twin hydrojet: dua semburan, satu per nosel
    for (const sx of [-0.32, 0.32]) {
      const pj = at(sx * wid, 0.45, -len / 2 - 0.35);
      billDir(G, pj[0], pj[1], pj[2], wid * 0.38, 0.4, nb, [0.9, 0.95, 1.0], 7);
    }
  } else {
    const ps = at(0, 0.45, -len / 2 - 0.35);
    billDir(G, ps[0], ps[1], ps[2], wid * 0.9, 0.4, nb, [0.9, 0.95, 1.0], 7); // sembur prop wash
  }
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
  if (hero) { // twin rooster tail: dua semburan miring, satu per jet (pusat di nosel ±0.8)
    for (const sg of [-1, 1]) {
      const t0 = at(sg * 0.95, 0.5, -len / 2 - 0.25), t1 = at(sg * 0.65, 0.5, -len / 2 - 0.25);
      const t2 = at(sg * 0.74, 0.9, -len / 2 - 0.95), t3 = at(sg * 0.86, 0.9, -len / 2 - 0.95);
      quad(G, [t0[0], 0.5, t0[2]], [t1[0], 0.5, t1[2]], [t2[0], 0.9, t2[2]], [t3[0], 0.9, t3[2]],
        nb, [[0, 0], [1, 0], [1, 1], [0, 1]], wc, 8);
    }
  } else {
    const r0 = at(-0.26, 0.5, -len / 2 - 0.25), r1 = at(0.26, 0.5, -len / 2 - 0.25);
    const r2 = at(0.07, 0.9, -len / 2 - 0.95), r3 = at(-0.07, 0.9, -len / 2 - 0.95);
    quad(G, [r0[0], 0.5, r0[2]], [r1[0], 0.5, r1[2]], [r2[0], 0.9, r2[2]], [r3[0], 0.9, r3[2]],
      nb, [[0, 0], [1, 0], [1, 1], [0, 1]], wc, 8); // rooster tail miring
  }
}
// Gedung DEBOX R27b: massa prisma segi-8 (sudut chamfer, bukan balok) +
// lantai atas setback (tinggi>=3) / lis atap (rendah) + rooftop props di
// atap setback: tangki air SILINDER + antena + dish + AC. Tapak/posisi
// TIDAK berubah (kolisi + minimap aman); hanya siluet + atap dibentuk ulang.
function bld(B, G, b, idx, facK, face) { // SIANG v2: facK = pengali kecerahan fasad ikut preset (siang 0.72; lainnya 0.55 = lama); face = muka jalan (S/N/E/W) dari buildFrame
  const cx = (b.x + b.w / 2) * S, cz = (b.y + b.h / 2) * S;
  const w = b.w * S, d = b.h * S;
  const h = (b.height || 2) * 6.5;
  const col = hx(facRemap(b.color || '#333344', b.x, b.y)).map((v) => v * (facK === undefined ? 0.55 : facK));
  const dark = col.map((v) => v * 0.82);
  const ch = Math.min(w, d) * 0.12;
  const bType = bldType(b); // 0 plain, 1 town, 2 apart, 3 brick
  // GEDUNG-BLD: lantai dasar residensial (town/brick) vs toko — mat 0.25
  // di massa gedung saja; shader membaca vM untuk plinth + pintu (B10:
  // varian yang sama dengan Canvas bld3). Setback/parapet tetap mat 0.
  deboxPoly(B, cx, 0, cz, deboxRingRect(w, d, ch), h, col, (bType === 1 || bType === 3) ? 0.25 : 0); // massa chamfer
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
    if (hash2(idx, 37) < 0.6) { // antena H1+R1: mast tebal 0.3 + kotak dasar di kaki
      box(B, cx - w * 0.16, topY + 0.15, cz - d * 0.12, 0.5, 0.3, 0.5, DARK, 5);
      box(B, cx - w * 0.16, topY + 1.8, cz - d * 0.12, 0.3, 3.6, 0.3, DARK, 5);
    }
    if (hash2(idx, 43) < 0.4) { // dish (ukuran ikut gedung supaya muat di atap setback)
      const ds = Math.min(1.4, w * 0.12, d * 0.12);
      boxR(B, cx + w * 0.10, topY + 0.7, cz + d * 0.12, ds, 0.15, ds, 0, 0.6, [0.6, 0.6, 0.65], 5);
    }
    box(B, cx + w * 0.14, topY + 0.4, cz - d * 0.12, w * 0.16, 0.8, d * 0.16, DARK, 5); // AC rooftop
  }
  // GEDUNG-BLD atap limas genteng merah (Town House) — hanya gedung rendah
  // (tanpa setback + tanpa props atap, jadi tidak ada tabrakan — B6).
  // 5 vertex (deboxCone 4-ring). Parapet 0.96x tetap: limas 0.84x di
  // dalamnya, puncak 2.2 di atas parapet 0.5.
  if (bType === 1 && !tall) {
    const ca2 = w * 0.42, cd2 = d * 0.42;
    deboxCone(B, cx, topY, cz, [[-ca2, -cd2], [ca2, -cd2], [ca2, cd2], [-ca2, cd2]], 2.2, [0.62, 0.25, 0.16], 5);
  }
  // GEDUNG-BLD pedimen (brick) + balkon (apart) di muka jalan.
  // Basis muka: (nx,nz) normal keluar; P(u,o,y) = titik di muka (u =
  // sepanjang muka dari pusat, o = keluar dari muka). Pedimen = 1 quad
  // degenerasi (4 vertex); balkon = slab + bibir (8 vertex per lantai).
  // Balkon di-skip bila neon blade vertikal ada di gedung itu (muka yang
  // sama — blade di hash2(idx,53)<0.45); balkon di y h*0.45/0.75, di atas
  // papan nama pintu (y 3.55-3.95) dan di luar jangkauan neon sign tengah
  // (rC geser +-0.15 lebar muka). Pintu enterable di tengah muka aman:
  // pedimen di puncak, balkon di atas, pilaster tidak ada di sini.
  if ((bType === 3 || bType === 2) && face) {
    let nx = 0, nz = 0;
    if (face === 'S') nz = 1;
    else if (face === 'N') nz = -1;
    else if (face === 'E') nx = 1;
    else nx = -1;
    const fz = face === 'S' ? cz + d / 2 : face === 'N' ? cz - d / 2 : face === 'E' ? cx + w / 2 : cx - w / 2;
    const fw = face === 'S' || face === 'N' ? w : d;
    const P = (u, o, y) => (face === 'S' ? [cx + u, y, fz + o] : face === 'N' ? [cx + u, y, fz - o] : face === 'E' ? [fz + o, y, cz + u] : [fz - o, y, cz + u]);
    const N3 = [nx, 0, nz];
    if (bType === 3) {
      const pw = fw * 0.22;
      quad(B, P(-pw, 0.06, h - 2.0), P(pw, 0.06, h - 2.0), P(0, 0.06, h + 0.05), P(0, 0.06, h + 0.05), N3, [[0, 0], [1, 0], [0.5, 1], [0.5, 1]], [0.92, 0.88, 0.78], 5);
    }
    if (bType === 2 && hash2(idx, 53) >= 0.45) {
      const bC = (hash2(idx, 71) - 0.5) * fw * 0.3;
      const hw2 = Math.min(3, fw * 0.18);
      for (const fy of [h * 0.45, h * 0.75]) {
        quad(B, P(bC - hw2, 0.05, fy), P(bC + hw2, 0.05, fy), P(bC + hw2, 1.25, fy), P(bC - hw2, 1.25, fy), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], [0.47, 0.46, 0.44], 5);
        quad(B, P(bC - hw2, 1.25, fy), P(bC + hw2, 1.25, fy), P(bC + hw2, 1.25, fy + 0.5), P(bC - hw2, 1.25, fy + 0.5), N3, [[0, 0], [1, 0], [1, 1], [0, 1]], [0.35, 0.34, 0.33], 5);
      }
    }
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
  boxR(B, hx2, 4.95, hz2, 0.6, 0.34, 1.05, ry, 0, LAMP_STEEL, 5); // housing kepala (R36: 0.5->0.6, lebih kebaca)
  if (k === undefined) k = 1;
  if (k <= 0.02) return;
  const sc = (c) => [c[0] * k, c[1] * k, c[2] * k];
  const pc = (lx, lz) => { const q = rotY(lx, lz, ry); return [hx2 + q[0], 4.80, hz2 + q[1]]; };
  quad(B, pc(-0.35, -0.18), pc(0.35, -0.18), pc(0.35, 0.18), pc(-0.35, 0.18), // panel cahaya di bawah housing (menghadap bawah)
    [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], sc([1.0, 0.8, 0.45]), 4);
  billDir(G, hx2, 4.95, hz2, 1.3, 0.65, [0, 0, -1], sc([1.0, 0.75, 0.4]), 7); // halo (R36 item 9: 2.2x1.1->1.3x0.65 — halo besar + tiang tipis = kotak kuning melayang di kejauhan)
  flat(G, hx2, 0.08, hz2, 2.2, 2.2, sc([1.0, 0.7, 0.35]), 8); // kolam cahaya di tanah (bundar di bawah kepala — dulu 1.4x7 = streak laser)
}
// Palem R36: batang ramping melengkung (lebih tinggi + langsing) + kanopi
// BERLAPIS — 2 lapis pelepah PITA VERTIKAL (bawah 8 pelepah panjang
// menjuntai + atas 6 pelepah pendek menjulang, hijau lebih terang).
// Dulu 1 lapis quad HORIZONTAL: dari chase-cam yang rendah, quad
// horizontal kebaca garis tipis / kipas datar (item 6 daftar 17 aneh).
// Pita vertikal (lebar di sumbu Y) kebaca daun penuh dari samping;
// normal horizontal tegak lurus arah pelepah supaya shading matahari
// R27c tetap jalan. Tanpa culling di WebGL2, semua pelepah tampil.
function palm(B, x, z, sa, sc, road) { // R36 v3: sc = skala tinggi (1 normal; slot jauh >1 supaya mahkota muncul di atas palem dekat); road = [rx,rz] unit dr batang ke sumbu jalan (opsional, utk slot tepi jalan)
  sc = sc || 1;
  const lx = 0, lz = 0; // 1A-TREES: batang TEGAK — dulu condong 0.9u (~10 deg lean), mahkota menyimpang dr pangkal
  const TRUNK = [0.45, 0.33, 0.20]; // R36 v3: cokelat terang (batang tipis gelap = tak kebaca di sore; dulu [0.34,0.24,0.15])
  deboxBeam(B, x, 0, z, x + lx * 0.30, 1.8 * sc, z + lz * 0.30, 0.34 * sc, TRUNK, 5);
  deboxBeam(B, x + lx * 0.30, 1.8 * sc, z + lz * 0.30, x + lx * 0.65, 3.5 * sc, z + lz * 0.65, 0.30 * sc, TRUNK, 5);
  deboxBeam(B, x + lx * 0.65, 3.5 * sc, z + lz * 0.65, x + lx * 1.0, 5.0 * sc, z + lz * 1.0, 0.26 * sc, TRUNK, 5);
  const tx = x + lx, tz = z + lz, ty = 5.1 * sc; // puncak batang (dulu 4.5)
  box(B, tx, ty, tz, 0.5 * sc, 0.5 * sc, 0.5 * sc, [0.10, 0.30, 0.14], 5); // mahkota
  const GREENS = [[0.22, 0.58, 0.28], [0.16, 0.48, 0.22]]; // R36: hijau lebih terang (dulu 0.16/0.11 = hitam di sore)
  const LIGHT = [0.30, 0.68, 0.34]; // lapis atas: hijau muda kena matahari
  // Satu pelepah = 2 ruas pita vertikal (A->M naik, M->P menjuntai).
  // dx,dz = arah horizontal pelepah; nn = normal MIRING KE ATAS
  // ([-dz, 0.9, dx]) — normal horizontal murni bikin pelepah yang
  // menghadap kamera (membelakangi matahari) kena half-Lambert 0.25 +
  // ambient tanah = hampir hitam di sore (probe v1: frond ~[0.05,0.07,0.04]).
  // Normal miring menarik ambient langit + komponen-Y matahari seperti
  // pelepah lama, tapi geometri tetap pita vertikal (kebaca daun).
  const frond = (dx, dz, L, rise, drop, w0, col) => {
    if (road) { const tw = dx * road[0] + dz * road[1]; if (tw > 0) L = Math.min(L, 1.0 / tw); } // 1A-TREES (POLEFIX2): pelepah ke arah jalan dipendekkan — ujung tajuk >=42px dr sumbu jalan (batang di 72px, jangkauan maks 1.0u ke jalan; ujung kini >=62px)
    const nn = norm([-dz, 0.9, dx]);
    const fs = 1 - sa.w * (1 - (dx * sa.x + dz * sa.z)) / 4; // R36: lantai 0.8 (dulu /2 = 0.6, dobel-gelap dgn shader)
    const c = [col[0] * fs, col[1] * fs, col[2] * fs];
    const M = [tx + dx * L * 0.55, ty + rise, tz + dz * L * 0.55];
    const P = [tx + dx * L, ty + drop, tz + dz * L];
    const rib = (A, Bp, wA, wB) => quad(B,
      [A[0], A[1] - wA, A[2]], [A[0], A[1] + wA, A[2]],
      [Bp[0], Bp[1] + wB, Bp[2]], [Bp[0], Bp[1] - wB, Bp[2]],
      nn, [[0, 0], [1, 0], [1, 1], [0, 1]], c, 5);
    rib([tx, ty, tz], M, w0, w0 * 0.8);
    rib(M, P, w0 * 0.8, 0.05);
  };
  for (let k = 0; k < 8; k += 1) { // lapis bawah: 8 pelepah panjang menjuntai
    const a = (k / 8) * Math.PI * 2 + hash2(Math.round(x), k) * 0.5;
    const L = 1.1 + hash2(k, Math.round(z)) * 0.5; // 1A-TREES: L maks 2.3 -> 1.6u
    frond(Math.cos(a), Math.sin(a), L * sc, 0.5 * sc, -1.0 * sc, 0.30 * sc, GREENS[k % 2]);
  }
  for (let k = 0; k < 6; k += 1) { // lapis atas: 6 pelepah pendek menjulang (offset setengah langkah)
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6 + hash2(Math.round(x), k + 20) * 0.4;
    const L = 1.2 + hash2(k + 9, Math.round(z)) * 0.4;
    frond(Math.cos(a), Math.sin(a), L * sc, 0.95 * sc, -0.1 * sc, 0.26 * sc, k % 2 ? LIGHT : GREENS[0]);
  }
  for (let i = 0; i < 3; i += 1) // tandan kelapa di bawah mahkota
    box(B, tx + (i - 1) * 0.22 * sc, ty - 0.35 * sc, tz + 0.1 * sc, 0.2 * sc, 0.2 * sc, 0.2 * sc, [0.45, 0.30, 0.12], 5);
}
// R36 PANTAI: payung pantai — tiang TINGGI + kanopi piramida 4 sisi
// warna-warni (2 warna selang-seling, seperti payung di karimbu-0.webp)
// + bayangan alas. Tinggi sengaja di atas atap mobil (kanopi ~3,6) supaya
// dari chase-cam yang jauh payung tetap muncul di atas konvoi.
function beachUmbrella(B, x, z, c1, c2) {
  box(B, x, 1.6, z, 0.14, 3.2, 0.14, [0.85, 0.82, 0.75], 5); // tiang
  flat(B, x, 0.045, z, 3.4, 3.4, [0.45, 0.36, 0.24], 5); // bayangan alas
  const T = 0.32, R2 = 2.2, ty = 3.6, by = 2.6;
  const top = [[x - T, ty, z - T], [x + T, ty, z - T], [x + T, ty, z + T], [x - T, ty, z + T]];
  const bot = [[x - R2, by, z - R2], [x + R2, by, z - R2], [x + R2, by, z + R2], [x - R2, by, z + R2]];
  const cols = [c1, c2, c1, c2];
  for (let k = 0; k < 4; k += 1) {
    const a = top[k], b = top[(k + 1) % 4], c = bot[(k + 1) % 4], d = bot[k];
    const mx = (c[0] + d[0]) / 2 - x, mz = (c[2] + d[2]) / 2 - z;
    quad(B, a, b, c, d, norm([mx, 0.85, mz]), [[0, 0], [1, 0], [1, 1], [0, 1]], cols[k], 5);
  }
  box(B, x, 3.64, z, 0.16, 0.14, 0.16, [0.2, 0.2, 0.2], 5); // kenop puncak
}
// R36 PANTAI: kursi pantai — dudukan + sandaran tegak + handuk warna.
// Semua box axis-aligned (tanpa rotasi) supaya tidak ada risiko miring.
function beachChair(B, x, z, towel) {
  box(B, x, 0.35, z, 1.1, 0.22, 0.7, [0.75, 0.72, 0.65], 5); // dudukan
  box(B, x - 0.55, 0.75, z, 0.18, 0.9, 0.7, [0.75, 0.72, 0.65], 5); // sandaran
  box(B, x, 0.49, z, 0.95, 0.06, 0.6, towel, 5); // handuk
}
// R36 PANTAI: perahu nelayan di pasir — lambung kayu + bibir putih +
// haluan runcing + kokpit gelap + tiang + layar gulung. Beda dari speedboat
// boat() (tanpa wake/motor) dan dari perahu moored (di darat, bukan di air).
// alongX: lambung searah sumbu X (kalau false, searah Z).
function fishBoat(B, x, z, alongX) {
  const WOOD = [0.52, 0.34, 0.16], WOOD2 = [0.42, 0.26, 0.12], WT = [0.92, 0.90, 0.85];
  const w = alongX ? 4.6 : 1.6, d = alongX ? 1.6 : 4.6;
  const bw = alongX ? 4.0 : 1.7, bd = alongX ? 1.7 : 4.0;
  const hx = alongX ? 1.6 : 0, hz = alongX ? 0 : 1.6; // haluan runcing
  box(B, x, 0.35, z, w, 0.7, d, WOOD, 5); // lambung
  box(B, x, 0.72, z, bw, 0.16, bd, WT, 5); // bibir putih
  box(B, x + hx, 1.05, z + hz, 0.9, 0.5, 0.9, WOOD2, 5); // haluan runcing
  box(B, x - hx * 0.75, 0.55, z - hz * 0.75, 1.2, 0.5, 1.6, [0.16, 0.18, 0.22], 5); // kokpit gelap
  box(B, x, 1.6, z - 0.3, 0.12, 2.6, 0.12, [0.35, 0.25, 0.15], 5); // tiang
  box(B, x, 2.4, z + 0.4, 0.08, 1.4, 1.1, [0.85, 0.75, 0.55], 5); // layar gulung
}
// Pohon rindang R36: batang pendek + kanopi BULAT berlapis (3 gumpal hijau
// bertumpuk, bukan satu kubus) — variasi di trotoar selain palem.
function shadeTree(B, x, z, sa, sc) { // R36 v3: sc = skala (sama dgn palm)
  sc = sc || 1;
  const lx = 0, lz = 0; // 1A-TREES: batang TEGAK (dulu condong 0.4u)
  const TRUNK = [0.45, 0.33, 0.20]; // R36 v3: sama dgn palem
  deboxBeam(B, x, 0, z, x + lx * 0.5, 1.6 * sc, z + lz * 0.5, 0.42 * sc, TRUNK, 5);
  deboxBeam(B, x + lx * 0.5, 1.6 * sc, z + lz * 0.5, x + lx, 2.9 * sc, z + lz, 0.34 * sc, TRUNK, 5);
  const tx = x + lx, tz = z + lz;
  const fs = 1 - sa.w * 0.15;
  const G1 = [0.25 * fs, 0.60 * fs, 0.31 * fs], G2 = [0.31 * fs, 0.70 * fs, 0.37 * fs], G3 = [0.19 * fs, 0.50 * fs, 0.25 * fs]; // R36 v4: lebih terang lagi (sore: gumpal gelap vs fasad gelap = tak kebaca)
  box(B, tx, 3.6 * sc, tz, 2.0 * sc, 1.6 * sc, 2.0 * sc, G1, 5); // gumpal utama 1A-TREES: 3.0 -> 2.0u (ujung tajuk >=42px dr sumbu jalan: batang di 52px, gumpal 2.0u)
  box(B, tx + 0.5 * sc, 4.3 * sc, tz - 0.4 * sc, 1.0 * sc, 1.1 * sc, 1.0 * sc, G2, 5); // gumpal atas (terang) — jangkauan samping <=1.0u
  box(B, tx - 0.5 * sc, 3.1 * sc, tz + 0.5 * sc, 1.0 * sc, 1.1 * sc, 1.0 * sc, G3, 5); // gumpal bawah (gelap) — jangkauan samping <=1.0u
  box(B, tx, 5.0 * sc, tz, 1.2 * sc, 0.8 * sc, 1.2 * sc, G2, 5); // pucuk
}
// HELI R36v2 (revisi target NHPD-01): badan BIRU GELAP + kaca kokpit besar,
// fenestron (rotor ekor tertutup) ganti rotor ekor terbuka, kamera + searchlight
// di hidung, teks "POLICE" + "NHPD-01" prosedural (pixel-font 5x7, m=4),
// strip neon cyan, badge emas. Rotor utama + skid dari v1 dipertahankan.
// vs v1: badan putih-biru -> navy gelap; rotor ekor terbuka -> fenestron;
// tanpa teks -> POLICE/NHPD-01; tanpa kamera hidung -> turret kamera.
function heli(B,G,x,z,rotor,t,v){
 const y=14,yw=Math.atan2(v[0],v[1])+1.5708;
 const F=[Math.sin(yw),Math.cos(yw)],R=[Math.cos(yw),-Math.sin(yw)];
 const at=(a,b,c)=>[x+R[0]*a+F[0]*c,y+b,z+R[1]*a+F[1]*c];
 const p=(a,b,c,w,h,d,c2,m)=>{const q=at(a,b,c);boxR(B,q[0],q[1],q[2],w,h,d,yw,0,c2,m);};
 const N=[0.10,0.17,0.38],N2=[0.14,0.22,0.45],C=[0.10,0.85,0.95],L=[0.78,0.8,0.84],D=[0.05,0.08,0.15],S=[0.55,0.8,1],K=[0.15,0.15,0.18],GD=[0.85,0.65,0.25],WT=[0.95,0.96,1];
 // badan BIRU GELAP (dulu putih-biru) + pita navy
 p(0,0.1,0,2.2,1.3,3.8,N,1);
 p(0,-0.55,0,2,0.5,3.6,N2,5);
 p(0,-0.1,0,2.32,0.34,3.9,N2,5);
 p(0,0.9,0.25,2.1,0.35,3.5,N,1); // atap
 p(0,-0.15,2.3,1.7,0.8,0.6,N,1); // hidung (mengecil — kaca diperbesar ke depan)
 // kaca kokpit BESAR membungkus kabin sampai depan hidung (dulu 1.9, kini 2.3)
 p(0,0.25,1.0,2.34,0.9,2.3,D,4);
 // kilau langit di kaca depan + tiang tengah kaca depan (pembagi windshield)
 p(0,0.55,2.16,1.7,0.14,0.06,S,4);
 p(0,0.25,2.16,0.06,0.8,0.05,K,5);
 // ekor: boom navy + sirip vertikal + stabilizer horizontal
 p(0,0.35,-3.3,0.55,0.55,2.6,N,1); // boom berakhir di -4.6: tidak menembus kipas fenestron
 p(0,0.75,-4.9,0.3,0.35,1.0,N,1); // kerucut ekor tipis: boom -> fenestron (kipas tetap kelihatan)
 p(0,1.45,-5.3,0.22,0.9,0.6,N,1); // sirip di atas fenestron
 p(0,0.55,-4.6,2.4,0.1,0.6,L,5);
 // FENESTRON (ganti rotor ekor terbuka v1): cincin 8 segmen + kipas 5 bilah
 // putar di dalam. Segmen: sumbu panjang = tangensial (rx = sudut posisi).
 const fc=at(0,0.8,-5.1);
 for(let k=0;k<8;k+=1){const th=k*0.7854,sq=at(0,0.8+0.72*Math.cos(th),-5.1+0.72*Math.sin(th));
   boxR(B,sq[0],sq[1],sq[2],0.32,0.32,0.62,yw,th,N,1);}
 boxR(B,fc[0],fc[1],fc[2],0.14,0.3,0.3,yw,0,K,5); // hub kipas
 const spin=t*9;
 for(let k=0;k<5;k+=1)boxR(B,fc[0],fc[1],fc[2],0.08,1.05,0.14,yw,spin+k*1.2566,L,4);
 // tiang rotor utama + 2 bilah silang (v1, dipertahankan)
 p(0,1.18,0,0.3,0.35,0.3,K,5);
 boxR(B,x,y+1.35,z,1.1,0.14,13.5,rotor,0,L,4);
 boxR(B,x,y+1.35,z,1.1,0.14,13.5,rotor+1.5708,0,L,4);
 flat(G,x,y+1.5,z,13,13,[0.72,0.78,0.86],7);
 // skid (v1, dipertahankan)
 for(const s of[-1,1])p(s*0.85,-1.25,0,0.2,0.2,4.4,K,5);
 for(const s of[-1,1])for(const q2 of[-1,1])p(s*0.85,-0.95,q2*1.2,0.16,0.6,0.16,K,5);
 // hidung: lensa searchlight (v1) + turret kamera baru di bawah hidung
 p(0,-0.95,1.2,0.5,0.3,0.5,[0.1,0.1,0.12],5);
 p(0,-1.05,1.2,0.34,0.12,0.34,[1,0.85,0.5],4); // lensa lampu sorot hangat
 p(0,-0.7,2.05,0.12,0.4,0.12,K,5); // dudukan kamera
 p(0,-0.95,2.05,0.4,0.3,0.4,K,5); // turret kamera hidung
 p(0,-0.95,2.26,0.22,0.18,0.06,[0.85,0.95,1],4); // lensa kamera
 if(Math.sin(t*6)>0)p(0,1.98,-5.3,0.3,0.2,0.3,[1,0.1,0.1],4); // beacon di puncak sirip
 // strip neon cyan di sisi badan + boom (gaya referensi; strip badan dipendek
 // supaya tidak menabrak badge di c=-1.55; strip boom di bawah teks NHPD-01)
 for(const s of[-1,1]){
   const q1=at(s*1.22,0.5,0.45);boxR(B,q1[0],q1[1],q1[2],0.04,0.08,2.7,yw,0,C,4);
   const q2=at(s*0.30,0.12,-3.3);boxR(B,q2[0],q2[1],q2[2],0.05,0.06,2.6,yw,0,C,4);
 }
 // teks prosedural 5x7 (m=4, putih): "POLICE" di badan + "NHPD-01" di boom.
 // Piksel = billDir per sisi (dir = s: huruf maju ke hidung di sisi +R,
 // ke ekor di sisi -R, supaya terbaca lurus dari tiap sisi).
 const FONT={P:[14,17,17,30,16,16,16],O:[14,17,17,17,17,17,14],L:[16,16,16,16,16,16,31],I:[14,4,4,4,4,4,14],C:[14,17,16,16,16,17,14],E:[31,16,16,30,16,16,31],N:[17,25,21,19,17,17,17],H:[17,17,17,31,17,17,17],D:[30,17,17,17,17,17,30],'0':[14,17,19,21,25,17,14],'1':[4,12,4,4,4,4,14],'-':[0,0,0,14,0,0,0]};
 const txt=(str,px,a0,bTop,c0)=>{const tot=(str.length*6-1)*px;
   for(const s of[-1,1]){const dir=-s,nrm=[s*R[0],0,s*R[1]],cS=c0-dir*tot/2;
     for(let i=0;i<str.length;i+=1){const g=FONT[str[i]];if(!g)continue;
       for(let r=0;r<7;r+=1)for(let k=0;k<5;k+=1){if(!((g[r]>>(4-k))&1))continue;
         const q=at(s*a0,bTop-r*px,cS+dir*(i*6+k)*px);
         billDir(B,q[0],q[1],q[2],px*0.92,px*0.92,nrm,WT,4);}}}};
 txt('POLICE',0.09,1.22,0.095,-0.1);
 txt('NHPD-01',0.055,0.31,0.56,-3.3);
 // badge emas (roundel, belah ketupat) di pintu belakang, di celah strip cyan
 for(const s of[-1,1]){const q=at(s*1.12,0.42,-1.55);
   boxR(B,q[0],q[1],q[2],0.04,0.42,0.42,yw,0.7854,GD,5);
   const q2=at(s*1.15,0.42,-1.55);
   boxR(B,q2[0],q2[1],q2[2],0.03,0.24,0.24,yw,0.7854,N2,5);}
}
// JET R36 — jet tempur NH-77 HARBOR WRAITH (HAF, o.jet) + HA-1 hero (o null).
// Patokan: gambar target Juna 18:00 WIB (abu gelap stealth, kanopi gelembung,
// twin tail, garis neon cyan, roda pendarat detail). Skala S = 0.1 (1 px game
// = 0.1 unit): badan 6.0 x 6.0, sama seperti plane3d() di city3d.js (fallback
// Canvas 2D) — satu model, dua renderer. Sebelum R36, webgl2.js TIDAK
// menggambar pesawat sama sekali: saat inPlane hero tampil sebagai pejalan
// kaki dan jet HAF tidak ada (shot jets/takeoff/planehigh baseline).
// B = bucket opaque, G = bucket glow/shadow (mat 7/9). Murah: ~70 tris per
// pesawat (frame ~19k tris) — frame time tidak bergerak.
// altU = ketinggian dlm unit GL (alt meter * 0.12, sama dgn city3d.js).
function plane(B,G,x,z,yaw,altU,thr,t,o){
 const jet=!!(o&&o.jet);
 const y0=altU+0.55; // alas badan (tinggi roda saat parkir)
 const F=[Math.sin(yaw),Math.cos(yaw)],R=[Math.cos(yaw),-Math.sin(yaw)];
 const at=(a,b,c)=>[x+R[0]*a+F[0]*c,y0+b,z+R[1]*a+F[1]*c];
 const p=(a,b,c,w,h,d,c2,m)=>{const q=at(a,b,c);boxR(B,q[0],q[1],q[2],w,h,d,yaw,0,c2,m);};
 const g=(a,c,y,w,h,d,c2,m)=>{boxR(B,x+R[0]*a+F[0]*c,y,z+R[1]*a+F[1]*c,w,h,d,yaw,0,c2,m);};
 const q4=(B2,c4,n,c2,m)=>quad(B2,c4[0],c4[1],c4[2],c4[3],n,[[0,0],[1,0],[1,1],[0,1]],c2,m);
 const BODY=jet?[0.28,0.30,0.34]:[0.97,0.98,0.99];
 const WING=jet?[0.22,0.24,0.27]:[0.84,0.87,0.90];
 const FIN=jet?[0.32,0.34,0.38]:[0.84,0.87,0.90];
 const REAR=jet?[0.42,0.45,0.49]:[0.94,0.95,0.97];
 const GLASS=[0.07,0.11,0.18],DARK=[0.05,0.05,0.06],CYAN=[0.05,0.85,0.95];
 const ORANGE=[0.95,0.45,0.12],TIRE=[0.03,0.03,0.03],HUB=[0.55,0.57,0.60];
 // Badan: anak panah bertingkat (hidung meruncing) + tutup belakang terang.
 p(0,0.45,0,1.5,0.9,4.4,BODY,1);
 p(0,0.4,2.55,0.95,0.62,0.9,BODY,1);
 if(!jet)p(0,0.38,2.95,0.45,0.36,0.3,ORANGE,1); // ujung hidung oranye (HA-1)
 p(0,0.45,-2.25,1.4,0.8,0.1,REAR,1);
 p(0,0.95,-1.2,0.5,0.14,2.4,DARK,5); // spine punggung kanopi -> ekor
 // Kanopi gelembung: kaca GELAP (mat 4 emissive — mat 2/kaca malah jadi
 // kotak PINK: shader kaca mencampur ke warna matahari di sudut miring,
 // dan dari chase-cam belakang semua muka kanopi itu sudut miring).
 // Bingkai gelap di bawah, kaca lebih rendah + pendek, kilau langit tipis
 // di tepi atas-belakang (garis terang, bukan bidang — pelajaran heli R36).
 p(0,0.93,1.0,1.12,0.18,1.8,DARK,5);
 p(0,1.06,1.0,1.0,0.42,1.5,GLASS,4);
 q4(B,[at(-0.5,1.28,0.35),at(0.5,1.28,0.35),at(0.5,1.28,0.28),at(-0.5,1.28,0.28)],[0,1,0],[0.65,0.85,1.0],4);
 for(const s of[-1,1]){
  const UP=[0,1,0],OUT=[R[0]*s,0,R[1]*s],BACK=[-F[0],0.1,-F[1]],LEAD=[F[0],0.25,F[1]];
  // Sayap sapu + dihedral (ujung naik 0.5): atas, leading, trailing, ujung.
  q4(B,[at(s*0.5,0.55,0.9),at(s*3.0,1.05,-1.9),at(s*3.0,1.05,-1.3),at(s*0.5,0.55,-1.1)],UP,WING,1);
  q4(B,[at(s*0.5,0.45,0.9),at(s*3.0,0.95,-1.9),at(s*3.0,1.05,-1.9),at(s*0.5,0.55,0.9)],LEAD,WING,1);
  q4(B,[at(s*0.5,0.45,-1.1),at(s*3.0,0.95,-1.3),at(s*3.0,1.05,-1.3),at(s*0.5,0.55,-1.1)],BACK,WING,1);
  q4(B,[at(s*3.0,0.95,-1.9),at(s*3.0,0.95,-1.3),at(s*3.0,1.05,-1.3),at(s*3.0,1.05,-1.9)],OUT,WING,1);
  if(jet)q4(B,[at(s*0.5,0.57,0.9),at(s*3.0,1.07,-1.9),at(s*3.0,1.07,-1.78),at(s*0.5,0.57,0.78)],UP,CYAN,4); // garis neon cyan di leading edge
  p(s*3.0,1.0,-1.6,0.18,0.16,0.18,s<0?[1,0.15,0.12]:[0.2,0.9,0.35],4); // lampu ujung sayap
  // Stabilizer horizontal (dihedral kecil).
  q4(B,[at(s*0.5,0.7,-2.2),at(s*1.7,1.0,-3.0),at(s*1.7,1.0,-2.8),at(s*0.5,0.7,-2.2)],UP,WING,1);
  q4(B,[at(s*0.5,0.62,-2.2),at(s*1.7,0.92,-2.8),at(s*1.7,1.0,-2.8),at(s*0.5,0.7,-2.2)],BACK,WING,1);
  // Twin tail: sirip meruncing + miring keluar (cant) — dua sisi supaya
  // pencahayaan benar dari kiri maupun kanan (pelajaran PLANE-41 city3d:
  // sirip tegak lurus terbaca tiang/papan dari belakang).
  const f1=[at(s*0.55,0.7,-2.2),at(s*0.55,0.7,-3.3),at(s*1.2,1.75,-3.9),at(s*1.1,1.75,-3.7)];
  q4(B,f1,[R[0]*s,0.35,R[1]*s],FIN,1);
  q4(B,[f1[3],f1[2],f1[1],f1[0]],[-R[0]*s,0.35,-R[1]*s],FIN,1);
  if(jet){ // ujung sirip cyan (dua sisi)
   const tip=[at(s*1.08,1.72,-3.7),at(s*1.18,1.72,-3.9),at(s*1.18,1.78,-3.9),at(s*1.08,1.78,-3.7)];
   q4(B,tip,[R[0]*s,0.4,R[1]*s],CYAN,4);
   q4(B,[tip[3],tip[2],tip[1],tip[0]],[-R[0]*s,0.4,-R[1]*s],CYAN,4);
  }
  // Cheatline sisi badan: cyan neon (jet) / gelap (hero, sama dgn city3d).
  q4(B,[at(s*0.77,0.35,2.4),at(s*0.77,0.35,-2.4),at(s*0.77,0.5,-2.4),at(s*0.77,0.5,2.4)],OUT,jet?CYAN:DARK,jet?4:5);
  // Nozzle ganda: tabung gelap menonjol + inti panas KECIL di mulutnya
  // (inti 0.24 dulu terbaca 2 JENDELA oranye — pelajaran JETFIX city3d).
  p(s*0.5,0.45,-2.5,0.55,0.55,0.6,DARK,5);
  p(s*0.5,0.45,-2.82,0.16,0.16,0.06,ORANGE,4);
  if(thr>0.25){ // afterburner: 2 glow bersilang per nozzle (mat 7 aditif)
   const fl=2.4*thr*(0.75+0.25*Math.sin(t*31+x));
   const c2=[1.0,0.62,0.30];
   q4(G,[at(s*0.5-0.22,0.45,-2.8),at(s*0.5+0.22,0.45,-2.8),at(s*0.5,0.45,-2.8-fl),at(s*0.5,0.45,-2.8)],UP,c2,7);
   q4(G,[at(s*0.5,0.24,-2.8),at(s*0.5,0.66,-2.8),at(s*0.5,0.45,-2.8-fl),at(s*0.5,0.45,-2.8)],OUT,c2,7);
  }
 }
 // Roda pendarat saat parkir/taxi (alt < 2 m): strut + ban + hub.
 // Roda utama di a=±0.85 — menjorok keluar dari lambung (±0.75) supaya
 // terbaca dari belakang (dulu ±0.65 = tersembunyi di balik badan).
 if(altU<0.25){
  g(0,1.9,0.28,0.14,0.56,0.14,DARK,5);
  g(0,1.9,0.17,0.18,0.34,0.32,TIRE,5);
  g(0,1.9,0.17,0.22,0.14,0.34,HUB,5);
  for(const s of[-1,1]){
   g(s*0.85,-1.4,0.28,0.14,0.56,0.14,DARK,5);
   g(s*0.85,-1.4,0.18,0.18,0.36,0.36,TIRE,5);
   g(s*0.85,-1.4,0.18,0.22,0.15,0.38,HUB,5);
  }
 }
 // Bayangan kontak (mat 9 -> bucket SH via splitBucketInto), alt rendah saja.
 if(altU<5){
  const sh=(a,c)=>[x+R[0]*a+F[0]*c,0.06,z+R[1]*a+F[1]*c];
  q4(G,[sh(-2.4,-3.6),sh(2.4,-3.6),sh(2.4,3.6),sh(-2.4,3.6)],[0,1,0],[0,0,0],9);
 }
}
// Orang jalan kaki: kaki melangkah + badan + lengan + kepala + rambut/topi.
// opt: {skin, pants, hat, build, walkPhase, kind} — kind: 'police' (seragam +
// topi dinas), 'gang' (merah gelap + bandana), 'soldier' (olive), 'player'.
// Murah: 8-9 box = 96-108 tris per figur (dulu 2 box = 24 tris); tanpa tekstur.
// Variasi (rambut/kulit/celana) diturunkan dari warna baju via hash — stabil
// per figur, tidak berkedip saat figur berjalan.
function person(B, x, z, yaw, col, opt) {
  const o = opt || {};
  const hh = hash2(Math.round(col[0] * 255) * 3 + Math.round(col[1] * 255), Math.round(col[2] * 255) + 7);
  const HAIR = [[0.10, 0.07, 0.05], [0.16, 0.11, 0.06], [0.05, 0.05, 0.05], [0.35, 0.22, 0.12], [0.55, 0.55, 0.55]];
  const SKIN = [[0.85, 0.65, 0.50], [0.95, 0.78, 0.60], [0.72, 0.50, 0.33], [0.55, 0.38, 0.26]];
  const PANTS = [[0.17, 0.24, 0.31], [0.36, 0.25, 0.22], [0.22, 0.28, 0.31], [0.29, 0.14, 0.35], [0.10, 0.10, 0.12]];
  const skin = o.skin || SKIN[Math.floor(hh * 4) % 4];
  const pants = o.pants || (o.kind === 'police' ? [0.10, 0.14, 0.28]
    : o.kind === 'soldier' ? [0.25, 0.28, 0.15]
    : PANTS[Math.floor(hash2(Math.round(col[0] * 255), Math.round(col[1] * 255) * 5 + Math.round(col[2] * 255)) * 5) % 5]);
  const hair = HAIR[Math.floor(hh * 5) % 5];
  const wide = o.build === 'wide';
  const wT = wide ? 0.68 : 0.55; // lebar badan
  const ph = o.walkPhase || 0;
  const sw = Math.sin(ph) * 0.45; // ayunan kaki/lengan
  // R41 (Juna: "kakinya geraknya perlahan kaya orang nyata", berlaku SEMUA
  // karakter): kaki yang mengayun ke depan NAIK dari tanah (bukan cuma
  // miring — dulu telapak nyaris tak bergerak sehingga terbaca meluncur),
  // kaki lawan menapak; badan merunduk sedikit saat kaki terbelah, kembali
  // saat kaki rapat — 0 saat diam (walkPhase beku = berdiri diam).
  // Arah ayun (dibuktikan dari boxR): rx > 0 menggeser telapak ke lokal -z
  // = ke BELAKANG; jadi kaki kiri maju saat sw < 0 (sin(ph) < 0) dan kaki
  // kanan maju saat sw > 0 — lift mengikuti kaki yang MAJU, bukan yang
  // mundur (versi pertama sempat terbalik; diperbaiki setelah cek kode +
  // frame). Kalau frame cek nanti menunjukkan sebaliknya, tukar lagi.
  // SMOOTH-WALK: lift + bob di-ease (smoothstep) — half-sine lama punya
  // diskontinuitas kecepatan saat lepas landas/mendarat, bob |sin| punya cusp
  // di tiap batas langkah. s^2(3-2s) + sin^2 = turunan 0 di kedua ujung;
  // puncak sama (lift 0,14, bob 0,04). Hanya jalur fallback box; sprite live
  // pakai atlas (lift sudah di-bake di pose).
  const sL = Math.max(0, -Math.sin(ph)), sR = Math.max(0, Math.sin(ph));
  const liftL = sL * sL * (3 - 2 * sL) * 0.14;
  const liftR = sR * sR * (3 - 2 * sR) * 0.14;
  const bob = -Math.sin(ph) * Math.sin(ph) * 0.04;
  const p = (lx, ly, lz, w, h, d, c, m, rx) => {
    const q = rotY(lx, lz, yaw);
    boxR(B, x + q[0], ly, z + q[1], w, h, d, yaw, rx || 0, c, m);
  };
  p(-0.11, 0.40 + liftL, 0, 0.17, 0.80, 0.22, pants, 5, sw); // kaki kiri, menapak (0..0.8)
  p(0.11, 0.40 + liftR, 0, 0.17, 0.80, 0.22, pants, 5, -sw); // kaki kanan
  p(0, 1.15 + bob, 0, wT, 0.70, 0.36, col, 5); // badan
  p(-wT / 2 - 0.08, 1.12 + bob, 0, 0.13, 0.62, 0.16, col, 5, -sw * 0.7); // lengan kiri
  p(wT / 2 + 0.08, 1.12 + bob, 0, 0.13, 0.62, 0.16, col, 5, sw * 0.7); // lengan kanan
  p(0, 1.68 + bob, 0, 0.36, 0.36, 0.36, skin, 5); // kepala
  p(0, 1.88 + bob, -0.02, 0.38, 0.12, 0.38, hair, 5); // rambut
  if (o.kind === 'police') {
    p(0, 1.92 + bob, 0, 0.40, 0.09, 0.40, [0.08, 0.12, 0.25], 5); // topi dinas
    p(0, 1.88 + bob, 0.24, 0.42, 0.04, 0.14, [0.05, 0.07, 0.15], 5); // klep depan
  } else if (o.kind === 'gang') {
    p(0, 1.89 + bob, -0.02, 0.40, 0.12, 0.40, [0.55, 0.10, 0.12], 5); // bandana merah
  } else if (o.kind === 'soldier') {
    p(0, 1.92 + bob, 0, 0.40, 0.09, 0.40, [0.30, 0.33, 0.18], 5); // topi olive
  } else if (o.hat === 1) {
    p(0, 1.92 + bob, 0, 0.40, 0.09, 0.40, [0.55, 0.15, 0.15], 5); // topi baseball
  } else if (o.hat === 2) {
    p(0, 1.90 + bob, 0, 0.40, 0.14, 0.40, [0.25, 0.25, 0.30], 5); // beanie
  }
}

// R39 SPRITE — billboard 1 quad/NPC dari atlas turntable (model CC0 Quaternius,
// render offline 8 sudut x 4 fase jalan; atlas 3072x1920, sel 96x192, 10 varian).
// col = sudut + fase*8, row = varian. Fallback: person() box bila atlas belum
// load / gagal load (atlasTex null) — kode box TIDAK dihapus.
// Sudut: 0 = depan (menghadap kamera), +45deg per sel (arah rel = yaw ped
// relatif ke arah kamera; diverifikasi vs sel atlas: 0 depan, 2 profil kanan,
// 4 belakang, 6 profil kiri). rgt = screen-right kamera (-fz, 0, fx).
// FETCH AWAL: unduh atlas saat modul dimuat (bukan saat renderer dibuat) —
// mode screenshot (?shot=) hanya paint 2x; tanpa fetch awal, frame ke-2
// selalu keduluan fallback box. Texture GL tetap dibuat di createRenderer.
// MATERIAL 12 (bukan 11): material 11 milik R36 groundShadow di HEAD ini;
// sprite memakai 12 supaya tidak tertelan cabang groundShadow.
// window.__pa = 1 (R39 shot-mode): flag sinkron "atlas settle" (load/ error)
// untuk main.js runShot — paint shot menunggu flag ini sebelum __shotReady.
const PED_ATLAS = { tex: null, ok: false, failed: false, loading: false };
const PED_ATLAS_SRC = 'assets/ped-atlas.png';
let _pedAtlasResolve = null;
if (typeof window !== 'undefined') {
  window.__pedAtlasReady = new Promise((r) => { _pedAtlasResolve = r; });
}
let PED_ATLAS_IMG = null;
if (typeof Image !== 'undefined') {
  PED_ATLAS_IMG = new Image();
  PED_ATLAS_IMG.onload = () => { window.__pa = 1; if (_pedAtlasResolve) _pedAtlasResolve(true); };
  PED_ATLAS_IMG.onerror = () => { PED_ATLAS.failed = true; window.__pa = 1; if (_pedAtlasResolve) _pedAtlasResolve(false); };
  PED_ATLAS_IMG.src = PED_ATLAS_SRC;
}
// R40 TEX: 4 PNG grayscale Worker A (512/256 POT, REPEAT + mipmap). Fetch
// awal saat modul dimuat (pola atlas R39) supaya PNG 101 KB sudah tiba
// sebelum paint shot; GL texture dibuat di createRenderer dengan placeholder
// 1x1 abu-128 (multiplier 1.0) — tanpa race, tanpa __tx di main.js.
const R40_TEX = {
  road: { src: 'assets/asphalt.png', img: null, tex: null, ok: false },
  walk: { src: 'assets/sidewalk.png', img: null, tex: null, ok: false },
  sand: { src: 'assets/sand.png', img: null, tex: null, ok: false },
  fac: { src: 'assets/facade.png', img: null, tex: null, ok: false },
};
if (typeof Image !== 'undefined') {
  for (const k of Object.keys(R40_TEX)) {
    const e = R40_TEX[k];
    e.img = new Image();
    e.img.src = e.src;
  }
}
const PED_CELL_W = 96, PED_CELL_H = 192, PED_COLS = 32, PED_ROWS = 10;
const PED_AW = 3072, PED_AH = 1920;
// SMOOTH-WALK: fase walkPhase Jax di render sebelumnya — untuk crossfade
// pose sprite (personSprite, kind player). null = belum pernah render.
let _playerLastPhase = null;
function personSprite(SP, B, x, z, yaw, col, opt, camFwd, t) {
  const o = opt || {};
  if (!PED_ATLAS.ok) { person(B, x, z, yaw, col, opt); return; } // fallback box
  let variant;
  if (o.kind === 'player') variant = 6; // JAX (jaket cokelat)
  else if (o.kind === 'police') variant = 7;
  else if (o.kind === 'gang') variant = 8;
  else if (o.kind === 'soldier') variant = 9;
  else {
    const hh = hash2(Math.round(col[0] * 255) * 3 + Math.round(col[1] * 255), Math.round(col[2] * 255) + 7);
    variant = Math.floor(hh * 6) % 6; // sipil: 6 varian (F1-F3, M1-M3)
  }
  const fx = camFwd[0], fz = camFwd[1];
  const af = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  const ac = Math.atan2(-fx, -fz);
  let rel = af - ac;
  while (rel < 0) rel += Math.PI * 2;
  while (rel >= Math.PI * 2) rel -= Math.PI * 2;
  const angle = Math.round(rel / (Math.PI / 4)) % 8;
  // fase jalan R41 (rebase dari R39): walkPhase maju per JARAK tempuh
  // (onfoot.js/traffic.js/police.js, WALK_PHASE_PER_PX=0.05) — BUKAN waktu.
  // Fallback t*5 R39 DICABUT: walkPhase 0 = berdiri diam (frame 0), kalau
  // pakai t*5 sprite melangkah di tempat saat Jax/ped diam (treadmill).
  // Frame sprite 4 fase = floor(walkPhase/(π/2))%4 (sama dgn rumus R39).
  const ph = o.walkPhase || 0;
  const phase = ((Math.floor(ph / (Math.PI * 2) * 4) % 4) + 4) % 4;
  const cc = angle + phase * 8;
  const u0 = (cc * PED_CELL_W) / PED_AW, u1 = ((cc + 1) * PED_CELL_W) / PED_AW;
  const v0 = 1 - ((variant + 1) * PED_CELL_H) / PED_AH, v1 = 1 - (variant * PED_CELL_H) / PED_AH;
  const n = [-fx, 0, -fz]; // muka ke kamera
  const rgt = [-fz, 0, fx]; // screen-right kamera
  const hw = 0.425, hh2 = 0.95, cy = 0.95; // lebar 0.85u, tinggi 1.9u (sama dgn box person: 0..1.94)
  const P = (sr, sh) => [x + rgt[0] * sr * hw, cy + sh * hh2, z + rgt[2] * sr * hw];
  // SMOOTH-WALK (crossfade pose Jax): 4 pose diskrit = kaki "snap" tiap ganti
  // frame (terukur atlas: lompat s.d. 14 px sel ~19 px layar @1280x800, 5,6 Hz).
  // Paruh pertama tiap frame (u<0,5): gambar pose SEBELUMNYA sebagai ghost
  // yang memudar + pose sekarang yang muncul — dissolve ~0,1 dtk, bukan snap.
  // Hanya Jax (kind player): ped kecil di layar, pop-nya tak terbaca. Ghost
  // HANYA saat fase maju (Jax jalan); kalau diam fase beku -> tanpa ghost
  // (kalau tidak, double-image beku saat berhenti di tengah blend). Alpha
  // dibawa lewat warna quad (vC.r) — FS material 12 mengalikan tex.a dgn
  // vC.r; quad biasa vC=[1,1,1] jadi perilaku lama byte-identik.
  let curCol = [1, 1, 1];
  if (o.kind === 'player') {
    const u = (((ph % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2)) / (Math.PI / 2);
    const advanced = _playerLastPhase !== null && ph !== _playerLastPhase;
    _playerLastPhase = ph;
    if (advanced && u < 0.5) {
      const ccPrev = angle + ((phase + 3) % 4) * 8;
      const pu0 = (ccPrev * PED_CELL_W) / PED_AW, pu1 = ((ccPrev + 1) * PED_CELL_W) / PED_AW;
      const g = 1 - u * 2;
      quad(SP, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), n, [[pu0, v0], [pu1, v0], [pu1, v1], [pu0, v1]], [g, g, g], 12);
      curCol = [u * 2, u * 2, u * 2];
    }
  }
  quad(SP, P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), n, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]], curCol, 12);
}

// ---- jembatan state: bangun geometri frame dari state game yang hidup ----
const BRIDGE_POS = { x: 2400, y: 1680, top: 1640, bottom: 1720 }; // dari drawbridge.js
const WATER_X = 2448;
function heroOf(state) {
  const p = state.player;
  // JET R36: pesawat = kendaraan seperti mobil/perahu — kamera chase + pusat
  // 'near' mengikuti PESAWAT, bukan pemain. WAJIB: di mode shot, world tidak
  // di-step (main.js runShot hanya paint 2x), jadi p.x/p.y TIDAK tersinkron
  // ke pesawat (pemain tetap di spawn 480,480) — tanpa ini kamera duduk di
  // tengah kota sementara pesawatnya di spaceport (shot jets/takeoff/
  // planehigh baseline: hanya pejalan kaki di jalan). Sama dgn city3d.js
  // drawChase3D (hero = p.plane saat inPlane). Di live play setara: stepSpace
  // menyinkronkan p.x/p.y/p.angle ke pesawat tiap tick.
  if (p.inPlane && p.plane) return p.plane;
  if (p.inCar && p.car) return p.car;
  if (p.inBoat && p.boat) return p.boat;
  return p;
}
function distPx(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

function buildFrame(state, cam, OP, SH, GL, t, SP) {
  // R35-F7: jobs tick — runs once per DRAW (live play + staged shots).
  // The cinematic.update hook CANNOT do this: the shot page only paints
  // twice and never runs the main frame loop, so a cinematic-only tick
  // never fires in shots (cash stayed $2,150, 0/5). buildFrame receives
  // the REAL state (not the HUD spread copy), so cash rewards land.
  // 2D top-down view does NOT tick (no real-state post-cut hook there).
  tickJobs(state, 1 / 60);
  const tod = state.timeOfDay || PRESETS.sore; // TOD: tanpa preset = sore (nilai lama)
  // R38 Item 7: gain lampu rem ikut waktu — langkah SAMA seperti
  // TITLE_PAL.tlGain di city3d.js (title): siang 0.12 (nyaris mati),
  // sore/malam 1 (nyala penuh), pagi 0.45. BUKAN daylight preset
  // (siang 1.00 / sore 0.45 / pagi 0.32 / malam 0.08 — itu kecerahan
  // siang, bukan gain lampu). tod.name = 'siang'|'sore'|'pagi'|'malam';
  // blend ('blend:a->b') fallback 1 = perilaku lama.
  const TL_GAIN = { siang: 0.12, sore: 1, pagi: 0.45, malam: 1 };
  const tlGain = TL_GAIN[tod.name] ?? 1;
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
  const sunA = { x: -shDir.dx, z: -shDir.dz, w: 1 - tod.sun.y / 1.5 }; // R27c PALM: azimuth + bobot matahari
  const DIRSH = tod.bldShadow || tod.sun.y < 0.6; // R36 POSTFX: bayangan tanah berarah juga saat matahari rendah (sore 0.30, pagi 0.18) — bukan cuma siang
  const groundShadow = (cx, cz, w, d, h) => {
    // Quad gelap di tanah dari DINDING gedung ke arah bayangan (pangkal di
    // dinding, bukan di tengah — setengah dalam gedung tersembunyi + fade
    // UV mulai dari 0 tepat di dinding; kalau pangkal di tengah, bayangan
    // yang kelihatan sudah mulai di tengah fade = nyaris tak terlihat).
    const len = Math.min(h * shDir.len, 60); // R36 POSTFX: panjang bayangan (dibatasi 60u)
    const edge = (Math.abs(shDir.dx) * w * 0.5 + Math.abs(shDir.dz) * d * 0.5) * 0.9; // pusat->dinding searah bayangan (kotak axis-aligned; 0.9 = pangkal sedikit di dalam dinding)
    const px2 = -shDir.dz, pz2 = shDir.dx;
    const hw2 = Math.max(w, d) * 0.45;
    const nx = cx + shDir.dx * edge, nz = cz + shDir.dz * edge;
    const fx = cx + shDir.dx * (edge + len), fz = cz + shDir.dz * (edge + len);
    quad(SH, [nx - px2 * hw2, 0.03, nz - pz2 * hw2],
      [nx + px2 * hw2, 0.03, nz + pz2 * hw2],
      [fx + px2 * hw2, 0.03, fz + pz2 * hw2],
      [fx - px2 * hw2, 0.03, fz - pz2 * hw2],
      [0, 1, 0], [[0, 0.5], [1, 0.5], [1, 0.85], [0, 0.85]], [0, 0, 0], 11); // R36 POSTFX: material 11 = bayangan lunak berarah (bukan 9 elips)
  };
  const city = state.city;
  const hero = heroOf(state);
  const hx0 = hero.x, hy0 = hero.y;
  const near = (x, y, r) => distPx(x, y, hx0, hy0) < r;
  const R = 1700; // jangkauan gambar (px game)
  // R27c FRUSTUM CULL: buang objek di luar kerucut pandang kamera sebelum
  // geometrinya dibangun (hemat tris + build + upload; isi layar SAMA —
  // yang dicull tak terlihat). Uji 2D (XZ): sudut pusat + radius sudut.
  // Setengah-FOV horizontal 0.9 rad (~51.6 deg) = aman untuk aspek s.d. 2.4
  // (game 1.6 -> FOV asli ~39.8 deg; margin ~12 deg di tiap tepi layar).
  const ex = cam.eye[0] / S, ez = cam.eye[2] / S, fxx = cam.fwd[0], fzz = cam.fwd[1];
  const vis = (x, y, r) => {
    const dx = x - ex, dz = y - ez, a = dx * fxx + dz * fzz;
    if (a < -r) return 0;
    const d = Math.hypot(dx, dz);
    if (d <= r) return 1;
    const q = r / d;
    return a / d > 0.62 * Math.sqrt(1 - q * q) - 0.78 * q;
  };

  // Tanah: bidang gelap di bawah seluruh area pandang (tanpa ini, antar-jalan
  // berlubang dan langit oranye terlihat menembus ke bawah horizon).
  flat(OP, hx0 * S, -0.1, hy0 * S, 340, 340, [0.11, 0.13, 0.10], 5);

  // SPACEPORT-A: launch pad 1DesignTool (rebuild prosedural — file GLB
  // tidak masuk repo). WebGL2 sebelumnya TIDAK menggambar spaceport sama
  // sekali (hanya landasan di bawah); pad r=32 di (2328,548) space.js
  // kini digambar: hardstand + flame trench + mount oranye + tangga +
  // water tower biru + flood-light + crawlerway ramp. Hangar/menara
  // kontrol TETAP pekerjaan terpisah (bukan scope round ini).
  // Rect = SPACEPORT.pad space.js (x 2328, y 548, r 32); skala dari
  // SPACEPORT, bukan meter mentah (B3). Landasan (x 2220-2300) dan
  // parkir HA-1 (2204,680) tidak tersentuh (B10).
  if (near(2328, 548, 500)) {
    const OR = [0.91, 0.42, 0.12], GY = [0.54, 0.56, 0.60], DK = [0.08, 0.09, 0.10];
    flat(OP, 232.8, 0.04, 54.8, 3.6, 4.0, [0.49, 0.51, 0.55], 5); // hardstand
    flat(OP, 232.8, 0.06, 52.85, 3.6, 0.1, [1.0, 0.62, 0.30], 5); // tepi oranye N
    flat(OP, 232.8, 0.06, 56.75, 3.6, 0.1, [1.0, 0.62, 0.30], 5); // tepi oranye S
    flat(OP, 231.05, 0.06, 54.8, 0.1, 4.0, [1.0, 0.62, 0.30], 5); // tepi oranye W
    flat(OP, 234.55, 0.06, 54.8, 0.1, 4.0, [1.0, 0.62, 0.30], 5); // tepi oranye E
    flat(OP, 232.8, 0.06, 54.8, 2.0, 0.6, DK, 5); // flame trench
    // Launch mount: 4 kaki + meja oranye + lubang + 4 hold-down clamp.
    // Meja di 4.2u — tepat di bawah mata chase-cam (4.4u) supaya permukaan
    // meja + lubang terbaca dari selatan (lihat city3d.js).
    // SCALE-FIX (SPACEPORT-A finisher): semua w/d di blok ini 10x
    // kekecilan — Canvas box3 pakai SATUAN u (bukan px) untuk w/h/d,
    // jadi meja 16u ditulis 1.6, kaki 2u ditulis 0.2, dst. Akibatnya
    // pad WebGL2 jadi miniatur: meja 1.6u (collision rect city.js
    // 2320–2336 = 16u!), tangga 0.3u (tak terlihat), tiang lampu
    // 0.04u (benang). Disamakan ke Canvas; tris tak berubah.
    for (const [lx, lz] of [[232.15, 54.35], [233.45, 54.35], [232.15, 55.25], [233.45, 55.25]])
      box(OP, lx, 1.52, lz, 2.0, 3.0, 2.0, OR, 5);
    box(OP, 232.8, 3.6, 54.8, 16, 1.2, 12, OR, 5);
    flat(OP, 232.8, 4.22, 54.8, 0.7, 0.7, DK, 5); // lubang mount
    for (const [cx2, cz2] of [[232.8, 54.35], [233.4, 54.8], [232.8, 55.25], [232.2, 54.8]])
      box(OP, cx2, 4.7, cz2, 1.6, 1.0, 1.6, GY, 5);
    // Tangga akses: 4 anak tangga naik ke sisi selatan mount (3u lebar).
    const stepH2 = [1.1, 2.1, 3.1, 4.1];
    for (let i = 0; i < 4; i += 1) box(OP, 232.8, stepH2[i] / 2, 56.45 - 0.3 * i, 3.0, stepH2[i], 3.0, GY, 5);
    // Deluge water tower: 4 kaki + brace + tangki biru segi-8 + pita putih.
    // Total 15.2u — elemen tertinggi pad (seperti referensi).
    // TANK-FIX (SPACEPORT-A finisher): tinggi tangki 5u, bukan 0.5u —
    // deboxPoly h adalah TINGGI (y0 alas), dan Canvas octPrism pakai 5
    // (10→15u). 0.5u bikin tangki jadi piringan pipih yang tak terlihat
    // dari darat di WebGL2 (bukti: semua frame WebGL2 lama tak ada
    // tangki biru, sementara Canvas menampilkannya). Pita 0.8u, bukan
    // 0.08u — sama, 10x kekecilan. Radius cincin JUGA 10x kekecilan
    // (0.35 → 3.5u, sama dengan Canvas); tangki 0.7u lebarnya terbaca
    // seperti jarum biru, bukan tangki. Tris tak berubah (bentuk sama).
    for (const [tx2, tz2] of [[233.8, 53.7], [234.4, 53.7], [233.8, 54.3], [234.4, 54.3]])
      box(OP, tx2, 5.02, tz2, 0.6, 10, 0.6, GY, 5);
    box(OP, 234.1, 5.2, 54.0, 6.6, 0.4, 0.4, GY, 5);
    box(OP, 234.1, 5.2, 54.0, 0.4, 0.4, 6.6, GY, 5);
    deboxPoly(OP, 234.1, 10, 54.0, deboxRingCircle(3.5, 8), 5, [0.18, 0.44, 0.82], 5);
    deboxPoly(OP, 234.1, 12.2, 54.0, deboxRingCircle(3.6, 8), 0.8, [0.91, 0.89, 0.84], 5);
    deboxCone(OP, 234.1, 15, 54.0, deboxRingCircle(3.5, 8), 0.15, [0.15, 0.36, 0.68], 5);
    // Flood-light: 2 tiang + kepala lampu di sudut slab.
    for (const [mx2, mz2] of [[231.2, 53.0], [234.4, 56.6]]) {
      box(OP, mx2, 4.52, mz2, 0.4, 9, 0.4, [0.23, 0.25, 0.28], 5);
      box(OP, mx2, 9.4, mz2, 1.6, 0.8, 0.8, [0.13, 0.15, 0.17], 5);
    }
    // Service tower footing (alas kecil di barat mount).
    box(OP, 231.4, 0.32, 54.8, 4, 0.6, 4, [0.42, 0.45, 0.50], 5);
    // Crawlerway ramp: bidang miring ke selatan + curb oranye.
    // RAMP-FIX (SPACEPORT-A finisher): tinggi 0.3u, bukan 1.2u — deck
    // pad cuma 0.05u, step 1.15u di ujung utara bikin kaki pejalan kaki
    // masuk ke lereng (game tidak mengikuti ketinggian tanah).
    const rn = [0, 0.996, -0.089]; // normal bidang miring (naik 0.25u / 2.8u ke selatan)
    quad(OP, [232.1, 0.05, 56.8], [233.5, 0.05, 56.8], [233.5, 0.3, 59.6], [232.1, 0.3, 59.6],
      rn, [[0, 0], [1, 0], [1, 1], [0, 1]], [0.60, 0.63, 0.66], 5);
    quad(OP, [232.0, 0.06, 56.8], [232.1, 0.06, 56.8], [232.1, 0.36, 59.6], [232.0, 0.36, 59.6],
      rn, [[0, 0], [1, 0], [1, 1], [0, 1]], [1.0, 0.62, 0.30], 5);
    quad(OP, [233.5, 0.06, 56.8], [233.6, 0.06, 56.8], [233.6, 0.36, 59.6], [233.5, 0.36, 59.6],
      rn, [[0, 0], [1, 0], [1, 1], [0, 1]], [1.0, 0.62, 0.30], 5);
  }

  // JET R36: landasan 09 minimal (tanpa ini pesawat parkir terbaca di
  // tengah jalan kota). Hanya aspal + garis tengah + lampu tepi; hangar/
  // menara = pekerjaan spaceport terpisah. Rect = SPACEPORT.runway
  // space.js (x 2220-2300, y 520-780).
  if (near(2260, 650, 500)) {
    flat(OP, 226, 0.04, 65, 8, 26, [0.12, 0.12, 0.14], 5);
    for (let dz = -11; dz <= 11; dz += 4) flat(OP, 226, 0.06, 65 + dz, 0.35, 1.8, [0.85, 0.85, 0.80], 5);
    for (let dz = -12; dz <= 12; dz += 4) {
      flat(OP, 222.4, 0.06, 65 + dz, 0.3, 0.3, [1.0, 0.8, 0.25], 4);
      flat(OP, 229.6, 0.06, 65 + dz, 0.3, 0.3, [1.0, 0.8, 0.25], 4);
    }
  }

  // Jalan: segmen di sekitar hero (u = sepanjang jalan, v = melintang, untuk marka).
  const roadCol = [0.10, 0.09, 0.11], walkCol = [0.32, 0.32, 0.32];
  // ZEBRA: trotoar/curb tidak boleh menyeberang persimpangan — pita
  // dibelah di sekitar tiap jalan melintang (|along| < 4.8u = 48px dari
  // pusatnya). Corner pad (|along| 48..80px) TETAP: potongan di kedua
  // sisi jendela. Aspal TIDAK dibelah. UV trotoar pakai offset dunia
  // (s - a0) supaya tekstur ubin tidak bergeser di tiap potongan.
  const clipWalkSpans = (a0, a1, crossPx) => {
    let spans = [[a0, a1]];
    for (const c of crossPx) {
      const w0 = c * S - 4.8, w1 = c * S + 4.8;
      const next = [];
      for (const [lo, hi] of spans) {
        if (w1 <= lo || w0 >= hi) { next.push([lo, hi]); continue; }
        if (w0 > lo) next.push([lo, w0]);
        if (w1 < hi) next.push([w1, hi]);
      }
      spans = next;
      if (!spans.length) break;
    }
    return spans;
  };
  const roadSeg = (x0, y0, x1, y1, vertical) => {
    const len = Math.hypot(x1 - x0, y1 - y0) * S; // (ZEBRA-STRIPES: tidak lagi dipakai UV — UV aspal kini absolut-dunia; dipertahankan supaya diff minimal)
    // R33-MERGE (Juna #6): chase road WIDER — asphalt half-width 36->44;
    // A-LITE (wave 2): ROAD_W 72->80, asphalt half-width 44->48 (same as
    // the Canvas fallback in city3d.js). VISUAL ONLY: this is paint
    // (roadSeg); ROAD_W/gameplay/collision untouched. Sidewalk strips
    // span hw..hw+3.2u (48..80px, full band to the facades); lamps at
    // +-72 stay clear of the asphalt (edge 48, facades at 80).
    const hw = 48 * S;
    if (vertical) {
      const X = x0 * S, z0 = y0 * S, z1 = y1 * S;
      // ZEBRA-STRIPES: UV aspal ABSOLUT-DUNIA (u = koordinat dunia sepanjang
      // jalan, dalam unit) supaya fase dash terikat grid persimpangan, bukan
      // awal segmen (yang tergantung kamera). Vertikal: u = z; horizontal: u = x.
      quad(OP, [X - hw, -0.05, z0], [X + hw, -0.05, z0], [X + hw, -0.05, z1], [X - hw, -0.05, z1],
        [0, 1, 0], [[z0, 0], [z0, 1], [z1, 1], [z1, 0]], roadCol, 13); // R40: aspal 3 -> 13 (tekstur)
      for (const [s0, s1] of clipWalkSpans(z0, z1, city.roadsH)) {
        flat(OP, X - (hw + 1.6), 0.02, (s0 + s1) / 2, 3.2, (s1 - s0), walkCol, 14, // TROTOAR: pita hw..hw+3.2u (48..80px) + UV dunia (u = lebar 3.2, v = panjang, offset s0-z0)
          [[0, s0 - z0], [3.2, s0 - z0], [3.2, s1 - z0], [0, s1 - z0]]);
        flat(OP, X - (hw + 0.15), 0.03, (s0 + s1) / 2, 0.3, (s1 - s0), [0.07, 0.07, 0.08], 5); // TROTOAR: curb — garis gelap tepi jalan (48..51px); quad, bukan tekstur (u tercermin antar sisi, tepi-tekstur tak simetris)
        flat(OP, X + (hw + 1.6), 0.02, (s0 + s1) / 2, 3.2, (s1 - s0), walkCol, 14,
          [[0, s0 - z0], [3.2, s0 - z0], [3.2, s1 - z0], [0, s1 - z0]]);
        flat(OP, X + (hw + 0.15), 0.03, (s0 + s1) / 2, 0.3, (s1 - s0), [0.07, 0.07, 0.08], 5);
      }
    } else {
      const Z = y0 * S, x0u = x0 * S, x1u = x1 * S;
      quad(OP, [x0u, -0.05, Z - hw], [x1u, -0.05, Z - hw], [x1u, -0.05, Z + hw], [x0u, -0.05, Z + hw],
        [0, 1, 0], [[x0u, 0], [x1u, 0], [x1u, 1], [x0u, 1]], roadCol, 13); // R40: aspal 3 -> 13 (tekstur)
      for (const [s0, s1] of clipWalkSpans(x0u, x1u, city.roadsV)) {
        flat(OP, (s0 + s1) / 2, 0.02, Z - (hw + 1.6), (s1 - s0), 3.2, walkCol, 14, // TROTOAR: pita hw..hw+3.2u (48..80px) + UV dunia (u = panjang, offset s0-x0u, v = lebar 3.2)
          [[s0 - x0u, 0], [s1 - x0u, 0], [s1 - x0u, 3.2], [s0 - x0u, 3.2]]);
        flat(OP, (s0 + s1) / 2, 0.03, Z - (hw + 0.15), (s1 - s0), 0.3, [0.07, 0.07, 0.08], 5);
        flat(OP, (s0 + s1) / 2, 0.02, Z + (hw + 1.6), (s1 - s0), 3.2, walkCol, 14,
          [[s0 - x0u, 0], [s1 - x0u, 0], [s1 - x0u, 3.2], [s0 - x0u, 3.2]]);
        flat(OP, (s0 + s1) / 2, 0.03, Z + (hw + 0.15), (s1 - s0), 0.3, [0.07, 0.07, 0.08], 5);
      }
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

  // R36-ROADS (Juna 17:18: "tambahin zebracross dan detail lainnya") — VISUAL ONLY:
  // lebar jalan, lajur dan collision TIDAK berubah. Marka di y 0.01 (di atas aspal
  // -0.05) supaya tidak z-fight; prop di trotoar saja, tidak pernah menutupi koin.
  const MARK_W = [0.90, 0.99, 1.10]; // ZEBRA-STRIPES iterasi 2: putih dingin + lebih terang — kalibrasi frame after iterasi 1: sore strip L 163 (target ≥175), R-B +11 (target ≤+10); siang R-B +11 (target ±8); malam tidak biru-hantu (cek visual)
  // Zebra + garis stop di tiap persimpangan yang terlihat (4 lengan penuh).
  // Strip membujur (sejajar lalu lintas, standar zebra): 9 strip per lengan.
  const zebraV = (rx, ry, side) => {
    const cz = (ry + side * 56) * S;
    for (let k = -5; k <= 5; k += 1) flat(OP, (rx + k * 9) * S, 0.01, cz, 0.45, 3.5, MARK_W, 5);
    flat(OP, rx * S, 0.01, (ry + side * 78) * S, 9.6, 0.5, MARK_W, 5); // garis stop (di luar pita zebra: tepi jauh 73.5 + celah 2 + setengah lebar 2.5)
  };
  const zebraH = (rx, ry, side) => {
    const cx = (rx + side * 56) * S;
    // ZEBRA-ARMS: strip panjang sumbu-z (transverse), fase selaras grid
    // zebraV (x ≡ rx mod 9) supaya bar x=rx∓45 menyambung dengan strip
    // pertama/terakhir zebraV melewati celah tengah. 4 strip/lengan.
    const ks = side < 0 ? [-8, -7, -6, -5] : [5, 6, 7, 8];
    for (const k of ks) flat(OP, (rx + k * 9) * S, 0.01, ry * S, 0.45, 9.4, MARK_W, 5);
    flat(OP, (rx + side * 78) * S, 0.01, ry * S, 0.5, 9.6, MARK_W, 5); // garis stop — TIDAK BERUBAH
  };
  for (const rx of city.roadsV) {
    for (const ry of city.roadsH) {
      if (!near(rx, ry, R) || !vis(rx, ry, 130)) continue;
      for (const sd of [1, -1]) { zebraV(rx, ry, sd); zebraH(rx, ry, sd); }
    }
  }
  // Jalan hero + arahnya (untuk tekstur & prop dekat kamera, camera-relative
  // seperti lampu/palem fallback — posisi dunia, bukan state, jadi tidak
  // mengganggu gameplay/collision).
  const hFwdX = cam.fwd[0], hFwdZ = cam.fwd[1];
  const hEW = Math.abs(hFwdX) >= Math.abs(hFwdZ);
  const hRoad = hEW
    ? city.roadsH.reduce((a, b) => Math.abs(b - hy0) < Math.abs(a - hy0) ? b : a)
    : city.roadsV.reduce((a, b) => Math.abs(b - hx0) < Math.abs(a - hx0) ? b : a);
  const hLat = hEW ? (hRoad - hy0) * S * hFwdX : -(hRoad - hx0) * S * hFwdZ; // lateral sumbu jalan thd hero (kanan = (-fz, fx))
  const atFU = (fwdU, latU) => [hx0 * S + hFwdX * fwdU + (-hFwdZ) * (hLat + latU), hy0 * S + hFwdZ * fwdU + hFwdX * (hLat + latU)]; // (maju, lateral) unit -> [x, z] unit
  const propClear = (fwdU, latU) => { // prop tidak boleh menutupi koin/hydrant (item 2)
    const q = atFU(fwdU, latU), px = q[0] / S, pz = q[1] / S;
    for (const cl of state.collectibles || []) if (!cl.taken && Math.hypot(cl.x - px, cl.y - pz) < 60) return false;
    for (const hd of state.hydrants || []) if (Math.hypot(hd.x - px, hd.y - pz) < 50) return false;
    return true;
  };
  // Panah lajur (putih, searah jalan).
  { // panah lajur (putih, searah jalan): batang + kepala segitiga
    const sc = atFU(28.4, 0), hb = atFU(30.4, 0), ht = atFU(32.0, 0);
    if (hEW) { flat(OP, sc[0], 0.01, sc[1], 2.4, 0.5, MARK_W, 5); quad(OP, [ht[0], 0.01, ht[1]], [hb[0], 0.01, hb[1] - 0.8], [hb[0], 0.01, hb[1] + 0.8], [ht[0], 0.01, ht[1]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], MARK_W, 5); }
    else { flat(OP, sc[0], 0.01, sc[1], 0.5, 2.4, MARK_W, 5); quad(OP, [ht[0], 0.01, ht[1]], [hb[0] - 0.8, 0.01, hb[1]], [hb[0] + 0.8, 0.01, hb[1]], [ht[0], 0.01, ht[1]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], MARK_W, 5); }
  }
  // Ubin trotoar: sambungan melintang tiap ~12 unit di kedua trotoar.
  // R36-ROADS item 17: dari fwd -6 (dasar layar, di belakang hero).
  // ZEBRA: joint yang jatuh di kotak aspal persimpangan (|along| < 48px
  // dari pusat jalan melintang) dilewati — kalau tidak, garis joint
  // gelap melayang di atas aspal (trotoar di sana sudah di-clip).
  const jCross = hEW ? city.roadsV : city.roadsH;
  for (let f = -6; f <= 66; f += 12) for (const lat of [-6.4, 6.4]) {
    const j = atFU(f, lat);
    const jAlongPx = (hEW ? j[0] : j[1]) / S;
    if (jCross.some((c) => Math.abs(jAlongPx - c) < 48)) continue;
    if (hEW) flat(OP, j[0], 0.03, j[1], 0.14, 0.7, [0.16, 0.15, 0.17], 5);
    else flat(OP, j[0], 0.03, j[1], 0.7, 0.14, [0.16, 0.15, 0.17], 5);
  }
  // Halte bus (bangku + rambu) di trotoar kanan, tempat sampah di kiri.
  // BENCH: bangku world-snap grid 128u (pola snapGrid Canvas: slot =
  // floor((heroAlong+16)/128)*128) + hindari-zebra (slot <80px = 8u dari
  // pusat persimpangan di jalan aktif -> lewati). Dulu camera-relative
  // fwd 16 tetap -> lewat pojok zebra tiap hero ~20-23u dari persimpangan.
  // Gambar hanya bila fwd slot 12..66 (jendela prop dekat WebGL2).
  const heroAlongU = (hEW ? hx0 : hy0) * S;
  const bnSlotU = Math.floor((heroAlongU + 16) / 128) * 128, bnFwdU = bnSlotU - heroAlongU;
  const bnNearXing = (() => {
    const cross = hEW ? city.roadsV : city.roadsH;
    for (const c of cross) if (Math.abs(bnSlotU - c * S) < 8) return true;
    return false;
  })();
  if (bnFwdU >= 12 && bnFwdU < 66 && !bnNearXing && propClear(bnFwdU, 7.5)) {
    const bn = atFU(bnFwdU, 7.5), bb = atFU(bnFwdU, 7.75), yaw = hEW ? 0 : Math.PI / 2;
    boxR(OP, bn[0], 0.55, bn[1], 1.9, 0.14, 0.55, yaw, 0, [0.45, 0.32, 0.20], 5); // bangku: dudukan kayu
    boxR(OP, bb[0], 0.95, bb[1], 1.9, 0.6, 0.1, yaw, 0, [0.40, 0.28, 0.18], 5); // sandaran
    boxR(OP, bn[0], 0.25, bn[1], 0.12, 0.5, 0.5, yaw, 0, [0.15, 0.15, 0.16], 5); // kaki
  }
  if (bnFwdU >= 12 && bnFwdU < 66 && !bnNearXing && propClear(bnFwdU + 3, 7.5)) {
    const sg = atFU(bnFwdU + 3, 7.5);
    box(OP, sg[0], 1.4, sg[1], 0.12, 2.8, 0.12, LAMP_STEEL, 5); // tiang rambu halte
    if (hEW) box(OP, sg[0], 2.5, sg[1], 0.95, 0.65, 0.08, [0.12, 0.35, 0.85], 5);
    else box(OP, sg[0], 2.5, sg[1], 0.08, 0.65, 0.95, [0.12, 0.35, 0.85], 5); // panel biru halte
  }
  if (propClear(24, -7.5)) {
    const tb = atFU(24, -7.5);
    box(OP, tb[0], 0.48, tb[1], 0.55, 0.95, 0.55, [0.10, 0.28, 0.14], 5); // tempat sampah hijau
    box(OP, tb[0], 1.0, tb[1], 0.6, 0.1, 0.6, [0.08, 0.22, 0.11], 5); // tutup
  }
  // Lampu lalu lintas di persimpangan pertama di depan hero (sudut yang tidak
  // dipakai lampu jalan: lampu di (rx-72,ry+72)/(rx+72,ry-72), ini (rx+72,ry+72)).
  {
    let best = null;
    for (const rx of city.roadsV) for (const ry of city.roadsH) {
      if (hEW && ry !== hRoad) continue;
      if (!hEW && rx !== hRoad) continue;
      const fw = hEW ? (rx - hx0) * S * hFwdX : (ry - hy0) * S * hFwdZ;
      if (fw > 15 && fw < 120 && (!best || fw < best[0])) best = [fw, rx, ry];
    }
    if (best) {
      const rx = best[1], ry = best[2], px = (rx + 72) * S, pz = (ry + 72) * S;
      box(OP, px, 2.6, pz, 0.35, 5.2, 0.35, LAMP_STEEL, 5); // tiang
      if (hEW) { deboxBeam(OP, px, 5.0, pz, px, 5.3, pz - 1.5, 0.18, LAMP_STEEL, 5); box(OP, px, 4.9, pz - 1.5, 0.5, 1.3, 0.5, [0.08, 0.08, 0.09], 5); }
      else { deboxBeam(OP, px, 5.0, pz, px - 1.5, 5.3, pz, 0.18, LAMP_STEEL, 5); box(OP, px - 1.5, 4.9, pz, 0.5, 1.3, 0.5, [0.08, 0.08, 0.09], 5); }
      const hy = hEW ? pz - 1.5 : pz, hx2 = hEW ? px : px - 1.5; // kepala: merah menyala (atas), muka menghadap hero (arah datang = -fwd) — lampu menonjol 0.03 dari muka kepala
      if (hEW) {
        const lx = hx2 - 0.28 * hFwdX;
        box(OP, lx, 5.25, hy, 0.08, 0.3, 0.3, [1.0, 0.15, 0.10], 4);
        box(OP, lx, 4.9, hy, 0.08, 0.3, 0.3, [0.35, 0.25, 0.05], 4);
        box(OP, lx, 4.55, hy, 0.08, 0.3, 0.3, [0.05, 0.30, 0.08], 4);
      } else {
        const lz = hy - 0.28 * hFwdZ;
        box(OP, hx2, 5.25, lz, 0.3, 0.3, 0.08, [1.0, 0.15, 0.10], 4);
        box(OP, hx2, 4.9, lz, 0.3, 0.3, 0.08, [0.35, 0.25, 0.05], 4);
        box(OP, hx2, 4.55, lz, 0.3, 0.3, 0.08, [0.05, 0.30, 0.08], 4);
      }
    }
  }
  // ---- R35-F7-JOB-START (F7-B job beacon, WebGL2) ----
  // Job beacon = cyan ground marker + vertical beam (same deboxBeam shape
  // as the token's gold beam). Lamps, tokens, buildings and roads are NOT
  // touched (zona R36/R38).
  {
    const _job = activeJob(jobsState(state));
    if (_job && near(_job.tx, _job.ty, R) && vis(_job.tx, _job.ty, 90)) {
      flat(OP, _job.tx * S, 0.12, _job.ty * S, 5.2, 5.2, [0.22, 0.88, 0.9], 4);
      deboxBeam(OP, _job.tx * S, 0.1, _job.ty * S, _job.tx * S, 2.4, _job.ty * S, 0.3, [0.22, 0.88, 0.9], 4);
    }
  }
  // ---- R35-F7-JOB-END ----


  // Gedung (dekat hero saja) + taman + pohon.
  // Cull: gedung yang terlalu dekat dengan kamera dihilangkan (seperti
  // city3d round 22) — kalau tidak, satu dinding memenuhi sepertiga frame.
  const camX = cam.eye[0], camZ = cam.eye[2];
  let bi = 0;
  for (const b of city.buildings) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    if (!near(cx, cy, R + 200) || !vis(cx, cy, Math.hypot(b.w, b.h) / 2 + (DIRSH ? 400 : 0))) { bi++; continue; }
    // GEDUNG: cull by jarak TERDEKAT fasad ke kamera (AABB), bukan pusat gedung.
    // Pusat 16 unit tapi fasad 1 unit dari kamera = tembok raksasa (VB-13).
    const bMinX = b.x * S, bMaxX = (b.x + b.w) * S, bMinZ = b.y * S, bMaxZ = (b.y + b.h) * S;
    const ddx = Math.max(bMinX - camX, 0, camX - bMaxX);
    const ddz = Math.max(bMinZ - camZ, 0, camZ - bMaxZ);
    if (Math.hypot(ddx, ddz) < 12) { bi++; continue; }
    if(INT&&INT.hideShell(state,b)){bi++;continue;} // R41: Jax di dalam -> cangkang sembunyi (interior terlihat)
    // GEDUNG-BLD: muka jalan = sisi ke jalan terdekat (rumus sama dengan
    // doorSide() interiors.js) — untuk pedimen/balkon di bld().
    let bFace = 'S';
    {
      const gaps = { S: 1e9, W: 1e9, N: 1e9, E: 1e9 };
      for (const rx of city.roadsV) {
        if (rx < b.x) gaps.W = Math.min(gaps.W, b.x - rx);
        if (rx > b.x + b.w) gaps.E = Math.min(gaps.E, rx - (b.x + b.w));
      }
      for (const ry of city.roadsH) {
        if (ry < b.y) gaps.N = Math.min(gaps.N, b.y - ry);
        if (ry > b.y + b.h) gaps.S = Math.min(gaps.S, ry - (b.y + b.h));
      }
      for (const s of ['W', 'N', 'E']) if (gaps[s] < gaps[bFace]) bFace = s;
    }
    bld(OP, GL, b, bi, tod.facK, bFace);
    if (DIRSH) groundShadow(cx * S, cy * S, b.w * S, b.h * S, (b.height || 2) * 6.5); // R36 POSTFX: bayangan gedung sore/pagi juga (dulu cuma siang)
    bi++;
  }
  if(INT)INT.draw(state,OP,GL,t,{boxR,box,flat}); // R41: pintu + interior
  for (const pk of city.parks || []) {
    if (!near(pk.x + pk.w / 2, pk.y + pk.h / 2, R)) continue;
    flat(OP, (pk.x + pk.w / 2) * S, 0.03, (pk.y + pk.h / 2) * S, pk.w * S, pk.h * S, [0.12, 0.30, 0.16], 5);
  }
  for (const tr of city.trees || []) {
    if (!near(tr.x, tr.y, 1200) || !vis(tr.x, tr.y, DIRSH ? 130 : 40)) continue;
    const scT = 0.9 + hash2(Math.round(tr.x), Math.round(tr.y)) * 0.35; // R36 v3: tinggi palem taman bervariasi (alami)
    palm(OP, tr.x * S, tr.y * S, sunA, scT);
    if (DIRSH) groundShadow(tr.x * S, tr.y * S, 1.2, 1.2, 5.1 * scT); // SIANG v2: bayangan palem (R36: mahkota naik 4.4->5.1)
  }
  // R36 POHON TEPI JALAN: city.trees HANYA ada di dalam taman (16% blok) —
  // dari chase-cam mereka sembunyi di balik gedung, jadi shot chase/title
  // kelihatan tanpa pohon sama sekali (probe seed 7: 0 pohon di koridor
  // x 1400..2400, y 960..1280). 5 pohon staged di trotoar jalan yang
  // sedang dilalui hero, relatif-kamera seperti lampu city3d.js (JF4):
  // batang di ±72 px dari garis tengah jalan (tepi trotoar; aspal 48,
  // fasad 80), TIDAK di lajur. Posisi dijepit ke TENGAH BLOK (along ≡ 8
  // mod 16 unit; persimpangan tiap 16 unit) supaya tidak menabrak tiang
  // lampu di sudut persimpangan (±72,±72) — jarak min 32 px. Slot
  // k=2 = pohon rindang, sisanya palem; sisi selang-seling, tapi kalau
  // ada pejalan kaki / koin Harbor Token dalam 20 px dari titik rencana,
  // GESER dulu sepanjang jalan (±4 unit, tetap di sisi yang sama) — balik
  // sisi HANYA kalau dua geseran itu juga bentrok (v2: balik sisi bikin
  // 4/5 pohon menumpuk di utara, di layar jadi 1 palem saja; probe kotak
  // magenta membuktikan semua slot dirender, mereka cuma kolinear).
  // Skala naik dgn slot (1.0 -> 1.28): palem jauh lebih tinggi supaya
  // mahkotanya muncul di ATAS palem dekat. Lewati slot <12 unit dari
  // kamera (batang di depan lensa) dan di luar daratan (x>2420 / x<30).
  {
    const fx2 = cam.fwd[0], fz2 = cam.fwd[1];
    const rx2 = -fz2, rz2 = fx2; // kanan layar
    const camAlong = cam.eye[0] * fx2 + cam.eye[2] * fz2;
    const roadLat = (() => { // lateral garis tengah jalan terdekat hero
      if (Math.abs(fx2) >= Math.abs(fz2)) {
        const roadY = city.roadsH.reduce((a, b) => Math.abs(b - hy0) < Math.abs(a - hy0) ? b : a);
        return (roadY * S - cam.eye[2]) * fx2 - (hx0 * S - cam.eye[0]) * fz2;
      }
      const roadX = city.roadsV.reduce((a, b) => Math.abs(b - hx0) < Math.abs(a - hx0) ? b : a);
      return (hy0 * S - cam.eye[2]) * fx2 - (roadX * S - cam.eye[0]) * fz2;
    })();
    const mod16 = (a) => ((a % 16) + 16) % 16;
    let a0 = camAlong + 20;
    a0 += (8 - mod16(a0) + 16) % 16; // tengah blok pertama ≥20 unit di depan kamera
    const clash = (wx, wy) => {
      if (slotInBuilding(city, wx, wy)) return true; // 1A-TREES: slot jatuh di dalam footprint gedung (saat belok) -> geser/lewati
      for (const pd of state.peds || []) if (pd.alive !== false && Math.hypot(pd.x - wx, pd.y - wy) < 20) return true;
      for (const cl of state.collectibles || []) if (!cl.taken && Math.hypot(cl.x - wx, cl.y - wy) < 25) return true;
      return false;
    };
    const spot = (a, side) => { // posisi dunia (unit) utk along a & sisi side
      const la = roadLat + side * 7.5;
      return [(cam.eye[0] + fx2 * (a - camAlong) + rx2 * la) / S,
              (cam.eye[2] + fz2 * (a - camAlong) + rz2 * la) / S];
    };
    for (let k = 0; k < 5; k += 1) {
      let along = a0 + k * 16;
      let side = k % 2 === 0 ? -1 : 1; // selang-seling kiri/kanan
      let [wx, wy] = spot(along, side);
      if (wx < 30 || wx > 2420 || wy < 30 || wy > 1890) continue;
      if (clash(wx, wy)) { // geser dulu (+4 lalu -4 unit), baru balik sisi
        let ok = false;
        for (const da of [4, -4]) {
          const [ax, ay] = spot(along + da, side);
          if (!clash(ax, ay)) { along += da; wx = ax; wy = ay; ok = true; break; }
        }
        if (!ok) {
          side = -side;
          [wx, wy] = spot(along, side);
          if (clash(wx, wy)) continue; // dua sisi bentrok -> lewati slot
        }
      }
      const wxu = cam.eye[0] + fx2 * (along - camAlong) + rx2 * (roadLat + side * 7.5);
      const wyu = cam.eye[2] + fz2 * (along - camAlong) + rz2 * (roadLat + side * 7.5);
      if (Math.hypot(wxu - cam.eye[0], wyu - cam.eye[2]) < 12) continue;
      const scK = k === 2 ? 1.0 : 1 + k * 0.12; // 1A-TREES: slot k=2 (shade tree) tanpa skala (dulu 1.24); R36 v4: jauh = lebih tinggi
      if (k === 2) shadeTree(OP, wxu, wyu, sunA, scK);
      else palm(OP, wxu, wyu, sunA, scK, [-side * rx2, -side * rz2]); // 1A-TREES: arah dr batang ke sumbu jalan, utk clamp pelepah (POLEFIX2)
      if (DIRSH) groundShadow(wxu, wyu, 1.2, 1.2, (k === 2 ? 4.8 : 5.1) * scK);
    }
  }

  // R36 PANTAI: garis pantai timur (x 2340..2448) — pasir + payung +
  // kursi + palem + perahu nelayan + ombak. VISUAL SAJA: tidak menyentuh
  // collision/lajur/misi. Pasir HANYA di luar koridor jalan (y<1072 /
  // y>1168) supaya tidak menutup aspal; prop di x<=2410, y 940..1300 —
  // jauh dari Harbor Token terdekat (2240,1600 / 2446,526 / 2410,1720).
  // Gate hx0>1300: dari koridor chase (hero ~1587) pantai kelihatan di
  // ujung jalan; di luar itu tidak digambar (hemat frame time). Air di
  // sini digambar sendiri (blok air asli baru jalan kalau hx0>2250) supaya
  // buih ombak tidak melayang di atas bidang tanah gelap.
  if (hx0 > 1300 && near(2390, 1120, 1750) && vis(2390, 1120, 700)) {
    const SAND = [0.76, 0.64, 0.42], SAND_D = [0.62, 0.50, 0.32], SAND_L = [0.86, 0.74, 0.52];
    // A-WORLD: air pantai + pasir mengikuti lekuk shoreX(y) (tanah menonjol
    // ke air maks 12u). TRAPESIUM via quad() — BUKAN persegi flat(): tepi
    // barat/timur tiap segmen = shoreX di KEDUA ujungnya, jadi segmen yang
    // bersebelahan berbagi nilai shoreX(ey) yang sama persis → ubin tanpa
    // celah. Persegi (revisi pertama) meninggalkan celah gelap sampai 3,9u
    // di air / 5,5u di pasir antar-segmen — terukur, bukan tebakan.
    // Celah koridor jalan (y 1072–1168) dipertahankan supaya pasir tidak
    // menutup aspal — sama seperti 4 quad lama.
    const WCOL = [0.05, 0.20, 0.32], WUV = [[0, 0], [1, 0], [1, 1], [0, 1]];
    if (hx0 <= 2250) {
      for (let sy = 650; sy < 1590;) {
        const ey = Math.min(sy + 120, 1590);
        quad(OP, [shoreX(sy) * S, 0.0, sy * S], [2560 * S, 0.0, sy * S], [2560 * S, 0.0, ey * S], [shoreX(ey) * S, 0.0, ey * S], [0, 1, 0], WUV, WCOL, 10);
        sy = ey;
      }
    }
    for (const [s0, s1] of [[740, 1072], [1168, 1500]]) {
      for (let sy = s0; sy < s1;) {
        const ey = Math.min(sy + 83, s1);
        quad(OP, [2340 * S, 0.03, sy * S], [shoreX(sy) * S, 0.03, sy * S], [shoreX(ey) * S, 0.03, ey * S], [2340 * S, 0.03, ey * S], [0, 1, 0],
          [[0, 0], [(shoreX(sy) - 2340) * S, 0], [(shoreX(ey) - 2340) * S, (ey - sy) * S], [0, (ey - sy) * S]], SAND, 15);
        sy = ey;
      }
    }
    for (let i = 0; i < 10; i += 1) { // bercak tone pasir (utara/selatan, JANGAN di koridor jalan)
      const pz = (i % 2 ? 74 : 118) + hash2(i, 5) * 32;
      const bw = 1.6 + hash2(i, 9) * 2.4, bd = 1.2 + hash2(i, 11) * 2.0;
      flat(OP, 234.5 + hash2(i, 3) * 9, 0.04, pz, bw, bd, hash2(i, 7) < 0.5 ? SAND_D : SAND_L, 15, [[0, 0], [bw, 0], [bw, bd], [0, bd]]);
    }
    for (let i = 0; i < 14; i += 1) { // jejak kaki berpasangan di pasir
      const pz = (i % 2 ? 96 : 118) + hash2(i, 17) * 10;
      const px = 235 + hash2(i, 13) * 8.5;
      flat(OP, px, 0.045, pz, 0.35, 0.18, SAND_D, 15, [[0, 0], [0.35, 0], [0.35, 0.18], [0, 0.18]]);
      flat(OP, px + 0.5, 0.045, pz + 0.35, 0.35, 0.18, SAND_D, 15, [[0, 0], [0.35, 0], [0.35, 0.18], [0, 0.18]]);
    }
    // ombak: 2 baris buih di garis pantai, bergeser pelan dengan t.
    // A-WORLD: buih mengikuti lekuk shoreX (bukan garis lurus x=2453).
    for (let r = 0; r < 2; r += 1) {
      for (let i = 0; i < 8; i += 1) {
        const wz = 76 + i * 9 + r * 4.5;
        const wx = (shoreX(wz * 10) + 5 + r * 12 + Math.sin(t * 0.9 + i * 1.3 + r * 2.0) * 4.5) * S;
        flat(OP, wx, 0.05, wz, 1.1, 3.2 + hash2(i, r) * 2.4, [0.88, 0.92, 0.95], 8);
      }
    }
    // 4 payung + 4 kursi + 4 palem + 2 perahu DI PASIR BARAT (x 235.0 =
    // tengah strip pasir 2340-2360; dulu 238-241.5 = DI JALAN, kanopi 4.4u
    // menutup ~40% frame chase-cam). Strip timur terlalu sempit (shoreX
    // 2448.9-2456 -> 8.9-16u; tiang di y 1010 jatuh ke air); strip barat
    // 20u, gedung terjauh x 2320 (seed 7, diukur node). Kanopi overhang
    // jalan 1.2u di tepi (tiang 1.0u dari tepi jalan), bukan di tengah.
    // y di luar koridor jalan y 1072-1168 (tanpa pasir): utara 99/105,
    // selatan 119/125; kursi +1.0 di bawah kanopi; palem membingkai ujung.
    beachUmbrella(OP, 235.0, 99.0, [1.0, 0.35, 0.30], [0.95, 0.95, 0.90]); // koral/putih
    beachUmbrella(OP, 235.0, 125.0, [0.10, 0.80, 0.80], [1.0, 0.85, 0.20]); // teal/kuning
    beachUmbrella(OP, 235.0, 105.0, [1.0, 0.55, 0.15], [0.95, 0.95, 0.90]); // oranye/putih
    beachUmbrella(OP, 235.0, 119.0, [1.0, 0.40, 0.60], [1.0, 0.85, 0.20]); // pink/kuning
    beachChair(OP, 235.0, 100.0, [1.0, 0.35, 0.30]);
    beachChair(OP, 235.0, 126.0, [0.10, 0.80, 0.80]);
    beachChair(OP, 235.0, 106.0, [1.0, 0.85, 0.20]);
    beachChair(OP, 235.0, 120.0, [1.0, 0.40, 0.60]);
    palm(OP, 235.0, 96.0, sunA); // palem pantai utara (palm() R27b di base ini; R36-pohon menambah sc opsional)
    palm(OP, 235.0, 129.0, sunA); // palem pantai selatan
    palm(OP, 235.0, 93.0, sunA); // palem pantai ujung utara (membingkai pantai)
    palm(OP, 235.0, 132.0, sunA); // palem pantai ujung selatan
    fishBoat(OP, 235.0, 136.0, false); // perahu nelayan di pasir (lambung searah Z)
    fishBoat(OP, 235.0, 88.0, false); // perahu kedua (diputar searah Z: searah X 4.6u tidak muat di strip 20u)
  }

  // R35-F9: night market (Pasar Malam) — BEGIN. Satu blok, jangan pecah.
  // Stalls + string lights di taman Downtown (geometri: game/src/market.js).
  // Visual only, no collision. Zona R36/R38 (lampu, token, gedung, jalan,
  // heli) TIDAK disentuh — blok ini hanya MENAMBAH geometri pasar.
  {
    const mSite = marketSite(city);
    if (mSite && near(mSite.x + mSite.w / 2, mSite.y + mSite.h / 2, R) && vis(mSite.x + mSite.w / 2, mSite.y + mSite.h / 2, 170)) {
      const mLit = (tod.lamp || 0) > 0.4;
      const mBulb = mLit ? [0.85, 0.68, 0.38] : [0.55, 0.48, 0.35];
      flat(OP, (mSite.x + mSite.w / 2) * S, 0.04, (mSite.y + mSite.h / 2) * S, (mSite.w - 24) * S, (mSite.h - 24) * S, [0.32, 0.24, 0.16], 5);
      // sign board on the EAST edge (backdrop behind the gunmen): the west
      // edge sits ~10 units from the chase camera and a board there filled
      // the whole frame and hid the hero (shot v1).
      const mSx = (mSite.x + mSite.w - 8) * S, mCz = (mSite.y + mSite.h / 2) * S;
      box(OP, mSx, 1.3, mCz - 3.2, 0.3, 2.6, 0.3, [0.14, 0.12, 0.16], 5);
      box(OP, mSx, 1.3, mCz + 3.2, 0.3, 2.6, 0.3, [0.14, 0.12, 0.16], 5);
      box(OP, mSx, 2.05, mCz, 0.35, 1.5, 7, [0.55, 0.17, 0.35], 4);
      box(OP, mSx, 2.92, mCz, 0.45, 0.28, 7.3, [0.12, 0.5, 0.55], 4);
      const mStalls = marketStalls(city);
      let mCrateRow = null;
      for (const st of mStalls) {
        const scx = (st.x + st.w / 2) * S, scz = (st.y + st.d / 2) * S;
        const sw = st.w * S, sd = st.d * S;
        box(OP, scx, 0.55, scz, sw, 1.1, sd, [0.35, 0.22, 0.12], 5);
        box(OP, scx, 1.28, scz, sw * 0.6, 0.35, sd * 0.8, hx(st.hue), 5);
        // GEDUNG-BLD: kanopi hijau/merah (Poly Pizza) — hash sama dengan Canvas.
        const canC = hash2(st.x, st.y) < 0.5 ? hx('#2e7d32') : hx('#c0392b');
        box(OP, scx - sw / 4, 1.99, scz, sw / 2 + 0.3, 0.18, sd + 0.6, canC.map((v) => v * 0.55), 4);
        box(OP, scx + sw / 4, 1.99, scz, sw / 2 + 0.3, 0.18, sd + 0.6, [0.55, 0.5, 0.42], 4);
        // GEDUNG-BLD: 1 peti kayu per baris, sisi luar kios (B8 — jauh dari
        // aisle + di luar rect stall; skip bila menabrak pohon). 24 vertex
        // per peti (1 box); potong pertama bila peak vertex tidak muat.
        if (mCrateRow !== st.y) {
          mCrateRow = st.y;
          const north = st.y < mSite.y + mSite.h / 2;
          const cTop = north ? st.y - 22 : st.y + st.d + 6;
          const ccx = st.x + st.w / 2, ccy = cTop + 8;
          let blocked = false;
          for (const t of city.trees || []) {
            const nx = Math.max(ccx - 8, Math.min(t.x, ccx + 8));
            const ny = Math.max(ccy - 8, Math.min(t.y, ccy + 8));
            const dx = t.x - nx, dy = t.y - ny;
            if (dx * dx + dy * dy < (t.r + 4) * (t.r + 4)) { blocked = true; break; }
          }
          if (!blocked) box(OP, ccx * S, 0.5, ccy * S, 1.6, 1.0, 1.6, [0.35, 0.22, 0.12], 5);
        }
      }
      const mPoles = [[mSite.x + 18, mSite.y + 18], [mSite.x + mSite.w - 18, mSite.y + 18], [mSite.x + 18, mSite.y + mSite.h - 18], [mSite.x + mSite.w - 18, mSite.y + mSite.h - 18]];
      for (const [mPx, mPy] of mPoles) {
        box(OP, mPx * S, 1.35, mPy * S, 0.22, 2.7, 0.22, [0.14, 0.12, 0.16], 5);
        box(OP, mPx * S, 2.85, mPy * S, 0.26, 0.26, 0.26, mBulb, 4);
      }
      const mSpans = [[[mPoles[0][0], mPoles[0][1]], [mPoles[1][0], mPoles[1][1]]], [[mPoles[2][0], mPoles[2][1]], [mPoles[3][0], mPoles[3][1]]], [[mPoles[0][0], mPoles[0][1]], [mPoles[2][0], mPoles[2][1]]], [[mPoles[1][0], mPoles[1][1]], [mPoles[3][0], mPoles[3][1]]]];
      for (const [[mX0, mY0], [mX1, mY1]] of mSpans) {
        for (let mI = 1; mI < 6; mI += 1) {
          const mK = mI / 6;
          const mBx = (mX0 + (mX1 - mX0) * mK) * S, mBz = (mY0 + (mY1 - mY0) * mK) * S;
          const mSag = 2.55 - 0.35 * Math.sin(mK * Math.PI);
          box(OP, mBx, mSag, mBz, 0.24, 0.24, 0.24, mBulb, 4);
        }
      }
      if (mLit) flat(GL, (mSite.x + mSite.w / 2) * S, 0.08, (mSite.y + mSite.h / 2) * S, (mSite.w - 24) * S, (mSite.h - 24) * S, [0.55, 0.4, 0.18], 8);
    }
  }
  // R35-F9: night market — END.

  // Air + dermaga + marina (kalau hero dekat pelabuhan).
  if (hx0 > 2250) {
    const y0 = Math.max(0, hy0 - 1500), y1 = Math.min(1920, hy0 + 1500);
    // A-WORLD: pita air harbor mengikuti lekuk shoreX(y) — TRAPESIUM via
    // quad() (tepi barat = shoreX di kedua ujung, ubin tanpa celah — lihat
    // blok pantai di atas kenapa persegi tidak cukup).
    for (let sy = y0; sy < y1;) {
      const ey = Math.min(sy + 120, y1);
      quad(OP, [shoreX(sy) * S, 0.0, sy * S], [2560 * S, 0.0, sy * S], [2560 * S, 0.0, ey * S], [shoreX(ey) * S, 0.0, ey * S], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], [0.05, 0.20, 0.32], 10);
      sy = ey;
    }
    const dk = city.docks;
    box(OP, (dk.x + dk.w / 2) * S, 0.25, (dk.y + dk.h / 2) * S, dk.w * S, 0.5, dk.h * S, [0.35, 0.30, 0.22], 5);
    const mr = city.marina;
    box(OP, (mr.x + mr.w / 2) * S, 0.25, (mr.y + mr.h / 2) * S, mr.w * S, 0.5, mr.h * S, [0.35, 0.30, 0.22], 5);
    if (vis(2480, 680, 160) || vis(2530, 1750, 90)) drawCruiseShips(OP, GL); // R27b: kapal pesiar + yacht (statis, visual saja)
  }
  // Pom bensin (kalau dekat).
  if (near(955, 1595, R) && vis(955, 1595, 150)) {
    box(OP, 955 * S, 2.5, 1590 * S, 210 * S, 0.4, 60 * S, [0.7, 0.7, 0.72], 5); // kanopi
    for (const px of [870, 1032]) for (const pz of [1570, 1610]) box(OP, px * S, 1.15, pz * S, 0.7, 2.3, 0.7, [0.78, 0.8, 0.82], 5); // tiang kanopi
    for (const px of [900, 960, 1020]) box(OP, px * S, 0.6, 1610 * S, 1.2, 1.2, 0.8, [0.9, 0.2, 0.2], 5);
  }
  // #7: garage 3D box removed — it stood in the middle of the (480,1440)
  // intersection with no collision (cars drove through it). Flat 2D
  // marker/label stays in render.js.

  // Drawbridge (x=2400, gap y 1640-1720).
  if (near(BRIDGE_POS.x, BRIDGE_POS.y, R) && vis(BRIDGE_POS.x, BRIDGE_POS.y, 100)) {
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
    drawCarRealistic(OP, GL, 'hero', c.x * S, c.y * S, yawOf(c), (c.length || 46) * S, (c.width || 22) * S, hx(c.color || '#e33e5f'), { t, tl: tlGain, door: c.doorAngle || 0, doorSide: c.doorSide || -1 }); // R26: hero selalu realistis v15d (gate heroReal dihapus)
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
    boat(OP, GL, b.x * S, b.y * S, yawOf(b), (b.length || 54) * S, (b.width || 20) * S, hx(b.color || '#e8e4d8'), { driver: true, hero: true }); // VIPER R36: perahu hero = NH-90 VIPER
  } else if (p.inPlane && p.plane) { // JET R36: HA-1 (dulu: person jalan kaki)
    const pl = p.plane;
    plane(OP, GL, pl.x * S, pl.y * S, yawOf(pl), (pl.alt || 0) * 0.12, pl.throttle || 0, t, null);
  } else if (!(state.onfoot && state.onfoot.active && state.onfoot.mode === 0)) {
    // R41: POV (mode 0) — badan Jax sendiri disembunyikan, kamera di matanya.
    // walkPhase Jax maju per jarak tempuh (onfoot.js), bukan waktu.
    personSprite(SP, OP, p.x * S, p.y * S, yawOf(p), [0.95, 0.8, 0.2], { kind: 'player', walkPhase: p.walkPhase || 0 }, cam.fwd, t);
  }

  // R35-F9: bullets + muzzle flash (on-foot combat) — BEGIN. Satu blok.
  // Canvas fallback (city3d.js) sudah menggambar peluru; WebGL2 belum —
  // tanpa ini tembak-menembak tidak kelihatan di chase-cam. state.events
  // dibekukan di staged shot (runShot tidak step), jadi flash + peluru
  // yang tertangkap staging tetap di frame.
  {
    const mEv = state.events || {};
    if (mEv.muzzle) {
      const mMx = mEv.muzzle.x * S, mMz = mEv.muzzle.y * S;
      billDir(GL, mMx, 1.1, mMz, 1.6, 1.6, [0, 0, -1], [1.0, 0.85, 0.45], 7);
      box(OP, mMx, 1.1, mMz, 0.35, 0.35, 0.35, [1.0, 0.85, 0.45], 4);
    }
    let mBn = 0;
    for (const mB of state.bullets || []) {
      if (mBn > 12 || !near(mB.x, mB.y, R) || !vis(mB.x, mB.y, 40)) continue;
      box(OP, mB.x * S, 0.9, mB.y * S, 0.5, 0.25, 0.25, [1.0, 0.9, 0.6], 4);
      mBn += 1;
    }
  }
  // R35-F9: bullets + muzzle flash — END.

  // PARTICLES-WEBGL2: ledakan kendaraan terlihat — flame/spark/smoke/jet/flash
  // sebagai quad camera-facing (mirror city3d.js:2779-2794). Dua pass WAJIB:
  // pass 1 kind ledakan (flame/spark/smoke, cap 70), pass 2 jet/flash (cap 8)
  // — satu pass urutan-spawn kalah oleh jet hydrant (~144 hidup). Cap pass 1
  // 70 (bukan 40): TERUKUR, smoke besar (life 7-10 dtk, kolom asap) pertama
  // ada di indeks array 49 — cap 40 mengeluarkannya, jadi kolom asap tidak
  // pernah tampil. 70 = satu ledakan besar utuh (26+22+20=68) + 2. Biaya
  // 78 quad = 156 tris (+0,2% trisPeak, negligible). Smoke DAN flame ke
  // bucket SH (blend NORMAL — asap harus mengokulasi, api harus ORANYE solid
  // seperti city3d; 14 flame aditif yang tumpang tindih terukur menembus
  // putih, gagal G1); spark/jet/flash ke GL mat 7 (aditif, via split ke GL2;
  // fade via pergelapan vC). Urutan draw: opaque -> SH smoke+api -> SP -> GL2 percik.
  {
    const pts = state.particles || [];
    if (pts.length) {
      const pn = norm([-cam.fwd[0], 0, -cam.fwd[1]]);
      const emitPt = (pt) => {
        const a = Math.max(0, Math.min(1, pt.life / (pt.maxLife || 1)));
        const sz = pt.size * S * (1.6 - a * 0.6) * 2.2;
        const y0 = Math.max(0.1, pt.size * S * 0.4);
        const cy = y0 + sz / 2;
        if (pt.kind === 'smoke') {
          // vC.r = a (bukan a*0.5): alpha akhir = radial x a x 0.5 (maks 0.5)
          // = mirror city3d a*0.5. (Draf awal [a*0.5,0,0] menggandakan
          // 0.5 -> maks 0.25, asap terlalu tipis.)
          billDir(SH, pt.x * S, cy, pt.y * S, sz, sz, pn, [a, 0, 0], 17);
        } else if (pt.kind === 'flame') {
          // Api ke SH mat 18 (blend NORMAL, oranye city3d) — BUKAN GL mat 7:
          // 14 flame aditif yang tumpang tindih menembus putih (terukur:
          // 60% area fireball >250 di staged sore). Normal-blend menumpuk
          // ke arah oranye. vC.r = carrier alpha (life-fade).
          billDir(SH, pt.x * S, cy, pt.y * S, sz, sz, pn, [a, 0, 0], 18);
        } else {
          const c = hx(pt.color);
          billDir(GL, pt.x * S, cy, pt.y * S, sz, sz, pn, [c[0] * a, c[1] * a, c[2] * a], 7);
        }
      };
      let n1 = 0;
      for (const pt of pts) {
        if (n1 >= 70) break;
        if (pt.kind !== 'flame' && pt.kind !== 'spark' && pt.kind !== 'smoke') continue;
        if (!vis(pt.x, pt.y, 60)) continue;
        emitPt(pt); n1 += 1;
      }
      let n2 = 0;
      for (const pt of pts) {
        if (n2 >= 8) break;
        if (pt.kind !== 'jet' && pt.kind !== 'flash') continue;
        if (!vis(pt.x, pt.y, 60)) continue;
        emitPt(pt); n2 += 1;
      }
      // EXPLOSION-VFX S1 (derived, 0 kind baru, 0 world.js): flash/ring/beads/
      // debu dihitung dari state.particles LANGSUNG (B11: bukan dari quad yang
      // ter-emit). Flame satu ledakan berbagi age persis (lahir age 0, dt sama)
      // -> kelompokkan per bucket age 0.05 dtk; ledakan mobil biasa TIDAK punya
      // flame (world.js spawnExplosion: non-big = spark+smoke saja) -> derive
      // flash/debu dari spark termuda (tanpa ring). Back-track ke titik spawn:
      // flame tanpa damping (pos - v*age = spawn persis); spark damping 0.94/
      // step (STEP 1/60). Cap derived TERPISAH dari cap partikel 70+8: <=24/
      // ledakan besar (flash 1 + ring 1 + beads 12 + debu 10), <=3 ledakan.
      {
        const groups = new Map(); // ageKey -> {age, sx, sy, n, maxSz, big}
        const sparkAge = []; // [age, x, y, vx, vy] spark, untuk ledakan biasa
        for (const pt of pts) {
          if (pt.kind !== 'flame' && pt.kind !== 'spark') continue;
          const age = (pt.maxLife || 1) - pt.life;
          if (age < 0 || age > 1.0) continue;
          if (pt.kind === 'flame') {
            const key = Math.round(age * 20);
            let g = groups.get(key);
            if (!g) { g = { age, sx: 0, sy: 0, n: 0, maxSz: 0, big: true }; groups.set(key, g); }
            g.sx += pt.x - pt.vx * age; g.sy += pt.y - pt.vy * age; g.n += 1;
            const a = Math.max(0, Math.min(1, pt.life / (pt.maxLife || 1)));
            g.maxSz = Math.max(g.maxSz, pt.size * S * (1.6 - a * 0.6) * 2.2);
          } else if (sparkAge.length < 40) {
            sparkAge.push([age, pt.x, pt.y, pt.vx, pt.vy]);
          }
        }
        // Ledakan biasa (tanpa flame): spark termuda, bila bucket age-nya
        // tidak beririsan dengan grup flame mana pun (spark ledakan besar
        // ikut bucket flame-nya sendiri). Spark lahir dgn age 0-0,7 (life
        // acak 0,4-1,1, maxLife 1,1) -> spark termuda ledakan besar = age
        // flame-nya; jendela satu-sisi 0,75 dtk (bukan |d|<0,15).
        sparkAge.sort((p, q) => p[0] - q[0]);
        if (sparkAge.length) {
          const yAge = sparkAge[0][0];
          let hasFlame = false;
          for (const g of groups.values()) if (g.age <= yAge && yAge - g.age < 0.75) { hasFlame = true; break; }
          if (!hasFlame) {
            const f = (1 / 60) * (1 - Math.pow(0.94, yAge * 60)) / 0.06; // back-track damping spark
            let sx = 0, sy = 0, n = 0;
            for (const sp of sparkAge.slice(0, 5)) { sx += sp[1] - sp[3] * f; sy += sp[2] - sp[4] * f; n += 1; }
            groups.set(Math.round(yAge * 20) + 1000, { age: yAge, sx, sy, n, maxSz: 6, big: false });
          }
        }
        const list = [...groups.values()].sort((a, b) => a.age - b.age).slice(0, 3);
        let gi = 0;
        for (const g of list) {
          const cx = g.sx / g.n, cy = g.sy / g.n;
          if (!vis(cx, cy, 80)) { gi += 1; continue; }
          const age = g.age;
          const ringK = gi === 0 ? 1 : 0.6; // B14: ring ke-2/ke-3 alpha x0.6
          if (age < 0.2) { // flash disc: ~1.3x lebar fireball maks (cap 20u) — v1 2x (24-30u) TERBUKTI jadi wash langit dari chase cam rendah (langit >180: 4.8%->69.5%); 16u = bola terang di pompa, bukan menara cahaya
            const fd = g.big ? Math.min(20, 1.3 * g.maxSz) : 12;
            billDir(SH, cx * S, 0.1 + g.maxSz * 0.4, cy * S, fd, fd, pn, [0.9 * (1 - age / 0.2), 0, 0], 20);
          }
          if (g.big && age >= 0.05 && age < 0.6) { // shockwave ring: radius 0->30u / 0.6 dtk, y=0.15
            const R = 30 * (age / 0.6);
            flat(SH, cx * S, 0.15, cy * S, 2 * R, 2 * R, [0.8 * (1 - age / 0.6) * ringK, 0, 0], 19);
            const beadA = 0.9 * (1 - age / 0.6); // beads: 12 dot mat 7 di keliling ring (v2: 2.0u, biar terbaca dari chase cam rendah)
            for (let k = 0; k < 12; k += 1) {
              const an = (k * Math.PI) / 6;
              billDir(GL, (cx + Math.cos(an) * R * 10) * S, 0.6, (cy + Math.sin(an) * R * 10) * S, 2.0, 2.0, pn, [beadA, beadA * 0.85, beadA * 0.5], 7);
            }
          }
          if (age >= 0.3 && age <= 1.0) { // debu tan ground-hugging: 10 besar / 5 biasa, membesar 1.5-2x
            const nD = g.big ? 10 : 5;
            const fade = 1 - (age - 0.3) / 0.7;
            for (let i = 0; i < nD; i += 1) {
              const an = (i * Math.PI * 2) / nD + 0.31;
              const dist = (3 + age * 6) * 10; // px game: radius 3u -> 9u
              const ds = g.maxSz * 0.7 * (1 + (age - 0.3) / 0.7);
              billDir(SH, (cx + Math.cos(an) * dist) * S, 0.1 + ds / 2, (cy + Math.sin(an) * dist) * S, ds, ds, pn, [fade, 0, 0], 21);
            }
          }
          gi += 1;
        }
      }
    }
  }

  // Traffic + parkir — cars3d v14 (INTEGRATION.md §6 OPSI A) + LOD WAJIB:
  // hero + mobil <250 px game dari hero = high, sisanya 'low' (hemat ~43%).
  // Pemetaan body: 7 tipe T1 sama nama; body lama (sedan/hatch/van/taxi) ->
  // 'sedanL' (sedan generik — CAR_SPECS v14 TIDAK punya 'sedan'; fallback
  // carSpec('sedan') = hero, jadi JANGAN pakai 'sedan' mentah).
  const CAR_TYPE = { bus: 'bus', fire: 'fire', medic: 'medic', apc: 'apc', hatchback: 'hatchback', sedanL: 'sedanL', pickup: 'pickup', hatch: 'hatchback', sedan: 'sedanL', van: 'sedanL', taxi: 'sedanL' };
  const drawCar = (c, police, unit) => {
    if (!c || c.alive === false) return;
    // R36V2-DOUBLE: mobil pemain digambar 2x — sekali sebagai hero
    // (line 999, tipe 'hero') dan sekali lagi di sini sebagai traffic/
    // parked (CAR_TYPE[body], cat sama, bentuk nyaris sama). Sejak R26
    // tak terlihat (warna/bentuk sama, hanya z-fight samar); papan TAXI
    // R36V2 membongkarnya: hero pemain mendadak beratribut taksi
    // (parked[0] kebetulan body 'taxi'). Lewati mobil pemain di sini.
    if (p.inCar && p.car === c) return;
    if (!near(c.x, c.y, R) || !vis(c.x, c.y, 100)) return; // R27c-TUNE: 60->100 (bus/APC ~110px, setengah diagonal ~60-70px > 60)
    let type;
    if (police) type = (unit && unit.emergency && (c.body === 'fire' || c.body === 'medic')) ? c.body : 'police';
    // CARS v18: varian visual — jenis yang digambar bisa berbeda dari
    // c.body (sedanL -> suv/race, van -> delivery). carVariant() deterministik
    // (hash cruise/posisi spawn) dan mengecualikan taksi pink, mobil pemain,
    // polisi/militer, truk lapis baja. Type 'hero'/'armored' tak tersentuh.
    else type = carVariant(c) || CAR_TYPE[c.body] || 'sedanL';
    const lod = distPx(c.x, c.y, hx0, hy0) < 250 ? undefined : 'low';
    drawCarRealistic(OP, GL, type, c.x * S, c.y * S, yawOf(c), (c.length || 46) * S, (c.width || 22) * S, hx(c.color || '#888888'), { t, detail: lod, taxi: c.body === 'taxi', tl: tlGain, door: c.doorAngle || 0, doorSide: c.doorSide || -1 }); // R36V2-TAXI: papan TAXI + strip kotak (cars3d.js) — digabung R38 tlGain
  };
  for (const c of state.traffic.cars || []) drawCar(c, false);
  for (const c of state.traffic.parked || []) drawCar(c, false);

  // Polisi + militer + roadblock + tentara jalan kaki.
  for (const u of (state.police.units || [])) {
    if (u.kind === 'car' && u.car) {
      if (u.car.alive === false) continue;
      if (!near(u.car.x, u.car.y, R) || !vis(u.car.x, u.car.y, 100)) continue; // R27c-TUNE: 60->100
      if (u.military) {
        if (u.car.body === 'apc') drawCar(u.car, false); // APC v14 (turret + 6 roda); mtruck tetap car() lama (tak ada spec truk v14)
        else car(OP, GL, u.car.x * S, u.car.y * S, yawOf(u.car), (u.car.length || 54) * S, (u.car.width || 24) * S, [0.35, 0.38, 0.20], false, SHB);
      } else {
        drawCar(u.car, true, u);
      }
      if (u.concrete) box(OP, u.car.x * S, 0.7, u.car.y * S, 3, 1.4, 1.2, [0.55, 0.55, 0.58], 5);
    } else if (u.kind === 'boat') { // perahu polisi: biru + light bar (Canvas city3d.js:1651)
      if (!near(u.x, u.y, R) || !vis(u.x, u.y, 100)) continue;
      boat(OP, GL, u.x * S, u.y * S, yawOf(u), 54 * S, 20 * S, [0.18, 0.44, 0.82], { pol: true });
    } else if (u.x !== undefined && near(u.x, u.y, 1200) && vis(u.x, u.y, 25)) {
      // PEOPLE: bedakan polisi / geng / tentara (2D: gunman merah #a33327,
      // soldier olive #5a6b3a — dulu semua biru polisi di 3D).
      const uk = u.kind === 'gunman' ? 'gang' : u.kind === 'soldier' ? 'soldier' : 'police';
      const uc = uk === 'gang' ? [0.64, 0.20, 0.15] : uk === 'soldier' ? [0.35, 0.42, 0.23] : [0.15, 0.30, 0.65];
      personSprite(SP, OP, u.x * S, u.y * S, yawOf(u), uc, { kind: uk, walkPhase: u.walkPhase || 0 }, cam.fwd, t); // R41: fase dari jarak tempuh (police.js), bukan t*8
    }
  }
  const at = state.armored && state.armored.truck;
  if (at && at.alive && near(at.x, at.y, R) && vis(at.x, at.y, 100)) { // R27c-TUNE: 60->100
    // R27c: truk lapis baja = drawCarRealistic 'armored' (kab + bak + 6 roda),
    // bukan car() lama (slab + kaca + spoiler) — temuan video #4.
    drawCarRealistic(OP, GL, 'armored', at.x * S, at.y * S, yawOf(at), (at.length || 54) * S, (at.width || 24) * S, hx(at.color || '#4a5240'), { t, tl: tlGain });
  }

  // Helikopter polisi + kolam cahaya searchlight di hero.
  const hl = state.police.heli;
  if (hl && hl.active) {
    heli(OP, GL, hl.x * S, hl.y * S, hl.rotor || 0, t, cam.fwd);
    flat(GL, hx0 * S, 0.07, hy0 * S, 12, 12, [1.0, 0.9, 0.6], 7);
    // R36: searchlight VERTIKAL di bawah heli (ganti stub miring yang
    // terbaca streak putih lepas): 2 quad silang sempit + kolam di kaki
    // beam. Sempit (0.5 -> 1.6) supaya tidak jadi segitiga raksasa (JETFIX-3).
    const rx2 = cam.fwd[1], rz2 = -cam.fwd[0];
    const hx = hl.x * S, hz = hl.y * S, fx = cam.fwd[0], fz = cam.fwd[1];
    quad(GL, [hx - rx2 * 0.5, 13.2, hz - rz2 * 0.5], [hx + rx2 * 0.5, 13.2, hz + rz2 * 0.5],
      [hx + rx2 * 1.6, 0.3, hz + rz2 * 1.6], [hx - rx2 * 1.6, 0.3, hz - rz2 * 1.6],
      [fx, 0, fz], [[0, 0], [1, 0], [1, 1], [0, 1]], [1.0, 0.9, 0.6], 7);
    quad(GL, [hx - fx * 0.5, 13.2, hz - fz * 0.5], [hx + fx * 0.5, 13.2, hz + fz * 0.5],
      [hx + fx * 1.6, 0.3, hz + fz * 1.6], [hx - fx * 1.6, 0.3, hz - fz * 1.6],
      [rx2, 0, rz2], [[0, 0], [1, 0], [1, 1], [0, 1]], [1.0, 0.9, 0.6], 7);
    flat(GL, hx, 0.08, hz, 7, 7, [1.0, 0.9, 0.6], 7);
  }

  // JET R36: jet tempur HAF (Misi 13, 6 bintang) — NH-77 HARBOR WRAITH.
  // Terbang 4 m di bawah hero (sama dgn city3d.js plane3d) supaya sayapnya
  // tidak segaris dgn sayap hero (pelajaran PLANE-41/VB-41).
  if (state.space && state.space.jets && state.space.jets.length && p.inPlane && p.plane) {
    const heroAlt = p.plane.alt || 0;
    for (const j of state.space.jets) {
      if (!near(j.x, j.y, 400) || !vis(j.x, j.y, 40)) continue;
      plane(OP, GL, j.x * S, j.y * S, yawOf(j), Math.max(0, heroAlt - 4) * 0.12, 1, t, { jet: true });
    }
  }


  // Perahu (bukan hero) + UFO + pejalan kaki + collectible.
  for (const b of state.boats || []) {
    if (!b || b.alive === false) continue;
    if (p.inBoat && p.boat === b) continue;
    if (!near(b.x, b.y, R) || !vis(b.x, b.y, 100)) continue;
    boat(OP, GL, b.x * S, b.y * S, yawOf(b), (b.length || 54) * S, (b.width || 20) * S, hx(b.color || '#e8e4d8'), { driver: true });
  }
  if (state.ufo && state.ufo.active && vis(state.ufo.x, state.ufo.y, 100)) {
    box(OP, state.ufo.x * S, 30, state.ufo.y * S, 6, 1, 6, [0.7, 0.85, 0.9], 5);
    flat(GL, state.ufo.x * S, 29, state.ufo.y * S, 12, 12, [0.6, 0.9, 1.0], 7);
  }
  for (const pd of state.peds || []) {
    if (pd.alive === false) continue;
    if (!near(pd.x, pd.y, 1200) || !vis(pd.x, pd.y, 25)) continue;
    personSprite(SP, OP, pd.x * S, pd.y * S, yawOf(pd), hx(pd.color || '#e8e4d8'),
      { skin: hx(pd.skin || '#e8b98a'), pants: hx(pd.pants || '#2c3e50'), hat: pd.hat || 0, build: pd.build || 'slim', walkPhase: pd.walkPhase || 0 }, cam.fwd, t);
  }
  for (const cl of state.collectibles || []) {
    if (cl.taken) continue;
    if (!near(cl.x, cl.y, 1200) || !vis(cl.x, cl.y, 25)) continue;
    // DEBOX R27b: token = permata berputar (bukan kubus kuning melayang)
    // R38-COIN (item 1: koin melayang): tiang r=0.1 praktis tak terlihat
    // dari chase-cam, ujung bawah koin (y≈0.22) jauh di atas cakram h=0.14
    // → koin kebaca ngambang. Perbaikan: cakram jadi alas (plinth) h=0.28,
    // tiang ditebalkan 0.22 (y 0.22→0.92), koin diturunkan ke y=0.92 —
    // ujung bawah koin (0.14..0.30 dgn bob ±0.08) selalu menyentuh/masuk
    // ke alas, jadi koin kebaca "nempel di tempatnya" seperti koin di slot.
    // Desain koin (billboard + $ + ring glow) TIDAK diubah.
    deboxPoly(OP, cl.x * S, 0, cl.y * S, deboxRingCircle(1.0, 10), 0.28, [0.72, 0.55, 0.1], 4);
    deboxBeam(OP, cl.x * S, 0.22, cl.y * S, cl.x * S, 0.92, cl.y * S, 0.22, [1.0, 0.8, 0.2], 4);
    // R32-COIN: kotak kuning berputar DIHAPUS (Juna: "jelek banget") —
    // koin emas bulat menghadap kamera + $ + ring glow (lihat coinToken).
    coinToken(OP, GL, cl.x * S, 0.92, cl.y * S, 0.7, [-cam.fwd[0], 0, -cam.fwd[1]], t);
  }

  // DEBOX R27b: hydrant merah (silinder + kubah + tutup samping) — dulu tidak digambar di 3D.
  // R36-ROADS item 2: SATU hydrant di peta duduk 5,7 px dari koin (sudut persimpangan
  // yang sama: hydrant +42/+42, koin +46/+46 — probe seed 7: koin (1486,206) vs hydrant
  // (1482,202)) sehingga dari sudut chase hydrant menutupi setengah koin. Hydrant yang
  // <40 px dari koin TIDAK digambar (visual saja — gameplay burst di world.js tetap di
  // posisi asli; hanya 1 dari 8 hydrant yang kena aturan ini).
  for (const hd of state.hydrants || []) {
    if (!near(hd.x, hd.y, 1200) || !vis(hd.x, hd.y, 25)) continue;
    let coinNear = false;
    for (const cl of state.collectibles || []) { if (!cl.taken && Math.hypot(cl.x - hd.x, cl.y - hd.y) < 40) { coinNear = true; break; } }
    if (coinNear) continue;
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
      if (!near(rx, ry, 1400) || !vis(rx, ry, 130)) continue;
      // TOD (cull): tiang lampu <14 unit dari kamera dihilangkan — sama seperti
      // gedung (round 22). Tanpa ini, satu tiang di depan lensa memenuhi frame
      // (kasus nyata: shot pagi v1, tiang 3,2 unit dari kamera jadi bar hitam).
      // POLE-FIX R26: tiang HARUS di sudut trotoar (±72, A-LITE: dulu ±48). (±48,±20) salah
      // thd jalan menyilang: 20 < ROAD_W/2 (40) = tiang di atas aspal,
      // di tengah jalur mobil. TROTOAR: 72 = di trotoar (aspal 48, fasad di 80).
      const lampNear = (lx, lz) => Math.hypot(lx * S - camX, lz * S - camZ) < 14;
      if (!lampNear(rx - 72, ry + 72)) lamp(OP, GL, (rx - 72) * S, (ry + 72) * S, tod.lamp, 0.7071, -0.7071); // DEBOX: lengan ke pusat persimpangan
      if (!lampNear(rx + 72, ry - 72)) lamp(OP, GL, (rx + 72) * S, (ry - 72) * S, tod.lamp, -0.7071, 0.7071);
    }
  }
}

// ---- kamera chase-cam (smoothing seperti city3d.js round 22) ----
function updateCamera(state, dt, cam) {
  const hero = heroOf(state);
  const p = state.player;
  const of = state.onfoot;
  if (of && of.active && !p.inCar && !p.inBoat) {
    // R41 on-foot: 3 kamera (mode 0 POV / 1 belakang / 2 depan, ganti dgn F,
    // seperti Minecraft F5). Yaw ikut arah Jax dgn lerp (dt*4, seperti
    // chase); posisi mata di-lerp (dt*8) supaya ganti mode / belok tidak
    // lompat. cam.fwd = arah pandang (dipakai culling + matahari).
    const a = hero.angle || 0;
    const snap = !cam.init || Math.hypot(hero.x - cam.hx, hero.y - cam.hy) > 600;
    if (snap) cam.yaw = a;
    else cam.yaw += angDiff(a, cam.yaw) * Math.min(1, dt * 4.0);
    const yx = Math.cos(cam.yaw), yz = Math.sin(cam.yaw);
    const hx = hero.x * S, hz = hero.y * S;
    let ex, ey, ez, tx, ty, tz, fx, fz;
    if (of.mode === 0) { // POV: mata Jax (1,7), pandang jauh ke depan
      ex = hx + yx * 0.3; ey = 1.7; ez = hz + yz * 0.3;
      tx = hx + yx * 20; ty = 1.7; tz = hz + yz * 20; fx = yx; fz = yz;
    } else if (of.mode === 2) { // depan: kamera di depan Jax, menatap balik
      ex = hx + yx * 6.5; ey = 2.6; ez = hz + yz * 6.5;
      tx = hx; ty = 1.4; tz = hz; fx = -yx; fz = -yz;
    } else { // belakang (default): 6,5 di belakang, 2,6 tinggi
      ex = hx - yx * 6.5; ey = 2.6; ez = hz - yz * 6.5;
      tx = hx + yx * 8; ty = 1.4; tz = hz + yz * 8; fx = yx; fz = yz;
    }
    if (snap || !cam.init) { cam.x = ex; cam.z = ez; cam.ey = ey; cam.init = true; }
    else {
      const k = Math.min(1, dt * 8);
      cam.x += (ex - cam.x) * k; cam.z += (ez - cam.z) * k; cam.ey += (ey - cam.ey) * k;
    }
    cam.hx = hero.x; cam.hy = hero.y;
    cam.eye = [cam.x, cam.ey, cam.z];
    cam.target = [tx, ty, tz];
    cam.fwd = [fx, fz];
    return;
  }
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
  // JET R36: saat terbang, kamera naik mengikuti ketinggian pesawat
  // (skala sama dgn city3d.js drawChase3D: alt meter * 0.12) — kalau tidak,
  // pesawat di alt 150-340 m berada jauh di atas frustum dan tak terlihat
  // (itulah kenapa shot jets/planehigh baseline hanya menampilkan pejalan
  // kaki di jalan). Saat di darat altU = 0: perilaku lama, byte-identik.
  const pl = state.player.inPlane && state.space ? state.space.plane : null;
  const altU = pl ? (pl.alt || 0) * 0.12 : 0;
  cam.eye = [cam.x, 4.4 + altU, cam.z];
  cam.target = [hero.x * S + fx * 40, 2.2 + altU, hero.y * S + fz * 40];
  cam.fwd = [fx, fz];
}


// ---- factory: webgl2 dulu, fallback webgl, lalu null (2D hidup) ----
export function createRenderer(glCanvas) { // R26: tanpa HUD demo (HUD asli ui2.js)
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
    uGradeLift: gl.getUniformLocation(P, 'uGradeLift'), uGradeGain: gl.getUniformLocation(P, 'uGradeGain'),
    uGradeGamma: gl.getUniformLocation(P, 'uGradeGamma'), uRes: gl.getUniformLocation(P, 'uRes'),
    uTime: gl.getUniformLocation(P, 'uTime'), // R36 POSTFX
    uAtlas: gl.getUniformLocation(P, 'uAtlas'), // R39 SPRITE
    uTexRoad: gl.getUniformLocation(P, 'uTexRoad'), uTexWalk: gl.getUniformLocation(P, 'uTexWalk'), // R40
    uTexSand: gl.getUniformLocation(P, 'uTexSand'), uTexFac: gl.getUniformLocation(P, 'uTexFac'), uTexK: gl.getUniformLocation(P, 'uTexK'), // R40
  };
  // R39 SPRITE: muat atlas ped (assets/ped-atlas.png, relatif ke game/index.html).
  // Gagal load (404/error) -> PED_ATLAS.ok tetap false -> person() box tetap jalan.
  // Gambar sudah mulai diunduh saat modul dimuat (PED_ATLAS_IMG); di sini
  // tinggal buat texture GL-nya (butuh konteks gl).
  // FIX R39 (shot-mode race): bila gambar sudah complete saat loadAtlas jalan,
  // makeTex() dipanggil sinkron — cabang lama TIDAK PERNAH me-resolve
  // window.__pedAtlasReady, jadi wait di main.js akan hang selamanya.
  // Semua titik settle (sukses/gagal, onload/onerror) juga set window.__pa=1.
  (function loadAtlas() {
    if (PED_ATLAS.loading || PED_ATLAS.ok || PED_ATLAS.failed) return;
    PED_ATLAS.loading = true;
    const img = PED_ATLAS_IMG || new Image();
    const makeTex = () => {
      try {
        PED_ATLAS.tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, PED_ATLAS.tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.bindTexture(gl.TEXTURE_2D, null);
        PED_ATLAS.ok = true;
        window.__pa = 1;
        console.log('R39 SPRITE: atlas ped loaded (' + img.width + 'x' + img.height + ')');
      } catch (e) { PED_ATLAS.failed = true; window.__pa = 1; console.warn('R39 SPRITE: atlas texture failed', e); }
    };
    if (img.complete && img.naturalWidth > 0) { makeTex(); if (_pedAtlasResolve) _pedAtlasResolve(PED_ATLAS.ok); }
    else {
      img.onload = () => { makeTex(); if (_pedAtlasResolve) _pedAtlasResolve(PED_ATLAS.ok); };
      img.onerror = () => { PED_ATLAS.failed = true; window.__pa = 1; console.warn('R39 SPRITE: atlas image failed to load — fallback box person()'); if (_pedAtlasResolve) _pedAtlasResolve(false); };
      if (!PED_ATLAS_IMG) img.src = PED_ATLAS_SRC;
    }
  })();
  // R40 TEX: 4 tekstur permukaan (REPEAT + mipmap, POT). Tiap texture dibuat
  // SEKARANG dengan placeholder 1x1 abu-128 (multiplier 1.0) lalu diganti
  // isi PNG saat gambar tiba — frame sebelum load = jalan polos-lama, bukan
  // hitam/rusak. Gagal load (404) = placeholder bertahan, game tetap jalan.
  // window.__tx = 1 saat keempatnya settle (diagnostik saja; runShot TIDAK
  // menunggunya — main.js TIDAK disentuh, 0 byte dossier).
  (function loadR40Tex() {
    let settled = 0;
    const done = () => { settled += 1; if (settled === 4) window.__tx = 1; };
    for (const k of Object.keys(R40_TEX)) {
      const e = R40_TEX[k];
      e.tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, e.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D, null);
      const up = () => {
        try {
          gl.bindTexture(gl.TEXTURE_2D, e.tex);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, e.img);
          gl.generateMipmap(gl.TEXTURE_2D);
          gl.bindTexture(gl.TEXTURE_2D, null);
          e.ok = true;
          console.log('R40 TEX: ' + k + ' loaded (' + e.img.width + 'x' + e.img.height + ')');
        } catch (err) { console.warn('R40 TEX: upload failed ' + k, err); }
        done();
      };
      const img = e.img || new Image();
      if (img.complete && img.naturalWidth > 0) up();
      else {
        img.onload = up;
        img.onerror = () => { console.warn('R40 TEX: image failed to load — placeholder kept: ' + e.src); done(); };
        if (!e.img) img.src = e.src;
      }
    }
  })();
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
    gradeLift: gl.getUniformLocation(PS, 'uGradeLift'), gradeGain: gl.getUniformLocation(PS, 'uGradeGain'),
    gradeGamma: gl.getUniformLocation(PS, 'uGradeGamma'), res: gl.getUniformLocation(PS, 'uRes'),
    time: gl.getUniformLocation(PS, 'uTime'), // R36 POSTFX
  };
  const OP = newBucket(), SH = newBucket(), GL = newBucket(), GLSH = newBucket(), GL2 = newBucket(), SP = newBucket();
  const bufOP = makeBufSet(), bufSH = makeBufSet(), bufGL = makeBufSet(), bufGLSH = makeBufSet(), bufGL2 = makeBufSet(), bufSP = makeBufSet();
  const cam = { yaw: 0, x: 0, z: 0, ey: 4.4, hx: 0, hy: 0, init: false, eye: [0, 4.4, -8], target: [0, 2.2, 40], fwd: [0, 1] };
  const stats = { ms: 0, tris: 0, calls: 0, mode };
  // R28 IDX32: bucket OP ~78.588 vertex > batas Uint16 — indeks Uint16
  // membungkus jadi sky-beam; WebGL2 pakai UNSIGNED_INT native, WebGL1
  // butuh OES_element_index_uint, kalau tidak ada tetap Uint16 + warning.
  const IDX32 = mode === 'webgl2' || !!gl.getExtension('OES_element_index_uint');

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
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, IDX32 ? new Uint32Array(B.i) : new Uint16Array(B.i), gl.DYNAMIC_DRAW);
    if (!IDX32 && !b.warned16 && B.p.length / 3 > 65535) { b.warned16 = true; console.warn('WEBGL IDX16 OVERFLOW: ' + (B.p.length / 3) + ' vertex > 65535 — segitiga bisa korup (butuh Uint32)'); }
    b.count = B.i.length;
  }
  function drawBuf(b) {
    gl.bindBuffer(gl.ARRAY_BUFFER, b.p); gl.vertexAttribPointer(A.p, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.n); gl.vertexAttribPointer(A.n, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.n);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.u); gl.vertexAttribPointer(A.u, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.u);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.c); gl.vertexAttribPointer(A.c, 3, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.c);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.m); gl.vertexAttribPointer(A.m, 1, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(A.m);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.i);
    gl.drawElements(gl.TRIANGLES, b.count, IDX32 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
  }
  const skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  let VW = W, VH = H;

  // R36 POSTFX (b): supersampling shot-only — jalur runShot membawa
  // `?shot=` di URL, jadi resize memaksa ss=2 di situ saja (render
  // 2560x1600, screenshot viewport 1280x800 mendownscale otomatis = SSAA).
  // Live (tanpa ?shot=) tetap ss=1 / DPR; resize dari cinematic.js yang
  // memanggil resize(w,h,ratio) tiap frame tidak bisa menurunkan ss shot.
  const SHOT_SS = (typeof location !== 'undefined' && /(?:\?|&)shot=/.test(location.search)) ? 2 : 1;
  function resize(w, h, ss) {
    ss = SHOT_SS > 1 ? SHOT_SS : (ss || 1);
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
    SP.p.length = 0; SP.n.length = 0; SP.u.length = 0; SP.c.length = 0; SP.m.length = 0; SP.i.length = 0;
    if(INT)INT.update(state,dt); // R41: ayun pintu (target dari posisi Jax)
    buildFrame(state, cam, OP, SH, GL, t, SP);
    splitBucketInto(GL, GLSH, GL2); // R26 §6: material 9 (bayangan kontak) keluar dari G aditif
    upload(OP, bufOP); upload(SH, bufSH); upload(GLSH, bufGLSH); upload(GL2, bufGL2); upload(SP, bufSP);
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
    gl.uniform3fv(skyU.gradeLift, new Float32Array(U.gradeLift)); gl.uniform3fv(skyU.gradeGain, new Float32Array(U.gradeGain));
    gl.uniform1f(skyU.gradeGamma, U.gradeGamma); gl.uniform2f(skyU.res, glCanvas.width, glCanvas.height); gl.uniform1f(skyU.time, t); // R36 POSTFX
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
    gl.uniform3fv(A.uGradeLift, new Float32Array(U.gradeLift)); gl.uniform3fv(A.uGradeGain, new Float32Array(U.gradeGain));
    gl.uniform1f(A.uGradeGamma, U.gradeGamma); gl.uniform2f(A.uRes, glCanvas.width, glCanvas.height); gl.uniform1f(A.uTime, t); // R36 POSTFX
    // R40 TEX: sampler unit 1-4 (uAtlas tetap unit 0) — bind sekali per frame
    // sebelum drawBuf(OP); uTexK=1.0: placeholder abu-128 = multiplier 1.0.
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R40_TEX.road.tex); gl.uniform1i(A.uTexRoad, 1);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, R40_TEX.walk.tex); gl.uniform1i(A.uTexWalk, 2);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, R40_TEX.sand.tex); gl.uniform1i(A.uTexSand, 3);
    gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, R40_TEX.fac.tex); gl.uniform1i(A.uTexFac, 4);
    gl.uniform1f(A.uTexK, 1.0);
    gl.activeTexture(gl.TEXTURE0);
    drawBuf(bufOP);
    // contact shadow (normal blend — SH + elips material 9 hasil belah-G)
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    drawBuf(bufSH);
    drawBuf(bufGLSH);
    // R39 SPRITE: billboard ped bertekstur (normal blend, depth test tetap jalan
    // dari pass opaque; depthMask false supaya sprite tidak menelan satu sama lain)
    if (PED_ATLAS.ok && bufSP.count > 0) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, PED_ATLAS.tex);
      gl.uniform1i(A.uAtlas, 0);
      drawBuf(bufSP);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    // glow + smear (additif)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    drawBuf(bufGL2);
    gl.disable(gl.BLEND); gl.depthMask(true);
    // matikan semua attribute array — buffer dipakai ulang tiap frame,
    // attribute yang tertinggal menyala + buffer terhapus = INVALID_OPERATION
    for (const loc of [A.p, A.n, A.u, A.c, A.m]) gl.disableVertexAttribArray(loc);
    stats.ms = performance.now() - t0;
    stats.tris = (OP.i.length + SH.i.length + GL.i.length + SP.i.length) / 3;
    stats.calls = 6; // langit + OP + SH + GLSH + SP + GL
    stats.spriteTris = SP.i.length / 3; // R39: 2 tris/NPC (dulu 96-108 tris box)
    window.__webglFrames = (window.__webglFrames || 0) + 1;
    return stats;
  }

  return { mode, render, resize, stats, get camera() { return cam; } };
}
