// Neon Harbor — the wanted system and the Harbor Police. Foot officers and
// patrol cars spawn in numbers that scale with the star level, chase the
// player, ram the player's car and try to arrest them on foot. At three
// stars and up the police also set roadblocks across the player's road.
// Wanted heat fades when the player stays clean for a while. Harbor Crew
// gunmen (mission 4) are a different faction: red jackets, bandanas, burst
// fire — never reskinned police.
import { WANTED, WORLD_H, WORLD_W } from './config.js';
import { WATER_X, collides, moveCircle, nearestIntersection, pathBlocked } from './city.js';
import { makeCar } from './traffic.js';

export function createPolice() {
  return { units: [], spawnTimer: 0, arrestTimer: 0, roadblockTimer: 8 };
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
  // Never spawn dead ahead of a fast-moving car: a patrol car appearing
  // stationary in the player's path is an unavoidable wall. Spawn
  // behind or beside a moving car, anywhere around a player on foot.
  let angle;
  if (player.inCar && player.car && Math.abs(player.car.speed) > 100) {
    angle = player.car.angle + Math.PI + rng.range(-0.9, 0.9);
  } else {
    angle = rng.range(0, Math.PI * 2);
  }
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
  } else if (kind === 'gunman') {
    // Harbor Crew gunman: a different faction, not a police officer.
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

/**
 * Where a patrol car should steer: straight at the player when the road
 * is clear, otherwise to the intersection that gets it around the block.
 * This is what stops police cars sticking on building corners.
 */
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

/**
 * Set a roadblock across the road the player is driving on, ahead of
 * them: two patrol cars parked nose-to-tail across both lanes, lights
 * flashing. Units flagged `roadblock` never move; they clear when the
 * heat drops below 2 stars.
 */
function spawnRoadblock(police, state) {
  const p = state.player;
  const px = p.inCar ? p.car.x : p.x;
  const py = p.inCar ? p.car.y : p.y;
  const heading = p.inCar ? p.car.angle : p.angle;
  const city = state.city;
  // Pick the road the player is on (or nearest to them) and the axis.
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
  // Far enough ahead that a speeding player sees the block and can
  // brake or swerve — 380 px was an unavoidable wall at 540 px/s.
  const ahead = 700;
  let bx;
  let by;
  let blockAngle;
  if (vertical) {
    // The block sits on the north-south road, ahead along the player's
    // direction of travel (or just ahead if they are crossing it).
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
      '#2f6fd0', 'police',
    );
    car.speed = 0;
    police.units.push({ kind: 'car', car, health: 3, ramTimer: 0, roadblock: true, static: true });
  }
  police.roadblockTimer = 22;
}

export function stepPolice(police, state, dt, rng, events) {
  const player = state.player;
  const wanted = Math.ceil(state.wanted);
  const want = wantedUnitCount(wanted) + state.gunmen;
  police.spawnTimer -= dt;
  if (police.roadblockTimer > 0) police.roadblockTimer -= dt;

  // Roadblocks at 3+ stars, cleared when the heat drops.
  const hasRoadblock = police.units.some((u) => u.roadblock);
  if (wanted >= 3 && !hasRoadblock && police.roadblockTimer <= 0) {
    spawnRoadblock(police, state);
  }
  if (wanted < 2 && hasRoadblock) {
    police.units = police.units.filter((u) => !u.roadblock);
  }

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
      if (unit.static) continue; // Roadblock cars hold their ground.
      const dx = px - car.x;
      const dy = py - car.y;
      const dist = Math.hypot(dx, dy) || 1;
      // Ram smart: aim at where the player will be, not where they are.
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
      // Gunmen hold a standoff range (~200 px) and shoot from there
      // instead of walking onto the player's exact spot.
      const holdGround = unit.kind === 'gunman' && dist < 200;
      if (!holdGround) {
        moveCircle(state.city, unit, Math.cos(unit.angle) * unit.speed * dt, Math.sin(unit.angle) * unit.speed * dt, 12);
      }
      if (unit.kind === 'gunman') {
        // Burst fire: three quick shots, then a pause to re-aim.
        if (unit.burstLeft > 0) {
          unit.burstTimer -= dt;
          if (unit.burstTimer <= 0) {
            unit.burstTimer = 0.12;
            unit.burstLeft -= 1;
            events.enemyShot = { x: unit.x, y: unit.y, angle: unit.angle + (Math.random() - 0.5) * 0.12 };
          }
        } else {
          unit.fireTimer -= dt;
          if (unit.fireTimer <= 0 && dist < 420) {
            unit.fireTimer = 1.5;
            unit.burstLeft = 3;
            unit.burstTimer = 0;
          }
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
  police.roadblockTimer = 0;
}
