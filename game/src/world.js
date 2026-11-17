// Neon Harbor — the world: one state object, one fixed step. Movement on
// foot and in a car, entering and stealing cars, collisions, shooting,
// reloading, the wanted clock, mission updates, particles, skid marks,
// explosions, the day/night cycle and the speed-based camera zoom all
// meet here.
import { CAR, PLAYER, STEP, WANTED, WEAPONS, WORLD_H, WORLD_W } from './config.js';
import { buildCity, collides, moveCircle } from './city.js';
import { createBullets, fireWeapon, stepBullets } from './combat.js';
import { createCollectibles, createMissionState, createRace, createWeaponPickups, loadCheckpoint, saveCheckpoint, updateMission, updatePickups, updateRace } from './missions.js';
import { addWanted, clearPolice, createPolice, decayWanted, spawnPoliceUnit, stepPolice } from './police.js';
import { createPedestrians, createTraffic, stepPedestrians, stepTraffic } from './traffic.js';

export const EVENT_OVER = 1;
export const EVENT_BUSTED = 2;

export function createWorld(rng, savedMission) {
  const city = buildCity(rng);
  const traffic = createTraffic(city, rng);
  const peds = createPedestrians(city, rng);
  const state = {
    rng,
    city,
    traffic,
    peds,
    police: createPolice(),
    bullets: createBullets(),
    mission: createMissionState(savedMission || 0),
    collectibles: createCollectibles(city, rng),
    pickups: createWeaponPickups(city),
    race: createRace(city),
    particles: [],
    skids: [],
    floaters: [],
    player: {
      x: city.playerStart.x,
      y: city.playerStart.y,
      angle: 0,
      health: PLAYER.health,
      ammo: PLAYER.pistolAmmo,
      reserve: PLAYER.pistolReserve,
      weapon: 'pistol',
      weapons: {
        pistol: { ammo: PLAYER.pistolAmmo, reserve: PLAYER.pistolReserve },
        smg: { ammo: 0, reserve: 0 },
        shotgun: { ammo: 0, reserve: 0 },
      },
      fireTimer: 0,
      inCar: false,
      car: null,
      runPhase: 0,
    },
    cash: 0,
    wanted: 0,
    wantedTimer: 0,
    gunmen: 0,
    elapsed: 0,
    daylight: 0.85,
    daylightManual: false,
    zoom: 1.1,
    zoomLock: false,
    shake: 0,
    events: {},
    camera: { x: city.playerStart.x, y: city.playerStart.y },
    over: false,
    overKind: '',
  };

  function reset() {
    state.player.x = city.playerStart.x;
    state.player.y = city.playerStart.y;
    state.player.angle = 0;
    state.player.health = PLAYER.health;
    state.player.ammo = PLAYER.pistolAmmo;
    state.player.reserve = PLAYER.pistolReserve;
    state.player.weapon = 'pistol';
    state.player.weapons = {
      pistol: { ammo: PLAYER.pistolAmmo, reserve: PLAYER.pistolReserve },
      smg: { ammo: 0, reserve: 0 },
      shotgun: { ammo: 0, reserve: 0 },
    };
    state.player.fireTimer = 0;
    state.player.inCar = false;
    state.player.car = null;
    state.cash = 0;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.gunmen = 0;
    state.elapsed = 0;
    state.over = false;
    state.overKind = '';
    state.bullets.length = 0;
    state.particles.length = 0;
    state.skids.length = 0;
    state.floaters.length = 0;
    state.police.units.length = 0;
    state.police.arrestTimer = 0;
    state.police.roadblockTimer = 0;
    state.mission = createMissionState(0);
    state.race = createRace(city);
    for (const c of state.collectibles) c.taken = false;
    for (const pk of state.pickups) pk.taken = false;
    for (const ped of peds) ped.alive = true;
    for (const car of traffic.cars) { car.alive = true; car.health = 2; }
    for (const car of traffic.parked) { car.alive = true; car.health = 2; }
  }

  /** Resume a mission from its saved checkpoint after Busted/Wasted. */
  function restoreCheckpoint() {
    const cp = loadCheckpoint();
    if (!cp) return false;
    reset();
    state.mission = createMissionState(cp.mission);
    state.mission.stage = cp.stage;
    state.mission.started = true;
    state.mission.dialogue = [`Checkpoint — ${cp.label}. Pick up where you left off.`];
    state.mission.dialogueTimer = 5;
    state.player.x = cp.x;
    state.player.y = cp.y;
    state.camera.x = cp.x;
    state.camera.y = cp.y;
    state.cash = cp.cash;
    state.wanted = 0;
    // Mission 4's ambush re-spawns at the checkpoint stage.
    if (cp.mission === 3 && cp.stage === 0) {
      state.gunmen = 4;
      for (let i = 0; i < 4; i += 1) spawnPoliceUnit(state.police, state.player, rng, 'gunman', city);
    }
    return true;
  }

  function nearestCar(maxDist) {
    const p = state.player;
    let best = null;
    let bestDist = maxDist;
    const all = state.traffic.cars.concat(state.traffic.parked);
    for (const car of all) {
      if (!car.alive) continue;
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d < bestDist) {
        bestDist = d;
        best = car;
      }
    }
    return best;
  }

  function enterCar(car) {
    const p = state.player;
    p.inCar = true;
    p.car = car;
    car.kind = 'player';
    if (car.hp === undefined) car.hp = CAR.health;
    if (car.stolen === undefined) {
      car.stolen = true;
      if (state.wanted > 0 || nearPolice(p.x, p.y, 300)) addWanted(state, 1);
    }
  }

  function nearPolice(x, y, radius) {
    for (const unit of state.police.units) {
      if (unit.kind === 'gunman') continue; // Harbor Crew are not police.
      const ux = unit.kind === 'car' ? unit.car.x : unit.x;
      const uy = unit.kind === 'car' ? unit.car.y : unit.y;
      if (Math.hypot(ux - x, uy - y) < radius) return true;
    }
    return false;
  }

  function exitCar() {
    const p = state.player;
    if (!p.car) return;
    p.inCar = false;
    const angle = p.car.angle + Math.PI / 2;
    p.x = p.car.x + Math.cos(angle) * 36;
    p.y = p.car.y + Math.sin(angle) * 36;
    if (collides(city, p.x, p.y, PLAYER.radius)) {
      p.x = p.car.x - Math.cos(angle) * 36;
      p.y = p.car.y - Math.sin(angle) * 36;
    }
    p.car.speed = 0;
    p.car = null;
  }

  /** A burst of sparks, flame and smoke at (x, y); also shakes the camera. */
  function spawnExplosion(x, y) {
    for (let i = 0; i < 26; i += 1) {
      const a = state.rng.range(0, Math.PI * 2);
      const speed = state.rng.range(40, 260);
      state.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: state.rng.range(0.4, 1.1),
        maxLife: 1.1,
        size: state.rng.range(3, 9),
        color: state.rng.pick(['#ff9d4d', '#ffd23e', '#ff5a3c', '#8a8a8a']),
        kind: i % 3 === 0 ? 'smoke' : 'spark',
      });
    }
    state.shake = Math.max(state.shake, 9);
    state.events.crash = true;
  }

  function addSkid(x, y, angle) {
    state.skids.push({ x, y, angle, life: 5 });
    if (state.skids.length > 220) state.skids.splice(0, state.skids.length - 220);
  }

  function addFloater(x, y, value, color) {
    state.floaters.push({ x, y, value, color: color || '#7be382', life: 1.4 });
  }

  /** Car-vs-car collision: bounce, damage, sparks and skid marks. */
  function collideCars(car, dt) {
    const others = state.traffic.cars.concat(state.traffic.parked)
      .concat(state.police.units.filter((u) => u.kind === 'car').map((u) => u.car));
    for (const other of others) {
      if (other === car || !other.alive) continue;
      const dx = car.x - other.x;
      const dy = car.y - other.y;
      const d = Math.hypot(dx, dy);
      const minD = 40;
      if (d >= minD || d === 0) continue;
      const impact = Math.abs(car.speed);
      const push = (minD - d) / 2;
      const nx = dx / d;
      const ny = dy / d;
      car.x += nx * push;
      car.y += ny * push;
      if (other.kind !== 'parked' && !other.roadblock) {
        // Shove the other car forward out of the way instead of making
        // it a wall: it keeps its own heading, just faster.
        other.x -= nx * push * 1.5;
        other.y -= ny * push * 1.5;
        if (other.kind === 'traffic') other.speed = Math.max(other.speed, impact * 0.6);
        else other.speed *= 0.4;
      }
      if (impact > 60) {
        // A shunt, not a brick wall: the car loses some speed and takes
        // a dent only on a really hard hit, never a full stop.
        car.speed *= 0.85;
        state.events.crash = true;
        state.shake = Math.max(state.shake, 4);
        addSkid(car.x, car.y, car.angle);
        if (car.hp !== undefined && impact > 350) {
          car.hp -= impact * 0.03;
          if (car.hp <= 0) {
            spawnExplosion(car.x, car.y);
            car.alive = false;
            if (state.player.car === car) {
              state.player.inCar = false;
              state.player.car = null;
              state.player.x = car.x + 40;
              state.player.y = car.y;
              state.player.health = Math.max(10, state.player.health - 25);
            }
          }
        }
      } else {
        car.speed *= 0.6;
      }
    }
  }

  function driveCar(car, input, dt) {
    const throttle = input.moveY();
    const steer = input.moveX();
    const speedAlong = car.speed;
    if (throttle > 0) car.speed += CAR.accel * dt;
    else if (throttle < 0) {
      car.speed -= (speedAlong > 10 ? CAR.brake : CAR.accel * 0.6) * dt;
    } else {
      car.speed -= car.speed * 1.4 * dt;
    }
    car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
    if (Math.abs(car.speed) > 5) {
      car.angle += steer * CAR.turnRate * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (collides(city, nx, car.y, 22)) {
      car.speed *= -0.25;
      state.events.crash = true;
    } else {
      car.x = nx;
    }
    if (collides(city, car.x, ny, 22)) {
      car.speed *= -0.25;
      state.events.crash = true;
    } else {
      car.y = ny;
    }
    car.x = Math.max(24, Math.min(WORLD_W - 24, car.x));
    car.y = Math.max(24, Math.min(WORLD_H - 24, car.y));
    // Traffic no longer passes through the player car.
    collideCars(car, dt);
    // Hard cornering and braking leave skid marks and tire smoke.
    if (Math.abs(car.speed) > 200 && Math.abs(steer) > 0.6) {
      addSkid(car.x - Math.cos(car.angle) * 18, car.y - Math.sin(car.angle) * 18, car.angle);
      if (state.rng.chance(0.3)) {
        state.particles.push({
          x: car.x - Math.cos(car.angle) * 20, y: car.y - Math.sin(car.angle) * 20,
          vx: state.rng.range(-20, 20), vy: state.rng.range(-20, 20),
          life: 0.7, maxLife: 0.7, size: 5, color: '#9aa0a8', kind: 'smoke',
        });
      }
    }
    // Running over pedestrians is a crime.
    for (const ped of peds) {
      if (!ped.alive) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26 && Math.abs(car.speed) > 80) {
        ped.alive = false;
        addWanted(state, 1);
        state.events.pedDown = true;
      }
    }
  }

  function walkPlayer(input, dt, aimAngle) {
    const p = state.player;
    const mx = input.moveX();
    const my = input.moveY();
    const len = Math.hypot(mx, my) || 1;
    const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
    p.runPhase += dt * speed * 0.06;
    if (mx !== 0 || my !== 0) {
      moveCircle(city, p, (mx / len) * speed * dt, (my / len) * speed * dt, PLAYER.radius);
    }
    p.angle = aimAngle;
  }

  function aimAngle(input, camera, viewW, viewH) {
    const p = state.player;
    const sx = (p.x - camera.x) * state.zoom + viewW / 2;
    const sy = (p.y - camera.y) * state.zoom + viewH / 2;
    return Math.atan2(input.mouse.y - sy, input.mouse.x - sx);
  }

  function stepParticles(dt) {
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const pt = state.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.skids.length - 1; i >= 0; i -= 1) {
      state.skids[i].life -= dt;
      if (state.skids[i].life <= 0) state.skids.splice(i, 1);
    }
    for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
      const f = state.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) state.floaters.splice(i, 1);
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
  }

  function syncAmmo() {
    const p = state.player;
    const w = p.weapons[p.weapon];
    p.ammo = w.ammo;
    p.reserve = w.reserve;
  }

  /**
   * One fixed step. `input` is the live input object (or a scripted stand-in
   * for screenshots); `view` is {w, h} of the canvas for mouse aiming.
   * Returns EVENT_* flags for game over.
   */
  function step(dt, input, view) {
    if (state.over) return EVENT_OVER;
    state.elapsed += dt;
    state.events = {};
    const p = state.player;
    const events = state.events;

    // Day/night cycle: a slow drift across ~8 minutes of play, unless a
    // screenshot scene pinned the light by hand.
    if (!state.daylightManual) {
      state.daylight = 0.55 + 0.45 * Math.sin(state.elapsed * 0.013);
    }

    if (input.wasPressed && input.wasPressed('interact')) {
      if (p.inCar) exitCar();
      else {
        const car = nearestCar(70);
        if (car) enterCar(car);
      }
    }
    if (input.wasPressed && input.wasPressed('reload')) {
      const w = p.weapons[p.weapon];
      const def = WEAPONS[p.weapon];
      const need = def.mag - w.ammo;
      const take = Math.min(need, w.reserve);
      w.ammo += take;
      w.reserve -= take;
      syncAmmo();
    }
    if (input.wasPressed && input.wasPressed('weapon')) {
      const order = ['pistol', 'smg', 'shotgun'];
      const owned = order.filter((k) => p.weapons[k].ammo + p.weapons[k].reserve > 0);
      const idx = owned.indexOf(p.weapon);
      p.weapon = owned[(idx + 1) % owned.length] || 'pistol';
      syncAmmo();
      events.weaponSwitch = p.weapon;
    }

    if (p.inCar && p.car) {
      driveCar(p.car, input, dt);
      p.x = p.car.x;
      p.y = p.car.y;
      p.angle = p.car.angle;
    } else {
      const angle = aimAngle(input, state.camera, view.w, view.h);
      walkPlayer(input, dt, angle);
      if (p.fireTimer > 0) p.fireTimer -= dt;
      if (input.shootHeld && input.shootHeld() && p.fireTimer <= 0 && p.ammo > 0) {
        const w = p.weapons[p.weapon];
        w.ammo -= 1;
        p.fireTimer = WEAPONS[p.weapon].fireInterval;
        const mx = p.x + Math.cos(p.angle) * 22;
        const my = p.y + Math.sin(p.angle) * 22;
        fireWeapon(state.bullets, p.weapon, mx, my, p.angle, false);
        events.shot = true;
        events.muzzle = { x: mx, y: my, angle: p.angle };
        syncAmmo();
        if (nearPolice(p.x, p.y, 420) || state.wanted > 0) addWanted(state, 0.2);
      }
    }

    stepBullets(state, dt);
    // Gunmen actually shoot now (round 1 set the event but never fired).
    if (events.enemyShot) {
      fireWeapon(state.bullets, 'pistol', events.enemyShot.x, events.enemyShot.y, events.enemyShot.angle, true);
      events.enemyShotFired = true;
    }
    if (events.explosion) {
      spawnExplosion(events.explosion.x, events.explosion.y);
      events.explosion = null;
    }
    if (events.collect) {
      addFloater(events.collect.x, events.collect.y, `+$${events.collect.value}`, '#7be382');
    }
    if (events.weaponPickup) {
      const key = events.weaponPickup;
      const def = WEAPONS[key];
      if (p.weapons[key].ammo + p.weapons[key].reserve === 0) {
        p.weapons[key] = { ammo: def.mag, reserve: def.reserve };
        p.weapon = key;
      } else {
        p.weapons[key].reserve += def.reserve;
      }
      syncAmmo();
      addFloater(p.x, p.y - 24, def.name, def.color);
    }

    const obstacles = [];
    if (p.inCar && p.car) obstacles.push(p.car);
    for (const unit of state.police.units) {
      if (unit.kind === 'car') obstacles.push(unit.car);
    }
    stepTraffic(traffic, dt, city, obstacles);
    const danger = events.shot
      ? { x: p.x, y: p.y }
      : (p.inCar && p.car && Math.abs(p.car.speed) > 250 ? { x: p.x, y: p.y } : null);
    stepPedestrians(peds, dt, city, danger);
    stepPolice(state.police, state, dt, rng, events);
    decayWanted(state, dt);
    updateMission(state, dt);
    updateRace(state, dt);
    updatePickups(state);
    stepParticles(dt);

    // Camera follows the player (or their car), clamped to the world.
    // Zoom: close on foot, pulling back as the car goes faster.
    if (!state.zoomLock) {
      const targetZoom = p.inCar && p.car
        ? 1.0 - Math.min(0.22, (Math.abs(p.car.speed) / CAR.maxSpeed) * 0.22)
        : 1.12;
      state.zoom += (targetZoom - state.zoom) * Math.min(1, dt * 3);
    }
    const tx = p.x;
    const ty = p.y;
    state.camera.x += (tx - state.camera.x) * Math.min(1, dt * 6);
    state.camera.y += (ty - state.camera.y) * Math.min(1, dt * 6);

    if (p.health <= 0) {
      state.over = true;
      state.overKind = 'wasted';
      return EVENT_OVER;
    }
    if (events.busted) {
      state.over = true;
      state.overKind = 'busted';
      return EVENT_BUSTED;
    }
    return 0;
  }

  return { state, reset, step, enterCar, exitCar, nearestCar, restoreCheckpoint, saveCheckpoint };
}

export { STEP };
