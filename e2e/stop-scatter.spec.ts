import { expect, test } from '@playwright/test';

test('selection panel exposes stop and scatter commands for controllable units', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const soldier = game.createUnit('soldier', 12, 12, 0);
    player.units.push(soldier);
    game.selected = [soldier];
    game.issueMoveOrder(soldier, 20, 12);
    game.updateSelectionInfo();
  });

  await expect(page.locator('#selection-info [data-action="stop"]')).toHaveCount(1);
  await expect(page.locator('#selection-info [data-action="scatter"]')).toHaveCount(1);
  await page.evaluate(() => {
    (document.querySelector('#selection-info [data-action="stop"]') as HTMLButtonElement | null)?.click();
  });

  const stoppedState = await page.evaluate(() => {
    const game = (window as any).game;
    const soldier = game.players[0].units[0];
    return {
      state: soldier.state,
      target: soldier.target,
      path: soldier.path,
      text: document.getElementById('selection-info')?.textContent || '',
      eva: document.getElementById('eva-message')?.textContent || '',
    };
  });

  expect(stoppedState.state).toBe('idle');
  expect(stoppedState.target).toBeNull();
  expect(stoppedState.path).toBeNull();
  expect(stoppedState.text).toContain('Stop');
  expect(stoppedState.text).toContain('Scatter');
  expect(stoppedState.eva).toContain('standing by');
});

test('scatter and stop hotkeys fan out a selected squad and then cancel their orders', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const squad = [
      game.createUnit('soldier', 14, 14, 0),
      game.createUnit('soldier', 14.4, 14.2, 0),
      game.createUnit('rocketInfantry', 13.8, 13.9, 0),
    ];
    player.units.push(...squad);
    game.selected = squad;
    game.updateSelectionInfo();
  });

  await page.keyboard.press('x');

  const scatterState = await page.evaluate(() => {
    const game = (window as any).game;
    return game.players[0].units.map((unit: any) => ({
      state: unit.state,
      target: unit.target,
      pathLength: unit.path?.length || 0,
      distanceFromOrigin: Math.hypot(unit.target.x - 14, unit.target.y - 14),
    }));
  });

  expect(scatterState).toHaveLength(3);
  expect(scatterState.every((unit: any) => unit.state === 'moving')).toBe(true);
  expect(scatterState.every((unit: any) => unit.pathLength > 0)).toBe(true);
  expect(scatterState.every((unit: any) => unit.distanceFromOrigin >= 1)).toBe(true);

  await page.keyboard.press('s');

  const stopState = await page.evaluate(() => {
    const game = (window as any).game;
    return {
      units: game.players[0].units.map((unit: any) => ({
        state: unit.state,
        target: unit.target,
        path: unit.path,
      })),
      eva: document.getElementById('eva-message')?.textContent || '',
    };
  });

  expect(stopState.units.every((unit: any) => unit.state === 'idle')).toBe(true);
  expect(stopState.units.every((unit: any) => unit.target === null)).toBe(true);
  expect(stopState.units.every((unit: any) => unit.path === null)).toBe(true);
  expect(stopState.eva).toContain('units received stop order');
});
