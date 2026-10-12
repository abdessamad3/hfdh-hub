# Recitation lab (test page)

A separate, throwaway test page: it listens to a recitation in the browser and
highlights the verse the reciter is on (Hafs). It is **not** part of the main app,
has no database, and nothing is uploaded: the speech model runs on the phone.

## What is here
- `src/match.js` follows the recitation (matches the words heard to the Quran text).
- `src/asr.worker.js` runs the speech model (`config.js` → `MODEL_ID`) off the main thread.
- `src/audio.js` microphone / audio-file input and the optional WAV export.
- `src/gate.js` shared-password gate (a simple lock, not real security).
- `tests/run.mjs` offline checks of the matching logic.

## Quran text
`public/data/quran-uthmani.txt` must be the Tanzil Uthmani text in the
`surah|ayah|text` format, **unmodified, with its copyright notice kept at the end**
(Tanzil, CC BY 3.0, https://tanzil.net). The page shows the credit in its footer.

## Password
Leave `PASSWORD_HASH` empty in `config.js`, open the deployed page: it shows a
form that turns a chosen password into a hash. Paste the hash into `config.js`.
The hash is public once committed, so use a password you do not use anywhere else.

## Run
```
cd recitation-lab
npm install
npm run dev      # local test, password gate is skipped on localhost
npm run build    # output in dist/
FIXTURE_JSON=/path/to/verses.json npm test
```
