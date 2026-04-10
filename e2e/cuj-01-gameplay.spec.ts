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
  await page.goto('/');

  // Wait for canvas (Three.js)
  try {
    await page.waitForSelector('canvas', { timeout: 15_000 });
  } catch {
    console.warn('Canvas not found within timeout, proceeding anyway');
  }

  // Let the game fully initialize and render
  await page.waitForTimeout(3_000);

  // Screenshot 1: Initial base view
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '01-initial-base.png'),
    fullPage: false,
  });
  console.log('Captured: 01-initial-base');

  // Train soldiers by clicking the Units tab then the Soldier build item
  try {
    // Switch to Units tab
    await page.click('.build-tab[data-tab="units"]');
    await page.waitForTimeout(500);

    // Train 5 soldiers (click the soldier build item repeatedly)
    for (let i = 0; i < 5; i++) {
      await page.click('.build-item');
      await page.waitForTimeout(300);
    }
  } catch (err) {
    console.warn(`Failed to train soldiers: ${err}`);
  }

  // Screenshot 2: Training soldiers (queue visible)
  await page.waitForTimeout(1_000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '02-training-soldiers.png'),
    fullPage: false,
  });
  console.log('Captured: 02-training-soldiers');

  // Wait for soldiers to be trained
  await page.waitForTimeout(8_000);

  // Screenshot 3: Soldiers trained and standing near barracks
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '03-soldiers-ready.png'),
    fullPage: false,
  });
  console.log('Captured: 03-soldiers-ready');

  // Select all soldiers via box-select drag across the base area
  try {
    // Drag-select from top-left of base area to bottom-right
    // The base is around tile (8,8), camera starts at (10,10)
    // We drag across the center of the viewport to select units
    const vw = 1280;
    const vh = 800;
    await page.mouse.move(vw * 0.2, vh * 0.3);
    await page.mouse.down();
    await page.mouse.move(vw * 0.6, vh * 0.7, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  } catch (err) {
    console.warn(`Failed to box-select: ${err}`);
  }

  // Screenshot 4: Units selected (selection highlights visible)
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '04-units-selected.png'),
    fullPage: false,
  });
  console.log('Captured: 04-units-selected');

  // Right-click to move selected units toward the enemy base (down-right)
  try {
    // Pan camera toward center of map first
    await page.keyboard.down('d');
    await page.waitForTimeout(2_000);
    await page.keyboard.up('d');
    await page.keyboard.down('s');
    await page.waitForTimeout(2_000);
    await page.keyboard.up('s');
    await page.waitForTimeout(500);

    // Right-click to send units forward
    await page.mouse.click(800, 500, { button: 'right' });
    await page.waitForTimeout(500);
  } catch (err) {
    console.warn(`Failed to move units: ${err}`);
  }

  // Screenshot 5: Units marching toward enemy
  await page.waitForTimeout(3_000);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '05-units-marching.png'),
    fullPage: false,
  });
  console.log('Captured: 05-units-marching');

  // Continue panning toward enemy and wait for combat
  try {
    await page.keyboard.down('d');
    await page.waitForTimeout(3_000);
    await page.keyboard.up('d');
    await page.keyboard.down('s');
    await page.waitForTimeout(3_000);
    await page.keyboard.up('s');
  } catch (err) {
    console.warn(`Failed to pan camera: ${err}`);
  }

  // Wait for combat to start (AI should be attacking too)
  await page.waitForTimeout(5_000);

  // Screenshot 6: Combat / engagement
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '06-combat.png'),
    fullPage: false,
  });
  console.log('Captured: 06-combat');
});
