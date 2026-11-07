---
name: server-deploy
description: "Config-driven deploy and rollback for an already-prepared server: survey a project once and persist its deployment shape to .specific/server-deploy.yaml, then build/upload selected components, archive previous versions, restart services, verify health with automatic rollback, and support manual rollback. Works for any stack because every project-specific detail comes from config, not this skill."
metadata:
  version: "2.0.0"
  source: ".specific/server-deploy.yaml"
---

# server-deploy

Deploys application artifacts to a server that is already prepared manually.
Everything project-specific — targets, components, build commands, services,
health checks — comes from `.specific/server-deploy.yaml`. This skill contains
no application names, paths, or commands.

The server owns its infrastructure: systemd units, compose files, nginx/SSL,
toolchains, and service users are never uploaded or edited here.

## When to use

- User asks to deploy, update, or roll back a server.
- User provides a server host and wants the app re-synced.
- A project has no `.specific/server-deploy.yaml` yet — run the first-deploy
  survey, then deploy.

## When NOT to use

- Provisioning a new host, installing packages, writing systemd units or
  compose files, or configuring nginx/SSL — do that on the host first.
- A project needing only local builds — no server involved.

## Files

| Path | Role |
|---|---|
| `.specific/server-deploy.yaml` | Per-project config. Created once by the survey; user-owned, never overwritten by this skill. |
| `.specific/deploy-history.md` | Local append-only deploy/rollback record (path configurable via `record.file`). |
| `references/server-deploy.template.yaml` | Full schema seed for the config. |
| `scripts/survey.py` | Read-only repo/host scan; proposes a config. |
| `scripts/deploy.py` | Build, archive, upload, restart, health-check, auto-rollback. |
| `scripts/rollback.py` | List archives, restore `latest` or a named archive. |

Resolve this skill's directory and use absolute script paths, e.g.
`python3 "$SKILL_DIR/scripts/deploy.py"`.

## Config contract — `.specific/server-deploy.yaml`

Schema and defaults: `references/server-deploy.template.yaml`. Summary:

```yaml
target: prod
targets:
  - { name: prod, host: 1.2.3.4, user: root, port: 22,
      key: ~/.ssh/id_ed25519, project_path: /srv/app }
build:
  steps: []                 # optional pre-build commands, run from the repo root
push:
  steps: []                 # optional push commands (registry, npm, custom)
rollout:
  steps: []                 # optional remote rollout commands (ssh pull/up, etc.)
components:
  - name: bin
    build: go build -o build/bin/api ./cmd/api
    local: build/bin        # repo-relative source (file or dir)
    remote: bin             # relative to project_path
    type: dir               # dir | file (inferred from local when omitted)
    transport: scp          # scp | tar (dirs only)
  - name: env
    local: .config/prod/.env
    remote: .env
    type: file
    merge: env              # agent-side merge gate
remote: { archive_dir: archived, log_file: LOG-CHANGES.md }
services:
  manager: systemd          # systemd | compose | none
  units: [app-api]
  restart: true
healthcheck:
  timeout_seconds: 15
  checks:
    - { type: systemd, units: [app-api] }
    - { type: http, url: "http://127.0.0.1:8080/", accept_status: [200, 404] }
    # - { type: command, run: "systemctl is-active --quiet app-worker" }
record:
  file: .specific/deploy-history.md
```

Rules:

- Environment overrides win over the file: `DEPLOY_TARGET`, `DEPLOY_HOST`,
  `DEPLOY_USER`, `DEPLOY_PORT`, `DEPLOY_KEY`, `DEPLOY_PROJECT_PATH`.
- `key` is a path only; never store private key contents or secret values.
- `components[].merge: env` and `components[].compare: true` are agent-side
  gates (Steps 4–5); the scripts treat them like normal uploads.
- `components` may be empty for container/build-only workflows where
  `build.steps` (possibly per-target) handle the full deploy (build, push,
  remote pull/up). Empty components skip upload/archive.
- `build.steps[].run` supports a `{target}` placeholder substituted with the
  selected target name (e.g. `podman build -t app:{target}-latest .`).
- Targets may carry their own `build.steps` (under the target entry) to
  override the global ones; useful for per-environment image tags/hosts.
- `services.manager: compose` supports `runtime: docker|podman` (default
  docker) and `pull: true` to run `compose pull` before `up -d`.
- An empty `healthcheck.checks` means "deployed, health unknown" — not healthy.
  Add at least one check for real auto-rollback.

