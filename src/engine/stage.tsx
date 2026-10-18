// The play area: an SVG that always fills the screen space it is given.
// Games lay themselves out using W and H (about 1000 units on the long side),
// so pieces stay big on any iPad orientation.

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

export interface StageInfo {
  W: number;
  H: number;
  svgRef: RefObject<SVGSVGElement>;
  /** Convert a screen (client) point to stage units. */
  toStage(clientX: number, clientY: number): { x: number; y: number };
}

const StageCtx = createContext<StageInfo | null>(null);

export function useStage(): StageInfo {
  const s = useContext(StageCtx);
  if (!s) throw new Error('useStage must be used inside <Stage>');
  return s;
}

export function stageSize(w: number, h: number): { W: number; H: number } {
  if (w <= 0 || h <= 0) return { W: 1000, H: 700 };
  if (w >= h) return { W: 1000, H: Math.round((1000 * h) / w) };
  return { W: Math.round((1000 * w) / h), H: 1000 };
}

export function useStageSize(ref: RefObject<HTMLElement>) {
  const [size, setSize] = useState(() => ({ W: 1000, H: 700, ready: false }));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const s = stageSize(r.width, r.height);
      setSize((prev) => (prev.W === s.W && prev.H === s.H && prev.ready ? prev : { ...s, ready: true }));
    };
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [ref]);
  return size;
}

export function Stage({ W, H, children, className }: { W: number; H: number; children: ReactNode; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const info: StageInfo = {
    W,
    H,
    svgRef,
    toStage(cx, cy) {
      const svg = svgRef.current;
      if (!svg) return { x: cx, y: cy };
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = cx;
        pt.y = cy;
        const r = pt.matrixTransform(ctm.inverse());
        return { x: r.x, y: r.y };
      }
      const b = svg.getBoundingClientRect();
      return { x: ((cx - b.left) / b.width) * W, y: ((cy - b.top) / b.height) * H };
    },
  };
  return (
    <StageCtx.Provider value={info}>
      <svg
        ref={svgRef}
        className={'stage ' + (className ?? '')}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        data-testid="stage"
      >
        {children}
      </svg>
    </StageCtx.Provider>
  );
}

/** Run a callback after `ms`, cancelled automatically on unmount. */
export function useTimers() {
  const ids = useRef<number[]>([]);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      ids.current.forEach((i) => window.clearTimeout(i));
    };
  }, []);
  return (fn: () => void, ms: number) => {
    if (!alive.current) return 0;
    const id = window.setTimeout(() => alive.current && fn(), ms);
    ids.current.push(id);
    return id;
  };
}
