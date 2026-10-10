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

The Action logs in to Google without any key or secret (Workload Identity
Federation): Google trusts GitHub's token for this repository on `main`, and
lets it act as the `github-deploy` service account, which can only deploy
Hosting and Firestore rules.

To set this up (or repair it), open [Google Cloud Shell](https://shell.cloud.google.com)
as an owner of the `hifd-kouttab` project and run:

```sh
curl -fsSL https://raw.githubusercontent.com/abdessamad3/hfdh-hub/main/scripts/setup-github-deploy.sh | bash
```

The script is safe to run more than once.

To deploy without a code change, open **Actions** → **Build and deploy** →
**Run workflow**.

### Manual deploy

```sh
firebase login
npm run deploy   # builds, then deploys firestore.rules and hosting
```

Deploy rules on their own with `firebase deploy --only firestore:rules`.
