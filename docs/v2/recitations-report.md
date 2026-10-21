# Combined recitation update — implementation report

Status: implemented for the V2 candidate. Cloud recording activation and a real-device/live-account acceptance test remain required. This is not a production migration approval.

## What changed

| Area | Result |
|---|---|
| Passage selection | One selector supports surah/ayah ranges and thumun, quarter, half-hizb, whole-hizb and custom eighth ranges. Cross-hizb intervals are supported. |
| Warsh references | Pinned edition, 6,214 ayahs and 480 thumun starts; exact inside-ayah offsets retained. The form shows the passage boundaries before saving. |
| Mushaf preview | Opens the first relevant page and highlights the selected ayahs as pages change. Inside-ayah boundaries are disclosed; highlights cover the whole boundary ayah. |
| Progress | Both selection methods feed the existing 60×8 table. ◐ means partial coverage. Confirmed intervals are merged so repeated/overlapping recitations do not inflate memorized totals. |
| Mistakes | Marks may link to a specific recitation. Cells count the latest linked marks for each ayah; forgotten, error, hesitation and correct marks remain distinguishable in details. Aggregate mistakes across several eighths are not assigned to every cell. |
| History | Exact passage descriptions remain visible in learning history, student details and generic record views. Prior corrections remain immutable. V1 data is not rewritten or guessed. |
| Recording | Completed recordings save to account-isolated IndexedDB after the user confirms a private device. They survive reload; the recording panel retains a history with playback, download and local-copy removal. |
| Online save | Private Supabase bucket and server-mediated upload/playback. Firebase remains the identity and student-data system; audio metadata is stored privately in Supabase. |
| Retry and integrity | Stable UUID/object path; server verifies size and SHA-256 before confirming online save. A lost acknowledgement retries the same object. |
| Offline sync | Explicit Save online / Sync now, no automatic uploads after reconnect. Student/learning edits sync before audio, so a paused audio service does not block ordinary classroom data saves. |
| Family access | Student profile shows authorized recordings. Offline listening requires an explicit download to that device. |
| Limits | Shared 900 MB reservation ceiling below the provider allowance, 32 MiB per upload, requested speech bitrate and device storage limit. No automatic cloud deletion or billing upgrade. |

## Verification

- All 25 JavaScript unit-test files pass, including new passage, recording-library and recording-server tests.
- Firestore emulator tests pass for legacy and schema-3 learning records, malformed passage rejection, scoped reads/writes and verse-to-recitation association.
- Real Chromium MediaRecorder with synthetic microphone audio: local save, reload recovery, failed upload retention and playback pass. Layout has no horizontal overflow at 390, 820 and 1366 pixels.
- Existing Mushaf browser checks pass: real SVG fixtures, verse geometry, marking/retry, touch scrolling and RTL/LTR page turns.
- Full mocked-provider application browser scenario passes for learning corrections, progress and family access. These mocks are not proof of live OAuth or live Supabase integration.
- Supabase project URL/publishable key read-only check returned HTTP 200. It does not verify the new function or uploads.
- Offline shell hashes are regenerated and checked. CI also runs the complete offline service-worker/SDK scenario.

## Activation still required

Follow [recitations-setup.md](recitations-setup.md): run the SQL migration in the owner's Supabase project, deploy the `recitations` Edge Function, then deploy candidate Hosting and Firestore rules together. No credentials for those deployments are available in this workspace. No secrets should be sent in chat.

After activation, verify one teacher upload and playback from another authorized device, offline restart/sync, interrupted upload retry, and denial for an unrelated account. Test Android/iPhone codecs and microphone behavior with a short recording first.

## Practical limits

- A recording must be stopped before it is durably saved; closing the app during active recording can lose that unfinished audio.
- Browser storage is not a permanent backup. Pending-change JSON exports do not include audio bytes; use Download for independent audio backups.
- Inside-ayah thumun boundaries make whole-ayah marks ambiguous between two cells. Detailed marks remain visible; an exact per-cell count is not invented.
- Recording alone does not certify memorization. Learning evaluation and confirmation remain deliberate teacher actions.
- Supabase free-plan storage, bandwidth, function quotas and inactivity pausing apply. The owner may need to resume the project after holidays.
- Unfinished cloud reservations are retained until an administrator reviews them; no automatic retention/deletion policy was authorized.
- The original production site, database and billing settings have not been changed.
