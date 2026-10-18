// Spoken narration.
//  1. Recorded clips (ElevenLabs or your own voice) in /voices/<lang>/<id>.mp3, listed in
//     /voices/manifest.json. Played through the shared Web Audio context (reliable on iPad).
//  2. Anything without a clip falls back to the iPad's built-in voice.
// speak() never rejects and always finishes within a bounded time, so a missing voice
// or a blocked speech engine can never freeze the game.

import { type Lang, type LangMode, type Phrase, spokenLangs } from './i18n';
import { audioContext } from './sfx';
import { phraseId } from './phraseId';

interface SpeechSettings {
  mode: LangMode;
  enabled: boolean;
}

const settings: SpeechSettings = { mode: 'both', enabled: true };

export function configureSpeech(s: Partial<SpeechSettings>) {
  Object.assign(settings, s);
  if (!settings.enabled) stopSpeech();
}

export function getSpeechMode(): LangMode {
  return settings.mode;
}

// ---------------- recorded clips ----------------

let manifest: Set<string> | null = null;
const bufferCache = new Map<string, Promise<AudioBuffer | null>>();
const missing = new Map<string, { lang: Lang; text: string }>();

/** Load the list of recorded clips (call once at start-up). */
export async function loadVoiceManifest(base = './voices/'): Promise<number> {
  try {
    const r = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    if (!r.ok) return 0;
    const j = (await r.json()) as { clips?: string[] };
    manifest = new Set(j.clips ?? []);
    return manifest.size;
  } catch {
    return 0;
  }
}

export function recordedClipCount(): number {
  return manifest?.size ?? 0;
}

/** Phrases the app needed but had no recording for (shown in the grown-up corner). */
export function missingPhrases(): { lang: Lang; text: string }[] {
  return [...missing.values()];
}

function clipUrl(lang: Lang, id: string) {
  return `./voices/${lang}/${id}.mp3`;
}

function loadClip(lang: Lang, text: string, track = true): Promise<AudioBuffer | null> | null {
  const id = phraseId(lang, text);
  if (!manifest || !manifest.has(`${lang}/${id}`)) {
    if (manifest && manifest.size && track) missing.set(`${lang}/${id}`, { lang, text });
    return null;
  }
  const key = `${lang}/${id}`;
  let p = bufferCache.get(key);
  if (!p) {
    p = (async () => {
      try {
        const ctx = audioContext();
        if (!ctx) return null;
        const r = await fetch(clipUrl(lang, id));
        if (!r.ok) return null;
        const data = await r.arrayBuffer();
        return await new Promise<AudioBuffer | null>((res) => {
          ctx.decodeAudioData(data, (b) => res(b), () => res(null));
        });
      } catch {
        return null;
      }
    })();
    bufferCache.set(key, p);
  }
  return p;
}

/** Download every recorded clip so the app talks with no internet. */
export async function preloadAllClips(onProgress?: (done: number, total: number) => void): Promise<number> {
  if (!manifest) return 0;
  const all = [...manifest];
  let done = 0;
  for (const key of all) {
    try {
      await fetch(`./voices/${key}.mp3`);
    } catch {
      /* keep going */
    }
    done++;
    onProgress?.(done, all.length);
  }
  return done;
}

let currentSource: AudioBufferSourceNode | null = null;

function playBuffer(buf: AudioBuffer, gen: number): Promise<void> {
  return new Promise((resolve) => {
    const ctx = audioContext();
    if (!ctx || gen !== generation) return resolve();
    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 1;
      src.connect(g).connect(ctx.destination);
      currentSource = src;
      const w = window as unknown as { __clipsPlayed?: number };
      if (typeof w.__clipsPlayed === 'number') w.__clipsPlayed++;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        if (currentSource === src) currentSource = null;
        resolve();
      };
      src.onended = finish;
      window.setTimeout(finish, buf.duration * 1000 + 400);
      src.start();
    } catch {
      resolve();
    }
  });
}

// ---------------- built-in voice (fallback) ----------------

const LOCALES: Record<Lang, string[]> = {
  en: ['en-US', 'en-GB', 'en'],
  es: ['es-MX', 'es-US', 'es-419', 'es-ES', 'es'],
};

const PREFERRED: Record<Lang, string[]> = {
  en: ['Samantha', 'Karen', 'Moira', 'Google US English'],
  es: ['Paulina', 'Mónica', 'Monica', 'Juan', 'Google español de Estados Unidos', 'Google español'],
};

