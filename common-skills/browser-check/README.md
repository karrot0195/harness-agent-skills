# Browser Check Skill

A Playwright-based URL verification tool with named task support and reusable flow steps.

## Features

- **Named Tasks**: `browser-check verify login screen` — first run surveys source + prompts; subsequent runs reuse saved `flow_step`
- **YAML Input**: One-off checks via `--yaml config/verify-url.yaml`
- **Source Survey**: Lightweight scan of `spec/`, `docs/`, `specific/*` for task-relevant URL hints
- **Publish/Private**: Public flow_steps go to `.specific/browser-check/`; private stay in `.personal/flow_steps/`. Secrets never published.

## Usage

```bash
# Named task (recommended)
browser-check verify login screen       # first run: investigate + save
browser-check verify login screen       # subsequent: reuse

# YAML input
browser-check --yaml config/verify-url.yaml

# Interactive (no flags)
browser-check
```

## Verification Types

1. **Title** — exact match of page title
2. **Text** — substring search in page body text
3. **Element** — CSS selector existence check
4. **Status** — HTTP response code comparison

## Files

| File | Purpose |
|---|---|
| [`SKILL.md`](SKILL.md) | Full skill documentation |
| [`scripts/browser-check.js`](scripts/browser-check.js) | Node script (Playwright runner) |
| [`templates/browser-check-template.yaml`](templates/browser-check-template.yaml) | YAML configuration template |

## Requirements

- Node.js (v14+)
- Playwright installed (`npm install --save-dev playwright && npx playwright install`)
- js-yaml (optional — falls back to a simple line-based parser)
