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

```sh
firebase login
npm run deploy   # builds, then deploys firestore.rules and hosting
```

Deploy rules on their own with `firebase deploy --only firestore:rules`.
Always deploy `firestore.rules` together with any change to how the app reads
or writes user profiles, since the sign-in flow depends on them.
