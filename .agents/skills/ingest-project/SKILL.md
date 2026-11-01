---
name: ingest-project
description: Generate or refresh a target project's PROJECTS.md from a read-only scan of its code, merged with per-project overrides in .specific/*.yaml. Use when init-flow reaches its "Setup concept project" step, or when the user asks to ingest, onboard, initialize, or re-summarize an existing codebase.
argument-hint: "<target_project>"
metadata:
  version: "2.0.0"
---

# ingest-project

Reads an existing project (never modifies its source), derives the facts a coding agent needs, merges project-specific overrides, and writes `PROJECTS.md` at the target project root. `template/AGENTS.md` loads that file, so this is what gives the agent its first real project context.

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

## Override contract — `.specific/*.yaml`

Both files are optional. Read them before scanning; they always win over scanned facts.

### `.specific/project.yaml` — PROJECTS.md overrides

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
rules:                           # appended to PROJECTS.md "RULES"
  - Never edit generated files under gen/
  - All handlers go through internal/api
features_file: .specific/project-features.yaml
```

Rules:
- Empty string, `null`, or a missing key means "derive it from the scan".
- Never invent a value: if neither yaml nor scan provides it, write `TBD`.
- Do not populate or rewrite this file after seeding — it is human-curated. Ask before changing it.

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
   - Existing `PROJECTS.md` and `.specific/` contents
   Never run builds, installs, tests, or formatters. Never modify source files.
4. **Seed `.specific/` when missing.** Create the directory first, then:
   - `.specific/project-features.yaml` — copy `template/output/project-features.template.yaml`, then fill `features:` from scan evidence (entry points and top-level modules, guided by README headings). If it already exists, leave it untouched unless the user explicitly asks to refresh it.
   - `.specific/project.yaml` — copy `template/input/project.template.yaml` only when absent. Do not populate values; it is human-curated.
5. **Merge with precedence:** `.specific/project.yaml` → scanned facts → `TBD`. `rules` from yaml are appended verbatim; if none exist, keep the `RULES` section with a short scan-derived convention list only when it is unambiguous, else leave it empty.
6. **Render `PROJECTS.md`** from `template/PROJECTS.template.md`, substituting every `<<PLACEHOLDER>>`:
   - `<<PROJECT SUMMARY>>` → one paragraph, no marketing language
   - `<<FRAMEWORK>>`, `<<LANGUAGE>>`, `<<DATABASE>>`, `<<UNIT TEST FRAMEWORK>>` → resolved values
   - Keep `### PROJECT FEATURES` pointing at `@.specific/project-features.yaml`; if the yaml's `features_file` differs, point at that path instead.
   Do not add sections the template doesn't have.
7. **Write `PROJECTS.md` idempotently:**
   - Missing → write it.
   - Exists and rendered content is byte-identical → skip and say so.
   - Exists and differs → show a unified diff and ask once: "Overwrite PROJECTS.md? (Y/n)". Default `Y`. On `N`, leave the existing file untouched and report what changed.
8. **Verify** — re-read the written `PROJECTS.md` and confirm no `<<...>>` placeholders remain.
9. **Report** the paths written, facts that fell back to `TBD`, and any files the user should curate (`.specific/project.yaml`, feature descriptions).

## Rules

- Read-only on the target's source tree. The only writes are `PROJECTS.md` and `.specific/*.yaml`.
- Never delete or rewrite a human-curated `.specific/project.yaml`.
- Never fabricate architecture facts. `TBD` is the correct answer when evidence is missing.
- Prefer few accurate features over many guessed ones.
- No commits, no dependency installs, no build or test runs.
- `PROJECTS.md` is generated, not symlinked — regenerate it instead of pointing at `template/PROJECTS.template.md`.

## Failure-degradation modes

| Failure | Behavior |
|---|---|
| `target_project` missing or not a directory | Abort with a clear message; do not create anything |
| Templates not found under `source_root` | Abort; tell the user the skills repo path could not be resolved |
| `.specific/*.yaml` unparseable | Report file + error, ignore that file, continue with scan facts |
| Project has no manifest/README | Still write `PROJECTS.md` with `TBD` values and whatever structure was found |
| `PROJECTS.md` already exists | Diff + one confirmation (default Y), never a silent clobber |
| Scan finds no test framework | Write `TBD`, do not guess |
| `git` unavailable or not a repo | Skip the git summary; continue |

## References

- `template/PROJECTS.template.md` — the render source
- `template/output/project-features.template.yaml` — the feature schema
- `template/AGENTS.md` — loads `@PROJECTS.md`
- `create-relative-link` — links `AGENTS.md` and workflow skills into the target
