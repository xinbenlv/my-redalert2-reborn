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
  await page.selectOption('#setup-game-speed', 'fast');
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
      gameSpeed: game.matchConfig.gameSpeed,
      gameSpeedLabel: game.gameSpeedProfile?.label,
      gameSpeedMultiplier: game.gameSpeedMultiplier,
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
  expect(applied.gameSpeed).toBe('fast');
  expect(applied.gameSpeedLabel).toBe('Fast Strike');
  expect(applied.gameSpeedMultiplier).toBeGreaterThan(1);
  expect(applied.mapProfile).toBe('crossroads');
  expect(applied.title).toContain('CROSSROADS');
  expect(applied.briefing).toContain('HARD');
  expect(applied.briefing).toContain('AIR SUPREMACY');
  expect(applied.briefing).toContain('FAST STRIKE');
});

test('game speed selection changes simulation tempo for fresh skirmish instances', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).GameState));

  const result = await page.evaluate(() => {
    const GameState = (window as any).GameState;
    const configs = {
      slow: { map: 'classic', startingCredits: 6500, playerFaction: 'soviet', aiDifficulty: 'medium', aiBuildOrder: 'balanced', gameSpeed: 'slow' },
      fast: { map: 'classic', startingCredits: 6500, playerFaction: 'soviet', aiDifficulty: 'medium', aiBuildOrder: 'balanced', gameSpeed: 'fast' },
    };
    const sampleDistance = (config: any) => {
      const game = new GameState(config);
      const unit = game.players[0].units.find((entry: any) => entry.type === 'mcv');
      const startX = unit.x;
      unit.autoDeployAt = null;
      game.issueMoveOrder(unit, unit.x + 6, unit.y);
      for (let i = 0; i < 20; i += 1) game.update(50);
      return {
        elapsedMs: game.elapsedMs,
        distance: unit.x - startX,
        speed: game.matchConfig.gameSpeed,
        label: game.gameSpeedProfile?.label,
        multiplier: game.gameSpeedMultiplier,
      };
    };
    return {
      slow: sampleDistance(configs.slow),
      fast: sampleDistance(configs.fast),
    };
  });

  expect(result.slow.speed).toBe('slow');
  expect(result.fast.speed).toBe('fast');
  expect(result.slow.label).toBe('Slow Grind');
  expect(result.fast.label).toBe('Fast Strike');
  expect(result.slow.multiplier).toBeLessThan(1);
  expect(result.fast.multiplier).toBeGreaterThan(1);
  expect(result.fast.elapsedMs).toBeGreaterThan(result.slow.elapsedMs);
  expect(result.fast.distance).toBeGreaterThan(result.slow.distance * 1.4);
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
