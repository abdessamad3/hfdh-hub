#!/usr/bin/env bash
# Read-only source/test snapshots and reconciliation. Never restores or deploys.
set -euo pipefail
umask 077
katatib_check_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$katatib_check_root"
command -v gcloud >/dev/null || { printf 'Run this in your signed-in Google Cloud Shell.\n' >&2; exit 1; }
mkdir -p "$HOME/hifdh-backups"
katatib_check_dir="$(mktemp -d "$HOME/hifdh-backups/migration-check-XXXXXXXX")"
printf 'Read-only comparison. No data will be changed. Private output: %s\n' "$katatib_check_dir"
python3 scripts/katatib-backup.py --project hifd-kouttab --output-dir "$katatib_check_dir/source"
python3 scripts/katatib-backup.py --project katatib-64049 --output-dir "$katatib_check_dir/target"
katatib_source_files=("$katatib_check_dir"/source/hifdh-firestore-*.zip)
katatib_target_files=("$katatib_check_dir"/target/hifdh-firestore-*.zip)
if [[ ${#katatib_source_files[@]} -ne 1 || ${#katatib_target_files[@]} -ne 1 || ! -f "${katatib_source_files[0]}" || ! -f "${katatib_target_files[0]}" ]]; then
  printf 'Expected one complete backup for each project. Audit stopped.\n' >&2
  exit 1
fi
katatib_audit_status=0
python3 scripts/katatib-migration-audit.py --source "${katatib_source_files[0]}" \
  --target "${katatib_target_files[0]}" --output "$katatib_check_dir/readiness.json" || katatib_audit_status=$?
printf '\nPrivate comparison report: %s/readiness.json\n' "$katatib_check_dir"
printf 'A matching clone is not approval to replace production. Auth, feature parity and rollback still need verification.\n'
exit "$katatib_audit_status"
