---
name: setup-common
description: Install, refresh, or link opt-in common skills (common-skills/*) into a target project, driven by .specific/common.yaml and idempotent across runs. Use when the user wants to add shared utilities (e.g. commit-flow, doc-gen, server-deploy), when onboarding needs opt-in skills, or to refresh linked common skills.
argument-hint: "<target_project>"
metadata:
  version: "1.0.0"
---

# setup-common

One idempotent pass that links opt-in skills from this repo into a project:

- `.specific/common.yaml` — the project's own settings (seeded, never overwritten)
- `.agents/skills/*` — relative symlinks to `common-skills/*` (selected by config)

`common-skills/*` are opt-in (not linked by `init-flow`). Per-project selection lives in `.specific/common.yaml`, whose schema is `template/input/common.template.yaml`.

## When to use

- User says: "setup common skills", "add commit-flow/doc-gen/server-deploy", "link common skills", "refresh common skills"
- A project needs opt-in utilities not covered by the speckit workflow
- Re-run after updating `common-skills/` in this skills repository

## When NOT to use

- Project only needs workflow/speckit skills — use `setup-workflow`
- User wants context generation only — use `ingest-project`
- User wants one skill only — link it with `create-relative-link` directly

## Inputs

1. **`target_project`** — positional argument, or ask. Expand `~`, resolve absolute, verify it is a directory.
2. **`source_root`** — this skills repository:
   ```sh
   SOURCE_ROOT="$(git -C "<skill-dir>" rev-parse --show-toplevel)"
   ```
3. **`skill_dir`** — the directory containing this `SKILL.md` (use its absolute path).

Abort if `target_project` is `source_root` or inside it.

## Config contract — `.specific/common.yaml`

Seed it from `template/input/common.template.yaml` when missing. Never overwrite an existing file.

```yaml
skills:
  link: []        # empty = every common-skills/*/
sync:
  on_conflict: prompt  # prompt | keep | overwrite
```

| Config | Effect |
| --- | --- |
| `skills.link` | `.agents/skills/*` symlinks (empty = all `common-skills/*/`) |
| `sync.on_conflict` | conflict policy for re-runs (passed through to linking behavior) |

## Steps

1. **Validate.** Resolve `target_project`, `source_root`, `skill_dir`. Confirm `source_root/common-skills/` exists. Abort with the missing path otherwise. Abort if `target_project` is `source_root` or inside it.
2. **Seed config.** If `<target>/.specific/common.yaml` is missing, create `.specific/` and copy `template/input/common.template.yaml` there. Never modify an existing file.
3. **Link common skills.**
   ```sh
   python3 "$SKILL_DIR/scripts/link_common_skills.py" \
     --target "$TARGET" --source-root "$SOURCE_ROOT"
   ```
   Show the plan. If any `REPLACE` entries appear, ask once: **"Overwrite these common skill links? (Y/n)"** — default `Y`; on `Y` add `--overwrite`. Then apply:
   ```sh
   python3 "$SKILL_DIR/scripts/link_common_skills.py" \
     --target "$TARGET" --source-root "$SOURCE_ROOT" --apply [--overwrite]
   ```
   `SKIP_REAL_DIR` entries are never deleted — report them. Unknown skills in `skills.link` are errors (list available ones).
4. **Verify.**
   - Re-run without `--apply`; every line must be `same`, `skip_linked`, or `skip_real_dir` (no `add`/`update`/`replace`/`conflict`).
   - Every linked skill resolves: `readlink -f` lands under `$SOURCE_ROOT/common-skills/`.
   - `.specific/common.yaml` parses as YAML.
5. **Report.** Per step: written/skipped paths, linked/skipped/replaced counts, and anything the user should curate (`.specific/common.yaml`).

## Re-running

| Situation | Behavior |
| --- | --- |
| Link already correct | `SKIP_LINKED` |
| Link points elsewhere | `REPLACE` → one batch prompt (default `Y`) |
| Destination is a real directory | `SKIP_REAL_DIR`, never deleted |
| Destination is a different file/symlink | `REPLACE` if `--overwrite` else skipped with prompt |
| Config missing on re-run | Seed once (never overwrite) |
| Upstream skill added/removed from selection | Add/remove links on apply (only when allowed) |

## What this skill never does

- Delete files or real directories
- Overwrite a real directory with a symlink
- Edit the target's source code, run builds/tests, install dependencies, or commit
- Rewrite an existing `.specific/common.yaml`
- Copy skills instead of linking them
- Auto-link skills not listed/configured (empty list = all by design, explicit list = only those)
- Touch `.specify/` or workflow configuration

## Failure-degradation modes

| Failure | Behavior |
| --- | --- |
| `target_project` missing / not a directory | Abort before any write |
| `source_root` has no `common-skills/` | Abort, name the missing path |
| `template/input/common.template.yaml` unparseable | Abort; report the YAML error and line |
| `.specific/common.yaml` unparseable | Abort; do not fall back silently |
| PyYAML unavailable | Abort with the install hint `python3 -m pip install pyyaml` |
| Unknown skill in `skills.link` | Abort with error listing available skills |
| One skill link fails | Continue the rest; list the failure in the final report |

## Done criteria

- `.specific/common.yaml` exists and parses
- `.agents/skills/` holds relative symlinks to selected `common-skills/*/` (or empty only if `common-skills/` is empty and nothing selected)
- Every linked skill resolves under `$SOURCE_ROOT/common-skills/`
- Re-run is a no-op (`skip_linked`/`skip_real_dir` only)
- Final report lists linked/skipped counts

## References

- `template/input/common.template.yaml` — config schema seeded into `.specific/`
- `scripts/link_common_skills.py` — idempotent relative symlink planner/apply (mirrors `setup-workflow/scripts/link_skills.py`)
- `common-skills/*` — opt-in skills linked by this skill
- `create-relative-link` — symlink contract (same relative-linking approach)
