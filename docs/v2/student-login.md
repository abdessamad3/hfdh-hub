# Student code/PIN access

Students can use a private random code and eight-digit PIN instead of a personal Google account. Teachers, managers and parents keep their verified Google login. This is implemented only in the separate `katatib-64049` test application.

## One-time Firebase configuration

The project owner must enable **Authentication → Sign-in method → Email/Password** in the test project. Do not enable email-link authentication or change the original project. This environment has no Firebase administrator identity, so this setting has not been changed here. A password policy requiring letters/symbols would reject numeric PINs; do not silently weaken an existing project policy. Review that setting before actual-card acceptance.

## Issuing and replacing a card

An administrator opens **Student login cards**, selects the existing student and creates a card. Firebase Auth creates a random synthetic account on a separate in-memory Auth instance; the administrator remains signed in. Firestore then atomically stores the UID-bound student-only grant, current credential pointer and immutable audit snapshots.

The card shows the student name, code, PIN and website address. Print/save it immediately. The PIN is not written to Firestore, audit records, browser persistent storage or application logs. The page temporarily holds the card in memory and warns before leaving. Clearing or leaving destroys the displayed PIN.

Replacing a card creates a new account/code and atomically disables the previous grant. Already signed-in old credentials lose database access. The student's stable record ID and all educational history remain unchanged. Other users' passwords are never reset in browser code. Old Auth accounts are not automatically deleted; an owner may separately inspect disabled-grant accounts in Firebase Auth.

If activation is not confirmed, retry **the same card**. A repeated account creation signs in only on the secondary instance to retrieve that account UID; the same transaction intent can recover a lost acknowledgement. Conflicting concurrent replacements are rejected rather than overwriting each other. An account created before an interrupted database transaction has no grant and cannot read student data.

## Server-enforced boundaries

- Synthetic password accounts have exactly one student link, no teacher/kuttab scopes, an exact Auth UID and a current credential pointer.
- A password token cannot become an administrator, manager, teacher or parent even if a malformed grant says so.
- Random codes use 100 bits of browser cryptographic randomness; the eight-digit PIN is additionally secret. Authentication attempts go through Firebase Auth and its service limits. There is no public code directory or client-side PIN comparison.
- The application does not provide anonymous self-enrollment into a school. Creating an Auth account alone confers no database permissions.
- Grant/pointer/audit writes are administrator-only. Students cannot rotate cards, grant themselves access or access another student's records.

## Acceptance evidence

Model tests validate inputs, role/UID boundaries and secondary-instance cleanup. Real Firebase Auth emulator plus Chromium tests prove account creation/retry preserves the staff session. Firestore emulator checks actual grant creation, linked-only reads, old-account revocation, stale replacement, forbidden staff promotion and corrupted-grant rejection. Mocked browser tests exercise student login failure/success and card retry/display. These do not replace a live owner/student-card smoke test or physical-phone acceptance.
