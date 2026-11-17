// Neon Harbor — tuning constants, colours and storage keys.
// One place for every number the rest of the game shares, so a balance
// change never means hunting through the simulation.
export const WORLD_W = 2560;
export const WORLD_H = 1920;
export const STEP = 1 / 60;
export const ROAD_W = 72;
export const BLOCK = 320;
export const BEST_KEY = 'neon-harbor-best-cash';
export const PROGRESS_KEY = 'neon-harbor-mission';

export const PLAYER = {
  radius: 14,
  walkSpeed: 175,
  runSpeed: 265,
  health: 100,
  pistolAmmo: 24,
  pistolReserve: 120,
  bulletSpeed: 760,
  fireInterval: 0.22,
};

export const CAR = {
  accel: 430,
  brake: 760,
  maxSpeed: 540,
  maxReverse: 170,
  turnRate: 2.7,
  grip: 3.2,
};

export const WANTED = {
  maxStars: 5,
  decayDelay: 12,
  decayPerSecond: 0.5,
};

export const COLORS = {
  grass: '#2e6b3a',
  grassDark: '#276031',
  sidewalk: '#9aa0a8',
  road: '#33373d',
  roadLine: '#e8d44d',
  water: '#1d6f9e',
  waterDeep: '#155a82',
  park: '#3f8f4f',
  tree: '#1f5c2e',
  player: '#ffd23e',
  playerCar: '#e33e5f',
  policeCar: '#2f6fd0',
  police: '#2f6fd0',
  ped: '#e8e4d8',
  neonPink: '#ff4d9d',
  neonCyan: '#37e0e6',
  neonYellow: '#ffd23e',
  cash: '#7be382',
};

export const MISSION_REWARDS = [250, 400, 350, 900];
