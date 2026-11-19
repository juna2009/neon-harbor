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
// round 21: warm sunset bounce for camera-facing faces — the rear of a car
// (or a building wall) is never pitch black at golden hour; it picks up
// orange light bounced off the road. NOT multiplied by shadeK.
const shW=(c,b,t)=>{const m=c.map(v=>Math.min(255,v*b|0)).map((v,i)=>Math.round(v+(HZ[i]-v)*t));
  return 'rgb('+m.map((v,i)=>Math.round(v*.72+[255,140,80][i]*.28)).join(',')+')';};
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
  for(let i=0;i<nc;i++)for(let j=0;j<nr;j++){const q=h2(bi*131+i*7,j*3+1),q2=h2(bi*17+i*3,j*11+5);
    const wx=x-w/2+1.2+(w-2.4)*(i+.15)/nc,wy=2+(h-3)*(j+.2)/nr,ww=(w-2.4)/nc*.62*(.75+.5*q2),wh=(h-3)/nr*.6*(.8+.4*q2);
    const c=q<.4?[255,205,120]:q<.57?[255,190,120]:q<.62?[255,150,90]:q2<.5?[52,66,88]:[34,44,62];
    Q([wx,wy,zf],[wx+ww,wy,zf],[wx+ww,wy+wh,zf],[wx,wy+wh,zf],mix(c,t),zf-camZ);}}
function bld(b){const{x,z,w,d,h,c}=b,zf=z-d/2,zb=z+d/2,dep=zf-camZ;if(dep<35)return;const sx=x>0?x-w/2:x+w/2;
  Q([x-w/2,0,zf],[x+w/2,0,zf],[x+w/2,h,zf],[x-w/2,h,zf],sh(c,.8,hz(dep)),dep);
  Q([sx,0,zf],[sx,0,zb],[sx,h,zb],[sx,h,zf],sh(c,1.05,hz(dep)),dep);
  Q([x-w/2,h,zf],[x+w/2,h,zf],[x+w/2,h,zb],[x-w/2,h,zb],sh(c,1.3,hz(dep)),dep);
  if(b.bi%3){const u=w*.31,v=d*.19,e=3+b.bi%3*2,s2=x>0?x-u:x+u;
  Q([x-u,h,zf+v],[x+u,h,zf+v],[x+u,h+e,zf+v],[x-u,h+e,zf+v],sh(c,1,hz(dep)),dep);
  Q([s2,h,zf+v],[s2,h,zb-v],[s2,h+e,zb-v],[s2,h+e,zf+v],sh(c,.9,hz(dep)),dep);
  Q([x-u,h+e,zf+v],[x+u,h+e,zf+v],[x+u,h+e,zb-v],[x-u,h+e,zb-v],sh(c,1.3,hz(dep)),dep);}
  wins(b);}
