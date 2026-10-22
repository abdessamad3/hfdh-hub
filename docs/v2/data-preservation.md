# Data preservation, backup and migration gates

Status: production cutover has not been performed. Earlier owner-supplied screenshots show a Firestore export and a 3,850-document isolated restore with matching typed fields; Auth/files/config recovery was not verified by that restore. A fresh comparison has not been run from this environment. See [the current readiness review](migration-readiness.md) and the prepared read-only snapshot/comparison tools. The environment has no configured Firebase administrative identity. Public Firebase web configuration is not sufficient to make or verify a complete backup.

Production source identified in the public config: project `hifd-kouttab`, Firestore database `(default)`. The public config also names `hifd-kouttab.firebasestorage.app`; actual bucket existence, contents and access remain unverified. Record actual production region, rules, indexes and any additional databases/buckets during authorized inventory.

## 1. What must be inventoried

| Data family | Known locations from source | Verification required |
| --- | --- | --- |
| People and access profiles | `students`, `users` | Every ID/field, parent-related or custom fields if present, duplicate emails, archive/access state |
| Organisation/schedules | `kuttabs` | Name collisions, teacher IDs, recurring and specific-date schedules |
| Attendance | `attendance`, `teacher_attendance` | Both historical ID formats, session indices, duplicate/conflicting records |
| Learning history | `evaluations`, `revisions`, legacy `memorizations` | All records and portions, old score formats, stored totals, timestamps and notes |
| Planned work | `next_revisions`, `next_evaluations` | Open/overdue tasks and orphan references; do not silently drop overdue work |
| Challenge content | `smart_questions` | Full question data, references and custom fields |
| Login/audit history | `login_history` and any discovered collections | Preserve actor/time and historical records |
| Other documents/subcollections | Entire database discovery, not a hardcoded collection list | Discover and retain unknown collections, nested documents and otherwise empty parent paths |
| Authentication | Firebase Auth users/provider linkage | UIDs, providers, disabled state and authorized identity backup; passwords are not plain text and must not be collected |
| Stored files | Actual discovered Storage buckets and any owner-identified external storage | Object inventory, metadata, versions where available, hashes and record references |
| Configuration | Firestore/Storage rules, indexes, hosting config, deployed app version | Record versions without publishing secrets; these are separate from document backups |

The named collections are source evidence, not a complete inventory of production. `memorizations` is referenced by legacy cleanup/rules even though current memorization methods write evaluations. Include it if it exists. Preserve unknown fields rather than exporting only TypeScript interface properties.

## 2. Choose a backup route that respects the budget

Confirm the actual Firebase plan and current official requirements before selecting a managed export/import service. Do not assume managed backups are available without billing, and do not enable a payment card as an unrequested workaround.

If an authorized admin-client exporter is the appropriate no-card route, it must handle complete pagination, subcollection traversal including documents beneath missing parents, Firestore value types and document paths. It must preserve timestamps, references, bytes, geopoints, nulls and unknown fields. A naive browser `JSON.stringify` of visible students or a report export is not a complete database backup.

Auth identities and Storage objects require their own inventory/backup mechanisms. Cross-project Auth restoration must be rehearsed; a Firestore users-collection backup does not restore Firebase login identities. Verify whether provider settings or UIDs need separate handling without resetting every user's login unnecessarily.

Use the owner's authorized administrative environment and an explicitly named source project. Do not send passwords/tokens through chat or commit credentials. Store backups privately outside this public repository and the published site. Agree a private destination and retention policy before export.

## 3. Backup manifest and completeness evidence

For each backup, record a non-secret manifest containing:

- Backup ID, operator, source project/database, start/end UTC times, application commit and schema observations.
- Export mechanism/version, selected scope, discovered collections/subcollections, document and object counts, source errors and exclusions (ideally none).
- A SHA-256 checksum for each backup payload, plus its type/path format. Hash comparison must use canonical typed values, not display-formatted dates.
- Auth identity counts/provider summary, file sizes/hashes and configuration versions. Keep identifying inventory private with the backup.
- Write consistency policy. An application-level export while teachers are writing is not automatically a consistent snapshot. Use a coordinated write pause or a proven snapshot/delta mechanism.

