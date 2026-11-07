---
name: setup-workflow
description: Install, refresh, or link the GitHub Spec Kit workflow (.harness runtime, templates, constitution, hooks, and workflow skills) in a target project, driven by .specific/workflow.yaml and idempotent across runs. Use when init-flow reaches "Setup Flow Project", when onboarding a repo that needs speckit, or when the user asks to set up, update, or repair the speckit workflow.
argument-hint: "<target_project>"
metadata:
  version: "1.1.0"
---

# setup-workflow

One idempotent pass that makes a project ready for the speckit flow:

- `.harness/` — the runtime: linked via `create-relative-link` when shared, otherwise installed by copy from the hash manifest; never written through an existing symlink
- `.specific/workflow.yaml` — the project's own settings (seeded, never overwritten)
- `.agents/skills/speckit-*` — relative symlinks to `workflow-skills/*`

The skill is common to every project. Per-project context, flow rules, hooks, and the constitution live in `.specific/workflow.yaml`, whose schema is `template/input/workflow.template.yaml`.

## When to use

- `init-flow` step 2 ("Setup Flow Project") invokes it with `$TARGET_PROJECT`
- User says: "setup speckit", "install the workflow", "refresh .harness", "add the spec-kit flow to this repo"
- Re-run after updating `workflow-skills/` or `.harness/` in this skills repository

## When NOT to use

- Project should only receive `PROJECTS.md` context — that is `ingest-project`
- User wants one workflow skill only — link it with `create-relative-link` directly
- `speckit.enabled: false` is set — report it and stop; do not install anything

## Inputs

1. **`target_project`** — positional argument, or ask. Expand `~`, resolve absolute, verify it is a directory.
2. **`source_root`** — this skills repository:
   ```sh
   SOURCE_ROOT="$(git -C "<skill-dir>" rev-parse --show-toplevel)"
   ```
3. **`skill_dir`** — the directory containing this `SKILL.md` (use its absolute path).

Abort if `target_project` is `source_root` or inside it.

## Config contract — `.specific/workflow.yaml`

Seed it from `template/input/workflow.template.yaml` when missing. Never overwrite an existing file.

```yaml
speckit:
  enabled: true
  version: "1.2.2.dev0"
  integration: command-code
  script: py                      # py | sh
  feature_numbering: sequential   # sequential | timestamp
  allow_symlinks: false

constitution:
  body: ""                        # non-empty wins verbatim
  project_name: my-project
  principles: [{name: ..., description: ...}]
  sections: [{name: ..., content: ...}]
  governance: [rule, ...]
  version: "1.0.0"
  ratified: 2026-11-01
  last_amended: 2026-11-01

extensions:
  hooks:                          # keys the skills read: before_plan, after_implement, ...
    before_plan:
      - extension: guard
        command: speckit.git.commit
        description: Ensure a clean tree before planning
        optional: true
        enabled: true
        condition: ""

workflows:
  speckit:
    enabled: true

skills:
  link: []                        # empty = every workflow-skills/*/

sync:
  on_conflict: prompt             # prompt | keep | overwrite
```

Mapping:

| Config | Written to |
|---|---|
| `speckit.*` | `.harness/init-options.json`, `.harness/integration.json` |
| `constitution.*` | `.harness/memory/constitution.md`, then parsed into `.specific/constitution.yaml` |
| `extensions.hooks` | `.specific/extensions.yml` |
| `workflows.speckit.enabled` | `.harness/workflows/workflow-registry.json` |
| `skills.link` | `.agents/skills/*` symlinks |
| `sync.on_conflict` | conflict policy for re-runs |

`template/output/extensions.template.yaml` is the render base for `.specific/extensions.yml`.

## Steps

1. **Validate.** Resolve `target_project`, `source_root`, `skill_dir`. Confirm `source_root/.harness/` and `source_root/workflow-skills/` exist. Abort with the missing path otherwise. If `<target>/.harness` is already a symlink (created by `create-relative-link`), the runtime is shared: skip the `.harness` install in steps 4–5 (linked mode) and never write through the link.

2. **Seed config.** If `<target>/.specific/workflow.yaml` is missing, create `.specific/` and copy `template/input/workflow.template.yaml` there. Never modify an existing file.

3. **Read `speckit.enabled`.** If false, skip steps 4-6, report that the workflow is disabled, and stop.

   4. **Plan the `.harness` install** (no writes). Linked mode (`.harness` is a symlink): `setup_specify.py` plans/applies only the `.specific/*` renders and reports `LINKED .harness`; `add`/`update`/`conflict` then apply to `.specific/extensions.yml` and `.specific/constitution.yaml` only.
   ```sh
   python3 "$SKILL_DIR/scripts/setup_specify.py" \
     --target "$TARGET" --source-root "$SOURCE_ROOT" --json
   ```
   Parse `files[].status`. Statuses: `add`, `update`, `same`, `conflict`, `pinned`.
   - Exit `0` → no unresolved conflicts; apply.
   - Exit `3` → conflicts and the effective policy is `prompt`. Show one line per conflicted path and ask once: **"Keep local edits or overwrite with the skills repo versions? (keep/overwrite)"** — default `keep`. Map the answer to `--on-conflict keep|overwrite`.
   - Exit `2` → configuration error; stop and report stderr verbatim.

   If `sync.on_conflict` in `.specific/workflow.yaml` is already `keep` or `overwrite`, the plan exits `0` and no prompt is needed (the apply step honors the config).

