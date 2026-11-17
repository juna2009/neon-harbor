// Neon Harbor — the live minimap: the whole city shrunk into the corner,
// with the player, police, gunmen, roadblocks, race checkpoints,
// collectibles and the mission marker on it. Every blip has its own
// colour so the map reads at a glance: yellow player, blue police,
// red gunmen and roadblocks, cyan race, gold tokens.
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
  // Collectibles left to find.
  ctx.fillStyle = '#ffd23e';
  for (const c of state.collectibles) {
    if (!c.taken) ctx.fillRect(x + c.x * sx - 1, y + c.y * sy - 1, 2, 2);
  }
  // Street race: start flag and the next checkpoint.
  if (state.race) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + state.race.start.x * sx - 2, y + state.race.start.y * sy - 2, 4, 4);
    if (state.race.active) {
      const t = state.race.points[state.race.index];
      ctx.fillStyle = '#37e0e6';
      ctx.beginPath();
      ctx.arc(x + t.x * sx, y + t.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Mission marker, pulsing.
  if (state.mission.target) {
    const t = state.mission.target;
    const r = 4 + Math.sin(state.elapsed * 4) * 1.5;
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(x + t.x * sx, y + t.y * sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0e1420';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // Garage bay.
  if (state.city.garage) {
    ctx.fillStyle = '#37e0e6';
    ctx.fillRect(x + state.city.garage.x * sx - 3, y + state.city.garage.y * sy - 3, 6, 6);
  }
  // Landmarks: casino (gold), lighthouse (white), stadium (white ring).
  if (state.city.casino) {
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(x + state.city.casino.x * sx, y + state.city.casino.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.city.lighthouse) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + state.city.lighthouse.x * sx, y + state.city.lighthouse.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Taxi fare / drop-off.
  if (state.taxi && state.taxi.state === 'pickup' && state.taxi.fare) {
    ctx.fillStyle = '#7be382';
    ctx.beginPath();
    ctx.arc(x + state.taxi.fare.x * sx, y + state.taxi.fare.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (state.taxi && state.taxi.state === 'dropoff' && state.taxi.dest) {
    ctx.fillStyle = '#7be382';
    ctx.fillRect(x + state.taxi.dest.x * sx - 3, y + state.taxi.dest.y * sy - 3, 6, 6);
  }
  // Spike strips.
  ctx.fillStyle = '#ff5a3c';
  for (const strip of state.police.strips) {
    ctx.fillRect(x + strip.x * sx - 2, y + strip.y * sy - 2, 4, 4);
  }
  // Police (blue), gunmen (red), roadblocks (red squares).
  for (const unit of state.police.units) {
    const ux = unit.kind === 'car' ? unit.car.x : unit.x;
    const uy = unit.kind === 'car' ? unit.car.y : unit.y;
    if (unit.kind === 'gunman') {
      ctx.fillStyle = '#ff5a3c';
      ctx.beginPath();
      ctx.arc(x + ux * sx, y + uy * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (unit.roadblock) {
      ctx.fillStyle = '#ff3b30';
      ctx.fillRect(x + ux * sx - 3, y + uy * sy - 3, 6, 6);
    } else {
      ctx.fillStyle = '#5aa0ff';
      ctx.fillRect(x + ux * sx - 2, y + uy * sy - 2, 4, 4);
    }
  }
  // Police helicopter: a white dot with a ring.
  if (state.police.heli && state.police.heli.active) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + state.police.heli.x * sx, y + state.police.heli.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff5a3c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + state.police.heli.x * sx, y + state.police.heli.y * sy, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Player: a yellow arrow pointing the way they face.
  const p = state.player;
  ctx.save();
  ctx.translate(x + p.x * sx, y + p.y * sy);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}
