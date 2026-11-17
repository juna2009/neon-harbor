// Neon Harbor — pistol combat. Bullets fly from the player's aim or from
// hostile gunmen, hit buildings, pedestrians and police, and raise the
// wanted level when the player hurts a bystander in public.
import { PLAYER } from './config.js';
import { buildingAt } from './city.js';
import { addWanted } from './police.js';

export function createBullets() {
  return [];
}

export function fireBullet(bullets, x, y, angle, hostile) {
  bullets.push({
    x, y,
    vx: Math.cos(angle) * PLAYER.bulletSpeed,
    vy: Math.sin(angle) * PLAYER.bulletSpeed,
    life: 1.1,
    hostile: !!hostile,
  });
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
      for (let u = world.police.units.length - 1; u >= 0; u -= 1) {
        const unit = world.police.units[u];
        const ux = unit.kind === 'car' ? unit.car.x : unit.x;
        const uy = unit.kind === 'car' ? unit.car.y : unit.y;
        const r = unit.kind === 'car' ? 26 : 14;
        if (hitCircle(b.x, b.y, ux, uy, r)) {
          dead = true;
          unit.health -= 1;
          if (unit.health <= 0) {
            if (unit.kind === 'gunman') world.gunmen = Math.max(0, world.gunmen - 1);
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
