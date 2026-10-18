import { useEffect, useState } from 'react';
import { missingPhrases, preloadAllClips, recordedClipCount, speak } from '../engine/speech';

/** Grown-up corner: recorded voice status, offline download, and a list to listen to every line. */
export function VoicePanel() {
  const [count, setCount] = useState(recordedClipCount());
  const [progress, setProgress] = useState<string | null>(null);
  const [list, setList] = useState<{ key: string; text: string }[] | null>(null);
  const [filter, setFilter] = useState('');
  const missing = missingPhrases();

  useEffect(() => {
    setCount(recordedClipCount());
  }, []);

  const openList = async () => {
    try {
      const r = await fetch('./voices/manifest.json', { cache: 'no-cache' });
      const j = (await r.json()) as { text?: Record<string, string> };
      setList(Object.entries(j.text ?? {}).map(([key, text]) => ({ key, text })));
    } catch {
      setList([]);
    }
  };

  return (
    <section className="p-card" data-testid="p-voices">
      <h2>Voices</h2>
      {count === 0 ? (
        <p className="note">
          No recorded voices yet, so the app uses the iPad's built-in voice. Record them with ElevenLabs from GitHub: Actions → "Record voices" → Run
          workflow (see the README).
        </p>
      ) : (
        <>
          <p className="note">
            {count} recorded lines. Lines without a recording use the iPad's built-in voice{missing.length ? ` (${missing.length} heard so far)` : ''}.
          </p>
          <div className="reset-row" style={{ justifyContent: 'flex-start' }}>
            <button
              className="small-btn"
              data-testid="p-voices-download"
              disabled={!!progress && !progress.startsWith('Done')}
              onClick={async () => {
                setProgress('Starting…');
                const n = await preloadAllClips((d, t) => setProgress(`Downloading ${d} of ${t}…`));
                setProgress(`Done: ${n} lines saved for offline play.`);
              }}
            >
              Save voices for offline play
            </button>
            <button className="small-btn" data-testid="p-voices-list" onClick={() => void openList()}>
              Listen to every line
            </button>
          </div>
          {progress && <p className="note">{progress}</p>}
        </>
      )}
      {missing.length > 0 && (
        <details className="note">
          <summary>Lines heard without a recording ({missing.length})</summary>
          <ul>
            {missing.slice(0, 100).map((m) => (
              <li key={m.lang + m.text}>
                {m.lang.toUpperCase()}: {m.text}
              </li>
            ))}
          </ul>
        </details>
      )}
      {list && (
        <div className="voice-list">
          <input className="voice-filter" placeholder="Search lines…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <p className="note">Tap ▶ to listen. To re-record a line you don't like, copy its code (like es/1a2b3c4d) into the "redo" box when running the GitHub workflow.</p>
          <ul>
            {list
              .filter((l) => !filter || l.text.toLowerCase().includes(filter.toLowerCase()))
              .slice(0, 300)
              .map((l) => (
                <li key={l.key}>
                  <button
                    className="play-line"
                    aria-label={`Play ${l.text}`}
                    onClick={() => void speak({ en: l.text, es: l.text }, { only: l.key.startsWith('en/') ? 'en' : 'es' })}
                  >
                    ▶
                  </button>
                  <span className="vl-text">{l.text}</span>
                  <code>{l.key}</code>
                </li>
              ))}
          </ul>
        </div>
      )}
    </section>
  );
}
