# Jaemulun: AWS Lightsail deployment

## Status and separation

This is a proposed deployment setup. It has NOT been activated on AWS.
The existing ScienceLoop service, code, database, and processes must remain untouched.

- GitHub repository: `anredvon/jamulun-master`; deploy source: `main`.
- App: Flask `app:app`, Gunicorn, Nginx.
- Dedicated Unix account: `jaemulun`.
- App root: `/srv/jaemulun`; releases: `/srv/jaemulun/releases/<sha>`.
- Persistent files: `/srv/jaemulun/shared`; secrets: `/etc/jaemulun.env`.
- Private Gunicorn port: `127.0.0.1:8002` (check port availability first).
- Auto-deploy: systemd timer checks GitHub `main` about every 2 minutes.
- GitHub Actions runs smoke tests on PRs and pushes; **no GitHub SSH secrets are needed**.
- Production release switch is followed by a database-backed HTTP check. Failure restores the prior release.

IMPORTANT: The repository is currently public. Do not commit any personal information,
credentials, payment keys, database snapshots, or real production environment files.

## 1. Check current AWS host (Ubuntu)

```bash
free -h
df -h
sudo ss -lntp | grep ':8002' || true
sudo systemctl --no-pager --type=service --state=running
```

Confirm port 8002 is not assigned. Record existing ScienceLoop status and back up its data
before any system package or Nginx configuration changes.

## 2. Create an isolated service account and directories (one time)

```bash
sudo apt-get update
sudo apt-get install -y git python3-venv python3-pip curl nginx util-linux
getent passwd jaemulun || sudo useradd --create-home --shell /bin/bash jaemulun
sudo install -d -o jaemulun -g jaemulun -m 0755 /srv/jaemulun
sudo install -d -o jaemulun -g jaemulun -m 0755 /srv/jaemulun/releases /srv/jaemulun/control
sudo install -d -o jaemulun -g jaemulun -m 0750 /srv/jaemulun/shared
```

Wait for the deployment PR to be merged and CI checks to pass, then clone:

```bash
sudo -u jaemulun git clone --depth 1 --branch main \
  https://github.com/anredvon/jamulun-master.git /srv/jaemulun/repo
sudo install -o jaemulun -g jaemulun -m 0755 \
  /srv/jaemulun/repo/scripts/poll_main.sh /srv/jaemulun/control/poll_main.sh
```

## 3. Production configuration and DB migration

Create a protected environment file:

```bash
sudo install -o root -g jaemulun -m 0640 /dev/null /etc/jaemulun.env
sudoedit /etc/jaemulun.env
```

Example content (replace the placeholder secret with a long random key):

```dotenv
SECRET_KEY=REPLACE_WITH_A_RANDOM_SECRET
DATABASE_URL=sqlite:////srv/jaemulun/shared/jaemulun.sqlite3
```

Use `python3 -c 'import secrets; print(secrets.token_hex(32))'` to generate the key.
Do not reuse ScienceLoop secrets or database files.

**Before activating:** identify the real PythonAnywhere database (SQLite or MySQL),
export and back it up, and verify that schema and data have been migrated.
A MySQL dump cannot simply be renamed to a SQLite file. Restore or seed only
once during the initial migration; never run `seed_db.py --reset` automatically.
Do not let GitHub deployments overwrite any production DB.

For a new empty database, stage a release, set the two environment variables from
`/etc/jaemulun.env` in a private shell, run `db.create_all()`, then
`python seed_db.py` once. For an existing database, restore its actual data instead.

For an existing restored **SQLite** database, take and verify a separate backup,
then add the nullable browser-ownership column before starting this release:

```bash
sudo -u jaemulun /srv/jaemulun/releases/<SHA>/.venv/bin/python \
  /srv/jaemulun/releases/<SHA>/scripts/migrate_session_ownership.py \
  --database /srv/jaemulun/shared/jaemulun.sqlite3
```

This command only supports an existing SQLite file with the `test_sessions`
table; it preserves rows and is safe to repeat. Do not run it against
PythonAnywhere or a MySQL database. For any non-SQLite database, stop and prepare
a separately reviewed schema migration before deploying this release.

## 4. Register the service, and limit restart permissions

```bash
sudo install -o root -g root -m 0644 \
  /srv/jaemulun/repo/deploy/systemd/jaemulun.service \
  /etc/systemd/system/jaemulun.service
sudo install -o root -g root -m 0644 \
  /srv/jaemulun/repo/deploy/systemd/jaemulun-poll.service \
  /etc/systemd/system/jaemulun-poll.service
sudo visudo -f /etc/sudoers.d/jaemulun-restart
```

