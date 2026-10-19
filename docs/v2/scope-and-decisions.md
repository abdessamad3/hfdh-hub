# Scope and decisions

## Requirements carried from the owner and supplied report

- Data is the priority. Changing the main project is acceptable; data loss is not.
- Preserve existing records, relationships and useful capabilities during the transition.
- Keep the main address `https://hifd-kouttab.web.app/`; use isolated development/testing before cutover.
- Firebase is the intended platform. Remain within the stated free/no-card constraint unless the owner changes it explicitly.
- Kuttabs are private. Teachers may work in multiple groups/kuttabs. Only admins assign access rights.
- Use Warsh text/audio from verified sources. Use teacher-driven highlighting initially; automatic tracking remains an experiment.
- Teacher-only classroom recording: short mistake clips for normal recitation, full audio for exams, subject to feasibility.
- Preserve verse-mark history rather than overwriting it. Types: forgot, hesitated, error, correct.
- Archive students through a manager decision, preserve history, and support restoration. Audio expiry is a separate retention process.
- Staff/parent Google login is implemented. Administrator-issued student code/eight-digit PIN cards and audited replacement are implemented on the test branch; actual provider/account acceptance remains pending.
- Arabic/French and phone-first teaching are required in the V2 report. Removing existing English support is not yet a decision.
- Review pull requests, test releases and production releases with the owner. Existing automatic main deployment is not a substitute for a separately agreed release process.

These are requirements recorded from the supplied plan, not independently verified claims that each is feasible on Spark.

## Existing features to retain or explicitly account for

| Capability | Existing source | V2 treatment |
| --- | --- | --- |
| Google login and role profiles | `src/App.tsx`, `src/services/db.ts` | Preserve staff entry; replace broad authorization |
| Kuttabs, teacher profiles and schedules | Kuttab/Teacher pages, `src/types/index.ts` | Stable IDs, membership and groups |
| Student enrollment, edit, list, profile | StudentsList/StudentProfile pages | Preserve records; add archive/import/restore |
| Student/teacher attendance and calendars | Attendance, student/kuttab calendar components | Canonical session records and valid dates |
| Evaluations and memorization | EvaluationEntry, service methods | Preserve historical records and unique coverage |
| Revisions and next tasks | RevisionEntry, NextRevisionTask, NextEvaluationTask | Preserve missed work and idempotent completion |
| Student portal/progress/ranking | StudentPortal, StudentProgressPage, RankingPage | Preserve capability; revise ranking/privacy |
| Monthly reports and print preview | MonthlyReport | Preserve printing; add verified Excel/PDF exports |
| Quran reader and reciter audio | QuranDatabase, `src/services/quran.ts` | Preserve feature; replace simulated/few-replacement text strategy |
| Smart Challenge and question management | SmartChallengePage, ManageSmartQuestionsPage | Preserve content and function; schedule V2 UI |
| Search and login history | AdminSearchBar, LoginHistory | Scoped search and broader audit events |
| Languages/responsive layout | `src/i18n.ts`, shared components | Keep Arabic/RTL; add French; decide English later |
| Keyless deploy and page code splitting | Workflow, `src/App.tsx` | Retain useful infrastructure; revise release gates |
| Separate recitation experiment | `recitation-lab/` | Keep independent; no production ASR dependency |

## Delivery phases

| Phase | Deliverable | Exit evidence |
| --- | --- | --- |
| 0 | Specification and preservation plan | Reviewable rules, entities, decisions and migration gates |
| 1 | PIN/reset, Warsh, audio/offline and cost prototypes | Measured feasibility and recorded limitations |
| 2 | Isolated environment, structure, design system, languages and CI | Test site with synthetic fixtures; production config cannot be selected accidentally |
| 3 | Accounts, kuttabs, groups, assignments and rules | Role isolation and membership tests pass |
| 4 | Students, import, archive/restore and cards | Validated import and reversible archive workflows |
| 5 | Teacher Today, sessions, attendance, evaluations and revisions | Complete assigned-student workflow; consistent profile history |
| 6 | Offline queue, retry and conflict handling | Device disconnect/reconnect scenarios pass without duplicate writes |
| 7 | Warsh Mushaf, manual highlight and verse history | Verified text mapping and append-only mark tests |
| 8 | Classroom recording if feasible | Actual-phone clipping, persistence, upload and retention checks |
| 9 | Plans, notices and student/parent portals | Assignment-to-completion and child isolation tests |
| 10 | Reports, ranking, search, challenge and administration UI | Complete exports and restricted aggregate views |
| 11 | Full verification, backup, migration rehearsal and rollback | Source/target reconciliation and successful restore |
| 12 | Approved cutover and stabilization | Production verification, monitoring and usable rollback |

Role enforcement starts in phase 3; the richer permissions administration UI can arrive later. Offline integrity influences the schema from the start even though device workflows are verified in phase 6. Audio prototypes run early; recording UI and storage are not promised until they pass.

## Decisions still open

| ID | Decision | Proposed direction, not yet an owner decision | Needed before |
| --- | --- | --- | --- |
| D01 | Test-project identity and access | Separate Firebase project with synthetic fixtures first | Phase 2 |
| D02 | Backup mechanism and private location | Authorized type-preserving export; restore test; no public-repo backups | Production conversion |
| D03 | Business timezone | Per-kuttab IANA zone; propose Africa/Casablanca for Moroccan kuttabs, subject to confirmation | Session implementation |
| D04 | Attendance numerator/denominator | Count present/late/left-early as attended; exclude excused; show unrecorded separately. Confirm policy first | Phase 5 |
| D05 | Simultaneous late and early departure | Store both facts; show both badges rather than losing one | Phase 5 |
| D06 | PIN policy and recovery | Prototype Firebase-compatible login; prove reset without exposing PINs or billing changes | Phase 3 |
| D07 | Licensed Warsh text, page and verse identifiers | Versioned authentic source; no simulated fallback | Phase 7 |
| D08 | Audio codec, bitrate, retention and storage | Measure 16/24 kbps options and actual encoder output; report defaults 90-day clips/60-day exams are proposals pending feasibility | Phase 8 |
| D09 | English | Preserve existing support unless the owner explicitly removes it | Language rollout |
| D10 | Global ranking and visibility | Unique verified memorization only; no locally configurable score in the shared ranking; decide ties/participation | Phase 10 |
| D11 | Parent linking and recording participation | Verified child associations, consent records and withdrawal behavior | Parent/recording launch |
| D12 | Unmatched legacy relationships | Produce exceptions for owner resolution; never guess silently | Migration rehearsal |

An unanswered decision stays open. Time passing is not approval. Technical proposals can be tested with synthetic data while these decisions are pending.