A successful export exit code, a download button, or a file existing is not proof of completeness. Record unsupported types and traversal failures as blockers rather than silently skipping them.

## 4. Restore rehearsal — required before production conversion

Restore into an isolated destination explicitly verified not to be `hifd-kouttab`. Keep outbound notifications and access for real users disabled in the rehearsal environment. Prefer synthetic fixtures for development; only place real backup data in an appropriately controlled restore environment when needed.

Validate:

1. Document paths/counts and every exported typed value reconcile; include nested/unknown collections and legacy fields.
2. Student-to-kuttab, teacher, activity and task references reconcile. Preserve or report existing orphan references rather than repairing them silently.
3. Auth UID mappings/provider access are recoverable by the tested route. Missing Auth recovery is not masked by restored profile documents.
4. File inventories/hashes and links reconcile if stored objects exist.
5. Full historical attendance/evaluation/revision records reconcile, including both attendance formats and records beyond query limits.
6. Sample accounts can view expected data under restored rules. Use owner-approved test identities rather than disclosing real credentials.
7. Record exact restore commands/tool version, result, discrepancies and verification date privately; publish only non-identifying summaries.

If counts differ, types are lost, or restoration fails, stop production conversion and resolve the discrepancy. A rehearsal is not permission to replace production.

## 5. Migration design

- Read from a versioned backup or consistent read-only snapshot. Never mutate the only copy of legacy data.
- Preserve original IDs where suitable; otherwise emit a deterministic legacy-to-V2 mapping for students, users, kuttabs, groups, sessions, learning events and tasks.
- Kuttab names are not reliable IDs. Produce an exception report for duplicate names, missing teachers, unknown assignments and ambiguous dates/sessions; obtain resolutions before migration.
- Keep the original raw payload and transformation version, or an equivalent retrievable audit package. Derived V2 records must be traceable to source paths.
- Attendance duplicates may conflict. Do not discard one arbitrarily or call both present; preserve the originals and record the agreed reconciliation. Unresolved cases remain flagged.
- Preserve timestamps and enrollment dates as stored. Do not invent missing enrollment dates from import time. Distinguish unknown from known values.
- Recalculate aggregates from complete migrated history using versioned rules; compare to legacy totals and explain differences. Legacy derived totals can be wrong and must not overwrite raw evidence.
- Use deterministic target IDs and a resumable checkpoint/operation log so reruns do not duplicate records. Test interruption midway through a batch and retry.
- Never remove source records as part of a transformation retry. Audio retention and archival policies do not authorize deletion of the migration source.

## 6. Cutover and rollback

Before cutover, have the owner's release approval, a fresh verified backup, a successful rehearsal, a resolved exception report, role tests, a pinned release artifact and measured verification criteria.

Either pause V1 writes briefly for a final consistent migration or implement and prove an explicit delta/write-coordination strategy. Do not run two incompatible writers against the same student records and assume migration stays current.

Rollback is more than reverting Hosting. New V2 writes may not be readable by V1. Before switching, define and test how post-cutover writes are retained, paused, exported or reconciled if reverting. Keep V1 source artifacts, configuration, mappings and the original backup. Never restore an old snapshot over new production writes without a reconciliation plan and the owner's explicit approval.

After launch, verify counts/relationships, sample workflows, role isolation, errors and quotas. Keep the legacy source read-only and privately recoverable until the owner approves a later retention decision. The actual retention duration remains open; do not schedule automatic deletion by default.

## Evidence gates

| Gate | Evidence needed | Current status |
| --- | --- | --- |
| G1: inventory | Authorized source/database/Auth/file inventory | Earlier Firestore snapshot reported by owner; fresh full inventory pending |
| G2: backup | Complete private export + typed manifest/checksums | Earlier document/Auth ZIPs reported by owner; fresh completeness and recoverability verification pending |
| G3: restore | Isolated restore with reconciled data and identity recovery | Owner document-restore evidence exists; identity/files/config recovery and fresh rehearsal remain pending |
| G4: migration | Repeatable dry run + mappings + resolved exceptions | Not performed |
| G5: release | Owner approval + tests + final consistent snapshot + rollback for new writes | Not performed |

Synthetic V2 development can proceed before these production gates. No destructive production data change can proceed merely because the main project's code may be changed.
