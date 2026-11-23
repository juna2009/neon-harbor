// crew.js — R35-F1: Harbor Crew abilities (Neon Harbor vs Karimbu's crew).
// Post-cut module: imported ONLY by ui2.js (post-cut), so it adds 0 bytes
// to the dossier text. Node-safe: all window access is guarded, so the
// headless engine tests can import it too.
// Crew (Karimbu has Mira driver / Lio mechanic / Kiki lookout — ours match
// the same three roles, with real gameplay effects, not labels):
//   JAX  — DRIVER:  +8% top speed, +15% steering response (world.js driveCar
//          reads car.crew; hook is one factor on topSpeed + one on steerFactor).
//   MARA — LOOKOUT: district heat builds 1/2 as fast (world.js heat-gain
//          hook reads p.crew) + early police warning in the HUD (below).
//   RENO — MECHANIC: garage upgrades -25% (UPGRADES costs rewritten in place
//          here, so drawShop2 shows AND buyUpgrade charges the discount) +
//          garage repair $150 -> $113 (missions.js repairAtGarage hook).
import { UPGRADES } from './config.js';

export const CREW = [
  { id: 'jax', name: 'JAX', role: 'DRIVER', blurb: '+8% top speed · +15% steering', color: '#37e0e6' },
  { id: 'mara', name: 'MARA', role: 'LOOKOUT', blurb: 'Heat builds 1/2x · police early warning', color: '#ff4d9d' },
  { id: 'reno', name: 'RENO', role: 'MECHANIC', blurb: 'Garage -25% · repair $113', color: '#ffd23e' },
];
export const MECH_DISCOUNT = 0.75;
export function mechPrice(base) { return Math.round(base * MECH_DISCOUNT); }

let active = 'jax';
let baseCosts = null;

export function getActiveCrew() { return active; }
export function setActiveCrew(id) {
  if (CREW.some((m) => m.id === id)) active = id;
  return active;
}
export function activeCrewDef() { return CREW.find((m) => m.id === active) || CREW[0]; }

if (typeof window !== 'undefined') {
  // Staged shots / deep links: ?crew=mara|reno|jax preselects the member.
  try {
    const q = new URLSearchParams(window.location.search).get('crew');
    if (q) setActiveCrew(q);
  } catch { /* ignore */ }
  // B cycles the crew, 1/2/3 select directly. B is unbound in the game
  // (drive WASD, E interact, Q weapon, C radio, R reload, M mute, G repair,
  // U shop, F horn, Shift handbrake; V is the 3D/2D view toggle — R35-F1
  // first used V and it fought the view toggle, so crew moved to B).
  // Ignore repeats so holding B does not spin through the roster. Guarded
  // so headless Node imports stay safe.
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyB') {
        const i = CREW.findIndex((m) => m.id === active);
        active = CREW[(i + 1) % CREW.length].id;
      } else if (e.code === 'Digit1') active = 'jax';
      else if (e.code === 'Digit2') active = 'mara';
      else if (e.code === 'Digit3') active = 'reno';
    });
  }
}

// Called every frame from drawHud2 / drawShop2 (ui2.js). Syncs the active
// member onto the shared player object (counted code reads p.crew for the
// heat + repair hooks and car.crew for the drive hooks) and applies Reno's
// real garage discount: UPGRADES costs are rewritten in place, so the shop
// DISPLAYS the discounted price and buyUpgrade CHARGES it (same object).
// Restores base costs the moment Reno is no longer active.
export function applyCrew(st) {
  const p = st && st.player;
  if (p) {
    p.crew = active;
    if (p.car) p.car.crew = active;
  }
  if (!baseCosts) baseCosts = UPGRADES.map((u) => u.cost);
  const reno = active === 'reno';
  for (let i = 0; i < UPGRADES.length; i += 1) {
    UPGRADES[i].cost = reno ? Math.round(baseCosts[i] * MECH_DISCOUNT) : baseCosts[i];
  }
  return { active, reno };
}

// Mara early warning: distance (u) to the nearest live police unit, or null
// when Mara is not the active member / no unit is out. The HUD shows this
// BEFORE the units reach the player — that is the lookout's edge.
export function policeWarning(st) {
  if (active !== 'mara') return null;
  const units = st && st.police && st.police.units;
  const p = st && st.player;
  if (!units || !units.length || !p) return null;
  let best = null;
  for (const u of units) {
    const c = u.car || u;
    if (!c || c.x === undefined || c.y === undefined) continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (best === null || d < best) best = d;
  }
  return best === null ? null : Math.round(best);
}
