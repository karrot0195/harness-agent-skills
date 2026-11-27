---
name: speckit-builder
description: "Author a new Agent Skill for Command Code end to end — scaffold the directory, write valid SKILL.md frontmatter, structure instructions for progressive disclosure, and verify the skill loads. Use when the user wants to create, build, or generate a skill, turn a repeated workflow into a reusable skill, or fix a skill that fails validation."
compatibility: "Requires Command Code CLI (`cmd`) available"
metadata:
  author: "github-spec-kit + custom"
  source: "workflow-skills/speckit-builder/SKILL.md"
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Workflow

### Step 1. Pin down the job

Before writing anything, get concrete answers to three questions — from the conversation if already there, otherwise ask:

- **What does the skill do?** One capability per skill. If two unrelated jobs are described, propose splitting.
- **When should an agent reach for it?** The trigger phrases and task shapes. These become the `description`.
- **What does it need?** Scripts, templates, reference documents, external tools. These decide whether the skill needs supporting files.

### Step 2. Choose name and location

Name rules (enforced at load time):

- 1–64 characters; only `a-z`, `0-9`, and hyphens
- No leading, trailing, or consecutive hyphens
- **Must equal the directory name** — `my-skill/SKILL.md` declares `name: my-skill`

Prefer a verb-or-domain name. Location scope:

| Location | Scope |
|---|---|
| `.commandcode/skills/<name>/` at project root | everyone in this repo |
| `~/.commandcode/skills/<name>/` | this user, every project |
| `.agents/skills/<name>/` | shared across tooling |

Default to project location when repo-specific, user location when personal habit.

### Step 3. Write the frontmatter

Required fields:

```yaml
---
name: changelog-writer
description: Draft changelog entries from merged PRs. Use when the user asks for a changelog or release notes.
---
```

The `description` carries discovery. Under 1024 chars; name verbs and artifacts.

Optional fields (all standard-compliant): `license`, `compatibility`, `metadata`, `allowed-tools`.

Command Code extensions: `argument-hint`, `disable-model-invocation`, `model`.

### Step 4. Write the body

Structure for an agent: imperative steps, exact commands, decision rules, and one worked example. Budget for progressive disclosure (three tiers: metadata → SKILL.md body → supporting files). Keep under ~500 lines; move long material to `references/` or `scripts/`.

Conventional subdirectories: `scripts/` (executables), `references/` (documentation), `assets/` (templates/static). Positional arguments available as `$ARGUMENTS` and `$ARGUMENTS[N]`.

### Step 5. Verify

1. Re-read frontmatter against rules (especially name ↔ directory match).
2. Run `cmd skills list` — the skill must appear with no warning.
3. Invoke once with `/name` and confirm the agent follows the body; trim what it did not need.

## Pre-Execution Hooks

Check `.specific/extensions.yml` for `hooks.before_builder`. Apply same filtering/dispatch logic as other workflow skills.

## Post-Execution Hooks

Check `.specific/extensions.yml` for `hooks.after_builder`. Invoke mandatory hooks; report optional ones.

## Completion Report

Report the created skill path, name, and verification status.
