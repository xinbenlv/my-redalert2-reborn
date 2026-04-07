import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test('capture gameplay screenshots for demo GIF', async ({ page }) => {
  // Navigate to the game
  await page.goto('/');

  // Wait for the canvas to appear (Three.js renders into a canvas)
  try {
    await page.waitForSelector('canvas', { timeout: 15_000 });
  } catch {
    console.warn('Canvas not found within timeout, proceeding anyway');
  }

  // Let the game initialize and render first frame
  await page.waitForTimeout(3_000);

  const timestamps = [
    { name: '01-initial', delay: 0 },
    { name: '02-early-game', delay: 3_000 },
    { name: '03-building', delay: 4_000 },
    { name: '04-mid-game', delay: 5_000 },
    { name: '05-units', delay: 4_000 },
    { name: '06-action', delay: 4_000 },
  ];

  for (const { name, delay } of timestamps) {
    try {
      if (delay > 0) {
        await page.waitForTimeout(delay);
      }
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${name}.png`),
        fullPage: false,
      });
      console.log(`Captured: ${name}`);
    } catch (err) {
      console.warn(`Failed to capture ${name}: ${err}`);
    }
  }
});
