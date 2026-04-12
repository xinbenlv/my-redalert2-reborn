import { expect, test } from '@playwright/test';

test('battle bunker can garrison infantry, fire from cover, and eject survivors', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(1000);

  const buildingLabels = await page.locator('.build-item .item-label').allTextContents();
  expect(buildingLabels).toContain('Battle Bunker');

  const garrisonState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];
    game.players.slice(2).forEach((other: any) => {
      other.units = [];
      other.buildings = [];
    });

    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];
    enemy.units = [];
    enemy.buildings = [game.createBuilding('constructionYard', 28, 28, 1)];
    game.projectiles = [];
    game.effects = [];

    const bunker = game.createBuilding('battleBunker', 14, 14, 0);
    const soldier = game.createUnit('soldier', 12.8, 14.1, 0);
    const flakTrooper = game.createUnit('flakTrooper', 12.8, 15.2, 0);
    const enemyTank = game.createUnit('tank', 18.3, 14.2, 1);
    enemyTank.damage = 0;
    enemyTank.range = 0;
    enemyTank.fireRate = 999999;
    const enemyHarrier = game.createUnit('harrier', 18.6, 15.1, 1);
    enemyHarrier.damage = 0;
    enemyHarrier.range = 0;
    enemyHarrier.fireRate = 999999;

    player.buildings.push(bunker);
    player.units.push(soldier, flakTrooper);
    enemy.units.push(enemyTank, enemyHarrier);

    game.orderUnitToGarrison(soldier, bunker);
    game.orderUnitToGarrison(flakTrooper, bunker);

    for (let i = 0; i < 140; i += 1) {
      game.update(50);
    }

    game._syncRenderer(16);
    game.selected = [bunker];
    game.updateSelectionInfo();

    const selectionText = document.getElementById('selection-info')?.textContent || '';
    const visibleBeforeEject = !!game.renderer3d.unitMeshes.get(soldier)?.visible;
    const soldierStateBeforeEject = soldier.state;
    const flakStateBeforeEject = flakTrooper.state;
    const tankHpAfter = enemyTank.hp;
    const harrierHpAfter = enemyHarrier.hp;
    const bunkerDamage = bunker.damage;
    const bunkerCanAttackAir = bunker.canAttackAir;

    game.ejectGarrison(bunker, 17, 16);
    for (let i = 0; i < 20; i += 1) {
      game.update(50);
    }
    game._syncRenderer(16);

    return {
      garrisonCount: bunker.garrisonedUnits.length,
      bunkerDamage,
      bunkerCanAttackAir,
      soldierStateBeforeEject,
      flakStateBeforeEject,
      visibleBeforeEject,
      selectionText,
      tankHpAfter,
      harrierHpAfter,
      soldierStateAfterEject: soldier.state,
      flakStateAfterEject: flakTrooper.state,
      soldierVisibleAfterEject: !!game.renderer3d.unitMeshes.get(soldier)?.visible,
      flakVisibleAfterEject: !!game.renderer3d.unitMeshes.get(flakTrooper)?.visible,
      soldierDistanceAfterEject: Math.hypot(soldier.x - 17, soldier.y - 16),
      flakDistanceAfterEject: Math.hypot(flakTrooper.x - 17, flakTrooper.y - 16),
    };
  });

  expect(garrisonState.garrisonCount).toBe(0);
  expect(garrisonState.bunkerDamage).toBeGreaterThan(0);
  expect(garrisonState.bunkerCanAttackAir).toBe(true);
  expect(garrisonState.soldierStateBeforeEject).toBe('loaded');
  expect(garrisonState.flakStateBeforeEject).toBe('loaded');
  expect(garrisonState.selectionText).toContain('GARRISON 2/3');
  expect(garrisonState.tankHpAfter).toBeLessThan(180);
  expect(garrisonState.harrierHpAfter).toBeLessThan(140);
  expect(['idle', 'attacking', 'engaging']).toContain(garrisonState.soldierStateAfterEject);
  expect(['idle', 'attacking', 'engaging']).toContain(garrisonState.flakStateAfterEject);
  expect(garrisonState.soldierVisibleAfterEject).toBe(true);
  expect(garrisonState.flakVisibleAfterEject).toBe(true);
  expect(garrisonState.soldierDistanceAfterEject).toBeLessThanOrEqual(3);
  expect(garrisonState.flakDistanceAfterEject).toBeLessThanOrEqual(3);
});

