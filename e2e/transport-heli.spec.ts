import { expect, test } from '@playwright/test';

test('airfield unlocks transport helicopters and they can airlift infantry', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const heliCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Transport Helicopter')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      lockedText: heliCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: heliCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('Transport Helicopter');
  expect(lockedState.lockedClass).toContain('locked');
  expect(lockedState.lockedText).toContain('Airfield');

  const airliftState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const warFactory = game.createBuilding('warFactory', 14, 10, 0);
    const radarDome = game.createBuilding('radarDome', 11, 10, 0);
    const airfield = game.createBuilding('airfield', 17, 10, 0);
    player.buildings.push(warFactory, radarDome, airfield);
    player.money += 10000;
    game.updateUI();

    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();
    const heliCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Transport Helicopter')
    ) as HTMLElement | undefined;

    airfield.training = 'transportHeli';
    airfield.trainProgress = 0.99;
    game.update(300);

    const heli = player.units.find((unit: any) => unit.type === 'transportHeli');
    const soldier = game.createUnit('soldier', 18, 16, 0);
    const engineer = game.createUnit('engineer', 19, 16, 0);
    player.units.push(soldier, engineer);
    game._syncRenderer?.();

    game.selected = [heli];
    game.updateSelectionInfo();
    const pickup = game.renderer3d.tileToScreen(soldier.x, soldier.y);
    game.onRightClick({ clientX: pickup.x, clientY: pickup.y });
    for (let i = 0; i < 60; i += 1) game.update(100);
    game._syncRenderer?.();

    game.selected = [heli];
    game.updateSelectionInfo();
    const boardedPassengerTypes = heli?.passengers.map((unit: any) => unit.type) || [];
    const boardedSelectionText = (document.getElementById('selection-info') as HTMLElement)?.innerText || '';

    const unloadPoint = { x: 25, y: 14 };
    const drop = game.renderer3d.tileToScreen(unloadPoint.x, unloadPoint.y);
    game.onRightClick({ clientX: drop.x, clientY: drop.y });
    for (let i = 0; i < 80; i += 1) game.update(100);
    game._syncRenderer?.();

    game.selected = [heli];
    game.updateSelectionInfo();
    const unloadSelectionText = (document.getElementById('selection-info') as HTMLElement)?.innerText || '';

    const enemyTank = game.createUnit('tank', 28, 14, 1);
    game.players[1].units.push(enemyTank);

    return {
      heliCardClass: heliCard?.className || '',
      spawned: heli
        ? {
            hp: heli.hp,
            armorType: heli.armorType,
            role: heli.role,
            altitude: heli.altitude,
            passengerCapacity: heli.passengerCapacity,
          }
        : null,
      boardedPassengerTypes,
      boardedSelectionText,
      unloadSelectionText,
      soldierState: soldier.state,
      engineerState: engineer.state,
      soldierVisibleAfterUnload: !!game.renderer3d.unitMeshes.get(soldier)?.visible,
      heliPassengersAfterUnload: heli?.passengers.length || 0,
      heliStateAfterUnload: heli?.state || null,
      soldierDistanceToDrop: Math.hypot(soldier.x - unloadPoint.x, soldier.y - unloadPoint.y),
      targetingVsEnemyTank: game.canEntityTarget(heli, enemyTank),
    };
  });

  expect(airliftState.heliCardClass).not.toContain('locked');
  expect(airliftState.spawned?.hp).toBeGreaterThanOrEqual(220);
  expect(airliftState.spawned?.armorType).toBe('air');
  expect(airliftState.spawned?.role).toBe('air transport helicopter');
  expect(airliftState.spawned?.altitude).toBeGreaterThan(1.1);
  expect(airliftState.spawned?.passengerCapacity).toBe(5);
  expect(airliftState.boardedPassengerTypes).toEqual(['soldier']);
  expect(airliftState.boardedSelectionText).toContain('CARGO: 1/5');
  expect(airliftState.boardedSelectionText).toContain('LOADED: Soldier');
  expect(airliftState.unloadSelectionText).toContain('CARGO: 0/5');
  expect(airliftState.soldierState).toBe('idle');
  expect(airliftState.engineerState).toBe('idle');
  expect(airliftState.soldierVisibleAfterUnload).toBe(true);
  expect(airliftState.heliPassengersAfterUnload).toBe(0);
  expect(airliftState.heliStateAfterUnload).toBe('idle');
  expect(airliftState.soldierDistanceToDrop).toBeLessThanOrEqual(2.5);
  expect(airliftState.targetingVsEnemyTank).toBe(false);
});

