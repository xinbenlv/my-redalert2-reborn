import { expect, test } from '@playwright/test';

test('selected rally and move orders expose overlay markers', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(1000);

  const rallyOverlay = await page.evaluate(() => {
    const game = (window as any).game;
    const barracks = game.players[0].buildings.find((b: any) => b.type === 'barracks');
    game.selected = [barracks];
    game.commandMode = null;
    game.updateSelectionInfo();
    return game.getSelectedRallyOverlay();
  });

  expect(rallyOverlay).toBeTruthy();
  expect(rallyOverlay.kind).toBe('rally');
  expect(rallyOverlay.active).toBe(false);
  expect(rallyOverlay.label).toBe('RALLY');
  expect(rallyOverlay.source).toBeTruthy();
  expect(rallyOverlay.target).toBeTruthy();

  const rallyPreview = await page.evaluate(() => {
    const game = (window as any).game;
    const barracks = game.players[0].buildings.find((b: any) => b.type === 'barracks');
    game.selected = [barracks];
    game.commandMode = 'set-rally';
    game.hoverTile = { x: 18, y: 12 };
    game.updateSelectionInfo();
    return game.getSelectedRallyOverlay();
  });

  expect(rallyPreview.active).toBe(true);
  expect(rallyPreview.label).toBe('RALLY PREVIEW');
  expect(rallyPreview.target).toEqual({ x: 18, y: 12 });

  const moveOverlay = await page.evaluate(() => {
    const game = (window as any).game;
    const unit = game.players[0].units.find((u: any) => u.type === 'soldier' && u.state !== 'dead');
    game.selected = [unit];
    game.commandMode = null;
    game.issueMoveOrder(unit, 18, 12);
    return game.getSelectedOrderOverlays()[0];
  });

  expect(moveOverlay).toBeTruthy();
  expect(moveOverlay.kind).toBe('move');
  expect(moveOverlay.path.length).toBeGreaterThan(1);
  expect(moveOverlay.target).toEqual({ x: 18, y: 12 });
});
