// Lists female Spanish voices with a Mexican / Latin American accent from the ElevenLabs
// Voice Library → voices/candidates.json (name, id, accent, preview link). Costs no credits.
import { writeFileSync } from 'node:fs';

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error('::error title=Find voices::Missing ELEVENLABS_API_KEY');
  process.exit(1);
}

const queries = [
  { language: 'es', accent: 'mexican', gender: 'female' },
  { language: 'es', accent: 'latin american', gender: 'female' },
  { language: 'es', search: 'mexicana', gender: 'female' },
  { language: 'es', search: 'mexican', gender: 'female' },
  { language: 'es', search: 'latina', gender: 'female' },
];

const seen = new Map();
for (const q of queries) {
  const params = new URLSearchParams({ page_size: '40', sort: 'usage_character_count_1y', ...q });
  const r = await fetch(`https://api.elevenlabs.io/v1/shared-voices?${params}`, { headers: { 'xi-api-key': KEY } });
  if (!r.ok) {
    console.log(`query ${params} → ${r.status} ${(await r.text()).slice(0, 200)}`);
    continue;
  }
  const j = await r.json();
  for (const v of j.voices ?? []) {
    if (seen.has(v.voice_id)) continue;
    seen.set(v.voice_id, {
      name: v.name,
      voice_id: v.voice_id,
      accent: v.accent,
      language: v.language,
      locale: v.locale,
      age: v.age,
      use_case: v.use_case,
      descriptive: v.descriptive,
      description: (v.description || '').slice(0, 240),
      uses: v.usage_character_count_1y,
      cloned_by: v.cloned_by_count,
      preview: v.preview_url,
      found_by: Object.values(q).join(' '),
    });
  }
}
const list = [...seen.values()].sort((a, b) => (b.uses ?? 0) - (a.uses ?? 0));
writeFileSync('voices/candidates.json', JSON.stringify(list, null, 1) + '\n');
console.log(`::notice title=Find voices::${list.length} voices found`);
