// Shared state for "drag a piece to a spot" games.
//
// Pieces are positioned with the SVG transform *attribute* (not CSS transforms/filters):
// iPad Safari doesn't reliably repaint CSS-transformed SVG while a finger moves,
// which made pieces look stuck and then "fly" on release. Snapping and going home
// are animated here in JS instead of with CSS transitions.

import { useEffect, useRef, useState } from 'react';
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

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** SVG transform for a piece: follows the finger exactly, a little bigger while held. */
export const pieceTransform = (pc: Piece) => `translate(${pc.x.toFixed(1)} ${pc.y.toFixed(1)})${pc.dragging ? ' scale(1.12)' : ''}`;

export function usePieces<P extends Piece>(initial: () => P[], onDrop: (ctx: DropContext<P>) => DropResult, onWrong?: (piece: P) => void) {
  const [pieces, setPieces] = useState<P[]>(initial);
  const ref = useRef(pieces);
  ref.current = pieces;
  const grab = useRef<Pt>({ x: 0, y: 0 });
  const tweens = useRef(new Map<string, number>());

  useEffect(() => () => tweens.current.forEach((h) => cancelAnimationFrame(h)), []);

  const update = (id: string, f: (p: P) => P) => setPieces((list) => list.map((x) => (x.id === id ? f(x) : x)));

  const stopTween = (id: string) => {
    const h = tweens.current.get(id);
    if (h) cancelAnimationFrame(h);
    tweens.current.delete(id);
  };

  /** glide a piece to (x, y) */
  const glide = (id: string, from: Pt, to: Pt, ms = 300) => {
    stopTween(id);
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      const k = ease(t);
      update(id, (x) => ({ ...x, x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }));
      if (t < 1) tweens.current.set(id, requestAnimationFrame(step));
      else tweens.current.delete(id);
    };
    tweens.current.set(id, requestAnimationFrame(step));
  };

  const bind = useDrag({
    onStart(id, p) {
      const pc = ref.current.find((x) => x.id === id);
      if (!pc || pc.placed) return false;
      stopTween(id);
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
      const from = { x: pc.x, y: pc.y };
      if (res === 'home' || res === 'wrong') {
        update(id, (x) => ({ ...x, dragging: false, wrong: res === 'wrong' ? x.wrong + 1 : x.wrong }));
        glide(id, from, { x: pc.homeX, y: pc.homeY }, 380);
        if (res === 'wrong') onWrong?.(pc);
      } else {
        update(id, (x) => ({ ...x, dragging: false, placed: true }));
        glide(id, from, res, tap ? 450 : 160);
      }
    },
  });

  return { pieces, setPieces, bind, update, glide };
}
