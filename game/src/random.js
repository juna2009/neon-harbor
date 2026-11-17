// Neon Harbor — seeded RNG — mulberry32 — replays seeds — pick.
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function range(min, max) {
    return min + next() * (max - min);
  }
  function int(min, max) {
    return Math.floor(range(min, max + 1));
  }
  function pick(list) {
    return list[Math.floor(next() * list.length)];
  }
  function chance(p) {
    return next() < p;
  }
  function shuffle(list) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(next() * (i + 1));
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }
  function weighted(pairs) {
    let total = 0;
    for (const [, w] of pairs) total += w;
    let roll = next() * total;
    for (const [value, w] of pairs) {
      roll -= w;
      if (roll <= 0) return value;
    }
    return pairs[pairs.length - 1][0];
  }
  function bell() {
    return (next() + next() + next()) / 3;
  }
  return { next, range, int, pick, chance, shuffle, weighted, bell };
}
