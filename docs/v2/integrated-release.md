# Katatib integrated release — updated 19 October 2026

The complete PDF scope is now tracked in [the acceptance matrix](pdf-acceptance-matrix.md). Printed Mushaf pages must preserve the chosen Warsh edition’s layout; a reflowed verse list is not an equivalent deliverable.

This is the connected teacher/management release in PR #11, on `katatib-v2/teacher-preview`. It is not a claim that every feature in the original 21-screen V2 design is finished. The owner has authorized routine implementation without per-step approval; production replacement, billing changes and unresolved data ownership remain critical gates.

## Migration review update

See [the V1/V2 migration-readiness review](migration-readiness.md). A new scoped History/calendar screen now exposes copied V1 evaluations, revisions, memorization and planned work. Attendance history reads paginate instead of stopping at 20, large rosters render/read attendance in 40-student pages, and admins can review migration readiness. Production remains a no-go until the documented gates pass.

## Delivered in the same website

| Area | Implemented behavior |
| --- | --- |
| Entry and design | One homepage, Arabic/French, RTL, mobile navigation, Google sign-in, actual account and authorized roster. Old demo/live page URLs redirect to the homepage. Fictional runtime fixtures are not published. |
| Session | Same-tab reload/deployment login restoration; explicit logout clears visible data. New independent tabs need a login. |
| Students | Existing records remain read-only. V2 name, age, group and archive status are stored as separate profile overlays. New students have separate V2 records and stable document IDs. |
| Enrollment/import | Admins and assigned managers can enroll; CSV UTF-8 import with explicit header, validation and preview, up to 100 rows. A retry resumes fixed IDs, rejects conflicting existing data and never replaces original records. A partially interrupted import is explicitly reported. CSV from Excel is supported; direct XLSX parsing is not. |
| Archive | Reversible archive hides students from staff attendance/learning rosters. Original records and all history remain. Linked family users may still consult archived children's history. Archive is not account revocation: disable/restrict their access grant separately. |
| Attendance | Explicit date and morning/afternoon/evening session, five statuses plus unmarked, atomic audit snapshots, stale-edit checks and lost-ack retry behavior. |
| Learning | Confirmed memorization, practice, revision and evaluation. Editing displays one current record with collapsed previous versions. Unique confirmed portions determine V2 progress; V1 baseline stays separate. |
| Local teacher recording | Teacher-only browser microphone recording, playback and device download. Audio is in memory only, never uploaded to Firebase. Stopping/leaving releases microphone tracks; leaving undownloaded audio requires a discard confirmation. 45-minute/32-MiB automatic-stop limits, with actual format/bitrate chosen by the browser. Physical-phone acceptance remains pending. |
| Planned work | Assigned student, memorization/revision portion, due date, notes and planned/done/cancelled status. Overdue work is identified. Finishing work does not fabricate an evaluation or confirm mastery. |
| Reports | Month-by-student V2 session status counts, old baseline versus confirmed V2 coverage, Excel-compatible XML export with explicit string cells, and print/Save as PDF. Select one authorized student to print a student card with identity, group, archive status and that month’s counts. Missing sessions are never counted as absences. This is not a full historical V1/V2 combined attendance calculation. |
| Roles | Admin, assigned manager, assigned teacher, parent and student. An admin assigns verified Google addresses and explicit child/student IDs. Parents/students cannot modify educational records. They may acknowledge notices; linked parents may record their own audio/ranking choices. Administrator-issued code/eight-digit PIN student cards are now implemented; see [student login](student-login.md). Live provider configuration and an actual-card acceptance test remain pending. |
| Permissions | Scope checks enforced by Firestore, not only navigation. Own-admin-grant editing is blocked to prevent accidental self-lockout. Original copies remain unwritable. |
| Audit | Management, task and permission changes require an immutable audit snapshot in the same transaction. The administrator can inspect it. This does not claim to audit every authentication event or client read. |
| Roster size | Paginated reads replace the earlier silent 100-student cutoff. Bounded 5,000-record reads fail explicitly rather than display a silently truncated complete report. Learning chain cap is 1,000. |

