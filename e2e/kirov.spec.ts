import { expect, test } from '@playwright/test';

test('battle lab unlocks kirov siege bomber with RTB cycle and air AI can queue it', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.buildings.push(game.createBuilding('warFactory', 14, 10, 0));
    player.buildings.push(game.createBuilding('radarDome', 11, 10, 0));
    player.buildings.push(game.createBuilding('airfield', 17, 10, 0));
    player.money += 10000;
    game.updateUI();

    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const kirovCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Kirov')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      lockedText: kirovCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: kirovCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('Kirov Airship');
  expect(lockedState.lockedClass).toContain('locked');
  expect(lockedState.lockedText).toContain('Battle Lab');

  const unlockedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const airfield = player.buildings.find((building: any) => building.type === 'airfield');
    const battleLab = game.createBuilding('battleLab', 20, 10, 0);
    player.buildings.push(battleLab);
    game.updateUI();

    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const kirovCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Kirov')
    ) as HTMLElement | undefined;

    airfield.training = 'kirov';
    airfield.trainProgress = 0.995;
    game.update(250);

    const spawned = player.units.find((unit: any) => unit.type === 'kirov');
    const enemyPlayer = game.players[1];
    const enemyHarrier = game.createUnit('harrier', 23, 15, 1);
    const enemyBattleLab = game.createBuilding('battleLab', 22, 11, 1);
    enemyPlayer.units.push(enemyHarrier);
    enemyPlayer.buildings.push(enemyBattleLab);
    player.money += 5000;

    let ammoState = null;
    let selectionText = '';
    let strikeOverlay = null;
    let targeting = { kirovVsAir: false, kirovVsBuilding: false };
    let damageProfile = 0;
    if (spawned) {
      targeting = {
        kirovVsAir: game.canEntityTarget(spawned, enemyHarrier),
        kirovVsBuilding: game.canEntityTarget(spawned, enemyBattleLab),
      };
      damageProfile = game.getDamageAgainstTarget(spawned.damage, spawned.damageProfile, enemyBattleLab);
      spawned.x = 18.2;
      spawned.y = 11.5;
      spawned.attackTarget = enemyBattleLab;
      spawned.state = 'attacking';
      game.selected = [spawned];
      game.updateSelectionInfo();
      strikeOverlay = game.getSelectedEngagementOverlays?.()[0] || null;
      selectionText = (document.getElementById('selection-info') as HTMLElement)?.innerText || '';

      for (let i = 0; i < 24; i += 1) {
        game.update(250);
      }
      const ammoAfterStrike = spawned.ammo;
      const stateAfterStrike = spawned.state;
      const hpAfterStrike = enemyBattleLab.hp;

      for (let i = 0; i < 80; i += 1) {
        game.update(250);
      }

      game.selected = [spawned];
      game.updateSelectionInfo();
      selectionText = `${selectionText}\n---\n${(document.getElementById('selection-info') as HTMLElement)?.innerText || ''}`;
      ammoState = {
        ammoCapacity: spawned.ammoCapacity,
        ammoAfterStrike,
        stateAfterStrike,
        hpAfterStrike,
        ammoAfterRearm: spawned.ammo,
        stateAfterRearm: spawned.state,
        airfieldTarget: spawned.homeAirfield?.type || null,
      };
    }

    return {
      kirovClass: kirovCard?.className || '',
      spawned: spawned
        ? {
            hp: spawned.hp,
            damage: spawned.damage,
            armorType: spawned.armorType,
            role: spawned.role,
            altitude: spawned.altitude,
          }
        : null,
      targeting,
      damageProfile,
      ammoState,
      selectionText,
      strikeOverlay,
    };
  });

  expect(unlockedState.kirovClass).not.toContain('locked');
  expect(unlockedState.spawned?.hp).toBeGreaterThanOrEqual(360);
  expect(unlockedState.spawned?.damage).toBeGreaterThanOrEqual(110);
  expect(unlockedState.spawned?.armorType).toBe('air');
  expect(unlockedState.spawned?.role).toBe('heavy siege bomber');
  expect(unlockedState.spawned?.altitude).toBeGreaterThan(1.3);
  expect(unlockedState.targeting.kirovVsAir).toBe(false);
  expect(unlockedState.targeting.kirovVsBuilding).toBe(true);
  expect(unlockedState.damageProfile).toBeGreaterThan(200);
  expect(unlockedState.strikeOverlay?.kind).toBe('airstrike');
  expect(unlockedState.strikeOverlay?.label).toBe('AIRSTRIKE');
  expect(unlockedState.ammoState?.ammoCapacity).toBe(1);
  expect(unlockedState.ammoState?.ammoAfterStrike).toBe(0);
  expect(['returningToBase', 'rearming']).toContain(unlockedState.ammoState?.stateAfterStrike);
  expect(unlockedState.ammoState?.hpAfterStrike).toBeLessThan(1200);
  expect(unlockedState.ammoState?.ammoAfterRearm).toBeGreaterThanOrEqual(0);
  expect(['idle', 'rearming', 'returningToBase']).toContain(unlockedState.ammoState?.stateAfterRearm);
  expect(unlockedState.ammoState?.airfieldTarget).toBe('airfield');
  expect(unlockedState.selectionText).toContain('STRIKE: Battle Lab');
  expect(unlockedState.selectionText).toContain('STATUS: RTB');
  expect(unlockedState.selectionText).toContain('AMMO: 1/1');

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    const human = game.players[0];

    game.matchConfig.aiBuildOrder = 'air';
    game.matchConfig.aiDifficulty = 'hard';
    game.aiConfig = {
      ...game.aiConfig,
      buildOrder: 'air',
      prioritizeAirfield: true,
      prioritizeBattleLab: false,
      desiredHarriers: Math.max(game.aiConfig.desiredHarriers || 0, 2),
    };

    ai.money = 7600;
    ai.units = [
      game.createUnit('harvester', 30, 31, 1),
      game.createUnit('harvester', 26, 30, 1),
      game.createUnit('artillery', 29, 27, 1),
      game.createUnit('prismTank', 31, 27, 1),
    ];
    ai.buildings = [
      game.createBuilding('constructionYard', 28, 28, 1),
      game.createBuilding('powerPlant', 24, 28, 1),
      game.createBuilding('powerPlant', 20, 28, 1),
      game.createBuilding('powerPlant', 16, 28, 1),
      game.createBuilding('advancedPowerPlant', 12, 28, 1),
      game.createBuilding('refinery', 24, 24, 1),
      game.createBuilding('refinery', 20, 24, 1),
      game.createBuilding('barracks', 28, 24, 1),
      game.createBuilding('barracks', 24, 20, 1),
      game.createBuilding('radarDome', 32, 24, 1),
      game.createBuilding('warFactory', 32, 28, 1),
      game.createBuilding('airfield', 35, 28, 1),
      game.createBuilding('battleLab', 35, 24, 1),
      game.createBuilding('pillbox', 31, 22, 1),
      game.createBuilding('sentryGun', 34, 22, 1),
    ];
    human.buildings = [
      game.createBuilding('constructionYard', 8, 8, 0),
      game.createBuilding('powerPlant', 12, 8, 0),
      game.createBuilding('powerPlant', 16, 8, 0),
      game.createBuilding('refinery', 14, 8, 0),
      game.createBuilding('warFactory', 18, 8, 0),
      game.createBuilding('battleLab', 21, 8, 0),
      game.createBuilding('radarDome', 24, 8, 0),
      game.createBuilding('airfield', 27, 8, 0),
    ];
    human.units = [
      game.createUnit('tank', 17, 12, 0),
      game.createUnit('harvester', 18, 12, 0),
    ];

    const airfield = ai.buildings.find((building: any) => building.type === 'airfield');
    game.aiTimer = game.aiDecisionInterval;
    game.updateAI(5000);

    return {
      training: airfield?.training || null,
      queue: airfield?.trainQueue || [],
    };
  });

  expect([aiState.training, ...aiState.queue]).toContain('kirov');
});
