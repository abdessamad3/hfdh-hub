#!/usr/bin/env bash
# One-time setup: let GitHub Actions deploy this repo to Firebase without a
# key file (Workload Identity Federation). Run it in Google Cloud Shell
# (https://shell.cloud.google.com) as an owner of the Firebase project.
# Safe to run more than once.
set -euo pipefail

PROJECT_ID="hifd-kouttab"
REPO="abdessamad3/hfdh-hub"
SA_NAME="github-deploy"
POOL="github"
PROVIDER="github"
# Project number the workflow (.github/workflows/deploy.yml) expects.
EXPECTED_PROJECT_NUMBER="141386006809"

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
echo "Project: $PROJECT_ID ($PROJECT_NUMBER)"

echo "Enabling required APIs..."
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com \
  firebase.googleapis.com \
  firebasehosting.googleapis.com \
  firebaserules.googleapis.com \
  firestore.googleapis.com

echo "Creating service account $SA_EMAIL..."
if ! gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="GitHub Actions deploy (${REPO})"
fi

echo "Granting deploy roles..."
for role in \
  roles/firebasehosting.admin \
  roles/firebaserules.admin \
  roles/serviceusage.apiKeysViewer \
  roles/serviceusage.serviceUsageConsumer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${SA_EMAIL}" --role="$role" \
    --condition=None --quiet >/dev/null
  echo "  $role"
done

echo "Creating workload identity pool and GitHub provider..."
if ! gcloud iam workload-identity-pools describe "$POOL" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL" \
    --location=global --display-name="GitHub Actions"
fi
# Only tokens from this repository, running on main, are accepted.
CONDITION="assertion.repository == '${REPO}' && assertion.ref == 'refs/heads/main'"
if ! gcloud iam workload-identity-pools providers describe "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" \
    --display-name="GitHub" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="$CONDITION"
else
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER" \
    --location=global --workload-identity-pool="$POOL" \
    --attribute-condition="$CONDITION" >/dev/null
fi

echo "Allowing $REPO to act as $SA_EMAIL..."
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}" \
  --quiet >/dev/null

echo
echo "Done. Workload identity provider:"
echo "  projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"
if [ "$PROJECT_NUMBER" != "$EXPECTED_PROJECT_NUMBER" ]; then
  echo
  echo "WARNING: project number is $PROJECT_NUMBER, but the workflow expects"
  echo "$EXPECTED_PROJECT_NUMBER. Send this message to whoever maintains the workflow."
fi
