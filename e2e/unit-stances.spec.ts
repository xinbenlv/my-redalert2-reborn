import { expect, test } from '@playwright/test';

test('aggressive stance acquires farther targets while hold ground refuses to chase beyond its anchor', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).GameState));

  const result = await page.evaluate(() => {
    const GameState = (window as any).GameState;
    const baseConfig = {
      map: 'classic',
      startingCredits: 6500,
      playerFaction: 'soviet',
      aiDifficulty: 'easy',
      aiPlayers: 1,
      aiBuildOrder: 'balanced',
      gameSpeed: 'normal',
    };

    const buildAcquireSample = (stance: 'guard' | 'aggressive') => {
      const game = new GameState(baseConfig);
      const unit = game.createUnit('soldier', 10, 10, 0);
      const enemy = game.createUnit('soldier', 18, 10, 1);
      game.players[0].units.push(unit);
      game.players[1].units.push(enemy);
      game.setUnitStance(unit, stance, { resetAnchor: true });
      game.updateAutoAttack(0);
      return {
        stance,
        targetAcquired: Boolean(unit.attackTarget),
        state: unit.state,
      };
    };

    const holdGame = new GameState(baseConfig);
    const holdUnit = holdGame.createUnit('soldier', 12, 12, 0);
    const holdEnemy = holdGame.createUnit('soldier', 16, 12, 1);
    holdGame.players[0].units.push(holdUnit);
    holdGame.players[1].units.push(holdEnemy);
    holdGame.setUnitStance(holdUnit, 'hold', { resetAnchor: true });
    holdUnit.attackTarget = holdEnemy;
    holdUnit.state = 'attacking';
    holdGame.update(100);
    holdEnemy.x = 20;
    holdEnemy.y = 12;
    for (let i = 0; i < 8; i += 1) holdGame.update(100);

    return {
      guard: buildAcquireSample('guard'),
      aggressive: buildAcquireSample('aggressive'),
      hold: {
        stance: holdUnit.stance,
        attackTargetCleared: holdUnit.attackTarget === null,
        state: holdUnit.state,
        distanceFromAnchor: Math.hypot(holdUnit.x - holdUnit.stanceAnchor.x, holdUnit.y - holdUnit.stanceAnchor.y),
      },
    };
  });

  expect(result.guard.targetAcquired).toBeFalsy();
  expect(result.aggressive.targetAcquired).toBeTruthy();
  expect(result.aggressive.state).toBe('attacking');
  expect(result.hold.stance).toBe('hold');
  expect(result.hold.attackTargetCleared).toBeTruthy();
  expect(result.hold.distanceFromAnchor).toBeLessThan(0.35);
});

test('selection panel stance controls and hotkeys update the selected unit stance', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).GameState));

  await page.evaluate(() => {
    const GameState = (window as any).GameState;
    const game = new GameState({
      map: 'classic',
      startingCredits: 6500,
      playerFaction: 'soviet',
      aiDifficulty: 'easy',
      aiPlayers: 1,
      aiBuildOrder: 'balanced',
      gameSpeed: 'normal',
    });
    const unit = game.createUnit('soldier', 11, 11, 0);
    game.players[0].units.push(unit);
    game.selected = [unit];
    game.updateSelectionInfo();
    (window as any).game = game;
  });

  await expect(page.locator('#selection-info')).toContainText('STANCE: GUARD');
  await expect(page.locator('[data-action="stance-hold"]')).toBeVisible();

  await page.evaluate(() => (document.querySelector('[data-action="stance-hold"]') as HTMLButtonElement | null)?.click());
  await expect(page.locator('#selection-info')).toContainText('STANCE: HOLD GROUND');

  await page.keyboard.press('a');
  await expect(page.locator('#selection-info')).toContainText('STANCE: AGGRESSIVE');

  const stance = await page.evaluate(() => {
    const game = (window as any).game;
    return game.selected[0]?.stance;
  });
  expect(stance).toBe('aggressive');
});
