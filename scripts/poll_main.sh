#!/usr/bin/env bash
# Runs on AWS as the dedicated jaemulun account.
# Pull-only deployment: no GitHub or AWS credentials are stored in the repository.
set -Eeuo pipefail
ROOT=/srv/jaemulun
REPO="$ROOT/repo"
REMOTE=https://github.com/anredvon/jamulun-master.git

if [[ ! -f "$ROOT/ENABLE_AUTODEPLOY" ]]; then
  echo "Jaemulun automatic deployment is not enabled yet."
  exit 0
fi

if [[ ! -d "$REPO/.git" ]]; then
  echo "Missing local Git clone at $REPO" >&2
  exit 1
fi

git -C "$REPO" fetch --quiet --no-tags --depth=1 origin main
SHA="$(git -C "$REPO" rev-parse FETCH_HEAD)"
if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Unexpected Git revision" >&2
  exit 1
fi

ACTIVE=""
if [[ -L "$ROOT/current" ]]; then
  ACTIVE="$(readlink "$ROOT/current")"
fi
if [[ "$ACTIVE" == "releases/$SHA" ]]; then
  echo "Already running $SHA"
  exit 0
fi

FAILED="$ROOT/failed/$SHA"
if [[ -f "$FAILED" ]]; then
  echo "Skipping previously failed release $SHA. Clear the marker manually after fixing it."
  exit 0
fi

RELEASE="$ROOT/releases/$SHA"
mkdir -p "$RELEASE"
if [[ ! -f "$RELEASE/.release-ready" ]]; then
  git -C "$REPO" archive "$SHA" | tar -xf - -C "$RELEASE"
  touch "$RELEASE/.release-ready"
fi

if ! bash "$RELEASE/scripts/deploy_lightsail.sh" "$SHA"; then
  mkdir -p "$ROOT/failed"
  touch "$FAILED"
  echo "Marked failed Jaemulun release $SHA" >&2
  exit 1
fi
