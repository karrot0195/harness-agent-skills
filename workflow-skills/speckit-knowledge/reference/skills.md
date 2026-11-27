<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Agent Skills

Command Code supports Agent Skills - a lightweight, open standard for extending AI agents with specialized knowledge and workflows.

---

## What are Agent Skills?

Agent Skills are modular, self-contained instruction sets that teach Command Code how to perform specific tasks. Each skill is a folder containing a `skill.md` file with metadata and step-by-step guidance.

Think of skills as expert playbooks that Command Code can reference when needed. Instead of explaining the same process repeatedly, you define it once in a skill, and Command Code automatically applies it when needed.

---

## How skills work

Skills use **progressive disclosure** to manage context efficiently:

1. **Discovery**: Command Code loads only the name, description, and file path of each skill at startup.
2. **Activation**: When a task matches a skill or invoked directly with `/skill-name`, Command Code reads its full `SKILL.md` instructions.
3. **Execution**: Command Code follows the instructions, optionally loading referenced files as needed.

This keeps Command Code fast while giving access to more context on demand.

---

## Quickstart

Let's create your first user-level and project-level skill.

### User-level skill

**Create a global code review skill**
```bash
mkdir -p ~/.commandcode/skills/code-review
cat > ~/.commandcode/skills/code-review/SKILL.md << 'EOF'
---
name: code-review
description: Perform thorough code reviews checking for bugs, security issues, and best practices
---

# Code Review Checklist

When reviewing code, check:

## Security

- [ ] No hardcoded credentials or API keys
- [ ] Input validation on all user data
- [ ] Proper authentication and authorization

## Code Quality

- [ ] Clear, descriptive variable names
- [ ] Functions do one thing well
- [ ] No code duplication
- [ ] Edge cases handled

## Performance

- [ ] No unnecessary loops or operations
- [ ] Efficient data structures
- [ ] Database queries optimized

## Testing

- [ ] Unit tests cover main functionality
- [ ] Edge cases tested
- [ ] Error conditions tested

EOF
```

### Project-level skill

**Create a project-specific API skill**

```bash
mkdir -p .commandcode/skills/api-guidelines
cat > .commandcode/skills/api-guidelines/SKILL.md << 'EOF'
---
name: api-guidelines
description: API design patterns and conventions for this project
---

# API Guidelines

## Endpoint naming
- Use plural nouns: `/users`, `/posts`
- Use kebab-case: `/user-profiles`
- Version in URL: `/v1/users`

## Response format
\```json
{
  "data": { ... },
  "meta": { "count": 10, "page": 1 }
}
\```

## Error handling
- 400: Bad request (validation errors)
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Server error
EOF
```

### Using `.agents/skills/` instead

If you already have skills in `.agents/skills/`, Command Code picks them up automatically. No migration needed.

`.commandcode/skills/` takes priority on name conflicts. Skills from `.agents/` show a `[.agents]` badge in the `/skills` UI.

---

## Storage locations

