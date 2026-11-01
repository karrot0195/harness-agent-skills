## SUMMARY

This repository generates the common skills, workflow skills, and per-project
context that a target project needs before agent-assisted coding starts.

A one-pass `/init-flow <target_project>` gives a target project:

- an `AGENTS.md` symlink to this repo's `template/AGENTS.md`
- a generated `PROJECTS.md` (project summary, architecture, rules, features)
- `.specific/*.yaml` for per-project overrides
- `.specify/` (GitHub Spec Kit runtime) plus linked speckit skills
- relative symlinks under `.agents/skills/` to `workflow-skills/*`

Everything is idempotent: re-running refreshes managed files, preserves local
edits, and never deletes directories.

## REPOSITORY LAYOUT

```
.agents/skills/          orchestrator + context skills (used from this repo)
  create-relative-link/  portable relative symlinks
  ingest-project/        scan target -> PROJECTS.md + .specific/
  init-flow/             one-pass onboarding orchestrator
  setup-workflow/        idempotent .specify + workflow-skill installer
    scripts/             setup_specify.py, link_skills.py
common-skills/           opt-in skills (commit-flow, gen-docs, server-deploy)
workflow-skills/         speckit-* and spec-explain
template/
  AGENTS.md              linked into the target
  PROJECTS.template.md   rendered into the target
  input/                 per-project config seeds (user edits these)
    project.template.yaml
    workflow.template.yaml
  output/                artifacts the skills generate (seeded or rendered)
    project-features.template.yaml
    extensions.template.yaml
.specify/                canonical Spec Kit runtime copied into targets
.commandcode/taste/      learned preferences (managed automatically)
```

## TARGET PROJECT CONTRACT

| Path | Owner | Notes |
|---|---|---|
| `AGENTS.md` | symlink | points at `template/AGENTS.md`; loads `@PROJECTS.md` |
| `PROJECTS.md` | generated | rendered by `ingest-project`; no `<<...>>` placeholders |
| `.specific/project.yaml` | user | seeds from `template/input/project.template.yaml`; never rewritten |
| `.specific/project-features.yaml` | user | seeds from `template/output/project-features.template.yaml` |
| `.specific/workflow.yaml` | user | seeds from `template/input/workflow.template.yaml` |
| `.specify/` | managed | installed by `setup-workflow`; tracked in `.specify/.install-manifest.json` |
| `.agents/skills/*` | symlinks | relative links to `workflow-skills/*` |

## RULES

### Create / update a skill

- One capability per skill; `name` must equal the directory name.
- Validate frontmatter loads (`python3 -c "import yaml; ..."`).
- Include: when to use, when NOT to use, inputs, deterministic steps,
  idempotency/re-run behavior, failure modes, done criteria, references.
- Keep the body under ~500 lines; move long material to `scripts/` or
  `references/` and link it from the body.
- Skills are common: anything project-specific must come from the target's
  `.specific/*.yaml`, never be hardcoded into the skill.

### Templates

- Use YAML for configuration and generated config artifacts.
- `template/input/` holds seeds copied once into `TARGET/.specific/`; they are
  user-owned and must never be overwritten by a skill.
- `template/output/` holds bases for artifacts generated into the target.
  Managed outputs are refreshed only when unmodified (see the manifest rules).
- Markdown templates are allowed only when the final artifact is markdown
  (`PROJECTS.md`, constitution).

### Idempotency and safety

- Never delete files or real directories; never replace a directory with a symlink.
- Managed files are tracked by sha256 in `.specify/.install-manifest.json`:
  update only when the on-disk hash still matches the recorded hash.
- Local edits are conflicts: resolve with `prompt | keep | overwrite`
  (default `prompt` in config, `keep` when answering interactively). `keep` pins.
- Symlinks must be relative, computed from the link's parent directory.
- Do not commit build artifacts (`__pycache__/`, `*.pyc`, `bin/`).

### Verification before finishing

- `python3 -m py_compile .agents/skills/setup-workflow/scripts/*.py`
- Parse every skill's YAML frontmatter and assert `name == parent dir`.
- Run `setup_specify.py` and `link_skills.py` against a temporary target and
  confirm a second run reports only `same` / `skip_linked`.
- Confirm `PROJECTS.md` has no `<<...>>` placeholders and every linked skill
  resolves under `workflow-skills/`.
- Delete `__pycache__` afterward.

## NOTES

- `.agents/skills` is used when working in this repository; target projects
  receive linked copies of `workflow-skills/*` only.
- `common-skills/*` are opt-in and are not linked by `init-flow`.
- Never edit `.commandcode/taste/**` by hand; use the taste tooling.
