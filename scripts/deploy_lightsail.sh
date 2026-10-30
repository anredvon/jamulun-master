#!/usr/bin/env bash
# Jaemulun-only release activation on the Lightsail host.
# Usage: bash scripts/deploy_lightsail.sh <40-character-commit-sha>
set -Eeuo pipefail

SHA="${1:-}"
ROOT="/srv/jaemulun"
SERVICE="jaemulun.service"
if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid commit SHA" >&2
  exit 2
fi

RELEASE="$ROOT/releases/$SHA"
if [[ ! -f "$RELEASE/app.py" || ! -f "$RELEASE/requirements.txt" ]]; then
  echo "Incomplete Jaemulun release" >&2
  exit 2
fi
if [[ ! -f /etc/jaemulun.env ]]; then
  echo "Missing server-side environment file" >&2
  exit 2
fi

python3 -m venv "$RELEASE/.venv"
"$RELEASE/.venv/bin/python" -m pip install --disable-pip-version-check -r "$RELEASE/requirements.txt"

# Smoke-check the Python import without accessing the production database.
(
  cd "$RELEASE"
  SECRET_KEY=jaemulun-deploy-smoke-secret-0123456789abcdef DATABASE_URL=sqlite:///:memory: \
    "$RELEASE/.venv/bin/python" -c 'from app import app; assert app.url_map'
)

PREVIOUS=""
if [[ -L "$ROOT/current" ]]; then
  PREVIOUS="$(readlink "$ROOT/current")"
fi

restore_previous() {
  if [[ -n "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "$ROOT/current.rollback"
    mv -Tf "$ROOT/current.rollback" "$ROOT/current"
    sudo -n /usr/bin/systemctl restart "$SERVICE" || true
    echo "Previous Jaemulun release restored" >&2
  else
    echo "No previous release exists to restore" >&2
  fi
}

ln -sfn "releases/$SHA" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"

if ! sudo -n /usr/bin/systemctl restart "$SERVICE"; then
  restore_previous
  exit 1
fi

for attempt in $(seq 1 10); do
  if curl --fail --silent --show-error --max-time 3 http://127.0.0.1:8002/healthz >/dev/null 2>&1; then
    echo "Jaemulun deployed and health checked: $SHA"
    exit 0
  fi
  sleep 2
done

echo "Health check failed on private port 8002" >&2
restore_previous
exit 1
