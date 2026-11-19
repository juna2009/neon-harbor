import { ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { WATER_X, buildingAt, onRoad } from './city.js';
export const CAR_BODIES = {
  sedan: { length: 46, width: 22 },
  hatch: { length: 40, width: 22 },
  van: { length: 54, width: 24 },
  taxi: { length: 46, width: 22 },
};
export function makeCar(x, y, angle, color, kind, body) {
  const shape = CAR_BODIES[body || 'sedan'] || { length: 46, width: 22 };
  return {
    x, y, angle, speed: 0, color, kind: kind || 'traffic',
    body: body || 'sedan', ...shape,
    alive: true, health: 2,
  };
}
export function createTraffic(city, rng) {
  const cars = [];
  for (let i = 0; i < 16; i += 1) {
    const vertical = rng.chance(0.5);
    const body = rng.weighted(BODIES);
    const color = { bus: '#e8b93c', fire: '#c0392b', medic: '#f5f5f5' }[body] || (body === 'taxi' ? '#f7c948' : rng.pick(city.carColors));
    let car;
    if (vertical) {
      const rx = rng.pick(city.roadsV);
      car = makeCar(rx + (rng.chance(0.5) ? 14 : -14), rng.range(40, WORLD_H - 40), rng.chance(0.5) ? PI2 : -PI2, color, 'traffic', body);
      car.axis = 'v';
      car.road = rx;
      car.dir = car.angle > 0 ? 1 : -1;
    } else {
      const ry = rng.pick(city.roadsH);
      car = makeCar(rng.range(40, WATER_X - 40), ry + (rng.chance(0.5) ? 14 : -14), rng.chance(0.5) ? 0 : Math.PI, color, 'traffic', body);
      car.axis = 'h';
      car.road = ry;
      car.dir = car.angle === 0 ? 1 : -1;
    }
    car.speed = rng.range(90, 170);
    car.cruise = car.speed;
    cars.push(car);
  }
  const cab = cars.find((c) => c.body === 'taxi') || cars[0];
  cab.body = 'taxi';
  cab.color = '#ff7fc0';
  cab.pink = true;
  const parked = [];
  for (let i = 0; i < 12; i += 1) {
    const vertical = rng.chance(0.5);
    const body = rng.weighted(BODIES.slice(0, 7));
    const color = body === 'taxi' ? '#f7c948' : rng.pick(city.carColors);
    if (vertical) {
      const rx = rng.pick(city.roadsV);
      parked.push(makeCar(rx + 16, rng.range(200, WORLD_H - 200), PI2, color, 'parked', body));
    } else {
      const ry = rng.pick(city.roadsH);
      parked.push(makeCar(rng.range(200, WATER_X - 200), ry + 16, 0, color, 'parked', body));
    }
  }
  return { cars, parked };
}
function nextX(car, city) {
  const line = car.axis === 'v' ? city.roadsH : city.roadsV;
  const at = car.axis === 'v' ? car.y : car.x;
  let best = null;
  for (const c of line) {
    if (car.dir > 0 && c > at + 8) { best = c; break; }
    if (car.dir < 0 && c < at - 8) best = c;
  }
  return best;
}
function blocked(car, others, gap) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  for (const o of others) {
    if (!o || o === car || o.alive === false) continue;
    const dx = o.x - car.x;
    const dy = o.y - car.y;
    const along = dx * fx + dy * fy;
    if (along < 0 || along > gap) continue;
    const side = Math.abs(dx * -fy + dy * fx);
    if (side < 26) return true;
  }
  return false;
}
export function stepTraffic(traffic, dt, city, obstacles, bridge) {
  const slow = (obstacles || []).filter((o) => Math.abs(o.speed || 0) < 150);
  const others = traffic.cars.concat(slow);
  for (const car of traffic.cars) {
    if (!car.alive || car.kind === 'player') continue;
    const next = nextX(car, city);
    const at = car.axis === 'v' ? car.y : car.x;
    const distToNext = next === null ? Infinity : Math.abs(next - at);
    if (distToNext < Math.max(6, car.speed * dt + 2)) {
      const noTurn = bridge?.up && car.axis === 'h' && next === 2400 && car.road === 1760;
      if (!noTurn && Math.random() < 0.38) {
        const lane = Math.random() < 0.5 ? 14 : -14;
        const newDir = Math.random() < 0.5 ? 1 : -1;
        if (car.axis === 'v') {
          car.axis = 'h';
          car.road = next;
          car.dir = newDir;
          car.angle = newDir > 0 ? 0 : Math.PI;
          car.y = next + lane;
        } else {
          car.axis = 'v';
          car.road = next;
          car.dir = newDir;
          car.angle = newDir > 0 ? PI2 : -PI2;
          car.x = next + lane;
        }
      }
    }
    const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
    let desired = car.cruise;
    const d = car.road === 2400 && car.axis === 'v' ? (car.dir < 0 ? car.y - 1720 : 1640 - car.y) : -1;
    if (bridge?.up && d > 0 && d < 200) desired = 0;
    if (blocked(car, others, 98)) desired = 0;
    if (distToNext < 90 && blocked({ ...car, x: car.x + fx * 60, y: car.y + fy * 60 }, others, 60)) desired = 0;
    car.speed = desired === 0 ? Math.max(0, car.speed - 420 * dt) : Math.min(desired, car.speed + 240 * dt);
    const step = car.speed * dt;
    car.x += fx * step;
    car.y += fy * step;
    if (car.x < -60) car.x = WORLD_W - 40;
    if (car.x > WORLD_W + 60) car.x = -40;
    if (car.y < -60) car.y = WORLD_H - 40;
    if (car.y > WORLD_H + 60) car.y = -40;
  }
  // BUG 8: unstick same-lane overlaps.
  for (const a of traffic.cars) for (const b of traffic.cars) {
    if (!a.alive || !b.alive || a.road !== b.road || a.axis !== b.axis) continue;
    const v = a.axis === 'v', d = v ? b.y - a.y : b.x - a.x, s = Math.abs(v ? b.x - a.x : b.y - a.y), n = (a.length + b.length) / 2 + 6;
    if (d > 0 && d < n && s < 26) { const p = (n - d) / 2; a[v ? 'y' : 'x'] -= p; b[v ? 'y' : 'x'] += p; }
  }
}
const SKINS = ['#e8b98a', '#c98d5f', '#8a5a3b', '#f0c8a0'];
const SHIRTS = ['#e8e4d8', '#f2a65a', '#7fb5d5', '#c39bd3', '#82e0aa', '#f5b7b1', '#e74c3c', '#2ecc71'];
const PANTS = ['#2c3e50', '#5d4037', '#37474f', '#4a235a', '#1b4f72'];
const PI2 = Math.PI / 2;
const BODIES = [['sedan', 4], ['hatch', 2], ['hatchback', 2], ['sedanL', 2], ['pickup', 2], ['van', 1], ['taxi', 2], ['bus', 1], ['fire', 1], ['medic', 1]];
export function createPedestrians(city, rng) {
  const peds = [];
  for (let i = 0; i < 26; i += 1) {
    const vertical = rng.chance(0.5);
    let x;
    let y;
    let angle;
    const off = rng.chance(0.5) ? ROAD_W / 2 + 4 : -ROAD_W / 2 - 4;
    if (vertical) {
      const rx = rng.pick(city.roadsV);
      x = rx + off;
      y = rng.range(60, WORLD_H - 60);
      angle = rng.chance(0.5) ? PI2 : -PI2;
    } else {
      const ry = rng.pick(city.roadsH);
      x = rng.range(60, WATER_X - 60);
      y = ry + off;
      angle = rng.chance(0.5) ? 0 : Math.PI;
    }
    peds.push({
      x, y, angle,
      speed: rng.range(28, 52),
      color: rng.pick(SHIRTS),
      skin: rng.pick(SKINS),
      pants: rng.pick(PANTS),
      hat: rng.weighted([[0, 5], [1, 3], [2, 2]]),
      build: rng.weighted([['slim', 5], ['wide', 2]]),
      flee: 0,
      alive: true,
      walkPhase: rng.range(0, Math.PI * 2),
      photo: 0,
      flashTimer: 0,
    });
  }
  // R27c: hero peds stand on the SIDEWALK beside the spawn road, not on its
  // centreline. (Before: both stood on road y=480 — Jax 60u straight ahead of
  // the player spawn (480,480) — and were run over ~5s into every drive,
  // giving 1 wanted star; see VIDEO-REVIEW-FINDINGS.md item 3.)
  // NOTE: Jax goes on the NORTH sidewalk (y=440), not the south (y=520):
  // the player car departs in the south lane (y=504), only 16u from the
  // south sidewalk — inside the 26u run-over radius — while the north
  // sidewalk is 64u away, safe at any speed. (First attempt at y=520 left
  // Jax 19u from the car at spawn, still inside the kill radius.)
  peds.push({
    x: 540, y: 440, angle: 0, speed: 40,
    color: '#6b4423', skin: '#d8a077', pants: '#1c1f24', hat: 0, build: 'wide',
    flee: 0, alive: true, walkPhase: 0, photo: 0, flashTimer: 0, hero: 'jax',
  });
  peds.push({
    x: 420, y: 440, angle: Math.PI, speed: 38,
    color: '#8a1f28', skin: '#e8b98a', pants: '#2a1214', hat: 0, build: 'slim',
    flee: 0, alive: true, walkPhase: 1.6, photo: 0, flashTimer: 0, hero: 'mara',
  });
  // R27c: spawn-time guard — no pedestrian may ever spawn walking ALONG a
  // vehicle lane (it would stay in the lane), and the player's departure
  // corridor on the spawn road stays clear. Crossing a perpendicular road at
  // an intersection is transient and stays allowed.
  const SIDE = ROAD_W / 2 + 4; // 40 — sidewalk offset, same as random spawns
  const spawnRoad = city.roadsH.find((ry) => Math.abs(ry - city.playerStart.y) < 1)
    ?? city.playerStart.y;
  for (const ped of peds) {
    const ca = Math.abs(Math.cos(ped.angle));
    const sa = Math.abs(Math.sin(ped.angle));
    let moved = false;
    for (const ry of city.roadsH) {
      if (Math.abs(ped.y - ry) < ROAD_W / 2 && ca > 0.7) {
        ped.y = ry + (ped.y >= ry ? SIDE : -SIDE);
        moved = true;
        break;
      }
    }
    if (!moved) {
      for (const rx of city.roadsV) {
        if (Math.abs(ped.x - rx) < ROAD_W / 2 && sa > 0.7) {
          ped.x = rx + (ped.x >= rx ? SIDE : -SIDE);
          break;
        }
      }
    }
    // Departure corridor: the spawn road ahead of the car. The car leaves in
    // the south lane (y=504), so anything on the road or the south sidewalk
    // here is inside the 26u run-over radius while the car accelerates
    // through 80–250 (flee only starts above 250). Move it to the far
    // (north) sidewalk, 64u from the car's path — safe at any speed.
    if (Math.abs(ped.y - spawnRoad) <= SIDE
      && ped.x >= city.playerStart.x - 40 && ped.x <= city.playerStart.x + 420) {
      ped.y = spawnRoad - SIDE;
    }
  }
  return peds;
}
export function stepPedestrians(peds, dt, city, danger, chase) {
  const flashes = [];
  for (const ped of peds) {
    if (!ped.alive) continue;
    ped.walkPhase += dt * 8;
    if (chase && ped.flee <= 0) {
      const cdx = ped.x - chase.x;
      const cdy = ped.y - chase.y;
      const cd = Math.hypot(cdx, cdy);
      if (cd < 280) {
        if (ped.photo <= 0) {
          ped.photo = 2 + Math.random() * 2;
          ped.flashTimer = 0.2 + Math.random() * 0.6;
        }
        ped.angle = Math.atan2(-cdy, -cdx);
      }
    }
    if (ped.photo > 0) {
      ped.photo -= dt;
      ped.flashTimer -= dt;
      if (ped.flashTimer <= 0) {
        ped.flashTimer = 0.5 + Math.random() * 0.9;
        flashes.push({
          x: ped.x + Math.cos(ped.angle) * 16,
          y: ped.y + Math.sin(ped.angle) * 16,
        });
      }
      continue;
    }
    let fleeX = 0;
    let fleeY = 0;
    if (danger) {
      const dx = ped.x - danger.x;
      const dy = ped.y - danger.y;
      const d = Math.hypot(dx, dy);
      if (d < 260) {
        ped.flee = 2.5;
        fleeX = dx / (d || 1);
        fleeY = dy / (d || 1);
      }
    }
    if (ped.flee > 0) {
      ped.flee -= dt;
      ped.x += fleeX * 150 * dt;
      ped.y += fleeY * 150 * dt;
      ped.angle = Math.atan2(fleeY, fleeX);
    } else {
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (ped.x < 40 || ped.x > WATER_X - 40 || ped.y < 40 || ped.y > WORLD_H - 40 || !onRoad(city, ped.x, ped.y, 14)) {
        ped.angle += Math.PI;
        ped.x += Math.cos(ped.angle) * 4;
        ped.y += Math.sin(ped.angle) * 4;
      }
    }
    const pr = ped.build === 'wide' ? 11 : 9;
    const pb = buildingAt(city, ped.x, ped.y, pr);
    if (pb) {
      const l = ped.x - (pb.x - pr), r = pb.x + pb.w + pr - ped.x;
      const t = ped.y - (pb.y - pr), b = pb.y + pb.h + pr - ped.y;
      const m = Math.min(l, r, t, b);
      if (m === l) ped.x = pb.x - pr;
      else if (m === r) ped.x = pb.x + pb.w + pr;
      else if (m === t) ped.y = pb.y - pr;
      else ped.y = pb.y + pb.h + pr;
      ped.angle += Math.PI;
    }
    ped.x = Math.max(20, Math.min(WATER_X - 20, ped.x));
    ped.y = Math.max(20, Math.min(WORLD_H - 20, ped.y));
  }
  return flashes;
}

export function randomRoadPoint(city, rng) {
  if (rng.chance(0.5)) return { x: rng.pick(city.roadsV), y: rng.range(120, WORLD_H - 120) };
  return { x: rng.range(120, WATER_X - 120), y: rng.pick(city.roadsH) };
}
