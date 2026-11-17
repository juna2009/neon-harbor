// Neon Harbor — the live minimap.
import { WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';
import { drawMapGas, drawMapHydrant, drawMapMission, drawMapPlayer, drawMapPolice, drawMapWrench } from './ui-art.js';

export function drawMinimap(ctx, state, x, y, w, h) {
  const sx = w / WORLD_W;
  const sy = h / WORLD_H;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#0e1420';
  ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#2e6b3a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#1d6f9e';
  ctx.fillRect(x + WATER_X * sx, y, (WORLD_W - WATER_X) * sx, h);
  ctx.fillStyle = '#4a4f57';
  for (const rx of state.city.roadsV) ctx.fillRect(x + rx * sx - 2, y, 4, h);
  for (const ry of state.city.roadsH) ctx.fillRect(x, y + ry * sy, w, 4);
  ctx.fillStyle = '#3f8f4f';
  for (const park of state.city.parks) {
    ctx.fillRect(x + park.x * sx, y + park.y * sy, Math.max(2, park.w * sx), Math.max(2, park.h * sy));
  }
  ctx.fillStyle = '#ffd23e';
  for (const c of state.collectibles) {
    if (!c.taken) ctx.fillRect(x + c.x * sx - 1, y + c.y * sy - 1, 2, 2);
  }
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
  if (state.mission.target) {
    const t = state.mission.target;
    drawMapMission(ctx, x + t.x * sx, y + t.y * sy, 10, state.elapsed);
  }
  const gas = state.gasStation;
  drawMapGas(ctx, x + (gas.x + gas.w / 2) * sx, y + (gas.y + gas.h / 2) * sy, 9);
  if (state.city.garage) drawMapWrench(ctx, x + state.city.garage.x * sx, y + state.city.garage.y * sy, 9);
  for (const h of state.hydrants) drawMapHydrant(ctx, x + h.x * sx, y + h.y * sy, 7);
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
  ctx.fillStyle = '#ff5a3c';
  for (const strip of state.police.strips) {
    ctx.fillRect(x + strip.x * sx - 2, y + strip.y * sy - 2, 4, 4);
  }
  for (const boat of state.boats || []) {
    if (!boat.alive) continue;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + boat.x * sx, y + boat.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const unit of state.police.units) {
    const ux = unit.kind === 'car' ? unit.car.x : unit.x;
    const uy = unit.kind === 'car' ? unit.car.y : unit.y;
    if (unit.kind === 'gunman') {
      ctx.fillStyle = '#ff5a3c';
      ctx.beginPath();
      ctx.arc(x + ux * sx, y + uy * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawMapPolice(ctx, x + ux * sx, y + uy * sy, unit.roadblock ? 6 : 4, !!unit.roadblock);
    }
  }
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
  for (const car of state.traffic.cars) {
    if (car.pink && car.alive) {
      ctx.fillStyle = '#ff7fc0';
      ctx.beginPath();
      ctx.arc(x + car.x * sx, y + car.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  if (state.ufo && state.ufo.active) {
    ctx.fillStyle = '#78ff8c';
    ctx.beginPath();
    ctx.arc(x + state.ufo.x * sx, y + state.ufo.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const p = state.player;
  drawMapPlayer(ctx, x + p.x * sx, y + p.y * sy, 10, p.angle);
  ctx.restore();
}
