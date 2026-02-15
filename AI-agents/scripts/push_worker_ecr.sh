#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${AGENTS_DIR}/.." && pwd)"

PROJECT_NAME="${PROJECT_NAME:-studybuddy}"
REPOSITORY_NAME="${REPOSITORY_NAME:-${PROJECT_NAME}/worker}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"
IMAGE_TAG="${IMAGE_TAG:-}"
PUSH_LATEST="${PUSH_LATEST:-1}"
TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"

usage() {
  cat <<'EOF'
Build and push the AI agents image to worker ECR.

Environment variables:
  AWS_REGION      AWS region (required if not set in AWS CLI profile)
  PROJECT_NAME    ECR project prefix (default: studybuddy)
  REPOSITORY_NAME Full ECR repo path (default: <PROJECT_NAME>/worker)
  IMAGE_TAG       Image tag (default: current git short SHA)
  PUSH_LATEST     1 to also push :latest, 0 to skip (default: 1)
  TARGET_PLATFORM OCI platform target (default: linux/amd64)

Example:
  AWS_REGION=us-east-1 ./scripts/push_worker_ecr.sh
  AWS_REGION=us-east-1 IMAGE_TAG=v1.0.3 PUSH_LATEST=0 ./scripts/push_worker_ecr.sh
  AWS_REGION=us-east-1 TARGET_PLATFORM=linux/amd64 ./scripts/push_worker_ecr.sh
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

docker_daemon_ready() {
  docker info >/dev/null 2>&1
}

docker_buildx_available() {
  docker buildx version >/dev/null 2>&1
}

need aws
need docker
need git

if ! docker_daemon_ready; then
  echo "Docker daemon is not reachable." >&2
  echo "Start Docker Desktop (or your Docker daemon) and re-run this script." >&2
  exit 1
fi

if docker_buildx_available; then
  BUILD_ENGINE="buildkit"
else
  BUILD_ENGINE="legacy"
  export DOCKER_BUILDKIT=0
fi

if [[ -z "${AWS_REGION}" ]]; then
  AWS_REGION="$(aws configure get region 2>/dev/null || true)"
fi
if [[ -z "${AWS_REGION}" ]]; then
  echo "AWS_REGION is not set and no default region is configured." >&2
  exit 1
fi

if [[ -z "${IMAGE_TAG}" ]]; then
  IMAGE_TAG="$(git -C "${ROOT_DIR}" rev-parse --short HEAD)"
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
REMOTE_IMAGE="${ECR_REGISTRY}/${REPOSITORY_NAME}:${IMAGE_TAG}"
REMOTE_LATEST_IMAGE="${ECR_REGISTRY}/${REPOSITORY_NAME}:latest"
LOCAL_IMAGE="studyforge-worker:${IMAGE_TAG}"

echo "Using:"
echo "  AWS region:      ${AWS_REGION}"
echo "  ECR repository:  ${REPOSITORY_NAME}"
echo "  Image tag:       ${IMAGE_TAG}"
echo "  Build engine:    ${BUILD_ENGINE}"
echo "  Platform:        ${TARGET_PLATFORM}"
echo

echo "Ensuring ECR repository exists..."
if ! aws ecr describe-repositories --repository-names "${REPOSITORY_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1; then
  aws ecr create-repository \
    --repository-name "${REPOSITORY_NAME}" \
    --image-tag-mutability MUTABLE \
    --image-scanning-configuration scanOnPush=true \
    --region "${AWS_REGION}" >/dev/null
fi

echo "Logging in to ECR..."
aws ecr get-login-password --region "${AWS_REGION}" \
  | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

echo "Building container image..."
if [[ "${BUILD_ENGINE}" == "buildkit" ]]; then
  BUILD_TAG_ARGS=(-t "${REMOTE_IMAGE}")
  if [[ "${PUSH_LATEST}" == "1" ]]; then
    BUILD_TAG_ARGS+=(-t "${REMOTE_LATEST_IMAGE}")
  fi

  if ! docker buildx build \
    --platform "${TARGET_PLATFORM}" \
    -f "${AGENTS_DIR}/Dockerfile" \
    "${BUILD_TAG_ARGS[@]}" \
    --push \
    "${AGENTS_DIR}"; then
    echo "Docker buildx build failed." >&2
    exit 1
  fi
else
  if [[ "${TARGET_PLATFORM}" != "local" ]]; then
    echo "Buildx is unavailable. Cross-platform build to ${TARGET_PLATFORM} is not supported with legacy builder." >&2
    echo "Install Docker buildx or run this from a host matching the deployment architecture." >&2
    exit 1
  fi

  if ! docker build -f "${AGENTS_DIR}/Dockerfile" -t "${LOCAL_IMAGE}" "${AGENTS_DIR}"; then
    echo "Docker build failed." >&2
    echo "Tip: verify Docker daemon health and Dockerfile context under ${AGENTS_DIR}." >&2
    exit 1
  fi

  echo "Tagging image for ECR..."
  docker tag "${LOCAL_IMAGE}" "${REMOTE_IMAGE}"

  echo "Pushing ${REMOTE_IMAGE}..."
  docker push "${REMOTE_IMAGE}"

  if [[ "${PUSH_LATEST}" == "1" ]]; then
    docker tag "${LOCAL_IMAGE}" "${REMOTE_LATEST_IMAGE}"
    echo "Pushing ${REMOTE_LATEST_IMAGE}..."
    docker push "${REMOTE_LATEST_IMAGE}"
  fi
fi

echo
echo "Done."
echo "Pushed: ${REMOTE_IMAGE}"
if [[ "${PUSH_LATEST}" == "1" ]]; then
  echo "Pushed: ${REMOTE_LATEST_IMAGE}"
fi
