# Printed Madinah Warsh reader

The owner chose Madinah Warsh. The integrated website's **Mushaf** screen now uses the printed King Fahd Complex Warsh edition, with its own page artwork and verse regions. No browser font typesets or reflows the Quran text, and Hafs numbering is not substituted.

## Sources and versions

- Artwork/geometry: `quran-ws/quran-svg`, commit `b4155f07e4aea087d2c458069acff9f7c7e749f6`, directory `mushafs/warsh/kfqc`.
- Publisher ancestor recorded by that source: `1442-ai-warsh.zip`, SHA-256 `2a0c65131dac5a922502fb4740034fb4ffc57792a0b6e5c1cc34c5a3339dd5d7`.
- Navigation: `quran-center/quran-meta`, commit `3b7afc7f8c905da3d8fb3e8725f86805bd76b2bd`, `src/lists/WarshLists.ts` page and hizb-quarter starts. Surah names/counts/start pages come from the artwork edition. All 6,214 references were cross-checked for contiguous page coverage and every surah start agrees. No eighth-hizb boundaries were invented: that source explicitly lacks verified Warsh eighth data.
- Quran.ws metadata/geometry: CC BY 4.0. Original artwork retains the publisher's usage terms; the source reproduces permission for website/software use. Navigation metadata: MIT. Full notices are distributed under `public/katatib/mushaf/` and linked from the reader.

References:

- <https://github.com/quran-ws/quran-svg/blob/b4155f07e4aea087d2c458069acff9f7c7e749f6/LICENSE>
- <https://github.com/quran-ws/quran-svg/blob/b4155f07e4aea087d2c458069acff9f7c7e749f6/docs/PROVENANCE.md>
- <https://quran.ws/docs/build/display-page/>
- <https://github.com/quran-center/quran-meta/tree/3b7afc7f8c905da3d8fb3e8725f86805bd76b2bd>

This records source provenance and technical checks, not an independent religious certification of every page. Qualified teacher review against the chosen printed edition remains part of acceptance.

## Reader behavior

The 604-page reader has page, surah and hizb navigation, previous/next verse and page controls, keyboard-selectable verse regions, and 100–200% zoom. Zoom enlarges the printed page in a scrolling viewport. It does not change line breaks. The opening spread is fitted by its original artwork bounds without moving individual paths.

Teacher/admin/scoped manager accounts select an authorized active student and save ن (forgot), ت (hesitated), خ (error) or ص (correct), plus an optional note. The transparent verse region receives a color overlay; a separate page legend carries the reference, letter and meaning, preserving color-independent interpretation without inserting letters into the printed Quran text. The blue selection is the manually moved recitation cursor. Existing mistakes remain visible behind it.

Each mark is an immutable `katatib_verse_marks` record with student, edition, source version, exact page/surah/ayah, mark, note, authenticated author and server timestamp. A later correct mark becomes the current state while the earlier mistake remains in history. Retrying an interrupted save uses the same event ID; changing its payload cannot overwrite the saved entry. History for the selected page is read from the server, with failed reads clearing the visible page/history instead of presenting incomplete data as complete.

Parents/students can only read explicitly linked students' marks. Firestore independently validates the actual student scope, author, server timestamp, pinned edition and the exact Warsh page/verse range. It rejects family writes, cross-kuttab writes, changed/deleted marks and wrong edition/page references. It does not trust the page picker or client permissions.

## Network and memory

Full artwork totals approximately 345 MB, so the app does not download the book at startup or add it to Firebase Hosting. It fetches one public SVG at a time from the immutable GitHub commit. Student names, identifiers, notes and credentials are never added to those requests; cookies and referrers are omitted. Three pages at most are retained in memory, cleared when leaving the reader.

Every response must match the page's pinned byte length and Git blob SHA-1 fingerprint before parsing. The parser accepts only the required inert SVG elements/attributes, rejects executable or remote content, and checks that its verse regions exactly match the chosen page's Warsh index. An unavailable, changed or mismapped page is not displayed. This is not a durable offline-book feature; public artwork still needs connectivity when not in the small memory cache.

## Audio boundary

The reader links teachers to the existing local recorder. It explicitly says that shared per-verse recordings are not yet attached. It does not invent playback files or claim the separate shared-audio/offline/retention requirements are complete.

## Verification and deployment

Model tests cover all page references, Warsh/Hafs boundaries, source-byte fingerprints, malformed inputs, immutable retries and history. Chromium tests use actual pinned opening/middle/final/hizb pages to check selection, unchanged glyph paths, letters, marking/history, lost acknowledgements, family view, mobile zoom, loading failure and tamper rejection. Firestore emulator tests enforce real mark permissions and exact page validation. Physical-device and qualified-content acceptance remain separate.

The change stays on `katatib-v2/teacher-preview`; no production merge, original-database writes or billing changes. Once checks pass, the owner deploys the existing test project from Cloud Shell using `git pull --ff-only` then `bash scripts/deploy-katatib-connected.sh`. No new Mushaf-specific Firebase provider or credentials are required.