## First deploy — survey and capture (GATE)

Run this only when `.specific/server-deploy.yaml` is missing. If it exists,
skip to the deploy flow and preserve it.

### Step 0 — Preconditions

Confirm the host is already prepared for this app (install path exists, service
manager files installed, runtime dependencies present). This skill does not
create them. If the host is bare, stop and tell the user what is missing.

### Step 1 — Collect target facts (GATE)

Ask for, or read from context:

- host / IP, SSH user, SSH key path, SSH port
- remote `project_path`
- target name (default `prod`)

When `vultr-cli` (or another provider CLI) is available and the user has no
host, offering instances is optional; manual entry is always allowed. Validate
before continuing:

```bash
ssh -i "$KEY" -p "$PORT" "$USER@$HOST" 'echo ok'
```

**GATE**: show the collected target and get confirmation.

### Step 2 — Survey (read-only)

```bash
python3 "$SKILL_DIR/scripts/survey.py" \
  --host "$HOST" --user "$USER" --key "$KEY" --port "$PORT" \
  --project-path "$PROJECT_PATH" --name "$TARGET_NAME"
```

It scans the repo (manifests, `cmd/*`, package scripts, dist dirs, compose,
unit files, env candidates) and the host (project listing, units referencing
`project_path`, running services, containers, disk). It prints evidence and a
proposed YAML. `--json` gives the same evidence machine-readable.

### Step 3 — Review and refine (GATE)

Show the evidence and proposal to the user. Correct the proposal from evidence,
never from guesses:

- Components: keep only what actually ships. Set `local`, `remote`, `type`,
  `transport`, and a `build` command that works from the repo root.
- Services: `systemd` units that actually run the app, or `compose` with the
  real compose file; `none` if the app is not service-managed.
- Health: at least one check that proves the deploy works (unit active, HTTP
  status, or a command). Prefer checks that do not require secrets.
- Env files: confirm which local env file is authoritative and that
  `remote: .env` matches the service's `EnvironmentFile`/config path.

**GATE**: the user approves the final config.

### Step 4 — Write the config

Only when the file does not exist:

```bash
python3 "$SKILL_DIR/scripts/survey.py" ... --apply
```

`--apply` refuses to overwrite. If the user wants changes after a draft exists,
edit `.specific/server-deploy.yaml` directly (agent `write_file`/`edit_file`).
Then continue with the deploy flow.

## Deploy flow

### Step 1 — Select target (GATE)

Read `.specific/server-deploy.yaml`, pick `--target` (or the default). Apply
environment overrides if the user gave them. If the target is new but the config
already exists, add an entry under `targets` with the user (edit the file);
never re-run the survey to overwrite the config. If the config itself is
missing, go to the first-deploy survey instead of inventing config.

**GATE**: confirm target before proceeding.

### Step 2 — Preflight (read-only)

Check, without changing anything:

- `ls -la "$PROJECT_PATH"` — fresh vs existing install, expected component dirs.
- Service manager state: `systemctl is-active <units>` or `docker compose ps`.
- Unit/config pointers match `project_path` when using systemd
  (`systemctl cat <unit>` → `WorkingDirectory`, `ExecStart`, `EnvironmentFile`).
- `df -h "$PROJECT_PATH"` — builds and archives add up.
- Env **keys only** (`sed -n 's/=.*//p' "$PROJECT_PATH/.env"`), never values.

If `project_path` or the expected service manager files are missing, **stop**:
the host needs manual infrastructure setup first.

### Step 3 — Verify local sources (GATE)

For each selected component, confirm `local` exists or its `build` produces it.
A missing source or a failing build must stop the deploy before the server is
touched. Run `deploy.py --dry-run` to show the exact plan.

**GATE**: user confirms components and build commands.

### Step 4 — Merge env (only for `merge: env`) (GATE)

1. Fetch the remote file: `ssh ... cat "$PROJECT_PATH/.env"`.
2. Merge with the local component source as the base:
   - keys in both: local value wins; call out changes,
   - keys only remote: keep them under a `# server-only` marker,
   - keys only local: add them.
3. Show a unified diff against the remote file.
4. **GATE**: user approves. Write the merged file to the scratchpad directory —
   never to the repo root or `.specific/` — and pass it via
   `--source <component>=<path>`.

Never overwrite a remote env file without this confirmation.

### Step 5 — Compare file components (`compare: true`) (GATE)

