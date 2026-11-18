function T(c,x,y,a){c.save();c.translate(x,y);c.rotate(a)}
function E(c){c.restore()}
function R(c,x,y,w,h,k){c.fillStyle=k;c.fillRect(x,y,w,h)}
function C(c,x,y,r,k){c.fillStyle=k;c.beginPath();c.arc(x,y,r,0,7);c.fill()}
function W(c){R(c,-20,-12,40,24,'#111')}
export function drawSportCar(c,x,y,a,k){k=k||'#f43';T(c,x,y,a);W(c);R(c,-24,-10,48,20,k);R(c,-6,-7,14,14,'#9df');R(c,-26,-9,3,18,'#222');E(c)}
export function drawVan(c,x,y,a,k){k=k||'#39d';T(c,x,y,a);R(c,-27,-12,54,24,k);R(c,15,-10,10,20,'#bdf');E(c)}
export function drawPinkTaxi(c,x,y,a){T(c,x,y,a);W(c);R(c,-23,-11,46,22,'#f7c');R(c,-5,-14,10,4,'#fff');for(let i=6;i--;)R(c,-18+i*6,-2,3,4,i%2?'#111':'#fff');E(c)}
export function drawPoliceCar(c,x,y,a){T(c,x,y,a);W(c);R(c,-23,-11,46,22,'#111');R(c,0,-11,23,22,'#fff');R(c,-8,-14,8,4,'#f00');R(c,0,-14,8,4,'#00f');E(c)}
export function drawSpeedboat(c,x,y,a,k){k=k||'#f5f5f5';T(c,x,y,a);R(c,-27,-10,44,20,k);c.fillStyle=k;c.beginPath();c.moveTo(17,-10);c.lineTo(27,0);c.lineTo(17,10);c.closePath();c.fill();R(c,0,-7,10,14,'#9df');R(c,-31,-4,5,8,'#333');E(c)}
const S='#e74c3c#3498db#f1c40f#9b59b6';
const PN=['#2c3e50','#333','#555','#222'];
export function drawPedestrian(c,x,y,a,v,p){const f=(p||0)%2,j=v==='jax',m=v==='mara';
 const shirt=j?'#6b4423':m?'#8a1f28':S.substr((v||0)*7,7),pants=j?'#1c1f24':m?'#2a1214':PN[(v||0)%4];
 const hair=j?'#1a120a':m?'#160d0c':v===3?'#d8b25a':'#222',skin=j?'#d8a077':'#e8b98a',bw=j?16:m?11:13;
 T(c,x,y,a);C(c,0,11,8,'rgba(0,0,0,.25)');
 if(m)R(c,-6,-13,12,20,hair);
 R(c,-5,3+f*3,4,8,pants);R(c,1,3+(1-f)*3,4,8,pants);R(c,-5,9+f*3,4,2,'#111');R(c,1,9+(1-f)*3,4,2,'#111');
 R(c,-bw/2,-8,bw,13,shirt);R(c,-bw/2,-8,bw,5,shirt);
 R(c,-bw/2-2,-6,2,8,skin);R(c,bw/2,-6,2,8,skin);
 if(j){R(c,-1,-8,2,13,'#3a2410');R(c,-bw/2,-8,bw,2,'#4a2c17')}
 if(m){R(c,-1,-8,2,11,'#5e141a');R(c,-bw/2,2,bw,2,'#5e141a')}
 C(c,0,-13,4.5,hair);C(c,0,-11.5,3.6,skin);
 if(v===1){R(c,-5,-17,10,3,'#20242a');R(c,-4,-19,8,3,'#20242a')}
 if(v===2)R(c,bw/2,-4,4,6,'#852');
 E(c)}
export function drawPedPhone(c,x,y,a){drawPedestrian(c,x,y,a,0,0);R(c,x-1,y-24,3,6,'#3a3f4a');C(c,x,y-22,1,'#7df')}
export function drawExplosionSprite(c,x,y,r,p){C(c,x,y,r-r*p*.4,'#f91');c.globalAlpha=.5*(1-p);for(let i=3;i--;)C(c,x+(i-1)*r/2,y-r/2-r*p*.8,r/4,'#888');c.globalAlpha=1}
export function drawWaterJet(c,x,y,h,p){c.globalAlpha=.8-p*.4;R(c,x-3,y-h,6,h,'#bef');C(c,x,y,8,'#cef');c.globalAlpha=1}
export function drawTireSmoke(c,x,y,r,a){c.globalAlpha=a;C(c,x,y,r,'#aaa');c.globalAlpha=1}
export function drawBoatWake(c,x,y,a,l){T(c,x,y,a);c.strokeStyle='#fffb';c.beginPath();c.moveTo(-l,-l/3);c.lineTo(0,0);c.lineTo(-l,l/3);c.stroke();E(c)}
export function drawNeonLogo(c,x,y,s){c.textAlign='center';c.font=`bold ${28*s}px sans-serif`;c.strokeStyle='#0ff';for(let i=3;i--;){c.globalAlpha=.3+i/4;c.lineWidth=8-2*i;c.strokeText('NEON HARBOR',x,y)}c.globalAlpha=1;c.font=`${12*s}px sans-serif`;c.fillStyle='#f7c';c.fillText('The Mara Job',x,y+18*s)}
export function drawHarborSkyline(c,x,y,w,h){for(let i=5,b;i--;)R(c,x+i*w/5,y+h-(b=h*(.5+.1*(i%3))),w/5-3,b,'#124');R(c,x+w-14,y,8,h,'#223');R(c,x+w-44,y+2,30,6,'#fe98');R(c,x+10,y+h-6,24,6,'#335')}
