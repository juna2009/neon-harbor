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

const shots = [
  ['1-chase.jpg', '?shot=chase&seed=7'],
  ['2-onfoot.jpg', '?shot=onfoot&seed=7'],
  ['3-mission.jpg', '?shot=mission&seed=7'],
  ['4-police.jpg', '?shot=police&seed=7'],
];

for (const [file, query] of shots) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${file}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${file}: pageerror ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`${file}: ${r.url()} ${r.failure()?.errorText}`));
  await page.goto(`http://localhost:${PORT}/${query}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/${file}`, type: 'jpeg', quality: 80 });
  const size = statSync(`${SHOTS}/${file}`).size;
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
await page.screenshot({ path: '/tmp/neon-harbor-live.jpg', type: 'jpeg', quality: 80 });
console.log('live play test done, title:', await page.title());
await page.close();

await browser.close();
server.kill();
console.log('console errors:', JSON.stringify(errors, null, 2));
