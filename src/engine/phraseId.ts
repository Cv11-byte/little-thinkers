// A short, stable id for a spoken line, used as its audio file name.
// The same function runs in the app and in the voice-generation script.

export function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** FNV-1a 32-bit hash of "lang|text", as 8 hex characters. */
export function phraseId(lang: string, text: string): string {
  const s = `${lang}|${normalizeText(text)}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
