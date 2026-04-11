import { expect, test } from '@playwright/test';

test('AI protects its harvesters and prioritizes enemy harvesters for harassment', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const tacticalState = await page.evaluate(() => {
    const game = (window as any).game;
    const human = game.players[0];
    const ai = game.players[1];

    human.money = 0;
    ai.money = 0;
    human.buildings = [];
    human.units = [];
    ai.buildings = [];
    ai.units = [];
    game.projectiles = [];
    game.effects = [];

    const aiRefinery = game.createBuilding('refinery', 28, 28, 1);
    const aiWarFactory = game.createBuilding('warFactory', 24, 28, 1);
    ai.buildings.push(aiRefinery, aiWarFactory);

    const aiHarvester = game.createUnit('harvester', 29.5, 31.5, 1);
    const aiTankA = game.createUnit('tank', 25.5, 31.5, 1);
    const aiTankB = game.createUnit('tank', 26.5, 30.8, 1);
    const aiTankC = game.createUnit('tank', 27.2, 29.8, 1);
    const aiRocket = game.createUnit('rocketInfantry', 27.8, 30.5, 1);
    ai.units.push(aiHarvester, aiTankA, aiTankB, aiTankC, aiRocket);

    const raider = game.createUnit('soldier', 31.2, 31.5, 0);
    const enemyHarvester = game.createUnit('harvester', 13.5, 12.5, 0);
    const enemyPowerPlant = game.createBuilding('powerPlant', 11, 8, 0);
    human.units.push(raider, enemyHarvester);
    human.buildings.push(enemyPowerPlant);

    const threatsBefore = game.getAIThreatenedHarvesters(ai, human).map((entry: any) => ({
      targetType: entry.target.type,
      enemyType: entry.enemy.type,
      distance: Number(entry.distance.toFixed(2)),
    }));

    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    const aiUnits = ai.units.filter((unit: any) => unit.state !== 'dead');
    const defenders = aiUnits
      .filter((unit: any) => unit.attackTarget === raider)
      .map((unit: any) => unit.type);
    const harassers = aiUnits
      .filter((unit: any) => unit.attackTarget === enemyHarvester)
      .map((unit: any) => unit.type);

    return {
      threatsBefore,
      priorityTargetType: game.getAIPriorityTarget(ai, human)?.type,
      defenders,
      harassers,
      harasserStates: aiUnits
        .filter((unit: any) => unit.attackTarget === enemyHarvester)
        .map((unit: any) => unit.state),
    };
  });

  expect(tacticalState.threatsBefore).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ targetType: 'harvester', enemyType: 'soldier' }),
    ]),
  );
  expect(tacticalState.priorityTargetType).toBe('harvester');
  expect(tacticalState.defenders.length).toBeGreaterThanOrEqual(2);
  expect(tacticalState.harassers.length).toBeGreaterThanOrEqual(2);
  expect(tacticalState.harasserStates.every((state: string) => state === 'attacking')).toBe(true);
});