## Data boundaries

- Source `hifd-kouttab`: no writes or production deployment performed by this release.
- Test `katatib-64049`: original copied collections stay read-only to the app; new data uses `katatib_students`, `katatib_tasks`, `katatib_attendance`, `katatib_attendance_history`, `katatib_learning`, `katatib_access` and `katatib_audit`.
- Legacy kuttab names and teacher IDs remain explicit access scopes. The app does not silently infer or migrate ownership, rename a copied kuttab, or reassign copied students. Stable-ID kuttab/group migration and legacy exceptions still require a reconciled migration step.
- Staff manage only authorized students. Family links must be established by an administrator after verifying the relationship outside the app; matching names is not sufficient proof.
- Only Firebase login state is session-persisted. Local audio stays in page memory until downloaded or discarded; it is not recoverable after leaving/reloading. Roster data and drafts are in memory. There is no durable offline queue or offline recovery promise.
- Read/list failures do not label a report complete. A bounded read-limit error requires a narrower query or a later indexed aggregate implementation.

## Full V2 requirements still pending

| Requirement | Remaining work / critical dependency |
| --- | --- |
| Code/PIN authentication and reset | Implemented using a separate ephemeral Firebase Auth instance, random synthetic student accounts, UID-bound grants and atomic card replacement/revocation. No privileged signing credentials are placed in the browser. Owner must enable the test password provider and verify an actual card; see [details](student-login.md). |
| Authentic Warsh Mushaf and verse history | Printed Madinah Warsh pages, exact page/surah/verse selection, manual highlight, four teacher marks, notes and immutable scoped history are now implemented; see [reader evidence](mushaf-reader.md). Qualified-content/physical-phone acceptance and shared verse audio remain. Verified eighth-hizb boundaries are not fabricated. |
| Teacher classroom recording | Actual-phone codec/clipping tests, access-controlled storage and retention. Cloud Storage for Firebase requires Blaze, conflicting with the recorded no-card requirement. No audio is uploaded by this release; the local teacher recorder is the free alternative, without shared playback or automatic mistake clipping. |
| Durable offline mode | Encrypted/identity-bound queue, explicit device retention policy, reload recovery, server reconciliation and device tests. Current in-tab drafts and save retry are not this feature. |
| Kuttab settings / ownership migration | Weekly schedules and dated closures are implemented as audited overlays. Sessions remain the explicit three named choices. Automatic ownership migration and arbitrary original session labels are not inferred. |
| Public/shared ranking | Staff-scoped ranking is implemented from unique confirmed V2 coverage. No public student directory is published; a public leaderboard would require a separate privacy decision. |
| Notices and notifications | Student-scoped in-app notices, current-revision read acknowledgements and parent-owned audio/ranking choices are implemented with immutable audit snapshots. No email/phone delivery occurs. Automatic event generation, recording/ranking consent enforcement in those pending features, and live-family acceptance remain. |
| Additional PDF capabilities | English, reviewed practice challenges, old-record corrections and historical report counts/mean scores are implemented. Specialized certificates and kuttab comparison dashboards remain in the full PDF scope and are not finished. Original V1 remains available. |
| Production cutover | Fresh backup including new V1 data since the old snapshot, reconciliation of source records/relationships and auth, migration rehearsal, rollback evidence and explicit production authorization. |

## Verified infrastructure constraints

Checked against official Firebase documentation on 18 October 2026:

- Cloud Storage for Firebase requires the pay-as-you-go Blaze plan, including default buckets: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Custom tokens are created using privileged server-side Admin SDK/signing credentials, never the web app's Firebase configuration: https://firebase.google.com/docs/auth/admin/create-custom-tokens

This is not a claim that every possible alternative requires billing. Alternative authentication/storage designs need a separate security and feasibility review; no change to the owner's no-card preference is inferred.

