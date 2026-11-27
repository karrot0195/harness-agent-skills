<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# Command Code — Product Knowledge

## KEYBOARD SHORTCUTS
- Shift+Tab: Toggle mode (default → accept edits → plan → yolo)
- Ctrl+O: Toggle expanded tool output
- Alt+P: Quick model switch (Option+P on macOS)
- Ctrl+G: Open input in external editor ($EDITOR)
- Press Esc twice: Rewind to previous checkpoint
- /: Open command menu

## SLASH COMMANDS (type these in the chat input)
- /init: Initialize AGENTS.md for this project
- /import [claude|codex|cursor|pi|opencode|gemini]: Import your setup (skills, agents, commands, MCP, memory) from another coding agent
- /goal [<objective>|clear|status]: Set an objective for the agent to work towards
- /memory: Manage Command Code memory
- /resume: Resume a past conversation
- /sessions: Resume a past conversation (alias of /resume)
- /fork [name]: Fork the conversation into a new session
- /worktree [name|list|remove <name>]: Create, list, or switch isolated git worktrees
- /clone: Clone the current branch into a new session and switch to it
- /rename [name]: Rename the current session
- /name [name]: Alias of /rename; bare /name shows the current name
- /rewind: Restore to a previous checkpoint (Press Esc twice)
- /tree: Browse the session tree and jump to any point in it
- /clear (new): Start a new session with empty context; previous stays on disk, resumable with /resume (/new is the same command)
- /theme: Switch the color theme (dark, light or auto)
- /language: Switch the interface language (English / 简体中文)
- /share [gist]: Share as a GitHub gist — /share gist [html|jsonl|md] (link sharing is being rebuilt, use /export)
- /unshare: Stop sharing conversation
- /taste: Manage Taste learning and usage
- /learn-taste: Learn taste from sessions with other coding agents (Claude Code, Cursor, etc)
- /skills: Browse and open agent skills
- /agents: Manage agent configurations
- /design: Design partner: audit, build, compose, and ship UI — type /design to browse modes
- /mcp: Manage MCP server connections
- /model: Switch between Command Code models
- /effort: Set reasoning effort for the current model
- /connect: Connect to AI providers. Command Code, BYOK providers and API keys
- /compact: Compact the conversation history
- /compact-mode: Select a compact mode to compact sessions
- /config: Search and change settings, including which model runs each built-in task
- /context: Show context window usage and breakdown
- /ide: Connect IDE to share your open file and selected lines
- /terminal-setup: Setup VSCode keybindings
- /login: Log in to Command Code
- /logout: Log out of Command Code
- /learn (courses): Open the Command Code learn hub in your browser
- /feedback [title]: Report a bug or share feedback — opens a prefilled GitHub issue (alias: /issue)
- /trace: Copy the current trace id; required for support debugging
- /session-file: Show the current session id and path to the on-disk session file
- /copy: Copy the last response to the clipboard
- /export [path]: Export session — /export [html|jsonl|md] or a file path
- /changelog: See what's new in Command Code
- /hotkeys: Show all keyboard shortcuts
- /todos: Manage the session todo list — c completes an item, x removes it, a completes all (needs the `todos` mod: `cmd mods enable todos`)
- /loop [interval] [task]: Re-run a task on fixed intervals, or let the agent pace itself
- /rc: Remote-control this session from Telegram or Discord
- /btw <question>: Ask a quick side question mid-turn — sees the conversation, has no tools, and never enters the history
- /plan [task]: Enter plan mode; `/plan <task>` plans that task
- /mode [name]: Show or switch the permission mode — /mode [default|accept-edits|plan]
- /mode:default: Switch to default mode (prompt before edits/commands)
- /mode:accept-edits: Switch to accept edits mode (accept edits automatically)
- /mode:plan: Switch to plan mode (read-only, no side effects)
- /plans [name]: Browse, review, and annotate saved plans
- /plan-review: Review this session's latest plan
- /review [pr]: Review a pull request (optional PR number)
- /pr-comments: Fetch all PR comments for current branch
- /add-dir: Manage additional directory scope
- /status: Show comprehensive environment status
- /statusline [off|on|reset]: Configure Command Code's statusline UI: pick and order the row under the input (model, reasoning, context used and remaining, phase model, directory, git branch, session name, version) and turn the mode badge, IDE context, PR, taste, background tasks and shortcut hints on or off; mod status follows. Terminal only
- /usage: Display credits, plan, and usage metrics
- /upgrade: Open billing page to upgrade your plan
- /extra: Buy extra usage at API cost, zero markup
- /update: Update Command Code to the latest version
- /reload: Restart Command Code and resume this session (applies a staged update)
- /mods: List loaded mods and panes; /mods reload [name] hot-reloads, /mods open|close <pane>
- /help: Display help information
- /exit: Exit Command Code
- /quit: Exit Command Code (alias of /exit)

