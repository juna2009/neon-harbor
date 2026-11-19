function F(c,k){c.fillStyle=k}function S(c,k){c.strokeStyle=k}
function E(c,x,y,a,b){c.beginPath();c.ellipse(x,y,a,b,0,0,7);c.fill()}
function O(c,x,y,r){c.beginPath();c.arc(x,y,r,0,7);c.fill()}
function LN(c,x1,y1,x2,y2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
function FP(c,x,y,w,h){c.beginPath();c.moveTo(x-w*.48,y-h*.28);c.quadraticCurveTo(x-w*.54,y+h*.28,x,y+h*.5);c.quadraticCurveTo(x+w*.54,y+h*.28,x+w*.48,y-h*.28);c.quadraticCurveTo(x,y-h*.54,x-w*.48,y-h*.28)}
function P(c,x,y,w,h,o){const cx=x+w/2,cy=y+h*.38,fw=w*.42,fh=h*.42,u=w/200,ex=o.expr;
 const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#0d1626');g.addColorStop(1,'#2a1712');F(c,g);c.fillRect(x,y,w,h);
 F(c,o.h0);if(o.long){E(c,cx-fw*.44,cy+fh*.3,fw*.2,fh*.55);E(c,cx+fw*.44,cy+fh*.3,fw*.2,fh*.55)}else E(c,cx,cy-fh*.26,fw*.56,fh*.44);
 F(c,o.coat);c.beginPath();c.moveTo(cx-w*.46,y+h);c.lineTo(cx-w*.36,y+h*.74);c.quadraticCurveTo(cx,y+h*.66,cx+w*.36,y+h*.74);c.lineTo(cx+w*.46,y+h);c.closePath();c.fill();
 F(c,o.neck);c.fillRect(cx-fw*.14,cy+fh*.4,fw*.28,fh*.24);
 F(c,'rgba(40,15,5,.35)');c.fillRect(cx,cy+fh*.4,fw*.14,fh*.24);
 FP(c,cx,cy,fw,fh);F(c,o.skin);c.fill();c.save();FP(c,cx,cy,fw,fh);c.clip();
 F(c,'rgba(255,232,180,.30)');c.fillRect(cx-fw/2,cy-fh/2,fw*.30,fh);
 F(c,'rgba(70,25,8,.18)');c.fillRect(cx-fw*.06,cy-fh/2,fw*.16,fh);
 F(c,'rgba(70,25,8,.42)');c.fillRect(cx+fw*.24,cy-fh/2,fw*.26,fh);
 F(c,'rgba(60,20,8,.22)');E(c,cx,cy+fh*.44,fw*.34,fh*.10);
 c.restore();
 const t=ex==='worried'?1:0;
 for(let q=-1;q<=1;q+=2){const ex2=cx+q*fw*.22,ey=cy-fh*.06;
  F(c,'#fff');E(c,ex2,ey,fw*.1,fh*.05);F(c,'#1a1210');O(c,ex2,ey,fw*.048);F(c,'#fff');O(c,ex2+fw*.02,ey-fh*.016,fw*.016);
  S(c,o.h1);c.lineWidth=u*3;c.lineCap='round';c.beginPath();c.moveTo(cx+q*fw*.34,cy-fh*.20);
  c.quadraticCurveTo(cx+q*fw*.22,cy-fh*.245-t*u*2,cx+q*fw*.10,cy-fh*.175-t*u*2.5);c.stroke()}
 S(c,'#a06a42');c.lineWidth=u*2;LN(c,cx,cy+fh*.02,cx-fw*.02,cy+fh*.18);LN(c,cx-fw*.02,cy+fh*.18,cx+fw*.04,cy+fh*.18);
 const my=cy+fh*.3,l=o.lip;
 if(ex==='smile'){F(c,'#571a16');c.beginPath();c.moveTo(cx-fw*.11,my-fh*.01);c.quadraticCurveTo(cx,my+fh*.11,cx+fw*.11,my-fh*.01);c.quadraticCurveTo(cx,my+fh*.02,cx-fw*.11,my-fh*.01);c.fill();
  S(c,l);c.lineWidth=u*2;c.beginPath();c.moveTo(cx-fw*.11,my-fh*.01);c.quadraticCurveTo(cx,my+fh*.02,cx+fw*.11,my-fh*.01);c.stroke();
  F(c,l);E(c,cx,my+fh*.075,fw*.07,fh*.02)}
 else if(ex==='worried'){F(c,'#571a16');E(c,cx,my+fh*.015,fw*.05,fh*.03);F(c,l);E(c,cx,my+fh*.05,fw*.055,fh*.014)}
 else{F(c,l);E(c,cx-fw*.045,my-fh*.01,fw*.05,fh*.02);E(c,cx+fw*.045,my-fh*.01,fw*.05,fh*.02);
  E(c,cx,my+fh*.032,fw*.062,fh*.018);F(c,'rgba(255,225,200,.28)');E(c,cx,my+fh*.032,fw*.045,fh*.011);
  S(c,'#4a140f');c.lineWidth=u*1.5;c.beginPath();c.moveTo(cx-fw*.10,my);c.quadraticCurveTo(cx,my+fh*.012,cx+fw*.10,my);c.stroke()}
 if(o.stub){c.globalAlpha=.16;F(c,'#000');for(let i=0;i<14;i++)O(c,cx+(((i*37)%10)/10-.5)*fw*.8,cy+fh*(.3+(i%3)*.06),u*1.6);c.globalAlpha=1}
 F(c,o.h1);c.beginPath();c.moveTo(cx-fw*.5,cy-fh*.08);c.quadraticCurveTo(cx-fw*.54,cy-fh*.62,cx,cy-fh*.56);c.quadraticCurveTo(cx+fw*.54,cy-fh*.62,cx+fw*.5,cy-fh*.08);
 c.lineTo(cx+fw*.28,cy-fh*.3);c.lineTo(cx+fw*.12,cy-fh*.22);c.lineTo(cx,cy-fh*.32);c.lineTo(cx-fw*.12,cy-fh*.22);c.lineTo(cx-fw*.28,cy-fh*.3);c.closePath();c.fill();
 S(c,o.hl);c.lineWidth=u*3;c.globalAlpha=.75;c.beginPath();c.moveTo(cx-fw*.42,cy-fh*.14);c.quadraticCurveTo(cx-fw*.46,cy-fh*.52,cx-fw*.08,cy-fh*.5);c.stroke();c.globalAlpha=1;
 if(o.long){F(c,o.skin);c.beginPath();c.moveTo(cx-fw*.05,cy-fh*.5);c.lineTo(cx+fw*.05,cy-fh*.5);c.lineTo(cx,cy-fh*.24);c.closePath();c.fill()}
 S(c,o.h2);c.lineWidth=u*2;for(let i=-2;i<=2;i++)LN(c,cx+i*fw*.15,cy-fh*.52,cx+i*fw*.21,cy-fh*.16);
 if(o.long){F(c,'#3d0d12');c.beginPath();c.moveTo(cx-fw*.13,cy+fh*.58);c.lineTo(cx,cy+fh*.84);c.lineTo(cx+fw*.13,cy+fh*.58);c.lineTo(cx,cy+fh*.7);c.closePath();c.fill();F(c,'#d8b98a');O(c,cx,y+h*.9,u*2)}
 F(c,o.coat2);c.beginPath();c.moveTo(cx-fw*.17,cy+fh*.6);c.quadraticCurveTo(cx,cy+fh*.67,cx+fw*.17,cy+fh*.6);c.lineTo(cx+fw*.17,cy+fh*.68);c.lineTo(cx-fw*.17,cy+fh*.68);c.closePath();c.fill();
 if(!o.long){S(c,'#d8b98a');c.lineWidth=u*1.5;LN(c,cx,cy+fh*.72,cx,y+h*.98);S(c,'#2e1c0e');LN(c,cx-fw*.3,y+h*.86,cx-fw*.14,y+h*.86);LN(c,cx+fw*.14,y+h*.86,cx+fw*.3,y+h*.86)}
}
export function drawJaxPortrait(c,x,y,w,h,expr){P(c,x,y,w,h,{skin:'#d8a077',neck:'#b57e52',h0:'#120c07',h1:'#241609',h2:'#7a5230',hl:'#8a6a45',coat:'#5d3a1e',coat2:'#4a2c17',lip:'#7a3b28',stub:1,expr:expr||'stern'})}
export function drawMaraPortrait(c,x,y,w,h,expr){P(c,x,y,w,h,{skin:'#e0aa7e',neck:'#bd8460',h0:'#0d0808',h1:'#1c0f0e',h2:'#6e3527',hl:'#a05a40',coat:'#7c1d24',coat2:'#9c2a30',lip:'#8a2f35',long:1,expr:expr||'alert'})}
export function drawPortraitSmall(c,x,y,who,expr){if(who==='mara')drawMaraPortrait(c,x,y,64,80,expr);else drawJaxPortrait(c,x,y,64,80,expr)}
