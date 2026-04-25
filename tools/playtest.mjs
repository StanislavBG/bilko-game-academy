#!/usr/bin/env node
/**
 * Headless playtest — drives a real browser through the dev server and
 * exercises Stage 1: boots Home, launches Stage 1, simulates drag input
 * and keyboard fire/pause, takes screenshots at key moments.
 *
 * Requires: dev server already running on localhost:5173, and Playwright
 * from a sibling project (we reuse /home/bilko/Projects/session-manager).
 */

import { chromium } from '/home/bilko/Projects/session-manager/node_modules/playwright-core/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = '/tmp/boat-shooter-playtest';
mkdirSync(OUT, { recursive: true });

const URL_BASE = process.env.URL_BASE ?? 'http://localhost:5173';

/** Locate a usable Chromium binary in the Playwright cache. */
function findChromium() {
  try {
    return chromium.executablePath();
  } catch {
    return null;
  }
}

async function main() {
  const execPath = findChromium();
  const launchOpts = { headless: true };
  if (execPath) launchOpts.executablePath = execPath;
  let browser;
  try {
    browser = await chromium.launch(launchOpts);
  } catch (e) {
    console.error('Could not launch Chromium:', e.message);
    console.error('Attempting to use system Firefox via @playwright/test is out of scope here.');
    process.exit(2);
  }

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  console.log(`[playtest] navigating to ${URL_BASE}/`);
  await page.goto(URL_BASE + '/', { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(OUT, '01-home.png'), fullPage: false });

  // Launch Stage 1 with godmode so the bot survives long enough to see the boss + scene transitions.
  console.log('[playtest] launching Stage 1 (godmode)');
  await page.goto(URL_BASE + '/game/boat-shooter?stage=1&godmode=1', { waitUntil: 'networkidle' });
  // Wait for Phaser canvas to mount — first cold load on dev server can take a while.
  try {
    await page.waitForSelector('canvas', { timeout: 30000 });
  } catch (e) {
    console.log('[playtest] canvas not visible, dumping page error state');
    await page.screenshot({ path: join(OUT, '02-no-canvas.png'), fullPage: true });
    const html = await page.content();
    writeFileSync(join(OUT, '02-no-canvas.html'), html);
    throw e;
  }
  // Give sprites + sound a moment to initialize.
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(OUT, '02-stage-1-start.png') });

  // Simulate drag steering — press + hold mouse on the canvas, move around.
  console.log('[playtest] simulating gameplay for 120 seconds');
  const canvas = await page.$('canvas');
  const box = await canvas.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Move around in a figure-8 pattern to dodge enemies.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const start = Date.now();
  const taken = new Set();
  while (Date.now() - start < 120000) {
    const t = (Date.now() - start) / 1000;
    // Faster, more erratic dodge pattern — a skilled player weaves constantly.
    const x = cx + Math.sin(t * 1.3) * (box.width * 0.35) + Math.sin(t * 3.1) * 40;
    const y = cy + Math.cos(t * 0.9) * (box.height * 0.30) + Math.cos(t * 2.7) * 30;
    await page.mouse.move(x, y, { steps: 3 });
    await page.waitForTimeout(100);
    for (const mark of [10, 30, 60, 85, 95, 110]) {
      if (t >= mark && !taken.has(mark)) {
        taken.add(mark);
        await page.screenshot({ path: join(OUT, `t${String(mark).padStart(3, '0')}s.png`) });
      }
    }
  }
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, '07-final.png') });

  // Try pressing Escape → pause.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, '08-paused.png') });

  // Print a short report.
  const report = {
    url: URL_BASE,
    errors,
    screenshots: [...taken].map((m) => `t${String(m).padStart(2, '0')}s.png`),
    outDir: OUT,
  };
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));

  if (errors.length) {
    console.log(`[playtest] ${errors.length} page-level errors captured:`);
    errors.slice(0, 10).forEach((e) => console.log('  ' + e));
  } else {
    console.log('[playtest] no page-level errors');
  }
  console.log(`[playtest] screenshots in ${OUT}`);

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