function car(o){const{x,z,w,h,l,c}=o,zb=z-l/2,zf=z+l/2,dep=zb-camZ,t=hz(dep);
  Q([x-w/2,0,zb],[x+w/2,0,zb],[x+w/2-.5,h,zb],[x-w/2+.5,h,zb],sh(c,.95,t),dep);
  Q([x-w/2+.5,h*.55,zb-.06],[x+w/2-.5,h*.55,zb-.06],[x+w/2-.6,h*.9,zb-.06],[x-w/2+.6,h*.9,zb-.06],mix([70,90,130],t),dep);
  Q([x-w/2,h,zb],[x+w/2,h,zb],[x+w/2*.82,h*.8,zf],[x-w/2*.82,h*.8,zf],sh(c,1.15,t),dep);
  const sx=x>0?x-w/2:x+w/2;
  Q([sx,0,zb],[sx,0,zf],[sx,h*.92,zf],[sx,h,zb],sh(c,.95,t),dep);
  const tl=o.pol?[[255,60,60],[60,120,255]]:[[255,70,90],[255,70,90]];
  if(o.hero){Q([x-w/2+.2,h-.06,zb-.08],[x+w/2-.2,h-.06,zb-.08],[x+w/2-.2,h+.1,zb-.08],[x-w/2+.2,h+.1,zb-.08],mix([255,90,140],t),dep);
    Q([x-w/2+.3,h*.44,zb-.07],[x+w/2-.3,h*.44,zb-.07],[x+w/2-.3,h*.49,zb-.07],[x-w/2+.3,h*.49,zb-.07],'rgba(0,0,0,.5)',dep);
    Q([x-w/2+.2,h*.84,zb-.07],[x+w/2-.2,h*.84,zb-.07],[x+w/2-.2,h*.88,zb-.07],[x-w/2+.2,h*.88,zb-.07],'rgba(0,0,0,.4)',dep);
    Q([x-w/2-.5,h*.8,zb-.3],[x-w/2-.1,h*.8,zb-.3],[x-w/2-.1,h*.95,zb-.3],[x-w/2-.5,h*.95,zb-.3],mix([20,22,30],t),dep);
    Q([x+w/2+.1,h*.8,zb-.3],[x+w/2+.5,h*.8,zb-.3],[x+w/2+.5,h*.95,zb-.3],[x+w/2+.1,h*.95,zb-.3],mix([20,22,30],t),dep);
    Q([x-.25,h+.02,zb-.4],[x+.25,h+.02,zb-.4],[x+.25,h+.22,zb-.4],[x-.25,h+.22,zb-.4],mix([20,22,30],t),dep);}
  Q([x-w/2+.3,.55,zb-.06],[x-w/2+1.1,.55,zb-.06],[x-w/2+1.1,.85,zb-.06],[x-w/2+.3,.85,zb-.06],mix(tl[0],t),dep);
  Q([x+w/2-1.1,.55,zb-.06],[x+w/2-.3,.55,zb-.06],[x+w/2-.3,.85,zb-.06],[x+w/2-1.1,.85,zb-.06],mix(tl[1],t),dep);
  Q([x-w/2+.1,0,zb-.05],[x-w/2+1.2,0,zb-.05],[x-w/2+1.2,.75,zb-.05],[x-w/2+.1,.75,zb-.05],'#0a0a0e',dep);
  Q([x+w/2-1.2,0,zb-.05],[x+w/2-.1,0,zb-.05],[x+w/2-.1,.75,zb-.05],[x+w/2-1.2,.75,zb-.05],'#0a0a0e',dep);
  Q([x-w/2+.35,.15,zb-.08],[x-w/2+.95,.15,zb-.08],[x-w/2+.95,.6,zb-.08],[x-w/2+.35,.6,zb-.08],'#8a8f98',dep);
  Q([x+w/2-.95,.15,zb-.08],[x+w/2-.35,.15,zb-.08],[x+w/2-.35,.6,zb-.08],[x+w/2-.95,.6,zb-.08],'#8a8f98',dep);
  if(o.pol){Q([x-1,h+.05,zb-.4],[x-.1,h+.05,zb-.4],[x-.1,h+.35,zb-.4],[x-1,h+.35,zb-.4],'#ff4040',dep);
    Q([x+.1,h+.05,zb-.4],[x+1,h+.05,zb-.4],[x+1,h+.35,zb-.4],[x+.1,h+.35,zb-.4],'#4080ff',dep);}}
function sign(sd,z0,z1,txt,col){const b=B.find(b=>(b.x>0)===(sd>0)&&b.z>z0&&b.z<z1);if(!b)return;
  const p=P(b.x,b.h*.72,b.z-b.d/2-.6);if(!p)return;const fs=Math.round(1500/p[2]);
  ops.push({d:p[2],f(){x.save();x.font='bold '+fs+'px sans-serif';x.textAlign='center';x.shadowColor=col;x.shadowBlur=14;x.fillStyle=col;x.fillText(txt,p[0],p[1]);x.restore();}});}
