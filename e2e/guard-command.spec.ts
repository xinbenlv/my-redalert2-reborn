import { expect, test } from '@playwright/test';

test('selection panel and hotkey arm guard mode', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    player.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];

    const rhino = game.createUnit('tank', 12, 12, 0);
    const harvester = game.createUnit('harvester', 14, 12, 0);
    player.units.push(rhino, harvester);
    game.selected = [rhino];
    game.updateSelectionInfo();
  });

  await expect(page.locator('#selection-info [data-action="guard"]')).toHaveCount(1);
  await page.keyboard.press('q');

  const armed = await page.evaluate(() => ({
    commandMode: (window as any).game.commandMode,
    text: document.getElementById('selection-info')?.textContent || '',
    eva: document.getElementById('eva-message')?.textContent || '',
  }));

  expect(armed.commandMode).toBe('set-guard');
  expect(armed.text).toContain('Placing Guard');
  expect(armed.eva).toContain('guard');
});

test('guard command protects a friendly harvester and stays assigned after the interception', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  const result = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const enemy = game.players[1];
    player.units = [];
    enemy.units = [];
    player.buildings = [game.createBuilding('constructionYard', 6, 6, 0)];
    enemy.buildings = [game.createBuilding('constructionYard', 28, 28, 1)];
    game.players.slice(2).forEach((other: any) => {
      other.units = [];
      other.buildings = [];
    });

    const guard = game.createUnit('tank', 12, 12, 0);
    const harvester = game.createUnit('harvester', 15, 12, 0);
    const attacker = game.createUnit('soldier', 18, 12, 1);
    player.units.push(guard, harvester);
    enemy.units.push(attacker);

    game.selected = [guard];
    game.updateSelectionInfo();
    game.toggleGuardMode();
    const screen = game.renderer3d.tileToScreen(harvester.x, harvester.y);
    game.onRightClick({ clientX: screen.x, clientY: screen.y });
    game.updateSelectionInfo();

    const assigned = {
      commandMode: game.commandMode,
      guardTargetType: guard.guardTarget?.type ?? null,
      guardState: guard.state,
      text: document.getElementById('selection-info')?.textContent || '',
      eva: document.getElementById('eva-message')?.textContent || '',
    };

    harvester.x = 16.5;
    harvester.y = 12;
    for (let i = 0; i < 100; i++) game.update(100);
    for (let i = 0; i < 20; i++) game.update(100);
    game.updateSelectionInfo();

    return {
      assigned,
      enemyState: attacker.state,
      enemyHp: attacker.hp,
      guardState: guard.state,
      guardTargetType: guard.guardTarget?.type ?? null,
      guardDistanceToHarvester: Math.hypot(guard.x - harvester.x, guard.y - harvester.y),
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(result.assigned.commandMode).toBeNull();
  expect(result.assigned.guardTargetType).toBe('harvester');
  expect(result.assigned.text).toContain('GUARD: Harvester');
  expect(result.assigned.eva).toContain('guarding Harvester');
  expect(result.enemyState).toBe('dead');
  expect(result.enemyHp).toBeLessThanOrEqual(0);
  expect(result.guardTargetType).toBe('harvester');
  expect(['guarding', 'engaging']).toContain(result.guardState);
  expect(result.guardDistanceToHarvester).toBeLessThan(2.2);
  expect(result.selectionText).toContain('GUARD: Harvester');
});
