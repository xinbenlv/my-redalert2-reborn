import { expect, test } from '@playwright/test';

test('AI places forward defenses on the enemy-facing edge instead of burying them inside the base blob', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const layoutState = await page.evaluate(() => {
    const game = new (window as any).GameState({
      startingCredits: 12000,
      map: 'classic',
      playerFaction: 'soviet',
      aiDifficulty: 'hard',
      aiBuildOrder: 'balanced',
    });
    const human = game.players[0];
    const ai = game.players[1];

    human.money = 0;
    human.units = [game.createUnit('tank', 33, 22, 0)];
    human.buildings = [
      game.createBuilding('constructionYard', 31, 20, 0),
      game.createBuilding('refinery', 35, 20, 0),
    ];

    ai.money = 5000;
    ai.units = [game.createUnit('harvester', 11, 24, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 8, 20, 1),
      game.createBuilding('powerPlant', 4, 15, 1),
      game.createBuilding('powerPlant', 4, 27, 1),
      game.createBuilding('advancedPowerPlant', 8, 31, 1),
      game.createBuilding('refinery', 8, 27, 1),
      game.createBuilding('barracks', 9, 15, 1),
      game.createBuilding('radarDome', 13, 15, 1),
      game.createBuilding('warFactory', 13, 24, 1),
      game.createBuilding('airfield', 18, 15, 1),
      game.createBuilding('battleLab', 18, 24, 1),
    ];

    const baseAnchor = game.getPlayerBaseAnchor(ai);
    const enemyAnchor = game.getPlayerBaseAnchor(human);

    game.updateAI(5000);
    game.updateAI(5000);

    const defenses = ai.buildings
      .filter((building: any) => ['pillbox', 'sentryGun'].includes(building.type))
      .map((building: any) => {
        const anchor = game.getEntityAnchor(building);
        return {
          type: building.type,
          x: anchor?.x ?? null,
          y: anchor?.y ?? null,
        };
      });

    const forwardProjection = (target: { x: number; y: number }) => {
      const dx = target.x - baseAnchor.x;
      const dy = target.y - baseAnchor.y;
      const ex = enemyAnchor.x - baseAnchor.x;
      const ey = enemyAnchor.y - baseAnchor.y;
      const enemyLength = Math.max(0.001, Math.hypot(ex, ey));
      return (dx * ex + dy * ey) / enemyLength;
    };

    return {
      baseAnchor,
      enemyAnchor,
      defenses,
      projections: defenses.map((defense: any) => forwardProjection(defense)),
      lateralSpread: defenses.length >= 2 ? Math.abs(defenses[0].y - defenses[1].y) : 0,
    };
  });

  expect(layoutState.defenses.map((defense: any) => defense.type).sort()).toEqual(['pillbox', 'sentryGun']);
  expect(layoutState.projections.every((projection: number) => projection > 2.5)).toBe(true);
  expect(layoutState.lateralSpread).toBeGreaterThanOrEqual(1);
});
