# agent-skills

Common skills, workflow skills, and per-project context for agent-assisted
coding. One idempotent command turns an existing project into an agent-ready
one; everything project-specific is config, not code.

## Quick start

```text
/init-flow /path/to/target_project
```

Or run the pieces individually:

| Skill | Purpose |
|---|---|
| `create-relative-link` | link a repo file (e.g. `template/AGENTS.md`) into a project |
| `ingest-project` | scan a project read-only and generate `PROJECTS.md` + `.specific/` |
| `setup-workflow` | install/refresh `.specify/` and link `workflow-skills/*` |
| `init-flow` | run all of the above in order |
| `speckit-upgrade` | re-apply the `.specific/` layout after a new upstream speckit release |

## What a target project gets

```text
target/
├── AGENTS.md                    -> symlink to template/AGENTS.md
├── PROJECTS.md                  generated from template/PROJECTS.template.md
├── LOGS.md                      append-only change log, seeded from template/LOGS.template.md
├── .specific/
│   ├── project.yaml             merge-managed overrides + runnable `skills` (see ingest-project)
│   ├── project-features.yaml    feature inventory
│   └── workflow.yaml            speckit + flow configuration
├── .specify/                    Spec Kit runtime (managed, hash-tracked)
└── .agents/skills/*             relative symlinks to workflow-skills/*
```

## Configuration

All per-project behavior comes from three YAML files in `.specific/`. `project-features.yaml`
and `workflow.yaml` seed from a template once and are never rewritten; `project.yaml` is
merge-managed (architecture refreshed from the scan, `skills` appended, user fields kept).

| File | Template | Controls |
|---|---|---|
| `project.yaml` | `template/input/project.template.yaml` | summary, framework/language/database, runnable `skills`, rules, features file |
| `project-features.yaml` | `template/output/project-features.template.yaml` | feature list with `file` / `dir` / `glob` sources |
| `workflow.yaml` | `template/input/workflow.template.yaml` | speckit version/integration/script, constitution, extension hooks, workflow toggles, linked skills, conflict policy |

`template/output/extensions.template.yaml` is the render base for
`.specific/extensions.yml`.

## Skills

- `.agents/skills/` — orchestrators used from this repository
  (`init-flow`, `setup-workflow`, `ingest-project`, `create-relative-link`,
  `speckit-upgrade`).
- `workflow-skills/` — `speckit-*` (specify, plan, tasks, implement, and the
  rest of the Spec Kit flow), plus `speckit-explain`, `speckit-review-spec`
  (readiness verdict reusing analyze + checklist), and `speckit-log`
  (append-only `LOGS.md` entries). Linked into targets.
- `common-skills/` — opt-in extras (`commit-flow`, `gen-docs`,
  `server-deploy`). Not linked by `init-flow`.

## Idempotent by design

- Managed `.specify` files are tracked by sha256 in
  `.specify/.install-manifest.json`; a re-run updates only unmodified files.
- Local edits are conflicts resolved with `prompt`, `keep`, or `overwrite`
  (`keep` pins the file).
- Skill links are relative; correct links are skipped, real directories are
  never deleted.
- `PROJECTS.md` is compared before writing.

## Requirements

- `python3` with PyYAML (`python3 -m pip install pyyaml`)
- `git` (used to resolve the repository root)
- An agent that supports the Agent Skills standard

## Development

```sh
python3 -m py_compile .agents/skills/setup-workflow/scripts/*.py

# safe smoke test against a throwaway target
TMP=$(mktemp -d)
python3 .agents/skills/setup-workflow/scripts/setup_specify.py \
  --target "$TMP" --source-root "$PWD" --apply
python3 .agents/skills/setup-workflow/scripts/link_skills.py \
  --target "$TMP" --source-root "$PWD" --apply
# second run should report only same / skip_linked
rm -rf "$TMP"
```

See `AGENTS.md` for repository rules, skill conventions, and the target
project contract.
