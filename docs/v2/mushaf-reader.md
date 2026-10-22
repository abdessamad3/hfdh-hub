# Printed Madinah Warsh reader

The owner chose Madinah Warsh. The integrated website's **Mushaf** screen now uses the printed King Fahd Complex Warsh edition, with its own page artwork and verse regions. No browser font typesets or reflows the Quran text, and Hafs numbering is not substituted.

## Sources and versions

- Artwork/geometry: `quran-ws/quran-svg`, commit `b4155f07e4aea087d2c458069acff9f7c7e749f6`, directory `mushafs/warsh/kfqc`.
- Publisher ancestor recorded by that source: `1442-ai-warsh.zip`, SHA-256 `2a0c65131dac5a922502fb4740034fb4ffc57792a0b6e5c1cc34c5a3339dd5d7`.
- Navigation: `quran-center/quran-meta`, commit `3b7afc7f8c905da3d8fb3e8725f86805bd76b2bd`, `src/lists/WarshLists.ts` page and hizb-quarter starts. Surah names/counts/start pages come from the artwork edition. All 6,214 references were cross-checked for contiguous page coverage and every surah start agrees. That original source lacks Warsh eighth data. The later passage index adds source-checked eighth starts and corrects the shifted hizb starts; see `public/katatib/mushaf/passage-sources.md`.
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

### Passed release checks

Commit `75a0bf9a81bfae47e97657f6ae0cdf21331aba1a` passed [Katatib model/browser/Auth/Firestore checks](https://github.com/abdessamad3/hfdh-hub/actions/runs/39241275192) and [the application build](https://github.com/abdessamad3/hfdh-hub/actions/runs/39241275148). The page/surah tables use encoded immutable constants to stay within Firestore’s expression limit while preserving full reference validation. The emulator checks ordinary and boundary pages through page 604. No Firebase deployment was executed from this environment.

## Passage descriptions and hizb navigation correction

The tracker now imports a public offline-capable index of 480 eighth starts, with original KFQC Warsh opening words, the complete opening ayah, and current 604-page references. Data provenance and adaptation details are in `public/katatib/mushaf/passage-sources.md`; the reproducible builder is `scripts/katatib-passage-index.py`. Every non-surah opening preview is compared with the KFQC text; surah starts use the first numbered KFQC ayah. Inside-ayah boundaries retain a matched character offset. No inferred numeric quantity supplies a Quran boundary.

Twenty-two older hizb navigation offsets from the quarter-derived metadata were shifted relative to the checked textual starts. Only `hizbStarts` is corrected in the existing manifest. Artwork bytes/hashes, surah/ayah numbering, page starts, stored marks and learning records are unchanged. Student-to-Mushaf links validate the selected reference against the reader page, retain the intended student, and do not open the mark editor automatically. Archived student links have read-only reader controls; a missing student target never falls back to another student.

## Touch page turning

At Fit page, horizontal one-finger swipes turn pages. Arabic RTL maps a rightward swipe to next and leftward to previous; French/English LTR reverse that mapping. A minimum horizontal distance and strong horizontal dominance distinguish a turn from a tap, vertical scroll or diagonal drag. A gesture that began vertically cannot turn a page. Pinch/multi-touch cancels page recognition. While zoomed, horizontal gestures remain native panning; return to Fit page for swipe turns. Buttons remain available.

Swipes use the same bounded page-change function and unsaved-mark confirmation as the existing page buttons. No swipe can pass page 1 or 604, write a mark, or select a verse through its synthetic click. Listeners are removed on reader reset. Native vertical scrolling and pinch zoom are retained; physical Android/iOS acceptance remains separate from Chromium touch tests.

### Warsh Tajweed publisher reference

An admin can select the Warsh Tajweed publisher reference in **Personal reading** (Arabic, French or English). It opens the chosen publisher page (1–604) in a separate tab and requires internet. Its page number starts independently at 1 and is never inferred from the Madinah page or a student's passage. No publisher images, scripts or HTML are embedded, downloaded or cached by V2. Student sessions have no publisher-reference link. Native colour-edition rendering, assessment and whole-edition offline use remain pending permission and complete verified verse/page mapping.


### Admin personal reading and student sessions

Admins have two views on the same Mushaf screen: **Personal reading** and **Student session**. With active students available, the initial view is the assigned student session. Without any active student, personal reading is available immediately, and the student-session button is disabled. An explicit student/passage link always opens the assigned student session, regardless of the admin's personal edition preference. A linked archived student can still open their read-only session as before.

Personal reading has no student selector, grade/mark form, recorder, assignment editor, student-history fetch or classroom write. It uses the existing pinned, hash-verified artwork and cache for the integrated Madinah Warsh edition. It supports page/surah/hizb navigation, ayah selection for a reading label, fit/zoom, fullscreen, RTL/LTR swipe navigation, and the existing 604-page artwork download controls. The reading page scales into the remaining visible viewport; fullscreen expands it by hiding settings. The artwork download still requires the application shell to be prepared separately for a cold offline launch. Shared browser cache eviction limits remain unchanged.

The colour edition is selectable **only as a labelled online publisher reference**. Its page selector and numbering are independent of the integrated edition; choosing page 446 in one view does not imply correspondence with another edition. Offline opening is blocked with an online-only explanation. No unverified publisher coordinates are used for marking.

An admin's personal edition preference is stored under an account-specific localStorage key. It is a local preference, not a group setting, and contains only the edition ID. Reading page positions remain in memory within the view. A blocked localStorage implementation falls back to an in-memory choice. Switching accounts resets reading state and uses that account's own preference. No student data is stored in this preference.

Switching to personal reading retains the student's last page, ayah and recitation context for returning. A changed student does not inherit the previous student's recitation link when this position is retained. Unsaved marks require confirmation before leaving. Active recording, unbacked audio and an in-flight save block switching; a recording already saved locally remains in the existing durable library. An active artwork download must be completed or cancelled before leaving personal reading. Teachers, managers, students and parents keep their existing assigned student view; they do not receive the admin's personal edition selector.

Chromium coverage in `tests/katatib-mushaf-modes-browser.cjs` checks zero student requests during personal reading, no classroom writes, no-student/all-archived access, role restrictions, account preference isolation, direct student targets, preservation of the selected student/page, cancelled draft navigation, active MediaRecorder protection and durable IndexedDB audio, offline verified cached artwork, publisher-link limitations, stale artwork responses, and Arabic/French/English layouts at widths 390/820/1366. Physical Android/iOS acceptance and live cloud-audio acceptance remain separate.
