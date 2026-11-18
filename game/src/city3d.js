import { WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';
import { BRIDGE } from './drawbridge.js';
// Neon Harbor 3D title-screen — software 3D engine, Canvas 2D only, no libs.
// Perspective projection + painter's algorithm. Deterministic (seeded).
let x, W = 1280, H = 800, CX = W / 2, HOR = H * .46;
let S=1337;const R=()=>((S=S*1664525+1013904223>>>0)/4294967296);
const cl=(v,a,b)=>v<a?a:v>b?b:v;
const h2=(a,b)=>{let v=(a*73856093)^(b*19349663);v=Math.imul(v^(v>>>13),1274126177);return((v^(v>>>16))>>>0)/4294967296;};
const F=640,HZ=[255,150,110];
const mix=(c,t)=>'rgb('+c.map((v,i)=>Math.round(v+(HZ[i]-v)*t)).join(',')+')';
const sh=(c,b,t)=>mix(c.map(v=>Math.min(255,v*b|0)),t);
const hz=d=>cl((d-70)/300,0,.72);
let camZ=0;const ops=[];
function P(px,py,pz){const dz=pz-camZ;if(dz<2)return 0;return[CX+px*F/dz,HOR-(py-5.6)*F/dz,dz];}
function Q(a,b,c,d,col,dep){const p=[P(...a),P(...b),P(...c),P(...d)];if(p.includes(0))return;ops.push({d,f(){x.fillStyle=col;x.beginPath();x.moveTo(p[0][0],p[0][1]);for(let i=1;i<4;i++)x.lineTo(p[i][0],p[i][1]);x.closePath();x.fill();}});}
function rr(a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath();}
// city: buildings along both sides, right side has a harbor gap z 150..260
const B=[];
for(let z=10;z<900;z+=24+R()*10){
  const mk=sd=>{const w=14+R()*12,d=12+R()*8,h=16+R()*R()*55;B.push({x:sd*(19+w/2+R()*10),z:z+d/2,w,d,h,bi:B.length,c:[[26,28,46],[34,32,58],[22,24,40],[30,26,50]][R()*4|0]});};
  mk(-1);if(z<150||z>260)mk(1);
}
function wins(b){const{x,z:zf,w,h,bi}=b,nc=Math.max(2,w/3.4|0),nr=Math.max(3,h/4.4|0),t=hz(zf-camZ);
  for(let i=0;i<nc;i++)for(let j=0;j<nr;j++){const q=h2(bi*131+i*7,j*3+1);if(q<.45)continue;
    const wx=x-w/2+1.2+(w-2.4)*(i+.15)/nc,wy=2+(h-3)*(j+.2)/nr,ww=(w-2.4)/nc*.62,wh=(h-3)/nr*.6;
    const c=q<.78?[255,205,120]:q<.9?[120,215,255]:[255,150,90];
    Q([wx,wy,zf],[wx+ww,wy,zf],[wx+ww,wy+wh,zf],[wx,wy+wh,zf],mix(c,t),zf-camZ);}}
function bld(b){const{x,z,w,d,h,c}=b,zf=z-d/2,zb=z+d/2,dep=zf-camZ;if(dep<35)return;const sx=x>0?x-w/2:x+w/2;
  Q([x-w/2,0,zf],[x+w/2,0,zf],[x+w/2,h,zf],[x-w/2,h,zf],sh(c,.8,hz(dep)),dep);
  Q([sx,0,zf],[sx,0,zb],[sx,h,zb],[sx,h,zf],sh(c,1.05,hz(dep)),dep);
  Q([x-w/2,h,zf],[x+w/2,h,zf],[x+w/2,h,zb],[x-w/2,h,zb],sh(c,1.3,hz(dep)),dep);wins(b);}
function car(o){const{x,z,w,h,l,c}=o,zb=z-l/2,zf=z+l/2,dep=zb-camZ,t=hz(dep);
  Q([x-w/2,0,zb],[x+w/2,0,zb],[x+w/2-.5,h,zb],[x-w/2+.5,h,zb],sh(c,.95,t),dep);
  Q([x-w/2+.5,h*.55,zb-.06],[x+w/2-.5,h*.55,zb-.06],[x+w/2-.6,h*.9,zb-.06],[x-w/2+.6,h*.9,zb-.06],mix([70,90,130],t),dep);
  Q([x-w/2,h,zb],[x+w/2,h,zb],[x+w/2*.82,h*.8,zf],[x-w/2*.82,h*.8,zf],sh(c,1.15,t),dep);
  const sx=x>0?x-w/2:x+w/2;
  Q([sx,0,zb],[sx,0,zf],[sx,h*.92,zf],[sx,h,zb],sh(c,.95,t),dep);
  const tl=o.pol?[[255,60,60],[60,120,255]]:[[255,70,90],[255,70,90]];
  if(o.hero)Q([x-w/2+.2,h-.06,zb-.08],[x+w/2-.2,h-.06,zb-.08],[x+w/2-.2,h+.1,zb-.08],[x-w/2+.2,h+.1,zb-.08],mix([255,90,140],t),dep);
  Q([x-w/2+.3,.55,zb-.06],[x-w/2+1.1,.55,zb-.06],[x-w/2+1.1,.85,zb-.06],[x-w/2+.3,.85,zb-.06],mix(tl[0],t),dep);
  Q([x+w/2-1.1,.55,zb-.06],[x+w/2-.3,.55,zb-.06],[x+w/2-.3,.85,zb-.06],[x+w/2-1.1,.85,zb-.06],mix(tl[1],t),dep);
  Q([x-w/2+.2,0,zb-.05],[x-w/2+1,0,zb-.05],[x-w/2+1,.6,zb-.05],[x-w/2+.2,.6,zb-.05],'#0a0a0e',dep);
  Q([x+w/2-1,0,zb-.05],[x+w/2-.2,0,zb-.05],[x+w/2-.2,.6,zb-.05],[x+w/2-1,.6,zb-.05],'#0a0a0e',dep);
  if(o.pol){Q([x-1,h+.05,zb-.4],[x-.1,h+.05,zb-.4],[x-.1,h+.35,zb-.4],[x-1,h+.35,zb-.4],'#ff4040',dep);
    Q([x+.1,h+.05,zb-.4],[x+1,h+.05,zb-.4],[x+1,h+.35,zb-.4],[x+.1,h+.35,zb-.4],'#4080ff',dep);}}
function sign(sd,z0,z1,txt,col){const b=B.find(b=>(b.x>0)===(sd>0)&&b.z>z0&&b.z<z1);if(!b)return;
  const p=P(b.x,b.h*.72,b.z-b.d/2-.6);if(!p)return;const fs=Math.round(1500/p[2]);
  ops.push({d:p[2],f(){x.save();x.font='bold '+fs+'px sans-serif';x.textAlign='center';x.shadowColor=col;x.shadowBlur=14;x.fillStyle=col;x.fillText(txt,p[0],p[1]);x.restore();}});}
function frame(t){
  HZ[0]=255;HZ[1]=150;HZ[2]=110;
  camZ=t*26;
  const g=x.createLinearGradient(0,0,0,HOR+60);
  g.addColorStop(0,'#1e0b33');g.addColorStop(.45,'#6b2355');g.addColorStop(.75,'#e0545e');g.addColorStop(1,'#ffb35c');
  x.fillStyle=g;x.fillRect(0,0,W,HOR+60);x.fillStyle='#241a20';x.fillRect(0,HOR,W,H-HOR);
  const sx=CX+60,sy=HOR-20;
  // road + sidewalks (segmented so fog deepens with distance)
  for(let z=Math.floor((camZ-30)/30)*30;z<camZ+430;z+=30){const d=z-camZ;
    Q([-12,0,z],[12,0,z],[12,0,z+30],[-12,0,z+30],sh([52,42,48],1,hz(d)),d);
    Q([-16,.1,z],[-12,.1,z],[-12,.1,z+30],[-16,.1,z+30],sh([80,70,76],1,hz(d)),d);
    Q([12,.1,z],[16,.1,z],[16,.1,z+30],[12,.1,z+30],sh([80,70,76],1,hz(d)),d);
    Q([-11.7,.06,z],[-11.4,.06,z],[-11.4,.06,z+30],[-11.7,.06,z+30],mix([220,200,170],hz(d)),d);
    Q([11.4,.06,z],[11.7,.06,z],[11.7,.06,z+30],[11.4,.06,z+30],mix([220,200,170],hz(d)),d);}
  for(let z=Math.floor((camZ+14)/12)*12;z<camZ+420;z+=12){const d=z-camZ;
    Q([-.45,.05,z],[.45,.05,z],[.45,.05,z+3.5],[-.45,.05,z+3.5],mix([255,179,71],hz(d)),d);
    Q([-6.4,.05,z+6],[-6,.05,z+6],[-6,.05,z+11],[-6.4,.05,z+11],mix([200,180,140],hz(d)),d);
    Q([6,.05,z+6],[6.4,.05,z+6],[6.4,.05,z+11],[6,.05,z+11],mix([200,180,140],hz(d)),d);}
  // harbor water, right side (gap in buildings)
  for(let z=Math.floor((camZ-30)/40)*40;z<camZ+430;z+=40){const d=z-camZ;
    Q([64,-1,z],[240,-1,z],[240,-1,z+40],[64,-1,z+40],mix([70,50,110],cl(d/300,0,.85)),d);}
  // sun glitter strips ON the water (world space, so perspective lands them right)
  Q([80,-.9,camZ+150],[150,-.9,camZ+150],[150,-.9,camZ+420],[80,-.9,camZ+420],'rgba(255,170,90,.6)',150);
  Q([150,-.9,camZ+200],[175,-.9,camZ+200],[175,-.9,camZ+420],[150,-.9,camZ+420],'rgba(255,170,90,.35)',200);
  // pier + boats
  Q([56,.5,camZ+100],[76,.5,camZ+100],[76,.5,camZ+140],[56,.5,camZ+140],sh([40,30,34],1,hz(120)),120);
  Q([82,-1,camZ+110],[104,-1,camZ+110],[104,1.4,camZ+110],[82,1.4,camZ+110],sh([220,220,230],1,hz(110)),110);
  Q([85,.9,camZ+105],[101,.9,camZ+105],[101,3,camZ+105],[85,3,camZ+105],sh([30,40,60],1,hz(105)),105);
  Q([118,-1,camZ+150],[136,-1,camZ+150],[136,1.4,camZ+150],[118,1.4,camZ+150],sh([200,210,220],1,hz(150)),150);
  // distant skyline silhouettes
  for(let i=0;i<10;i++){const bx=-170+i*38+R()*14,bh=40+R()*60,bw=20+R()*18,bz=camZ+400+R()*30;
    Q([bx,0,bz],[bx+bw,0,bz],[bx+bw,bh,bz],[bx,bh,bz],mix([58,26,58],.7),bz-camZ);}
  for(const b of B)bld(b);
  car({x:0,z:camZ+17,w:3.6,h:1.5,l:6.6,c:[30,30,44],hero:1});
  car({x:-5.5,z:camZ+48,w:3.2,h:1.5,l:6.2,c:[12,12,16],pol:1});
  car({x:6,z:camZ+88,w:3.2,h:1.4,l:6,c:[200,90,30]});
  car({x:-3,z:camZ+150,w:3.2,h:1.4,l:6,c:[40,60,120]});
  // street lamps
  for(let z=camZ+20;z<camZ+420;z+=45)for(const lx of[-14,14]){const pb=P(lx,0,z),pt=P(lx,7,z);if(!pb||!pt)continue;
    ops.push({d:pb[2],f(){x.strokeStyle='#3a3040';x.lineWidth=cl(500/pb[2],1,5);x.beginPath();x.moveTo(pb[0],pb[1]);x.lineTo(pt[0],pt[1]);x.stroke();
      x.fillStyle='rgba(255,217,160,.25)';x.beginPath();x.arc(pt[0],pt[1],cl(700/pb[2],3,22),0,7);x.fill();
      x.fillStyle='#ffd9a0';x.beginPath();x.arc(pt[0],pt[1],cl(220/pb[2],1.5,7),0,7);x.fill();}});}
  sign(-1,camZ+40,camZ+120,'NEON HARBOR','#35f0ff');
  sign(1,camZ+100,camZ+160,'CASINO','#ff5ca8');
  sign(-1,camZ+220,camZ+300,'MOTEL','#ffd23e');
  ops.sort((a,b)=>b.d-a.d);for(const o of ops)o.f();ops.length=0;
  // sun disc + glow (drawn after 3D so the money shot is never occluded)
  const sg=x.createRadialGradient(sx,sy,4,sx,sy,150);
  sg.addColorStop(0,'rgba(255,230,160,.95)');sg.addColorStop(.25,'rgba(255,170,90,.55)');sg.addColorStop(1,'rgba(255,140,80,0)');
  x.fillStyle=sg;x.fillRect(sx-150,sy-150,300,300);
  x.fillStyle='#ffe9a8';x.beginPath();x.arc(sx,sy,18,0,7);x.fill();
  // hero taillight glow
  const tp=P(0,1,camZ+17-3.3);if(tp){x.save();x.globalCompositeOperation='lighter';
    for(const gx of[-1.2,1.2]){const gp=P(gx,1,camZ+17-3.3);if(!gp)continue;
      const rg=x.createRadialGradient(gp[0],gp[1],1,gp[0],gp[1],26);rg.addColorStop(0,'rgba(255,80,100,.55)');rg.addColorStop(1,'rgba(255,80,100,0)');
      x.fillStyle=rg;x.fillRect(gp[0]-26,gp[1]-26,52,52);}x.restore();}
  // HUD
  x.textAlign='left';x.textBaseline='alphabetic';
  rr(24,24,124,124,62);x.fillStyle='rgba(8,8,24,.75)';x.fill();x.strokeStyle='#6ad7ff';x.lineWidth=2;x.stroke();
  x.save();rr(24,24,124,124,62);x.clip();x.strokeStyle='rgba(122,215,255,.35)';x.lineWidth=1;
  for(let i=1;i<8;i++){x.beginPath();x.moveTo(24+i*15.5,24);x.lineTo(24+i*15.5,148);x.stroke();x.beginPath();x.moveTo(24,24+i*15.5);x.lineTo(148,24+i*15.5);x.stroke();}
  x.strokeStyle='#ffd23e';x.lineWidth=2;x.beginPath();x.moveTo(86,140);x.lineTo(80,110);x.lineTo(96,84);x.lineTo(110,60);x.stroke();
  x.fillStyle='#35f0ff';x.beginPath();x.arc(86,86,4,0,7);x.fill();x.restore();
  x.fillStyle='#fff';x.font='bold 10px sans-serif';x.textAlign='center';x.fillText('NEON HARBOR',86,166);x.textAlign='left';
  rr(CX-200,16,400,46,8);x.fillStyle='rgba(8,8,24,.75)';x.fill();x.strokeStyle='#c9a227';x.lineWidth=1.5;x.stroke();
  x.fillStyle='#ffd23e';x.font='bold 11px sans-serif';x.textAlign='center';x.fillText('CHAPTER 12/12: THE HARBOR KING',CX,33);
  x.fillStyle='#fff';x.font='bold 15px sans-serif';x.fillText('STEAL A SPEEDBOAT AND REACH THE MARINA',CX,52);x.textAlign='left';
  rr(W-216,16,200,92,8);x.fillStyle='rgba(8,8,24,.75)';x.fill();
  x.fillStyle='#ffd23e';x.font='18px sans-serif';x.fillText('★★★★',W-204,40);x.fillStyle='rgba(255,255,255,.25)';x.fillText('★',W-140,40);
  x.fillStyle='#4dff88';x.font='bold 22px sans-serif';x.fillText('$2,150',W-204,66);
  x.fillStyle='#333';x.fillRect(W-204,74,176,7);x.fillStyle='#ff5c8a';x.fillRect(W-204,74,132,7);
  x.fillStyle='#333';x.fillRect(W-204,86,176,7);x.fillStyle='#4d9fff';x.fillRect(W-204,86,106,7);
  x.fillStyle='#35f0ff';x.font='10px sans-serif';x.fillText('JAX MARLOWE',W-204,102);
  rr(W-196,H-88,180,72,8);x.fillStyle='rgba(8,8,24,.75)';x.fill();
  x.fillStyle='#35f0ff';x.font='bold 40px sans-serif';x.fillText('142',W-182,H-44);
  x.font='13px sans-serif';x.fillText('MPH',W-104,H-50);
  x.fillStyle='#ffd23e';x.font='11px sans-serif';x.fillText('GEAR 6 · NEON GT',W-182,H-26);
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
  QW(f1, sh(c, 1.3 * shadeK, t), dep(f1));
  QW(f2, sh(c, 0.8 * shadeK, t), dep(f2));
  QW(f3, sh(c, 0.95 * shadeK, t), dep(f3));
  QW(f4, sh(c, 1.05 * shadeK, t), dep(f4));
  QW(f5, sh(c, 0.65 * shadeK, t), dep(f5));
}
// vertical quad facing along yaw a, centered fOff forward / rOff right of (cx, cz)
function vQuad(cx, cz, a, fOff, rOff, w, y0, y1, col) {
  const fx = Math.cos(a), fz = Math.sin(a), rx = -fz, rz = fx;
  const bx = cx + fx * fOff + rx * rOff, bz = cz + fz * fOff + rz * rOff;
  const hw = w / 2;
  QW([[bx - rx * hw, y0, bz - rz * hw], [bx + rx * hw, y0, bz + rz * hw], [bx + rx * hw, y1, bz + rz * hw], [bx - rx * hw, y1, bz - rz * hw]], col);
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
function car3d(wx, wy, angle, len, wid, color, o) {
  let L = len * CS, Wd = wid * CS;
  const bodyH = o.hero ? 0.72 : 0.8;
  if (o.hero) Wd *= 1.08; // F2: hero car reads wider / lower
  const cx = wx * CS, cz = wy * CS;
  const dep = Math.hypot(cx - ccX, cz - ccZ);
  const fx = Math.cos(angle), fz = Math.sin(angle);
  // V3 contact shadow: soft wide layer + tight dark layer under the body
  flatQuad(wx - len / 2 - 4, wy - wid / 2 - 4, wx + len / 2 + 4, wy + wid / 2 + 4, 0.02, 'rgba(0,0,0,0.30)');
  flatQuad(wx - len / 2 - 1, wy - wid / 2 - 1, wx + len / 2 + 1, wy + wid / 2 + 1, 0.025, 'rgba(0,0,0,0.45)');
  if (o.hero) flatQuad(wx - len / 2 - 6, wy - wid / 2 - 6, wx + len / 2 + 6, wy + wid / 2 + 6, 0.03, 'rgba(255,77,157,0.28)');
  // V2 dark outline: a slightly larger dark shell, forced behind the body
  box3(cx, 0.1, cz, Wd + 0.4, bodyH + 0.12, L + 0.4, angle, '#0a0a0e', dep, 2.5);
  box3(cx, 0.15, cz, Wd, bodyH, L, angle, color, dep);
  const bx = cx - fx * L * 0.06, bz = cz - fz * L * 0.06;
  box3(bx, 0.95, bz, Wd * 0.78, 0.55, L * 0.52, angle, o.glass || '#1a2230', dep);
  // V1 rim light: warm strips on the cabin roof front edge + body top edges
  if (rimOn && o.rim !== false) {
    const rim = mix([255, 179, 92], hz(dep));
    topStrip(cx, cz, angle, L * 0.2, 0, Wd * 0.7, 0.4, 1.53, rim);
    topStrip(cx, cz, angle, 0, -Wd / 2 + 0.06, L * 0.55, 0.22, 0.15 + bodyH + 0.03, rim);
    topStrip(cx, cz, angle, 0, Wd / 2 - 0.06, L * 0.55, 0.22, 0.15 + bodyH + 0.03, rim);
  }
  vQuad(cx, cz, angle, L * 0.2, 0, Wd * 0.7, 1.0, 1.42, 'rgba(120,180,230,0.5)');
  vQuad(cx, cz, angle, -L * 0.32, 0, Wd * 0.7, 1.0, 1.42, 'rgba(120,180,230,0.4)');
  for (const s of [-1, 1]) {
    vQuad(cx, cz, angle, -L / 2 - 0.06, s * Wd * 0.28, Wd * 0.22, 0.45, 0.72, o.hero ? '#ff5c7a' : '#ff3b30');
    vQuad(cx, cz, angle, L / 2 + 0.06, s * Wd * 0.28, Wd * 0.22, 0.45, 0.7, '#ffe9a8');
    const wxp = cx + fx * (L / 2 - 0.7) + (-fz) * s * (Wd / 2 - 0.25), wzp = cz + fz * (L / 2 - 0.7) + fx * s * (Wd / 2 - 0.25);
    box3(wxp, 0.05, wzp, 0.45, 0.5, 0.9, angle, '#0a0a0e', dep);
    const wxp2 = cx - fx * (L / 2 - 0.7) + (-fz) * s * (Wd / 2 - 0.25), wzp2 = cz - fz * (L / 2 - 0.7) + fx * s * (Wd / 2 - 0.25);
    box3(wxp2, 0.05, wzp2, 0.45, 0.5, 0.9, angle, '#0a0a0e', dep);
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
  flatQuad(wx - len / 2 - 4, wy - wid / 2 - 4, wx + len / 2 + 4, wy + wid / 2 + 4, -0.22, 'rgba(255,255,255,0.18)');
  box3(cx, -0.25, cz, Wd, 0.7, L, angle, color, dep);
  box3(cx + fx * L * 0.32, -0.2, cz + fz * L * 0.32, Wd * 0.7, 0.5, L * 0.3, angle, color, dep);
  box3(cx - fx * L * 0.08, 0.45, cz - fz * L * 0.08, Wd * 0.6, 0.55, L * 0.36, angle, '#e8e4d8', dep);
  vQuad(cx, cz, angle, L * 0.1, 0, Wd * 0.5, 0.5, 0.95, 'rgba(120,180,230,0.55)');
  for (const s of [-1, 1]) {
    const sx = cx - fx * (L / 2) + (-fz) * s * Wd * 0.4, sz = cz - fz * (L / 2) + fx * s * Wd * 0.4;
    const rx = -fz, rz = fx;
    QW([[sx - rx * Wd * 0.3, -0.2, sz - rz * Wd * 0.3], [sx + rx * Wd * 0.3, -0.2, sz + rz * Wd * 0.3],
      [sx - fx * 7 + rx * Wd * 0.9, -0.2, sz - fz * 7 + rz * Wd * 0.9], [sx - fx * 7 - rx * Wd * 0.9, -0.2, sz - fz * 7 - rz * Wd * 0.9]], 'rgba(255,255,255,0.25)');
  }
  if (o.pol) {
    const blink = Math.floor((o.t || 0) * 6) % 2 === 0;
    vQuad(cx, cz, angle, -L * 0.08, -Wd * 0.2, 0.45, 1.0, 1.25, blink ? '#ff4040' : '#2f6fd0');
    vQuad(cx, cz, angle, -L * 0.08, Wd * 0.2, 0.45, 1.0, 1.25, blink ? '#2f6fd0' : '#ff4040');
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
  QW([[cx - rx * 0.5, 23.8, cz - rz * 0.5], [cx + rx * 0.5, 23.8, cz + rz * 0.5],
    [pcx + rx * 3.2, 0.15, pcz + rz * 3.2], [pcx - rx * 3.2, 0.15, pcz - rz * 3.2]], 'rgba(255,240,170,0.13)');
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
  box3(bx, 0, bz, w, h3, d, 0, b.color, dep);
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
  if (dep < 95) {
    const faces = [
      { a: Math.PI / 2, off: d / 2, span: w, dot: ccZ - bz },
      { a: -Math.PI / 2, off: d / 2, span: w, dot: bz - ccZ },
      { a: 0, off: w / 2, span: d, dot: ccX - bx },
      { a: Math.PI, off: w / 2, span: d, dot: bx - ccX },
    ].sort((p, q) => q.dot - p.dot);
    const nFaces = nightF > 0.3 ? 2 : 1;
    for (let fi = 0; fi < nFaces && faces[fi].dot > 0; fi += 1) {
      const f = faces[fi];
      const nc = Math.max(3, Math.min(dep > 70 ? 4 : 5, Math.round(f.span / 4.5)));
      const nr = Math.max(3, Math.min(dep > 70 ? 4 : 6, Math.round(h3 / 4.5)));
      for (let i = 0; i < nc; i += 1) for (let j = 0; j < nr; j += 1) {
        const q = h2(b.x * 7 + i * 13 + fi * 31, b.y * 3 + j * 17);
        const ww = (f.span / nc) * 0.55, wh = (h3 / nr) * 0.5;
        const rOff = -f.span / 2 + (f.span * (i + 0.5)) / nc;
        const y0 = 2 + (h3 - 3) * (j + 0.25) / nr, y1 = y0 + wh;
        if (nightF > 0.3) {
          if (q < 0.3) continue;
          const c = q < 0.78 ? [255, 205, 120] : q < 0.9 ? [120, 215, 255] : [255, 150, 90];
          vQuad(bx, bz, f.a, f.off + 0.12, rOff, ww, y0, y1, mix(c, hz(dep)));
        } else {
          if (q < 0.55) continue;
          vQuad(bx, bz, f.a, f.off + 0.12, rOff, ww, y0, y1, mix([52, 64, 84], hz(dep)));
        }
      }
      // F3 panel line: one darker horizontal band mid-face (stops the slab look)
      vQuad(bx, bz, f.a, f.off + 0.1, 0, f.span * 0.96, h3 * 0.45, h3 * 0.45 + 0.35, 'rgba(0,0,0,0.25)');
      if (fi === 0) {
        // base strip grounds the slab; V1 warm rim on the top edge at low sun
        vQuad(bx, bz, f.a, f.off + 0.12, 0, f.span * 0.96, 0.1, 1.3, 'rgba(0,0,0,0.35)');
        if (rimOn && nightF < 0.55) vQuad(bx, bz, f.a, f.off + 0.14, 0, f.span * 0.96, h3 - 0.7, h3 - 0.05, mix([255, 179, 92], hz(dep)));
        else if (nightF > 0.55) vQuad(bx, bz, f.a, f.off + 0.12, 0, f.span * 0.96, h3 - 0.4, h3 - 0.05, b.neon);
        // ground-floor storefronts: lit shop fronts break up blank walls at
        // street level (warm amber / cyan / pink neon) — always on at dusk/night
        if (nightF > 0.3) {
          for (let s = 0; s < 3; s += 1) {
            const rOff = -f.span / 2 + f.span * (s + 0.5) / 3;
            const sc = s % 3 === 0 ? [255, 179, 92] : s % 3 === 1 ? [5, 217, 232] : [255, 42, 109];
            vQuad(bx, bz, f.a, f.off + 0.12, rOff, f.span / 3 * 0.62, 0.8, 2.7, mix(sc, hz(dep)));
          }
        }
      }
    }
  }
  if (h2(b.x, b.y) > 0.6 && dep < 90) {
    box3(bx + (h2(b.x + 1, b.y) - 0.5) * w * 0.4, h3, bz + (h2(b.x, b.y + 1) - 0.5) * d * 0.4, 2.2, 1.2, 2.2, 0, '#6b7280', dep);
  }
}
// G1 sun glare: radiating streaks + one horizontal anamorphic streak
function sunStreaks(sx, sy, len) {
  x.save(); x.globalCompositeOperation = 'lighter';
  const angs = [-1.25, -0.55, 0.15, 0.85, 1.6, 2.5];
  for (let i = 0; i < angs.length; i += 1) {
    const L = len * (0.55 + (i % 3) * 0.25);
    x.save(); x.translate(sx, sy); x.rotate(angs[i]);
    const lg = x.createLinearGradient(0, 0, L, 0);
    lg.addColorStop(0, 'rgba(255,180,90,0.32)'); lg.addColorStop(1, 'rgba(255,180,90,0)');
    x.fillStyle = lg; x.fillRect(0, -2, L, 4);
    x.restore();
  }
  const hg = x.createLinearGradient(sx - 260, 0, sx + 260, 0);
  hg.addColorStop(0, 'rgba(255,170,90,0)'); hg.addColorStop(0.5, 'rgba(255,190,120,0.38)'); hg.addColorStop(1, 'rgba(255,170,90,0)');
  x.fillStyle = hg; x.fillRect(sx - 260, sy - 2, 520, 4);
  x.restore();
}
export function drawChase3D(ctx, state) {
  x = ctx; W = ctx.canvas.width; H = ctx.canvas.height; CX = W / 2; HOR = H * .46;
  camZ = 0;
  const dl = state.daylight === undefined ? 1 : state.daylight;
  const sky = skyFor(dl);
  HZ[0] = sky.haze[0]; HZ[1] = sky.haze[1]; HZ[2] = sky.haze[2];
  const nightF = sky.nightF;
  // sunset: faces toward the camera fall into shadow, warm rim on top edges
  shadeK = dl > 0.7 ? 1 : dl > 0.3 ? 0.32 : 0.55;
  rimOn = dl > 0.3;
  const t = state.elapsed || 0;
  const city = state.city;
  const p = state.player;
  const hero = p.inCar && p.car ? p.car : p.inBoat && p.boat ? p.boat : p;
  const hx = hero.x, hy = hero.y, ha = hero.angle || 0;
  const now = performance.now();
  let dt = ccLast ? (now - ccLast) / 1000 : 0.016;
  ccLast = now;
  dt = Math.min(Math.max(dt, 0), 0.05);
  const speed = Math.abs(hero.speed || 0);
  const dist = 9.5 + Math.min(1, speed / 540) * 3;
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
  const tx = hx * CS - fx * dist, tz = hy * CS - fz * dist;
  if (snap || still) { ccX = tx; ccZ = tz; ccInit = true; }
  else { ccX += (tx - ccX) * Math.min(1, dt * 8); ccZ += (tz - ccZ) * Math.min(1, dt * 8); }
  ccHX = hx; ccHY = hy;
  cfX = fx; cfZ = fz;
  // sky
  const g = x.createLinearGradient(0, 0, 0, HOR + 60);
  g.addColorStop(0, 'rgb(' + sky.top.join(',') + ')');
  g.addColorStop(0.55, 'rgb(' + sky.mid.join(',') + ')');
  g.addColorStop(1, 'rgb(' + sky.hor.join(',') + ')');
  x.fillStyle = g; x.fillRect(0, 0, W, HOR + 60);
  x.fillStyle = 'rgb(' + sky.hor.join(',') + ')'; x.fillRect(0, HOR, W, H - HOR);
  // G2 smog band: warm haze hugging the horizon (painted before the 3D so
  // buildings occlude it)
  const smog = x.createLinearGradient(0, HOR - 34, 0, HOR + 26);
  smog.addColorStop(0, 'rgba(255,150,90,0)');
  smog.addColorStop(0.55, 'rgba(255,150,90,0.22)');
  smog.addColorStop(1, 'rgba(255,150,90,0)');
  x.fillStyle = smog; x.fillRect(0, HOR - 34, W, 60);
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
  // ground tiles (segmented so quads never straddle the camera plane)
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
        flatQuad(gx, gy, WATER_X, gy + 320, 0, sh(hx3(ground), shadeK, hz(td)));
        flatQuad(WATER_X, gy, gx + 320, gy + 320, -0.35, sh([29, 111, 158], shadeK, hz(td)));
      } else if (cxp > WATER_X) {
        flatQuad(gx, gy, gx + 320, gy + 320, -0.35, sh([29, 111, 158], shadeK, hz(td)));
      } else {
        let ground = '#2f6b5a';
        for (const dd of city.districts) {
          if (cxp >= dd.x && cxp < dd.x + dd.w) { ground = dd.ground; break; }
        }
        flatQuad(gx, gy, gx + 320, gy + 320, 0, sh(hx3(ground), shadeK, hz(td)));
      }
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
  // roads + sidewalks + center dashes, segmented per 320 px
  for (const rx of city.roadsV) {
    for (let gy = -320; gy < WORLD_H + 320; gy += 320) {
      if (!inRange(rx, gy + 160, 175, 135)) continue;
      const rd = Math.hypot(rx * CS - ccX, (gy + 160) * CS - ccZ);
      flatQuad(rx - 52, gy, rx + 52, gy + 320, 0.05, sh(hx3('#9aa0a8'), shadeK, hz(rd)));
      flatQuad(rx - 36, gy, rx + 36, gy + 320, 0.06, sh(hx3('#33373d'), shadeK, hz(rd)));
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
      flatQuad(gx, ry - 52, x1, ry + 52, 0.05, sh(hx3('#9aa0a8'), shadeK, hz(rd)));
      flatQuad(gx, ry - 36, x1, ry + 36, 0.06, sh(hx3('#33373d'), shadeK, hz(rd)));
      for (let d0 = gx + 24; d0 < gx + 320 && (!clip || d0 < WATER_X); d0 += 128) {
        if (!inRange(d0 + 16, ry, 115, 75)) continue;
        flatQuad(d0, ry - 2.5, clip ? Math.min(d0 + 64, WATER_X) : d0 + 64, ry + 2.5, 0.09, '#e8d44d');
      }
    }
  }
  // warm sun glow on the asphalt ahead (low sun, straight ahead)
  if (dl > 0.3 && dl < 0.75) {
    const nx = ccX + cfX * 25, nz = ccZ + cfZ * 25;
    const fx2 = ccX + cfX * 110, fz2 = ccZ + cfZ * 110;
    const rx = -cfZ, rz = cfX;
    QW([[nx + rx * 4, 0.11, nz + rz * 4], [nx - rx * 4, 0.11, nz - rz * 4],
      [fx2 - rx * 7, 0.11, fz2 - rz * 7], [fx2 + rx * 7, 0.11, fz2 + rz * 7]], 'rgba(255,150,70,0.16)', 'far');
  }
  // G2 smog clouds: pink/orange slabs high over the skyline
  for (let i = 0; i < 5; i += 1) {
    const cLat = -190 + h2(i, 41) * 380, cFwd = 360 + h2(i, 42) * 60;
    const cy0 = 26 + h2(i, 43) * 26, ch = 9 + h2(i, 44) * 14, cw = 60 + h2(i, 45) * 90;
    const wxp = ccX + (-cfZ) * cLat + cfX * cFwd;
    const wzp = ccZ + cfX * cLat + cfZ * cFwd;
    QW([[wxp, cy0, wzp], [wxp + (-cfZ) * cw, cy0, wzp + cfX * cw], [wxp + (-cfZ) * cw, cy0 + ch, wzp + cfX * cw], [wxp, cy0 + ch, wzp]], mix(i % 2 ? [255, 120, 90] : [255, 150, 110], 0.35));
  }
  // distant skyline silhouettes, fixed in camera space
  for (let i = 0; i < 10; i += 1) {
    const bx = -170 + i * 38 + h2(i, 21) * 14, bh = 40 + h2(i, 22) * 60, bw = 20 + h2(i, 23) * 18;
    const wxp = ccX + (-cfZ) * bx + cfX * (400 + h2(i, 24) * 30);
    const wzp = ccZ + cfX * bx + cfZ * (400 + h2(i, 24) * 30);
    // G3: near-black silhouette, not grey
    QW([[wxp, 0, wzp], [wxp + (-cfZ) * bw, 0, wzp + cfX * bw], [wxp + (-cfZ) * bw, bh, wzp + cfX * bw], [wxp, bh, wzp]], mix([14, 10, 24], 0.5));
    // lit windows: tiny dots on the dark slab
    for (let k = 0; k < 3; k += 1) {
      const dLat = h2(i * 7 + k, 26) * bw, dH = 4 + h2(i * 7 + k, 27) * (bh - 8);
      const dxp = wxp + (-cfZ) * dLat - cfX * 0.5, dzp = wzp + cfX * dLat - cfZ * 0.5;
      QW([[dxp, dH, dzp], [dxp + (-cfZ) * 1.6, dH, dzp + cfX * 1.6], [dxp + (-cfZ) * 1.6, dH + 1.6, dzp + cfX * 1.6], [dxp, dH + 1.6, dzp]], 'rgba(255,205,120,0.9)');
    }
  }
  // buildings
  for (const b of city.buildings) {
    if (!inRange(b.x + b.w / 2, b.y + b.h / 2, 155, 105)) continue;
    bld3(b, nightF, t);
  }
  // trees
  for (const tree of city.trees) {
    if (!inRange(tree.x, tree.y, 85, 85)) continue;
    const cxp = tree.x * CS, czp = tree.y * CS;
    const dep = Math.hypot(cxp - ccX, czp - ccZ);
    box3(cxp, 0, czp, 0.5, 1.2, 0.5, 0, '#5a4632', dep);
    box3(cxp, 1.1, czp, 2.2, 1.8, 2.2, 0, '#1f5c2e', dep);
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
    if (lp) {
      x.save(); x.font = 'bold ' + Math.round(cl(900 / lp[2], 11, 22)) + 'px sans-serif'; x.textAlign = 'center';
      x.fillStyle = '#ffd23e'; x.fillText(tgt.label, lp[0], lp[1]); x.restore();
    }
  }
  // parked + moving traffic
  for (const car of state.traffic.parked) {
    if (!car.alive || !inRange(car.x, car.y, 150, 100)) continue;
    car3d(car.x, car.y, car.angle, car.length, car.width, car.color, { t });
  }
  for (const car of state.traffic.cars) {
    if (!car.alive || !inRange(car.x, car.y, 150, 100)) continue;
    car3d(car.x, car.y, car.angle, car.length, car.width, car.color, { t });
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
        car3d(unit.car.x, unit.car.y, unit.car.angle, unit.car.length, unit.car.width, unit.car.color || '#2f6fd0', { pol: true, t });
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
    boat3d(boat.x, boat.y, boat.angle, boat.length, boat.width, boat.color, { hero: p.inBoat && p.boat === boat, t });
  }
  // helicopter + searchlight
  const heli = state.police.heli;
  if (heli && heli.active && inRange(heli.x, heli.y, 170, 130)) {
    heli3d(heli.x, heli.y, p.x, p.y, heli.rotor || 0, t);
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
    box3(c.x * CS, 0.4, c.y * CS, 1.1, 1.1, 1.1, t * 2, '#ffd23e', Math.hypot(c.x * CS - ccX, c.y * CS - ccZ));
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
  // hero last (nearest): car / boat / on foot
  if (p.inCar && p.car) car3d(p.car.x, p.car.y, p.car.angle, p.car.length, p.car.width, p.car.paint || '#e33e5f', { hero: true, t });
  else if (p.inBoat && p.boat) boat3d(p.boat.x, p.boat.y, p.boat.angle, p.boat.length, p.boat.width, p.boat.color, { hero: true, t });
  else ped3d(p.x, p.y, p.angle, '#ffd23e');
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
      smear(pt.x + 48, pt.y - 48, 7, 46, 255, 217, 160, 0.10); n += 1;
    }
    if (city.casino && inRange(city.casino.x, city.casino.y, 120, 100)) smear(city.casino.x, city.casino.y + 40, 12, 64, 255, 210, 62, 0.12);
    for (const unit of state.police.units) {
      if (n >= 10) break;
      if ((unit.kind !== 'car' && unit.kind !== 'mtruck') || !unit.car) continue;
      if (!inRange(unit.car.x, unit.car.y, 120, 100)) continue;
      const blink = Math.floor(t * 6) % 2 === 0;
      if (blink) smear(unit.car.x, unit.car.y, 9, 40, 255, 64, 64, 0.14);
      else smear(unit.car.x, unit.car.y, 9, 40, 64, 128, 255, 0.14);
      n += 1;
    }
    x.restore();
  }
  // sun / moon disc + glow (after 3D, like the title frame)
  if (sunP) {
    const sg = x.createRadialGradient(sunP[0], sunP[1], 4, sunP[0], sunP[1], 150);
    if (nightF > 0.5) {
      sg.addColorStop(0, 'rgba(230,235,255,0.9)'); sg.addColorStop(0.3, 'rgba(180,200,255,0.35)'); sg.addColorStop(1, 'rgba(180,200,255,0)');
      x.fillStyle = sg; x.fillRect(sunP[0] - 150, sunP[1] - 150, 300, 300);
      x.fillStyle = '#e6ebff'; x.beginPath(); x.arc(sunP[0], sunP[1], 14, 0, 7); x.fill();
    } else {
      sg.addColorStop(0, 'rgba(255,230,160,0.95)'); sg.addColorStop(0.25, 'rgba(255,170,90,0.55)'); sg.addColorStop(1, 'rgba(255,140,80,0)');
      x.fillStyle = sg; x.fillRect(sunP[0] - 150, sunP[1] - 150, 300, 300);
      x.fillStyle = '#ffe9a8'; x.beginPath(); x.arc(sunP[0], sunP[1], 18, 0, 7); x.fill();
      sunStreaks(sunP[0], sunP[1], 190); // G1
    }
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
  const vg = x.createRadialGradient(CX, H / 2, H * 0.35, CX, H / 2, H * 0.85);
  vg.addColorStop(0, 'rgba(10,5,15,0)'); vg.addColorStop(1, 'rgba(10,5,15,0.35)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
}
