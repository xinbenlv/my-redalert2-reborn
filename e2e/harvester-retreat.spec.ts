import { expect, test } from '@playwright/test';

test('harvester retreats to refinery when ambushed and resumes harvesting after the threat clears', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const retreatState = await page.evaluate(() => {
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

    const refinery = game.createBuilding('refinery', 28, 28, 1);
    ai.buildings.push(refinery);

    const harvester = game.createUnit('harvester', 25.5, 31.5, 1);
    harvester.cargo = 280;
    harvester.hp = Math.floor(harvester.maxHp * 0.42);
    harvester.state = 'harvesting';
    ai.units.push(harvester);

    const raider = game.createUnit('soldier', 24.4, 31.5, 0);
    human.units.push(raider);

    harvester._lastAttackerUnit = raider;
    harvester._lastHitTime = Date.now();

    const refineryAnchor = {
      x: refinery.tx + refinery.size / 2 - 0.5,
      y: refinery.ty + refinery.size / 2 - 0.5,
    };
    const startDistance = Math.hypot(harvester.x - refineryAnchor.x, harvester.y - refineryAnchor.y);

    for (let i = 0; i < 40; i += 1) {
      game.updateHarvesterUnit(harvester, ai, 250);
    }

    const retreatDistance = Math.hypot(harvester.x - refineryAnchor.x, harvester.y - refineryAnchor.y);
    const retreatSnapshot = {
      state: harvester.state,
      target: harvester.target ? { ...harvester.target } : null,
      cargo: harvester.cargo,
      startDistance,
      retreatDistance,
      moneyAfterUnload: ai.money,
      returnRefineryType: harvester.returnRefinery?.type || null,
    };

    raider.state = 'dead';
    harvester._lastAttackerUnit = null;
    harvester._lastHitTime = 0;
    harvester.evadeUntil = Date.now() - 1;

    for (let i = 0; i < 16; i += 1) {
      game.updateHarvesterUnit(harvester, ai, 250);
    }

    return {
      ...retreatSnapshot,
      resumedState: harvester.state,
      resumedTarget: harvester.target ? { ...harvester.target } : null,
      oreTarget: harvester.oreTarget ? { x: harvester.oreTarget.x, y: harvester.oreTarget.y } : null,
    };
  });

  expect(retreatState.returnRefineryType).toBe('refinery');
  expect(retreatState.startDistance).toBeGreaterThan(retreatState.retreatDistance);
  expect(retreatState.retreatDistance).toBeLessThanOrEqual(1.8);
  expect(['evadingToRefinery', 'unloading']).toContain(retreatState.state);
  if (retreatState.target) {
    expect(retreatState.target.x).toBeCloseTo(29, 0);
    expect(retreatState.target.y).toBeCloseTo(29, 0);
  }
  expect(retreatState.moneyAfterUnload).toBeGreaterThan(0);
  expect(retreatState.cargo).toBeLessThan(280);
  expect(['movingToOre', 'harvesting']).toContain(retreatState.resumedState);
  expect(retreatState.oreTarget).toBeTruthy();
});
