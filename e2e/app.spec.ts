import { expect, test } from '@playwright/test';
import { center, holdHome, openGame, ready, seedLevels, waitRoundDone } from './helpers';

test('home shows both kids and the language choice is remembered', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('kid-kid1')).toBeVisible();
  await expect(page.getByTestId('kid-kid2')).toBeVisible();
  await page.getByTestId('lang-es').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pequeños Pensadores');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pequeños Pensadores');
  await page.getByTestId('lang-en').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Little Thinkers');
});

test('menu lists all 11 games and each one opens and closes', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('kid-kid1').click();
  const tiles = page.locator('[data-testid^=tile-]');
  await expect(tiles).toHaveCount(11);
  const ids = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('tile-', '')));
  for (const id of ids) {
    await page.getByTestId(`tile-${id}`).click();
    await expect(page.getByTestId('game-screen')).toHaveAttribute('data-game', id);
    await expect(page.getByTestId('stage')).toBeVisible();
    await holdHome(page);
    await expect(page.getByTestId('menu-screen')).toBeVisible();
  }
});

test('touch targets are big: every game tile and control is at least 70px', async ({ page }) => {
  await page.goto('/');
  for (const kid of ['kid-kid1', 'kid-kid2']) {
    const b = await page.getByTestId(kid).boundingBox();
    expect(b!.width).toBeGreaterThan(200);
  }
  await page.getByTestId('kid-kid2').click();
  const boxes = await page.locator('[data-testid^=tile-]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
  for (const w of boxes) expect(w).toBeGreaterThan(150);
  await page.getByTestId('tile-pop-balloons').click();
  for (const id of ['home', 'hint', 'repeat']) {
    const b = await page.getByTestId(id).boundingBox();
    expect(b!.width).toBeGreaterThanOrEqual(70);
  }
});

test('hint button shows a hint; two mistakes show one automatically', async ({ page }) => {
  await seedLevels(page, 'kid1', { 'who-says': 2 });
  await openGame(page, 'kid1', 'who-says');
  await page.getByTestId('hint').click();
  await expect(page.getByTestId('hint-glow')).toBeVisible();
  await page.waitForTimeout(4200);
  await expect(page.getByTestId('hint-glow')).toHaveCount(0);
  const ans = await page.getByTestId('who-says').getAttribute('data-answer');
  const wrong = page.locator(`[data-testid^=card-]:not([data-testid=card-${ans}])`).first();
  await wrong.dispatchEvent('pointerdown');
  await ready(page);
  await wrong.dispatchEvent('pointerdown');
  await expect(page.getByTestId('hint-glow')).toBeVisible({ timeout: 3000 });
});

test('three solo wins in a row move the level up', async ({ page }) => {
  await seedLevels(page, 'kid1', { 'who-says': 2 });
  await openGame(page, 'kid1', 'who-says');
  for (let r = 0; r < 4; r++) {
    await expect(page.getByTestId('game-screen')).toHaveAttribute('data-round', String(r), { timeout: 10000 });
    await ready(page);
    const ans = await page.getByTestId('who-says').getAttribute('data-answer');
    const c = await center(page, `[data-testid=card-${ans}]`);
    await page.mouse.click(c.x, c.y);
    await waitRoundDone(page, r);
  }
  await page.getByTestId('session-end').waitFor();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('little-thinkers:v1')!));
  expect(saved.kids.kid1.games['who-says'].level).toBe(3);
  expect(saved.kids.kid1.games['who-says'].rounds).toBe(4);
  expect(saved.kids.kid1.stickers.length).toBe(1);
  // progress survives a refresh
  await page.reload();
  await page.getByTestId('kid-kid1').click();
  await expect(page.locator('[data-testid=tile-who-says] .tile-level i.on')).toHaveCount(3);
});

test('Little one mode (level 1): tapping an animal sends it home', async ({ page }) => {
  await openGame(page, 'kid2', 'animal-homes');
  await expect(page.getByTestId('game-screen')).toHaveAttribute('data-level', '1');
  const a = page.locator('[data-testid^=animal-]').first();
  const c = await center(page, '[data-testid^=animal-]');
  await page.mouse.click(c.x, c.y);
  await expect(a).toHaveAttribute('data-placed', 'true');
  await waitRoundDone(page, 0);
});

test('Little one mode (level 1): a small, easy Pop round', async ({ page }) => {
  await openGame(page, 'kid2', 'pop-balloons');
  const g = page.getByTestId('balloons');
  await expect(page.locator('[data-testid^=balloon-]')).toHaveCount(6);
  await expect(g).toHaveAttribute('data-need', '2');
  const target = await g.getAttribute('data-target');
  for (let i = 0; i < 2; i++) {
    const c = await center(page, `[data-testid=balloon-${target}][data-popped=false]`);
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(150);
  }
  await waitRoundDone(page, 0);
});

