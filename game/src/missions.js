// Neon Harbor — the five chained story missions for Jax Marlowe, a driver
// for hire who gets pulled into the harbor crew's war. Each mission has a
// target marker, dialogue lines and a cash reward; finishing one unlocks
// the next, and finishing all five leaves the city in free roam. Missions
// save a checkpoint at every stage, so Busted/Wasted resumes mid-mission
// instead of from the start. Side activities run alongside the story: a
// street race around Downtown, harbor tokens hidden around the city,
// weapon pickups (SMG at the plaza, shotgun at the docks), taxi fares for
// quick cash, a garage that repairs a battered car for $150 — or resprays
// it for $150 to drop one wanted star — and a bubblegum-pink taxi worth
// $1,000 to the crew if Jax steals it.
//
// The story twist: Mara is the police commissioner's daughter. She tipped
// off the police in mission 3 ("Lose the Heat" was her setup, not bad
// luck) to protect Jax from a crew that was going to kill him. In the
// finale she flips: she helps Jax rob the police evidence vault for the
// ledger that proves her father is corrupt.
import { CHECKPOINT_KEY, COLLECTIBLE_COUNT, COLLECTIBLE_VALUE, GARAGE_COST, MISSION_REWARDS, PINK_TAXI_REWARD, RACE_REWARD, RESPRAY_COST, RESPRAY_STARS, TAXI_FARE, TAXI_TIME_LIMIT } from './config.js';
import { addWanted, clearPolice, dropWanted, spawnPoliceUnit } from './police.js';

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
function casinoTarget(city) {
  return { x: city.casino.x, y: city.casino.y, label: 'Casino' };
}
// The finale's target is the police evidence vault — the same Downtown
// tower as the old casino stash, retargeted for the heist against Mara's
// father. One objective change, same building, new story.
function vaultTarget(city) {
  return { x: city.casino.x, y: city.casino.y, label: 'Evidence Vault' };
}
function lighthouseTarget(city) {
  return { x: city.lighthouse.x, y: city.lighthouse.y, label: 'Lighthouse' };
}

/** The target a mission/stage should point at (used by start + resume). */
export function targetForMission(city, index, stage) {
  if (index === 0) return docksTarget(city);
  if (index === 1) return stage === 0 ? plazaTarget(city) : marinaTarget(city);
  if (index === 2) return null;
  if (index === 3) return docksTarget(city);
  if (index === 4) return stage === 0 ? vaultTarget(city) : lighthouseTarget(city);
  return null;
}

/** Save a mid-mission checkpoint (stage + player spot + cash + wanted + tokens). */
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
  };
  mission.checkpoint = cp;
  try {
    window.localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
  } catch {
    // Storage can be off; the checkpoint then lasts this visit only.
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
    // Ignore.
  }
}

/** Street race: five checkpoints in a loop around Downtown. */
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
  };
}

/** Twelve harbor tokens hidden at seeded spots: parks, docks, marina. */
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

/** Weapon pickups: SMG at the plaza, shotgun at the docks, ammo at the marina. */
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
  }
  saveCheckpoint(world, `${def.title} — start`);
}

function completeMission(world) {
  const mission = world.mission;
  const def = MISSION_DEFS[mission.index];
  world.cash += def.reward;
  world.events.missionComplete = def;
  mission.dialogue = [`${def.title} complete — $${def.reward} earned.`];
  mission.dialogueTimer = 4;
  mission.target = null;
  if (mission.index === 4) {
    mission.done = true;
    world.gunmen = 0;
    clearPolice(world.police);
    mission.dialogue = ['The harbor keeps its secrets. So do we.', 'MARA: The ledger is ours. We are free now.'];
    mission.dialogueTimer = 8;
    clearCheckpoint();
  } else {
    mission.index += 1;
    mission.stage = 0;
    mission.started = false;
  }
  try {
    window.localStorage.setItem('neon-harbor-mission', String(mission.index));
  } catch {
    // Storage can be off; progress then lasts this visit only.
  }
}

function near(world, target, radius) {
  const p = world.player;
  const x = p.inCar ? p.car.x : p.x;
  const y = p.inCar ? p.car.y : p.y;
  return Math.hypot(x - target.x, y - target.y) < radius;
}

/** Advance the active mission; call every step while playing. */
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
    // The ambush ends when the crew is down — or after 30 s at the latest.
    if (mission.stage === 0 && (world.gunmen <= 0 || mission.timer > 30)) {
      mission.stage = 1;
      mission.dialogue = ['MARA: That was all of them. The boat is waiting!'];
      mission.dialogueTimer = 5;
      saveCheckpoint(world, 'Harbor Showdown — crew down');
    }
    if (mission.stage === 1 && near(world, docksTarget(city), 90)) completeMission(world);
  } else if (mission.index === 4) {
    if (mission.stage === 0 && near(world, vaultTarget(city), 90)) {
      mission.stage = 1;
      mission.target = lighthouseTarget(city);
      mission.dialogue = ['Ledger secured. Now the lighthouse, east end of the docks.'];
      mission.dialogueTimer = 4;
      world.events.pickup = true;
      saveCheckpoint(world, 'The Last Run — ledger grabbed');
    }
    if (mission.stage === 1 && near(world, lighthouseTarget(city), 90)) completeMission(world);
  }
}

/** Advance the street race; call every step while playing. */
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
      world.events.raceStart = true;
      world.mission.dialogue = ['RACE: Five checkpoints around Downtown. Fastest wins $300.'];
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
      world.cash += RACE_REWARD;
      world.events.raceWin = { time, reward: RACE_REWARD };
      world.mission.dialogue = [`RACE WON in ${time.toFixed(1)}s — $${RACE_REWARD} earned.`];
      world.mission.dialogueTimer = 5;
    }
  }
}

/** Taxi side job: drive to the waving fare, then to their destination. */
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
    // A fare waves only when Jax is driving a cab — a sedan driver
    // never gets hijacked by taxi dialogue mid-mission or mid-chase.
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

/**
 * Repair the player's car at the garage bay: $150 restores it to full
 * health and pops the tires back on. Returns 'ok', 'broke', 'fine' or 'far'.
 */
export function repairAtGarage(world) {
  const p = world.player;
  const g = world.city.garage;
  if (!p.inCar || !p.car) return 'far';
  if (Math.hypot(p.car.x - g.x, p.car.y - g.y) > 80) return 'far';
  if (!p.car.tiresPopped && (p.car.hp === undefined || p.car.hp >= GARAGE_REPAIR)) return 'fine';
  if (world.cash < GARAGE_COST) return 'broke';
  world.cash -= GARAGE_COST;
  p.car.hp = GARAGE_REPAIR;
  p.car.tiresPopped = false;
  world.events.repair = true;
  return 'ok';
}

/**
 * Respray the player's car at the garage bay: $150 for a fresh paint
 * job, and the heat drops by one star — new colour, new plate, cooler
 * trail. Returns 'ok', 'broke', 'clean' (no heat to lose) or 'far'.
 */
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

/** The pink-taxi bounty: stealing the bubblegum-pink cab pays $1,000. */
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

/** Collect harbor tokens and weapon pickups the player walks or drives over. */
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
  if (world.race && world.race.active) {
    return `Street race: checkpoint ${world.race.index + 1}/${world.race.points.length} — ${world.race.timer.toFixed(1)}s`;
  }
  if (mission.done) return 'Free roam — explore Neon Harbor';
  const def = MISSION_DEFS[mission.index];
  return `${def.title}: ${def.objective}`;
}

export { COLLECTIBLE_VALUE, RACE_REWARD };
