import { ARMORED_HAUL, ARMORED_HP, ARMORED_RESPAWN, CHECKPOINT_KEY, COLLECTIBLE_COUNT, COLLECTIBLE_VALUE, GARAGE_COST, GARAGE_REPAIR, MISSION_REWARDS, NIGHT_RACE_BET, NIGHT_RACE_PRIZE, PINK_TAXI_REWARD, PIZZA_FARE, PIZZA_TIME_LIMIT, RACE_REWARD, RESPRAY_COST, RESPRAY_STARS, TAXI_FARE, TAXI_TIME_LIMIT, UPGRADES } from './config.js';
import { WATER_X } from './city.js';
import { addWanted, clearPolice, dropWanted, spawnPoliceUnit } from './police.js';
import { makeCar } from './traffic.js';
export const MISSION_DEFS = [
  {
    title: 'Hot Wheels',
    brief: 'Jax needs wheels. Steal a car and drive it to the docks.',
    objective: 'Steal a car, then drive to the docks',
    reward: MISSION_REWARDS[0],
    dialogue: [
      'MARA: Jax, the crew needs a driver tonight. No questions.',
      'MARA: Take any car on the street. Meet me at the docks, east side.',
    ],
  },
  {
    title: 'The Package',
    brief: 'Pick up the package at the plaza and deliver it to the marina.',
    objective: 'Pick up the package, then deliver it to the marina',
    reward: MISSION_REWARDS[1],
    dialogue: [
      'MARA: Good driving. Now grab the package at the plaza, north side.',
      'MARA: Deliver it to the marina. Do not open it. Do not stop.',
    ],
  },
  {
    title: 'Lose the Heat',
    brief: 'The delivery was flagged. The police are all over the harbor — and Mara made the call.',
    objective: 'Lose the heat — Mara set you up. Get your wanted level back to 0',
    reward: MISSION_REWARDS[2],
    dialogue: [
      'MARA: Jax... I tipped them off. The marina cameras — I made that call.',
      'MARA: The crew was going to kill you tonight. I bought you time. Lay low until the heat dies down.',
    ],
  },
  {
    title: 'Harbor Showdown',
    brief: 'Rival crew ambush at the docks. Survive, then reach the boat.',
    objective: 'Survive the ambush, then reach the boat at the docks',
    reward: MISSION_REWARDS[3],
    dialogue: [
      'MARA: They are waiting for us at the docks. Armed. All of them.',
      'MARA: Survive the ambush and get to the boat. We leave tonight.',
    ],
  },
  {
    title: 'The Last Run',
    brief: "Mara flips: rob the police evidence vault for the ledger that proves her father — the commissioner — is corrupt. Run it to the lighthouse, and Neon Harbor is yours.",
    objective: 'Grab the ledger at the evidence vault, then run it to the lighthouse',
    reward: MISSION_REWARDS[4],
    dialogue: [
      'MARA: My father runs the Harbor Police — and the ledger in the evidence vault proves it.',
      'MARA: I cut the power to the district. Grab the ledger, get to the lighthouse. Then we are free.',
    ],
  },
  {
    title: 'Night Taxi',
    brief: 'Day 2 — the ledger is ours, but the crew still needs cash. Drive a cab and finish two fares.',
    objective: 'Drive a taxi and complete 2 fares',
    reward: MISSION_REWARDS[5],
    dialogue: [
      'The harbor keeps its secrets. So do we.',
      'MARA: The ledger is ours. We are free now — but the crew still needs cash, Jax.',
      'MARA: Grab a cab. Two fares, no trouble. The night shift pays.',
    ],
  },
  {
    title: 'Vigilante Shift',
    brief: 'Day 2 — a crew is shaking down the docks. Hold the line at three stars for a full minute.',
    objective: 'Survive 60 seconds at 3 stars',
    reward: MISSION_REWARDS[6],
    dialogue: [
      'MARA: A crew is shaking down the docks — the harbor is ours, not theirs.',
      'MARA: Make noise. Three stars, one minute. Show them who runs this water.',
    ],
  },
  {
    title: 'Courier Dash',
    brief: 'Day 2 — three drops, one deadline: plaza, marina, lighthouse. 150 seconds on the clock.',
    objective: 'Deliver to the plaza, the marina, then the lighthouse (150s)',
    reward: MISSION_REWARDS[7],
    dialogue: [
      'MARA: Three drops, one deadline. Plaza first, then the marina, then the lighthouse.',
      'MARA: 150 seconds. The client does not wait, and neither do the cops.',
    ],
  },
  {
    title: 'The Long Way Home',
    brief: 'Day 3 — the Downtown street race is the only way to settle a debt. Win it.',
    objective: 'Win the Downtown street race',
    reward: MISSION_REWARDS[8],
    dialogue: [
      'MARA: A debt is due at the race line, Jax. The only way to settle it is to win.',
      'MARA: Five checkpoints around Downtown. Be first, be fast, be gone.',
    ],
  },
  {
    title: 'Token Hunt',
    brief: 'Day 3 — four harbor tokens are still out there. Find them and the crew pays.',
    objective: 'Collect 4 more harbor tokens',
    reward: MISSION_REWARDS[9],
    dialogue: [
      'MARA: Four harbor tokens are still out there, Jax — gold, hidden, ours for the taking.',
      'MARA: The minimap marks the ones left. Bring me four.',
    ],
  },
  {
    title: 'Ghost Town',
    brief: 'Day 3 — four stars and the whole Harbor Police on your tail. Vanish.',
    objective: 'Lose a 4-star wanted level — get back to 0',
    reward: MISSION_REWARDS[10],
    dialogue: [
      'MARA: Four stars, Jax. The whole force is looking for you now.',
      'MARA: Garage, respray, back alleys — whatever it takes. Get back to zero.',
    ],
  },
  {
    title: 'The Harbor King',
    brief: 'Day 3 — dawn on the water. Steal a speedboat and run it to the marina: the harbor is yours.',
    objective: 'Steal a speedboat and reach the marina',
    reward: MISSION_REWARDS[11],
    dialogue: [
      'MARA: Dawn run, Jax. Take a boat — any boat — and bring it to the marina.',
      'MARA: The harbor remembers who owns it. Today, that is us.',
    ],
  },
];
export function createMissionState(savedIndex) {
  return {
    index: savedIndex || 0,
    stage: 0,
    target: null,
    dialogue: [],
    dialogueTimer: 0,
    timer: 0,
    done: false,
    started: false,
    checkpoint: null,
  };
}
function plazaTarget(city) {
  return { x: city.roadsV[2], y: city.roadsH[1], label: 'Package' };
}
function docksTarget(city) {
  return { x: city.docks.x + 60, y: city.docks.y + 140, label: 'Docks' };
}
function marinaTarget(city) {
  return { x: city.marina.x + 84, y: city.marina.y + 80, label: 'Marina' };
}
function marinaWaterTarget(city) {
  return { x: WATER_X + 40, y: city.marina.y + 80, label: 'Marina' };
}
function casinoTarget(city) {
  return { x: city.casino.x, y: city.casino.y, label: 'Casino' };
}
function vaultTarget(city) {
  return { x: city.casino.x, y: city.casino.y, label: 'Evidence Vault' };
}
function lighthouseTarget(city) {
  return { x: city.lighthouse.x, y: city.lighthouse.y, label: 'Lighthouse' };
}
function raceStartTarget(city) {
  return { x: city.roadsV[4], y: city.roadsH[1], label: 'RACE' };
}
export function targetForMission(city, index, stage) {
  if (index === 0) return docksTarget(city);
  if (index === 1) return stage === 0 ? plazaTarget(city) : marinaTarget(city);
  if (index === 2) return null;
  if (index === 3) return docksTarget(city);
  if (index === 4) return stage === 0 ? vaultTarget(city) : lighthouseTarget(city);
  if (index === 5) return null;
  if (index === 6) return null;
  if (index === 7) {
    return stage === 0 ? plazaTarget(city) : stage === 1 ? marinaTarget(city) : lighthouseTarget(city);
  }
  if (index === 8) return raceStartTarget(city);
  if (index === 9) return null;
  if (index === 10) return null;
  if (index === 11) return marinaWaterTarget(city);
  return null;
}
export function saveCheckpoint(world, label) {
  const mission = world.mission;
  const p = world.player;
  const cp = {
    mission: mission.index,
    stage: mission.stage,
    label: label || MISSION_DEFS[mission.index].title,
    x: p.inCar && p.car ? p.car.x : p.x,
    y: p.inCar && p.car ? p.car.y : p.y,
    cash: world.cash,
    wanted: world.wanted,
    taken: world.collectibles.map((c, i) => (c.taken ? i : -1)).filter((i) => i >= 0),
    collected: world.collectibles.filter((c) => c.taken).length,
    heat: Array.isArray(world.heat) ? world.heat.slice() : [0, 0, 0],
  };
  mission.checkpoint = cp;
  try {
    window.localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
  } catch {
  }
  return cp;
}
export function loadCheckpoint() {
  try {
    const raw = window.localStorage.getItem(CHECKPOINT_KEY);
    if (!raw) return null;
    const cp = JSON.parse(raw);
    if (typeof cp.mission !== 'number' || typeof cp.x !== 'number') return null;
    return cp;
  } catch {
    return null;
  }
}
export function clearCheckpoint() {
  try {
    window.localStorage.removeItem(CHECKPOINT_KEY);
  } catch {
  }
}
export function createRace(city) {
  const points = [
    { x: city.roadsV[4], y: city.roadsH[2], label: '1' },
    { x: city.roadsV[5], y: city.roadsH[4], label: '2' },
    { x: city.roadsV[3], y: city.roadsH[5], label: '3' },
    { x: city.roadsV[2], y: city.roadsH[3], label: '4' },
    { x: city.roadsV[4], y: city.roadsH[2], label: '5' },
  ];
  return {
    start: { x: city.roadsV[4], y: city.roadsH[1], label: 'RACE' },
    points,
    active: false,
    index: 0,
    timer: 0,
    best: 0,
    night: false,
    bet: false,
  };
}
export function createCollectibles(city, rng) {
  const spots = [];
  for (const park of city.parks) spots.push({ x: park.x + park.w / 2, y: park.y + park.h / 2 });
  spots.push({ x: city.docks.x + 30, y: city.docks.y + 40 });
  spots.push({ x: city.docks.x + 90, y: city.docks.y + 240 });
  spots.push({ x: city.marina.x + 40, y: city.marina.y + 120 });
  spots.push({ x: city.marina.x + 130, y: city.marina.y + 40 });
  for (const pt of city.intersections) {
    if (rng.chance(0.25)) spots.push({ x: pt.x + 46, y: pt.y + 46 });
  }
  const picked = rng.shuffle(spots).slice(0, COLLECTIBLE_COUNT);
  return picked.map((s) => ({ x: s.x, y: s.y, taken: false }));
}
export function createWeaponPickups(city) {
  return [
    { x: city.roadsV[2] + 46, y: city.roadsH[1] + 46, weapon: 'smg', taken: false },
    { x: city.docks.x + 30, y: city.docks.y + 200, weapon: 'shotgun', taken: false },
    { x: city.marina.x + 84, y: city.marina.y + 130, weapon: 'pistol', taken: false },
  ];
}
export function startMission(world, index) {
  const mission = world.mission;
  const city = world.city;
  mission.index = index;
  mission.stage = 0;
  mission.timer = 0;
  mission.started = true;
  mission.done = false;
  const def = MISSION_DEFS[index];
  mission.dialogue = def.dialogue.slice();
  mission.dialogueTimer = 7;
  if (index === 0) mission.target = docksTarget(city);
  else if (index === 1) mission.target = plazaTarget(city);
  else if (index === 2) {
    mission.target = null;
    addWanted(world, 3);
  } else if (index === 3) {
    mission.target = docksTarget(city);
    world.gunmen = 4;
    for (let i = 0; i < 4; i += 1) spawnPoliceUnit(world.police, world.player, world.rng, 'gunman', world.city);
  } else if (index === 4) {
    mission.target = vaultTarget(city);
    if (world.blackout) {
      world.blackout.active = true;
      world.blackout.timer = 30;
    }
  } else if (index === 5) {
    mission.target = null;
    mission.count = world.taxiFaresDone || 0;
  } else if (index === 6) {
    mission.target = null;
    addWanted(world, 3);
  } else if (index === 7) {
    mission.target = plazaTarget(city);
    mission.limit = 150;
  } else if (index === 8) {
    mission.target = raceStartTarget(city);
    mission.count = world.raceWins || 0;
  } else if (index === 9) {
    mission.target = null;
    mission.count = world.collectibles.filter((c) => c.taken).length;
  } else if (index === 10) {
    mission.target = null;
    addWanted(world, 4);
  } else if (index === 11) {
    mission.target = marinaWaterTarget(city);
  }
  saveCheckpoint(world, `${def.title} — start`);
}
export function completeMission(world) {
  const mission = world.mission;
  const def = MISSION_DEFS[mission.index];
  world.cash += def.reward;
  world.events.missionComplete = def;
  mission.dialogue = [`${def.title} complete — $${def.reward} earned.`];
  mission.dialogueTimer = 4;
  mission.target = null;
  if (mission.index === MISSION_DEFS.length - 1) {
    mission.done = true;
    world.gunmen = 0;
    clearPolice(world.police);
    mission.dialogue = ['The harbor keeps its secrets. So do we.', 'MARA: Thirteen jobs, one harbor. It is ours now, Jax.'];
    mission.dialogueTimer = 8;
    clearCheckpoint();
  } else {
    if (mission.index === 4) {
      world.gunmen = 0;
      clearPolice(world.police);
    }
    mission.index += 1;
    mission.stage = 0;
    mission.started = false;
  }
  try {
    window.localStorage.setItem('neon-harbor-mission', String(mission.index));
  } catch {
  }
}
function near(world, target, radius) {
  const p = world.player;
  const x = p.inCar ? p.car.x : p.x;
  const y = p.inCar ? p.car.y : p.y;
  return Math.hypot(x - target.x, y - target.y) < radius;
}
export function updateMission(world, dt) {
  const mission = world.mission;
  if (mission.dialogueTimer > 0) mission.dialogueTimer -= dt;
  if (mission.done || mission.index >= MISSION_DEFS.length) return;
  if (!mission.started) {
    startMission(world, mission.index);
    return;
  }
  mission.timer += dt;
  const city = world.city;
  if (mission.index === 0) {
    if (world.player.inCar && mission.stage === 0) {
      mission.stage = 1;
      mission.dialogue = ['MARA: Nice ride. Now get to the docks.'];
      mission.dialogueTimer = 4;
      saveCheckpoint(world, 'Hot Wheels — car stolen');
    }
    if (mission.stage === 1 && near(world, docksTarget(city), 90)) completeMission(world);
  } else if (mission.index === 1) {
    if (mission.stage === 0 && near(world, plazaTarget(city), 60)) {
      mission.stage = 1;
      mission.target = marinaTarget(city);
      mission.dialogue = ['Package secured. Now the marina, north-east corner.'];
      mission.dialogueTimer = 4;
      world.events.pickup = true;
      saveCheckpoint(world, 'The Package — picked up');
    }
    if (mission.stage === 1 && near(world, marinaTarget(city), 90)) completeMission(world);
  } else if (mission.index === 2) {
    if (world.wanted <= 0) completeMission(world);
  } else if (mission.index === 3) {
    if (mission.stage === 0 && (world.gunmen <= 0 || mission.timer > 30)) {
      mission.stage = 1;
      mission.dialogue = ['MARA: That was all of them. The boat is waiting!'];
      mission.dialogueTimer = 5;
      saveCheckpoint(world, 'Harbor Showdown — crew down');
    }
    if (mission.stage === 1 && (near(world, docksTarget(city), 90) || world.player.inBoat)) completeMission(world);
  } else if (mission.index === 4) {
    if (mission.stage === 0 && near(world, vaultTarget(city), 90)) {
      mission.stage = 1;
      mission.target = lighthouseTarget(city);
      mission.dialogue = ['Ledger secured. Now the lighthouse, east end of the docks.'];
      mission.dialogueTimer = 4;
      world.events.pickup = true;
      if (world.blackout) world.blackout.active = false;
      saveCheckpoint(world, 'The Last Run — ledger grabbed');
    }
    if (mission.stage === 1 && near(world, lighthouseTarget(city), 90)) completeMission(world);
  } else if (mission.index === 5) {
    const done = (world.taxiFaresDone || 0) - (mission.count || 0);
    if (done >= 2) completeMission(world);
  } else if (mission.index === 6) {
    if (world.wanted < 3) addWanted(world, 3 - world.wanted);
    if (mission.timer > 60) completeMission(world);
  } else if (mission.index === 7) {
    if (mission.stage === 0 && near(world, plazaTarget(city), 60)) {
      mission.stage = 1;
      mission.target = marinaTarget(city);
      mission.dialogue = ['First drop done. Now the marina.'];
      mission.dialogueTimer = 4;
      world.events.pickup = true;
      saveCheckpoint(world, 'Courier Dash — plaza done');
    } else if (mission.stage === 1 && near(world, marinaTarget(city), 90)) {
      mission.stage = 2;
      mission.target = lighthouseTarget(city);
      mission.dialogue = ['Second drop done. Last one: the lighthouse.'];
      mission.dialogueTimer = 4;
      world.events.pickup = true;
      saveCheckpoint(world, 'Courier Dash — marina done');
    } else if (mission.stage === 2 && near(world, lighthouseTarget(city), 90)) {
      completeMission(world);
    } else if (mission.timer > (mission.limit || 150)) {
      mission.stage = 0;
      mission.timer = 0;
      mission.target = plazaTarget(city);
      mission.dialogue = ['Courier: too slow — the client walked. Start the run again.'];
      mission.dialogueTimer = 5;
    }
  } else if (mission.index === 8) {
    if ((world.raceWins || 0) > (mission.count || 0)) completeMission(world);
  } else if (mission.index === 9) {
    const got = world.collectibles.filter((c) => c.taken).length - (mission.count || 0);
    if (got >= 4) completeMission(world);
  } else if (mission.index === 10) {
    if (world.wanted <= 0) completeMission(world);
  } else if (mission.index === 11) {
    if (world.events.jump && !mission.bridgeJump) {
      mission.bridgeJump = true;
      mission.dialogue = ['MARA: That bridge jump! Now get the boat.'];
      mission.dialogueTimer = 5;
    }
    if (world.player.inBoat && near(world, marinaWaterTarget(city), 90)) completeMission(world);
  }
}
export function updateRace(world, dt) {
  const race = world.race;
  const p = world.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  if (!race.active) {
    if (p.inCar && Math.hypot(px - race.start.x, py - race.start.y) < 60) {
      race.active = true;
      race.index = 0;
      race.timer = 0;
      race.night = world.daylight < 0.35;
      race.bet = false;
      if (race.night && world.cash >= NIGHT_RACE_BET) {
        world.cash -= NIGHT_RACE_BET;
        race.bet = true;
      }
      world.events.raceStart = true;
      world.mission.dialogue = race.night
        ? [`NIGHT RACE — $${NIGHT_RACE_BET} BET. Five checkpoints — win and take $${NIGHT_RACE_PRIZE}.`]
        : ['RACE: Five checkpoints around Downtown. Fastest wins $300.'];
      world.mission.dialogueTimer = 4;
    }
    return;
  }
  race.timer += dt;
  const target = race.points[race.index];
  if (Math.hypot(px - target.x, py - target.y) < 70) {
    race.index += 1;
    world.events.pickup = true;
    if (race.index >= race.points.length) {
      race.active = false;
      const time = race.timer;
      if (race.best === 0 || time < race.best) race.best = time;
      const reward = race.bet ? NIGHT_RACE_PRIZE : RACE_REWARD;
      world.cash += reward;
      world.raceWins = (world.raceWins || 0) + 1;
      world.events.raceWin = { time, reward };
      world.mission.dialogue = [`RACE WON in ${time.toFixed(1)}s — $${reward} earned.`];
      world.mission.dialogueTimer = 5;
      race.bet = false;
      race.night = false;
    }
  }
}
export function createTaxi() {
  return { state: 'idle', fare: null, dest: null, timer: 0, reward: TAXI_FARE, cooldown: 0 };
}
function randomRoadSpot(world, minDist) {
  const p = world.player;
  for (let tries = 0; tries < 12; tries += 1) {
    const vertical = world.rng.chance(0.5);
    let x;
    let y;
    if (vertical) {
      x = world.rng.pick(world.city.roadsV);
      y = world.rng.range(120, 1800);
    } else {
      x = world.rng.range(120, 2300);
      y = world.rng.pick(world.city.roadsH);
    }
    if (Math.hypot(x - p.x, y - p.y) >= minDist) return { x, y };
  }
  return { x: world.city.roadsV[2], y: world.city.roadsH[2] };
}
export function updateTaxi(world, dt) {
  const taxi = world.taxi;
  if (!taxi) return;
  const p = world.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  if (taxi.state === 'idle') {
    if (taxi.cooldown > 0) {
      taxi.cooldown -= dt;
      return;
    }
    if (p.inCar && p.car && p.car.body === 'taxi') {
      taxi.fare = randomRoadSpot(world, 300);
      taxi.state = 'pickup';
      world.mission.dialogue = ['TAXI: A fare is waving down the street — pick them up.'];
      world.mission.dialogueTimer = 4;
    }
    return;
  }
  if (taxi.state === 'pickup') {
    if (Math.hypot(px - taxi.fare.x, py - taxi.fare.y) < 60) {
      taxi.dest = randomRoadSpot(world, 500);
      taxi.state = 'dropoff';
      taxi.timer = TAXI_TIME_LIMIT;
      world.mission.dialogue = [`TAXI: Passenger aboard — take them to the marker, $${TAXI_FARE} fare.`];
      world.mission.dialogueTimer = 4;
    }
    return;
  }
  taxi.timer -= dt;
  if (Math.hypot(px - taxi.dest.x, py - taxi.dest.y) < 70) {
    world.cash += taxi.reward;
    world.taxiFaresDone = (world.taxiFaresDone || 0) + 1;
    world.events.taxiFare = { reward: taxi.reward };
    world.events.cash = true;
    world.mission.dialogue = [`TAXI: Fare complete — $${taxi.reward} earned.`];
    world.mission.dialogueTimer = 4;
    taxi.state = 'idle';
    taxi.fare = null;
    taxi.dest = null;
    taxi.cooldown = 20;
  } else if (taxi.timer <= 0) {
    world.mission.dialogue = ['TAXI: Too slow — the passenger got out and walked.'];
    world.mission.dialogueTimer = 4;
    taxi.state = 'idle';
    taxi.fare = null;
    taxi.dest = null;
    taxi.cooldown = 20;
  }
}
export function createArmored() {
  return { truck: null, cooldown: 30, ramTimer: 0 };
}
function spawnArmoredTruck(world) {
  const vertical = world.rng.chance(0.5);
  let x;
  let y;
  let angle;
  if (vertical) {
    x = world.rng.pick(world.city.roadsV);
    y = world.rng.range(200, 1700);
    angle = world.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
  } else {
    x = world.rng.range(200, 2300);
    y = world.rng.pick(world.city.roadsH);
    angle = world.rng.chance(0.5) ? 0 : Math.PI;
  }
  const truck = makeCar(x, y, angle, '#4a5240', 'armored', 'van');
  truck.hp = ARMORED_HP;
  truck.speed = 55;
  truck.cruise = 55;
  truck.axis = vertical ? 'v' : 'h';
  truck.road = vertical ? x : y;
  truck.dir = angle === 0 || angle === Math.PI / 2 ? 1 : -1;
  return truck;
}
export function updateArmored(world, dt) {
  const armored = world.armored;
  if (!armored) return;
  if (!armored.truck) {
    armored.cooldown -= dt;
    if (armored.cooldown <= 0) {
      armored.truck = spawnArmoredTruck(world);
      world.mission.dialogue = ['ARMORED TRUCK on the streets — crack it open for $350.'];
      world.mission.dialogueTimer = 4;
    }
    return;
  }
  const truck = armored.truck;
  if (armored.ramTimer > 0) armored.ramTimer -= dt;
  if (truck.axis === 'h') {
    truck.x += truck.dir * truck.speed * dt;
    if (truck.x < 120 || truck.x > WATER_X - 120) { truck.dir *= -1; truck.angle += Math.PI; }
  } else {
    truck.y += truck.dir * truck.speed * dt;
    if (truck.y < 120 || truck.y > 1800) { truck.dir *= -1; truck.angle += Math.PI; }
  }
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.bullets[i];
    if (!b.hostile && Math.hypot(b.x - truck.x, b.y - truck.y) < 30) {
      world.bullets.splice(i, 1);
      truck.hp -= b.damage;
    }
  }
  const p = world.player;
  if (p.inCar && p.car && armored.ramTimer <= 0
    && Math.hypot(p.car.x - truck.x, p.car.y - truck.y) < 48 && Math.abs(p.car.speed) > 80) {
    armored.ramTimer = 1;
    truck.hp -= 15;
    p.car.speed *= 0.6;
    world.shake = Math.max(world.shake, 6);
    world.events.crash = true;
  }
  if (truck.hp <= 0) {
    armored.truck = null;
    armored.cooldown = ARMORED_RESPAWN;
    world.cash += ARMORED_HAUL;
    addWanted(world, 1);
    world.floaters.push({ x: truck.x, y: truck.y, value: `+$${ARMORED_HAUL}`, color: '#7be382', life: 1.4 });
    world.events.armoredHaul = { reward: ARMORED_HAUL };
    world.mission.dialogue = [`ARMORED TRUCK CRACKED — $${ARMORED_HAUL} haul. The heat is on you now.`];
    world.mission.dialogueTimer = 5;
  }
}
export function createPizza(city) {
  return {
    state: 'idle',
    shop: { x: city.roadsV[1], y: city.roadsH[2], label: 'Pizzeria' },
    dest: null,
    timer: 0,
    cooldown: 10,
  };
}
export function updatePizza(world, dt) {
  const pizza = world.pizza;
  if (!pizza) return;
  const p = world.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  if (pizza.state === 'idle') {
    if (pizza.cooldown > 0) { pizza.cooldown -= dt; return; }
    if (!p.inCar && !p.inBoat && Math.hypot(p.x - pizza.shop.x, p.y - pizza.shop.y) < 70) {
      pizza.dest = randomRoadSpot(world, 500);
      pizza.state = 'deliver';
      pizza.timer = PIZZA_TIME_LIMIT;
      world.mission.dialogue = [`PIZZA: Hot box in hand — deliver it in ${PIZZA_TIME_LIMIT}s for $${PIZZA_FARE}.`];
      world.mission.dialogueTimer = 4;
    }
    return;
  }
  pizza.timer -= dt;
  if (Math.hypot(px - pizza.dest.x, py - pizza.dest.y) < 70) {
    world.cash += PIZZA_FARE;
    world.events.pizzaPaid = { reward: PIZZA_FARE };
    world.floaters.push({ x: pizza.dest.x, y: pizza.dest.y, value: `+$${PIZZA_FARE}`, color: '#7be382', life: 1.4 });
    world.mission.dialogue = [`PIZZA: Delivered hot — $${PIZZA_FARE} earned.`];
    world.mission.dialogueTimer = 4;
    pizza.state = 'idle';
    pizza.dest = null;
    pizza.cooldown = 20;
  } else if (pizza.timer <= 0) {
    world.mission.dialogue = ['PIZZA: Too slow — cold pizza, no tip. The box is back at the shop.'];
    world.mission.dialogueTimer = 4;
    pizza.state = 'idle';
    pizza.dest = null;
    pizza.cooldown = 20;
  }
}
export function repairAtGarage(world) {
  const p = world.player;
  const g = world.city.garage;
  if (!p.inCar || !p.car) return 'far';
  if (Math.hypot(p.car.x - g.x, p.car.y - g.y) > 80) return 'far';
  if (!p.car.tiresPopped && (p.car.hp === undefined || p.car.hp >= maxCarHp(world))) return 'fine';
  if (world.cash < GARAGE_COST) return 'broke';
  world.cash -= GARAGE_COST;
  p.car.hp = maxCarHp(world);
  p.car.tiresPopped = false;
  world.events.repair = true;
  return 'ok';
}
export function maxCarHp(world) {
  return world.upgrades && world.upgrades.armor ? 150 : GARAGE_REPAIR;
}
export function nearGarage(world) {
  const p = world.player;
  const g = world.city.garage;
  const x = p.inCar && p.car ? p.car.x : p.x;
  const y = p.inCar && p.car ? p.car.y : p.y;
  return Math.hypot(x - g.x, y - g.y) <= 80;
}
export function garageHot(world) {
  if (!world.heat || !world.city) return false;
  const g = world.city.garage;
  const d = world.city.districts.findIndex((dist) => g.x >= dist.x && g.x < dist.x + dist.w);
  return d >= 0 && (world.heat[d] || 0) >= 60;
}
export function buyUpgrade(world, id) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return 'far';
  if (!nearGarage(world)) return 'far';
  if (garageHot(world)) return 'closed';
  if (world.upgrades && world.upgrades[id]) return 'owned';
  if (world.cash < def.cost) return 'broke';
  world.cash -= def.cost;
  if (!world.upgrades) world.upgrades = {};
  world.upgrades[id] = true;
  world.events.upgrade = true;
  world.mission.dialogue = [`Garage: ${def.name} fitted — $${def.cost}. ${def.desc}.`];
  world.mission.dialogueTimer = 5;
  return 'ok';
}
export function resprayAtGarage(world) {
  const p = world.player;
  const g = world.city.garage;
  if (!p.inCar || !p.car) return 'far';
  if (Math.hypot(p.car.x - g.x, p.car.y - g.y) > 80) return 'far';
  if (world.wanted < 1) return 'clean';
  if (world.cash < RESPRAY_COST) return 'broke';
  world.cash -= RESPRAY_COST;
  const choices = world.city.carColors.filter((c) => c !== p.car.color);
  const paint = choices.length ? world.rng.pick(choices) : '#37e0e6';
  p.car.color = paint;
  p.car.paint = paint;
  dropWanted(world, RESPRAY_STARS);
  world.events.repair = true;
  return 'ok';
}
export function claimPinkTaxi(world) {
  const car = world.player.car;
  if (!car || !car.pink || car.pinkClaimed) return false;
  car.pinkClaimed = true;
  world.cash += PINK_TAXI_REWARD;
  world.events.cash = true;
  world.mission.dialogue = [`PINK TAXI! The rarest cab in Neon Harbor — $${PINK_TAXI_REWARD} from the crew.`];
  world.mission.dialogueTimer = 5;
  return true;
}
export function updatePickups(world) {
  const p = world.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  for (const c of world.collectibles) {
    if (!c.taken && Math.hypot(px - c.x, py - c.y) < 34) {
      c.taken = true;
      world.cash += COLLECTIBLE_VALUE;
      world.events.collect = { x: c.x, y: c.y, value: COLLECTIBLE_VALUE };
      world.events.pickup = true;
    }
  }
  if (!p.inCar) {
    for (const pk of world.pickups) {
      if (!pk.taken && Math.hypot(p.x - pk.x, p.y - pk.y) < 30) {
        pk.taken = true;
        world.events.weaponPickup = pk.weapon;
        world.events.pickup = true;
      }
    }
  }
}
export function currentObjective(world) {
  const mission = world.mission;
  if (world.taxi && world.taxi.state === 'pickup') {
    return 'Taxi: pick up the waving fare';
  }
  if (world.taxi && world.taxi.state === 'dropoff') {
    return `Taxi: drop off the passenger — ${Math.max(0, world.taxi.timer).toFixed(0)}s left`;
  }
  if (world.pizza && world.pizza.state === 'deliver') {
    return `Pizza delivery: ${Math.max(0, world.pizza.timer).toFixed(0)}s left — $${PIZZA_FARE}`;
  }
  if (world.armored && world.armored.truck && !world.armored.truck.looted) {
    return 'Armored truck on the streets — crack it for $350';
  }
  if (world.race && world.race.active) {
    return world.race.bet
      ? `NIGHT RACE ($100 bet): checkpoint ${world.race.index + 1}/${world.race.points.length} — ${world.race.timer.toFixed(1)}s`
      : `Street race: checkpoint ${world.race.index + 1}/${world.race.points.length} — ${world.race.timer.toFixed(1)}s`;
  }
  if (mission.done) return 'Free roam — explore Neon Harbor';
  const def = MISSION_DEFS[mission.index];
  const n = `${mission.index + 1}/${MISSION_DEFS.length}`;
  if (mission.index === 5) {
    const done = (world.taxiFaresDone || 0) - (mission.count || 0);
    return `${n} Night Taxi: fares ${Math.min(2, done)}/2 — grab a cab`;
  }
  if (mission.index === 6) {
    return `${n} Vigilante Shift: survive ${Math.max(0, 60 - mission.timer).toFixed(0)}s at 3 stars`;
  }
  if (mission.index === 7) {
    return `${n} Courier Dash: drop ${mission.stage + 1}/3 — ${Math.max(0, (mission.limit || 150) - mission.timer).toFixed(0)}s left`;
  }
  if (mission.index === 9) {
    const got = world.collectibles.filter((c) => c.taken).length - (mission.count || 0);
    return `${n} Token Hunt: tokens ${Math.min(4, got)}/4`;
  }
  return `${n} ${def.title}: ${def.objective}`;
}
export { COLLECTIBLE_VALUE, RACE_REWARD };
