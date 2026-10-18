// Same id function as src/engine/phraseId.ts (kept in sync by tests/voice.test.ts).
export function phraseIdJs(lang, text) {
  const s = `${lang}|${text.replace(/\s+/g, ' ').trim()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
