const F = (m) => 440 * 2 ** ((m - 69) / 12);
function note(c, o, f, t, d, w, v, s) {
  try {
    const a = c.createOscillator(), g = c.createGain();
    a.type = w; a.frequency.setValueAtTime(f, t);
    if (s) a.frequency.exponentialRampToValueAtTime(Math.max(20, s), t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    a.connect(g).connect(o); a.start(t); a.stop(t + d + 0.02);
  } catch {}
}
function hat(c, o, t, v) {
  try {
    const n = c.sampleRate * 0.04 | 0, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = b;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(); g.gain.value = v;
    s.connect(f).connect(g).connect(o); s.start(t);
  } catch {}
}
const LOOPS = [
  { n: 'Harbor FM', bpm: 104, r: 45, s: [0, 3, 5, 7, 10, 12, 15], cr: [0, 3, 5, 3], b: 2, bd: .22, bv: .1, bw: 'sawtooth', a: 1, lw: 'triangle', lv: .05, h: 2, ho: 1, hv: .05 },
  { n: 'Neon Nights', bpm: 82, r: 48, s: [0, 2, 3, 7, 9, 12, 14], cr: [0, 5, 3, 5], b: 8, bd: .5, bv: .07, bw: 'sine', a: 4, lw: 'triangle', lv: .035, h: 4, ho: 3, hv: .03, sw: 1 },
  { n: 'Dockside Drive', bpm: 122, r: 43, s: [0, 3, 5, 6, 7, 10, 12], cr: [0, 0, 3, 5], b: 2, bd: .2, bv: .11, bw: 'square', a: 2, lw: 'square', lv: .06, h: 1, ho: 0, hv: .04 },
  { n: 'Bayview Static', bpm: 96, r: 41, s: [0, 2, 3, 5, 7, 9, 10, 12], cr: [0, 3, 5, 3], b: 2, bd: .3, bv: .08, bw: 'triangle', a: 4, lw: 'sine', lv: .04, h: 2, ho: 1, hv: .035, sw: 1, wk: [0, 2, 3, 5, 7, 5, 3, 2], st: 1 },
];
function step(c, o, L, s, t, sd) {
  const bar = (s >> 4) % 4, rt = L.r + L.s[L.cr[bar] % L.s.length];
  const tt = t + (L.sw && s % 2 ? sd * 0.3 : 0);
  if (s % L.b === 0) note(c, o, F(rt + L.s[(L.wk ? L.wk[(s / 2) % 8] : 0) % L.s.length]), tt, L.bd, L.bw, L.bv);
  if (s % L.a === 0) note(c, o, F(L.r + 24 + L.s[(s * 3 + bar) % L.s.length]), tt, .12, L.lw, L.lv);
  if (s % L.h === L.ho) hat(c, o, tt, L.hv);
  const pad = s % 16 === 0, stb = L.st && (s % 16 === 4 || s % 16 === 12);
  if (pad || stb) for (const d of pad ? [0, 2, 4] : [0, 2, 4, 6]) note(c, o, F(L.r + 12 + L.s[d % L.s.length]), tt, pad ? 1.4 : .25, pad ? 'sine' : 'triangle', pad ? .03 : .045);
}
const JINGLES = {
  mission: { w: 'triangle', v: .15, n: [[72, 0, .16], [76, .11, .16], [79, .22, .16], [84, .33, .22], [88, .44, .4]] },
  wanted: { w: 'sawtooth', v: .13, n: [[58, 0, .6, 55], [63, .7, .8, 68]] },
  busted: { w: 'sawtooth', v: .11, n: [[57, 0, .4], [50, .7, .4], [45, 1.05, .8]] },
  wasted: { w: 'sawtooth', v: .12, n: [[52, 0, .5], [45, .8, .5], [40, 1.2, 1.2]] },
  blackout: { w: 'triangle', v: .07, n: [[41, 0, 2.8, 36, 'sine', .16], [56, .3, .4], [55, 1, .4]] },
  cash: { w: 'triangle', v: .14, n: [[88, 0, .1], [95, .09, .25]] },
};
export function createMusic(ctx, dest) {
  let timer = null, stepN = 0, next = 0, idx = 0;
  const out = dest || (ctx && ctx.destination);
  const sel = (i) => { idx = ((i % 4) + 4) % 4; };
  function tick() {
    if (!ctx) return;
    const L = LOOPS[idx], sd = 60 / L.bpm / 4;
    while (next < ctx.currentTime + 0.25) {
      step(ctx, out, L, stepN % 64, next, sd);
      next += sd; stepN++;
    }
  }
  return {
    startLoop(i) {
      if (typeof i === 'number') sel(i);
      if (!ctx || timer) return;
      next = ctx.currentTime + 0.05; stepN = 0;
      timer = setInterval(tick, 90);
    },
    stopLoop() { if (timer) { clearInterval(timer); timer = null; } },
    setLoop(i) { sel(i); stepN = 0; return LOOPS[idx].n; },
    jingle(name) {
      const j = JINGLES[name];
      if (!j || !ctx) return false;
      const t0 = ctx.currentTime + 0.02;
      for (const [m, d, du, s = 0, w = j.w, v = j.v] of j.n) note(ctx, out, F(m), t0 + d, du, w, v, s ? F(s) : 0);
      return true;
    },
  };
}
