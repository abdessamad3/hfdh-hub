# Katatib V2 — first teacher preview

This is an interactive, fictional-data preview of Today, students/profiles and session attendance. It follows the owner's cream/forest-green direction, with Arabic RTL and French LTR layouts. The restored test database and original production database are not read or written. No Firebase SDK or credentials are loaded by the preview. The registered test web app is not yet connected.

## Try it

Serve the repository's `public/katatib` directory with any static server, for example:

```sh
python3 -m http.server 8000 --directory public/katatib
```

Open `http://localhost:8000/demo/`. The root now opens the connected app; the standalone fictional preview is under `/demo/`. This preview uses standard browser modules and has no npm runtime/build dependencies. It lives separately from the existing React application; its model/interaction decisions can be carried into the V2 React app after the first workflow review. It is not the completed V2 foundation or an authentication implementation.

1. Switch between Arabic and French.
2. Select a fictional circle, date and morning/afternoon/evening session.
3. Mark a student present/absent/excused/late/left early. Click the same status again to clear it.
4. Add a note on Today; navigate students without losing the draft.
5. Save the session, then view that student's profile: the saved attendance and note appear in history.
6. Reload: saved attendance is retained on the same browser/origin. Other groups, dates and sessions remain separate.
7. On the attendance page, “mark the others present” affects only unmarked students and preserves intentional absences/notes.

Saving is explicit. Unmarked is distinct from absent. A pending-change message and a browser leave warning protect unsaved drafts. Saved means stored on this device; it does not mean cloud-synchronized. A second tab's conflicting changes are rejected; changes to a different session are merged. Browser storage failure is reported instead of claiming success. Corrupt/unsupported stored data is not silently overwritten. Private/incognito mode, clearing site data or changing domains can remove/isolate browser-local data.

All student identities, memorization values and teacher identity in this preview are fictional. Profile history contains only this browser's explicitly saved demonstration sessions. For the small on-screen attendance count, present/late/left-early count as attended; no production attendance-rate policy is established here. Do not enter real personal data.

## Test-project Hosting

`firebase.katatib-preview.json` contains Hosting configuration only and points to `katatib-64049`. It contains no Firestore rules, data or Auth migration settings. The existing `.firebaserc`, `firebase.json`, Firebase client config and production workflow are not changed by this preview.

From the preview branch in the owner's Cloud Shell, authenticate Firebase CLI if necessary:

```sh
npx --yes firebase-tools@15.33.0 login --no-localhost
bash scripts/deploy-katatib-preview.sh
```

The deployment script validates its fixed project/content/configuration, runs the model tests, creates the test Hosting site only if missing, and deploys only static Hosting. It does not grant public access to the copied student database or change its locked rules. The owner's existing production-only GitHub deploy identity is not assumed to have access to this separate project.

This branch does not automatically publish the preview. On an approved future merge, the existing main Vite build will also copy these static files into `/katatib/` because they are in `public/`. Main's existing deployment behavior remains unchanged; review/approve that separately.

## Checks and remaining scope

- `node tests/katatib-domain.test.mjs`: actual local model behavior, session identity, reload/idempotency, notes, conflicts, storage failure and group isolation.
- `node tests/katatib-browser.cjs`: real-browser Arabic/French, mobile/desktop, attendance persistence, profiles, search and keyboard/dialog behavior. GitHub Actions installs Playwright for this check.
- No production read/write, sign-in, cloud attendance, offline network queue, recordings, Quran text, user import or school authorization is implemented by this preview. Those need the separate test-project integration and security tests described in the V2 plan.
