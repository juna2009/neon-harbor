// Neon Harbor — cinematic 2.5D lighting: pseudo-3D building shadows, wet-road
// neon reflections, light pools, day/night tint, lightning. Standalone:
// Laras wires it into render.js. Glow is pre-rendered radial sprites;
// never shadowBlur per frame.
const cache = new Map();function sprite(color) {
  let s = cache.get(color);
  if (!s) {
    s = document.createElement('canvas');
    s.width = s.height = 128;
    const g = s.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, color);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    cache.set(color, s);
  }
  return s;
}
// Shade a #rrggbb colour by factor f (<1 darker, >1 lighter).
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) * f) | 0;
  const g = Math.min(255, ((n >> 8) & 255) * f) | 0;
  const b = Math.min(255, (n & 255) * f) | 0;
  return `rgb(${r},${g},${b})`;
}
// 1. Pseudo-3D building: ground shadow + two extruded side walls, so the
// flat roof reads as a tower. b {x,y,w,h,height,color}; sun {dx,dy} (SE=1,1).
export function drawBuildingShadow(ctx, b, sun) {
  const h = b.height || 1;
  const dx = (sun ? sun.dx : 1) * 5 * h;
  const dy = (sun ? sun.dy : 1) * 5 * h;
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.fillRect(b.x + dx - 2, b.y + dy - 2, b.w + 4, b.h + 4);
  ctx.fillStyle = shade(b.color, 0.55); // south wall, darkest
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + b.h);
  ctx.lineTo(b.x + dx, b.y + b.h + dy);
  ctx.lineTo(b.x + b.w + dx, b.y + b.h + dy);
  ctx.lineTo(b.x + b.w, b.y + b.h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = shade(b.color, 0.75); // east wall, lit edge
  ctx.beginPath();
  ctx.moveTo(b.x + b.w, b.y);
  ctx.lineTo(b.x + b.w + dx, b.y + dy);
  ctx.lineTo(b.x + b.w + dx, b.y + b.h + dy);
  ctx.lineTo(b.x + b.w, b.y + b.h);
  ctx.closePath();
  ctx.fill();
}
// 2. Wet-road neon reflection: a vertical smeared streak under a light,
// plus a bright puddle dot where it meets the asphalt. wet 0..1.
export function drawWetReflection(ctx, x, y, h, color, wet) {
  if (!wet) return;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.45 * wet;
  ctx.fillStyle = g;
  ctx.fillRect(x - 4, y, 8, h);
  ctx.globalAlpha = 0.5 * wet;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, 8, 3, 0, 0, 7);
  ctx.fill();
  ctx.restore();
}
// 3. Light pool: soft radial glow stamped on the ground (lamp, headlight,
// neon sign). a 0..1. Pre-rendered sprite per colour, cached.
export function drawLightPool(ctx, x, y, r, color, a) {
  ctx.save();
  ctx.globalAlpha = a == null ? 0.5 : a;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(sprite(color), x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
// 4. Time-of-day tint. daylight 0..1 (0 deep night, 1 noon). Night is deep
// blue, dusk is warm orange, noon is a faint warm wash. Alpha stays low so
// the HUD and mission markers stay readable; storm adds gloom.
export function dayTintColor(daylight, storm) {
  const d = Math.max(0, Math.min(1, daylight));
  let r, g, b, a;
  if (d < 0.45) { r = 10; g = 14; b = 44; a = 0.56 - (d / 0.45) * 0.48; }
  else if (d < 0.7) { r = 255; g = 140; b = 60; a = 0.10; }
  else { r = 255; g = 220; b = 160; a = 0.05; }
  if (storm) a += 0.12;
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}
export function drawDayTint(ctx, w, h, daylight, storm) {
  ctx.fillStyle = dayTintColor(daylight, storm);
  ctx.fillRect(0, 0, w, h);
}
// 5. Lightning: full-frame strobe. flash 0..1 (1 = strike). Returns a
// flicker offset (px) for building shadows this frame, so the skyline
// shudders with the bolt — the round-8 storm drives flash.
export function drawLightning(ctx, w, h, flash) {
  if (!flash) return 0;
  ctx.fillStyle = `rgba(255,255,255,${(0.85 * flash).toFixed(3)})`;
  ctx.fillRect(0, 0, w, h);
  return (Math.random() - 0.5) * 6 * flash;
}
