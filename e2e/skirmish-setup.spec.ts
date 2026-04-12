import { expect, test } from '@playwright/test';

test('skirmish setup applies selected credits, map, faction, and difficulty before match start', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#skirmish-setup-overlay')).toBeVisible();
  await expect(page.locator('#skirmish-start-button')).toContainText('Launch Skirmish');

  await page.selectOption('#setup-starting-credits', '10000');
  await page.selectOption('#setup-map', 'crossroads');
  await page.selectOption('#setup-player-faction', 'allied');
  await page.selectOption('#setup-player-color', 'green');
  await page.selectOption('#setup-player-team', '2');
  await page.selectOption('#setup-ai-difficulty', 'hard');
  await page.selectOption('#setup-ai-players', '3');
  await page.selectOption('#setup-ai-build-order', 'air');
  await page.selectOption('#setup-ai-team-1', '2');
  await page.selectOption('#setup-ai-team-2', '3');
  await page.selectOption('#setup-ai-team-3', '3');
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
      aiPlayers: game.matchConfig.aiPlayers,
      playerCount: game.players.filter((entry: any) => !entry.isNeutral).length,
      playerFaction: game.players[0].faction,
      playerColor: game.matchConfig.playerColor,
      playerColorValue: game.players[0].color,
      playerTeam: game.matchConfig.playerTeam,
      aiTeams: game.matchConfig.aiTeams,
      aiDifficulty: game.aiConfig?.difficulty,
      aiBuildOrder: game.aiConfig?.buildOrder,
      aiBuildOrderLabel: game.players[1]?.aiBuildOrderLabel,
      aiColors: game.players.filter((entry: any) => entry.isAI).map((entry: any) => entry.color),
      playerAllies: game.getAlliedAIPlayerIndices(0),
      playerEnemies: game.getHostilePlayerIndices(0),
      spawnPoints: game.mapProfile?.spawnPoints?.slice(0, 4),
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
  expect(applied.aiPlayers).toBe(3);
  expect(applied.playerCount).toBe(4);
  expect(applied.playerFaction).toBe('allied');
  expect(applied.playerColor).toBe('green');
  expect(applied.playerColorValue).toBe('#2dbd63');
  expect(applied.playerTeam).toBe(2);
  expect(applied.aiTeams).toEqual([2, 3, 3]);
  expect(applied.aiDifficulty).toBe('hard');
  expect(applied.aiBuildOrder).toBe('air');
  expect(applied.aiBuildOrderLabel).toBe('Air Supremacy');
  expect(new Set(applied.aiColors).size).toBe(3);
  expect(applied.aiColors).not.toContain(applied.playerColorValue);
  expect(applied.playerAllies).toEqual([1]);
  expect(applied.playerEnemies).toEqual([2, 3]);
  expect(applied.spawnPoints).toHaveLength(4);
  expect(applied.gameSpeed).toBe('fast');
  expect(applied.gameSpeedLabel).toBe('Fast Strike');
  expect(applied.gameSpeedMultiplier).toBeGreaterThan(1);
  expect(applied.mapProfile).toBe('crossroads');
  expect(applied.title).toContain('CROSSROADS');
  expect(applied.briefing).toContain('ALLIED / EMERALD STRIKE');
  expect(applied.briefing).toContain('3 AI');
  expect(applied.briefing).toContain('HARD');
  expect(applied.briefing).toContain('AIR SUPREMACY');
  expect(applied.briefing).toContain('FAST STRIKE');
  expect(applied.briefing).toContain('P:TEAM 2');
  expect(applied.briefing).toContain('AI1:TEAM 2');
  expect(applied.briefing).toContain('AI2:TEAM 3');
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

test('skirmish setup normalizes unknown player colors back to default red without duplicating AI colors', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).GameState));

  const result = await page.evaluate(() => {
    const GameState = (window as any).GameState;
    const game = new GameState({
      map: 'classic',
      startingCredits: 6500,
      playerFaction: 'soviet',
      playerColor: 'unknown-color',
      aiDifficulty: 'medium',
      aiPlayers: 3,
      aiBuildOrder: 'balanced',
      gameSpeed: 'normal',
    });

    return {
      normalizedColor: game.matchConfig.playerColor,
      playerColorValue: game.players[0].color,
      aiColors: game.players.filter((entry: any) => entry.isAI).map((entry: any) => entry.color),
    };
  });

  expect(result.normalizedColor).toBe('red');
  expect(result.playerColorValue).toBe('#cc2222');
  expect(new Set(result.aiColors).size).toBe(3);
  expect(result.aiColors).not.toContain(result.playerColorValue);
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
  expect(twinRivers.spawnPoints.slice(0, 2)).toEqual([
    { x: 7, y: 30 },
    { x: 30, y: 8 },
  ]);
  expect(twinRivers.spawnPoints).toHaveLength(4);
  expect(twinRivers.title).toContain('TWIN RIVERS');
  expect(twinRivers.leftChannel).toBe('water');
  expect(twinRivers.rightChannel).toBe('water');
  expect(['ore', 'gems']).toContain(twinRivers.centerFord);
  expect(twinRivers.upperFord).not.toBe('water');
  expect(twinRivers.lowerFord).not.toBe('water');
  expect(twinRivers.flankOre).toBe('ore');
  expect(twinRivers.enemyOre).toBe('ore');
});


