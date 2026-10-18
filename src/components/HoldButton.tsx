import { type ReactNode, useEffect, useRef, useState } from 'react';

/**
 * A button that only fires after being held (default 0.9s), so a stray toddler tap
 * doesn't leave the game. A quick tap just gives it a little shake.
 */
export function HoldButton({
  onHold,
  children,
  ms = 900,
  className,
  testId,
  label,
}: {
  onHold: () => void;
  children: ReactNode;
  ms?: number;
  className?: string;
  testId?: string;
  label: string;
}) {
  const [k, setK] = useState(0);
  const [shake, setShake] = useState(0);
  const timer = useRef<number | null>(null);
  const t0 = useRef(0);
  const fired = useRef(false);

  useEffect(() => () => stop(), []);

  const stop = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };
  const start = () => {
    if (timer.current) return;
    fired.current = false;
    t0.current = performance.now();
    timer.current = window.setInterval(() => {
      const f = Math.min(1, (performance.now() - t0.current) / ms);
      setK(f);
      if (f >= 1 && !fired.current) {
        fired.current = true;
        stop();
        onHold();
      }
    }, 30);
  };
  const end = () => {
    if (!fired.current && performance.now() - t0.current < ms) setShake((s) => s + 1);
    stop();
    setK(0);
  };

  return (
    <button
      className={'hold-btn-small ' + (className ?? '')}
      aria-label={label}
      data-testid={testId}
      onPointerDown={(e) => {
        e.preventDefault();
        start();
      }}
      onPointerUp={end}
      onPointerLeave={() => {
        stop();
        setK(0);
      }}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      style={{ ['--hold' as string]: `${k * 360}deg` }}
    >
      <span key={shake} className={shake ? 'wiggle-x' : ''}>
        {children}
      </span>
    </button>
  );
}
