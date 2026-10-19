# Katatib V2 compared with V1 — migration readiness review

Reviewed 18 October 2026. **Verdict: keep V1 as the main website. V2 is a test candidate, not ready to replace it.**

This review implements the owner's request to compare actual functionality, historical data, performance, permissions and recovery before migration. It includes code fixes and executable checks, not just a proposed checklist. No production deployment, original-data edit or billing change was performed.

## What was improved during this review

1. **Historical records:** added student-scoped read-only access to copied attendance, evaluations, revisions, memorizations and both types of planned work. The new History/calendar screen shows original dates, quantities, identifiers, grades and notes. Overdue V1 tasks are retained; they are not automatically completed or deleted.
2. **Complete reads:** removed the arbitrary 20-record attendance-history cutoff. History now follows document-ID pagination and explicitly fails at the safety budget rather than label a truncated history complete. Unit/emulator tests retrieve 621 records, crossing the earlier 20/100/500 limits.
3. **Ambiguities:** historical duplicate attendance rows remain visible and flagged. Missing sessions and invalid dates are not guessed. Old grades do not become confirmed V2 memorization.
4. **Large rosters:** at most 40 student/attendance cards are rendered per page. All loaded students remain searchable. Attendance reads only the visible page. Unsaved notes and statuses survive paging, and filtering loads the newly visible records without losing search focus.
5. **Visible review:** admins now have a Migration readiness screen comparing V1/V2. A private comparison report can be loaded locally; even a matching clone does not change the verdict to production-ready.
6. **Monthly history:** reports, student cards, print and Excel now include copied V1 attendance and learning activity beside V2 attendance. V1 duplicates/unknown sessions/statuses are counted for review rather than inflating attendance. Invalid dates are explicitly an all-history count outside monthly totals. Baseline and confirmed coverage are labelled cumulative, not monthly gains. At most three student report loads run concurrently; a failed read leaves no partial/exportable report.
7. **Private read-only tools:** fresh typed source/test exports and reconciliation are available in one command. The audit counts missing/different records, permits separately identified V2 collections, compares typed in-database references across projects, and flags ambiguous relationships. It does not write to Firebase or publish data.

## Feature comparison against main

Source baseline: `main` commit `d3106bb6115e025db554803eb862430342e7deed`. Routes were checked in [src/App.tsx](../../src/App.tsx), data contracts in [src/types/index.ts](../../src/types/index.ts), and behavior in [src/services/db.ts](../../src/services/db.ts). This table describes source availability, not a claim that every V1 feature is correct or that every feature has been tested with live accounts.

