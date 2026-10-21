import { expect, type Page } from '@playwright/test';
import { center, drag, ready, seedLevels, solveShapes, toClient } from './helpers';

/** Solve whatever puzzle is on screen right now (games used in the 10-minute workout + the boss). */
export async function solveCurrent(page: Page) {
  await ready(page);
  const tap = async (sel: string) => {
    const c = await center(page, sel);
    await page.mouse.click(c.x, c.y);
  };
  if (await page.getByTestId('balloons').count()) {
    const g = page.getByTestId('balloons');
    const target = await g.getAttribute('data-target');
    const need = Number(await g.getAttribute('data-need'));
    const sel = target === 'any' ? '[data-testid^=balloon-][data-popped=false]' : `[data-testid=balloon-${target}][data-popped=false]`;
    // balloons float in one by one: keep popping until the tray is full
    for (let guard = 0; guard < 80 && Number(await g.getAttribute('data-got')) < need; guard++) {
      if (await page.locator(sel).count()) await tap(sel);
      await page.waitForTimeout(150);
    }
    return;
  }
  if (await page.getByTestId('who-says').count()) {
    const ans = await page.getByTestId('who-says').getAttribute('data-answer');
    await tap(`[data-testid=card-${ans}]`);
    return;
  }
  if (await page.getByTestId('shape-puzzle').count()) {
    await solveShapes(page);
    return;
  }
  if (await page.getByTestId('feed').count()) {
    const target = Number(await page.getByTestId('feed').getAttribute('data-target'));
    const plate = await center(page, '[data-testid=plate]');
    for (let i = 0; i < target; i++) {
      await drag(page, await center(page, '[data-testid=food][data-placed=false]'), plate);
      await page.waitForTimeout(250);
    }
    return;
  }
  if (await page.getByTestId('compare').count()) {
    const more = await page.getByTestId('compare').getAttribute('data-more');
    await page.getByTestId(`plate-${more}`).dispatchEvent('pointerdown');
    return;
  }
  const boss = page.getByTestId('boss');
  if (await boss.count()) {
    const step = await boss.getAttribute('data-step');
    if (step === 'fuel') {
      const c = await page.getByTestId('fuel-step').getAttribute('data-target');
      await page.getByTestId(`fuel-${c}`).dispatchEvent('pointerdown');
      return;
    }
    if (step === 'stars') {
      const n = Number(await page.getByTestId('stars-step').getAttribute('data-target'));
      for (let i = 0; i < n; i++) {
        await page.locator('[data-testid=power-star][data-taken=false]').first().dispatchEvent('pointerdown');
        await page.waitForTimeout(100);
      }
      return;
    }
    if (step === 'door') {
      const d = await page.getByTestId('door-step').getAttribute('data-target');
      await page.getByTestId(`door-${d}`).dispatchEvent('pointerdown');
      return;
    }
    if (step === 'lights') {
      await expect(page.getByTestId('lights-step')).toHaveAttribute('data-phase', 'play', { timeout: 10000 });
      const seq = (await page.getByTestId('lights-step').getAttribute('data-seq'))!.split(',');
      for (const k of seq) {
        await page.getByTestId(`light-${k}`).dispatchEvent('pointerdown');
        await page.waitForTimeout(150);
      }
      return;
    }
    if (step === 'friend') {
      await page.getByTestId('alien-right').dispatchEvent('pointerdown');
      return;
    }
    if (step === 'countdown') {
      if (await page.getByTestId('launch-button').count()) {
        await page.getByTestId('launch-button').dispatchEvent('pointerdown');
        return;
      }
      const order = (await page.getByTestId('countdown-step').getAttribute('data-order'))!.split(',');
      for (const n of order) {
        await page.getByTestId(`count-${n}`).dispatchEvent('pointerdown');
        await page.waitForTimeout(150);
      }
      return;
    }
  }
  if (await page.getByTestId('copy-me').count()) {
    const g = page.getByTestId('copy-me');
    await expect(g).toHaveAttribute('data-phase', 'play', { timeout: 20000 });
    for (const k of (await g.getAttribute('data-seq'))!.split(',')) {
      await page.getByTestId(`pad-${k}`).dispatchEvent('pointerdown');
      await page.waitForTimeout(200);
    }
    return;
  }
  if (await page.getByTestId('homes').count()) {
    const animals = page.locator('[data-testid^=animal-][data-placed=false]');
    while (await animals.count()) {
      const a = animals.first();
      const home = await a.getAttribute('data-home');
      const id = await a.getAttribute('data-testid');
      const hb = await page.getByTestId(`home-${home}`).boundingBox();
      await drag(page, await center(page, `[data-testid=${id}]`), { x: hb!.x + hb!.width / 2, y: hb!.y + hb!.height / 2 });
      await page.waitForTimeout(250);
    }
    return;
  }
  if (await page.getByTestId('trace').count()) {
    const strokes = await page.evaluate(() =>
      ([...document.querySelectorAll('[data-testid=trace] path[stroke=none]')] as SVGPathElement[]).map((p) => {
        const len = p.getTotalLength();
        const m = p.getScreenCTM()!;
        const pts = [];
        for (let d = 0; d <= len; d += 15) {
          const q = p.getPointAtLength(d);
          pts.push({ x: q.x * m.a + m.e, y: q.y * m.d + m.f });
        }
        const e = p.getPointAtLength(len);
        pts.push({ x: e.x * m.a + m.e, y: e.y * m.d + m.f });
        return pts;
      }),
    );
    for (const pts of strokes) {
      await page.mouse.move(pts[0].x, pts[0].y);
      await page.mouse.down();
      for (const q of pts.slice(1)) await page.mouse.move(q.x, q.y, { steps: 2 });
      await page.mouse.up();
      await page.waitForTimeout(250);
    }
    return;
  }
  if (await page.getByTestId('help-friend').count()) {
    await page.getByTestId('helper-right').dispatchEvent('pointerdown');
    return;
  }
  if (await page.getByTestId('feelings').count()) {
    await page.locator('[data-testid^=face-][data-right=true]').dispatchEvent('pointerdown');
    return;
  }
  if (await page.getByTestId('maze').count()) {
    const sol = (await page.getByTestId('maze').getAttribute('data-solution'))!.split(';').map((s) => s.split(',').map(Number));
    const pts = [];
    for (const [x, y] of sol) pts.push(await toClient(page, x, y));
    await page.mouse.move(pts[0].x, pts[0].y);
    await page.mouse.down();
    for (const q of pts.slice(1)) await page.mouse.move(q.x, q.y, { steps: 6 });
    await page.mouse.up();
    return;
  }
  throw new Error('no known puzzle on screen');
}

export async function seedWorkout(page: Page, minutes: number) {
  await seedLevels(page, 'kid1', {});
  await page.addInitScript((minutes) => {
    const raw = JSON.parse(localStorage.getItem('little-thinkers:v1')!);
    raw.settings.workout = { kid1: minutes, kid2: 10 };
    localStorage.setItem('little-thinkers:v1', JSON.stringify(raw));
  }, minutes);
}

