## What this repo does

A one-pass `/init-flow <target_project>` turns an existing project into an
agent-ready one: links `AGENTS.md`, generates `PROJECTS.md` + `.specific/`,
sets up `.harness/` (Spec Kit runtime) and symlinks `workflow-skills/*`.
Everything is idempotent.

## Target project contract

| Path | Owner | Notes |
|---|---|---|
| `AGENTS.md` | symlink | points at `template/AGENTS.md`; loads `@PROJECTS.md` |
| `PROJECTS.md` | generated | rendered by `ingest-project`; no `<<...>>` placeholders |
| `LOGS.md` | user (append-only) | seeded by `ingest-project`; appended by `speckit-log` |
| `.specific/project.yaml` | merge-managed | architecture refreshed from scan, `skills` appended, user fields preserved |
| `.specific/project-features.yaml` | user | seeds from template; never rewritten |
| `.specific/workflow.yaml` | user | seeds from template; never rewritten |
| `.harness/` | symlink | relative link; copy fallback is hash-tracked |
| `.agents/skills/*` | symlinks | relative links to `workflow-skills/*` |

## Rules

### Skills

- One capability per skill; `name` == directory name.
- Validate frontmatter loads; include when to use / not use, inputs, steps,
  idempotency, failure modes, done criteria.
- Keep the body under ~500 lines; move long material to `scripts/` or
  `references/` and link it.
- Project-specific config comes from `.specific/*.yaml`, never hardcoded.

### Templates

- `template/input/` = seeds copied once into targets (user-owned, never overwritten).
- `template/output/` = bases for generated artifacts (refreshed only when unmodified).
- Use YAML for config artifacts; markdown only when the final artifact is markdown.

### Idempotency & safety

- Never delete files or real directories; replace only with relative symlinks.
- Managed files tracked by sha256 in `.harness/.install-manifest.json`; update
  only when on-disk hash matches.
- Conflicts resolved with `prompt | keep | overwrite` (`keep` pins).
- Symlinks must be relative. No build artifacts (`__pycache__/`, `*.pyc`).

See [README.md](./README.md) for the full repository layout, skills catalog,
configuration details, and development steps.
