import { expect, test } from '@playwright/test';

async function resetEconomySandbox(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const game = (window as any).game;
    const human = game.players[0];
    const ai = game.players[1];

    for (let y = 0; y < game.map.length; y += 1) {
      for (let x = 0; x < game.map[y].length; x += 1) {
        game.map[y][x].type = 'grass';
        game.map[y][x].oreAmount = 0;
        game.map[y][x].maxOreAmount = 0;
      }
    }

    human.money = 0;
    ai.money = 0;
    human.buildings = [];
    human.units = [];
    ai.buildings = [];
    ai.units = [];
    game.projectiles = [];
    game.effects = [];
  });
}

test('harvester avoids nearby ore that sits under enemy threat', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await resetEconomySandbox(page);

  const target = await page.evaluate(() => {
    const game = (window as any).game;
    const human = game.players[0];
    const ai = game.players[1];

    const refinery = game.createBuilding('refinery', 6, 6, 1);
    ai.buildings.push(refinery);

    const harvester = game.createUnit('harvester', 9, 9, 1);
    ai.units.push(harvester);

    const dangerousTile = game.map[10][10];
    dangerousTile.type = 'ore';
    dangerousTile.oreAmount = 5000;
    dangerousTile.maxOreAmount = 5000;

    const safeTile = game.map[15][15];
    safeTile.type = 'ore';
    safeTile.oreAmount = 5000;
    safeTile.maxOreAmount = 5000;

    const raider = game.createUnit('tank', 11, 10, 0);
    human.units.push(raider);

    game.assignHarvesterJob(harvester, ai);
    return {
      oreTarget: harvester.oreTarget ? { x: harvester.oreTarget.x, y: harvester.oreTarget.y, threatDist: harvester.oreTarget.threatDist } : null,
      state: harvester.state,
      moveTarget: harvester.target ? { ...harvester.target } : null,
    };
  });

  expect(target.state).toBe('movingToOre');
  expect(target.oreTarget).toBeTruthy();
  expect(target.oreTarget).toEqual(expect.objectContaining({ x: 15, y: 15 }));
  expect(target.moveTarget).toEqual(expect.objectContaining({ x: 15, y: 15 }));
  expect((target.oreTarget as any).threatDist).toBeGreaterThan(5);
});

test('harvester prefers a richer ore field over a nearly depleted closer patch', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await resetEconomySandbox(page);

  const target = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];

    const refinery = game.createBuilding('refinery', 6, 6, 1);
    ai.buildings.push(refinery);

    const harvester = game.createUnit('harvester', 8.5, 8.5, 1);
    ai.units.push(harvester);

    const scrapTile = game.map[10][10];
    scrapTile.type = 'ore';
    scrapTile.oreAmount = 40;
    scrapTile.maxOreAmount = 5000;

    const richField = [
      [13, 13], [13, 14], [14, 13], [14, 14], [12, 13], [13, 12],
    ];
    for (const [x, y] of richField) {
      const tile = game.map[y][x];
      tile.type = 'ore';
      tile.oreAmount = 5000;
      tile.maxOreAmount = 5000;
    }

    game.assignHarvesterJob(harvester, ai);
    return {
      oreTarget: harvester.oreTarget ? {
        x: harvester.oreTarget.x,
        y: harvester.oreTarget.y,
        localFieldValue: harvester.oreTarget.localFieldValue,
        score: harvester.oreTarget.score,
      } : null,
    };
  });

  expect(target.oreTarget).toBeTruthy();
  expect([
    '13,13',
    '13,14',
    '14,13',
    '14,14',
    '12,13',
    '13,12',
  ]).toContain(`${(target.oreTarget as any).x},${(target.oreTarget as any).y}`);
  expect((target.oreTarget as any).localFieldValue).toBeGreaterThan(20000);
});


test('harvester prefers gem fields over equally close ore because they pay more per trip', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await resetEconomySandbox(page);

  const target = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];

    const refinery = game.createBuilding('refinery', 6, 6, 1);
    ai.buildings.push(refinery);

    const harvester = game.createUnit('harvester', 10, 10, 1);
    ai.units.push(harvester);

    const oreTile = game.map[10][12];
    oreTile.type = 'ore';
    oreTile.oreAmount = 5000;
    oreTile.maxOreAmount = 5000;

    const gemTile = game.map[12][10];
    gemTile.type = 'gems';
    gemTile.oreAmount = 3200;
    gemTile.maxOreAmount = 3200;

    game.assignHarvesterJob(harvester, ai);
    return {
      oreTarget: harvester.oreTarget ? {
        x: harvester.oreTarget.x,
        y: harvester.oreTarget.y,
        resourceType: harvester.oreTarget.resourceType,
        resourceValueMultiplier: harvester.oreTarget.resourceValueMultiplier,
      } : null,
    };
  });

  expect(target.oreTarget).toEqual(expect.objectContaining({ x: 10, y: 12, resourceType: 'gems', resourceValueMultiplier: 2 }));
});

test('harvester converts gems into extra credits while respecting cargo capacity', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await resetEconomySandbox(page);

  const result = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];

    const refinery = game.createBuilding('refinery', 6, 6, 1);
    ai.buildings.push(refinery);

    const harvester = game.createUnit('harvester', 8, 8, 1);
    ai.units.push(harvester);

    const gemTile = game.map[8][8];
    gemTile.type = 'gems';
    gemTile.oreAmount = 1000;
    gemTile.maxOreAmount = 1000;

    game.assignHarvesterJob(harvester, ai);
    for (let i = 0; i < 25; i += 1) {
      game.updateHarvesterUnit(harvester, ai, harvester.harvestInterval);
      if (harvester.cargo >= harvester.cargoCapacity) break;
    }
    const cargoAfterMining = harvester.cargo;
    const gemRemaining = gemTile.oreAmount;

    harvester.x = refinery.tx + refinery.size / 2 - 0.5;
    harvester.y = refinery.ty + refinery.size / 2 - 0.5;
    harvester.state = 'unloading';
    harvester.returnRefinery = refinery;
    for (let i = 0; i < 10; i += 1) game.updateHarvesterUnit(harvester, ai, harvester.unloadInterval);

    return {
      cargoAfterMining,
      gemRemaining,
      moneyAfterUnload: ai.money,
      cargoAfterUnload: harvester.cargo,
    };
  });

  expect(result.cargoAfterMining).toBe(700);
  expect(result.gemRemaining).toBe(650);
  expect(result.moneyAfterUnload).toBe(700);
  expect(result.cargoAfterUnload).toBe(0);
});
