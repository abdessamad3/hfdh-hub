# Katatib: test release acceptance and rollback preparation

The software update stays on `katatib-v2/teacher-preview` and `katatib-64049`. Nothing here authorizes replacing `hifd-kouttab`, merging main, changing billing, resetting passwords or deleting records.

## Owner deployment

```bash
cd ~/katatib-v2-preview/katatib-v2-preview
git pull --ff-only
bash scripts/deploy-katatib-connected.sh
```

Reload the test website. Run the classroom trial there with test entries. This environment has no Firebase administrative identity and cannot execute the owner's deployment, inspect the owner's accounts or observe a physical classroom.

## Classroom and account trial — pending actual observation

Record **passed / failed / not tested**, the test date, device/browser and the account role for each item. Do not paste student details into an issue or chat.

1. Admin, manager and teacher sign in with their real Google identities. Reload and verify same-tab restoration. Sign out and verify student data disappears. Verify a disabled grant fails closed.
2. A manager sees only assigned kuttabs/teachers; a teacher sees only assigned students. A parent/student sees only explicit links and cannot open management, ranking, corrections or teacher attendance. Test another account, not just hidden buttons.
3. Create a weekly schedule, then a dated closed day. Confirm the dated exception wins. Old arbitrary session labels remain visible and are not automatically mapped or used to mark attendance.
4. Save student and teacher attendance, reload on another device, correct it and inspect retained history. Test a different date/session. Disconnect before a save, reconnect and retry the same operation. A stale edit must not overwrite a newer save.
5. Correct one copied evaluation with a reason. Verify one visible corrected entry, its original and the audit history. Confirm the original source database was not changed.
6. Review a copied question against a trusted source and correct answer. Only then activate it. Complete a practice round as a linked student. Confirm practice does not increase memorization progress or ranking. Deactivate the question and confirm it is unavailable for a new round.
7. Verify confirmed, overlapping and corrected V2 memorization, tied ranking positions and separate original balances. Ranking is a scoped staff view, not a public student directory.
8. Check a historical month and a current month against known real attendance/evaluation records. Compare printed/PDF and Excel figures. Resolve original unmapped sessions and review the explicit mean-score metrics against your reporting needs. Complete/cancel an old plan and confirm it stays preserved without fabricating a grade.
9. Switch Arabic/French/English, including errors, forms, history, recording and phone layout. Student-authored Arabic is not translated or rewritten.
10. A teacher completes one entire session on an actual phone with weak connectivity. Download a local recording and play the downloaded file. Audio remains local; no shared cloud recording service is claimed.

Automated browser, model and emulator tests are additional evidence, not substitutes for these observations.

## Private recovery inventory

```bash
python3 scripts/katatib-recovery-inventory.py --project hifd-kouttab
python3 scripts/katatib-recovery-inventory.py --project katatib-64049
bash scripts/katatib-migration-check.sh --background
```

Follow the printed log command. Do not launch duplicate comparison runs. Exports are read-only but consume normal read quotas. Keep both completed ZIPs, their hashes, the comparison report and inventory folders private. **Do not upload Auth inventories or configuration to GitHub or chat.**

Inventory permission errors mean **not verified**. Auth/password hashes and settings being present is not proof of a working import. Missing password hashes need a separately approved recovery/reset decision. Provider sign-in must be rehearsed with the destination project's actual authorized domains and identities. Storage inventory contains metadata only: if objects exist, separately copy and hash their payloads and rehearse a restore before approval. Keep required rules/indexes/settings and source Hosting release IDs pinned; a release-ID inventory alone does not preserve all Hosting file contents.

## Cutover and rollback — prepare before asking for final approval

1. Keep V1 main and its original Hosting/rules/configuration intact. Record the exact source commit, Hosting release/version, ruleset and index configuration, and verify the previous release is recoverable.
2. Agree a maintenance/write-freeze window. During that window make final consistent backups of the source and destination, including **all new V2 collections**. Reconcile source changes since the earlier clone; do not overwrite differences or unexplained records to force a green comparison.
3. Rehearse in an isolated destination: restore typed records/references and account/provider mappings, recover files, apply settings/rules/indexes and compare before/after counts and values. Keep original metadata limitations explicit. No production database is a rehearsal target.
4. Prepare a concrete deployment plan and an explicit mapping for continued writes. Obtain the owner's final approval only when the rehearsal, real acceptance checklist and backup recovery evidence are available. This repository contains no automatic production-switch command.
5. If rollback is needed, stop writes first and export every V2 change/audit/attempt/profile/task/schedule/correction added since cutover. Returning Hosting to V1 alone is insufficient because V1 does not understand the new collections. Retain the V2 data, reconcile it into a compatible release or a reviewed data migration, and verify no new records disappear before reopening writes.

**Current status: production replacement is not approved.** Real accounts, physical-phone acceptance, payload restores and retention of post-cutover writes remain unverified until the owner-run evidence is reviewed.
