import { expect, test } from '@playwright/test';

test('crossroads spawns neutral bunkers and civilian blocks that infantry can seize and vacate', async ({ page }) => {
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
    const bunkers = neutral.buildings.filter((building: any) => building.type === 'battleBunker' && building.isNeutralStructure);
    const civilianBlocks = neutral.buildings.filter((building: any) => building.type === 'civilianBlock' && building.isNeutralStructure);
    const bunker = bunkers[0];
    const civilianBlock = civilianBlocks[0];
    const soldier = game.createUnit('soldier', bunker.tx - 1.2, bunker.ty + 0.2, 0);
    const rocketInfantry = game.createUnit('rocketInfantry', civilianBlock.tx - 1.2, civilianBlock.ty + 0.2, 0);
    player.units.push(soldier, rocketInfantry);

    const orderAccepted = game.orderUnitToGarrison(soldier, bunker);
    const cityOrderAccepted = game.orderUnitToGarrison(rocketInfantry, civilianBlock);
    for (let i = 0; i < 180; i += 1) game.update(50);
    game._syncRenderer(16);

    game.selected = [bunker];
    game.updateSelectionInfo();
    const bunkerSelectionText = document.getElementById('selection-info')?.textContent || '';

    game.selected = [civilianBlock];
    game.updateSelectionInfo();
    const citySelectionText = document.getElementById('selection-info')?.textContent || '';

    const ownerAfterGarrison = bunker.owner;
    const cityOwnerAfterGarrison = civilianBlock.owner;
    const playerOwnsAfterGarrison = player.buildings.includes(bunker);
    const neutralOwnsAfterGarrison = neutral.buildings.includes(bunker);
    const soldierVisibleWhileLoaded = !!game.renderer3d.unitMeshes.get(soldier)?.visible;
    const soldierStateWhileLoaded = soldier.state;
    const rocketStateWhileLoaded = rocketInfantry.state;
    const rocketVisibleWhileLoaded = !!game.renderer3d.unitMeshes.get(rocketInfantry)?.visible;

    game.ejectGarrison(bunker, bunker.tx - 2, bunker.ty);
    game.ejectGarrison(civilianBlock, civilianBlock.tx - 2, civilianBlock.ty + 1);
    for (let i = 0; i < 20; i += 1) game.update(50);
    game._syncRenderer(16);

    return {
      bunkerCount: bunkers.length,
      civilianBlockCount: civilianBlocks.length,
      orderAccepted,
      cityOrderAccepted,
      ownerAfterGarrison,
      cityOwnerAfterGarrison,
      ownerAfterEject: bunker.owner,
      cityOwnerAfterEject: civilianBlock.owner,
      playerOwnsAfterGarrison,
      neutralOwnsAfterGarrison,
      playerOwnsAfterEject: player.buildings.includes(bunker),
      neutralOwnsAfterEject: neutral.buildings.includes(bunker),
      loadedState: soldierStateWhileLoaded,
      rocketStateWhileLoaded,
      bunkerSelectionText,
      citySelectionText,
      civilianBlockSize: civilianBlock.size,
      civilianBlockCapacity: civilianBlock.garrisonCapacity,
      soldierVisibleWhileLoaded,
      rocketVisibleWhileLoaded,
      soldierVisibleAfterEject: !!game.renderer3d.unitMeshes.get(soldier)?.visible,
      rocketVisibleAfterEject: !!game.renderer3d.unitMeshes.get(rocketInfantry)?.visible,
    };
  });

  expect(result.bunkerCount).toBeGreaterThanOrEqual(4);
  expect(result.civilianBlockCount).toBeGreaterThanOrEqual(2);
  expect(result.orderAccepted).toBe(true);
  expect(result.cityOrderAccepted).toBe(true);
  expect(result.ownerAfterGarrison).toBe(0);
  expect(result.cityOwnerAfterGarrison).toBe(0);
  expect(result.ownerAfterEject).toBe(2);
  expect(result.cityOwnerAfterEject).toBe(2);
  expect(result.playerOwnsAfterGarrison).toBe(true);
  expect(result.neutralOwnsAfterGarrison).toBe(false);
  expect(result.playerOwnsAfterEject).toBe(false);
  expect(result.neutralOwnsAfterEject).toBe(true);
  expect(result.loadedState).toBe('loaded');
  expect(result.rocketStateWhileLoaded).toBe('loaded');
  expect(result.bunkerSelectionText).toContain('GARRISON 1/3');
  expect(result.citySelectionText).toContain('GARRISON 1/4');
  expect(result.civilianBlockSize).toBe(2);
  expect(result.civilianBlockCapacity).toBe(4);
  expect(result.soldierVisibleAfterEject).toBe(true);
  expect(result.rocketVisibleAfterEject).toBe(true);
});
