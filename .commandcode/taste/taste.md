# Taste

- When a symlink already exists during sync, prompt once with a summary of existing skills and default to overwrite (Y/n) instead of prompting per item or silently skipping. Confidence: 0.9
- Expects agent skills to be improved/rewritten to skill-design best practices and kept structurally consistent with sibling skills (valid frontmatter whose `name` matches the directory, clear "when to use / when NOT to use", deterministic steps, failure modes, idempotency) rather than patched minimally. Confidence: 0.6
- Wants agent skills written as generic, reusable skills; anything project-specific should live in per-project config files (e.g. `.specific/*.yaml` overrides) rather than being hardcoded into the skill. Confidence: 0.8
- Wants templates and config schemas as YAML files kept in a `template/` tree, split into `template/input/` (seeds copied into each project's `./.specific/`) and `template/output/` (bases rendered into generated files), instead of inline YAML/JSON or markdown-only docs. Confidence: 0.7
- Wants speckit-constitution output to follow the standard GitHub spec-kit flow first (writing `.specify/memory/constitution.md`) and then be parsed into `.specific/constitution.yaml`, rather than replacing the standard path. Confidence: 0.7
