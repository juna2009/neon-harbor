// Neon Harbor — tuning constants, colours, weapons, radio stations and
// storage keys. One place for every number the rest of the game shares, so
// a balance change never means hunting through the simulation.
export const WORLD_W = 2560;
export const WORLD_H = 1920;
export const STEP = 1 / 60;
export const ROAD_W = 72;
export const BLOCK = 320;
export const BEST_KEY = 'neon-harbor-best-cash';
export const PROGRESS_KEY = 'neon-harbor-mission';
export const CHECKPOINT_KEY = 'neon-harbor-checkpoint';
export const SETTINGS_KEY = 'neon-harbor-settings';

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

// Weapons: name, damage per pellet, pellets per shot, spread (radians),
// fire interval, magazine size, starting reserve, bullet speed, colour.
export const WEAPONS = {
  pistol: {
    name: 'Pistol', damage: 1, pellets: 1, spread: 0.03,
    fireInterval: 0.22, mag: 24, reserve: 120, bulletSpeed: 760, color: '#ffd23e',
  },
  smg: {
    name: 'SMG', damage: 1, pellets: 1, spread: 0.09,
    fireInterval: 0.09, mag: 32, reserve: 160, bulletSpeed: 820, color: '#37e0e6',
  },
  shotgun: {
    name: 'Shotgun', damage: 1, pellets: 6, spread: 0.22,
    fireInterval: 0.85, mag: 6, reserve: 30, bulletSpeed: 640, color: '#ff9d4d',
  },
};
export const WEAPON_ORDER = ['pistol', 'smg', 'shotgun'];

export const CAR = {
  accel: 430,
  brake: 760,
  maxSpeed: 540,
  maxReverse: 170,
  turnRate: 2.7,
  grip: 3.2,
  health: 100,
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
  gunman: '#a33327',
};

// Procedural radio: three stations, each a tempo, a scale (semitone offsets
// from the root) and a bass pattern the synthwave sequencer plays.
export const RADIO_STATIONS = [
  { name: 'Harbor FM', tag: 'synthwave', bpm: 104, root: 45, scale: [0, 3, 5, 7, 10, 12, 15] },
  { name: 'Neon Nights', tag: 'chill', bpm: 82, root: 48, scale: [0, 2, 3, 7, 9, 12, 14] },
  { name: 'Dockside Drive', tag: 'drive', bpm: 122, root: 43, scale: [0, 3, 5, 6, 7, 10, 12] },
];

export const MISSION_REWARDS = [250, 400, 350, 900];
export const RACE_REWARD = 300;
export const COLLECTIBLE_COUNT = 12;
export const COLLECTIBLE_VALUE = 50;
