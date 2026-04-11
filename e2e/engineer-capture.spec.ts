import { expect, test } from '@playwright/test';

test('engineer appears in barracks roster and captures enemy buildings', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(1000);

  await page.click('.build-tab[data-tab="units"]');

  const rosterLabels = await page.locator('.build-item .item-label').allTextContents();
  expect(rosterLabels).toEqual(expect.arrayContaining(['Engineer']));

  await page.locator('.build-item').filter({ hasText: 'Engineer' }).click();

  const queueState = await page.evaluate(() => {
    const game = (window as any).game;
    const barracks = game.players[0].buildings.find((b: any) => b.type === 'barracks');
    return {
      training: barracks.training,
      queued: [...barracks.trainQueue],
      money: game.players[0].money,
    };
  });

  expect(queueState.training).toBe('engineer');
  expect(queueState.money).toBeLessThan(7000);

  const captureState = await page.evaluate(() => {
    const game = (window as any).game;
    const enemyBuilding = game.createBuilding('powerPlant', 18, 18, 1);
    game.players[1].buildings.push(enemyBuilding);
    game.players[1].units = [];
    game.projectiles = [];

    const engineer = game.createUnit('engineer', 15.5, 19, 0);
    game.players[0].units.push(engineer);
    game.selected = [engineer];
    game.updateSelectionInfo();

    game.issueEngineerCaptureOrder(engineer, enemyBuilding);

    let ticks = 0;
    while (enemyBuilding.owner !== 0 && ticks < 120) {
      game.update(50);
      ticks += 1;
    }

    return {
      owner: enemyBuilding.owner,
      ticks,
      engineerState: engineer.state,
      selectedCount: game.selected.length,
      playerHasBuilding: game.players[0].buildings.includes(enemyBuilding),
      enemyHasBuilding: game.players[1].buildings.includes(enemyBuilding),
      buildingHp: enemyBuilding.hp,
      captureTargetCleared: engineer.captureTarget === null,
    };
  });

  expect(captureState.owner).toBe(0);
  expect(captureState.ticks).toBeGreaterThan(0);
  expect(captureState.engineerState).toBe('dead');
  expect(captureState.captureTargetCleared).toBe(true);
  expect(captureState.selectedCount).toBe(0);
  expect(captureState.playerHasBuilding).toBe(true);
  expect(captureState.enemyHasBuilding).toBe(false);
  expect(captureState.buildingHp).toBeGreaterThan(0);
});