## CLI SUBCOMMANDS
- cmd info: Display system information
- cmd status: Show authentication status
- cmd help: Display help information
- cmd whoami: Show current user
- cmd update: Update Command Code to the latest version
- cmd feedback [title]: Report a bug or share feedback — opens a GitHub issue (alias: cmd issue)
- cmd config: Inspect and update validated configuration settings
- cmd providers: List providers available for login/logout
- cmd taste: Manage taste learning packages
- cmd taste learn <source>: Learn taste from a local repository or GitHub repo
- cmd learn-taste: Learn command structure from repositories
- cmd mcp: Manage MCP (Model Context Protocol) servers
- cmd cloud: Manage cloud sessions (list, status <id>, stop <id>)
- cmd skills: Manage skills from GitHub repositories
- cmd acp: Run as an ACP agent over stdio (for Zed, etc.)
- cmd mods: Manage mods (loadable extensions) from npm, git, or local paths
- cmd login: Login with Command Code account
- cmd logout: Log out of Command Code

## CLI EXAMPLES
- cmd "fix the login bug": Start with a task
- cmd -c: Continue the last conversation
- cmd --resume "auth refactor": Resume a named session
- cmd --plan "migrate to zod 4": Plan before editing
- cmd -p "summarize the diff" --output-format json: Headless run with machine-readable output
- cmd -p "fix the tests" --max-turns 20 --yolo: CI run with a turn cap and no prompts
- cmd -m deepseek/deepseek-v4.1-flash: Run on a specific model
- cmd taste learn .: Learn taste from this repo

