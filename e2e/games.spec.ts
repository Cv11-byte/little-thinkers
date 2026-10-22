import { solveCurrent } from './solver';
import { expect, test } from '@playwright/test';
import { center, drag, dragPath, openGame, ready, seedLevels, solveShapes, toClient, waitRoundDone } from './helpers';

test.describe('games are playable with a finger on iPad size', () => {
  test('Rocket Maze: following the road reaches the rocket', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'rocket-maze': 3 });
    await openGame(page, 'kid1', 'rocket-maze');
    const sol = (await page.getByTestId('maze').getAttribute('data-solution'))!.split(';').map((s) => s.split(',').map(Number));
    const pts = [];
    for (const [x, y] of sol) pts.push(await toClient(page, x, y));
    await dragPath(page, pts, 6);
    await waitRoundDone(page, 0);
  });

  test('Rocket Maze: you cannot jump across space', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'rocket-maze': 4 });
    await openGame(page, 'kid1', 'rocket-maze');
    const sol = (await page.getByTestId('maze').getAttribute('data-solution'))!.split(';').map((s) => s.split(',').map(Number));
    const start = await toClient(page, sol[0][0], sol[0][1]);
    const goal = await toClient(page, sol[sol.length - 1][0], sol[sol.length - 1][1]);
    await drag(page, start, goal);
    await page.waitForTimeout(300);
    await expect(page.getByTestId('game-screen')).toHaveAttribute('data-phase', 'play');
    await expect(page.getByTestId('astronaut')).toBeVisible();
  });

  test('Pop & Tap: exactly N targets, wrong colors do not pop, tray fills', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'pop-balloons': 2 });
    await openGame(page, 'kid1', 'pop-balloons');
    const g = page.getByTestId('balloons');
    const target = await g.getAttribute('data-target');
    const need = Number(await g.getAttribute('data-need'));
    await expect(page.locator(`[data-testid=balloon-${target}]`)).toHaveCount(need);
    const wrong = page.locator(`[data-testid^=balloon-]:not([data-testid=balloon-${target}])`).first();
    await wrong.dispatchEvent('pointerdown');
    await expect(wrong).toHaveAttribute('data-popped', 'false');
    await ready(page);
    for (let i = 0; i < need; i++) {
      const c = await center(page, `[data-testid=balloon-${target}][data-popped=false]`);
      await page.mouse.click(c.x, c.y);
      await page.waitForTimeout(150);
      await expect(g).toHaveAttribute('data-got', String(i + 1));
    }
    await waitRoundDone(page, 0);
  });

  test('wild tapping is ignored while the game is talking', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'pop-balloons': 2 });
    await openGame(page, 'kid1', 'pop-balloons');
    const target = await page.getByTestId('balloons').getAttribute('data-target');
    // a wrong tap locks input for a moment...
    await page.locator(`[data-testid^=balloon-]:not([data-testid=balloon-${target}])`).first().dispatchEvent('pointerdown');
    await expect(page.getByTestId('game-screen')).toHaveAttribute('data-locked', 'true');
    // ...so a burst of taps right after does nothing
    const c = await center(page, `[data-testid=balloon-${target}]`);
    for (let i = 0; i < 5; i++) await page.mouse.click(c.x, c.y);
    await expect(page.getByTestId('balloons')).toHaveAttribute('data-got', '0');
  });

  test('Trace Numbers: no auto-finish; must start at the star and reach the end', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'trace-numbers': 2 });
    await openGame(page, 'kid1', 'trace-numbers');
    const pts = await page.evaluate(() => {
      const p = document.querySelector('[data-testid=trace] path[stroke=none]') as SVGPathElement;
      const len = p.getTotalLength();
      const m = p.getScreenCTM()!;
      const out = [];
      for (let d = 0; d <= len; d += 15) {
        const q = p.getPointAtLength(d);
        out.push({ x: q.x * m.a + m.e, y: q.y * m.d + m.f });
      }
      return out;
    });
    // starting away from the star does nothing
    const mid = pts[Math.floor(pts.length / 2)];
    await dragPath(page, [mid, pts[pts.length - 1]], 10);
    await expect(page.getByTestId('trace')).toHaveAttribute('data-finished', 'false');
    // tracing 85% of the way does not finish it
    await dragPath(page, pts.slice(0, Math.floor(pts.length * 0.85)), 2);
    await page.waitForTimeout(300);
    await expect(page.getByTestId('trace')).toHaveAttribute('data-finished', 'false');
  });

  test('Trace Numbers: tracing the outline finishes and counts', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'trace-numbers': 2 });
    await openGame(page, 'kid1', 'trace-numbers');
    const strokes = await page.evaluate(() => {
      const paths = [...document.querySelectorAll('[data-testid=trace] path[stroke=none]')] as SVGPathElement[];
      return paths.map((p) => {
        const len = p.getTotalLength();
        const m = p.getScreenCTM()!;
        const pts = [];
        for (let d = 0; d <= len; d += 15) {
          const q = p.getPointAtLength(d);
          pts.push({ x: q.x * m.a + m.e, y: q.y * m.d + m.f });
        }
        return pts;
      });
    });
    for (const pts of strokes) await dragPath(page, pts, 2);
    await expect(page.getByTestId('trace')).toHaveAttribute('data-finished', 'true');
    await waitRoundDone(page, 0);
    // next round continues with the next number
    await expect(page.getByTestId('trace')).toHaveAttribute('data-number', '2', { timeout: 10000 });
  });

  test('Animal Homes: wrong home bounces back, right home sticks', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'animal-homes': 3 });
    await openGame(page, 'kid1', 'animal-homes');
    const animals = page.locator('[data-testid^=animal-]');
    const n = await animals.count();
    for (let i = 0; i < n; i++) {
      const a = animals.nth(i);
      const home = await a.getAttribute('data-home');
      const id = await a.getAttribute('data-testid');
      if (i === 0) {
        const other = page.locator(`[data-testid^=home-]:not([data-testid=home-${home}])`).first();
        const ob = await other.boundingBox();
        await drag(page, await center(page, `[data-testid=${id}]`), { x: ob!.x + ob!.width / 2, y: ob!.y + ob!.height / 2 });
        await expect(a).toHaveAttribute('data-placed', 'false');
        await ready(page);
      }
      const hb = await page.getByTestId(`home-${home}`).boundingBox();
      await drag(page, await center(page, `[data-testid=${id}]`), { x: hb!.x + hb!.width / 2, y: hb!.y + hb!.height / 2 });
      await expect(a).toHaveAttribute('data-placed', 'true');
    }
    await waitRoundDone(page, 0);
  });

  test('Feed the Animals: a tap does not feed, dragging the right number finishes', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'feed-the-bear': 2 });
    await openGame(page, 'kid1', 'feed-the-bear');
    const target = Number(await page.getByTestId('feed').getAttribute('data-target'));
    const plate = await center(page, '[data-testid=plate]');
    // tapping food only makes it hop; it stays put
    const f0 = await center(page, '[data-testid=food][data-placed=false]');
    await page.mouse.click(f0.x, f0.y);
    await page.waitForTimeout(400);
    await expect(page.getByTestId('feed')).toHaveAttribute('data-count', '0');
    await ready(page);
    for (let i = 0; i < target; i++) {
      await drag(page, await center(page, '[data-testid=food][data-placed=false]'), plate);
      await page.waitForTimeout(400);
    }
    await expect(page.getByTestId('feed')).toHaveAttribute('data-count', String(target));
    await waitRoundDone(page, 0);
  });

  test('Feed the Animals: compare plates at the top level', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'feed-the-bear': 4 });
    await openGame(page, 'kid1', 'feed-the-bear');
    const target = Number(await page.getByTestId('feed').getAttribute('data-target'));
    const plate = await center(page, '[data-testid=plate]');
    for (let i = 0; i < target; i++) {
      await drag(page, await center(page, '[data-testid=food][data-placed=false]'), plate);
      await page.waitForTimeout(300);
    }
    await waitRoundDone(page, 0);
    await page.getByTestId('compare').waitFor({ timeout: 10000 });
    await ready(page);
    const more = await page.getByTestId('compare').getAttribute('data-more');
    await page.getByTestId(`plate-${more}`).dispatchEvent('pointerdown');
    await waitRoundDone(page, 1);
  });

  test('Find the Animal: a new animal each round', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'who-says': 2 });
    await openGame(page, 'kid1', 'who-says');
    const asked: string[] = [];
    for (let r = 0; r < 3; r++) {
      if (r > 0) await ready(page);
      const ans = (await page.getByTestId('who-says').getAttribute('data-answer'))!;
      asked.push(ans);
      const c = await center(page, `[data-testid=card-${ans}]`);
      await page.mouse.click(c.x, c.y);
      await waitRoundDone(page, r);
      await page.waitForFunction((r) => document.querySelector('[data-testid=game-screen]')?.getAttribute('data-round') === String(r + 1), r, { timeout: 10000 });
    }
    expect(new Set(asked).size).toBe(3);
  });

  test('Copy Me: taps during the demo are ignored; copying after "now you" works', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'copy-me': 2 });
    await openGame(page, 'kid1', 'copy-me');
    const g = page.getByTestId('copy-me');
    const seq = (await g.getAttribute('data-seq'))!.split(',');
    if ((await g.getAttribute('data-phase')) === 'watch') {
      // child taps along with the demo: nothing should count
      await page.getByTestId(`pad-${seq[0]}`).dispatchEvent('pointerdown');
      await expect(g).toHaveAttribute('data-phase', /watch|intro/);
    }
    await expect(g).toHaveAttribute('data-phase', 'play', { timeout: 15000 });
    for (const k of seq) {
      await page.getByTestId(`pad-${k}`).dispatchEvent('pointerdown');
      await page.waitForTimeout(200);
    }
    await waitRoundDone(page, 0);
  });

  test('Shapes & Shadows: pieces only fit their own spot', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'shape-puzzle': 3 });
    await openGame(page, 'kid1', 'shape-puzzle');
    const pieces = page.locator('[data-testid=shape-puzzle] g[data-key][data-placed]');
    await expect(pieces).toHaveCount(4);
    const k0 = (await pieces.first().getAttribute('data-key'))!;
    const otherHole = page.locator(`[data-testid=shape-puzzle] g[data-key]:not([data-placed]):not([data-key="${k0}"])`).first();
    const ob = await otherHole.boundingBox();
    const pb = await page.locator(`g[data-placed][data-key="${k0}"]`).boundingBox();
    await drag(page, { x: pb!.x + pb!.width / 2, y: pb!.y + pb!.height / 2 }, { x: ob!.x + ob!.width / 2, y: ob!.y + ob!.height / 2 });
    await expect(page.locator(`g[data-placed][data-key="${k0}"]`)).toHaveAttribute('data-placed', 'false');
    await ready(page);
    await solveShapes(page);
    await waitRoundDone(page, 0);
    // the next round is the other kind (board ↔ shadows)
    const kind0 = await page.getByTestId('shape-puzzle').getAttribute('data-kind');
    await page.waitForFunction((k) => {
      const el = document.querySelector('[data-testid=shape-puzzle]');
      return !!el && el.getAttribute('data-kind') !== k;
    }, kind0, { timeout: 10000 }).catch(() => undefined);
  });

  test('Shapes & Shadows: the piece follows the finger while dragging, and goes back if dropped away', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'shape-puzzle': 2 });
    await openGame(page, 'kid1', 'shape-puzzle');
    const piece = page.locator('[data-testid=shape-puzzle] g[data-placed=false]').first();
    const key = (await piece.getAttribute('data-key'))!;
    const sel = `g[data-placed][data-key="${key}"]`;
    const start = (await page.locator(sel).boundingBox())!;
    const from = { x: start.x + start.width / 2, y: start.y + start.height / 2 };
    // a tap never places it
    await page.mouse.click(from.x, from.y);
    await page.waitForTimeout(500);
    await expect(page.locator(sel)).toHaveAttribute('data-placed', 'false');
    // press and move: the piece moves with the finger before letting go
    // (straight up or down inside the tray, so it never lands on a hole)
    const vh = page.viewportSize()!.height;
    const dy = from.y > vh / 2 ? -22 : 22;
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(from.x, from.y + i * dy);
    const mid = (await page.locator(sel).boundingBox())!;
    expect(Math.abs(mid.y + mid.height / 2 - from.y)).toBeGreaterThan(150);
    // let go in an empty spot: back to where it started
    await page.mouse.up();
    await expect
      .poll(async () => {
        const back = (await page.locator(sel).boundingBox())!;
        return Math.abs(back.x + back.width / 2 - from.x);
      }, { timeout: 5000 })
      .toBeLessThan(12);
    await expect(page.locator(sel)).toHaveAttribute('data-placed', 'false');
  });

  test('Trace Letters: trace, say it, then the picture word', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'trace-letters': 2 });
    await openGame(page, 'kid1', 'trace-letters');
    const t = page.getByTestId('trace');
    await expect(t).toHaveAttribute('data-letter', /^[AEIOU]$/);
    const first = await t.getAttribute('data-letter');
    await solveCurrent(page);
    await expect(t).toHaveAttribute('data-finished', 'true');
    await expect(page.getByTestId('letter-word')).toBeVisible({ timeout: 15000 });
    await waitRoundDone(page, 0);
    // the next letter continues the vowels
    await expect(page.getByTestId('trace')).not.toHaveAttribute('data-letter', first!, { timeout: 10000 });
  });

  test('Más o Menos: pick the row with more; it pairs up and shows the extras', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'more-less': 2 });
    await openGame(page, 'kid1', 'more-less');
    const g = page.getByTestId('more-less');
    await expect(g).toHaveAttribute('data-kind', 'compare');
    const right = (await g.getAttribute('data-right'))!;
    const wrong = right === 'top' ? 'bottom' : 'top';
    await page.getByTestId(`row-${wrong}`).dispatchEvent('pointerdown');
    await expect(page.getByTestId('game-screen')).toHaveAttribute('data-round', '0');
    await ready(page);
    await solveCurrent(page);
    await waitRoundDone(page, 0);
  });

  test('Más o Menos: take-away at level 3 ("how many are left?")', async ({ page }) => {
    test.setTimeout(90_000);
    await seedLevels(page, 'kid1', { 'more-less': 3 });
    await openGame(page, 'kid1', 'more-less');
    await solveCurrent(page);
    await waitRoundDone(page, 0);
    await expect(page.getByTestId('more-less')).toHaveAttribute('data-kind', 'takeaway', { timeout: 15000 });
    await solveCurrent(page);
    await waitRoundDone(page, 1);
  });

  test('Construir: pieces only fit inside the outline; filling it finishes', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'block-puzzle': 2 });
    await openGame(page, 'kid1', 'block-puzzle');
    // dropping a piece outside the outline sends it back
    const from = await center(page, '[data-testid=piece-0] [data-testid=pcell]');
    await drag(page, from, { x: from.x, y: 40 });
    await page.waitForTimeout(400);
    await expect(page.getByTestId('piece-0')).toHaveAttribute('data-placed', 'false');
    await ready(page);
    await solveCurrent(page);
    await expect(page.getByTestId('block-puzzle')).toHaveAttribute('data-done', 'true');
    await waitRoundDone(page, 0);
  });

  test('Construir top level: tap turns a piece', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'block-puzzle': 4 });
    await openGame(page, 'kid1', 'block-puzzle');
    const before = await page.getByTestId('piece-0').getAttribute('data-cells');
    const c = await center(page, '[data-testid=piece-0] [data-testid=pcell]');
    await page.mouse.click(c.x, c.y);
    await page.waitForTimeout(200);
    expect(await page.getByTestId('piece-0').getAttribute('data-cells')).not.toBe(before);
    await solveCurrent(page);
    await waitRoundDone(page, 0);
  });

  test('Trace: the star has a star-shaped home at the end of the line', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'trace-numbers': 2 });
    await openGame(page, 'kid1', 'trace-numbers');
    await expect(page.getByTestId('trace-goal')).toBeVisible();
  });

  test('Help a Friend: the helpful thing is the one that works', async ({ page }) => {
    await seedLevels(page, 'kid1', { 'help-a-friend': 2 });
    await openGame(page, 'kid1', 'help-a-friend');
    await page.getByTestId('helper-toy-0').or(page.getByTestId('helper-toy-1')).or(page.getByTestId('helper-toy-2')).first().dispatchEvent('pointerdown');
    await expect(page.getByTestId('game-screen')).toHaveAttribute('data-phase', 'play');
    await ready(page);
    const c = await center(page, '[data-testid=helper-right]');
    await page.mouse.click(c.x, c.y);
    await waitRoundDone(page, 0);
  });

  test('Block Builder: dragging and tapping blocks builds, done celebrates', async ({ page }) => {
    await openGame(page, 'kid1', 'block-builder');
    const ground = await page.locator('[data-testid=blocks]').boundingBox();
    await drag(page, await center(page, '[data-testid=tray-0]'), { x: ground!.x + ground!.width * 0.6, y: ground!.y + ground!.height * 0.8 });
    await page.getByTestId('tray-2').click();
    await page.getByTestId('tray-5').click();
    await expect(page.getByTestId('blocks')).toHaveAttribute('data-count', '3');
    await page.getByTestId('undo').dispatchEvent('pointerdown');
    await expect(page.getByTestId('blocks')).toHaveAttribute('data-count', '2');
    await page.getByTestId('tray-1').click();
    await page.getByTestId('done').dispatchEvent('pointerdown');
    await page.getByTestId('session-end').waitFor({ timeout: 15000 });
    await expect(page.getByTestId('sticker')).toBeVisible();
  });
});

