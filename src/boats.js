import { WATER_X } from './city.js';
export const BOAT_MAX_SPEED = 620;
export const BOAT_ACCEL = 520;
export function createBoats(city, rng) {
  const spots = [
    { x: WATER_X + 40, y: city.marina.y - 80, angle: -Math.PI / 2 },
    { x: WATER_X + 40, y: 1050, angle: Math.PI / 2 },
    { x: WATER_X + 40, y: city.docks.y + 140, angle: -Math.PI / 2 },
  ];
  return spots.map((s, i) => ({
    x: s.x, y: s.y, angle: s.angle, speed: 0,
    color: ['#e8e4d8', '#37e0e6', '#0b0e13'][i],
    stolen: false, wake: [], length: 54, width: 20, alive: true, hp: 100,
  }));
}
export function nearestBoat(boats, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const b of boats) {
    if (!b.alive) continue;
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < bestD) { bestD = d; best = b; }
  }
  return best;
}
export function stepBoats(state, dt) {
  for (const b of state.boats) {
    for (let i = b.wake.length - 1; i >= 0; i -= 1) {
      b.wake[i].life -= dt;
      if (b.wake[i].life <= 0) b.wake.splice(i, 1);
    }
    if (Math.abs(b.speed) > 350 && state.rng.chance(0.5)) {
      state.particles.push({
        x: b.x - Math.cos(b.angle) * 26 + state.rng.range(-8, 8),
        y: b.y - Math.sin(b.angle) * 26 + state.rng.range(-8, 8),
        vx: state.rng.range(-30, 30), vy: state.rng.range(-30, 30),
        life: 0.5, maxLife: 0.5, size: 4, color: '#dff3ff', kind: 'spark',
      });
    }
  }
}
export const SHIP_RECT = { x: WATER_X + 12, y: 500 - 15, w: 40, h: 30 };
export const BUOYS = [900, 1200, 1500].map((y) => ({ x: WATER_X + 90, y, r: 8 }));
export function boatHitsObstacle(x, y, r) {
  const qx = Math.max(SHIP_RECT.x, Math.min(x, SHIP_RECT.x + SHIP_RECT.w));
  const qy = Math.max(SHIP_RECT.y, Math.min(y, SHIP_RECT.y + SHIP_RECT.h));
  const dx = x - qx, dy = y - qy;
  if (dx * dx + dy * dy < r * r) return true;
  for (const b of BUOYS) {
    const bx = x - b.x, by = y - b.y;
    if (bx * bx + by * by < (r + b.r) * (r + b.r)) return true;
  }
  return false;
}
