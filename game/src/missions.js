// Neon Harbor — the four chained story missions for Jax Marlowe, a driver
// for hire who gets pulled into the harbor crew's war. Each mission has a
// target marker, dialogue lines and a cash reward; finishing one unlocks
// the next, and finishing all four leaves the city in free roam.
import { MISSION_REWARDS } from './config.js';
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
    }
    if (mission.stage === 1 && near(world, docksTarget(city), 90)) completeMission(world);
  } else if (mission.index === 1) {
    if (mission.stage === 0 && near(world, plazaTarget(city), 60)) {
      mission.stage = 1;
      mission.target = marinaTarget(city);
      mission.dialogue = ['Package secured. Now the marina, north-east corner.'];
      mission.dialogueTimer = 4;
      world.events.pickup = true;
    }
    if (mission.stage === 1 && near(world, marinaTarget(city), 90)) completeMission(world);
  } else if (mission.index === 2) {
    if (world.wanted <= 0) completeMission(world);
  } else if (mission.index === 3) {
    if (mission.stage === 0 && mission.timer > 30) {
      mission.stage = 1;
      mission.dialogue = ['MARA: That was all of them. The boat is waiting!'];
      mission.dialogueTimer = 5;
    }
    if (mission.stage === 1 && near(world, docksTarget(city), 90)) completeMission(world);
  }
}

export function currentObjective(world) {
  const mission = world.mission;
  if (mission.done) return 'Free roam — explore Neon Harbor';
  const def = MISSION_DEFS[mission.index];
  return `${def.title}: ${def.objective}`;
}
