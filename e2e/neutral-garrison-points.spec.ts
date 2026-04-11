import { expect, test } from '@playwright/test';

test('crossroads spawns neutral garrison points that infantry can seize and vacate', async ({ page }) => {
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
    const bunker = bunkers[0];
    const soldier = game.createUnit('soldier', bunker.tx - 1.2, bunker.ty + 0.2, 0);
    player.units.push(soldier);

    const orderAccepted = game.orderUnitToGarrison(soldier, bunker);
    for (let i = 0; i < 180; i += 1) game.update(50);
    game._syncRenderer(16);
    game.selected = [bunker];
    game.updateSelectionInfo();

    const selectionText = document.getElementById('selection-info')?.textContent || '';
    const ownerAfterGarrison = bunker.owner;
    const playerOwnsAfterGarrison = player.buildings.includes(bunker);
    const neutralOwnsAfterGarrison = neutral.buildings.includes(bunker);
    const soldierVisibleWhileLoaded = !!game.renderer3d.unitMeshes.get(soldier)?.visible;
    const soldierStateWhileLoaded = soldier.state;

    game.ejectGarrison(bunker, bunker.tx - 2, bunker.ty);
    for (let i = 0; i < 20; i += 1) game.update(50);
    game._syncRenderer(16);

    return {
      bunkerCount: bunkers.length,
      orderAccepted,
      ownerAfterGarrison,
      ownerAfterEject: bunker.owner,
      playerOwnsAfterGarrison,
      neutralOwnsAfterGarrison,
      playerOwnsAfterEject: player.buildings.includes(bunker),
      neutralOwnsAfterEject: neutral.buildings.includes(bunker),
      loadedState: soldierStateWhileLoaded,
      selectionText,
      soldierVisibleWhileLoaded,
      soldierVisibleAfterEject: !!game.renderer3d.unitMeshes.get(soldier)?.visible,
    };
  });

  expect(result.bunkerCount).toBeGreaterThanOrEqual(4);
  expect(result.orderAccepted).toBe(true);
  expect(result.ownerAfterGarrison).toBe(0);
  expect(result.ownerAfterEject).toBe(2);
  expect(result.playerOwnsAfterGarrison).toBe(true);
  expect(result.neutralOwnsAfterGarrison).toBe(false);
  expect(result.playerOwnsAfterEject).toBe(false);
  expect(result.neutralOwnsAfterEject).toBe(true);
  expect(result.loadedState).toBe('loaded');
  expect(result.selectionText).toContain('GARRISON 1/3');
  expect(result.soldierVisibleAfterEject).toBe(true);
});
