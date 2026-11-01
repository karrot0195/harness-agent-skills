---
name: "speckit-status"
description: "Check the current status of the active feature's tasks and artifacts, then suggest the next step in the speckit flow. Read-only: never modifies files."
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "local"
  source: "custom"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Give a concise, read-only snapshot of where the active feature stands in the speckit flow
(specify → clarify → plan → tasks → implement → analyze/checklist/converge) and recommend
the single most useful next command. Never modify files.

## Operating Constraints

- **Read-only**: Do not create, edit, or delete any file. Only read/search the filesystem and run
  non-mutating commands.
- **No implementation**: Do not write or change code. Point the user to the appropriate speckit
  skill for any action.
- **Evidence-based**: Cite the file paths and counts that support each status claim.

## Execution Steps

### 1. Resolve the active feature

1. Read `.specify/feature.json` (if present) for `feature_directory`.
2. If absent, look for the most recently modified directory under `specs/` and use it; if none,
   report that no feature is active and suggest `/speckit-specify` to start one.
3. Derive absolute paths: `FEATURE_DIR`, `SPEC`, `PLAN`, `TASKS`, `CHECKLISTS_DIR`.

### 2. Inventory artifacts

Check which of the following exist and report presence (✓) / absence (✗):

- `spec.md` — feature specification
- `plan.md` — implementation plan
- `tasks.md` — task breakdown
- `data-model.md`, `research.md`, `quickstart.md` — supporting docs
- `contracts/` — interface contracts
- `checklists/` — quality checklists (list each file)

### 3. Task progress (if tasks.md exists)

Parse `tasks.md` and count:

- Total tasks: lines matching `- [ ]`, `- [X]`, or `- [x]`
- Completed: lines matching `- [X]` or `- [x]`
- Pending: lines matching `- [ ]`
- Group by phase (the `## Phase ...` headings) and report per-phase counts

### 4. Determine the next step

Apply these rules in order to pick ONE recommended next command:

1. If no `spec.md` → recommend `/speckit-specify`.
2. If `spec.md` exists but no `plan.md` → recommend `/speckit-plan` (suggest `/speckit-clarify`
   first if the spec looks underspecified or has open questions).
3. If `plan.md` exists but no `tasks.md` → recommend `/speckit-tasks`.
4. If `tasks.md` exists with pending tasks → recommend `/speckit-implement`.
5. If all tasks are complete (`[X]`) → recommend `/speckit-converge` to verify nothing remains;
   if already converged, recommend `/speckit-analyze` or opening a PR.
6. If checklists exist with unchecked items → mention `/speckit-checklist` review.

### 5. Report

Output a compact status block:

```
Feature: <name> (<feature_dir>)
Artifacts: spec ✓  plan ✓  tasks ✓  checklists: 2 files
Tasks: 14 total, 9 done, 5 pending
  Phase 1 Setup: 3/3 done
  Phase 2 Foundational: 4/4 done
  Phase 3 US1: 2/7 done
Next: /speckit-implement (5 tasks remaining)
```

End with 1-2 optional follow-ups (e.g. "Want me to show the pending tasks?" or "Run
/speckit-converge after implement finishes?").

## Output Style

- Conversational and direct.
- Use markdown with a fenced code block for the status summary.
- Cite file paths inline where useful.
- No emojis unless requested.

## Done When

- [ ] Active feature resolved (or absence reported)
- [ ] Artifact inventory reported
- [ ] Task progress counted (if tasks.md present)
- [ ] A single recommended next command given with rationale
- [ ] No files modified