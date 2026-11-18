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
