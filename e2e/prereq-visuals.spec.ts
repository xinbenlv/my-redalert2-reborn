import { expect, test } from '@playwright/test';

test('locked build cards expose the dependency chain and next unlock step', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(1000);

  const lockedAirfield = await page.evaluate(() => {
    const card = document.querySelector('.build-item[data-type="airfield"]') as HTMLElement | null;
    return {
      className: card?.className || '',
      status: card?.querySelector('.item-status')?.textContent || '',
      tech: card?.querySelector('.item-tech-chain')?.textContent || '',
      title: card?.getAttribute('title') || '',
    };
  });

  expect(lockedAirfield.className).toContain('locked');
  expect(lockedAirfield.status).toContain('Next: Power Plant');
  expect(lockedAirfield.tech).toContain('Construction Yard');
  expect(lockedAirfield.tech).toContain('Power Plant');
  expect(lockedAirfield.tech).toContain('Radar Dome');
  expect(lockedAirfield.tech).toContain('War Factory');
  expect(lockedAirfield.title).toContain('✗ Power Plant');

  await page.evaluate(() => {
    (document.querySelector('.build-item[data-type="airfield"]') as HTMLElement | null)?.click();
  });
  await expect(page.locator('#eva-message')).toContainText('Airfield locked. Next: Power Plant. Missing: Power Plant, Radar Dome, War Factory.');

  const unlockedAirfield = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.money = 9999;
    player.buildings = [
      game.createBuilding('constructionYard', 5, 5, 0),
      game.createBuilding('powerPlant', 9, 5, 0),
      game.createBuilding('barracks', 12, 5, 0),
      game.createBuilding('radarDome', 16, 5, 0),
      game.createBuilding('refinery', 20, 5, 0),
      game.createBuilding('warFactory', 24, 5, 0),
    ];
    game.updateUI();

    const card = document.querySelector('.build-item[data-type="airfield"]') as HTMLElement | null;
    return {
      className: card?.className || '',
      status: card?.querySelector('.item-status')?.textContent || '',
      tech: card?.querySelector('.item-tech-chain')?.textContent || '',
      title: card?.getAttribute('title') || '',
    };
  });

  expect(unlockedAirfield.className).not.toContain('locked');
  expect(unlockedAirfield.status).toContain('Tech ready');
  expect(unlockedAirfield.tech).toContain('✓ Radar Dome');
  expect(unlockedAirfield.tech).toContain('✓ War Factory');
  expect(unlockedAirfield.title).toContain('✓ War Factory');
});
