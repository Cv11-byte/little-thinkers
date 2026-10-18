// Maze rules, kept free of React so they can be unit tested.
// '#' = space (wall), '.' = path, 'S' = astronaut start, 'R' = rocket

export type Cell = [number, number]; // [row, col]

export interface Maze {
  rows: number;
  cols: number;
  open: boolean[][];
  start: Cell;
  goal: Cell;
}

export const MAZES: Record<number, string[][]> = {
  1: [
    ['S...R'],
    ['S..#', '##.R'],
    ['S#', '.#', '..', '#R'],
  ],
  2: [
    ['S..###', '##.#.#', '##...R'],
    ['S.#R', '#.#.', '#...'],
    ['S...#', '###.#', 'R...#'],
  ],
  3: [
    ['S...#R', '#.#.#.', '#.#...', '#.####'],
    ['S.#...', '#.#.#.', '#...#R', '##.###'],
    ['S....#', '#.##.#', '#..#..', '##.##R'],
  ],
  4: [
    ['S..#...', '##.#.#.', '...#.#.', '.###.#.', '.....#R'],
    ['S.#....', '..#.##.', '#...#..', '#.#.#.#', '#.#...R'],
    ['S...#..', '##.##.#', '...#..#', '.#.#.##', '.#...R.'],
  ],
};

export function parseMaze(rows: string[]): Maze {
  let start: Cell = [0, 0];
  let goal: Cell = [0, 0];
  const open = rows.map((line, r) =>
    [...line].map((ch, c) => {
      if (ch === 'S') start = [r, c];
      if (ch === 'R') goal = [r, c];
      return ch !== '#';
    }),
  );
  return { rows: rows.length, cols: rows[0].length, open, start, goal };
}

export const same = (a: Cell, b: Cell) => a[0] === b[0] && a[1] === b[1];

export function isOpen(m: Maze, [r, c]: Cell) {
  return r >= 0 && c >= 0 && r < m.rows && c < m.cols && m.open[r][c];
}

export function neighbors(m: Maze, [r, c]: Cell): Cell[] {
  const out: Cell[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]) {
    const n: Cell = [r + dr, c + dc];
    if (isOpen(m, n)) out.push(n);
  }
  return out;
}

/** Shortest path from a to b (inclusive), or null. */
export function findPath(m: Maze, a: Cell, b: Cell): Cell[] | null {
  if (!isOpen(m, a) || !isOpen(m, b)) return null;
  const key = (c: Cell) => c[0] * 100 + c[1];
  const prev = new Map<number, Cell | null>([[key(a), null]]);
  const q: Cell[] = [a];
  while (q.length) {
    const cur = q.shift()!;
    if (same(cur, b)) {
      const path: Cell[] = [];
      let x: Cell | null = cur;
      while (x) {
        path.unshift(x);
        x = prev.get(key(x)) ?? null;
      }
      return path;
    }
    for (const n of neighbors(m, cur)) {
      if (!prev.has(key(n))) {
        prev.set(key(n), cur);
        q.push(n);
      }
    }
  }
  return null;
}

/**
 * Where the astronaut goes when the finger is over `target`.
 * It moves only along the path and only a short hop (so the child has to follow the road),
 * except in easy mode where any reachable spot works.
 */
export function moveToward(m: Maze, cur: Cell, target: Cell, maxHop: number): Cell[] | null {
  if (same(cur, target)) return null;
  const path = findPath(m, cur, target);
  if (!path) return null;
  if (path.length - 1 > maxHop) return null;
  return path.slice(1);
}

/** A dead end: an open cell with one way out that is not the start or the rocket. */
export function isDeadEnd(m: Maze, c: Cell) {
  return isOpen(m, c) && !same(c, m.start) && !same(c, m.goal) && neighbors(m, c).length === 1;
}
