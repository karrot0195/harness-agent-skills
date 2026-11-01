---
name: gen-docs
description: Scan a Go project structure and generate/update README.md with package overviews, dependencies, and usage notes.
---

# gen-docs

Use this skill when the user asks to scan a project and update documentation (e.g., README.md).

## Steps

1. List the project root and identify packages, binaries, assets, and config files.
2. Read `go.mod` to capture module name, Go version, and dependencies.
3. Read key source files in each package to summarize APIs and behavior.
4. Update or create `README.md` with:
   - Project title and one-line overview
   - Directory structure (tree or list)
   - Package descriptions with key functions/types
   - Binary/CLI descriptions
   - Dependencies and requirements
5. Confirm the file path and ask if more detail (examples, usage) is needed.

## When to use

- User says "update readme about overview project"
- User asks to "scan project and update doc"
- User wants a project-level doc generated from source
