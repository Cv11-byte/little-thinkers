# Little Thinkers · Pequeños Pensadores

Bilingual (Spanish / English) learning games for two little brothers, made for little fingers on an iPad.
No ads, no accounts, no internet needed after the first visit. Everything is saved on the iPad.

## The games

| Game | Learning goal | What the child does |
|---|---|---|
| 🚀 Rocket Maze · Laberinto Espacial | Problem-solving | Drag the astronaut along the road to the rocket. Dead ends say "no way out". |
| 🎈 Pop & Tap · Revienta y Toca | Colors & counting | "Pop 3 red balloons": exactly 3 red ones, a tray fills one slot per pop. Rounds switch between balloons, soccer balls and footballs. |
| ✍️ Trace Numbers · Traza Números | Numbers & finger control | Numbers 1–10 (1–5 at level 1), picking up where the child left off; it glows, finishes itself near the end, then counts objects. |
| 🏡 Animal Homes · Casas de Animales | Sorting & logic | Drag animals to drawn scenes: ocean, farm, tree, sky. Only obvious pairs. |
| 🍎 Feed the Animals · Dales de Comer | Counting & comparing | "Give the bear 2 apples." Top level: "Which plate has more?" |
| 🐘 Find the Animal · ¿Dónde Está? | Listening & words | "¿Dónde está el perro?" Tap the animal; a new one every round, from 23 animals. |
| 🎶 Copy Me · Cópiame | Memory | "Mírame primero y luego tú": a helper hand shows the pattern while the pads are locked, then "¡Ahora tú!". |
| 🔷 Shapes & Shadows · Figuras y Sombras | Shapes & fine motor | Alternates a wooden shape board (12 shapes, look-alikes at the top level) with matching fruit, vehicles, animals or toys to their shadows. |
| 🤗 Help a Friend · Ayuda a un Amigo | Feelings & kindness | A friend shows what they need (shivering in snow → jacket, a plate in their thought bubble → food). Also "Who feels sad?" |
| 🧱 Block Builder · Construye | Creativity | Free building with stacking blocks, counted out loud. |

### Toddler guardrails

* While an instruction is being spoken, and right after a wrong try, taps are ignored, so wild tapping can't "win".
* Choices float in one at a time, giving thinking time.
* No spoken praise after every round: a big star celebration instead, and now and then "¡Muy bien!" with the child's name.
* The 🏠 button must be held for about a second to leave a game.
* A resting palm on the screen doesn't block the finger that's playing.
* To keep the kids inside the app, use the iPad's **Guided Access** (see below).

### Levels

Each game has levels 1–4 per child. Level 1 is made for the younger child (two choices, very forgiving).
The older child starts at level 2. Levels change only between puzzles:

* 3 puzzles in a row solved with no hint and at most one wrong try → one level up
* 3 puzzles in a row that needed a hint or 3+ tries → one level down
* After 2 wrong tries in a puzzle, a hint appears automatically

A grown-up can also set levels by hand in the grown-up corner.

### Brain Workout (once a day)

The big blue card at the top of each child's menu. A guided session with no choosing:

1. A short welcome, then a map showing every stop.
2. Games in a set order (easy warm-up first), a few rounds each.
3. "Move breaks" between games: jump like a frog, stretch like a giraffe, stomp like an elephant.
4. The finale, **Rocket Rescue**: fix the astronaut's rocket using every skill (pick the right color fuel,
   count stars, find the shape that fits the door, copy the lights, help a sad alien, then count down 3-2-1).
5. A goodbye screen: "All done for today, see you tomorrow, time to turn off the iPad." Only a grown-up can close it.

Length is set per child in the grown-up corner (10 / 20 / 30 min; defaults: older child 20, younger child 10). If a session runs long,
it skips ahead to the finale. It can be done once a day; the grown-up corner can allow another one.

### Languages

The flag button (home, menus and inside every game) switches English → Español → Both with one tap.
"Both" shows Spanish on top and English underneath, and says each instruction in Spanish, then English.
Voices are the iPad's built-in voices (Spanish uses a Mexican voice when available).

## Put it on the iPad

1. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Every push to `main` runs the tests and publishes the app to `https://YOUR-NAME.github.io/little-thinkers/`.
3. On the iPad, open that link in **Safari → Share → Add to Home Screen**. It opens full screen and works offline.
4. Open the grown-up corner (🔒, hold 2 s) and type the children's names. They're saved only on the iPad.
5. Optional: **Settings → Accessibility → Guided Access** keeps the kids inside the app (triple-click the side button to start).

## Recorded voices (ElevenLabs)

The app plays recorded clips when they exist and uses the iPad's built-in voice for anything else.

1. In ElevenLabs, pick one English and one Spanish voice in the Voice Library (warm / gentle / storyteller), and copy
   each **Voice ID**. Create an **API key** (Profile → API Keys).
2. In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**, add
   `ELEVENLABS_API_KEY`. The two chosen voices are already set in `.github/workflows/voices.yml`
   (add `VOICE_ID_EN` / `VOICE_ID_ES` secrets to switch voices without editing it).
3. **Actions → "Record voices (ElevenLabs)" → Run workflow.** Type `20` in "limit" the first time for a cheap sample,
   listen on the iPad, then run it again with "limit" empty to record everything (~1,150 lines, about 30,000 characters).
4. The workflow saves the clips to the repo and republishes the app. On the iPad, grown-up corner → Voices →
   "Save voices for offline play".
5. Don't like a line? Grown-up corner → Voices → "Listen to every line", copy its code (e.g. `es/1a2b3c4d`) and put it
   in the "redo" box next time you run the workflow.

Adding a game or changing a sentence: run the workflow again; only new lines are recorded. `npm run phrases`
regenerates the list of lines (`voices/phrases.json`); a test fails if it is out of date.

If there's no voice: the iPad's silent switch / volume, or Settings → Accessibility → Spoken Content → Voices to download
a Spanish (Mexico) voice like "Paulina".

## Grown-up corner

Tap the small 🔒 on the home screen, hold the button for 2 seconds, then tap the number that matches the word.
There you can change language, sounds, a play-time limit, see each child's progress, adjust levels, and reset progress.

## Develop

Requires Node 20+.

```bash
npm install
npm run dev            # http://localhost:5173 — also reachable from the iPad on the same Wi-Fi (use the Network URL)
npm run typecheck      # TypeScript strict checks
npm test               # unit + component tests (Vitest)
npm run build          # production build into dist/
npx playwright install chromium   # once
npm run test:e2e       # touch/drag tests on iPad-sized screens (landscape + portrait)
npm run build:single   # one self-contained HTML file in dist-single/
```

### Where things live

```
src/
  app/          App shell, kid profiles, stickers
  engine/       speech, sound effects, drag handling, stage (SVG) sizing, adaptive levels, saved progress, words
  games/        one folder per game + registry.ts (add a game here)
  screens/      home, menu, game shell, grown-up corner, stickers
  styles/       app.css
tests/          Vitest unit/component tests
e2e/            Playwright tests that actually drag and tap through every game
```

### Adding a game

Create `src/games/<name>/<Game>.tsx` exporting a `GameDef` (see `games/types.ts`), then add it to
`games/registry.ts`. A game gets a `RoundApi` with `level`, `instruct()`, `say()`, `mistake()`, `solved()`
and a `hint` counter; the game screen handles rounds, praise, levels, stickers, and saving.

### Recording your own voices (later)

All words live in `src/engine/i18n.ts` and `src/engine/words.ts`. The speech engine (`src/engine/speech.ts`)
is the single place to swap in recorded audio clips per phrase.