For each component flagged `compare: true`, diff the local source against the
remote file, show it, and ask whether to replace. Whole-file replacement only;
the previous version is archived first by the script.

### Step 6 — Choose components (GATE)

Offer multi-select. Default to components whose local sources changed since the
commit recorded in `.specific/deploy-history.md` (`git diff --name-only
<last-commit>..HEAD`), plus anything the user names. **GATE**: confirm.

### Step 7 — Execute

```bash
python3 "$SKILL_DIR/scripts/deploy.py" \
  --target prod \
  --component bin,client \
  [--source env=/path/to/approved-merged.env] \
  [--no-build] --yes
```

The script:

1. Runs `build.steps` and each selected component's `build` from the repo root.
2. Creates `$PROJECT_PATH/<archive_dir>` and the remote log if absent.
3. Archives the previous version of each component as
   `<timestamp>-<component>`, pinning the first archive of the session in
   `.rollback_<component>`.
4. Uploads each component: files directly; dirs by `scp -r` or by tarball with
   atomic extract (`transport: tar`).
5. Restarts the configured services.
6. Polls health up to `healthcheck.timeout_seconds`.
7. On failure, restores every pinned archive, restarts, and re-checks; exits
   non-zero if still unhealthy.

Stream output and stop on the first error. Use `--yes` in non-interactive
shells; the script refuses otherwise.

### Step 8 — Verify

- Service status and HTTP probes from `deploy.py` output.
- External check when applicable: `curl -s -o /dev/null -w '%{http_code}' <url>`
  and compare against `accept_status`.
- Report success/failure per component and whether auto-rollback ran.

### Step 9 — Record

`deploy.py` appends to `record.file` (default `.specific/deploy-history.md`):
timestamp, target, components, commit, and health result. Mention the entry.
The server keeps its own trail in `remote.log_file`.

## Rollback

```bash
python3 "$SKILL_DIR/scripts/rollback.py" list
python3 "$SKILL_DIR/scripts/rollback.py" latest --yes
python3 "$SKILL_DIR/scripts/rollback.py" <archive-name>
```

1. `list` shows archives newest-first, each mapped to a configured component,
   plus the remote log tail. Unmapped archives are reported, never guessed.
2. `latest` picks the newest archive.
3. The live copy is moved aside as `<timestamp>-<component>-pre-rollback`
   before restoring, so a rollback is itself reversible.
4. The script restarts services, re-checks health, and records the result.

## Done criteria

- Target validated and reachable over SSH.
- Config exists at `.specific/server-deploy.yaml` (created by the survey on the
  first run, reused unchanged afterwards).
- Selected components built and uploaded; previous versions archived.
- Services restarted; every configured health check passes (auto-rollback if
  not).
- `record.file` says what happened; unknown health is reported as unknown.

## Failure modes

| Failure | Behavior |
|---|---|
| Config missing | Run the first-deploy survey; do not invent a config |
| PyYAML missing | Abort with `python3 -m pip install pyyaml` |
| Config unparseable / no targets or components | Abort before any SSH or build |
| Unknown `--target` / `--component` | Abort, list configured names |
| SSH fails | Abort before build; check host, user, key, port |
| `project_path` or service files missing | Stop; host infrastructure is not prepared |
| Local source missing after build | Abort before upload |
| Build command fails | Abort before touching the server |
| Health checks empty | Deploy proceeds; health reported unknown, no auto-rollback |
| Unhealthy after restart | Restore pinned archives, restart, re-check |
| Rollback archive unmappable | Abort; ask the user, do not guess |
| Non-interactive without `--yes` | Abort |

## Safety rules

- Never upload or edit infrastructure (units, compose, nginx/SSL, toolchains).
- Never overwrite an existing `.specific/server-deploy.yaml`.
- Never store secrets, keys, or token values in the config — paths only.
- Always archive before replacing; always gate env/file replacement.
- Ask before destructive steps (overwriting env files, deleting archives).
- Keep deploy state (`.specific/deploy-history.md`) out of the app's source
  changes; it is local operational history.

## References

- `references/server-deploy.template.yaml` — full config schema and defaults.
- `scripts/survey.py` — read-only discovery and proposal (`--json`, `--apply`).
- `scripts/deploy.py` — build/upload/restart/health with auto-rollback.
- `scripts/rollback.py` — archive listing and restore.
- `scripts/deploy_lib.py` — shared config, SSH, archive, and health helpers.
