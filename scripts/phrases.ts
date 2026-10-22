// Lists every line the app can say → voices/phrases.json
// Run: npm run phrases
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { dynamicPhrases, flatten, laterPhrases, staticPhrasesFromSource } from '../src/voice/catalog';
import { phraseId } from '../src/engine/phraseId';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
  });
}

const files = walk('src').filter((f) => !f.includes('voice/catalog'));
const staticPh = files.flatMap((f) => staticPhrasesFromSource(readFileSync(f, 'utf8')));
// priority 2 = heard less often; recorded after everything else
const core = new Set(flatten(staticPh).map((l) => l.lang + '|' + l.text));
const later = new Set(flatten(laterPhrases()).map((l) => l.lang + '|' + l.text).filter((k) => !core.has(k)));
const lines = flatten([...staticPh, ...dynamicPhrases()]).map((l) => ({ id: phraseId(l.lang, l.text), ...l, ...(later.has(l.lang + '|' + l.text) ? { priority: 2 } : {}) }));
lines.sort((a, b) => (a.lang === b.lang ? a.text.localeCompare(b.text) : a.lang.localeCompare(b.lang)));

mkdirSync('voices', { recursive: true });
writeFileSync('voices/phrases.json', JSON.stringify(lines, null, 1) + '\n');
const en = lines.filter((l) => l.lang === 'en').length;
console.log(`voices/phrases.json: ${lines.length} lines (${en} English, ${lines.length - en} Spanish)`);