## CLI OPTIONS (flags when launching cmd)
- cmd: Start interactive session
- cmd "message": Start with initial message
- -r, --resume [name]: Resume a conversation by id or name (use quotes for multi-word names), or pick from history (alias: --sessions)
- -c, --continue: Continue the last conversation
- --fork-session: With --resume/--continue, fork the session into a new one (original left untouched)
- --session <path|id>: Resume a session by transcript path (.jsonl) or a unique session-id prefix
- --no-session: Don't persist this session to disk (in-memory only)
- -n, --name <name>: Set the session display name
- -t, --trust: Auto-trust project (skip initial permission prompt)
- -p, --print [query]: Run in non-interactive mode, output response and exit
- --max-turns <number>: Cap conversation turns in -p mode (default 100; exit 8 on cap-hit)
- --output-format <format>: -p output: text (default) or json (NDJSON event stream + final result line)
- --verbose: -p: stream tool execution progress to stderr
- --tools-all: -p: enable every tool, including the ones a headless run withholds
- --tools-enable <names>: -p: enable specific withheld tools by name, comma-separated (repeatable)
- -m, --model <model>: Run on a specific model this session
- --effort <level>: Set reasoning effort for the session (e.g. low, medium, high) — depends on the model
- --theme <theme>: Set the color theme (dark, light or auto)
- --config <key=value>: Set any setting headlessly, e.g. --config theme=dark (repeatable) — the CLI form of /config
- --list-models: List the models available for use
- --local-only: For BYOK: local-only with your BYOK providers, no Command Code traffic (same as CMD_LOCAL_ONLY=1)
- --plan: Start in plan mode
- --permission-mode <mode>: Set permission mode (default, plan, accept-edits, yolo, dont-ask)
- --accept-edits: Start in accept edits mode
- --yolo: Bypass all permission prompts (alias for --dangerously-skip-permissions)
- --add-dir <directory>: Add directory to workspace context
- -w, --worktree [name]: Run in an isolated managed worktree (name, path, or #PR; generated when omitted)
- --cloud [id|message]: Run in the cloud (beta); pass a session id to reopen one
- --base <branch>: Base branch for a new cloud session
- --mod <path>: Load a mod file or directory for this session (repeatable)
- --mod-option <name=value>: Set a mod-declared flag value (repeatable)
- --safe-mode: Load built-in mods only for this session (no installed mods, no --mod)
- --skill <path>: Load extra skills from a path (a skill directory or a directory of skills); repeatable
- --no-skills: Skip skill discovery; paths given via --skill still load
- --skip-onboarding: Skip taste onboarding (for automated runs)
- --ide-setup: Connect IDE to share your open file and selected lines
- --no-auto-update: Disable automatic background updates for this run
- -v, --version: Output the version number
- -h, --help: Display this help message

## TASTE SYSTEM
Taste is powered by the meta neuro-symbolic AI model taste-1 with continuous reinforcement learning (RL). It combines reasoning with neural intuition to learn your coding preferences.

How taste works:
- Learns from you — every accept, reject, and edit becomes a signal
- Thinks like you — learns patterns and micro-decisions you'd never document
- Grows with you — continuous learning loop that never goes stale

Enable taste: Use /taste in a session or run npx taste from the command line.

Taste packages (three types):
- Project: Stored in .commandcode/taste/ — learnings unique to this codebase
- Global: Stored in ~/.commandcode/taste/ — personal taste across all projects (use -g flag)
- Remote: Stored at commandcode.ai/username/taste — team sharing, backup, sync across machines

File structure:
  .commandcode/taste/
  ├── taste.md (main taste file)
  ├── cli/taste.md
  ├── typescript/taste.md
  └── architecture/taste.md

Key commands:
- npx taste push --all — push entire project taste to remote
- npx taste pull username/project-name — pull taste from remote
- npx taste push cli -g — push package to global
- npx taste pull cli -g — pull package from global
- npx taste list — list available packages
- npx taste lint — validate package format
- npx taste open — open packages in editor

Privacy: Taste processing runs on your codebase and stores learning data locally only.

## KEY FEATURES
- Taste System: Automatically learns coding preferences from interactions and applies them consistently
- Skills: User-defined knowledge modules for specialized tasks (stored in .commandcode/skills/ or .agents/skills/)
- Agents: Custom agent configurations for different workflows (stored in .commandcode/agents/)
- Memory: Project-specific instructions via COMMANDCODE.md files
- MCP: Model Context Protocol server connections for extended tool capabilities
- Plan Mode: Structured exploration and planning before implementation [Shift+Tab to toggle]
- Conversation Management: Resume, continue, share, and rewind conversations
- PR Review: Built-in pull request review capabilities (/review command)
- Taste Learning: Learnings appear inline in the conversation as TASTE blocks while you work
- Model Switching: Switch between models with Alt+P (Option+P on macOS)

## EXTENDING COMMAND CODE
Command Code is extended with skills, agents, MCP servers, and project memory — all discovered from files in your project or home directory, no restart required.

SKILLS (reusable playbooks): a directory containing a SKILL.md file, discovered from:
- .commandcode/skills/<name>/SKILL.md (project)
- ~/.commandcode/skills/<name>/SKILL.md (personal, across all projects)
- .agents/skills/<name>/SKILL.md (compat location, project or personal)

Minimal SKILL.md:
---
name: commit-messages
description: Write a conventional commit message from staged changes. Use when the user asks to commit or write a commit message.
---

# Commit Messages
1. Run `git diff --staged` to see what changed.
2. Write a one-line conventional-commit summary (type(scope): subject).
3. Add a short body only if the change needs explaining.

Frontmatter fields: name (required — lowercase letters/numbers/hyphens only, must match the directory name), description (required, ≤1024 chars — this is what the model matches against), allowed-tools (optional — a space-delimited allowlist, e.g. "Bash(git:*) Read"), argument-hint (optional — shown when the skill is invoked with arguments), disable-model-invocation (optional true/false — true stops the model from auto-invoking it; /name still works). Invoke with /<name>, or let the model invoke it automatically when the description matches the task. Manage installed skills with /skills.

AGENTS (sub-agents for the task tool): a single Markdown file at .commandcode/agents/<name>.md (project) or ~/.commandcode/agents/<name>.md (personal). Full authoring guide — file format, model pinning, and the create-an-agent-on-request recipe — is in the CUSTOM AGENTS section (topic: agents).

MCP SERVERS (external tools and data): add one with the CLI —
  cmd mcp add --transport http notion https://mcp.notion.com/mcp
  cmd mcp add github -- npx -y @modelcontextprotocol/server-github
or hand-write .mcp.json in the project root:
  {
    "mcpServers": {
      "github": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-github"]
      }
    }
  }
