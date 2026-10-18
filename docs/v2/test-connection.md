# Katatib test-project connection

The fictional workflow remains at `/`. A separate `/live/` page signs in with Google and reads copied student records and up to 20 copied attendance rows per student. It never edits copied student data, V1 attendance, user profiles or access grants; the attendance update below adds separate V2 records. It does not recalculate the original statistics. The original reader is retained; see the attendance update below for the new writable V2 path. This is not the completed V2.

## Project boundary

Only `katatib-64049` is accepted. The Firebase web configuration comes from Hosting's `/__/firebase/init.json`; the browser validates both project ID and auth domain before initializing the SDK. There is no copied private key, service account or password. The original `hifd-kouttab` app, config, rules, Hosting and data are not deployed or accessed by these scripts.

Authentication creates new accounts in the test project. Original Auth accounts are not imported. A first sign-in does not grant access. `katatib_access/{lowercase verified Google email}` is a separate test-only access document, provisioned by the owner's administrative CLI. The original copied `users` collection is neither changed nor trusted for this integration. A new Google UID therefore does not need to match an original UID.

An active admin grant reads all copied students with bounded queries. An active teacher grant reads only assigned `kuttabNames` and/or original `teacherIds`; these assignments are an OR, so specifying a kuttab explicitly grants its whole roster. Exact kuttab names are the V1 data boundary; unique kuttab IDs should replace this legacy name matching in the full V2 model. Users cannot write their own grants, list other grants, or write original collections; new V2 attendance writes are described below. Attendance access follows the actual referenced student's authorization, not a potentially stale kuttab field on an attendance row. All unspecified collections remain denied.

The roster fetch is limited to 100 students per assignment and reports when the cap is reached. History shows **up to 20 entries**, not necessarily the latest 20 (no ordered composite index is introduced in this first slice). Missing source values remain missing. The UI includes a search, kuttab filter and student profile with the copied history.

Google Auth uses browser-session persistence: Firebase stores the signed-in account and token in this tab’s sessionStorage so refreshes and deployments do not force another login. Firestore uses memory caching and server-only reads. Student rosters and drafts are not persisted to localStorage, sessionStorage, IndexedDB or a service worker. Explicit sign-out clears the Firebase login; there is no long-term remember-me option. Signing out immediately clears the visible roster/profile and invalidates outstanding requests. This cannot erase screenshots or data already seen by an authorized user; access revocation prevents further server reads.

## Owner setup in the Firebase console (once)

In **katatib-64049**, open **Authentication → Get started** if needed, then **Sign-in method → Google → Enable**. Choose the project's support email and save. Under **Authentication → Settings → Authorized domains**, ensure `katatib-64049.web.app` is listed. Add it if missing. No student login or original Auth import is required.

## Deploy from the existing Cloud Shell checkout

Use the checkout already used to publish the fictional preview:

```bash
cd ~/katatib-v2-preview/katatib-v2-preview
# If your checkout is instead ~/katatib-v2-preview, use that directory.
git pull --ff-only
bash scripts/deploy-katatib-connected.sh
```

The owner's screenshot showed a nested checkout, so choose the existing directory containing `scripts/`. The deployment script validates the test config, runs both model test suites, creates an admin access grant for `gcloud config get-value account`, then deploys **only test Firestore rules and test Hosting**. It uses existing gcloud credentials; it does not print tokens. An identical grant is a no-op; an existing different grant is never overwritten. If the gcloud account is not the intended test administrator, stop and choose the right Google account before running it.

Open `https://katatib-64049.web.app/live/` and sign in with that same Google account. The `/` fictional preview still works independently, with its old device-local saves.

## Give a teacher access

Run this as the owner in Cloud Shell, using the exact copied kuttab name:

```bash
python3 scripts/katatib-test-access.py --email TEACHER_GOOGLE_EMAIL --role teacher --kuttab 'EXACT COPIED KUTTAB NAME'
```

For records attached only by the original teacher UID, add `--teacher-id ORIGINAL_UID`. Neither value should be guessed from the new test UID. To revoke access, set `active` to false in that account's test `katatib_access` document using the Firebase console. Do not change the original `users` records. Have the teacher sign out/in after an assignment change.

## Verification and limits

- Model checks reject the original project/config, invalid/inactive roles and unassigned teachers; they preserve missing values and deduplicate scope overlaps.
- Browser checks use a mocked auth/data adapter to verify sign-in UI, denial, safe display, roster/profile, sign-out races, Arabic/French and phone/desktop layouts. They do **not** establish that the owner's live Google OAuth configuration works.
- Firestore emulator checks exercise the actual rules for strangers, revoked users, unverified email, password-provider impersonation, wrong kuttab queries, forged attendance scope, unbounded reads and every client write.
- Owner live smoke test remains: sign in, see the copied roster, open a profile, sign out; try an ungranted Google account and confirm denial. No production account/data is needed for this test.
- Production rules, a V2 permissions editor, profile migrations and offline synchronization are future work. This test reader does not implement them.

## Update: Firebase attendance saving