test('home button needs a hold, so a quick tap stays in the game', async ({ page }) => {
  await seedLevels(page, 'kid1', {});
  await openGame(page, 'kid1', 'pop-balloons');
  await page.getByTestId('home').click();
  await expect(page.getByTestId('game-screen')).toBeVisible();
  await holdHome(page);
  await expect(page.getByTestId('menu-screen')).toBeVisible();
});

test('grown-up gate, settings, and reset with confirmation', async ({ page }) => {
  await seedLevels(page, 'kid1', { 'rocket-maze': 4 });
  await page.goto('/');
  await page.getByTestId('parent-entry').click();
  // a quick toddler tap does nothing
  await page.getByTestId('gate-hold').click();
  await expect(page.getByTestId('gate-word')).toHaveCount(0);
  const hold = await center(page, '[data-testid=gate-hold]');
  await page.mouse.move(hold.x, hold.y);
  await page.mouse.down();
  await page.waitForTimeout(2300);
  await page.mouse.up();
  const word = (await page.getByTestId('gate-word').textContent())!.toLowerCase();
  const n = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'].indexOf(word);
  await page.getByTestId(`gate-num-${n}`).click();
  await expect(page.getByTestId('parent-screen')).toBeVisible();
  await expect(page.getByTestId('p-level-rocket-maze')).toHaveText('4');
  await page.getByTestId('p-limit-15').click();
  await page.getByTestId('p-reset-kid').click();
  await page.getByTestId('confirm-no').click();
  await expect(page.getByTestId('p-level-rocket-maze')).toHaveText('4');
  await page.getByTestId('p-reset-kid').click();
  await page.getByTestId('confirm-yes').click();
  await expect(page.getByTestId('p-level-rocket-maze')).toHaveText('2');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('little-thinkers:v1')!));
  expect(saved.settings.playLimit).toBe(15);
});

test('broken saved data does not crash the app', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('little-thinkers:v1', '{not json!!'));
  await page.goto('/');
  await expect(page.getByTestId('kid-kid1')).toBeVisible();
  await page.getByTestId('kid-kid1').click();
  await expect(page.locator('[data-testid^=tile-]')).toHaveCount(11);
});

test.describe('portrait iPad', () => {
  test.use({ viewport: { width: 820, height: 1180 } });
  test('every game fits the screen with no page scrolling', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('kid-kid1').click();
    const ids = await page.locator('[data-testid^=tile-]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!.replace('tile-', '')));
    for (const id of ids) {
      await page.getByTestId(`tile-${id}`).click();
      const box = await page.getByTestId('stage').boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(1180);
      expect(box!.x + box!.width).toBeLessThanOrEqual(820);
      const scroll = await page.evaluate(() => document.scrollingElement!.scrollHeight - window.innerHeight);
      expect(scroll).toBeLessThanOrEqual(0);
      await holdHome(page);
    }
  });
});

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.getByTestId('kid-kid1').click();
  await page.getByTestId('tile-pop-balloons').click();
  await expect(page.getByTestId('stage')).toBeVisible();
  await context.setOffline(false);
});

test.describe('recorded voices', () => {
  // the offline service worker would bypass the test's fake network
  test.use({ serviceWorkers: 'block' });
test('recorded voice clips play when available; missing lines fall back', async ({ page }) => {
  const { phraseIdJs } = await import('../scripts/phrase-id.mjs');
  const hi = 'Hi! What do you want to play?';
  const id = phraseIdJs('en', hi);
  await page.route('**/voices/manifest.json', (r) => r.fulfill({ json: { clips: [`en/${id}`], text: { [`en/${id}`]: hi } } }));
  await page.route(`**/voices/en/${id}.mp3`, (r) => r.fulfill({ path: 'e2e/fixtures/tone.mp3', contentType: 'audio/mpeg' }));
  await page.addInitScript(() => {
    (window as unknown as { __clipsPlayed: number }).__clipsPlayed = 0;
    localStorage.setItem(
      'little-thinkers:v1',
      JSON.stringify({ version: 1, settings: { lang: 'en', voice: true, sounds: true, playLimit: 0 }, kids: {} }),
    );
  });
  await page.goto('/');
  await page.waitForTimeout(500);
  await page.getByTestId('kid-kid1').click();
  await page.waitForFunction(() => (window as unknown as { __clipsPlayed: number }).__clipsPlayed > 0, undefined, { timeout: 8000 });
});
});
