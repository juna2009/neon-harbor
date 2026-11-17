// Screenshot driver for the Neon Harbor entry. Serves game/ on localhost
// and captures the four gate screenshots with Playwright against the
// cached Chromium. Not part of the entry (lives in the repo root, not game/).
import { createRequire } from 'node:module';
const require = createRequire('/tmp/shot-tools/node_modules/playwright-core/package.json');
const { chromium } = require('playwright-core');
import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';

const ROOT = '/home/hatch/workspace/makefun/gta6-01-entry';
const SHOTS = `${ROOT}/screenshots`;
const PORT = 8081;

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: ROOT, stdio: 'pipe' });
await new Promise((resolve) => {
  server.stdout.on('data', () => resolve());
  setTimeout(resolve, 3000);
});

const exe = '/home/hatch/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const errors = [];

// Round 5 final set: chase (cover), boat (dawn harbor chase), blackout
// (finale in total darkness), police (sunset roadblock). The onfoot,
// mission and shop scenes are still staged and captured for review, but
// they live in /tmp — NOT in screenshots/, so the dossier never exceeds
// its 4-image cap. The shop frame is a menu frame; the mission frame is
// the same vault moment the blackout frame shows, only less dramatic;
// onfoot's shootout is covered by the blackout frame's muzzle flash.
const shots = [
  ['1-chase.jpg', '?shot=chase&seed=7', `${SHOTS}`],
  ['2-boat.jpg', '?shot=boat&seed=7', `${SHOTS}`],
  ['3-blackout.jpg', '?shot=blackout&seed=7', `${SHOTS}`],
  ['4-police.jpg', '?shot=police&seed=7', `${SHOTS}`],
  ['neon-harbor-shop5.jpg', '?shot=shop&seed=7', '/tmp'],
  ['neon-harbor-onfoot5.jpg', '?shot=onfoot&seed=7', '/tmp'],
  ['neon-harbor-mission5.jpg', '?shot=mission&seed=7', '/tmp'],
];

for (const [file, query, dir] of shots) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${file}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${file}: pageerror ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`${file}: ${r.url()} ${r.failure()?.errorText}`));
  await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${dir}/${file}`, type: 'jpeg', quality: 80 });
  const size = statSync(`${dir}/${file}`).size;
  console.log(`shot ${file}: ${size} bytes`);
  await page.close();
}

// Also smoke-test the live game (title screen, no shot mode) for errors.
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error') errors.push(`live: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`live: pageerror ${e.message}`));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('Enter');
await page.waitForTimeout(2000);
await page.keyboard.down('KeyW');
await page.waitForTimeout(1200);
await page.keyboard.up('KeyW');
await page.keyboard.press('KeyE');
await page.waitForTimeout(1500);
await page.keyboard.press('KeyE');
await page.waitForTimeout(800);
await page.mouse.move(900, 400);
await page.mouse.down();
await page.waitForTimeout(700);
await page.mouse.up();
await page.keyboard.press('KeyR');
await page.waitForTimeout(400);
await page.keyboard.press('KeyQ');
await page.keyboard.press('KeyC');
await page.waitForTimeout(400);
await page.keyboard.press('KeyP');
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/neon-harbor-paused.jpg', type: 'jpeg', quality: 80 });
await page.keyboard.press('KeyO');
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/neon-harbor-settings.jpg', type: 'jpeg', quality: 80 });
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
await page.keyboard.press('KeyP');
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/neon-harbor-live.jpg', type: 'jpeg', quality: 80 });
console.log('live play test done, title:', await page.title());
await page.close();

await browser.close();
server.kill();
console.log('console errors:', JSON.stringify(errors, null, 2));
