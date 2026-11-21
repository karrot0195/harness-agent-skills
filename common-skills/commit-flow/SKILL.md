---
name: commit-flow
description: Commit workflow that runs gen-docs and secrets-check first, stages only needed files (asking for confirmation on uncertain ones), scans for leaked secrets/sensitive data, suggests a message from the actual diff, commits, shows a summary, and asks about pushing.
---

# Commit Flow

Use when the user asks to commit, stage, or prepare changes for a commit.

## Steps

1. **Run doc-gen** — activate/run the `gen-docs` skill first to update documentation based on code changes.
2. **Check current changes** — run `git status` and `git diff` (or `git diff --cached`) to see exactly what changed.
3. **Review code** — read modified/added files to understand what is actually needed.
4. **Stage necessary code only** — read files directly; add files that contain real, needed changes. For any file that looks unrelated, temporary, or unclear, ask the user: "Should I stage `<file>`? It contains `<brief summary>`" — do not assume.
5. **Run secrets-check** — scan staged and working-tree changes for leaked secrets, API keys, tokens, credentials, and PII. Report findings with severity. If high-severity findings exist, **block** and require the user to fix them before proceeding. Low/medium findings can be allowed, ignored, or fixed at user's discretion.
6. **Base message on code change** — derive the commit message from the actual diff/content (e.g., `feat: add docs for skills a`).
7. **Confirm with user** — show proposed message, doc-gen result, secrets-check results, and staged files; ask for approval (`yes`/`approve`) before committing.
8. **Commit code** — run `git commit` with the approved message, then show a brief summary of what was committed.
9. **Ask about push** — ask the user if they want to push (`git push`).

## Rules

- Use `git`, `read_file`, `write_file`, and file tools directly within this flow — do not ask for permission for each tool call.
- If unsure whether a change is needed, ask: "Should I stage `<file>`? It contains `<brief summary>`"
- Run `gen-docs` before committing.
- **Always run `secrets-check`** after staging (Step 5). High-severity findings block the commit until fixed. Low/medium findings require explicit user consent to proceed.
- Suggest a commit message derived from the actual diff (format example: `feat: add docs for skills a`).
- Confirm with user (`yes`/`approve`) before `git commit` and before `git push`; other steps proceed directly.
