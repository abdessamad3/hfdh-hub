# Katatib V2 compared with V1 — migration readiness review

Reviewed 18 October 2026. **Verdict: keep V1 as the main website. V2 is a test candidate, not ready to replace it.**

This review implements the owner's request to compare actual functionality, historical data, performance, permissions and recovery before migration. It includes code fixes and executable checks, not just a proposed checklist. No production deployment, original-data edit or billing change was performed.

## What was improved during this review

1. **Historical records:** added student-scoped read-only access to copied attendance, evaluations, revisions, memorizations and both types of planned work. The new History/calendar screen shows original dates, quantities, identifiers, grades and notes. Overdue V1 tasks are retained; they are not automatically completed or deleted.
2. **Complete reads:** removed the arbitrary 20-record attendance-history cutoff. History now follows document-ID pagination and explicitly fails at the safety budget rather than label a truncated history complete. Unit/emulator tests retrieve 621 records, crossing the earlier 20/100/500 limits.
3. **Ambiguities:** historical duplicate attendance rows remain visible and flagged. Missing sessions and invalid dates are not guessed. Old grades do not become confirmed V2 memorization.
4. **Large rosters:** at most 40 student/attendance cards are rendered per page. All loaded students remain searchable. Attendance reads only the visible page. Unsaved notes and statuses survive paging, and filtering loads the newly visible records without losing search focus.
5. **Visible review:** admins now have a Migration readiness screen comparing V1/V2. A private comparison report can be loaded locally; even a matching clone does not change the verdict to production-ready.
6. **Private read-only tools:** fresh typed source/test exports and reconciliation are available in one command. The audit counts missing/different records, permits separately identified V2 collections, compares typed in-database references across projects, and flags ambiguous relationships. It does not write to Firebase or publish data.

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
| Editing old V1 learning | Present | Original data protected; no V1 correction-overlay editor yet | Still a parity gap if staff need to correct old entries after cutover |
| Planned revision/evaluation | Both present | V2 memorization/revision tasks; V1 planned rows now readable | Dedicated planned evaluation and original completion semantics still need replacement |
| Monthly reports | Includes V1-specific calculations/views | V2 counts and cards/export/print; V1 history is separately visible | A complete combined historic monthly report is not finished |
| Teacher attendance | Present (`teacher_attendance`) | Not implemented | Block migration rather than silently remove the workflow |
| Kuttab/teacher management and schedules | Present, including specific-date overrides | Profile groups/access assignments; no equivalent schedule editor | Block migration until retained with reconciled identities/ownership |
| Student calendar/progress | Present | History month filter, profile and separate old/V2 progress | Full calendar/schedule parity remains partial |
| Ranking | Present; uses V1-derived values | Not published | Needs verified coverage and a privacy-safe projection |
| Smart Challenge/question management | Present | Not implemented; copied content remains preserved | Block migration if retained as the default requirement |
| Quran reader/audio | Present; text substitution/generated fallback exists | Authentic Warsh integration pending | Do not copy approximate/generated text merely to claim parity |
| Languages | Arabic/English | Arabic/French | English parity is missing; do not silently drop it |
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

- 65 JavaScript model tests cover current behavior, legacy projections, roster paging and report validation. Sixteen Python tests cover snapshot/reconciliation behavior, typed values, checksum failures, missing parents, source/test boundaries, read-only requests, checkpoint reuse, duplicate-job locking, background completion and atomic report preservation.
- The real Firestore emulator verifies scoped V1 history reads, reads beyond 500 rows, denial of another student's records, denial of writes to copied history, parent/teacher restrictions, transaction audits, stale updates and revocation.
- Chromium verifies the connected workflows, 133 historical rows/filtering/child switch, large-roster navigation/search, filter-triggered attendance loading, draft preservation across pages and readiness-report rejection. Existing login, recording and failure/retry checks also run.
- Matching backup payloads are **not** proof of identity recovery or production readiness. The audit always reports `production_migration_ready: false`.
- Owner screenshots previously showed a 3,850-document isolated restore and typed-field comparison. This review does not discard that evidence, but it is not a fresh independently executed source/test audit. The original site may have acquired newer records since that snapshot.

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

1. **Parity:** finish retained V1 workflows identified above; verify existing historical reports and correction behavior. Do not replace the main site merely because new features look better.
2. **Fresh data:** execute the read-only comparison; resolve missing/different rows and existing relationship/session ambiguities without guessing or deleting evidence. Preserve all additional V2 test records separately.
3. **Identity/config/files:** rehearse account/provider recovery and verified mappings, inspect actual Storage/config/index inventory, and retain the existing no-card constraint.
4. **Classroom trial:** a teacher uses the test site on an actual phone for one complete session. Test slow Internet, a failed save/retry, reload persistence, different accounts and cross-kuttab denial. Record which results were observed; simulated CPU throttling is not this trial.
5. **Rollback:** freeze/coordinate V1 writes for the final consistent snapshot, pin the V1 Hosting release and rules/index versions, and rehearse retaining/reconciling V2 writes when returning to V1. Reverting Hosting alone is insufficient.
6. **Critical final approval:** only after these gates pass, review the concrete cutover/rollback result with the owner before replacing production. No migration approval is being requested now because the result is **not ready**.
