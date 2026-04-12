import { expect, test } from '@playwright/test';

test('prism tank unlocks at battle lab tier and AI uses it as a siege answer against defense-heavy bases', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement | null;
    unitTab?.click();
    const prismCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Prism Tank')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      lockedText: prismCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: prismCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('Prism Tank');
  expect(lockedState.lockedClass).toContain('locked');
  expect(lockedState.lockedText).toContain('Next:');
  expect(lockedState.lockedText).toContain('Missing');

  const unlockedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];

    const warFactory = game.createBuilding('warFactory', 14, 10, 0);
    const battleLab = game.createBuilding('battleLab', 18, 10, 0);
    player.buildings.push(warFactory, battleLab);
    player.money += 10000;
    game.updateUI();

    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement | null;
    unitTab?.click();

    const prismCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Prism Tank')
    ) as HTMLElement | undefined;

    warFactory.training = 'prismTank';
    warFactory.trainProgress = 0.99;
    game.update(300);

    const spawned = player.units.find((unit: any) => unit.type === 'prismTank');
    game.selected = spawned ? [spawned] : [];
    game.updateSelectionInfo();
    game._syncRenderer?.(16);

    return {
      prismText: prismCard?.textContent || '',
      prismClass: prismCard?.className || '',
      spawned: spawned
        ? {
            hp: spawned.hp,
            damage: spawned.damage,
            range: spawned.range,
            armorType: spawned.armorType,
            role: spawned.role,
            modelType: game.renderer3d.unitMeshes.get(spawned)?.userData?.modelType || null,
          }
        : null,
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(unlockedState.prismClass).not.toContain('locked');
  expect(unlockedState.spawned?.hp).toBe(220);
  expect(unlockedState.spawned?.damage).toBe(58);
  expect(unlockedState.spawned?.range).toBe(8.4);
  expect(unlockedState.spawned?.armorType).toBe('light');
  expect(unlockedState.spawned?.role).toContain('prism siege');
  expect(unlockedState.spawned?.modelType).toBe('prismTank');
  expect(unlockedState.selectionText).toContain('Prism Tank');
  expect(unlockedState.selectionText).toContain('DMG: 58');
  expect(unlockedState.selectionText).toContain('RNG: 8.4');

  const aiState = await page.evaluate(() => {
    const GameState = (window as any).GameState;
    const game = new GameState({
      startingCredits: 10000,
      map: 'classic',
      playerFaction: 'allied',
      aiDifficulty: 'hard',
      aiBuildOrder: 'balanced',
    });
    const human = game.players[0];
    const ai = game.players[1];

    human.money = 0;
    human.units = [game.createUnit('soldier', 10, 10, 0)];
    human.buildings = [
      game.createBuilding('constructionYard', 8, 8, 0),
      game.createBuilding('powerPlant', 10, 8, 0),
      game.createBuilding('refinery', 12, 8, 0),
      game.createBuilding('pillbox', 15, 9, 0),
      game.createBuilding('sentryGun', 16, 11, 0),
      game.createBuilding('battleBunker', 18, 10, 0),
      game.createBuilding('warFactory', 20, 8, 0),
      game.createBuilding('battleLab', 22, 8, 0),
    ];

    ai.money = 5000;
    ai.units = [
      game.createUnit('harvester', 30, 31, 1),
      game.createUnit('harvester', 31, 31, 1),
      game.createUnit('tank', 29, 26, 1),
    ];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('powerPlant', 20, 28, 1),
      game.createBuilding('advancedPowerPlant', 16, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('refinery', 20, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('battleLab', 36, 28, 1),
      game.createBuilding('airfield', 38, 24, 1),
      game.createBuilding('pillbox', 34, 24, 1),
      game.createBuilding('pillbox', 34, 22, 1),
      game.createBuilding('sentryGun', 34, 26, 1),
      game.createBuilding('sentryGun', 36, 26, 1),
    ];

    game.updateAI(5000);

    const warFactory = ai.buildings.find((building: any) => building.type === 'warFactory');
    return {
      training: warFactory?.training || null,
      queue: Array.isArray(warFactory?.trainQueue) ? [...warFactory.trainQueue] : [],
      remainingMoney: ai.money,
      enemyDefenseCount: human.buildings.filter((building: any) => ['pillbox', 'sentryGun', 'battleBunker'].includes(building.type)).length,
    };
  });

  expect(aiState.enemyDefenseCount).toBeGreaterThanOrEqual(3);
  expect(aiState.training).toBe('prismTank');
  expect(aiState.remainingMoney).toBe(3350);
});
