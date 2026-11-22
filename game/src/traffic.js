import { ROAD_W, WALK_PHASE_PER_PX, WORLD_H, WORLD_W } from './config.js';
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
      // R34: lane matches direction — else two cars spawn head-on.
      const dir = rng.chance(0.5) ? 1 : -1;
      car = makeCar(rx + (dir > 0 ? 14 : -14), rng.range(40, WORLD_H - 40), dir > 0 ? PI2 : -PI2, color, 'traffic', body);
      car.axis = 'v';
      car.road = rx;
      car.dir = dir;
    } else {
      const ry = rng.pick(city.roadsH);
      const dir = rng.chance(0.5) ? 1 : -1;
      car = makeCar(rng.range(40, WATER_X - 40), ry + (dir > 0 ? -14 : 14), dir > 0 ? 0 : Math.PI, color, 'traffic', body);
      car.axis = 'h';
      car.road = ry;
      car.dir = dir;
    }
    car.speed = rng.range(90, 170);
    car.cruise = car.speed;
    cars.push(car);
  }
  const cab = cars.find((c) => c.body === 'taxi') || cars[0];
  cab.body = 'taxi';
  cab.color = '#ff7fc0';
  cab.pink = true;
  // #17: no parked car in an intersection box (±60) — nudge +120 (320-apart grid: never lands in another box).
  const clearBox = (a, rs) => { for (const r of rs) if (Math.abs(a - r) < 60) return a + 120; return a; };
  const parked = [];
  for (let i = 0; i < 12; i += 1) {
    const vertical = rng.chance(0.5);
    const body = rng.weighted(BODIES.slice(0, 7));
    const color = body === 'taxi' ? '#f7c948' : rng.pick(city.carColors);
    if (vertical) {
      const rx = rng.pick(city.roadsV);
      parked.push(makeCar(rx + 16, clearBox(rng.range(200, WORLD_H - 200), city.roadsH), PI2, color, 'parked', body));
    } else {
      const ry = rng.pick(city.roadsH);
      parked.push(makeCar(clearBox(rng.range(200, WATER_X - 200), city.roadsV), ry + 16, 0, color, 'parked', body));
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
    if (!o || o === car || (o.alive === false && !o.wreck)) continue; // VEHICLE-DAMAGE-P1: bangkai menghalangi (traffic yield)
    const dx = o.x - car.x;
    const dy = o.y - car.y;
    const along = dx * fx + dy * fy;
    if (along < 0 || along > gap) continue;
    const side = Math.abs(dx * -fy + dy * fx);
    if (side < 26) return true;
  }
  return false;
}
// A-01: cross-axis block ahead; A-01b: also a stopped same-axis car parked in the next intersection (box-guard deadlock seed).
function xBlock(car, others, ix, iy, g) {
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  for (const o of others) {
    if (!o || o === car || (o.alive === false && !o.wreck) || o.kind !== 'traffic') continue; // VEHICLE-DAMAGE-P1: bangkai di persimpangan menghalangi
    if (o.axis === car.axis && !o.turning && (!g || Math.abs(o.speed) >= 5 || Math.abs(o.x - ix) >= 52 || Math.abs(o.y - iy) >= 52)) continue;
    const dx = o.x - car.x, dy = o.y - car.y, al = dx * fx + dy * fy;
    if (al >= 0 && al <= 98 && Math.abs(dx * -fy + dy * fx) < 26) return true;
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
    // R34: decide turns early (140u out) — the old <6u trigger sat inside nextX's 8u dead zone.
    if (!car.turnPlan && car.noTurnAt !== next && distToNext < 140) {
      const noTurn = bridge?.up && car.axis === 'h' && next === 2400 && car.road === 1760;
      if (!noTurn && Math.random() < 0.38) {
        // R34: lane matches the new direction — a random lane could deadlock both.
        const newDir = Math.random() < 0.5 ? 1 : -1;
        const newAxis = car.axis === 'v' ? 'h' : 'v';
        const lane = newAxis === 'h' ? (newDir > 0 ? -14 : 14) : (newDir > 0 ? 14 : -14);
        car.turnPlan = { at: next, lane, newDir, newAxis,
          target: car.axis === 'v' ? (newDir > 0 ? 0 : Math.PI) : (newDir > 0 ? PI2 : -PI2) };
      } else car.noTurnAt = next;
    }
    if (car.turnPlan) {
      const p = car.turnPlan;
      const along = car.axis === 'v' ? car.y : car.x;
      const distToPlan = Math.abs(p.at - along);
      const passed = car.dir > 0 ? along > p.at + 4 : along < p.at - 4;
      if (passed && !car.turning) { car.turnPlan = undefined; car.noTurnAt = p.at; }
      else if (car.turning || (car.speed > 10 && distToPlan < Math.max(24, car.speed * 0.46))) {
        // R34: yield — do not start the turn if another car is already in the intersection.
        if (!car.turning) {
          const ix = car.axis === 'v' ? car.road : p.at;
          const iy = car.axis === 'v' ? p.at : car.road;
          let clear = true;
          for (const o of traffic.cars) {
            if (o === car || (!o.alive && !o.wreck)) continue; // VEHICLE-DAMAGE-P1: bangkai di persimpangan = tidak clear
            if (Math.hypot(o.x - ix, o.y - iy) < 70) { clear = false; break; }
          }
          if (!clear) { car.turnPlan = undefined; car.noTurnAt = p.at; }
        }
        if (car.turnPlan) {
          // R34: once turning, keep rotating even if blocked to a stop.
          car.turning = true;
          let diff = p.target - car.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const rate = Math.max(0.8, Math.min(5, Math.abs(diff) * car.speed / Math.max(1, distToPlan)));
          const stepA = rate * dt;
          if (Math.abs(diff) <= stepA) {
            car.angle = p.target; car.axis = p.newAxis; car.road = p.at; car.dir = p.newDir;
            car.laneTarget = p.at + p.lane; car.turnPlan = undefined; car.turning = false;
          } else car.angle += Math.sign(diff) * stepA;
        }
      }
    }
    // A-01c: keep cars on their lane — an off-lane car blocks the oncoming lane (side 23 < 26). Not while turning.
    if (!car.turning && car.laneTarget === undefined) car.laneTarget = car.road + (car.axis === 'v' ? 14 : -14) * car.dir;
    if (car.laneTarget !== undefined) {
      const coord = car.axis === 'v' ? 'x' : 'y';
      const d = car.laneTarget - car[coord];
      const s = 140 * dt;
      if (Math.abs(d) <= s) { car[coord] = car.laneTarget; car.laneTarget = undefined; }
      else car[coord] += Math.sign(d) * s;
    }
    const ix = car.axis === 'v' ? car.road : next, iy = car.axis === 'v' ? next : car.road;
    const g = distToNext < 90 && distToNext >= 52;
    const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
    let desired = car.cruise;
    const d = car.road === 2400 && car.axis === 'v' ? (car.dir < 0 ? car.y - 1720 : 1640 - car.y) : -1;
    if (bridge?.up && d > 0 && d < 200) desired = 0;
    if (blocked(car, others, 98)) desired = 0;
    if (distToNext < 90 && blocked({ ...car, x: car.x + fx * 60, y: car.y + fy * 60 }, others, 60)) desired = 0;
    // A-01 box guard: don't ENTER an occupied box. Outside only, or both freeze.
    if (g) {
      for (const o of others) if (o && o !== car && (o.alive !== false || o.wreck) && Math.abs(o.x - ix) < 52 && Math.abs(o.y - iy) < 52) { desired = 0; break; } // VEHICLE-DAMAGE-P1: bangkai menempati box
    }
    if (car.back > 0) desired = 0;
    car.speed = desired === 0 ? Math.max(0, car.speed - 420 * dt) : Math.min(desired, car.speed + 240 * dt);
    const step = car.speed * dt;
    car.x += fx * step;
    car.y += fy * step;
    if (car.x < -60) car.x = WORLD_W - 40;
    if (car.x > WORLD_W + 60) car.x = -40;
    if (car.y < -60) car.y = WORLD_H - 40;
    if (car.y > WORLD_H + 60) car.y = -40;
    // A-01 unstick: only H yields (V never reverses); reverse runs along the AXIS, not the angle.
    if (car.back > 0) {
      car.back -= dt;
      car[car.axis === 'v' ? 'y' : 'x'] -= car.dir * 70 * dt;
    } else if (car.speed < 5 && xBlock(car, others, ix, iy, g)) { // xBlock implies blocked
      if (car.axis === 'h') {
        car.stuckT = (car.stuckT || 0) + dt;
        if (car.stuckT > 3.5) { car.back = 1; car.stuckT = 0; }
      }
    } else car.stuckT = 0;
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
    const off = rng.chance(0.5) ? ROAD_W / 2 + 20 : -ROAD_W / 2 - 20;
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
  // R27c: hero peds on the NORTH sidewalk (y=431), not the road (before: both
  peds.push({
    x: 540, y: 431, angle: 0, speed: 40,
    color: '#6b4423', skin: '#d8a077', pants: '#1c1f24', hat: 0, build: 'wide',
    flee: 0, alive: true, walkPhase: 0, photo: 0, flashTimer: 0, hero: 'jax',
  });
  peds.push({
    x: 420, y: 431, angle: Math.PI, speed: 38,
    color: '#8a1f28', skin: '#e8b98a', pants: '#2a1214', hat: 0, build: 'slim',
    flee: 0, alive: true, walkPhase: 1.6, photo: 0, flashTimer: 0, hero: 'mara',
  });
  // R27c: no ped spawns walking ALONG a vehicle lane; departure corridor stays clear.
  const SIDE = ROAD_W / 2 + 20; // 60 — sidewalk offset, same as random spawns
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
    // Departure corridor: the car leaves in the south lane (y=504) — move anything here to the far (north) sidewalk.
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
    // R41: walk phase advances by DISTANCE travelled (not dt) — standing peds' feet freeze.
    const ox = ped.x, oy = ped.y;
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
    const moved = Math.hypot(ped.x - ox, ped.y - oy);
    if (moved > 0) ped.walkPhase = (ped.walkPhase || 0) + moved * WALK_PHASE_PER_PX;
  }
  return flashes;
}