The connected app now has **Students** and **Attendance** tabs. Copied students and V1 `attendance` remain read-only. The only new client write paths are `katatib_attendance` and its immutable `katatib_attendance_history` collection in the test project.

Select the date (initially the Africa/Casablanca business date), morning/afternoon/evening session and optional kuttab filter. Each student has five attendance statuses plus explicit **unmarked**, a bounded note and an individual Firebase Save button. A save applies to that student/date/session only. Changing filters does not silently save or discard drafts. Missing and unmarked attendance are distinct from absent. The V1 attendance-rate statistic is not recalculated from these V2 test records.

Every successful changed save uses a Firestore transaction that writes the current state and a new history snapshot atomically. Record IDs include the student/date/session; revisions start at 1 and increment by exactly one. Rules require the signed-in teacher/admin to have access to the actual student, bind the writer UID and server timestamp, validate fields/status/note limits, prevent scope changes and require the matching history snapshot. Original collections, access grants, history updates/deletions and current-record deletions remain forbidden to browser clients.

Transactions compare the revision originally loaded by the page. A competing edit is rejected, retaining the local draft; the teacher can explicitly reload the row (after confirming draft loss) and edit again. Retrying an already committed identical payload is a no-op, including after an acknowledgement was lost. History is append-only; the profile displays up to 20 V2 changes separately from the copied V1 attendance. The bounded history query is not guaranteed to select the latest 20 globally.

Saving is explicit **per student**, not an atomic whole-class save. The interface only reports saved after Firebase acknowledges the transaction. Network or permission failure retains the draft with an error; this slice requires Internet and does not queue writes offline. Drafts remain in memory only, with a leave warning and a sign-out confirmation. Leaving/signing out cannot cancel a transaction already submitted; it may still commit, and the next server reload is authoritative. The later login-persistence fix below keeps authentication across reloads in the same tab.

Use the same `scripts/deploy-katatib-connected.sh` after pulling this update. It runs 24 model tests and deploys only test rules/Hosting. Live owner verification: record one student's attendance and note, save, reload/sign in again and verify; choose another session/date and confirm independence; check the profile's V2 history. Teacher denial and concurrent edits are also exercised by the real emulator suite. The Google browser flow remains covered by a mocked provider in CI and requires the live owner smoke test.

## Update: memorization, revision and evaluations

The **Learning** tab records a student, learning type, date/session, hizb (1–60), inclusive eighth range (1–8 in that hizb) and note. A range spanning two hizbs must use two records. These are portion identifiers, not a verified Warsh verse/page mapping; this slice does not display Quran text.

Revision and evaluation require an integer mistake count (0–999) and a **teacher-entered** integer score (0–100). Memorization has neither a mistake count nor a score. No scoring formula is invented. Existing V1 progress, totals, ranks and attendance statistics are not recalculated from V2 entries; overlap and aggregation policy remain to be agreed.

New records go only to `katatib_learning`. Records are immutable; authorized teachers can append a linked correction for the same student and learning type, preserving the original. Corrections may correct the date, portion, note or entered grade. The UI marks originals with a linked correction present in the displayed results; it does not claim to compute an authoritative total from correction chains or choose between simultaneous corrections.

A generated record intent ID remains stable during an unconfirmed save. The form is locked for retry with the same content until that save succeeds, avoiding duplicate records after a lost acknowledgement. Retrying an already committed identical record by its original author is a no-op; different content under the same ID is rejected. Drafts remain in memory with the existing leave/sign-out warnings. Internet is required. There is no background/offline queue.

Both the Learning tab and student profile read **up to 30 V2 learning entries** for the selected student, sorted within that returned set. The bounded query does not guarantee the latest 30 globally. Earlier entries remain in Firestore; pagination is future work. Notes/names are escaped, missing legacy statistics remain missing, and switching students resets the form after confirming any unsaved changes.

Actual emulator tests cover all three types, server-side scope/schema checks, teacher-grade boundaries, original-record preservation, linked corrections, idempotent retries, unauthorized reads/writes and revocation. Browser tests mock auth/server responses and exercise form entry, corrections, failure/retry, profile history, Arabic/French and mobile layout. The owner live smoke test remains: save each type, reload/sign in, verify history, and append a correction.

Deploy this update with the same fixed-test-project script after pulling the branch. The script now runs **32 model tests**. Google setup and owner access need not be repeated if the previous test app already works.

## Fix: edits update one displayed learning record

The Learning tab and student profile now show **one current row per logical learning record**. Editing updates that row's portion, grade and note. Previous values are collapsed under **Change history**. The action is labeled **Edit / تعديل / Modifier**, and the form saves an edit rather than presenting it as another lesson. Separate new learning entries remain separate even if their student, date and portion match.

This also applies to existing corrections already saved during testing: linked versions are resolved at read time without rewriting or deleting them. Complete correction chains are fetched in student-scoped pages of 30 before displaying current records, so a correction beyond the first page cannot leave an obsolete original in the main list. The safety cap is 1,000 versions per student; exceeding it fails with a history error instead of displaying a misleading partial result. A paginated current-record projection is future scaling work.

