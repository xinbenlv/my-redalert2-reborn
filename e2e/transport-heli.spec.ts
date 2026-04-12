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
