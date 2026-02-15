#!/usr/bin/env bash
set -euo pipefail

# Deploy React/Vite build to the S3 bucket created by Terraform.
# Default behavior is same-origin API routing through CloudFront (/api/*).

# ---- PATHS / CONFIG ----
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Path to the Terraform app folder (where `terraform output` works)
TF_DIR="${TF_DIR:-$REPO_ROOT/infrastructure/app}"

# Frontend app directory (Vite project root)
FRONTEND_DIR="${FRONTEND_DIR:-$SCRIPT_DIR/student-study-app}"

# Frontend build output directory (Vite default)
DIST_DIR="${DIST_DIR:-$FRONTEND_DIR/dist}"

# Set to 1 if you want the script to write/update .env.production automatically
WRITE_ENV_PROD="${WRITE_ENV_PROD:-0}"

# If WRITE_ENV_PROD=1, this file will be written/overwritten.
# Must live in the Vite project root to be picked up by build.
ENV_PROD_FILE="${ENV_PROD_FILE:-$FRONTEND_DIR/.env.production}"

# Optional explicit API base URL. Leave empty to use same-origin /api/*.
API_BASE_URL="${API_BASE_URL:-}"

# Invalidate CloudFront after upload to avoid stale index/assets.
INVALIDATE_CLOUDFRONT="${INVALIDATE_CLOUDFRONT:-1}"
WAIT_FOR_INVALIDATION="${WAIT_FOR_INVALIDATION:-0}"

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
[ -d "$FRONTEND_DIR" ] || die "FRONTEND_DIR not found: $FRONTEND_DIR"

# ---- READ TERRAFORM OUTPUTS ----
pushd "$TF_DIR" >/dev/null

# These must exist in your Terraform outputs:
# - frontend_bucket
# - api_public_ip
S3_BUCKET="$(terraform output -raw frontend_bucket 2>/dev/null || true)"
API_IP="$(terraform output -raw api_public_ip 2>/dev/null || true)"
WEBSITE_URL="$(terraform output -raw frontend_website_url 2>/dev/null || true)"
CLOUDFRONT_DIST_ID="$(terraform output -raw cloudfront_distribution_id 2>/dev/null || true)"
CLOUDFRONT_DOMAIN="$(terraform output -raw cloudfront_domain_name 2>/dev/null || true)"

popd >/dev/null

[ -n "$S3_BUCKET" ] || die "Could not read terraform output 'frontend_bucket' from $TF_DIR"
[ -n "$API_IP" ] || die "Could not read terraform output 'api_public_ip' from $TF_DIR"

echo "Terraform outputs:"
echo "  S3 bucket:      $S3_BUCKET"
echo "  API public IP:  $API_IP"
if [ -n "$WEBSITE_URL" ]; then
  echo "  Website URL:    $WEBSITE_URL"
fi
if [ -n "$CLOUDFRONT_DOMAIN" ]; then
  echo "  CloudFront:     https://$CLOUDFRONT_DOMAIN"
fi
echo

# ---- OPTIONALLY WRITE .env.production ----
if [ "$WRITE_ENV_PROD" = "1" ]; then
  if [ -n "$API_BASE_URL" ]; then
    echo "Writing $ENV_PROD_FILE with explicit VITE_API_BASE_URL=$API_BASE_URL"
    cat > "$ENV_PROD_FILE" <<EOF
VITE_API_BASE_URL=$API_BASE_URL
EOF
  else
    echo "Writing $ENV_PROD_FILE for same-origin API (/api/* via CloudFront)"
    cat > "$ENV_PROD_FILE" <<EOF
# Leave VITE_API_BASE_URL empty to use same-origin API paths
VITE_API_BASE_URL=
EOF
  fi
  echo
fi

# ---- BUILD FRONTEND ----
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  die "package.json not found in $FRONTEND_DIR"
fi

echo "Building frontend in $FRONTEND_DIR..."
pushd "$FRONTEND_DIR" >/dev/null
npm install
npm run build
popd >/dev/null

[ -d "$DIST_DIR" ] || die "Build output directory not found: $DIST_DIR"

# ---- DEPLOY TO S3 ----
echo "Uploading static assets -> s3://$S3_BUCKET/assets/ ..."
if [ -d "$DIST_DIR/assets" ]; then
  aws s3 sync "$DIST_DIR/assets/" "s3://$S3_BUCKET/assets/" \
    --delete \
    --cache-control "public,max-age=31536000,immutable"
fi

echo "Uploading app files -> s3://$S3_BUCKET/ ..."
aws s3 sync "$DIST_DIR/" "s3://$S3_BUCKET/" \
  --delete \
  --exclude "assets/*" \
  --exclude "index.html"

if [ -f "$DIST_DIR/index.html" ]; then
  echo "Uploading index.html with no-cache headers..."
  aws s3 cp "$DIST_DIR/index.html" "s3://$S3_BUCKET/index.html" \
    --cache-control "no-cache,no-store,must-revalidate"
fi

# ---- CLOUDFRONT INVALIDATION ----
if [ "$INVALIDATE_CLOUDFRONT" = "1" ]; then
  if [ -n "$CLOUDFRONT_DIST_ID" ]; then
    echo "Creating CloudFront invalidation on $CLOUDFRONT_DIST_ID ..."
    INVALIDATION_ID="$(aws cloudfront create-invalidation \
      --distribution-id "$CLOUDFRONT_DIST_ID" \
      --paths "/*" \
      --query "Invalidation.Id" \
      --output text)"
    echo "Invalidation ID: $INVALIDATION_ID"
    if [ "$WAIT_FOR_INVALIDATION" = "1" ]; then
      echo "Waiting for invalidation to complete..."
      aws cloudfront wait invalidation-completed \
        --distribution-id "$CLOUDFRONT_DIST_ID" \
        --id "$INVALIDATION_ID"
      echo "Invalidation completed."
    fi
  else
    echo "Skipping invalidation: terraform output 'cloudfront_distribution_id' not available."
  fi
fi

LATEST_JS="$(ls "$DIST_DIR"/assets/index-*.js 2>/dev/null | xargs -I{} basename {} | head -n1 || true)"

echo
echo "Done."
echo "Frontend deployed to: ${WEBSITE_URL:-"(run 'terraform output -raw frontend_website_url' in $TF_DIR)"}"
echo "Backend EC2 URL:      http://$API_IP:8000"
if [ -n "$LATEST_JS" ]; then
  echo "Built bundle:         $LATEST_JS"
fi
