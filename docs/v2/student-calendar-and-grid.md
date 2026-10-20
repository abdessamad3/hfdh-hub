# Student calendar and hizb tracker: V1 comparison

V1's calendar and 60-by-8 table communicate patterns more clearly than the previous V2 lists. V2 now places both views inside the existing student profile tabs. The tracker is also available beside the classroom Learning history; there is no new main destination.

## Attendance

The calendar reads the same scoped student history as the lists. It uses current V2 attendance documents, not every immutable edit event as a separate session. A day can show several states: different sessions and previous/new sources may coexist. Selecting a date lists every recorded session, original source/key, status, note and ambiguity flag. Dates without a record are explicitly unrecorded. Excused attendance remains excused, distinct from lateness. Holidays and weekend absences are not inferred.

The initial month contains the most recent recorded attendance, falling back to the current Casablanca month if none is available. Source selection can jump to that source's latest month when the displayed month contains none of its records. Previous/next and a month input support historical years without V1's fixed year list. Unknown dates remain accessible in the original lists.

## Learning

All sixty hizbs are shown with exactly eight columns. A filter can show only hizbs with evidence. Evidence views separate previous V1 evaluations, V2 confirmed memorization, V2 evaluations, V2 revisions and V2 practice. An evaluation or practice record does not become certified memorization.

Previous mapping accepts exact V1 identifiers `t1..t8`, `r1..r4`, `n1..n2`, `h` and `h1`. Unlike V1's numeric-quantity fallback, a quantity alone never assigns coverage to the first eighths. Such rows appear explicitly under an unmapped-record disclosure before the table. The original history remains available for review and correction.

Quality colors describe recorded mistakes in the latest dated evidence. If same-date records disagree, the highest known mistake count is shown; if any tied record lacks a mistake count, quality is unknown. Selecting a cell opens all its evidence immediately beneath that hizb. Dates, ranges, notes and identifiers remain available. Existing correction chains determine current V2 ranges; replaced or conflicting records do not silently inflate certified coverage.

Phone users can scroll the eight-column table horizontally while retaining normal vertical scrolling. Buttons and symbols supplement color. The views use existing role-scoped data and saved offline history, not new database permissions or a live connection to V1. Offline completeness remains limited to the prepared device copy.

## Validation

Model tests cover leap-year calendars, mixed sessions/sources, unknown dates, exact V1 portions, unmapped quantities, corrected V2 ranges and distinct evaluation/confirmation semantics. Browser checks exercise calendar navigation and day details, the sixty-by-eight table, cell details, evidence switching, and existing profile/read-only workflows. Physical phone acceptance remains part of the classroom trial.
