#!/usr/bin/env bash
set -euo pipefail

# Deploy React/Vite build to the S3 bucket created by Terraform.
# Also prints the EC2 API IP you should use for VITE_API_BASE_URL.

# ---- CONFIG ----
# Path to the Terraform app folder (where `terraform output` works)
TF_DIR="${TF_DIR:-../infrastructure/app}"

# Frontend build output directory (Vite default)
DIST_DIR="${DIST_DIR:-dist}"

# Set to 1 if you want the script to write/update .env.production automatically
WRITE_ENV_PROD="${WRITE_ENV_PROD:-0}"

# If WRITE_ENV_PROD=1, this file will be written/overwritten
ENV_PROD_FILE="${ENV_PROD_FILE:-.env.production}"

# ---- HELPERS ----
die() { echo "ERROR: $*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "Missing command: $1"
}

# ---- CHECKS ----
need terraform
need aws
need npm

[ -d "$TF_DIR" ] || die "TF_DIR not found: $TF_DIR"

# ---- READ TERRAFORM OUTPUTS ----
pushd "$TF_DIR" >/dev/null

# These must exist in your Terraform outputs:
# - frontend_bucket
# - api_public_ip
S3_BUCKET="$(terraform output -raw frontend_bucket 2>/dev/null || true)"
API_IP="$(terraform output -raw api_public_ip 2>/dev/null || true)"
WEBSITE_URL="$(terraform output -raw frontend_website_url 2>/dev/null || true)"

popd >/dev/null

[ -n "$S3_BUCKET" ] || die "Could not read terraform output 'frontend_bucket' from $TF_DIR"
[ -n "$API_IP" ] || die "Could not read terraform output 'api_public_ip' from $TF_DIR"

echo "Terraform outputs:"
echo "  S3 bucket:      $S3_BUCKET"
echo "  API public IP:  $API_IP"
if [ -n "$WEBSITE_URL" ]; then
  echo "  Website URL:    $WEBSITE_URL"
fi
echo

# ---- OPTIONALLY WRITE .env.production ----
if [ "$WRITE_ENV_PROD" = "1" ]; then
  echo "Writing $ENV_PROD_FILE with VITE_API_BASE_URL=http://$API_IP"
  cat > "$ENV_PROD_FILE" <<EOF
VITE_API_BASE_URL=http://$API_IP
EOF
  echo
fi

# ---- BUILD FRONTEND ----
FRONTEND_DIR="student-study-app"
DIST_DIR="$FRONTEND_DIR/dist"

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "ERROR: package.json not found in $FRONTEND_DIR"
  exit 1
fi

cd "$FRONTEND_DIR"

echo "Building frontend in $FRONTEND_DIR..."
npm install
npm run build

cd - > /dev/null

# ---- DEPLOY TO S3 ----
echo "Uploading $DIST_DIR -> s3://$S3_BUCKET/ ..."
aws s3 sync "$DIST_DIR/" "s3://$S3_BUCKET/" --delete

echo
echo "Done."
echo "Frontend deployed to: ${WEBSITE_URL:-"(run 'terraform output -raw frontend_website_url' in $TF_DIR)"}"
echo "Backend base URL:     http://$API_IP"