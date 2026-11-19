import { WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';
import { BRIDGE } from './drawbridge.js';
import { PRESETS } from './timeofday.js';
import { drawMarket3D } from './market.js'; // R35-F9: night market stalls + string lights (post-cut)
import { STUNT_RAMPS, activeJob, jobsState, tickJobs } from './jobs.js'; // R35-F7
// Neon Harbor 3D title-screen — software 3D engine, Canvas 2D only, no libs.
// Perspective projection + painter's algorithm. Deterministic (seeded).
let x, W = 1280, H = 800, CX = W / 2, HOR = H * .46;
let S=1337;const R=()=>((S=S*1664525+1013904223>>>0)/4294967296);
const cl=(v,a,b)=>v<a?a:v>b?b:v;
const h2=(a,b)=>{let v=(a*73856093)^(b*19349663);v=Math.imul(v^(v>>>13),1274126177);return((v^(v>>>16))>>>0)/4294967296;};
const F=640,HZ=[255,150,110];
const mix=(c,t)=>'rgb('+c.map((v,i)=>Math.round(v+(HZ[i]-v)*t)).join(',')+')';
const sh=(c,b,t)=>mix(c.map(v=>Math.min(255,v*b|0)),t);
const hz=d=>cl((d-70)/300,0,HZMAX);
// round 21: warm sunset bounce for camera-facing faces — the rear of a car
// (or a building wall) is never pitch black at golden hour; it picks up
// orange light bounced off the road. NOT multiplied by shadeK.
const shW=(c,b,t)=>{const m=c.map(v=>Math.min(255,v*b|0)).map((v,i)=>Math.round(v+(HZ[i]-v)*t));
  return 'rgb('+m.map((v,i)=>Math.round(v*.72+BOUNCE[i]*.28)).join(',')+')';};
// R33: title-screen time-of-day palette (REAL game code — the intercept
// patch in gta6-01-times/ only proved the values; this is the live path).
// 'sore' is pinned to the original R31 hardcodes so the default title is
// unchanged. setTitleTOD is called by stageShot (shots.js) for the
// <shot>-<tod> variants; the live title stays 'sore' (sunset cover).
// winLit is the LIT THRESHOLD in wins(): sore 0.62 = the original q<.62,
// so the R31 window pattern is preserved exactly.
let titleTOD = 'sore';
export function setTitleTOD(name) { if (PRESETS[name]) titleTOD = name; }
let TL = 1;       // taillight gain: 1 = lit, ~0.1 = off in daylight
let HZMAX = 0.72; // haze cap, scaled by preset fogK (siang 0.45 = clear air)
let BOUNCE = [255,140,80]; // bounce colour mixed into shW() (warm at sunset)
let NEON = 1;     // neon-sign brightness (dim at noon)
let WINLIT = 0.62; // lit-window threshold (see wins())
let WIN_T = [1,1,1]; // lit-window tint (cool blue at noon)
const TITLE_PAL = {
  sore: { hz:[255,150,110], sky:['#1e0b33','#6b2355','#e0545e','#ffb35c'], ground:'#241a20', bounce:[255,140,80], sunY:-20, sunX:60, sunDisc:'#ffe9a8', sunCore:'#fff8dc', sunEdge:'#ffc978', sunG0:'rgba(255,230,160,.95)', sunG1:'rgba(255,170,90,.55)', sunG2:'rgba(255,140,80,0)', sunR:18, sunGr:150, glitter:['rgba(255,170,90,.6)','rgba(255,170,90,.35)'], water:[70,50,110], lamp:1, roadGlow:'rgba(255,150,80,.15)', stars:0, winLit:0.62, winTint:[1,1,1], fogK:1, shadowLen:16, shadowA:0.35, tlGain:1, neon:1 },
  pagi: { hz:[232,217,200], sky:['#2e4a7a','#96aad2','#e8a878','#ffc98a'], ground:'#3a3f4a', bounce:[255,180,160], sunY:-20, sunX:330, sunDisc:'#ffe0b8', sunCore:'#fff3d0', sunEdge:'#ffb27a', sunG0:'rgba(255,214,170,.95)', sunG1:'rgba(255,170,140,.55)', sunG2:'rgba(255,150,120,0)', sunR:18, sunGr:150, glitter:['rgba(255,190,150,.5)','rgba(255,190,150,.3)'], water:[90,110,160], lamp:0.5, roadGlow:'rgba(255,180,150,.10)', stars:0, winLit:0.25, winTint:[1,0.90,0.85], fogK:1, shadowLen:9, shadowA:0.30, tlGain:0.45, neon:0.6 },
  siang: { hz:[150,180,205], sky:['#1447a6','#4682c8','#8fb8dd','#aacdeb'], ground:'#4a4a52', bounce:[255,255,255], sunY:-170, sunX:60, sunDisc:'#ffffff', sunCore:'#ffffff', sunEdge:'#ffe9a8', sunG0:'rgba(255,255,240,.9)', sunG1:'rgba(255,255,220,.5)', sunG2:'rgba(255,255,200,0)', sunR:14, sunGr:170, glitter:['rgba(255,255,255,.45)','rgba(255,255,255,.25)'], water:[40,90,160], lamp:0.05, roadGlow:'rgba(255,255,255,.06)', stars:0, winLit:0.06, winTint:[0.70,0.82,1.00], fogK:0.45, shadowLen:1.8, shadowA:0.32, tlGain:0.12, neon:0.35 },
  malam: { hz:[16,22,44], sky:['#05070f','#0d1330','#1c2547','#2a3355'], ground:'#0d0f18', bounce:[120,140,200], sunY:-120, sunX:60, sunDisc:'#e8ecff', sunCore:'#f4f6ff', sunEdge:'#c9d2f0', sunG0:'rgba(200,210,255,.55)', sunG1:'rgba(160,170,230,.3)', sunG2:'rgba(140,150,220,0)', sunR:13, sunGr:80, glitter:['rgba(180,190,255,.25)','rgba(180,190,255,.12)'], water:[10,20,40], lamp:1.6, roadGlow:'rgba(120,140,220,.08)', stars:1, winLit:0.75, winTint:[1.05,0.85,0.55], fogK:1, shadowLen:5, shadowA:0.12, tlGain:1, neon:1 },
};
// round 22: the chase camera uses a longer lens + a higher eye than the
// title frame (narrower FOV = the road fills more of the frame, the
// flanking walls start further ahead and loom less; the hero stays the
// same size on screen because the longer lens compensates the pull-back).
// P() reads these; frame() resets them to the title values every frame.
let fovF=640, camH=5.6;
let camZ=0;const ops=[];
function P(px,py,pz){const dz=pz-camZ;if(dz<2)return 0;return[CX+px*fovF/dz,HOR-(py-camH)*fovF/dz,dz];}
function Q(a,b,c,d,col,dep){const p=[P(...a),P(...b),P(...c),P(...d)];if(p.includes(0))return;ops.push({d,f(){x.fillStyle=col;x.beginPath();x.moveTo(p[0][0],p[0][1]);for(let i=1;i<4;i++)x.lineTo(p[i][0],p[i][1]);x.closePath();x.fill();}});}
function rr(a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
// city: buildings along both sides, right side has a harbor gap z 150..260
const B=[];
for(let z=10;z<900;z+=24+R()*10){
  const mk=sd=>{const w=14+R()*12,d=12+R()*8,h=16+R()*R()*55;B.push({x:sd*(19+w/2+R()*10),z:z+d/2,w,d,h,bi:B.length,c:[[26,28,46],[34,32,58],[22,24,40],[30,26,50]][R()*4|0]});};
  mk(-1);if(z<150||z>260)mk(1);
}
function wins(b){const{x,z:zf,w,h,bi}=b,nc=Math.max(2,w/2.6|0),nr=Math.max(3,h/3.4|0),t=hz(zf-camZ);
  // R40-D: di siang jendela mati dulu kaca gelap [52,66,88]/[34,44,62] di
  // fasad gelap + kabut biru = titik-titik tak terbaca, gedung lempeng.
  // Siang: kaca MEMANTULKAN langit (biru terang bervariasi per hash) +
  // jendela sedikit lebih besar. Sore/pagi/malam TIDAK berubah.
  const noon=titleTOD==='siang';
  for(let i=0;i<nc;i++)for(let j=0;j<nr;j++){const q=h2(bi*131+i*7,j*3+1),q2=h2(bi*17+i*3,j*11+5);
    const wx=x-w/2+1.2+(w-2.4)*(i+.15)/nc,wy=2+(h-3)*(j+.2)/nr,ww=(w-2.4)/nc*(noon?0.72:0.62)*(.75+.5*q2),wh=(h-3)/nr*(noon?0.68:0.6)*(.8+.4*q2);
    // R33: lit windows follow the time preset — at noon almost none are lit
    // (WINLIT 0.06) and the few lit ones are cool-tinted (WIN_T), not warm
    // yellow like at sunset. The bands are fractions of WINLIT, so for sore
    // (WINLIT 0.62) they land on the original q<.4/.57/.62 exactly.
    const warm=q<WINLIT*.65?[255,205,120]:q<WINLIT*.92?[255,190,120]:q<WINLIT?[255,150,90]:null;
    const c=warm?[Math.round(warm[0]*WIN_T[0]),Math.round(warm[1]*WIN_T[1]),Math.round(warm[2]*WIN_T[2])]:noon?(q2<.33?[168,198,232]:q2<.66?[96,128,175]:[196,216,240]):q2<.5?[52,66,88]:[34,44,62];
    Q([wx,wy,zf],[wx+ww,wy,zf],[wx+ww,wy+wh,zf],[wx,wy+wh,zf],mix(c,t),zf-camZ);}}
function bld(b){const{x,z,w,d,h,c}=b,zf=z-d/2,zb=z+d/2,dep=zf-camZ;if(dep<35)return;const sx=x>0?x-w/2:x+w/2;
  // R40-D: fasad siang dulu ×0.8 = hampir hitam (depan), jendela gelap di
  // atasnya hilang. Siang: depan ×0.95 + sisi ×1.15 supaya fasad kebaca.
  const noon=titleTOD==='siang';
  Q([x-w/2,0,zf],[x+w/2,0,zf],[x+w/2,h,zf],[x-w/2,h,zf],sh(c,noon?0.95:0.8,hz(dep)),dep);
  Q([sx,0,zf],[sx,0,zb],[sx,h,zb],[sx,h,zf],sh(c,noon?1.15:1.05,hz(dep)),dep);
  Q([x-w/2,h,zf],[x+w/2,h,zf],[x+w/2,h,zb],[x-w/2,h,zb],sh(c,1.3,hz(dep)),dep);
  if(b.bi%3){const u=w*.31,v=d*.19,e=3+b.bi%3*2,s2=x>0?x-u:x+u;
  Q([x-u,h,zf+v],[x+u,h,zf+v],[x+u,h+e,zf+v],[x-u,h+e,zf+v],sh(c,1,hz(dep)),dep);
  Q([s2,h,zf+v],[s2,h,zb-v],[s2,h+e,zb-v],[s2,h+e,zf+v],sh(c,.9,hz(dep)),dep);
  Q([x-u,h+e,zf+v],[x+u,h+e,zf+v],[x+u,h+e,zb-v],[x-u,h+e,zb-v],sh(c,1.3,hz(dep)),dep);
  // R40-D: jendela di muka setback (dulu slab polos di puncak gedung).
  for(let si=0;si<3;si++){const q3=h2(b.bi,201+si),q4=h2(b.bi,211+si);
    const swx=x-u+0.6+(2*u-1.2)*(si+.2)/3,sww=(2*u-1.2)/3*.6;
    const swc=q3<WINLIT?[255,205,120]:noon?(q4<.33?[168,198,232]:q4<.66?[96,128,175]:[196,216,240]):[52,66,88];
    Q([swx,h+0.6,zf+v],[swx+sww,h+0.6,zf+v],[swx+sww,h+e-0.6,zf+v],[swx,h+e-0.6,zf+v],mix(swc,hz(dep)),dep);}}
  // R40-D: variasi atap — antena + kotak AC di atap gedung tinggi, supaya
  // siluet atap tidak slab polos (deterministik hash per gedung).
  if(h>35&&h2(b.bi,91)<0.5){const ax=x+(h2(b.bi,93)-0.5)*w*0.4;
    Q([ax-0.15,h,zf+2],[ax+0.15,h,zf+2],[ax+0.15,h+4.5,zf+2],[ax-0.15,h+4.5,zf+2],mix([52,54,62],hz(dep)),dep);
    Q([ax-0.5,h+4.5,zf+2],[ax+0.5,h+4.5,zf+2],[ax+0.5,h+4.9,zf+2],[ax-0.5,h+4.9,zf+2],mix([70,72,82],hz(dep)),dep);}
  if(h2(b.bi,97)<0.4){
    Q([x-w*0.28,h,zf+3],[x-w*0.05,h,zf+3],[x-w*0.05,h+1.1,zf+3],[x-w*0.28,h+1.1,zf+3],mix([62,64,72],hz(dep)),dep);}
  wins(b);
  // R36-BLD ground floor: dulu dinding polos (jendela mulai y=2). Etalase
  // kaca (hangat menyala bila hash < WINLIT, kaca dingin bila tidak) +
  // awning merah di muka depan, di bawah baris jendela terbawah (y<2.6).
  // R40-D: etalase siang dulu [30,38,52] gelap = lubang hitam; kini kaca
  // pantul langit [105,135,170] bila tidak menyala.
  const gw=h2(b.bi,77)<WINLIT,gc=gw?[200,150,90]:noon?[105,135,170]:[30,38,52];
  Q([x-w/2+.6,.3,zf],[x+w/2-.6,.3,zf],[x+w/2-.6,1.9,zf],[x-w/2+.6,1.9,zf],mix(gc,hz(dep)),dep);
  Q([x-w/2+.6,2,zf],[x+w/2-.6,2,zf],[x+w/2-.6,2.55,zf],[x-w/2+.6,2.55,zf],mix([150,45,55],hz(dep)),dep);}
function car(o){const{x,z,w,h,l,c}=o,zb=z-l/2,zf=z+l/2,dep=zb-camZ,t=hz(dep);
  Q([x-w/2,0,zb],[x+w/2,0,zb],[x+w/2-.5,h,zb],[x-w/2+.5,h,zb],sh(c,.95,t),dep);
  Q([x-w/2+.5,h*.55,zb-.06],[x+w/2-.5,h*.55,zb-.06],[x+w/2-.5,h*.9,zb-.06],[x-w/2+.5,h*.9,zb-.06],mix([70,90,130],t),dep);
  Q([x-w/2+.5,h*.72,zb-.07],[x+w/2-.5,h*.72,zb-.07],[x+w/2-.5,h*.78,zb-.07],[x-w/2+.5,h*.78,zb-.07],'rgba(190,215,245,0.25)',dep); // R38: pantulan horizontal halus di kaca belakang (ganti garis diagonal)
  Q([x-w/2,h,zb],[x+w/2,h,zb],[x+w/2*.82,h*.8,zf],[x-w/2*.82,h*.8,zf],o.hero?mix([16,18,24],t):sh(c,1.15,t),dep); // R36V2: atap hero hitam (Huracan) — digabung R38 (kaca + sheen dipertahankan)
  const sx=x>0?x-w/2:x+w/2;
  // R32-FIN: sisi atas dulu h*.92 di depan — lebih tinggi dari tepi depan
  // atap (h*.8) sementara atap menyempit (w*.82), jadi sudut depan-atas
  // flank mencuat di atas garis atap dan kebaca duri/sirip hitam (probe:
  // sisi dicat magenta = duri ikut magenta). Samakan dengan atap (h*.8).
  Q([sx,0,zb],[sx,0,zf],[sx,h*.8,zf],[sx,h,zb],sh(c,.95,t),dep);
  // R32-SIDE: sisi mobil dulu satu bidang datar polos — dari samping kebaca
  // kotak/kontainer (parkir biru/merah di title). Kaca samping + roda
  // samping + garis pintu di bidang flank (offset 0.06 keluar; urutan
  // insert = urutan cat, jadi menimpa bidang bodi).
  const so=sx+(x>0?-0.06:0.06);
  Q([so,h*.55,zb+l*.12],[so,h*.55,zb+l*.5],[so,h*.81,zb+l*.5],[so,h*.81,zb+l*.12],mix([70,90,130],t),dep); // kaca samping
  for (const az of [zb+l*.22,zb+l*.78]) { // roda samping (as roda depan/belakang)
    Q([so,.02,az-.55],[so,.02,az+.55],[so,.62,az+.55],[so,.62,az-.55],'#0a0a0e',dep);
    Q([so,.2,az-.22],[so,.2,az+.22],[so,.45,az+.22],[so,.45,az-.22],'#6a6f76',dep); // hub roda samping
  }
  Q([so,h*.12,zb+l*.52-.035],[so,h*.12,zb+l*.52+.035],[so,h*.55,zb+l*.52+.035],[so,h*.55,zb+l*.52-.035],'rgba(0,0,0,.45)',dep); // garis pintu
  Q([so,h*.58,zb+l*.42],[so,h*.58,zb+l*.48],[so,h*.64,zb+l*.48],[so,h*.64,zb+l*.42],'#14141a',dep); // gagang pintu
  // R36-ARCH/SKIRT: lengkung roda + side skirt di flank (mobil title
  // masih kotak dari samping — R32 baru kaca+roda+garis pintu). Arch =
  // 3 anak tangga gelap di atas tiap roda (terbaca lengkung di 1x);
  // skirt = strip gelap di bawah pintu, di antara kedua as roda.
  for (const az of [zb+l*.22,zb+l*.78]) { // arch di atas roda samping
    Q([so,.60,az-.65],[so,.60,az-.35],[so,.68,az-.35],[so,.68,az-.65],'rgba(0,0,0,.5)',dep);
    Q([so,.68,az-.35],[so,.68,az+.35],[so,.76,az+.35],[so,.76,az-.35],'rgba(0,0,0,.5)',dep);
    Q([so,.60,az+.35],[so,.60,az+.65],[so,.68,az+.65],[so,.68,az+.35],'rgba(0,0,0,.5)',dep);
  }
  Q([so,.06,zb+l*.30],[so,.06,zb+l*.70],[so,.16,zb+l*.70],[so,.16,zb+l*.30],'rgba(0,0,0,.5)',dep); // side skirt
  // TITLE-FIX (taillight floor): rear lights scaled with the taillight
  // gain TL (0.12 at noon), so at noon they read as unlit plastic —
  // nearly BLACK, not lights. A real lens is RED plastic in daylight:
  // floor the LENS colour at 0.45 (visible red, no glow — the glow
  // stays TL-gated in frame()).
  const TLF=Math.max(TL,0.45);
  const tl=(o.pol?[[255,60,60],[60,120,255]]:[[255,70,90],[255,70,90]]).map(c=>c.map(v=>v*TLF|0));
  if(o.hero){Q([x-w/2+.2,h-.06,zb-.08],[x+w/2-.2,h-.06,zb-.08],[x+w/2-.2,h+.1,zb-.08],[x-w/2+.2,h+.1,zb-.08],mix([255*TLF|0,90*TLF|0,140*TLF|0],t),dep);
    Q([x-w/2+.3,h*.44,zb-.07],[x+w/2-.3,h*.44,zb-.07],[x+w/2-.3,h*.49,zb-.07],[x-w/2+.3,h*.49,zb-.07],'rgba(0,0,0,.5)',dep);
    Q([x-w/2+.2,h*.84,zb-.07],[x+w/2-.2,h*.84,zb-.07],[x+w/2-.2,h*.88,zb-.07],[x-w/2+.2,h*.88,zb-.07],'rgba(0,0,0,.4)',dep);
    // R32-MIRROR: spion dulu menggantung — tepi dalam 0.1 dari bodi + z 0.3
    // di belakang muka belakang = celah kosong kebaca melayang (probe:
    // spion dicat hijau = persegi hijau terlepas). Tempelkan: tepi dalam
    // menumpang bodi 0.06, z lebih dekat ke muka belakang.
    Q([x-w/2-.34,h*.8,zb-.12],[x-w/2+.06,h*.8,zb-.12],[x-w/2+.06,h*.95,zb-.12],[x-w/2-.34,h*.95,zb-.12],mix([20,22,30],t),dep);
    Q([x+w/2-.06,h*.8,zb-.12],[x+w/2+.34,h*.8,zb-.12],[x+w/2+.34,h*.95,zb-.12],[x+w/2-.06,h*.95,zb-.12],mix([20,22,30],t),dep);
    Q([x-1.4,h+.02,zb-.4],[x+1.4,h+.02,zb-.4],[x+1.4,h+.14,zb-.4],[x-1.4,h+.14,zb-.4],mix([20,22,30],t),dep); // R36V2: sayap hero dilebar (dulu ±0,25 — kini bilah sayap hampir selebar atap)
    // TITLE-FIX (rear diffuser + plate, hero only): the flat red slab
    // below the window reads as a box. Black diffuser valance + 3 fins
    // (Huracan) + light plate break the slab — display only, the
    // collision box (w/l/h) is untouched.
    Q([x-1.05,0,zb-.06],[x+1.05,0,zb-.06],[x+1.05,.42,zb-.06],[x-1.05,.42,zb-.06],'#0a0a0e',dep);
    for(const fx of[-0.6,0,0.6])Q([x+fx-.05,0,zb-.07],[x+fx+.05,0,zb-.07],[x+fx+.05,.42,zb-.07],[x+fx-.05,.42,zb-.07],'#2a2d33',dep);
    Q([x-.35,.5,zb-.06],[x+.35,.5,zb-.06],[x+.35,.72,zb-.06],[x-.35,.72,zb-.06],'#dfe3e8',dep);}
  Q([x-w/2+.3,.55,zb-.06],[x-w/2+1.1,.55,zb-.06],[x-w/2+1.1,.85,zb-.06],[x-w/2+.3,.85,zb-.06],mix(tl[0],t),dep);
  Q([x+w/2-1.1,.55,zb-.06],[x+w/2-.3,.55,zb-.06],[x+w/2-.3,.85,zb-.06],[x+w/2-1.1,.85,zb-.06],mix(tl[1],t),dep);
  Q([x-w/2+.1,0,zb-.05],[x-w/2+1.2,0,zb-.05],[x-w/2+1.2,.75,zb-.05],[x-w/2+.1,.75,zb-.05],'#0a0a0e',dep);
  Q([x+w/2-1.2,0,zb-.05],[x+w/2-.1,0,zb-.05],[x+w/2-.1,.75,zb-.05],[x+w/2-1.2,.75,zb-.05],'#0a0a0e',dep);
  // R32-HUB: hub abu-abu pucat (#8a8f98) di bawah belakang kebaca lampu
  // depan di belakang mobil (probe: hub dicat cyan = dua kotak cyan).
  // Gelapkan jadi gunmetal + titik terang kecil di tengah: kebaca velg/ban,
  // bukan lampu. Lampu belakang yang benar = strip merah di atasnya.
  // TITLE-FIX (rear wheels): the R36-HUB2D hub (#1e2126 + grey spoke
  // CROSS) still reads as a grey box with a "+" at title-noon distance
  // (Juna's circle: two grey "+" squares). Concentric tire -> rim ->
  // hubcap reads as a WHEEL: no cross, no light square.
  Q([x-w/2+.35,.15,zb-.08],[x-w/2+.95,.15,zb-.08],[x-w/2+.95,.6,zb-.08],[x-w/2+.35,.6,zb-.08],'#0b0c10',dep);
  Q([x+w/2-.95,.15,zb-.08],[x+w/2-.35,.15,zb-.08],[x+w/2-.35,.6,zb-.08],[x+w/2-.95,.6,zb-.08],'#0b0c10',dep);
  Q([x-w/2+.45,.22,zb-.09],[x-w/2+.85,.22,zb-.09],[x-w/2+.85,.53,zb-.09],[x-w/2+.45,.53,zb-.09],'#3a3f47',dep);
  Q([x+w/2-.85,.22,zb-.09],[x+w/2-.45,.22,zb-.09],[x+w/2-.45,.53,zb-.09],[x+w/2-.85,.53,zb-.09],'#3a3f47',dep);
  Q([x-w/2+.58,.32,zb-.10],[x-w/2+.72,.32,zb-.10],[x-w/2+.72,.43,zb-.10],[x-w/2+.58,.43,zb-.10],'#565b63',dep);
  Q([x+w/2-.72,.32,zb-.10],[x+w/2-.58,.32,zb-.10],[x+w/2-.58,.43,zb-.10],[x+w/2-.72,.43,zb-.10],'#565b63',dep);
  if(o.pol){
    // TITLE-FIX (police at distance): the light bar was a thin strip
    // (h+.05-.35) that vanished at title distance — the patrol car read
    // as a dark blob. Taller + wider bar with a white centre module;
    // the halo is painted in frame() (see police glow below).
    Q([x-1.15,h+.02,zb-.4],[x-.12,h+.02,zb-.4],[x-.12,h+.48,zb-.4],[x-1.15,h+.48,zb-.4],'#ff2d2d',dep);
    Q([x+.12,h+.02,zb-.4],[x+1.15,h+.02,zb-.4],[x+1.15,h+.48,zb-.4],[x+.12,h+.48,zb-.4],'#2d6bff',dep);
    Q([x-.12,h+.02,zb-.4],[x+.12,h+.02,zb-.4],[x+.12,h+.48,zb-.4],[x-.12,h+.48,zb-.4],'#e8e8e8',dep);
    // R36V2: bagasi putih (Charger hitam-putih) — pita putih di muka
    // belakang, di bawah lampu (lampu di h*.55-.85, bumper di bawah).
    // TITLE-FIX: widened (was h*.30-.48) so the black-white read
    // survives title distance.
    Q([x-w/2+.15,h*.26,zb-.07],[x+w/2-.15,h*.26,zb-.07],[x+w/2-.15,h*.52,zb-.07],[x-w/2+.15,h*.52,zb-.07],mix([240,240,236],t),dep);}}
function sign(sd,z0,z1,txt,col){const b=B.find(b=>(b.x>0)===(sd>0)&&b.z>z0&&b.z<z1);if(!b)return;
  const p=P(b.x,b.h*.72,b.z-b.d/2-.6);if(!p)return;const fs=Math.round(1500/p[2]);
  ops.push({d:p[2],f(){x.save();x.globalAlpha=NEON;x.font='bold '+fs+'px sans-serif';x.textAlign='center';x.shadowColor=col;x.shadowBlur=14*NEON;x.fillStyle=col;x.fillText(txt,p[0],p[1]);x.restore();}});}
// R36 PALEM TITLE (dipakai frame()): batang ramping + kanopi BERLAPIS —
// 8 pelepah bawah panjang menjuntai + 6 pelepah atas pendek menjulang
// (hijau lebih terang), semua pita VERTIKAL (lebar di sumbu Y) supaya
// dari kamera title yang rendah kebaca daun, bukan kipas datar.
// Q() mengabaikan argumen dep (cat urutan sisip), jadi palmT dipanggil
// SETELAH gedung + mobil supaya menimpa fasad di belakangnya.
function palmT(x, z) {
  const d = z - camZ, t = hz(d);
  const pcy = 7.5;
  // R36v2: batang LEBIH TEBAL (0.5) + cokelat terang — v1 (0.35, [74,52,36])
  // hilang menempel gedung gelap di belakangnya (probe: batang tak kebaca).
  Q([x - 0.5, 0, z], [x + 0.5, 0, z], [x + 0.25, pcy, z], [x - 0.25, pcy, z], sh([110, 78, 52], 1, t), d); // batang muka
  Q([x + 0.5, 0, z - 0.4], [x + 0.5, 0, z + 0.4], [x + 0.25, pcy, z + 0.4], [x + 0.25, pcy, z - 0.4], sh([80, 56, 38], 1, t), d); // batang sisi
  Q([x - 0.25, pcy - 0.2, z], [x + 0.25, pcy - 0.2, z], [x + 0.25, pcy + 0.3, z], [x - 0.25, pcy + 0.3, z], sh([42, 26, 16], 1, t), d); // mahkota
  const gA = hx3('#4a9e4f'), gB = hx3('#3a7d40'), gL = hx3('#5cb85f');
  const rib = (fx, fz, frn, yA, w0, col) => {
    for (let sg = 0; sg < 2; sg += 1) {
      const t0 = sg / 2, t1 = (sg + 1) / 2, w = w0 - 0.12 * sg;
      const y0 = yA(t0), y1 = yA(t1);
      Q([x + fx * frn * t0, y0 - w, z + fz * frn * t0],
        [x + fx * frn * t1, y1 - w, z + fz * frn * t1],
        [x + fx * frn * t1, y1 + w, z + fz * frn * t1],
        [x + fx * frn * t0, y0 + w, z + fz * frn * t0],
        sh(col, 0.9 - 0.1 * sg, t), d);
    }
  };
  for (let fi = 0; fi < 8; fi += 1) { // lapis bawah: 8 pelepah panjang menjuntai
    const fa = h2(31, z) * 6.283 + fi * 0.785;
    rib(Math.cos(fa), Math.sin(fa), 2.0 + h2(fi, z) * 0.4,
      (u) => pcy + 0.6 * u - 2.4 * u * u, 0.30, fi % 2 ? gB : gA);
  }
  for (let fi = 0; fi < 6; fi += 1) { // lapis atas: 6 pelepah pendek menjulang, hijau muda
    const fa = h2(47, z) * 6.283 + fi * 1.047 + 0.52;
    rib(Math.cos(fa), Math.sin(fa), 1.4 + h2(fi, z + 5) * 0.3,
      (u) => pcy + 0.3 + 1.0 * u - 1.2 * u * u, 0.26, gL);
  }
}
// R40-D: garis pantai berlekuk (bukan lurus x=64) — tepi air/pasir ikut
// fungsi dunia yang sama supaya pasir, air, dan buih selalu bertemu.
// Amplitudo total ±7 unit (tepi terendah ~57 — semua prop pantai di x<=55
// tetap di pasir).
const coast=(z)=>64+4.5*Math.sin(z*0.028)+2.5*Math.sin(z*0.083+1.7);
function frame(t){
  // R33: time-of-day palette — the title backdrop is no longer hardcoded
  // sunset. Default 'sore' reproduces the R31 values exactly.
  const PAL=TITLE_PAL[titleTOD]||TITLE_PAL.sore;
  HZ[0]=PAL.hz[0];HZ[1]=PAL.hz[1];HZ[2]=PAL.hz[2];BOUNCE=PAL.bounce;TL=PAL.tlGain;
  HZMAX=0.72*PAL.fogK;NEON=PAL.neon;WINLIT=PAL.winLit;WIN_T=PAL.winTint;
  fovF=640;camH=5.6; // title lens (round 22: chase uses its own values)
  camZ=t*26;
  const g=x.createLinearGradient(0,0,0,HOR+60);
  g.addColorStop(0,PAL.sky[0]);g.addColorStop(.45,PAL.sky[1]);g.addColorStop(.75,PAL.sky[2]);g.addColorStop(1,PAL.sky[3]);
  x.fillStyle=g;x.fillRect(0,0,W,HOR+60);x.fillStyle=PAL.ground;x.fillRect(0,HOR,W,H-HOR);
  const sx=CX+PAL.sunX,sy=HOR+PAL.sunY; // R36-ROADS: sunX per preset (item 8: pagi 330 — matahari fajar di celah air kanan, bukan di balik gedung tengah)
  // R31 near apron: the 30-unit road/sidewalk/ground loops start behind the
  // camera, and Q() drops any quad with a corner at dz<2 — so the strip
  // nearest the lens (bottom of the frame, dz<24) was never drawn and
  // showed only the flat #241a20 background fill. Draw it explicitly:
  // one quad from just past the near plane to where the 30-unit loop's
  // first visible quad starts (dz=24). Haze is 0 this close, so a single
  // warm tone is right; the dashes, hero car and glow break it up.
  Q([-12,0,camZ+2],[12,0,camZ+2],[12,0,camZ+24],[-12,0,camZ+24],shW([58,47,53],1,0),2);
  Q([-16,.1,camZ+2],[-12,.1,camZ+2],[-12,.1,camZ+24],[-16,.1,camZ+24],sh([80,70,76],1,0),2);
  Q([12,.1,camZ+2],[16,.1,camZ+2],[16,.1,camZ+24],[12,.1,camZ+24],sh([80,70,76],1,0),2);
  Q([-64,0,camZ+2],[-16,0,camZ+2],[-16,0,camZ+24],[-64,0,camZ+24],shW([48,38,44],1,0),2);
  // R36 PANTAI (title): strip kanan (x 16..64) = pasir pantai, bukan
  // trotoar gelap — tone pasir + jejak di apron dekat kamera juga.
  // R40-D: tepi kanan ikut coast() (berlekuk) + 2 bercak tone supaya apron
  // pasir dekat kamera tidak lempeng beige.
  Q([16,0,camZ+2],[coast(camZ+2),0,camZ+2],[coast(camZ+24),0,camZ+24],[16,0,camZ+24],shW([196,164,116],1,0),2);
  Q([24,.05,camZ+8],[24.9,.05,camZ+8],[24.9,.05,camZ+11],[24,.05,camZ+11],mix([150,120,80],0),2);
  Q([40,.05,camZ+14],[40.7,.05,camZ+14],[40.7,.05,camZ+14.7],[40,.05,camZ+14.7],mix([235,220,190],0),2);
  Q([30,.05,camZ+5],[31.8,.05,camZ+5],[31.8,.05,camZ+6.4],[30,.05,camZ+6.4],mix([170,140,95],0),2);
  Q([48,.05,camZ+18],[49.6,.05,camZ+18],[49.6,.05,camZ+19.2],[48,.05,camZ+19.2],mix([215,185,140],0),2);
  Q([36,.05,camZ+11],[38.5,.05,camZ+11],[38.5,.05,camZ+13],[36,.05,camZ+13],mix([170,140,95],0),2);
  Q([52,.05,camZ+9],[54,.05,camZ+9],[54,.05,camZ+10.6],[52,.05,camZ+10.6],mix([215,185,140],0),2);
  // R33: tyre tracks on the near apron too — the foreground road was a flat
  // brown expanse (Juna: sore "aneh banget"). Two dark wheel lines + a
  // crack, y=0.04 so they sit on the asphalt, under the dashes (y=0.05).
  // R40-D: bekas ban dulu mix([40,32,36]) TANPA bounce — di atas aspal
  // shW() (bounce putih siang) ia kebaca dua pita HITAM membujur selebar
  // 1.2 unit sepanjang jalan. Kini shW() juga (tone ikut aspal) + warna
  // nyaris seaspal [52,43,48] + lebar 0.8 = samar, bukan slab.
  Q([-3.2,.04,camZ+2],[-2.4,.04,camZ+2],[-2.4,.04,camZ+24],[-3.2,.04,camZ+24],shW([52,43,48],1,0),2);
  Q([2.4,.04,camZ+2],[3.2,.04,camZ+2],[3.2,.04,camZ+24],[2.4,.04,camZ+24],shW([52,43,48],1,0),2);
  Q([-6,.04,camZ+9],[-4.8,.04,camZ+9],[-5.6,.04,camZ+20],[-6.8,.04,camZ+20],shW([30,24,28],1,0),2);
  // road + sidewalks (segmented so fog deepens with distance)
  for(let z=Math.floor((camZ-30)/30)*30;z<camZ+430;z+=30){const d=z-camZ,v=h2(3,z);
    // R33: road texture — per-segment tone jitter + tyre tracks + an
    // occasional dark patch / crack, so the foreground is not a flat expanse.
    Q([-12,0,z],[12,0,z],[12,0,z+30],[-12,0,z+30],shW([58+v*6,47+v*5,53+v*5],1,hz(d)),d);
    Q([-16,.1,z],[-12,.1,z],[-12,.1,z+30],[-16,.1,z+30],sh([80,70,76],1,hz(d)),d);
    Q([12,.1,z],[16,.1,z],[16,.1,z+30],[12,.1,z+30],sh([80,70,76],1,hz(d)),d);
    Q([-11.7,.06,z],[-11.4,.06,z],[-11.4,.06,z+30],[-11.7,.06,z+30],mix([220,200,170],hz(d)),d);
    Q([11.4,.06,z],[11.7,.06,z],[11.7,.06,z+30],[11.4,.06,z+30],mix([220,200,170],hz(d)),d);
    Q([-3.2,.04,z],[-2.4,.04,z],[-2.4,.04,z+30],[-3.2,.04,z+30],shW([52,43,48],1,hz(d)),d);
    Q([2.4,.04,z],[3.2,.04,z],[3.2,.04,z+30],[2.4,.04,z+30],shW([52,43,48],1,hz(d)),d);
    if(h2(17,z)<.2){const px0=-8+h2(29,z)*10;Q([px0,.045,z+5],[px0+4,.045,z+5],[px0+4,.045,z+18],[px0,.045,z+18],mix([48,38,44],hz(d)),d);}
    if(h2(13,z)<.3){const cx=-8+h2(31,z)*16;Q([cx,.045,z+8],[cx+1.2,.045,z+8],[cx+.4,.045,z+20],[cx-.8,.045,z+20],mix([30,24,28],hz(d)),d);}}
  // R31 title foreground: flanking ground — the frame's lower half was flat
  // #241a20 void beyond the sidewalks (|x|>16). Warm pavement strips with
  // per-segment variation + curb lines, haze-faded like the road, so the
  // foreground reads as a street, not black. Right strip runs to the water
  // (x=64) as the harbor promenade.
  for(let z=Math.floor((camZ-30)/30)*30;z<camZ+430;z+=30){const d=z-camZ,v=h2(7,z);
    Q([-64,0,z],[-16,0,z],[-16,0,z+30],[-64,0,z+30],shW([46+v*8,36+v*6,42+v*6],1,hz(d)),d);
    // R36 PANTAI (title): strip kanan = pasir bertekstur (bukan hamparan
    // datar) — tone jitter + jejak kaki + kerang, per segmen 30 unit.
    // R40-D: tepi kanan ikut coast() (berlekuk) + 2 bercak tone kecil per
    // segmen supaya pasir tidak lempeng beige (grain halus = tugas C).
    Q([16,0,z],[coast(z),0,z],[coast(z+30),0,z+30],[16,0,z+30],shW([196+v*14,164+v*10,116+v*8],1,hz(d)),d);
    if(h2(23,z)<.45){const fx=22+h2(29,z)*30;Q([fx,.05,z+6],[fx+.9,.05,z+6],[fx+.9,.05,z+9],[fx,.05,z+9],mix([150,120,80],hz(d)),d);}
    if(h2(41,z)<.3){const sx2=20+h2(43,z)*32;Q([sx2,.05,z+16],[sx2+.7,.05,z+16],[sx2+.7,.05,z+16.7],[sx2,.05,z+16.7],mix([235,220,190],hz(d)),d);}
    if(h2(53,z)<.4){const fx2=24+h2(59,z)*28;Q([fx2,.05,z+22],[fx2+.8,.05,z+22],[fx2+.8,.05,z+24.5],[fx2,.05,z+24.5],mix([140,112,74],hz(d)),d);}
    if(h2(89,z)<.8){const px2=20+h2(97,z)*30,pz2=z+4+h2(101,z)*18;Q([px2,.05,pz2],[px2+3,.05,pz2],[px2+3,.05,pz2+2.2],[px2,.05,pz2+2.2],mix([170,140,95],hz(d)),d);}
    if(h2(103,z)<.6){const px3=22+h2(107,z)*28,pz3=z+8+h2(109,z)*16;Q([px3,.05,pz3],[px3+2.6,.05,pz3],[px3+2.6,.05,pz3+2],[px3,.05,pz3+2],mix([215,185,140],hz(d)),d);}
    if(h2(113,z)<.5){const px4=24+h2(117,z)*26,pz4=z+14+h2(119,z)*12;Q([px4,.05,pz4],[px4+2.2,.05,pz4],[px4+2.2,.05,pz4+1.8],[px4,.05,pz4+1.8],mix([150,120,80],hz(d)),d);}
    Q([-16.4,.08,z],[-16,.08,z],[-16,.08,z+30],[-16.4,.08,z+30],mix([150,132,120],hz(d)),d);
    Q([16,.08,z],[16.4,.08,z],[16.4,.08,z+30],[16,.08,z+30],mix([150,132,120],hz(d)),d);}
  // R36-ROADS item 16: kiri bawah title datar (gradasi cokelat polos) — sambungan
  // ubin trotoar + prop foreground di strip kiri (x -64..-16, dekat kamera, di
  // luar jalan |x|<12 dan di luar mobil hero). Q() urutan sisip: prop di sini
  // menimpa tanah tapi di bawah mobil/lampu (yang di-emit sesudahnya).
  for(let z=camZ+10;z<camZ+70;z+=15){const d=z-camZ;
    Q([-64,.02,z],[-16,.02,z],[-16,.02,z+.35],[-64,.02,z+.35],mix([38,30,34],hz(d)),d);}
  { // R36-ROADS item 16: manhole + tambalan di apron (jalan depan hero — area
    // foreground yang BENAR-BENAR terlihat; strip trotoar kiri x<-16 di
    // dz<30 di luar layar/terhalang panel judul). Proyeksi title fovF=640:
    // di dz=10, 1 unit = 64 px — manhole 2.5 unit dulu jadi 160 px, hitam
    // pekat, kebaca lubang hitam. Kini kecil + warna nyaris seaspal.
    const z=camZ+20; // manhole kanan (1.2 unit -> ~38 px, di kanan mobil hero)
    Q([5.4,.03,z],[6.6,.03,z],[6.6,.03,z+1.2],[5.4,.03,z+1.2],mix([48,42,46],hz(20)),20);
    const z2=camZ+16; // tambalan kiri (1.6 unit, samar)
    Q([-7.8,.03,z2],[-6.2,.03,z2],[-6.2,.03,z2+1.6],[-7.8,.03,z2+1.6],mix([50,44,48],hz(16)),16);}
  { // bekas ban samar di apron (dua lajur, z camZ+6..camZ+17, di depan mobil
    // hero) — warna nyaris seaspal supaya tidak jadi dua slab hitam.
    Q([-3.1,.03,camZ+6],[-2.3,.03,camZ+6],[-2.3,.03,camZ+17],[-3.1,.03,camZ+17],shW([52,43,48],1,hz(11)),11);
    Q([2.3,.03,camZ+6],[3.1,.03,camZ+6],[3.1,.03,camZ+17],[2.3,.03,camZ+17],shW([52,43,48],1,hz(11)),11);}
  {const z=camZ+14; // hidran merah (depan + atas + kubah)
    Q([-22.8,0,z],[-21.2,0,z],[-21.2,1.6,z],[-22.8,1.6,z],mix([200,60,55],hz(14)),14);
    Q([-22.8,1.6,z],[-21.2,1.6,z],[-21.2,1.6,z-.9],[-22.8,1.6,z-.9],mix([140,40,40],hz(14)),14);
    Q([-22.5,1.6,z-.2],[-21.5,1.6,z-.2],[-21.5,2,z-.7],[-22.5,2,z-.7],mix([160,45,45],hz(14)),14);}
  {const z=camZ+30; // kotak utilitas hijau-abu (depan + atas)
    Q([-28.3,0,z],[-25.7,0,z],[-25.7,2.2,z],[-28.3,2.2,z],mix([90,110,95],hz(30)),30);
    Q([-28.3,2.2,z],[-25.7,2.2,z],[-25.7,2.2,z-1],[-28.3,2.2,z-1],mix([60,75,65],hz(30)),30);}
  {const z=camZ+42; // bangku kayu (dudukan + sandaran)
    Q([-23,.9,z],[-19,.9,z],[-19,.9,z+1.6],[-23,.9,z+1.6],mix([120,85,55],hz(42)),42);
    Q([-23,.9,z+1.6],[-19,.9,z+1.6],[-19,1.9,z+1.6],[-23,1.9,z+1.6],mix([105,72,45],hz(42)),42);}
  {const z=camZ+52; // tempat sampah hijau gelap (depan + atas)
    Q([-25.6,0,z],[-24.4,0,z],[-24.4,1.7,z],[-25.6,1.7,z],mix([40,90,55],hz(52)),52);
    Q([-25.6,1.7,z],[-24.4,1.7,z],[-24.4,1.7,z-.9],[-25.6,1.7,z-.9],mix([28,65,40],hz(52)),52);}
  for(const bz of [camZ+10,camZ+25,camZ+40]){ // bollard di tepi trotoar (3x)
    const d=bz-camZ;
    Q([-17.8,0,bz],[-17.2,0,bz],[-17.2,1.3,bz],[-17.8,1.3,bz],mix([50,50,55],hz(d)),d);
    Q([-17.8,1.3,bz],[-17.2,1.3,bz],[-17.2,1.3,bz-.5],[-17.8,1.3,bz-.5],mix([200,180,60],hz(d)),d);}
  {const z=camZ+58; // rambu jalan (tiang + panel biru)
    Q([-19.2,0,z],[-18.8,0,z],[-18.8,3.5,z],[-19.2,3.5,z],mix([90,90,95],hz(58)),58);
    Q([-19.9,2.6,z],[-18.1,2.6,z],[-18.1,3.8,z],[-19.9,3.8,z],mix([40,90,200],hz(58)),58);}
  {const z=camZ+38; // bangku promenade kanan (menghadap air)
    Q([22,.9,z],[26,.9,z],[26,.9,z+1.6],[22,.9,z+1.6],mix([120,85,55],hz(38)),38);
    Q([22,.9,z+1.6],[26,.9,z+1.6],[26,1.9,z+1.6],[22,1.9,z+1.6],mix([105,72,45],hz(38)),38);}
  for(let z=Math.floor((camZ+14)/12)*12;z<camZ+420;z+=12){const d=z-camZ;
    // R40-D: marka tengah dulu 0.9 lebar × 3.5 panjang, kuning penuh
    // [255,179,71] = ubin kuning kotak-kotak. Kini marka CAT: 0.55 lebar ×
    // 5.5 panjang, kuning cat sedikit aus (tone bervariasi per dash).
    const dw=0.55+0.1*h2(19,z),dc=[232+h2(23,z)*23,158+h2(29,z)*27,58+h2(31,z)*18];
    Q([-dw/2,.05,z],[dw/2,.05,z],[dw/2,.05,z+5.5],[-dw/2,.05,z+5.5],mix(dc,hz(d)),d);
    Q([-6.4,.05,z+6],[-6,.05,z+6],[-6,.05,z+11],[-6.4,.05,z+11],mix([200,180,140],hz(d)),d);
    Q([6,.05,z+6],[6.4,.05,z+6],[6.4,.05,z+11],[6,.05,z+11],mix([200,180,140],hz(d)),d);}
  // R36-ROADS (Juna 17:18: zebra di title): zebra + garis stop di depan hero
  // (antara hero z+17 dan polisi z+48) — strip membujur 10x, putih, di atas
  // aspal (y .06) supaya kebaca jelas di 1280x800 tanpa zoom.
  for(let k=0;k<10;k++){const bx=-9.9+k*2.2;
    Q([bx,.06,camZ+32],[bx+1.1,.06,camZ+32],[bx+1.1,.06,camZ+38],[bx,.06,camZ+38],mix([235,235,235],hz(35)),35);}
  Q([-11,.06,camZ+27.5],[11,.06,camZ+27.5],[11,.06,camZ+28.7],[-11,.06,camZ+28.7],mix([235,235,235],hz(28)),28);
  // harbor water, right side (gap in buildings)
  // R40-D: tepi kiri air ikut coast() (berlekuk, tumpang 1.5 unit ke pasir
  // supaya tidak ada celah tanah di lekukan) + riak halus: 2 pita kilau
  // putih samar per segmen + glitter matahari yang sudah ada.
  for(let z=Math.floor((camZ-30)/40)*40;z<camZ+430;z+=40){const d=z-camZ;
    Q([coast(z)-1.5,-1,z],[240,-1,z],[240,-1,z+40],[coast(z+40)-1.5,-1,z+40],mix(PAL.water,cl(d/300,0,.85)),d);
    if(h2(61,z)<.7){const wx2=coast(z)+18+h2(67,z)*90,wl=18+h2(71,z)*22;
      Q([wx2,-.95,z+6],[wx2+wl,-.95,z+6],[wx2+wl,-.95,z+9],[wx2,-.95,z+9],'rgba(255,255,255,.10)',d);}
    if(h2(73,z)<.5){const wx3=coast(z)+30+h2(79,z)*80,wl2=12+h2(83,z)*18;
      Q([wx3,-.95,z+22],[wx3+wl2,-.95,z+22],[wx3+wl2,-.95,z+24.5],[wx3,-.95,z+24.5],'rgba(255,255,255,.08)',d);}}
  // sun glitter strips ON the water (world space, so perspective lands them right)
  Q([80,-.9,camZ+150],[150,-.9,camZ+150],[150,-.9,camZ+420],[80,-.9,camZ+420],PAL.glitter[0],150);
  Q([150,-.9,camZ+200],[175,-.9,camZ+200],[175,-.9,camZ+420],[150,-.9,camZ+420],PAL.glitter[1],200);
  // R36 PANTAI (title): ombak + payung + kursi + palem + perahu nelayan.
  // Posisi dihitung dari proyeksi (proj-title.mjs): pita gedung kanan ada
  // di layar x 658..848 — semua prop di sini proyeksinya x>860 (kanan
  // pita) atau x<762 (kiri pita), jadi tidak ketutup gedung. VISUAL SAJA.
  for(let z=Math.floor((camZ-30)/40)*40;z<camZ+430;z+=40){const d=z-camZ; // ombak: 2 garis buih MENGIKUTI lekuk pantai coast(z) (dulu 2 pita lurus x=62-66 / 68-71)
    const e0=coast(z),e1=coast(z+26),e2=coast(z+14),e3=coast(z+32);
    Q([e0-2,-.85,z],[e0+2,-.85,z],[e1+2,-.85,z+26],[e1-2,-.85,z+26],'rgba(255,255,255,.65)',d);
    Q([e2+3,-.85,z+14],[e2+6,-.85,z+14],[e3+6,-.85,z+14+18],[e3+3,-.85,z+14+18],'rgba(255,255,255,.35)',d);}
  const bUmb=(ux,uz,cA,cB)=>{const t=hz(uz-camZ),d=uz-camZ; // payung: tiang + kanopi 2 sisi warna-warni (v2: lebih lebar + runcing supaya kebaca payung, bukan awning)
    Q([ux-.18,0,uz],[ux+.18,0,uz],[ux+.18,2.8,uz],[ux-.18,2.8,uz],mix([200,190,170],t),d);
    Q([ux-3,2.2,uz],[ux,2.2,uz],[ux,3.7,uz],[ux-3,2.55,uz],mix(cA,t),d);
    Q([ux,2.2,uz],[ux+3,2.2,uz],[ux+3,2.55,uz],[ux,3.7,uz],mix(cB,t),d);
    Q([ux-.35,3.65,uz],[ux+.35,3.65,uz],[ux+.35,3.9,uz],[ux-.35,3.9,uz],mix([40,40,44],t),d);};
  const bChair=(cx,cz,cT)=>{const t=hz(cz-camZ),d=cz-camZ; // kursi: sandaran hadap kamera + dudukan + handuk
    Q([cx-.8,.35,cz],[cx+.8,.35,cz],[cx+.8,1.2,cz],[cx-.8,1.2,cz],mix([190,182,164],t),d);
    Q([cx-.8,.35,cz],[cx+.8,.35,cz],[cx+.8,.35,cz+1.6],[cx-.8,.35,cz+1.6],mix([160,152,134],t),d);
    Q([cx-.6,.42,cz+.2],[cx+.6,.42,cz+.2],[cx+.6,.42,cz+1.4],[cx-.6,.42,cz+1.4],mix(cT,t),d);};
  const bPalm=(px,pz)=>{const t=hz(pz-camZ),d=pz-camZ; // palem pantai: batang tebal + 6 pelepah pita vertikal (v2: batang ditebalkan + diterangkan)
    Q([px-.5,0,pz],[px+.5,0,pz],[px+.3,4.6,pz],[px-.7,4.6,pz],mix([130,92,60],t),d);
    Q([px-.45,0,pz+.3],[px+.45,0,pz+.3],[px+.25,4.5,pz+.3],[px-.65,4.5,pz+.3],mix([116,82,54],t),d);
    for(let k=0;k<6;k+=1){const a=k/6*Math.PI*2+.3,dx=Math.cos(a)*2.2,dy=Math.sin(a)*1.1;
      Q([px,4.6,pz],[px+dx,4.6+dy,pz],[px+dx,4.6+dy-.5,pz],[px,4.6-.5,pz],mix(k%2?[40,140,60]:[30,110,50],t),d);}
    Q([px-.3,4.1,pz],[px+.3,4.1,pz],[px+.3,4.4,pz],[px-.3,4.4,pz],mix([115,78,30],t),d);};
  const bBoat=(bx,bz,s,y0)=>{const t=hz(bz-camZ),d=bz-camZ,L=7*s; // perahu nelayan: lambung kayu + garis putih + tiang + layar (v2: layar lebih besar + putih terang)
    Q([bx-L,y0,bz],[bx+L,y0,bz],[bx+L*.86,y0+1.1*s,bz],[bx-L*.86,y0+1.1*s,bz],mix([122,82,40],t),d);
    Q([bx-L*.93,y0+.7*s,bz],[bx+L*.93,y0+.7*s,bz],[bx+L*.9,y0+1*s,bz],[bx-L*.9,y0+1*s,bz],mix([235,230,220],t),d);
    Q([bx+.5*s,y0+1.1*s,bz],[bx+.8*s,y0+1.1*s,bz],[bx+.8*s,y0+4.8*s,bz],[bx+.5*s,y0+4.8*s,bz],mix([90,64,36],t),d);
    Q([bx+.8*s,y0+2.2*s,bz],[bx+5*s,y0+2.2*s,bz],[bx+.8*s,y0+4.6*s,bz],[bx+.8*s,y0+4.6*s,bz],mix([245,240,225],t),d);};
  bUmb(38,camZ+55,[16,200,200],[255,217,51]); // teal/kuning (depan, besar)
  bChair(41,camZ+58,[255,90,76]);
  bUmb(48,camZ+75,[255,140,38],[245,245,230]); // oranye/putih
  bChair(51,camZ+78,[16,200,200]);
  bUmb(52,camZ+120,[255,90,76],[245,245,230]); // koral/putih
  bChair(55,camZ+123,[255,217,51]);
  bPalm(24,camZ+140); bPalm(46,camZ+80);
  bBoat(30,camZ+60,1,0); // perahu nelayan di pasir (depan)
  bBoat(80,camZ+200,.7,-1); // perahu nelayan di air
  // pier + boats
  Q([56,.5,camZ+100],[76,.5,camZ+100],[76,.5,camZ+140],[56,.5,camZ+140],sh([40,30,34],1,hz(120)),120);
  // TITLE-SLAB (VB-24): the two moored boats were flat white rectangles —
  // hull + a cabin at z+105 that projected WIDER than its z+110 hull — so
  // they stacked into a floating white slab at the frame's right edge
  // (probe: boat1-hull [1117,392,1245,406], cabin [1158,384,1256,397],
  // boat2-hull [1143,386,1220,396]). Each boat is now a side view with a
  // raked bow, a boot-top waterline stripe (run down to the hull bottom so
  // no white sliver shows below it), and a cabin inside the hull
  // outline at the same depth, so it reads as a boat, not a slab.
  // ORDER MATTERS: Q() ignores its dep argument — ops.push({d,...}) stores
  // the 4th corner point as d, so the sort key is NaN and title quads paint
  // in INSERTION order. The FAR boat (z+150) must therefore be emitted
  // FIRST and the NEAR boat (z+110) after it, or the far hull paints over
  // the near boat's cabin + windshield (seen on screen: cabin/windshield
  // invisible until this reorder). Do not "fix" by changing Q() — that
  // would reorder the whole title frame.
  // R31: the two moored boats read as one white bar at 1x (near boat hugged
  // the frame edge, far boat hid behind it, dark cabins blended into the
  // night water). Near boat shifted left off the edge (x 82..104 -> 76..98),
  // far boat moved further out (z+150 -> z+185) so it peeks above-behind as
  // a distinct second hull; cabins lightened + amber window on the near one.
  Q([124,-1,camZ+185],[142,-1,camZ+185],[142,.9,camZ+185],[124,1.8,camZ+185],sh([200,210,220],1,hz(185)),185);
  Q([124,-1,camZ+185],[142,-1,camZ+185],[142,-.42,camZ+185],[124,-.42,camZ+185],sh([30,40,60],1,hz(185)),185);
  Q([129,1,camZ+185],[136,1,camZ+185],[136,2.1,camZ+185],[129,2.1,camZ+185],sh([70,85,110],1,hz(185)),185);
  Q([76,-1,camZ+110],[98,-1,camZ+110],[98,.9,camZ+110],[76,1.9,camZ+110],sh([220,220,230],1,hz(110)),110);
  Q([76,-1,camZ+110],[98,-1,camZ+110],[98,-.42,camZ+110],[76,-.42,camZ+110],sh([30,40,60],1,hz(110)),110);
  Q([83,1,camZ+110],[91,1,camZ+110],[91,2.3,camZ+110],[83,2.3,camZ+110],sh([70,85,110],1,hz(110)),110);
  Q([83,1.5,camZ+110],[86.5,1.5,camZ+110],[86.5,2.3,camZ+110],[83,1.9,camZ+110],sh([140,190,220],1,hz(110)),110);
  Q([87,1.4,camZ+110],[90,1.4,camZ+110],[90,2,camZ+110],[87,2,camZ+110],mix([255,190,110],hz(110)),110);
  // R36-BLD distant skyline (item 13): dulu 10 slab abu polos tanpa
  // jendela (kebaca jelas di title siang/sore, crop 2x). Tiap menara kini:
  // warna fasad bervariasi (5 nada), grid jendela padat ikut WINLIT/WIN_T
  // seperti wins() (siang hampir semua gelap, sore hangat menyala), atap
  // setback di sebagian menara. Deterministik h2(i,..) — dulu R() tiap
  // frame, jadi skyline bergeser tiap frame. Haze ikut hz() (siang jernih
  // = warna fasad tetap kebaca, sore berkabut hangat seperti dulu).
  // R40-D: skyline siang — jendela mati dulu [52,66,88]/[34,44,62] di
  // fasad gelap + kabut = titik-titik tak terbaca. Siang: kaca pantul
  // langit (biru terang bervariasi) + jendela sedikit lebih besar +
  // antena di sebagian menara (variasi siluet). Sore/pagi/malam sama.
  const noonSky=titleTOD==='siang';
  for(let i=0;i<10;i++){const bx=-170+i*38+h2(i,3)*14,bh=40+h2(i,5)*60,bw=20+h2(i,7)*18,bz=camZ+400+h2(i,9)*30;
    const sc=[[58,26,58],[46,40,68],[68,46,42],[40,54,60],[74,60,46]][i%5],hz2=hz(bz-camZ);
    Q([bx,0,bz],[bx+bw,0,bz],[bx+bw,bh,bz],[bx,bh,bz],mix(sc,hz2),bz-camZ);
    const nc=3+(i%3),nr=Math.max(4,bh/9|0);
    for(let r=0;r<nr;r++)for(let c2=0;c2<nc;c2++){const q=h2(i*31+c2*7,r*3+1),q2=h2(i*17+c2*3,r*11+5);
      const wx=bx+1.5+(bw-3)*(c2+.18)/nc,wy=2.5+(bh-4)*(r+.2)/nr,ww=(bw-3)/nc*(noonSky?0.68:0.6),wh=(bh-4)/nr*(noonSky?0.62:0.55);
      const warm=q<WINLIT*.65?[255,205,120]:q<WINLIT*.92?[255,190,120]:q<WINLIT?[255,150,90]:null;
      const wc=warm?[Math.round(warm[0]*WIN_T[0]),Math.round(warm[1]*WIN_T[1]),Math.round(warm[2]*WIN_T[2])]:noonSky?(q2<.33?[168,198,232]:q2<.66?[96,128,175]:[196,216,240]):q2<.5?[52,66,88]:[34,44,62];
      Q([wx,wy,bz],[wx+ww,wy,bz],[wx+ww,wy+wh,bz],[wx,wy+wh,bz],mix(wc,hz2),bz-camZ);}
    if(i%3===0)Q([bx+bw*.25,bh,bz],[bx+bw*.75,bh,bz],[bx+bw*.75,bh+6,bz],[bx+bw*.25,bh+6,bz],mix(sc,hz2),bz-camZ);
    if(i%4===1){const ax=bx+bw*0.5;Q([ax-0.4,bh,bz],[ax+0.4,bh,bz],[ax+0.4,bh+7,bz],[ax-0.4,bh+7,bz],mix([70,72,82],hz2),bz-camZ);}}
  for(const b of B)bld(b);
  // R33: car shadows. The sun sits ahead-right, so shadows fall toward the
  // camera (-z) and slightly left (-x). Length/alpha come from the time
  // preset: short + hard at noon, long at sunset. Emitted right before each
  // car() call so the car paints over its own shadow (insertion order).
  // The near end is clamped to camZ+2.5 — Q() drops quads with a corner
  // at dz<2, and the hero's long sunset shadow would otherwise vanish.
  // R40-D: bayangan ikut elevasi matahari — siang pendek + samar (dulu
  // trapesium hitam besar: flare +0.8/sisi + alpha .45 tepi keras, padahal
  // matahari siang ~57° = bayangan pendek di bawah mobil). Tepi lunak dari
  // 2 lapis: luar samar sedikit lebih lebar, dalam lebih gelap seukuran mobil.
  const carShad=(cx,cz,w,l)=>{const L=PAL.shadowLen,z0=Math.max(cz-l/2-L,camZ+2.5),sx2=-0.15*L;
    Q([cx-w/2-.55+sx2,.02,z0],[cx+w/2+.55+sx2,.02,z0],[cx+w/2+.3,.02,cz+l/2],[cx-w/2-.3,.02,cz+l/2],'rgba(0,0,0,'+(PAL.shadowA*0.35)+')',cz-camZ);
    Q([cx-w/2-.25+sx2,.02,z0],[cx+w/2+.25+sx2,.02,z0],[cx+w/2,.02,cz+l/2],[cx-w/2,.02,cz+l/2],'rgba(0,0,0,'+PAL.shadowA+')',cz-camZ);};
  carShad(0,camZ+17,3.6,6.6);car({x:0,z:camZ+17,w:3.6,h:1.5,l:6.6,c:[180,45,65],hero:1}); // R36V2: hero title merah gelap (Huracan; dulu [30,30,44] navy — samakan keluarga merah hero 3D)
  carShad(-5.5,camZ+48,3.2,6.2);car({x:-5.5,z:camZ+48,w:3.2,h:1.5,l:6.2,c:[12,12,16],pol:1});
  carShad(6,camZ+88,3.2,6);car({x:6,z:camZ+88,w:3.2,h:1.4,l:6,c:[200,90,30]});
  carShad(-3,camZ+150,3.2,6);car({x:-3,z:camZ+150,w:3.2,h:1.4,l:6,c:[40,60,120]});
  // R33: the R31 parked cars (x=±9, z=camZ+40/34) are DELETED — Juna:
  // "mobil jangan ada di samping situ". No cars at the road edges.
  // street lamps
  for(let z=camZ+20;z<camZ+420;z+=45)for(const lx of[-14,14]){const pb=P(lx,0,z),pt=P(lx,7,z);if(!pb||!pt)continue;
    // R33: lamp shadow for the near lamps (long at sunset, skipped at noon)
    // + glow pools scaled by the preset lamp gain (0.05 at noon = off).
    if(PAL.shadowLen>4&&z<camZ+130){const L=PAL.shadowLen*1.2,z0=Math.max(z-L,camZ+2.5);
      Q([lx-.3-.15*L,.02,z0],[lx+.3-.15*L,.02,z0],[lx+.3,.02,z],[lx-.3,.02,z],'rgba(0,0,0,'+(PAL.shadowA*.7)+')',z-camZ);}
    ops.push({d:pb[2],f(){x.save();x.globalCompositeOperation='lighter';
      const gr=x.createRadialGradient(pb[0],pb[1],2,pb[0],pb[1],cl(900/pb[2],20,90));
      gr.addColorStop(0,'rgba(255,180,100,'+(0.16*PAL.lamp)+')');gr.addColorStop(1,'rgba(255,180,100,0)');
      x.fillStyle=gr;x.beginPath();x.ellipse(pb[0],pb[1],cl(900/pb[2],20,90),cl(300/pb[2],8,30),0,0,7);x.fill();x.restore();
      x.strokeStyle='#3a3040';x.lineWidth=cl(500/pb[2],1,5);x.beginPath();x.moveTo(pb[0],pb[1]);x.lineTo(pt[0],pt[1]);x.stroke();
      // R36-ROADS item 9: kepala lampu dulu bola kuning di ujung tiang tipis —
      // di kejauhan tiang hilang, bola kebaca kotak kuning melayang. Kini ada
      // LENGAN dari ujung tiang ke arah jalan + HOUSING kotak di ujung lengan +
      // lensa di bawah housing, jadi kepala jelas nempel di tiang.
      const aL=cl(600/pb[2],4,20),aX=pt[0]+(lx<0?aL:-aL),aY=pt[1]+2;
      x.strokeStyle='#3a3040';x.lineWidth=cl(400/pb[2],1,4);x.beginPath();x.moveTo(pt[0],pt[1]);x.lineTo(aX,aY);x.stroke();
      const hw2=cl(500/pb[2],3,12),hh2=cl(160/pb[2],2,5);
      x.fillStyle='#2a2430';x.fillRect(aX-hw2/2,aY-hh2/2,hw2,hh2);
      x.fillStyle='rgba(255,217,160,'+(0.25*Math.min(1,PAL.lamp))+')';x.beginPath();x.arc(aX,aY+hh2/2,cl(700/pb[2],3,22),0,7);x.fill();
      // R40-D BUG: lensa dalam dulu '#ffd9a0' SOLID tanpa gate PAL.lamp —
      // orb lampu menyala bulat terang di siang (lamp 0.05). Kini ikut gate:
      // menyala hanya bila lamp>0.02; kalau tidak, kaca dingin redup.
      x.fillStyle=PAL.lamp>0.02?('rgba(255,217,160,'+(0.9*Math.min(1,PAL.lamp))+')'):'rgba(160,175,200,0.55)';x.beginPath();x.arc(aX,aY+hh2/2+1,cl(220/pb[2],1.5,7),0,7);x.fill();}});}
  sign(-1,camZ+40,camZ+120,'NEON HARBOR','#35f0ff');
  sign(1,camZ+100,camZ+160,'CASINO','#ff5ca8');
  sign(-1,camZ+220,camZ+300,'MOTEL','#ffd23e');
  // R36 PALEM TITLE: 5 palem di tepi jalan (x=±17.5, di luar trotoar 16,
  // sejajar lampu ±14 tapi fase z beda 22 unit supaya tidak menumpuk tiang
  // lampu), selang-seling kiri/kanan. Dulu title TANPA pohon sama sekali —
  // itulah kenapa Juna bilang "kita gada pohon". Kanopi 2 lapis seperti
  // palem chase (pita vertikal, bukan kipas datar).
  // R36v2: baris mulai camZ+60 (dulu +42) — palem terdekat v1 jatuh di
  // x~373, setengah kanopinya ketutup panel judul (panel sampai x 360).
  for (let pi = 0; pi < 5; pi += 1) palmT(pi % 2 === 0 ? -17.5 : 17.5, camZ + 60 + pi * 90);
  // JETFIX Bug 5 (title): sun drawn BEFORE the 3D ops so buildings occlude
  // it (was: after 3D, disc pasted over facades — same bug as chase-cam).
  const sg=x.createRadialGradient(sx,sy,4,sx,sy,PAL.sunGr);
  sg.addColorStop(0,PAL.sunG0);sg.addColorStop(.25,PAL.sunG1);sg.addColorStop(1,PAL.sunG2);
  x.fillStyle=sg;x.fillRect(sx-PAL.sunGr-10,sy-PAL.sunGr-10,(PAL.sunGr+10)*2,(PAL.sunGr+10)*2); // R36: rect ikut sunGr (siang 170, dulu rect 300 memotong gradien)
  // R40-D: cakram matahari bergradasi (inti terang -> tepi hangat), bukan
  // piringan putih polos — sunCore/sunEdge per preset di TITLE_PAL.
  const sdg=x.createRadialGradient(sx,sy,1,sx,sy,PAL.sunR);
  sdg.addColorStop(0,PAL.sunCore);sdg.addColorStop(.65,PAL.sunDisc);sdg.addColorStop(1,PAL.sunEdge);
  x.fillStyle=sdg;x.beginPath();x.arc(sx,sy,PAL.sunR,0,7);x.fill();
  // R36-ROADS item 11: matahari siang polos (cakram putih + halo kecil) — halo
  // luar lebar + cincin tipis di tepi cakram supaya matahari siang kebaca
  // bercahaya, bukan stiker putih. Hanya siang; preset lain tak berubah.
  if(titleTOD==='siang'){
    const sg2=x.createRadialGradient(sx,sy,PAL.sunR,sx,sy,260);
    sg2.addColorStop(0,'rgba(255,255,230,.28)');sg2.addColorStop(.5,'rgba(255,255,220,.10)');sg2.addColorStop(1,'rgba(255,255,220,0)');
    x.fillStyle=sg2;x.fillRect(sx-260,sy-260,520,520);
    x.strokeStyle='rgba(255,255,255,.55)';x.lineWidth=1.5;x.beginPath();x.arc(sx,sy,PAL.sunR+3,0,7);x.stroke();
  }
  if(PAL.stars){x.save();for(let i=0;i<70;i++){const sx2=h2(i,11)*W,sy2=h2(i,23)*(HOR-40);x.globalAlpha=.35+.65*h2(i,37);x.fillStyle='#dfe6ff';x.fillRect(sx2,sy2,1.6,1.6);}x.restore();}
  ops.sort((a,b)=>b.d-a.d);for(const o of ops)o.f();ops.length=0;
  // R31: warm sunset bounce on the road — the asphalt near the camera was
  // pitch black; a faint warm glow keeps it readable without washing out
  // the hero (peak alpha .15, 'lighter').
  x.save();x.globalCompositeOperation='lighter';
  const wg=x.createRadialGradient(CX,HOR+130,10,CX,HOR+130,560);
  wg.addColorStop(0,PAL.roadGlow);wg.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=wg;x.fillRect(0,HOR-60,W,H-HOR+60);x.restore();
  // hero taillight glow
  const tp=P(0,1,camZ+17-3.3);if(tp){x.save();x.globalCompositeOperation='lighter';
    for(const gx of[-1.2,1.2]){const gp=P(gx,1,camZ+17-3.3);if(!gp)continue;
      const rg=x.createRadialGradient(gp[0],gp[1],1,gp[0],gp[1],26);rg.addColorStop(0,'rgba(255,80,100,'+(0.55*TL)+')');rg.addColorStop(1,'rgba(255,80,100,0)');
      x.fillStyle=rg;x.fillRect(gp[0]-26,gp[1]-26,52,52);}x.restore();}
  // TITLE-FIX (police glow): the patrol car at camZ+48 reads as a dark
  // blob at title distance — a soft red/blue halo over its light bar
  // (fixed staging position, same pattern as the hero glow above).
  // Alpha floors at 0.28 so it reads even at noon (unlike the hero
  // glow, which is TL-gated and nearly invisible in daylight).
  const pp=P(-5.5,1.75,camZ+44.5);if(pp){x.save();x.globalCompositeOperation='lighter';
    const pgA=0.28+0.22*TL;
    for(const [gx,col] of [[-0.6,'255,60,60'],[0.6,'60,120,255']]){const gp=P(-5.5+gx,1.75,camZ+44.5);if(!gp)continue;
      const rg=x.createRadialGradient(gp[0],gp[1],1,gp[0],gp[1],30);rg.addColorStop(0,'rgba('+col+','+pgA+')');rg.addColorStop(1,'rgba('+col+',0)');
      x.fillStyle=rg;x.fillRect(gp[0]-30,gp[1]-30,60,60);}x.restore();}
  // HUD
  x.textAlign='left';x.textBaseline='alphabetic';
  // TITLE-MINIMAP: the round radar used to be painted here (own design,
  // dark disc + grid + yellow route) while gameplay uses the square map
  // (minimap.js) — Juna: "dari mapnya beda banget". Deleted: the shared
  // square minimap is now drawn by drawTitle2 (ui2.js) in this same slot.
  rr(CX-200,16,400,46,8);x.fillStyle='rgba(8,8,24,.75)';x.fill();x.strokeStyle='#c9a227';x.lineWidth=1.5;x.stroke();
  x.fillStyle='#ffd23e';x.font='bold 11px sans-serif';x.textAlign='center';x.fillText('CHAPTER 12/12: THE HARBOR KING',CX,33);
  x.fillStyle='#fff';x.font='bold 15px sans-serif';x.fillText('STEAL A SPEEDBOAT AND REACH THE MARINA',CX,52);x.textAlign='left';
  rr(W-216,16,200,92,8);x.fillStyle='rgba(8,8,24,.75)';x.fill();
  x.fillStyle='#ffd23e';x.font='18px sans-serif';x.fillText('★★★★',W-204,40);x.fillStyle='rgba(255,255,255,.25)';x.fillText('★',W-140,40);
  x.fillStyle='#4dff88';x.font='bold 22px sans-serif';x.fillText('$2,150',W-204,66);
  x.fillStyle='#333';x.fillRect(W-204,74,176,7);x.fillStyle='#ff5c8a';x.fillRect(W-204,74,132,7);
  x.fillStyle='#333';x.fillRect(W-204,86,176,7);x.fillStyle='#4d9fff';x.fillRect(W-204,86,106,7);
  x.fillStyle='#35f0ff';x.font='10px sans-serif';x.fillText('JAX MARLOWE',W-204,102);
  // R31: no speedo on title — the backdrop used to paint a hardcoded "142
  // MPH" here that drawTitle2 had to cover with a pasted road strip (the
  // faint rectangle at bottom-right). The cover in ui2.js is removed too.
  x.fillStyle='#fff';x.font='12px sans-serif';x.fillText('DAY 1 · 21:02 · HARBOR · HEAT 30',16,H-24);
  const vg=x.createRadialGradient(CX,H/2,H*.35,CX,H/2,H*.85);
  vg.addColorStop(0,'rgba(10,5,15,0)');vg.addColorStop(1,'rgba(10,5,15,.35)');
  x.fillStyle=vg;x.fillRect(0,0,W,H);
}
export function drawCity3DFrame(ctx, t) {
  x = ctx; W = ctx.canvas.width; H = ctx.canvas.height; CX = W / 2; HOR = H * .46;
  frame(t);
}

// ---------------------------------------------------------------------------
// 3D chase-cam gameplay (round 20): the SAME live 2D world state, rendered
// in 3D from a smooth chase camera behind the hero (car / boat / on foot).
// No gameplay logic here — only a different way of seeing the world.
// World px -> 3D units: a car is ~4.6 long, a road ~7 wide, a block ~22 wide.
const CS = 0.1;
const hexC = new Map();
function hx3(hex) {
  let c = hexC.get(hex);
  if (!c) {
    const n = parseInt(hex.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexC.set(hex, c);
  }
  return c;
}
// chase camera state (module-level: persists across frames, snaps on teleport)
let ccYaw = 0, ccX = 0, ccZ = 0, ccInit = false, ccLast = 0, ccHX = 0, ccHY = 0;
let cfX = 0, cfZ = 1; // camera forward in world XZ
export function resetChaseCam() { ccInit = false; }
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
// world (wx, wy, wz) in 3D units -> screen, through the chase camera
function cP(wx, wy, wz) {
  const dx = wx - ccX, dz = wz - ccZ;
  const lx = -dx * cfZ + dz * cfX; // screen-right = (-fz, fx) for the game compass
  const lz = dx * cfX + dz * cfZ;
  return P(lx, wy, lz);
}
// VB-22: same projection WITHOUT the near-plane cut — a target behind the
// camera still yields a (mirrored) screen direction, so the HUD can clamp
// it to the frame edge instead of dropping it. Returns {x, y, behind};
// x/y are screen px, behind is true when the point is behind the near
// plane (depth < 2). Only valid after drawChase3D ran this frame (the
// camera state is module-level and persists across frames).
export function projectChase(wx, wy, wz) {
  const dx = wx - ccX, dz = wz - ccZ;
  const lx = -dx * cfZ + dz * cfX;
  const lz = dx * cfX + dz * cfZ;
  const d = (lz - camZ) || 2;
  return { x: CX + lx * fovF / d, y: HOR - (wy - camH) * fovF / d, behind: d < 2 };
}
function fwdD(wx, wz) { return (wx - ccX) * cfX + (wz - ccZ) * cfZ; }
function QW(c, col, dep) {
  // clip the quad in camera space against the near plane (lz >= 2) so quads
  // straddling the camera keep their visible part instead of vanishing whole
  let pts = [];
  for (const q of c) {
    const dx = q[0] - ccX, dz = q[2] - ccZ;
    pts.push([-dx * cfZ + dz * cfX, q[1], dx * cfX + dz * cfZ]);
  }
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const aIn = a[2] >= 2, bIn = b[2] >= 2;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const k = (2 - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, 2]);
    }
  }
  if (out.length < 3) return;
  const p = out.map(q => P(q[0], q[1], q[2]));
  if (p.includes(0)) return;
  let d = dep;
  if (d === undefined) { d = Infinity; for (const q of out) if (q[2] < d) d = q[2]; }
  else if (d === 'far') { d = -Infinity; for (const q of out) if (q[2] > d) d = q[2]; }
  ops.push({ d, f() { x.fillStyle = col; x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]); x.closePath(); x.fill(); } });
}
// yawed box: center (cx, cz) in 3D units, base y0, w along right, h up, d along forward
let shadeK = 1; // sunset: faces toward the camera fall into shadow (set per frame)
function box3(cx, y0, cz, w, h, d, a, col, fogD, depOff) {
  const c = hx3(col);
  const t = fogD === undefined ? 0 : hz(fogD);
  const fx = Math.cos(a), fz = Math.sin(a), rx = -fz, rz = fx;
  const hw = w / 2, hd = d / 2, y1 = y0 + h;
  const cor = (sr, sf, y) => [cx + rx * sr * hw + fx * sf * hd, y, cz + rz * sr * hw + fz * sf * hd];
  const dep = (face) => {
    let m = Infinity;
    for (const q of face) { const dd = fwdD(q[0], q[2]); if (dd < m) m = dd; }
    return m + (depOff || 0);
  };
  const f1 = [cor(-1, -1, y1), cor(1, -1, y1), cor(1, 1, y1), cor(-1, 1, y1)];
  const f2 = [cor(-1, -1, y0), cor(-1, 1, y0), cor(-1, 1, y1), cor(-1, -1, y1)];
  const f3 = [cor(1, -1, y0), cor(1, -1, y1), cor(1, 1, y1), cor(1, 1, y0)];
  const f4 = [cor(-1, 1, y0), cor(1, 1, y0), cor(1, 1, y1), cor(-1, 1, y1)];
  const f5 = [cor(-1, -1, y0), cor(-1, -1, y1), cor(1, -1, y1), cor(1, -1, y0)];
  // JETFIX-2 Bug 2: backface culling for the 4 side faces. box3 painted all
  // faces and sorted by nearest corner, so when the camera sits nearly
  // head-on to a box (inside its footprint: |g| < hd, |r| < hw) the two
  // side faces TIED the front face's depth and, pushed later, painted OVER
  // its edges as dark "wall" strips (probe: bld@2130,210 f5 (460,106)-
  // (520,771) + f4 (807,106)-(890,771), both backfaces, d=43.9 = f3's
  // depth — the circled left wall). g/r = camera offset from the box
  // centre along forward/right; a side face is visible only if the camera
  // is beyond its plane (|g| > hd for f4/f5, |r| > hw for f2/f3). f1 (top)
  // is left alone: pushed first, the front face covers it when it is a
  // backface, and culling it would thin palm fronds / the UFO crown.
  const g = fx * (ccX - cx) + fz * (ccZ - cz), r = rx * (ccX - cx) + rz * (ccZ - cz);
  QW(f1, sh(c, 1.3 * shadeK, t), dep(f1));
  // round 22: the sunset bounce floor applies to EVERY vertical face, not
  // just the west face — round 21 only warmed f5, but the chase camera
  // looks straight at the long side walls (f2/f3), which stayed pitch
  // black and read as void. Same floor as f5: +0.22 warm bounce.
  if (r < -hw) QW(f2, shadeK < 1 ? shW(c, 0.8 * shadeK + 0.22, t) : sh(c, 0.8 * shadeK, t), dep(f2));
  if (r > hw) QW(f3, shadeK < 1 ? shW(c, 0.95 * shadeK + 0.22, t) : sh(c, 0.95 * shadeK, t), dep(f3));
  if (g > hd) QW(f4, shadeK < 1 ? shW(c, 1.05 * shadeK + 0.22, t) : sh(c, 1.05 * shadeK, t), dep(f4));
  if (g < -hd) QW(f5, shadeK < 1 ? shW(c, 0.65 * shadeK + 0.22, t) : sh(c, 0.65 * shadeK, t), dep(f5));
}
// vertical quad facing along yaw a, centered fOff forward / rOff right of (cx, cz)
function vQuad(cx, cz, a, fOff, rOff, w, y0, y1, col, dep) {
  const fx = Math.cos(a), fz = Math.sin(a), rx = -fz, rz = fx;
  const bx = cx + fx * fOff + rx * rOff, bz = cz + fz * fOff + rz * rOff;
  const hw = w / 2;
  QW([[bx - rx * hw, y0, bz - rz * hw], [bx + rx * hw, y0, bz + rz * hw], [bx + rx * hw, y1, bz + rz * hw], [bx - rx * hw, y1, bz - rz * hw]], col, dep);
}
// flat ground quad, world-px rect (x0,y0)-(x1,y1), at height y (3D units).
// Depth = farthest corner: ground is always UNDER everything above it, so it
// must be painted first even when its near edge is closer than a car on it.
function flatQuad(x0, y0, x1, y1, h, col) {
  QW([[x0 * CS, h, y0 * CS], [x1 * CS, h, y0 * CS], [x1 * CS, h, y1 * CS], [x0 * CS, h, y1 * CS]], col, 'far');
}
// thin horizontal strip facing up (rim light): center (cx, cz), w along right,
// th along forward, at height y
function topStrip(cx, cz, a, fOff, rOff, w, th, y, col) {
  const fx = Math.cos(a), fz = Math.sin(a), rx = -fz, rz = fx;
  const bx = cx + fx * fOff + rx * rOff, bz = cz + fz * fOff + rz * rOff;
  const hw = w / 2, ht = th / 2;
  QW([[bx - rx * hw - fx * ht, y, bz - rz * hw - fz * ht], [bx + rx * hw - fx * ht, y, bz + rz * hw - fz * ht],
    [bx + rx * hw + fx * ht, y, bz + rz * hw + fz * ht], [bx - rx * hw + fx * ht, y, bz - rz * hw + fz * ht]], col);
}
function camRel(wx, wy) { // [forward, lateral] of a world-px point vs the chase camera
  const dx = wx * CS - ccX, dz = wy * CS - ccZ;
  return [dx * cfX + dz * cfZ, -dx * cfZ + dz * cfX];
}
function inRange(wx, wy, fwdMax, latMax) {
  const r = camRel(wx, wy);
  return r[0] > -12 && r[0] < fwdMax && Math.abs(r[1]) < latMax;
}
let rimOn = true; // warm rim light while the sun is up (set per frame)
let chaseTL = 1; // R38: taillight gain for the chase renderer (set per frame from daylight — same steps as TITLE_PAL.tlGain)
function tlC(r, g, b) { return 'rgb(' + ((r * chaseTL) | 0) + ',' + ((g * chaseTL) | 0) + ',' + ((b * chaseTL) | 0) + ')'; }
// ---- R35-F7-RAMP-START (F7-A stunt jumps, canvas fallback) ----
// R35-F7: stunt ramp — 3 LOW rising yellow steps (0.18/0.36/0.54 — the
// 4-step 1.28-high version read as a giant staircase in the first WebGL2
// shot) + chevron approach on the road, with a depth-sorted floating
// label. FIX3-A: width 56 -> 36 (road 72: asphalt visible each side) +
// steps alternate yellow/dark (was two near-identical yellows merging into
// one flat slab) — mirror of the webgl2.js block, same numbers. World px
// in, CS-scaled out (same convention as car3d). ONE
// block: everything F7-A in this file is this function + the loop below
// (F7-RAMP-START..END). Lamps, tokens, buildings and roads are NOT
// touched (zona R36/R38).
function drawRamp3D(r) {
  const fx = Math.cos(r.angle), fz = Math.sin(r.angle);
  const dep = Math.hypot(r.x * CS - ccX, r.y * CS - ccZ);
  for (let i = 0; i < 2; i += 1) {
    const ox = (r.x - fx * (35 + i * 14)) * CS, oz = (r.y - fz * (35 + i * 14)) * CS;
    box3(ox, 0.05, oz, 36 * CS, 0.08, 10 * CS, r.angle, i % 2 ? '#14141a' : '#ffe55c', dep);
  }
  for (let i = 0; i < 3; i += 1) {
    const ox = (r.x + fx * (-21 + i * 14)) * CS, oz = (r.y + fz * (-21 + i * 14)) * CS;
    box3(ox, 0.05, oz, 36 * CS, 0.18 * (i + 1), 14 * CS, r.angle, i % 2 ? '#1f1f24' : '#ffe14d', dep);
  }
  const lp = cP(r.x * CS, 3.4, r.y * CS);
  if (lp) {
    ops.push({ d: lp[2], f() {
      x.save();
      x.font = 'bold ' + Math.round(cl(900 / lp[2], 11, 20)) + 'px sans-serif'; x.textAlign = 'center';
      x.fillStyle = '#ffd23e'; x.fillText('STUNT JUMP ▲', lp[0], lp[1]);
      x.restore();
    } });
  }
}
// ---- R35-F7-RAMP-END (F7-A stunt jumps, canvas fallback) ----
function car3d(wx, wy, angle, len, wid, color, o) {
  let L = len * CS, Wd = wid * CS;
  const bodyH = o.hero ? 0.72 : 0.8;
  if (o.hero) Wd *= 1.08; // F2: hero car reads wider / lower
  // T2: vehicle-type recipes (T1 supplies o.type from traffic.js; default sedan).
  // Only body height changes here — the type features live at the end of car3d.
  const VT = { bus: 2.1, fire: 1.7, ambulance: 1.55, apc: 1.35, van: 1.7, pickup: 1.15, taxi: 1 }[o.type || 'sedan'] || 1;
  const BH = bodyH * VT;
  const cx = wx * CS, cz = wy * CS;
  const dep = Math.hypot(cx - ccX, cz - ccZ);
  const fx = Math.cos(angle), fz = Math.sin(angle);
  // V3 contact shadow: soft wide layer + tight dark layer under the body
  flatQuad(wx - len / 2 - 4, wy - wid / 2 - 4, wx + len / 2 + 4, wy + wid / 2 + 4, 0.02, 'rgba(0,0,0,0.30)');
  flatQuad(wx - len / 2 - 1, wy - wid / 2 - 1, wx + len / 2 + 1, wy + wid / 2 + 1, 0.025, 'rgba(0,0,0,0.45)');
  if (o.hero) flatQuad(wx - len / 2 - 6, wy - wid / 2 - 6, wx + len / 2 + 6, wy + wid / 2 + 6, 0.03, 'rgba(255,77,157,0.28)');
  // V2 dark outline: a slightly larger dark shell, forced behind the body
  box3(cx, 0.1, cz, Wd + 0.4, BH + 0.12, L + 0.4, angle, '#0a0a0e', dep, 2.5);
  box3(cx, 0.15, cz, Wd, BH, L, angle, color, dep);
  const bx = cx - fx * L * 0.06, bz = cz - fz * L * 0.06;
  box3(bx, 0.95, bz, Wd * 0.78, 0.55, L * 0.52, angle, o.glass || '#1a2230', dep);
  // V1 rim light: warm strips on the cabin roof front edge + body top edges
  if (rimOn && o.rim !== false) {
    const rim = mix([255, 179, 92], hz(dep));
    topStrip(cx, cz, angle, L * 0.2, 0, Wd * 0.7, 0.4, 1.53, rim);
    topStrip(cx, cz, angle, 0, -Wd / 2 + 0.06, L * 0.55, 0.22, 0.15 + BH + 0.03, rim);
    topStrip(cx, cz, angle, 0, Wd / 2 - 0.06, L * 0.55, 0.22, 0.15 + BH + 0.03, rim);
  }
  vQuad(cx, cz, angle, L * 0.2, 0, Wd * 0.7, 1.0, 1.42, 'rgba(120,180,230,0.5)');
  vQuad(cx, cz, angle, -L * 0.32, 0, Wd * 0.7, 1.0, 1.42, 'rgba(120,180,230,0.4)');
  for (const s of [-1, 1]) {
    vQuad(cx, cz, angle, -L / 2 - 0.06, s * Wd * 0.28, Wd * 0.22, 0.45, 0.72, o.hero ? tlC(255, 92, 122) : tlC(255, 59, 48));
    vQuad(cx, cz, angle, L / 2 + 0.05, s * Wd * 0.28, Wd * 0.3, 0.4, 0.76, '#0c0e14'); // T2: headlight housing
    vQuad(cx, cz, angle, L / 2 + 0.06, s * Wd * 0.28, Wd * 0.22, 0.45, 0.7, '#ffe9a8');
    // REWORK: hero wheels BIGGER + protruding past the body sides (they were
    // flush + dark, invisible from behind at chase-cam distance).
    const wOut = o.hero ? Wd / 2 - 0.05 : Wd / 2 - 0.16;
    const wW = o.hero ? 0.8 : 0.62, wH = o.hero ? 0.72 : 0.58, wL = o.hero ? 1.15 : 0.95;
    const wxp = cx + fx * (L / 2 - 0.7) + (-fz) * s * wOut, wzp = cz + fz * (L / 2 - 0.7) + fx * s * wOut;
    box3(wxp, 0.05, wzp, wW, wH, wL, angle, '#0a0a0e', dep);
    const wxp2 = cx - fx * (L / 2 - 0.7) + (-fz) * s * wOut, wzp2 = cz - fz * (L / 2 - 0.7) + fx * s * wOut;
    box3(wxp2, 0.05, wzp2, wW, wH, wL, angle, '#0a0a0e', dep);
    // REWORK hub v2: on the REAR face of the rear wheel, explicit dep in
    // front of the body rear face. v1 put it on the wheel's OUTER face with
    // a sign error (rOff) so it landed on the FRONT wheel and read as a
    // 4px sliver at a grazing angle; the rear face is what chase-cam sees.
    const hubW = o.hero ? 0.55 : 0.4, hubC = o.hero ? '#d8dce2' : '#c8ccd4';
    const hubDep = dep - L / 2 - 0.5;
    vQuad(cx, cz, angle, -(L / 2 - 0.7), s * wOut, hubW, 0.12, 0.5, hubC, hubDep);
    vQuad(cx, cz, angle, -(L / 2 - 0.7), s * wOut, o.hero ? 0.22 : 0.14, 0.22, 0.4, '#20242a', hubDep);
    // T2: side character line + door seam + handle + mirror (one per side)
    const lx = (-fz) * s * (Wd / 2 + 0.03), lz = fx * s * (Wd / 2 + 0.03);
    // REWORK: thin 0.05 lines vanish at chase-cam distance — thicker line
    // + lower rub strip + a sky streak on the side glass (visible side).
    const clW = o.hero ? 0.09 : 0.05;
    box3(cx + lx, 0.48, cz + lz, clW, 0.07, L * 0.62, angle, '#14141a', dep);
    if (o.hero) box3(cx + lx, 0.3, cz + lz, clW, 0.06, L * 0.5, angle, '#14141a', dep);
    if (o.hero) vQuad(cx, cz, angle + Math.PI / 2, s * (Wd / 2 + 0.03), -L * 0.08, L * 0.42, 1.06, 1.34, 'rgba(150,195,235,0.55)');
    box3(cx + fx * (L * 0.08) + lx, 0.35, cz + fz * (L * 0.08) + lz, 0.05, 0.5, 0.08, angle, '#14141a', dep);
    box3(cx + fx * (L * 0.05) + lx, 0.64, cz + fz * (L * 0.05) + lz, 0.05, 0.05, 0.3, angle, '#0c0e14', dep);
    box3(cx + fx * (L * 0.22) + lx * 1.6, 1.0, cz + fz * (L * 0.22) + lz * 1.6, 0.24, 0.16, 0.14, angle, '#14141a', dep);
  }
  // T2: front grill (all cars) — dark band across the nose, below the lights
  vQuad(cx, cz, angle, L / 2 + 0.07, 0, Wd * 0.7, 0.28, 0.44, '#0c0e14');
  if (o.hero) {
    // round 21 hero rear (all emissive / reflective: raw colours, no shadeK)
    vQuad(cx, cz, angle, -L / 2 - 0.08, 0, Wd * 0.96, 0.48, 0.86, tlC(255, 42, 74)); // REWORK: thicker taillight bar, full width
    vQuad(cx, cz, angle, -L / 2 - 0.1, 0, Wd * 0.96, 0.56, 0.8, tlC(255, 125, 149)); // hot core of the bar
    vQuad(cx, cz, angle, -L / 2 - 0.075, 0, Wd * 0.94, 0.44, 0.48, 'rgba(0,0,0,0.6)'); // dark gap below the bar
    vQuad(cx, cz, angle, -L * 0.32 - 0.07, 0, Wd * 0.72, 1.0, 1.42, 'rgba(150,195,235,0.78)', dep - L / 2 - 1.0); // REWORK rear glass: pale sky glass + explicit dep (a red rear quad at d=14.00 covered it)
    vQuad(cx, cz, angle, -L * 0.32 - 0.07, 0, Wd * 0.6, 1.22, 1.32, 'rgba(200,220,245,0.45)', dep - L / 2 - 1.0); // R38: pantulan horizontal halus (ganti bright sky streak vertikal yang kebaca garis diagonal)
    topStrip(cx, cz, angle, -L * 0.32, 0, Wd * 0.68, 0.3, 1.44, 'rgba(255,200,130,0.8)'); // glass top rim
    box3(cx - fx * (L / 2 - 0.3), 1.02, cz - fz * (L / 2 - 0.3), Wd * 0.96, 0.09, 0.5, angle, '#14141a', dep); // spoiler
    topStrip(cx, cz, angle, -(L / 2 - 0.3), 0, Wd * 0.9, 0.5, 1.13, 'rgba(255,179,92,0.9)'); // spoiler rim light
    vQuad(cx, cz, angle, -L / 2 - 0.07, 0, Wd * 0.96, 0.12, 0.38, '#14141a'); // lower bumper
    vQuad(cx, cz, angle, -L / 2 - 0.26, -Wd * 0.3, 0.2, 0.16, 0.34, '#c8ccd4'); // exhaust L
    vQuad(cx, cz, angle, -L / 2 - 0.26, Wd * 0.3, 0.2, 0.16, 0.34, '#c8ccd4'); // exhaust R
    vQuad(cx, cz, angle, -L / 2 - 0.26, 0, 0.55, 0.26, 0.46, '#e8e4d8'); // plate
    vQuad(cx, cz, angle, -L / 2 - 0.27, 0, Wd * 0.96, 0.38, 0.85, 'rgba(255,150,90,0.16)'); // warm bounce wash
    topStrip(cx, cz, angle, L * 0.2, 0, Wd * 0.7, 0.4, 1.53, 'rgba(255,210,140,0.95)'); // roof Fresnel: sky in the paint
    // T2: trunk seam + deck edge + bigger bumper + diffuser + shark fin + glass frame
    vQuad(cx, cz, angle, -L / 2 - 0.07, 0, Wd * 0.9, 0.85, 0.91, 'rgba(0,0,0,0.55)'); // deck edge seam (0.44 seam replaced by trim line)
    // T2b: two-tone rear — darker lower panel so the rear reads in bands, not one flat slab
    // REWORK: solid dark valance + bright trim line (the 0.32 wash was invisible).
    vQuad(cx, cz, angle, -L / 2 - 0.075, 0, Wd * 0.96, 0.08, 0.44, '#171017');
    vQuad(cx, cz, angle, -L / 2 - 0.08, 0, Wd * 0.96, 0.44, 0.49, 'rgba(255,179,92,0.65)');
    box3(cx - fx * (L / 2 + 0.05), 0.06, cz - fz * (L / 2 + 0.05), Wd * 0.98, 0.3, 0.4, angle, '#16161c', dep);
    for (const ds of [-0.28, 0, 0.28]) vQuad(cx, cz, angle, -L / 2 - 0.26, ds * Wd, 0.1, 0.06, 0.3, '#0a0a0e');
    box3(cx - fx * (L * 0.18), 1.52, cz - fz * (L * 0.18), 0.16, 0.2, 0.4, angle, '#14141a', dep);
    vQuad(cx, cz, angle, -L * 0.32 - 0.005, 0, Wd * 0.76, 1.40, 1.44, '#0c0e14');
    vQuad(cx, cz, angle, -L * 0.32 - 0.005, 0, Wd * 0.76, 0.98, 1.02, '#0c0e14');
    vQuad(cx, cz, angle, -L * 0.32 - 0.005, -Wd * 0.36, 0.04, 0.98, 1.44, '#0c0e14');
    vQuad(cx, cz, angle, -L * 0.32 - 0.005, Wd * 0.36, 0.04, 0.98, 1.44, '#0c0e14');
    // sunroof + trunk wash as thin slabs with depOff -0.6 so the painter
    // puts them ON the roof/deck (plain topStrips lose the depth sort here)
    box3(cx - fx * 0.05, 1.5, cz - fz * 0.05, Wd * 0.55, 0.04, L * 0.28, angle, '#121620', dep, -1.2);
    box3(cx - fx * (L * 0.35), 0.87, cz - fz * (L * 0.35), Wd * 0.8, 0.04, 0.6, angle, '#ffb35c', dep, -0.6);
  }
  // T2: vehicle-type features (T1 supplies o.type via traffic.js — see
  // VEHICLES-HOOK.md in the track folder; default sedan = no extra quads)
  if (o.type === 'bus') {
    for (const s of [-1, 1]) {
      const lx = (-fz) * s * (Wd / 2 + 0.03), lz = fx * s * (Wd / 2 + 0.03);
      box3(cx + lx, 0.95, cz + lz, 0.05, 0.55, L * 0.78, angle, '#1a2230', dep);
    }
    box3(cx, BH + 0.1, cz, Wd * 0.5, 0.3, L * 0.3, angle, '#c8ccd4', dep);
    vQuad(cx, cz, angle, L / 2 + 0.08, 0, Wd * 0.5, BH * 0.7, BH * 0.85, '#ffd23e');
  } else if (o.type === 'fire') {
    for (const s of [-1, 1]) {
      const lx = (-fz) * s * (Wd / 2 + 0.03), lz = fx * s * (Wd / 2 + 0.03);
      box3(cx + lx, 0.62, cz + lz, 0.05, 0.16, L * 0.9, angle, '#e8e4d8', dep);
    }
    for (let li = -1; li <= 1; li += 1) box3(cx + (-fz) * li * 0.5, BH + 0.08, cz + fx * li * 0.5, 0.22, 0.14, L * 0.8, angle, '#c8ccd4', dep);
    vQuad(cx, cz, angle, L * 0.1, -Wd * 0.2, 0.5, BH + 0.1, BH + 0.3, '#ff4040');
    vQuad(cx, cz, angle, L * 0.1, Wd * 0.2, 0.5, BH + 0.1, BH + 0.3, '#4080ff');
  } else if (o.type === 'ambulance') {
    for (const s of [-1, 1]) {
      const lx = (-fz) * s * (Wd / 2 + 0.03), lz = fx * s * (Wd / 2 + 0.03);
      box3(cx + lx, 0.62, cz + lz, 0.05, 0.16, L * 0.9, angle, '#c0392b', dep);
    }
    vQuad(cx, cz, angle, -L / 2 - 0.08, 0, 0.5, 0.5, 0.95, '#c0392b');
    vQuad(cx, cz, angle, -L / 2 - 0.08, 0, 0.18, 0.62, 0.83, '#c0392b');
    vQuad(cx, cz, angle, L * 0.1, -Wd * 0.2, 0.5, BH + 0.1, BH + 0.3, '#ff4040');
    vQuad(cx, cz, angle, L * 0.1, Wd * 0.2, 0.5, BH + 0.1, BH + 0.3, '#4080ff');
  } else if (o.type === 'apc') {
    box3(cx, BH * 0.75, cz, Wd + 0.06, BH * 0.25, L * 0.95, angle, '#3a4a22', dep);
    box3(cx + fx * (L * 0.1), 0.15 + BH, cz + fz * (L * 0.1), 1.1, 0.5, 1.4, angle, '#4a5a2a', dep);
    box3(cx + fx * (L * 0.55), 0.15 + BH + 0.1, cz + fz * (L * 0.55), 0.18, 0.18, 1.6, angle, '#2c3418', dep);
  } else if (o.type === 'van') {
    for (const s of [-1, 1]) {
      const lx = (-fz) * s * (Wd / 2 + 0.03), lz = fx * s * (Wd / 2 + 0.03);
      box3(cx + lx, 0.95, cz + lz, 0.05, 0.5, L * 0.55, angle, '#1a2230', dep);
      box3(cx + fx * (L * 0.05) + lx, 0.35, cz + fz * (L * 0.05) + lz, 0.05, BH * 0.7, 0.08, angle, '#14141a', dep);
    }
  } else if (o.type === 'pickup') {
    box3(cx - fx * (L * 0.28), 0.15 + BH, cz - fz * (L * 0.28), Wd * 0.88, 0.06, L * 0.36, angle, '#0c0e14', dep);
  } else if (o.type === 'taxi') {
    box3(cx + fx * (L * 0.05), 1.52, cz + fz * (L * 0.05), 0.9, 0.28, 0.5, angle, '#ffd23e', dep);
    for (const s of [-1, 1]) {
      const lx = (-fz) * s * (Wd / 2 + 0.03), lz = fx * s * (Wd / 2 + 0.03);
      box3(cx + lx, 0.62, cz + lz, 0.05, 0.12, L * 0.7, angle, '#14141a', dep);
    }
  }
  if (o.pol) {
    const blink = Math.floor((o.t || 0) * 6) % 2 === 0;
    vQuad(cx, cz, angle, -L * 0.08, -Wd * 0.22, 0.5, 1.5, 1.78, blink ? '#ff4040' : '#2f6fd0');
    vQuad(cx, cz, angle, -L * 0.08, Wd * 0.22, 0.5, 1.5, 1.78, blink ? '#2f6fd0' : '#ff4040');
  }
}
function boat3d(wx, wy, angle, len, wid, color, o) {
  const L = len * CS, Wd = wid * CS;
  const cx = wx * CS, cz = wy * CS;
  const dep = Math.hypot(cx - ccX, cz - ccZ);
  const fx = Math.cos(angle), fz = Math.sin(angle);
  const rx = -fz, rz = fx;
  const pt = (f, r, y) => [cx + fx * f + rx * r, y, cz + fz * f + rz * r];
  const hero = !!o.hero; // VIPER R36: perahu hero = NH-90 VIPER (hitam + trim neon cyan)
  const VIPER = '#0b0e13', CYAN = '#22d3ee';
  const hullC = hero ? VIPER : color;
  const hullDk = sh(hx3(hullC), 0.62, hz(dep));
  const stripeC = hero ? CYAN : '#f5f5f5';
  // BOAT-FIX (VB-02/VB-12/VB-27): the old boat was 3 stacked boxes + a flat
  // white slab under it (read as a grey board) + 2 flat wake trapezoids
  // (read as a road). Rebuilt per graphics-bible 2.1/2.2: vertical transom
  // + waterline stripe, bow rising ~19 deg, 2 outboards, console + sloped
  // windshield + driver, side stripes, Kelvin V-wake + prop-wash foam.
  // Contact shadow is dark now (was a pale white slab).
  flatQuad(wx - len / 2 - 4, wy - wid / 2 - 4, wx + len / 2 + 4, wy + wid / 2 + 4, -0.22, 'rgba(0,0,0,0.25)');
  // hull base
  box3(cx, -0.25, cz, Wd, 0.7, L, angle, hullC, dep);
  // BOAT-REBUILD (VB-02/VB-12): the hull top face was one flat slab of
  // hull colour — from the chase-cam it read as a wide pink (hero) /
  // blue (police) field with nothing on it, and the BOAT batch admitted
  // the mid-deck was "still a wide pink field". The deck is now two-tone
  // like a real speedboat: coloured gunwale strips down each side, a
  // pale deck between them, a dark cockpit aft with a bench seat, and a
  // helm seat under the driver (his torso used to float above the deck).
  // Depth ties with the hull top face (same fwdD) are broken by
  // insertion order — the hull box paints first, the deck after it.
  // BOAT-REBUILD-V2: the v1 bow rose only 0.5 (tip 0.95) — at chase-cam
  // distance the rise collapsed to a few px, so the boat still read as a
  // flat slab. The sheer now rises 0.85 (tip 1.30, ~24 deg) + a stem peak,
  // and raised gunwale rails run the deck edges, so the silhouette from
  // behind is rail-dip-rail with a centre bow peak, not one flat line.
  const bowY = (f) => 0.45 + ((f - 0.12 * L) / (0.38 * L)) * 0.85; // bow-wedge surface height
  const deckC = o.pol ? '#eef2f5' : hero ? '#181d24' : '#f2ead9'; // dek gelap VIPER (bukan krem)
  const deckDk = sh(hx3(deckC), 0.92, hz(dep));
  const gunC = sh(hx3(hullC), 1.15, hz(dep));
  for (const s of [-1, 1]) {
    QW([pt(-0.5 * L, s * 0.32 * Wd, 0.47), pt(0.12 * L, s * 0.32 * Wd, 0.47), pt(0.12 * L, s * 0.5 * Wd, 0.47), pt(-0.5 * L, s * 0.5 * Wd, 0.47)], gunC);
  }
  QW([pt(-0.5 * L, -0.32 * Wd, 0.47), pt(-0.5 * L, 0.32 * Wd, 0.47), pt(0.12 * L, 0.32 * Wd, 0.47), pt(0.12 * L, -0.32 * Wd, 0.47)], deckDk);
  // cockpit: dark floor aft + bench seat across it
  QW([pt(-0.48 * L, -0.3 * Wd, 0.48), pt(-0.48 * L, 0.3 * Wd, 0.48), pt(-0.27 * L, 0.3 * Wd, 0.48), pt(-0.27 * L, -0.3 * Wd, 0.48)], '#23262c');
  box3(cx - fx * L * 0.36, 0.48, cz - fz * L * 0.36, Wd * 0.62, 0.3, L * 0.09, angle, '#2e3238', dep);
  topStrip(cx, cz, angle, -L * 0.36, 0, Wd * 0.56, L * 0.07, 0.8, 'rgba(232,228,216,0.9)');
  // helm seat under the driver (non-police only — the police boat carries
  // the light bar on its console instead of a driver)
  if (!o.pol) {
    box3(cx - fx * L * 0.2, 0.48, cz - fz * L * 0.2, 0.6, 0.55, 0.34, angle, '#2e3238', dep);
    topStrip(cx, cz, angle, -L * 0.2, 0, 0.54, 0.3, 1.05, hero ? 'rgba(34,211,238,0.9)' : 'rgba(232,228,216,0.9)');
    if (hero) { // VIPER: kursi penumpang + strip cyan (kokpit 2 kursi)
      box3(cx - fx * L * 0.2 - rx * 0.55, 0.48, cz - fz * L * 0.2 - rz * 0.55, 0.45, 0.55, 0.34, angle, '#23262c', dep);
      topStrip(cx, cz, angle, -L * 0.2, -0.55, 0.4, 0.3, 1.05, 'rgba(34,211,238,0.9)');
    }
  }
  // foredeck: converging pinstripes + dark anchor-locker hatch on the bow
  // wedge (white on pink hero deck, blue on white police deck)
  const stripeC2 = o.pol ? '#2f6fd0' : hero ? CYAN : '#f5f5f5';
  for (const s of [-1, 1]) {
    QW([pt(0.16 * L, s * 0.135 * Wd, bowY(0.16 * L) + 0.02), pt(0.16 * L, s * 0.185 * Wd, bowY(0.16 * L) + 0.02),
      pt(0.44 * L, s * 0.095 * Wd, bowY(0.44 * L) + 0.02), pt(0.44 * L, s * 0.045 * Wd, bowY(0.44 * L) + 0.02)], stripeC2);
  }
  QW([pt(0.2 * L, -0.09 * Wd, bowY(0.2 * L) + 0.02), pt(0.2 * L, 0.09 * Wd, bowY(0.2 * L) + 0.02),
    pt(0.38 * L, 0.05 * Wd, bowY(0.38 * L) + 0.02), pt(0.38 * L, -0.05 * Wd, bowY(0.38 * L) + 0.02)], '#3a3f47');
  // bow wedge: deck slopes up 0.5 over a 0.38L run (~19 deg) to the bow tip.
  // CLEAN-STANDARD: police boats get a WHITE foredeck (two-tone livery),
  // so they read as police at a glance, like the friend's black-and-white
  // POLICE cars — not just a solid-blue boat with a tiny light bar.
  const bowDeck = o.pol ? sh([245, 245, 245], 1.15, hz(dep)) : sh(hx3(hullC), 1.15, hz(dep));
  QW([pt(0.12 * L, -0.34 * Wd, 0.45), pt(0.12 * L, 0.34 * Wd, 0.45), pt(0.5 * L, 0.12 * Wd, 1.3), pt(0.5 * L, -0.12 * Wd, 1.3)], bowDeck);
  for (const s of [-1, 1]) {
    QW([pt(0.12 * L, s * 0.34 * Wd, 0.45), pt(0.5 * L, s * 0.12 * Wd, 1.3), pt(0.5 * L, s * 0.12 * Wd, 0.45)], hullDk);
  }
  // stem peak: a small tab at the bow tip so the sheer ends in a visible
  // centre peak from behind (the v1 tip vanished into the horizon haze)
  box3(cx + fx * (L * 0.47), 0.95, cz + fz * (L * 0.47), 0.14, 0.5, 0.14, angle, o.pol ? '#eef2f5' : hullC, dep);
  // transom: vertical rear face + waterline stripe + rub rail.
  // CLEAN-STANDARD-2: the white foredeck above is occluded by the console
  // + light bar from the chase-cam, so the police two-tone livery lives
  // HERE, on the face the camera actually sees: white transom + blue stripe.
  const transomC = o.pol ? '#eef2f5' : hullDk;
  const transomStripe = o.pol ? '#2f6fd0' : stripeC;
  vQuad(cx, cz, angle, -L / 2 - 0.06, 0, Wd * 0.92, -0.25, 0.45, transomC);
  vQuad(cx, cz, angle, -L / 2 - 0.09, 0, Wd * 0.9, -0.02, 0.12, transomStripe);
  topStrip(cx, cz, angle, -L / 2 - 0.02, 0, Wd * 0.9, 0.12, 0.47, 'rgba(245,245,245,0.9)');
  // side stripes (white band + rub rail), both sides; the far side hides
  // behind the hull via the painter's algorithm
  for (const s of [-1, 1]) {
    QW([pt(-0.42 * L, s * (Wd / 2 + 0.02), 0.02), pt(0.3 * L, s * (Wd / 2 + 0.02), 0.02), pt(0.3 * L, s * (Wd / 2 + 0.02), 0.16), pt(-0.42 * L, s * (Wd / 2 + 0.02), 0.16)], stripeC);
    QW([pt(-0.45 * L, s * (Wd / 2 + 0.02), 0.4), pt(0.32 * L, s * (Wd / 2 + 0.02), 0.4), pt(0.32 * L, s * (Wd / 2 + 0.02), 0.46), pt(-0.45 * L, s * (Wd / 2 + 0.02), 0.46)], hero ? 'rgba(34,211,238,0.9)' : 'rgba(245,245,245,0.85)');
  }
  // BOAT-REBUILD-V2: raised gunwale rails. v1's deck edges were coplanar
  // with the deck, so from the chase-cam the boat was one flat pink
  // trapezoid. The rails stand 0.45 proud of the deck aft, rising with the
  // sheer to the bow — from behind the transom top reads rail-dip-rail,
  // and the two bright top strips converge on the bow peak like a real
  // speedboat's sheer line. Police rails are blue with white tops.
  // V2b: each rail is TWO segments split at the console (f=-0.04L). As one
  // quad the rail's depth was its nearest (aft) corner, so the FAR rail
  // painted over the console/driver and read as a plank crossing the
  // cockpit (worst on the white police rails). Split, the fwd segment's
  // depth is its own — the console/driver (nearer) now occlude it, and the
  // rail only shows where it belongs: along the sheer to the bow tip.
  const railTopC = o.pol ? '#eef2f5' : hero ? CYAN : gunC;
  const railTop = (f) => 0.92 + ((f + 0.48 * L) / (0.9 * L)) * 0.4;
  const railBot = (f) => f < 0.12 * L ? 0.47 : bowY(f);
  const railOut = (f) => (0.52 - ((f + 0.48 * L) / (0.9 * L)) * 0.37) * Wd;
  const railIn = (f) => (0.36 - ((f + 0.48 * L) / (0.9 * L)) * 0.27) * Wd;
  for (const s of [-1, 1]) {
    for (const [fa, fb] of [[-0.48 * L, -0.04 * L], [-0.04 * L, 0.42 * L]]) {
      QW([pt(fa, s * railOut(fa), railBot(fa)), pt(fa, s * railOut(fa), railTop(fa)),
        pt(fb, s * railOut(fb), railTop(fb)), pt(fb, s * railOut(fb), railBot(fb))], hullDk);
      QW([pt(fa, s * railIn(fa), railTop(fa)), pt(fa, s * railOut(fa), railTop(fa)),
        pt(fb, s * railOut(fb), railTop(fb)), pt(fb, s * railIn(fb), railTop(fb))], railTopC);
    }
    vQuad(cx, cz, angle, -L * 0.48 - 0.02, s * 0.44 * Wd, 0.3, 0.47, 0.92, railTopC);
  }
  // 2 outboard motors on the transom + silver cavitation plates.
  // BOAT-REBUILD: the motors read as two flat black rectangles — a
  // coloured cowl cap (hull colour) + a white band on the rear face make
  // them read as outboards, not slabs.
  // VIPER R36: hero pakai twin hydrojet (nosel tanam + mulut cyan), bukan outboard.
  for (const s of [-1, 1]) {
    const mx = cx + fx * (-L / 2 - 0.28) + rx * s * 0.32 * Wd, mz = cz + fz * (-L / 2 - 0.28) + rz * s * 0.32 * Wd;
    if (hero) {
      box3(mx, -0.35, mz, 0.34, 0.5, 0.5, angle, '#10141a', dep); // badan nosel
      vQuad(cx, cz, angle, -L / 2 - 0.55, s * 0.32 * Wd, 0.3, -0.2, 0.1, CYAN); // mulut nosel cyan
      continue;
    }
    box3(mx, -0.35, mz, 0.34, 0.62, 0.34, angle, '#1b1e24', dep);
    box3(mx, 0.12, mz, 0.3, 0.16, 0.3, angle, '#2e3238', dep);
    box3(mx, 0.24, mz, 0.3, 0.26, 0.3, angle, color, dep); // v2: bigger cowl cap, crests the transom
    vQuad(cx, cz, angle, -L / 2 - 0.47, s * 0.32 * Wd, 0.3, -0.12, 0.08, '#c8ccd4');
    vQuad(cx, cz, angle, -L / 2 - 0.47, s * 0.32 * Wd, 0.26, 0.08, 0.16, 'rgba(245,245,245,0.9)');
  }
  // console + sloped windshield (dark glass + diagonal sky streak)
  box3(cx - fx * L * 0.08, 0.45, cz - fz * L * 0.08, Wd * 0.6, 0.55, L * 0.36, angle, hero ? '#14181e' : '#e8e4d8', dep);
  topStrip(cx, cz, angle, -L * 0.08, 0, Wd * 0.55, L * 0.3, 1.02, hero ? 'rgba(34,211,238,0.85)' : 'rgba(255,255,255,0.85)');
  QW([pt(0.1 * L, -0.26 * Wd, 1.0), pt(0.1 * L, 0.26 * Wd, 1.0), pt(-0.02 * L, 0.26 * Wd, 1.42), pt(-0.02 * L, -0.26 * Wd, 1.42)], 'rgba(18,38,58,0.9)');
  QW([pt(0.08 * L, -0.2 * Wd, 1.08), pt(0.08 * L, -0.05 * Wd, 1.08), pt(0.0, 0.15 * Wd, 1.38), pt(0.0, 0.0, 1.38)], 'rgba(255,255,255,0.45)');
  if (o.pol) {
    // police: light bar on the console roof (no driver — the bar must read
    // from behind); red/blue lenses on its rear face, blinking
    // BOAT-FIX-2: the first bar read as a dark box at depth ~32 (lenses
    // 0.14 tall = ~4 px). Taller bar + taller lenses + a soft glow halo
    // behind each lens so red/blue read at a glance.
    // BOAT-REBUILD: at boat3d distance the bar still read small, so it
    // grows again (1.15 wide, lenses 0.38 tall) and the halos get
    // stronger — the bar is the police boat's whole identity from behind.
    const blink = Math.floor((o.t || 0) * 6) % 2 === 0;
    box3(cx - fx * L * 0.08, 1.0, cz - fz * L * 0.08, 1.15, 0.34, 0.55, angle, '#14161a', dep);
    vQuad(cx, cz, angle, -L * 0.08 - 0.3, -0.26, 0.72, 0.92, 1.46, blink ? 'rgba(255,64,64,0.45)' : 'rgba(47,111,208,0.45)');
    vQuad(cx, cz, angle, -L * 0.08 - 0.3, 0.26, 0.72, 0.92, 1.46, blink ? 'rgba(47,111,208,0.45)' : 'rgba(255,64,64,0.45)');
    vQuad(cx, cz, angle, -L * 0.08 - 0.3, -0.26, 0.52, 1.0, 1.38, blink ? '#ff4040' : '#2f6fd0');
    vQuad(cx, cz, angle, -L * 0.08 - 0.3, 0.26, 0.52, 1.0, 1.38, blink ? '#2f6fd0' : '#ff4040');
  } else {
    // driver v2: PROBE proved the v1 driver never read — the dark torso
    // merged with the dark windshield (invisible) and only a 16x2 px
    // sliver of the yellow helmet peeked above it ("kubus kuning nyasar").
    // Now: bright orange life-vest torso (contrasts with the windshield),
    // wider shoulders, a bigger helmet standing proud of the windshield
    // (top 1.72 vs glass 1.42) with a dark visor band + white crown stripe
    // on its rear face, so it reads as a person, not a stray cube.
    box3(cx - fx * L * 0.2, 1.02, cz - fz * L * 0.2, 0.62, 0.42, 0.34, angle, '#ff5a1f', dep);
    box3(cx - fx * L * 0.2, 1.42, cz - fz * L * 0.2, 0.36, 0.3, 0.36, angle, '#ffd23e', dep);
    vQuad(cx, cz, angle, -L * 0.2 - 0.2, 0, 0.3, 1.46, 1.6, '#1b1e24');
    topStrip(cx, cz, angle, -L * 0.2, 0, 0.2, 0.22, 1.73, 'rgba(255,255,255,0.9)');
  }
  // BOAT-REBUILD (VB-27): the old V-arms ran 2.2L in dead-straight rails
  // to the frame edge and the foam trail read as a white road — doubly
  // so, because the hero boat was drawn TWICE (boats loop + hero-last),
  // doubling every wake alpha (fixed below: the loop skips the hero).
  // Arms are now shorter (1.5L from the bow, ~1.0L past the transom),
  // two-segment with a 3-deg outward bend + fading alpha so they curve
  // instead of ruling straight, with side spray at the transom corners,
  // a rooster tail behind the transom, fainter transverse arcs, and an
  // irregular foam trail (fewer, faster-fading blobs).
  const wakeA = 19.47 * Math.PI / 180;
  for (const s of [-1, 1]) {
    const bx = cx + fx * (L / 2) + rx * s * (Wd * 0.32), bz = cz + fz * (L / 2) + rz * s * (Wd * 0.32);
    let kx = bx, kz = bz;
    for (const [d0, d1, aOff, al, w0, w1] of [[0, 0.75 * L, 0, 0.38, 0.1, 0.22], [0.75 * L, 1.5 * L, 3 * Math.PI / 180, 0.18, 0.22, 0.34]]) {
      const af = -Math.cos(wakeA + aOff), ar = s * Math.sin(wakeA + aOff);
      const dx = fx * af + rx * ar, dz = fz * af + rz * ar;
      const px = -dz, pz = dx;
      const ex = kx + dx * (d1 - d0), ez = kz + dz * (d1 - d0);
      QW([[kx - px * w0, -0.18, kz - pz * w0], [kx + px * w0, -0.18, kz + pz * w0],
        [ex + px * w1, -0.18, ez + pz * w1], [ex - px * w1, -0.18, ez - pz * w1]], 'rgba(255,255,255,' + al + ')');
      kx = ex; kz = ez;
    }
    // bow spray + transom-corner side spray
    const sf = L / 2, sr = s * (Wd * 0.55);
    QW([pt(sf - 0.25, sr - 0.15, -0.18), pt(sf + 0.25, sr - 0.15, -0.18), pt(sf + 0.25, sr + 0.15, -0.18), pt(sf - 0.25, sr + 0.15, -0.18)], 'rgba(255,255,255,0.5)');
    QW([pt(-0.5 * L, s * 0.5 * Wd, -0.18), pt(-0.3 * L, s * 0.45 * Wd, -0.18), pt(-0.3 * L, s * 0.78 * Wd, -0.18), pt(-0.5 * L, s * 0.82 * Wd, -0.18)], 'rgba(255,255,255,0.4)');
  }
  // rooster tail v2: the two v1 vertical rects read as glass cards stacked
  // behind the transom ("tangga kaca"). One sloped spray wedge instead —
  // wide + low at the transom, narrowing and rising as it falls behind.
  // VIPER R36: twin rooster tail — satu wedge miring per jet (pusat ±0.32Wd).
  if (hero) {
    for (const s of [-1, 1]) {
      const rc = s * 0.32 * Wd;
      QW([pt(-L / 2 - 0.25, rc - 0.13, -0.12), pt(-L / 2 - 0.25, rc + 0.13, -0.12),
        pt(-L / 2 - 0.95, rc + 0.04, 0.38), pt(-L / 2 - 0.95, rc - 0.04, 0.38)], 'rgba(255,255,255,0.32)');
    }
  } else {
    QW([pt(-L / 2 - 0.25, -0.26, -0.12), pt(-L / 2 - 0.25, 0.26, -0.12),
      pt(-L / 2 - 0.95, 0.07, 0.38), pt(-L / 2 - 0.95, -0.07, 0.38)], 'rgba(255,255,255,0.32)');
  }
  for (let k = 1; k <= 2; k += 1) {
    const dk = L * 0.5 + k * L * 0.45;
    for (let sg = -1; sg <= 1; sg += 1) {
      const r0 = sg * 0.45 - 0.4, r1 = sg * 0.45 + 0.4;
      const curve = 0.18 * (1 - Math.abs(sg) * 0.5);
      QW([pt(-L / 2 - dk - curve, r0, -0.18), pt(-L / 2 - dk - curve, r1, -0.18), pt(-L / 2 - dk - 0.18 - curve, r1, -0.18), pt(-L / 2 - dk - 0.18 - curve, r0, -0.18)], 'rgba(255,255,255,0.1)');
    }
  }
  for (let i = 0; i < 6; i += 1) {
    // Foam v2: v1 stacked 6 near-centreline rects — at chase-cam depth they
    // overlapped into nested hard-edged cards ("tangga kaca"). Now each puff
    // is a DIAMOND (pointed ends foreshorten to lens shapes at grazing
    // angle), fanned in a zigzag that widens behind the boat instead of a
    // centreline stack, with softer/faster-fading alpha.
    const fc = -L / 2 - (0.7 + i * 0.8), sd = i % 2 === 0 ? -1 : 1;
    const rc = sd * (0.18 + i * 0.26) * (0.6 + 0.4 * h2(i, 4));
    const hs = 0.3 + h2(i, 9) * 0.16 + i * 0.05;
    QW([pt(fc - hs, rc, -0.18), pt(fc, rc - hs * 0.7, -0.18), pt(fc + hs, rc, -0.18), pt(fc, rc + hs * 0.7, -0.18)],
      'rgba(255,255,255,' + (0.3 - i * 0.045).toFixed(2) + ')');
  }
}
function plane3d(wx, wy, angle, plane, o) {
  // R25: rocket plane HA-1 in the chase-cam (mission 13 "Rocket Heist").
  // Follows the PROVEN 3D shape from takeoff3d.js plane() (rocket v5
  // shot) + the top-down silhouette from space.js drawPlane (swept wings,
  // cyan tail fins, orange nose tip, cyan canopy, afterburner).
  // Altitude scale: 1 unit = ~8.3 m (ALT_U = alt * 0.12): alt 55 m ->
  // 6.6 units (just below the rooftops, takeoff clears the skyline),
  // alt 340 m -> 40.8 units (above the skyline). The camera eye rises on
  // the SAME scale (drawChase3D), so the plane stays framed at any alt.
  const L = 6.0, Wd = 6.0; // 60 px long, 60 px wingspan (drawPlane top-down)
  const alt = (plane.alt || 0) - (o.jet ? 4 : 0); // PLANE-41 (VB-41): HAF jets
  // pursue from BEHIND-BELOW the hero (4 m lower) so their wings no longer
  // align with the hero wing at the same screen height — the three wings
  // used to form one continuous bar across the frame (probe: hero wing
  // y 449-470, jet wings y 438-473, all in one band).
  const altU = alt * 0.12;
  const y0 = altU + 0.55; // fuselage base (gear height when parked)
  const cx = wx * CS, cz = wy * CS;
  const dep = Math.hypot(cx - ccX, cz - ccZ);
  const fx = Math.cos(angle), fz = Math.sin(angle);
  const rx = -fz, rz = fx;
  const t = o.t || 0;
  const thr = plane.throttle || 0;
  const flick = 0.75 + 0.25 * Math.sin(t * 31 + wx);
  const jet = !!o.jet;
  // JET R36: jet HAF = NH-77 HARBOR WRAITH (abu gelap stealth + cyan,
  // sama dgn webgl2.js plane() baru) — dulu OLIVE #5d7055/#6b7f60, yang di
  // shot jets terbaca gumpalan hitam-cokelat. Hero HA-1 tetap putih.
  const body = jet ? '#2e3238' : '#f7fafc';
  // PLANE-41 (VB-08): jet wing was #4a5c44 — near-black olive against the
  // tan buildings, so it read as a dark bar. Lighter than the body so the
  // wing separates from the fuselage and from the buildings behind it.
  const wingC = jet ? '#23272e' : '#d5dde4';
  // plane-local (f = forward, r = right) -> world [x, y, z]
  const pt = (f, r, y) => [cx + fx * f + rx * r, y, cz + fz * f + rz * r];
  // contact shadow: fades + grows + drifts with altitude (drawPlane formula)
  const shA = Math.max(0.06, 0.42 - alt / 800);
  const shS = 1 + alt / 900;
  const shX = wx + alt * 0.32, shY = wy + alt * 0.32;
  flatQuad(shX - 34 * shS, shY - 14 * shS, shX + 34 * shS, shY + 14 * shS, 0.02, 'rgba(0,0,0,' + shA.toFixed(2) + ')');
  // dark outline shell (car3d V2 pattern), forced behind the body
  box3(cx, y0, cz, 1.9, 1.0, L + 0.4, angle, '#0b0f16', dep, 2.5);
  // fuselage: white dart; warm rim on the spine (takeoff3d)
  box3(cx, y0 + 0.05, cz, 1.5, 0.9, L, angle, body, dep);
  if (!jet) box3(cx + fx * (L * 0.42), y0 + 0.12, cz + fz * (L * 0.42), 0.9, 0.6, L * 0.18, angle, '#ff9d4d', dep); // orange nose tip
  if (rimOn) topStrip(cx, cz, angle, L * 0.1, 0, 1.0, 0.5, y0 + 0.98, 'rgba(255,200,130,0.9)');
  // rear face brightening (v3 fix): box3 shades the camera-facing rear
  // face dark at sunset (0.65*shadeK+0.22) — from directly behind at
  // altitude, against the bright sunset sky, the fuselage read as a dark
  // slab (v1 wash at 0.35 alpha was too weak to fix it). Same cure as the
  // hero car's rear (round 21) + takeoff3d's 3-band rear: a LIGHT rear
  // cap (0.8 alpha) + dark belly strip + bright top edge.
  // JETFIX-3 (VB-08): jets get a LIGHT GREY cap, not the hero's white —
  // a white rectangle on a dark jet would read as a painted panel.
  vQuad(cx, cz, angle, -L / 2 - 0.08, 0, 1.5, y0 + 0.1, y0 + 0.92, jet ? 'rgba(74,80,90,0.85)' : 'rgba(232,236,242,0.8)');
  vQuad(cx, cz, angle, -L / 2 - 0.09, 0, 1.5, y0 + 0.1, y0 + 0.32, 'rgba(20,20,28,0.55)');
  topStrip(cx, cz, angle, -L / 2 - 0.05, 0, 1.4, 0.3, y0 + 0.98, 'rgba(255,210,140,0.95)');
  // canopy: dark glass + sky reflection streak (takeoff3d)
  // PLANE-41 (VB-41): the canopy read as a loose dark box floating on the
  // fuselage — no glass highlight, no connection to the nose/tail. Wider,
  // brighter glass, a stronger sky streak on the rear face, and a dorsal
  // spine strip tying the canopy back to the tail fins.
  box3(cx + fx * (L * 0.22), y0 + 0.95, cz + fz * (L * 0.22), 1.05, 0.5, L * 0.3, angle, jet ? '#232a30' : '#2a4a72', dep);
  // PLANE-41 ROUND 2: the old sky streak sat at the canopy box's CENTRE
  // plane (f +1.32) — buried inside the box, invisible from behind, so
  // the canopy read as a plain brown box (warm sunset shading turns the
  // blue glass brown on the rear face). The glass now lives ON the rear
  // face (f +0.40, just behind the box rear at +0.42): a light-blue glass
  // quad with a bright streak, so the canopy reads as glass from the
  // chase-cam.
  vQuad(cx, cz, angle, 0.40, 0, 0.9, y0 + 1.04, y0 + 1.38, 'rgba(125,185,235,0.9)');
  vQuad(cx, cz, angle, 0.38, -0.2, 0.35, y0 + 1.08, y0 + 1.36, 'rgba(220,240,255,0.85)');
  topStrip(cx, cz, angle, -1.0, 0, 0.5, 2.6, y0 + 0.96, 'rgba(28,32,40,0.6)'); // dorsal spine canopy -> tail
  // swept wings: horizontal quads (drawPlane silhouette); darker top so
  // they read apart from the fuselage; warm rim on the sun-side edge
  // PLANE-41 (VB-41): the flat wing projected only 21 px tall over a
  // 401 px span (probe) — a 20:1 bar, not a wing — because it sits nearly
  // at eye level and its screen height came only from the 2.6-unit chord
  // foreshortening. Now DIHEDRAL: tips rise 0.5 (9.5 deg) so each wing
  // reads as a shallow V from behind, with a real leading-edge face, a
  // trailing-edge face and a tip cap (a slab, not a line).
  for (const s of [-1, 1]) {
    QW([pt(0.6, s * 0.4, y0 + 0.55), pt(-2.0, s * 3.0, y0 + 1.05), pt(-1.4, s * 3.0, y0 + 1.05), pt(-1.0, s * 0.2, y0 + 0.55)], sh(hx3(wingC), 0.92, hz(dep)));
    QW([pt(-1.0, s * 0.2, y0 + 0.45), pt(-1.4, s * 3.0, y0 + 0.95), pt(-1.4, s * 3.0, y0 + 1.12), pt(-1.0, s * 0.2, y0 + 0.62)], sh(hx3(wingC), 0.72, hz(dep))); // trailing-edge thickness
    QW([pt(0.6, s * 0.4, y0 + 0.38), pt(-2.0, s * 3.0, y0 + 0.88), pt(-2.0, s * 3.0, y0 + 1.05), pt(0.6, s * 0.4, y0 + 0.55)], sh(hx3(wingC), 0.72, hz(dep))); // leading-edge thickness
    QW([pt(-2.0, s * 3.0, y0 + 0.88), pt(-1.4, s * 3.0, y0 + 0.95), pt(-1.4, s * 3.0, y0 + 1.12), pt(-2.0, s * 3.0, y0 + 1.05)], sh(hx3(wingC), 0.7, hz(dep))); // wingtip cap
    if (rimOn) QW([pt(0.6, s * 0.4, y0 + 0.58), pt(-2.0, s * 3.0, y0 + 1.08), pt(-1.95, s * 3.0, y0 + 1.08), pt(0.55, s * 0.4, y0 + 0.58)], jet ? 'rgba(5,217,232,0.6)' : 'rgba(255,200,130,0.5)'); // leading-edge rim (jet: cyan neon)
    // stabilizer: same dihedral treatment (was a flat quad, 6 px tall on
    // screen — another thin line across the tail). Tips rise 0.3.
    QW([pt(-2.2, s * 0.5, y0 + 0.7), pt(-3.0, s * 1.7, y0 + 1.0), pt(-2.8, s * 1.7, y0 + 1.0), pt(-2.2, s * 0.5, y0 + 0.7)], sh(hx3(wingC), 0.95, hz(dep))); // stabilizer
    QW([pt(-2.2, s * 0.5, y0 + 0.62), pt(-2.8, s * 1.7, y0 + 0.92), pt(-2.8, s * 1.7, y0 + 1.0), pt(-2.2, s * 0.5, y0 + 0.7)], sh(hx3(wingC), 0.55, hz(dep))); // stabilizer trailing face
    // JETFIX: tail fin SWEPT BACK + shorter — the old vertical fin (1.2
    // tall, straight up) read as a pole from the chase-cam; the swept fin
    // (top edge 0.5 further back, height 0.85) reads as a jet tail.
    // JETFIX-3 (VB-07): the swept fin STILL read as 2 vertical cyan
    // PILLARS — from directly behind, the fin's forward sweep collapses
    // in depth (the camera looks along the fin plane), so only its height
    // shows. A fin needs width VISIBLE from behind: cant the top OUTWARD
    // (V-tail) so each fin leans away from the centreline, and sweep the
    // top further back (0.5 -> 0.9). Two rounds of tuning: a 30 deg cant
    // read as chopstick antennae against the open sky at alt 340 m, and
    // even at 19 deg the fin read as a uniform BAR — because the quad is
    // a parallelogram (top as wide as the base). A real fin TAPERS: wide
    // base (0.8) -> narrow top (0.3), swept back. The tapered profile
    // reads as a fin from behind; the bar never did.
    // PLANE-41 (VB-07): the fin projected ~15 px wide x 64 tall — a bar —
    // because its plane is parallel to the view direction and only the
    // 0.3 cant gave it width. Now canted further out (top r 0.85 -> 1.2,
    // 0.65 lateral = ~40 px on screen), taller (1.55 -> 1.75), swept
    // further back (-3.6 -> -3.9), with a top edge that has real lateral
    // width (0.95 -> 1.2) so the fin tapers in the rear view instead of
    // reading as a uniform bar, plus a warm leading-edge rim.
    // PLANE-41 ROUND 2: probe showed the near-side fin tapering the WRONG
    // way in screen space (top edge wider than the base — an inverted
    // taper, hence the "ribbon" look). Top edge shortened (r 1.1 -> 1.2,
    // f -3.7 -> -3.9) and the root lengthened (base rear -3.0 -> -3.3) so
    // the fin is widest at its root and narrows to the tip, as a fin does.
    // PLANE-41 v2 (papan cyan): sirip hero '#05d9e8' SATU WARNA DATAR tanpa
    // shading terbaca sebagai PAPAN di jets/takeoff/planehigh — cyan jenuh
    // itu benda asing di badan putih, bukan bagian pesawat. Samakan olive
    // '#6b7f60' jet HAF (terbukti terbaca sebagai sirip jet di shot yang
    // sama) + tone per sisi ala box3 (port 0.8 / starboard 0.95) supaya
    // kedua sirip terbaca 3D, bukan satu bidang datar. Rim hangat tetap.
    QW([pt(-2.2, s * 0.55, y0 + 0.7), pt(-3.3, s * 0.55, y0 + 0.7), pt(-3.9, s * 1.2, y0 + 1.75), pt(-3.7, s * 1.1, y0 + 1.75)], sh(hx3(jet ? '#23272e' : '#6b7f60'), s < 0 ? 0.8 : 0.95, hz(dep))); // tail fin (jet: dark stealth, hero: olive, per-side tone)
    if (rimOn) QW([pt(-3.7, s * 1.1, y0 + 1.73), pt(-3.9, s * 1.2, y0 + 1.73), pt(-3.9, s * 1.2, y0 + 1.8), pt(-3.7, s * 1.1, y0 + 1.8)], 'rgba(255,210,130,0.8)'); // fin top rim
    if (rimOn) QW([pt(-2.2, s * 0.57, y0 + 0.72), pt(-3.7, s * 1.12, y0 + 1.73), pt(-3.7, s * 1.12, y0 + 1.78), pt(-2.2, s * 0.57, y0 + 0.77)], 'rgba(255,210,130,0.65)'); // fin leading-edge rim
  }
  // JETFIX: wingtip nav lights (red port / green starboard) + warm rim on
  // the wing trailing edge + dark cheatline on each fuselage side — from
  // directly behind, the wings were a thin dark line and the fuselage a
  // flat white slab; the lights + rim make the span read at a glance.
  // PLANE-41 (VB-08): the old lights were flat vQuad squares floating at
  // the wingtips — they read as loose red/green squares, not lights ON
  // the plane. Now small 3D bulbs (box3) sitting astride the dihedral
  // wingtip, and the cheatline pulled in to r 0.76 so it no longer floats
  // 0.03 off the fuselage side (a visible gap at 2x zoom).
  for (const s of [-1, 1]) {
    box3(cx + fx * -1.7 + rx * s * 3.0, y0 + 0.86, cz + fz * -1.7 + rz * s * 3.0, 0.3, 0.28, 0.3, angle, s < 0 ? '#ff3b30' : '#37e05a', dep);
  }
  for (const s of [-1, 1]) {
    QW([pt(-1.0, s * 0.2, y0 + 0.58), pt(-1.4, s * 3.0, y0 + 1.08), pt(-1.52, s * 3.0, y0 + 1.08), pt(-1.12, s * 0.2, y0 + 0.58)], 'rgba(255,200,130,0.55)', dep); // trailing-edge warm rim
    QW([pt(2.5, s * 0.76, y0 + 0.45), pt(-2.5, s * 0.76, y0 + 0.45), pt(-2.5, s * 0.76, y0 + 0.62), pt(2.5, s * 0.76, y0 + 0.62)], jet ? 'rgba(5,217,232,0.85)' : 'rgba(20,24,32,0.5)', dep); // fuselage side cheatline (jet: cyan neon)
  }
  // twin afterburner nozzles (rear face) + flame when throttled
  // JETFIX: the old nozzles read as orange WINDOWS on the white rear face
  // (dark ring too thin, orange too big). Ring bigger + darker, orange
  // core smaller, so each nozzle reads as a dark ring with a hot centre.
  // JETFIX-3 (VB-09): the flat ring STILL read as 2 orange windows —
  // a painted quad on the rear face can never read as a hole. A nozzle
  // needs real depth: a short dark TUBE protruding behind the rear face
  // (box3, 0.55 deep) with the hot core RECESSED at its back end (dep-0.6
  // so it paints after the tube's rear face). The dark tube + orange
  // opening reads as a nozzle pipe, not a window.
  // PLANE-41 (VB-09): the orange core (0.34 wide) covered 57% of the
  // 0.6-wide tube mouth, so the nozzle read as an orange WINDOW. Tube
  // bigger (0.72 x 0.62 x 0.7), core smaller (0.26) — the dark ring is
  // now ~0.23 on each side and the hot centre reads as a hole, not a
  // window. Flame start moved to the new tube exit (-3.6).
  // PLANE-41 ROUND 2: the box3 tube read as TWO BIG BROWN BOXES — box3
  // shades the side faces warm (rgb 81,49,35 in the probe) and the two
  // tubes together spanned wider than the fuselage. Now a slim pipe
  // (0.5 wide, flush with the fuselage sides, 0.375 protrusion) built
  // from flat near-black QW faces — no warm shading, no brown — with a
  // small hot core (0.22) recessed in its dark mouth.
  for (const s of [-1, 1]) {
    const nr = s * 0.5, nh = 0.25; // nozzle centre r, half-width
    QW([pt(-3.38, nr - nh, y0 + 0.17), pt(-3.38, nr + nh, y0 + 0.17), pt(-3.38, nr + nh, y0 + 0.72), pt(-3.38, nr - nh, y0 + 0.72)], '#0b0b0e'); // tube mouth (dark)
    QW([pt(-2.83, nr - nh, y0 + 0.72), pt(-3.38, nr - nh, y0 + 0.72), pt(-3.38, nr + nh, y0 + 0.72), pt(-2.83, nr + nh, y0 + 0.72)], '#141417'); // tube top
    QW([pt(-2.83, nr + s * nh, y0 + 0.17), pt(-3.38, nr + s * nh, y0 + 0.17), pt(-3.38, nr + s * nh, y0 + 0.72), pt(-2.83, nr + s * nh, y0 + 0.72)], '#0e0e11'); // tube outer side
    // ROUND 3: the core vQuads were STILL invisible — dep-0.6 paints
    // BEFORE the tube mouth (the mouth's default depth is ~dep-3.38,
    // not dep: box3/QW depth is the face's own forward distance, and
    // JET-FIX-3's dep-0.6 assumed the tube rear sat at dep). The core
    // must sit BELOW the mouth's depth to paint after it: dep-4.0 for
    // the orange core, dep-4.3 for the bright centre, dep-4.5 for the
    // vertical glow (which was hidden for the same reason).
    vQuad(cx, cz, angle, -L / 2 - 0.41, s * 0.5, 0.22, y0 + 0.32, y0 + 0.56, '#ff9d4d', dep - 4.0);
    vQuad(cx, cz, angle, -L / 2 - 0.44, s * 0.5, 0.1, y0 + 0.38, y0 + 0.5, '#fff0b4', dep - 4.3);
  }
  if (thr > 0.25) {
    const fl = 1.8 * thr * flick;
    for (const s of [-1, 1]) {
      // JETFIX-3: the flame starts at the TUBE exit now (-3.4, not -3.0)
      // so it looks like it comes out of the nozzle, not the fuselage.
      QW([pt(-3.4, s * 0.5 - 0.45, y0 + 0.5), pt(-3.4, s * 0.5 + 0.45, y0 + 0.5), pt(-3.4 - fl, s * 0.5, y0 + 0.5)], 'rgba(255,157,77,' + (0.45 + 0.4 * flick * thr).toFixed(2) + ')');
      // JETFIX: vertical afterburner glow — the old flame was a horizontal
      // triangle, edge-on (invisible) from the chase-cam behind.
      // ROUND 3b: the glow was 0.62 wide — wider than the 0.5 mouth — so
      // its 0.45 orange wash turned the whole black mouth brown (the
      // "orange window" read again). Now it hugs only the hot core
      // (0.3 wide, 0.35 alpha): the dark ring stays black.
      vQuad(cx, cz, angle, -L / 2 - 0.42, s * 0.5, 0.3, y0 + 0.3, y0 + 0.58, 'rgba(255,157,77,0.35)', dep - 4.5);
    }
  }
  // landing gear when parked/taxiing (alt < 2): nose + 2 main struts
  if (alt < 2) {
    box3(cx + fx * 1.8, 0, cz + fz * 1.8, 0.25, y0 + 0.05, 0.25, angle, '#0a0a0e', dep);
    for (const s of [-1, 1]) box3(cx - fx * 1.5 + rx * s * 0.6, 0, cz - fz * 1.5 + rz * s * 0.6, 0.25, y0 + 0.05, 0.25, angle, '#0a0a0e', dep);
    // JET R36: roda (ban + hub) — dulu hanya strut, roda tidak terbaca.
    box3(cx + fx * 1.8, 0.18, cz + fz * 1.8, 0.2, 0.36, 0.34, angle, '#0a0a0e', dep);
    box3(cx + fx * 1.8, 0.18, cz + fz * 1.8, 0.24, 0.16, 0.36, angle, '#6a6f76', dep);
    for (const s of [-1, 1]) {
      const wx = cx - fx * 1.5 + rx * s * 0.6, wz = cz - fz * 1.5 + rz * s * 0.6;
      box3(wx, 0.18, wz, 0.22, 0.38, 0.38, angle, '#0a0a0e', dep);
      box3(wx, 0.18, wz, 0.26, 0.16, 0.4, angle, '#6a6f76', dep);
    }
  }
}
function ped3d(wx, wy, angle, color) {
  const cx = wx * CS, cz = wy * CS;
  const dep = Math.hypot(cx - ccX, cz - ccZ);
  flatQuad(wx - 8, wy - 8, wx + 8, wy + 8, 0.02, 'rgba(0,0,0,0.3)');
  box3(cx, 0.55, cz, 0.55, 0.95, 0.35, angle, color, dep);
  box3(cx, 0.0, cz, 0.5, 0.55, 0.32, angle, '#1c1f24', dep);
  box3(cx, 1.5, cz, 0.34, 0.34, 0.34, angle, '#e8b98a', dep);
}
function heli3d(hx, hy, px, py, rotor, t) {
  const cx = hx * CS, cz = hy * CS;
  const dep = Math.hypot(cx - ccX, cz - ccZ);
  const ang = Math.atan2(py - hy, px - hx);
  box3(cx, 24, cz, 1.7, 1.1, 3.4, ang, '#1c2f4a', dep);
  box3(cx - Math.cos(ang) * 2.6, 24.3, cz - Math.sin(ang) * 2.6, 0.5, 0.5, 2.6, ang, '#1c2f4a', dep);
  box3(cx, 25.2, cz, 0.35, 0.12, 7, rotor, '#c8cdd6', dep);
  const pcx = px * CS, pcz = py * CS;
  const rx = -Math.sin(ang), rz = Math.cos(ang);
  // JETFIX-3 (VB-05): the searchlight cone was a 6.4-unit-wide flat quad
  // (apex at the heli in the sky, base at the player) — in the chase-cam
  // it read as a GIANT PALE TRIANGLE across the whole sky (ops dump:
  // bbox [539,80,966,658], inter 87974 — the single biggest op in the
  // triangle region). A searchlight is a NARROW beam: base half-width
  // 3.2 -> 1.0, alpha 0.13 -> 0.08. The ground pool below still marks
  // where the light lands.
  QW([[cx - rx * 0.5, 23.8, cz - rz * 0.5], [cx + rx * 0.5, 23.8, cz + rz * 0.5],
    [pcx + rx * 1.0, 0.15, pcz + rz * 1.0], [pcx - rx * 1.0, 0.15, pcz - rz * 1.0]], 'rgba(255,240,170,0.08)');
  flatQuad(px - 34, py - 34, px + 34, py + 34, 0.12, 'rgba(255,240,170,0.20)');
}

