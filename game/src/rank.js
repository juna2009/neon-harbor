// rank.js — Rank + RP progression for Neon Harbor (R35-F5).
// Karimbu (#1) has rank + RP; we had only a display-only RESPECT tier
// derived from the mission count. This replaces it with real RP.
//
// RP is REAL, never decorative: it is derived every call from live game
// state that only gameplay can change — no counter of its own, no save,
// nothing to drift or fake:
//   * story missions: each completed mission pays its real $ reward / 10
//     as RP (MISSION_REWARDS in config.js: 250/400/350/900/1200/240/300/
//     450/300/200/350/600 -> 25/40/35/90/120/24/30/45/30/20/35/60 RP;
//     finale Rocket Heist $800 -> 80 RP). All 13 = 634 RP.
//   * Harbor Tokens: 25 RP each, 12 in the world = 300 RP max.
//   * Max RP = 934. A rank is earned only by playing: HARBOR KING needs
//     the finale + at least 9 tokens (634 + 9*25 = 859 >= 850).
// `done` is missionProgress().done (render.js): missions finished, 13
// when the finale is done. `collectibles` is st.collectibles (taken flag
// set only when Jax actually picks a token up in world.js).
// Pure functions — safe to call every HUD frame; F3's career.js is
// untouched, and nothing here writes game state.
export const TOKEN_RP = 25;
export const MISSION_RP = [25, 40, 35, 90, 120, 24, 30, 45, 30, 20, 35, 60, 80];
export const RANK_LADDER = [
  { name: 'ROOKIE', rp: 0 },
  { name: 'HUSTLER', rp: 100 },
  { name: 'STREET BOSS', rp: 250 },
  { name: 'HARBOR BOSS', rp: 450 },
  { name: 'KINGPIN', rp: 600 },
  { name: 'HARBOR KING', rp: 850 },
];
export function missionRp(done) {
  const n = Math.max(0, Math.min(13, done | 0));
  let rp = 0;
  for (let i = 0; i < n; i++) rp += MISSION_RP[i];
  return rp;
}
export function rankForRp(rp) {
  let idx = 0;
  for (let i = 0; i < RANK_LADDER.length; i++) if (rp >= RANK_LADDER[i].rp) idx = i;
  return idx;
}
// st: the HUD state object (missionDone, collectibles with .taken).
// Returns { rp, tokens, rank, rankIndex, next, into, need, frac, maxed }.
export function rankProgress(st) {
  const done = Math.max(0, Math.min(13, (st && st.missionDone) | 0));
  const list = (st && st.collectibles) || [];
  let tokens = 0;
  for (const k of list) if (k && k.taken) tokens++;
  const rp = missionRp(done) + tokens * TOKEN_RP;
  const rankIndex = rankForRp(rp);
  const cur = RANK_LADDER[rankIndex];
  const next = RANK_LADDER[rankIndex + 1] || null;
  const into = rp - cur.rp;
  const need = next ? next.rp - cur.rp : 0;
  return {
    rp, tokens, rank: cur.name, rankIndex,
    next: next ? next.name : null,
    into, need,
    frac: next ? Math.max(0, Math.min(1, into / need)) : 1,
    maxed: !next,
  };
}
