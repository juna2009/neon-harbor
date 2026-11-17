// Neon Harbor UI art (canvas 2D).
import{COLORS as C}from'./config.js';
function F(c,o){c.fillStyle=o}
function L(c,o,w){c.strokeStyle=o;c.lineWidth=w}
function B(c){c.beginPath()}
function A(c,x,y,r,k){B(c);c.arc(x,y,r,0,7);k?c.fill():c.stroke()}
function R(c,x,y,w,h){c.fillRect(x,y,w,h)}
function Z(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s)}
function E(c){c.restore()}
function G(c,v,k){B(c);for(let i=0;i<v.length;i+=2)c[i?'lineTo':'moveTo'](v[i],v[i+1]);c.closePath();k?c.fill():c.stroke()}
function T(c,z){c.font='bold '+z+'px system-ui';c.textAlign='center';c.textBaseline='middle'}
function rr(c,x,y,w,h,r){B(c);c.roundRect(x,y,w,h,r)}
export function drawStar(c,x,y,s,f){Z(c,x,y,s);B(c);for(let i=0;i<10;i++){let a=-1.57+i*.63,r=i%2?.45:1;c[i?'lineTo':'moveTo'](Math.cos(a)*r,Math.sin(a)*r)}c.closePath();if(f){F(c,f>1?'#ff8c1a':C.player);c.fill()}else{L(c,'#eef1f540',.08);c.stroke()}if(f>1){L(c,'#ff3b30',.1);A(c,0,0,1.15)}E(c)}
export function drawWantedRow(c,x,y,s,n){for(let i=0;i<n;i++)drawStar(c,x+i*s*1.25,y,s,i>4?2:1)}
export function drawCashIcon(c,x,y,s){Z(c,x,y,s);F(c,C.cash);A(c,0,0,.5,1);F(c,'#eef1f5');T(c,.62);c.fillText('$',0,.04);E(c)}
export function drawHeart(c,x,y,s,o){Z(c,x,y,s);F(c,o||'#ff4d9d');A(c,-.22,-.08,.28,1);A(c,.22,-.08,.28,1);G(c,[-.5,0,.5,0,0,.55],1);E(c)}
export function drawAmmoIcon(c,x,y,s,o){Z(c,x,y,s);F(c,o||C.player);R(c,-.22,-.5,.44,.62);G(c,[-.22,-.28,0,-.55,.22,-.28],1);E(c)}
export function drawSpeedIcon(c,x,y,s,a){Z(c,x,y,s);L(c,C.neonCyan,.1);B(c);c.arc(0,0,.42,2.36,5.5);c.stroke();L(c,'#eef1f5',.07);B(c);c.moveTo(0,0);c.lineTo(Math.cos(a)*.4,Math.sin(a)*.4);c.stroke();E(c)}
export function drawObjectiveIcon(c,x,y,s){Z(c,x,y,s);F(c,C.neonCyan);G(c,[0,-.55,.5,0,0,.55,-.5,0],1);F(c,'#0e1420');T(c,.6);c.fillText('!',0,0);E(c)}
export function drawMapPlayer(c,x,y,s,g){Z(c,x,y,s);c.rotate(g);F(c,C.player);G(c,[0,-.6,.45,.45,0,.2,-.45,.45],1);L(c,'#eef1f5',.08);c.stroke();E(c)}
export function drawMapPolice(c,x,y,s,b){F(c,b?'#ff3b30':C.police);R(c,x-s/2,y-s/2,s,s);L(c,'#eef1f5',1);c.strokeRect(x-s/2,y-s/2,s,s)}
export function drawMapMission(c,x,y,s,t){let r=.35+.12*Math.sin(t*4);Z(c,x,y,s);F(c,C.player);A(c,0,0,r,1);L(c,'#0e1420',.08);A(c,0,0,r);E(c)}
export function drawMapWrench(c,x,y,s){Z(c,x,y,s);L(c,C.neonCyan,.18);B(c);c.moveTo(-.35,.35);c.lineTo(.2,-.2);c.stroke();A(c,.32,-.32,.26);E(c)}
export function drawMapGas(c,x,y,s){Z(c,x,y,s);F(c,'#ff9d4d');R(c,-.3,-.4,.6,.8);R(c,.3,-.1,.18,.4);F(c,'#0e1420');R(c,-.18,-.22,.36,.18);E(c)}
export function drawMapHydrant(c,x,y,s){Z(c,x,y,s);F(c,'#ff3b30');R(c,-.28,-.3,.56,.75);R(c,-.4,-.05,.8,.16);F(c,C.player);R(c,-.14,-.45,.28,.16);E(c)}
export function drawMapBridge(c,x,y,s,o){let d=o?-.3:0;Z(c,x,y,s);F(c,C.player);R(c,-.5,d-.12,1,.24);F(c,'#0e1420');for(let i=0;i<3;i++)R(c,-.5+i/3,d-.12,1/6,.24);if(o){F(c,'#ff3b30');A(c,.4,d-.3,.12,1)}E(c)}
export function drawTargetRing(c,x,y,r,t){let p=1+.15*Math.sin(t*3);L(c,C.player,r*.12);A(c,x,y,r*p);F(c,C.player);A(c,x,y,r*.14,1)}
export function drawDirectionArrow(c,x,y,g,s){Z(c,x,y,s);c.rotate(g);F(c,C.player);G(c,[.5,0,-.3,-.4,-.1,0,-.3,.4],1);E(c)}
export function drawBanner(c,x,y,w,t,a){F(c,'#0e1420e6');rr(c,x,y,w,44,8);c.fill();F(c,a||C.neonPink);R(c,x,y,w,4);F(c,'#eef1f5');c.font='bold 20px system-ui';c.textBaseline='middle';c.fillText(t,x+(w-c.measureText(t).width)/2,y+24)}
export function drawNeonLine(c,x,y,w,o){c.lineCap='round';B(c);c.moveTo(x,y);c.lineTo(x+w,y);for(let a of[[o,6,.25],[o,3,.6],['#fff',1.5,1]]){c.strokeStyle=a[0];c.lineWidth=a[1];c.globalAlpha=a[2];c.stroke()}c.globalAlpha=1}
export function drawMenuFrame(c,x,y,w,h,a){F(c,'#0e1420e0');rr(c,x,y,w,h,10);c.fill();L(c,a||C.neonCyan,2);c.stroke();c.lineWidth=3;for(let i=0;i<4;i++){let X=i%2?x+w:x,Y=i<2?y:y+h,u=i%2?-1:1,v=i<2?1:-1;B(c);c.moveTo(X+u*10,Y);c.lineTo(X,Y);c.lineTo(X,Y+v*10);c.stroke()}}
export function drawButton(c,x,y,w,h,l,t){F(c,t==2?C.neonPink:t==1?'#37e0e633':'#0e1420e6');rr(c,x,y,w,h,8);c.fill();L(c,C.neonCyan,t==1?2.5:2);c.stroke();F(c,'#eef1f5');T(c,15);c.fillText(l,x+w/2,y+h/2+1)}