Scopes, lowest to highest precedence: user (~/.commandcode/mcp.json) < project (<project>/.mcp.json, checked in and shared) < local (~/.commandcode/projects/<slug>/mcp.json, private to this machine, not checked in). Manage connections with /mcp.

PROJECT MEMORY (AGENTS.md): the project-root AGENTS.md holds conventions the agent should always follow (build/test commands, code style, architecture notes). A nested <dir>/AGENTS.md layers in directory-specific rules for files under that directory (nearest wins). An @path reference inlines another file's content (skipped inside fenced code blocks). Run /init to scaffold one, /memory to edit it.

## CUSTOM AGENTS (sub-agents)
Custom agents are specialized sub-agents the main session delegates to via the task tool. Each is ONE Markdown file — no build step, no restart; the registry re-reads disk every turn, so a new agent is usable on the next message.

Locations (project wins a name clash):
- .commandcode/agents/<name>.md — this project
- ~/.commandcode/agents/<name>.md — personal, all projects

Complete agent file:
---
name: "changelog-writer"
description: "Writes and updates CHANGELOG.md entries from recent commits. Use after merging changes or when the user asks for a changelog."
tools: "read_file, grep, glob, shell_command, edit_file"
model: "moonshotai/Kimi-K2.5"
---

You write crisp changelog entries. Read the recent commits, group them by type (features, fixes), and write terse one-liners under the right heading in CHANGELOG.md.

Frontmatter fields:
- name (required) — lowercase-kebab-case; becomes the subagent_type the task tool dispatches on. Reserved (do not use): explore, plan, review, general.
- description (required) — when to delegate to this agent; the orchestrator picks agents by this text.
- tools (optional) — "*" for every tool, or a comma/space-delimited list of tool names; OMITTED MEANS NO TOOLS. Grant the minimum the role needs (read-only for reviewers/analysts; add edit_file/shell_command only for agents that must change things).
- model (optional) — pins the model this agent ALWAYS runs on, independent of the session's /model. Omit it (or write "inherit") to follow the session model. Pinned agents keep their own prompt cache.

