import { expect, test } from '@playwright/test';

test('airfield unlocks harriers, anti-air tracks aircraft targeting, and AI queues air strikes', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const harrierCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Harrier')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      lockedText: harrierCard?.querySelector('.item-status')?.textContent || '',
      lockedClass: harrierCard?.className || '',
    };
  });

  expect(lockedState.labels).toContain('Harrier');
  expect(lockedState.lockedClass).toContain('locked');
  expect(lockedState.lockedText).toContain('Airfield');

  const unlockedState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];

    const warFactory = game.createBuilding('warFactory', 14, 10, 0);
    const radarDome = game.createBuilding('radarDome', 11, 10, 0);
    const airfield = game.createBuilding('airfield', 17, 10, 0);
    player.buildings.push(warFactory, radarDome, airfield);
    player.money += 10000;
    game.updateUI();

    const unitTab = document.querySelector('.build-tab[data-tab="units"]') as HTMLElement;
    unitTab?.click();

    const harrierCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Harrier')
    ) as HTMLElement | undefined;

    airfield.training = 'harrier';
    airfield.trainProgress = 0.99;
    game.update(300);

    const spawned = player.units.find((unit: any) => unit.type === 'harrier');
    const flakTrack = game.createUnit('flakTrack', 18, 14, 0);
    const tank = game.createUnit('tank', 18, 12, 0);
    const enemyHarrier = game.createUnit('harrier', 21, 14, 1);
    const enemyPowerPlant = game.createBuilding('powerPlant', 21, 10, 1);

    let ammoState = null;
    let selectionText = '';
    let strikeOverlay = null;
    let aaSelectionText = '';
    let aaOverlay = null;
    if (spawned) {
      spawned.x = 18;
      spawned.y = 10.5;
      spawned.attackTarget = enemyPowerPlant;
      spawned.state = 'attacking';
      game.selected = [spawned];
      game.updateSelectionInfo();
      strikeOverlay = game.getSelectedEngagementOverlays?.()[0] || null;
      selectionText = (document.getElementById('selection-info') as HTMLElement)?.innerText || '';
      game.update(2500);
      game.update(2500);
      const drainedAmmo = spawned.ammo;
      const drainedState = spawned.state;
      game.selected = [spawned];
      game.updateSelectionInfo();
      const postStrikeSelectionText = (document.getElementById('selection-info') as HTMLElement)?.innerText || '';

      flakTrack.attackTarget = enemyHarrier;
      flakTrack.state = 'attacking';
      game.selected = [flakTrack];
      game.updateSelectionInfo();
      aaSelectionText = (document.getElementById('selection-info') as HTMLElement)?.innerText || '';
      aaOverlay = game.getSelectedEngagementOverlays?.()[0] || null;

      for (let i = 0; i < 24; i += 1) {
        game.update(250);
      }
      game.selected = [spawned];
      game.updateSelectionInfo();
      selectionText = `${selectionText}\n---\n${postStrikeSelectionText}\n---\n${(document.getElementById('selection-info') as HTMLElement)?.innerText || ''}`;
      ammoState = {
        ammoCapacity: spawned.ammoCapacity,
        ammoAfterStrike: drainedAmmo,
        stateAfterStrike: drainedState,
        ammoAfterRearm: spawned.ammo,
        stateAfterRearm: spawned.state,
        airfieldTarget: spawned.homeAirfield?.type || null,
      };
    }

    return {
      harrierClass: harrierCard?.className || '',
      spawned: spawned
        ? {
            hp: spawned.hp,
            damage: spawned.damage,
            armorType: spawned.armorType,
            role: spawned.role,
            altitude: spawned.altitude,
          }
        : null,
      targeting: {
        tankVsAir: game.canEntityTarget(tank, enemyHarrier),
        flakVsAir: game.canEntityTarget(flakTrack, enemyHarrier),
        harrierVsAir: game.canEntityTarget(spawned, enemyHarrier),
        harrierVsBuilding: game.canEntityTarget(spawned, enemyPowerPlant),
      },
      damageProfile: {
        flakVsAir: game.getDamageAgainstTarget(flakTrack.damage, flakTrack.damageProfile, enemyHarrier),
        harrierVsBuilding: game.getDamageAgainstTarget(spawned.damage, spawned.damageProfile, enemyPowerPlant),
      },
      ammoState,
      selectionText,
      strikeOverlay,
      aaSelectionText,
      aaOverlay,
    };
  });

  expect(unlockedState.harrierClass).not.toContain('locked');
  expect(unlockedState.spawned?.hp).toBe(140);
  expect(unlockedState.spawned?.damage).toBe(55);
  expect(unlockedState.spawned?.armorType).toBe('air');
  expect(unlockedState.spawned?.role).toBe('aircraft');
  expect(unlockedState.spawned?.altitude).toBeGreaterThan(0.9);
  expect(unlockedState.targeting.tankVsAir).toBe(false);
  expect(unlockedState.targeting.flakVsAir).toBe(true);
  expect(unlockedState.targeting.harrierVsAir).toBe(false);
  expect(unlockedState.targeting.harrierVsBuilding).toBe(true);
  expect(unlockedState.damageProfile.flakVsAir).toBeGreaterThan(30);
  expect(unlockedState.damageProfile.harrierVsBuilding).toBeGreaterThan(80);
  expect(unlockedState.strikeOverlay?.kind).toBe('airstrike');
  expect(unlockedState.strikeOverlay?.label).toBe('AIRSTRIKE');
  expect(unlockedState.aaOverlay?.kind).toBe('anti-air-lock');
  expect(unlockedState.aaOverlay?.label).toBe('AA LOCK');
  expect(unlockedState.ammoState?.ammoCapacity).toBe(2);
  expect(unlockedState.ammoState?.ammoAfterStrike).toBe(0);
  expect(['returningToBase', 'rearming']).toContain(unlockedState.ammoState?.stateAfterStrike);
  expect(unlockedState.ammoState?.ammoAfterRearm).toBe(2);
  expect(unlockedState.ammoState?.stateAfterRearm).toBe('idle');
  expect(unlockedState.ammoState?.airfieldTarget).toBe('airfield');
  expect(unlockedState.selectionText).toContain('STRIKE: Power Plant');
  expect(unlockedState.selectionText).toContain('STATUS: RTB');
  expect(unlockedState.selectionText).toContain('AMMO: 2/2');
  expect(unlockedState.aaSelectionText).toContain('AA LOCK: Harrier');

  const aiState = await page.evaluate(() => {
    const game = (window as any).game;
    const ai = game.players[1];
    const human = game.players[0];

    ai.money = 4200;
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
    ];
    human.units = [
      game.createUnit('soldier', 16, 12, 0),
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

  expect([aiState.training, ...aiState.queue]).toContain('harrier');
});
