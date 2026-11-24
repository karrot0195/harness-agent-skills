---
name: "speckit-review"
description: "Review the active feature for readiness — reusing the analyze and checklist findings — give a STABLE/DONE or NEEDS-CHANGE verdict, then write the result back into project context. Writes only `.specific/speckit-review.md` (skill experience) and `.specific/project.yaml` (`architecture`/`summary`); the spec artifacts stay read-only. Runs automatically after speckit-implement or speckit-analyze via extension hooks."
compatibility: "Requires spec-kit project structure with .harness/ directory"
metadata:
  author: "local"
  source: "custom"
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before review)**:
- Check if `.specific/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_review` key
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specific/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory (`optional: false`) hooks registered there, then continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- When constructing command invocations from hook command names, replace dots (`.`) with hyphens (`-`). For example, `speckit.git.commit` → `/speckit-git-commit`.
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Pre-Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Pre-Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}

    Wait for the result of the hook command before proceeding to the Goal.
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specific/extensions.yml` does not exist, skip silently

## Goal

Decide whether the active feature is **stable** (ready to build) or **needs changes**, say
exactly what to change next, then **write the result back** into project context. This is a
review/verdict layer over the existing analysis: it **reuses** `speckit-analyze` and
`speckit-checklist` rather than re-deriving everything, and it updates the skill-experience
log and `.specific/project.yaml` so later runs start informed.

## Operating Constraints

- **Narrow write scope**: the ONLY files this skill may write are
  `.specific/speckit-review.md` (skill experience; created when absent) and
  `.specific/project.yaml` (its `architecture.*` and `summary` fields only).
- **Spec artifacts are read-only**: never create, edit, or delete `spec.md`, `plan.md`,
  `tasks.md`, `.specific/constitution.yaml`, any other `.specific/*.yaml`, or any source
  file. Fixes to those are **reported**, not applied — the user (or the named follow-up
  command) applies them.
- **Reuse, don't duplicate**: consume the cross-artifact findings from `speckit-analyze`
  and the requirements-quality items from `speckit-checklist`. Only fall back to a fresh
  read when those outputs are unavailable.
- **Constitution authority**: `.specific/constitution.yaml` is non-negotiable. A conflict
  with a MUST principle is always **NEEDS-CHANGE**.
- **Auto-apply**: this skill runs non-interactively (usually from an `after_implement` /
  `after_analyze` hook), so it performs its write-back without prompting. Do not ask for
  confirmation before writing the two allowed files.

## Execution Steps

### 1. Resolve the active feature

Run `python3 .harness/scripts/python/check_prerequisites.py --json --require-spec --include-tasks` once from repo root and parse FEATURE_DIR and AVAILABLE_DOCS. Derive:

- SPEC = FEATURE_DIR/spec.md
- PLAN = FEATURE_DIR/plan.md (optional)
- TASKS = FEATURE_DIR/tasks.md (optional)
- CHECKLISTS = FEATURE_DIR/checklists/ (optional)
- CONSTITUTION = `.specific/constitution.yaml` (if present)

Abort with a clear message if `spec.md` is missing (point the user at
`/speckit-specify`). For single quotes in args like "I'm Groot", use escape syntax:
e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

### 2. Load the skill experience

If `.specific/speckit-review.md` exists, read it and fold its accumulated lessons into this
review: recurring findings, project-specific rules, and prior verdicts for this feature.
When the file is absent, continue without it. Do not treat the experience log as a source of
requirements — it only tunes how the review is performed.

### 3. Reuse the analyze + checklist findings (progressive disclosure)

Gather the review inputs with the least re-work:

- **Analyze findings**: if `/speckit-analyze` has run in this session, reuse its
  Specification Analysis Report (findings table, coverage summary, constitution
  alignment, metrics). If it has not, produce the same findings by applying
  `speckit-analyze`'s detection passes (duplication, ambiguity, underspecification,
  constitution alignment, coverage gaps, inconsistency) to the minimal artifact
  context.
- **Checklist status**: scan `checklists/requirements.md` (from `/speckit-specify`)
  and any custom checklists under `checklists/`. Treat markers as read-only:
  report counts of checked/unchecked items. Remember a checked item means the
  reviewer approved the requirement's quality, not that code exists.
- **Spec essentials**: from `spec.md` load Functional Requirements (FR-###),
  Success Criteria (SC-###), User Stories + acceptance scenarios, edge cases, and any
  remaining `[NEEDS CLARIFICATION]` markers.

### 4. Compute the verdict

A feature is **STABLE/DONE** only when all hold:

- No CRITICAL or HIGH findings from the analysis.
- No open `[NEEDS CLARIFICATION]` markers in `spec.md`.
- No constitution MUST violations.
- All mandatory spec sections are complete (no unresolved placeholders).
- The requirements-quality checklists relevant to the spec have no unchecked items
  that block readiness.

Otherwise it is **NEEDS-CHANGE**.

### 5. Produce the review report

Output a compact, verdict-first report:

```
## Spec Review: <feature name>

Verdict: STABLE/DONE   (or)   NEEDS-CHANGE

### Blockers to DONE
| ID | Severity | Location | Issue | Suggested fix |
|----|----------|----------|-------|---------------|
| A1 | HIGH     | spec.md:L120 | <finding> | <concrete edit> |

### Requirements-Quality Checklist
- requirements.md: 12/12 checked  ✓
- ux.md: 8 total, 3 unchecked  ✗  (list the unchecked items)

### Coverage
- Requirements: N   Tasks: M   Coverage: P%
- Unmapped tasks: <list or none>

### Verdict rationale
<1-3 sentences tying the verdict to the findings above>
```

Order `NEEDS-CHANGE` blockers CRITICAL/HIGH first. Reference stable IDs and exact
locations so the user can act without re-analysis.

### 6. Write the result back (auto-apply, no prompt)

Apply the review's outcome to project context. Do not ask first.

**6a. Refresh `.specific/project.yaml`** from the reviewed `plan.md`. Use the existing
deterministic merge helper — do not hand-edit the YAML:

```sh
SKILL_DIR="$(cd "$(dirname "<this SKILL.md>")" && pwd -P)"   # resolves the skill symlink
SOURCE_ROOT="$(cd "$SKILL_DIR/../.." && pwd)"
python3 "$SOURCE_ROOT/.agents/skills/ingest-project/scripts/update_project_yaml.py" \
  --project-yaml "<repo_root>/.specific/project.yaml" \
  --arch-json '<{"framework":...,"language":...,"database":...,"unit_test_framework":...} derived from plan.md>' \
  --apply
```

- Derive the architecture values from the reviewed `plan.md`; omit any key you cannot
  support with evidence (a blank value keeps the existing entry — never invent one).
- The helper fills `summary` only when empty, refreshes `architecture.*`, and preserves the
  user's `name`, `rules`, and `skills`. Report the `changes:` lines it prints.
- If the helper is unavailable, report that and skip this sub-step. Never hand-write
  architecture facts.

**6b. Append to `.specific/speckit-review.md`** (the skill-experience log). Create it when
absent with:

```markdown
# speckit-review experience

Accumulated lessons from previous reviews. Read before each review; append one entry per run.

## Entries
```

Then append one dated entry per review (newest at the bottom, never rewrite earlier
entries):

```text
YYYY-MM-DD HH:MM: review <feature>
- Verdict: STABLE/DONE | NEEDS-CHANGE
- Findings: <n> CRITICAL, <n> HIGH, <n> MEDIUM, <n> LOW
- Lessons: <what to check or do differently next run>
```

Use a 24-hour clock. Keep each entry short. If the newest entry is byte-identical to the one
you would add, skip and report "already recorded".

### 7. Suggest the next change (when NEEDS-CHANGE)

For each blocker, give a **concrete, minimal** suggestion:

- Ambiguity → the specific quantity/criterion to add.
- Missing scenario/edge case → the requirement to append.
- Coverage gap → which task to add or which spec item to drop.
- Constitution conflict → the clause to reconcile (and that a constitution change
  is a separate, explicit action).

Then name the command that applies it: `/speckit-clarify` (resolve open questions),
`/speckit-specify` (refine requirements), `/speckit-plan` (architecture), or
`/speckit-checklist` (requirements-quality items). Do not invoke them.

When the verdict is **STABLE/DONE**, do not prompt for confirmation: report the verdict and
recommend the next step (`/speckit-plan` if no plan, `/speckit-tasks` if no tasks, otherwise
`/speckit-implement`).

### 8. Check for extension hooks

After reporting and write-back, check if `.specific/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.after_review` key
- If the YAML cannot be parsed or is invalid, do not skip silently: tell the user that `.specific/extensions.yml` could not be read (include the parser error) and that no hooks were checked, including any mandatory (`optional: false`) hooks registered there, then continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-empty `condition`, skip the hook and leave condition evaluation to the HookExecutor implementation
- When constructing command invocations from hook command names, replace dots (`.`) with hyphens (`-`). For example, `speckit.git.commit` → `/speckit-git-commit`.
- For each executable hook, output the following based on its `optional` flag:
  - **Optional hook** (`optional: true`):
    ```
    ## Extension Hooks

    **Optional Hook**: {extension}
    Command: `/{command}`
    Description: {description}

    Prompt: {prompt}
    To execute: `/{command}`
    ```
  - **Mandatory hook** (`optional: false`):
    ```
    ## Extension Hooks

    **Automatic Hook**: {extension}
    Executing: `/{command}`
    EXECUTE_COMMAND: {command}
    ```
    After emitting the block above you MUST actually invoke the hook and wait for it to finish before continuing. Run it the same way you would run the command yourself in this agent/session (the invocation may differ from the literal `{command}` id shown above, e.g. a skills-mode agent runs it as `/skill:speckit-...` or `$speckit-...`). Emitting the block alone does not run the hook.
- If no hooks are registered or `.specific/extensions.yml` does not exist, skip silently

## Output Style

- Verdict first, then evidence.
- Markdown tables for findings; cite `spec.md:LNN` and requirement IDs.
- Cite the reused sources (`speckit-analyze` report, checklist counts) explicitly.
- Report the two write-back paths and the helper's `changes:` lines.
- No emojis unless requested. Never modify the spec artifacts.

## Done When

- [ ] Active feature and artifacts resolved
- [ ] Skill experience (`.specific/speckit-review.md`) loaded when present
- [ ] Analyze findings and checklist status reused (or freshly derived when absent)
- [ ] A single STABLE/DONE or NEEDS-CHANGE verdict given with rationale
- [ ] `.specific/project.yaml` `architecture`/`summary` refreshed via `update_project_yaml.py` (or skipped-and-reported when the helper is unavailable)
- [ ] One entry appended to `.specific/speckit-review.md` (idempotent)
- [ ] For NEEDS-CHANGE: concrete fixes + the command to apply them
- [ ] `spec.md`, `plan.md`, `tasks.md`, and the constitution left unmodified
- [ ] Extension hooks dispatched or skipped per the rules above