Valid model ids (the /model catalog — use these EXACT ids):
- claude-sonnet-5-5
- claude-sonnet-5
- claude-sonnet-4-6
- claude-fable-5-2
- claude-fable-5-1
- claude-fable-5
- claude-opus-5-5
- claude-opus-5
- claude-opus-4-8
- claude-opus-4-7
- claude-haiku-5-5
- claude-haiku-4-5-20251001
- gpt-6-astra
- gpt-6.2-astra
- gpt-6.2-sol
- gpt-6.1-sol
- gpt-6.1-terra
- gpt-6-sol
- gpt-6-luna
- gpt-5.6-sol
- gpt-5.6-terra
- gpt-5.6-luna
- gpt-5.5
- gpt-5.4
- gpt-5.3-codex
- gpt-5.4-mini
- deepseek/deepseek-v4-pro
- deepseek/deepseek-v4-flash
- deepseek/deepseek-v4-flash-vision-exp
- deepseek/deepseek-v4-flash-fast
- deepseek/deepseek-v4.1-flash
- deepseek/deepseek-v4.1-flash-fast
- deepseek/deepseek-v4.1-flash-ultrafast
- moonshotai/Kimi-K3.1-Pro
- moonshotai/Kimi-K3
- moonshotai/Kimi-K2.7-Code
- moonshotai/Kimi-K2.7-Code-Highspeed
- moonshotai/Kimi-K2.6
- moonshotai/Kimi-K2.5
- z-ai/glm-5.3-flash
- z-ai/glm-5.3-flashx
- zai-org/GLM-5.3
- zai-org/GLM-5.2
- zai-org/GLM-5.2-Fast
- zai-org/GLM-5.1
- zai-org/GLM-5
- minimax/minimax-m3.1-flash
- MiniMaxAI/MiniMax-M3
- MiniMaxAI/MiniMax-M2.7
- MiniMaxAI/MiniMax-M2.5
- ornith/ornith-1.5-122b
- xiaomi/mimo-v2.6-pro
- xiaomi/mimo-v2.6-pro-ultraspeed
- xiaomi/mimo-v2.6-flash
- Qwen/Qwen4-Max
- Qwen/Qwen3.8-Omni-Flash
- Qwen/Qwen3.8-Max-Prime
- Qwen/Qwen3.8-Max-0902
- Qwen/Qwen3.8-Max
- Qwen/Qwen3.8-27B
- Qwen/Qwen3.8-Flash
- Qwen/Qwen3.7-Max
- Qwen/Qwen3.7-Plus
- Qwen/Qwen3.7-Flash
- Qwen/Qwen3.6-Max-Preview
- Qwen/Qwen3.6-Plus
- meituan/LongCat-2.0
- stepfun/Step-5-Preview
- stepfun/Step-3.7-Flash
- stepfun/Step-3.5-Flash
- tencent/hy3-paid
- tencent/hy4
- tencent/hy4-flash
- tencent/hy4-preview
- google/gemini-4-carbon
- google/gemini-4-neon
- google/gemini-4-argon
- google/gemini-3.8-flash
- google/gemini-3.7-flash
- google/gemini-3.6-flash
- google/gemini-3.5-flash
- google/gemini-3.5-flash-lite
- google/gemini-3.1-flash-lite
- sakana/fugu-ultra
- nvidia/nemotron-3-ultra-550b-a55b
- nvidia/nemotron-3.5-super-vl
- thinkingmachines/inkling
- thinkingmachines/inkling-small
- thinkingmachines/inkling-2-mini
- recursive/flint-v1.0:free
- stealth/glyph-cluster:free
- inclusionai/ling-3.1-flash
- inclusionai/ling-3.1-flash-1019
- meta/muse-spark-1.1
- meta/muse-spark-1.2
- meta/muse-spark-1.2-contributor
- meta/muse-spark-1.3
- meta/muse-spark-1.3-contributor
- meta/muse-spark-open
- meta/muse-wonder-1.0
- meta/muse-ember
- xai/grok-4.5
- xai/grok-4.6
- xai/grok-4.7
- mistral/mistral-large-4
A BYO-provider id (from a configured custom provider) also works and is passed through as-is.

