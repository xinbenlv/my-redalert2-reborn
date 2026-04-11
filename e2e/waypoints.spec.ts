import { expect, test } from '@playwright/test';

test('shift-right-click queues movement waypoints and consumes them in order', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const soldier = game.createUnit('soldier', 10, 10, 0);
    player.units.push(soldier);
    game.selected = [soldier];
    game.updateSelectionInfo();
  });

  await page.evaluate(() => {
    const game = (window as any).game;
    for (const [tx, ty] of [[14, 10], [18, 10], [18, 14]]) {
      const screen = game.renderer3d.tileToScreen(tx, ty);
      game.onRightClick({ clientX: screen.x, clientY: screen.y, shiftKey: true });
    }
  });

  const queuedState = await page.evaluate(() => {
    const game = (window as any).game;
    const soldier = game.players[0].units[0];
    return {
      state: soldier.state,
      target: soldier.target,
      waypointQueue: soldier.waypointQueue,
      text: document.getElementById('selection-info')?.textContent || '',
      eva: document.getElementById('eva-message')?.textContent || '',
    };
  });

  expect(queuedState.state).toBe('moving');
  expect(Math.round(queuedState.target?.x ?? -1)).toBe(14);
  expect(Math.round(queuedState.target?.y ?? -1)).toBe(10);
  expect(queuedState.waypointQueue).toHaveLength(2);
  expect(Math.round(queuedState.waypointQueue[0].x)).toBe(18);
  expect(Math.round(queuedState.waypointQueue[0].y)).toBe(10);
  expect(Math.round(queuedState.waypointQueue[1].x)).toBe(18);
  expect(Math.round(queuedState.waypointQueue[1].y)).toBe(14);
  expect(queuedState.text).toContain('WAYPOINTS: 2 queued');
  expect(queuedState.eva.toLowerCase()).toContain('waypoint queued');

  const progressedState = await page.evaluate(() => {
    const game = (window as any).game;
    const soldier = game.players[0].units[0];
    for (let i = 0; i < 220; i++) {
      game.update(100);
      if ((soldier.waypointQueue?.length || 0) === 1 && soldier.target?.x >= 17.5 && soldier.target?.x <= 18.5 && soldier.target?.y >= 9.5 && soldier.target?.y <= 10.5) {
        break;
      }
    }
    game.updateSelectionInfo();
    return {
      state: soldier.state,
      target: soldier.target,
      waypointQueue: soldier.waypointQueue,
      text: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(progressedState.state).toBe('moving');
  expect(progressedState.waypointQueue).toHaveLength(1);
  expect(Math.round(progressedState.target?.x ?? -1)).toBe(18);
  expect(Math.round(progressedState.target?.y ?? -1)).toBe(10);
  expect(progressedState.text).toContain('WAYPOINTS: 1 queued');

  const finalState = await page.evaluate(() => {
    const game = (window as any).game;
    const soldier = game.players[0].units[0];
    for (let i = 0; i < 320; i++) {
      game.update(100);
      if (soldier.state === 'idle' && (!soldier.waypointQueue || soldier.waypointQueue.length === 0)) {
        break;
      }
    }
    game.updateSelectionInfo();
    return {
      state: soldier.state,
      target: soldier.target,
      waypointQueue: soldier.waypointQueue,
      position: { x: soldier.x, y: soldier.y },
      text: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(finalState.state).toBe('idle');
  expect(finalState.target).toBeNull();
  expect(finalState.waypointQueue).toHaveLength(0);
  expect(finalState.position.x).toBeCloseTo(18, 0);
  expect(finalState.position.y).toBeCloseTo(14, 0);
  expect(finalState.text).not.toContain('WAYPOINTS:');
});

test('queued waypoints survive auto-engage and resume afterward', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];
    player.units = [];
    enemy.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];
    enemy.buildings = [game.createBuilding('constructionYard', 30, 30, 1)];

    const soldier = game.createUnit('soldier', 10, 10, 0);
    const bait = game.createUnit('soldier', 13.5, 10, 1);
    bait.hp = 1;
    bait.maxHp = 50;
    player.units.push(soldier);
    enemy.units.push(bait);
    game.selected = [soldier];
    game.updateSelectionInfo();
  });

  await page.evaluate(() => {
    const game = (window as any).game;
    for (const [tx, ty] of [[15, 10], [18, 10]]) {
      const screen = game.renderer3d.tileToScreen(tx, ty);
      game.onRightClick({ clientX: screen.x, clientY: screen.y, shiftKey: true });
    }
  });

  const resumedState = await page.evaluate(() => {
    const game = (window as any).game;
    const soldier = game.players[0].units[0];
    const enemy = game.players[1].units[0];
    let sawEngage = false;
    for (let i = 0; i < 220; i++) {
      game.update(100);
      if (soldier.state === 'engaging' || soldier.state === 'attacking') sawEngage = true;
      if (sawEngage && enemy.state === 'dead' && soldier.state === 'moving') {
        break;
      }
    }
    game.updateSelectionInfo();
    return {
      sawEngage,
      enemyDead: enemy.state === 'dead',
      state: soldier.state,
      target: soldier.target,
      waypointQueue: soldier.waypointQueue,
      text: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(resumedState.sawEngage).toBe(true);
  expect(resumedState.enemyDead).toBe(true);
  expect(resumedState.state).toBe('moving');
  expect(Math.round(resumedState.target?.x ?? -1)).toBeGreaterThanOrEqual(15);
  expect(Math.round(resumedState.target?.y ?? -1)).toBe(10);
  expect(resumedState.waypointQueue.length).toBeLessThanOrEqual(1);
  if (resumedState.waypointQueue.length === 1) {
    expect(Math.round(resumedState.waypointQueue[0].x)).toBe(18);
    expect(resumedState.text).toContain('WAYPOINTS: 1 queued');
  }

  const finalState = await page.evaluate(() => {
    const game = (window as any).game;
    const soldier = game.players[0].units[0];
    for (let i = 0; i < 260; i++) {
      game.update(100);
      if (soldier.state === 'idle') break;
    }
    return {
      state: soldier.state,
      position: { x: soldier.x, y: soldier.y },
      waypointQueue: soldier.waypointQueue,
    };
  });

  expect(finalState.state).toBe('idle');
  expect(finalState.waypointQueue).toHaveLength(0);
  expect(finalState.position.x).toBeCloseTo(18, 0);
  expect(finalState.position.y).toBeCloseTo(10, 0);
});