Concurrent branches are grouped as one record, choose the newest saved leaf deterministically and display a warning to review the change history; the interface does not silently discard competing versions. Missing/cyclic/cross-student links fail closed. Current displays use the shared resolution function, preventing the Learning tab and profile from disagreeing. Original entries and previous versions remain preserved; this fix does not change copied V1 data or require a migration. There are now **40 model tests**, plus browser and real-emulator checks.

## Update: confirmed memorization and portion progress

New learning records use schema version 2 and offer **Confirmed memorization**, **Needs practice**, **Revision** and **Evaluation**. Confirmed memorization requires the teacher to tick an explicit mastery confirmation in the form. Practice has no grade and adds no confirmed coverage. Revision/evaluation retain teacher-entered mistakes/scores and do not increase memorized coverage. No automatic scoring formula, weighted grade or ranking is introduced.

The Learning tab and profile display a shared progress calculation over the current versions of that student's records. Each hizb/eighth maps to one of 480 positions; overlapping confirmed portions and repeated entries count once. Editing a portion replaces its old contribution. A memorization/practice record can be edited into the other state, preserving its history; graded types remain fixed. Competing correction branches are flagged and excluded from certified coverage pending review.

Before this decision, schema-version-1 test memorization entries did not explicitly certify mastery. They remain intact and appear as requiring teacher review; they do not silently become confirmed. Editing and explicitly confirming such a record saves a version-2 correction and counts its current portion. New browser writes must use schema version 2; refresh old tabs after deploying rules and Hosting together.

The copied V1 quantity remains visible as the **V1 baseline**. It has no trusted portion map, so the app does not assume that N hizbs means hizbs 1 through N, and does not add V1 plus V2. Instead it displays copied V1 hizbs, uniquely confirmed V2 hizbs/eighths and a V2-only coverage bar, with a plain explanation of the unknown overlap. Missing/invalid V1 quantities remain unknown. Practice coverage means distinct portions with practice attempts, not an automatically resolved to-do list. No copied statistics or original documents are rewritten.

The owner should verify: save a confirmed portion, save an overlapping portion and confirm only new eighths increase coverage; save Needs practice and confirm no increase; edit confirmed coverage to Needs practice and confirm it is removed (unless another independent confirmed record still covers it). Reload/sign in and check the same figures in the student's profile. Check a pre-decision entry's review warning and confirm it explicitly if appropriate.

The fixed-test-project deployment script now runs **50 model tests**, followed in CI by browser and real-emulator checks for practice/confirmed transitions, overlap-safe calculations, review of legacy entries and teacher scope. Original production data, access grants and copied V1 records remain unchanged by the feature.


## Fix: remain signed in after refresh/deployment

The reader originally used `inMemoryPersistence`, deliberately forgetting login on every reload. This caused repeated Google login prompts after each update. It now initializes Firebase Auth with **browserSessionPersistence** and the popup resolver through `auth-session.mjs`. The same tab/origin restores its Firebase account and refreshes permitted data from the server after reload or a new Hosting release. The account still needs one initial login after installing this fix.

Explicit sign-out clears both the Firebase session and visible student data; a later reload remains signed out. An independently opened tab has its own session and must sign in. Browsers can copy sessionStorage into a duplicated/opener-created tab or restore tabs after restarting; do not treat closing a tab as an absolute account-revocation mechanism. Use the Sign out button when finished on a shared device. Private mode, cleared/blocked storage, revoked access or Firebase session expiry can require login again. No database rule or permission is relaxed.

Auth account/token persistence in **sessionStorage** is the intentional change. Copied student records, attendance drafts, learning drafts and Firestore caching remain in memory; there is no long-term localStorage/IndexedDB data cache. Auth restoration reruns the same server authorization and roster reads. Pagehide clears displayed data but does not sign out; explicit Sign out does.

CI now runs a separate Chromium integration using the actual Firebase Auth SDK, the same auth initialization helper and a local Auth emulator. It verifies restoration after repeated reloads, no Auth login in localStorage, an independent tab being signed out, and sign-out persisting across reload. The emulator creates fictional email/password accounts to isolate persistence; live Google OAuth remains the owner's smoke test. This change does not affect Cloud Shell/gcloud/Firebase CLI authorization.

## Fix: homepage opens the connected app

The test site's homepage `/` and `/index.html` now redirect to `/live/` with exact Hosting 302 rules. `/live/` remains the connected app and requires a real authorized sign-in. The fictional preview is explicitly at `/demo/`; its fictional teacher chip is sample UI and never creates or selects a Firebase account. The connected app's demo link points there, and the demo's sign-in link points back to the connected app.

The root HTML also has a small fallback link/refresh to the connected app. Existing demo assets and localStorage keys are retained, so moving the demo URL does not wipe its device-local saves. Both test Hosting configs agree on entry routing; original production Hosting is unchanged. Browser checks now exercise the homepage redirect to the sign-in screen and run the original fictional workflow at `/demo/`.

Deploy using the existing `scripts/deploy-katatib-connected.sh`. After deployment, open `https://katatib-64049.web.app/`: it should land at `/live/`, showing sign-in or the authorized user's restored session. `/demo/` is available only when explicitly chosen. This routing change does not remove Google sign-in or grant anyone access.