test('battle bunker preserves occupant armor multipliers instead of flattening every garrison into generic damage', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const profileState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];
    game.players.slice(2).forEach((other: any) => {
      other.units = [];
      other.buildings = [];
    });

    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];
    enemy.units = [];
    enemy.buildings = [game.createBuilding('constructionYard', 28, 28, 1)];
    game.projectiles = [];
    game.effects = [];

    const flakBunker = game.createBuilding('battleBunker', 14, 14, 0);
    const rocketBunker = game.createBuilding('battleBunker', 19, 14, 0);
    const flakTrooper = game.createUnit('flakTrooper', 12.8, 14.1, 0);
    const rocketInfantry = game.createUnit('rocketInfantry', 17.8, 14.1, 0);
    const enemyTank = game.createUnit('tank', 16.9, 14.2, 1);
    enemyTank.damage = 0;
    enemyTank.range = 0;
    enemyTank.fireRate = 999999;
    const enemySoldier = game.createUnit('soldier', 22.6, 14.2, 1);
    enemySoldier.damage = 0;
    enemySoldier.range = 0;
    enemySoldier.fireRate = 999999;
    const enemyHarrier = game.createUnit('harrier', 15.7, 15.2, 1);
    enemyHarrier.damage = 0;
    enemyHarrier.range = 0;
    enemyHarrier.fireRate = 999999;

    player.buildings.push(flakBunker, rocketBunker);
    player.units.push(flakTrooper, rocketInfantry);
    enemy.units.push(enemyTank, enemySoldier, enemyHarrier);

    game.orderUnitToGarrison(flakTrooper, flakBunker);
    game.orderUnitToGarrison(rocketInfantry, rocketBunker);
    for (let i = 0; i < 140; i += 1) game.update(50);

    return {
      flakDamageProfile: flakBunker.damageProfile,
      flakCanAttackAir: flakBunker.canAttackAir,
      rocketDamageProfile: rocketBunker.damageProfile,
      enemyTankHp: enemyTank.hp,
      enemySoldierHp: enemySoldier.hp,
      enemyHarrierHp: enemyHarrier.hp,
    };
  });

  expect(profileState.flakCanAttackAir).toBe(true);
  expect(profileState.flakDamageProfile?.air).toBeGreaterThan(profileState.flakDamageProfile?.heavy ?? 0);
  expect(profileState.enemyHarrierHp).toBeLessThan(140);
  expect(profileState.rocketDamageProfile?.heavy).toBeGreaterThan(profileState.rocketDamageProfile?.infantry ?? 0);
  expect(profileState.enemySoldierHp).toBeGreaterThan(profileState.enemyTankHp);
});

test('battle bunker with only non-combat occupants stays a passive shelter instead of inventing fake firepower', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const passiveState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];
    game.players.slice(2).forEach((other: any) => {
      other.units = [];
      other.buildings = [];
    });

    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];
    enemy.units = [];
    enemy.buildings = [game.createBuilding('constructionYard', 28, 28, 1)];
    game.projectiles = [];
    game.effects = [];

    const bunker = game.createBuilding('battleBunker', 14, 14, 0);
    const passenger = game.createUnit('soldier', 12.8, 14.1, 0);
    passenger.damage = 0;
    passenger.fireRate = 0;
    passenger.range = 0;
    const enemyTank = game.createUnit('tank', 18.1, 14.2, 1);
    enemyTank.damage = 0;
    enemyTank.range = 0;
    enemyTank.fireRate = 999999;

    player.buildings.push(bunker);
    player.units.push(passenger);
    enemy.units.push(enemyTank);

    game.orderUnitToGarrison(passenger, bunker);
    for (let i = 0; i < 140; i += 1) game.update(50);

    return {
      garrisonCount: bunker.garrisonedUnits.length,
      bunkerDamage: bunker.damage,
      bunkerRange: bunker.range,
      bunkerCanAttackGround: bunker.canAttackGround,
      bunkerDamageProfile: bunker.damageProfile,
      enemyTankHp: enemyTank.hp,
    };
  });

  expect(passiveState.garrisonCount).toBe(1);
  expect(passiveState.bunkerDamage).toBe(0);
  expect(passiveState.bunkerRange).toBe(0);
  expect(passiveState.bunkerCanAttackGround).toBe(false);
  expect(passiveState.bunkerDamageProfile).toBeNull();
  expect(passiveState.enemyTankHp).toBe(180);
});

test('battle bunker keeps firing during low power because it is infantry-driven, not a powered turret', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lowPowerBunkerState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];
    game.players.slice(2).forEach((other: any) => {
      other.units = [];
      other.buildings = [];
    });

    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];
    enemy.units = [];
    enemy.buildings = [game.createBuilding('constructionYard', 28, 28, 1)];
    game.projectiles = [];
    game.effects = [];

    const bunker = game.createBuilding('battleBunker', 14, 14, 0);
    const soldier = game.createUnit('soldier', 12.8, 14.1, 0);
    const flakTrooper = game.createUnit('flakTrooper', 12.8, 15.2, 0);
    const tank = game.createUnit('tank', 18.3, 14.2, 1);
    tank.damage = 0;
    tank.range = 0;
    tank.fireRate = 999999;

    player.buildings.push(bunker, game.createBuilding('barracks', 10, 10, 0), game.createBuilding('powerPlant', 9, 14, 0));
    player.units.push(soldier, flakTrooper);
    enemy.units.push(tank);

    game.orderUnitToGarrison(soldier, bunker);
    game.orderUnitToGarrison(flakTrooper, bunker);
    for (let i = 0; i < 80; i += 1) game.update(50);

    const powerPlant = player.buildings.find((building: any) => building.type === 'powerPlant');
    powerPlant.hp = 0;
    for (let i = 0; i < 80; i += 1) game.update(50);

    game.selected = [bunker];
    game.updateSelectionInfo();

    return {
      lowPower: (window as any).POWER_SYSTEM.isLowPower(player),
      tankHp: tank.hp,
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(lowPowerBunkerState.lowPower).toBe(true);
  expect(lowPowerBunkerState.tankHp).toBeLessThan(180);
  expect(lowPowerBunkerState.selectionText).not.toContain('Weapons offline');
});
