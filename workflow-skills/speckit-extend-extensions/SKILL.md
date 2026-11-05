---
name: "speckit-extend-extensions"
description: "Extend a project's .specific/extensions.yml by adding a hook entry for a given lifecycle event and purpose. Use when the user wants to register a new hook (e.g. before_tasks, after_implement) with a stated purpose, or to add a reminder/purpose note under an extension hook event."
compatibility: "Requires a spec-kit project with a .specific/ directory"
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

Add one hook entry to `.specific/extensions.yml` under a chosen lifecycle event,
capturing its **purpose** as the entry's `description`. The file is the project-level
hook configuration consumed by the `speckit-*` skills; this skill only appends a
single entry and never removes or reorders existing ones.

## Reference

Hook schema and configuration rules:
https://github.github.io/spec-kit/extensions/api.html#hook-configuration

Standard hook events (defined by core spec-kit commands):

- `before_specify`, `after_specify`
- `before_plan`, `after_plan`
- `before_tasks`, `after_tasks`
- `before_implement`, `after_implement`
- `before_analyze`, `after_analyze`
- `before_checklist`, `after_checklist`
- `before_clarify`, `after_clarify`
- `before_constitution`, `after_constitution`

(Other event names are allowed if the project uses them; validate only that the
name is a non-empty `before_*`/`after_*` style token.)

## Input parsing

The user input is `"<hook> <purpose>"`:

- **hook** — the lifecycle event name (first token).
- **purpose** — the rest of the input, the reason/intent for the hook (may be
  quoted).

If either is missing or ambiguous, ask the user before writing. Do not invent a
purpose the conversation does not support.

## Execution Steps

### 1. Resolve `.specific/extensions.yml`

1. Use `.specific/extensions.yml` at the project root.
2. If it does not exist, create it from `template/output/extensions.template.yaml`
   in the skills repo (resolve via `git -C "<skill-dir>" rev-parse --show-toplevel`);
   if unavailable, use this inline fallback:

   ```yaml
   apiVersion: agent-skills/v1
   kind: Extensions
   hooks: {}
   ```

3. If it exists but cannot be parsed as YAML, stop and report the parser error;
   do not overwrite.

### 2. Ensure structure

Ensure the document has top-level `apiVersion: agent-skills/v1`, `kind: Extensions`,
and a `hooks` mapping. Add missing keys without clobbering existing ones.

### 3. Add the entry

1. Normalize the hook name (lowercase, underscores).
2. Under `hooks.<hook>`, ensure a list exists.
3. Append `{"description": "<purpose>"}` unless an entry with the identical
   `description` already exists (then skip and report "already present").
4. For a **purpose-only** reminder (no executable command), the entry stays as
   `description` only — matching the existing convention in this repo.

   If the user instead wants an **executable** hook, collect the additional fields
   defined by the hook configuration reference (`extension`, `command`, `enabled`,
   `optional`, `priority`, `prompt`, `condition`) and include them in the entry.
   Only add fields the user actually specifies; do not fabricate `command`/`extension`.

### 4. Write back

Serialize the document with `yaml.safe_dump` (sort_keys=False, allow_unicode=True)
and write atomically. Preserve the existing file's other entries exactly.

### 5. Report

State the hook event and the purpose that was added (or that it was already
present), and remind the user of the reference URL for the full hook schema.

## Operating Constraints

- **Append-only**: never remove or reorder existing hooks/entries.
- **No silent overwrite**: on parse error or conflict, stop and report.
- **One entry per call**: do not batch unrelated hooks.
- **No other files touched**: only `.specific/extensions.yml`.

## Done Criteria

- `.specific/extensions.yml` parses as YAML.
- The new entry appears under the requested hook event with the stated purpose.
- Existing entries are unchanged.
