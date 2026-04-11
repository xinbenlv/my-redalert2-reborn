import { expect, test } from '@playwright/test';

test('flak track unlocks from radar tech, shreds infantry better than tanks, and AI mixes it into anti-infantry production', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const flakTrackCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Flak Track')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      lockedText: flakTrackCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: flakTrackCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('Flak Track');
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

    const flakTrackCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Flak Track')
    ) as HTMLElement | undefined;

    warFactory.training = 'flakTrack';
    warFactory.trainProgress = 0.99;
    game.update(300);

    const spawned = player.units.find((unit: any) => unit.type === 'flakTrack');
    const tank = game.createUnit('tank', 18, 12, 0);
    const flakTrack = game.createUnit('flakTrack', 18, 14, 0);
    const enemySoldier = game.createUnit('soldier', 21, 14, 1);
    const enemyTank = game.createUnit('tank', 21, 14, 1);

    return {
      flakTrackClass: flakTrackCard?.className || '',
      spawned: spawned
        ? {
            hp: spawned.hp,
            damage: spawned.damage,
            armorType: spawned.armorType,
            role: spawned.role,
          }
        : null,
      damageProfile: {
        tankVsInfantry: game.getDamageAgainstTarget(tank.damage, tank.damageProfile, enemySoldier),
        flakTrackVsInfantry: game.getDamageAgainstTarget(flakTrack.damage, flakTrack.damageProfile, enemySoldier),
        flakTrackVsTank: game.getDamageAgainstTarget(flakTrack.damage, flakTrack.damageProfile, enemyTank),
      },
    };
  });

  expect(unlockedState.flakTrackClass).not.toContain('locked');
  expect(unlockedState.spawned?.hp).toBe(190);
  expect(unlockedState.spawned?.damage).toBe(22);
  expect(unlockedState.spawned?.armorType).toBe('light');
  expect(unlockedState.spawned?.role).toContain('anti-air');
  expect(unlockedState.damageProfile.flakTrackVsInfantry).toBeGreaterThan(unlockedState.damageProfile.tankVsInfantry);
  expect(unlockedState.damageProfile.flakTrackVsTank).toBeLessThan(unlockedState.damageProfile.flakTrackVsInfantry);

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    const human = game.players[0];

    ai.money = 2200;
    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('powerPlant', 20, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('pillbox', 35, 24, 1),
      game.createBuilding('sentryGun', 35, 28, 1),
    ];
    human.units.push(
      game.createUnit('soldier', 24, 27, 0),
      game.createUnit('soldier', 25, 27, 0),
      game.createUnit('soldier', 26, 27, 0),
      game.createUnit('rocketInfantry', 24, 28, 0),
      game.createUnit('flakTrooper', 25, 28, 0)
    );

    const warFactory = ai.buildings.find((building: any) => building.type === 'warFactory');
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    return {
      training: warFactory?.training || null,
      queue: warFactory?.trainQueue || [],
    };
  });

  expect([aiState.training, ...aiState.queue]).toContain('flakTrack');
});