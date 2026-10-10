# Hifdh Hub

Quran memorization and attendance tracking for kuttabs: teachers record
attendance, memorization, revisions and evaluations; students follow their
progress, calendar and ranking.

Live: https://hifd-kouttab.web.app

Built with React, Vite, Tailwind CSS and Firebase (Google sign-in, Firestore,
Hosting). There is no backend server: the app talks to Firestore directly, and
`firestore.rules` is what controls who can read and write data.

## Development

Requires Node.js and, for deploying, the Firebase CLI (`npm i -g firebase-tools`).

```sh
npm install
npm run dev      # local dev server
npm run lint     # type check
npm run build    # production build in dist/
```

The Firebase web config lives in `firebase-applet-config.json`. It is not a
secret; access is enforced by `firestore.rules`.

## Deploy

Merging to `main` deploys automatically: the **Build and deploy** GitHub
Action (`.github/workflows/deploy.yml`) type-checks, builds, then deploys the
site and `firestore.rules` to Firebase. Pull requests are type-checked and
built, but not deployed.

### Automatic deploys: one-time setup

The Action needs a Google Cloud service account allowed to deploy to the
`hifd-kouttab` project, stored as a GitHub secret.

1. Open https://console.cloud.google.com/iam-admin/serviceaccounts?project=hifd-kouttab
   and click **Create service account**. Name it `github-deploy`.
2. Grant it these roles, then click **Done**:
   - Firebase Hosting Admin
   - Firebase Rules Admin
   - API Keys Viewer
   - Service Usage Consumer
3. Open the new account → **Keys** → **Add key** → **Create new key** → **JSON**.
   A `.json` file downloads.
4. In GitHub, open the repo → **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**. Name: `FIREBASE_SERVICE_ACCOUNT`,
   value: the whole contents of the `.json` file.
5. Delete the downloaded `.json` file from your computer. It grants deploy
   access, so never commit it or share it.

To deploy without a code change, open **Actions** → **Build and deploy** →
**Run workflow**.

### Manual deploy

```sh
firebase login
npm run deploy   # builds, then deploys firestore.rules and hosting
```

Deploy rules on their own with `firebase deploy --only firestore:rules`.