Command Code fully implements the [Agent Skills open standard](https://agentskills.io) with two storage locations:

### User-level skills (global)

Stored in `~/.commandcode/skills/` and available across **all your projects**.

Perfect for:

- General development workflows
- Exploratory workflows
- Cross-project best practices

### Project-level skills (local)

Stored in `.commandcode/skills/` within your project and **only available in that project**.

Perfect for:

- Project-specific patterns
- Team conventions
- Architecture guidelines
- Domain-specific workflows

  Learn more about how to create user-level and project-level skills in the [Create skills](#create-skills) section below.

### `.agents/skills/` compatibility

Command Code also discovers skills from `.agents/skills/` (project) and `~/.agents/skills/` (user). If another tool already stores your skills under `.agents/`, they load automatically and show a `[.agents]` badge in the `/skills` menu.

**Priority:** `.commandcode/skills/` wins on name conflicts. If the same skill exists in both, the `.commandcode/` version is used and the `.agents/` version is skipped. See [Selection priority](#selection-priority) for the full four-way order.

**Discovery:** Command Code walks up to 10 directory levels from your working directory to find `.agents/skills/`, stopping at your home directory. This keeps `~/.agents/skills/` from being picked up as a project-level source.

### Extra locations

Beyond the standard directories, you can point Command Code at any skills folder - a directory of skills, or a single skill directory containing `SKILL.md`.

**In settings** - add a `skills` array to `settings.json` (user-global `~/.commandcode/settings.json`, project `.commandcode/settings.json`, or `.commandcode/settings.local.json`):

```json  theme={null}
{
  "skills": [
    "~/team/shared-skills",
    "./vendor/skills",
    "/opt/company/skills"
  ]
}
```

`~/` expands to your home directory; relative paths resolve against the project root (the git root, or the working directory outside a repo). Settings layers overwrite the array whole - the highest layer that defines `skills` wins. This is also the way to load a skills folder kept outside the standard locations like `~/.commandcode/skills` - a shared team drive, or a folder maintained for another Agent-Skills tool.

**At launch** - the `--skill` flag adds a location for one session and is repeatable; `--no-skills` skips discovery entirely (paths given via `--skill` still load):

```bash  theme={null}
cmd --skill ./my-skill --skill ~/team/shared-skills
cmd --no-skills                      # run with no skills at all
cmd --no-skills --skill ./only-this  # run with exactly one skill
```

### Nested skill folders

Discovery is recursive: a location may group skills under intermediate directories, and each skill is still the directory that directly contains `SKILL.md`.

```text  theme={null}
.commandcode/skills/
├── docs/
│   ├── changelog-writer/
│   │   └── SKILL.md
│   └── release-notes/
│       └── SKILL.md
└── code-review/
    └── SKILL.md
```

The `name` field still matches the skill's own directory (`changelog-writer`), not the grouping folder. A skill's own subfolders (`scripts/`, `references/`, `assets/`) are never scanned for more skills.

### Selection priority

Skills, custom commands, and built-ins all share the same `/` menu. Skill locations are checked in this order:

1. `.commandcode/skills/` (project)
2. `.agents/skills/` (project)
3. `~/.commandcode/skills/` (user)
4. `~/.agents/skills/` (user)
5. Extra locations (`--skill` flags first, then settings `skills` entries)
6. Bundled skills that ship with Command Code

Put simply: project-level always trumps user-level, and within the same level `.commandcode/` is favored over `.agents/`.

Command Code includes several ready-to-use skills. For example, `/skill-builder` creates and validates a new skill, `/design` provides a UI workflow, and [`/loop`](https://commandcode.ai/docs/background-tasks#scheduled-tasks-and-loops) runs a task now and schedules later iterations. A project or user skill with the same name can override a bundled skill through the normal precedence rules.

When two locations provide the same skill name, the higher-precedence copy wins and every shadowed copy is reported as a **Duplicate names** warning in the `/skills` issues view and `cmd skills list --debug` - a shadowed skill is never dropped silently.

**What happens on a collision.** When a skill name matches a built-in or a custom command:

- Typing `/<name>` always resolves to the higher-precedence owner - the skill is not invoked.
- Run the skill as `/skill:<name>` instead. The `skill:` namespace skips the precedence ladder entirely and can only ever resolve to a skill, so it works for every skill, shadowed or not. Typing `/skill:` on its own lists all of them.
- The skill still appears in the `/` menu with a `[skill]` badge and a ` - shadowed by /<owner>, runs as /skill:<name>` note, and selecting that row inserts the namespaced form. Command Code prefers visibility with a marker over silently dropping the row.

---

## Browse and use skills

Use the `/skills` slash command to view all your skills:

**Open skills menu**
```bash
# In Command Code session
/skills
```

This opens an interactive menu showing:

- All user-level skills with `(user)` label
- All project-level skills with `(project)` label
- Skills from `.agents/skills/` (user or project) show a dim `[.agents]` badge
- Use **arrow keys** to navigate
- Press **Enter** to open any skill in your editor (or toggle it - see [Enable or disable skills](#enable-or-disable-skills))
- Press **Esc** to close and return to your session

Every installed skill is also surfaced as a first-class slash command in the `/` menu. If you install a skill named `pr-desc`, you will see `/pr-desc`, sorted after built-ins and any custom commands in the slash menu.

If a skill name collides with a built-in or a custom command, the skill still appears in the `/` menu with a `[skill]` badge and a ` - shadowed by /<owner>` note. Typing `/<name>` always resolves to the higher-precedence owner, not the skill - use `/skill:<name>` to run the skill itself. See [Selection priority](#selection-priority) above for the full order.

---

## Invoking a skill

Command Code supports three ways to use a skill in a conversation. Pick whichever matches the task at hand.

### 1. Exact slash invocation

Type `/skill-name` at the start of your prompt to run that skill for the current turn:

```bash
# In Command Code session
/pr-desc update the description based on new changes
```

Every skill also answers to the namespaced form `/skill:<name>`, which never
resolves to anything but a skill:

```bash
# In Command Code session
/skill:changelog          # the changelog skill, not the built-in /changelog
/skill changelog          # same thing, space instead of colon
/skill:                   # browse every skill in the menu
```

Reach for it when a skill's name is taken by a built-in or custom command - see
[What happens on a collision](#selection-priority).

### 2. Inline slash reference

Drop `/skill-name` anywhere inside a longer prompt to pin that skill without losing your natural phrasing. You can mix multiple skills in a single prompt:

```bash
# In Command Code session
Please follow /code-conv when writing the new module and /pr when opening the review PR.
```

### 3. Inferred suggestion

Command Code scans your prompt and suggests a matching skill when one clearly fits. Ordinary prompts keep working exactly like before - inferred suggestions just help you discover what is available.

---

## Create skills

  The fastest way to create a skill is to ask Command Code to build it for you. The bundled `skill-builder` skill walks the agent through scoping the job, picking a valid name and location, writing spec-compliant frontmatter, and verifying the result loads - just describe the workflow you want captured, or invoke `/skill-builder` directly.

### User-level skills

User-level skills are available across **all your projects**.

**Location:** `~/.commandcode/skills/`

**Create a user skill**
```bash
# Create the directory
mkdir -p ~/.commandcode/skills/my-skill

# Create the SKILL.md file

cat > ~/.commandcode/skills/my-skill/SKILL.md << 'EOF'

---
name: my-skill
description: What this skill does and when to use it
---

# My Skill

Instructions for Claude...
EOF
```

**Use cases:**

- Personal coding preferences
- General development workflows
- Cross-project best practices
- Your own code style guidelines

**Example:**

**Code review skill**

```bash
mkdir -p ~/.commandcode/skills/code-review
cat > ~/.commandcode/skills/code-review/SKILL.md << 'EOF'
---
name: code-review
description: Perform thorough code reviews checking for bugs, security issues, and best practices
---

# Code Review Checklist

## Security
- [ ] No hardcoded credentials or API keys
- [ ] Input validation on all user data
- [ ] Proper authentication and authorization

## Code Quality
- [ ] Clear, descriptive variable names
- [ ] Functions do one thing well
- [ ] No code duplication

## Performance
- [ ] No unnecessary loops
- [ ] Efficient data structures
- [ ] Optimized queries

## Testing
- [ ] Unit tests cover main functionality
- [ ] Edge cases tested
- [ ] Error conditions handled
EOF
```

### Project-level skills

Project-level skills are available only in **that specific project**.

**Location:** `.commandcode/skills/` (in your project root)

**Create a project skill**
```bash
# Create the directory
mkdir -p .commandcode/skills/my-skill

# Create the SKILL.md file

cat > .commandcode/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: What this skill does and when to use it
---

# My Skill

Instructions for Claude...
EOF
```

**Use cases:**

- Project-specific patterns
- Team conventions
- Architecture guidelines
- Domain-specific workflows

**Example:**

**API guidelines skill**
```bash
mkdir -p .commandcode/skills/api-guidelines
cat > .commandcode/skills/api-guidelines/SKILL.md << 'EOF'
---
name: api-guidelines
description: API design patterns and conventions for this project
---

# API Guidelines

## Endpoint naming
- Use plural nouns: `/users`, `/posts`
- Use kebab-case: `/user-profiles`
- Version in URL: `/v1/users`

## Response format
Always return JSON with this structure:
\```json
{
  "data": { ... },
  "meta": { "count": 10, "page": 1 },
  "errors": []
}
\```

## Error codes
- 400: Bad request (validation errors)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not found
- 500: Server error

## Authentication
All endpoints require Bearer token in Authorization header except:
- POST /v1/auth/login
- POST /v1/auth/register
EOF
```

You can also install community skills directly from GitHub without manually creating files - see [`cmd skills add`](#cmd-skills-add) in the command reference.

---

## Edit skills

You can edit using the `/skills` command.

1. Type `/skills` in Command Code
2. Navigate to the skill you want to edit
3. Press Enter

This opens the `SKILL.md` file in your default editor (configured via `$EDITOR` environment variable).

### Manual editing

You can also edit skills directly via the following paths:

**Edit a skill**
```bash
# Edit user-level skill
code ~/.commandcode/skills/my-skill/SKILL.md

# Edit project-level skill
code .commandcode/skills/my-skill/SKILL.md

# Edit a skill from .agents/ (if you use that convention)
code .agents/skills/my-skill/SKILL.md
```

After editing, the changes are immediately applied and ready to use. No restart is required.

### Setting up your editor

The `/skills` command uses your `$EDITOR` environment variable to open files. See [setting up your editor](https://commandcode.ai/docs/interactive-mode#setting-up-your-editor) for setup instructions.

---

## Enable or disable skills

Toggle a skill on or off without deleting it. Disabled skills are hidden from the model and won't be invoked.

In the `/skills` picker, highlight a skill and press **Enter** to toggle it.

### Where the setting lives

Disabled skills are tracked under the `disabledSkills` key in a `settings.json` file. Command Code looks for settings.json in the following paths:

| **Scope** | **Config file** | **Applies to** |
| --------- | --------------- | ----------------- |
| User | `~/.commandcode/settings.json` | Across all projects |
| Project | `.commandcode/settings.json` | Anyone using the project |

The shape is the same in both settings files:

```json  theme={null}
{
  "disabledSkills": ["blogster", "r0"]
}
```

To disable a skill across every project on your machine, edit `~/.commandcode/settings.json` directly. The next session will pick it up.

---

## Organizing skills

You can organize your skills using the following best practices:

### Single skill per directory

Each skill must be in its own directory:

```text  theme={null}
.commandcode/skills/
├── code-review/
│   └── SKILL.md
├── api-guidelines/
│   └── SKILL.md
└── testing-patterns/
    └── SKILL.md
```

Skills can also be grouped under intermediate folders - see [Nested skill folders](#nested-skill-folders).

### Adding supporting files

Skills can include additional files:

```text  theme={null}
my-skill/
├── SKILL.md          # Required
├── scripts/          # Executable code
│   ├── process.py
│   └── validate.sh
├── references/       # Additional docs
│   ├── API_REFERENCE.md
│   └── EXAMPLES.md
└── assets/           # Templates, resources
    ├── template.json
    └── schema.sql
```

Reference these files in your `SKILL.md`:

```markdown  theme={null}
See [API Reference](references/API_REFERENCE.md) for details.

Run the validation script:
\```bash
scripts/validate.sh
\```
```

---

## Naming conventions

### Skill names

* Use lowercase letters, numbers, and hyphens only
* Max 64 characters
* Must not start or end with hyphen
* No consecutive hyphens

**Good names:**

```
code-review
api-guidelines
testing-patterns
commit-messages
```

**Bad names:**

```
CodeReview       # uppercase not allowed
code_review      # underscores not allowed
-code-review     # cannot start with hyphen
code--review     # consecutive hyphens
```

### Directory names

The directory name must match the skill `name` field:

```text  theme={null}
code-review/             # Directory name
└── SKILL.md             # Must have: name: code-review
```

---

## Skills specification

Every `SKILL.md` file should start with the frontmatter block followed by the markdown instructions in the body.

### Frontmatter (required)

```md
---
name: skill-name
description: A description of what this skill does and when to use it.
---
```

You can add the following optional fields to the frontmatter as needed:

```md
---
name: pdf-processing
description: Extract text and tables from PDF files, fill forms, merge documents.
license: Apache-2.0
compatibility: Requires pdfplumber and PyPDF2 packages
metadata:
  author: example-org
  version: "1.0"
allowed-tools: Read Bash(python:*)
---
```

|      Field      | Required |                                                    Constraints                                                    |
| --------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `name`          | Yes      | Max 64 characters. Lowercase letters, numbers, and hyphens-separated only. Should not start or end with a hyphen. |
| `description`   | Yes      | Max 1024 characters. Describes what the skill does and when to use it.                                            |
| `license`       | No       | License name or reference to a bundled license file.                                                              |
| `compatibility` | No       | Max 500 characters. Describes environment requirements (packages, system tools, network access, etc.).            |
| `metadata`      | No       | Arbitrary key-value mapping for additional metadata (author, version, etc.).                                      |
| `allowed-tools` | No       | Space-delimited list (or YAML array) of pre-approved tools the skill may use. (Experimental)                      |

Command Code also honors these extension fields. Several mirror the Agent Skills / Claude Code frontmatter so a skill authored for another agent loads unchanged; tools that don't recognize a field ignore it safely:

|            Field           | Required |                                                                Behavior                                                                 |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `argument-hint`            | No       | Shown next to the skill in the `/` menu so you know what arguments it expects (e.g. `argument-hint: "<branch> [--draft]"`).             |
| `when_to_use`              | No       | Extra trigger context (trigger phrases, example requests) appended to the description in the model-facing catalog, so auto-invocation matches on it too. |
| `disable-model-invocation` | No       | When `true`, the skill is hidden from the model entirely - it never appears in the skill catalog and can't be auto-loaded. Only an explicit `/skill-name` invocation runs it. Use for destructive or highly contextual workflows. |
| `user-invocable`           | No       | When `false`, the skill stays model-invocable but is hidden from the `/` menu. Use for background knowledge that isn't a command you'd run by hand. |
| `disallowed-tools`         | No       | Space-delimited list (or YAML array) of tools the skill should not use. Parsed and surfaced alongside `allowed-tools`.                  |
| `arguments`                | No       | Ordered names for positional arguments (`arguments: issue branch`), enabling `$issue` / `$branch` placeholders in the body.             |
| `model`                    | No       | Pin a model for the skill's work.                                                                                                        |
| `effort`                   | No       | Reasoning-effort hint for the skill's work (`low`, `medium`, `high`, `xhigh`, `max`, or `inherit`).                                     |

### Body content

The markdown body that follows the frontmatter contains the skill instructions. There are no format restrictions. Write whatever helps Command Code perform the task effectively.

Recommended sections:

* **When to use this skill**: Clear triggers for activation
* **Step-by-step instructions**: Detailed guidance
* **Examples**: Input/output examples
* **Common edge cases**: Known pitfalls and solutions

  Keep your main `SKILL.md` under 500 lines. Move detailed reference material to separate files in `references/`.

### Arguments and context substitution

When you invoke a skill with `/skill-name <args>`, Command Code substitutes these placeholders in the body before the model sees it:

| Placeholder | Expands to |
| ----------- | ---------- |
| `$ARGUMENTS` | All arguments as a single string. If the body has no placeholder, non-empty arguments are appended as an `ARGUMENTS: …` footer. |
| `$ARGUMENTS[N]` / `${N}` | The Nth argument, 0-indexed (`$ARGUMENTS[0]` / `${0}` is the first). |
| `$name` | A [declared named argument](#skills-specification). With `arguments: issue branch`, `$issue` is the first argument and `$branch` the second. Only declared names are replaced. |
| `${COMMANDCODE_SKILL_DIR}` | Absolute path to the skill's own directory - use it to reference bundled `scripts/` or `references/` regardless of the working directory. |
| `${COMMANDCODE_PROJECT_DIR}` | The project root (git root, otherwise the current directory). |
| `${COMMANDCODE_SESSION_ID}` | The current session id, when available. |
| `${COMMANDCODE_EFFORT}` | The active reasoning-effort level, when available. |

The `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_SESSION_ID}`, and `${CLAUDE_EFFORT}` aliases resolve to the same values, so a skill written for Claude Code works unchanged. Only these known tokens are substituted - any other `${...}` (for example a literal `${HOME}`) is left untouched.

All placeholders substitute in a single pass and arguments are inserted literally: argument text that itself looks like a placeholder (`$ARGUMENTS`, `$$`, a declared `$name`) lands as-is and is never expanded again.

### Dynamic context injection

A skill body can run shell commands and inline their output before the body reaches the model, so the model reads live data instead of a command. Two forms are recognized:

* **Inline** - `` !`git status --short` `` runs a single command. The `!` is only honored at the start of a line or directly after whitespace, so `KEY=!`cmd`` stays literal.
* **Fenced** - a ` ```! ` code block runs a multi-line script:

````md
```!
node --version
git rev-parse --short HEAD
```
````

Each placeholder is replaced with the command's output, once, left to right - output is never re-scanned for more placeholders. Commands run from the project directory, with the `COMMANDCODE_SKILL_DIR` / `COMMANDCODE_PROJECT_DIR` (and `CLAUDE_*` alias) values exported to their environment.

To turn this off - so opening a skill never shells out - set `disableSkillShellExecution: true` in `settings.json`. Every placeholder is then replaced with `[shell command execution disabled by policy]` instead of running.

### Optional directories

Your skill folder can also include these optional subdirectories to organize related files:

#### `scripts/`

Contains executable code that agents can run. Scripts should:

* Be self-contained or clearly document dependencies
* Include helpful error messages
* Handle edge cases gracefully

```text
my-skill/
├── SKILL.md
└── scripts/
    ├── extract.py
    └── process.sh
```

#### `references/`

Contains additional documentation that agents can read when needed:

```text
my-skill/
├── SKILL.md
└── references/
    ├── API_REFERENCE.md
    ├── FORMS.md
    └── TROUBLESHOOTING.md
```

Keep individual reference files focused. Command Code loads these on demand, so smaller files mean less context usage.

#### `assets/`

Contains static resources:

```text
my-skill/
├── SKILL.md
└── assets/
    ├── template.json
    ├── diagram.png
    └── schema.sql
```

---

## Command reference

Complete reference for all `cmd skills` commands. Install, list, and remove agent skills.

| Command | Description |
| ------- | ----------- |
| [`cmd skills add`](#cmd-skills-add) | Install a skill from a GitHub repository |
| [`cmd skills list`](#cmd-skills-list) | List all installed skills |
| [`cmd skills remove`](#cmd-skills-remove) | Remove an installed skill |

### cmd skills add

Install a skill from a GitHub repository into your project or global skills directory.

**cmd skills add**
```bash
cmd skills add <owner/repo> [options]
```

**Options**

| Option | Short | Description |
| ------ | ----- | ----------- |
| `--global` | `-g` | Install to global skills (`~/.commandcode/skills/`) |
| `--force` | `-f` | Overwrite if skill already exists |
| `--skill <name>` | `-s` | Pick a specific skill from a multi-skill repo |

**Examples**

**Single-skill repo**
```bash
cmd skills add acme/my-skills
```

**Specific path in repo**
```bash
cmd skills add acme/skills/path/to/skill
```

**Pick one skill from a multi-skill repo**
```bash
cmd skills add acme/multi-skills -s my-skill
```

**Specific branch**
```bash
cmd skills add acme/repo@branch
```

**Install globally**
```bash
cmd skills add acme/repo --global
```

**Install from community**
```bash
cmd skills add https://github.com/remotion-dev/skills --skill remotion-best-practices
```

**Install locations**

| Flag | Location | Availability |
| ---- | -------- | ------------ |
| _(default)_ | `.commandcode/skills/<skill-name>/` | Current project only |
| `--global` | `~/.commandcode/skills/<skill-name>/` | All projects on your machine |

**Multi-skill repos.** When a repo contains multiple skills and `--skill` is not specified, Command Code shows an interactive prompt to select which skills to install.

**Name collisions.** Skill names share the `/` menu with built-in commands (`/clear`, `/help`, `/share`, `/rewind`, …) and with the custom commands in `.commandcode/commands/`. Built-ins and custom commands take precedence - typing `/<name>` resolves to the owner, not to the skill.

If you install a skill whose name collides with one of those, `cmd skills add` still completes normally - nothing blocks the install. The skill then appears in the `/` menu with a `[skill]` badge and a `shadowed by /<owner>` note, and runs as `/skill:<name>`, while a plain `/<name>` continues to route to the higher-precedence owner. See [Selection priority](#selection-priority) for the full order.

### cmd skills list

List all installed skills, grouped by location.

**cmd skills list**
```bash
cmd skills list
```

**Options**

| Option | Description |
| ------ | ----------- |
| `--debug` | Show every skill that failed to load, grouped by error category |

**Output**

Shows all installed skills split into **Project** and **Global** sections:

**Example output**
```sh
Skills (3 installed)

Project (1)
  remotion-best-practices · Best practices for building Remotion video...

Global (2)
  frontend-design · Guidelines for building accessible, responsive UIs
  code-review · Comprehensive code review checklist for security and q...
```

If any skills failed to load, a quiet hint appears under the listing:

**With skipped skills**
```sh
5 skills skipped · run with --debug to see issues
```

Re-run with `--debug` to see the grouped report. Each row is categorized and tagged with the path and the one-line reason:

**cmd skills list --debug**
```bash
cmd skills list --debug
```

If no skills are installed, the command shows where it looked and how to install one:

**Empty output**
```sh
No skills installed.

Looking in:
  ~/.commandcode/skills/ (global)
  .commandcode/skills/ (project)
  ~/.agents/skills/ (global, .agents)
  .agents/skills/ (project, .agents)

Install a skill: cmd skills add <owner/repo>
```

### cmd skills remove

Remove an installed skill by name. Prompts for confirmation before deleting.

**cmd skills remove**
```bash
cmd skills remove <skill-name> [options]
```

**Options**

| Option | Short | Description |
| ------ | ----- | ----------- |
| `--global` | `-g` | Remove from global skills (`~/.commandcode/skills/`) |
| `--yes` | `-y` | Skip the confirmation prompt |

**Examples**

**Remove from project**
```bash
cmd skills remove remotion-best-practices
```

**Remove from global**
```bash
cmd skills remove frontend-design --global
```

**Skip confirmation**
```bash
cmd skills remove my-skill --yes
```

**Skill name rules.** Skill names must use lowercase letters, numbers, and hyphens only - no path separators, dots, or uppercase.

---

## Best practices

Follow these best practices to create effective and maintainable skills.

### Writing effective descriptions

Good descriptions help Command Code know when to use a skill:

**Specific and keyword-rich:**

```md
description: Extract text and tables from PDF files using pdfplumber. Use when user mentions PDFs, pdf files, document extraction, or needs to read PDF content.
```

**Too vague:**

```md
description: PDF tools
```

### Keep skills focused

Each skill should do one thing well:

**Focused:**

- `code-review` - Code review checklist
- `commit-messages` - Commit message format
- `testing-patterns` - Testing conventions

**Too broad:**

- `development` - All development tasks

### Pick a name that does not collide

Skill names share the `/` menu with built-in commands like `/clear`, `/help`, `/share`, and `/rewind`, and with any custom commands you define in `.commandcode/commands/`. Those take precedence - typing `/<name>` routes to the owner and the skill renders with a `shadowed by` note next to its `[skill]` badge.

Prefer task-oriented names that are unlikely to overlap:

**Safe:** `pr-desc`, `api-guidelines`, `release-notes`, `code-review`

**Risky:** `clear`, `help`, `share`, `rewind` - these are built-in.

### Use progressive disclosure

Keep `SKILL.md` concise. Move detailed content to `references/`, for example:

```markdown  theme={null}
# API Guidelines

Quick reference of our API patterns.

For complete documentation, see:
- [Authentication details](references/AUTH.md)
- [Error handling guide](references/ERRORS.md)
- [Versioning strategy](references/VERSIONING.md)
```

### Version control

Track your skills in Git:

**Git tracking**
```bash
# Add skills to git
git add .commandcode/skills/

# Commit
git commit -m "Add API guidelines skill"

# Share with team
git push
```

Don't ignore `.commandcode/skills/` - these should be shared with your team.

---

## Standard compliance

Command Code fully implements the [Agent Skills open standard](https://agentskills.io). Skills you create are:

* **Portable**: Work with any agent that supports the standard
* **Versionable**: Track changes with Git
* **Shareable**: Publish for your team or community
* **Auditable**: Plain text files anyone can read

Validation follows the standard strictly - including the rule that a skill's `name` must match its directory name. Skills that break a rule are skipped with a categorized warning (visible in `/skills` and `cmd skills list --debug`) rather than failing the session, and a missing or empty `description` always prevents loading. Command Code's extension fields (`argument-hint`, `disable-model-invocation`, `model`) live alongside the standard fields and are ignored by other implementations; unknown frontmatter fields from other tools are ignored in turn.

---

## Skills vs Taste

Skills are explicit, authored playbooks you write and share; [Taste](https://commandcode.ai/docs/taste) is the implicit, continuously-learned profile of your preferences. See the full guide at [commandcode.ai/blog/taste-skills-rules](https://commandcode.ai/blog/taste-skills-rules).

---

## Next steps

- [Set up your taste profile](https://commandcode.ai/docs/taste) to pair learned preferences with authored skills
- Join our [Discord community](https://commandcode.ai/discord) for support
