// Neon Harbor — drawing only: the city, cars, people, effects, the HUD
// (cash, health, wanted stars, ammo, speed, objective, minimap) and the
// title, pause and game-over screens. The camera follows the player.
import { COLORS, PLAYER, WORLD_H, WORLD_W } from './config.js';
import { WATER_X } from './city.js';
import { currentObjective } from './missions.js';
import { drawMinimap } from './minimap.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = '#14181f';
  ctx.fillRect(-car.length / 2 - 2, -car.width / 2 - 2, car.length + 4, car.width + 4);
  ctx.fillStyle = car.color;
  ctx.fillRect(-car.length / 2, -car.width / 2, car.length, car.width);
  ctx.fillStyle = '#bfe6ff';
  ctx.fillRect(car.length / 2 - 14, -car.width / 2 + 3, 9, car.width - 6);
  ctx.fillStyle = '#20242a';
  ctx.fillRect(-car.length / 2 + 6, -car.width / 2 + 3, 8, car.width - 6);
  if (car.kind === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -car.width / 2 + 2, 8, car.width - 4);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-car.length / 2 + 2, -car.width / 2 + 2, 5, 5);
    ctx.fillStyle = '#2f6fd0';
    ctx.fillRect(-car.length / 2 + 2, car.width / 2 - 7, 5, 5);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, color, radius, walkPhase) {
  const bob = Math.sin(walkPhase) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#20242a';
  ctx.beginPath();
  ctx.arc(radius * 0.55, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: 1280, h: 800, scale: 1 };
  const fonts = new Map();

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

  function drawWorld(state) {
    const cam = state.camera;
    const camX = Math.max(view.w / 2, Math.min(WORLD_W - view.w / 2, cam.x));
    const camY = Math.max(view.h / 2, Math.min(WORLD_H - view.h / 2, cam.y));
    const ox = view.w / 2 - camX;
    const oy = view.h / 2 - camY;
    ctx.save();
    ctx.translate(ox, oy);

    // Ground.
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(camX - view.w / 2 - 40, camY - view.h / 2 - 40, view.w + 80, view.h + 80);
    // Water and docks.
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(WATER_X, 0, WORLD_W - WATER_X, WORLD_H);
    ctx.fillStyle = COLORS.waterDeep;
    for (let y = 0; y < WORLD_H; y += 96) {
      ctx.fillRect(WATER_X + 12, y + 30, 60, 4);
      ctx.fillRect(WATER_X + 40, y + 70, 44, 4);
    }
    ctx.fillStyle = '#8a6f4d';
    ctx.fillRect(state.city.docks.x, state.city.docks.y, state.city.docks.w, state.city.docks.h);
    ctx.fillStyle = '#6b5638';
    for (let y = state.city.docks.y + 10; y < state.city.docks.y + state.city.docks.h; y += 28) {
      ctx.fillRect(state.city.docks.x, y, state.city.docks.w, 3);
    }
    // Marina pier.
    ctx.fillStyle = '#8a6f4d';
    ctx.fillRect(state.city.marina.x, state.city.marina.y, state.city.marina.w, state.city.marina.h);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(state.city.marina.x + 100, state.city.marina.y + 60);
    ctx.lineTo(state.city.marina.x + 130, state.city.marina.y + 60);
    ctx.lineTo(state.city.marina.x + 115, state.city.marina.y + 20);
    ctx.closePath();
    ctx.fill();

    // Sidewalks and roads.
    ctx.fillStyle = COLORS.sidewalk;
    for (const rx of state.city.roadsV) ctx.fillRect(rx - 52, 0, 104, WORLD_H);
    for (const ry of state.city.roadsH) ctx.fillRect(0, ry - 52, WORLD_W, 104);
    ctx.fillStyle = COLORS.road;
    for (const rx of state.city.roadsV) ctx.fillRect(rx - 36, 0, 72, WORLD_H);
    for (const ry of state.city.roadsH) ctx.fillRect(0, ry - 36, WORLD_W, 72);
    ctx.fillStyle = COLORS.roadLine;
    for (const rx of state.city.roadsV) {
      for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(rx - 2, y + 12, 4, 32);
    }
    for (const ry of state.city.roadsH) {
      for (let x = 0; x < WATER_X; x += 64) ctx.fillRect(x + 12, ry - 2, 32, 4);
    }

    // Parks and trees.
    for (const park of state.city.parks) {
      ctx.fillStyle = COLORS.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    for (const tree of state.city.trees) {
      ctx.fillStyle = COLORS.tree;
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Buildings with neon roof trim.
    for (const b of state.city.buildings) {
      ctx.fillStyle = '#20242a';
      ctx.fillRect(b.x - 3, b.y - 3 + b.height * 3, b.w + 6, b.h + 6);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = b.neon;
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 8);
    }

    // Mission marker: a pulsing beacon and a line from the player.
    if (state.mission.target) {
      const t = state.mission.target;
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

    // Parked and traffic cars.
    for (const car of state.traffic.parked) if (car.alive) drawCarShape(ctx, car);
    for (const car of state.traffic.cars) if (car.alive) drawCarShape(ctx, car);

    // Pedestrians.
    for (const ped of state.peds) {
      if (!ped.alive) continue;
      drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, 10, ped.walkPhase);
    }

    // Police.
    for (const unit of state.police.units) {
      if (unit.kind === 'car') {
        drawCarShape(ctx, unit.car);
        ctx.fillStyle = '#ff3b30';
        const blink = Math.floor(state.elapsed * 6) % 2 === 0;
        ctx.fillStyle = blink ? '#ff3b30' : '#2f6fd0';
        ctx.beginPath();
        ctx.arc(unit.car.x, unit.car.y - 14, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawPerson(ctx, unit.x, unit.y, unit.angle, unit.kind === 'gunman' ? '#3a3a3a' : COLORS.police, 11, state.elapsed * 8);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(unit.kind === 'gunman' ? '!' : 'P', unit.x, unit.y - 16);
      }
    }

    // Bullets.
    ctx.fillStyle = COLORS.neonYellow;
    for (const b of state.bullets) {
      ctx.fillRect(b.x - 3, b.y - 1.5, 6, 3);
    }

    // Player: on foot with aim, or the car they drive.
    const p = state.player;
    if (p.inCar && p.car) {
      const car = { ...p.car, color: COLORS.playerCar, kind: 'player' };
      drawCarShape(ctx, car);
    } else {
      drawPerson(ctx, p.x, p.y, p.angle, COLORS.player, PLAYER.radius, p.runPhase);
      // White ring so Jax reads at a glance among the pedestrians.
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
      // Aim line and pistol.
      ctx.strokeStyle = 'rgba(255,210,62,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18);
      ctx.lineTo(p.x + Math.cos(p.angle) * 46, p.y + Math.sin(p.angle) * 46);
      ctx.stroke();
    }

    // Objective direction arrow at the screen edge is drawn in screen space.
    ctx.restore();
    return { camX, camY };
  }

  function drawStars(ctx2, wanted, x, y) {
    const full = Math.floor(wanted);
    for (let i = 0; i < 5; i += 1) {
      const cx = x + i * 26;
      const filled = i < full;
      ctx2.fillStyle = filled ? COLORS.neonYellow : 'rgba(255,255,255,0.25)';
      ctx2.font = `bold 22px ${FONT}`;
      ctx2.textAlign = 'left';
      ctx2.textBaseline = 'alphabetic';
      ctx2.fillText('★', cx, y);
    }
  }

  function drawHud(state, best) {
    const p = state.player;
    ctx.fillStyle = 'rgba(14,20,32,0.82)';
    ctx.fillRect(12, 12, 250, 108);
    text(`$${state.cash}`, 24, 40, 26, COLORS.cash, 'left', 'bold');
    text(`Best $${best}`, 150, 40, 15, '#c8cdd6', 'left');
    // Health bar.
    ctx.fillStyle = '#3a0d0d';
    ctx.fillRect(24, 52, 160, 14);
    ctx.fillStyle = p.health > 30 ? '#4ade80' : '#ef4444';
    ctx.fillRect(24, 52, Math.max(0, 160 * (p.health / 100)), 14);
    text('HP', 190, 64, 13, '#eef1f5', 'left', 'bold');
    drawStars(ctx, state.wanted, 24, 96);
    text(`Ammo ${p.ammo} / ${p.reserve}`, 24, 112, 15, '#eef1f5', 'left');
    if (p.inCar && p.car) {
      const speed = Math.round(Math.abs(p.car.speed) * 0.36);
      text(`${speed} km/h`, view.w - 24, view.h - 24, 30, '#ffffff', 'right', 'bold');
      text('E — exit car', view.w - 24, view.h - 52, 14, '#c8cdd6', 'right');
    } else {
      text('E — enter car   R — reload   M — mute', view.w - 24, view.h - 24, 14, '#c8cdd6', 'right');
    }
    // Objective bar.
    const objective = currentObjective(state);
    ctx.fillStyle = 'rgba(14,20,32,0.82)';
    const ow = Math.min(view.w - 32, 520);
    ctx.fillRect(16, view.h - 64, ow, 34);
    ctx.fillStyle = COLORS.neonCyan;
    ctx.fillRect(16, view.h - 64, 4, 34);
    text(objective, 30, view.h - 41, 16, '#ffffff', 'left', 'bold');
    // Minimap.
    drawMinimap(ctx, state, view.w - 216, 16, 200, 150);
    // Dialogue box.
    if (state.mission.dialogueTimer > 0 && state.mission.dialogue.length > 0) {
      const line = state.mission.dialogue[0];
      ctx.fillStyle = 'rgba(14,20,32,0.88)';
      ctx.fillRect(16, view.h - 150, Math.min(view.w - 32, 640), 62);
      ctx.fillStyle = COLORS.neonPink;
      ctx.fillRect(16, view.h - 150, 4, 62);
      text(line, 30, view.h - 126, 16, '#ffffff', 'left');
      text('MARA — Harbor Crew', 30, view.h - 104, 13, COLORS.neonPink, 'left', 'bold');
    }
    // Wanted flash.
    if (state.wanted >= 3) {
      ctx.fillStyle = 'rgba(239,68,68,0.08)';
      ctx.fillRect(0, 0, view.w, view.h);
    }
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = Math.min(640, view.w - 48);
    const height = 120 + lines.length * 32 + 70;
    const x = (view.w - width) / 2;
    const y = (view.h - height) / 2;
    ctx.fillStyle = 'rgba(14,20,32,0.94)';
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = accent || COLORS.neonPink;
    ctx.fillRect(x, y, width, 5);
    text(title, view.w / 2, y + 72, 46, '#ffffff', 'center', 'bold');
    lines.forEach((line, i) => {
      text(line, view.w / 2, y + 120 + i * 32, 19, '#c8cdd6', 'center');
    });
    text(prompt, view.w / 2, y + height - 30, 20, COLORS.neonYellow, 'center', 'bold');
  }

  const TITLE_LINES = [
    'Jax Marlowe came to Neon Harbor to drive. The harbor crew had other plans.',
    'Steal a car, run the package, lose the heat — and survive the showdown at the docks.',
    'WASD / arrows — move & drive    Mouse — aim    Click / Space — shoot',
    'E — enter / exit car    R — reload    Shift — run    P — pause    M — mute',
  ];

  function draw(state, screen, best) {
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, view.w, view.h);
    if (screen === SCREEN_TITLE) {
      // Title backdrop: the city itself, camera drifting over downtown.
      const saved = { ...state.camera };
      state.camera.x = 1120 + Math.sin(state.elapsed * 0.1) * 200;
      state.camera.y = 960;
      drawWorld(state);
      state.camera.x = saved.x;
      state.camera.y = saved.y;
      drawPanel('NEON HARBOR', TITLE_LINES, 'Press Enter or click to start', COLORS.neonCyan);
      text(`Best cash $${best}`, view.w / 2, view.h - 40, 16, '#c8cdd6', 'center');
      return;
    }
    drawWorld(state);
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The city waits for no one — except right now.'], 'Press P or Esc to resume', COLORS.neonCyan);
    } else if (screen === SCREEN_OVER) {
      const title = state.overKind === 'busted' ? 'BUSTED' : 'WASTED';
      const lines = [
        state.overKind === 'busted'
          ? 'The Harbor Police caught Jax. The crew will have to wait.'
          : 'Jax went down in Neon Harbor. The city keeps moving.',
        `Cash kept: $${state.cash}    Best: $${best}`,
      ];
      drawPanel(title, lines, 'Press Enter to play again', '#ef4444');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
