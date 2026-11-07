---
name: "server-deploy"
description: "Deploy SimLive application artifacts to a server: persist/select an SSH target, ship cmd/{api,engines,planner} binaries and client/dist plus .env/partner.yaml from .config/prod/, archive the previous versions, verify services with auto-rollback, and support manual rollback. Server infrastructure (systemd units, docker-compose, nginx, rclone) is prepared manually on the host and never uploaded."
metadata:
  author: "simlive"
  source: ".config/, cmd/, client/"
---

# Server Deploy Skill

Deploys the SimLive application to a server that is already set up manually.
This skill ships code and runtime config only — it never installs or overwrites
server infrastructure.

## When to Use

- User asks to deploy, update, or roll back a server.
- User provides a server IP/host and SSH credentials.
- User wants to re-sync the application (binaries and/or client) to an existing server.

## What Is Deployed

| Component | Local source | Remote target | Archive / rollback pointer |
|-----------|--------------|---------------|----------------------------|
| `bin` | `config/bin/{api,planner,engines}` (built from `cmd/`) | `$PROJECT_PATH/bin/` | `archived/<TS>-bin`, `.rollback_bin` |
| `client` | `client/dist/` | `$PROJECT_PATH/client/dist/` | `archived/<TS>-client-dist`, `.rollback_client` |
| `env` | `.config/<env>/.env` (default `prod`) | `$PROJECT_PATH/.env` | `archived/<TS>-env`, `.rollback_env` |
| `partner` | `.config/<env>/partner.yaml` | `$PROJECT_PATH/partner.yaml` | `archived/<TS>-partner`, `.rollback_partner` |

Never uploaded (manual server-side setup): systemd units, `docker-compose.yml`,
deploy/restart/rollback scripts, nginx + SSL certs, `rclone.conf`, Go toolchain.

`cmd/partner` is **not** deployed; only `api`, `planner`, `engines`.

## Inputs

- `server_ip`: target server IP or hostname.
- `ssh_key`: path to SSH private key (default `~/.ssh/partner_vultr`).
- `ssh_user`: SSH user (default `root`).
- `project_path`: remote install path (default `/root/simlive-go`).
- `env_name`: `.config/<env>/` to deploy from (default `prod`).
- Persisted target file: `.config/deploy-targets.json` (created by this skill).

Scripts read `SSH_KEY`, `SSH_USER`, `PROJECT_PATH` from the environment.

## Persistence

Store targets in `.config/deploy-targets.json`:

```json
{
  "targets": [
    { "name": "prod", "ip": "1.2.3.4", "user": "root", "key": "~/.ssh/partner_vultr", "last_used": "2026-..." }
  ],
  "default": "prod"
}
```

On each run:
1. If `deploy-targets.json` exists and has targets, list them and ask the user: reuse an existing target or add a new one.
2. If new, prompt for IP, user, key; validate SSH connectivity (`ssh ... echo ok`).
3. Save/update the file, mark the chosen target as default, and update `last_used`.

## Flow

### Step 1 — Select target (GATE)

1. Read `.config/deploy-targets.json` if present.
2. Present existing targets; ask reuse vs new.
3. If no IP is provided and `vultr-cli` is available, run `vultr-cli instance list` and offer the instances (label, IP, region, status). Manual IP entry is always allowed.
4. Collect missing fields (IP, user, key); test SSH.
5. Persist. **GATE**: confirm target before proceeding.

### Step 2 — Preflight (read-only)

Check the server, but do not change it:

- `ls -d $PROJECT_PATH $PROJECT_PATH/bin $PROJECT_PATH/client/dist` → fresh vs existing install.
- `systemctl is-active simlive-api simlive-planner simlive-engines`.
- `systemctl cat simlive-api.service` → confirm `WorkingDirectory`, `ExecStart`, and `EnvironmentFile=$PROJECT_PATH/.env` point at `$PROJECT_PATH`.
- `docker compose ps` in `$PROJECT_PATH` (or `docker ps`) → postgres + redis running.
- `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/` → API reachable.
- Disk space (`df -h $PROJECT_PATH`) — binaries and archives add up.

If the install path or the three units are missing, **stop**: report that the host
needs the manual infrastructure setup first (packages, docker compose, systemd
units, nginx/SSL, rclone). Do not attempt to create them from this skill.

### Step 3 — Verify deploy config (GATE)

Confirm `.config/<env_name>/` has what the selected components need:

- `.env` — required when deploying `env`.
- `partner.yaml` — required when deploying `partner`.

If either is missing, **stop and ask the user to prepare it**; use
`.config/prod/{.env,partner.yaml}` as the reference shape. Do not invent values
and do not copy the repo-root `.env` implicitly. Deployment of `bin`/`client`
alone is still allowed.

### Step 4 — Combine server `.env` (GATE)

Applies only when `env` is selected.

