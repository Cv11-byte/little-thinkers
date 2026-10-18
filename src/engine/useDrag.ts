// One-finger drag for toddler hands.
// - Only one drag at a time (a resting palm won't steal the piece).
// - Listens on window during the drag, so a fast finger never "drops" the piece.
// - Short, still touches are reported as taps.

import { useEffect, useRef, type PointerEvent as RPointerEvent } from 'react';
import { useStage } from './stage';

export interface Pt {
  x: number;
  y: number;
}

export interface DragHandlers {
  /** return false to refuse the drag */
  onStart?(id: string, p: Pt): boolean | void;
  onMove?(id: string, p: Pt, start: Pt): void;
  onEnd?(id: string, p: Pt, info: { tap: boolean; start: Pt }): void;
}

const TAP_MOVE = 18; // stage units
const TAP_MS = 600;

export function useDrag(handlers: DragHandlers) {
  const { toStage } = useStage();
  const h = useRef(handlers);
  h.current = handlers;
  const active = useRef<{ id: string; pointerId: number; start: Pt; t0: number; maxMove: number } | null>(null);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  return (id: string) => ({
    onPointerDown(e: RPointerEvent<Element>) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const prev = active.current;
      if (prev) {
        // A resting palm or second hand shouldn't block the finger that's actually playing:
        // if the first touch hasn't moved, let the new touch take over.
        if (prev.maxMove >= TAP_MOVE || prev.pointerId === e.pointerId) return;
        active.current = null;
        cleanup.current?.();
        h.current.onEnd?.(prev.id, prev.start, { tap: false, start: prev.start });
      }
      e.preventDefault();
      e.stopPropagation();
      const start = toStage(e.clientX, e.clientY);
      if (h.current.onStart?.(id, start) === false) return;
      active.current = { id, pointerId: e.pointerId, start, t0: performance.now(), maxMove: 0 };

      const move = (ev: PointerEvent) => {
        const a = active.current;
        if (!a || ev.pointerId !== a.pointerId) return;
        ev.preventDefault();
        const p = toStage(ev.clientX, ev.clientY);
        a.maxMove = Math.max(a.maxMove, Math.hypot(p.x - a.start.x, p.y - a.start.y));
        h.current.onMove?.(a.id, p, a.start);
      };
      const up = (ev: PointerEvent) => {
        const a = active.current;
        if (!a || ev.pointerId !== a.pointerId) return;
        const p = toStage(ev.clientX, ev.clientY);
        const tap = a.maxMove < TAP_MOVE && performance.now() - a.t0 < TAP_MS;
        active.current = null;
        cleanup.current?.();
        h.current.onEnd?.(a.id, p, { tap, start: a.start });
      };
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      cleanup.current = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        cleanup.current = null;
      };
    },
  });
}
