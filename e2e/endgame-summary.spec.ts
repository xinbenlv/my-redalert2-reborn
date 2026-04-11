import { expect, test } from '@playwright/test';

test('endgame rules require a living base or MCV and show battle summary stats', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const mcvHoldout = await page.evaluate(() => {
    const game = (window as any).game;
    game.players[0].buildings = [];
    game.players[0].units = [game.createUnit('mcv', 11, 11, 0)];
    game.players[1].buildings = [game.createBuilding('constructionYard', 28, 28, 1)];
    game.players[1].units = [];
    game.gameOver = false;
    game.matchResult = null;
    game.checkVictoryConditions();

    return {
      gameOver: game.gameOver,
      overlayHidden: document.getElementById('match-summary-overlay')?.classList.contains('hidden'),
    };
  });

  expect(mcvHoldout.gameOver).toBe(false);
  expect(mcvHoldout.overlayHidden).toBe(true);

  const battleReport = await page.evaluate(() => {
    const game = (window as any).game;
    const playerTank = game.createUnit('tank', 12, 12, 0);
    const enemySoldier = game.createUnit('soldier', 26, 26, 1);
    const enemyYard = game.createBuilding('constructionYard', 28, 28, 1);

    game.elapsedMs = 96500;
    game.players[0].buildings = [game.createBuilding('constructionYard', 8, 8, 0)];
    game.players[0].units = [playerTank];
    game.players[1].buildings = [enemyYard];
    game.players[1].units = [enemySoldier];
    game.matchStats = game.players.map(() => game.createEmptyPlayerStats());
    game.gameOver = false;
    game.matchResult = null;
    document.getElementById('match-summary-overlay')?.classList.add('hidden');

    game.recordUnitBuilt(0);
    game.recordBuildingConstructed(0);
    game.recordBuildingConstructed(1);
    game.markUnitDestroyed(enemySoldier, 0);
    enemyYard.hp = 0;
    enemyYard._lastAttackerOwner = 0;
    game.checkVictoryConditions();

    return {
      gameOver: game.gameOver,
      title: document.getElementById('match-summary-title')?.textContent,
      duration: document.getElementById('match-summary-duration')?.textContent,
      reason: document.getElementById('match-summary-reason')?.textContent,
      statsText: document.getElementById('match-summary-stats')?.textContent,
      eva: document.getElementById('eva-message')?.textContent,
      result: game.matchResult,
      overlayHidden: document.getElementById('match-summary-overlay')?.classList.contains('hidden'),
    };
  });

  expect(battleReport.gameOver).toBe(true);
  expect(battleReport.overlayHidden).toBe(false);
  expect(battleReport.title).toBe('Victory');
  expect(battleReport.duration).toContain('01:36');
  expect(battleReport.reason).toContain('stray units no longer keep the match alive');
  expect(battleReport.statsText).toContain('Units killed');
  expect(battleReport.statsText).toContain('Buildings destroyed');
  expect(battleReport.statsText).toContain('Enemy eliminated');
  expect(battleReport.statsText).toContain('1');
  expect(battleReport.eva).toContain('VICTORY');
  expect(battleReport.result?.playerWon).toBe(true);
  expect(battleReport.result?.losingPlayerIndex).toBe(1);
});

test('a lone infantry survivor now loses instead of stalling the skirmish forever', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const outcome = await page.evaluate(() => {
    const game = (window as any).game;
    game.players[0].buildings = [];
    game.players[0].units = [game.createUnit('soldier', 12, 12, 0)];
    game.players[1].buildings = [game.createBuilding('constructionYard', 28, 28, 1)];
    game.players[1].units = [];
    game.matchStats = game.players.map(() => game.createEmptyPlayerStats());
    game.gameOver = false;
    game.matchResult = null;
    document.getElementById('match-summary-overlay')?.classList.add('hidden');

    game.checkVictoryConditions();

    return {
      gameOver: game.gameOver,
      title: document.getElementById('match-summary-title')?.textContent,
      reason: document.getElementById('match-summary-reason')?.textContent,
      overlayHidden: document.getElementById('match-summary-overlay')?.classList.contains('hidden'),
      result: game.matchResult,
    };
  });

  expect(outcome.gameOver).toBe(true);
  expect(outcome.overlayHidden).toBe(false);
  expect(outcome.title).toBe('Defeat');
  expect(outcome.reason).toContain('construction network is gone');
  expect(outcome.result?.playerWon).toBe(false);
  expect(outcome.result?.losingPlayerIndex).toBe(0);
});