1. Fetch the current server env: `ssh ... cat $PROJECT_PATH/.env`.
2. Build a merged proposal with `.config/<env_name>/.env` as the base:
   - Keys present in both: keep the `.config` value (call out any value changes in the diff).
   - Keys only on the server: keep them, appended under a `# server-only` marker.
   - Keys only in `.config`: add them.
3. Show a unified diff against the server `.env`.
4. **GATE**: user approves the final content. Write the approved file to the scratchpad directory (never to the repo root) and pass it to the deploy script with `--env-file`.

Never overwrite the server `.env` without this confirmation.

### Step 5 — Choose components (GATE)

Offer multi-select with defaults from what changed since the last deploy
(`git log`/server `LOG-CHANGES.md`):

- `bin` — api, planner, engines binaries.
- `client` — Vue admin bundle.
- `env` — server `.env` from Step 4.
- `partner` — `partner.yaml` from `.config/<env_name>/`.

Notes for `partner`: if the server file differs from `.config/<env_name>/partner.yaml`,
show the diff and ask whether to replace it; the upload is whole-file (no merge),
and the previous file is archived before upload.

**GATE**: user confirms the selection.

### Step 6 — Execute

Run from the repo root:

```bash
bash .agents/skills/server-deploy/scripts/deploy.sh <host> \
  --env-name prod \
  --only bin,client,env,partner \
  [--env-file <approved-merged-env>]
```

The script:
1. Builds the three binaries into `config/bin/` (`go build ./cmd/<svc>/`) and the client (`pnpm build` in `client/`).
2. Creates `$PROJECT_PATH/archived` and `LOG-CHANGES.md` if absent.
3. Archives the previous `bin`, `client/dist`, `.env`, `partner.yaml` as `<TS>-<component>` and pins the first archive of the session in `.rollback_<component>`.
4. Uploads: binaries flat into `bin/`, client as a tarball extracted to `client/dist/`, env and partner files directly.
5. Restarts `simlive-planner`, `simlive-engines`, `simlive-api` and polls for up to 15s for all units active plus an HTTP answer on `127.0.0.1:8080`.
6. On failure, restores the pinned archives, restarts, and re-checks; exits non-zero if still unhealthy.

Stream output and stop on first failure. Overrides:
`SSH_KEY=... SSH_USER=... PROJECT_PATH=... bash .agents/skills/server-deploy/scripts/deploy.sh ...`

### Step 7 — Verify

- Service status and HTTP probe from the deploy script output.
- `curl -s -o /dev/null -w '%{http_code}' http://<ip>:8080/` and `https://<host>/` when nginx is configured.
- `curl -s -o /dev/null -w '%{http_code}' http://<ip>:8080/live/<channel>/playlist.m3u8` if a channel exists.
- Report success/failure per component, and whether auto-rollback ran.

### Step 8 — Record

Append to `.config/DEPLOY.md`:
- Date, target (name/IP), action (update/rollback), components deployed, git commit (`git rev-parse --short HEAD`), Go version, verification result, notes.

The server keeps its own trail in `$PROJECT_PATH/LOG-CHANGES.md` (deploy, archive, auto-rollback, manual rollback entries) with `archived/` holding previous `bin`, `client/dist`, `.env`, and `partner.yaml`.

## Rollback (manual)

Triggered by the user or after an unhealthy deploy:

```bash
bash .agents/skills/server-deploy/scripts/rollback.sh <host> list
bash .agents/skills/server-deploy/scripts/rollback.sh <host> latest
bash .agents/skills/server-deploy/scripts/rollback.sh <host> <archive-name>
```

1. `list` shows archives (newest first) plus the `LOG-CHANGES.md` tail.
2. Ask which archive to restore, or use `latest`.
3. Archive names are `<TS>-bin`, `<TS>-client-dist`, `<TS>-env`, `<TS>-partner`; safety copies end in `-failed-<pid>` (auto-rollback) or `-pre-rollback` (manual).
4. The component is inferred from the name. The live copy is moved aside as `<TS>-<component>-pre-rollback` before restoring, so a manual rollback is itself reversible.
5. The script restarts services and re-runs the health check, then reports.

## Done Criteria

- SSH connectivity verified.
- Selected components deployed without errors; previous versions archived under `archived/`.
- All three services active and the API answers (auto-rollback if not).
- `.config/DEPLOY.md` updated and server `LOG-CHANGES.md` recorded.

## Notes

- Prefer reusing persisted targets; always confirm before overwriting.
- Never store private key contents; only paths.
- Never upload or edit systemd units, `docker-compose.yml`, nginx/SSL, or rclone config — those are manual server-side.
- Ask before destructive steps (overwriting `.env`/`partner.yaml`, deleting archives).
- `curl -s -o /dev/null` (connection-level) is deliberate: `GET /` serves the client bundle, so a 404 is not an API failure and `-f` must not be used.
- There is no `/health` endpoint; keep probes connection-level unless one is added.
- `config/bin/` is gitignored build staging; deleting it only forces a rebuild.
- `.config/deploy-targets.json` and `.config/DEPLOY.md` are local deployment state and should not be committed.
