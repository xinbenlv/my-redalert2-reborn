import { expect, test } from '@playwright/test';

test('skirmish setup applies selected credits, map, faction, and difficulty before match start', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#skirmish-setup-overlay')).toBeVisible();
  await expect(page.locator('#skirmish-start-button')).toContainText('Launch Skirmish');

  await page.selectOption('#setup-starting-credits', '10000');
  await page.selectOption('#setup-map', 'crossroads');
  await page.selectOption('#setup-player-faction', 'allied');
  await page.selectOption('#setup-ai-difficulty', 'hard');
  await page.click('#skirmish-start-button');

  await page.waitForFunction(() => Boolean((window as any).game));
  await expect(page.locator('#skirmish-setup-overlay')).toBeHidden();

  const applied = await page.evaluate(() => {
    const game = (window as any).game;
    return {
      config: game.matchConfig,
      playerMoney: game.players[0].money,
      aiMoney: game.players[1].money,
      playerFaction: game.players[0].faction,
      aiDifficulty: game.aiConfig?.difficulty,
      mapProfile: game.mapProfile?.id,
      title: document.getElementById('game-title')?.textContent,
      briefing: document.getElementById('setup-briefing')?.textContent,
    };
  });

  expect(applied.config.startingCredits).toBe(10000);
  expect(applied.playerMoney).toBe(10000);
  expect(applied.aiMoney).toBe(10000);
  expect(applied.playerFaction).toBe('allied');
  expect(applied.aiDifficulty).toBe('hard');
  expect(applied.mapProfile).toBe('crossroads');
  expect(applied.title).toContain('CROSSROADS');
  expect(applied.briefing).toContain('HARD');
});
