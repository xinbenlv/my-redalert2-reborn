import { expect, test } from '@playwright/test';

test('GI deploys into a stationary anti-infantry firing position and can undeploy back to mobile mode', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).GameState));

  const result = await page.evaluate(() => {
    const GameState = (window as any).GameState;
    const game = new GameState({
      map: 'classic',
      startingCredits: 6500,
      playerFaction: 'allied',
      aiDifficulty: 'easy',
      aiPlayers: 1,
      aiBuildOrder: 'balanced',
      gameSpeed: 'normal',
    });

    const gi = game.createUnit('gi', 12, 12, 0);
    const enemy = game.createUnit('soldier', 17, 12, 1);
    game.players[0].units.push(gi);
    game.players[1].units.push(enemy);
    game.selected = [gi];
    game.updateSelectionInfo();

    const before = {
      type: gi.type,
      role: gi.role,
      damage: gi.damage,
      range: gi.range,
      speed: gi.speed,
      canDeploy: gi.canDeploy,
      isDeployed: gi.isDeployed,
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };

    const deployed = game.toggleUnitDeploy(gi);
    game.updateAutoAttack(0);
    game.updateSelectionInfo();

    const afterDeploy = {
      deployed,
      state: gi.state,
      isDeployed: gi.isDeployed,
      speed: gi.speed,
      damage: gi.damage,
      range: gi.range,
      attackTargetType: gi.attackTarget?.type || null,
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };

    game.issueMoveOrder(gi, 15, 15);
    const moveWhileDeployed = {
      state: gi.state,
      target: gi.target ? { ...gi.target } : null,
      isDeployed: gi.isDeployed,
      speed: gi.speed,
    };

    const undeployed = game.toggleUnitDeploy(gi);
    game.updateSelectionInfo();

    return {
      before,
      afterDeploy,
      moveWhileDeployed,
      undeployed,
      afterUndeploy: {
        state: gi.state,
        isDeployed: gi.isDeployed,
        speed: gi.speed,
        damage: gi.damage,
        range: gi.range,
        selectionText: document.getElementById('selection-info')?.textContent || '',
      },
    };
  });

  expect(result.before.type).toBe('gi');
  expect(result.before.role).toBe('deployable infantry');
  expect(result.before.canDeploy).toBe(true);
  expect(result.before.selectionText).toContain('Deploy GI');

  expect(result.afterDeploy.deployed).toBe(true);
  expect(result.afterDeploy.isDeployed).toBe(true);
  expect(['deployed', 'attacking']).toContain(result.afterDeploy.state);
  expect(result.afterDeploy.speed).toBe(0);
  expect(result.afterDeploy.range).toBeGreaterThan(result.before.range);
  expect(result.afterDeploy.damage).toBeGreaterThan(result.before.damage);
  expect(result.afterDeploy.attackTargetType).toBe('soldier');
  expect(result.afterDeploy.selectionText).toContain('UNDEPLOY READY');
  expect(result.afterDeploy.selectionText).not.toContain('Force Move');

  expect(result.moveWhileDeployed.target).toBeNull();
  expect(result.moveWhileDeployed.isDeployed).toBe(true);
  expect(['deployed', 'attacking']).toContain(result.moveWhileDeployed.state);
  expect(result.moveWhileDeployed.speed).toBe(0);

  expect(result.undeployed).toBe(true);
  expect(result.afterUndeploy.isDeployed).toBe(false);
  expect(result.afterUndeploy.state).toBe('idle');
  expect(result.afterUndeploy.speed).toBe(result.before.speed);
  expect(result.afterUndeploy.range).toBe(result.before.range);
  expect(result.afterUndeploy.damage).toBe(result.before.damage);
  expect(result.afterUndeploy.selectionText).toContain('DEPLOY READY');
});

test('GI build card, selection button, and D hotkey all expose deploy controls', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.locator('.build-tab[data-tab="units"]').click();
  await expect(page.locator('.build-item')).toContainText(['GI']);

  await page.evaluate(() => {
    const game = (window as any).game;
    const gi = game.createUnit('gi', 11, 11, 0);
    game.players[0].units.push(gi);
    (window as any).__testGi = gi;
    game.selected = [gi];
    game.updateSelectionInfo();
  });

  await expect(page.locator('#selection-info')).toContainText('Deploy GI');
  await page.evaluate(() => (document.querySelector('[data-action="deploy"]') as HTMLButtonElement | null)?.click());
  await expect(page.locator('#selection-info')).toContainText('UNDEPLOY READY');

  await page.evaluate(() => {
    const game = (window as any).game;
    game.selected = [(window as any).__testGi];
    game.updateSelectionInfo();
  });
  await page.keyboard.press('d');
  await expect(page.locator('#selection-info')).toContainText('DEPLOY READY');

  const deployState = await page.evaluate(() => {
    const game = (window as any).game;
    const gi = game.selected[0];
    return {
      isDeployed: gi?.isDeployed,
      state: gi?.state,
    };
  });

  expect(deployState.isDeployed).toBe(false);
  expect(deployState.state).toBe('idle');
});
