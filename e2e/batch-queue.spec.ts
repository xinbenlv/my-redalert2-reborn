import { expect, test } from '@playwright/test';

test('shift-click batch queues infantry across available production buildings', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.money = 2500;
    player.buildings = [
      game.createBuilding('constructionYard', 5, 5, 0),
      game.createBuilding('powerPlant', 9, 5, 0),
      game.createBuilding('refinery', 13, 5, 0),
      game.createBuilding('barracks', 9, 9, 0),
      game.createBuilding('barracks', 13, 9, 0),
    ];
    game.selected = [];
    game.updateMoney();
    game.updateUI();
  });

  await page.click('.build-tab[data-tab="units"]');

  const soldierCard = page.locator('.build-item').filter({ hasText: 'Soldier' }).first();
  await expect(soldierCard.locator('.item-status')).toContainText('Shift+Click x5');
  await soldierCard.click({ modifiers: ['Shift'] });

  const queueState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const barracks = player.buildings.filter((b: any) => b.type === 'barracks');
    const perBuilding = barracks.map((building: any) => ({
      training: building.training,
      queued: [...building.trainQueue],
      total: (building.training ? 1 : 0) + building.trainQueue.length,
    }));
    return {
      money: player.money,
      totalQueued: game._getTotalTrainQueue(player, 'soldier'),
      badgeText: Array.from(document.querySelectorAll('.build-item'))
        .find((el) => (el.textContent || '').includes('Soldier'))
        ?.querySelector('.queue-badge')
        ?.textContent || null,
      eva: document.getElementById('eva-message')?.textContent || '',
      perBuilding,
    };
  });

  expect(queueState.money).toBe(1500);
  expect(queueState.totalQueued).toBe(5);
  expect(queueState.badgeText).toBe('5');
  expect(queueState.eva).toContain('Queued 5/5 Soldier.');
  expect(queueState.eva).toContain('(5 queued)');
  const activeBuildings = queueState.perBuilding.filter((building: any) => building.total > 0);
  expect(activeBuildings.length).toBeGreaterThanOrEqual(2);
  expect(activeBuildings.every((building: any) => building.training === 'soldier')).toBe(true);
  const totals = activeBuildings.map((building: any) => building.total);
  expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(1);
});

test('shift-click batch queue stops cleanly when funds run out', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.money = 850;
    player.buildings = [
      game.createBuilding('constructionYard', 5, 5, 0),
      game.createBuilding('powerPlant', 9, 5, 0),
      game.createBuilding('barracks', 9, 9, 0),
    ];
    const barracks = player.buildings.find((b: any) => b.type === 'barracks');
    barracks.training = null;
    barracks.trainProgress = 0;
    barracks.trainQueue = [];
    game.selected = [];
    game.updateMoney();
    game.updateUI();
  });

  await page.click('.build-tab[data-tab="units"]');
  await page.locator('.build-item').filter({ hasText: 'Flak Trooper' }).first().click({ modifiers: ['Shift'] });

  const queueState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const perBuilding = player.buildings
      .filter((b: any) => b.type === 'barracks')
      .map((building: any) => ({
        training: building.training,
        queued: [...building.trainQueue],
        total: (building.training ? 1 : 0) + building.trainQueue.length,
      }));
    return {
      money: player.money,
      totalQueued: game._getTotalTrainQueue(player, 'flakTrooper'),
      eva: document.getElementById('eva-message')?.textContent || '',
      perBuilding,
    };
  });

  expect(queueState.money).toBe(50);
  expect(queueState.totalQueued).toBe(2);
  expect(queueState.eva).toContain('Queued 2/5 Flak Trooper.');
  expect(queueState.eva).toContain('Funds exhausted.');
  const activeBuildings = queueState.perBuilding.filter((building: any) => building.total > 0);
  expect(activeBuildings.length).toBeGreaterThanOrEqual(1);
  expect(activeBuildings.every((building: any) => building.training === 'flakTrooper')).toBe(true);
  expect(activeBuildings.reduce((sum: number, building: any) => sum + building.total, 0)).toBe(2);
});
