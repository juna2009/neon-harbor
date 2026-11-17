// Neon Harbor — the four chained story missions for Jax Marlowe, a driver
// for hire who gets pulled into the harbor crew's war. Each mission has a
// target marker, dialogue lines and a cash reward; finishing one unlocks
// the next, and finishing all four leaves the city in free roam. Missions
// save a checkpoint at every stage, so Busted/Wasted resumes mid-mission
// instead of from the start. Side activities run alongside the story: a
// street race around Downtown, harbor tokens hidden around the city, and
// weapon pickups (SMG at the plaza, shotgun at the docks).
import { CHECKPOINT_KEY, COLLECTIBLE_COUNT, COLLECTIBLE_VALUE, MISSION_REWARDS, RACE_REWARD } from './config.js';
import { addWanted, clearPolice, spawnPoliceUnit } from './police.js';

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
    brief: 'The delivery was flagged. The police are all over the harbor.',
    objective: 'Lose the heat — get your wanted level back to 0',
    reward: MISSION_REWARDS[2],
    dialogue: [
      'MARA: The marina cameras caught your plate. Lay low, Jax.',
      'MARA: Stay out of trouble until the heat dies down.',
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

/** Save a mid-mission checkpoint (stage + player spot + cash). */
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
    if (rng.chance(0.25)) spots.push({ x: pt.x + 52, y: pt.y + 52 });
  }
  const picked = rng.shuffle(spots).slice(0, COLLECTIBLE_COUNT);
  return picked.map((s) => ({ x: s.x, y: s.y, taken: false }));
}

/** Weapon pickups: SMG at the plaza, shotgun at the docks, ammo at the marina. */
export function createWeaponPickups(city) {
  return [
    { x: city.roadsV[2] + 52, y: city.roadsH[1] + 52, weapon: 'smg', taken: false },
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
  if (mission.index === 3) {
    mission.done = true;
    world.gunmen = 0;
    clearPolice(world.police);
    mission.dialogue = ['MARA: We made it, Jax. Neon Harbor is ours now.', 'Free roam — the city is yours.'];
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
  if (world.race && world.race.active) {
    return `Street race: checkpoint ${world.race.index + 1}/${world.race.points.length} — ${world.race.timer.toFixed(1)}s`;
  }
  if (mission.done) return 'Free roam — explore Neon Harbor';
  const def = MISSION_DEFS[mission.index];
  return `${def.title}: ${def.objective}`;
}

export { COLLECTIBLE_VALUE, RACE_REWARD };
