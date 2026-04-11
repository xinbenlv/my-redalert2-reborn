import { expect, test } from '@playwright/test';

test('sandbag walls unlock early, place as 1x1 blockers, and render on the battlefield', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const lockedState = await page.evaluate(() => {
    const wallCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Sandbag Wall')
    ) as HTMLElement | undefined;

    return {
      labels: Array.from(document.querySelectorAll('.build-item .item-label')).map((node) => node.textContent?.trim()),
      className: wallCard?.className || '',
      status: wallCard?.querySelector('.item-status')?.textContent || '',
    };
  });

  expect(lockedState.labels).toContain('Sandbag Wall');
  expect(lockedState.className).toContain('locked');
  expect(lockedState.status).toContain('Construction Yard');

  const builtState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const cy = game.createBuilding('constructionYard', 8, 8, 0);
    const plant = game.createBuilding('powerPlant', 12, 8, 0);
    player.buildings.push(cy, plant);
    player.money = 5000;
    game.updateUI();

    const wallCard = Array.from(document.querySelectorAll('.build-item')).find((node) =>
      node.querySelector('.item-label')?.textContent?.includes('Sandbag Wall')
    ) as HTMLElement | undefined;

    const wall = game.createBuilding('sandbagWall', 15, 15, 0);
    player.buildings.push(wall);
    game.renderer3d.addBuilding(wall, player.color);

    const blocker = game.canPlaceBuildingAt('sandbagWall', 15, 15);
    const adjacent = game.canPlaceBuildingAt('sandbagWall', 16, 15);
    const path = game.findPath(14, 15, 16, 15, wall);
    const mesh = game.renderer3d.buildingMeshes.get(wall);

    return {
      className: wallCard?.className || '',
      status: wallCard?.querySelector('.item-status')?.textContent || '',
      hp: wall.hp,
      size: wall.size,
      cost: (window as any).BUILD_TYPES.sandbagWall.cost,
      blocker,
      adjacent,
      pathLength: path?.length || 0,
      meshType: mesh?.userData?.modelType || null,
    };
  });

  expect(builtState.className).not.toContain('locked');
  expect(builtState.status).toBe('');
  expect(builtState.hp).toBe(260);
  expect(builtState.size).toBe(1);
  expect(builtState.cost).toBe(100);
  expect(builtState.blocker).toBe(false);
  expect(builtState.adjacent).toBe(true);
  expect(builtState.pathLength).toBeGreaterThan(2);
  expect(builtState.meshType).toBe('sandbagWall');
});
