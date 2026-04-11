import { expect, test } from '@playwright/test';

test('combat units promote to veteran and elite with real stat bonuses and visible rank feedback', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const veterancyState = await page.evaluate(() => {
    const game = (window as any).game;
    const soldier = game.createUnit('soldier', 10, 10, 0);
    const target = game.createUnit('soldier', 11, 10, 1);
    const refinery = game.createBuilding('refinery', 14, 14, 1);

    game.players[0].units.push(soldier);
    game.players[1].units.push(target);
    game.players[1].buildings.push(refinery);

    const base = {
      hp: soldier.maxHp,
      damage: soldier.damage,
      fireRate: soldier.fireRate,
      rank: soldier.veterancyRank,
    };

    game.grantVeterancy(soldier, 80);
    const veteran = {
      hp: soldier.maxHp,
      damage: soldier.damage,
      fireRate: soldier.fireRate,
      rank: soldier.veterancyRank,
      xp: soldier.veterancyXp,
    };

    game.grantVeterancy(soldier, 100);
    const elite = {
      hp: soldier.maxHp,
      damage: soldier.damage,
      fireRate: soldier.fireRate,
      rank: soldier.veterancyRank,
      xp: soldier.veterancyXp,
    };

    soldier.veterancyXp = 0;
    game.applyVeterancyBonuses(soldier, 'rookie');
    soldier.hp = soldier.maxHp;
    game.selected = [soldier];
    game.updateSelectionInfo();

    game.markUnitDestroyed(target, soldier.owner, soldier);
    target.deadTimer = 0;
    game.markBuildingDestroyed(refinery, soldier.owner, { attackerUnit: soldier });
    game.updateSelectionInfo();

    return {
      base,
      veteran,
      elite,
      afterKills: {
        rank: soldier.veterancyRank,
        xp: soldier.veterancyXp,
        hp: soldier.maxHp,
        damage: soldier.damage,
        fireRate: soldier.fireRate,
      },
      selectionText: document.getElementById('selection-info')?.textContent || '',
      eva: document.getElementById('eva-message')?.textContent || '',
    };
  });

  expect(veterancyState.base.rank).toBe('rookie');
  expect(veterancyState.veteran.rank).toBe('veteran');
  expect(veterancyState.veteran.xp).toBe(80);
  expect(veterancyState.veteran.hp).toBeGreaterThan(veterancyState.base.hp);
  expect(veterancyState.veteran.damage).toBeGreaterThan(veterancyState.base.damage);
  expect(veterancyState.veteran.fireRate).toBeLessThan(veterancyState.base.fireRate);

  expect(veterancyState.elite.rank).toBe('elite');
  expect(veterancyState.elite.xp).toBe(180);
  expect(veterancyState.elite.hp).toBeGreaterThan(veterancyState.veteran.hp);
  expect(veterancyState.elite.damage).toBeGreaterThan(veterancyState.veteran.damage);
  expect(veterancyState.elite.fireRate).toBeLessThan(veterancyState.veteran.fireRate);

  expect(veterancyState.afterKills.rank).toBe('veteran');
  expect(veterancyState.afterKills.xp).toBe(95);
  expect(veterancyState.selectionText).toContain('RANK: Veteran');
  expect(veterancyState.selectionText).toContain('XP: 95/180');
  expect(veterancyState.eva).toContain('promoted to Veteran');
});
