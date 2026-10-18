import { type LangMode, UI } from '../engine/i18n';
import { Bi } from '../components/lang';
import type { KidId } from '../engine/storage';
import { KIDS } from '../app/kids';

interface Props {
  lang: LangMode;
  onKid: (k: KidId) => void;
  onLang: (l: LangMode) => void;
  onParent: () => void;
}

export function HomeScreen({ lang, onKid, onLang, onParent }: Props) {
  return (
    <div className="home-screen" data-testid="home-screen">
      <button className="parent-lock" aria-label="Grown-ups" data-testid="parent-entry" onClick={onParent}>
        🔒
      </button>
      <div className="home-title">
        <div className="home-logo" aria-hidden>
          <span>🧠</span>
          <span className="spark">✨</span>
        </div>
        <h1><Bi ph={UI.appName} mode={lang} /></h1>
        <p className="home-sub"><Bi ph={UI.whoIsPlaying} mode={lang} /></p>
      </div>
      <div className="kid-cards">
        {(Object.keys(KIDS) as KidId[]).map((id) => {
          const k = KIDS[id];
          return (
            <button key={id} className="kid-card" data-testid={`kid-${id}`} style={{ background: k.soft, borderColor: k.color }} onClick={() => onKid(id)}>
              <span className="kid-avatar">{k.avatar}</span>
              <span className="kid-name" style={{ color: k.color }}>
                {k.name}
              </span>
            </button>
          );
        })}
      </div>
      <div className="lang-switch" role="radiogroup" aria-label="Language">
        {(
          [
            ['en', '🇺🇸', 'English'],
            ['both', '🇲🇽🇺🇸', 'Español + English'],
            ['es', '🇲🇽', 'Español'],
          ] as [LangMode, string, string][]
        ).map(([m, flag, name]) => (
          <button key={m} role="radio" aria-checked={lang === m} className={'lang-opt' + (lang === m ? ' on' : '')} data-testid={`lang-${m}`} onClick={() => onLang(m)}>
            <span className="flag">{flag}</span>
            <span>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
