import { expect, test } from '@playwright/test';

test('barracks roster includes rocket and flak infantry with differentiated combat roles', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(1000);

  await page.click('.build-tab[data-tab="units"]');

  const rosterLabels = await page.locator('.build-item .item-label').allTextContents();
  expect(rosterLabels).toEqual(expect.arrayContaining(['Soldier', 'Rocket Infantry', 'Flak Trooper']));

  await page.locator('.build-item').filter({ hasText: 'Rocket Infantry' }).click();
  await page.locator('.build-item').filter({ hasText: 'Flak Trooper' }).click();

  const queueState = await page.evaluate(() => {
    const game = (window as any).game;
    const barracks = game.players[0].buildings.find((b: any) => b.type === 'barracks');
    return {
      training: barracks.training,
      queued: [...barracks.trainQueue],
      money: game.players[0].money,
    };
  });

  expect(queueState.training).toBe('rocketInfantry');
  expect(queueState.queued).toContain('flakTrooper');
  expect(queueState.money).toBeLessThan(6500);

  const damageProfiles = await page.evaluate(() => {
    const game = (window as any).game;
    const rocket = game.createUnit('rocketInfantry', 10, 10, 0);
    const flak = game.createUnit('flakTrooper', 10, 10, 0);
    const soldier = game.createUnit('soldier', 10, 10, 0);
    const tank = game.createUnit('tank', 11, 10, 1);
    const enemySoldier = game.createUnit('soldier', 11, 10, 1);
    return {
      rocketVsTank: game.getDamageAgainstTarget(rocket.damage, rocket.damageProfile, tank),
      soldierVsTank: game.getDamageAgainstTarget(soldier.damage, soldier.damageProfile, tank),
      flakVsInfantry: game.getDamageAgainstTarget(flak.damage, flak.damageProfile, enemySoldier),
      rocketVsInfantry: game.getDamageAgainstTarget(rocket.damage, rocket.damageProfile, enemySoldier),
      rocketRange: rocket.range,
      flakRange: flak.range,
    };
  });

  expect(damageProfiles.rocketVsTank).toBeGreaterThan(damageProfiles.soldierVsTank);
  expect(damageProfiles.flakVsInfantry).toBeGreaterThan(damageProfiles.rocketVsInfantry);
  expect(damageProfiles.rocketRange).toBeGreaterThanOrEqual(6);
  expect(damageProfiles.flakRange).toBeGreaterThanOrEqual(5);
});
