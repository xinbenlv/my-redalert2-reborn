import { expect, test } from '@playwright/test';

test('opening auto-deploys the starting MCV into a Construction Yard and produced MCVs can deploy manually', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => Boolean((window as any).game));

  await page.waitForFunction(() => {
    const game = (window as any).game;
    return game.players[0].buildings.some((building: any) => building.type === 'constructionYard');
  });

  const openingState = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    return {
      buildingTypes: player.buildings.map((building: any) => building.type),
      remainingMcvs: player.units.filter((unit: any) => unit.type === 'mcv' && unit.state !== 'dead').length,
      supportGranted: player.startingBaseGranted,
    };
  });

  expect(openingState.buildingTypes).toEqual(expect.arrayContaining(['constructionYard', 'powerPlant', 'refinery', 'barracks']));
  expect(openingState.remainingMcvs).toBe(0);
  expect(openingState.supportGranted).toBe(true);

  const manualDeploy = await page.evaluate(() => {
    const game = (window as any).game;
    const player = game.players[0];
    const before = player.buildings.filter((building: any) => building.type === 'constructionYard').length;
    const extraMcv = game.createUnit('mcv', 18, 18, 0);
    player.units.push(extraMcv);
    const canDeploy = game.canDeployMCV(extraMcv);
    const deployed = game.deployMCV(extraMcv);
    const after = player.buildings.filter((building: any) => building.type === 'constructionYard').length;
    game.selected = [player.buildings.find((building: any) => building.type === 'constructionYard' && building.tx >= 17) || player.buildings[0]];
    game.updateSelectionInfo();
    return {
      canDeploy,
      deployed,
      before,
      after,
      selectionText: document.getElementById('selection-info')?.textContent || '',
    };
  });

  expect(manualDeploy.canDeploy).toBe(true);
  expect(manualDeploy.deployed).toBe(true);
  expect(manualDeploy.after).toBe(manualDeploy.before + 1);
  await expect(page.locator('#selection-info')).toContainText('Construction Yard');
});
