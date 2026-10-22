# Group Mushaf assignment

The existing verified Madinah Warsh Mushaf can now be assigned to a teaching group. The publisher's colour edition remains unavailable for assignment pending permission and verified geometry. This change does not claim to implement switching between two released editions.

## Using it

1. Open **Session → Mushaf** and select a student in the relevant group.
2. An admin opens **Group Mushaf**, sets the school's default and enables/disables teacher and manager assignment permission. This permission defaults to disabled until the admin explicitly enables it.
3. An authorized teacher selects **Use school default** or the verified edition and saves the group's choice. An unconfigured group automatically opens these controls for an authorized editor.
4. Students and parents see only their group's assigned edition. They have no edition selector or publisher-reference link. Selecting a different linked student resolves that student's group.
5. After saving settings, prepare the device again to refresh assignment metadata for offline use. Existing downloaded Mushaf artwork, learning, audio and marks are not deleted.

Only the current verified edition is selectable. The school-default control is intentionally limited to this edition until a second edition is approved. Settings are saved online; ordinary teaching remains usable offline with prepared assignment metadata. Assignment documents are included in device preparation and change detection. Reconnection checks never automatically upload settings or classroom edits.

## Group identity and permissions

A named group is identified by exact school name plus group name. Teachers sharing that group share one assignment. School names prevent identical group names in different schools from colliding. Students with no named group are grouped by school plus legacy teacher ID; unrelated teachers' ungrouped students do not share an assignment. An absent teacher ID means one unnamed school group; admin should create named groups if further separation is required.

The existing data model gives each student one group. Multiple simultaneous group memberships and choosing between several classes for one student are not implemented by this change. Moving/renaming a group changes its identity and makes it inherit that destination group's assignment or school default; old configuration and assessment history are retained. Automatic migration of renamed-group settings is not performed.

Configuration uses `katatib_mushaf_policies` and `katatib_mushaf_assignments`. IDs escape `%`, `/` and `~` identically in JavaScript and Firestore rules. Writes require the correct canonical ID, a verified edition, a fresh revision, server timestamp and an atomic immutable audit record. A group write must reference an active student the writer is authorized to teach and match that student's actual school/group/teacher-derived identity. Admins control defaults and delegation; teachers/managers require that school's current permission. Families cannot write. All active members can get known edition-configuration documents; only admins can enumerate them. These documents contain school/group identifiers and assignment/audit metadata, never student rosters, marks or recordings.

Assignment changes are blocked while the local UI has an active recording, unsaved mark or pending synchronization. A failed acknowledgement retains the same event ID for retry. Concurrent changes produce a conflict requiring reload and review. Delegation is enforced again on the server at save time. Assignment writes are online-only and never enter the teaching-data queue. A successful settings edit invalidates that school's cached assignment metadata and preparation timestamp; it retains downloaded page caches and pending teaching data. Devices get updated settings on their next online read or explicit preparation/refresh; no real-time cross-device push is claimed.

The verified current edition remains the only renderer. If its assignment metadata cannot be loaded, the page may still be read, but teacher marking and recording are withheld until settings are loaded. An older offline snapshot created before assignment support needs one online preparation to include the new metadata. First-use setup is within the Mushaf screen, not a mandatory whole-app onboarding wizard.

## Validation and limits

- Unit tests cover deterministic group identity, cross-school separation, school inheritance, verified-edition validation, role controls, revision conflicts, audit records and stable retry identity.
- Offline gateway tests cover prepared per-student assignment, forbidden settings writes offline, preservation of the teaching queue, cache invalidation and explicit re-preparation.
- Firestore emulator tests cover admin policy, delegated scoped writes, two teachers in one named group, read-only family access, revocation, stale revisions, unverified editions and forged document IDs.
- Chromium tests cover setup controls, permission changes, family inheritance, active-work blocking, lost acknowledgements, failed-load recovery, offline disabled actions and widths 390/820/1366.
- Existing Mushaf browser tests and full existing security tests remain required to preserve marking, swipe, recording, source integrity and data permissions.

A new colour edition still needs a separately versioned manifest, licensed assets, complete verified ayah geometry, download/resume/integrity tests and edition-specific assessment handling before it can be enabled. Existing marks already retain edition/source version; no assessment records are rewritten by assignment saves. Cross-edition alignment and physical Android/iPhone acceptance remain future release checks, not results of the desktop Chromium tests.

## Admin reading versus student sessions

The same screen now separates **Personal reading** (admin-only) from **Student session**. Personal edition choices are local, account-specific reading preferences; they never write school/group policy or student assessments. Selecting a student or opening a recitation link uses their group's assigned edition. No personal edition selector or publisher reference appears in a student session. Assignment editing remains a distinct confirmed settings action inside that session, with the existing delegation, audit and active-work checks.

The colour edition remains an online publisher reference for admin personal reading only. It is not a second released teaching edition and cannot be assigned to a student. Native colour rendering, verified marking and offline redistribution remain pending.

## Deployment

Deploy both V2 rules and Hosting together using `scripts/deploy-katatib-connected.sh` for `katatib-64049`. Original `hifd-kouttab` production configuration is unchanged. Until that deployment runs, these controls are not live.
