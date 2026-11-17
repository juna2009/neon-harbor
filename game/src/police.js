// Neon Harbor — the wanted system and the Harbor Police. Foot officers and
// patrol cars spawn in numbers that scale with the star level, chase the
// player, ram the player's car and try to arrest them on foot. Wanted heat
// fades when the player stays clean for a while.
import { WANTED, WORLD_H, WORLD_W } from './config.js';
import { WATER_X, collides, moveCircle } from './city.js';
import { makeCar } from './traffic.js';

export function createPolice() {
  return { units: [], spawnTimer: 0, arrestTimer: 0 };
}

export function addWanted(state, stars) {
  state.wanted = Math.max(0, Math.min(WANTED.maxStars, state.wanted + stars));
  state.wantedTimer = 0;
}

export function decayWanted(state, dt) {
  if (state.wanted <= 0) return;
  state.wantedTimer += dt;
  if (state.wantedTimer >= WANTED.decayDelay) {
    state.wanted = Math.max(0, state.wanted - WANTED.decayPerSecond * dt);
    if (state.wanted < 0.001) state.wanted = 0;
  }
}

function wantedUnitCount(wanted) {
  if (wanted <= 0) return 0;
  if (wanted < 2) return 2;
  if (wanted < 3) return 3;
  if (wanted < 4) return 5;
  if (wanted < 5) return 7;
  return 9;
}

function spawnPointNear(player, rng, distance, city) {
  const angle = rng.range(0, Math.PI * 2);
  let x = Math.max(60, Math.min(WATER_X - 60, player.x + Math.cos(angle) * distance));
  let y = Math.max(60, Math.min(WORLD_H - 60, player.y + Math.sin(angle) * distance));
  // Snap onto the nearest road so a unit never starts inside a building.
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
  const at = spawnPointNear(player, rng, 520, city);
  if (kind === 'car') {
    const car = makeCar(at.x, at.y, 0, '#2f6fd0', 'police');
    car.speed = 0;
    police.units.push({ kind: 'car', car, health: 3, ramTimer: 0 });
  } else {
    police.units.push({
      kind: kind || 'foot',
      x: at.x, y: at.y, angle: 0,
      speed: kind === 'gunman' ? 150 : 185,
      health: kind === 'gunman' ? 2 : 3,
      fireTimer: rng.range(0.5, 1.5),
      ramTimer: 0,
    });
  }
}

export function stepPolice(police, state, dt, rng, events) {
  const player = state.player;
  const wanted = Math.ceil(state.wanted);
  const want = wantedUnitCount(wanted) + state.gunmen;
  police.spawnTimer -= dt;
  if (police.units.length < want && police.spawnTimer <= 0) {
    police.spawnTimer = 1.2;
    const inCar = player.inCar;
    spawnPoliceUnit(police, player, rng, inCar && wanted >= 2 ? 'car' : 'foot', state.city);
  }
  // Gunmen (harbor crew) are spawned by the mission, not by wanted level.
  let busted = false;
  for (let i = police.units.length - 1; i >= 0; i -= 1) {
    const unit = police.units[i];
    const px = player.inCar ? player.car.x : player.x;
    const py = player.inCar ? player.car.y : player.y;
    if (unit.kind === 'car') {
      const car = unit.car;
      const dx = px - car.x;
      const dy = py - car.y;
      const dist = Math.hypot(dx, dy) || 1;
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      car.speed = Math.min(560, car.speed + 380 * dt);
      if (unit.ramTimer > 0) unit.ramTimer -= dt;
      // Slide around buildings instead of driving through them.
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
          player.car.speed *= 0.85;
          state.player.health = Math.max(0, state.player.health - 3);
        } else {
          state.player.health -= 6;
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
      // Officers and gunmen run around buildings, never through them.
      moveCircle(state.city, unit, Math.cos(unit.angle) * unit.speed * dt, Math.sin(unit.angle) * unit.speed * dt, 12);
      if (unit.kind === 'gunman') {
        unit.fireTimer -= dt;
        if (unit.fireTimer <= 0 && dist < 420) {
          unit.fireTimer = 1.4;
          events.enemyShot = { x: unit.x, y: unit.y, angle: unit.angle };
        }
      } else if (dist < 26 && !player.inCar) {
        police.arrestTimer += dt;
        if (police.arrestTimer > 1.2) busted = true;
      } else if (dist < 60 && player.inCar) {
        // Officer pulls the player out of a slow car.
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
}
