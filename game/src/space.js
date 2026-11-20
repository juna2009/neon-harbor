// Harbor Aerospace — spaceport + rocket plane (Neon Harbor, post-cut module).
// Pure Canvas 2D, no libraries. All content is our own: "Harbor Aerospace",
// rocket plane HA-1 "Kestrel", mission 13 "Rocket Heist" ($800).
import { WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';
import { addWanted } from './police.js';

export const ROCKET_PLANE_REWARD = 800;
export const PLANE_MAX_SPEED = 720;
export const PLANE_MAX_ALT = 340;

// Spaceport occupies the easternmost land block (Harbor district).
// Runway runs north-south; takeoff heading is north (angle -PI/2).
export const SPACEPORT = {
  x: 2080, y: 480, w: 320, h: 320,
  runway: { x: 2220, y: 520, w: 80, h: 260 },
  hangar: { x: 2116, y: 640, w: 100, h: 80 },
  pad: { x: 2328, y: 548, r: 32 },
  tower: { x: 2120, y: 520, w: 36, h: 36 },
  tanks: [{ x: 2344, y: 700, r: 16 }, { x: 2344, y: 744, r: 16 }],
  planePark: { x: 2204, y: 680, angle: 0 },
  gate: { x: 2080, y: 640 },
};

export const SPACE_MISSION_DEF = {
  title: 'Rocket Heist',
  brief: 'Day 3 — Harbor Aerospace is rolling a rocket plane out of its hangar tonight. Steal it, get it in the air, and bring it down in one piece. The whole Harbor Air Force will be on you.',
  objective: 'Steal the rocket plane, survive 45s in the air, then land it safe',
  reward: ROCKET_PLANE_REWARD,
  dialogue: [
    'MARA: Harbor Aerospace has a rocket plane in the hangar, east side. It flies, Jax. It really flies.',
    'MARA: Take it. The sky is the only place the cops cannot roadblock.',
  ],
};

export function createSpaceState() {
  return {
    plane: {
      x: SPACEPORT.planePark.x, y: SPACEPORT.planePark.y,
      angle: SPACEPORT.planePark.angle, speed: 0, alt: 0,
      throttle: 0, hp: 100, alive: true, airborne: false,
    },
    jets: [],
    jetTimer: 0,
    escapeTimer: 0,
    flame: 0,
  };
}

// Remove generated buildings/parks/trees inside the spaceport footprint.
// Mirrors the gas-station lot clearing in city.js. Call once after buildCity.
export function clearSpaceport(city) {
  const r = SPACEPORT;
  const hit = (o) => o.x < r.x + r.w && o.x + (o.w || o.r || 0) > r.x
    && o.y < r.y + r.h && o.y + (o.h || o.r || 0) > r.y;
  for (const list of [city.buildings, city.parks, city.trees]) {
    for (let i = list.length - 1; i >= 0; i -= 1) if (hit(list[i])) list.splice(i, 1);
  }
}

export function overRunway(x, y) {
  const r = SPACEPORT.runway;
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
export function onWater(x, y) {
  return x > WATER_X + 8 && x < WORLD_W - 8 && y > 8 && y < WORLD_H - 8;
}
export function onRoadAt(city, x, y) {
  for (const rx of city.roadsV) if (Math.abs(x - rx) <= 36) return true;
  for (const ry of city.roadsH) if (Math.abs(y - ry) <= 36) return true;
  return false;
}
function nearPlane(state, x, y, d) {
  const p = state.space.plane;
  return p.alive && Math.hypot(p.x - x, p.y - y) < d;
}

// Board the rocket plane on foot (E). Returns true when boarded.
export function tryBoardPlane(world) {
  const p = world.player;
  if (p.inPlane || p.inCar || p.inBoat) return false;
  if (!nearPlane(world, p.x, p.y, 70)) return false;
  p.inPlane = true;
  p.plane = world.space.plane;
  return true;
}

// Step down from a landed plane (E). Returns true when exited.
export function exitPlane(world) {
  const p = world.player;
  const pl = world.space.plane;
  if (!p.inPlane || pl.alt > 8 || Math.abs(pl.speed) > 40) return false;
  p.inPlane = false;
  p.plane = null;
  p.x = pl.x + 40;
  p.y = pl.y + 40;
  return true;
}

function explodePlane(world) {
  const pl = world.space.plane;
  pl.alive = false;
  pl.hp = 0;
  for (let i = 0; i < 26; i += 1) {
    world.particles.push({
      x: pl.x + world.rng.range(-14, 14), y: pl.y + world.rng.range(-14, 14),
      vx: world.rng.range(-260, 260), vy: world.rng.range(-260, 260),
      life: world.rng.range(0.4, 0.9), maxLife: 0.9, size: world.rng.range(3, 7),
      color: world.rng.pick(['#ff9d4d', '#ffd23e', '#ff4d4d', '#e8e4d8']), kind: 'spark',
    });
  }
  world.floaters.push({ x: pl.x, y: pl.y - 30, text: 'HA-1 DOWN!', life: 2, color: '#ff8a7a' });
  const p = world.player;
  if (p.inPlane) {
    p.inPlane = false;
    p.plane = null;
    p.x = Math.max(40, Math.min(WORLD_W - 40, pl.x + 60));
    p.y = Math.max(40, Math.min(WORLD_H - 40, pl.y + 60));
    p.health = Math.max(25, p.health - 30);
  }
  // A fresh HA-1 rolls out of the hangar after a while.
  pl.respawn = 8;
}

function spawnJet(world) {
  const p = world.player;
  const a = world.rng.range(0, Math.PI * 2);
  const j = {
    x: Math.max(80, Math.min(WORLD_W - 80, p.x + Math.cos(a) * 520)),
    y: Math.max(80, Math.min(WORLD_H - 80, p.y + Math.sin(a) * 520)),
    angle: Math.atan2(p.y - (p.y + Math.sin(a) * 520), p.x - (p.x + Math.cos(a) * 520)),
    speed: 560, fireTimer: 1,
  };
  world.space.jets.push(j);
  world.floaters.push({ x: j.x, y: j.y - 20, text: 'HAF JET INBOUND', life: 2, color: '#ff8a7a' });
}

function stepJets(world, dt) {
  const s = world.space;
  const p = world.player;
  const pl = s.plane;
  for (const j of s.jets) {
    const want = Math.atan2(p.y - j.y, p.x - j.x);
    let d = want - j.angle;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    j.angle += Math.max(-1.6 * dt, Math.min(1.6 * dt, d));
    j.speed = Math.min(760, j.speed + 300 * dt);
    j.x += Math.cos(j.angle) * j.speed * dt;
    j.y += Math.sin(j.angle) * j.speed * dt;
    j.x = Math.max(40, Math.min(WORLD_W - 40, j.x));
    j.y = Math.max(40, Math.min(WORLD_H - 40, j.y));
    j.fireTimer -= dt;
    const dist = Math.hypot(p.x - j.x, p.y - j.y);
    if (dist < 320 && Math.abs(d) < 0.5 && j.fireTimer <= 0 && pl.alive) {
      j.fireTimer = 1.4;
      pl.hp -= 10;
      world.particles.push({
        x: j.x + Math.cos(j.angle) * 26, y: j.y + Math.sin(j.angle) * 26,
        vx: Math.cos(j.angle) * 420, vy: Math.sin(j.angle) * 420,
        life: 0.25, maxLife: 0.25, size: 5, color: '#ffd23e', kind: 'spark',
      });
      if (pl.hp <= 0) explodePlane(world);
    }
    if (world.rng.chance(0.6)) {
      world.particles.push({
        x: j.x - Math.cos(j.angle) * 24, y: j.y - Math.sin(j.angle) * 24,
        vx: -Math.cos(j.angle) * 60, vy: -Math.sin(j.angle) * 60,
        life: 0.3, maxLife: 0.3, size: 4, color: '#ff9d4d', kind: 'spark',
      });
    }
  }
}

// Plane physics + air police. Call every tick from the world step.
// input: the game's input object (moveX/moveY). Returns nothing.
export function stepSpace(world, dt, input) {
  const s = world.space;
  if (!s) return;
  const pl = s.plane;
  const p = world.player;
  if (!pl.alive) {
    pl.respawn = (pl.respawn || 0) - dt;
    if (pl.respawn <= 0) {
      pl.x = SPACEPORT.planePark.x; pl.y = SPACEPORT.planePark.y;
      pl.angle = SPACEPORT.planePark.angle; pl.speed = 0; pl.alt = 0;
      pl.throttle = 0; pl.hp = 100; pl.alive = true; pl.airborne = false;
    }
  }
  if (p.inPlane && pl.alive) {
    const steer = input ? input.moveX() : 0;
    const thr = input ? -input.moveY() : 0; // W = throttle up
    pl.throttle = Math.max(0, Math.min(1, pl.throttle + thr * dt * 0.9));
    if (pl.throttle > 0) pl.speed += pl.throttle * 460 * dt;
    pl.speed -= pl.speed * 0.22 * dt + (pl.alt > 0 ? 26 : 55) * dt;
    pl.speed = Math.max(0, Math.min(PLANE_MAX_SPEED, pl.speed));
    const turn = 2.3 * Math.max(0.25, Math.min(1, pl.speed / 150));
    pl.angle += steer * turn * dt;
    pl.x += Math.cos(pl.angle) * pl.speed * dt;
    pl.y += Math.sin(pl.angle) * pl.speed * dt;
    pl.x = Math.max(30, Math.min(WORLD_W - 30, pl.x));
    pl.y = Math.max(30, Math.min(WORLD_H - 30, pl.y));
    const wantAlt = pl.speed > 280 ? PLANE_MAX_ALT : pl.speed > 200 ? (pl.speed - 200) * 4.25 : 0;
    pl.alt += Math.max(-170 * dt, Math.min(130 * dt, wantAlt - pl.alt));
    pl.airborne = pl.alt > 100;
    // Ground handling: fast taxi off the runway or road = crash.
    if (pl.alt < 10 && pl.speed > 300 && !overRunway(pl.x, pl.y) && !onRoadAt(world.city, pl.x, pl.y) && !onWater(pl.x, pl.y)) {
      explodePlane(world);
    }
    // Exhaust flame.
    if (pl.throttle > 0.3 && world.rng.chance(0.8)) {
      const bx = pl.x - Math.cos(pl.angle) * 26;
      const by = pl.y - Math.sin(pl.angle) * 26;
      world.particles.push({
        x: bx + world.rng.range(-4, 4), y: by + world.rng.range(-4, 4),
        vx: -Math.cos(pl.angle) * 160 + world.rng.range(-20, 20),
        vy: -Math.sin(pl.angle) * 160 + world.rng.range(-20, 20),
        life: 0.35, maxLife: 0.35, size: world.rng.range(3, 6),
        color: world.rng.pick(['#ff9d4d', '#ffd23e', '#ff6b35']), kind: 'spark',
      });
    }
    p.x = pl.x;
    p.y = pl.y;
    p.angle = pl.angle;
  }
  // Military jets: 6 stars while airborne.
  if (p.inPlane && pl.airborne && world.wanted >= 6) {
    s.jetTimer -= dt;
    if (s.jets.length < 2 && s.jetTimer <= 0) {
      s.jetTimer = 6;
      spawnJet(world);
    }
  }
  if (s.jets.length && (!p.inPlane || !pl.airborne || world.wanted < 5)) s.jets.length = 0;
  stepJets(world, dt);
}

// Mission 13 "Rocket Heist" state machine. Call from updateMission when
// mission.index === 12. Returns true only when the mission is complete
// (the integration then calls completeMission(world)).
export function stepSpaceMission(world, dt) {
  const m = world.mission;
  const s = world.space;
  const p = world.player;
  const pl = s.plane;
  const hangar = { x: SPACEPORT.hangar.x + 50, y: SPACEPORT.hangar.y + 40, label: 'Spaceport' };
  if (m.stage === 0) {
    m.target = hangar;
    if (Math.hypot(p.x - hangar.x, p.y - hangar.y) < 70) {
      m.stage = 1;
      m.target = { x: pl.x, y: pl.y, label: 'Rocket Plane' };
      m.dialogue = ['MARA: The HA-1 is in the hangar. Press E and take her.'];
      m.dialogueTimer = 5;
    }
    return false;
  }
  if (m.stage === 1) {
    m.target = { x: pl.x, y: pl.y, label: 'Rocket Plane' };
    if (p.inPlane) {
      m.stage = 2;
      addWanted(world, 5);
      m.target = { x: SPACEPORT.runway.x + 40, y: SPACEPORT.runway.y + 230, label: 'Runway' };
      m.dialogue = ['MARA: Five stars! Throttle up and get that bird in the air!'];
      m.dialogueTimer = 5;
    }
    return false;
  }
  if (m.stage === 2) {
    if (pl.alt > 100) {
      m.stage = 3;
      // NOTE (integrasi R25): pakai s.escapeTimer, BUKAN m.timer — updateMission
      // di game asli juga menaikkan mission.timer tiap tick, jadi m.timer di
      // sini akan jalan 2x cepat (45 detik jadi ~22,5 detik). escapeTimer
      // hanya disentuh stepSpaceMission, jadi tepat 45 detik.
      s.escapeTimer = 0;
      addWanted(world, 1);
      m.target = null;
      m.dialogue = ['MARA: You are up! Survive 45 seconds — the Air Force is coming.'];
      m.dialogueTimer = 5;
    }
    return false;
  }
  if (m.stage === 3) {
    s.escapeTimer += dt;
    if (s.escapeTimer >= 45) {
      m.stage = 4;
      m.target = { x: SPACEPORT.runway.x + 40, y: SPACEPORT.runway.y + 130, label: 'Land Safe' };
      m.dialogue = ['MARA: Bring her down — runway or water, your call. In one piece!'];
      m.dialogueTimer = 5;
    }
    return false;
  }
  if (m.stage === 4) {
    const landed = pl.alt < 8 && Math.abs(pl.speed) < 120
      && (overRunway(pl.x, pl.y) || onWater(pl.x, pl.y));
    if (landed) return true;
    return false;
  }
  return false;
}

// ---------- drawing (top-down, same flat style as the rest of the game) ----------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function label(ctx, text, x, y, size, color, align) {
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawSpaceport(ctx, state, time) {
  const r = SPACEPORT;
  // Concrete apron, cut to the interior block (2130..2350 x 530..750) so
  // the surrounding roads stay fully visible (was full 2080..2400 x
  // 480..800, covering half of each road in 2D).
  ctx.fillStyle = '#33383f';
  ctx.fillRect(r.x + 50, r.y + 50, r.w - 100, r.h - 100);
  ctx.strokeStyle = 'rgba(255,210,62,0.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 10]);
  ctx.strokeRect(r.x + 54, r.y + 54, r.w - 108, r.h - 108);
  ctx.setLineDash([]);
  // Long low-sun shadows (G6): everything casts south, away from the northern sun.
  const sunDir = { x: 0.22, y: 1 };
  const longShadow = (x, y, w, h) => {
    ctx.fillStyle = 'rgba(8,10,16,0.42)';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w + sunDir.x * 90, y + h + 90);
    ctx.lineTo(x + sunDir.x * 90, y + h + 90);
    ctx.closePath(); ctx.fill();
  };
  longShadow(r.hangar.x, r.hangar.y, r.hangar.w, r.hangar.h);
  longShadow(r.tower.x, r.tower.y, r.tower.w, r.tower.h);
  longShadow(r.pad.x - 20, r.pad.y - 20, 40, 40);
  // Palm silhouettes framing the apron (G5). 1A-TREES #15: SW+SE digeser ke dlm apron (dulu (2106,780)/(2380,776) = di tengah jalan).
  drawPalm(ctx, r.x + 40, r.y + 280, 1.1, time);
  drawPalm(ctx, r.x + 280, r.y + 280, 0.95, time);
  drawPalm(ctx, r.x + 52, r.y + 40, 0.85, time);
  // Runway.
  const rw = r.runway;
  ctx.fillStyle = '#1e2126';
  ctx.fillRect(rw.x, rw.y, rw.w, rw.h);
  ctx.strokeStyle = '#e8e4d8';
  ctx.lineWidth = 2;
  ctx.strokeRect(rw.x + 3, rw.y + 3, rw.w - 6, rw.h - 6);
  ctx.fillStyle = '#e8e4d8';
  for (let y = rw.y + 26; y < rw.y + rw.h - 20; y += 34) ctx.fillRect(rw.x + rw.w / 2 - 2, y, 4, 18);
  ctx.fillStyle = '#ffd23e';
  for (let y = rw.y + 12; y < rw.y + rw.h; y += 26) {
    ctx.fillRect(rw.x + 6, y, 8, 10);
    ctx.fillRect(rw.x + rw.w - 14, y, 8, 10);
  }
  label(ctx, '09', rw.x + rw.w / 2, rw.y + rw.h - 18, 20, '#e8e4d8');
  // Wet neon smears on the runway (G4): tower + sign light bleed down the asphalt.
  const smear = (x, y, w, h, color, a) => {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, color.replace('A', String(a)));
    g.addColorStop(1, color.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
  smear(rw.x + 8, rw.y + 8, 10, 150, 'rgba(55,224,230,A)', 0.20);
  smear(rw.x + rw.w - 18, rw.y + 8, 10, 120, 'rgba(255,210,62,A)', 0.16);
  // Hangar.
  const h = r.hangar;
  ctx.fillStyle = '#454f5c';
  rr(ctx, h.x, h.y, h.w, h.h, 6);
  ctx.fill();
  ctx.fillStyle = '#2c3440';
  rr(ctx, h.x + 8, h.y + h.h - 34, h.w - 16, 28, 4);
  ctx.fill();
  ctx.strokeStyle = '#37e0e6';
  ctx.lineWidth = 2;
  ctx.strokeRect(h.x + 8, h.y + h.h - 34, h.w - 16, 28);
  // Warm rim light on the hangar's sun-facing (north) edge (V1).
  ctx.strokeStyle = 'rgba(255,190,120,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(h.x + 4, h.y + 2); ctx.lineTo(h.x + h.w - 4, h.y + 2); ctx.stroke();
  ctx.save();
  ctx.shadowColor = '#37e0e6'; ctx.shadowBlur = 12;
  label(ctx, 'HARBOR AEROSPACE', h.x + h.w / 2, h.y + 16, 11, '#37e0e6');
  ctx.restore();
  label(ctx, 'HANGAR 1', h.x + h.w / 2, h.y + 32, 10, '#e8e4d8');
  // Wet smear under the hangar sign (G4).
  smear(h.x + 10, h.y + h.h, h.w - 20, 46, 'rgba(55,224,230,A)', 0.16);
  // Launch pad + standing orbital rocket.
  const pd = r.pad;
  ctx.fillStyle = '#565e68';
  ctx.beginPath(); ctx.arc(pd.x, pd.y, pd.r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(pd.x, pd.y, pd.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath(); ctx.arc(pd.x, pd.y, 11, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ff9d4d';
  ctx.beginPath(); ctx.arc(pd.x, pd.y, 11, -Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7); ctx.lineTo(pd.x, pd.y); ctx.fill();
  ctx.fillStyle = '#37e0e6';
  for (let k = 0; k < 4; k += 1) {
    const a = (k * Math.PI) / 2 + 0.4;
    ctx.fillRect(pd.x + Math.cos(a) * 12 - 3, pd.y + Math.sin(a) * 12 - 3, 6, 6);
  }
  const blink = 0.5 + 0.5 * Math.sin(time * 4);
  ctx.save();
  ctx.shadowColor = '#ff4d4d'; ctx.shadowBlur = 16;
  ctx.fillStyle = `rgba(255,77,77,${0.35 + 0.65 * blink})`;
  ctx.beginPath(); ctx.arc(pd.x, pd.y - pd.r - 8, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Red beacon smear on the pad (G4).
  smear(pd.x - 5, pd.y + pd.r, 10, 60, 'rgba(255,77,77,A)', 0.18);
  // Control tower.
  const t = r.tower;
  ctx.fillStyle = '#5a6b8a';
  ctx.fillRect(t.x, t.y, t.w, t.h);
  ctx.fillStyle = '#37e0e6';
  ctx.fillRect(t.x + 6, t.y + 6, t.w - 12, 12);
  ctx.strokeStyle = '#e8e4d8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(t.x + t.w / 2, t.y); ctx.lineTo(t.x + t.w / 2, t.y - 16); ctx.stroke();
  ctx.fillStyle = `rgba(255,77,77,${0.35 + 0.65 * blink})`;
  ctx.beginPath(); ctx.arc(t.x + t.w / 2, t.y - 18, 3, 0, Math.PI * 2); ctx.fill();
  label(ctx, 'TOWER', t.x + t.w / 2, t.y + t.h + 10, 9, '#e8e4d8');
  // Stacked vertical neon signs on the control tower (C2) — the tower is
  // isolated, so the signs never collide with the hangar label or the plane.
  const vSign = (x, y, txt, color) => {
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, x, y);
    ctx.restore();
  };
  vSign(t.x + t.w + 8, t.y + 8, 'HA-1', '#ff2a6d');
  vSign(t.x + t.w + 8, t.y + 26, 'ROCKET', '#05d9e8');
  vSign(t.x + t.w + 8, t.y + 44, '09', '#ffd23e');
  // Fuel tanks.
  for (const tk of r.tanks) {
    ctx.fillStyle = '#e8e4d8';
    ctx.beginPath(); ctx.arc(tk.x, tk.y, tk.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tk.x, tk.y, tk.r - 4, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#37e0e6';
    ctx.beginPath(); ctx.arc(tk.x, tk.y, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save();
  ctx.shadowColor = '#37e0e6'; ctx.shadowBlur = 10;
  label(ctx, 'HARBOR AEROSPACE', r.x + r.w / 2, r.y + r.h - 62, 12, '#37e0e6');
  ctx.restore();
}

// Palm silhouette (G5): dark trunk + fronds, coastal framing.
export function drawPalm(ctx, x, y, s, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = '#10160f';
  ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(4, -22, 2, -42); ctx.stroke();
  ctx.lineWidth = 3;
  for (let k = 0; k < 6; k += 1) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.55 + Math.sin(time * 0.8 + k) * 0.03;
    ctx.beginPath();
    ctx.moveTo(2, -42);
    ctx.quadraticCurveTo(2 + Math.cos(a) * 16, -42 + Math.sin(a) * 16, 2 + Math.cos(a) * 30, -42 + Math.sin(a) * 30 + 8);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlane(ctx, plane, time) {
  if (!plane.alive) return;
  const alt = plane.alt || 0;
  const scale = 1 + alt / 900;
  // Contact shadow (V3): crisp when low, faint and far when high.
  ctx.fillStyle = `rgba(0,0,0,${Math.max(0.08, 0.42 - alt / 800)})`;
  ctx.beginPath();
  ctx.ellipse(plane.x + alt * 0.32, plane.y + alt * 0.32, 30 * scale, 12 * scale, plane.angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(plane.x, plane.y);
  ctx.rotate(plane.angle);
  ctx.scale(scale, scale);
  const flick = 0.75 + 0.25 * Math.sin(time * 31 + plane.x);
  // Afterburner glow (lighter composite) + flame.
  if (plane.throttle > 0.25) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(-26, 0, 2, -26, 0, 26 * plane.throttle * flick + 8);
    glow.addColorStop(0, 'rgba(255,180,90,0.85)');
    glow.addColorStop(1, 'rgba(255,90,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(-26, 0, 26 * plane.throttle * flick + 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = `rgba(255,157,77,${0.55 + 0.4 * flick * plane.throttle})`;
    ctx.beginPath();
    ctx.moveTo(-24, -5); ctx.lineTo(-24 - 18 * plane.throttle * flick, 0); ctx.lineTo(-24, 5);
    ctx.closePath(); ctx.fill();
  }
  // Dark outline pass (V2): same silhouette, slightly larger, drawn first.
  ctx.fillStyle = '#0b0f16';
  const outline = (s) => {
    ctx.save(); ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(6, -4); ctx.lineTo(-14, -30); ctx.lineTo(-20, -30); ctx.lineTo(-10, -2); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, 4); ctx.lineTo(-14, 30); ctx.lineTo(-20, 30); ctx.lineTo(-10, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(34, 0); ctx.lineTo(10, -7); ctx.lineTo(-24, -6); ctx.lineTo(-26, 0);
    ctx.lineTo(-24, 6); ctx.lineTo(10, 7);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };
  outline(1.14);
  // Swept wings.
  ctx.fillStyle = '#d5dde4';
  ctx.beginPath();
  ctx.moveTo(6, -4); ctx.lineTo(-14, -30); ctx.lineTo(-20, -30); ctx.lineTo(-10, -2);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 4); ctx.lineTo(-14, 30); ctx.lineTo(-20, 30); ctx.lineTo(-10, 2);
  ctx.closePath(); ctx.fill();
  // Tail fins.
  ctx.fillStyle = '#05d9e8';
  ctx.beginPath(); ctx.moveTo(-18, -3); ctx.lineTo(-28, -12); ctx.lineTo(-28, -4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-18, 3); ctx.lineTo(-28, 12); ctx.lineTo(-28, 4); ctx.closePath(); ctx.fill();
  // Fuselage: sleek rocket dart.
  ctx.fillStyle = '#f7fafc';
  ctx.beginPath();
  ctx.moveTo(34, 0); ctx.lineTo(10, -7); ctx.lineTo(-24, -6); ctx.lineTo(-26, 0);
  ctx.lineTo(-24, 6); ctx.lineTo(10, 7);
  ctx.closePath(); ctx.fill();
  // Warm rim light on the sun-facing edge (V1): nose + top wing edge.
  ctx.strokeStyle = 'rgba(255,196,130,0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(10, -7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6, -4); ctx.lineTo(-14, -30); ctx.stroke();
  ctx.fillStyle = '#ff9d4d';
  ctx.beginPath(); ctx.moveTo(34, 0); ctx.lineTo(22, -4); ctx.lineTo(22, 4); ctx.closePath(); ctx.fill();
  // Canopy.
  ctx.fillStyle = '#05d9e8';
  ctx.beginPath(); ctx.ellipse(14, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  label(ctx, 'HA-1', -2, 0, 8, '#2c3440');
  ctx.restore();
}

// ---------- screen-space grades (call after the world, before HUD) ----------
// GTA V "smog sunset" (G1/G2/G3): orange->pink->purple sky band at the top of
// the frame, sun disc + glare streaks + anamorphic streak, smog band and a
// dark skyline silhouette with lit windows along the horizon.
export function drawSunsetGrade(ctx, w, h, time) {
  const bandH = Math.round(h * 0.22);
  const sky = ctx.createLinearGradient(0, 0, 0, bandH);
  sky.addColorStop(0, '#2a1a4e');
  sky.addColorStop(0.35, '#7a2d6d');
  sky.addColorStop(0.65, '#e05a7a');
  sky.addColorStop(1, '#ff9a4d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, bandH);
  // Pink watercolor clouds.
  ctx.fillStyle = 'rgba(255,150,170,0.35)';
  for (let i = 0; i < 5; i += 1) {
    const cx = ((i * 337 + time * 6) % (w + 200)) - 100;
    const cy = 20 + (i % 3) * 26;
    ctx.beginPath(); ctx.ellipse(cx, cy, 120 + i * 22, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Sun disc + glow (not a perfect disc: glare eats one side).
  // Kept clear of the centered HUD panel (right side of the frame).
  const sx = w * 0.86;
  const sy = bandH - 30;
  // Dark skyline silhouette (G3) with lit windows + one tall tower anchor (W1).
  // Drawn FIRST so the sun glows OVER the buildings, GTA V style.
  ctx.fillStyle = '#1c1426';
  let bx = 0;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while (bx < w) {
    const bw = 46 + rnd() * 90;
    const bh = 24 + rnd() * 58;
    ctx.fillRect(bx, bandH - bh, bw, bh + 4);
    bx += bw + 6 + rnd() * 30;
  }
  // Tall anchor tower left of the sun.
  ctx.fillRect(sx - 330, bandH - 128, 26, 132);
  ctx.fillRect(sx - 318, bandH - 150, 3, 24);
  ctx.fillStyle = 'rgba(255,210,110,0.9)';
  seed = 13;
  for (let i = 0; i < 90; i += 1) {
    const wx = rnd() * w;
    const wy = bandH - 6 - rnd() * 58;
    ctx.fillRect(wx, wy, 3, 4);
  }
  // Sun + glow + glare on top of the skyline.
  const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, 300);
  glow.addColorStop(0, 'rgba(255,230,160,0.95)');
  glow.addColorStop(0.25, 'rgba(255,170,90,0.55)');
  glow.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 300, sy - 300, 600, 600);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath(); ctx.arc(sx, sy, 32, 0, Math.PI * 2); ctx.fill();
  // Sun glare streaks (G1): thin translucent quads radiating from the sun.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k += 1) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.5;
    const len = 150 + (k % 2) * 90;
    ctx.strokeStyle = `rgba(255,210,140,${0.20 - Math.abs(k - 2.5) * 0.03})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * 42, sy + Math.sin(a) * 42);
    ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len);
    ctx.stroke();
  }
  // Anamorphic streak: one thin horizontal line through the sun.
  ctx.strokeStyle = 'rgba(255,220,160,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx - 260, sy); ctx.lineTo(sx + 260, sy); ctx.stroke();
  ctx.restore();
  // Smog band (G2): the city dissolves into warm haze at the horizon.
  // Strong, tall, and soft-edged so the band never reads as a hard stripe.
  const smog = ctx.createLinearGradient(0, bandH - 30, 0, bandH + 110);
  smog.addColorStop(0, 'rgba(255,150,110,0.10)');
  smog.addColorStop(0.35, 'rgba(255,150,110,0.42)');
  smog.addColorStop(0.7, 'rgba(255,150,110,0.22)');
  smog.addColorStop(1, 'rgba(255,150,110,0)');
  ctx.fillStyle = smog;
  ctx.fillRect(0, bandH - 30, w, 140);
  // Warm wash over the whole frame.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, 'rgba(255,140,80,0.08)');
  wash.addColorStop(1, 'rgba(255,120,60,0.14)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
}

// Cyberpunk night grade (C1): 80/20 dark + saturated neon, cold tint, vignette.
export function drawNightGrade(ctx, w, h) {
  const cold = ctx.createLinearGradient(0, 0, 0, h);
  cold.addColorStop(0, 'rgba(10,20,40,0.16)');
  cold.addColorStop(1, 'rgba(5,10,24,0.30)');
  ctx.fillStyle = cold;
  ctx.fillRect(0, 0, w, h);
  const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.42, w / 2, h / 2, h * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

export function drawJet(ctx, jet, time) {
  // JET R36: NH-77 HARBOR WRAITH top-down — abu gelap stealth, kanopi
  // gelembung, twin tail, garis neon cyan (dulu: anak panah abu-biru polos
  // tanpa sirip/kanopi). Sama dgn webgl2.js plane() + city3d.js plane3d().
  ctx.save();
  ctx.translate(jet.x, jet.y);
  ctx.rotate(jet.angle);
  const flick = 0.7 + 0.3 * Math.sin(time * 27 + jet.x);
  ctx.fillStyle = `rgba(255,107,53,${0.6 + 0.4 * flick})`;
  ctx.beginPath();
  ctx.moveTo(-20, -4); ctx.lineTo(-20 - 14 * flick, 0); ctx.lineTo(-20, 4);
  ctx.closePath(); ctx.fill();
  // Swept wings (dark stealth).
  ctx.fillStyle = '#23272e';
  ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(-12, -22); ctx.lineTo(-16, -22); ctx.lineTo(-8, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2, 4); ctx.lineTo(-12, 22); ctx.lineTo(-16, 22); ctx.lineTo(-8, 2); ctx.closePath(); ctx.fill();
  // Twin tail fins (splayed, cyan tips).
  ctx.fillStyle = '#23272e';
  ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-24, -13); ctx.lineTo(-25, -5); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-14, 4); ctx.lineTo(-24, 13); ctx.lineTo(-25, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#05d9e8';
  ctx.beginPath(); ctx.moveTo(-22, -11); ctx.lineTo(-24, -13); ctx.lineTo(-25, -11); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-22, 11); ctx.lineTo(-24, 13); ctx.lineTo(-25, 11); ctx.closePath(); ctx.fill();
  // Fuselage: dark stealth dart + darker nose tip.
  ctx.fillStyle = '#2b2f36';
  ctx.beginPath();
  ctx.moveTo(28, 0); ctx.lineTo(8, -6); ctx.lineTo(-18, -5); ctx.lineTo(-20, 0);
  ctx.lineTo(-18, 5); ctx.lineTo(8, 6);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1e2126';
  ctx.beginPath(); ctx.moveTo(28, 0); ctx.lineTo(20, -3); ctx.lineTo(20, 3); ctx.closePath(); ctx.fill();
  // Cyan cheatlines along the fuselage sides.
  ctx.strokeStyle = '#05d9e8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(22, -4.5); ctx.lineTo(-16, -4.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22, 4.5); ctx.lineTo(-16, 4.5); ctx.stroke();
  // Bubble canopy: glass blue + sky streak.
  ctx.fillStyle = '#7db9eb';
  ctx.beginPath(); ctx.ellipse(12, 0, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(220,240,255,0.9)';
  ctx.beginPath(); ctx.ellipse(13, -1, 5, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  label(ctx, 'HAF', -8, 0, 8, '#ffd23e');
  ctx.restore();
}

export function drawSpaceHud(ctx, state, view) {
  const pl = state.space.plane;
  if (!state.player.inPlane) return;
  // Panel lives LEFT, below the cash/wanted cluster AND the 3D/2D mode badge
  // (render.js drawModeBadge: x 12, y 228-252) — the old top-center
  // position (y 10-112) covered the DAY readout pill AND the ROAD TO #1
  // meter (Art Director batch 6: HUD overlap). The left column is empty
  // at y 264: cash panel ends y 188, radio pill y 196-220, mode badge
  // y 228-252, Mara dialogue starts at view.h - 246. Panel is 460 wide,
  // same as before, just moved. (v2.1: first try y 228 collided with the
  // mode badge — the badge covered the panel title.)
  const px = 12, py = 264, pw = 460, ph = 102;
  ctx.fillStyle = 'rgba(10,16,28,0.82)';
  rr(ctx, px, py, pw, ph, 8); ctx.fill();
  ctx.strokeStyle = '#37e0e6'; ctx.lineWidth = 2;
  rr(ctx, px, py, pw, ph, 8); ctx.stroke();
  label(ctx, 'ROCKET PLANE  HA-1', px + pw / 2, py + 16, 15, '#37e0e6');
  const row = (y, txt, frac, color) => {
    label(ctx, txt, px + 20, y, 12, '#eef1f5', 'left');
    const bx = px + 110;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(bx, y - 5, 310, 9);
    ctx.fillStyle = color;
    ctx.fillRect(bx, y - 5, 310 * Math.max(0, Math.min(1, frac)), 9);
  };
  row(py + 38, `ALT ${Math.round(pl.alt)} m`, pl.alt / PLANE_MAX_ALT, '#37e0e6');
  row(py + 58, `${Math.round(Math.abs(pl.speed) * 1.6)} km/h`, Math.abs(pl.speed) / PLANE_MAX_SPEED, '#ffd23e');
  row(py + 78, `HULL ${Math.round(pl.hp)}%`, pl.hp / 100, pl.hp > 40 ? '#7be382' : '#ff4d4d');
  // Controls hint lives at the bottom of the screen (never under the sun).
  const hint = 'W/S throttle  ·  A/D steer  ·  E exit when landed  ·  land on runway or water';
  ctx.font = '13px system-ui, sans-serif';
  const hw = ctx.measureText(hint).width;
  const cx = view.w / 2;
  ctx.fillStyle = 'rgba(10,16,28,0.82)';
  rr(ctx, cx - hw / 2 - 14, view.h - 34, hw + 28, 24, 6); ctx.fill();
  label(ctx, hint, cx, view.h - 22, 13, '#ffd23e');
  if (state.space.jets.length) {
    ctx.fillStyle = 'rgba(120,20,20,0.85)';
    rr(ctx, px + 80, py + 116, 300, 28, 6); ctx.fill();
    label(ctx, 'MILITARY JETS INBOUND — 6 STARS', px + 230, py + 130, 13, '#ffb3ab');
  }
}
