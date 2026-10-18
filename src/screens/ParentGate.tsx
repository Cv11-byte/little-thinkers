import { useEffect, useMemo, useRef, useState } from 'react';
import { NUMBER_WORDS } from '../engine/i18n';

/**
 * Grown-ups only: hold the button for 2 seconds, then tap the number
 * that matches a written word ("seven"). Toddlers can't read, so they can't pass.
 */
export function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [held, setHeld] = useState(0);
  const [stage, setStage] = useState<'hold' | 'word'>('hold');
  const [shake, setShake] = useState(0);
  const timer = useRef<number | null>(null);
  const target = useMemo(() => 2 + Math.floor(Math.random() * 8), []);
  const options = useMemo(() => {
    const set = new Set<number>([target]);
    while (set.size < 4) set.add(1 + Math.floor(Math.random() * 9));
    return [...set].sort(() => Math.random() - 0.5);
  }, [target]);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const startHold = () => {
    if (timer.current) return;
    const t0 = performance.now();
    timer.current = window.setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / 2000);
      setHeld(k);
      if (k >= 1) {
        stopHold();
        setStage('word');
      }
    }, 30);
  };
  const stopHold = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    setHeld((h) => (h >= 1 ? h : 0));
  };

  return (
    <div className="gate" data-testid="parent-gate">
      <div className="gate-card">
        <button className="gate-close" aria-label="Close" onClick={onCancel} data-testid="gate-cancel">
          ✕
        </button>
        <h2>Grown-ups only · Solo adultos</h2>
        {stage === 'hold' ? (
          <>
            <p>Press and hold for 2 seconds</p>
            <button
              className="hold-btn"
              data-testid="gate-hold"
              onPointerDown={(e) => {
                e.preventDefault();
                startHold();
              }}
              onPointerUp={stopHold}
              onPointerLeave={stopHold}
              onPointerCancel={stopHold}
              style={{ background: `conic-gradient(#4CB86A ${held * 360}deg, #E7E2D6 0deg)` }}
            >
              <span>🔒</span>
            </button>
          </>
        ) : (
          <>
            <p>
              Tap the number <strong data-testid="gate-word">{NUMBER_WORDS[target].en.toUpperCase()}</strong>
            </p>
            <div key={shake} className={'gate-nums' + (shake ? ' wiggle-x' : '')}>
              {options.map((n) => (
                <button key={n} data-testid={`gate-num-${n}`} onClick={() => (n === target ? onPass() : setShake((s) => s + 1))}>
                  {n}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
