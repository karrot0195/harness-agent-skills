<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Custom Agents

A subagent is a separate worker Command Code hands a task to. It runs in its own context window with its own tools, system prompt, and (optionally) its own model. Command Code can run several at once, so work like editing three modules can happen in parallel instead of one at a time.

Three built-in agents are always available: **General**, **Explore**, and **Plan**. You can add your own as Markdown files.

---

## Quick start

The fastest way to make a subagent is to ask for one:

```text
create a code-reviewer subagent that reviews diffs for bugs and security issues
```

Command Code writes the agent file for you. From then on it delegates to that agent when the task matches.

To manage agents yourself, run:

```text
/agents
```

That's it for getting started. The rest of this page covers making agents by hand, how delegation works, and the full file reference.

---

## Built-in agents

These ship with Command Code and are always available. They're read-only - you can't edit or delete them.

| **Agent** | **When it runs** | **Tools** |
| --------- | ---------------- | --------- |
| **General** | The default when no other agent fits. Research and multi-step tasks. | All tools |
| **Explore** | Codebase search and understanding that touches many files. | Read-only: `read_file`, `read_directory`, `grep` |
| **Plan** | Designing an approach and weighing trade-offs. | `read_file` |

When Command Code delegates without naming an agent, the task goes to **General**.

---

## Creating an agent

### Ask Command Code (recommended)

