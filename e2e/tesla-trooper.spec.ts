import { expect, test } from '@playwright/test';

test('battle lab unlocks tesla troopers as high-tech anti-armor infantry', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(500);

  await page.click('.build-tab[data-tab="units"]');

  const lockedState = await page.evaluate(() => {
    const teslaCard = document.querySelector('.build-item[data-type="teslaTrooper"]') as HTMLElement | null;
    return {
      exists: Boolean(teslaCard),
      className: teslaCard?.className || '',
      statusText: teslaCard?.querySelector('.item-status')?.textContent || '',
    };
  });

  expect(lockedState.exists).toBe(true);
  expect(lockedState.className).toContain('locked');
  expect(lockedState.statusText).toContain('Next:');

  const unlockedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const battleLab = game.createBuilding('battleLab', 18, 10, 0);
    player.buildings.push(battleLab);
    player.money += 10000;
    game.updateUI();

    const teslaCard = document.querySelector('.build-item[data-type="teslaTrooper"]') as HTMLElement | null;
    const barracks = player.buildings.find((building: any) => building.type === 'barracks');
    barracks.training = 'teslaTrooper';
    barracks.trainProgress = 0.995;
    game.update(200);

    const spawned = player.units.find((unit: any) => unit.type === 'teslaTrooper');
    const tank = game.createUnit('tank', 12, 10, 1);
    const soldier = game.createUnit('soldier', 12, 10, 1);

    return {
      className: teslaCard?.className || '',
      text: teslaCard?.textContent || '',
      spawned: spawned ? {
        hp: spawned.hp,
        damage: spawned.damage,
        range: spawned.range,
        weaponType: spawned.weaponType,
        role: spawned.role,
      } : null,
      versusHeavy: spawned ? game.getDamageAgainstTarget(spawned.damage, spawned.damageProfile, tank) : 0,
      versusInfantry: spawned ? game.getDamageAgainstTarget(spawned.damage, spawned.damageProfile, soldier) : 0,
    };
  });

  expect(unlockedState.className).not.toContain('locked');
  expect(unlockedState.text).toContain('Tesla Trooper');
  expect(unlockedState.spawned?.weaponType).toBe('tesla');
  expect(unlockedState.spawned?.role).toBe('shock infantry');
  expect(unlockedState.spawned?.range).toBeGreaterThanOrEqual(5);
  expect(unlockedState.versusHeavy).toBeGreaterThan(unlockedState.versusInfantry);
  expect(unlockedState.versusHeavy).toBeGreaterThanOrEqual(60);
});

test('AI trains tesla troopers from battle lab tech when enemy fields heavy armor', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).GameState));

  const result = await page.evaluate(() => {
    const GameState = (window as any).GameState;
    const game = new GameState({
      map: 'classic',
      startingCredits: 10000,
      playerFaction: 'allied',
      aiDifficulty: 'hard',
      aiPlayers: 1,
      aiBuildOrder: 'balanced',
      gameSpeed: 'normal',
    });

    const ai = game.players[1];
    const enemy = game.players[0];
    ai.money = 1600;
    ai.units = [];
    ai.buildings = [];
    enemy.units = [];
    enemy.buildings = [];

    game.aiConfig.desiredPowerPlants = 0;
    game.aiConfig.desiredPowerPlantsBonus = 0;
    game.aiConfig.desiredPillboxes = 0;
    game.aiConfig.desiredPillboxesBonus = 0;
    game.aiConfig.desiredSentryGuns = 0;
    game.aiConfig.desiredSentryGunsBonus = 0;
    game.aiConfig.desiredPatriotBonus = 0;
    game.aiConfig.airfieldReserve = 99999;
    game.aiConfig.battleLabReserve = 99999;

    const conyard = game.createBuilding('constructionYard', 24, 24, 1);
    const power = game.createBuilding('powerPlant', 21, 24, 1);
    const refinery = game.createBuilding('refinery', 24, 21, 1);
    const barracks = game.createBuilding('barracks', 27, 24, 1);
    const radar = game.createBuilding('radarDome', 21, 21, 1);
    const warFactory = game.createBuilding('warFactory', 27, 21, 1);
    const battleLab = game.createBuilding('battleLab', 30, 24, 1);
    const airfield = game.createBuilding('airfield', 30, 21, 1);
    const advancedPower = game.createBuilding('advancedPowerPlant', 18, 24, 1);
    const pillboxA = game.createBuilding('pillbox', 23, 28, 1);
    const pillboxB = game.createBuilding('pillbox', 25, 28, 1);
    const sentryA = game.createBuilding('sentryGun', 28, 28, 1);
    const sentryB = game.createBuilding('sentryGun', 30, 28, 1);
    [conyard, power, refinery, barracks, radar, warFactory, battleLab, airfield, advancedPower, pillboxA, pillboxB, sentryA, sentryB].forEach((building: any) => {
      building.built = true;
      building.buildProgress = 1;
      ai.buildings.push(building);
    });

    ai.units.push(game.createUnit('harvester', 26, 28, 1));

    enemy.units.push(game.createUnit('tank', 8, 8, 0));
    enemy.units.push(game.createUnit('apocalypseTank', 9, 8, 0));
    enemy.units.push(game.createUnit('tank', 8, 9, 0));
    enemy.buildings.push(game.createBuilding('constructionYard', 6, 6, 0));
    enemy.buildings[0].built = true;

    game.aiState[1].timer = game.aiState[1].decisionInterval;
    game.updateAI(5000);

    return {
      training: barracks.training,
      queue: [...barracks.trainQueue],
      money: ai.money,
    };
  });

  expect([result.training, ...result.queue]).toContain('teslaTrooper');
  expect(result.money).toBeLessThan(1600);
});
