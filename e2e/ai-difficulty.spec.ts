import { expect, test } from '@playwright/test';

test('AI difficulty meaningfully changes tech greed and repair discipline', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const outcome = await page.evaluate(() => {
    const GameState = (window as any).GameState;

    const buildTechSnapshot = (aiDifficulty: string) => {
      const game = new GameState({
        startingCredits: 10000,
        map: 'classic',
        playerFaction: 'soviet',
        aiDifficulty,
        aiBuildOrder: 'armor',
      });
      const ai = game.players[1];
      const human = game.players[0];

      ai.money = 2500;
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

      game.updateAI(5000);

      return {
        aiDifficulty: game.aiConfig.difficulty,
        builtTypes: ai.buildings.map((building: any) => building.type),
        money: ai.money,
      };
    };

    const buildRepairSnapshot = (aiDifficulty: string) => {
      const game = new GameState({
        startingCredits: 10000,
        map: 'classic',
        playerFaction: 'soviet',
        aiDifficulty,
        aiBuildOrder: 'balanced',
      });
      const ai = game.players[1];
      const human = game.players[0];

      ai.money = 500;
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
      damagedWarFactory.hp = Math.floor(damagedWarFactory.maxHp * 0.8);
      damagedWarFactory._lastHitTime = Date.now() - 7000;

      human.units = [game.createUnit('tank', 8, 8, 0)];
      human.buildings = [
        game.createBuilding('constructionYard', 8, 8, 0),
        game.createBuilding('refinery', 12, 8, 0),
      ];

      game.updateAI(5000);

      return {
        aiDifficulty: game.aiConfig.difficulty,
        repairing: damagedWarFactory.repairing,
        money: ai.money,
      };
    };

    return {
      tech: {
        easy: buildTechSnapshot('easy'),
        hard: buildTechSnapshot('hard'),
      },
      repair: {
        easy: buildRepairSnapshot('easy'),
        hard: buildRepairSnapshot('hard'),
      },
    };
  });

  expect(outcome.tech.easy.aiDifficulty).toBe('easy');
  expect(outcome.tech.easy.builtTypes).not.toContain('battleLab');
  expect(outcome.tech.hard.aiDifficulty).toBe('hard');
  expect(outcome.tech.hard.builtTypes).toContain('battleLab');
  expect(outcome.tech.easy.money).toBeGreaterThan(outcome.tech.hard.money);

  expect(outcome.repair.easy.aiDifficulty).toBe('easy');
  expect(outcome.repair.easy.repairing).toBeFalsy();
  expect(outcome.repair.hard.aiDifficulty).toBe('hard');
  expect(outcome.repair.hard.repairing).toBeTruthy();
});
