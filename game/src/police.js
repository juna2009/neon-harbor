import { WANTED, WORLD_H, WORLD_W } from './config.js';
import { WATER_X, collides, districtAt, moveCircle, nearestIntersection, pathBlocked } from './city.js';
import { makeCar } from './traffic.js';
export function createPolice() {
  return {
    units: [], spawnTimer: 0, arrestTimer: 0, roadblockTimer: 8, barrierTimer: 8,
    heli: { active: false, x: 0, y: 0, orbit: 0, rotor: 0 },
    strips: [], stripTimer: 10,
  };
}
export function addWanted(state, stars) {
  state.wanted = Math.max(0, Math.min(WANTED.maxStars, state.wanted + stars));
  state.wantedTimer = 0;
}
export function decayWanted(state, dt) {
  if (state.wanted <= 0) return;
  state.wantedTimer += dt;
  if (state.wantedTimer >= WANTED.decayDelay) {
    const rate = WANTED.decayPerSecond * (state.upgrades && state.upgrades.ghost ? 2 : 1);
    state.wanted = Math.max(0, state.wanted - rate * dt);
    if (state.wanted < 0.001) state.wanted = 0;
  }
}
export function dropWanted(state, stars) {
  state.wanted = Math.max(0, state.wanted - stars);
  state.wantedTimer = 0;
}
function wantedUnitCount(wanted) {
  if (wanted <= 0) return 0;
  if (wanted < 2) return 2;
  if (wanted < 3) return 3;
  if (wanted < 4) return 5;
  if (wanted < 5) return 7;
  if (wanted < 6) return 9;
  return 11;
}
function spawnPointNear(player, rng, distance, city) {
  let angle;
  if (player.inCar && player.car && Math.abs(player.car.speed) > 100) {
    angle = player.car.angle + Math.PI + rng.range(-0.9, 0.9);
  } else {
    angle = rng.range(0, Math.PI * 2);
  }
  let x = Math.max(60, Math.min(WATER_X - 60, player.x + Math.cos(angle) * distance));
  let y = Math.max(60, Math.min(WORLD_H - 60, player.y + Math.sin(angle) * distance));
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
  if (Math.abs(bestV - x) < Math.abs(bestH - y)) x = bestV;
  else y = bestH;
  return { x, y };
}
export function spawnPoliceUnit(police, player, rng, kind, city) {
  if (kind === 'boat') {
    const d = rng.range(420, 560);
    const n = player.y - 60, s = WORLD_H - 60 - player.y;
    const dir = n >= d && s >= d ? (rng.chance(0.5) ? -1 : 1) : n >= s ? -1 : 1;
    const bx = Math.max(WATER_X + 30, Math.min(WORLD_W - 30, player.x));
    const by = player.y + dir * Math.min(d, Math.max(n, s));
    police.units.push({
      kind: 'boat', x: bx, y: by, angle: 0, speed: 0, health: 3, ramTimer: 0, wake: [],
    });
    return;
  }
  const at = spawnPointNear(player, rng, 520, city);
  if (kind === 'mtruck' || kind === 'apc' || kind === 'fire' || kind === 'medic') {
    const spec = { mtruck: ['#5a6b3a', 'van', 5], apc: ['#4a5a2a', 'apc', 6], fire: ['#c0392b', 'fire', 5], medic: ['#f5f5f5', 'medic', 5] }[kind];
    const truck = makeCar(at.x, at.y, 0, spec[0], 'police', spec[1]);
    truck.speed = 0;
    police.units.push({ kind: 'car', military: kind === 'mtruck' || kind === 'apc', car: truck, health: spec[2], ramTimer: 0, emergency: kind === 'fire' || kind === 'medic' });
  } else if (kind === 'car') {
    const car = makeCar(at.x, at.y, 0, '#2f6fd0', 'police');
    car.speed = 0;
    police.units.push({ kind: 'car', car, health: 3, ramTimer: 0 });
  } else if (kind === 'gunman') {
    police.units.push({
      kind: 'gunman',
      faction: 'harbor-crew',
      x: at.x, y: at.y, angle: 0,
      speed: 150,
      health: 2,
      fireTimer: rng.range(0.5, 1.5),
      burstLeft: 0,
      burstTimer: 0,
      ramTimer: 0,
    });
  } else if (kind === 'soldier') {
    police.units.push({
      kind: 'soldier',
      faction: 'military',
      x: at.x, y: at.y, angle: 0,
      speed: 230,
      health: 2,
      fireTimer: rng.range(0.5, 1.5),
      burstLeft: 0,
      burstTimer: 0,
      ramTimer: 0,
    });
  } else {
    police.units.push({
      kind: kind || 'foot',
      x: at.x, y: at.y, angle: 0,
      speed: 185,
      health: 3,
      fireTimer: rng.range(0.5, 1.5),
      ramTimer: 0,
    });
  }
}
function pursuitWaypoint(city, car, px, py) {
  if (!pathBlocked(city, car.x, car.y, px, py)) return { x: px, y: py };
  const near = nearestIntersection(city, car.x, car.y);
  let best = near;
  let bestScore = Infinity;
  for (const pt of city.intersections) {
    const dCar = Math.hypot(pt.x - car.x, pt.y - car.y);
    if (dCar > 520) continue;
    const dTarget = Math.hypot(pt.x - px, pt.y - py);
    const score = dCar + dTarget * 1.5;
    if (score < bestScore) { bestScore = score; best = pt; }
  }
  return best;
}
function spawnRoadblock(police, state, concrete) {
  const p = state.player;
  const px = p.inCar ? p.car.x : p.x;
  const py = p.inCar ? p.car.y : p.y;
  const heading = p.inCar ? p.car.angle : p.angle;
  const city = state.city;
  let bestV = city.roadsV[0];
  let bestD = Infinity;
  for (const rx of city.roadsV) {
    const d = Math.abs(rx - px);
    if (d < bestD) { bestD = d; bestV = rx; }
  }
  let bestH = city.roadsH[0];
  bestD = Infinity;
  for (const ry of city.roadsH) {
    const d = Math.abs(ry - py);
    if (d < bestD) { bestD = d; bestH = ry; }
  }
  const vertical = Math.abs(bestV - px) < Math.abs(bestH - py);
  const ahead = 700;
  let bx;
  let by;
  let blockAngle;
  if (vertical) {
    bx = bestV;
    by = py + (Math.abs(Math.sin(heading)) > 0.5 ? Math.sign(Math.sin(heading)) * ahead : ahead);
    blockAngle = Math.PI / 2;
    by = Math.max(120, Math.min(WORLD_H - 120, by));
  } else {
    by = bestH;
    bx = px + (Math.abs(Math.cos(heading)) > 0.5 ? Math.sign(Math.cos(heading)) * ahead : ahead);
    blockAngle = 0;
    bx = Math.max(120, Math.min(WATER_X - 120, bx));
  }
  for (let i = 0; i < 2; i += 1) {
    const car = makeCar(
      vertical ? bx + (i === 0 ? -20 : 20) : bx + (i === 0 ? -26 : 26),
      vertical ? by + (i === 0 ? -8 : 8) : by + (i === 0 ? -20 : 20),
      blockAngle + (i === 0 ? 0.5 : -0.5),
      concrete ? '#6b6f75' : '#2f6fd0', 'police', concrete ? 'van' : 'sedan',
    );
    car.speed = 0;
    car.roadblock = true;
    if (concrete) car.concrete = true;
    police.units.push({ kind: 'car', car, health: 3, ramTimer: 0, roadblock: true, static: true, concrete: !!concrete });
  }
  if (concrete) police.barrierTimer = 22;
  else police.roadblockTimer = 22;
}
export function stepPolice(police, state, dt, rng, events) {
  const player = state.player;
  const wanted = Math.ceil(state.wanted);
  const district = districtAt(state.city, player.x, player.y);
  const districtHeat = state.heat ? state.heat[state.city.districts.indexOf(district)] || 0 : 0;
  const hotExtra = wanted >= 1 && districtHeat >= 60 ? 2 : 0;
  const want = wantedUnitCount(wanted) + state.gunmen + hotExtra;
  if (!player.inBoat || wanted < 3) police.units = police.units.filter((u) => u.kind !== 'boat');
  if (!police.units.some((u) => u.kind === 'boat')) police.boatWarned = false;
  police.spawnTimer -= dt;
  if (police.roadblockTimer > 0) police.roadblockTimer -= dt;
  if (police.barrierTimer > 0) police.barrierTimer -= dt;
  if (wanted < 5) {
    police.units = police.units.filter((u) => !u.military && u.kind !== 'soldier' && !u.concrete && !u.emergency);
  }
  const heli = police.heli;
  if (wanted >= 4 && !heli.active) {
    heli.active = true;
    heli.orbit = 0;
    heli.x = player.x;
    heli.y = player.y - 190;
    events.heli = true;
  } else if (wanted < 3 && heli.active) {
    heli.active = false;
  }
  if (heli.active) {
    heli.orbit += dt * 0.55;
    const px = player.inCar ? player.car.x : player.x;
    const py = player.inCar ? player.car.y : player.y;
    heli.x = px + Math.cos(heli.orbit) * 190;
    heli.y = py + Math.sin(heli.orbit) * 190;
    heli.rotor += dt * 42;
  }
  if (police.stripTimer > 0) police.stripTimer -= dt;
  for (let i = police.strips.length - 1; i >= 0; i -= 1) {
    police.strips[i].life -= dt;
    if (police.strips[i].life <= 0) police.strips.splice(i, 1);
  }
  if (wanted >= 4 && police.stripTimer <= 0 && police.strips.length < 3 && player.inCar && player.car) {
    const car = player.car;
    const ahead = 260;
    const sx = car.x + Math.cos(car.angle) * ahead;
    const sy = car.y + Math.sin(car.angle) * ahead;
    if (sx > 60 && sx < WATER_X - 60 && sy > 60 && sy < WORLD_H - 60) {
      police.strips.push({ x: sx, y: sy, angle: car.angle + Math.PI / 2, life: 20 });
      police.stripTimer = 9;
      events.stripDeployed = true;
    } else {
      police.stripTimer = 4;
    }
  }
  const hasRoadblock = police.units.some((u) => u.roadblock);
  if (wanted >= 3 && !hasRoadblock && police.roadblockTimer <= 0) {
    spawnRoadblock(police, state);
  }
  if (wanted < 2 && hasRoadblock) {
    police.units = police.units.filter((u) => !u.roadblock);
  }
  const hasConcrete = police.units.some((u) => u.concrete);
  if (wanted >= 6 && !hasConcrete && police.barrierTimer <= 0) {
    spawnRoadblock(police, state, true);
  }
  if (police.units.length < want && police.spawnTimer <= 0) {
    police.spawnTimer = heli.active ? 0.8 : (districtHeat >= 60 ? 0.9 : 1.2);
    const boats = police.units.filter((u) => u.kind === 'boat').length;
    const kind = player.inBoat
      ? (wanted >= 3 && boats < 2 ? 'boat' : null)
      : (wanted >= 5 && !police.units.some((u) => u.emergency) && rng.chance(0.2) ? (rng.chance(0.5) ? 'fire' : 'medic')
      : (wanted >= 6 && rng.chance(0.45) ? (player.inCar ? (rng.chance(0.5) ? 'mtruck' : 'apc') : 'soldier')
        : (player.inCar && wanted >= 2 ? 'car' : 'foot')));
    if (kind) {
      spawnPoliceUnit(police, player, rng, kind, state.city);
      if (kind === 'boat' && !police.boatWarned) {
        police.boatWarned = true;
        state.mission.dialogue = ['POLICE BOATS INBOUND! Outrun them on the water!'];
        state.mission.dialogueTimer = 5;
      }
    }
  }
  let busted = false;
  for (let i = police.units.length - 1; i >= 0; i -= 1) {
    const unit = police.units[i];
    const px = player.inCar ? player.car.x : player.x;
    const py = player.inCar ? player.car.y : player.y;
    if (unit.kind === 'boat') {
      const dx = px - unit.x;
      const dy = py - unit.y;
      const dist = Math.hypot(dx, dy) || 1;
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - unit.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      unit.angle += Math.max(-3.4 * dt, Math.min(3.4 * dt, diff));
      unit.speed = Math.min(600, unit.speed + 480 * dt);
      unit.x += Math.cos(unit.angle) * unit.speed * dt;
      unit.y += Math.sin(unit.angle) * unit.speed * dt;
      unit.x = Math.max(WATER_X + 16, Math.min(WORLD_W - 16, unit.x));
      unit.y = Math.max(16, Math.min(WORLD_H - 16, unit.y));
      if (Math.abs(unit.speed) > 120) {
        unit.wake.push({
          x: unit.x - Math.cos(unit.angle) * 30,
          y: unit.y - Math.sin(unit.angle) * 30,
          life: 1.4, maxLife: 1.4,
        });
        if (unit.wake.length > 80) unit.wake.splice(0, unit.wake.length - 80);
      }
      for (let w = unit.wake.length - 1; w >= 0; w -= 1) {
        unit.wake[w].life -= dt;
        if (unit.wake[w].life <= 0) unit.wake.splice(w, 1);
      }
      if (unit.ramTimer > 0) unit.ramTimer -= dt;
      if (dist < 52 && unit.ramTimer <= 0) {
        unit.ramTimer = 0.8;
        events.crash = true;
        state.player.health = Math.max(0, state.player.health - 3);
        if (player.boat) {
          player.boat.speed *= 0.8;
          player.boat.hp -= 34;
          if (player.boat.hp <= 0) events.boatSunk = { x: player.boat.x, y: player.boat.y };
        }
        unit.speed *= 0.5;
      }
    } else if (unit.kind === 'car') {
      const car = unit.car;
      if (unit.static) continue;
      const dx = px - car.x;
      const dy = py - car.y;
      const dist = Math.hypot(dx, dy) || 1;
      const lead = Math.min(0.7, dist / 600);
      const pvx = player.inCar ? Math.cos(player.car.angle) * player.car.speed : 0;
      const pvy = player.inCar ? Math.sin(player.car.angle) * player.car.speed : 0;
      const tx = px + pvx * lead;
      const ty = py + pvy * lead;
      const wp = dist < 260 ? { x: tx, y: ty } : pursuitWaypoint(state.city, car, tx, ty);
      const targetAngle = Math.atan2(wp.y - car.y, wp.x - car.x);
      let diff = targetAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
      const topSpeed = unit.military ? 640 : (heli.active ? 620 : 560);
      car.speed = Math.min(topSpeed, car.speed + (unit.military ? 520 : (heli.active ? 460 : 380)) * dt);
      if (state.bridge.up && Math.abs(car.x - 2400) < 50 && Math.abs(car.y - 1680) < 260 && Math.sin(car.angle) * (1680 - car.y) > 0) car.speed = 0;
      if (unit.ramTimer > 0) unit.ramTimer -= dt;
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      if (!collides(state.city, nx, car.y, 22)) car.x = nx;
      else car.speed *= 0.7;
      if (!collides(state.city, car.x, ny, 22)) car.y = ny;
      else car.speed *= 0.7;
      if (dist < 46 && unit.ramTimer <= 0) {
        unit.ramTimer = 0.6;
        events.crash = true;
        if (player.inCar) {
          player.car.speed *= unit.military ? 0.7 : 0.85;
          if (!unit.emergency) state.player.health = Math.max(0, state.player.health - (unit.military ? 6 : 3));
        } else if (!unit.emergency) {
          state.player.health -= unit.military ? 10 : 6;
        }
        car.speed *= 0.5;
      }
      if (car.x < 20 || car.x > WORLD_W - 20 || car.y < 20 || car.y > WORLD_H - 20) {
        police.units.splice(i, 1);
      }
    } else {
      const dx = px - unit.x;
      const dy = py - unit.y;
      const dist = Math.hypot(dx, dy) || 1;
      unit.angle = Math.atan2(dy, dx);
      const holdGround = unit.kind === 'gunman' && dist < 200;
      if (!holdGround) {
        moveCircle(state.city, unit, Math.cos(unit.angle) * unit.speed * dt, Math.sin(unit.angle) * unit.speed * dt, 12);
      }
      if (unit.kind === 'gunman' || unit.kind === 'soldier') {
        if (unit.burstLeft > 0) {
          unit.burstTimer -= dt;
          if (unit.burstTimer <= 0) {
            unit.burstTimer = 0.12;
            unit.burstLeft -= 1;
            const spread = heli.active ? 0.06 : 0.12;
            events.enemyShot = { x: unit.x, y: unit.y, angle: unit.angle + (Math.random() - 0.5) * spread };
          }
        } else {
          unit.fireTimer -= dt;
          if (unit.fireTimer <= 0 && dist < 420) {
            unit.fireTimer = 1.5;
            unit.burstLeft = 3;
            unit.burstTimer = 0;
          }
        }
      } else if (unit.kind === 'foot' && dist < 26 && !player.inCar) {
        police.arrestTimer += dt;
        if (police.arrestTimer > 1.2) busted = true;
      } else if (unit.kind === 'foot' && dist < 60 && player.inCar) {
        if (Math.abs(player.car.speed) < 60) {
          police.arrestTimer += dt;
          if (police.arrestTimer > 1.0) busted = true;
        }
      } else {
        police.arrestTimer = Math.max(0, police.arrestTimer - dt);
      }
    }
  }
  if (busted) events.busted = true;
  return events;
}
export function clearPolice(police) {
  police.units.length = 0;
  police.arrestTimer = 0;
  police.roadblockTimer = 0;
  police.barrierTimer = 8;
  police.heli.active = false;
  police.strips.length = 0;
  police.stripTimer = 10;
}