const hasTTS = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

let voices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  try {
    if (hasTTS()) voices = window.speechSynthesis.getVoices();
  } catch {
    voices = [];
  }
}
if (hasTTS()) {
  loadVoices();
  try {
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
  } catch {
    /* ignore */
  }
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices();
  for (const name of PREFERRED[lang]) {
    const v = voices.find((x) => x.name.startsWith(name) && x.lang.toLowerCase().startsWith(lang));
    if (v) return v;
  }
  for (const loc of LOCALES[lang]) {
    const v = voices.find((x) => x.lang.replace('_', '-').toLowerCase() === loc.toLowerCase());
    if (v) return v;
  }
  return voices.find((x) => x.lang.toLowerCase().startsWith(lang));
}

let generation = 0;

function utterTTS(text: string, lang: Lang, rate: number, gen: number): Promise<void> {
  return new Promise((resolve) => {
    if (gen !== generation || !hasTTS()) return resolve();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    // Safety net: some browsers never fire onend, or block speech entirely.
    window.setTimeout(finish, 900 + text.length * 95);
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = LOCALES[lang][0];
      const v = pickVoice(lang);
      if (v) u.voice = v;
      u.rate = rate;
      u.pitch = 1.1;
      u.onend = finish;
      u.onerror = finish;
      window.speechSynthesis.speak(u);
    } catch {
      finish();
    }
  });
}

async function sayOne(ph: Phrase, lang: Lang, rate: number, gen: number): Promise<void> {
  const text = ph[lang];
  // recorded line → recorded plain version (e.g. without a name) → built-in voice
  for (const t of ph.alt ? [text, ph.alt[lang]] : [text]) {
    const clip = loadClip(lang, t, t === text);
    if (!clip) continue;
    const buf = await clip;
    if (gen !== generation) return;
    if (buf) return playBuffer(buf, gen);
  }
  return utterTTS(text, lang, rate, gen);
}

// ---------------- public API ----------------

export interface SpeakOptions {
  /** Stop whatever is being said first (default true). */
  interrupt?: boolean;
  rate?: number;
  /** Force a single language regardless of mode. */
  only?: Lang;
}

let current: Promise<void> = Promise.resolve();

/** Resolves once whatever is being said right now has finished (or been interrupted). */
export function whenQuiet(): Promise<void> {
  return current;
}

/** Speak one or more phrases in the active language mode. Never rejects. */
export function speak(phrases: Phrase | Phrase[], opts: SpeakOptions = {}): Promise<void> {
  const run = speakNow(phrases, opts).catch(() => undefined);
  current = run;
  return run;
}

async function speakNow(phrases: Phrase | Phrase[], opts: SpeakOptions): Promise<void> {
  const list = Array.isArray(phrases) ? phrases : [phrases];
  // tests can collect every line the app asks to say, to check the voice catalog covers it
  const log = (window as unknown as { __spoken?: Phrase[] }).__spoken;
  if (log) log.push(...list);
  if (!settings.enabled) return;
  if (opts.interrupt !== false) {
    generation++;
    const mine = generation;
    const busy = cancelAll();
    // iOS Safari can drop an utterance queued right after cancel(); give it a moment
    if (busy) await new Promise((r) => setTimeout(r, 70));
    if (mine !== generation) return;
  }
  const gen = generation;
  try {
    if (hasTTS() && window.speechSynthesis.paused) window.speechSynthesis.resume();
  } catch {
    /* ignore */
  }
  const langs = opts.only ? [opts.only] : spokenLangs(settings.mode);
  const rate = opts.rate ?? 0.92;
  for (const lang of langs) {
    for (const ph of list) {
      if (gen !== generation) return;
      await sayOne(ph, lang, rate, gen);
    }
  }
}

/** Stop any clip or built-in speech. Returns true if something was playing. */
function cancelAll(): boolean {
  let busy = false;
  if (currentSource) {
    busy = true;
    try {
      currentSource.stop();
    } catch {
      /* ignore */
    }
    currentSource = null;
  }
  if (hasTTS()) {
    try {
      busy = busy || window.speechSynthesis.speaking || window.speechSynthesis.pending;
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
  }
  return busy;
}

export function stopSpeech() {
  generation++;
  cancelAll();
}

/** iOS needs the first utterance inside a tap. Call from a tap handler. */
export function unlockSpeech() {
  if (!hasTTS()) return;
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