function frame(t){
  HZ[0]=255;HZ[1]=150;HZ[2]=110;
  fovF=640;camH=5.6; // title lens (round 22: chase uses its own values)
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
  Q([118,-1,camZ+150],[136,-1,camZ+150],[136,.9,camZ+150],[118,1.8,camZ+150],sh([200,210,220],1,hz(150)),150);
  Q([118,-1,camZ+150],[136,-1,camZ+150],[136,-.42,camZ+150],[118,-.42,camZ+150],sh([30,40,60],1,hz(150)),150);
  Q([123,1,camZ+150],[130,1,camZ+150],[130,2.1,camZ+150],[123,2.1,camZ+150],sh([30,40,60],1,hz(150)),150);
  Q([82,-1,camZ+110],[104,-1,camZ+110],[104,.9,camZ+110],[82,1.9,camZ+110],sh([220,220,230],1,hz(110)),110);
  Q([82,-1,camZ+110],[104,-1,camZ+110],[104,-.42,camZ+110],[82,-.42,camZ+110],sh([30,40,60],1,hz(110)),110);
  Q([89,1,camZ+110],[97,1,camZ+110],[97,2.3,camZ+110],[89,2.3,camZ+110],sh([30,40,60],1,hz(110)),110);
  Q([89,1.5,camZ+110],[92.5,1.5,camZ+110],[92.5,2.3,camZ+110],[89,1.9,camZ+110],sh([140,190,220],1,hz(110)),110);
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
  // JETFIX Bug 5 (title): sun drawn BEFORE the 3D ops so buildings occlude
  // it (was: after 3D, disc pasted over facades — same bug as chase-cam).
  const sg=x.createRadialGradient(sx,sy,4,sx,sy,150);
  sg.addColorStop(0,'rgba(255,230,160,.95)');sg.addColorStop(.25,'rgba(255,170,90,.55)');sg.addColorStop(1,'rgba(255,140,80,0)');
  x.fillStyle=sg;x.fillRect(sx-150,sy-150,300,300);
  x.fillStyle='#ffe9a8';x.beginPath();x.arc(sx,sy,18,0,7);x.fill();
  ops.sort((a,b)=>b.d-a.d);for(const o of ops)o.f();ops.length=0;
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
    vQuad(cx, cz, angle, -L / 2 - 0.06, s * Wd * 0.28, Wd * 0.22, 0.45, 0.72, o.hero ? '#ff5c7a' : '#ff3b30');
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
    vQuad(cx, cz, angle, -L / 2 - 0.08, 0, Wd * 0.96, 0.48, 0.86, '#ff2a4a'); // REWORK: thicker taillight bar, full width
    vQuad(cx, cz, angle, -L / 2 - 0.1, 0, Wd * 0.96, 0.56, 0.8, '#ff7d95'); // hot core of the bar
    vQuad(cx, cz, angle, -L / 2 - 0.075, 0, Wd * 0.94, 0.44, 0.48, 'rgba(0,0,0,0.6)'); // dark gap below the bar
    vQuad(cx, cz, angle, -L * 0.32 - 0.07, 0, Wd * 0.72, 1.0, 1.42, 'rgba(150,195,235,0.78)', dep - L / 2 - 1.0); // REWORK rear glass: pale sky glass + explicit dep (a red rear quad at d=14.00 covered it)
    vQuad(cx, cz, angle, -L * 0.32 - 0.07, Wd * 0.1, Wd * 0.42, 1.06, 1.4, 'rgba(255,228,175,0.9)', dep - L / 2 - 1.0); // bright sky streak
    vQuad(cx, cz, angle, -L * 0.32 - 0.07, -Wd * 0.18, Wd * 0.18, 1.3, 1.4, 'rgba(255,200,130,0.55)', dep - L / 2 - 1.0); // second warm streak
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
  const hullDk = sh(hx3(color), 0.62, hz(dep));
  const stripeC = '#f5f5f5';
  // BOAT-FIX (VB-02/VB-12/VB-27): the old boat was 3 stacked boxes + a flat
  // white slab under it (read as a grey board) + 2 flat wake trapezoids
  // (read as a road). Rebuilt per graphics-bible 2.1/2.2: vertical transom
  // + waterline stripe, bow rising ~19 deg, 2 outboards, console + sloped
  // windshield + driver, side stripes, Kelvin V-wake + prop-wash foam.
  // Contact shadow is dark now (was a pale white slab).
  flatQuad(wx - len / 2 - 4, wy - wid / 2 - 4, wx + len / 2 + 4, wy + wid / 2 + 4, -0.22, 'rgba(0,0,0,0.25)');
  // hull base
  box3(cx, -0.25, cz, Wd, 0.7, L, angle, color, dep);
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
  const deckC = o.pol ? '#eef2f5' : '#f2ead9'; // pale deck: white (police) / cream (hero)
  const deckDk = sh(hx3(deckC), 0.92, hz(dep));
  const gunC = sh(hx3(color), 1.15, hz(dep));
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
    topStrip(cx, cz, angle, -L * 0.2, 0, 0.54, 0.3, 1.05, 'rgba(232,228,216,0.9)');
  }
  // foredeck: converging pinstripes + dark anchor-locker hatch on the bow
  // wedge (white on pink hero deck, blue on white police deck)
  const stripeC2 = o.pol ? '#2f6fd0' : '#f5f5f5';
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
  const bowDeck = o.pol ? sh([245, 245, 245], 1.15, hz(dep)) : sh(hx3(color), 1.15, hz(dep));
  QW([pt(0.12 * L, -0.34 * Wd, 0.45), pt(0.12 * L, 0.34 * Wd, 0.45), pt(0.5 * L, 0.12 * Wd, 1.3), pt(0.5 * L, -0.12 * Wd, 1.3)], bowDeck);
  for (const s of [-1, 1]) {
    QW([pt(0.12 * L, s * 0.34 * Wd, 0.45), pt(0.5 * L, s * 0.12 * Wd, 1.3), pt(0.5 * L, s * 0.12 * Wd, 0.45)], hullDk);
  }
  // stem peak: a small tab at the bow tip so the sheer ends in a visible
  // centre peak from behind (the v1 tip vanished into the horizon haze)
  box3(cx + fx * (L * 0.47), 0.95, cz + fz * (L * 0.47), 0.14, 0.5, 0.14, angle, o.pol ? '#eef2f5' : color, dep);
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
    QW([pt(-0.45 * L, s * (Wd / 2 + 0.02), 0.4), pt(0.32 * L, s * (Wd / 2 + 0.02), 0.4), pt(0.32 * L, s * (Wd / 2 + 0.02), 0.46), pt(-0.45 * L, s * (Wd / 2 + 0.02), 0.46)], 'rgba(245,245,245,0.85)');
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
  const railTopC = o.pol ? '#eef2f5' : gunC;
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
  for (const s of [-1, 1]) {
    const mx = cx + fx * (-L / 2 - 0.28) + rx * s * 0.32 * Wd, mz = cz + fz * (-L / 2 - 0.28) + rz * s * 0.32 * Wd;
    box3(mx, -0.35, mz, 0.34, 0.62, 0.34, angle, '#1b1e24', dep);
    box3(mx, 0.12, mz, 0.3, 0.16, 0.3, angle, '#2e3238', dep);
    box3(mx, 0.24, mz, 0.3, 0.26, 0.3, angle, color, dep); // v2: bigger cowl cap, crests the transom
    vQuad(cx, cz, angle, -L / 2 - 0.47, s * 0.32 * Wd, 0.3, -0.12, 0.08, '#c8ccd4');
    vQuad(cx, cz, angle, -L / 2 - 0.47, s * 0.32 * Wd, 0.26, 0.08, 0.16, 'rgba(245,245,245,0.9)');
  }
  // console + sloped windshield (dark glass + diagonal sky streak)
  box3(cx - fx * L * 0.08, 0.45, cz - fz * L * 0.08, Wd * 0.6, 0.55, L * 0.36, angle, '#e8e4d8', dep);
  topStrip(cx, cz, angle, -L * 0.08, 0, Wd * 0.55, L * 0.3, 1.02, 'rgba(255,255,255,0.85)');
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
  QW([pt(-L / 2 - 0.25, -0.26, -0.12), pt(-L / 2 - 0.25, 0.26, -0.12),
    pt(-L / 2 - 0.95, 0.07, 0.38), pt(-L / 2 - 0.95, -0.07, 0.38)], 'rgba(255,255,255,0.32)');
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
  // JETFIX: jets were too dark against the sunset buildings (olive #3a4a3a
  // read as a black brick) — brightened ~25% so the silhouette reads.
  // JETFIX-3 (VB-08): still too dark — the HAF jet read as a black BLOCK
  // with two floating nav-light squares (its wing is edge-on from behind,
  // so only the fuselage rear shows, and it was near-black against tan
  // buildings). Body + wing brightened again; the rear cap below is now
  // light OLIVE for jets instead of the hero's white-grey.
  const body = jet ? '#5d7055' : '#f7fafc';
  // PLANE-41 (VB-08): jet wing was #4a5c44 — near-black olive against the
  // tan buildings, so it read as a dark bar. Lighter than the body so the
  // wing separates from the fuselage and from the buildings behind it.
  const wingC = jet ? '#6b7f60' : '#d5dde4';
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
  // JETFIX-3 (VB-08): jets get a LIGHT OLIVE cap, not the hero's white —
  // a white rectangle on an olive jet would read as a painted panel.
  vQuad(cx, cz, angle, -L / 2 - 0.08, 0, 1.5, y0 + 0.1, y0 + 0.92, jet ? 'rgba(122,138,106,0.85)' : 'rgba(232,236,242,0.8)');
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
    if (rimOn) QW([pt(0.6, s * 0.4, y0 + 0.58), pt(-2.0, s * 3.0, y0 + 1.08), pt(-1.95, s * 3.0, y0 + 1.08), pt(0.55, s * 0.4, y0 + 0.58)], 'rgba(255,200,130,0.5)'); // leading-edge rim
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
    QW([pt(-2.2, s * 0.55, y0 + 0.7), pt(-3.3, s * 0.55, y0 + 0.7), pt(-3.9, s * 1.2, y0 + 1.75), pt(-3.7, s * 1.1, y0 + 1.75)], sh(hx3('#6b7f60'), s < 0 ? 0.8 : 0.95, hz(dep))); // tail fin (olive, per-side tone)
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
    QW([pt(2.5, s * 0.76, y0 + 0.45), pt(-2.5, s * 0.76, y0 + 0.45), pt(-2.5, s * 0.76, y0 + 0.62), pt(2.5, s * 0.76, y0 + 0.62)], 'rgba(20,24,32,0.5)', dep); // fuselage side cheatline
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
    box3(c.x * CS, 0.4, c.y * CS, 1.1, 1.1, 1.1, t * 2, '#ffd23e', Math.hypot(c.x * CS - ccX, c.y * CS - ccZ));
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
      box3(lx, 0, lz, 0.18, 5.4, 0.18, 0, '#241f28', ldep);
      vQuad(lx, lz, ccYaw, 0, 0, 0.9, 5.3, 5.65, '#ffd9a0');
      flatQuad(wxp - 26, wzp - 26, wxp + 26, wzp + 26, 0.08, 'rgba(255,200,120,0.10)');
    }
  }
  if (p.inCar) for (let pi = 0; pi < 3; pi += 1) {
    const fwd = 30 + pi * 55, lat = roadLat + (pi % 2 === 0 ? -1 : 1) * walkLat;
    const pxp = ccX + cfX * fwd + (-cfZ) * lat, pzp = ccZ + cfZ * fwd + cfX * lat;
    const wxp = pxp / CS, wzp = pzp / CS;
    if (!inRange(wxp, wzp, 175, 135)) continue;
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
