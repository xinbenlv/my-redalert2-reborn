import { expect, test } from '@playwright/test';

test('v3 artillery unlocks from radar tech, beats tanks at siege damage, and AI techs into it', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const artilleryCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('V3 Artillery')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      lockedText: artilleryCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: artilleryCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('V3 Artillery');
  expect(lockedState.lockedClass).toContain('locked');
  expect(lockedState.lockedText).toContain('Radar Dome');

  const unlockedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];

    const warFactory = game.createBuilding('warFactory', 14, 10, 0);
    const radarDome = game.createBuilding('radarDome', 11, 10, 0);
    player.buildings.push(warFactory, radarDome);
    player.money += 10000;
    game.updateUI();

    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();
    const artilleryCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('V3 Artillery')
    ) as HTMLElement | undefined;

    warFactory.training = 'artillery';
    warFactory.trainProgress = 0.99;
    game.update(300);

    const spawned = player.units.find((unit: any) => unit.type === 'artillery');
    const targetBuilding = game.createBuilding('sentryGun', 22, 12, 1);
    const tank = game.createUnit('tank', 18, 12, 0);
    const artillery = game.createUnit('artillery', 18, 14, 0);

    return {
      artilleryClass: artilleryCard?.className || '',
      spawned: spawned
        ? {
            hp: spawned.hp,
            damage: spawned.damage,
            range: spawned.range,
            role: spawned.role,
          }
        : null,
      buildingDamage: {
        tank: game.getDamageAgainstTarget(tank.damage, tank.damageProfile, targetBuilding),
        artillery: game.getDamageAgainstTarget(artillery.damage, artillery.damageProfile, targetBuilding),
      },
      ranges: {
        tank: tank.range,
        artillery: artillery.range,
      },
    };
  });

  expect(unlockedState.artilleryClass).not.toContain('locked');
  expect(unlockedState.spawned?.hp).toBe(150);
  expect(unlockedState.spawned?.damage).toBe(48);
  expect(unlockedState.spawned?.range).toBe(8.5);
  expect(unlockedState.spawned?.role).toContain('siege');
  expect(unlockedState.buildingDamage.artillery).toBeGreaterThan(unlockedState.buildingDamage.tank);
  expect(unlockedState.ranges.artillery).toBeGreaterThan(unlockedState.ranges.tank);

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    const human = game.players[0];

    ai.money = 12000;
    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('powerPlant', 20, 28, 1),
      game.createBuilding('powerPlant', 16, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('battleLab', 35, 28, 1),
      game.createBuilding('pillbox', 36, 24, 1),
      game.createBuilding('sentryGun', 36, 28, 1),
    ];
    human.buildings.push(
      game.createBuilding('pillbox', 18, 18, 0),
      game.createBuilding('sentryGun', 20, 18, 0),
      game.createBuilding('refinery', 22, 18, 0)
    );

    const before = ai.buildings.find((building: any) => building.type === 'warFactory');
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    return {
      training: before?.training || null,
      queue: before?.trainQueue || [],
    };
  });

  expect([aiState.training, ...aiState.queue]).toContain('artillery');
});
