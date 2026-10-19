# Full PDF acceptance matrix

Specification: the owner's **Hifdh Hub v2 — Full Report** (12 pages) and **Hifdh-Hub-v2-Design-and-Report** (21 design pages plus that report). This replaces any implication that a working connected roster means the entire product is complete. Work is authorized as one integrated test release. Production replacement and billing changes remain separate critical decisions.

`Implemented` means code exists; it does not mean physical-phone or live-account acceptance has happened. Every unresolved row below remains part of the requested scope.

| Design screen | Existing implementation | Acceptance still required |
| --- | --- | --- |
| 1. Login | Google staff/parent; student code/eight-digit PIN and administrator cards, secondary in-memory Auth, UID-bound grants, audited replacement/revocation | Enable password provider on test project; owner uses actual student card. No PIN stored in Firestore. Lost acknowledgements retry the same account; staff session survives creation. |
| 2. Teacher Today | Assigned roster, groups, classroom shortcuts | Today's tasks, archive alerts, meaningful counters and notifications together; real classroom walkthrough. |
| 3. Roll call | Student and teacher attendance, independent date/session records, revision checks, immutable changes | Kuttab-configured sessions and durable offline reconciliation; actual-phone use. |
| 4. Teacher Mushaf | Printed Madinah Warsh reader implemented; see [reader evidence](mushaf-reader.md) | Physical-phone and qualified-content acceptance remain. **Printed Warsh edition layout**: original pages, lines, verse positions and pagination. Teacher taps a verse without reflowing text. Four marks ن/ت/خ/ص, note, author/date history and latest letter/color. Manual highlight, previous/next verse/page and portion navigation. No Hafs substitution or fabricated verse coordinates. |
| 5. Classroom recording | Local recorder plus a bounded [phone clipping/compression test](audio-phone-test.md), playable 5s/10s verse windows, review/remove/undo and measured reports | Normal mode keeps only 5-second-before/10-second-after mistakes; no mistakes means no retained audio. Twenty-minute normal / 45-minute exam limits. Firestore chunk feasibility, quota enforcement, consent, offline recovery, shared playback, undo, retention and actual Android/iPhone codec tests. |
| 6. Tasks | Memorization/revision/evaluation, due dates, overdue retained, done/cancelled audit | Student next-task and notifications linkage; offline writes. |
| 7. Teacher student profile | Scoped identity, source baseline, confirmed unique coverage, attendance/learning/history | Verse weak spots, recordings, complete PDF presentation and account/archive actions in one profile. |
| 8. Student home | Explicitly linked roster, progress, read-only records/tasks/reports, reviewed practice | Next task, streak, notices, verse weak spots and exam playback. |
| 9. Student Mushaf | Same printed Madinah Warsh pages and linked read-only marks/history | Shared clips remain pending; no student microphone. |
| 10. Shared ranking | Staff-scoped confirmed V2 coverage only | Cross-kuttab first-name-only projection, consent, verified totals and freshness; no private directory exposure. |
| 11. French student side | French core navigation and workflows; English retained as additional language | Complete new screens, narrow-phone and RTL/LTR checks. |
| 12. Parent | Administrator-verified explicit child links, Google login, authorized history/tasks/reports | Notices, revision-bound read acknowledgements and parent-owned audio/ranking choices are implemented; actual-family acceptance remains pending. Today, verse marks and audio integration remain. |
| 13. Manager dashboard | Scoped roster, reports, teacher attendance | Seven-day counts/groups, missed tasks and archive alerts, bounded read budget. |
| 14. Students/archive | Enrollment, profile overlays, reversible archive, stable IDs, CSV preview/resume | Absence/inactivity thresholds raise review alerts; keep/archive decision; teacher/group management and original ownership reconciliation. Never auto-delete history. |
| 15. Kuttab settings | Audited weekly schedules, dated overrides/closures | Archive/scoring/behavior rules, recording limits/retention/storage and notification events wired into consumers. |
| 16. Reports | Monthly V1/V2 sections, counts, means, student card, print/PDF and Excel XML | Certificates, kuttab comparison, confirmed V1 formula parity and read-budget evidence. |
| 17. Excel import | UTF-8 CSV, fixed IDs, preview, partial retry, conflict rejection | Direct XLSX with bounded parsing/validation and login-card issuance. |
| 18. Administrator | All authorized students/kuttabs, access/audit/readiness | Cross-kuttab dashboard and measured storage/problem indicators. |
| 19. Permissions | Five fixed roles and explicit scopes enforced in Firestore | Custom roles, page/action matrix and personal exceptions, server enforcement and self-lockout protection. |
| 20. Audit | Atomic immutable management/attendance snapshots and learning history | Notice changes and parent choices now require atomic audit snapshots. Authentication events, recording retention/deletion and remaining permission/settings actions are pending. |
| 21. Connected workflow | Tasks, history, correction chains, reports and permissions share actual records | All remaining screens consume the same data. No separate mock product at the homepage. |

## Additional report requirements

- Free, no-card deployment. No automatic Blaze change. Firestore audio is a feasibility requirement; the local recorder is not an equivalent substitute.
- Durable offline queue including audio, identity separation, explicit device storage policy, retry identifiers, conflict handling and reload recovery. In-memory drafts are not offline mode.
- Authentic source, reuse terms, exact Warsh numbering, original layout and verse hit regions must be pinned together. A text JSON array alone does not establish printed-page fidelity. The owner chose Madinah Warsh; the pinned artwork, geometry and navigation are integrated. See the reader evidence for technical and acceptance limits.
- Manual recitation highlight is in scope; automatic speech alignment remains a separate experiment. The old Hafs lab must not be represented as validated Warsh.
- Original site/data stay intact. Live source/test differences, Auth recovery, storage payloads, rules/indexes, new writes during cutover and rollback require evidence before replacement.

## Evidence log

19 October: student code/PIN model tests pass. Real Firebase Auth emulator/Chromium proves separate account provisioning/retry does not replace the staff session. Firestore emulator verifies code scope/revocation, UID isolation, forbidden staff promotion and stale replacement. The corrected full run passed on commit 7ee75f5. Existing teacher browser checks and production build passed on the first student-login commit. No live provider configuration, real student account creation or production deployment was performed.

Source investigation: Quranpedia publishes an official versioned Warsh dump with reuse terms and SHA-256 manifest at <https://api.quranpedia.net/dumps?lang=en> and API documentation at <https://api.quranpedia.net/>. That identifies a candidate source, not verified printed layout or qualified religious review. The King Fahd source timed out. A requested network download in this environment was interrupted; no dataset was acquired or substituted.

Madinah Warsh reader: code at `75a0bf9` passed the full browser/Auth/Firestore/model workflow and application build. Its integrated printed-page reader, navigation, zoom, manual highlight and immutable scoped marks/history are implemented. Shared verse recordings and physical-device/qualified-content acceptance remain open; see [reader evidence](mushaf-reader.md).
