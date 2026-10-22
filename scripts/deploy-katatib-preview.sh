#!/usr/bin/env bash
# Hosting-only deployment of the fictional preview to the fixed TEST project.
set -euo pipefail
katatib_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$katatib_root"
katatib_project='katatib-64049'
node --input-type=module - <<'NODE'
import fs from 'node:fs';
const config = JSON.parse(fs.readFileSync('firebase.katatib-preview.json', 'utf8'));
if (Object.keys(config).some(key => key !== 'hosting') || config.hosting.site !== 'katatib-64049' || config.hosting.public !== 'public/katatib') {
  throw new Error('Refusing an unexpected project, content directory or database deployment.');
}
for (const file of ['index.html', 'app.mjs', 'domain.mjs', 'styles.css']) {
  if (!fs.statSync(`public/katatib/${file}`).isFile()) throw new Error(`Missing preview file: ${file}`);
}
NODE
node tests/katatib-domain.test.mjs
katatib_sites="$(mktemp)"
trap 'rm -f "$katatib_sites"' EXIT
npx --yes firebase-tools@15.33.0 hosting:sites:list --project "$katatib_project" --json > "$katatib_sites"
katatib_exists="$(node --input-type=module - "$katatib_sites" <<'NODE'
import fs from 'node:fs';
const data = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(data.result?.sites)) throw new Error('Could not verify the test project Hosting sites.');
console.log(data.result.sites.some(site => site.name === 'projects/katatib-64049/sites/katatib-64049' || site.name?.endsWith('/sites/katatib-64049')) ? 'yes' : 'no');
NODE
)"
if [[ "$katatib_exists" == 'no' ]]; then
  npx --yes firebase-tools@15.33.0 hosting:sites:create katatib-64049 --project "$katatib_project"
fi
npx --yes firebase-tools@15.33.0 deploy \
  --project "$katatib_project" \
  --config firebase.katatib-preview.json \
  --only hosting \
  --non-interactive \
  --message 'Katatib V2 fictional-data teacher preview'
printf '\nPreview deployed: https://katatib-64049.web.app/\n'
