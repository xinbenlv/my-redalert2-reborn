import { expect, test } from '@playwright/test';

test('AI starts repairing damaged tech-anchor buildings before greed-teching further', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const repairState = await page.evaluate(() => {
    const game = new (window as any).GameState({
      startingCredits: 10000,
      map: 'classic',
      playerFaction: 'soviet',
      aiDifficulty: 'hard',
      aiBuildOrder: 'armor',
    });
    const human = game.players[0];
    const ai = game.players[1];

    human.money = 0;
    ai.money = 2400;

    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
    ];
    const damagedWarFactory = ai.buildings.find((building: any) => building.type === 'warFactory');
    damagedWarFactory.hp = Math.floor(damagedWarFactory.maxHp * 0.52);
    damagedWarFactory._lastHitTime = Date.now() - 7000;

    human.buildings = [
      game.createBuilding('constructionYard', 8, 8, 0),
      game.createBuilding('refinery', 12, 8, 0),
    ];
    human.units = [game.createUnit('tank', 8, 8, 0)];

    game.updateAI(5000);

    return {
      repairing: damagedWarFactory.repairing,
      builtTypes: ai.buildings.map((building: any) => building.type),
      aiMoney: ai.money,
    };
  });

  expect(repairState.repairing).toBe(true);
  expect(repairState.builtTypes).not.toContain('battleLab');
  expect(repairState.aiMoney).toBe(2400);
});

test('AI cashes out critically damaged defenses instead of pretending a dying pillbox is an economy plan', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const sellState = await page.evaluate(() => {
    const game = new (window as any).GameState({
      startingCredits: 10000,
      map: 'classic',
      playerFaction: 'soviet',
      aiDifficulty: 'medium',
      aiBuildOrder: 'balanced',
    });
    const human = game.players[0];
    const ai = game.players[1];

    human.money = 0;
    ai.money = 300;

    ai.units = [];
    ai.buildings = [
      game.createBuilding('constructionYard', 26, 26, 1),
      game.createBuilding('powerPlant', 22, 26, 1),
      game.createBuilding('refinery', 22, 22, 1),
      game.createBuilding('barracks', 26, 22, 1),
      game.createBuilding('pillbox', 30, 24, 1),
    ];
    const doomedPillbox = ai.buildings.find((building: any) => building.type === 'pillbox');
    doomedPillbox.hp = Math.floor(doomedPillbox.maxHp * 0.12);
    doomedPillbox._lastHitTime = Date.now();
    const expectedRefundFloor = Math.max(100, Math.floor(((window as any).BUILD_TYPES.pillbox.cost || 0) * 0.5 * Math.max(0.3, doomedPillbox.hp / doomedPillbox.maxHp)));

    human.buildings = [game.createBuilding('constructionYard', 10, 10, 0)];
    human.units = [game.createUnit('soldier', 12, 12, 0)];

    game.updateAI(5000);

    return {
      pillboxAlive: ai.buildings.some((building: any) => building.type === 'pillbox' && building.hp > 0),
      aiMoney: ai.money,
      expectedRefundFloor,
    };
  });

  expect(sellState.pillboxAlive).toBe(false);
  expect(sellState.aiMoney).toBeGreaterThanOrEqual(300 + sellState.expectedRefundFloor);
});
