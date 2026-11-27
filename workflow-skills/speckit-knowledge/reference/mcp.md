<!-- Generated from the Command Code docs: https://commandcode.ai/docs -->

# MCP Servers

Connect Command Code to external tools and data sources through MCP servers. MCP is an open protocol that lets Command Code interact with external services - databases, APIs, issue trackers, and more.

---

## What is MCP?

MCP (Model Context Protocol) is an open protocol that lets AI agents connect to external tools and services. With MCP, Command Code can interact with databases, APIs, dev tools, and more - all through a standardized interface.

Instead of building custom integrations, you connect MCP servers and Command Code automatically discovers and uses their tools.

---

## What you can do

With MCP servers connected, you can ask Command Code to:

- **Work with project management**: "Create a GitHub issue for the bug we found and assign it to me."
- **Query databases**: "Show me all users who signed up in the last 7 days from our Postgres database."
- **Integrate with services**: "Search Notion for the API design doc and summarize it."
- **Automate workflows**: "Review PR #123 on GitHub, then post a summary in Slack."

---

## Quickstart

Add your first MCP server to Command Code in under a minute.

**Add an MCP server**

Pick one transport:

**Add MCP Server**

```bash {{ title: 'HTTP (remote)' }}
cmd mcp add --transport http <name> <url>
```

```bash {{ title: 'Stdio (local)' }}
cmd mcp add <name> -- <command> [args...]
```

Example:

**Examples**
```bash {{ title: 'HTTP (remote)' }}
cmd mcp add --transport http notion https://mcp.notion.com/mcp
```

```bash {{ title: 'Stdio (local)' }}
cmd mcp add playwright -- npx -y @playwright/mcp@latest
```

**Authenticate if prompted**

Some remote servers require OAuth. Open the MCP menu:

```bash
/mcp
```

Follow the browser prompt to log in. Tokens are stored securely and refreshed automatically.

If needed, pass auth headers:

```bash
cmd mcp add --transport http private-api https://api.company.com/mcp \
  --header "X-API-Key: your-key-here"
```

All options (`--transport`, `--env`, `--scope`, `--header`) must come before the server name. `--` separates the server name from the local command for stdio servers.

**Verify connection**

List your configured servers:

```bash
cmd mcp list
```

Or inspect one server:

```bash
cmd mcp get notion
```

Inside a session, `/mcp` shows connection status and available tools.

**Try it out**

Start a session:

```bash
cmd
```

Then ask naturally:

```md
Create a note on Notion named "API Design v2".
```

Command Code automatically discovers and calls the right MCP tools based on your request.

**Optional: Add MCP servers from JSON**

For complex setups, use JSON:

```bash
cmd mcp add-json my-server '{
  "transport": "http",
  "url": "https://api.example.com/mcp",
  "headers": {
    "Authorization": "Bearer ${API_KEY}"
  }
}'
```

Example:

**GitHub MCP Server**

```bash {{ title: 'HTTP server' }}
cmd mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer ghp_xxx"}}'
```

```bash {{ title: 'Stdio server' }}
cmd mcp add-json my-tool '{"type":"stdio","command":"npx","args":["@my-org/mcp-server"],"env":{"API_KEY":"xxx"}}'
```

```bash {{ title: 'With OAuth' }}
cmd mcp add-json oauth-server '{"type":"http","url":"https://api.example.com/mcp","oauth":{"authorizationUrl":"https://example.com/authorize","tokenUrl":"https://example.com/token","clientId":"my-client"}}' --client-secret my-secret
```

For copying configs between machines or scripting:

- The JSON accepts `type` as an alias for `transport`.
- Environment variables in config values (like `${API_KEY}`, or `${API_KEY:-default}`) are resolved at runtime, in http `headers` and stdio `env`. The default applies when the variable is unset or empty, as in a shell. A variable that is not set and has no default stops that server with an error naming the variable. Write `$${NAME}` to send the literal text `${NAME}`.

**Optional: Import from another agent**

If you already configured MCP servers in another coding agent, bring them over with the `/import` slash command inside a session. With no argument it pulls from every detected source:

```bash
/import
```

To target one source, name it. Each argument maps to that agent only, so pick the one your MCP config actually lives in:

```bash
/import claude     # Claude Code
/import codex      # Codex
/import cursor     # Cursor
/import opencode   # OpenCode
/import gemini     # Gemini CLI
```

