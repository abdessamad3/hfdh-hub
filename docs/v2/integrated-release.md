# Katatib integrated release — 18 October 2026

This is the connected teacher/management release in PR #11, on `katatib-v2/teacher-preview`. It is not a claim that every feature in the original 21-screen V2 design is finished. The owner has authorized routine implementation without per-step approval; production replacement, billing changes and unresolved data ownership remain critical gates.

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
| Reports | Month-by-student V2 session status counts, old baseline versus confirmed V2 coverage, Excel-compatible XML export with explicit string cells, and print/Save as PDF. Missing sessions are never counted as absences. This is not a full historical V1/V2 combined attendance calculation. |
| Roles | Admin, assigned manager, assigned teacher, parent and student. An admin assigns verified Google addresses and explicit child/student IDs. Parents/students are read-only. PIN login is not implemented. |
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
| Code/PIN authentication and reset | Trusted authentication/recovery design, rate limiting and deployable privileged service. No PINs or signing keys belong in browser code. Family Google access already works as a restricted interim method. |
| Authentic Warsh Mushaf and verse history | Verified licensed text/edition and exact verse/portion mapping. The historical lab's Hafs experiment is not presented as Warsh. |
| Teacher classroom recording | Actual-phone codec/clipping tests, access-controlled storage and retention. Cloud Storage for Firebase requires Blaze, conflicting with the recorded no-card requirement. No audio is uploaded by this release; the local teacher recorder is the free alternative, without shared playback or automatic mistake clipping. |
| Durable offline mode | Encrypted/identity-bound queue, explicit device retention policy, reload recovery, server reconciliation and device tests. Current in-tab drafts and save retry are not this feature. |
| Kuttab settings, schedules, group memberships | Stable IDs, versioned session occurrences, ownership migration and calendar overrides. Current sessions are the explicit three choices, not a manager-configured schedule. |
| Shared ranking | Minimal trusted projection and verified eligibility/coverage. Private student documents are not opened to build a ranking. |
| Notices and notifications | Recipient-scoped records, delivery expectations and consent; no notifications are sent automatically. |
| Remaining original capabilities | Teacher attendance, English support, Smart Challenge UI, certificates, student cards, kuttab comparisons and richer historical reports still need their V2 implementation. Original V1 remains available. |
| Production cutover | Fresh backup including new V1 data since the old snapshot, reconciliation of source records/relationships and auth, migration rehearsal, rollback evidence and explicit production authorization. |

## Verified infrastructure constraints

Checked against official Firebase documentation on 18 October 2026:

- Cloud Storage for Firebase requires the pay-as-you-go Blaze plan, including default buckets: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- Custom tokens are created using privileged server-side Admin SDK/signing credentials, never the web app's Firebase configuration: https://firebase.google.com/docs/auth/admin/create-custom-tokens

This is not a claim that every possible alternative requires billing. Alternative authentication/storage designs need a separate security and feasibility review; no change to the owner's no-card preference is inferred.

## Validation and release

`katatib-preview.yml` runs model validation, Chromium teacher/management/family flows, Firestore emulator authorization and real transaction tests, plus actual Firebase SDK/Auth emulator session restoration checks. The existing production build workflow validates the PR without publishing it.

Real Google OAuth and actual Firebase deployment need the owner's account session. Deployment from the existing Cloud Shell checkout:

```bash
cd ~/katatib-v2-preview/katatib-v2-preview
git pull --ff-only
bash scripts/deploy-katatib-connected.sh
```

Open only https://katatib-64049.web.app/ after `Deploy complete`. No merge to main is required for this test deployment.
