import { expect, test } from '@playwright/test';

test('AI build orders keep climbing into complementary tech instead of stalling at one branch', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const outcome = await page.evaluate(() => {
    const GameState = (window as any).GameState;

    const runPlan = (aiBuildOrder: string) => {
      const game = new GameState({
        startingCredits: 10000,
        map: 'classic',
        playerFaction: 'soviet',
        aiDifficulty: 'hard',
        aiBuildOrder,
      });
      const human = game.players[0];
      const ai = game.players[1];

      human.money = 0;
      human.units = [game.createUnit('tank', 8, 8, 0)];
      human.buildings = [
        game.createBuilding('constructionYard', 8, 8, 0),
        game.createBuilding('refinery', 12, 8, 0),
        game.createBuilding('warFactory', 16, 8, 0),
      ];

      ai.money = 10000;
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

      const builtPerStep: string[] = [];
      for (let step = 0; step < 3; step += 1) {
        const beforeCount = ai.buildings.length;
        game.updateAI(5000);
        const newBuildings = ai.buildings.slice(beforeCount);
        if (newBuildings.length > 0) {
          const newest = newBuildings[newBuildings.length - 1] as any;
          builtPerStep.push(newest.type);
          newest.built = true;
          newest.buildProgress = 1;
        }
      }

      return {
        aiBuildOrder,
        builtPerStep,
        builtTypes: ai.buildings.map((building: any) => building.type),
      };
    };

    return {
      air: runPlan('air'),
      armor: runPlan('armor'),
    };
  });

  expect(outcome.air.builtPerStep).toEqual(['airfield', 'battleLab', 'advancedPowerPlant']);
  expect(outcome.air.builtTypes).toEqual(expect.arrayContaining(['airfield', 'battleLab', 'advancedPowerPlant']));

  expect(outcome.armor.builtPerStep).toEqual(['battleLab', 'airfield', 'advancedPowerPlant']);
  expect(outcome.armor.builtTypes).toEqual(expect.arrayContaining(['battleLab', 'airfield', 'advancedPowerPlant']));
});