It imports MCP servers alongside skills, agents, custom commands, and memory. See [Import](https://commandcode.ai/docs/import).

---

## Adding MCP servers

### HTTP transport (remote servers)

Use `--transport http` to connect to remote MCP servers:

**HTTP Examples**

```bash {{ title: 'Basic' }}
cmd mcp add --transport http notion https://mcp.notion.com/mcp
```

```bash {{ title: 'With auth header' }}
cmd mcp add --transport http github https://api.githubcopilot.com/mcp \
  --header "Authorization: Bearer ghp_xxxxx"
```

```bash {{ title: 'With env vars' }}
cmd mcp add --transport http my-api https://api.example.com/mcp \
  --env API_KEY=sk-xxx
```

### Stdio transport (local processes)

Stdio is the default transport. Use `--` to separate the server name from the command:

**Stdio Examples**

```bash {{ title: 'Basic' }}
cmd mcp add my-tool -- npx @my-org/mcp-server
```

```bash {{ title: 'With args and env' }}
cmd mcp add --env API_KEY=sk-xxx my-tool -- npx @my-org/mcp-server --verbose
```

All flags (`--transport`, `--scope`, `--env`, `--header`) must come **before** the server name. The `--` separates the server name from the stdio command and its arguments.

### Command options

|      **Flag**               | **Description**                              | **Default** |
| --------------------------- | -------------------------------------------- | ----------- |
| `-t, --transport <type>`    | Transport type: `stdio` or `http`            | `stdio`     |
| `-s, --scope <scope>`       | Where to store: `local`, `project`, or `user`| `local`     |
| `-e, --env <KEY=value>`     | Environment variable (repeatable)            | -           |
| `-H, --header <Header: value>` | HTTP header (repeatable, http only)       | -           |

---

## Command reference

All MCP management is done through `cmd mcp <subcommand>`.

| **Command**                          | **Description**                                 | **Example**                                                     |
|-------------------------------------- |------------------------------------------------|-----------------------------------------------------------------|
| `cmd mcp add`                        | Add server with CLI options                    | `cmd mcp add --transport http notion https://mcp.notion.com/mcp` |
| `cmd mcp add-json`                   | Add server from JSON config                    | `cmd mcp add-json github '{"type":"http","url":"https://..."}'`  |
| `cmd mcp list`                       | List all configured servers                    | `cmd mcp list`                                                   |
| `cmd mcp get <name>`                 | Show server details                            | `cmd mcp get notion`                                             |
| `cmd mcp remove <name>`              | Remove a server from configuration             | `cmd mcp remove notion`                                          |
| `cmd mcp auth <server>`              | Authenticate with OAuth (opens browser)        | `cmd mcp auth notion`                                            |
| `cmd mcp auth --status <server>`     | Check authentication status                    | `cmd mcp auth --status notion`                                   |
| `cmd mcp auth --list`                | List all servers with stored tokens            | `cmd mcp auth --list`                                            |
| `cmd mcp auth --clear <server>`      | Clear stored tokens                            | `cmd mcp auth --clear notion`                                    |

---

## Configuration & scopes

MCP servers can be stored in three scopes with different visibility:

| **Scope**   | **File Location**                             | **Purpose**                           |
| ----------- | --------------------------------------------- | ------------------------------------- |
| `local`     | `~/.commandcode/projects/<slug>/mcp.json`     | Private, per-project (default)        |
| `project`   | `.mcp.json` in project root                   | Shared, version controlled            |
| `user`      | `~/.commandcode/mcp.json`                     | Private, available across all projects|

**Precedence:** When the same server name exists in multiple scopes, `local` overrides `project`, which overrides `user`.

**Scope Examples**

```bash {{ title: 'Local (default)' }}
cmd mcp add --transport http notion https://mcp.notion.com/mcp
```

```bash {{ title: 'Project (shared)' }}
cmd mcp add --scope project --transport http notion https://mcp.notion.com/mcp
```

```bash {{ title: 'User (global)' }}
cmd mcp add --scope user --transport http notion https://mcp.notion.com/mcp
```

The `project` scope saves to `.mcp.json` in your project root, which is meant to be committed to Git. OAuth client secrets are automatically stripped from this file and stored securely in `~/.commandcode/mcp-tokens.json` instead.

### Local scope (default)

Stored in `~/.commandcode/`. Only available to you for the current project.

```bash
cmd mcp add --transport http stripe https://mcp.stripe.com

# Explicit:
cmd mcp add --transport http stripe --scope local https://mcp.stripe.com
```

### Project scope

Stored in `.mcp.json` at your project root. Checked into version control - shared with your team.

```bash
cmd mcp add --transport http stripe --scope project https://mcp.stripe.com
```

This creates or updates `.mcp.json`:

```json
{
  "mcpServers": {
    "stripe": {
      "transport": "http",
      "url": "https://mcp.stripe.com"
    }
  }
}
```

### User scope

Stored in `~/.commandcode/mcp.json`. Available to you across all projects.

```bash
cmd mcp add --transport http stripe --scope user https://mcp.stripe.com
```

### Config schema

The configuration files follow this schema:

**Config Schema**

```json {{ title: 'HTTP server' }}
{
  "mcpServers": {
    "my-server": {
      "transport": "http",
      "enabled": true,
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer token" },
      "env": { "API_KEY": "value" }
    }
  }
}
```

```json {{ title: 'Stdio server' }}
{
  "mcpServers": {
    "my-tool": {
      "transport": "stdio",
      "enabled": true,
      "command": "npx",
      "args": ["@my-org/mcp-server", "--verbose"],
      "env": { "API_KEY": "value" }
    }
  }
}
```

```json {{ title: 'With OAuth' }}
{
  "mcpServers": {
    "oauth-server": {
      "transport": "http",
      "enabled": true,
      "url": "https://api.example.com/mcp",
      "oauth": {
        "authorizationUrl": "https://example.com/authorize",
        "tokenUrl": "https://example.com/token",
        "clientId": "my-client",
        "scopes": ["read", "write"]
      }
    }
  }
}
```

---

## Authentication

### OAuth flow

Command Code supports OAuth 2.0 Authorization Code with PKCE for HTTP servers.

**Add a server that requires OAuth**

**Add OAuth Server**

```bash
cmd mcp add --transport http my-server https://api.example.com/mcp
```

If the server requires authentication, Command Code detects this automatically and starts the OAuth flow.

**Authenticate via browser**

A browser window opens for you to authorize. After you grant access, tokens are stored securely in `~/.commandcode/mcp-tokens.json`.

You can also authenticate later:

**Authenticate**

```bash
cmd mcp auth my-server
```

Or use the `/mcp` menu inside a session to authenticate interactively.

**Tokens refresh automatically**

Tokens are refreshed automatically when they expire. If refresh fails, re-authenticate with `cmd mcp auth <server>`.

**Token Commands**

```bash {{ title: 'Check status' }}
cmd mcp auth --status my-server
```

```bash {{ title: 'List all' }}
cmd mcp auth --list
```

```bash {{ title: 'Clear tokens' }}
cmd mcp auth --clear my-server
```

```bash {{ title: 'Re-authenticate' }}
cmd mcp auth my-server
```

### OAuth flow (remote servers)

Many remote MCP servers support OAuth 2.0. Use `/mcp` inside Command Code to authenticate:

```
/mcp
```

Select the server and follow the browser login flow. Tokens are stored securely and refreshed automatically.

**Tips:**
- Use "Clear authentication" in `/mcp` to revoke access
- If your browser doesn't open automatically, copy the provided URL
- OAuth works with HTTP and SSE transport servers

### OAuth with JSON

```bash
cmd mcp add-json my-server \
  '{"type":"http","url":"https://mcp.example.com/mcp","oauth":{"clientId":"your-client-id","callbackPort":8080}}' \
  --client-secret
```

### API key auth

For servers that use API keys, pass them as environment variables or headers:

```bash
# Via env
cmd mcp add --transport stdio --env API_KEY=your-key my-server \
  -- npx -y my-mcp-server

# Via header
cmd mcp add --transport http my-server https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

---

## The `/mcp` menu

Inside a Command Code session, type `/mcp` to open the interactive MCP manager.

```bash
/mcp
```

The menu shows:

- All configured servers with connection status
- Color-coded indicators: green (connected), cyan (authenticated), yellow (requires auth), red (error)
- Tool count for each connected server
- Actions: connect, authenticate, or remove servers

---

## Using MCP tools

Once a server is connected, its tools appear alongside built-in tools. They follow the naming convention `mcp__<server>__<tool>`:

```
mcp__notion__search_page
mcp__github__create_issue
```

You don't need to remember tool names. Just describe what you want:

```
Search for the API design doc on Notion.
```

Command Code discovers and calls the appropriate MCP tool automatically.

---

## Server examples

A list of useful MCP servers and how to add them in Command Code. These servers extend Command Code with access to external tools, documentation, and services.

### Notion

Search, read, and create pages in your Notion workspace.

```bash
cmd mcp add --transport http notion https://mcp.notion.com/mcp
```

After adding, authenticate via the `/mcp` menu inside a Command Code session.

### GitHub

Manage GitHub beyond what git supports - issues, PRs, code search, and more. It requires your GitHub Personal Access Token (PAT).

**Fine-grained token (recommended)** - scoped to specific repos, minimal permissions:

1. Go to [GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens](https://github.com/settings/personal-access-tokens)
2. Click **Generate new token**
3. Name it `commandcode-mcp`, set expiration as needed
4. **Repository access** → Choose "All repositories" or "Only select repositories"
5. **Permissions** → Repository permissions → expand and configure:
   - **Contents**: Read and write (for file operations)
   - **Issues**: Read and write (for issue management)
   - **Pull requests**: Read and write (for PR operations)
   - **Metadata**: Read-only (automatically included)
6. Generate token and copy it

**Classic token** - broader access, simpler setup:

1. Go to [GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens/new)
2. Name it `commandcode-mcp`, set expiration as needed
3. Check the **repo** scope (includes all repository permissions)
4. Generate token and copy it

Replace `YOUR_GITHUB_PAT` with your generated token:

```bash
cmd mcp add-json github '{"type":"http","url":"https://api.githubcopilot.com/mcp","headers":{"Authorization":"Bearer YOUR_GITHUB_PAT"}}'
```

For more details, see the instructions in these [GitHub MCP Server installation docs](https://github.com/github/github-mcp-server/blob/main/docs/installation-guides/install-claude.md).

### Playwright

Control and inspect a browser using Playwright. Write and run browser tests, take screenshots, and automate web interactions.

```bash
cmd mcp add playwright -- npx -y @playwright/mcp@latest
```

### Sentry

Access Sentry logs, monitor errors, and debug production issues.

```bash
cmd mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

After adding, authenticate via the `/mcp` menu inside a Command Code session.

### OpenAI Docs

Search and read OpenAI developer documentation directly from your prompts.

```bash
cmd mcp add --transport http openai-docs https://developers.openai.com/mcp
```

### Context7

Connect to up-to-date developer documentation. Dynamically fetches version-specific docs and code examples from official sources.

```bash
cmd mcp add context7 -- npx -y @upstash/context7-mcp
```

Include `use context7` in your prompts to pull in the latest docs for any library.

### Figma

Read your Figma designs and turn them into code. Use the remote server.

**Figma MCP**

```bash {{ title: 'Remote' }}
cmd mcp add --transport http figma https://mcp.figma.com/mcp
```

```bash {{ title: 'Local (Desktop App)' }}
cmd mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp
```

Figma limits how many tool calls you can make, depending on your plan and seat. See [Figma's MCP server docs](https://developers.figma.com/docs/figma-mcp-server/) for more information.

Adding the remote server opens your browser for Figma's OAuth consent. If authentication fails, retry with:

```bash
cmd mcp auth figma
```

You can also authenticate using the `/mcp` command. Tokens are stored in `~/.commandcode/mcp-tokens.json` and refresh automatically. To log out, clear the credentials with `cmd mcp auth --clear figma`. Restart the session after authenticating, then run `/mcp` to confirm Figma MCP status.

To point Command Code at a design, right-click a frame in Figma, choose **Copy link to selection**, and paste the link into your prompt. Command Code reads the node ID from the link through the Figma MCP server.

The local server needs the Figma desktop app running in Dev Mode, and it can't write to the canvas. Most users should use the remote server.

### Chrome Developer Tools

Control and inspect Chrome from Command Code. Debug pages, take screenshots, and interact with the DOM.

```bash
cmd mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest
```

Chrome must be running with the `--remote-debugging-port=9222` flag for the MCP server to connect.

### Adding any MCP server

Most MCP servers connect in three ways: as a remote HTTP server, a local stdio process, or from a JSON config.

**General Pattern**

```bash {{ title: 'HTTP (remote)' }}
cmd mcp add --transport http <name> <url>
```

```bash {{ title: 'Stdio (local)' }}
cmd mcp add <name> -- <command> [args...]
```

```bash {{ title: 'From JSON' }}
cmd mcp add-json <name> '{"type":"http","url":"https://..."}'
```

---

## Troubleshooting

**Server won't connect:**

- Check the URL or command is correct: `cmd mcp get <name>`
- For stdio, ensure the command is installed and in your PATH
- Use `/mcp` to see the connection error message

**Authentication issues:**

- Re-authenticate: `cmd mcp auth <server>`
- Clear and retry: `cmd mcp auth --clear <server>` then `cmd mcp auth <server>`
- Check token status: `cmd mcp auth --status <server>`

**Tools not appearing:**

- Verify the server is connected via `/mcp`
- The server may take a few seconds to initialize after startup
- Check that the server actually exposes tools (some only expose resources)

---

## Next steps

- [CLI Reference](https://commandcode.ai/docs/reference/cli) for all Command Code commands
- [Slash Commands](./custom-slash-commands.md) for custom prompts
- [MCP Protocol Specification](https://modelcontextprotocol.io/introduction) for building your own MCP server
- Join our [Discord community](https://commandcode.ai/discord) for support
