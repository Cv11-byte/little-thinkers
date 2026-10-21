import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { holdHome, seedLevels } from './helpers';
import { seedWorkout, solveCurrent } from './solver';
import { traceGameFor } from '../src/workout/plan';

test('language button cycles English → Español → Both, and Both shows two lines', async ({ page }) => {
  await seedLevels(page, 'kid1', {});
  await page.goto('/');
  await page.getByTestId('lang-en').click();
  await page.getByTestId('kid-kid1').click();
  const btn = page.getByTestId('lang-toggle');
  await expect(btn).toHaveAttribute('data-mode', 'en');
  await expect(page.getByTestId('tile-rocket-maze')).toContainText('Rocket Maze');
  await expect(page.getByTestId('tile-rocket-maze')).not.toContainText('Laberinto');
  await btn.click();
  await expect(btn).toHaveAttribute('data-mode', 'es');
  await expect(page.getByTestId('tile-rocket-maze')).toContainText('Laberinto Espacial');
  await expect(page.getByTestId('tile-rocket-maze')).not.toContainText('Rocket Maze');
  await btn.click();
  await expect(btn).toHaveAttribute('data-mode', 'both');
  await expect(page.locator('[data-testid=tile-rocket-maze] .bi-es')).toHaveText('Laberinto Espacial');
  await expect(page.locator('[data-testid=tile-rocket-maze] .bi-en')).toHaveText('Rocket Maze');
  // also available inside a game
  await page.getByTestId('tile-who-says').click();
  await page.getByTestId('lang-toggle').click();
  await expect(page.getByTestId('lang-toggle')).toHaveAttribute('data-mode', 'en');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('little-thinkers:v1')!));
  expect(saved.settings.lang).toBe('en');
});

test('Brain Workout: games, a move break, the boss, then goodbye; once a day', async ({ page }) => {
  test.setTimeout(240_000);
  await seedWorkout(page, 10);
  await page.goto('/');
  await page.getByTestId('kid-kid1').click();
  await page.getByTestId('workout-start').click({ force: true });
  await page.getByTestId('workout-intro').waitFor();
  await page.getByTestId('workout-go').click({ force: true });

  const seen = new Set<string>();
  let checkedMap = false;
  for (let guard = 0; guard < 600; guard++) {
    if (await page.getByTestId('workout-goodbye').count()) break;
    if (await page.getByTestId('workout-map').count()) {
      // after a game, the map says it's finished, and waits for the bar to fill before the next game
      if (!checkedMap && seen.size > 0 && (await page.getByTestId('station-done').count())) {
        checkedMap = true;
        await expect(page.getByTestId('station-countdown')).toHaveAttribute('data-full', 'false');
        await page.waitForTimeout(2500);
        await expect(page.getByTestId('workout-map')).toBeVisible();
      }
      await page.waitForTimeout(300);
      continue;
    }
    if (await page.getByTestId('move-break').count()) {
      seen.add('move');
      await page.waitForTimeout(300);
      continue;
    }
    const gs = page.getByTestId('game-screen');
    if (await gs.count()) {
      if ((await gs.getAttribute('data-phase')) !== 'play') {
        await page.waitForTimeout(300);
        continue;
      }
      seen.add((await gs.getAttribute('data-game'))!);
      const round = await gs.getAttribute('data-round');
      await solveCurrent(page);
      await page.waitForFunction(
        (r) => {
          const el = document.querySelector('[data-testid=game-screen]');
          return !el || el.getAttribute('data-phase') !== 'play' || el.getAttribute('data-round') !== r;
        },
        round,
        { timeout: 15000 },
      );
      continue;
    }
    await page.waitForTimeout(300);
  }
  await expect(page.getByTestId('workout-goodbye')).toBeVisible();
  expect(checkedMap).toBe(true);
  expect([...seen].sort()).toEqual(['move', 'pop-balloons', 'rocket-rescue', 'shape-puzzle', traceGameFor(new Date()), 'who-says'].sort());

  // finished today is saved; the goodbye screen only opens for a grown-up
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('little-thinkers:v1')!));
  expect(saved.kids.kid1.workouts.length).toBe(1);
  await page.getByTestId('goodbye-parent').click();
  await expect(page.getByTestId('parent-gate')).toBeVisible();
  await page.getByTestId('gate-cancel').click();
  await expect(page.getByTestId('workout-goodbye')).toBeVisible();

  // second try the same day does not start a new workout
  await page.reload();
  await page.getByTestId('kid-kid1').click();
  await expect(page.getByTestId('workout-start')).toHaveAttribute('data-done', 'true');
  await page.getByTestId('workout-start').click({ force: true });
  await expect(page.getByTestId('menu-screen')).toBeVisible();
});