test('team setup makes allied AI non-hostile and victory waits only on hostile teams', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).GameState));

  const outcome = await page.evaluate(() => {
    const GameState = (window as any).GameState;
    const game = new GameState({
      map: 'classic',
      startingCredits: 6500,
      playerFaction: 'soviet',
      playerTeam: 1,
      aiDifficulty: 'easy',
      aiPlayers: 3,
      aiTeams: [1, 2, 2],
      aiBuildOrder: 'balanced',
      gameSpeed: 'normal',
    });

    const aiOwners = game.players
      .map((player: any, index: number) => ({ player, index }))
      .filter(({ player, index }: any) => index !== game.currentPlayer && player.isAI)
      .map(({ index }: any) => index);
    const allyOwner = aiOwners.find((owner: number) => game.arePlayersAllied(0, owner));
    const hostileOwners = aiOwners.filter((owner: number) => game.arePlayersHostile(0, owner));

    const alliedTank = game.createUnit('tank', 8, 9, allyOwner);
    alliedTank.state = 'idle';
    game.players[allyOwner].units.push(alliedTank);

    const hostileTank = game.createUnit('tank', 13, 9, hostileOwners[0]);
    hostileTank.state = 'idle';
    game.players[hostileOwners[0]].units.push(hostileTank);

    const playerTank = game.createUnit('tank', 9, 9, 0);
    playerTank.state = 'idle';
    game.players[0].units.push(playerTank);

    const targetSnapshot = {
      allied: game.arePlayersAllied(0, allyOwner),
      hostile: hostileOwners.every((owner: number) => game.arePlayersHostile(0, owner)),
      nearestEnemyOwner: game._findNearestEnemy(playerTank, 0)?.owner ?? null,
      hostileOwners: game.getHostilePlayerIndices(0),
      alliedOwners: game.getAlliedAIPlayerIndices(0),
    };

    const wipeBase = (owner: number) => {
      const player = game.players[owner];
      for (const building of player.buildings) building.hp = 0;
      for (const unit of player.units) {
        unit.hp = 0;
        unit.state = 'dead';
      }
    };

    wipeBase(hostileOwners[0]);
    game.checkVictoryConditions();
    const beforeFinalKill = {
      gameOver: game.gameOver,
      livingHostiles: game.getHostilePlayerIndices(0).length,
      alliedStillAlive: game.hasLivingBase(game.players[allyOwner]),
    };

    wipeBase(hostileOwners[1]);
    game.checkVictoryConditions();
    return {
      targetSnapshot,
      beforeFinalKill,
      afterFinalKill: {
        gameOver: game.gameOver,
        playerWon: game.matchResult?.playerWon,
        summary: game.matchResult?.summaryText || null,
        livingHostiles: game.getHostilePlayerIndices(0).length,
        alliedStillAlive: game.hasLivingBase(game.players[allyOwner]),
      },
    };
  });

  expect(outcome.targetSnapshot.allied).toBeTruthy();
  expect(outcome.targetSnapshot.hostile).toBeTruthy();
  expect(outcome.targetSnapshot.nearestEnemyOwner).toBe(outcome.targetSnapshot.hostileOwners[0]);
  expect(outcome.targetSnapshot.alliedOwners).toEqual([1]);
  expect(outcome.targetSnapshot.hostileOwners).toEqual([2, 3]);
  expect(outcome.beforeFinalKill.gameOver).toBeFalsy();
  expect(outcome.beforeFinalKill.livingHostiles).toBe(1);
  expect(outcome.beforeFinalKill.alliedStillAlive).toBeTruthy();
  expect(outcome.afterFinalKill.gameOver).toBeTruthy();
  expect(outcome.afterFinalKill.playerWon).toBeTruthy();
  expect(outcome.afterFinalKill.livingHostiles).toBe(0);
  expect(outcome.afterFinalKill.alliedStillAlive).toBeTruthy();
  expect(outcome.afterFinalKill.summary).toContain('Enemy');
});
