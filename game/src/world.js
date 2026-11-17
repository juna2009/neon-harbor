// Neon Harbor — the world: one state object, one fixed step. Movement on
// foot and in a car, entering and stealing cars, collisions, shooting,
// reloading, the wanted clock and mission updates all meet here.
import { CAR, PLAYER, STEP, WANTED, WORLD_H, WORLD_W } from './config.js';
import { buildCity, collides, moveCircle } from './city.js';
import { createBullets, fireBullet, stepBullets } from './combat.js';
import { createMissionState, updateMission } from './missions.js';
import { addWanted, createPolice, decayWanted, stepPolice } from './police.js';
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
    player: {
      x: city.playerStart.x,
      y: city.playerStart.y,
      angle: 0,
      health: PLAYER.health,
      ammo: PLAYER.pistolAmmo,
      reserve: PLAYER.pistolReserve,
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
    state.police.units.length = 0;
    state.police.arrestTimer = 0;
    state.mission = createMissionState(0);
    for (const ped of peds) ped.alive = true;
    for (const car of traffic.cars) car.alive = true;
    for (const car of traffic.parked) car.alive = true;
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
    if (car.stolen === undefined) {
      car.stolen = true;
      if (state.wanted > 0 || nearPolice(p.x, p.y, 300)) addWanted(state, 1);
    }
  }

  function nearPolice(x, y, radius) {
    for (const unit of state.police.units) {
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

  function driveCar(car, input, dt) {
    const throttle = input.moveY();
    const steer = input.moveX();
    const forward = Math.cos(car.angle);
    const right = Math.sin(car.angle);
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
    // Running over pedestrians is a crime.
    for (const ped of peds) {
      if (!ped.alive) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26 && Math.abs(car.speed) > 80) {
        ped.alive = false;
        addWanted(state, 1);
        state.events.pedDown = true;
      }
    }
    void forward;
    void right;
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
    const sx = p.x - camera.x + viewW / 2;
    const sy = p.y - camera.y + viewH / 2;
    return Math.atan2(input.mouse.y - sy, input.mouse.x - sx);
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

    if (input.wasPressed && input.wasPressed('interact')) {
      if (p.inCar) exitCar();
      else {
        const car = nearestCar(70);
        if (car) enterCar(car);
      }
    }
    if (input.wasPressed && input.wasPressed('reload')) {
      const need = PLAYER.pistolAmmo - p.ammo;
      const take = Math.min(need, p.reserve);
      p.ammo += take;
      p.reserve -= take;
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
        p.ammo -= 1;
        p.fireTimer = PLAYER.fireInterval;
        fireBullet(state.bullets, p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20, p.angle, false);
        events.shot = true;
        if (nearPolice(p.x, p.y, 420) || state.wanted > 0) addWanted(state, 0.2);
      }
    }

    stepBullets(state, dt);
    stepTraffic(traffic, dt);
    const danger = events.shot ? { x: p.x, y: p.y } : null;
    stepPedestrians(peds, dt, city, danger);
    stepPolice(state.police, state, dt, rng, events);
    decayWanted(state, dt);
    updateMission(state, dt);

    // Camera follows the player (or their car), clamped to the world.
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

  return { state, reset, step, enterCar, exitCar, nearestCar };
}

export { STEP };
