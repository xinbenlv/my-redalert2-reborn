import { expect, test } from '@playwright/test';

test('pillbox and sentry gun appear in build menu, fire on enemies, and go offline on low power', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(1000);

  const buildingLabels = await page.locator('.build-item .item-label').allTextContents();
  expect(buildingLabels).toEqual(expect.arrayContaining(['Pillbox', 'Sentry Gun']));

  const combatState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];
    game.players.slice(2).forEach((other: any) => {
      other.units = [];
      other.buildings = [];
    });

    player.units = [];
    enemy.units = [];
    enemy.buildings = [game.createBuilding('constructionYard', 28, 28, 1)];
    game.projectiles = [];
    game.effects = [];

    player.buildings = [
      game.createBuilding('constructionYard', 6, 6, 0),
      game.createBuilding('powerPlant', 9, 10, 0),
      game.createBuilding('powerPlant', 9, 14, 0),
    ];
    const pillbox = game.createBuilding('pillbox', 12, 12, 0);
    const sentryGun = game.createBuilding('sentryGun', 14, 12, 0);
    player.buildings.push(pillbox, sentryGun);

    const infantry = game.createUnit('soldier', 12.5, 15.2, 1);
    const tank = game.createUnit('tank', 14.5, 16.2, 1);
    enemy.units.push(infantry, tank);

    let ticks = 0;
    while (ticks < 160 && (infantry.hp === infantry.maxHp || tank.hp === tank.maxHp)) {
      game.update(50);
      ticks += 1;
    }

    game.selected = [sentryGun];
    game.updateSelectionInfo();

    return {
      ticks,
      infantryHp: infantry.hp,
      tankHp: tank.hp,
      projectileCount: game.projectiles.length,
      effectCount: game.effects.length,
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(combatState.ticks).toBeGreaterThan(0);
  expect(combatState.infantryHp).toBeLessThan(50);
  expect(combatState.tankHp).toBeLessThan(180);
  expect(combatState.projectileCount + combatState.effectCount).toBeGreaterThan(0);
  expect(combatState.selectionText).toContain('DMG 30');

  const lowPowerState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];
    game.players.slice(2).forEach((other: any) => {
      other.units = [];
      other.buildings = [];
    });
    const sentryGun = player.buildings.find((building: any) => building.type === 'sentryGun');
    const powerPlants = player.buildings.filter((building: any) => building.type === 'powerPlant');

    player.units = [];
    enemy.units = [];
    game.projectiles = [];
    game.effects = [];

    powerPlants.forEach((building: any) => {
      building.hp = 0;
    });

    const target = game.createUnit('tank', sentryGun.tx + 0.5, sentryGun.ty + 3.8, 1);
    target.damage = 0;
    target.range = 0;
    target.fireRate = 999999;
    enemy.units.push(target);

    for (let i = 0; i < 60; i += 1) {
      game.update(50);
    }

    game.selected = [sentryGun];
    game.updateSelectionInfo();

    return {
      lowPower: (window as any).POWER_SYSTEM.isLowPower(player),
      targetHp: target.hp,
      selectionText: document.getElementById('selection-info')?.textContent || '',
      powerText: document.getElementById('power-display')?.textContent || '',
      projectileCount: game.projectiles.length,
    };
  });

  expect(lowPowerState.lowPower).toBe(true);
  expect(lowPowerState.targetHp).toBe(180);
  expect(lowPowerState.selectionText).toContain('Weapons offline');
  expect(lowPowerState.powerText).toContain('LOW POWER');
  expect(lowPowerState.projectileCount).toBe(0);
});