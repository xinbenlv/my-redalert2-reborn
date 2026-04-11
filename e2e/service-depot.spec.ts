import { expect, test } from '@playwright/test';

test('service depot unlocks after war factory and repairs damaged vehicles on the pad', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(1000);

  const lockedState = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim());
    const card = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Service Depot')
    ) as HTMLElement | undefined;

    return {
      labels,
      className: card?.className || '',
      lockedText: card?.querySelector('.item-status')?.textContent || '',
      techChain: card?.querySelector('.item-tech-chain')?.textContent || '',
      lockedReason: card?.getAttribute('data-locked-reason') || '',
    };
  });

  expect(lockedState.labels).toContain('Service Depot');
  expect(lockedState.className).toContain('locked');
  expect(lockedState.lockedText).toContain('Next: Power Plant');
  expect(lockedState.techChain).toContain('War Factory');
  expect(lockedState.lockedReason).toContain('War Factory');

  const repairState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.money = 5000;

    const constructionYard = game.createBuilding('constructionYard', 5, 5, 0);
    const powerPlant = game.createBuilding('powerPlant', 9, 5, 0);
    const refinery = game.createBuilding('refinery', 12, 5, 0);
    const warFactory = game.createBuilding('warFactory', 16, 5, 0);
    const depot = game.createBuilding('serviceDepot', 20, 10, 0);
    player.buildings = [constructionYard, powerPlant, refinery, warFactory, depot];
    game.updateUI();

    const card = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Service Depot')
    ) as HTMLElement | undefined;

    player.units = [];
    const tank = game.createUnit('tank', depot.tx + depot.size / 2 - 0.5, depot.ty + depot.size / 2 - 0.5, 0);
    tank.hp = 40;
    tank.state = 'idle';
    const soldier = game.createUnit('soldier', depot.tx + depot.size / 2 - 0.2, depot.ty + depot.size / 2 - 0.2, 0);
    soldier.hp = 20;
    soldier.state = 'idle';
    player.units.push(tank, soldier);

    const moneyBefore = player.money;
    for (let i = 0; i < 20; i += 1) {
      game.update(50);
    }

    game.selected = [depot];
    game.updateSelectionInfo();

    return {
      unlockedClass: card?.className || '',
      tankHp: tank.hp,
      soldierHp: soldier.hp,
      moneySpent: moneyBefore - player.money,
      repairingUnitType: depot.repairingUnit?.type || null,
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(repairState.unlockedClass).not.toContain('locked');
  expect(repairState.tankHp).toBeGreaterThan(90);
  expect(repairState.soldierHp).toBe(20);
  expect(repairState.moneySpent).toBeGreaterThan(0);
  expect(repairState.repairingUnitType).toBe('tank');
  expect(repairState.selectionText).toContain('Service Depot');
  expect(repairState.selectionText).toContain('Servicing: Rhino Tank');
});
