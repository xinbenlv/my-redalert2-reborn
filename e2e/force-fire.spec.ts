import { expect, test } from '@playwright/test';

test('selection panel arms force-fire mode and hotkey C cancels it', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const artillery = game.createUnit('artillery', 12, 12, 0);
    player.units.push(artillery);
    game.selected = [artillery];
    game.updateSelectionInfo();
  });

  await expect(page.locator('#selection-info [data-action="force-fire"]')).toHaveCount(1);
  await page.evaluate(() => {
    (document.querySelector('#selection-info [data-action="force-fire"]') as HTMLButtonElement | null)?.click();
  });

  const armed = await page.evaluate(() => {
    const game = (window as any).game;
    return {
      commandMode: game.commandMode,
      text: document.getElementById('selection-info')?.textContent || '',
      eva: document.getElementById('eva-message')?.textContent || '',
    };
  });

  expect(armed.commandMode).toBe('set-force-fire');
  expect(armed.text).toContain('Placing Force Fire');
  expect(armed.eva).toContain('force-fire');

  await page.keyboard.press('c');
  const cancelled = await page.evaluate(() => ({
    commandMode: (window as any).game.commandMode,
    eva: document.getElementById('eva-message')?.textContent || '',
  }));

  expect(cancelled.commandMode).toBeNull();
  expect(cancelled.eva).toContain('Force-fire cancelled');
});

test('ctrl-right-click force-fires an empty tile and splash damages nearby enemies', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const result = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];
    player.units = [];
    enemy.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];
    enemy.buildings = [game.createBuilding('constructionYard', 28, 28, 1)];

    const artillery = game.createUnit('artillery', 12, 12, 0);
    const soldier = game.createUnit('soldier', 18, 13, 1);
    player.units.push(artillery);
    enemy.units.push(soldier);
    game.selected = [artillery];
    game.updateSelectionInfo();

    const screen = game.renderer3d.tileToScreen(18, 12);
    game.onRightClick({ clientX: screen.x, clientY: screen.y, ctrlKey: true });
    game.updateSelectionInfo();

    const orderSnapshot = {
      commandMode: game.commandMode,
      orderText: document.getElementById('selection-info')?.textContent || '',
      eva: document.getElementById('eva-message')?.textContent || '',
      attackTarget: game.selected[0].attackTarget,
    };

    for (let i = 0; i < 80; i++) {
      game.update(100);
    }
    game.updateSelectionInfo();

    return {
      orderSnapshot: {
        commandMode: orderSnapshot.commandMode,
        orderText: orderSnapshot.orderText,
        eva: orderSnapshot.eva,
        isGroundTarget: Boolean(orderSnapshot.attackTarget?.isGroundTarget),
        targetX: orderSnapshot.attackTarget?.x ?? null,
        targetY: orderSnapshot.attackTarget?.y ?? null,
      },
      enemyHp: soldier.hp,
      artilleryState: artillery.state,
      artilleryPosition: { x: artillery.x, y: artillery.y },
      remainingProjectiles: game.projectiles.length,
      remainingAttackTarget: artillery.attackTarget
        ? {
            isGroundTarget: Boolean(artillery.attackTarget.isGroundTarget),
            owner: artillery.attackTarget.owner ?? null,
            type: artillery.attackTarget.type ?? null,
          }
        : null,
    };
  });

  expect(result.orderSnapshot.commandMode).toBeNull();
  expect(result.orderSnapshot.orderText).toContain('ORDER: FORCE FIRE');
  expect(result.orderSnapshot.eva).toContain('force-firing');
  expect(result.orderSnapshot.isGroundTarget).toBe(true);
  expect(result.orderSnapshot.targetX).toBeCloseTo(18, 0);
  expect(result.orderSnapshot.targetY).toBeCloseTo(12, 0);
  expect(result.enemyHp).toBeLessThan(50);
  expect(result.artilleryPosition.x).toBeGreaterThanOrEqual(12);
  expect(result.remainingProjectiles).toBe(0);
  expect(result.remainingAttackTarget?.isGroundTarget ?? false).toBe(false);
  expect(['idle', 'attacking']).toContain(result.artilleryState);
});
