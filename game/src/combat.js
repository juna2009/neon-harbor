import { WEAPONS } from './config.js';
import { buildingAt } from './city.js';
import { addWanted } from './police.js';
export function createBullets() {
  return [];
}
export function fireBullet(bullets, x, y, angle, hostile, weapon) {
  const def = weapon || WEAPONS.pistol;
  bullets.push({
    x, y,
    vx: Math.cos(angle) * def.bulletSpeed,
    vy: Math.sin(angle) * def.bulletSpeed,
    life: def.life || 1.1,
    damage: def.damage,
    hostile: !!hostile,
  });
}
export function fireWeapon(bullets, weaponKey, x, y, angle, hostile, rng) {
  const def = WEAPONS[weaponKey] || WEAPONS.pistol;
  for (let i = 0; i < def.pellets; i += 1) {
    const spread = (rng.next() - 0.5) * def.spread * 2;
    fireBullet(bullets, x, y, angle + spread, hostile, def);
  }
  return true;
}
function hitCircle(bx, by, x, y, r) {
  return Math.hypot(bx - x, by - y) < r;
}
export function stepBullets(world, dt) {
  const bullets = world.bullets;
  const city = world.city;
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && buildingAt(city, b.x, b.y, 2)) {
      dead = true;
      world.events.spark = { x: b.x, y: b.y };
    }
    if (!dead && !b.hostile) {
      for (const ped of world.peds) {
        if (ped.alive && hitCircle(b.x, b.y, ped.x, ped.y, 14)) {
          ped.alive = false;
          ped.flee = 0;
          dead = true;
          addWanted(world, 1);
          world.events.pedDown = true;
          break;
        }
      }
    }
    if (!dead && !b.hostile) {
      const allCars = world.traffic.cars.concat(world.traffic.parked);
      for (const car of allCars) {
        if (car.alive && car.kind !== 'player' && hitCircle(b.x, b.y, car.x, car.y, 26)) {
          dead = true;
          car.health -= b.damage;
          if (car.health <= 0) {
            car.alive = false;
            world.events.explosion = { x: car.x, y: car.y };
            addWanted(world, 1);
          }
          break;
        }
      }
    }
    if (!dead && !b.hostile) {
      for (const pump of world.gasStation.pumps) {
        if (pump.alive && hitCircle(b.x, b.y, pump.x, pump.y, 16)) {
          world.events.pumpHit = { x: pump.x, y: pump.y };
          dead = true;
          break;
        }
      }
    }
    if (!dead && !b.hostile) {
      for (let u = world.police.units.length - 1; u >= 0; u -= 1) {
        const unit = world.police.units[u];
        const ux = unit.kind === 'car' ? unit.car.x : unit.x;
        const uy = unit.kind === 'car' ? unit.car.y : unit.y;
        const r = unit.kind === 'car' ? 26 : 14;
        if (hitCircle(b.x, b.y, ux, uy, r)) {
          dead = true;
          unit.health -= b.damage;
          if (unit.health <= 0) {
            if (unit.kind === 'gunman') world.gunmen = Math.max(0, world.gunmen - 1);
            if (unit.kind === 'car') world.events.explosion = { x: unit.car.x, y: unit.car.y };
            world.police.units.splice(u, 1);
          }
          break;
        }
      }
    }
    if (!dead && b.hostile) {
      const p = world.player;
      const px = p.inCar ? p.car.x : p.x;
      const py = p.inCar ? p.car.y : p.y;
      if (hitCircle(b.x, b.y, px, py, p.inCar ? 24 : 14)) {
        dead = true;
        p.health -= 8;
        world.events.playerHit = true;
      }
    }
    if (dead) bullets.splice(i, 1);
  }
}
