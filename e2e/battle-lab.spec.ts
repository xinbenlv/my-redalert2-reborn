import { expect, test } from '@playwright/test';

test('battle lab unlocks apocalypse tanks and AI techs into the battle lab tier', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim());
    const battleLabCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Battle Lab')
    ) as HTMLElement | undefined;

    return {
      labels,
      lockedText: battleLabCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: battleLabCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('Battle Lab');
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

    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const apocalypseCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Apocalypse Tank')
    ) as HTMLElement | undefined;
    warFactory.training = 'apocalypseTank';
    warFactory.trainProgress = 0.99;
    game.update(300);

    const spawned = player.units.find((unit: any) => unit.type === 'apocalypseTank');
    game.selected = spawned ? [spawned] : [];
    game.updateSelectionInfo();

    return {
      apocalypseText: apocalypseCard?.textContent || '',
      apocalypseClass: apocalypseCard?.className || '',
      buildingTypes: player.buildings.map((building: any) => building.type),
      spawned: spawned
        ? {
            hp: spawned.hp,
            damage: spawned.damage,
            armorType: spawned.armorType,
            role: spawned.role,
          }
        : null,
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(unlockedState.buildingTypes).toContain('battleLab');
  expect(unlockedState.apocalypseClass).not.toContain('locked');
  expect(unlockedState.spawned?.hp).toBe(360);
  expect(unlockedState.spawned?.damage).toBe(62);
  expect(unlockedState.spawned?.armorType).toBe('heavy');
  expect(unlockedState.spawned?.role).toContain('breakthrough');
  expect(unlockedState.selectionText).toContain('Apocalypse Tank');
  expect(unlockedState.selectionText).toContain('DMG: 62');

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
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('pillbox', 35, 24, 1),
      game.createBuilding('sentryGun', 35, 28, 1),
    ];
    human.units.push(game.createUnit('tank', 25, 28, 0), game.createUnit('tank', 27, 28, 0));

    const hasBattleLabBefore = ai.buildings.some((building: any) => building.type === 'battleLab');
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    let battleLab = ai.buildings.find((building: any) => building.type === 'battleLab');
    if (battleLab) {
      battleLab.built = true;
      battleLab.buildProgress = 1;
    }

    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    battleLab = ai.buildings.find((building: any) => building.type === 'battleLab');
    if (battleLab && !battleLab.built) {
      battleLab.built = true;
      battleLab.buildProgress = 1;
      game.aiTimer = game.aiDecisionInterval;
      game.updateAI(5000);
    }

    return {
      hasBattleLabBefore,
      hasBattleLabAfter: ai.buildings.some((building: any) => building.type === 'battleLab'),
      battleLabBuilt: Boolean(battleLab?.built),
    };
  });

  expect(aiState.hasBattleLabBefore).toBe(false);
  expect(aiState.hasBattleLabAfter).toBe(true);
  expect(aiState.battleLabBuilt).toBe(true);
});