Put this single line in the sudoers file:

```text
jaemulun ALL=(root) NOPASSWD: /usr/bin/systemctl restart jaemulun.service
```

The `jaemulun` account must not be able to restart ScienceLoop.
After editing, verify with `sudo visudo -cf /etc/sudoers.d/jaemulun-restart`.
Then run `sudo systemctl daemon-reload` and `sudo systemctl enable jaemulun.service`.

## 5. First-release initialization (only after DB is ready)

```bash
SHA=$(sudo -u jaemulun git -C /srv/jaemulun/repo rev-parse HEAD)
sudo -u jaemulun mkdir -p "/srv/jaemulun/releases/$SHA"
sudo -u jaemulun git -C /srv/jaemulun/repo archive "$SHA" | \
  sudo -u jaemulun tar -xf - -C "/srv/jaemulun/releases/$SHA"
```

This creates release code but does not touch DB contents. For a **brand-new** SQLite DB,
create a Python environment in this staged release and initialize it explicitly
(the following commands are NOT for an existing restored database):

```bash
sudo -iu jaemulun
set -a; source /etc/jaemulun.env; set +a
cd /srv/jaemulun/releases/<replace-with-the-SHA-from-above>
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -c "from app import app, db; app.app_context().push(); db.create_all()"
.venv/bin/python seed_db.py
exit
```

For any existing production DB, restore and validate it separately instead.
After confirming the DB migration is complete and the environment file is correct:

```bash
sudo -u jaemulun bash \
  "/srv/jaemulun/releases/$SHA/scripts/deploy_lightsail.sh" "$SHA"
sudo systemctl status jaemulun.service --no-pager
curl -fsS http://127.0.0.1:8002/healthz
```

If `/healthz` fails, check `sudo journalctl -u jaemulun.service -n 100 --no-pager`.
Do not enable automatic deployment until the initial deployment succeeds.

## 6. Enable automatic polling

Create `/etc/systemd/system/jaemulun-poll.timer` with this content:

```ini
[Unit]
Description=Check for Jaemulun GitHub updates

[Timer]
OnBootSec=2min
OnUnitInactiveSec=2min
AccuracySec=20s
Unit=jaemulun-poll.service

[Install]
WantedBy=timers.target
```

Then activate the poller *only after* the initial deployment and DB check passed:

```bash
sudo -u jaemulun touch /srv/jaemulun/ENABLE_AUTODEPLOY
sudo systemctl daemon-reload
sudo systemctl enable --now jaemulun-poll.timer
sudo systemctl start jaemulun-poll.service
sudo journalctl -u jaemulun-poll.service -n 50 --no-pager
```

Pause automatic releases at any time:

```bash
sudo systemctl stop jaemulun-poll.timer
```

A new main commit will then be picked up at the next poll. If an update fails,
its SHA is written under `/srv/jaemulun/failed/` to avoid repeatedly restarting
an unhealthy release. Investigate logs and correct the cause before removing that
marker and rerunning the poller. This is *polling*,
not an instantaneous push webhook. Configure a GitHub main branch protection
rule that requires the CI checks to pass before merging.

## 7. Public DNS, Nginx, and HTTPS

Use `deploy/nginx/jaemulun.conf.example` as an example only: set the
actual Jaemulun domain, enable it as a separate Nginx site, and check
`sudo nginx -t` before reloading Nginx.
Do not overwrite the ScienceLoop Nginx site.
Route requests to `127.0.0.1:8002`; only expose 80/443 externally.
After DNS resolves to Lightsail, configure HTTPS with Certbot or another
managed certificate solution.

The former `*.pythonanywhere.com` hostname is owned by PythonAnywhere and
cannot be repointed to Lightsail. Keep the old deployment online during cutover.

## 8. Launch criteria

- [ ] Repo PR merged; CI checks passed
- [ ] ScienceLoop unchanged; memory and storage checked
- [ ] AWS database migrated or initialized; independent backup tested
- [ ] Jaemulun systemd service is healthy on private port 8002
- [ ] Domain resolves, HTTPS works, and app flows were manually verified
- [ ] Poll timer enabled only after first deployment is stable
- [ ] GitHub main protection requires CI success
- [ ] Restore procedure and periodic database backups documented

## Known app security work before commercial release

Detailed reports are free to the browser that created the test. Private session
routes require the signed `jaemulun_session` cookie; public share links show only
the score summary and expire. `/api/stats` is disabled. The deployment probe uses
`/healthz`, which checks database reachability without returning usage metrics.