WHEN THE USER ASKS YOU TO CREATE AN AGENT (e.g. "make a changelog agent with a cheap model"):
1. Do NOT search the codebase for how — this section is the authoritative spec.
2. Derive a lowercase-kebab-case name (not a reserved name), a delegation-worthy description, and a short, focused system prompt for the role.
3. Pick the minimal tool set for the role.
4. If the user named a model (or a tier like "cheap"/"fast"/"deep reasoning"), map it to an EXACT id from the list above and set model:; otherwise omit model: so the agent inherits the session model. Never invent a model id.
5. Write the file to .commandcode/agents/<name>.md (project) unless the user asked for a personal agent (~/.commandcode/agents/<name>.md).
6. Confirm: the agent is live on the next message — the user can also see it under /agents, and the task tool can now dispatch to it by name.

To modify an existing agent, edit its file in place (same fields). To remove one, delete the file.

## MODS (loadable plugins — the ModApi)
Mods are loadable plugins written against the ModApi — a TypeScript file that Command Code discovers on disk and loads onto its agent loop. This is the plugin layer above hooks/skills: a mod can add tools the model calls, slash commands, mutating lifecycle hooks, event observers, typed-input interception, custom feed rendering, flags, and model providers. Command Code's own built-in features (providers, session titling, the update notice) are written as mods against this same API.

A mod default-exports a factory that receives the API bound as `cmd`:

import type {ModApi} from '@commandcode/harness';
export default function (cmd: ModApi) {
  cmd.addCommand({name: 'hello', handler: () => ({message: 'hi from a mod'})});
}

Save it at ~/.commandcode/mods/<name>.ts (personal) or <project>/.commandcode/mods/<name>.ts (project, trust-gated). It loads next session, or test now with `cmd --mod ./<name>.ts`. No build step — jiti compiles at load. Manage packages with `cmd mods add|remove|list|update`.

Registration verbs (each returns a Disposable): cmd.addTool, cmd.addCommand, cmd.addFlag, cmd.addProvider, cmd.addRenderer, cmd.on(event, handler), and cmd.hooks({...}). THE ONE RULE: cmd.hooks mutates (block/rewrite a tool via beforeToolCall/afterToolCall, add to the prompt via appendSystemPrompt, rewrite typed input via transformInput, post-turn work via onRunEnd); cmd.on only observes.

