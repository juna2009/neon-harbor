// Neon Harbor — traffic cars, parked cars and pedestrians. Traffic drives
// along road centre lines and wraps at the map edge; pedestrians stroll the
// sidewalks and run from gunfire, sirens and speeding cars.
import { BLOCK, ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { WATER_X, onRoad } from './city.js';

const TRAFFIC_COUNT = 16;
const PARKED_COUNT = 12;
const PED_COUNT = 26;

export function makeCar(x, y, angle, color, kind) {
  return { x, y, angle, speed: 0, color, kind: kind || 'traffic', length: 46, width: 22, alive: true };
}

export function createTraffic(city, rng) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i += 1) {
    const vertical = rng.chance(0.5);
    let car;
    if (vertical) {
      const rx = rng.pick(city.roadsV);
      car = makeCar(rx + (rng.chance(0.5) ? 18 : -18), rng.range(40, WORLD_H - 40), rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2, rng.pick(city.carColors));
      car.axis = 'v';
      car.road = rx;
    } else {
      const ry = rng.pick(city.roadsH);
      car = makeCar(rng.range(40, WATER_X - 40), ry + (rng.chance(0.5) ? 18 : -18), rng.chance(0.5) ? 0 : Math.PI, rng.pick(city.carColors));
      car.axis = 'h';
      car.road = ry;
    }
    car.speed = rng.range(90, 170);
    car.cruise = car.speed;
    cars.push(car);
  }
  const parked = [];
  for (let i = 0; i < PARKED_COUNT; i += 1) {
    const vertical = rng.chance(0.5);
    if (vertical) {
      const rx = rng.pick(city.roadsV);
      parked.push(makeCar(rx + 30, rng.range(200, WORLD_H - 200), Math.PI / 2, rng.pick(city.carColors), 'parked'));
    } else {
      const ry = rng.pick(city.roadsH);
      parked.push(makeCar(rng.range(200, WATER_X - 200), ry + 30, 0, rng.pick(city.carColors), 'parked'));
    }
  }
  return { cars, parked };
}

export function stepTraffic(traffic, dt) {
  for (const car of traffic.cars) {
    const step = car.speed * dt;
    car.x += Math.cos(car.angle) * step;
    car.y += Math.sin(car.angle) * step;
    if (car.x < -60) car.x = WORLD_W - 40;
    if (car.x > WORLD_W + 60) car.x = -40;
    if (car.y < -60) car.y = WORLD_H - 40;
    if (car.y > WORLD_H + 60) car.y = -40;
  }
}

export function createPedestrians(city, rng) {
  const peds = [];
  const palette = ['#e8e4d8', '#f2a65a', '#7fb5d5', '#c39bd3', '#82e0aa', '#f5b7b1'];
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
      color: rng.pick(palette),
      flee: 0,
      alive: true,
      walkPhase: rng.range(0, Math.PI * 2),
    });
  }
  return peds;
}

export function stepPedestrians(peds, dt, city, danger) {
  for (const ped of peds) {
    if (!ped.alive) continue;
    ped.walkPhase += dt * 8;
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
}

export function randomRoadPoint(city, rng) {
  if (rng.chance(0.5)) return { x: rng.pick(city.roadsV), y: rng.range(120, WORLD_H - 120) };
  return { x: rng.range(120, WATER_X - 120), y: rng.pick(city.roadsH) };
}

export { BLOCK };
