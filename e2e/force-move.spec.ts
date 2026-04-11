import { expect, test } from '@playwright/test';

test('selection panel and hotkey arm force-move mode', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const soldier = game.createUnit('soldier', 12, 12, 0);
    player.units.push(soldier);
    game.selected = [soldier];
    game.updateSelectionInfo();
  });

  await expect(page.locator('#selection-info [data-action="force-move"]')).toHaveCount(1);
  await page.keyboard.press('f');

  const armedState = await page.evaluate(() => {
    const game = (window as any).game;
    return {
      commandMode: game.commandMode,
      text: document.getElementById('selection-info')?.textContent || '',
      eva: document.getElementById('eva-message')?.textContent || '',
    };
  });

  expect(armedState.commandMode).toBe('set-force-move');
  expect(armedState.text).toContain('Placing Force Move');
  expect(armedState.eva).toContain('force-move');
});

test('force-move right-click on an enemy tile moves through instead of auto-attacking', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const scenario = async (forceMove: boolean) => {
    return await page.evaluate(({ forceMove }) => {
      const game = (window as any).game;
      const player = game.players[0];
      const enemy = game.players[1];
      player.units = [];
      enemy.units = [];
      player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];
      enemy.buildings = [game.createBuilding('constructionYard', 28, 28, 1)];

      const soldier = game.createUnit('soldier', 12, 12, 0);
      const blocker = game.createUnit('soldier', 15, 12, 1);
      player.units.push(soldier);
      enemy.units.push(blocker);
      game.selected = [soldier];
      game.updateSelectionInfo();

      if (forceMove) {
        game.toggleForceMoveMode();
        const screen = game.renderer3d.tileToScreen(blocker.x, blocker.y);
        game.onRightClick({ clientX: screen.x, clientY: screen.y });
      } else {
        const screen = game.renderer3d.tileToScreen(blocker.x, blocker.y);
        game.onRightClick({ clientX: screen.x, clientY: screen.y });
      }

      for (let i = 0; i < 8; i++) game.update(100);
      game.updateSelectionInfo();

      return {
        state: soldier.state,
        hasAttackTarget: Boolean(soldier.attackTarget),
        moveTarget: soldier.target,
        forceMove: soldier.forceMove,
        position: { x: soldier.x, y: soldier.y },
        commandMode: game.commandMode,
        eva: document.getElementById('eva-message')?.textContent || '',
        text: document.getElementById('selection-info')?.textContent || '',
      };
    }, { forceMove });
  };

  const normalAttack = await scenario(false);
  expect(normalAttack.hasAttackTarget).toBe(true);
  expect(['attacking', 'engaging']).toContain(normalAttack.state);
  expect(normalAttack.moveTarget).toBeNull();
  expect(normalAttack.forceMove).toBe(false);

  const forcedMove = await scenario(true);
  expect(forcedMove.hasAttackTarget).toBe(false);
  expect(forcedMove.state).toBe('moving');
  expect(forcedMove.moveTarget?.x).toBeCloseTo(15, 0);
  expect(forcedMove.moveTarget?.y).toBeCloseTo(12, 0);
  expect(forcedMove.forceMove).toBe(true);
  expect(forcedMove.position.x).toBeGreaterThan(12.2);
  expect(forcedMove.commandMode).toBeNull();
  expect(forcedMove.eva).toContain('force-moving');
  expect(forcedMove.text).toContain('ORDER: FORCE MOVE');
});
