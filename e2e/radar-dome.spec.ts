import { expect, test } from '@playwright/test';

test('radar dome controls minimap radar coverage and power status messaging', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));
  await page.waitForTimeout(1000);

  const buildingLabels = await page.locator('.build-item .item-label').allTextContents();
  expect(buildingLabels).toContain('Radar Dome');

  const initialRadarState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    game.updatePowerState(player);
    return {
      hasRadarBuilding: game.hasPoweredBuilding(player, 'radarDome'),
      hasOperationalRadar: game.hasOperationalRadar(player),
      powerText: document.getElementById('power-display')?.textContent,
    };
  });

  expect(initialRadarState.hasRadarBuilding).toBe(false);
  expect(initialRadarState.hasOperationalRadar).toBe(false);
  expect(initialRadarState.powerText).toContain('NO RADAR');

  const radarOnlineState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const dome = game.createBuilding('radarDome', 13, 13, 0);
    player.buildings.push(dome);
    game.selected = [dome];
    game.updatePowerState(player);
    game.updateSelectionInfo();
    game.renderMinimap();
    return {
      hasRadarBuilding: game.hasPoweredBuilding(player, 'radarDome'),
      hasOperationalRadar: game.hasOperationalRadar(player),
      radarStatus: document.getElementById('power-display')?.textContent,
      domeStatus: document.getElementById('selection-info')?.textContent,
    };
  });

  expect(radarOnlineState.hasRadarBuilding).toBe(true);
  expect(radarOnlineState.hasOperationalRadar).toBe(true);
  expect(radarOnlineState.radarStatus).toContain('RADAR ONLINE');
  expect(radarOnlineState.domeStatus).toContain('Radar online');

  const radarOfflineState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const powerPlant = player.buildings.find((building: any) => building.type === 'powerPlant');
    powerPlant.hp = 0;
    game.updatePowerState(player);
    game.renderMinimap();
    return {
      hasOperationalRadar: game.hasOperationalRadar(player),
      radarStatus: document.getElementById('power-display')?.textContent,
      selectionStatus: document.getElementById('selection-info')?.textContent,
    };
  });

  expect(radarOfflineState.hasOperationalRadar).toBe(false);
  expect(radarOfflineState.radarStatus).toContain('LOW POWER');
  expect(radarOfflineState.radarStatus).toContain('RADAR OFFLINE');
  expect(radarOfflineState.selectionStatus).toContain('Radar offline');
});
