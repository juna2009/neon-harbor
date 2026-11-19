// game/src/districts.js — R35-F2: District Standing (7 districts).
// Karimbu (rank #1) has district standing over 7 districts; Neon Harbor
// only had the 3 city.js bands + heat. This module splits the same map
// into 7 named districts WITHOUT touching city.js: the 3 x-bands
// (Old Town x<1120, Downtown x<1760, Harbor) are each split North/South
// at y=960, and the eastern waterfront strip (x>=2280: marina, docks,
// lighthouse) is its own district.
//   0 Old Town North   1 Old Town South   2 Downtown North  3 Downtown South
//   4 Harbor North     5 Harbor South     6 Marina Waterfront
// Standing is a score per district (-100..100): >=30 FRIENDLY, <=-30
// WARY, else NEUTRAL. Missions completed in a district raise it (+12);
// wanted gained in a district lowers it (-6 per star). Standing is REAL:
//   - police: Friendly districts answer SLOW (spawnTimer held >=2.2s,
//     roadblocks held back >=8s); Wary districts answer FAST (spawnTimer
//     forced <=0.45s). Applied per frame from the post-cut HUD layer,
//     which shares the live police object — police.js is never edited.
//   - garage: prices in the garage's district (Old Town South) are
//     x0.8 Friendly / x1.25 Wary. Applied by a 2-line hook in
//     missions.js buyUpgrade via city.districtPrice (attached here).
// Post-cut module: imported ONLY from minimap.js (which is itself past
// the dossier cut, so this file costs 0 dossier bytes). State lives in a
// WeakMap keyed by the city object: drawHud2/drawShop2 pass a SPREAD of
// the world state, so hanging the store on the state object itself would
// be lost every frame — city is the one stable shared reference.
// Demo: ?districts=demo seeds a spread (Friendly Old Town North +
// Harbor North, Wary Downtown South + Marina) so the tints + panel are
// visible in a staged screenshot without playing a mission.
export const DISTRICT7 = [
  { name: 'Old Town North', short: 'OT-N', x: 0, y: 0, w: 1120, h: 960 },
  { name: 'Old Town South', short: 'OT-S', x: 0, y: 960, w: 1120, h: 960 },
  { name: 'Downtown North', short: 'DT-N', x: 1120, y: 0, w: 640, h: 960 },
  { name: 'Downtown South', short: 'DT-S', x: 1120, y: 960, w: 640, h: 960 },
  { name: 'Harbor North', short: 'HB-N', x: 1760, y: 0, w: 520, h: 960 },
  { name: 'Harbor South', short: 'HB-S', x: 1760, y: 960, w: 520, h: 960 },
  { name: 'Marina Waterfront', short: 'MRN', x: 2280, y: 0, w: 168, h: 1920 },
];
export const DEMO_SCORES = [45, -10, 10, -55, 0, 35, -40];
export function district7At(x, y) {
  if (x >= 2280) return 6;
  const band = x < 1120 ? 0 : x < 1760 ? 2 : 4;
  return band + (y >= 960 ? 1 : 0);
}
export function standingLabel(score) {
  return score >= 30 ? 'FRIENDLY' : score <= -30 ? 'WARY' : 'NEUTRAL';
}
export function standingColor(score) {
  return score >= 30 ? '#2fbf71' : score <= -30 ? '#ff5a3c' : '#ffd23e';
}
export function priceMult(score) {
  return score >= 30 ? 0.8 : score <= -30 ? 1.25 : 1;
}
export function garageDistrict(state) {
  const g = state && state.city && state.city.garage;
  return g ? district7At(g.x, g.y) : 1;
}
const stores = new WeakMap();
const fallback = { scores: [0, 0, 0, 0, 0, 0, 0], lastWanted: 0, lastMissionIndex: 0, lastMissionDone: false, current: 2, seeded: true };
function demoSeeded() {
  try {
    return typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('districts') === 'demo';
  } catch (e) { return false; }
}
export function ensureDistricts(state) {
  const city = state && state.city;
  if (!city) return fallback;
  let s = stores.get(city);
  if (!s) {
    s = { scores: [0, 0, 0, 0, 0, 0, 0], lastWanted: 0, lastMissionIndex: 0, lastMissionDone: false, current: 2, seeded: false };
    stores.set(city, s);
  }
  if (!s.seeded) {
    s.seeded = true;
    if (demoSeeded()) s.scores = DEMO_SCORES.slice();
    const m = state.mission;
    s.lastWanted = state.wanted || 0;
    s.lastMissionIndex = m ? m.index || 0 : 0;
    s.lastMissionDone = !!(m && m.done);
  }
  if (!city.districtPrice) {
    city.districtPrice = (base) => Math.round(base * priceMult(s.scores[garageDistrict(state)]));
    city.standing7 = s.scores;
  }
  return s;
}
export function currentDistrict(state) {
  const s = ensureDistricts(state);
  const p = state.player || { x: 1280, y: 960 };
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  s.current = district7At(px, py);
  return s.current;
}
export function districtPrice(state, base) {
  const s = ensureDistricts(state);
  return Math.round(base * priceMult(s.scores[garageDistrict(state)]));
}
export function garageStandingLine(state) {
  const s = ensureDistricts(state);
  const g = garageDistrict(state);
  const d = DISTRICT7[g];
  const lab = standingLabel(s.scores[g]);
  const pct = lab === 'FRIENDLY' ? ' −20% garage prices' : lab === 'WARY' ? ' +25% garage prices' : ' · garage prices normal';
  return d.name + ' · ' + lab + pct;
}
export function policeEffectLine(state) {
  const d = currentDistrict(state);
  const s = ensureDistricts(state);
  const lab = standingLabel(s.scores[d]);
  return DISTRICT7[d].name + ' · ' + lab + ' — PD ' + (lab === 'FRIENDLY' ? 'SLOW' : lab === 'WARY' ? 'FAST' : 'normal');
}
// Called once per rendered frame from drawMinimap (post-cut HUD layer).
// Observes mission/wanted transitions and applies the police response.
export function updateStanding(state) {
  if (!state || !state.player) return ensureDistricts(state);
  const s = ensureDistricts(state);
  const d = currentDistrict(state);
  const w = state.wanted || 0;
  if (w > s.lastWanted) s.scores[d] = Math.max(-100, s.scores[d] - (w - s.lastWanted) * 6);
  s.lastWanted = w;
  const m = state.mission;
  if (m) {
    if ((m.index || 0) > s.lastMissionIndex) {
      s.scores[d] = Math.min(100, s.scores[d] + 12);
      s.lastMissionIndex = m.index || 0;
    }
    if (m.done && !s.lastMissionDone) s.scores[d] = Math.min(100, s.scores[d] + 12);
    s.lastMissionDone = !!m.done;
  }
  const pol = state.police;
  if (pol && w >= 1) {
    const lab = standingLabel(s.scores[d]);
    if (lab === 'FRIENDLY') {
      pol.spawnTimer = Math.max(pol.spawnTimer, 2.2);
      pol.roadblockTimer = Math.max(pol.roadblockTimer, 8);
    } else if (lab === 'WARY') {
      pol.spawnTimer = Math.min(pol.spawnTimer, 0.45);
    }
  }
  return s;
}
