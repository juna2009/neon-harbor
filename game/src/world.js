// Neon Harbor — world — state — step — storms — heat — boats.
import { CAR, PLAYER, STEP, UFO_DURATION, UFO_HOUR, WANTED, WEAPONS, WORLD_H, WORLD_W } from './config.js';
import { WATER_X, buildCity, collides, districtAt, moveCircle } from './city.js';
import { createBullets, fireWeapon, stepBullets } from './combat.js';
import { BOAT_ACCEL, BOAT_MAX_SPEED, createBoats, nearestBoat, stepBoats } from './boats.js';
import { claimPinkTaxi, createArmored, createCollectibles, createMissionState, createPizza, createRace, createTaxi, createWeaponPickups, loadCheckpoint, maxCarHp, repairAtGarage, resprayAtGarage, saveCheckpoint, targetForMission, updateArmored, updateMission, updatePickups, updatePizza, updateRace, updateTaxi } from './missions.js';
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
    hydrants: city.hydrants.map((h) => ({ ...h, jetTimer: 0 })),
    gasStation: { ...city.gasStation, pumps: city.gasStation.pumps.map((p) => ({ ...p })), chainTimer: 0, triggered: false },
    wet: [],
    peds,
    police: createPolice(),
    bullets: createBullets(),
    mission: createMissionState(savedMission || 0),
    collectibles: createCollectibles(city, rng),
    pickups: createWeaponPickups(city),
    race: createRace(city),
    raceWins: 0,
    taxi: createTaxi(),
    taxiFaresDone: 0,
    armored: createArmored(),
    pizza: createPizza(city),
    boats: createBoats(city, rng),
    blackout: { active: false, timer: 0 },
    weather: { rain: false, timer: 55, duration: 0, storm: false, heavy: false, bolt: null, boltTimer: 0, flash: 0, thunderIn: 0 },
    rainDrops: [],
    clock: { total: 21 * 60 },
    heat: [0, 0, 0],
    upgrades: {},
    ufo: { active: false, timer: 0, seen: false, x: WATER_X + 56, y: 620 },
    bridge: { up: false, timer: 0, inGap: false },
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
      inBoat: false,
      boat: null,
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
    state.player.inBoat = false;
    state.player.boat = null;
    state.cash = 0;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.gunmen = 0;
    state.elapsed = 0;
    state.over = false;
    state.overKind = '';
    state.taxiFaresDone = 0;
    state.raceWins = 0;
    state.blackout = { active: false, timer: 0 };
    state.boats = createBoats(city, rng);
    state.hydrants = city.hydrants.map((h) => ({ ...h, jetTimer: 0 }));
    state.gasStation = { ...city.gasStation, pumps: city.gasStation.pumps.map((p) => ({ ...p })), chainTimer: 0, triggered: false };
    state.wet.length = 0;
    state.events = {};
    state.bullets.length = 0;
    state.particles.length = 0;
    state.skids.length = 0;
    state.floaters.length = 0;
    state.police.units.length = 0;
    state.police.arrestTimer = 0;
    state.police.roadblockTimer = 0;
    state.police.barrierTimer = 8;
    state.police.heli.active = false;
    state.police.strips.length = 0;
    state.police.stripTimer = 10;
    state.mission = createMissionState(0);
    state.race = createRace(city);
    state.taxi = createTaxi();
    state.armored = createArmored();
    state.pizza = createPizza(city);
    state.weather = { rain: false, timer: 55, duration: 0, storm: false, heavy: false, bolt: null, boltTimer: 0, flash: 0, thunderIn: 0 };
    state.rainDrops.length = 0;
    state.clock = { total: 21 * 60 };
    // Heat is NOT reset here: the city remembers. A game-over restart
    state.ufo = { active: false, timer: 0, seen: false, x: WATER_X + 56, y: 620 };
    state.bridge = { up: false, timer: 0, inGap: false };
    for (const c of state.collectibles) c.taken = false;
    for (const pk of state.pickups) pk.taken = false;
    for (const ped of peds) ped.alive = true;
    for (const car of traffic.cars) { car.alive = true; car.health = 2; }
    for (const car of traffic.parked) { car.alive = true; car.health = 2; }
  }

  function restoreCheckpoint() {
    const cp = loadCheckpoint();
    if (!cp) return false;
    reset();
    state.mission = createMissionState(cp.mission);
    state.mission.stage = cp.stage;
    state.mission.started = true;
    // Round-3 fix: the restored mission needs its target marker back —
    state.mission.target = targetForMission(city, cp.mission, cp.stage);
    state.mission.dialogue = [`Checkpoint — ${cp.label}. Pick up where you left off.`];
    state.mission.dialogueTimer = 5;
    state.player.x = cp.x;
    state.player.y = cp.y;
    state.camera.x = cp.x;
    state.camera.y = cp.y;
    state.cash = cp.cash;
    state.wanted = typeof cp.wanted === 'number' ? cp.wanted : 0;
    state.wantedTimer = 0;
    if (Array.isArray(cp.heat) && cp.heat.length === 3) state.heat = cp.heat.slice();
    if (cp.mission === 4 && cp.stage === 0) {
      state.blackout.active = true;
      state.blackout.timer = 30;
    }
    if (Array.isArray(cp.taken)) {
      for (const i of cp.taken) {
        if (state.collectibles[i]) state.collectibles[i].taken = true;
      }
    }
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
    if (car.hp === undefined) car.hp = maxCarHp(state);
    if (car.stolen === undefined) {
      car.stolen = true;
      if (!state.upgrades.ghost && (state.wanted > 0 || nearPolice(p.x, p.y, 300))) addWanted(state, 1);
    }
    if (car.pink) claimPinkTaxi(state);
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

  function enterBoat(boat) {
    const p = state.player;
    p.inBoat = true;
    p.boat = boat;
    boat.kind = 'player';
    if (!boat.stolen) {
      boat.stolen = true;
      if (!state.upgrades.ghost && (state.wanted > 0 || nearPolice(p.x, p.y, 300))) addWanted(state, 1);
    }
  }

  function exitBoat() {
    const p = state.player;
    if (!p.boat) return;
    p.inBoat = false;
    p.x = WATER_X - 40;
    p.y = Math.max(40, Math.min(WORLD_H - 40, p.boat.y));
    p.boat.speed = 0;
    p.boat = null;
  }

  function driveBoat(boat, input, dt) {
    const throttle = -input.moveY();
    const steer = input.moveX();
    if (throttle > 0) boat.speed += BOAT_ACCEL * dt;
    else if (throttle < 0) boat.speed -= BOAT_ACCEL * 0.6 * dt;
    else boat.speed -= boat.speed * 1.2 * dt;
    boat.speed = Math.max(-170, Math.min(BOAT_MAX_SPEED, boat.speed));
    if (Math.abs(boat.speed) > 5) {
      boat.angle += steer * 2.4 * dt * Math.sign(boat.speed) * Math.min(1, Math.abs(boat.speed) / 150);
    }
    boat.x += Math.cos(boat.angle) * boat.speed * dt;
    boat.y += Math.sin(boat.angle) * boat.speed * dt;
    boat.x = Math.max(WATER_X + 16, Math.min(WORLD_W - 16, boat.x));
    boat.y = Math.max(16, Math.min(WORLD_H - 16, boat.y));
    if (Math.abs(boat.speed) > 120) {
      boat.wake.push({
        x: boat.x - Math.cos(boat.angle) * 30,
        y: boat.y - Math.sin(boat.angle) * 30,
        life: 1.4, maxLife: 1.4,
      });
      if (boat.wake.length > 80) boat.wake.splice(0, boat.wake.length - 80);
    }
  }

  function spawnExplosion(x, y, opts = {}) {
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
    if (opts.big) {
      for (let i = 0; i < 22; i += 1) {
        const life = state.rng.range(0.9, 1.5);
        state.particles.push({ x: x + state.rng.range(-24, 24), y: y + state.rng.range(-35, 8),
          vx: state.rng.range(-36, 36), vy: state.rng.range(-100, -35), life, maxLife: life,
          size: state.rng.range(28, 55), color: state.rng.pick(['#ff681f', '#ffad32', '#ffe391']), kind: 'flame' });
      }
      for (let i = 0; i < 20; i += 1) {
        const life = state.rng.range(7, 10);
        state.particles.push({ x: x + state.rng.range(-16, 16), y: y - i * 13,
          vx: state.rng.range(-7, 7), vy: -state.rng.range(12, 25), life, maxLife: life,
          size: state.rng.range(23, 42), color: '#55535a', kind: 'smoke' });
      }
    }
    state.shake = Math.max(state.shake, opts.big ? 14 : 9);
    state.events.crash = true;
  }

  function explodePump(pump) {
    if (!pump || !pump.alive) return;
    const station = state.gasStation;
    pump.alive = false;
    if (!station.triggered) {
      station.triggered = true;
      addWanted(state, 2);
    }
    station.chainTimer = station.pumps.some((p) => p.alive) ? 0.4 : 0;
    spawnExplosion(pump.x, pump.y, { big: true });
    if (Math.hypot(state.player.x - pump.x, state.player.y - pump.y) < 120) state.player.health -= 25;
  }

  function hitScenery(car) {
    if (!car.alive) return;
    for (const h of state.hydrants) {
      if (!h.burst && Math.abs(car.speed) > 60 && Math.hypot(car.x - h.x, car.y - h.y) < 28) {
        h.burst = true;
        h.jetTimer = 10;
        state.wet.push({ x: h.x, y: h.y, r: 70, life: 25 });
        state.shake = Math.max(state.shake, 3);
      }
    }
    for (const pump of state.gasStation.pumps) {
      if (pump.alive && Math.abs(car.speed) > 80 && Math.hypot(car.x - pump.x, car.y - pump.y) < 34) explodePump(pump);
    }
  }

  function strikeLightning(state) {
    const p = state.player;
    const px = p.inCar && p.car ? p.car.x : p.x;
    const py = p.inCar && p.car ? p.car.y : p.y;
    const sx = Math.max(60, Math.min(WATER_X - 60, px + state.rng.range(-260, 260)));
    const sy = Math.max(60, Math.min(WORLD_H - 60, py + state.rng.range(-260, 260)));
    const points = [{ x: sx, y: sy - 280 }];
    for (let i = 1; i < 6; i += 1) {
      points.push({ x: sx + state.rng.range(-18, 18), y: sy - 280 + (280 * i) / 6 });
    }
    points.push({ x: sx, y: sy });
    state.weather.bolt = { x: sx, y: sy, points };
    state.shake = Math.max(state.shake, 8);
    addFloater(sx, sy - 30, 'LIGHTNING STRIKE!', '#ffd23e');
    if (p.inCar && p.car && Math.hypot(p.car.x - sx, p.car.y - sy) < 70) {
      p.car.hp = (p.car.hp === undefined ? maxCarHp(state) : p.car.hp) - 25;
      if (p.car.hp <= 0) {
        const car = p.car;
        spawnExplosion(car.x, car.y);
        car.alive = false;
        p.inCar = false;
        p.car = null;
        p.x = car.x + 40;
        p.y = car.y;
        p.health = Math.max(10, p.health - 25);
      }
    } else if (!p.inCar && Math.hypot(p.x - sx, p.y - sy) < 70) {
      p.health = Math.max(0, p.health - 15);
    }
    for (const car of state.traffic.cars) {
      if (car.alive && Math.hypot(car.x - sx, car.y - sy) < 70) {
        car.health -= 2;
        if (car.health <= 0) {
          car.alive = false;
          state.events.explosion = { x: car.x, y: car.y };
        }
      }
    }
  }

  function stepScenery(dt) {
    const station = state.gasStation;
    if (station.chainTimer > 0) {
      station.chainTimer -= dt;
      if (station.chainTimer <= 0) explodePump(station.pumps.find((p) => p.alive));
    }
    for (let i = state.wet.length - 1; i >= 0; i -= 1) {
      state.wet[i].life -= dt;
      if (state.wet[i].life <= 0) state.wet.splice(i, 1);
    }
    for (const h of state.hydrants) {
      if (h.jetTimer <= 0) continue;
      h.jetTimer -= dt;
      for (let i = 0; i < 3; i += 1) state.particles.push({
        x: h.x + state.rng.range(-3, 3), y: h.y - 10, vx: state.rng.range(-15, 15),
        vy: -state.rng.range(155, 220), life: 0.8, maxLife: 0.8,
        size: 3, color: '#caf6ff', kind: 'jet',
      });
    }
  }

  function addSkid(x, y, angle) {
    state.skids.push({ x, y, angle, life: 5 });
    if (state.skids.length > 220) state.skids.splice(0, state.skids.length - 220);
  }

  function addFloater(x, y, value, color) {
    state.floaters.push({ x, y, value, color: color || '#7be382', life: 1.4 });
  }

  function collideCars(car, dt) {
    const armoredTruck = state.armored && state.armored.truck ? [state.armored.truck] : [];
    const others = state.traffic.cars.concat(state.traffic.parked)
      .concat(state.police.units.filter((u) => u.kind === 'car').map((u) => u.car))
      .concat(armoredTruck);
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
      if (other.kind !== 'parked' && !other.roadblock && !other.concrete && other.kind !== 'armored') {
        other.x -= nx * push * 1.5;
        other.y -= ny * push * 1.5;
        if (other.kind === 'traffic') other.speed = Math.max(other.speed, impact * 0.6);
        else other.speed *= 0.4;
      }
      if (impact > 60) {
        car.speed *= 0.85;
        state.events.crash = true;
        state.shake = Math.max(state.shake, 4);
        addSkid(car.x, car.y, car.angle);
        if (car.hp !== undefined && impact > 350) {
          car.hp -= impact * 0.03 * (state.upgrades.armor ? 0.5 : 1);
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
    // Round-3 fix: W / Up is the gas. moveY() returns -1 for Up (north
    const throttle = -input.moveY();
    const steer = input.moveX();
    const speedAlong = car.speed;
    const tireFactor = car.tiresPopped ? 0.45 : 1;
    const speedFactor = state.upgrades.turbo ? 1.15 : 1;
    const accelFactor = state.upgrades.turbo ? 1.1 : 1;
    const wet = (state.weather && state.weather.heavy)
      || state.wet.some((w) => Math.hypot(car.x - w.x, car.y - w.y) < w.r);
    const steerFactor = (state.upgrades.slicks ? 1.25 : 1) * (wet ? 0.55 : 1);
    if (throttle > 0) car.speed += CAR.accel * tireFactor * accelFactor * dt;
    else if (throttle < 0) {
      car.speed -= (speedAlong > 10 ? CAR.brake : CAR.accel * 0.6) * dt;
    } else {
      car.speed -= car.speed * 1.4 * dt;
    }
    car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed * tireFactor * speedFactor, car.speed));
    if (Math.abs(car.speed) > 5) {
      car.angle += steer * CAR.turnRate * steerFactor * (car.tiresPopped ? 0.55 : 1) * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 120);
    }
    car.slide = wet ? (car.slide || 0) * 0.98 + steer * car.speed * dt * 0.7 : (car.slide || 0) * 0.9;
    const nx = car.x + (Math.cos(car.angle) * car.speed - Math.sin(car.angle) * car.slide) * dt;
    const ny = car.y + (Math.sin(car.angle) * car.speed + Math.cos(car.angle) * car.slide) * dt;
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
    hitScenery(car);
    collideCars(car, dt);
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
    for (const ped of peds) {
      if (!ped.alive) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26 && Math.abs(car.speed) > 80) {
        ped.alive = false;
        addWanted(state, 1);
        state.events.pedDown = true;
      }
    }
    if (car === state.player.car && !car.tiresPopped && !state.upgrades.runflats) {
      for (const strip of state.police.strips) {
        if (Math.hypot(strip.x - car.x, strip.y - car.y) < 34) {
          car.tiresPopped = true;
          state.events.tirePop = true;
          state.shake = Math.max(state.shake, 6);
          state.mission.dialogue = ['Tires popped! Get to the garage — $150 repair (G).'];
          state.mission.dialogueTimer = 5;
          break;
        }
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
      if (pt.kind !== 'jet' && pt.kind !== 'flame' && !(pt.kind === 'smoke' && pt.maxLife > 5)) { pt.vx *= 0.94; pt.vy *= 0.94; }
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

  // Drawbridge: road x=2400, gap y 1640-1720. Jump it at 300+ or swim.
  function stepBridge(dt) {
    const b = state.bridge, p = state.player;
    const c = p.inCar && p.car ? p.car : null;
    const px = c ? c.x : p.x, py = c ? c.y : p.y, sp = c ? Math.abs(c.speed) : 0;
    const d = Math.hypot(px - 2400, py - 1680);
    const inGap = Math.abs(px - 2400) < 40 && py > 1640 && py < 1720;
    if (!b.up && !inGap && sp > 200 && d < 320 && (state.wanted >= 3 || state.mission.index === 11)) {
      b.up = true; b.timer = 20;
      state.events.bridgeAlarm = true;
      state.mission.dialogue = ['DRAWBRIDGE UP! Jump it — or swim.'];
      state.mission.dialogueTimer = 5;
    }
    if (b.up && ((b.timer -= dt) <= 0 || d > 520)) b.up = false;
    if (inGap && !b.inGap && b.up) {
      if (sp >= 300) {
        state.events.jump = true; state.events.bridgeJump = true;
        c.speed = Math.sign(c.speed) * 220; // landing scrubs speed
        addFloater(px, py - 30, 'BRIDGE JUMP!', '#ffd23e');
      } else {
        if (c) { spawnExplosion(c.x, c.y); c.alive = false; p.inCar = false; p.car = null; }
        p.x = 2400; p.y = 1600;
        p.health = Math.max(10, p.health - 15);
        state.mission.dialogue = ['Into the harbor! The car is gone.'];
        state.mission.dialogueTimer = 5;
      }
    }
    b.inGap = inGap;
  }

  function step(dt, input, view) {
    if (state.over) return EVENT_OVER;
    state.elapsed += dt;
    state.events = {};
    const p = state.player;
    const events = state.events;
    const wantedBefore = state.wanted;

    if (!state.daylightManual) {
      state.daylight = 0.55 + 0.45 * Math.sin(state.elapsed * 0.013);
    }

    if (input.wasPressed && input.wasPressed('interact')) {
      if (p.inBoat) exitBoat();
      else if (p.inCar) exitCar();
      else {
        const boat = nearestBoat(state.boats, p.x, p.y, 70);
        if (boat) {
          enterBoat(boat);
        } else {
          const car = nearestCar(70);
          if (car) {
            enterCar(car);
            if (car.body === 'taxi') {
              state.mission.dialogue = ['TAXI: This cab picks up fares — watch for waving passengers.'];
              state.mission.dialogueTimer = 4;
            }
          }
        }
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
    if (input.wasPressed && input.wasPressed('repair')) {
      const result = repairAtGarage(state);
      if (result === 'ok') {
        state.mission.dialogue = ['Garage: good as new. $150 — drive safe, Jax.'];
        state.mission.dialogueTimer = 4;
      } else if (result === 'broke') {
        state.mission.dialogue = ['Garage: $150 for a full repair — you are short on cash.'];
        state.mission.dialogueTimer = 4;
      } else if (result === 'fine') {
        const spray = resprayAtGarage(state);
        if (spray === 'ok') {
          state.mission.dialogue = ['Resprayed — fresh paint, one less star. $150.'];
          state.mission.dialogueTimer = 4;
        } else if (spray === 'broke') {
          state.mission.dialogue = ['Respray is $150 — you are short on cash.'];
          state.mission.dialogueTimer = 4;
        } else {
          state.mission.dialogue = ['Garage: this car is already in fine shape.'];
          state.mission.dialogueTimer = 3;
        }
      }
    }

    const weather = state.weather;
    if (!weather.rain) {
      weather.timer -= dt;
      if (weather.timer <= 0) {
        weather.rain = true;
        weather.duration = 25;
        weather.storm = state.rng.chance(0.5);
        // Half the storms turn heavy: slick roads and lightning that
        weather.heavy = weather.storm && state.rng.chance(0.5);
        weather.bolt = null;
        weather.boltTimer = state.rng.range(2, 5);
        weather.flash = 0;
        weather.thunderIn = 0;
        if (weather.heavy) {
          state.mission.dialogue = ['HEAVY RAIN — roads are slick. Easy on the wheel.'];
          state.mission.dialogueTimer = 5;
        }
      }
    } else {
      weather.duration -= dt;
      if (weather.duration <= 0) {
        weather.rain = false;
        weather.timer = 95;
        weather.storm = false;
        weather.heavy = false;
        weather.bolt = null;
        weather.flash = 0;
        weather.thunderIn = 0;
        state.rainDrops.length = 0;
      }
    }
    if (weather.storm) {
      if (weather.flash > 0) {
        weather.flash -= 1;
        if (weather.flash <= 0) weather.bolt = null;
      }
      weather.boltTimer -= dt;
      if (weather.boltTimer <= 0) {
        weather.flash = 2;
        weather.thunderIn = 0.5;
        weather.boltTimer = state.rng.range(4, 9);
        state.shake = Math.max(state.shake, 2);
        if (weather.heavy) strikeLightning(state);
      }
      if (weather.thunderIn > 0) {
        weather.thunderIn -= dt;
        if (weather.thunderIn <= 0) events.thunder = true;
      }
    }
    if (weather.rain) {
      while (state.rainDrops.length < 80) {
        state.rainDrops.push({
          x: state.camera.x + state.rng.range(-700, 700),
          y: state.camera.y + state.rng.range(-500, 500),
          speed: state.rng.range(700, 1000),
        });
      }
      for (const drop of state.rainDrops) {
        drop.y += drop.speed * dt;
        drop.x += 120 * dt;
        if (drop.y > state.camera.y + 520) {
          drop.y = state.camera.y - 480;
          drop.x = state.camera.x + state.rng.range(-700, 700);
        }
      }
    }

    state.clock.total += dt;
    const hour = Math.floor(state.clock.total / 60) % 24;
    const ufo = state.ufo;
    if (ufo.active) {
      ufo.timer -= dt;
      if (ufo.timer <= 0) ufo.active = false;
    } else if (hour === UFO_HOUR && !ufo.seen) {
      ufo.active = true;
      ufo.timer = UFO_DURATION;
      ufo.seen = true;
      state.mission.dialogue = ['UFO over the harbor! 03:00 — something is out there.'];
      state.mission.dialogueTimer = 6;
      events.ufo = true;
    } else if (hour !== UFO_HOUR) {
      ufo.seen = false;
    }

    if (state.blackout.active) {
      state.blackout.timer -= dt;
      if (state.blackout.timer <= 0) state.blackout.active = false;
    }

    if (p.inBoat && p.boat) {
      driveBoat(p.boat, input, dt);
      p.x = p.boat.x;
      p.y = p.boat.y;
      p.angle = p.boat.angle;
    } else if (p.inCar && p.car) {
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
        fireWeapon(state.bullets, p.weapon, mx, my, p.angle, false, state.rng);
        events.shot = true;
        events.muzzle = { x: mx, y: my, angle: p.angle };
        syncAmmo();
        const aimingAtPump = state.gasStation.pumps.some((pump) => pump.alive
          && Math.abs(Math.atan2(Math.sin(Math.atan2(pump.y - my, pump.x - mx) - p.angle), Math.cos(Math.atan2(pump.y - my, pump.x - mx) - p.angle))) < 0.12);
        if (!aimingAtPump && (nearPolice(p.x, p.y, 420) || state.wanted > 0)) addWanted(state, 0.2);
      }
    }

    stepScenery(dt);
    stepBullets(state, dt);
    if (events.pumpHit) {
      explodePump(state.gasStation.pumps.find((p) => p.x === events.pumpHit.x && p.y === events.pumpHit.y));
      events.pumpHit = null;
    }
    if (events.enemyShot) {
      fireWeapon(state.bullets, 'pistol', events.enemyShot.x, events.enemyShot.y, events.enemyShot.angle, true, state.rng);
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
    for (const car of traffic.cars) if (car.kind !== 'player') hitScenery(car);
    const danger = events.shot
      ? { x: p.x, y: p.y }
      : (p.inCar && p.car && Math.abs(p.car.speed) > 250 ? { x: p.x, y: p.y } : null);
    const chase = state.wanted >= 3 ? { x: p.x, y: p.y } : null;
    const flashes = stepPedestrians(peds, dt, city, danger, chase);
    for (const f of flashes) {
      state.particles.push({
        x: f.x, y: f.y, vx: 0, vy: 0,
        life: 0.25, maxLife: 0.25, size: 10, color: '#ffffff', kind: 'flash',
      });
    }
    stepPolice(state.police, state, dt, rng, events);
    if (!state.police.heli.active) decayWanted(state, dt);
    stepBridge(dt);
    updateMission(state, dt);
    updateRace(state, dt);
    updateTaxi(state, dt);
    updateArmored(state, dt);
    updatePizza(state, dt);
    updatePickups(state);
    stepBoats(state, dt);
    stepParticles(dt);

    const heatGain = state.wanted - wantedBefore;
    if (heatGain > 0) {
      const d = districtAt(city, p.x, p.y);
      const idx = city.districts.indexOf(d);
      state.heat[idx] = Math.min(100, state.heat[idx] + heatGain * 10 * (state.upgrades.cooler ? 0.5 : 1));
    }
    const coolRate = 0.4 * (state.upgrades.cooler ? 2 : 1);
    for (let i = 0; i < state.heat.length; i += 1) {
      state.heat[i] = Math.max(0, state.heat[i] - coolRate * dt);
    }

    if (!state.zoomLock) {
      const vehicleSpeed = p.inCar && p.car
        ? Math.abs(p.car.speed)
        : p.inBoat && p.boat ? Math.abs(p.boat.speed) : 0;
      const targetZoom = vehicleSpeed > 0
        ? 1.0 - Math.min(0.22, (vehicleSpeed / CAR.maxSpeed) * 0.22)
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

  return { state, reset, step, enterCar, exitCar, enterBoat, exitBoat, nearestCar, restoreCheckpoint, saveCheckpoint };
}

export { STEP };
