import { expect, test } from '@playwright/test';

test('AI reads enemy air tech pressure and preps anti-air before the sky is already full of pain', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    const human = game.players[0];

    const seedEnemyAirTech = () => {
      const enemyAirfield = game.createBuilding('airfield', 18, 8, 0);
      enemyAirfield.training = 'harrier';
      enemyAirfield.trainQueue = ['harrier'];
      enemyAirfield.trainProgress = 0.35;
      human.buildings = [
        game.createBuilding('constructionYard', 8, 8, 0),
        game.createBuilding('powerPlant', 12, 8, 0),
        game.createBuilding('powerPlant', 16, 8, 0),
        game.createBuilding('refinery', 14, 8, 0),
        game.createBuilding('warFactory', 18, 12, 0),
        game.createBuilding('radarDome', 20, 12, 0),
        enemyAirfield,
      ];
      human.units = [game.createUnit('harvester', 16, 12, 0)];
      return enemyAirfield;
    };

    seedEnemyAirTech();
    ai.money = 2200;
    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('powerPlant', 20, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('airfield', 35, 28, 1),
      game.createBuilding('pillbox', 31, 22, 1),
      game.createBuilding('sentryGun', 34, 22, 1),
    ];

    const warFactory = ai.buildings.find((building: any) => building.type === 'warFactory');
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);
    const proactiveIfv = {
      pressure: game.getAirThreatPressure(human),
      training: warFactory?.training || null,
      queue: [...(warFactory?.trainQueue || [])],
    };

    seedEnemyAirTech();
    ai.money = 450;
    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('powerPlant', 20, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
    ];
    const fallbackWarFactory = ai.buildings.find((building: any) => building.type === 'warFactory');
    const fallbackBarracks = ai.buildings.find((building: any) => building.type === 'barracks');
    fallbackWarFactory.training = 'tank';
    fallbackWarFactory.trainProgress = 0.1;
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);
    const flakFallback = {
      pressure: game.getAirThreatPressure(human),
      warFactoryTraining: fallbackWarFactory?.training || null,
      barracksTraining: fallbackBarracks?.training || null,
      barracksQueue: [...(fallbackBarracks?.trainQueue || [])],
    };

    return { proactiveIfv, flakFallback };
  });

  expect(aiState.proactiveIfv.pressure).toBeGreaterThanOrEqual(3);
  expect([aiState.proactiveIfv.training, ...aiState.proactiveIfv.queue]).toContain('ifv');
  expect(aiState.flakFallback.pressure).toBeGreaterThanOrEqual(3);
  expect(aiState.flakFallback.warFactoryTraining).toBe('tank');
  expect([aiState.flakFallback.barracksTraining, ...aiState.flakFallback.barracksQueue]).toContain('flakTrooper');
});
