// Records every line in voices/phrases.json with ElevenLabs → public/voices/<lang>/<id>.mp3
// and writes public/voices/manifest.json. Only lines without a recording are generated,
// so re-running after adding a game costs only the new lines.
//
// Needs (as GitHub secrets, or env vars when run on a computer):
//   ELEVENLABS_API_KEY, VOICE_ID_EN, VOICE_ID_ES
// Optional:
//   ELEVEN_MODEL     (default eleven_multilingual_v2)
//   REDO             comma-separated ids to re-record (e.g. lines you didn't like)
//   LIMIT            only record this many new lines (for a cheap first sample)
//   NAMES            comma-separated names, to also record praise with names (these clips become public)

import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { phraseIdJs } from './phrase-id.mjs';

const KEY = process.env.ELEVENLABS_API_KEY;
const VOICES = { en: process.env.VOICE_ID_EN, es: process.env.VOICE_ID_ES };
const MODEL = process.env.ELEVEN_MODEL || 'eleven_multilingual_v2';
const REDO = new Set((process.env.REDO || '').split(/[\s,]+/).filter(Boolean));
const LIMIT = Number(process.env.LIMIT || 0);
/** stop before using more than this many characters (ElevenLabs credits) in one run; 0 = no limit */
const MAX_CHARS = Number(process.env.MAX_CHARS || 0);
const NAMES = (process.env.NAMES || '').split(',').map((s) => s.trim()).filter(Boolean);

if (!KEY || !VOICES.en || !VOICES.es) {
  console.error('::error title=Voice recording failed::Missing ELEVENLABS_API_KEY, VOICE_ID_EN or VOICE_ID_ES.');
  process.exit(1);
}

// Soft, warm, a little slower than normal: a preschool-teacher feel.
const VOICE_SETTINGS = { stability: 0.6, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed: 0.9 };

const lines = JSON.parse(readFileSync('voices/phrases.json', 'utf8'));

// optional: praise with the children's names
for (const n of NAMES) {
  for (const [en, es] of [
    [`Great job, ${n}!`, `¡Muy bien, ${n}!`],
    [`You did it, ${n}!`, `¡Lo hiciste, ${n}!`],
    [`Wow, ${n}!`, `¡Guau, ${n}!`],
    [`All done, ${n}! Great playing!`, `¡Terminamos, ${n}! ¡Qué bien jugaste!`],
    [`Hi ${n}! What do you want to play?`, `¡Hola ${n}! ¿Qué quieres jugar?`],
    [`Hi ${n}! It's time for your brain workout!`, `¡Hola ${n}! ¡Es hora de tu ejercicio mental!`],
    [`Great job today, ${n}! Your brain did a big workout.`, `¡Muy buen trabajo hoy, ${n}! Tu cerebro hizo mucho ejercicio.`],
    [`You already did your brain workout today, ${n}!`, `¡Ya hiciste tu ejercicio mental hoy, ${n}!`],
  ]) {
    lines.push({ id: phraseIdJs('en', en), lang: 'en', text: en }, { id: phraseIdJs('es', es), lang: 'es', text: es });
  }
}

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function record(line) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICES[line.lang]}?output_format=mp3_44100_128`;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text: line.text, model_id: MODEL, voice_settings: VOICE_SETTINGS }),
    });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const body = await r.text();
    if (r.status === 429 || r.status >= 500) {
      await sleep(1500 * attempt);
      continue;
    }
    throw new Error(`ElevenLabs ${r.status}: ${body.slice(0, 300)}`);
  }
  throw new Error('ElevenLabs kept refusing (rate limit). Try again later.');
}

/** Even out loudness and add tiny fades, so no line is suddenly loud or clicks. */
function polish(file) {
  if (!hasFfmpeg) return;
  const tmp = file + '.tmp.mp3';
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.02', '-b:a', '96k', tmp], { stdio: 'ignore' });
    rmSync(file);
    execFileSync('mv', [tmp, file]);
  } catch {
    if (existsSync(tmp)) rmSync(tmp);
  }
}

const todo = lines.filter((l) => REDO.has(l.id) || !existsSync(`public/voices/${l.lang}/${l.id}.mp3`));
let batch = LIMIT ? todo.slice(0, LIMIT) : todo;
if (MAX_CHARS) {
  let used = 0;
  batch = batch.filter((l) => (used + l.text.length <= MAX_CHARS ? ((used += l.text.length), true) : false));
}
console.log(`${lines.length} lines, ${lines.length - todo.length} already recorded, recording ${batch.length} now (model ${MODEL}).`);
const chars = batch.reduce((n, l) => n + l.text.length, 0);
console.log(`About ${chars} characters of ElevenLabs credit.`);

mkdirSync('public/voices/en', { recursive: true });
mkdirSync('public/voices/es', { recursive: true });

let done = 0;
const CONCURRENCY = 3;
let next = 0;
async function worker() {
  while (next < batch.length) {
    const line = batch[next++];
    const file = `public/voices/${line.lang}/${line.id}.mp3`;
    writeFileSync(file, await record(line));
    polish(file);
    done++;
    if (done % 25 === 0 || done === batch.length) console.log(`  ${done}/${batch.length}`);
  }
}
let failure = null;
try {
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
} catch (e) {
  failure = String(e?.message || e).replace(/\s+/g, ' ').slice(0, 900);
}

// manifest: every line that has a recording, with its text (used by the voice check screen)
const clips = lines.filter((l) => existsSync(`public/voices/${l.lang}/${l.id}.mp3`));
const unique = new Map(clips.map((l) => [`${l.lang}/${l.id}`, l.text]));
writeFileSync(
  'public/voices/manifest.json',
  JSON.stringify({ generated: new Date().toISOString(), model: MODEL, clips: [...unique.keys()], text: Object.fromEntries(unique) }) + '\n',
);
console.log(`manifest: ${unique.size} recorded lines.`);
console.log(`::notice title=Voices::${unique.size} of ${lines.length} lines recorded (${lines.length - unique.size} still use the iPad voice).`);

if (failure) {
  // out of monthly credits: keep what was recorded, finish the rest next month
  const quota = /quota|credits|exceed/i.test(failure);
  console.error(`::${quota ? 'warning' : 'error'} title=${quota ? 'Out of ElevenLabs credits for now' : 'Voice recording failed'}::${failure}`);
  if (!quota) process.exit(1);
}
