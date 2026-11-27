# Findings: severity, evidence, verdict

Every report mode — `smell`, `checkup`, `review` — uses this scale, this evidence bar, and this verdict. Scores answer "how good is this?". Findings answer "what do I fix, in what order?". A report needs both.

A finding the user cannot act on is an observation. This file turns observations into work.

---

## Severity

One scale, three levels.

**HIGH** — blocks a task, misleads the user, hides content or controls, risks data loss, or repeats as a systemic failure across the surface.

**MEDIUM** — meaningfully harms comprehension, efficiency, adaptability, or consistency. The user gets there, but pays for it.

**LOW** — isolated polish with limited task impact.

Within a severity I rank by reach and leverage. A fix in a token or a shared component outranks the same symptom in one leaf component, because it fixes every instance at once.

---

## Escalation Triggers

These are `HIGH` on sight. I do not average them down because the surface is minor, and I do not hold them back to keep a report short.

- Something a user can operate that never says what it is
- Something Tab can land on with nothing visible to show it landed
- A path the mouse can walk and the keyboard cannot
- Decorative or vestibular motion — parallax, self-starting video/GIFs, spinning, long-travel movement, autoplaying carousels — that runs regardless of `prefers-reduced-motion`
- Anything cut off, buried, or out of reach once the window narrows to 320px or the text doubles
- Text sitting on a background it does not have enough contrast against
- A distinction the user can only make by seeing a hue
- Something irreversible with no confirmation, no undo, and nothing marking it apart from a safe action
- A field whose placeholder is doing the label's job

Triggers rank above every other finding and are listed first. Mechanics and fixes: [accessibility.md](accessibility.md).

These set the *cost* of a symptom, not whether it exists. The discipline reference still decides whether the symptom is present.

---

## Evidence

Every finding cites `path/to/file:line` and shows the current implementation. When the artifact has no source files, I cite the exact screen and component instead.

I do not report a code-level finding from appearance alone, or a visual finding from source alone when runtime behavior decides the result. If I could not check something, it is not a finding — it is a verification gap, and I say so.

---

## Findings Table

Findings go in one table, ordered by severity, then by reach and leverage. Never as loose "Before:" / "After:" lines.

| # | Severity | Discipline | Location | Before | After | Why |
|---|---|---|---|---|---|---|
| 1 | HIGH | Accessibility | `src/CommandBar.tsx:88` | `<div onClick={run}><PlayIcon /></div>` | Make it a `<button>`, name it `Run command`, hide the glyph from the tree | Nothing here is focusable, and nothing announces what it does |
| 2 | HIGH | Color | `src/Badge.tsx:14` | Status shown as `bg-red-500` / `bg-green-500` only | Add an icon and a text label beside the fill | Meaning carried by color alone |
| 3 | MEDIUM | Layout | `src/Toolbar.tsx:22` | Five icon buttons at `gap-1` | Raise to the project's `12px` step | Adjacent targets merge and get mis-tapped |

**Discipline** is the reference that owns the rule: Accessibility, Color, Type, Layout, Motion, Interaction, Writing, Surface, Voice. One rule, one owner — when two references seem to cover an issue, it belongs to whichever owns the underlying rule, and the secondary effect goes in the **Why** cell. I report it once.

---

## Consolidate

One root cause is one finding. Twelve components missing focus rings because a shared button strips the outline is one row with twelve locations, not twelve rows.

I never pad a report to look thorough. A short findings list is a valid result, and so is an empty one.

---

## Considered but Rejected

Every report includes 2–5 candidates I inspected and deliberately did not report. This is how the user can tell restraint from oversight.

| Location | Candidate | Rejected because |
|---|---|---|
| `src/Card.tsx:28` | Increase the shadow | Depth already matches the shared surface token; changing one card would cost consistency |

I drop a candidate when the discipline reference allows what is already there, when I could not gather enough evidence to be sure, when the project's way of doing it holds up on its own merits rather than merely being the way it has always been done, or when my proposed change would cost complexity and buy the user nothing.

These are real candidates from this pass, not invented filler. If the surface genuinely had fewer borderline calls, I list the ones that exist and say so.

---

## Verification

I list every check I ran, the exact command or interaction, and what I observed. Checks that passed and checks marked **Not verified** go in separate groups.

A verification gap never becomes a finding, and never becomes a silent pass either.

---

## Verdict

Every report ends with exactly one:

- **Block** — at least one `HIGH` is still standing.
- **Needs changes** — nothing `HIGH` left, but `MEDIUM` or `LOW` work is outstanding.
- **Approve** — nothing left to act on, and I actually ran the checks I am claiming coverage from.

I do not write "Approve" with pending actionable findings, and I do not write "Block" for polish.

---

## Report Modes Do Not Fix

`smell`, `checkup`, and `review` produce findings only. The fix happens when the user runs `redesign`, `relayout`, `recolor`, `typeset`, `a11y`, `deslop`, `refine`, or `finish` — a separate, explicit command.

The severity, the locations, and the **After** column are what those modes consume next. A finding written vaguely today becomes a fix nobody can apply tomorrow.
