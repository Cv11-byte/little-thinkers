import type { LangMode, Phrase } from '../engine/i18n';

/** Text in the active language. "Both" shows Spanish on top and English underneath. */
export function Bi({ ph, mode, className }: { ph: Phrase; mode: LangMode; className?: string }) {
  if (mode !== 'both') return <span className={className}>{ph[mode]}</span>;
  return (
    <span className={'bi ' + (className ?? '')}>
      <span className="bi-es">{ph.es}</span>
      <span className="bi-en">{ph.en}</span>
    </span>
  );
}

export const NEXT_LANG: Record<LangMode, LangMode> = { en: 'es', es: 'both', both: 'en' };

const LOOK: Record<LangMode, { flag: string; text: string; name: string }> = {
  en: { flag: '🇺🇸', text: 'EN', name: 'English' },
  es: { flag: '🇲🇽', text: 'ES', name: 'Español' },
  both: { flag: '🇲🇽🇺🇸', text: 'ES+EN', name: 'Español + English' },
};

/** One button that cycles English → Español → Both. */
export function LangToggle({ mode, onChange }: { mode: LangMode; onChange: (m: LangMode) => void }) {
  const look = LOOK[mode];
  return (
    <button
      className="lang-toggle"
      data-testid="lang-toggle"
      data-mode={mode}
      aria-label={`Language: ${look.name}. Tap to change.`}
      onClick={() => onChange(NEXT_LANG[mode])}
    >
      <span className="lt-flag">{look.flag}</span>
      <span className="lt-text">{look.text}</span>
    </button>
  );
}
