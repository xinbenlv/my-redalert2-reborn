import { expect, test } from '@playwright/test';

test('AI build orders pivot the mid-game tech path between airfield and battle lab', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const plans = await page.evaluate(() => {
    const runPlan = (aiBuildOrder: string) => {
      const game = new (window as any).GameState({
        startingCredits: 10000,
        map: 'classic',
        playerFaction: 'soviet',
        aiDifficulty: 'hard',
        aiBuildOrder,
      });
      const ai = game.players[1];
      const human = game.players[0];

      ai.money = 12000;
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
      human.units = [game.createUnit('tank', 8, 8, 0)];
      human.buildings = [
        game.createBuilding('constructionYard', 8, 8, 0),
        game.createBuilding('refinery', 12, 8, 0),
      ];

      game.aiTimer = game.aiDecisionInterval;
      game.updateAI(5000);

      return {
        aiBuildOrder: game.aiConfig.buildOrder,
        aiLabel: ai.aiBuildOrderLabel,
        builtTypes: ai.buildings.map((building: any) => building.type),
      };
    };

    return {
      air: runPlan('air'),
      armor: runPlan('armor'),
      fortified: runPlan('fortified'),
    };
  });

  expect(plans.air.aiBuildOrder).toBe('air');
  expect(plans.air.aiLabel).toBe('Air Supremacy');
  expect(plans.air.builtTypes).toContain('airfield');
  expect(plans.air.builtTypes).not.toContain('battleLab');

  expect(plans.armor.aiBuildOrder).toBe('armor');
  expect(plans.armor.aiLabel).toBe('Armor Spearhead');
  expect(plans.armor.builtTypes).toContain('battleLab');
  expect(plans.armor.builtTypes).not.toContain('airfield');

  expect(plans.fortified.aiBuildOrder).toBe('fortified');
  expect(plans.fortified.aiLabel).toBe('Fortified Grind');
  expect(plans.fortified.builtTypes).toContain('battleLab');
  expect(plans.fortified.builtTypes).not.toContain('airfield');
});
