# Reviewing the copied V1 evidence in V2

The test site is connected to `katatib-64049`. It does not continuously read or synchronize the original `hifd-kouttab` project. Its V1 evidence is the copied snapshot; later production changes require a separately reviewed refresh/comparison. This change does not write to either project's historical collections.

## Where to inspect records

- Students: active, archived, or both. The profile has previous attendance, previous learning/evaluations/revisions/plans, new corrected learning, new plans, and attendance revisions. Previous accuracy, progress, total score, absence rate, enrollment date, and gender are projected alongside the existing balance and attendance rate. Unknown fields stay unknown.
- Classroom → Learning: previous learning and plans are visible beside current V2 learning. Corrections continue to replace one displayed lesson while retaining earlier versions.
- Students → History: all available dates by default, previous records plus current V2 attendance, learning, and planned work. Filters select source, kind, student, and optionally month/day. Forty-row pagination does not limit database reads to one page. Original identifiers and V2 eighth ranges remain visible. Attendance session zero is retained without guessing missing sessions.
- Reports → Data review: explicitly load every authorized student, including archived students present in the authorized roster. See counts by source/type and by student, and export a spreadsheet. It is a view inventory, not a live cross-project comparison or an assurance that all production documents have migrated. A failed read removes the apparently complete table instead of substituting zero counts.
- Monthly reports remain monthly. Use Data review for all-date counts rather than treating a current month's zero as missing historical data.

## Limits of the comparison

Only records attached to students permitted for the signed-in account are included. Authentication credentials, unrelated users, login logs, storage objects, and unrelated student records are not exposed by this screen. School schedules, teachers, and question review retain their existing scoped tools; this inventory covers educational student evidence. Offline counts apply only to the saved device copy; reconnect for complete online reads.

Counts retain V1/V2 separation. Previous balances are not added to new confirmed coverage because their overlap is unknown. Original ambiguous sessions and invalid dates stay visible. Count equality alone does not establish equal formulas, identical report semantics, or complete feature parity with V1.

Before migration, compare the current production snapshot against the test copy, test role access and an actual offline lesson, and verify backups and rollback. UI improvements and readable copied records do not by themselves authorize replacing V1.
