function sh(c,x,y,r){c.fillStyle='#0000004d';c.beginPath();c.arc(x+2,y+3,r,0,6.283);c.fill();}
export function drawBuilding(c,x,y,w,h,k){
  const P=['#b8455a','#ffd23e','#3f8f6f','#37e0e6','#c98a3d','#ffd23e','#5a6b8a','#e8e4d8','#e8e4d8','#c0392b'];
  c.fillStyle=P[2*k];c.fillRect(x,y,w,h);
  c.strokeStyle=P[2*k+1];c.lineWidth=3;c.strokeRect(x+4,y+4,w-8,h-8);
  if(k===0){c.fillStyle='rgba(255,240,170,.9)';for(let i=0;i<3;i++)c.fillRect(x+12+i*(w-34)/2,y+14,10,8);}
  else if(k===1){c.fillStyle='#00000040';for(let i=1;i<4;i++)c.fillRect(x+i*w/4,y+6,2,h-12);c.fillStyle='#20242a';c.fillRect(x+w/2-14,y+h-20,28,20);}
  else if(k===2){c.fillStyle='#ffd23e';c.fillRect(x+8,y+8,w-16,10);}
  else if(k===3){c.strokeStyle='#fff';c.beginPath();c.ellipse(x+w/2,y+h/2,w/2-6,h/2-6,0,0,6.283);c.stroke();}
  else{c.fillStyle='#c0392b';c.fillRect(x+4,y+8,w-8,8);c.fillRect(x+4,y+h/2,w-8,8);c.fillStyle='#ffd23e';c.beginPath();c.arc(x+w/2,y+h/2,6,0,6.283);c.fill();}
}
export function drawTree(c,x,y,r,v){
  sh(c,x,y,r);
  c.fillStyle=v?'#276031':'#1f5c2e';c.beginPath();c.arc(x,y,r,0,6.283);c.fill();
}
export function drawLamp(c,x,y,n){
  c.fillStyle='#20242a';c.fillRect(x-2,y-14,4,28);
  c.fillStyle='#ffd23e';c.beginPath();c.arc(x,y-14,4,0,6.283);c.fill();
  if(n>0.3){c.fillStyle='rgba(255,240,170,.12)';c.beginPath();c.arc(x,y-14,22,0,6.283);c.fill();}
}
export function drawHydrant(c,x,y){
  c.fillStyle='#d94743';c.fillRect(x-4,y-10,8,12);c.fillRect(x-8,y-6,16,4);
  c.fillStyle='#892b34';c.fillRect(x-5,y-12,10,4);
}
export function drawSign(c,x,y,k){
  c.fillStyle='#6b7280';c.fillRect(x-1,y-2,2,16);
  if(k<2){c.fillStyle=k?'#2f6fd0':'#c0392b';c.fillRect(x-8,y-14,16,12);c.fillStyle='#fff';c.fillRect(x-5,y-10,10,3);}
  else{c.fillStyle='#ffd23e';c.fillRect(x-8,y-14,16,12);c.fillStyle='#20242a';c.fillRect(x-1,y-12,2,7);c.fillRect(x-5,y-6,10,3);}
}
export function drawCrosswalk(c,x,y,w,h,v){
  c.fillStyle='#ffffffbf';
  for(let i=0;i<5;i++)c.fillRect(v?x:x+4+i*(w-8)/4,v?y+4+i*(h-8)/4:y,v?w:4,v?4:h);
}
export function drawContainer(c,x,y,w,h,v){
  c.fillStyle=['#c0392b','#2e86c1','#f39c12','#27ae60','#8e44ad'][v%5];c.fillRect(x,y,w,h);
  c.fillStyle='#00000040';for(let i=1;i<5;i++)c.fillRect(x+i*w/5,y+2,2,h-4);
}
export function drawCrane(c,x,y,h){
  c.strokeStyle='#c98a3d';c.lineWidth=4;
  c.beginPath();c.moveTo(x-14,y);c.lineTo(x,y-h);c.lineTo(x+14,y);c.moveTo(x,y-h);c.lineTo(x+h/2,y-h+10);c.stroke();
  c.fillStyle='#20242a';c.fillRect(x+h/2-1,y-h+10,2,h-24);
}
export function drawCargoShip(c,x,y,w,h,v){
  c.fillStyle='#20242a';c.beginPath();c.moveTo(x,y-h/2);c.lineTo(x+w,y-h/2);c.lineTo(x+w-14,y+h/2);c.lineTo(x+14,y+h/2);c.closePath();c.fill();
  c.fillStyle=v%2?'#c0392b':'#2e86c1';c.fillRect(x+10,y-h/2+6,w-40,12);
}
export function drawPier(c,x,y,w,h){
  c.fillStyle='#8a6f4d';c.fillRect(x,y,w,h);
  c.fillStyle='#6b5638';for(let i=0;i<w;i+=14)c.fillRect(x+i,y,3,h);
}
export function drawBuoy(c,x,y,r){
  c.strokeStyle='#ff3b30';c.lineWidth=4;c.beginPath();c.arc(x,y,r*0.75,0,6.283);c.stroke();
}
