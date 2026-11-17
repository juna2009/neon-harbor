// Neon Harbor — the Living Harbor, cut down to boats only (no
// drawbridge). Three stealable speedboats ride the water strip east of
// the docks and marina: board one on foot at the pier (E), throttle it
// up and down the harbor, and leave a white wake behind. The Harbor
// Police answer with their own boats at 4–5 stars. Boats only ever
// live on water (WATER_X < x < WORLD_W); the player can only step
// ashore next to a pier, where the land is clear of buildings.
import { WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';

export const BOAT_MAX_SPEED = 620;
export const BOAT_ACCEL = 520;

/** Three speedboats, moored along the water edge: marina, mid-harbor, docks. */
export function createBoats(city, rng) {
  const spots = [
    { x: WATER_X + 40, y: city.marina.y + 80, angle: -Math.PI / 2 },
    { x: WATER_X + 40, y: 900, angle: Math.PI / 2 },
    { x: WATER_X + 40, y: city.docks.y + 140, angle: -Math.PI / 2 },
  ];
  return spots.map((s, i) => ({
    x: s.x, y: s.y, angle: s.angle, speed: 0,
    color: ['#e8e4d8', '#37e0e6', '#ff7fc0'][i],
    stolen: false, wake: [], length: 54, width: 20, alive: true,
  }));
}

/** The nearest boat within maxDist of (x, y), or null. */
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

/**
 * One boat step: wakes age out, and a fast boat throws spray. Called
 * from the world step for every boat (player's and moored alike).
 */
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

/** True when (x, y) is on open water (not the pier land). */
export function onWater(x, y) {
  return x > WATER_X + 8 && x < WORLD_W - 8 && y > 8 && y < WORLD_H - 8;
}
