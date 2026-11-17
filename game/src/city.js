import { BLOCK, ROAD_W, WORLD_H, WORLD_W } from './config.js';
export const WATER_X = 2448;
const ROOF_COLORS = [
  ['#b8455a', '#c98a3d', '#a85a32', '#8a4a6b'],
  ['#4a7fb5', '#7a5fb5', '#3f8f9f', '#5a6b8a'],
  ['#3f8f6f', '#e8e4d8', '#4a9db5', '#c98a3d'],
];
const CAR_COLORS = ['#d8d8d8', '#c0392b', '#2e86c1', '#f39c12', '#27ae60', '#8e44ad', '#e67e22'];
export const DISTRICTS = [
  { name: 'Old Town', x: 0, y: 0, w: 1120, h: WORLD_H, ground: '#8a7648', accent: '#ffd23e' },
  { name: 'Downtown', x: 1120, y: 0, w: 640, h: WORLD_H, ground: '#4b5563', accent: '#ff4d9d' },
  { name: 'Harbor', x: 1760, y: 0, w: WATER_X - 1760, h: WORLD_H, ground: '#2f6b5a', accent: '#37e0e6' },
];
export function districtAt(city, x, y) {
  for (const d of city.districts) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return city.districts[city.districts.length - 1];
}
export function onRoad(city, x, y) {
  for (const rx of city.roadsV) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of city.roadsH) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}
export function buildingAt(city, x, y, r) {
  for (const b of city.buildings) {
    if (x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return b;
  }
  return null;
}
export function collides(city, x, y, r) {
  if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return true;
  if (x > WATER_X - r) return true;
  return buildingAt(city, x, y, r) !== null;
}
export function moveCircle(city, pos, dx, dy, r) {
  const nx = pos.x + dx;
  if (!collides(city, nx, pos.y, r)) pos.x = nx;
  const ny = pos.y + dy;
  if (!collides(city, pos.x, ny, r)) pos.y = ny;
}
export function nearestIntersection(city, x, y) {
  let best = city.intersections[0];
  let bestD = Infinity;
  for (const pt of city.intersections) {
    const d = (pt.x - x) * (pt.x - x) + (pt.y - y) * (pt.y - y);
    if (d < bestD) { bestD = d; best = pt; }
  }
  return best;
}
export function nearestRoadPoint(city, x, y) {
  let bestV = city.roadsV[0];
  let bestD = Infinity;
  for (const rx of city.roadsV) {
    const d = Math.abs(rx - x);
    if (d < bestD) { bestD = d; bestV = rx; }
  }
  let bestH = city.roadsH[0];
  bestD = Infinity;
  for (const ry of city.roadsH) {
    const d = Math.abs(ry - y);
    if (d < bestD) { bestD = d; bestH = ry; }
  }
  if (Math.abs(bestV - x) <= Math.abs(bestH - y)) return { x: bestV, y };
  return { x, y: bestH };
}
export function pathBlocked(city, x1, y1, x2, y2) {
  for (let t = 0.15; t < 1; t += 0.15) {
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (buildingAt(city, x, y, 18)) return true;
  }
  return false;
}
export function buildCity(rng) {
  const roadsV = [];
  const roadsH = [];
  for (let x = 160; x <= 2400; x += BLOCK) roadsV.push(x);
  for (let y = 160; y <= 1760; y += BLOCK) roadsH.push(y);
  const intersections = [];
  for (const rx of roadsV) {
    for (const ry of roadsH) intersections.push({ x: rx, y: ry });
  }
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
        const cx = x + w / 2;
        const cy = y + h / 2;
        const district = cx < 1120 ? 0 : cx < 1760 ? 1 : 2;
        buildings.push({
          x, y, w, h,
          color: rng.pick(ROOF_COLORS[district]),
          neon: rng.pick(['#ff4d9d', '#37e0e6', '#ffd23e', '#9d6bff']),
          height: rng.int(1, 3),
          roof: rng.weighted([[0, 4], [1, 3], [2, 2]]),
          district,
          props: rng.int(0, 3),
        });
      }
    }
  }
  let casino = buildings[0];
  let casinoD = Infinity;
  for (const b of buildings) {
    const d = Math.hypot(b.x + b.w / 2 - 1440, b.y + b.h / 2 - 800);
    if (d < casinoD) { casinoD = d; casino = b; }
  }
  if (casino) {
    casino.landmark = 'casino';
    casino.height = 3;
    casino.neon = '#ffd23e';
  }
  let stadium = null;
  for (const park of parks) {
    if (park.x < 1120) { stadium = park; break; }
  }
  if (stadium) stadium.stadium = true;
  buildings.push({
    x: 2300, y: 1820, w: 44, h: 44,
    color: '#e8e4d8', neon: '#ffd23e', height: 3, roof: 0,
    district: 2, props: 0, landmark: 'lighthouse',
  });
  const lighthouse = buildings[buildings.length - 1];
  const gasStation = { x: 850, y: 1490, w: 210, h: 210, label: 'Gas',
    pumps: [900, 960, 1020].map((x) => ({ x, y: 1610, alive: true })) };
  const overlapsLot = (b) => b.x < 1080 && b.x + (b.w || b.r || 0) > 836
    && b.y < 1710 && b.y + (b.h || b.r || 0) > 1480;
  for (const list of [buildings, parks, trees]) {
    for (let i = list.length - 1; i >= 0; i -= 1) if (overlapsLot(list[i])) list.splice(i, 1);
  }
  const candidates = intersections.filter((pt) => pt.x < WATER_X - 80 && !(pt.x === 800 && pt.y === 1440));
  const hydrants = [{ x: 842, y: 1398, burst: false }];
  while (hydrants.length < 8 && candidates.length) {
    const pt = candidates.splice(rng.int(0, candidates.length - 1), 1)[0];
    const x = pt.x + 42, y = pt.y + 42;
    if (!buildingAt({ buildings }, x, y, 5)) hydrants.push({ x, y, burst: false });
  }
  return {
    hydrants, gasStation,
    roadsV,
    roadsH,
    intersections,
    districts: DISTRICTS,
    buildings,
    parks,
    trees,
    water: { x: WATER_X, y: 0, w: WORLD_W - WATER_X, h: WORLD_H },
    docks: { x: 2320, y: 1480, w: 128, h: 280 },
    marina: { x: 2280, y: 120, w: 168, h: 160 },
    garage: { x: 480, y: 1440, label: 'Garage' },
    casino: casino ? { x: casino.x + casino.w / 2, y: casino.y + casino.h / 2, label: 'Casino' } : { x: 1440, y: 800, label: 'Casino' },
    lighthouse: { x: lighthouse.x + lighthouse.w / 2, y: lighthouse.y + lighthouse.h / 2, label: 'Lighthouse' },
    stadium: stadium ? { x: stadium.x + stadium.w / 2, y: stadium.y + stadium.h / 2, label: 'Stadium' } : null,
    playerStart: { x: 480, y: 480 },
    carColors: CAR_COLORS,
  };
}
