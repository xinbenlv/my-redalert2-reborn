import { expect, test } from '@playwright/test';

test('patriot battery unlocks from radar tech, swats aircraft, ignores ground targets, and AI builds it under air pressure', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const patriotCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Patriot Battery')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      lockedText: patriotCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: patriotCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('Patriot Battery');
  expect(lockedState.lockedClass).toContain('locked');
  expect(lockedState.lockedText).toContain('Radar Dome');

  const combatState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];

    player.buildings = [
      game.createBuilding('constructionYard', 8, 8, 0),
      game.createBuilding('powerPlant', 12, 8, 0),
      game.createBuilding('powerPlant', 16, 8, 0),
      game.createBuilding('barracks', 10, 12, 0),
      game.createBuilding('radarDome', 11, 10, 0),
    ];
    player.units = [];
    player.money += 10000;

    const patriot = game.createBuilding('patriotBattery', 14, 12, 0);
    player.buildings.push(patriot);
    enemy.buildings = [];
    enemy.units = [];
    game.projectiles = [];
    game.effects = [];

    const harrier = game.createUnit('harrier', 14.5, 17.4, 1);
    harrier.attackTarget = null;
    const tank = game.createUnit('tank', 17.8, 12.6, 1);
    tank.damage = 0;
    tank.range = 0;
    tank.fireRate = 999999;
    enemy.units.push(harrier, tank);

    let ticks = 0;
    while (ticks < 420 && harrier.hp === harrier.maxHp) {
      game.update(50);
      ticks += 1;
    }

    game.selected = [patriot];
    game.updateSelectionInfo();

    return {
      ticks,
      harrierHp: harrier.hp,
      harrierMaxHp: harrier.maxHp,
      tankHp: tank.hp,
      projectileCount: game.projectiles.length,
      targeting: {
        patriotVsAir: game.canEntityTarget(patriot, harrier),
        patriotVsTank: game.canEntityTarget(patriot, tank),
      },
      overlayKinds: game.getSelectedEngagementOverlays().map((overlay: any) => overlay.kind),
      selectionText: document.getElementById('selection-info')?.textContent || '',
      coverageScore: game.getAntiAirCoverageScore(player),
      lowPower: (window as any).POWER_SYSTEM.isLowPower(player),
    };
  });

  expect(combatState.ticks).toBeGreaterThan(0);
  expect(combatState.lowPower).toBe(false);
  expect(combatState.targeting.patriotVsAir).toBe(true);
  expect(combatState.targeting.patriotVsTank).toBe(false);
  expect(combatState.tankHp).toBe(180);
  expect(combatState.projectileCount).toBeGreaterThan(0);
  expect(combatState.overlayKinds).toContain('anti-air-lock');
  expect(combatState.selectionText).toContain('AA LOCK: Harrier');
  expect(combatState.coverageScore).toBeGreaterThanOrEqual(3);

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    const human = game.players[0];

    const enemyAirfield = game.createBuilding('airfield', 18, 8, 0);
    enemyAirfield.training = 'harrier';
    enemyAirfield.trainQueue = ['harrier'];
    enemyAirfield.trainProgress = 0.35;
    human.buildings = [
      game.createBuilding('constructionYard', 8, 8, 0),
      game.createBuilding('powerPlant', 12, 8, 0),
      game.createBuilding('powerPlant', 16, 8, 0),
      game.createBuilding('refinery', 14, 8, 0),
      game.createBuilding('warFactory', 18, 12, 0),
      game.createBuilding('radarDome', 20, 12, 0),
      enemyAirfield,
    ];
    human.units = [game.createUnit('harvester', 16, 12, 0)];

    ai.money = 1600;
    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('powerPlant', 20, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('pillbox', 31, 22, 1),
      game.createBuilding('sentryGun', 34, 22, 1),
    ];

    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    return {
      pressure: game.getAirThreatPressure(human),
      patriotCount: ai.buildings.filter((building: any) => building.type === 'patriotBattery').length,
      queuedTypes: ai.buildings.filter((building: any) => !building.built).map((building: any) => building.type),
      coverageScore: game.getAntiAirCoverageScore(ai),
    };
  });

  expect(aiState.pressure).toBeGreaterThanOrEqual(3);
  expect(aiState.patriotCount).toBeGreaterThanOrEqual(1);
  expect(aiState.queuedTypes).toContain('patriotBattery');
  expect(aiState.coverageScore).toBeGreaterThanOrEqual(3);
});