// Neon Harbor — drawbridge: Harbor canal crossing on road x=2400.
export const BRIDGE = { x: 2400, y: 1680, top: 1640, bottom: 1720, halfW: 40 };
export function createBridge() { return { up: false, timer: 0, inGap: false }; }
export function stepBridge(b, s, dt, fx) {
  const p = s.player;
  const c = p.inCar && p.car ? p.car : null;
  const px = c ? c.x : p.x, py = c ? c.y : p.y, sp = c ? Math.abs(c.speed) : 0;
  const d = Math.hypot(px - BRIDGE.x, py - BRIDGE.y);
  const inGap = Math.abs(px - BRIDGE.x) < BRIDGE.halfW && py > BRIDGE.top && py < BRIDGE.bottom;
  if (!b.up && !inGap && sp > 200 && d < 320 && (s.wanted >= 3 || s.mission.index === 11)) {
    b.up = true; b.timer = 20;
    s.events.bridgeAlarm = true;
    s.mission.dialogue = ['DRAWBRIDGE UP! Jump it — or swim.'];
    s.mission.dialogueTimer = 5;
  }
  if (b.up && ((b.timer -= dt) <= 0 || d > 520)) b.up = false;
  if (inGap && !b.inGap && b.up) {
    if (sp >= 300) {
      s.events.jump = true; s.events.bridgeJump = true;
      c.speed = Math.sign(c.speed) * 220;
      if (s.mission.index === 11) fx.floater(px, py - 30, 'BRIDGE JUMP!', '#ffd23e');
      else { s.cash += 100; fx.floater(px, py - 30, 'DRAWBRIDGE JUMP! +$100', '#ffd23e'); }
    } else {
      if (c) { fx.explosion(c.x, c.y); c.alive = false; p.inCar = false; p.car = null; }
      p.x = BRIDGE.x; p.y = 1600;
      p.health = Math.max(10, p.health - 15);
      s.mission.dialogue = [c ? 'Into the harbor! The car is gone.' : 'Into the harbor! Swim back to the road.'];
      s.mission.dialogueTimer = 5;
    }
  }
  b.inGap = inGap;
}
export function drawBridge(ctx, b, t) {
  const x = BRIDGE.x, top = BRIDGE.top, bot = BRIDGE.bottom;
  if (b.up) { ctx.fillStyle = '#1d6f9e'; ctx.fillRect(x - 36, top, 72, bot - top); }
  ctx.fillStyle = '#3a3f46';
  ctx.fillRect(x - 36, top - 6, 72, 6); ctx.fillRect(x - 36, bot, 72, 6);
  for (let i = 0; i < 9; i += 1) {
    ctx.fillStyle = i % 2 ? '#111' : '#ffd23e';
    ctx.fillRect(x - 36 + i * 8, top - 6, 8, 6); ctx.fillRect(x - 36 + i * 8, bot, 8, 6);
  }
  if (b.up) {
    ctx.fillStyle = '#2c313a';
    ctx.fillRect(x - 30, top - 34, 60, 30); ctx.fillRect(x - 30, bot + 4, 60, 30);
    ctx.fillStyle = Math.sin(t * 10) > 0 ? '#ff3b30' : '#7a1f1a';
    for (const [lx, ly] of [[-40, top - 8], [40, top - 8], [-40, bot + 8], [40, bot + 8]]) {
      ctx.beginPath(); ctx.arc(x + lx, ly, 5, 0, 7); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#4a5058'; ctx.fillRect(x - 36, top, 72, bot - top);
    ctx.fillStyle = '#e8d44d'; ctx.fillRect(x - 2, top + 8, 4, bot - top - 16);
  }
}
