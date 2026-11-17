// Neon Harbor — the procedural city. A seeded grid of roads, building
// blocks, parks and a harbor edge on the east side. The layout is fixed by
// the seed, so every player with the same seed walks the same streets.
import { BLOCK, ROAD_W, WORLD_H, WORLD_W } from './config.js';

export const WATER_X = 2448;

const ROOF_COLORS = ['#b8455a', '#4a7fb5', '#c98a3d', '#7a5fb5', '#3f8f6f', '#8a4a6b'];
const CAR_COLORS = ['#d8d8d8', '#c0392b', '#2e86c1', '#f39c12', '#27ae60', '#8e44ad', '#e67e22'];

/** True when (x, y) lies on a road surface (centre lines every BLOCK px). */
export function onRoad(city, x, y) {
  for (const rx of city.roadsV) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of city.roadsH) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

/** The building whose footprint contains (x, y) expanded by r, or null. */
export function buildingAt(city, x, y, r) {
  for (const b of city.buildings) {
    if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return b;
  }
  return null;
}

/** True when a circle of radius r at (x, y) cannot stand there. */
export function collides(city, x, y, r) {
  if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return true;
  if (x > WATER_X - r) return true;
  return buildingAt(city, x, y, r) !== null;
}

/** Slide a circle out of buildings/water by axis: try x, then y. */
export function moveCircle(city, pos, dx, dy, r) {
  const nx = pos.x + dx;
  if (!collides(city, nx, pos.y, r)) pos.x = nx;
  const ny = pos.y + dy;
  if (!collides(city, pos.x, ny, r)) pos.y = ny;
}

export function buildCity(rng) {
  const roadsV = [];
  const roadsH = [];
  for (let x = 160; x <= 2400; x += BLOCK) roadsV.push(x);
  for (let y = 160; y <= 1760; y += BLOCK) roadsH.push(y);

  const buildings = [];
  const parks = [];
  const trees = [];
  for (let i = 0; i < roadsV.length - 1; i += 1) {
    for (let j = 0; j < roadsH.length - 1; j += 1) {
      const bx = roadsV[i] + ROAD_W / 2 + 14;
      const by = roadsH[j] + ROAD_W / 2 + 14;
      const bw = BLOCK - ROAD_W - 28;
      const bh = BLOCK - ROAD_W - 28;
      if (bx + bw > WATER_X - 20) continue;
      if (rng.chance(0.16)) {
        parks.push({ x: bx, y: by, w: bw, h: bh });
        for (let t = 0; t < 7; t += 1) {
          trees.push({ x: bx + rng.range(16, bw - 16), y: by + rng.range(16, bh - 16), r: rng.range(8, 13) });
        }
        continue;
      }
      const count = rng.int(1, 2);
      for (let k = 0; k < count; k += 1) {
        const w = count === 1 ? bw : bw / 2 - 8;
        const h = count === 1 ? bh : bh / 2 - 8;
        const x = count === 1 ? bx : bx + (k % 2) * (bw / 2 + 8);
        const y = count === 1 ? by : by + Math.floor(k / 2) * (bh / 2 + 8);
        buildings.push({
          x, y, w, h,
          color: rng.pick(ROOF_COLORS),
          neon: rng.pick(['#ff4d9d', '#37e0e6', '#ffd23e', '#9d6bff']),
          height: rng.int(1, 3),
        });
      }
    }
  }

  return {
    roadsV,
    roadsH,
    buildings,
    parks,
    trees,
    water: { x: WATER_X, y: 0, w: WORLD_W - WATER_X, h: WORLD_H },
    docks: { x: 2320, y: 1480, w: 128, h: 280 },
    marina: { x: 2280, y: 120, w: 168, h: 160 },
    playerStart: { x: 480, y: 480 },
    carColors: CAR_COLORS,
  };
}
