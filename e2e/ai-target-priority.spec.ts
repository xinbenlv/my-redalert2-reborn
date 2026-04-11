import { expect, test } from '@playwright/test';

test('AI attack waves can deliberately knock an enemy base into low power by sniping power plants', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const tacticalState = await page.evaluate(() => {
    const game = new (window as any).GameState({
      startingCredits: 10000,
      map: 'classic',
      playerFaction: 'soviet',
      aiDifficulty: 'hard',
      aiBuildOrder: 'balanced',
    });
    const human = game.players[0];
    const ai = game.players[1];

    human.money = 0;
    ai.money = 0;
    game.projectiles = [];
    game.effects = [];

    ai.buildings = [
      game.createBuilding('constructionYard', 24, 24, 1),
      game.createBuilding('powerPlant', 20, 24, 1),
      game.createBuilding('refinery', 20, 20, 1),
      game.createBuilding('warFactory', 24, 20, 1),
    ];
    ai.units = [
      game.createUnit('tank', 18, 15, 1),
      game.createUnit('tank', 19, 15.5, 1),
      game.createUnit('tank', 20, 16, 1),
    ];

    const enemyPowerPlant = game.createBuilding('powerPlant', 13, 10, 0);
    const enemyBarracks = game.createBuilding('barracks', 12, 12, 0);
    const enemyWarFactory = game.createBuilding('warFactory', 15, 12, 0);
    const enemyRefinery = game.createBuilding('refinery', 16, 9, 0);
    human.buildings = [
      game.createBuilding('constructionYard', 10, 10, 0),
      enemyBarracks,
      enemyWarFactory,
      enemyRefinery,
      enemyPowerPlant,
    ];
    human.units = [];

    const priority = game.getAITargetPriorityDetails(ai, human);

    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    return {
      priorityType: priority?.target?.type || null,
      reasons: priority?.reasons || [],
      score: priority?.score || null,
      attackTargets: ai.units.map((unit: any) => unit.attackTarget?.type || null),
      enemyPowerBefore: (window as any).POWER_SYSTEM.calculate(human),
      projectedPowerAfterHit: (window as any).POWER_SYSTEM.calculate({
        ...human,
        buildings: human.buildings.filter((building: any) => building !== enemyPowerPlant),
      }),
    };
  });

  expect(tacticalState.priorityType).toBe('powerPlant');
  expect(tacticalState.reasons).toContain('power-sabotage');
  expect(tacticalState.enemyPowerBefore.net).toBeGreaterThanOrEqual(0);
  expect(tacticalState.projectedPowerAfterHit.net).toBeLessThan(0);
  expect(tacticalState.attackTargets.every((target: string | null) => target === 'powerPlant')).toBe(true);
});

test('AI attack waves prefer high-tech targets over generic structures once the enemy techs up', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const tacticalState = await page.evaluate(() => {
    const game = new (window as any).GameState({
      startingCredits: 12000,
      map: 'classic',
      playerFaction: 'soviet',
      aiDifficulty: 'hard',
      aiBuildOrder: 'armor',
    });
    const human = game.players[0];
    const ai = game.players[1];

    human.money = 0;
    ai.money = 0;
    game.projectiles = [];
    game.effects = [];

    ai.buildings = [
      game.createBuilding('constructionYard', 24, 24, 1),
      game.createBuilding('powerPlant', 20, 24, 1),
      game.createBuilding('refinery', 20, 20, 1),
      game.createBuilding('warFactory', 24, 20, 1),
      game.createBuilding('battleLab', 28, 20, 1),
    ];
    ai.units = [
      game.createUnit('tank', 18, 14, 1),
      game.createUnit('tank', 19, 14.4, 1),
      game.createUnit('artillery', 20, 14.8, 1),
    ];

    const enemyBattleLab = game.createBuilding('battleLab', 13, 8, 0);
    const enemyAirfield = game.createBuilding('airfield', 12, 11, 0);
    enemyAirfield.training = 'harrier';
    enemyAirfield.trainQueue = ['harrier'];
    const enemyRefinery = game.createBuilding('refinery', 11, 14, 0);
    const enemyBarracks = game.createBuilding('barracks', 14, 14, 0);
    human.buildings = [
      game.createBuilding('constructionYard', 10, 10, 0),
      game.createBuilding('powerPlant', 8, 10, 0),
      game.createBuilding('powerPlant', 8, 13, 0),
      game.createBuilding('powerPlant', 8, 16, 0),
      enemyRefinery,
      enemyBarracks,
      enemyAirfield,
      enemyBattleLab,
      game.createBuilding('warFactory', 16, 10, 0),
    ];
    human.units = [];

    const priority = game.getAITargetPriorityDetails(ai, human);

    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    return {
      priorityType: priority?.target?.type || null,
      reasons: priority?.reasons || [],
      score: priority?.score || null,
      attackTargets: ai.units.map((unit: any) => unit.attackTarget?.type || null),
    };
  });

  expect(tacticalState.priorityType).toBe('battleLab');
  expect(tacticalState.reasons).toContain('tech-snipe');
  expect(tacticalState.attackTargets.every((target: string | null) => target === 'battleLab')).toBe(true);
});
