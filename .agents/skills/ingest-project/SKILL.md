---
name: ingest-project
description: Generate or refresh a target project's PROJECTS.md and .specific/project.yaml (architecture + runnable verification skills) from a read-only scan of its code, merged with per-project overrides. Use when init-flow reaches its "Setup concept project" step, or when the user asks to ingest, onboard, initialize, or re-summarize an existing codebase.
argument-hint: "<target_project>"
metadata:
  version: "2.1.0"
---

# ingest-project

Reads an existing project (never modifies its source), derives the facts a coding agent needs, merges project-specific overrides, and writes `PROJECTS.md` at the target project root. `template/AGENTS.md` loads that file, so this is what gives the agent its first real project context.

It also maintains `.specific/project.yaml` (architecture facts + runnable `skills:`
verification recipes, merge-managed across re-runs) and seeds an append-only
`LOGS.md` from `template/LOGS.template.md`.

This skill is common to every project. Anything project-specific lives in the target's `.specific/*.yaml`, never in this skill.

## When to use

- `init-flow` step 1 ("Setup concept project") invokes it with `$TARGET_PROJECT`
- User says: "ingest this project", "generate PROJECTS.md", "onboard this codebase", "summarize this repo"
- Re-run after a major architecture change to refresh `PROJECTS.md`

## When NOT to use

- Brand-new project with no code — only when the user wants the placeholder shell; ask first
- User only wants an explanation in chat — answer directly, don't write files
- You only need to link `AGENTS.md` — that is `create-relative-link`'s job

## Inputs

1. **`target_project`** — from the skill argument, or ask if missing. Expand `~`, resolve to an absolute path, and verify it is an existing directory. Abort otherwise.
2. **`source_root`** — this skills repository. Resolve it from the skill directory:
   ```sh
   git -C "<skill-dir>" rev-parse --show-toplevel
   ```
   If git fails, fall back to the parent of the directory containing this `SKILL.md`'s skill folder. Templates live at:
   - `template/PROJECTS.template.md`
   - `template/input/project.template.yaml`
   - `template/output/project-features.template.yaml`
   - `template/LOGS.template.md`

## Override contract — `.specific/*.yaml`

Both files are optional. Read them before scanning. `project-features.yaml` always wins over scanned facts; `project.yaml` is merge-managed per the rules below.

### `.specific/project.yaml` — PROJECTS.md overrides + project skills

Schema: `template/input/project.template.yaml`. Seed it from that file when missing.

```yaml
apiVersion: agent-skills/v1
kind: Project
name: my-project                 # optional display name
summary: ""                      # "" = derive from the scan
architecture:
  framework: Go
  language: Go
  database: PostgreSQL
  unit_test_framework: Go test
skills:                          # runnable verification recipes
  - name: start env
    description: "pnpm start:dev > api.log"
  - name: db query
    description: "podman exec devcontainers_pg_1 psql {ARGS}"
rules:                           # appended to PROJECTS.md "RULES"
  - Never edit generated files under gen/
  - All handlers go through internal/api
features_file: .specific/project-features.yaml
```

This file is **merge-managed**, not human-only:

- `name` / `summary` — set from the scan only when empty/null; never overwritten once filled.
- `architecture.*` — refreshed every run from the scan; a blank scanned value keeps the
  existing entry (never blank a known value, never invent one).
- `skills` — scanned verification recipes **appended** when their `name` is new
  (case-insensitive); existing entries, their order, and their descriptions are preserved.
  Never remove a skill.
- `rules` — never touched.
- Any other key is preserved verbatim.

Rule: never invent a value. If neither yaml nor scan provides one, leave it empty.

### `.specific/project-features.yaml` — feature inventory

Follows `template/output/project-features.template.yaml` exactly:

```yaml
name: features
features:
  - name: auth
    description: Login, session, and token refresh
    sources:
      - type: file
        path: internal/auth
      - type: glob
        path: internal/auth/**/*.go
```

- `type` is one of `file`, `dir`, `glob`.
- `path` is relative to the target project root.
- Keep it to the strongest ~10 features; this is context, not an inventory dump.
- `PROJECTS.md` points at this file with `load from @.specific/project-features.yaml`.

## Behavior

1. **Resolve and validate** `target_project` and `source_root` (see Inputs). Abort on a missing directory or missing templates.
2. **Read overrides** — `.specific/project.yaml` and `.specific/project-features.yaml` if they exist. Parse failures are reported, not fatal: fall back to scan facts and tell the user which file/line failed.
3. **Scan the target read-only.** Collect, in this order:
   - Manifests: `go.mod`, `package.json`, `Cargo.toml`, `pyproject.toml`, `requirements.txt`, `pom.xml`, `build.gradle*`, `Gemfile`, `composer.json`, `*.csproj`, `CMakeLists.txt`, `Makefile`
   - Language/framework evidence from file extensions + manifest dependencies (e.g. Next.js, FastAPI, Spring, Gin, Rails)
   - Database evidence: ORM/driver deps, migrations folders, schema files, `docker-compose.yml` services
   - Test framework: manifest test deps, test dirs, config (`jest.config.*`, `pytest.ini`, `vitest.config.*`, `*_test.go`)
   - Structure: top-level dirs, entry points (`main.go`, `src/index.*`, `cmd/*`, `app.py`, `manage.py`)
   - Docs: `README*`, `docs/`, `AGENTS.md`, `CLAUDE.md`
   - Git summary: `git rev-parse --is-inside-work-tree`, `git log --oneline -1`, commit count, earliest commit date
   - Existing `PROJECTS.md`, `.specific/` contents, and `LOGS.md`
   - **Verification recipes** for the `skills:` list (evidence only, no execution):
     - `package.json` `scripts` (start / dev / test / lint / migrate / knex / db)
     - `Makefile` targets; `docker-compose.yml` services (e.g. a `pg`/`postgres` service → `db query`)
     - Migrate/test tooling: `knex`, `prisma`, `alembic`, `gradle`, `go test`, `pytest`
     Emit candidates as `{name, description}` where `name` is a short verb phrase
     (`start env`, `db query`, `migrate`, `verify-api`) and `description` is the
     literal command, mirroring the examples in `template/input/project.template.yaml`.
   Never run builds, installs, tests, or formatters. Never modify source files.
