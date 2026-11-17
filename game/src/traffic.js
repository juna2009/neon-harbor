import { BLOCK, ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { WATER_X, onRoad } from './city.js';
const TRAFFIC_COUNT = 16;
const PARKED_COUNT = 12;
const PED_COUNT = 26;
export const CAR_BODIES = {
  sedan: { length: 46, width: 22 },
  hatch: { length: 40, width: 22 },
  van: { length: 54, width: 24 },
  taxi: { length: 46, width: 22 },
};
export function makeCar(x, y, angle, color, kind, body) {
  const shape = CAR_BODIES[body || 'sedan'];
  return {
    x, y, angle, speed: 0, color, kind: kind || 'traffic',
    body: body || 'sedan', length: shape.length, width: shape.width,
    alive: true, health: 2,
  };
}
export function createTraffic(city, rng) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const vertical = rng.chance(0.5);
    const body = rng.weighted([['sedan', 5], ['hatch', 3], ['van', 1], ['taxi', 2]]);
    const color = body === 'taxi' ? '#f7c948' : rng.pick(city.carColors);
    let car;
    if (vertical) {
      const rx = rng.pick(city.roadsV);
      car = makeCar(rx + (rng.chance(0.5) ? 18 : -18), rng.range(40, WORLD_H - 40), rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2, color, 'traffic', body);
      car.axis = 'v';
      car.road = rx;
      car.dir = car.angle > 0 ? 1 : -1;
    } else {
      const ry = rng.pick(city.roadsH);
      car = makeCar(rng.range(40, WATER_X - 40), ry + (rng.chance(0.5) ? 18 : -18), rng.chance(0.5) ? 0 : Math.PI, color, 'traffic', body);
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
  for (let i = 0; i < PARKED_COUNT; i += 1) {
    const vertical = rng.chance(0.5);
    const body = rng.weighted([['sedan', 5], ['hatch', 3], ['van', 1], ['taxi', 1]]);
    const color = body === 'taxi' ? '#f7c948' : rng.pick(city.carColors);
    if (vertical) {
      const rx = rng.pick(city.roadsV);
      parked.push(makeCar(rx + 24, rng.range(200, WORLD_H - 200), Math.PI / 2, color, 'parked', body));
    } else {
      const ry = rng.pick(city.roadsH);
      parked.push(makeCar(rng.range(200, WATER_X - 200), ry + 24, 0, color, 'parked', body));
    }
  }
  return { cars, parked };
}
function nextIntersectionCoord(car, city) {
  const line = car.axis === 'v' ? city.roadsH : city.roadsV;
  const at = car.axis === 'v' ? car.y : car.x;
  let best = null;
  for (const c of line) {
    if (car.dir > 0 && c > at + 8) { best = c; break; }
    if (car.dir < 0 && c < at - 8) best = c;
  }
  return best;
}
function blockedAhead(car, others, gap) {
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
  const slowObstacles = (obstacles || []).filter((o) => Math.abs(o.speed || 0) < 150);
  const others = traffic.cars.concat(slowObstacles);
  for (const car of traffic.cars) {
    if (!car.alive || car.kind === 'player') continue;
    const next = nextIntersectionCoord(car, city);
    const at = car.axis === 'v' ? car.y : car.x;
    const distToNext = next === null ? Infinity : Math.abs(next - at);
    if (distToNext < Math.max(6, car.speed * dt + 2)) {
      if (Math.random() < 0.38) {
        const lane = Math.random() < 0.5 ? 18 : -18;
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
          car.angle = newDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          car.x = next + lane;
        }
      }
    }
    let desired = car.cruise;
    const d = car.road === 2400 && car.axis === 'v' ? (car.dir < 0 ? car.y - 1840 : 1520 - car.y) : -1;
    if (bridge?.up && d > 0 && d < 80) desired = 0;
    if (blockedAhead(car, others, 78)) desired = 0;
    if (distToNext < 90 && blockedAhead({ ...car, x: car.x + Math.cos(car.angle) * 60, y: car.y + Math.sin(car.angle) * 60, angle: car.angle }, others, 60)) desired = 0;
    if (desired === 0) car.speed = Math.max(0, car.speed - 420 * dt);
    else car.speed = Math.min(desired, car.speed + 240 * dt);
    const step = car.speed * dt;
    car.x += Math.cos(car.angle) * step;
    car.y += Math.sin(car.angle) * step;
    if (car.x < -60) car.x = WORLD_W - 40;
    if (car.x > WORLD_W + 60) car.x = -40;
    if (car.y < -60) car.y = WORLD_H - 40;
    if (car.y > WORLD_H + 60) car.y = -40;
  }
}
const PED_SKINS = ['#e8b98a', '#c98d5f', '#8a5a3b', '#f0c8a0'];
const PED_SHIRTS = ['#e8e4d8', '#f2a65a', '#7fb5d5', '#c39bd3', '#82e0aa', '#f5b7b1', '#e74c3c', '#2ecc71'];
const PED_PANTS = ['#2c3e50', '#5d4037', '#37474f', '#4a235a', '#1b4f72'];
export function createPedestrians(city, rng) {
  const peds = [];
  for (let i = 0; i < PED_COUNT; i += 1) {
    const vertical = rng.chance(0.5);
    let x;
    let y;
    let angle;
    if (vertical) {
      const rx = rng.pick(city.roadsV);
      x = rx + (rng.chance(0.5) ? ROAD_W / 2 + 12 : -ROAD_W / 2 - 12);
      y = rng.range(60, WORLD_H - 60);
      angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const ry = rng.pick(city.roadsH);
      x = rng.range(60, WATER_X - 60);
      y = ry + (rng.chance(0.5) ? ROAD_W / 2 + 12 : -ROAD_W / 2 - 12);
      angle = rng.chance(0.5) ? 0 : Math.PI;
    }
    peds.push({
      x, y, angle,
      speed: rng.range(28, 52),
      color: rng.pick(PED_SHIRTS),
      skin: rng.pick(PED_SKINS),
      pants: rng.pick(PED_PANTS),
      hat: rng.weighted([[0, 5], [1, 3], [2, 2]]),
      build: rng.weighted([['slim', 5], ['wide', 2]]),
      flee: 0,
      alive: true,
      walkPhase: rng.range(0, Math.PI * 2),
      photo: 0,
      flashTimer: 0,
    });
  }
  peds.push({
    x: 540, y: 480, angle: 0, speed: 40,
    color: '#6b4423', skin: '#d8a077', pants: '#1c1f24', hat: 0, build: 'wide',
    flee: 0, alive: true, walkPhase: 0, photo: 0, flashTimer: 0, hero: 'jax',
  });
  peds.push({
    x: 420, y: 480, angle: Math.PI, speed: 38,
    color: '#8a1f28', skin: '#e8b98a', pants: '#2a1214', hat: 0, build: 'slim',
    flee: 0, alive: true, walkPhase: 1.6, photo: 0, flashTimer: 0, hero: 'mara',
  });
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
      const speed = 150;
      ped.x += fleeX * speed * dt;
      ped.y += fleeY * speed * dt;
      ped.angle = Math.atan2(fleeY, fleeX);
    } else {
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      if (ped.x < 40 || ped.x > WATER_X - 40 || ped.y < 40 || ped.y > WORLD_H - 40 || !onRoad(city, ped.x, ped.y)) {
        ped.angle += Math.PI;
        ped.x += Math.cos(ped.angle) * 4;
        ped.y += Math.sin(ped.angle) * 4;
      }
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
export { BLOCK };
