import type { Page } from '@playwright/test';

/** Convert stage (SVG) units to screen pixels. */
export async function toClient(page: Page, x: number, y: number) {
  return page.evaluate(
    ([x, y]) => {
      const svg = document.querySelector('[data-testid=stage]') as SVGSVGElement;
      const pt = svg.createSVGPoint();
      pt.x = x;
      pt.y = y;
      const r = pt.matrixTransform(svg.getScreenCTM()!);
      return { x: r.x, y: r.y };
    },
    [x, y],
  );
}

export async function center(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error('no box for ' + selector);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Finger-style drag through a list of screen points. */
export async function dragPath(page: Page, pts: { x: number; y: number }[], steps = 8) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) {
    await page.mouse.move(pts[i].x, pts[i].y, { steps });
  }
  await page.mouse.up();
}

export async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await dragPath(page, [from, to], 12);
}

/** Set a game level for a kid before the app loads. */
export async function seedLevels(page: Page, kid: 'kid1' | 'kid2', levels: Record<string, number>) {
  await page.addInitScript(
    ([kid, levels]) => {
      const games: Record<string, unknown> = {};
      for (const [id, level] of Object.entries(levels as Record<string, number>)) {
        games[id] = { level, recent: [], rounds: 0, independent: 0, hints: 0, mistakes: 0, lastPlayed: null };
      }
      const data = {
        version: 1,
        settings: { lang: 'both', voice: false, sounds: false, playLimit: 0 },
        kids: { kid1: { games: {}, stickers: [] }, kid2: { games: {}, stickers: [] } } as Record<string, unknown>,
      };
      data.kids[kid as string] = { games, stickers: [] };
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('little-thinkers:v1', JSON.stringify(data));
        sessionStorage.setItem('seeded', '1');
      }
    },
    [kid, levels] as const,
  );
}

export async function openGame(page: Page, kid: 'kid1' | 'kid2', gameId: string) {
  await page.goto('/');
  await page.getByTestId(`kid-${kid}`).click();
  await page.getByTestId(`tile-${gameId}`).click();
  await page.getByTestId('stage').waitFor();
  await ready(page);
}

/** Wait until the round counter moves on (or the session ends). */
export async function waitRoundDone(page: Page, prevRound: number) {
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector('[data-testid=game-screen]');
      if (!el) return false;
      return el.getAttribute('data-phase') !== 'play' || Number(el.getAttribute('data-round')) > prev;
    },
    prevRound,
    { timeout: 15000 },
  );
}

/** The home button only works when held (toddler guard). */
export async function holdHome(page: Page) {
  const b = await page.getByTestId('home').boundingBox();
  if (!b) throw new Error('no home button');
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
}

/** Wait until the game is listening for taps (instructions done, options shown). */
export async function ready(page: Page) {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid=game-screen]');
      return !!el && el.getAttribute('data-locked') === 'false' && el.getAttribute('data-phase') === 'play';
    },
    undefined,
    { timeout: 15000 },
  );
  // let the options finish floating in
  await page.waitForTimeout(1600);
}

/** Drag every matching piece to its spot in Shapes & Shadows (board or shadow round). */
export async function solveShapes(page: Page) {
  const keys = await page.locator('[data-testid=shape-puzzle] g[data-key][data-placed=false]').evaluateAll((els) => els.map((e) => e.getAttribute('data-key')!));
  for (const k of keys) {
    const piece = await page.locator(`g[data-placed][data-key="${k}"]`).boundingBox();
    const hole = await page.locator(`g[data-key="${k}"]:not([data-placed])`).boundingBox();
    await drag(page, { x: piece!.x + piece!.width / 2, y: piece!.y + piece!.height / 2 }, { x: hole!.x + hole!.width / 2, y: hole!.y + hole!.height / 2 });
    await page.waitForTimeout(200);
  }
}
