import { type LangMode, UI } from '../engine/i18n';
import { Bi } from '../components/lang';
import type { AppData, KidId } from '../engine/storage';
import { KIDS, STICKERS } from '../app/kids';
import { sfx } from '../engine/sfx';

export function StickerScreen({ kid, data, lang, onBack }: { kid: KidId; data: AppData; lang: LangMode; onBack: () => void }) {
  const owned = data.kids[kid].stickers;
  const counts = new Map<string, number>();
  owned.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1));
  return (
    <div className="sticker-screen" data-testid="sticker-screen">
      <header className="menu-bar">
        <button className="round-btn" aria-label="Back" data-testid="back" onClick={onBack}>
          <span>⬅️</span>
        </button>
        <div className="menu-kid">
          <span className="menu-avatar" style={{ background: KIDS[kid].soft }}>
            {KIDS[kid].avatar}
          </span>
          <span className="menu-name"><Bi ph={UI.stickers} mode={lang} /></span>
        </div>
        <span />
      </header>
      <div className="sticker-book">
        {STICKERS.map((s) => {
          const has = counts.has(s);
          return (
            <button key={s} className={'sticker-slot' + (has ? ' has' : '')} onClick={() => has && sfx.pop()} aria-label={has ? 'sticker' : 'empty'}>
              <span>{has ? s : '?'}</span>
              {(counts.get(s) ?? 0) > 1 && <em>×{counts.get(s)}</em>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