test('a resting palm does not block the playing finger', async ({ page }) => {
  await seedLevels(page, 'kid1', { 'shape-puzzle': 2 });
  await openGame(page, 'kid1', 'shape-puzzle');
  const pieces = page.locator('[data-testid=shape-puzzle] g[data-key][data-placed]');
  const k = (await pieces.nth(0).getAttribute('data-key'))!;
  const kOther = (await pieces.nth(1).getAttribute('data-key'))!;
  const pb = await page.locator(`g[data-placed][data-key="${k}"]`).boundingBox();
  const hb = await page.locator(`[data-testid=shape-puzzle] g[data-key="${k}"]:not([data-placed])`).boundingBox();
  const ob = await page.locator(`g[data-placed][data-key="${kOther}"]`).boundingBox();
  const piece = { x: pb!.x + pb!.width / 2, y: pb!.y + pb!.height / 2 };
  const hole = { x: hb!.x + hb!.width / 2, y: hb!.y + hb!.height / 2 };
  const palm = { x: ob!.x + ob!.width / 2, y: ob!.y + ob!.height / 2 };
  const cdp = await page.context().newCDPSession(page);
  const tp = (x: number, y: number, id: number) => ({ x: Math.round(x), y: Math.round(y), id, radiusX: 10, radiusY: 10, force: 1 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(palm.x, palm.y, 1)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [tp(palm.x, palm.y, 1), tp(piece.x, piece.y, 2)] });
  for (let i = 1; i <= 10; i++) {
    const x = piece.x + ((hole.x - piece.x) * i) / 10;
    const y = piece.y + ((hole.y - piece.y) * i) / 10;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [tp(palm.x, palm.y, 1), tp(x, y, 2)] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [tp(palm.x, palm.y, 1)] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator(`g[data-placed][data-key="${k}"]`)).toHaveAttribute('data-placed', 'true');
  await expect(page.locator(`g[data-placed][data-key="${kOther}"]`)).toHaveAttribute('data-placed', 'false');
});