5. **Apply the `.harness` install:**
   ```sh
   python3 "$SKILL_DIR/scripts/setup_specify.py" \
     --target "$TARGET" --source-root "$SOURCE_ROOT" --apply \
     --on-conflict <keep|overwrite>
   ```
   This copies `scripts/`, `templates/`, `workflows/speckit/`, `.gitignore`, and renders `init-options.json`, `integration.json`, `extensions.yml`, `memory/constitution.md`, `memory/.constitution-template.json`, and `workflows/workflow-registry.json` in copy mode; every write is recorded in `.harness/.install-manifest.json`. In linked mode only the `.specific/*` renders are written and no manifest is touched. Files are never deleted.

6. **Link the workflow skills.**
   ```sh
   python3 "$SKILL_DIR/scripts/link_skills.py" \
     --target "$TARGET" --source-root "$SOURCE_ROOT"
   ```
   Show the plan. If any `REPLACE` entries appear, ask once: **"Overwrite these skill links? (Y/n)"** — default `Y`; on `Y` add `--overwrite`. Then apply:
   ```sh
   python3 "$SKILL_DIR/scripts/link_skills.py" \
     --target "$TARGET" --source-root "$SOURCE_ROOT" --apply [--overwrite]
   ```
   `SKIP_REAL_DIR` entries are never deleted — report them.

7. **Verify.**
   - Re-run both scripts without `--apply`; every line must be `same`, `pinned`, `skip_linked`, or `skip_real_dir` (no `add`/`update`/`replace`/`conflict`).
   - `.harness/init-options.json`, `.harness/integration.json`, `.harness/workflows/workflow-registry.json` parse as JSON.
   - `.specific/extensions.yml` parses as YAML; each hook has `command`, and `optional` is a boolean when present.
   - `.harness/scripts/python/setup_plan.py` (or the `.sh` equivalent) exists and is executable.
   - Every linked skill resolves: `readlink -f` lands under `$SOURCE_ROOT/workflow-skills/`.
   - `PROJECTS.md` is not required here; `init-flow` handles it.

8. **Report.** Per step: written paths, `UPDATE`/`CONFLICT`/`PINNED` counts, linked skills, skipped real directories, and the manifest path. Name anything the user should now curate (`.specific/workflow.yaml`, especially `constitution`).

## Re-running

| Situation | Behavior |
|---|---|
| File unchanged since last install | `SAME`, no write |
| Upstream file changed, target untouched | `UPDATE`, no prompt |
| Target edited locally | `CONFLICT` → one prompt (`keep` pins the file, `overwrite` restores upstream) |
| File previously kept | `PINNED`, never touched again |
| Skill link already correct | `SKIP_LINKED` |
| Skill link points elsewhere | `REPLACE` → one batch prompt (default `Y`) |
| Destination is a real directory | `SKIP_REAL_DIR`, never deleted |
| `speckit.enabled: false` | Remove `speckit` from the registry; leave files and links untouched |
| `.harness` is a symlink | Install skipped (`LINKED .harness`); `.specific/*` still rendered |

## What this skill never does

- Delete files or real directories
- Overwrite a local edit without an explicit `overwrite` decision
- Edit the target's source code, run builds/tests, install dependencies, or commit
- Rewrite an existing `.specific/workflow.yaml`
- Copy skills instead of linking them
- Write through an existing `.harness` symlink (the shared runtime stays untouched)
- Prune skill links that are no longer listed in `skills.link`

## Failure-degradation modes

| Failure | Behavior |
|---|---|
| `target_project` missing / not a directory | Abort before any write |
| `source_root` has no `.harness/` or `workflow-skills/` | Abort, name the missing path |
| `template/input/workflow.template.yaml` unparseable | Abort; report the YAML error and line |
| `.specific/workflow.yaml` unparseable | Abort; do not fall back silently |
| PyYAML unavailable | Abort with the install hint `python3 -m pip install pyyaml` |
| Conflict and user gives no answer | Default `keep`; report the pinned files |
| One skill link fails | Continue the rest; list the failure |
| `.install-manifest.json` missing or corrupt | Treat as empty: existing files become `CONFLICT`, so nothing is clobbered |

## References

- `template/input/workflow.template.yaml` — the config schema seeded into `.specific/`
- `template/input/project.template.yaml` — the sibling config for `ingest-project`
- `template/output/extensions.template.yaml` — render base for `.specific/extensions.yml`
- `scripts/setup_specify.py` — hash-manifest `.harness` installer
- `scripts/link_skills.py` — idempotent relative symlink planner
- `workflow-skills/speckit-*` — the skills that read `.specific/extensions.yml` hooks
