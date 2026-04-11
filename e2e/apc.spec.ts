import { expect, test } from '@playwright/test';

test('apc unlocks from war factory, chews infantry better than tanks, and AI queues it against infantry-heavy armies', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const apcCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('APC')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      lockedText: apcCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: apcCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('APC');
  expect(lockedState.lockedClass).toContain('locked');
  expect(lockedState.lockedText).toContain('War Factory');

  const unlockedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];

    const warFactory = game.createBuilding('warFactory', 14, 10, 0);
    player.buildings.push(warFactory);
    player.money += 10000;
    game.updateUI();

    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const apcCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('APC')
    ) as HTMLElement | undefined;

    warFactory.training = 'apc';
    warFactory.trainProgress = 0.99;
    game.update(300);

    const spawned = player.units.find((unit: any) => unit.type === 'apc');
    const tank = game.createUnit('tank', 18, 12, 0);
    const apc = game.createUnit('apc', 18, 14, 0);
    const enemySoldier = game.createUnit('soldier', 21, 14, 1);
    const enemyTank = game.createUnit('tank', 21, 14, 1);

    return {
      apcClass: apcCard?.className || '',
      spawned: spawned
        ? {
            hp: spawned.hp,
            damage: spawned.damage,
            armorType: spawned.armorType,
            role: spawned.role,
            speed: spawned.speed,
          }
        : null,
      damageProfile: {
        tankVsInfantry: game.getDamageAgainstTarget(tank.damage, tank.damageProfile, enemySoldier),
        apcVsInfantry: game.getDamageAgainstTarget(apc.damage, apc.damageProfile, enemySoldier),
        apcVsTank: game.getDamageAgainstTarget(apc.damage, apc.damageProfile, enemyTank),
      },
    };
  });

  expect(unlockedState.apcClass).not.toContain('locked');
  expect(unlockedState.spawned?.hp).toBe(220);
  expect(unlockedState.spawned?.damage).toBe(18);
  expect(unlockedState.spawned?.armorType).toBe('light');
  expect(unlockedState.spawned?.role).toContain('infantry');
  expect(unlockedState.spawned?.speed).toBeGreaterThan(1);
  expect(unlockedState.damageProfile.apcVsInfantry).toBeGreaterThan(unlockedState.damageProfile.tankVsInfantry);
  expect(unlockedState.damageProfile.apcVsTank).toBeLessThan(unlockedState.damageProfile.apcVsInfantry);

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    const human = game.players[0];

    ai.money = 900;
    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('powerPlant', 20, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('pillbox', 35, 24, 1),
    ];
    human.units = [
      game.createUnit('soldier', 24, 27, 0),
      game.createUnit('soldier', 25, 27, 0),
      game.createUnit('soldier', 26, 27, 0),
      game.createUnit('rocketInfantry', 24, 28, 0),
    ];

    const warFactory = ai.buildings.find((building: any) => building.type === 'warFactory');
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    return {
      training: warFactory?.training || null,
      queue: warFactory?.trainQueue || [],
    };
  });

  expect([aiState.training, ...aiState.queue]).toContain('apc');
});