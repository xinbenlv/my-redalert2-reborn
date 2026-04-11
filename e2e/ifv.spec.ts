import { expect, test } from '@playwright/test';

test('ifv unlocks from radar tech, swats aircraft, and AI queues it as an escort response', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const ifvCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('IFV')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      lockedText: ifvCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: ifvCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('IFV');
  expect(lockedState.lockedClass).toContain('locked');
  expect(lockedState.lockedText).toContain('Radar Dome');

  const unlockedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];

    const warFactory = game.createBuilding('warFactory', 14, 10, 0);
    const radarDome = game.createBuilding('radarDome', 10, 10, 0);
    player.buildings.push(warFactory, radarDome);
    player.money += 10000;
    game.updateUI();

    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const ifvCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('IFV')
    ) as HTMLElement | undefined;

    warFactory.training = 'ifv';
    warFactory.trainProgress = 0.99;
    game.update(300);

    const spawned = player.units.find((unit: any) => unit.type === 'ifv');
    const ifv = game.createUnit('ifv', 18, 14, 0);
    const apc = game.createUnit('apc', 18, 12, 0);
    const enemyHarrier = game.createUnit('harrier', 21, 14, 1);
    const enemyTank = game.createUnit('tank', 21, 16, 1);

    return {
      ifvClass: ifvCard?.className || '',
      spawned: spawned
        ? {
            hp: spawned.hp,
            damage: spawned.damage,
            armorType: spawned.armorType,
            role: spawned.role,
            canAttackAir: spawned.canAttackAir,
            speed: spawned.speed,
          }
        : null,
      targeting: {
        ifvVsAir: game.canEntityTarget(ifv, enemyHarrier),
        ifvVsTank: game.canEntityTarget(ifv, enemyTank),
        apcVsAir: game.canEntityTarget(apc, enemyHarrier),
      },
      damageProfile: {
        ifvVsAir: game.getDamageAgainstTarget(ifv.damage, ifv.damageProfile, enemyHarrier),
        ifvVsTank: game.getDamageAgainstTarget(ifv.damage, ifv.damageProfile, enemyTank),
      },
    };
  });

  expect(unlockedState.ifvClass).not.toContain('locked');
  expect(unlockedState.spawned?.hp).toBe(200);
  expect(unlockedState.spawned?.damage).toBe(20);
  expect(unlockedState.spawned?.armorType).toBe('light');
  expect(unlockedState.spawned?.role).toContain('escort');
  expect(unlockedState.spawned?.canAttackAir).toBe(true);
  expect(unlockedState.spawned?.speed).toBeGreaterThan(1);
  expect(unlockedState.targeting.ifvVsAir).toBe(true);
  expect(unlockedState.targeting.ifvVsTank).toBe(true);
  expect(unlockedState.targeting.apcVsAir).toBe(false);
  expect(unlockedState.damageProfile.ifvVsAir).toBeGreaterThan(unlockedState.damageProfile.ifvVsTank);

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    const human = game.players[0];

    ai.money = 1100;
    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('powerPlant', 20, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 30, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('pillbox', 35, 24, 1),
      game.createBuilding('sentryGun', 36, 28, 1),
    ];
    human.units = [
      game.createUnit('harrier', 24, 27, 0),
    ];

    const warFactory = ai.buildings.find((building: any) => building.type === 'warFactory');
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    return {
      training: warFactory?.training || null,
      queue: warFactory?.trainQueue || [],
    };
  });

  expect([aiState.training, ...aiState.queue]).toContain('ifv');
});