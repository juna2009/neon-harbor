// Neon Harbor — the live minimap: the whole city shrunk into the corner,
// with the player, police, traffic and the mission marker on it.
import { WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';

export function drawMinimap(ctx, state, x, y, w, h) {
  const sx = w / WORLD_W;
  const sy = h / WORLD_H;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.globalAlpha = 1;
  // Ground and water.
  ctx.fillStyle = '#2e6b3a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1d6f9e';
  ctx.fillRect(x + WATER_X * sx, y, (WORLD_W - WATER_X) * sx, h);
  // Roads.
  ctx.fillStyle = '#4a4f57';
  for (const rx of state.city.roadsV) ctx.fillRect(x + rx * sx - 2, y, 4, h);
  for (const ry of state.city.roadsH) ctx.fillRect(x, y + ry * sy, w, 4);
  // Parks.
  ctx.fillStyle = '#3f8f4f';
  for (const park of state.city.parks) {
    ctx.fillRect(x + park.x * sx, y + park.y * sy, Math.max(2, park.w * sx), Math.max(2, park.h * sy));
  }
  // Mission marker.
  if (state.mission.target) {
    const t = state.mission.target;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(x + t.x * sx, y + t.y * sy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0e1420';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Police.
  ctx.fillStyle = '#5aa0ff';
  for (const unit of state.police.units) {
    const ux = unit.kind === 'car' ? unit.car.x : unit.x;
    const uy = unit.kind === 'car' ? unit.car.y : unit.y;
    ctx.fillRect(x + ux * sx - 2, y + uy * sy - 2, 4, 4);
  }
  // Player.
  const p = state.player;
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(x + p.x * sx, y + p.y * sy, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}
