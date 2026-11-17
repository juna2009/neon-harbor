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
  maxStars: 6,
  decayDelay: 12,
  decayPerSecond: 0.5,
};
export const GARAGE_COST = 150;
export const GARAGE_REPAIR = 100;
export const UPGRADES = [
  { id: 'turbo', name: 'Dockside Turbo', cost: 400, desc: '+15% top speed, +10% acceleration' },
  { id: 'slicks', name: 'Harbor Slicks', cost: 300, desc: '+25% steering response' },
  { id: 'armor', name: 'Armored Hull', cost: 500, desc: 'Car takes half damage, +50 max health' },
  { id: 'ghost', name: 'Ghost Plates', cost: 350, desc: 'Wanted cools twice as fast; stealing stays unseen' },
  { id: 'cooler', name: 'Cooler Streets', cost: 300, desc: 'District heat builds half as fast, cools twice as fast' },
  { id: 'runflats', name: 'Run-Flat Tires', cost: 250, desc: 'Spike strips cannot pop your tires' },
];
export const RESPRAY_COST = 150;
export const RESPRAY_STARS = 1;
export const PINK_TAXI_REWARD = 1000;
export const UFO_HOUR = 3;
export const UFO_DURATION = 30;
export const TAXI_FARE = 120;
export const TAXI_TIME_LIMIT = 45;
export const ARMORED_HAUL = 350;
export const ARMORED_HP = 20;
export const ARMORED_RESPAWN = 90;
export const PIZZA_FARE = 150;
export const PIZZA_TIME_LIMIT = 60;
export const NIGHT_RACE_BET = 100;
export const NIGHT_RACE_PRIZE = 500;
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
export const RADIO_STATIONS = [
  { name: 'Harbor FM', tag: 'synthwave', bpm: 104, root: 45, scale: [0, 3, 5, 7, 10, 12, 15] },
  { name: 'Neon Nights', tag: 'chill', bpm: 82, root: 48, scale: [0, 2, 3, 7, 9, 12, 14] },
  { name: 'Dockside Drive', tag: 'drive', bpm: 122, root: 43, scale: [0, 3, 5, 6, 7, 10, 12] },
  { name: 'Bayview Static', tag: 'lofi', bpm: 96, root: 41, scale: [0, 3, 5, 7, 10, 12] },
];
export const MISSION_REWARDS = [250, 400, 350, 900, 1200, 240, 300, 450, 300, 200, 350, 600];
export const RACE_REWARD = 300;
export const COLLECTIBLE_COUNT = 12;
export const COLLECTIBLE_VALUE = 50;
