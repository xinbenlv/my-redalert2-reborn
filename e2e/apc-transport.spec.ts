import { expect, test } from '@playwright/test';

test('apc loads infantry on command and unloads them near the drop point', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const boardedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const apc = game.createUnit('apc', 16, 14, 0);
    const soldier = game.createUnit('soldier', 16, 15, 0);
    const engineer = game.createUnit('engineer', 17, 15, 0);
    player.units.push(apc, soldier, engineer);

    game.selected = [apc];
    game.updateSelectionInfo();

    const pickup = game.renderer3d.tileToScreen(soldier.x, soldier.y);
    game.onRightClick({ clientX: pickup.x, clientY: pickup.y });
    for (let i = 0; i < 30; i++) game.update(100);
    game.selected = [apc];
    game.updateSelectionInfo();

    return {
      passengerCapacity: apc.passengerCapacity,
      passengerCount: apc.passengers.length,
      passengerTypes: apc.passengers.map((unit: any) => unit.type),
      soldierState: soldier.state,
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(boardedState.passengerCapacity).toBe(4);
  expect(boardedState.passengerCount).toBe(1);
  expect(boardedState.passengerTypes).toEqual(['soldier']);
  expect(boardedState.soldierState).toBe('loaded');
  expect(boardedState.selectionText).toContain('CARGO: 1/4');
  expect(boardedState.selectionText).toContain('LOADED: Soldier');

  const unloadedState = await page.evaluate(() => {
    const game = (window as any).game;
    const apc = game.players[0].units.find((unit: any) => unit.type === 'apc');
    const soldier = game.players[0].units.find((unit: any) => unit.type === 'soldier');
    const drop = game.renderer3d.tileToScreen(21, 14);

    game.selected = [apc];
    game.updateSelectionInfo();
    game.onRightClick({ clientX: drop.x, clientY: drop.y });
    for (let i = 0; i < 60; i++) game.update(100);

    return {
      passengerCount: apc.passengers.length,
      apcState: apc.state,
      soldierState: soldier.state,
      soldierPos: { x: soldier.x, y: soldier.y },
      distanceToDrop: Math.hypot(soldier.x - 21, soldier.y - 14),
    };
  });

  expect(unloadedState.passengerCount).toBe(0);
  expect(unloadedState.apcState).toBe('idle');
  expect(unloadedState.soldierState).toBe('idle');
  expect(unloadedState.distanceToDrop).toBeLessThanOrEqual(2.5);
});

test('infantry can board a friendly apc by right-clicking the transport', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const boardingState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const apc = game.createUnit('apc', 18, 18, 0);
    const engineer = game.createUnit('engineer', 16, 18, 0);
    player.units.push(apc, engineer);

    game.selected = [engineer];
    game.updateSelectionInfo();

    const pickup = game.renderer3d.tileToScreen(apc.x, apc.y);
    game.onRightClick({ clientX: pickup.x, clientY: pickup.y });
    for (let i = 0; i < 40; i++) game.update(100);

    return {
      passengerTypes: apc.passengers.map((unit: any) => unit.type),
      engineerState: engineer.state,
      engineerVisible: !!game.renderer3d.unitMeshes.get(engineer)?.visible,
    };
  });

  expect(boardingState.passengerTypes).toEqual(['engineer']);
  expect(boardingState.engineerState).toBe('loaded');
  expect(boardingState.engineerVisible).toBe(false);
});