Describe the agent in plain language, as shown in [Quick start](#quick-start). Command Code drafts the name, description, system prompt, and a sensible tool set, then saves the file. You review and adjust.

Choosing **Create agents with Command Code** in the `/agents` menu shows the same thing - it points you back to just asking:

```text
 Create agents with Command Code

 Ask Command Code to create or update subagents for you, e.g.

   ‣ "create a code-reviewer subagent that reviews diffs for bugs"
   ‣ "make a changelog agent that uses a fast model"

 Or edit the files directly:

   • .commandcode/agents/    (this project)
   • ~/.commandcode/agents/  (all projects)

 Docs: https://commandcode.ai/docs/core-concepts/custom-agents

 Press Enter to go back and just ask
```

### The /agents manager

Run `/agents` to open the manager. It lists two create actions, your custom agents grouped by scope, and the read-only defaults.

```text
 Agents (2 agents)

   1. Create agents with Command Code (recommended)
   2. Create manually

   User agents
 > changelog-writer
   release-notes

   Project agents
   code-reviewer

   Default agents (read-only)
   General
   Explore
   Plan

 ↑↓ navigate · Enter to select · Esc to close

 Agents live in .commandcode/agents/ (project) and
 ~/.commandcode/agents/ (all projects) - edit the files directly anytime.
 Docs: https://commandcode.ai/docs/core-concepts/custom-agents
```

Sections only appear when they have agents. With no custom agents, the title reads `Agents (No custom agents)`.

### The manual wizard

Pick **Create manually** to fill in every field yourself. The steps are: location → identifier → system prompt → description → tools → model → confirm.

**Choose where it lives:**

```text
 Create new agent
 Choose location

 > 1. Project (.commandcode/agents/)
   2. Personal (~/.commandcode/agents/)
```

Project agents are committed with the repo and shared with your team. Personal agents live in your home directory and work in every project.

**Name it, prompt it, describe when to use it.** Three steps set the identifier (must be unique, not a reserved name), the system prompt, and the description Command Code matches against to decide when to delegate.

```text
 Create new agent
 Agent type (identifier)

 Enter a unique identifier for your agent:

 > code-reviewer_
   e.g. code-reviewer, unit-tester

 Enter to continue · Esc to cancel
```

**Select tools.** Categories toggle groups; **Show advanced options** lists individual tools. The first row saves your choice.

```text
 Create new agent
 Select tools

 > [ Continue ]
   ────────────────────────────────
   [x] Read-only tools
   [x] Edit tools
   [ ] Execution tools
   [x] Search tools
   [ Show advanced options ]

 3 tools selected
```

**Select model.** Keep the session model, or pin one this agent always uses.

```text
 Create new agent
 Select model

 > 1. Inherit from session (default)
   2. Pick a specific model
```

**Confirm.** A summary shows every field before the file is written:

```text
 Create new agent
 Confirm and save

 Name:        code-reviewer
 Location:    .commandcode/agents/ (project)
 Tools:       Read-only, Edit, Search
 Model:       Inherit from session

 Description (Tells Command Code when to use this agent):
   Use this agent when you are done writing code and want a
   diff reviewed for bugs and security issues.

 System Prompt:
   You are a meticulous code reviewer. Prioritize correctness,
   security, and clear feedback. Cite file paths and lines.

 Press Enter to save · Esc to cancel
```

Agents you add or edit are picked up on the next turn - no restart.

### Edit the file directly

An agent is a Markdown file. The front matter configures it; the body is the system prompt.

```markdown
---
name: code-reviewer
description: Use after writing code to review a diff for bugs and security issues.
tools: read_file, grep, glob
model: claude-sonnet-5
---

You are a meticulous code reviewer. Prioritize correctness, security, and clear
feedback. Cite file paths and line numbers. Be concise.
```

Drop the file in `.commandcode/agents/` (project) or `~/.commandcode/agents/` (personal) and it loads on the next turn. Full field list is in the [Reference](#reference).

---

## How it works

You don't call a subagent yourself. You describe what you want, and Command Code decides when to delegate by calling its built-in `agent` tool. The subagent runs in its own loop, does the work, and returns one result.

- **Parallel runs.** Command Code starts independent subagents at the same time by making several `agent` calls in one turn. Five explorers, or three agents each editing a different module, run together instead of in sequence.
- **Isolated context.** A subagent's file reads and reasoning stay in its own context window, so a long exploration doesn't fill up the main conversation.
- **Own model.** An agent can pin its own model, so a slow planner and a fast implementer keep separate prompt caches.
- **One level deep.** Subagents can't start their own subagents - the `agent` tool is removed from their tool set.

### Background runs

A run can be detached. When it's started in the background (or the agent sets `background: true`), the `agent` tool returns right away with an `agent_id` and the main session keeps going. The result is collected later with the `agent_output` tool, which can `wait` for it, check `status`, or `kill` the run.

You can also detach a run yourself. Press **Ctrl+B** while a foreground agent is working and it moves to the background mid-run. In the TUI, a background agent's result is sent to the main agent automatically when it finishes, so nothing has to poll. Watch and stop background agents from the [Background panel](https://commandcode.ai/docs/background-tasks#the-background-panel-in-the-tui).

### Watching a subagent

Running subagents show up in the TUI while they work:

- **Ctrl+B** (or **downward arrow key ↓** and then press **Enter** from an empty input) opens the **Background** panel. Each subagent row shows its status, elapsed time, tokens, turn count against its limit, and the tool it is running now. A row with no activity for 30 seconds is marked `idle`.
- **Enter** on a row opens that subagent's activity: its id, status, and recent tool calls with their inputs and whether each succeeded.
- **x** stops a running subagent, or dismisses a finished row. The panel keeps the 10 most recent finished runs.

If a foreground subagent is running, Ctrl+B moves it to the background first. When nothing is running, Ctrl+B is cursor left as usual. The model can read the same state with `agent_output`.

Your [hooks](./hooks.md#sub-agents) run on a subagent's tool calls too, so delegating work doesn't skip a `PreToolUse` guard.

### Where agents load from

| **Source** | **Path** | **Notes** |
| ---------- | -------- | --------- |
| Bundled | (built-in) | General, Explore, Plan - always present, read-only |
| Personal | `~/.commandcode/agents/` | Every project on your machine |
| Project | `.commandcode/agents/` | Committed with the repo; shared with the team |

They load in that order and the **first** definition of a name wins. Files are re-scanned each turn, so adds, edits, and deletes take effect right away.

Reserved names (`explore`, `plan`, `review`, `general`) are used by built-in behavior. A custom file with one of these names is ignored.

---

## Reference

### Frontmatter fields

Only these keys are read; anything else is ignored. All except `name` are optional.

| **Field** | **Type** | **Required** | **Default** | **Description** |
| --------- | -------- | ------------ | ----------- | --------------- |
| `name` | `string` | Yes | filename | Agent id Command Code delegates to. Sanitized to `a-z A-Z 0-9 _ -`; can't be a reserved name. |
| `description` | `string` | No | `""` | When to use the agent, the text Command Code matches against. Be specific. |
| `tools` | `string \| string[]` | No | none | Tools the agent may use. `"*"` grants all; otherwise a comma/space-separated list or YAML array. |
| `disallowedTools` | `string \| string[]` | No | - | Deny list applied after `tools` (deny beats allow). Same format as `tools`. |
| `model` | `string` | No | inherit | Any `/model` id. Omit or set `inherit` to use the sub-agent default. |
| `reasoningEffort` | `string` | No | model default | Reasoning level the pinned model supports; an unsupported level falls back to the model default. |
| `maxTurns` | `integer` | No | `subagentMaxTurns` setting, else `200` | Caps the agent's loop. Set [`subagentMaxTurns`](https://commandcode.ai/docs/settings#top-level-keys) in `settings.json` (1 to 1000; also the "Sub-agent turn limit" row in `/config`) to change the default for every agent, built-in ones included. At the cap the agent gets one final call to write its report, and tools it calls there don't run, so a limit of 200 shows up as 201 turns. |
| `permissionMode` | `string` | No | inherit | Overrides the session mode: `default`, `accept-edits`, `yolo`, `plan`, `dont-ask` (`auto-accept` and `bypass` accepted as aliases). A session already in `plan`/`yolo` wins. |
| `background` | `boolean` | No | `false` | `true` detaches every run: the `agent` tool returns an `agent_id`; results come from `agent_output`. |
| `showOutput` | `boolean` | No | `false` | `true` shows the agent's final message verbatim in the feed instead of a short "done" line. |

### Tools

Tool ids are the same names shown in the `/agents` wizard's advanced list. How `tools` is read:

- `tools: "*"` - every tool, including connected MCP tools.
- `tools: read_file, grep, glob` - an allowlist. Comma- or space-separated; a YAML array also works.
- Omitted - no tools.

Common ids by category:

| **Category** | **Tool ids** |
| ------------ | ------------ |
| Read-only | `read_file`, `read_directory`, `grep` |
| Edit | `edit_file`, `write_file` |
| Execution | `shell_command`, `run_command`, `kill_shell` |
| Search | `web_search`, `web_fetch` |
| Other | `glob`, `todo_write`, `task_create`, `task_update`, `task_list`, `task_get`, `task_output`, `task_stop`, `cron_create`, `cron_list`, `cron_delete`, `get_diagnostics`, `taste`, `ask_user_question`, `sleep`, `enter_plan_mode`, `exit_plan_mode`, `enter_worktree`, `exit_worktree` |

MCP tools go in by their raw name, e.g. `mcp__github__get_me`. The `agent` and `agent_output` tools can't be granted - that's what keeps delegation one level deep.

### Models

The `model` field takes any id you'd pass to `/model`. To find one:

- See [Available models](https://commandcode.ai/docs/reference/cli/models) for the full list,
- open the `/model` picker, or
- run `cmd --list-models` in the shell.

Use ids exactly as `--list-models` prints them. Examples: `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5`, `moonshotai/kimi-k2.6`, `zai-org/glm-5.2`.

Omitting `model` is the same as `model: inherit` - the agent runs on the session model: the session's `/model`, or the [planning or implementation model](https://commandcode.ai/docs/settings#planning-and-implementation-models) while one is active. To run these agents on a different model, pick one in the **Sub-agents** row under `/config` → **Feature models**; clear it to go back to the session model. A `model` the agent asks for on a single delegation beats both. Pinning a model gives the agent its own prompt cache, so a slow planner and a fast implementer don't thrash each other's.

### Reasoning effort

`reasoningEffort` pins how hard the agent thinks, independent of the session's `/effort`. Pin/select a reasoning level the agent's model supports. To see a model's exact set, open the `/model` picker and select the model - its reasoning-effort step lists precisely the levels that model accepts.

The value is validated in two stages so a bad one never reaches the provider mid-delegation:

- At load time an unknown level (a typo like `meduim`) is dropped with a warning, and the agent falls back to the model default - the file still loads.
- At runtime, the level is checked against the model actually chosen (an `inherit` model isn't known until launch). 
- A level the resolved model doesn't support falls back to the model default rather than being clamped to a different level.

Omit it to run at the model's default effort.

### Full example

Every field, with valid values. Copy it and delete what you don't need.

**.commandcode/agents/report-writer.md**
```markdown
---
name: report-writer
description: "Writes a structured research report from the current repo. Delegate long-form summarization and analysis tasks here."
tools: "*"                                  # grant everything…
disallowedTools: shell_command, write_file  # …except shells and file writes
model: claude-opus-4-8                       # any /model id, or omit to inherit
reasoningEffort: high                        # a level THIS model supports (varies by model); omit for default
maxTurns: 40                                 # cap the loop (default: settings.json subagentMaxTurns, else 200)
permissionMode: plan                         # default|accept-edits|yolo|plan|dont-ask
background: true                             # detach; collect via agent_output
showOutput: true                             # render the final report in the feed
---

You are a research report writer. You receive one self-contained task and
produce a complete, well-structured Markdown report as your final message.

- Gather only the files and facts the task requires.
- Work on your own - you can't ask follow-up questions.
- Your final message is the deliverable; make it complete.
```

---

## Next steps

- [Interactive mode](https://commandcode.ai/docs/interactive-mode) - slash commands and session controls
- [Background tasks](https://commandcode.ai/docs/background-tasks) - detached, long-running work
- [Memory](./memory.md) - project and user instructions in `AGENTS.md`
- [Skills](./skills.md) - reusable skill packages vs. full subagents
