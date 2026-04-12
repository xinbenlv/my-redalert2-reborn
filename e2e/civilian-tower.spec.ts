import { expect, test } from '@playwright/test';

test('crossroads spawns civilian towers that support large-footprint garrison capture and eject', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).GameState));

  const result = await page.evaluate(() => {
    const GameState = (window as any).GameState;
    const game = new GameState({
      map: 'crossroads',
      startingCredits: 6500,
      playerFaction: 'soviet',
      aiDifficulty: 'medium',
      aiBuildOrder: 'balanced',
    });
    (window as any).game = game;

    const neutral = game.players[2];
    const player = game.players[0];
    const towers = neutral.buildings.filter((building: any) => building.type === 'civilianTower' && building.isNeutralStructure);
    const tower = towers[0];
    const soldier = game.createUnit('soldier', tower.tx - 1.2, tower.ty + 0.2, 0);
    const flakTrooper = game.createUnit('flakTrooper', tower.tx - 1.2, tower.ty + 1.2, 0);
    player.units.push(soldier, flakTrooper);

    const soldierOrderAccepted = game.orderUnitToGarrison(soldier, tower);
    const flakOrderAccepted = game.orderUnitToGarrison(flakTrooper, tower);
    for (let i = 0; i < 240; i += 1) game.update(50);
    game._syncRenderer(16);
    game.renderer3d.updateUnit(soldier, 16);
    game.renderer3d.updateUnit(flakTrooper, 16);

    game.selected = [tower];
    game.updateSelectionInfo();
    const selectionText = document.getElementById('selection-info')?.textContent || '';

    const ownerAfterGarrison = tower.owner;
    const loadedStates = [soldier.state, flakTrooper.state];
    const loadedVisibility = [
      !!game.renderer3d.unitMeshes.get(soldier)?.visible,
      !!game.renderer3d.unitMeshes.get(flakTrooper)?.visible,
    ];

    game.ejectGarrison(tower, tower.tx - 2, tower.ty + 1);
    for (let i = 0; i < 30; i += 1) game.update(50);
    game._syncRenderer(16);

    return {
      towerCount: towers.length,
      soldierOrderAccepted,
      flakOrderAccepted,
      towerSize: tower.size,
      towerCapacity: tower.garrisonCapacity,
      ownerAfterGarrison,
      ownerAfterEject: tower.owner,
      selectionText,
      loadedStates,
      loadedVisibility,
      visibleAfterEject: [
        !!game.renderer3d.unitMeshes.get(soldier)?.visible,
        !!game.renderer3d.unitMeshes.get(flakTrooper)?.visible,
      ],
      statesAfterEject: [soldier.state, flakTrooper.state],
    };
  });

  expect(result.towerCount).toBeGreaterThanOrEqual(1);
  expect(result.soldierOrderAccepted).toBe(true);
  expect(result.flakOrderAccepted).toBe(true);
  expect(result.towerSize).toBe(3);
  expect(result.towerCapacity).toBe(6);
  expect(result.ownerAfterGarrison).toBe(0);
  expect(result.ownerAfterEject).toBe(2);
  expect(result.selectionText).toContain('GARRISON 2/6');
  expect(result.loadedStates).toEqual(['loaded', 'loaded']);
  expect(result.loadedVisibility).toEqual([false, false]);
  expect(result.visibleAfterEject).toEqual([true, true]);
  expect(result.statesAfterEject[0]).toMatch(/idle|moving|attacking|engaging/);
  expect(result.statesAfterEject[1]).toMatch(/idle|moving|attacking|engaging/);
});
