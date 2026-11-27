# Design System: `design-system.md` and `design-system.html`

I own two artifacts: `.commandcode/design/design-system.md` (the token spec) and `.commandcode/design/design-system.html` (the visual preview). Every mode that changes color, typography, spacing, or component language writes through this file's rules, not its own copy of them.

Extraction, not invention. I write down what the interface actually is, not what a generic system would look like.

---

## What `design-system.md` contains

- **Register:** brand or product
- **Color system:** full palette in OKLCH + hex, semantic roles (background, surface, text, accent, error, success, warning, border), dark/light strategy
- **Typography:** font families (display, body, mono), scale with rem values (xs → 6xl), weights, line-heights, letter-spacing
- **Spacing scale:** base unit and named steps
- **Component tokens:** border radius strategy, shadow levels, focus ring style
- **Button system:** primary, secondary, ghost, danger variant specs
- **Motion:** duration scale, easing functions
- **Anti-references:** what this design must not look or feel like

## What `design-system.html` contains

A visual preview — color swatches, type specimens, button variants, component examples — generated using the structure in [references/design-html.md](design-html.md) but populated with the real token values from the current interface and `design-system.md`. Never inherit the template's demo colors or fonts, and never use it as inspiration for product UI. Swatches and specimens read the project's real tokens: link the project stylesheet (or Tailwind build) and use `var(--token)`, rather than redeclaring the values in the preview, so it cannot drift from the code.

---

## STRICT — Tokens must be real, not just documented

Writing a color or size into `design-system.md` is not the deliverable. The deliverable is a real, reusable token in the codebase that components actually consume.

- Every color, spacing, radius, or type value in `design-system.md` must exist as a real CSS custom property (`:root { --color-primary: oklch(...); }`) or a Tailwind theme entry (`theme.extend.colors`, `theme.extend.spacing`, or a Tailwind v4 `@theme` block) — whichever mechanism the project already uses.
- Components must reference the token (`var(--color-primary)`, `bg-primary`, `text-[length:--step-2]`), not repeat the literal value. Two components sharing a color by coincidence instead of by shared token is a failure state.
- I document only tokens real UI consumes. A role no component uses yet (a status color, a disabled state, an unused scale step) is not defined speculatively; it is added with the first component that needs it.
- In the sections I touched, no raw literals remain in component CSS — gradients, shadows, and overlays included. A one-off value becomes a token or derives from one (`color-mix()`, relative color syntax).
- If I document a value in `design-system.md` that isn't backed by a real token in the project's CSS or Tailwind config, the work is incomplete. I wire the token before ending the turn — I do not leave it as a documentation-only entry.
- This rule is not optional and is not satisfied by good intentions in the markdown file. I verify the token exists in the actual stylesheet or Tailwind config before claiming the system is up to date.
- Scope: the wiring duty covers the sections the calling mode touched. When I create the files and a section outside that scope is still raw literals (e.g. hardcoded type sizes during a recolor), I do not tokenize it — that is out of scope. I document the values that already have tokens and list the rest under **Not yet tokenized** in that section, so a later design pass can address them.

---

## How I update the files

I check whether `.commandcode/design/design-system.md` exists.

**If it exists** — I overwrite only the section(s) the calling mode touched (color/recolor → color system section only, typeset → typography only, relayout → spacing/component tokens, redesign → every section). I leave the rest untouched.

**If it does not exist** — I create both files in the same turn: `design-system.md` (full token spec) and `design-system.html` (visual preview, using `references/design-html.md` as the structural template only, populated with real extracted values). I extract from what currently exists or from what was just built — I do not invent placeholder brand values for sections the calling mode didn't touch.

I never ask the user to run a separate command to get these files. They are written as part of the mode that triggered the change.

---

## What I refuse

- Inventing token values that aren't grounded in the real interface or the work just done
- Leaving a documented value without a matching real CSS/Tailwind token
- Overwriting sections the calling mode didn't touch
- Creating report.md, a summary, or any documentation file beyond these two artifacts
- Treating `design-system.html`'s CMD/industrial template aesthetic as inspiration for product UI

## How I know it worked

- `design-system.md` reflects the real, current interface — not generic defaults
- `design-system.html` renders from the project's own stylesheet, not template placeholders or a redeclared copy of the tokens
- Every documented token has a matching CSS custom property or Tailwind theme entry, and at least one real component references it; out-of-scope raw values are listed under **Not yet tokenized**, not presented as tokens
- Sections untouched by the calling mode are unchanged
- No extra report or documentation files were created

---

STRICT RULE — NEVER BREAK THIS
Do not create report.md, any kind of report, summary, analysis file,
or extra documentation beyond `design-system.md` and `design-system.html`.
This applies every time this file is used.