4. **Seed missing files.** Create `.specific/` first, then:
   - `.specific/project-features.yaml` — copy `template/output/project-features.template.yaml`, then fill `features:` from scan evidence (entry points and top-level modules, guided by README headings). If it already exists, leave it untouched unless the user explicitly asks to refresh it.
   - `.specific/project.yaml` — copy `template/input/project.template.yaml` only when absent. Do not populate values by hand; step 5's merge fills them.
   - `LOGS.md` at the target root — copy `template/LOGS.template.md` only when absent.
     It is an append-only change log owned by `speckit-log`; never overwrite it.
5. **Merge `.specific/project.yaml`** by running the helper (plan first, then apply):
   ```sh
   python3 "<skill-dir>/scripts/update_project_yaml.py" \
     --project-yaml "<target_project>/.specific/project.yaml" \
     --arch-json '<scanned architecture + name + summary>' \
     --skills-json '<scanned skill candidates>' --apply
   ```
   The helper is deterministic and idempotent: it fills `name`/`summary` only when empty,
   refreshes `architecture.*` from scanned values (blank scans keep the existing entry),
   appends `skills` whose `name` is new (case-insensitive), and never touches `rules` or
   any other key. Do not hand-edit the file; report the `changes:` lines it prints.
6. **Render `PROJECTS.md`** from `template/PROJECTS.template.md`, substituting every `<<PLACEHOLDER>>`:
   - `<<PROJECT SUMMARY>>` → one paragraph, no marketing language
   - `<<FRAMEWORK>>`, `<<LANGUAGE>>`, `<<DATABASE>>`, `<<UNIT TEST FRAMEWORK>>` → resolved values
   - Keep `### PROJECT FEATURES` pointing at `@.specific/project-features.yaml`; if the yaml's `features_file` differs, point at that path instead. Keep `### VERIFICATION SKILLS` pointing at `@.specific/project.yaml`.
   Do not add sections the template doesn't have.
7. **Write `PROJECTS.md` idempotently:**
   - Missing → write it.
   - Exists and rendered content is byte-identical → skip and say so.
   - Exists and differs → show a unified diff and ask once: "Overwrite PROJECTS.md? (Y/n)". Default `Y`. On `N`, leave the existing file untouched and report what changed.
8. **Verify** — re-read the written `PROJECTS.md` and confirm no `<<...>>` placeholders remain.
9. **Report** the paths written, the `update_project_yaml.py` change list, facts that fell back to `TBD`, and any files the user should curate (`.specific/project.yaml`, feature descriptions, the `skills:` recipes).

## Rules

- Read-only on the target's source tree. The only writes are `PROJECTS.md`, `.specific/*.yaml`, and a seeded `LOGS.md` (never overwritten).
- Never remove or rewrite a user entry in `.specific/project.yaml`: only fill empty `name`/`summary`, refresh `architecture.*`, and append new `skills`.
- Never fabricate architecture facts. `TBD` is the correct answer when evidence is missing.
- Prefer few accurate features and skills over many guessed ones.
- No commits, no dependency installs, no build or test runs.
- `PROJECTS.md` is generated, not symlinked — regenerate it instead of pointing at `template/PROJECTS.template.md`.

## Failure-degradation modes

| Failure | Behavior |
|---|---|
| `target_project` missing or not a directory | Abort with a clear message; do not create anything |
| Templates not found under `source_root` | Abort; tell the user the skills repo path could not be resolved |
| `.specific/*.yaml` unparseable | Report file + error, ignore that file, continue with scan facts; do not let the merge clobber it |
| `update_project_yaml.py` fails | Report stderr; keep the existing `project.yaml` untouched and continue with the rest |
| PyYAML unavailable | Report the install hint `python3 -m pip install pyyaml`; skip the `project.yaml` merge |
| Project has no manifest/README | Still write `PROJECTS.md` with `TBD` values and whatever structure was found |
| `PROJECTS.md` already exists | Diff + one confirmation (default Y), never a silent clobber |
| `LOGS.md` already exists | Leave untouched (append-only) |
| Scan finds no test framework | Write `TBD`, do not guess |
| `git` unavailable or not a repo | Skip the git summary; continue |

## References

- `template/PROJECTS.template.md` — the render source
- `template/input/project.template.yaml` — the `project.yaml` schema, now including `skills`
- `template/output/project-features.template.yaml` — the feature schema
- `template/LOGS.template.md` — seeds the target's append-only `LOGS.md`
- `scripts/update_project_yaml.py` — the deterministic `project.yaml` merge
- `template/AGENTS.md` — loads `@PROJECTS.md` and `@LOGS.md`
- `create-relative-link` — links `AGENTS.md` and workflow skills into the target