| Workflow | V1 | Current V2 candidate | Replacement consequence |
| --- | --- | --- | --- |
| Google staff entry | Present | Present; same-tab login persistence tested | Real deployed Google-login smoke test still required |
| Students/search/profile | Present; roster queries commonly stop at 100 | Full authorized roster pagination, search and 40-card pages | Better completeness/phone rendering; read quota needs real observation |
| Enrollment/edit/archive | Enrollment/edit/delete paths exist | Separate V2 profiles; reversible archive; original records unchanged | Safer history preservation; copied ownership reassignment intentionally not inferred |
| Student attendance | Three stored statuses; session index | Five statuses plus unmarked; canonical keys and immutable changes | New workflow improves audit/conflict behavior; legacy session mapping remains explicit |
| Evaluation/revision entry | Present | Present, with practice versus confirmed mastery | Current V2 edits show one logical row and preserve previous versions |
| Old learning/attendance | Present, with view-dependent query cutoffs | Now readable through History/calendar with pagination | No silent old-history loss; legacy activities remain read-only |
| Editing old V1 learning | Present | Staff correction overlays change one visible entry, with mandatory reason and immutable audit snapshots | Source records remain unchanged; original and current content are available |
| Planned revision/evaluation | Both present | V2 memorization/revision/evaluation tasks; old plans can be completed/cancelled with audited state overlays | Completion does not invent grades or delete original overdue plans |
| Monthly reports | Includes V1-specific calculations/views | One monthly report with separate V1 activity/attendance and V2 sessions; print/Excel include both | Ambiguous V1 rows excluded from totals and counted for review; V1-specific grade formulas still need parity validation |
| Teacher attendance | Present (`teacher_attendance`) | Admin/scoped manager entry by teacher/date/session; current row plus immutable correction snapshots; original rows readable | No automatic presence; copied teacher profiles establish scope; original session indices are not guessed |
| Kuttab/teacher management and schedules | Present, including specific-date overrides | Scoped weekly rules and dated exceptions/closures; original schedule labels retained | Does not infer presence or reinterpret original session indices; teacher/kuttab identity assignments remain explicit |
| Student calendar/progress | Present | History month filter, profile and separate old/V2 progress | Full calendar/schedule parity remains partial |
| Ranking | Present; uses V1-derived values | Scoped staff ranking by unique confirmed V2 coverage, shared ties, separate original balances | No public roster or ranking based on unverified practice scores |
| Smart Challenge/question management | Present; generated/fallback content exists | Admin-reviewed question bank, practice rounds and server-checked answers; copied questions preserved for review | No copied question auto-approval or generated Quran text; admins must review content and references before use |
| Quran reader/audio | Present; text substitution/generated fallback exists | Authentic Warsh integration pending | Do not copy approximate/generated text merely to claim parity |
| Languages | Arabic/English | Arabic/French/English | Interface translations preserve user-authored Arabic content |
| Login history | Present | Management audit, not a complete login-history replacement | Separate audit coverage remains to finish |
| Family access | Student portal exists; no separate parent role in the source type | Admin-linked read-only Google parent/student access | Useful addition, not code/PIN login or proof of family relationship |
| Teacher audio recording | Separate experimental lab is not a production classroom workflow | Local capture/listen/download, no Firebase audio upload | Free addition; no shared playback or automatic mistake clips |
| Durable offline mode | No reliable V2-style operation queue established by this review | In-memory drafts/retries only | Do not advertise offline recovery after reload |

## Is V2 faster?

The large-roster candidate browser test passed with **501 fictional students and 4× CPU throttling**:

| Observation | Result from one CI run |
| --- | ---: |
| Open the student roster, including test interaction completion | 65 ms |
| Filter to the last student | 18 ms |
| Maximum rendered roster/attendance cards | 40 |
| Maximum attendance records requested per page | 40 |