## Warsh source investigation

The publisher's developer platform and Warsh page were identified:

- https://qurancomplex.gov.sa/en/techquran/dev/
- https://qurancomplex.gov.sa/warsh/

Direct retrieval returned HTTP 503 or timed out during this session. Search metadata is not enough to verify the complete edition, licence, verse numbering and portion boundaries. No third-party renumbered Warsh dataset has been substituted, and no unverified text is published by this release.

## Validation and release

`katatib-preview.yml` runs model validation, Chromium teacher/management/family and local microphone/recording/download flows, Firestore emulator authorization and real transaction tests, plus actual Firebase SDK/Auth emulator session restoration checks. The existing production build workflow validates the PR without publishing it.

Real Google OAuth and actual Firebase deployment need the owner's account session. Deployment from the existing Cloud Shell checkout:

```bash
cd ~/katatib-v2-preview/katatib-v2-preview
git pull --ff-only
bash scripts/deploy-katatib-connected.sh
```

Open only https://katatib-64049.web.app/ after `Deploy complete`. No merge to main is required for this test deployment.

### Monthly historical report update

Reports now show copied V1 attendance and activity counts alongside V2 sessions, with both included in print and Excel. Ambiguous/duplicate V1 attendance is counted for review outside totals. Invalid dates are shown as all-history counts; cumulative coverage is labelled separately from monthly activity. There are no source-data writes or new permissions. V1-specific grade formulas, teacher attendance, schedules and the other readiness gaps remain open.

### Teacher attendance

Admin/scoped manager teacher attendance is available with explicit statuses, date/session separation, notes, reload, immutable correction history and stale-edit protection. The page also reads copied teacher attendance without editing it or guessing its session mapping. New writes stay in the two V2 teacher-attendance collections on `katatib-64049`; ordinary teachers and family accounts have no teacher-attendance access. Copied teacher profiles establish the roster and scope.

### Remaining-feature implementation

The test app now has weekly and dated schedule overlays/closures, protected old-record corrections, admin review of copied/new questions, ten-question practice rounds with server-checked answers, staff-scoped confirmed-coverage rankings, English and planned evaluation tasks. Originals remain unchanged. A private recovery inventory and release-acceptance/rollback procedure are provided. These do not establish live-account recovery, actual-phone acceptance, V1-specific grading parity or production cutover readiness.

Staff can inspect scoped immutable audit versions when editing old learning records or old planned-work states. These reads use the actual linked student scope, never an unfiltered audit collection. Parents/students retain read access to their linked records and may create only their own linked practice answers, not profile/attendance/learning/correction writes.

### Family notices and choices

Authorized staff can publish/edit/withdraw a notice for one student. Linked family can read and acknowledge the exact revision; editing it makes the newer revision unread. Read receipts bind the current account. A linked parent can agree, refuse or withdraw their own test-project audio/ranking choice, with prior decisions retained in the immutable audit. Neither teachers nor administrators can manufacture a parent decision. This page does not activate shared recordings or cross-kuttab rankings, and does not claim legal review. These consumers remain part of the pending full PDF scope.

### Printed Warsh Mushaf

The same website now includes the 604-page printed Madinah Warsh reader, page/surah/hizb navigation, zoom and manual verse selection. Staff save immutable marks/notes per authorized student; linked family can read history. Pages are fetched on demand from a pinned public source and checked before display. See [Mushaf reader](mushaf-reader.md) for source notices, security checks, connectivity and audio limitations. This does not claim the entire PDF product or production migration is complete.

### Phone audio feasibility test

Staff now have a one-minute device-only clipping test with Warsh verse cues, playable five-seconds-before/ten-after WAV clips, boundary labels, review/remove/undo, optional measured compression and a private test report. A real browser encode/decode test passes. See [phone test](audio-phone-test.md). This is not shared cloud audio or durable offline recording; actual-phone listening and the remaining quota/consent/storage work are still required.