test('Brain Workout can be paused and stopped', async ({ page }) => {
  await seedWorkout(page, 20);
  await page.goto('/');
  await page.getByTestId('kid-kid1').click();
  await page.getByTestId('workout-start').click({ force: true });
  await page.getByTestId('workout-go').click({ force: true });
  await page.getByTestId('game-screen').waitFor({ timeout: 12000 });
  await holdHome(page);
  await expect(page.getByTestId('workout-paused')).toBeVisible();
  await page.getByTestId('resume').click();
  await expect(page.getByTestId('workout-paused')).toHaveCount(0);
  await holdHome(page);
  await page.getByTestId('quit-workout').click();
  await expect(page.getByTestId('menu-screen')).toBeVisible();
  await expect(page.getByTestId('workout-start')).toHaveAttribute('data-done', 'false');
});

test('nothing gets stuck even if the iPad voice is blocked (moves on with no extra taps)', async ({ page }) => {
  test.setTimeout(120_000);
  await seedWorkout(page, 10);
  await page.addInitScript(() => {
    const raw = JSON.parse(localStorage.getItem('little-thinkers:v1')!);
    raw.settings.voice = true;
    localStorage.setItem('little-thinkers:v1', JSON.stringify(raw));
    // simulate a sandbox where speech throws or never finishes
    const s = window.speechSynthesis as unknown as { speak: () => void };
    s.speak = () => {
      throw new Error('blocked');
    };
  });
  await page.goto('/');
  await page.getByTestId('kid-kid1').click();
  await page.getByTestId('workout-start').click({ force: true });
  await page.getByTestId('workout-go').click({ force: true });
  // map → first game by itself
  await page.getByTestId('game-screen').waitFor({ timeout: 12000 });
  const first = await page.getByTestId('game-screen').getAttribute('data-game');
  // finish all rounds of the first game; the workout must move to the next stop on its own
  for (let r = 0; r < 2; r++) {
    await solveCurrent(page);
    await page.waitForFunction(
      (r) => {
        const el = document.querySelector('[data-testid=game-screen]');
        return !el || el.getAttribute('data-round') !== String(r) || el.getAttribute('data-phase') !== 'play';
      },
      r,
      { timeout: 15000 },
    );
    if (r === 0) await page.waitForFunction(() => document.querySelector('[data-testid=game-screen]')?.getAttribute('data-round') === '1', undefined, { timeout: 15000 });
  }
  await page.getByTestId('workout-map').waitFor({ timeout: 15000 });
  await page.waitForFunction((g) => document.querySelector('[data-testid=game-screen]')?.getAttribute('data-game') !== g && !!document.querySelector('[data-testid=game-screen]'), first, { timeout: 15000 });
});

test('every line spoken during a full workout is in the voice catalog', async ({ page }) => {
  test.setTimeout(900_000);
  const catalog = JSON.parse(readFileSync('voices/phrases.json', 'utf8')) as { lang: string; text: string }[];
  const have = new Set(catalog.map((l) => l.lang + '|' + l.text));
  await page.addInitScript(() => {
    (window as unknown as { __spoken: unknown[] }).__spoken = [];
  });
  await seedWorkout(page, 30);
  await page.goto('/');
  await page.getByTestId('kid-kid1').click();
  await page.getByTestId('workout-start').click({ force: true });
  await page.getByTestId('workout-go').click({ force: true });
  for (let guard = 0; guard < 900; guard++) {
    if (await page.getByTestId('workout-goodbye').count()) break;
    const gs = page.getByTestId('game-screen');
    if ((await gs.count()) && (await gs.getAttribute('data-phase')) === 'play') {
      const round = await gs.getAttribute('data-round');
      const game = await gs.getAttribute('data-game');
      await solveCurrent(page);
      await page.waitForFunction(
        ([r, g]) => {
          const el = document.querySelector('[data-testid=game-screen]');
          return !el || el.getAttribute('data-phase') !== 'play' || el.getAttribute('data-round') !== r || el.getAttribute('data-game') !== g;
        },
        [round, game],
        { timeout: 20000 },
      );
      continue;
    }
    await page.waitForTimeout(300);
  }
  await page.getByTestId('workout-goodbye').waitFor();
  const spoken = (await page.evaluate(() => (window as unknown as { __spoken: { en: string; es: string; alt?: { en: string; es: string } }[] }).__spoken)) ?? [];
  const missing = new Set<string>();
  for (const ph of spoken)
    for (const lang of ['en', 'es'] as const) {
      const t = (ph.alt ?? ph)[lang].replace(/\s+/g, ' ').trim();
      if (!have.has(lang + '|' + t)) missing.add(lang + '|' + t);
    }
  expect([...missing]).toEqual([]);
});
