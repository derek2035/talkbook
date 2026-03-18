#!/usr/bin/env bash
set -euo pipefail

REMOTE_NAME="${1:-origin}"
BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD)"

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  echo "[auto-push] remote '$REMOTE_NAME' is not configured, skipping push."
  exit 0
fi

REMOTE_URL="$(git remote get-url "$REMOTE_NAME")"
echo "[auto-push] pushing ${BRANCH_NAME} to ${REMOTE_NAME} (${REMOTE_URL})"

if git push "$REMOTE_NAME" "$BRANCH_NAME"; then
  echo "[auto-push] push succeeded."
else
  echo "[auto-push] push failed. Check network/proxy/auth and retry manually." >&2
  exit 1
fi
