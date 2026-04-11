import { expect, test } from '@playwright/test';

test('advanced power plant unlocks after radar, restores low power, and AI techs into it', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim());
    const card = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Advanced Power Plant')
    ) as HTMLElement | undefined;

    return {
      labels,
      lockedClass: card?.className || '',
      lockedText: card?.querySelector('.item-status')?.textContent || '',
    };
  });

  expect(lockedState.labels).toContain('Advanced Power Plant');
  expect(lockedState.lockedClass).toContain('locked');
  expect(lockedState.lockedText).toContain('Radar Dome');

  const unlockedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.money = 10000;

    const constructionYard = game.createBuilding('constructionYard', 7, 10, 0);
    const powerPlant = game.createBuilding('powerPlant', 11, 10, 0);
    const radarDome = game.createBuilding('radarDome', 15, 10, 0);
    const advancedPowerPlant = game.createBuilding('advancedPowerPlant', 19, 10, 0);
    const warFactory = game.createBuilding('warFactory', 23, 10, 0);
    const battleLab = game.createBuilding('battleLab', 27, 10, 0);
    player.buildings = [constructionYard, powerPlant, radarDome, advancedPowerPlant, warFactory, battleLab];
    game.updateUI();

    const card = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Advanced Power Plant')
    ) as HTMLElement | undefined;

    const powerBefore = (window as any).POWER_SYSTEM.calculate(player);
    const powerPlants = player.buildings.filter((building: any) => building.type === 'powerPlant');
    powerPlants.forEach((building: any) => {
      building.hp = 0;
    });
    const lowPowerAfterSabotage = (window as any).POWER_SYSTEM.isLowPower(player);

    const selectionTarget = advancedPowerPlant;
    game.selected = [selectionTarget];
    game.updateSelectionInfo();

    return {
      unlockedClass: card?.className || '',
      powerBefore,
      lowPowerAfterSabotage,
      powerAfterSabotage: (window as any).POWER_SYSTEM.calculate(player),
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(unlockedState.unlockedClass).not.toContain('locked');
  expect(unlockedState.powerBefore.produced).toBeGreaterThanOrEqual(300);
  expect(unlockedState.lowPowerAfterSabotage).toBe(false);
  expect(unlockedState.powerAfterSabotage.produced).toBe(200);
  expect(unlockedState.selectionText).toContain('Advanced Power Plant');
  expect(unlockedState.selectionText).toContain('Power +200');

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    ai.money = 5000;
    ai.units = [game.createUnit('harvester', 30, 31, 1)];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('airfield', 35, 28, 1),
      game.createBuilding('battleLab', 35, 24, 1),
      game.createBuilding('sentryGun', 30, 23, 1),
      game.createBuilding('sentryGun', 31, 23, 1),
      game.createBuilding('pillbox', 29, 23, 1),
    ];

    const powerStateBefore = (window as any).POWER_SYSTEM.calculate(ai);
    const hadAdvancedPowerBefore = ai.buildings.some((building: any) => building.type === 'advancedPowerPlant');
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    const advanced = ai.buildings.find((building: any) => building.type === 'advancedPowerPlant');
    if (advanced) {
      advanced.built = true;
      advanced.buildProgress = 1;
    }

    return {
      hadAdvancedPowerBefore,
      powerStateBefore,
      hasAdvancedPowerAfter: ai.buildings.some((building: any) => building.type === 'advancedPowerPlant'),
      advancedBuilt: Boolean(advanced?.built),
    };
  });

  expect(aiState.hadAdvancedPowerBefore).toBe(false);
  expect(aiState.powerStateBefore.produced).toBeLessThan(aiState.powerStateBefore.consumed);
  expect(aiState.hasAdvancedPowerAfter).toBe(true);
  expect(aiState.advancedBuilt).toBe(true);
});