// Neon Harbor — drawing only: city, cars, people, effects, HUD.
import { COLORS, PLAYER, UPGRADES, WEAPONS, WORLD_H, WORLD_W } from './config.js';
import { WATER_X, districtAt } from './city.js';
import { currentObjective, garageHot } from './missions.js';
import { drawMinimap } from './minimap.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_SETTINGS = 'settings';
export const SCREEN_SHOP = 'shop';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeGlowSprite(size, inner, outer) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

function drawCarShape(ctx, car, night) {
  const L = car.length;
  const W = car.width;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(2, 3, L / 2 + 2, W / 2 + 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(car.angle);
  if (night > 0.3) {
    ctx.fillStyle = `rgba(255,240,170,${(0.10 * night).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(L / 2, -W / 2 + 3);
    ctx.lineTo(L / 2 + 120, -34);
    ctx.lineTo(L / 2 + 120, 34);
    ctx.lineTo(L / 2, W / 2 - 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#14181f';
  rr(ctx, -L / 2 - 2, -W / 2 - 2, L + 4, W + 4, 6);
  ctx.fill();
  ctx.fillStyle = car.color;
  rr(ctx, -L / 2, -W / 2, L, W, 5);
  ctx.fill();
  if (car.body === 'van') {
    ctx.fillStyle = '#bfe6ff';
    ctx.fillRect(-L / 2 + 8, -W / 2 + 3, L - 22, W - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(2, -W / 2 + 2, 2, W - 4);
  } else if (car.body === 'taxi') {
    ctx.fillStyle = '#20242a';
    for (let i = 0; i < 6; i += 1) {
      if (i % 2 === 0) ctx.fillRect(-L / 2 + 8 + i * 5, -W / 2 + 2, 5, 5);
      else ctx.fillRect(-L / 2 + 8 + i * 5, W / 2 - 7, 5, 5);
    }
    ctx.fillStyle = '#ffd23e';
    ctx.fillRect(-6, -W / 2 - 3, 12, 4);
    if (car.pink) {
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.moveTo(-8, -W / 2 - 8);
      ctx.lineTo(-4, -W / 2 - 14);
      ctx.lineTo(0, -W / 2 - 8);
      ctx.lineTo(4, -W / 2 - 14);
      ctx.lineTo(8, -W / 2 - 8);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    const roofLen = car.body === 'hatch' ? 16 : 20;
    rr(ctx, -roofLen / 2, -W / 2 + 3, roofLen, W - 6, 3);
    ctx.fill();
    ctx.fillStyle = '#bfe6ff';
    ctx.fillRect(L / 2 - 15, -W / 2 + 3, 8, W - 6);
    ctx.fillStyle = '#20242a';
    ctx.fillRect(-L / 2 + 6, -W / 2 + 3, 7, W - 6);
  }
  ctx.fillStyle = '#fff6c8';
  ctx.fillRect(L / 2 - 2, -W / 2 + 2, 3, 4);
  ctx.fillRect(L / 2 - 2, W / 2 - 6, 3, 4);
  ctx.fillStyle = '#ff3b30';
  ctx.fillRect(-L / 2 - 1, -W / 2 + 2, 3, 4);
  ctx.fillRect(-L / 2 - 1, W / 2 - 6, 3, 4);
  if (car.kind === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -W / 2 + 2, 10, W - 4);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-L / 2 + 2, -W / 2 + 2, 5, 5);
    ctx.fillStyle = '#2f6fd0';
    ctx.fillRect(-L / 2 + 2, W / 2 - 7, 5, 5);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, ped, walkPhase) {
  const radius = ped.build === 'wide' ? 11 : 9;
  const bob = Math.sin(walkPhase) * 1.5;
  const swing = Math.sin(walkPhase) * 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.8, radius, radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, bob);
  ctx.rotate(angle);
  ctx.fillStyle = ped.pants || '#2c3e50';
  ctx.fillRect(-3, -radius * 0.7, 6, 3);
  ctx.fillRect(-3 + swing * 0.4, radius * 0.7 - 3, 6, 3);
  ctx.fillStyle = ped.color;
  const bw = ped.build === 'wide' ? radius * 1.5 : radius * 1.2;
  rr(ctx, -radius * 0.7, -bw / 2, radius * 1.4, bw, 4);
  ctx.fill();
  ctx.fillStyle = ped.skin || '#e8b98a';
  ctx.fillRect(radius * 0.3, -bw / 2 - 2, 4, 4);
  ctx.fillRect(radius * 0.3, bw / 2 - 2, 4, 4);
  ctx.beginPath();
  ctx.arc(radius * 0.75, 0, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  if (ped.hat === 1) {
    ctx.fillStyle = '#20242a';
    ctx.beginPath();
    ctx.arc(radius * 0.75, 0, radius * 0.55, Math.PI * 0.7, Math.PI * 1.9);
    ctx.fill();
    ctx.fillRect(radius * 0.75, -radius * 0.55, radius * 0.7, 3);
  } else if (ped.hat === 2) {
    ctx.fillStyle = '#8e44ad';
    ctx.beginPath();
    ctx.arc(radius * 0.75, 0, radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin || '#e8b98a';
    ctx.beginPath();
    ctx.arc(radius * 0.95, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  if (ped.photo > 0) {
    ctx.fillStyle = '#14181f';
    ctx.fillRect(radius * 0.75, -radius - 8, 5, 10);
    ctx.fillStyle = '#bfe6ff';
    ctx.fillRect(radius * 0.75 + 1, -radius - 7, 3, 8);
  }
  ctx.restore();
}

function drawBoatShape(ctx, boat) {
  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(boat.angle);
  ctx.fillStyle = boat.color || '#e8e4d8';
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(16, -10);
  ctx.lineTo(-24, -10);
  ctx.lineTo(-28, -6);
  ctx.lineTo(-28, 6);
  ctx.lineTo(-24, 10);
  ctx.lineTo(16, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-24, -10, 40, 3);
  ctx.fillStyle = '#bfe6ff';
  ctx.fillRect(2, -7, 10, 14);
  ctx.fillStyle = '#20242a';
  ctx.fillRect(-14, -7, 12, 14);
  ctx.fillStyle = '#14181f';
  ctx.fillRect(-32, -5, 6, 10);
  ctx.restore();
}

function drawPlayer(ctx, p, state) {
  const bob = Math.sin(p.runPhase) * 1.5;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, bob);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(10, -2, 12, 4);
  ctx.fillStyle = COLORS.player;
  rr(ctx, -12, -9, 24, 18, 7);
  ctx.fill();
  ctx.fillStyle = '#1c1f24';
  ctx.fillRect(-12, -2, 24, 3);
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(10, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242a';
  ctx.beginPath();
  ctx.arc(10, 0, 7, Math.PI * 0.7, Math.PI * 1.9);
  ctx.fill();
  ctx.fillRect(10, -7, 8, 3);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER.radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,210,62,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22);
  ctx.lineTo(p.x + Math.cos(p.angle) * 52, p.y + Math.sin(p.angle) * 52);
  ctx.stroke();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 800, scale: 1 };
  const fonts = new Map();
  const glowSprite = makeGlowSprite(128, 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0)');
  const vignetteSprite = makeGlowSprite(512, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.55)');
  let staticLayer = null;
  let staticCity = null;

  function buildStaticLayer(city) {
    const c = document.createElement('canvas');
    c.width = WORLD_W;
    c.height = WORLD_H;
    const g = c.getContext('2d');
    for (const d of city.districts) {
      g.fillStyle = d.ground;
      g.fillRect(d.x, d.y, d.w, d.h);
    }
    g.fillStyle = COLORS.water;
    g.fillRect(WATER_X, 0, WORLD_W - WATER_X, WORLD_H);
    g.fillStyle = '#8a6f4d';
    g.fillRect(city.docks.x, city.docks.y, city.docks.w, city.docks.h);
    g.fillStyle = '#6b5638';
    for (let y = city.docks.y + 10; y < city.docks.y + city.docks.h; y += 28) {
      g.fillRect(city.docks.x, y, city.docks.w, 3);
    }
    g.fillStyle = '#8a6f4d';
    g.fillRect(city.marina.x, city.marina.y, city.marina.w, city.marina.h);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(city.marina.x + 100, city.marina.y + 60);
    g.lineTo(city.marina.x + 130, city.marina.y + 60);
    g.lineTo(city.marina.x + 115, city.marina.y + 20);
    g.closePath();
    g.fill();
    g.fillStyle = COLORS.sidewalk;
    for (const rx of city.roadsV) g.fillRect(rx - 52, 0, 104, WORLD_H);
    for (const ry of city.roadsH) g.fillRect(0, ry - 52, WORLD_W, 104);
    g.fillStyle = COLORS.road;
    for (const rx of city.roadsV) g.fillRect(rx - 36, 0, 72, WORLD_H);
    for (const ry of city.roadsH) g.fillRect(0, ry - 36, WORLD_W, 72);
    g.fillStyle = COLORS.roadLine;
    for (const rx of city.roadsV) {
      for (let y = 0; y < WORLD_H; y += 64) g.fillRect(rx - 2, y + 12, 4, 32);
    }
    for (const ry of city.roadsH) {
      for (let x = 0; x < WATER_X; x += 64) g.fillRect(x + 12, ry - 2, 32, 4);
    }
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (const pt of city.intersections) {
      for (let i = -3; i <= 3; i += 1) {
        g.fillRect(pt.x + i * 10 - 3, pt.y - 46, 6, 12);
        g.fillRect(pt.x + i * 10 - 3, pt.y + 34, 6, 12);
        g.fillRect(pt.x - 46, pt.y + i * 10 - 3, 12, 6);
        g.fillRect(pt.x + 34, pt.y + i * 10 - 3, 12, 6);
      }
    }
    for (const park of city.parks) {
      g.fillStyle = COLORS.park;
      g.fillRect(park.x, park.y, park.w, park.h);
    }
    for (const tree of city.trees) {
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.beginPath();
      g.arc(tree.x + 3, tree.y + 4, tree.r, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = COLORS.tree;
      g.beginPath();
      g.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      g.fill();
    }
    for (const b of city.buildings) {
      g.fillStyle = '#20242a';
      g.fillRect(b.x - 3, b.y - 3 + b.height * 3, b.w + 6, b.h + 6);
      g.fillStyle = b.color;
      g.fillRect(b.x, b.y, b.w, b.h);
      g.strokeStyle = b.neon;
      g.lineWidth = 3;
      g.strokeRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(b.x + 10, b.y + 10, b.w - 20, 8);
      if (b.roof === 1) {
        g.fillStyle = '#6b7280';
        g.fillRect(b.x + 14, b.y + 22, 16, 12);
        g.fillRect(b.x + b.w - 30, b.y + b.h - 34, 16, 12);
      } else if (b.roof === 2) {
        g.fillStyle = 'rgba(191,230,255,0.7)';
        g.fillRect(b.x + 16, b.y + b.h / 2 - 5, b.w - 32, 10);
      }
      if (b.props > 0) {
        g.fillStyle = 'rgba(0,0,0,0.4)';
        for (let i = 0; i < b.props; i += 1) {
          g.fillRect(b.x + 20 + i * 22, b.y + b.h - 18, 8, 8);
        }
      }
      if (b.landmark === 'lighthouse') {
        g.fillStyle = '#c0392b';
        g.fillRect(b.x + 6, b.y + 8, b.w - 12, 8);
        g.fillRect(b.x + 6, b.y + 28, b.w - 12, 8);
        g.fillStyle = '#ffd23e';
        g.beginPath();
        g.arc(b.x + b.w / 2, b.y + b.h / 2, 6, 0, Math.PI * 2);
        g.fill();
      }
    }
    return c;
  }

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = Math.round(view.w * ratio);
    canvas.height = Math.round(view.h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}-${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''} ${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawDestructionLight(pt, x, y, scale) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    if (pt.kind === 'jet') {
      ctx.strokeStyle = '#c7f5ff'; ctx.lineWidth = 3 * scale;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - pt.vx * 0.035 * scale, y + 18 * scale); ctx.stroke();
    } else {
      const r = pt.size * Math.sin(Math.PI * Math.sqrt(alpha)) * scale;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(glowSprite, x - r * 1.5, y - r * 1.5, r * 3, r * 3);
    }
    ctx.restore();
  }

  function drawWorld(state) {
    const zoom = state.zoom || 1;
    const vw = view.w / zoom;
    const vh = view.h / zoom;
    let camX = state.camera.x;
    let camY = state.camera.y;
    camX = vw >= WORLD_W ? WORLD_W / 2 : Math.max(vw / 2, Math.min(WORLD_W - vw / 2, camX));
    camY = vh >= WORLD_H ? WORLD_H / 2 : Math.max(vh / 2, Math.min(WORLD_H - vh / 2, camY));
    if (state.shake > 0) {
      camX += (Math.random() - 0.5) * state.shake;
      camY += (Math.random() - 0.5) * state.shake;
    }
    const ox = view.w / 2 - camX * zoom;
    const oy = view.h / 2 - camY * zoom;
    const blackout = !!(state.blackout && state.blackout.active);
    const night = blackout ? 1 : Math.min(1, 1 - state.daylight + (state.weather && state.weather.storm ? 0.22 : 0));
    const inView = (x, y, r) => (
      x > camX - vw / 2 - r && x < camX + vw / 2 + r
      && y > camY - vh / 2 - r && y < camY + vh / 2 + r
    );

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);

    if (!staticLayer || staticCity !== state.city) {
      staticLayer = buildStaticLayer(state.city);
      staticCity = state.city;
    }
    ctx.drawImage(staticLayer, camX - vw / 2, camY - vh / 2, vw, vh, camX - vw / 2, camY - vh / 2, vw, vh);

    ctx.fillStyle = 'rgba(190,230,255,0.35)';
    const waterTop = Math.max(0, camY - vh / 2);
    const waterBottom = Math.min(WORLD_H, camY + vh / 2);
    for (let y = Math.floor(waterTop / 96) * 96; y < waterBottom; y += 96) {
      const drift = Math.sin(state.elapsed * 1.6 + y * 0.02) * 26;
      ctx.fillRect(WATER_X + 12 + drift, y + 30, 60, 4);
      ctx.fillRect(WATER_X + 40 - drift, y + 70, 44, 4);
    }

    for (const w of state.wet) {
      ctx.globalAlpha = Math.min(1, w.life / 3);
      ctx.fillStyle = 'rgba(20,30,50,0.35)';
      ctx.strokeStyle = 'rgba(180,225,245,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(w.x, w.y, w.r, w.r * 0.65, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const gas = state.gasStation;
    ctx.fillStyle = '#7d8183'; ctx.fillRect(gas.x, gas.y, gas.w, gas.h);
    ctx.strokeStyle = '#f2db96'; ctx.lineWidth = 3;
    ctx.strokeRect(gas.x + 8, gas.y + 8, gas.w - 16, gas.h - 16);
    ctx.fillStyle = '#292f3c'; ctx.fillRect(gas.x + 14, gas.y + 25, gas.w - 28, 55);
    ctx.fillStyle = '#ee594d'; ctx.fillRect(gas.x + 14, gas.y + 25, gas.w - 28, 7);
    ctx.fillStyle = '#c6cbd0';
    for (const dx of [20, gas.w - 28]) for (const dy of [40, 100]) ctx.fillRect(gas.x + dx, gas.y + dy, 7, 30);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('HARBOR GAS', gas.x + gas.w / 2, gas.y + 60);
    for (const pump of gas.pumps) {
      if (!pump.alive) {
        ctx.fillStyle = '#25232a'; ctx.fillRect(pump.x - 10, pump.y - 4, 20, 10);
        ctx.fillStyle = '#474047'; ctx.fillRect(pump.x - 7, pump.y - 11, 14, 9);
        continue;
      }
      ctx.fillStyle = '#cc3e45'; ctx.fillRect(pump.x - 10, pump.y - 24, 20, 28);
      ctx.fillStyle = '#e8e8df'; ctx.fillRect(pump.x - 10, pump.y - 24, 20, 15);
      ctx.fillStyle = '#182c36'; ctx.fillRect(pump.x - 6, pump.y - 20, 12, 7);
      ctx.strokeStyle = '#20232b'; ctx.lineWidth = 3; ctx.beginPath();
      ctx.moveTo(pump.x + 11, pump.y - 16); ctx.lineTo(pump.x + 16, pump.y - 9); ctx.lineTo(pump.x + 13, pump.y + 1); ctx.stroke();
    }
    ctx.fillStyle = '#a9afb4'; ctx.fillRect(gas.x + 12, gas.y + gas.h - 70, 5, 62);
    ctx.fillStyle = '#263948'; ctx.fillRect(gas.x - 2, gas.y + gas.h - 80, 34, 44);
    ctx.fillStyle = '#a6ffb6'; ctx.font = 'bold 24px sans-serif'; ctx.fillText('$', gas.x + 15, gas.y + gas.h - 49);
    for (const h of state.hydrants) {
      ctx.fillStyle = h.burst ? '#643b3c' : '#d94743'; ctx.fillRect(h.x - 4, h.y - 10, 8, 12);
      ctx.fillRect(h.x - 8, h.y - 6, 16, 4);
      ctx.fillStyle = '#892b34'; ctx.fillRect(h.x - 5, h.y - 12, 10, 4);
    }

    const city = state.city;
    if (city.stadium) {
      const s = city.stadium;
      if (inView(s.x, s.y, 160)) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, 92, 62, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(s.x - 92, s.y);
        ctx.lineTo(s.x + 92, s.y);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold 15px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('STADIUM', s.x, s.y - 74);
      }
    }
    if (city.casino) {
      const cz = city.casino;
      if (inView(cz.x, cz.y, 160)) {
        ctx.fillStyle = '#ffd23e';
        ctx.font = `bold 17px ${FONT}`;
        ctx.textAlign = 'center';
        if (blackout) {
          const flick = Math.sin(state.elapsed * 23) + Math.sin(state.elapsed * 7.3) > -0.4 ? 1 : 0.12;
          ctx.globalAlpha = flick;
          ctx.fillText('★ CASINO ★', cz.x, cz.y - 108);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillText('★ CASINO ★', cz.x, cz.y - 108);
          if (night > 0.4) {
            ctx.globalAlpha = (night - 0.4) * 0.6;
            ctx.drawImage(glowSprite, cz.x - 90, cz.y - 110, 180, 180);
            ctx.globalAlpha = 1;
          }
        }
      }
    }
    if (city.lighthouse) {
      const lh = city.lighthouse;
      if (inView(lh.x, lh.y, 340)) {
        const beamAngle = state.elapsed * 0.9;
        const beamAlpha = night > 0.3 ? 0.20 : 0.07;
        ctx.fillStyle = `rgba(255,240,170,${beamAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(lh.x, lh.y);
        ctx.lineTo(lh.x + Math.cos(beamAngle - 0.12) * 340, lh.y + Math.sin(beamAngle - 0.12) * 340);
        ctx.lineTo(lh.x + Math.cos(beamAngle + 0.12) * 340, lh.y + Math.sin(beamAngle + 0.12) * 340);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff6c8';
        ctx.beginPath();
        ctx.arc(lh.x, lh.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0e1420';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('LIGHTHOUSE', lh.x, lh.y - 40);
      }
    }

    const garage = city.garage;
    if (garage && inView(garage.x, garage.y, 90)) {
      const hot = garageHot(state);
      const nearGarage = state.player.inCar && state.player.car
        && Math.hypot(state.player.car.x - garage.x, state.player.car.y - garage.y) < 120;
      ctx.strokeStyle = hot ? '#ff5a3c' : nearGarage ? '#37e0e6' : 'rgba(55,224,230,0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 6]);
      ctx.strokeRect(garage.x - 44, garage.y - 30, 88, 60);
      ctx.setLineDash([]);
      ctx.fillStyle = hot ? 'rgba(255,90,60,0.18)' : 'rgba(55,224,230,0.18)';
      ctx.fillRect(garage.x - 44, garage.y - 30, 88, 60);
      ctx.fillStyle = hot ? '#ff8a7a' : '#37e0e6';
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(hot ? 'GARAGE — CLOSED · district too hot' : 'GARAGE $150 · G repair / respray · U shop', garage.x, garage.y - 40);
      ctx.fillText('G', garage.x, garage.y + 6);
    }

    if (state.pizza) {
      const pizza = state.pizza;
      if (pizza.state === 'idle' && inView(pizza.shop.x, pizza.shop.y, 60)) {
        ctx.fillStyle = '#ff9d4d';
        ctx.fillRect(pizza.shop.x - 12, pizza.shop.y - 12, 24, 24);
        ctx.strokeStyle = '#0e1420';
        ctx.lineWidth = 2;
        ctx.strokeRect(pizza.shop.x - 12, pizza.shop.y - 12, 24, 24);
        ctx.fillStyle = '#0e1420';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('P', pizza.shop.x, pizza.shop.y + 5);
        ctx.fillStyle = '#ff9d4d';
        ctx.font = `bold 13px ${FONT}`;
        ctx.fillText('PIZZERIA — grab the box', pizza.shop.x, pizza.shop.y - 22);
      }
      if (pizza.state === 'deliver' && pizza.dest && inView(pizza.dest.x, pizza.dest.y, 60)) {
        ctx.strokeStyle = '#ff9d4d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pizza.dest.x, pizza.dest.y, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ff9d4d';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`PIZZA DROP — ${Math.max(0, pizza.timer).toFixed(0)}s`, pizza.dest.x, pizza.dest.y - 34);
      }
    }

    if (state.taxi) {
      const taxi = state.taxi;
      if (taxi.state === 'pickup' && taxi.fare && inView(taxi.fare.x, taxi.fare.y, 60)) {
        const pulse = 1 + Math.sin(state.elapsed * 5) * 0.2;
        ctx.strokeStyle = '#7be382';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(taxi.fare.x, taxi.fare.y, 22 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#7be382';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('TAXI FARE', taxi.fare.x, taxi.fare.y - 30);
      }
      if (taxi.state === 'dropoff' && taxi.dest && inView(taxi.dest.x, taxi.dest.y, 60)) {
        ctx.strokeStyle = '#7be382';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(taxi.dest.x, taxi.dest.y, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#7be382';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('DROP-OFF', taxi.dest.x, taxi.dest.y - 34);
      }
    }

    for (const b of state.city.buildings) {
      if (!inView(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
      if (!blackout && night > 0.4) {
        ctx.globalAlpha = (night - 0.4) * 0.5;
        ctx.drawImage(glowSprite, b.x - 20, b.y - 20, b.w + 40, b.h + 40);
        ctx.globalAlpha = 1;
      }
    }

    for (const skid of state.skids) {
      if (!inView(skid.x, skid.y, 30)) continue;
      ctx.save();
      ctx.translate(skid.x, skid.y);
      ctx.rotate(skid.angle);
      ctx.fillStyle = `rgba(20,20,24,${(0.5 * (skid.life / 5)).toFixed(3)})`;
      ctx.fillRect(-14, -8, 28, 4);
      ctx.fillRect(-14, 4, 28, 4);
      ctx.restore();
    }

    for (const c of state.collectibles) {
      if (c.taken || !inView(c.x, c.y, 30)) continue;
      const pulse = 1 + Math.sin(state.elapsed * 5 + c.x) * 0.2;
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath();
      ctx.arc(c.x, c.y, 9 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6d1b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#8a6d1b';
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('$', c.x, c.y + 4);
    }

    for (const pk of state.pickups) {
      if (pk.taken || !inView(pk.x, pk.y, 30)) continue;
      const def = WEAPONS[pk.weapon];
      ctx.fillStyle = def.color;
      ctx.fillRect(pk.x - 12, pk.y - 12, 24, 24);
      ctx.strokeStyle = '#0e1420';
      ctx.lineWidth = 2;
      ctx.strokeRect(pk.x - 12, pk.y - 12, 24, 24);
      ctx.fillStyle = '#0e1420';
      ctx.font = `bold 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(def.name[0], pk.x, pk.y + 5);
    }

    if (state.race) {
      const race = state.race;
      if (inView(race.start.x, race.start.y, 40)) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(race.start.x - 14, race.start.y - 14, 28, 28);
        ctx.fillStyle = '#0e1420';
        for (let i = 0; i < 4; i += 1) {
          for (let j = 0; j < 4; j += 1) {
            if ((i + j) % 2 === 0) ctx.fillRect(race.start.x - 14 + i * 7, race.start.y - 14 + j * 7, 7, 7);
          }
        }
      }
      if (race.active) {
        const target = race.points[race.index];
        if (inView(target.x, target.y, 40)) {
          ctx.strokeStyle = COLORS.neonCyan;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(target.x, target.y, 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = COLORS.neonCyan;
          ctx.font = `bold 16px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.fillText(target.label, target.x, target.y + 5);
        }
      }
    }

    if (state.mission.target) {
      const t = state.mission.target;
      if (inView(t.x, t.y, 60)) {
        const pulse = 1 + Math.sin(state.elapsed * 4) * 0.15;
        ctx.strokeStyle = COLORS.neonYellow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 26 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = COLORS.neonYellow;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0e1420';
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(t.label, t.x, t.y - 34);
      }
    }

    for (const car of state.traffic.parked) {
      if (car.alive && inView(car.x, car.y, 60)) drawCarShape(ctx, car, night);
    }
    for (const car of state.traffic.cars) {
      if (car.alive && inView(car.x, car.y, 60)) drawCarShape(ctx, car, night);
    }

    if (state.armored && state.armored.truck) {
      const truck = state.armored.truck;
      if (truck.alive && inView(truck.x, truck.y, 60)) {
        drawCarShape(ctx, truck, night);
        ctx.fillStyle = '#ffd23e';
        ctx.font = `bold 15px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('$', truck.x, truck.y + 5);
      }
    }

    for (const ped of state.peds) {
      if (!ped.alive || !inView(ped.x, ped.y, 30)) continue;
      drawPerson(ctx, ped.x, ped.y, ped.angle, ped, ped.walkPhase);
    }

    for (const unit of state.police.units) {
      if (unit.kind === 'car' || unit.kind === 'mtruck') {
        if (!inView(unit.car.x, unit.car.y, 60)) continue;
        if (unit.car.concrete) {
          ctx.save();
          ctx.translate(unit.car.x, unit.car.y);
          ctx.rotate(unit.car.angle);
          ctx.fillStyle = '#6b6f75';
          ctx.fillRect(-28, -14, 56, 28);
          ctx.fillStyle = '#ffd23e';
          for (let i = 0; i < 4; i += 1) ctx.fillRect(-28 + i * 14, -14, 7, 28);
          ctx.restore();
          continue;
        }
        drawCarShape(ctx, unit.car, night);
        const blink = Math.floor(state.elapsed * 6) % 2 === 0;
        ctx.fillStyle = blink ? '#ff3b30' : '#2f6fd0';
        ctx.beginPath();
        ctx.arc(unit.car.x, unit.car.y - 14, 4, 0, Math.PI * 2);
        ctx.fill();
        if (night > 0.3) {
          ctx.globalAlpha = 0.5 * night;
          ctx.drawImage(glowSprite, unit.car.x - 30, unit.car.y - 30, 60, 60);
          ctx.globalAlpha = 1;
        }
      } else if (unit.kind === 'gunman') {
        if (!inView(unit.x, unit.y, 30)) continue;
        const gunman = { ...unit, color: COLORS.gunman, skin: '#c98d5f', pants: '#1c1f24', hat: 0, build: 'wide' };
        drawPerson(ctx, unit.x, unit.y, unit.angle, gunman, state.elapsed * 8);
        ctx.save();
        ctx.translate(unit.x, unit.y);
        ctx.rotate(unit.angle);
        ctx.fillStyle = '#8a1f16';
        ctx.fillRect(6, -3, 18, 3);
        ctx.fillStyle = '#a33327';
        ctx.fillRect(2, -8, 12, 3);
        ctx.restore();
      } else {
        if (!inView(unit.x, unit.y, 30)) continue;
        const soldier = unit.kind === 'soldier';
        const officer = { ...unit, color: soldier ? '#5a6b3a' : COLORS.police, skin: '#e8b98a', pants: soldier ? '#3a4426' : '#1c2f4a', hat: 1, build: 'slim' };
        drawPerson(ctx, unit.x, unit.y, unit.angle, officer, state.elapsed * 8);
        ctx.fillStyle = soldier ? '#3a4426' : '#1c2f4a';
        ctx.beginPath();
        ctx.arc(unit.x, unit.y - 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(soldier ? 'M' : 'P', unit.x, unit.y - 16);
      }
    }

    for (const boat of state.boats || []) {
      if (!boat.alive || !inView(boat.x, boat.y, 120)) continue;
      for (const w of boat.wake) {
        const alpha = Math.max(0, w.life / w.maxLife);
        ctx.fillStyle = `rgba(230,245,255,${(alpha * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, 14 * alpha + 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawBoatShape(ctx, boat);
      if (boat.kind === 'player') {
        ctx.save();
        ctx.translate(boat.x, boat.y);
        ctx.rotate(boat.angle);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, 32, 14, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    for (const unit of state.police.units) {
      if (unit.kind !== 'boat' || !inView(unit.x, unit.y, 120)) continue;
      for (const w of unit.wake || []) {
        const alpha = Math.max(0, w.life / w.maxLife);
        ctx.fillStyle = `rgba(230,245,255,${(alpha * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, 14 * alpha + 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      drawBoatShape(ctx, { ...unit, color: '#2f6fd0' });
      const blink = Math.floor(state.elapsed * 6) % 2 === 0;
      ctx.fillStyle = blink ? '#ff3b30' : '#2f6fd0';
      ctx.beginPath();
      ctx.arc(unit.x, unit.y - 12, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const heli = state.police.heli;
    if (heli && heli.active && inView(heli.x, heli.y, 420)) {
      const px = state.player.x;
      const py = state.player.y;
      const dx = px - heli.x;
      const dy = py - heli.y;
      const dist = Math.hypot(dx, dy) || 1;
      const ux = dx / dist;
      const uy = dy / dist;
      const perpX = -uy;
      const perpY = ux;
      ctx.fillStyle = 'rgba(255,240,170,0.16)';
      ctx.beginPath();
      ctx.moveTo(heli.x, heli.y);
      ctx.lineTo(px + perpX * 46, py + perpY * 46);
      ctx.lineTo(px - perpX * 46, py - perpY * 46);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,170,0.35)';
      ctx.beginPath();
      ctx.arc(px, py, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(heli.x + 10, heli.y + 14, 22, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(heli.x, heli.y);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = '#1c2f4a';
      ctx.fillRect(-14, -3, 28, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-4, -6, 10, 12);
      ctx.fillStyle = '#ff3b30';
      ctx.fillRect(-16, -2, 5, 4);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      const rotor = heli.rotor;
      ctx.beginPath();
      ctx.moveTo(Math.cos(rotor) * -30, Math.sin(rotor) * -30);
      ctx.lineTo(Math.cos(rotor) * 30, Math.sin(rotor) * 30);
      ctx.moveTo(Math.cos(rotor + Math.PI / 2) * -30, Math.sin(rotor + Math.PI / 2) * -30);
      ctx.lineTo(Math.cos(rotor + Math.PI / 2) * 30, Math.sin(rotor + Math.PI / 2) * 30);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('HELI', heli.x, heli.y - 26);
    }

    for (const strip of state.police.strips) {
      if (!inView(strip.x, strip.y, 60)) continue;
      ctx.save();
      ctx.translate(strip.x, strip.y);
      ctx.rotate(strip.angle);
      const warn = 0.45 + 0.35 * Math.sin(state.elapsed * 6);
      ctx.strokeStyle = `rgba(255,210,62,${warn.toFixed(3)})`;
      ctx.lineWidth = 3;
      ctx.strokeRect(-37, -11, 74, 22);
      ctx.fillStyle = '#14181f';
      ctx.fillRect(-34, -7, 68, 14);
      ctx.fillStyle = '#c8cdd6';
      for (let i = -3; i <= 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 9 - 3, -7);
        ctx.lineTo(i * 9 + 3, -7);
        ctx.lineTo(i * 9, -13);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.strokeStyle = COLORS.neonYellow;
    ctx.lineWidth = 3;
    for (const b of state.bullets) {
      if (!inView(b.x, b.y, 20)) continue;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (const pt of state.particles) {
      if (!inView(pt.x, pt.y, pt.size * 2 + 20)) continue;
      const alpha = Math.max(0, pt.life / pt.maxLife);
      if (pt.kind === 'flame' || pt.kind === 'jet') {
        drawDestructionLight(pt, pt.x, pt.y, 1);
      } else if (pt.kind === 'flash') {
        ctx.globalAlpha = alpha;
        ctx.drawImage(glowSprite, pt.x - 20, pt.y - 20, 40, 40);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pt.x - 10, pt.y);
        ctx.lineTo(pt.x + 10, pt.y);
        ctx.moveTo(pt.x, pt.y - 10);
        ctx.lineTo(pt.x, pt.y + 10);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (pt.kind === 'smoke') {
        ctx.fillStyle = `rgba(140,140,150,${(alpha * 0.5).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * (1.6 - alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = pt.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - pt.vx * 0.03, pt.y - pt.vy * 0.03);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    if (state.events.muzzle) {
      const m = state.events.muzzle;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(glowSprite, m.x - 26, m.y - 26, 52, 52);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.events.spark) {
      const s = state.events.spark;
      ctx.drawImage(glowSprite, s.x - 16, s.y - 16, 32, 32);
    }

    for (const f of state.floaters) {
      if (!inView(f.x, f.y, 40)) continue;
      ctx.globalAlpha = Math.max(0, f.life / 1.4);
      ctx.fillStyle = f.color;
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(f.value, f.x, f.y);
      ctx.globalAlpha = 1;
    }

    const p = state.player;
    if (p.inCar && p.car) {
      const car = { ...p.car, color: p.car.paint || COLORS.playerCar, kind: 'player' };
      drawCarShape(ctx, car, night);
      if (p.car.paint) {
        ctx.save();
        ctx.translate(p.car.x, p.car.y);
        ctx.rotate(p.car.angle);
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        rr(ctx, -p.car.length / 2 - 4, -p.car.width / 2 - 4, p.car.length + 8, p.car.width + 8, 7);
        ctx.stroke();
        ctx.restore();
      }
      if (p.car.tiresPopped) {
        ctx.fillStyle = 'rgba(140,140,150,0.55)';
        ctx.beginPath();
        ctx.arc(p.car.x - Math.cos(p.car.angle) * 16, p.car.y - Math.sin(p.car.angle) * 16, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (!p.inBoat) {
      drawPlayer(ctx, p, state);
    }

    if (state.weather && state.weather.rain) {
      ctx.strokeStyle = 'rgba(174,194,224,0.45)';
      ctx.lineWidth = 1.5;
      for (const drop of state.rainDrops) {
        if (!inView(drop.x, drop.y, 20)) continue;
        ctx.beginPath();
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 4, drop.y - 16);
        ctx.stroke();
      }
    }
    const ufo = state.ufo;
    if (ufo && ufo.active && inView(ufo.x, ufo.y, 420)) {
      const bob = Math.sin(state.elapsed * 2) * 8;
      const uy = ufo.y + bob;
      ctx.fillStyle = 'rgba(120,255,140,0.20)';
      ctx.beginPath();
      ctx.moveTo(ufo.x - 14, uy + 8);
      ctx.lineTo(ufo.x - 70, uy + 280);
      ctx.lineTo(ufo.x + 70, uy + 280);
      ctx.lineTo(ufo.x + 14, uy + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(120,255,140,0.35)';
      ctx.beginPath();
      ctx.ellipse(ufo.x, uy + 280, 60, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,255,140,0.5)';
      ctx.beginPath();
      ctx.ellipse(ufo.x, uy, 46, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20242a';
      ctx.beginPath();
      ctx.ellipse(ufo.x, uy, 40, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,255,140,0.8)';
      ctx.beginPath();
      ctx.arc(ufo.x, uy - 6, 12, Math.PI, 0);
      ctx.fill();
      const blink = Math.floor(state.elapsed * 4) % 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = i === blink ? '#78ff8c' : 'rgba(120,255,140,0.35)';
        ctx.beginPath();
        ctx.arc(ufo.x - 26 + i * 26, uy + 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    if (night > 0.05) {
      ctx.fillStyle = `rgba(10,14,44,${(night * 0.48).toFixed(3)})`;
      ctx.fillRect(0, 0, view.w, view.h);
    }
    if (state.daylight > 0.55 && state.daylight < 0.85) {
      ctx.fillStyle = 'rgba(255,140,60,0.08)';
      ctx.fillRect(0, 0, view.w, view.h);
    }
    if (blackout) {
      ctx.fillStyle = 'rgba(2,4,12,0.45)';
      ctx.fillRect(0, 0, view.w, view.h);
      const sx = (x) => (x - camX) * zoom + view.w / 2;
      const sy = (y) => (y - camY) * zoom + view.h / 2;
      for (const pt of state.particles) {
        if (pt.kind === 'jet' || pt.kind === 'flame') drawDestructionLight(pt, sx(pt.x), sy(pt.y), zoom);
      }
      const heli2 = state.police.heli;
      if (heli2 && heli2.active) {
        const px = sx(state.player.x);
        const py = sy(state.player.y);
        const hx = sx(heli2.x);
        const hy = sy(heli2.y);
        const dx = px - hx;
        const dy = py - hy;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist;
        const uy = dy / dist;
        const perpX = -uy;
        const perpY = ux;
        ctx.fillStyle = 'rgba(255,240,170,0.16)';
        ctx.beginPath();
        ctx.moveTo(hx, hy);
        ctx.lineTo(px + perpX * 46 * zoom, py + perpY * 46 * zoom);
        ctx.lineTo(px - perpX * 46 * zoom, py - perpY * 46 * zoom);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,240,170,0.35)';
        ctx.beginPath();
        ctx.arc(px, py, 34 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      if (state.events.muzzle) {
        const m = state.events.muzzle;
        ctx.globalAlpha = 0.95;
        ctx.drawImage(glowSprite, sx(m.x) - 26 * zoom, sy(m.y) - 26 * zoom, 52 * zoom, 52 * zoom);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff6c8';
        ctx.beginPath();
        ctx.arc(sx(m.x), sy(m.y), 6 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      if (city.casino) {
        const flick = Math.sin(state.elapsed * 23) + Math.sin(state.elapsed * 7.3) > -0.4 ? 1 : 0.12;
        ctx.globalAlpha = flick;
        ctx.fillStyle = '#ffd23e';
        ctx.font = `bold ${Math.round(17 * zoom)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('★ CASINO ★', sx(city.casino.x), sy(city.casino.y) - 108 * zoom);
        ctx.globalAlpha = 1;
      }
      if (state.mission.target) {
        const t = state.mission.target;
        ctx.strokeStyle = COLORS.neonYellow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(sx(t.x), sy(t.y), 26 * zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = COLORS.neonYellow;
        ctx.beginPath();
        ctx.arc(sx(t.x), sy(t.y), 7 * zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd23e';
        ctx.font = `bold ${Math.round(13 * zoom)}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(t.label, sx(t.x), sy(t.y) - 34 * zoom);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx(state.player.x), sy(state.player.y), (PLAYER.radius + 3) * zoom, 0, Math.PI * 2);
      ctx.stroke();
      for (const unit of state.police.units) {
        if (unit.kind !== 'gunman') continue;
        ctx.fillStyle = '#a33327';
        ctx.beginPath();
        ctx.arc(sx(unit.x), sy(unit.y), 9 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.drawImage(vignetteSprite, 0, 0, view.w, view.h);
    if (state.weather && state.weather.storm && state.weather.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(0, 0, view.w, view.h);
    }
    if (state.weather && state.weather.flash > 0 && state.weather.bolt && state.weather.bolt.points) {
      const pts = state.weather.bolt.points;
      const bx = (x) => (x - camX) * zoom + view.w / 2;
      const by = (y) => (y - camY) * zoom + view.h / 2;
      ctx.strokeStyle = '#3b6fe0';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(bx(pts[0].x), by(pts[0].y));
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(bx(pts[i].x), by(pts[i].y));
      ctx.stroke();
      ctx.strokeStyle = '#eaf2ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx(pts[0].x), by(pts[0].y));
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(bx(pts[i].x), by(pts[i].y));
      ctx.stroke();
    }
    return { camX, camY };
  }

  function drawStars(ctx2, wanted, x, y) {
    const full = Math.floor(wanted);
    for (let i = 0; i < 6; i += 1) {
      const cx = x + i * 26;
      const filled = i < full;
      // The 6th star is the military: red, not gold.
      ctx2.fillStyle = filled ? (i === 5 ? '#ff5a3c' : COLORS.neonYellow) : 'rgba(255,255,255,0.25)';
      ctx2.font = `bold 22px ${FONT}`;
      ctx2.textAlign = 'left';
      ctx2.textBaseline = 'alphabetic';
      ctx2.fillText('★', cx, y);
    }
  }

  function drawHud(state, best, ui) {
    const p = state.player;
    const collected = state.collectibles.filter((c) => c.taken).length;
    ctx.fillStyle = 'rgba(14,20,32,0.82)';
    ctx.fillRect(12, 12, 250, 132);
    text(`$${state.cash}`, 24, 40, 26, COLORS.cash, 'left', 'bold');
    text(`Best $${best}`, 150, 40, 15, '#c8cdd6', 'left');
    ctx.fillStyle = '#3a0d0d';
    ctx.fillRect(24, 52, 160, 14);
    ctx.fillStyle = p.health > 30 ? '#4ade80' : '#ef4444';
    ctx.fillRect(24, 52, Math.max(0, 160 * (p.health / 100)), 14);
    text('HP', 190, 64, 13, '#eef1f5', 'left', 'bold');
    drawStars(ctx, state.wanted, 24, 96);
    const weapon = WEAPONS[p.weapon];
    text(`${weapon.name}  ${p.ammo} / ${p.reserve}`, 24, 118, 15, '#eef1f5', 'left');
    text(`◆ ${collected}/${state.collectibles.length}`, 24, 138, 14, COLORS.neonYellow, 'left', 'bold');
    if ((p.inCar && p.car) || (p.inBoat && p.boat)) {
      const vehicle = p.inCar ? p.car : p.boat;
      const speed = Math.round(Math.abs(vehicle.speed) * 0.36);
      ctx.fillStyle = 'rgba(14,20,32,0.82)';
      ctx.fillRect(view.w - 188, view.h - 116, 172, 52);
      text(`${speed} km/h`, view.w - 28, view.h - 78, 30, '#ffffff', 'right', 'bold');
      if (p.inCar && p.car) {
        const hp = Math.max(0, Math.round(p.car.hp || 0));
        text(`Car ${hp}%`, view.w - 28, view.h - 100, 12, '#c8cdd6', 'right');
      } else {
        text('Speedboat', view.w - 28, view.h - 100, 12, '#c8cdd6', 'right');
      }
      if (p.car && p.car.tiresPopped) {
        text('TIRES POPPED — garage $150 (G)', view.w - 16, view.h - 128, 14, '#ff5a3c', 'right', 'bold');
      }
    }
    const hints = p.inCar
      ? 'E exit · Q weapon · C radio · G repair/respray · M mute'
      : p.inBoat
        ? 'E step ashore · C radio · M mute'
        : 'E enter car / boat · R reload · Q weapon · C radio · M mute';
    text(hints, view.w - 16, view.h - 24, 14, '#c8cdd6', 'right');
    const objective = currentObjective(state);
    ctx.font = `bold 16px ${FONT}`;
    const ow = Math.min(view.w - 32, ctx.measureText(objective).width + 44);
    ctx.fillStyle = 'rgba(14,20,32,0.9)';
    ctx.fillRect(16, view.h - 64, ow, 34);
    ctx.fillStyle = COLORS.neonCyan;
    ctx.fillRect(16, view.h - 64, 4, 34);
    text(objective, 30, view.h - 41, 16, '#ffffff', 'left', 'bold');
    if (ui && ui.stationName) {
      const label = `♪ ${ui.stationName}`;
      ctx.font = `bold 13px ${FONT}`;
      const lw = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(14,20,32,0.82)';
      ctx.fillRect(12, 152, lw + 24, 24);
      text(label, 24, 168, 13, COLORS.neonPink, 'left', 'bold');
    }
    drawMinimap(ctx, state, view.w - 216, 16, 200, 150);
    const total = state.clock ? state.clock.total : 0;
    const day = 1 + Math.floor(total / 1440);
    const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
    const mm = String(Math.floor(total) % 60).padStart(2, '0');
    const district = districtAt(state.city, state.player.x, state.player.y);
    const heatIdx = state.city.districts.indexOf(district);
    const heat = state.heat ? Math.round(state.heat[heatIdx] || 0) : 0;
    const hot = heat >= 60;
    const blackout = state.blackout && state.blackout.active;
    const readout = `DAY ${day} · ${hh}:${mm} · ${district.name.toUpperCase()} · HEAT ${heat}${hot ? ' HOT!' : ''}${blackout ? ' · BLACKOUT' : ''}`;
    ctx.font = `bold 15px ${FONT}`;
    const rw = ctx.measureText(readout).width + 28;
    ctx.fillStyle = 'rgba(14,20,32,0.82)';
    ctx.fillRect((view.w - rw) / 2, 12, rw, 28);
    ctx.fillStyle = hot ? '#ff8a7a' : COLORS.neonCyan;
    ctx.fillRect((view.w - rw) / 2, 12, 4, 28);
    text(readout, view.w / 2, 31, 15, hot ? '#ff8a7a' : '#ffffff', 'center', 'bold');
    if (state.wanted >= 6) {
      const banner = '⚠ MILITARY RESPONSE ⚠';
      ctx.font = `bold 15px ${FONT}`;
      const bw = ctx.measureText(banner).width + 28;
      ctx.fillStyle = 'rgba(120,10,10,0.9)';
      ctx.fillRect((view.w - bw) / 2, 44, bw, 28);
      text(banner, view.w / 2, 63, 15, '#ffffff', 'center', 'bold');
    }
    if (state.mission.dialogueTimer > 0 && state.mission.dialogue.length > 0) {
      const line = state.mission.dialogue[0];
      ctx.fillStyle = 'rgba(14,20,32,0.88)';
      ctx.fillRect(16, view.h - 150, Math.min(view.w - 32, 640), 62);
      ctx.fillStyle = COLORS.neonPink;
      ctx.fillRect(16, view.h - 150, 4, 62);
      text(line, 30, view.h - 126, 16, '#ffffff', 'left');
      text('MARA — Harbor Crew', 30, view.h - 104, 13, COLORS.neonPink, 'left', 'bold');
    }
    if (state.wanted >= 3) {
      ctx.fillStyle = 'rgba(239,68,68,0.08)';
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }

  function drawPanel(title, lines, prompt, accent, subtitle) {
    const width = Math.min(640, view.w - 48);
    const height = 120 + lines.length * 32 + 70 + (subtitle ? 34 : 0);
    const x = (view.w - width) / 2;
    const y = (view.h - height) / 2;
    ctx.fillStyle = 'rgba(14,20,32,0.94)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = accent || COLORS.neonPink;
    ctx.fillRect(x, y, width, 5);
    text(title, view.w / 2, y + (subtitle ? 64 : 72), 46, '#ffffff', 'center', 'bold');
    if (subtitle) text(subtitle, view.w / 2, y + 100, 22, COLORS.neonPink, 'center', 'bold');
    lines.forEach((line, i) => {
      text(line, view.w / 2, y + (subtitle ? 150 : 120) + i * 32, 19, '#c8cdd6', 'center');
    });
    text(prompt, view.w / 2, y + height - 30, 20, COLORS.neonYellow, 'center', 'bold');
  }

  function drawSkyline() {
    const base = view.h - 120;
    ctx.fillStyle = '#0a0f1c';
    ctx.fillRect(0, base, view.w, 120);
    let x = 0;
    let i = 0;
    while (x < view.w) {
      const w = 60 + ((i * 37) % 70);
      const h = 40 + ((i * 53) % 90);
      ctx.fillStyle = i % 2 === 0 ? '#131c2e' : '#0f1626';
      ctx.fillRect(x, base - h, w, h + 120);
      ctx.fillStyle = i % 3 === 0 ? COLORS.neonPink : COLORS.neonCyan;
      ctx.globalAlpha = 0.8;
      for (let wy = base - h + 10; wy < base - 8; wy += 18) {
        for (let wx = x + 8; wx < x + w - 8; wx += 16) {
          if ((wx + wy + i) % 5 === 0) ctx.fillRect(wx, wy, 5, 7);
        }
      }
      ctx.globalAlpha = 1;
      x += w + 8;
      i += 1;
    }
  }

  const TITLE_LINES = [
    'Jax Marlowe came to Neon Harbor to drive. The harbor crew had other plans.',
    'His fixer Mara set him up — to save his life. Now they rob the police evidence vault together.',
    'Steal a car or a speedboat, run the package, lose the heat — twelve missions across three days.',
    'WASD / arrows — move & drive    Mouse — aim    Click / Space — shoot',
    'E — enter / exit car or boat    R — reload    Q — switch weapon    C — radio',
    'G — garage repair / respray    U — upgrade shop    O — settings',
    'Street races, taxi fares, harbor tokens and weapon pickups hide all over the city.',
  ];

  function drawSettings(ui) {
    const settings = ui.settings;
    const lines = [
      `Volume: ${Math.round(settings.volume * 100)}%  (Left / Right)`,
      `Radio station: ${settings.stationName}  (Left / Right)`,
      `Rebind Interact: ${settings.bindings.interact}  (Enter to capture a key)`,
      `Rebind Reload: ${settings.bindings.reload}  (Enter to capture a key)`,
      `Rebind Mute: ${settings.bindings.mute}  (Enter to capture a key)`,
      'Back to game',
    ];
    const width = Math.min(640, view.w - 48);
    const height = 120 + lines.length * 34 + 80;
    const x = (view.w - width) / 2;
    const y = (view.h - height) / 2;
    ctx.fillStyle = 'rgba(14,20,32,0.95)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = COLORS.neonCyan;
    ctx.fillRect(x, y, width, 5);
    text('SETTINGS', view.w / 2, y + 72, 40, '#ffffff', 'center', 'bold');
    lines.forEach((line, i) => {
      const selected = i === ui.settingsIndex;
      if (selected) {
        ctx.fillStyle = 'rgba(55,224,230,0.18)';
        ctx.fillRect(x + 16, y + 104 + i * 34, width - 32, 28);
      }
      const label = ui.capturing === i ? `${line}  — press a key…` : line;
      text(label, view.w / 2, y + 124 + i * 34, 17, selected ? '#ffffff' : '#c8cdd6', 'center', selected ? 'bold' : '');
    });
    text('Up / Down to choose · Esc to go back', view.w / 2, y + height - 30, 16, COLORS.neonYellow, 'center', 'bold');
  }

  function drawShop(state, ui) {
    const closed = garageHot(state);
    const width = Math.min(680, view.w - 48);
    const lineH = 52;
    const height = 150 + UPGRADES.length * lineH + 60 + (closed ? 30 : 0);
    const x = (view.w - width) / 2;
    const y = (view.h - height) / 2;
    ctx.fillStyle = 'rgba(14,20,32,0.95)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = COLORS.neonCyan;
    ctx.fillRect(x, y, width, 5);
    text('GARAGE — UPGRADE SHOP', view.w / 2, y + 58, 30, '#ffffff', 'center', 'bold');
    text(`Cash $${state.cash} — fitted for good, kept for this visit`, view.w / 2, y + 88, 15, COLORS.cash, 'center');
    if (closed) {
      const g = state.city.garage;
      const d = districtAt(state.city, g.x, g.y);
      const heat = state.heat ? Math.round(state.heat[state.city.districts.indexOf(d)] || 0) : 0;
      text(`CLOSED — ${d.name} is too hot (HEAT ${heat}). Come back when it cools.`, view.w / 2, y + 112, 15, '#ff8a7a', 'center', 'bold');
    }
    UPGRADES.forEach((u, i) => {
      const owned = state.upgrades && state.upgrades[u.id];
      const selected = i === ui.shopIndex;
      const rowY = y + 108 + (closed ? 30 : 0) + i * lineH;
      if (selected) {
        ctx.fillStyle = 'rgba(55,224,230,0.18)';
        ctx.fillRect(x + 16, rowY, width - 32, lineH - 8);
      }
      text(u.name, x + 32, rowY + 24, 18, selected ? '#ffffff' : '#eef1f5', 'left', selected ? 'bold' : '');
      text(u.desc, x + 32, rowY + 44, 13, '#c8cdd6', 'left');
      text(owned ? 'OWNED' : `$${u.cost}`, x + width - 32, rowY + 30, 17, owned ? COLORS.cash : COLORS.neonYellow, 'right', 'bold');
    });
    text('Up / Down to choose · Enter to buy · Esc to close', view.w / 2, y + height - 24, 16, COLORS.neonYellow, 'center', 'bold');
  }

  function draw(state, screen, best, ui) {
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, view.w, view.h);
    if (screen === SCREEN_TITLE) {
      const saved = { ...state.camera };
      state.camera.x = 1120 + Math.sin(state.elapsed * 0.1) * 200;
      state.camera.y = 960;
      drawWorld(state);
      state.camera.x = saved.x;
      state.camera.y = saved.y;
      drawSkyline();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(glowSprite, view.w / 2 - 320, 60, 640, 130);
      ctx.globalAlpha = 1;
      drawPanel('NEON HARBOR', TITLE_LINES, 'Press Enter or click to start', COLORS.neonCyan, '— THE MARA JOB —');
      text(`Best cash $${best}`, view.w / 2, view.h - 40, 16, '#c8cdd6', 'center');
      return;
    }
    drawWorld(state);
    drawHud(state, best, ui);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The city waits for no one — except right now.', 'O — settings'], 'Press P or Esc to resume', COLORS.neonCyan);
    } else if (screen === SCREEN_SETTINGS) {
      drawSettings(ui || { settings: { volume: 0.8, stationName: 'Harbor FM', bindings: {} }, settingsIndex: 0, capturing: -1 });
    } else if (screen === SCREEN_SHOP) {
      drawShop(state, ui || { shopIndex: 0 });
    } else if (screen === SCREEN_OVER) {
      const title = state.overKind === 'busted' ? 'BUSTED' : 'WASTED';
      const lines = [
        state.overKind === 'busted'
          ? 'The Harbor Police caught Jax. The crew will have to wait.'
          : 'Jax went down in Neon Harbor. The city keeps moving.',
        `Cash kept: $${state.cash}    Best: $${best}`,
      ];
      if (ui && ui.hasCheckpoint) lines.push('C — resume from the last checkpoint');
      drawPanel(title, lines, 'Press Enter to play again', '#ef4444');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
