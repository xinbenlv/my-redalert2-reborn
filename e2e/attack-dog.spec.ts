import { expect, test } from '@playwright/test';

test('attack dog appears in barracks roster and mauls infantry only', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(1000);

  await page.click('.build-tab[data-tab="units"]');

  const rosterLabels = await page.locator('.build-item .item-label').allTextContents();
  expect(rosterLabels).toEqual(expect.arrayContaining(['Attack Dog']));

  await page.locator('.build-item').filter({ hasText: 'Attack Dog' }).click();

  const queueState = await page.evaluate(() => {
    const game = (window as any).game;
    const barracks = game.players[0].buildings.find((b: any) => b.type === 'barracks');
    return {
      training: barracks.training,
      queued: [...barracks.trainQueue],
      money: game.players[0].money,
    };
  });

  expect(queueState.training).toBe('attackDog');
  expect(queueState.money).toBeLessThan(7000);

  const combatState = await page.evaluate(() => {
    const game = (window as any).game;
    game.projectiles = [];
    game.effects = [];
    game.players[0].units = [];
    game.players[1].units = [];
    game.players[1].buildings = [];

    const dog = game.createUnit('attackDog', 16, 16, 0);
    const enemySoldier = game.createUnit('soldier', 17, 16, 1);
    const enemyTank = game.createUnit('tank', 20, 16, 1);
    const enemyPowerPlant = game.createBuilding('powerPlant', 22, 15, 1);

    game.players[0].units.push(dog);
    game.players[1].units.push(enemySoldier, enemyTank);
    game.players[1].buildings.push(enemyPowerPlant);

    dog.attackTarget = enemySoldier;
    dog.state = 'attacking';

    let ticks = 0;
    while (enemySoldier.state !== 'dead' && ticks < 60) {
      game.update(50);
      ticks += 1;
    }

    return {
      ticks,
      dogState: dog.state,
      enemySoldierState: enemySoldier.state,
      enemySoldierHp: enemySoldier.hp,
      enemyTankHp: enemyTank.hp,
      enemyBuildingHp: enemyPowerPlant.hp,
      projectilesFired: game.projectiles.length,
      canTargetInfantry: game.canEntityTarget(dog, enemySoldier),
      canTargetTank: game.canEntityTarget(dog, enemyTank),
      canTargetBuilding: game.canEntityTarget(dog, enemyPowerPlant),
    };
  });

  expect(combatState.enemySoldierState).toBe('dead');
  expect(combatState.enemySoldierHp).toBeLessThanOrEqual(0);
  expect(combatState.enemyTankHp).toBe(180);
  expect(combatState.enemyBuildingHp).toBeGreaterThan(0);
  expect(combatState.projectilesFired).toBe(0);
  expect(combatState.canTargetInfantry).toBe(true);
  expect(combatState.canTargetTank).toBe(false);
  expect(combatState.canTargetBuilding).toBe(false);
  expect(combatState.ticks).toBeGreaterThan(0);
});

test('AI queues attack dogs when enemy infantry starts swarming instead of pretending soldiers are enough', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    const human = game.players[0];

    human.units = [
      game.createUnit('soldier', 16, 16, 0),
      game.createUnit('soldier', 17, 16, 0),
      game.createUnit('rocketInfantry', 18, 16, 0),
      game.createUnit('flakTrooper', 19, 16, 0),
    ];
    human.buildings = [
      game.createBuilding('constructionYard', 8, 8, 0),
      game.createBuilding('powerPlant', 12, 8, 0),
      game.createBuilding('barracks', 10, 12, 0),
    ];

    ai.money = 650;
    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 30, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('pillbox', 30, 22, 1),
    ];

    const barracks = ai.buildings.find((building: any) => building.type === 'barracks');
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    return {
      training: barracks?.training || null,
      queue: [...(barracks?.trainQueue || [])],
      enemyInfantryCount: human.units.length,
    };
  });

  expect(aiState.enemyInfantryCount).toBeGreaterThanOrEqual(4);
  expect([aiState.training, ...aiState.queue]).toContain('attackDog');
});
