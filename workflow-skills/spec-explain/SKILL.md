---
name: "spec-explain"
description: "Answer questions about this project by reading README.md, AGENTS.md, specs, and scanning the codebase, with optional web research. Read-only: never modifies files. Use when the user asks to explain, clarify, or investigate how something works in this repo."
compatibility: "Works in any repo with README.md/AGENTS.md; web research optional"
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

Explain, clarify, or investigate a question about this repository. Gather evidence from the project's documentation (`README.md`, `AGENTS.md`, and any specs under `specs/` and `requests/`) and by scanning the codebase. Web research is allowed when it helps (library docs, external APIs, standards). **STRICTLY READ-ONLY**: never create, edit, or delete any file, and never run commands that mutate state.

## Operating Constraints

- **Read-only**: Do not modify any files. Only read/search the filesystem and run non-mutating commands (e.g. `git log`, `git status`, `ls`, `grep`).
- **No implementation**: Do not write or change code. If the user actually wants a change, point them to the appropriate speckit skill instead.
- **Evidence-based**: Every factual claim about the project must cite the file(s) it came from (path + line/section when useful). For web facts, include the source URL.
- **Honest about gaps**: If documentation and code disagree, or information is missing, say so explicitly rather than guessing.

## Execution Steps

### 1. Parse the Question

Restate the user's question in one sentence to confirm scope. If the question is ambiguous or has multiple plausible readings, ask one clarifying question before proceeding. Otherwise proceed.

### 2. Gather Context (in parallel where possible)

1. Read `README.md` at the repo root for project overview, structure, services, build/run, configuration.
2. Read `AGENTS.md` at the repo root for project memory, code style, architecture notes, workflows.
3. Read `CLAUDE.md` if present (project-specific agent instructions).
4. If the question references a feature/spec, locate the relevant directory under `specs/` and read its `spec.md`, `plan.md`, `tasks.md` as needed.
5. Check `.specify/feature.json` for the current feature directory when relevant.

### 3. Scan the Codebase

Use `grep`, `glob`, and targeted `read_file` to find the code that answers the question. Prefer:

- Searching for identifiers, route names, config keys, or error messages mentioned in the question.
- Reading the specific files/functions rather than dumping whole directories.
- Following existing patterns: how a similar thing is already implemented elsewhere.

Bound the scan to files implicated by the question and the docs; do not exhaustively read the whole repo unless the question demands it.

### 4. Web Research (optional)

Use web search/fetch only when:
- The question involves an external library, protocol, or standard (e.g. SCTE-35, HLS, tsduck, ffmpeg) whose details aren't in the repo.
- A dependency's behavior or API needs clarification.
- The user explicitly asks for external context.

Always cite URLs for web-derived facts. Do not fabricate documentation.

### 5. Synthesize the Answer

Produce a concise, direct answer:

- Lead with the answer in 1-3 sentences.
- Follow with supporting evidence: file paths, function names, key snippets (short), and any web sources.
- Note contradictions, open questions, or missing information explicitly.
- If the question implies a change the user might want, suggest the relevant skill/command (e.g. `/speckit-specify`, `/speckit-plan`) but do not make changes.

### 6. Offer Follow-ups

End with 1-2 optional follow-up suggestions (e.g. "Want me to trace where X is configured?" or "Should I check the client side too?"). Keep it brief.

## Output Style

- Conversational and direct, matching the project's tone.
- Use markdown with code blocks for snippets.
- Cite sources inline: `internal/utils/envs.go:42` style, or `[title](url)` for web.
- No emojis unless requested.

## Examples

**Q: "How does the planner schedule sessions?"**
- Read README + AGENTS.md, grep for `planner`, read `internal/planner/*`, cite files.

**Q: "What is SCTE-35 and how is it used here?"**
- Repo scan for scte35 usage + web research on SCTE-35 standard, cite both.

**Q: "Where is SIMLIVE_KEEP_BEHIND handled?"**
- Grep codebase, cite definition and usage sites.