test('ai queues and uses a transport helicopter for remote infantry insertion', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const human = game.players[0];
    const ai = game.players[1];

    game.matchConfig.aiBuildOrder = 'air';
    game.aiConfig = {
      ...game.aiConfig,
      buildOrder: 'air',
      prioritizeAirfield: true,
      desiredHarriers: 0,
      desiredHarriersBonus: 0,
      desiredPillboxes: 0,
      desiredPillboxesBonus: 0,
      desiredSentryGuns: 0,
      desiredSentryGunsBonus: 0,
      desiredPowerPlants: 1,
      desiredPowerPlantsBonus: 0,
    };

    human.units = [];
    human.buildings = [
      game.createBuilding('constructionYard', 5, 5, 0),
      game.createBuilding('powerPlant', 9, 6, 0),
      game.createBuilding('refinery', 11, 9, 0),
      game.createBuilding('warFactory', 14, 10, 0),
      game.createBuilding('radarDome', 16, 7, 0),
      game.createBuilding('battleLab', 18, 10, 0),
    ];

    ai.units = [
      game.createUnit('harvester', 31, 25, 1),
      game.createUnit('soldier', 33, 28, 1),
      game.createUnit('soldier', 34, 28, 1),
      game.createUnit('rocketInfantry', 33, 29, 1),
      game.createUnit('flakTrooper', 34, 29, 1),
    ];
    ai.buildings = [
      game.createBuilding('constructionYard', 30, 28, 1),
      game.createBuilding('powerPlant', 26, 28, 1),
      game.createBuilding('refinery', 26, 24, 1),
      game.createBuilding('barracks', 30, 24, 1),
      game.createBuilding('warFactory', 34, 28, 1),
      game.createBuilding('radarDome', 30, 20, 1),
      game.createBuilding('airfield', 34, 20, 1),
      game.createBuilding('battleLab', 26, 18, 1),
      game.createBuilding('advancedPowerPlant', 22, 24, 1),
    ];
    ai.money = 5000;

    const airfield = ai.buildings.find((building: any) => building.type === 'airfield');
    const target = human.buildings.find((building: any) => building.type === 'powerPlant');
    const targetAnchor = { x: target.tx + target.size / 2 - 0.5, y: target.ty + target.size / 2 - 0.5 };

    let queuedAfterFirstTick = false;
    for (let i = 0; i < 6; i += 1) {
      game.updateAI(5000);
      queuedAfterFirstTick = airfield.training === 'transportHeli' || airfield.trainQueue.includes('transportHeli');
      if (queuedAfterFirstTick) break;
    }

    airfield.training = 'transportHeli';
    airfield.trainProgress = 0.99;
    game.update(300);

    const heli = ai.units.find((unit: any) => unit.type === 'transportHeli');
    let boardedPeak = heli?.passengers.length || 0;
    let insertedPeak = 0;
    let unloadTriggered = false;
    let unloadTargetSnapshot = null;

    for (let i = 0; i < 320; i += 1) {
      game.updateAI(5000);
      game.update(100);
      boardedPeak = Math.max(boardedPeak, heli?.passengers.length || 0);
      const nearbyInsertedCount = ai.units.filter((unit: any) =>
        ['soldier', 'rocketInfantry', 'flakTrooper'].includes(unit.type)
        && unit.state !== 'dead'
        && Math.hypot(unit.x - targetAnchor.x, unit.y - targetAnchor.y) <= 5
      ).length;
      insertedPeak = Math.max(insertedPeak, nearbyInsertedCount);
      if (heli?.unloadTarget) {
        unloadTriggered = true;
        unloadTargetSnapshot = { ...heli.unloadTarget };
      }
    }

    const insertedInfantry = ai.units.filter((unit: any) =>
      ['soldier', 'rocketInfantry', 'flakTrooper'].includes(unit.type)
      && unit.state !== 'dead'
      && Math.hypot(unit.x - targetAnchor.x, unit.y - targetAnchor.y) <= 5
    );

    return {
      queuedAfterFirstTick,
      heliExists: Boolean(heli),
      boardedPeak,
      insertedPeak,
      unloadTriggered,
      unloadTargetSnapshot,
      heliPassengers: heli?.passengers.length || 0,
      heliState: heli?.state || null,
      insertedTypes: insertedInfantry.map((unit: any) => unit.type).sort(),
      targetHp: target.hp,
      heliDistanceToTarget: heli ? Math.hypot(heli.x - targetAnchor.x, heli.y - targetAnchor.y) : null,
    };
  });

  expect(aiState.queuedAfterFirstTick).toBe(true);
  expect(aiState.heliExists).toBe(true);
  expect(aiState.boardedPeak).toBeGreaterThanOrEqual(3);
  expect(aiState.unloadTriggered).toBe(true);
  expect(aiState.unloadTargetSnapshot).toBeTruthy();
  expect(aiState.insertedPeak).toBeGreaterThanOrEqual(2);
  expect(aiState.targetHp).toBeLessThan(900);
  expect(['idle', 'loading', 'unloadingPassengers', 'moving']).toContain(aiState.heliState || 'idle');
  expect(aiState.heliDistanceToTarget).not.toBeNull();
  expect(aiState.heliDistanceToTarget!).toBeLessThanOrEqual(8);
});
