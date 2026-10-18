#!/usr/bin/env bash
# Explicitly deploy test rules and Hosting to the fixed TEST project only.
set -euo pipefail
katatib_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$katatib_root"
node --input-type=module - <<'NODE'
import fs from 'node:fs';
const c = JSON.parse(fs.readFileSync('firebase.katatib-connected.json', 'utf8'));
if (c.hosting.site !== 'katatib-64049' || c.hosting.public !== 'public/katatib' || c.firestore.rules !== 'firestore.katatib-test.rules' || Object.keys(c).some(k => !['hosting', 'firestore', 'emulators'].includes(k))) throw new Error('Unexpected deployment configuration.');
NODE
node tests/katatib-domain.test.mjs
node tests/katatib-live-model.test.mjs
node tests/katatib-cloud-attendance.test.mjs
node tests/katatib-learning.test.mjs
node tests/katatib-progress.test.mjs
katatib_owner="$(gcloud config get-value account 2>/dev/null)"
if [[ "$katatib_owner" != *'@'* || "$katatib_owner" == *'gserviceaccount.com' ]]; then
  printf 'Sign in to Cloud Shell with your owner Google account first.\n' >&2
  exit 1
fi
python3 scripts/katatib-test-access.py --email "$katatib_owner" --role admin
# The original firebase.json, firestore.rules and original project are never selected.
npx --yes firebase-tools@15.33.0 deploy --project katatib-64049 \
  --config firebase.katatib-connected.json --only firestore:rules,hosting --non-interactive \
  --message 'Katatib test-only Google sign-in and V2 attendance and learning records'
printf '\nKatatib deployed: https://katatib-64049.web.app/\n'