// sky presets: [top, mid, horizon, haze] — night / sunset / day
const SKY = [
  [[5, 7, 15], [13, 19, 48], [28, 37, 71], [16, 22, 44]],
  [[30, 11, 51], [107, 35, 85], [255, 179, 92], [255, 150, 110]],
  [[47, 111, 208], [127, 178, 232], [207, 230, 247], [180, 200, 220]],
];
function skyFor(dl) {
  const lerp = (a, b, k) => a + (b - a) * k;
  const m3 = (A, B, k) => [Math.round(lerp(A[0], B[0], k)), Math.round(lerp(A[1], B[1], k)), Math.round(lerp(A[2], B[2], k))];
  const nightF = 1 - cl((dl - 0.25) / 0.35, 0, 1);
  let a, b, k;
  if (dl < 0.45) { a = SKY[0]; b = SKY[1]; k = cl((dl - 0.25) / 0.2, 0, 1); }
  else { a = SKY[1]; b = SKY[2]; k = cl((dl - 0.45) / 0.3, 0, 1); }
  return {
    top: m3(a[0], b[0], k), mid: m3(a[1], b[1], k), hor: m3(a[2], b[2], k),
    haze: m3(a[3], b[3], k), nightF,
  };
}
function bld3(b, nightF, t) {
  const bx = (b.x + b.w / 2) * CS, bz = (b.y + b.h / 2) * CS;
  const dep = Math.hypot(bx - ccX, bz - ccZ);
  let h3 = 7 + (b.height || 1) * 9;
  if (b.landmark === 'casino') h3 = 40;
  if (b.landmark === 'lighthouse') h3 = 46;
  const w = b.w * CS, d = b.h * CS;
  // T2: facade tint varies per building (same district palette, never flat)
  const tv = 0.85 + h2(b.x * 5 + 1, b.y * 3 + 2) * 0.3;
  const bc = hx3(b.color);
  const tint = '#' + bc.map(v => Math.min(255, Math.round(v * tv)).toString(16).padStart(2, '0')).join('');
  box3(bx, 0, bz, w, h3, d, 0, tint, dep);
  let ch=0,ca=0;if(!b.landmark&&b.roof&&dep<200){ch=2.5+h2(b.x+5,b.y+3)*2+(b.district===2?2:0);ca=b.roof>1?.785:0;const k=b.roof>1?.55:.66;box3(bx,h3,bz,w*k,ch+(b.roof>1?1.5:0),d*k,ca,tint,dep);}
  if (b.landmark === 'lighthouse') {
    vQuad(bx, bz, 0, d / 2 + 0.1, 0, w * 0.8, h3 * 0.3, h3 * 0.42, '#c0392b');
    vQuad(bx, bz, 0, d / 2 + 0.1, 0, w * 0.8, h3 * 0.62, h3 * 0.74, '#c0392b');
    vQuad(bx, bz, Math.PI / 2, w / 2 + 0.1, 0, d * 0.8, h3 * 0.3, h3 * 0.42, '#c0392b');
    vQuad(bx, bz, Math.PI / 2, w / 2 + 0.1, 0, d * 0.8, h3 * 0.62, h3 * 0.74, '#c0392b');
    if (nightF > 0.3) {
      const ba = t * 0.9, bx2 = bx + Math.cos(ba) * 50, bz2 = bz + Math.sin(ba) * 50;
      QW([[bx, h3 + 1, bz], [bx, h3 + 1, bz], [bx2, 0.5, bz2], [bx2, 0.5, bz2]], 'rgba(255,240,170,0.10)');
    }
    return;
  }
  // windows + trim on the faces most toward the camera (always, not just night)
  // REWORK: gate on the NEAR-face distance, not the centre — a big building
  // at dep 100 reads 165x266 px on screen; its near face is at ~90 and
  // must not be windowless. (Probe: (229.9,58.1) dep 100.3, winN 0.)
  const depNear = dep - Math.max(w, d) / 2;
  if (depNear < 120) {
    // JETFIX-2 Bug 2 (same root cause as box3): the old gate used the
    // distance from the BUILDING CENTRE (ccZ - bz etc), so a face counted
    // as "toward the camera" whenever the camera was past the centre —
    // even when it was still INSIDE the face's plane, i.e. the face was a
    // backface. Probe: bld@2130,210 (bx 224, camera x 222.2) drew windows
    // on its west face (dot bx-ccX = +1.8) although the camera is EAST of
    // that face's plane (x 213) — the windows compressed to 6 px slivers
    // on the circled wall strip. Gate on the signed distance from the
    // camera to the FACE PLANE instead: a face is eligible only if the
    // camera is beyond its plane. The sort (most head-on first) still
    // works: dot is now how far beyond the plane the camera sits.
    const faces = [
      { a: Math.PI / 2, off: d / 2, span: w, dot: ccZ - (bz + d / 2) },
      { a: -Math.PI / 2, off: d / 2, span: w, dot: (bz - d / 2) - ccZ },
      { a: 0, off: w / 2, span: d, dot: ccX - (bx + w / 2) },
      { a: Math.PI, off: w / 2, span: d, dot: (bx - w / 2) - ccX },
    ].sort((p, q) => q.dot - p.dot);
    const nFaces = nightF > 0.15 ? 3 : 2;
    for (let fi = 0; fi < nFaces && faces[fi].dot > 0; fi += 1) {
      const f = faces[fi];
      // REWORK (probe slab-probe.json): the right wall is the building at
      // (160,128) dep 24.1 — its north face is seen at a GRAZING angle
      // (depth range 5..27 across one face). box3 sorts a face by its
      // NEAREST corner (dep 5), so the face paints AFTER (over) its own
      // windows (dep 14..25) and the wall reads blank. Fix: facade details
      // on a grazing face get an explicit dep just in front of the face's
      // nearest corner (faceMin - 0.5). Non-grazing faces keep computed dep.
      const fx0 = Math.cos(f.a), fz0 = Math.sin(f.a), rx0 = -fz0, rz0 = fx0;
      const e1x = bx + fx0 * f.off + rx0 * (-f.span / 2), e1z = bz + fz0 * f.off + rz0 * (-f.span / 2);
      const e2x = bx + fx0 * f.off + rx0 * (f.span / 2), e2z = bz + fz0 * f.off + rz0 * (f.span / 2);
      const lz1 = fwdD(e1x, e1z), lz2 = fwdD(e2x, e2z);
      const faceMin = Math.min(lz1, lz2), faceRange = Math.abs(lz1 - lz2);
      const fDep = faceRange > 8 ? faceMin - 0.5 : undefined;
      const nc = Math.max(3, Math.min(dep > 70 ? 5 : dep < 40 ? 9 : 7, Math.round(f.span / 3.0)));
      const nr = Math.max(3, Math.min(dep > 70 ? 5 : dep < 40 ? 10 : 8, Math.round(h3 / 3.0)));
      for (let i = 0; i < nc; i += 1) for (let j = 0; j < nr; j += 1) {
        const q = h2(b.x * 7 + i * 13 + fi * 31, b.y * 3 + j * 17);
        const q2 = h2(b.x * 11 + i * 5, b.y * 7 + j * 9);
        // REWORK: smaller windows on near facades (ww was capped 1.8 -> a
        // 65 px "sticker" square at dep 24); denser grid instead.
        const ww = Math.min((f.span / nc) * 0.55, 1.3) * (0.75 + 0.5 * q2), wh = Math.min((h3 / nr) * 0.5, 1.1) * (0.8 + 0.4 * q2);
        const rOff = -f.span / 2 + (f.span * (i + 0.5)) / nc;
        const y0 = 2 + (h3 - 3) * (j + 0.25) / nr, y1 = y0 + wh;
        // T2: every window is DRAWN (dark glass reads, skipped windows read
        // as holes). Dusk 3-band: warm lit / cool sky / dark glass / deep.
        let c;
        if (nightF > 0.3) c = q < 0.5 ? [255, 205, 120] : q < 0.65 ? [255, 190, 120] : q < 0.8 ? [255, 150, 90] : [36, 44, 60];
        else c = q < 0.42 ? [255, 205, 120] : q < 0.57 ? [255, 180, 110] : q < 0.72 ? [42, 54, 74] : [28, 34, 50];
        // JETFIX: dark frame behind each window — the old bare glass squares
        // read as coloured stickers pasted on a flat wall; a frame makes
        // each window read as a real opening. Near/mid faces only
        // (depNear < 70): far faces are too small for frames to read.
        if (depNear < 70) vQuad(bx, bz, f.a, f.off + 0.11, rOff, ww + 0.28, y0 - 0.14, y1 + 0.14, 'rgba(12,14,20,0.9)', fDep);
        vQuad(bx, bz, f.a, f.off + 0.12, rOff, ww, y0, y1, mix(c, hz(dep)), fDep);
      }
      // T2: floor lines — one dark line per ~3 floors stops the slab look
      vQuad(bx, bz, f.a, f.off + 0.1, 0, f.span * 0.96, h3 * 0.33, h3 * 0.33 + 0.3, 'rgba(0,0,0,0.22)', fDep);
      vQuad(bx, bz, f.a, f.off + 0.1, 0, f.span * 0.96, h3 * 0.66, h3 * 0.66 + 0.3, 'rgba(0,0,0,0.22)', fDep);
      // REWORK: accent strip was a giant colour slab (1.1 wide, 82% of the
      // height — the cyan "sticker" bar). Narrower + shorter + off the ground.
      if (h2(b.x * 13 + 4, b.y * 5) < 0.45 && fi === 0) {
        const ac = h2(b.x, b.y * 11) < 0.5 ? 'rgba(255,179,92,0.85)' : 'rgba(5,217,232,0.7)';
        // WIN-FIX (VB-11): the single strip ran 55% of the facade height
        // (441 px tall on takeoff-D, 205 px on chase3d) and read as a
        // giant bar. Three short segments with dark gaps + a hard cap
        // read as a segmented sign, never a slab.
        const acX = -f.span / 2 + f.span * (0.25 + 0.5 * h2(b.x + 7, b.y));
        const acTop = Math.min(2.0 + h3 * 0.55, 11);
        for (let k = 0; k < 3; k += 1) {
          const s0 = 2.0 + (acTop - 2.0) * k / 3, s1 = 2.0 + (acTop - 2.0) * (k + 0.62) / 3;
          vQuad(bx, bz, f.a, f.off + 0.13, acX, 0.5, s0, s1, ac, fDep);
        }
      }
      // F3 panel line: one darker horizontal band mid-face (stops the slab look)
      vQuad(bx, bz, f.a, f.off + 0.1, 0, f.span * 0.96, h3 * 0.45, h3 * 0.45 + 0.35, 'rgba(0,0,0,0.25)', fDep);
      // cornice: dark band just under the roofline
      vQuad(bx, bz, f.a, f.off + 0.11, 0, f.span * 0.98, h3 - 1.7, h3 - 1.15, 'rgba(0,0,0,0.35)', fDep);
      if (fi === 0) {
        // base strip grounds the slab; V1 warm rim on the top edge at low sun
        vQuad(bx, bz, f.a, f.off + 0.12, 0, f.span * 0.96, 0.1, 1.3, 'rgba(0,0,0,0.35)', fDep);
        if (rimOn && nightF < 0.55) vQuad(bx, bz, f.a, f.off + 0.14, 0, f.span * 0.96, h3 - 0.7, h3 - 0.05, mix([255, 179, 92], hz(dep)), fDep);
        else if (nightF > 0.55) vQuad(bx, bz, f.a, f.off + 0.12, 0, f.span * 0.96, h3 - 0.4, h3 - 0.05, b.neon, fDep);
        // ground-floor storefronts: lit shop fronts break up blank walls at
        // street level (warm amber / cyan / pink neon) — always on at dusk/night
        if (nightF > 0.2) {
          for (let s = 0; s < 3; s += 1) {
            const rOff = -f.span / 2 + f.span * (s + 0.5) / 3;
            const sc = s % 3 === 0 ? [255, 179, 92] : s % 3 === 1 ? [5, 217, 232] : [255, 42, 109];
            // REWORK: storefront width capped 2.4 (was span/3*0.62 -> a 4.1
            // unit pink slab on near buildings) + dark frame bar + mullion.
            // WIN-FIX (VB-11): the flat colour slab (56x45 px on takeoff-D)
            // still read as a sticker. Dark backing = frame border; two
            // mullions + a transom split it into 6 panes, so it reads as
            // a glazed storefront, not a pasted rectangle.
            const sw = Math.min(f.span / 3 * 0.62, 2.4);
            vQuad(bx, bz, f.a, f.off + 0.11, rOff, sw + 0.3, 0.7, 2.8, 'rgba(10,10,16,0.9)', fDep);
            vQuad(bx, bz, f.a, f.off + 0.12, rOff, sw, 0.8, 2.7, mix(sc, hz(dep)), fDep);
            vQuad(bx, bz, f.a, f.off + 0.13, rOff, sw, 2.7, 2.95, 'rgba(10,10,16,0.85)', fDep);
            vQuad(bx, bz, f.a, f.off + 0.13, rOff - sw / 6, 0.1, 0.8, 2.7, 'rgba(10,10,16,0.7)', fDep);
            vQuad(bx, bz, f.a, f.off + 0.13, rOff + sw / 6, 0.1, 0.8, 2.7, 'rgba(10,10,16,0.7)', fDep);
            vQuad(bx, bz, f.a, f.off + 0.13, rOff, sw, 1.65, 1.8, 'rgba(10,10,16,0.7)', fDep);
          }
          // vertical neon sign on ~40% of buildings (deterministic gate)
          if (h2(b.x * 3 + 5, b.y * 7) < 0.4 && dep < 100) {
            const nc = ['#ff2a6d', '#05d9e8', '#ffd23e', '#ff9d4d'][Math.floor(h2(b.x, b.y * 3) * 4)];
            const nOff = -f.span / 2 + f.span * (0.2 + 0.6 * h2(b.x + 9, b.y));
            // WIN-FIX (VB-11): the neon ran 68% of the facade (249 px tall
            // on chase3d) as one solid bar. Segmented like the accent
            // strip + capped, glow per segment.
            const nTop = Math.min(Math.max(6, h3 * 0.68), 12);
            for (let k = 0; k < 3; k += 1) {
              const s0 = 3.2 + (nTop - 3.2) * k / 3, s1 = 3.2 + (nTop - 3.2) * (k + 0.62) / 3;
              vQuad(bx, bz, f.a, f.off + 0.14, nOff, 1.1, s0, s1, nc + '33', fDep);
              vQuad(bx, bz, f.a, f.off + 0.16, nOff, 0.5, s0, s1, nc, fDep);
            }
          }
        }
      }
    }
  }
  if (dep < 90 && !ch) {
    // ROOFTOP (VB-32): roofMin = sort depth of the roof face (its nearest
    // corner). Props get a depOff that lands them just in front of it;
    // the deck is a QW quad with an explicit dep. Without this the roof
    // face painted over every prop on it (probe: props d 45-46, roof
    // face d 35.0 — props 100% occluded, only the antenna tip poking
    // above the roofline ever showed).
    const roofMin = Math.min(fwdD(bx - w / 2, bz - d / 2), fwdD(bx + w / 2, bz - d / 2), fwdD(bx - w / 2, bz + d / 2), fwdD(bx + w / 2, bz + d / 2));
    const propOff = (px, pz) => (roofMin - 1.0) - fwdD(px, pz);
    // roof deck: inset panel in a per-building muted tone — breaks the
    // uniform grey slab without adding noise. QW takes an explicit dep.
    // (A parapet rim was tried here and REMOVED: the 4 edge strips failed
    // visual check — the far-edge strips of adjacent same-height
    // buildings merged into one frame-wide beam, and a near-camera
    // strip projected as a black spike; verified 2x/4x in the planehigh
    // and chase3d after-shots. Do not re-add without re-shooting.)
    const deckCols = [[122, 117, 104], [110, 114, 120], [93, 97, 103], [138, 111, 92], [117, 112, 95], [107, 111, 102]];
    const deckI = Math.floor(h2(b.x * 3 + 1, b.y * 7) * deckCols.length);
    QW([[bx - w * 0.43, h3 + 0.06, bz - d * 0.43], [bx + w * 0.43, h3 + 0.06, bz - d * 0.43], [bx + w * 0.43, h3 + 0.06, bz + d * 0.43], [bx - w * 0.43, h3 + 0.06, bz + d * 0.43]], mix(deckCols[deckI], hz(dep)), roofMin - 0.5);
    if (h2(b.x, b.y) > 0.45) {
      const acx = bx + (h2(b.x + 1, b.y) - 0.5) * w * 0.4, acz = bz + (h2(b.x, b.y + 1) - 0.5) * d * 0.4;
      box3(acx, h3, acz, 2.2, 1.2, 2.2, 0, '#6b7280', dep, propOff(acx, acz));
    }
    if (h2(b.x + 2, b.y) > 0.35) { // 2nd rooftop AC unit
      const ac2x = bx - (h2(b.x + 3, b.y) - 0.5) * w * 0.4, ac2z = bz - (h2(b.x, b.y + 3) - 0.5) * d * 0.4;
      box3(ac2x, h3, ac2z, 1.6, 0.9, 1.6, 0, '#7d838c', dep, propOff(ac2x, ac2z));
    }
    if (h2(b.x, b.y + 2) > 0.35) { // antenna mast + tip light
      const anx = bx + (h2(b.x + 4, b.y) - 0.5) * w * 0.5, anz = bz + (h2(b.x, b.y + 4) - 0.5) * d * 0.5;
      box3(anx, h3, anz, 0.18, 3.2, 0.18, 0, '#3a3f47', dep, propOff(anx, anz));
      vQuad(anx, anz, 0, 0, 0, 0.3, h3 + 3.1, h3 + 3.4, '#ff4040', roofMin - 1.0);
    }
    if (h2(b.x + 6, b.y + 6) > 0.72) { // T2: water tank on legs (old-town silhouette)
      const txp = bx - (h2(b.x + 8, b.y) - 0.5) * w * 0.4, tzp = bz - (h2(b.x, b.y + 8) - 0.5) * d * 0.4;
      box3(txp, h3 + 1.0, tzp, 1.9, 2.3, 1.9, 0, '#8a6f4d', dep, propOff(txp, tzp));
      box3(txp, h3 + 3.2, tzp, 2.1, 0.25, 2.1, 0, '#6b5638', dep, propOff(txp, tzp));
    }
    if (h2(b.x + 9, b.y + 9) > 0.78) { // T2: satellite dish, tilted to the sky
      const dix = bx + (h2(b.x + 10, b.y) - 0.5) * w * 0.4, diz = bz + (h2(b.x, b.y + 10) - 0.5) * d * 0.4;
      box3(dix, h3 + 0.6, diz, 1.4, 0.2, 1.4, 0.6, '#c8ccd4', dep, propOff(dix, diz));
    }
  }
}
// G1 sun glare: radiating streaks + one horizontal anamorphic streak
// soft=true (chase/boat): fewer, dimmer, wider streaks — the hard 6-streak
// starburst was washing out the whole frame. Title frame never calls this.
// SUN-PALM VB-39: soft alpha 0.16->0.22, half-width 4->5 — the old streaks
// were invisible against the glow (probe: no brightening along the streak
// angles). Still soft; the anamorphic stays 0.25 so it never reads as a
// line painted on a facade (VB-01).
function sunStreaks(sx, sy, len, soft) {
  x.save(); x.globalCompositeOperation = 'lighter';
  const angs = soft ? [-1.1, -0.3, 0.6, 1.7] : [-1.25, -0.55, 0.15, 0.85, 1.6, 2.5];
  const a0 = soft ? 0.22 : 0.32, hw = soft ? 5 : 2;
  for (let i = 0; i < angs.length; i += 1) {
    const L = len * (0.55 + (i % 3) * 0.25);
    x.save(); x.translate(sx, sy); x.rotate(angs[i]);
    const lg = x.createLinearGradient(0, 0, L, 0);
    lg.addColorStop(0, 'rgba(255,180,90,' + a0 + ')'); lg.addColorStop(1, 'rgba(255,180,90,0)');
    x.fillStyle = lg; x.fillRect(0, -hw, L, hw * 2);
    x.restore();
  }
  const hg = x.createLinearGradient(sx - 260, 0, sx + 260, 0);
  hg.addColorStop(0, 'rgba(255,170,90,0)'); hg.addColorStop(0.5, 'rgba(255,190,120,' + (soft ? 0.25 : 0.38) + ')'); hg.addColorStop(1, 'rgba(255,170,90,0)');
  x.fillStyle = hg; x.fillRect(sx - 260, sy - 2, 520, 4);
  x.restore();
}
export function drawChase3D(ctx, state) {
  tickJobs(state, 1 / 60); // R35-F7: jobs tick (canvas fallback; see webgl2.js buildFrame)
  x = ctx; W = ctx.canvas.width; H = ctx.canvas.height; CX = W / 2; HOR = H * .46;
  camZ = 0;
  fovF = 860; camH = 4.4; // round 22: telephoto chase lens; low eye keeps
  // the hero above the dialogue box (a higher eye pushed the car down
  // behind the HUD in the first round-22 shoot)
  const dl = state.daylight === undefined ? 1 : state.daylight;
  const sky = skyFor(dl);
  HZ[0] = sky.haze[0]; HZ[1] = sky.haze[1]; HZ[2] = sky.haze[2];
  const nightF = sky.nightF;
  // sunset: faces toward the camera fall into shadow, warm rim on top edges
  shadeK = dl > 0.7 ? 1 : dl > 0.3 ? 0.5 : 0.55;
  rimOn = dl > 0.3;
  chaseTL = dl > 0.7 ? 0.12 : dl > 0.3 ? 1 : dl > 0.15 ? 0.45 : 1; // R38 item 7: siang (dl 1.0) = mati, sore (0.45) = nyala, pagi (0.32) = redup, malam (0.08) = nyala
  const t = state.elapsed || 0;
  const city = state.city;
  const p = state.player;
  const hero = p.inPlane && p.plane ? p.plane : p.inCar && p.car ? p.car : p.inBoat && p.boat ? p.boat : p;
  const boatView = !!(p.inBoat && p.boat); // BOAT-FIX: boat-scene-only changes below
  const hx = hero.x, hy = hero.y, ha = hero.angle || 0;
  const now = performance.now();
  let dt = ccLast ? (now - ccLast) / 1000 : 0.016;
  ccLast = now;
  dt = Math.min(Math.max(dt, 0), 0.05);
  const speed = Math.abs(hero.speed || 0);
  // round 22: pull back (13–16) so the flanking walls start further ahead,
  // and sit 2 units to the hero's LEFT — the car projects right of centre,
  // clear of the dialogue box, in 3/4 rear view (roof, side and rear
  // wheels read instead of one flat slab). The longer lens (fovF 860)
  // keeps the hero the same size on screen.
  const dist = 13 + Math.min(1, speed / 540) * 3;
  const latOff = -2.0;
  const snap = !ccInit || Math.hypot(hx - ccHX, hy - ccHY) > 600;
  // round 20: when the hero has not moved since the last frame (a staged
  // shot paints the same frozen world twice), snap the camera to its
  // target instead of lerping by wall-clock dt — otherwise the two paints
  // land at slightly different camera spots and the shot is not
  // reproducible byte-for-byte. Live play is unaffected: a moving hero
  // never takes this branch, and yaw still lerps smoothly.
  const still = ccInit && hx === ccHX && hy === ccHY;
  if (snap) ccYaw = ha;
  else ccYaw += angDiff(ha, ccYaw) * Math.min(1, dt * 4.0);
  const fx = Math.cos(ccYaw), fz = Math.sin(ccYaw);
  const tx = hx * CS - fx * dist - fz * latOff, tz = hy * CS - fz * dist + fx * latOff;
  // T2 (clip #6, TERBUKTI 4x): clamp the chase camera OUT of buildings and
  // keep it over water when the hero is in a boat. Without this the camera
  // sits inside a wall and the R22 cull hides that building (visible pop).
  // CAM-CLAMP (BUG-BLITZ, R25d): the old rule clamped ONLY the camera, with
  // M=26 — so the lerp target could sit inside the ejection zone. In a
  // 16 px gap between two buildings the expanded rects overlap by 36 px:
  // the 4-iteration push-out ping-ponged 2222<->2258 and the camera froze
  // 18-36 px off target (probe: raw target (2240,869) -> camera stuck at
  // (2222,869); plane +100 px right in frame). Fix: clamp the TARGET first
  // with a small margin, so the lerp target never lies inside the ejection
  // zone and the loop cannot fight itself; the same rule guards the camera
  // as a safety net for corner clips on the lerp path. M=6: a 16 px gap
  // keeps a 4 px free corridor (6 < 16/2), so the camera can sit in a
  // genuine gap, while the point still never enters a wall rect. No
  // hysteresis state is needed: the clamped target is a pure function of
  // the raw target, and the camera converges to it instead of being
  // re-ejected every frame.
  const inBoat = !!(p.inBoat && p.boat);
  const clampPt = (wx, wy) => {
    const M = 6; // px: keep the camera point out of wall rects, nothing more
    if (inBoat) wx = Math.max(wx, WATER_X + 24);
    for (let iter = 0; iter < 4; iter += 1) {
      let hit = null;
      for (const b of city.buildings) {
        if (wx > b.x - M && wx < b.x + b.w + M && wy > b.y - M && wy < b.y + b.h + M) { hit = b; break; }
      }
      if (!hit) break;
      const l = wx - (hit.x - M), r = (hit.x + hit.w + M) - wx;
      const tp = wy - (hit.y - M), bt = (hit.y + hit.h + M) - wy;
      const mn = Math.min(l, r, tp, bt);
      if (mn === l) wx = hit.x - M;
      else if (mn === r) wx = hit.x + hit.w + M;
      else if (mn === tp) wy = hit.y - M;
      else wy = hit.y + hit.h + M;
      if (inBoat) wx = Math.max(wx, WATER_X + 24);
    }
    return [wx, wy];
  };
  const tc = clampPt(tx / CS, tz / CS);
  const txC = tc[0] * CS, tzC = tc[1] * CS;
  if (snap || still) { ccX = txC; ccZ = tzC; ccInit = true; }
  else { ccX += (txC - ccX) * Math.min(1, dt * 8); ccZ += (tzC - ccZ) * Math.min(1, dt * 8); }
  ccHX = hx; ccHY = hy;
  // Safety net: the straight lerp path can clip a rect corner — run the
  // same small-margin rule over the camera itself (T2's clip #6 guard,
  // margin 26 -> 6 so a camera already in a genuine gap is not ejected).
  {
    const cp = clampPt(ccX / CS, ccZ / CS);
    ccX = cp[0] * CS; ccZ = cp[1] * CS;
    // boat hugging the shore: the water clamp can pull the camera almost
    // onto the boat — raise the eye so the view goes over it, not through it
    if (inBoat && Math.hypot(ccX - hx * CS, ccZ - hy * CS) < 6) camH = 9;
  }
  // R25: the hero plane climbs — raise the eye on the SAME altitude scale
  // as plane3d (1 unit = ~8.3 m, altU = alt * 0.12) so the plane stays
  // framed at any altitude. The 0.9 factor lets the plane drift up in the
  // frame as it climbs (takeoff feel) instead of being pinned to one spot.
  if (p.inPlane && p.plane) camH = 4.4 + (p.plane.alt || 0) * 0.12 * 0.9;
  cfX = fx; cfZ = fz;
  // sky
  const g = x.createLinearGradient(0, 0, 0, HOR + 60);
  g.addColorStop(0, 'rgb(' + sky.top.join(',') + ')');
  g.addColorStop(0.55, 'rgb(' + sky.mid.join(',') + ')');
  g.addColorStop(0.82, 'rgb(' + sky.hor.join(',') + ')');
  g.addColorStop(1, 'rgb(' + sky.hor.join(',') + ')');
  x.fillStyle = g; x.fillRect(0, 0, W, HOR + 60);
  x.fillStyle = 'rgb(' + sky.hor.join(',') + ')'; x.fillRect(0, HOR, W, H - HOR);
  // G2 smog band: warm haze hugging the horizon (painted before the 3D so
  // buildings occlude it)
  const smog = x.createLinearGradient(0, HOR - 60, 0, HOR + 40);
  smog.addColorStop(0, 'rgba(255,150,90,0)');
  smog.addColorStop(0.55, 'rgba(255,150,90,0.32)');
  smog.addColorStop(1, 'rgba(255,150,90,0)');
  x.fillStyle = smog; x.fillRect(0, HOR - 60, W, 100);
  const smog2 = x.createLinearGradient(0, HOR + 4, 0, HOR + 64);
  smog2.addColorStop(0, 'rgba(255,140,100,0.16)');
  smog2.addColorStop(1, 'rgba(255,140,100,0)');
  x.fillStyle = smog2; x.fillRect(0, HOR + 4, W, 60);
  if (nightF > 0.4) {
    x.fillStyle = '#fff';
    for (let i = 0; i < 70; i += 1) {
      const sx = h2(i, 3) * W, sy = h2(i, 11) * HOR * 0.85;
      x.globalAlpha = nightF * (0.3 + 0.7 * h2(i, 5));
      x.fillRect(sx, sy, h2(i, 7) > 0.8 ? 2 : 1, h2(i, 7) > 0.8 ? 2 : 1);
    }
    x.globalAlpha = 1;
  }
  // sun / moon ahead, high when day, low at sunset
  const sunH = dl > 0.7 ? 42 : 10;
  const sunP = cP(ccX + cfX * 280, sunH, ccZ + cfZ * 280);
  // JETFIX Bug 5 (was: "drawn after 3D so the money shot is never occluded"):
  // the sun disc + glow + anamorphic streaks were painted AFTER the 3D ops,
  // so the disc sat on top of building facades and the horizontal streak
  // cut straight through solid walls (jets-r25.jpg). Drawn here — right
  // after the sky/smog band, BEFORE the ground tiles and the 3D ops — so
  // buildings and ground occlude the sun, exactly like the smog band above.
  // The sun stays visible in the sky gap between buildings (realistic).
  if (sunP) {
    const sg = x.createRadialGradient(sunP[0], sunP[1], 4, sunP[0], sunP[1], 150);
    if (nightF > 0.5) {
      sg.addColorStop(0, 'rgba(230,235,255,0.9)'); sg.addColorStop(0.3, 'rgba(180,200,255,0.35)'); sg.addColorStop(1, 'rgba(180,200,255,0)');
      x.fillStyle = sg; x.fillRect(sunP[0] - 150, sunP[1] - 150, 300, 300);
      x.fillStyle = '#e6ebff'; x.beginPath(); x.arc(sunP[0], sunP[1], 14, 0, 7); x.fill();
    } else {
      const sg2 = x.createRadialGradient(sunP[0], sunP[1], 4, sunP[0], sunP[1], 190);
      sg2.addColorStop(0, 'rgba(255,230,160,0.95)'); sg2.addColorStop(0.25, 'rgba(255,170,90,0.55)'); sg2.addColorStop(1, 'rgba(255,140,80,0)');
      x.fillStyle = sg2; x.fillRect(sunP[0] - 190, sunP[1] - 190, 380, 380);
      // SUN-PALM VB-39: gradient disc (hot white core -> warm rim) instead
      // of the flat #ffe9a8 fill, which read as a pale sticker. Still drawn
      // here, BEFORE the 3D ops — VB-01 stays dead (buildings occlude it).
      const dg = x.createRadialGradient(sunP[0], sunP[1], 0, sunP[0], sunP[1], 18);
      dg.addColorStop(0, '#fffdf0'); dg.addColorStop(0.55, '#ffe9a8'); dg.addColorStop(1, '#ffb45e');
      x.fillStyle = dg; x.beginPath(); x.arc(sunP[0], sunP[1], 18, 0, 7); x.fill();
      sunStreaks(sunP[0], sunP[1], 190, true); // G1 soft (round 21)
    }
  }
  // ground tiles (segmented so quads never straddle the camera plane)
  // BOAT-FIX (VB-42, boat view only — chase3d/jets byte-identical): one
  // water-coloured backing quad under the water tiles. Adjacent water tiles
  // share an exact edge; rasterisation leaves a 1px crack showing the pale
  // horizon fill = the diagonal "fan" seam (probe: two tiles, identical
  // rgb(29,111,158), shared edge (844,478)->(2151,1183)). With water-coloured
  // backing the crack is invisible. Seeded ripple dashes break the flat sheet.
  if (boatView) {
    flatQuad(WATER_X, -320, WORLD_W + 320, WORLD_H + 320, -0.4, sh([29, 111, 158], shadeK, 0));
    for (let i = 0; i < 36; i += 1) {
      const rwx = WATER_X + 30 + h2(i, 7) * (WORLD_W + 280 - WATER_X - 60);
      const rwy = ccZ / CS - 1400 + h2(i, 11) * 2400;
      if (!inRange(rwx, rwy, 175, 135)) continue;
      flatQuad(rwx, rwy, rwx + 30 + h2(i, 13) * 50, rwy + 6, -0.3, 'rgba(255,255,255,0.13)');
    }
  }
  for (let gx = -320; gx < WORLD_W + 320; gx += 320) {
    for (let gy = -320; gy < WORLD_H + 320; gy += 320) {
      const cxp = gx + 160, cyp = gy + 160;
      if (!inRange(cxp, cyp, 175, 135)) continue;
      const td = Math.hypot(cxp * CS - ccX, cyp * CS - ccZ);
      // round 20: the shoreline tile (2240–2560) straddles WATER_X — its
      // centre is on land, so the whole 320 px tile used to render as
      // land and swallowed the 112 px water strip: a boat read as
      // driving on grass. Split it: land west of the shore, water east.
      // Near-field only (tile centre < 80 units from the camera): the
      // verified chase3d frame's shoreline tile sits ~95 units ahead,
      // fogged, and must render exactly as before (sha 07be0b55…).
      const straddle = td < 80 && gx < WATER_X && gx + 320 > WATER_X;
      if (straddle) {
        let ground = '#2f6b5a';
        for (const dd of city.districts) {
          if (cxp >= dd.x && cxp < dd.x + dd.w) { ground = dd.ground; break; }
        }
        // LAMP-WALK VB-29: Harbor green (#2f6b5a) read as a grass strip
        // beside the road in chase3d (probe: rgb(23,53,45) below the road
        // edge, y 508-605). Use the Downtown slate already in this view so
        // bare land matches the road/sidewalk palette. Parks keep green.
        if (ground === '#2f6b5a') ground = '#4b5563';
        flatQuad(gx, gy, WATER_X, gy + 320, 0, sh(hx3(ground), shadeK, hz(td)));
        flatQuad(WATER_X, gy, gx + 320, gy + 320, -0.35, sh([29, 111, 158], shadeK, hz(td)));
      } else if (cxp > WATER_X) {
        flatQuad(gx, gy, gx + 320, gy + 320, -0.35, sh([29, 111, 158], shadeK, hz(td)));
      } else {
        let ground = '#2f6b5a';
        for (const dd of city.districts) {
          if (cxp >= dd.x && cxp < dd.x + dd.w) { ground = dd.ground; break; }
        }
        if (ground === '#2f6b5a') ground = '#4b5563'; // LAMP-WALK VB-29, see above
        flatQuad(gx, gy, gx + 320, gy + 320, 0, sh(hx3(ground), shadeK, hz(td)));
      }
    }
  }
  // R36 PANTAI (fallback Canvas): strip pasir di garis pantai (x 2330..
  // WATER_X) + buih ombak. Jalan/trotoar/gedung digambar SETELAH tile di
  // sini, jadi pasir di bawahnya tertutup sendiri — tidak perlu belah di
  // koridor jalan. Hanya fallback (WebGL2 pakai buildFrame); visual saja.
  for (let gy = -320; gy < WORLD_H + 320; gy += 320) {
    if (!inRange(2390, gy + 160, 175, 135)) continue;
    const td2 = Math.hypot(2390 * CS - ccX, (gy + 160) * CS - ccZ);
    const sv = h2(gy, 3);
    flatQuad(2330, gy, WATER_X, gy + 320, 0.05, sh([194 + sv * 16, 166 + sv * 10, 120 + sv * 8], shadeK, hz(td2)));
    for (let i = 0; i < 3; i += 1) {
      const dx = 2340 + h2(gy, i * 7 + 1) * 90, dy = gy + 30 + h2(gy, i * 7 + 5) * 260;
      flatQuad(dx, dy, dx + 8, dy + 5, 0.06, sh([150, 120, 80], shadeK, hz(td2)));
    }
    for (let i = 0; i < 2; i += 1) {
      const fy = gy + 40 + i * 150 + h2(gy, i + 21) * 40;
      flatQuad(WATER_X + 6, fy, WATER_X + 26, fy + 6, -0.3, 'rgba(255,255,255,0.35)');
    }
  }
  // R25: Harbor Aerospace spaceport ground (mission 13). The 2D game
  // clears buildings/parks/trees from this footprint (clearSpaceport),
  // so the 3D view paints the apron + runway + hangar + tower here.
  // Gate matches PATCH-SPEC T3 §6.3 (centre 2240,640, 175x135). The
  // hangar door + tower windows face SOUTH (the staged takeoff shot
  // looks north up the runway, so the south faces are the visible ones).
  if (inRange(2240, 640, 175, 135)) {
    const sd = Math.hypot(2240 * CS - ccX, 640 * CS - ccZ);
    const sdt = hz(sd);
    flatQuad(2080, 480, 2400, 800, 0.02, sh(hx3('#6b7280'), shadeK, sdt)); // apron
    flatQuad(2220, 520, 2300, 780, 0.04, sh(hx3('#2a2d33'), shadeK, sdt)); // runway
    for (let d0 = 540; d0 < 780; d0 += 40) flatQuad(2258, d0, 2262, d0 + 20, 0.09, '#e8d44d'); // centreline
    flatQuad(2224, 524, 2296, 532, 0.09, '#e8e4d8'); // threshold N
    flatQuad(2224, 768, 2296, 776, 0.09, '#e8e4d8'); // threshold S
    flatQuad(2336, 532, 2368, 564, 0.05, sh(hx3('#7d838c'), shadeK, sdt)); // rocket pad
    flatQuad(2344, 540, 2360, 556, 0.07, '#c98a3d');
    const hdep = Math.hypot(2166 * CS - ccX, 680 * CS - ccZ);
    box3(2166 * CS, 0.02, 680 * CS, 10, 6, 8, 0, '#7d838c', hdep); // hangar
    // WIN-FIX (VB-14): the south door glow was at fOff 4.1 — INSIDE the box
    // (the south face sits at fOff 5.0), so the face painted over it; and
    // from the staged takeoff camera its y 0.8-2.4 projects BELOW the
    // frame (probe: glow bbox y 779-961, hangar faces dep 6.7 fill
    // x 0-465, y 368-800 blank). Fix the offset to 5.1 AND put the real
    // door on the EAST face — the face this camera actually sees.
    // SOUTH-GLOW (R25k follow-up): that south-face glow quad (6 wide x
    // 1.6 tall, solid cyan, fOff 5.1) is DELETED — the real door lives on
    // the EAST face (below), so this quad had no function, and from the
    // gap-staging camera it projected as a ~310x110 px cyan sticker slab
    // on the hangar's south face. The south face keeps its framed windows
    // + roofline trim (WIN-FIX r2, below), so it does not go blank.
    // East face (a=0, fOff 4.1 = d/2+0.1): a grazing face, so detail needs
    // an explicit dep just in front of the face's nearest corner (same
    // trap as bld3 windows: box3 sorts the face by its nearest corner
    // and would paint over detail at computed dep).
    const hgx = 2166 * CS, hgz = 680 * CS;
    const hEastDep = fwdD(hgx + 4, hgz + 5) - 0.5;
    // tall hangar door: dark panel (not a solid cyan slab) + cyan header
    // + slats + side frames. On screen: x 313-447, y 415-800.
    vQuad(hgx, hgz, 0, 4.1, 0, 6, 0.8, 5.2, '#33383f', hEastDep);
    vQuad(hgx, hgz, 0, 4.12, 0, 6, 5.2, 5.5, '#05d9e8', hEastDep);
    for (const sy of [2.0, 3.2, 4.4]) vQuad(hgx, hgz, 0, 4.12, 0, 6, sy, sy + 0.14, 'rgba(0,0,0,0.5)', hEastDep);
    vQuad(hgx, hgz, 0, 4.12, -3.06, 0.14, 0.8, 5.2, 'rgba(10,10,16,0.75)', hEastDep);
    vQuad(hgx, hgz, 0, 4.12, 3.06, 0.14, 0.8, 5.2, 'rgba(10,10,16,0.75)', hEastDep);
    // flanking clerestory windows + panel seams + roofline/base trims
    // WIN-FIX r2: the clerestory glass was one flat yellow slab at 4x —
    // split each into 4 panes (mullion + transom) like the tower windows.
    for (const wx of [-4.2, 4.2]) {
      vQuad(hgx, hgz, 0, 4.11, wx, 1.6, 4.1, 5.5, 'rgba(10,10,16,0.85)', hEastDep);
      vQuad(hgx, hgz, 0, 4.12, wx, 1.3, 4.2, 5.4, 'rgba(255,205,120,0.95)', hEastDep);
      vQuad(hgx, hgz, 0, 4.13, wx, 0.1, 4.2, 5.4, 'rgba(10,10,16,0.7)', hEastDep);
      vQuad(hgx, hgz, 0, 4.13, wx, 1.3, 4.72, 4.85, 'rgba(10,10,16,0.7)', hEastDep);
      vQuad(hgx, hgz, 0, 4.12, wx, 0.12, 0.8, 4.0, 'rgba(0,0,0,0.4)', hEastDep);
    }
    vQuad(hgx, hgz, 0, 4.12, 0, 10, 5.7, 6.0, 'rgba(0,0,0,0.35)', hEastDep);
    vQuad(hgx, hgz, 0, 4.12, 0, 10, 0.1, 1.0, 'rgba(0,0,0,0.35)', hEastDep);
    // WIN-FIX r2: the SOUTH face sliver (screen x 0-202, y 368-800) was
    // still blank tan — only 1.6 world units of it are on screen, so a
    // column of two small framed windows + a roofline trim is all that
    // fits, and it is all the strip needs to stop reading as a void.
    vQuad(2166 * CS, 680 * CS, Math.PI / 2, 5.1, 0, 8, 5.7, 6.0, 'rgba(0,0,0,0.35)');
    for (const wy of [2.8, 4.5]) {
      vQuad(2166 * CS, 680 * CS, Math.PI / 2, 5.08, -3.2, 1.5, wy - 0.1, wy + 1.1, 'rgba(10,10,16,0.85)');
      vQuad(2166 * CS, 680 * CS, Math.PI / 2, 5.1, -3.2, 1.2, wy, wy + 1.0, 'rgba(255,205,120,0.95)');
      vQuad(2166 * CS, 680 * CS, Math.PI / 2, 5.12, -3.2, 0.1, wy, wy + 1.0, 'rgba(10,10,16,0.7)');
    }
    box3(2138 * CS, 0.02, 518 * CS, 3.6, 14, 3.6, 0, '#8a8f98', hdep); // tower
    // WIN-FIX (VB-14): the tower window band was one flat pale slab
    // (2.4x2.5, no divisions) on an otherwise blank face. Dark frame +
    // 3 panes + transom, plus a second row lower (still above the
    // hangar's roofline from this camera).
    vQuad(2138 * CS, 518 * CS, Math.PI / 2, 1.87, 0, 2.6, 8.9, 11.6, 'rgba(10,10,16,0.85)');
    for (const wx of [-0.8, 0, 0.8]) vQuad(2138 * CS, 518 * CS, Math.PI / 2, 1.9, wx, 0.66, 9, 11.5, 'rgba(255,205,120,0.95)');
    vQuad(2138 * CS, 518 * CS, Math.PI / 2, 1.92, 0, 2.4, 10.15, 10.3, 'rgba(10,10,16,0.7)');
    vQuad(2138 * CS, 518 * CS, Math.PI / 2, 1.87, 0, 2.6, 6.5, 8.6, 'rgba(10,10,16,0.85)');
    for (const wx of [-0.8, 0, 0.8]) vQuad(2138 * CS, 518 * CS, Math.PI / 2, 1.9, wx, 0.66, 6.6, 8.5, 'rgba(255,205,120,0.9)');
    box3(2138 * CS, 14, 518 * CS, 0.18, 3.2, 0.18, 0, '#3a3f47', hdep); // antenna
    vQuad(2138 * CS, 518 * CS, Math.PI / 2, 1.9, 0, 0.3, 17.1, 17.4, '#ff4040'); // tip light
    for (const tk of [[2352, 700], [2352, 744]]) {
      box3(tk[0] * CS, 0.02, tk[1] * CS, 3.2, 2.6, 3.2, 0, '#c8ccd4', hdep); // fuel tank
      box3(tk[0] * CS, 2.6, tk[1] * CS, 3.4, 0.2, 3.4, 0, '#9aa0a8', hdep);
    }
  }
  // water glitter on the water ahead of the camera (near the harbor)
  if (ccX > WATER_X * CS - 70) {
    const nx = ccX + cfX * 50, nz = ccZ + cfZ * 50;
    const fx2 = ccX + cfX * 170, fz2 = ccZ + cfZ * 170;
    const rx = -cfZ, rz = cfX;
    QW([[nx + rx * 18, -0.3, nz + rz * 18], [nx - rx * 18, -0.3, nz - rz * 18],
      [fx2 - rx * 34, -0.3, fz2 - rz * 34], [fx2 + rx * 34, -0.3, fz2 + rz * 34]], 'rgba(255,170,90,0.18)');
  }
  // parks
  for (const park of city.parks) {
    if (!inRange(park.x + park.w / 2, park.y + park.h / 2, 170, 130)) continue;
    const pd = Math.hypot((park.x + park.w / 2) * CS - ccX, (park.y + park.h / 2) * CS - ccZ);
    flatQuad(park.x, park.y, park.x + park.w, park.y + park.h, 0.03, sh(hx3('#3f8f4f'), shadeK, hz(pd)));
  }
  // R35-F9: night market (Pasar Malam) on the Downtown park — stalls +
  // string lights; visual only, no collision (see game/src/market.js).
  drawMarket3D({ box3, vQuad, flatQuad, inRange, sh, hx3, hz, CS, dist: (wx, wy) => Math.hypot(wx * CS - ccX, wy * CS - ccZ) }, city, nightF);
  // roads + sidewalks + center dashes, segmented per 320 px
  // R33-MERGE (Juna #6): chase road WIDER — asphalt half-width 36->44,
  // sidewalk 52->58, so cars sit clearly clear of the flanking buildings.
  // VISUAL ONLY (drawChase3D paint): ROAD_W/gameplay/collision untouched.
  // Building faces stay at 50 (city.js), so a 6 px sidewalk strip remains;
  // parked cars (+40) now sit on the asphalt edge, as parallel-parked cars do.
  for (const rx of city.roadsV) {
    for (let gy = -320; gy < WORLD_H + 320; gy += 320) {
      if (!inRange(rx, gy + 160, 175, 135)) continue;
      const rd = Math.hypot(rx * CS - ccX, (gy + 160) * CS - ccZ);
      flatQuad(rx - 58, gy, rx + 58, gy + 320, 0.05, sh(hx3('#9aa0a8'), shadeK, hz(rd)));
      flatQuad(rx - 44, gy, rx + 44, gy + 320, 0.06, sh(hx3('#33373d'), shadeK, hz(rd)));
      for (let d0 = gy + 24; d0 < gy + 320; d0 += 128) {
        if (!inRange(rx, d0 + 16, 115, 75)) continue;
        flatQuad(rx - 2.5, d0, rx + 2.5, d0 + 64, 0.09, '#e8d44d');
      }
    }
  }
  for (const ry of city.roadsH) {
    for (let gx = -320; gx < WORLD_W + 320; gx += 320) {
      if (!inRange(gx + 160, ry, 175, 135)) continue;
      const rd = Math.hypot((gx + 160) * CS - ccX, ry * CS - ccZ);
      // round 20: roads end at the shoreline — the segment past WATER_X
      // used to paint asphalt straight across the water strip (and the
      // off-map water east of it). Clip the surface, sidewalk and dashes.
      // Near-field only (segment centre < 80 units from the camera), so
      // the verified chase3d frame's road, ~95 units ahead, is untouched.
      const clip = rd < 80;
      const x1 = clip ? Math.min(gx + 320, WATER_X) : gx + 320;
      if (x1 <= gx) continue;
      flatQuad(gx, ry - 58, x1, ry + 58, 0.05, sh(hx3('#9aa0a8'), shadeK, hz(rd)));
      flatQuad(gx, ry - 44, x1, ry + 44, 0.06, sh(hx3('#33373d'), shadeK, hz(rd)));
      for (let d0 = gx + 24; d0 < gx + 320 && (!clip || d0 < WATER_X); d0 += 128) {
        if (!inRange(d0 + 16, ry, 115, 75)) continue;
        flatQuad(d0, ry - 2.5, clip ? Math.min(d0 + 64, WATER_X) : d0 + 64, ry + 2.5, 0.09, '#e8d44d');
      }
    }
  }
  // R36-ROADS (Juna 17:18: zebra di chase): zebra + garis stop di tiap
  // persimpangan yang terlihat (4 lengan). Fallback Canvas — WebGL2 punya
  // versi sendiri di roadSeg (webgl2.js). VISUAL ONLY. y .11 (di atas marka
  // tengah .09) supaya tidak z-fight.
  for (const rx of city.roadsV) for (const ry of city.roadsH) {
    if (!inRange(rx, ry, 175, 135)) continue;
    const rd = Math.hypot(rx * CS - ccX, ry * CS - ccZ), zw = sh(hx3('#e8e8e6'), shadeK, hz(rd));
    for (const sd of [1, -1]) {
      for (let k = 0; k < 9; k += 1) flatQuad(rx - 36 + k * 9, ry + sd * 52 - 14, rx - 36 + k * 9 + 4, ry + sd * 52 + 14, 0.11, zw);
      flatQuad(rx - 44, ry + sd * 57 - 2, rx + 44, ry + sd * 57 + 2, 0.11, zw);
      for (let k = 0; k < 9; k += 1) flatQuad(rx + sd * 52 - 14, ry - 36 + k * 9, rx + sd * 52 + 14, ry - 36 + k * 9 + 4, 0.11, zw);
      flatQuad(rx + sd * 57 - 2, ry - 44, rx + sd * 57 + 2, ry + 44, 0.11, zw);
    }
  }
  // warm sun glow on the asphalt ahead (low sun, straight ahead)
  if (dl > 0.3 && dl < 0.75) {
    const nx = ccX + cfX * 25, nz = ccZ + cfZ * 25;
    const fx2 = ccX + cfX * 110, fz2 = ccZ + cfZ * 110;
    const rx = -cfZ, rz = cfX;
    QW([[nx + rx * 4, 0.11, nz + rz * 4], [nx - rx * 4, 0.11, nz - rz * 4],
      [fx2 - rx * 7, 0.11, fz2 - rz * 7], [fx2 + rx * 7, 0.11, fz2 + rz * 7]], 'rgba(255,150,70,0.30)', 'far');
    QW([[nx + rx * 1.5, 0.12, nz + rz * 1.5], [nx - rx * 1.5, 0.12, nz - rz * 1.5],
      [fx2 - rx * 2.5, 0.12, fz2 - rz * 2.5], [fx2 + rx * 2.5, 0.12, fz2 + rz * 2.5]], 'rgba(255,195,115,0.35)', 'far');
  }
  // VB-06-REDO: the G2 smog-cloud loop is REMOVED, not retuned. Probe
  // (boat3d, seed 7, R25d): its 5 quads — rgb(239,138,119) /
  // rgb(239,161,134), x 221-1154, y 321-346, d 361-419 — TILED into the
  // solid peach bar across the horizon. JETFIX-2 only moved the bar
  // (old y 26-52 -> new y 14-24); opaque rgb quads, 100-180 wide, at
  // near-identical height/forward distance, always tile into a
  // hard-edged strip — no alpha/size tweak can un-tile them. The
  // gradient smog band above (HOR-60..HOR+40) already does horizon
  // haze smoothly; these quads added nothing but the bar. Do NOT
  // re-add horizon quads here — any opaque quad at this distance
  // reads as a floating bar (VB-06).
  // JETFIX-2 Bug 1: the distant skyline silhouettes are REMOVED. They were
  // 10 dark slabs fixed 400-430 units ahead of the camera, standing on
  // y=0 at z ~ -313 — far beyond the ground tiles (which end at z -32),
  // so from any eye above ~10 units their bases (screen y ~410) float in
  // the flat orange horizon fill with no ground beneath them (probe:
  // slabs (871,321)-(948,412), (919,319)-(981,410), (999,291)-
  // (1072,410) — the brown blocks in the circled sky region). The real
  // city already fills the horizon; a distant skyline that cannot be
  // grounded is worse than none. Re-add only with ground that reaches it.
  // buildings
  for (const b of city.buildings) {
    if (!inRange(b.x + b.w / 2, b.y + b.h / 2, 155, 105)) continue;
    // round 22: cull the buildings flanking the camera — their side walls
    // sit 2–3 units away and explode across the whole frame as blank
    // slabs. The street then opens to the buildings a block ahead, which
    // read as a city instead of a canyon; the road + sunset dominate.
    const br = camRel(b.x + b.w / 2, b.y + b.h / 2);
    const nearFwd = br[0] - Math.max(b.w, b.h) * CS / 2;
    if (nearFwd < 16 && Math.abs(br[1]) < 16) continue;
    bld3(b, nightF, t);
  }
  // trees (T2: 3 variants by hash — tall, wide, palm-ish; never identical)
  for (const tree of city.trees) {
    if (!inRange(tree.x, tree.y, 85, 85)) continue;
    const cxp = tree.x * CS, czp = tree.y * CS;
    const dep = Math.hypot(cxp - ccX, czp - ccZ);
    const tv = h2(tree.x, tree.y);
    const th = 1.0 + tv * 0.8, cw = 1.8 + h2(tree.x + 3, tree.y) * 1.2;
    box3(cxp, 0, czp, 0.5, th, 0.5, 0, '#5a4632', dep);
    box3(cxp, th - 0.1, czp, cw, 1.6 + tv, cw, 0, ['#1f5c2e', '#276031', '#2a6b35'][Math.floor(tv * 3)], dep);
  }
  // docks / marina piers + containers + crane
  const docks = city.docks, marina = city.marina;
  if (inRange(docks.x + docks.w / 2, docks.y + docks.h / 2, 130, 110)) {
    flatQuad(docks.x, docks.y, docks.x + docks.w, docks.y + docks.h, 0.1, '#6b5a44');
    const dep = Math.hypot((docks.x + 64) * CS - ccX, (docks.y + 140) * CS - ccZ);
    for (let i = 0; i < 3; i += 1) box3((docks.x + 38) * CS, 0.1, (docks.y + 34 + i * 56) * CS, 6, 2.2, 4.4, 0, ['#b8455a', '#4a7fb5', '#3f8f6f'][i], dep);
    box3((docks.x + 96) * CS, 0.1, (docks.y + 262) * CS, 1.2, 15, 1.2, 0, '#c98a3d', dep);
    box3((docks.x + 96) * CS, 14, (docks.y + 262) * CS, 1.2, 1.2, 12, 0, '#c98a3d', dep);
  }
  if (inRange(marina.x + marina.w / 2, marina.y + marina.h / 2, 130, 110)) {
    flatQuad(marina.x, marina.y, marina.x + marina.w, marina.y + marina.h, 0.1, '#6b5a44');
  }
  // BOAT-FIX (VB-43, boat view only): the shoreline was one straight hard
  // line with zero dock detail. Quay furniture hugging x=WATER_X (clear of
  // the boat lane and the shore road): concrete quay edge + yellow safety
  // line, iron bollards on the edge, tyre fenders on the quay face.
  if (boatView && inRange(WATER_X, 1000, 130, 110)) {
    const qdep = Math.hypot(WATER_X * CS - ccX, 1000 * CS - ccZ);
    flatQuad(WATER_X - 10, 640, WATER_X, 1560, 0.06, '#8a8f98');
    flatQuad(WATER_X - 11, 640, WATER_X - 8, 1560, 0.07, '#ffd23e');
    // BOAT-FIX-3: bollards/tires sit ON a ground tile whose painter depth
    // ties with theirs (~26.2 vs ~26.8), so the tile painted over the
    // bollard's lower-left edge (3 px light nick at 4x). depOff -1 forces
    // the quay furniture to paint after the ground it stands on.
    for (const by of [760, 880, 1000, 1120, 1240]) {
      box3((WATER_X - 6) * CS, 0.1, by * CS, 0.5, 0.7, 0.5, 0, '#1c1f24', qdep, -1);
    }
    for (const ty of [820, 940, 1060, 1180]) {
      box3((WATER_X + 2) * CS, -0.3, ty * CS, 0.4, 0.55, 0.7, 0, '#14161a', qdep, -1);
    }
  }
  // gas station
  const gas = state.gasStation;
  if (gas && inRange(gas.x + gas.w / 2, gas.y + gas.h / 2, 120, 100)) {
    const dep = Math.hypot((gas.x + gas.w / 2) * CS - ccX, (gas.y + gas.h / 2) * CS - ccZ);
    flatQuad(gas.x, gas.y, gas.x + gas.w, gas.y + gas.h, 0.07, '#7d8183');
    box3((gas.x + gas.w / 2) * CS, 3.6, (gas.y + 30) * CS, gas.w * CS * 0.7, 0.5, 8, 0, '#292f3c', dep);
    for (const pump of gas.pumps) {
      if (pump.alive) box3(pump.x * CS, 0.07, pump.y * CS, 1.6, 2.2, 0.8, 0, '#cc3e45', dep);
    }
  }
  // drawbridge
  const br = state.bridge;
  if (br && inRange(BRIDGE.x, (BRIDGE.top + BRIDGE.bottom) / 2, 135, 110)) {
    const up = br.up;
    const x0 = (BRIDGE.x - 36) * CS, x1 = (BRIDGE.x + 36) * CS;
    const zT = BRIDGE.top * CS, zM = ((BRIDGE.top + BRIDGE.bottom) / 2) * CS, zB = BRIDGE.bottom * CS;
    const lift = up ? 7 : 0;
    QW([[x0, 0.12, zT], [x1, 0.12, zT], [x1, 0.12 + lift, zM], [x0, 0.12 + lift, zM]], up ? '#2c313a' : '#4a5058');
    QW([[x0, 0.12 + lift, zM], [x1, 0.12 + lift, zM], [x1, 0.12, zB], [x0, 0.12, zB]], up ? '#2c313a' : '#4a5058');
    if (!up) QW([[BRIDGE.x * CS - 0.2, 0.16, zT + 0.8], [BRIDGE.x * CS + 0.2, 0.16, zT + 0.8], [BRIDGE.x * CS + 0.2, 0.16, zB - 0.8], [BRIDGE.x * CS - 0.2, 0.16, zB - 0.8]], '#e8d44d');
    if (up) {
      const blink = Math.sin(t * 10) > 0 ? '#ff3b30' : '#7a1f1a';
      for (const [lx, lz] of [[-40, BRIDGE.top - 8], [40, BRIDGE.top - 8], [-40, BRIDGE.bottom + 8], [40, BRIDGE.bottom + 8]]) {
        const pxp = cP((BRIDGE.x + lx) * CS, 1.2, lz * CS);
        if (pxp) { x.fillStyle = blink; x.beginPath(); x.arc(pxp[0], pxp[1], Math.max(2, 300 / pxp[2]), 0, 7); x.fill(); }
      }
    }
  }
  // casino sign
  if (city.casino && nightF > 0.25 && inRange(city.casino.x, city.casino.y, 120, 100)) {
    const pp = cP(city.casino.x * CS, 42, city.casino.y * CS);
    if (pp) {
      const fs = Math.round(cl(1500 / pp[2], 10, 42));
      x.save(); x.font = 'bold ' + fs + 'px sans-serif'; x.textAlign = 'center';
      x.shadowColor = '#ffd23e'; x.shadowBlur = 14; x.fillStyle = '#ffd23e';
      x.fillText('★ CASINO ★', pp[0], pp[1]); x.restore();
    }
  }
  // mission target beacon
  const tgt = state.mission && state.mission.target;
  if (tgt && inRange(tgt.x, tgt.y, 160, 120)) {
    const txp = tgt.x * CS, tzp = tgt.y * CS;
    const rx = -cfZ, rz = cfX;
    QW([[txp - rx * 1.6, 0.1, tzp - rz * 1.6], [txp + rx * 1.6, 0.1, tzp + rz * 1.6], [txp + rx * 1.6, 24, tzp + rz * 1.6], [txp - rx * 1.6, 24, tzp - rz * 1.6]], 'rgba(255,210,62,0.28)');
    flatQuad(tgt.x - 26, tgt.y - 26, tgt.x + 26, tgt.y - 22, 0.12, '#ffd23e');
    flatQuad(tgt.x - 26, tgt.y + 22, tgt.x + 26, tgt.y + 26, 0.12, '#ffd23e');
    flatQuad(tgt.x - 26, tgt.y - 26, tgt.x - 22, tgt.y + 26, 0.12, '#ffd23e');
    flatQuad(tgt.x + 22, tgt.y - 26, tgt.x + 26, tgt.y + 26, 0.12, '#ffd23e');
    const lp = cP(txp, 27, tzp);
    // JETFIX-3 (VB-18): the world-space label was a DUPLICATE of the HUD
    // compass ("Marina — 1000m" big at top centre + small "Marina" floating
    // over the sun glow). At 1000 m the beacon projects into the sky, so
    // the small label reads as ghost text. Only draw it when the target is
    // near (< 450 px) — then it sits ON the beacon where it belongs; far
    // away the compass HUD is the only label.
    if (lp && Math.hypot(tgt.x - p.x, tgt.y - p.y) < 450) {
      x.save(); x.font = 'bold ' + Math.round(cl(900 / lp[2], 11, 22)) + 'px sans-serif'; x.textAlign = 'center';
      x.fillStyle = '#ffd23e'; x.fillText(tgt.label, lp[0], lp[1]); x.restore();
    }
  }
  // ---- R35-F7-RAMP-START (F7-A ramps + F7-B job beacon, canvas fallback) ----
  // Stunt ramps on the road + active district-job beacon (cyan, same shape
  // as the mission beacon above so it reads as a waypoint). ONE block.
  for (const r of STUNT_RAMPS) {
    if (inRange(r.x, r.y, 160, 120)) drawRamp3D(r);
  }
  const _job = activeJob(jobsState(state));
  if (_job && inRange(_job.tx, _job.ty, 160, 120)) {
    const txp = _job.tx * CS, tzp = _job.ty * CS;
    const rx = -cfZ, rz = cfX;
    QW([[txp - rx * 1.6, 0.1, tzp - rz * 1.6], [txp + rx * 1.6, 0.1, tzp + rz * 1.6], [txp + rx * 1.6, 24, tzp + rz * 1.6], [txp - rx * 1.6, 24, tzp - rz * 1.6]], 'rgba(55,224,230,0.28)');
    flatQuad(_job.tx - 26, _job.ty - 26, _job.tx + 26, _job.ty + 26, 0.12, 'rgba(55,224,230,0.35)');
    const lp = cP(txp, 27, tzp);
    if (lp && Math.hypot(_job.tx - p.x, _job.ty - p.y) < 450) {
      ops.push({ d: lp[2], f() {
        x.save();
        x.font = 'bold ' + Math.round(cl(900 / lp[2], 11, 22)) + 'px sans-serif'; x.textAlign = 'center';
        x.fillStyle = '#37e0e6'; x.fillText('JOB: ' + _job.title.toUpperCase(), lp[0], lp[1]);
        x.restore();
      } });
    }
  }
  // ---- R35-F7-RAMP-END ----
  // parked + moving traffic
  for (const car of state.traffic.parked) {
    if (!car.alive || !inRange(car.x, car.y, 150, 100)) continue;
    car3d(car.x, car.y, car.angle, car.length, car.width, car.color, { t, type: car.type });
  }
  for (const car of state.traffic.cars) {
    if (!car.alive || !inRange(car.x, car.y, 150, 100)) continue;
    car3d(car.x, car.y, car.angle, car.length, car.width, car.color, { t, type: car.type });
  }
  if (state.armored && state.armored.truck && state.armored.truck.alive && inRange(state.armored.truck.x, state.armored.truck.y, 150, 100)) {
    const tr = state.armored.truck;
    car3d(tr.x, tr.y, tr.angle, tr.length, tr.width, '#4a5240', { t });
    const dp = cP(tr.x * CS, 4, tr.y * CS);
    if (dp) { x.save(); x.font = 'bold 20px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#ffd23e'; x.fillText('$', dp[0], dp[1]); x.restore(); }
  }
  // police units
  for (const unit of state.police.units) {
    if (unit.kind === 'car' || unit.kind === 'mtruck') {
      if (!inRange(unit.car.x, unit.car.y, 150, 100)) continue;
      if (unit.car.concrete) {
        box3(unit.car.x * CS, 0.15, unit.car.y * CS, unit.car.width * CS, 2.2, unit.car.length * CS, unit.car.angle, '#6b6f75', Math.hypot(unit.car.x * CS - ccX, unit.car.y * CS - ccZ));
      } else {
        car3d(unit.car.x, unit.car.y, unit.car.angle, unit.car.length, unit.car.width, unit.car.color || '#2f6fd0', { pol: true, t, type: unit.car.type });
      }
    } else if (unit.kind === 'boat') {
      if (!inRange(unit.x, unit.y, 150, 100)) continue;
      boat3d(unit.x, unit.y, unit.angle, 54, 20, '#2f6fd0', { pol: true, t });
    } else if (unit.kind === 'gunman' || unit.kind === 'soldier') {
      if (!inRange(unit.x, unit.y, 80, 80)) continue;
      ped3d(unit.x, unit.y, unit.angle, unit.kind === 'soldier' ? '#5a6b3a' : '#a33327');
    }
  }
  // boats (world boats + player boat)
  for (const boat of state.boats || []) {
    if (!boat.alive || !inRange(boat.x, boat.y, 150, 100)) continue;
    // BOAT-REBUILD: the hero boat is drawn again below ("hero last") —
    // drawing it here too doubled every wake/foam alpha and read as a
    // solid white road behind the hero. Skip it here; the hero-last pass
    // draws it once, last (nearest).
    if (p.inBoat && p.boat === boat) continue;
    boat3d(boat.x, boat.y, boat.angle, boat.length, boat.width, boat.color, { hero: p.inBoat && p.boat === boat, t });
  }
  // helicopter + searchlight
  const heli = state.police.heli;
  if (heli && heli.active && inRange(heli.x, heli.y, 170, 130)) {
    heli3d(heli.x, heli.y, p.x, p.y, heli.rotor || 0, t);
  }
  // R25: HAF military jets (6 stars, airborne in the plane) — without
  // this they shoot an invisible enemy in the default 3D view. Jets have
  // no alt field; they chase the hero plane, so they fly at its altitude.
  if (state.space && state.space.jets && state.space.jets.length && p.inPlane && p.plane) {
    for (const j of state.space.jets) {
      if (!inRange(j.x, j.y, 170, 130)) continue;
      plane3d(j.x, j.y, j.angle, { alt: p.plane.alt || 0, throttle: 1 }, { jet: true, t });
    }
  }
  // pedestrians
  const PEDC = ['#e8e4d8', '#c0392b', '#2e86c1', '#f39c12'];
  for (let i = 0; i < state.peds.length; i += 1) {
    const ped = state.peds[i];
    if (!ped.alive || !inRange(ped.x, ped.y, 70, 70)) continue;
    ped3d(ped.x, ped.y, ped.angle + Math.PI / 2, PEDC[i % 4]);
  }
  // collectibles
  for (const c of state.collectibles) {
    if (c.taken || !inRange(c.x, c.y, 90, 90)) continue;
    // R32-COIN (fallback canvas): kotak kuning berputar DIHAPUS (Juna:
    // "jelek banget") — koin emas bulat + $ (sama seperti WebGL2). Koin
    // digambar screen-space via ops (depth-sorted) + bayangan kontak di
    // tanah supaya kebaca diletakkan, bukan melayang.
    flatQuad(c.x - 8, c.y - 8, c.x + 8, c.y + 8, 0.03, 'rgba(0,0,0,0.3)');
    const cp = cP(c.x * CS, 0.9, c.y * CS);
    if (cp) {
      const cr = cl(520 / cp[2], 6, 30);
      ops.push({ d: cp[2], f() {
        x.save();
        x.beginPath(); x.arc(cp[0], cp[1], cr, 0, 7); x.fillStyle = '#ffd23e'; x.fill();
        x.lineWidth = Math.max(1, cr * 0.14); x.strokeStyle = '#a67c00'; x.stroke();
        x.beginPath(); x.arc(cp[0], cp[1], cr * 0.68, 0, 7); x.fillStyle = '#e8b93c'; x.fill();
        x.fillStyle = '#7a5a00'; x.font = 'bold ' + Math.round(cr * 0.95) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('$', cp[0], cp[1] + cr * 0.05);
        x.restore();
      } });
    }
    // BOAT-FIX (VB-26): the harbour token at (2446,1166) sat 2 px from the
    // water with no shadow or base, reading as a floating yellow cube on
    // the dock. Near-water tokens sit on a wooden crate with a contact
    // shadow, so they read as placed supplies.
    if (c.x > WATER_X - 80) {
      box3(c.x * CS, 0.05, c.y * CS, 1.5, 0.35, 1.5, 0, '#6b4a2f', Math.hypot(c.x * CS - ccX, c.y * CS - ccZ));
      flatQuad(c.x - 12, c.y - 12, c.x + 12, c.y + 12, 0.03, 'rgba(0,0,0,0.35)');
    }
  }
  // UFO
  const ufo = state.ufo;
  if (ufo && ufo.active && inRange(ufo.x, ufo.y, 170, 130)) {
    const ux = ufo.x * CS, uz = ufo.y * CS;
    const dep = Math.hypot(ux - ccX, uz - ccZ);
    box3(ux, 26, uz, 9, 0.8, 9, t * 0.5, '#20242a', dep);
    QW([[ux - 4, 26, uz], [ux + 4, 26, uz], [ux + 1.2, 0.1, uz], [ux - 1.2, 0.1, uz]], 'rgba(120,255,140,0.20)');
  }
  // particles (flames / smoke as camera-facing quads)
  let drawn = 0;
  for (const pt of state.particles) {
    if (drawn > 24) break;
    if (pt.kind !== 'flame' && pt.kind !== 'smoke') continue;
    if (!inRange(pt.x, pt.y, 120, 100)) continue;
    const a = Math.max(0, pt.life / pt.maxLife);
    const sz = pt.size * CS * (1.6 - a * 0.6) * 2.2;
    const col = pt.kind === 'flame' ? 'rgba(255,140,40,' + (a * 0.85).toFixed(3) + ')' : 'rgba(140,140,150,' + (a * 0.5).toFixed(3) + ')';
    vQuad(pt.x * CS, pt.y * CS, ccYaw, 0, 0, sz, Math.max(0.1, pt.size * CS * 0.4), Math.max(0.1, pt.size * CS * 0.4) + sz, col);
    drawn += 1;
  }
  // bullets
  drawn = 0;
  for (const b of state.bullets) {
    if (drawn > 12) break;
    if (!inRange(b.x, b.y, 120, 100)) continue;
    vQuad(b.x * CS, b.y * CS, ccYaw, 0, 0, 0.5, 0.6, 1.1, '#ffe9a8');
    drawn += 1;
  }
  // hero last (nearest): plane / car / boat / on foot (R25: plane first)
  if (p.inPlane && p.plane) plane3d(p.plane.x, p.plane.y, p.plane.angle, p.plane, { hero: true, t });
  else if (p.inCar && p.car) car3d(p.car.x, p.car.y, p.car.angle, p.car.length, p.car.width, p.car.paint || '#e33e5f', { hero: true, t });
  else if (p.inBoat && p.boat) boat3d(p.boat.x, p.boat.y, p.boat.angle, p.boat.length, p.boat.width, p.boat.color, { hero: true, t });
  else ped3d(p.x, p.y, p.angle, '#ffd23e');
  // JF4: lamps + palms sit on the SIDEWALK, 43px from the ROAD centreline
  // (road half-width 36px + 7px = sidewalk centre). They were placed
  // ±4.6 from the CAMERA line, but the camera sits latOff -2.0 (20px)
  // north of the road centre, so the north row landed 16px INSIDE the
  // buildings and the south row 10px ONTO the road (probe: chase3d
  // seed 7 — north lamps zone BUILDING, south lamps zone ROAD; the north
  // palm at fwd 30 read as a T-pole standing in the road). roadLat is
  // the lateral coordinate of the road centreline, measured from the
  // camera, so it stays correct in any lane and on any road.
  const roadLat = (() => {
    if (Math.abs(cfX) >= Math.abs(cfZ)) {
      const roadY = city.roadsH.reduce((a, b) => Math.abs(b - hy) < Math.abs(a - hy) ? b : a);
      return (roadY * CS - ccZ) * cfX;
    }
    const roadX = city.roadsV.reduce((a, b) => Math.abs(b - hx) < Math.abs(a - hx) ? b : a);
    return (roadX * CS - ccX) * -cfZ;
  })();
  // POLEFIX2: lamps + palms sit HARD on the sidewalk, flush with the
  // building line — walkLat 4.8 (48px from the road centreline: 12px
  // past the 36px asphalt edge, 2px off the 50px facade). JF4's 4.3
  // (mid-sidewalk, 7px past the edge) FAILED on screen: at the
  // chase-cam's grazing angle the 7px strip projects to a sliver, so
  // the trunk base still read as standing on the asphalt edge and the
  // T-arm overhung the road (parent verified at 2x zoom: trunk x~571,
  // base y~510, dark asphalt immediately left AND right of the base).
  // Palms use EXACTLY walkLat now (JF4's +h2*0.3 drifted them to 5.1,
  // inside the wall). Fronds shortened 3.4 -> 2.0 so the canopy's inner
  // tip (38px) clears the 36px road edge instead of overhanging it.
  const walkLat = 4.8; // sidewalk outer edge, in 3D units (48px from road centre)
  // R36-ROADS (fallback Canvas): tekstur jalan dekat kamera + prop trotoar.
  // VISUAL ONLY — padanan versi WebGL2 di webgl2.js (roadSeg/atFU).
  const fwdU = (f, lat) => [ccX + cfX * f + (-cfZ) * lat, ccZ + cfZ * f + cfX * lat]; // (maju, lateral) unit -> [x, z] 3D
  const fwdP = (f, lat) => { const q = fwdU(f, lat); return [q[0] / CS, q[1] / CS]; }; // -> [x, y] px game
  const fwdClear = (f, lat) => { // prop tidak boleh menutupi koin/hydrant (item 2)
    const q = fwdP(f, lat);
    for (const c of state.collectibles || []) if (!c.taken && Math.hypot(c.x - q[0], c.y - q[1]) < 60) return false;
    for (const h of state.hydrants || []) if (Math.hypot(h.x - q[0], h.y - q[1]) < 50) return false;
    return true;
  };
  const ewRoad = Math.abs(cfX) >= Math.abs(cfZ);
  for (const lat of [roadLat - 2.2, roadLat + 2.2]) { // bekas ban dua lajur (fwd -6..60 — dari belakang hero, dasar layar)
    const a = fwdP(-6, lat), b = fwdP(60, lat);
    if (ewRoad) flatQuad(a[0], a[1] - 4.5, b[0], a[1] + 4.5, 0.07, 'rgba(20,20,24,0.35)');
    else flatQuad(a[0] - 4.5, a[1], a[0] + 4.5, b[1], 0.07, 'rgba(20,20,24,0.35)');
  }
  { const m = fwdP(24, roadLat + 2.6); flatQuad(m[0] - 6, m[1] - 6, m[0] + 6, m[1] + 6, 0.07, 'rgba(20,20,24,0.6)'); } // manhole lajur kanan
  { const p = fwdP(38, roadLat - 2.4); flatQuad(p[0] - 16, p[1] - 11, p[0] + 16, p[1] + 11, 0.07, 'rgba(20,20,24,0.5)'); } // tambalan aspal
  { // panah lajur (batang + kepala segitiga, searah jalan) — y .11, di atas marka tengah
    const s = fwdU(28.4, roadLat), hb = fwdU(30.4, roadLat), ht = fwdU(32.0, roadLat), sp = fwdP(28.4, roadLat);
    if (ewRoad) { flatQuad(sp[0] - 12, sp[1] - 2.5, sp[0] + 12, sp[1] + 2.5, 0.11, '#e8e8e6');
      QW([[ht[0], 0.11, ht[1]], [hb[0], 0.11, hb[1] - 0.8], [hb[0], 0.11, hb[1] + 0.8], [ht[0], 0.11, ht[1]]], '#e8e8e6', 30); }
    else { flatQuad(sp[0] - 2.5, sp[1] - 12, sp[0] + 2.5, sp[1] + 12, 0.11, '#e8e8e6');
      QW([[ht[0], 0.11, ht[1]], [hb[0] - 0.8, 0.11, hb[1]], [hb[0] + 0.8, 0.11, hb[1]], [ht[0], 0.11, ht[1]]], '#e8e8e6', 30); }
  }
  for (let f = -6; f <= 66; f += 12) for (const lat of [roadLat - 4.8, roadLat + 4.8]) { // sambungan ubin trotoar (dari fwd -6, dasar layar)
    const j = fwdP(f, lat);
    if (ewRoad) flatQuad(j[0] - 0.7, j[1] - 3.5, j[0] + 0.7, j[1] + 3.5, 0.08, 'rgba(20,20,24,0.5)');
    else flatQuad(j[0] - 3.5, j[1] - 0.7, j[0] + 3.5, j[1] + 0.7, 0.08, 'rgba(20,20,24,0.5)');
  }
  if (fwdClear(16, roadLat + 4.7)) { // halte: bangku kayu + rambu biru (trotoar kanan)
    const bn = fwdU(16, roadLat + 4.7), bb = fwdU(16, roadLat + 4.95), lg1 = fwdU(15.2, roadLat + 4.7), lg2 = fwdU(16.8, roadLat + 4.7), yaw = ewRoad ? Math.PI / 2 : 0; // box3: w ikut "right" — jalan E-W (sumbu x) butuh yaw pi/2 supaya panjang bangku sejajar jalan
    box3(lg1[0], 0, lg1[1], 0.12, 0.55, 0.12, 0, '#3a2c1c', 16); // kaki bangku (alas 0 -> dudukan)
    box3(lg2[0], 0, lg2[1], 0.12, 0.55, 0.12, 0, '#3a2c1c', 16);
    box3(bn[0], 0.55, bn[1], 1.9, 0.14, 0.55, yaw, '#6b4a2f', 16);
    box3(bb[0], 0.6, bb[1], 1.9, 0.6, 0.1, yaw, '#5d3f28', 16); // sandaran naik dari dudukan (alas 0.6, bukan 0.95 — dulu melayang)
    const sg = fwdU(19, roadLat + 4.7);
    box3(sg[0], 0, sg[1], 0.14, 2.6, 0.14, 0, '#3a3340', 19);
    box3(sg[0], 2.3, sg[1], 0.95, 0.65, 0.1, yaw, '#2456c8', 19); // panel menimpa ujung tiang
  }
  if (fwdClear(24, roadLat - 4.7)) { // tempat sampah hijau (trotoar kiri)
    const tb = fwdU(24, roadLat - 4.7);
    box3(tb[0], 0, tb[1], 0.55, 0.95, 0.55, 0, '#2a6b45', 24);
    box3(tb[0], 0.95, tb[1], 0.6, 0.12, 0.6, 0, '#1d4e33', 24);
  }
  // round 21: fill the dark flanks — lamp posts on both sidewalks every
  // ~45 units (pole + lit head + light pool) and palm silhouettes every
  // ~90 units alternating sides (trunk + fronds, dark + warm rim).
  // Positions are camera-relative, so they fill whatever street the chase
  // is on; all variation is h2-gated, no randomness, no wall clock.
  // Lamp/palm laterals use roadLat ± walkLat (JF4, defined above).
  if (p.inCar) for (let fwd = 26; fwd < 175; fwd += 45) {
    for (const lat of [roadLat - walkLat, roadLat + walkLat]) {
      const lx = ccX + cfX * fwd + (-cfZ) * lat, lz = ccZ + cfZ * fwd + cfX * lat;
      const wxp = lx / CS, wzp = lz / CS;
      if (!inRange(wxp, wzp, 175, 135)) continue;
      const ldep = Math.hypot(lx - ccX, lz - ccZ);
      // R36-ROADS item 9: tiang 0.18 gelap + quad kuning vertikal 0.9 di ujung
      // tiang — di kejauhan tiang hilang, quad kebaca kotak kuning melayang.
      // Kini tiang 0.28 terang + LENGAN ke arah jalan + KEPALA kotak (housing)
      // di ujung lengan + lensa di bawah kepala, jadi kepala jelas nempel tiang.
      box3(lx, 0, lz, 0.28, 5.4, 0.28, 0, '#3a3340', ldep);
      const dir = lat > roadLat ? -1 : 1; // lengan ke arah sumbu jalan
      const axp = lx + (-cfZ) * dir * 1.6, azp = lz + cfX * dir * 1.6; // ujung lengan (1.6 unit ke jalan)
      const amx = (lx + axp) / 2, amz = (lz + azp) / 2;
      if (ewRoad) { box3(amx, 5.2, amz, 1.7, 0.22, 0.22, 0, '#3a3340', ldep); box3(axp, 5.0, azp, 0.5, 0.35, 0.7, 0, '#241f28', ldep); }
      else { box3(amx, 5.2, amz, 0.22, 0.22, 1.7, 0, '#3a3340', ldep); box3(axp, 5.0, azp, 0.7, 0.35, 0.5, 0, '#241f28', ldep); }
      vQuad(axp, azp, ccYaw, 0, 0, 0.5, 4.75, 4.95, '#ffd9a0');
      flatQuad(axp / CS - 26, azp / CS - 26, axp / CS + 26, azp / CS + 26, 0.08, 'rgba(255,200,120,0.10)'); // kolam cahaya di bawah kepala
    }
  }
  if (p.inCar) for (let pi = 0; pi < 3; pi += 1) {
    const fwd = 30 + pi * 55, lat = roadLat + (pi % 2 === 0 ? -1 : 1) * walkLat;
    const pxp = ccX + cfX * fwd + (-cfZ) * lat, pzp = ccZ + cfZ * fwd + cfX * lat;
    const wxp = pxp / CS, wzp = pzp / CS;
    if (!inRange(wxp, wzp, 175, 135)) continue;
    // R36: palem ke-3 (fwd 140) mendarat di laut (x~2837 > WATER_X 2448) —
    // lewati palem di luar daratan.
    if (wxp > 2420 || wxp < 30 || wzp < 30 || wzp > 1890) continue;
    const pdep = Math.hypot(pxp - ccX, pzp - ccZ);
    box3(pxp, 0, pzp, 0.5, 7.2, 0.5, 0, '#1c1410', pdep);
    // PALM-REBUILD (VB-40 in-game / VB-23): the old 3 flat slabs stacked
    // into ONE horizontal bar on screen = the "T". Now 8 separate fronds,
    // each a 3-segment ribbon arcing out and drooping down (same curve as
    // the takeoff3d palm, proven there), green like the reference palms,
    // tapering .34->.14. Trunk position UNCHANGED (POLEFIX2 walkLat 4.8).
    // Reach shortens toward the road (1.0) so no tip overhangs the
    // asphalt: tip stays >=38px from the centreline (POLEFIX2 rule);
    // full 1.9 toward the sidewalk/buildings. Coconut cluster anchors
    // the crown so the frond bases read as one palm, not loose strokes.
    const pcy = 7.2, ptz = hz(pdep), pgn = hx3('#4a9e4f'), psd = pi % 2 === 0 ? -1 : 1;
    box3(pxp, 6.85, pzp, 0.45, 0.45, 0.45, 0, '#2a1a10', pdep);
    for (let fi = 0; fi < 8; fi += 1) {
      const fa = h2(pi, 31) * 6.283 + fi * 0.785;
      const fx = Math.cos(fa), fz = Math.sin(fa);
      const ftr = psd * (fx * cfZ - fz * cfX); // 1 = straight at the road
      const frn = 1.9 - 0.9 * Math.max(0, ftr);
      for (let sg = 0; sg < 3; sg += 1) {
        const t0 = sg / 3, t1 = (sg + 1) / 3, w0 = 0.34 - 0.10 * sg;
        const y0 = pcy + 0.7 * t0 - 2.6 * t0 * t0, y1 = pcy + 0.7 * t1 - 2.6 * t1 * t1;
        // PALM-REBUILD v2: QW(c, col, dep) takes ONE array of 4 points
        // (v1 passed 4 separate args = Q()'s signature -> NaN polygon,
        // 24 ribbons silently never drawn). Wrap in one extra array.
        QW([[pxp + fx * frn * t0, y0 - w0, pzp + fz * frn * t0],
          [pxp + fx * frn * t1, y1 - w0, pzp + fz * frn * t1],
          [pxp + fx * frn * t1, y1 + w0, pzp + fz * frn * t1],
          [pxp + fx * frn * t0, y0 + w0, pzp + fz * frn * t0]],
          sh(pgn, 0.85 - 0.12 * sg, ptz), pdep);
      }
    }
    // R36 LAPIS ATAS (item 6): 6 pelepah pendek menjulang di atas lapis
    // bawah (offset setengah langkah, hijau muda) — kanopi penuh berlapis,
    // bukan satu kipas datar. Jangkauan pendek (1.3) + naik curam supaya
    // tidak menjuntai ke jalan.
    const pgl = hx3('#5cb85f');
    for (let fi = 0; fi < 6; fi += 1) {
      const fa = h2(pi, 47) * 6.283 + fi * 1.047 + 0.52;
      const fx = Math.cos(fa), fz = Math.sin(fa);
      const ftr = psd * (fx * cfZ - fz * cfX);
      const frn = 1.3 - 0.4 * Math.max(0, ftr);
      for (let sg = 0; sg < 2; sg += 1) {
        const t0 = sg / 2, t1 = (sg + 1) / 2, w0 = 0.26 - 0.08 * sg;
        const y0 = pcy + 0.3 + 1.0 * t0 - 1.2 * t0 * t0, y1 = pcy + 0.3 + 1.0 * t1 - 1.2 * t1 * t1;
        QW([[pxp + fx * frn * t0, y0 - w0, pzp + fz * frn * t0],
          [pxp + fx * frn * t1, y1 - w0, pzp + fz * frn * t1],
          [pxp + fx * frn * t1, y1 + w0, pzp + fz * frn * t1],
          [pxp + fx * frn * t0, y0 + w0, pzp + fz * frn * t0]],
          sh(pgl, 0.9 - 0.1 * sg, ptz), pdep);
      }
    }
  }
  // street lamps at night: glowing dots at nearby intersections
  if (nightF > 0.4) {
    for (const pt of city.intersections) {
      if (!inRange(pt.x + 48, pt.y - 48, 100, 90)) continue;
      const lp = cP((pt.x + 48) * CS, 5.5, (pt.y - 48) * CS);
      if (!lp) continue;
      const r = cl(500 / lp[2], 2, 14);
      x.fillStyle = 'rgba(255,217,160,0.25)'; x.beginPath(); x.arc(lp[0], lp[1], r * 2.2, 0, 7); x.fill();
      x.fillStyle = '#ffd9a0'; x.beginPath(); x.arc(lp[0], lp[1], Math.max(1.5, r * 0.5), 0, 7); x.fill();
    }
  }
  ops.sort((a, b) => b.d - a.d);
  for (const o of ops) o.f();
  ops.length = 0;
  // G4 neon reflections on the wet road: vertical smears under lamps, the
  // casino sign and police light bars (screen space, low alpha, additive)
  if (nightF > 0.3) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const smear = (wx, wy, w, h, r, g, b, a) => {
      const pp = cP(wx * CS, 0.3, wy * CS);
      if (!pp) return;
      const gr = x.createLinearGradient(0, pp[1], 0, pp[1] + h);
      gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')');
      gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      x.fillStyle = gr; x.fillRect(pp[0] - w / 2, pp[1], w, h);
    };
    let n = 0;
    for (const pt of city.intersections) {
      if (n >= 6) break;
      if (!inRange(pt.x + 48, pt.y - 48, 100, 90)) continue;
      smear(pt.x + 48, pt.y - 48, 7, 46, 255, 217, 160, 0.16); n += 1;
    }
    if (city.casino && inRange(city.casino.x, city.casino.y, 120, 100)) smear(city.casino.x, city.casino.y + 40, 12, 64, 255, 210, 62, 0.20);
    let ns = 0;
    for (const b of city.buildings) {
      if (ns >= 4) break;
      if (!inRange(b.x + b.w / 2, b.y + b.h / 2, 120, 100)) continue;
      const sc = ['255,179,92', '5,217,232', '255,42,109'][Math.floor(h2(b.x, b.y) * 3)];
      const parts = sc.split(',').map(Number);
      smear(b.x + b.w / 2, b.y + b.h / 2, 8, 52, parts[0], parts[1], parts[2], 0.14); ns += 1;
    }
    for (const unit of state.police.units) {
      if (n >= 10) break;
      if ((unit.kind !== 'car' && unit.kind !== 'mtruck') || !unit.car) continue;
      if (!inRange(unit.car.x, unit.car.y, 120, 100)) continue;
      const blink = Math.floor(t * 6) % 2 === 0;
      if (blink) smear(unit.car.x, unit.car.y, 9, 40, 255, 64, 64, 0.22);
      else smear(unit.car.x, unit.car.y, 9, 40, 64, 128, 255, 0.22);
      n += 1;
    }
    x.restore();
  }
  // hero taillight glow
  if (p.inCar && p.car) {
    const tp = cP(p.car.x * CS - Math.cos(p.car.angle) * 2.4, 0.8, p.car.y * CS - Math.sin(p.car.angle) * 2.4);
    if (tp) {
      x.save(); x.globalCompositeOperation = 'lighter';
      const rg = x.createRadialGradient(tp[0], tp[1], 1, tp[0], tp[1], 22);
      rg.addColorStop(0, 'rgba(255,80,100,0.5)'); rg.addColorStop(1, 'rgba(255,80,100,0)');
      x.fillStyle = rg; x.fillRect(tp[0] - 22, tp[1] - 22, 44, 44);
      x.restore();
    }
  }
  // rain streaks (screen space, from the live rain drops)
  if (state.weather && state.weather.rain && state.rainDrops) {
    x.strokeStyle = 'rgba(174,194,224,0.45)'; x.lineWidth = 1.5;
    let n = 0;
    for (const drop of state.rainDrops) {
      if (n > 60) break;
      const dp = cP(drop.x * CS, 6, drop.y * CS);
      if (!dp) continue;
      x.beginPath(); x.moveTo(dp[0], dp[1]); x.lineTo(dp[0] - 4, dp[1] - 16); x.stroke();
      n += 1;
    }
  }
  if (state.weather && state.weather.flash > 0) {
    x.fillStyle = 'rgba(255,255,255,' + (state.weather.flash * 0.25).toFixed(3) + ')';
    x.fillRect(0, 0, W, H);
  }
  if (state.blackout && state.blackout.active) {
    x.fillStyle = 'rgba(2,4,12,0.35)'; x.fillRect(0, 0, W, H);
    const hp = cP(p.x * CS, 0.5, p.y * CS);
    if (hp) {
      const hg = x.createRadialGradient(hp[0], hp[1], 10, hp[0], hp[1], 260);
      hg.addColorStop(0, 'rgba(255,240,170,0.14)'); hg.addColorStop(1, 'rgba(255,240,170,0)');
      x.fillStyle = hg; x.fillRect(hp[0] - 260, hp[1] - 260, 520, 520);
    }
  }
  // round 21 grading (REPORT #7): warm sunset wash + purple shadow push,
  // before the vignette so the frame reads as one film, not loose quads
  x.save(); x.globalCompositeOperation = 'overlay';
  x.fillStyle = 'rgba(255,120,60,0.08)'; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'multiply';
  x.fillStyle = 'rgba(20,10,40,0.10)'; x.fillRect(0, 0, W, H);
  x.restore();
  const vg = x.createRadialGradient(CX, H / 2, H * 0.35, CX, H / 2, H * 0.85);
  vg.addColorStop(0, 'rgba(10,5,15,0)'); vg.addColorStop(1, 'rgba(10,5,15,0.35)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
}
