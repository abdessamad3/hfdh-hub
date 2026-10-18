# Katatib test-project connection

The fictional workflow remains at `/`. A separate `/live/` page signs in with Google and reads copied student records and up to 20 copied attendance rows per student. It never writes student data, attendance, user profiles or access grants. It does not recalculate the original statistics. It is a first read-only integration, not cloud attendance saving or the completed V2.

## Project boundary

Only `katatib-64049` is accepted. The Firebase web configuration comes from Hosting's `/__/firebase/init.json`; the browser validates both project ID and auth domain before initializing the SDK. There is no copied private key, service account or password. The original `hifd-kouttab` app, config, rules, Hosting and data are not deployed or accessed by these scripts.

Authentication creates new accounts in the test project. Original Auth accounts are not imported. A first sign-in does not grant access. `katatib_access/{lowercase verified Google email}` is a separate test-only access document, provisioned by the owner's administrative CLI. The original copied `users` collection is neither changed nor trusted for this integration. A new Google UID therefore does not need to match an original UID.

An active admin grant reads all copied students with bounded queries. An active teacher grant reads only assigned `kuttabNames` and/or original `teacherIds`; these assignments are an OR, so specifying a kuttab explicitly grants its whole roster. Exact kuttab names are the V1 data boundary; unique kuttab IDs should replace this legacy name matching in the full V2 model. Users cannot write their own grants, list other grants, or write any collection. Attendance access follows the actual referenced student's authorization, not a potentially stale kuttab field on an attendance row. All unspecified collections remain denied.

The roster fetch is limited to 100 students per assignment and reports when the cap is reached. History shows **up to 20 entries**, not necessarily the latest 20 (no ordered composite index is introduced in this first slice). Missing source values remain missing. The UI includes a search, kuttab filter and student profile with the copied history.

Google Auth uses in-memory persistence; Firestore uses memory caching and server-only reads. No student data or tokens are written by this page to localStorage, sessionStorage, IndexedDB persistence or a service worker. Reloading requires sign-in again. Signing out immediately clears the visible roster/profile and invalidates outstanding requests. This cannot erase screenshots or data already seen by an authorized user; access revocation prevents further server reads.

## Owner setup in the Firebase console (once)

In **katatib-64049**, open **Authentication → Get started** if needed, then **Sign-in method → Google → Enable**. Choose the project's support email and save. Under **Authentication → Settings → Authorized domains**, ensure `katatib-64049.web.app` is listed. Add it if missing. No student login or original Auth import is required.

## Deploy from the existing Cloud Shell checkout

Use the checkout already used to publish the fictional preview:

```bash
cd ~/katatib-v2-preview/katatib-v2-preview
# If your checkout is instead ~/katatib-v2-preview, use that directory.
git pull --ff-only
bash scripts/deploy-katatib-connected.sh
```

The owner's screenshot showed a nested checkout, so choose the existing directory containing `scripts/`. The deployment script validates the test config, runs both model test suites, creates an admin access grant for `gcloud config get-value account`, then deploys **only test Firestore rules and test Hosting**. It uses existing gcloud credentials; it does not print tokens. An identical grant is a no-op; an existing different grant is never overwritten. If the gcloud account is not the intended test administrator, stop and choose the right Google account before running it.

Open `https://katatib-64049.web.app/live/` and sign in with that same Google account. The `/` fictional preview still works independently, with its old device-local saves.

## Give a teacher access

Run this as the owner in Cloud Shell, using the exact copied kuttab name:

```bash
python3 scripts/katatib-test-access.py --email TEACHER_GOOGLE_EMAIL --role teacher --kuttab 'EXACT COPIED KUTTAB NAME'
```

For records attached only by the original teacher UID, add `--teacher-id ORIGINAL_UID`. Neither value should be guessed from the new test UID. To revoke access, set `active` to false in that account's test `katatib_access` document using the Firebase console. Do not change the original `users` records. Have the teacher sign out/in after an assignment change.

## Verification and limits

- Model checks reject the original project/config, invalid/inactive roles and unassigned teachers; they preserve missing values and deduplicate scope overlaps.
- Browser checks use a mocked auth/data adapter to verify sign-in UI, denial, safe display, roster/profile, sign-out races, Arabic/French and phone/desktop layouts. They do **not** establish that the owner's live Google OAuth configuration works.
- Firestore emulator checks exercise the actual rules for strangers, revoked users, unverified email, password-provider impersonation, wrong kuttab queries, forged attendance scope, unbounded reads and every client write.
- Owner live smoke test remains: sign in, see the copied roster, open a profile, sign out; try an ungranted Google account and confirm denial. No production account/data is needed for this test.
- Production rules, a V2 permissions editor, profile migrations, cloud attendance writes and offline synchronization are future work. This test reader does not implement them.
