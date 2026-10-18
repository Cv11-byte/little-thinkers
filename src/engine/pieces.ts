// Shared state for "drag a piece to a spot" games.

import { useRef, useState } from 'react';
import { type Pt, useDrag } from './useDrag';
import { sfx } from './sfx';

/** how far above the finger a dragged piece floats (stage units) */
const LIFT = 34;

export interface Piece {
  id: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  placed: boolean;
  dragging: boolean;
  /** brief wiggle after a wrong drop */
  wrong: number;
}

export interface DropContext<P extends Piece> {
  piece: P;
  p: Pt;
  tap: boolean;
}

/**
 * onDrop returns where the piece should go:
 *  - {x, y}: snap there and lock it ("placed")
 *  - 'home': gently go back (no penalty)
 *  - 'wrong': go back and count a mistake
 */
export type DropResult = { x: number; y: number } | 'home' | 'wrong';

export function usePieces<P extends Piece>(initial: () => P[], onDrop: (ctx: DropContext<P>) => DropResult, onWrong?: (piece: P) => void) {
  const [pieces, setPieces] = useState<P[]>(initial);
  const ref = useRef(pieces);
  ref.current = pieces;
  const grab = useRef<Pt>({ x: 0, y: 0 });

  const update = (id: string, f: (p: P) => P) => setPieces((list) => list.map((x) => (x.id === id ? f(x) : x)));

  const bind = useDrag({
    onStart(id, p) {
      const pc = ref.current.find((x) => x.id === id);
      if (!pc || pc.placed) return false;
      // lift the piece a little above the finger so a small hand doesn't hide it
      grab.current = { x: (p.x - pc.x) * 0.5, y: (p.y - pc.y) * 0.5 + LIFT };
      sfx.tap();
      update(id, (x) => ({ ...x, dragging: true }));
    },
    onMove(id, p) {
      update(id, (x) => ({ ...x, x: p.x - grab.current.x, y: p.y - grab.current.y }));
    },
    onEnd(id, p, { tap }) {
      const pc = ref.current.find((x) => x.id === id);
      if (!pc) return;
      // drop point = the piece's center, which is where the child sees it
      const center = tap ? p : { x: p.x - grab.current.x, y: p.y - grab.current.y };
      const res = onDrop({ piece: { ...pc, x: center.x, y: center.y }, p: center, tap });
      if (res === 'home' || res === 'wrong') {
        update(id, (x) => ({ ...x, dragging: false, x: x.homeX, y: x.homeY, wrong: res === 'wrong' ? x.wrong + 1 : x.wrong }));
        if (res === 'wrong') onWrong?.(pc);
      } else {
        update(id, (x) => ({ ...x, dragging: false, placed: true, x: res.x, y: res.y }));
      }
    },
  });

  return { pieces, setPieces, bind, update };
}
