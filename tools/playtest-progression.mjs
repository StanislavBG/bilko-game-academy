#!/usr/bin/env node
/**
 * Progression playtest — drives stages 1, 2, and 3 back-to-back with
 * godmode + 10× speed enabled, capturing screenshots at key beats
 * (stage start, mid-stage waves, boss approach, stage clear).
 *
 * Requires: dev server running on localhost:5173, Playwright from
 * /home/bilko/Projects/session-manager.
 */

import { chromium } from '/home/bilko/Projects/session-manager/node_modules/playwright-core/index.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = '/tmp/boat-shooter-progression';
mkdirSync(OUT, { recursive: true });

const URL_BASE = process.env.URL_BASE ?? 'http://localhost:5173';
const STAGES = [1, 2, 3];
/** Seconds of in-game time to let each stage run (at 10×, full stage fits in ~10–15s). */
const SECONDS_PER_STAGE = 20;

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
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });

  for (const stage of STAGES) {
    const url = `${URL_BASE}/game/boat-shooter?stage=${stage}&godmode=1&speed=10`;
    console.log(`[progression] STAGE ${stage} — ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    try {
      await page.waitForSelector('canvas', { timeout: 30000 });
    } catch (e) {
      console.error(`[progression] canvas never appeared on stage ${stage}`);
      await page.screenshot({ path: join(OUT, `stage-${stage}-broken.png`), fullPage: true });
      continue;
    }

    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(OUT, `stage-${stage}-start.png`) });

    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();

    const start = Date.now();
    const takenMarks = new Set();
    const marks = [3, 8, 13, 18];
    while (Date.now() - start < SECONDS_PER_STAGE * 1000) {
      const t = (Date.now() - start) / 1000;
      // Erratic dodge — weave across the arena quickly so we cover lots of positions.
      const x = cx + Math.sin(t * 1.3) * (box.width * 0.34) + Math.sin(t * 3.3) * 45;
      const y = cy + Math.cos(t * 0.8) * (box.height * 0.32) + Math.cos(t * 2.9) * 30;
      await page.mouse.move(x, y, { steps: 3 });
      await page.waitForTimeout(100);
      for (const mark of marks) {
        if (t >= mark && !takenMarks.has(mark)) {
          takenMarks.add(mark);
          await page.screenshot({ path: join(OUT, `stage-${stage}-t${mark.toString().padStart(2, '0')}s.png`) });
        }
      }
    }
    await page.mouse.up();
    await page.screenshot({ path: join(OUT, `stage-${stage}-end.png`) });
  }

  writeFileSync(
    join(OUT, 'report.json'),
    JSON.stringify({ url: URL_BASE, errors, stages: STAGES, outDir: OUT }, null, 2),
  );
  if (errors.length) {
    console.log(`[progression] ${errors.length} errors captured:`);
    errors.slice(0, 10).forEach((e) => console.log('  ' + e));
  } else {
    console.log('[progression] no page-level errors');
  }
  console.log(`[progression] screenshots in ${OUT}`);

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
