#!/usr/bin/env bash
# Read-only source/test snapshots and reconciliation. Never restores or deploys.
set -euo pipefail
umask 077
katatib_check_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$katatib_check_root"
katatib_check_dir=''
katatib_background=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --resume)
      [[ $# -ge 2 && -d "$2" ]] || { printf 'Use --resume with an existing migration-check directory.\n' >&2; exit 1; }
      katatib_check_dir="$(cd -- "$2" && pwd)"
      shift 2
      ;;
    --background) katatib_background=true; shift ;;
    *) printf 'Usage: bash scripts/katatib-migration-check.sh [--resume DIRECTORY] [--background]\n' >&2; exit 1 ;;
  esac
done
if [[ -z "$katatib_check_dir" ]]; then
  mkdir -p "$HOME/hifdh-backups"
  katatib_check_dir="$(mktemp -d "$HOME/hifdh-backups/migration-check-XXXXXXXX")"
fi
if "$katatib_background"; then
  katatib_log="$(mktemp "$katatib_check_dir/check-XXXXXXXX.log")"
  nohup bash "$katatib_check_root/scripts/katatib-migration-check.sh" --resume "$katatib_check_dir" >>"$katatib_log" 2>&1 </dev/null &
  printf 'Read-only check started in background (PID %s). It can continue if this terminal disconnects.\n' "$!"
  printf 'Follow progress with:\ntail -f %q\n' "$katatib_log"
  printf 'Keep the Cloud Shell session available; stopping/recycling its VM can still stop the job.\n'
  exit 0
fi
command -v flock >/dev/null || { printf 'This check requires flock, available in Google Cloud Shell.\n' >&2; exit 1; }
exec 9>"$katatib_check_dir/.check.lock"
flock -n 9 || { printf 'A check is already running in this directory. Follow its log instead of starting another.\n' >&2; exit 1; }
printf 'Read-only comparison. No data will be changed. Private output: %s\n' "$katatib_check_dir"
katatib_checkpoint() {
  local katatib_project="$1" katatib_folder="$2"
  mkdir -p "$katatib_folder"
  local katatib_files=()
  mapfile -d '' katatib_files < <(find "$katatib_folder" -maxdepth 1 -type f -name 'hifdh-firestore-*.zip' -print0)
  if [[ ${#katatib_files[@]} -gt 1 ]]; then
    printf 'More than one completed backup in %s. Stopped rather than guessing.\n' "$katatib_folder" >&2
    return 1
  fi
  if [[ ${#katatib_files[@]} -eq 0 ]]; then
    command -v gcloud >/dev/null || { printf 'An export is needed. Run this in your signed-in Google Cloud Shell.\n' >&2; return 1; }
    printf 'Starting the missing %s export. Completed backups are kept.\n' "$katatib_project"
    python3 -u scripts/katatib-backup.py --project "$katatib_project" --output-dir "$katatib_folder"
    mapfile -d '' katatib_files < <(find "$katatib_folder" -maxdepth 1 -type f -name 'hifdh-firestore-*.zip' -print0)
  fi
  [[ ${#katatib_files[@]} -eq 1 ]] || { printf 'No completed backup was produced.\n' >&2; return 1; }
  python3 scripts/katatib-migration-audit.py --validate "${katatib_files[0]}" --project "$katatib_project"
  katatib_last_backup="${katatib_files[0]}"
}
katatib_checkpoint hifd-kouttab "$katatib_check_dir/source"
katatib_source_backup="$katatib_last_backup"
katatib_checkpoint katatib-64049 "$katatib_check_dir/target"
katatib_target_backup="$katatib_last_backup"
katatib_report="$katatib_check_dir/readiness.json"
if [[ -e "$katatib_report" ]]; then
  katatib_report="$katatib_check_dir/readiness-$(date -u +%Y%m%dT%H%M%S)-$$.json"
fi
katatib_audit_status=0
python3 scripts/katatib-migration-audit.py --source "$katatib_source_backup" \
  --target "$katatib_target_backup" --output "$katatib_report" || katatib_audit_status=$?
if [[ "$katatib_audit_status" -eq 0 || "$katatib_audit_status" -eq 2 ]]; then
  printf '\nCHECK FINISHED — private comparison report: %s\n' "$katatib_report"
  printf 'A matching clone is not approval to replace production. Auth, feature parity and rollback still need verification.\n'
else
  printf '\nCHECK STOPPED — no completed comparison report. Read the error above. Existing backups were not changed.\n' >&2
fi
exit "$katatib_audit_status"