Evidence: [workflow run 39168534504](https://github.com/abdessamad3/hfdh-hub/actions/runs/39168534504), `preview-checks` job. `migration-performance.json` and screenshots are in its artifact. A unit test also traverses every student in a 1,001-student roster.

**These are candidate-only mocked-provider UI measurements, not a V1/V2 speed ratio, Lighthouse score, first-load measurement, real Firebase latency or an actual-phone benchmark.** They establish that the candidate handles a larger roster without creating hundreds of attendance cards/requests at once. They do not prove that the whole website is faster than V1 in the classroom.

V2 now reads a complete authorized roster instead of hiding records after 100. This may increase initial reads compared with V1's incomplete query. Repeated scope queries and full historical reports also consume read quota. Real classroom quota/latency observation is still required on Spark; no billing change was made.

## Public deployment check

[Unauthenticated HTTP observations](public-probe.json): both main and test homepages returned HTTP 200, and the old test `/live/` page redirected to the homepage. The new `live/legacy.mjs` returned 404 at the time of checking, so this latest review build was **not yet published**. No private account or student data was accessed by that probe. Its request timings are not a fair application-speed comparison.

## Data and security evidence

- 78 JavaScript model tests cover current behavior, legacy projections, roster paging and report validation. Eighteen Python tests cover snapshot/reconciliation behavior, typed values, checksum failures, missing parents, source/test boundaries, read-only requests, checkpoint reuse, duplicate-job locking, background completion and atomic report preservation.
- The real Firestore emulator verifies scoped V1 history reads, reads beyond 500 rows, denial of another student's records, denial of writes to copied history, parent/teacher restrictions, transaction audits, stale updates and revocation.
- Chromium verifies the connected workflows, 133 historical rows/filtering/child switch, large-roster navigation/search, filter-triggered attendance loading, draft preservation across pages and readiness-report rejection. Existing login, recording and failure/retry checks also run.
- Matching backup payloads are **not** proof of identity recovery or production readiness. The audit always reports `production_migration_ready: false`.
- Owner screenshots previously showed a 3,850-document isolated restore and typed-field comparison. This review does not discard that evidence, but it is not a fresh independently executed source/test audit. The original site may have acquired newer records since that snapshot.

## Owner-run comparison received on 18 October 2026

The owner provided the aggregate report from the completed read-only check: 3,851 source records, 3,849 matching records, one missing `login_history` entry, one different `users` record, six expected V2 additions and no unexplained target records. Missing-parent paths match. All student, attendance, evaluation, revision, program, kuttab and question records match **those snapshots**. This is owner-run evidence, not a new live query from this environment. The source and target snapshots were taken at different times.

The owner accepts the missing login-history entry as nonessential. The changed user field has not been identified; it cannot yet be classified as activity-only or dismissed as a permissions change. No record was overwritten to force a match. The source has 124 attendance rows with unmapped sessions: the website preserves and flags these; the monthly report excludes ambiguous attendance from totals. A new report does not repair or reinterpret original data.

## One safe account-dependent action

There is no Firebase administrative identity attached to this Codex environment. The prepared tools need the owner's existing Cloud Shell sign-in; tokens and private ZIPs should not be pasted into chat or committed.

To publish only the test build, then make fresh private snapshots and compare them:

```bash
cd ~/katatib-v2-preview/katatib-v2-preview
git pull --ff-only
bash scripts/deploy-katatib-connected.sh
bash scripts/katatib-migration-check.sh
```

The deployment is fixed to `katatib-64049`. The migration check only reads `hifd-kouttab` and `katatib-64049`, writes private local files under `~/hifdh-backups/migration-check-*`, never restores/deletes/overwrites Firestore, and prints aggregate findings. Reads consume normal Firebase quota. Nonzero exit code 2 means the copy differs; it is not an instruction to overwrite it.

After deployment, sign in as admin at https://katatib-64049.web.app/ and open **Migration readiness**. Optionally select the private `readiness.json` from the check to review counts locally. It is not uploaded or persisted by the app.

### Recover an interrupted comparison

The export discovers nested collections under every document after listing the top-level collections. This can take minutes. The exporter now prints request counts and retries throughout that phase. A missing `readiness.json` means no completed comparison report exists; it does not establish that database records are missing.

Do not launch several checks while waiting. Stop the previous check first. With the updated scripts, reuse its exact output directory:

```bash
git pull --ff-only
bash scripts/katatib-migration-check.sh --resume ~/hifdh-backups/migration-check-YOUR-EXISTING-FOLDER --background
```

Run the `tail -f ...` command printed by the launcher to follow its private log. Ctrl+C stops viewing that log, while the background check continues. A stopped/recycled Cloud Shell VM can still interrupt the job. Resume is between complete project backups: existing ZIPs are validated and reused, and only a missing project export is restarted. Partial exports are not accepted as complete snapshots. A lock prevents concurrent checks in the same directory. Reports are published atomically; a rerun preserves previous reports with a new filename. Exit code 2 indicates a completed comparison with differences, not a failed export or permission to overwrite records.

## Remaining production gates, in priority order

1. **Parity:** teacher attendance is now implemented with admin/scoped manager authorization and correction history. Finish the other retained V1 workflows identified above; verify existing historical reports and correction behavior. Do not replace the main site merely because new features look better.
2. **Fresh data:** a completed owner-run comparison is recorded above. Classify the changed user fields and attendance ambiguities without guessing or deleting evidence; make a new consistent snapshot before any eventual cutover. Preserve all additional V2 records separately.
3. **Identity/config/files:** rehearse account/provider recovery and verified mappings, inspect actual Storage/config/index inventory, and retain the existing no-card constraint.
4. **Classroom trial:** a teacher uses the test site on an actual phone for one complete session. Test slow Internet, a failed save/retry, reload persistence, different accounts and cross-kuttab denial. Record which results were observed; simulated CPU throttling is not this trial.
5. **Rollback:** freeze/coordinate V1 writes for the final consistent snapshot, pin the V1 Hosting release and rules/index versions, and rehearse retaining/reconciling V2 writes when returning to V1. Reverting Hosting alone is insufficient.
6. **Critical final approval:** only after these gates pass, review the concrete cutover/rollback result with the owner before replacing production. No migration approval is being requested now because the result is **not ready**.

## Teacher attendance update

Admins and scoped managers can select a copied teacher profile, date and morning/afternoon/evening session, save an explicit status/note, reload and correct it. Unrecorded does not mean present or absent. Dates are validated in the client and actual server rules. Stable keys prevent duplicate current rows; every change is atomic with an immutable snapshot, and retries after an acknowledgement loss do not add another version. Stale edits keep the draft and require reload.

New data uses `katatib_teacher_attendance` and `katatib_teacher_attendance_history` only in the test project. Copied `users` profiles are read-only: admins may read teacher-role profiles; managers may read only teachers in their granted kuttabs or explicitly granted teacher IDs. Teachers, parents and students do not see this management screen or its records. The page projects only teacher names and kuttabs, not email/account fields. Copied `teacher_attendance` rows remain read-only and retain their original session indices. An empty roster means no copied teacher-role profiles fall within the user's current scope; no fictional profiles are created.

The UI holds drafts in memory only, pages history at 40 changes, and follows the existing complete-read limit rather than silently truncating old records. No attendance percentages or scheduled-session totals are inferred; schedule replacement is a separate remaining feature.

## Remaining-feature implementation

The candidate now includes schedules, original-learning correction overlays, admin question review, practice challenges, scoped progress ranking and English. Planned work also supports evaluation tasks. New writes use separately audited `katatib_schedules`, `katatib_legacy_corrections`, `katatib_questions`, `katatib_legacy_task_states` and immutable `katatib_challenge_attempts`. Server rules derive scope from the actual copied kuttab/student records; a forged scope field does not authorize access. Challenge answers must match the current active reviewed question and its revision. Practice cannot create confirmed memorization or alter ranking.

These implementations deliberately do not reproduce unsafe V1 behavior: no inferred attendance, fabricated Quran text, public student ranking or rewriting source records. Schedule previews show dates, weekly rules and closures; they do not automatically block every attendance/learning entry or map ambiguous original session indices. Monthly reports now compute separate arithmetic means of recorded evaluation/revision scores, excluding unknown or out-of-range grades; these are explicit V2 metrics, not a claim to reproduce every V1 composite formula. Original planned work can be completed/cancelled through audited state overlays, without deleting the plan or inventing an actual learning grade. These behavior changes require real classroom acceptance. The site remains a test candidate.

`python3 scripts/katatib-recovery-inventory.py --project hifd-kouttab` prepares a private, read-only inventory of Auth accounts/settings, rules, indexes/field overrides, Hosting releases and Storage object metadata using the owner's Cloud Shell identity. Missing permissions are marked not verified, never treated as an empty successful backup. The files may contain password hashes and authentication settings and must remain private. The inventory does not download Storage payloads, prove account import/provider recovery, or copy Hosting version contents. See [release acceptance and rollback](release-acceptance.md) for the remaining concrete owner checks.

Scoped immutable correction/task-state audit versions are available to authorized users; the correction editor shows prior versions and the original fields. General audit access remains admin-only. Parents/students can submit practice answers for explicitly linked students, while their profile, attendance, learning and correction access remains read-only.
