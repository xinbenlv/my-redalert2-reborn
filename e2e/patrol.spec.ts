import { expect, test } from '@playwright/test';

test('selection panel patrol command loops a unit between two points', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];
    game.players.slice(1).forEach((other: any) => {
      other.units = [];
      other.buildings = [];
    });

    const soldier = game.createUnit('soldier', 12, 12, 0);
    player.units.push(soldier);
    game.selected = [soldier];
    game.updateSelectionInfo();
  });

  await expect(page.locator('#selection-info [data-action="patrol"]')).toHaveCount(1);
  await page.evaluate(() => {
    (document.querySelector('#selection-info [data-action="patrol"]') as HTMLButtonElement | null)?.click();
  });

  const modeState = await page.evaluate(() => {
    const game = (window as any).game;
    return {
      commandMode: game.commandMode,
      text: document.getElementById('selection-info')?.textContent || '',
      eva: document.getElementById('eva-message')?.textContent || '',
    };
  });

  expect(modeState.commandMode).toBe('set-patrol');
  expect(modeState.text).toContain('Placing Patrol');
  expect(modeState.eva).toContain('place patrol route');

  await page.evaluate(() => {
    const game = (window as any).game;
    const screen = game.renderer3d.tileToScreen(16, 12);
    game.onRightClick({ clientX: screen.x, clientY: screen.y });
  });

  const assignedState = await page.evaluate(() => {
    const game = (window as any).game;
    const soldier = game.players[0].units[0];
    return {
      state: soldier.state,
      patrolRoute: soldier.patrolRoute,
      patrolIndex: soldier.patrolIndex,
      target: soldier.target,
      text: document.getElementById('selection-info')?.textContent || '',
      eva: document.getElementById('eva-message')?.textContent || '',
    };
  });

  expect(assignedState.state).toBe('patrolling');
  expect(assignedState.patrolRoute).toHaveLength(2);
  expect(assignedState.patrolIndex).toBe(1);
  expect(assignedState.target?.x).toBeCloseTo(16, 1);
  expect(assignedState.target?.y).toBeCloseTo(12, 1);
  expect(assignedState.text).toContain('PATROL: 12, 12 ⇄ 16, 12');
  expect(assignedState.eva).toContain('patrol route confirmed');

  await page.evaluate(() => {
    const game = (window as any).game;
    for (let i = 0; i < 100; i++) game.update(100);
    game.updateSelectionInfo();
  });

  const loopState = await page.evaluate(() => {
    const game = (window as any).game;
    const soldier = game.players[0].units[0];
    return {
      state: soldier.state,
      patrolIndex: soldier.patrolIndex,
      target: soldier.target,
      position: { x: soldier.x, y: soldier.y },
      text: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(loopState.state).toBe('patrolling');
  expect([0, 1]).toContain(loopState.patrolIndex);
  expect([12, 16]).toContain(Math.round(loopState.target?.x ?? -1));
  expect(Math.round(loopState.target?.y ?? -1)).toBe(12);
  expect(loopState.position.x).toBeGreaterThanOrEqual(11.5);
  expect(loopState.position.x).toBeLessThanOrEqual(16.5);
  expect(loopState.text).toContain('PATROL: 12, 12 ⇄ 16, 12');
});

test('patrol hotkey arms patrol placement for multi-selection', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const squad = [
      game.createUnit('soldier', 12, 12, 0),
      game.createUnit('rocketInfantry', 12.5, 12.2, 0),
    ];
    player.units.push(...squad);
    game.selected = squad;
    game.updateSelectionInfo();
  });

  await page.keyboard.press('p');

  const armedState = await page.evaluate(() => {
    const game = (window as any).game;
    return {
      commandMode: game.commandMode,
      text: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(armedState.commandMode).toBe('set-patrol');
  expect(armedState.text).toContain('Placing Patrol');

  await page.evaluate(() => {
    const game = (window as any).game;
    const screen = game.renderer3d.tileToScreen(18, 13);
    game.onRightClick({ clientX: screen.x, clientY: screen.y });
  });

  const assignedState = await page.evaluate(() => {
    const game = (window as any).game;
    return game.players[0].units.map((unit: any) => ({
      state: unit.state,
      patrolRouteLength: unit.patrolRoute?.length || 0,
      patrolIndex: unit.patrolIndex,
      target: unit.target,
    }));
  });

  expect(assignedState).toHaveLength(2);
  expect(assignedState.every((unit: any) => unit.state === 'patrolling')).toBe(true);
  expect(assignedState.every((unit: any) => unit.patrolRouteLength === 2)).toBe(true);
  expect(assignedState.every((unit: any) => unit.patrolIndex === 1)).toBe(true);
  expect(assignedState.every((unit: any) => unit.target && unit.target.x >= 17 && unit.target.x <= 19)).toBe(true);
});