To help a developer build one: use the bundled "mod-builder" skill (/mod-builder or let the model invoke it) — it has runnable single-file examples for each capability plus the full mods reference under its reference/ directory (generated from the public docs at https://commandcode.ai/docs/mods).

## FREQUENTLY ASKED QUESTIONS
Q: What is Command Code?
A: Command Code is the first coding agent that automatically learns your taste of writing great code.

Q: What is taste-1?
A: taste-1 is our meta neuro-symbolic AI model with continuous reinforcement learning (RL).

Q: Is Command Code free?
A: Command Code offers both free and premium plans. Check https://commandcode.ai/pricing for details.

Q: How do I install Command Code?
A: Run npm i -g command-code, then cmd login, then cmd to start.

Q: What are Agent Skills?
A: Reusable instructions that teach Command Code how to handle specific tasks like code reviews, testing, or commit messages. Use /skills to browse them.

Q: What are MCP servers?
A: MCP (Model Context Protocol) servers let Command Code connect to external tools and data sources like GitHub, Notion, databases, and more. Use /mcp to manage them.

Q: What is plan mode?
A: Plan mode lets you review and approve Command Code's approach before it writes any code. Press Shift+Tab to toggle it.

Q: What is headless mode?
A: Headless mode lets you run Command Code non-interactively in scripts, CI/CD pipelines, and automation workflows. Use cmd -p "query" to run.

Q: How do I fix "command not found" after installing?
A: Ensure your global npm bin directory is in your PATH. Run npm config get prefix to find it, then add <prefix>/bin to your PATH.

Q: Why am I getting unauthorized errors?
A: Run cmd logout followed by cmd login to refresh your session. If the issue persists, check your account at https://commandcode.ai/studio.

Q: How do I check my usage limits?
A: Visit the billing page in Command Code Studio at https://commandcode.ai/studio.

Q: My MCP server won't connect. What should I do?
A: Check the server config with cmd mcp get <name> and use /mcp inside a session to see the error. For stdio servers, ensure the command is installed and in your PATH.

Q: Where can I get help?
A: Join our Discord at https://commandcode.ai/discord, report issues on GitHub, or email support@commandcode.ai.

## TROUBLESHOOTING

### Installation
- "command not found" after install: Ensure global npm bin directory is in PATH. Run npm config get prefix, add <prefix>/bin to PATH, restart terminal.

### Authentication
- Login fails or session expired: Run cmd logout then cmd login. If still failing, delete ~/.commandcode/auth.json and retry.
- API key or provider issues: Verify provider config, check API key validity, check usage limits.
- Chrome Local Network Access prompt during login: Click "Allow" — this is expected and safe. Command Code runs a temporary local server for OAuth callback.

### MCP Servers
- Server won't connect: Check config with cmd mcp get <name>, verify command is in PATH, use /mcp in session for error details.
- Authentication issues: Re-authenticate with cmd mcp auth <server>, or clear and retry with cmd mcp auth --clear <server>.

### Skills
- Not appearing in /skills menu: Check directory structure (.commandcode/skills/ or .agents/skills/), verify SKILL.md exists with valid frontmatter.
- Editor not opening: Check $EDITOR is set and the editor is in PATH.
- Skill not being used: Make description more specific with keywords, ask Command Code explicitly to use the skill.

### Performance
- Slow responses: Check internet connection, disconnect unneeded MCP servers, keep prompts focused and specific.
- High token usage: Review usage in Studio, use headless mode for scripted tasks, use plan mode to agree on approach first.

### Support
- Discord: https://commandcode.ai/discord
- GitHub: https://github.com/commandcode/command-code
- Email: support@commandcode.ai

## PRICING & LIMITS
How it works:
- Monthly reset: Request limits reset at the start of each billing cycle.
- Extra credits: Buy them at model cost any time. Credits roll over and never expire.

Manage your plan:
- Purchase credits or subscribe: Studio > Billing at https://commandcode.ai/billing
- Track usage: https://commandcode.ai/usage (personal). For an org: https://commandcode.ai/<orgLogin>/settings/usage
- Manage payment methods: Access billing portal from Studio > Billing

Buying extra credits: Studio > Billing, then Buy Credits. Pick an amount from 5 to 500 credits ($1 of usage each), then pick how to pay: card, Alipay, WeChat Pay or crypto charged in US Dollars plus a processing fee, or UPI charged in Indian Rupees where it is offered. The payment finishes on Stripe's secure page and the credits land on your balance within moments.
Buying credits changes nothing else: it never saves a payment method, never changes your default card, and never turns auto reload on.
Auto reload: A separate opt-in in Studio > Billing that tops your balance up when it runs low. It charges your default card only, so Alipay, WeChat Pay, crypto and UPI cannot be used for it - add a card there first if none is saved.
Premium requests: Any request that uses a premium model (like taste-1) during your coding session.
When you hit your limit: Buy extra credits, or turn on auto reload so a saved card tops you up automatically. Extra credits are purchased at model cost and roll over.
Switch plans: Upgrade or downgrade anytime from Studio > Billing. Changes take effect next billing cycle.
Team billing: Billed per seat. Credits are pooled at the team level.

Enterprise: Enhanced security, compliance, and control. Contact support@commandcode.ai for Enterprise edition.

## PRIVACY & LEGAL
- Taste processing runs on your codebase and stores learning data in your project and on your local machine only.
- Privacy Policy: https://commandcode.ai/privacy
- Terms of Service: https://commandcode.ai/terms

## HELPFUL LINKS
- Documentation: https://commandcode.ai/docs
- Discord Community: https://commandcode.ai/discord
