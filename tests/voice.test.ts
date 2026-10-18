import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { phraseId } from '../src/engine/phraseId';
// @ts-expect-error plain JS helper used by the generator script
import { phraseIdJs } from '../scripts/phrase-id.mjs';
import { L } from '../src/engine/lines';
import { dynamicPhrases, flatten, staticPhrasesFromSource } from '../src/voice/catalog';

describe('voice catalog', () => {
  it('the app and the generator compute the same file names', () => {
    for (const [lang, t] of [
      ['en', 'Great job!'],
      ['es', '¡Mírame primero y luego tú!'],
      ['es', '¿Dónde está el pingüino?'],
    ])
      expect(phraseIdJs(lang, t)).toBe(phraseId(lang, t));
    expect(phraseId('en', ' Hi   there ')).toBe(phraseId('en', 'Hi there'));
  });

  it('finds static lines in source, including quotes and apostrophes', () => {
    const got = staticPhrasesFromSource(`x = p('Oops!', '¡Ups!'); y = p("Let's go!", '¡Vamos!'); z = { en: 'Hi', es: 'Hola' }; w = p(\`skip \${a}\`, 'x');`);
    expect(got).toContainEqual({ en: 'Oops!', es: '¡Ups!' });
    expect(got).toContainEqual({ en: "Let's go!", es: '¡Vamos!' });
    expect(got).toContainEqual({ en: 'Hi', es: 'Hola' });
    expect(got.some((g) => g.en.includes('skip'))).toBe(false);
  });

  it('lines with a name fall back to the plain recorded line', () => {
    const named = L.praise('Sam', 0);
    expect(named.es).toBe('¡Muy bien, Sam!');
    expect(named.alt?.es).toBe('¡Muy bien!');
    expect(L.praise('', 0).alt).toBeUndefined();
  });

  it('covers the dynamic lines and has no blanks left', () => {
    const lines = flatten(dynamicPhrases());
    expect(lines.length).toBeGreaterThan(500);
    expect(lines.some((l) => l.text.includes('undefined'))).toBe(false);
    expect(lines.some((l) => l.text.includes('${'))).toBe(false);
  });

  it('the committed phrase list is up to date', () => {
    const file = JSON.parse(readFileSync('voices/phrases.json', 'utf8')) as { id: string; lang: string; text: string }[];
    for (const l of file.slice(0, 50)) expect(l.id).toBe(phraseId(l.lang, l.text));
    const texts = new Set(file.map((l) => l.lang + '|' + l.text));
    for (const l of flatten(dynamicPhrases())) expect(texts.has(l.lang + '|' + l.text), `run "npm run phrases": missing ${l.text}`).toBe(true);
  });
});
