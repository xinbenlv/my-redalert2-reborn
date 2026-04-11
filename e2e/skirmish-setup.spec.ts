import { expect, test } from '@playwright/test';

test('skirmish setup applies selected credits, map, faction, and difficulty before match start', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#skirmish-setup-overlay')).toBeVisible();
  await expect(page.locator('#skirmish-start-button')).toContainText('Launch Skirmish');

  await page.selectOption('#setup-starting-credits', '10000');
  await page.selectOption('#setup-map', 'crossroads');
  await page.selectOption('#setup-player-faction', 'allied');
  await page.selectOption('#setup-ai-difficulty', 'hard');
  await page.selectOption('#setup-ai-build-order', 'air');
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
      aiBuildOrder: game.aiConfig?.buildOrder,
      aiBuildOrderLabel: game.players[1]?.aiBuildOrderLabel,
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
  expect(applied.aiBuildOrder).toBe('air');
  expect(applied.aiBuildOrderLabel).toBe('Air Supremacy');
  expect(applied.mapProfile).toBe('crossroads');
  expect(applied.title).toContain('CROSSROADS');
  expect(applied.briefing).toContain('HARD');
  expect(applied.briefing).toContain('AIR SUPREMACY');
});

test('skirmish setup exposes twin rivers and boots the distinct battlefield layout', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#setup-map')).toHaveValue('classic');
  await expect(page.locator('#setup-map option')).toHaveCount(3);

  await page.selectOption('#setup-map', 'twin-rivers');
  await expect(page.locator('#setup-briefing')).toContainText('TWIN RIVERS');
  await page.click('#skirmish-start-button');

  await page.waitForFunction(() => Boolean((window as any).game));

  const twinRivers = await page.evaluate(() => {
    const game = (window as any).game;
    const sample = (x: number, y: number) => game.map[y][x].type;
    return {
      mapProfile: game.mapProfile?.id,
      spawnPoints: game.mapProfile?.spawnPoints,
      title: document.getElementById('game-title')?.textContent,
      centralTile: sample(20, 20),
      leftChannel: sample(15, 15),
      rightChannel: sample(24, 15),
      centerFord: sample(20, 20),
      upperFord: sample(20, 10),
      lowerFord: sample(20, 30),
      flankOre: sample(10, 29),
      enemyOre: sample(29, 10),
    };
  });

  expect(twinRivers.mapProfile).toBe('twin-rivers');
  expect(twinRivers.spawnPoints).toEqual([
    { x: 7, y: 30 },
    { x: 30, y: 8 },
  ]);
  expect(twinRivers.title).toContain('TWIN RIVERS');
  expect(twinRivers.leftChannel).toBe('water');
  expect(twinRivers.rightChannel).toBe('water');
  expect(twinRivers.centerFord).toBe('ore');
  expect(twinRivers.upperFord).not.toBe('water');
  expect(twinRivers.lowerFord).not.toBe('water');
  expect(twinRivers.flankOre).toBe('ore');
  expect(twinRivers.enemyOre).toBe('ore');
});
