import { drawChase3D, drawCity3DFrame, resetChaseCam } from './city3d.js';
export function createCinematic() {
  let t = 0, ts = 1, bar = 0, barT = 0;
  let pT = 0, pD = 1, pA = 0, sT = 0, sD = 1, sS = 0.35;
  const L = [];
  let vg = null, vw = 0, vh = 0;
  const cl = (v, a, b) => v < a ? a : v > b ? b : v;
  const punch = (a = 0.22, d = 0.5) => { pA = a; pD = d; pT = d; };
  const shake = (a, d = 0.6) => { L.push({ a, f: 28 + Math.random() * 22, p: Math.random() * 6, d: 3 / d }); };
  const slowmo = (s = 0.35, d = 0.4) => { sS = s; sD = d; sT = d; };
  const bars = (on) => { barT = on ? 1 : 0; };
  function update(dt, ev = {}, env = {}) {
    t += dt;
    if (ev.shot) shake(2, 0.25);
    if (ev.crash) shake(7, 0.5);
    if (ev.explosion) { shake(16, 0.9); punch(0.25, 0.6); slowmo(0.35, 0.4); }
    if (ev.jump) { slowmo(0.4, 0.4); punch(0.12, 0.4); }
    if (ev.mission) punch(0.18, 0.8);
    if (ev.dialogue === true) barT = 1;
    else if (ev.dialogue === false) barT = 0;
    if (ev.busted || ev.wasted) { slowmo(0.3, 0.8); barT = 1; }
    pT = Math.max(0, pT - dt);
    sT = Math.max(0, sT - dt);
    const tgt = sT > 0 ? sS : 1;
    ts += (tgt - ts) * Math.min(1, dt * 12);
    bar += (barT - bar) * Math.min(1, dt * 2.5);
    let sx = 0, sy = 0;
    for (let i = L.length - 1; i >= 0; i -= 1) {
      const l = L[i];
      l.a *= Math.exp(-l.d * dt);
      if (l.a < 0.2) { L.splice(i, 1); continue; }
      sx += l.a * Math.sin(t * l.f + l.p);
      sy += l.a * Math.cos(t * l.f * 0.9 + l.p);
    }
    const dl = env.daylight ?? 1;
    let warm = cl(1 - Math.abs(dl - 0.7) / 0.15, 0, 1) * 0.8;
    let cool = cl((0.35 - dl) / 0.35, 0, 1);
    if (env.district === 'harbor') cool += 0.2;
    else if (env.district === 'oldtown') warm += 0.2;
    else if (env.district === 'downtown') cool += 0.1;
    if (env.blackout) { cool = 1; warm = 0; }
    return { zoom: 1 + pA * (pT / pD) * (pT / pD), sx, sy, ts, bar, warm: cl(warm, 0, 1), cool: cl(cool, 0, 1) };
  }
  function drawBars(ctx, w, h) {
    if (bar < 0.01) return;
    const bh = bar * h * 0.09;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, bh);
    ctx.fillRect(0, h - bh, w, bh);
  }
  function drawGrade(ctx, w, h, warm, cool) {
    if (w !== vw || h !== vh) {
      vw = w; vh = h;
      vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.72);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    }
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
    if (warm > 0.01) { ctx.fillStyle = `rgba(255,140,60,${(warm * 0.07).toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
    if (cool > 0.01) { ctx.fillStyle = `rgba(70,120,255,${(cool * 0.07).toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
  }
  function title3D(ctx, t) { drawCity3DFrame(ctx, t); }
  function chase3D(ctx, state) { drawChase3D(ctx, state); }
  function chaseReset() { resetChaseCam(); }
  return { punch, shake, slowmo, bars, update, drawBars, drawGrade, title3D, chase3D, chaseReset };
}
