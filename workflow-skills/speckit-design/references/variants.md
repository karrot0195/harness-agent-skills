# `/design variants`

I make alternative directions of one design, so the user can compare them and pick one. Then I apply the picked variant to the actual design. Every variant solves the same job with the same content, flows, and states. Only the design direction changes.

This mode writes files on purpose. The viewer at `.commandcode/variants/index.html` is the deliverable the user asked for, not a mockup or a report. I create no markdown reports.

---

## Step 1: Always ask how many

Before I read the project or change any file, I call `ask_user_question` with one question:

- Question: "How many variants should I make?"
- Header: "Variants"
- Options:
  - "3 variants (Recommended)": three distinct directions, all visible on one screen.
  - "4 variants": four directions, shown two at a time.

The user can type another number through Other. I accept 2 to 6. For anything else I ask once more and name the range. I ask every time, even when the prompt already contains a number. I wait for the answer before I continue.

---

## Step 2: Find the design

I check whether the project has interface code. I look for `.html`, `.css`, `.js`, `.ts`, `.jsx`, `.tsx`, `.vue`, or `.svelte` files, using the same test as the bare `/design` routing. Files under `.commandcode/` do not count.

- **Interface exists:** the target is the design the user named. If no target was given, I pick the main screen from the prompt and the project, and I name it in my reply.
- **Project is empty:** I build the base design first. I follow [create.md](create.md) to scaffold `index.html` with the design system wired in, then build the interface. That base is the design I make variants of.

---

## Step 3: Pick the directions

Each variant gets a different direction from the same brief. I choose them before I write any markup, and I write each one down as a short line: name, premise, and what it changes.

Every variant must look totally different from every other variant. Each pair differs on all five of these axes, not just some:

- **Composition:** the work pattern and spatial premise. Monitor, operate, compare, configure, learn, decide, or explore. See the composition section in [SKILL.md](../SKILL.md).
- **Palette:** color mood and the role each color plays. See [color.md](color.md).
- **Type voice:** typeface pairing, scale, and hierarchy. See [typeset.md](typeset.md).
- **Edges and depth:** radius, borders, and shadow language. See [border.md](border.md) and [shadow.md](shadow.md).
- **Controls:** button and control family. See [button.md](button.md).

A color swap alone is not a variant. Neither is the same layout with new fonts and radius. If someone could mistake two variants for the same design at a glance, I rework one of them before I ship. I also write down the five choices for each variant, one per axis, and check that no two variants share a choice on any axis.

The variants are product designs. They never borrow the look of the `index.html` viewer or of [design-html.md](design-html.md).

---

## Step 4: Build the variant files

I do not edit the original design files until the user picks a variant in Step 7. Everything this mode creates lives in `.commandcode/variants/` at the project root. I never write a viewer or variant file to the project root or anywhere else:

```
.commandcode/variants/
  index.html         the comparison viewer
  original.html      snapshot of the original, when it is a standalone page
  variant-1.html
  variant-2.html
  ...
```

If `.commandcode/variants/` already holds files from an earlier run, I move them into `.commandcode/variants/previous/<YYYY-MM-DD-HHMM>/` before I write anything. A run with fewer variants must not leave an old `variant-5.html` beside the new ones, where the viewer or a later "apply variant 5" would pick up a direction from the wrong run.

Rules for every variant:

- It is a standalone HTML page with its own `<!doctype html>`, viewport meta, styles, and any scripts. It must render with no build step and no dev server.
- Asset paths are correct from `.commandcode/variants/`. If the variant uses the project's images or fonts, I point at them with relative paths such as `../../assets/logo.svg`, or inline them.
- If the original is a framework app, I rebuild the screen as a standalone page with the same copy, data, flows, and states. I say in my reply that these are static previews and are not wired into the app.
- It keeps every state the original has: default, empty, loading, error, and the rest that apply. A variant that drops states is not a valid variant.
- It uses real content from the original, including the hardest strings and the longest lists. No placeholder copy.
- It adds no content the original lacks: no new fields, sections, timestamps such as "Last changed", badges or sample records. Only the direction changes, so the applied design in Step 8 carries no invented content either.
- Its default render shows the default state. Error, empty and loading states stay hidden at rest. Where `hidden` hides them, the variant sets `[hidden] { display: none !important; }`, so a `display` rule cannot reveal them.
- It works at phone width and at desktop width.

If the original is a standalone HTML page, I copy it to `.commandcode/variants/original.html`, so the viewer can link to the original as it was when the variants were made.

---

## Step 5: Build the viewer, index.html

`.commandcode/variants/index.html` is a comparison viewer. The whole viewer fits in one screen: the page is exactly `100vh` tall, and the page itself never scrolls. The user sees the variants side by side without scrolling down.

### Look

The viewer follows [design-html.md](design-html.md): black `#000` background, `#0a0a0b` panels, `#222226` borders, sharp `0px` corners, corner boxes on each panel, Inter for text, monospace uppercase labels in `#666` such as `// VARIANT 01`. I use that file's header pattern, section container, corner boxes, and secondary button style. That aesthetic belongs to the viewer only, never to the variants inside it.

### Layout

The viewport splits into three rows, with no page scroll:

1. **Header**, a compact single row: `// VARIANTS` label, the design name, the variant count, the date, and an "Original" link that opens the original in a new tab.
2. **Stage**, filling all remaining height: the variant panels side by side.
3. **Footer bar**, a compact single row: the Prev and Next buttons and a page indicator such as `01-02 / 05`.

How many panels the stage shows at once:

| Variants | On screen at once | Prev / Next |
|---|---|---|
| 2 | 2 | Hidden |
| 3 | 3 | Hidden |
| 4, 5, 6 | 2 | Shown |

When paging shows 2 at a time and the count is odd, the last page shows the final variant in the left slot at the same width. The right slot shows an empty panel labeled `// END`, so panel widths never jump between pages.

Below 768px wide, the stage shows one panel at a time and Prev and Next are always shown.

### Each panel

- A label row: `// VARIANT 01`, the direction name, and an "Open" link that opens that variant's file in a new tab.
- One line with the premise: the composition, palette, and type choice.
- The variant in an `<iframe>` filling the rest of the panel. Iframes keep each variant's CSS isolated.
- The iframe renders the variant at a 1440px desktop viewport and is scaled down with `transform: scale()` to fit the panel width. Its height is the panel height divided by the scale, so it fills the panel exactly. I measure the iframe's own box with `getBoundingClientRect()` after the label row and premise line lay out, not the whole panel, so no empty band is left under the scaled frame. The variant scrolls inside its iframe. I recompute the scale on window resize. Below 768px I drop the scaling and render the iframe at the panel's real width.

### Navigation

- Prev and Next are real `<button>` elements with visible focus, disabled at the first and last page.
- Left and Right arrow keys also page.
- Paging swaps which variants are in the panels. The page itself still does not scroll.

### Verify the layout

At 1440x900 and at 1280x720, the page has no vertical or horizontal scrollbar, the header and footer are fully visible, and every panel shows its variant.

---

## Step 6: Verify, then open it for the user

I check the result before I report:

- Every iframe renders content, not a blank frame, at every page of the viewer.
- Every variant looks totally different from every other one: a different composition, palette, type voice, edges and depth, and control family. If two share any of these, I change one and check again.
- Each variant still has the original's states and works at phone width when opened on its own.
- The original design files are unchanged. I check this with `git status` or a file comparison.

Then I open the viewer in the user's default browser automatically, without asking. First I resolve the absolute path of `.commandcode/variants/index.html` and build its live link, a `file://` URL such as `file:///Users/ana/shop/.commandcode/variants/index.html`. On WSL the link is the Windows path from `wslpath -w`, as `file:///C:/...`.

I open that link with the platform's command, through the shell tool, in the background so it does not block:

- macOS: `open "<link>"`
- Linux: `xdg-open "<link>"`
- WSL, where `/proc/version` mentions Microsoft: `wslview "<link>"`, or `explorer.exe "<link>"` if `wslview` is missing
- Windows PowerShell: `Start-Process "<link>"`. In `cmd.exe`: `start "" "<link>"`. The `start ""` form fails in PowerShell, where `start` is `Start-Process` and rejects the empty title.

If the open command fails, I say so. The reply still gives the link, so the user can open it themselves.

Only claims I checked go in the reply. If I could not verify something, I say so.

---

## Step 7: Ask which variant to apply

After the viewer is open, I first send a short message: how many variants I made, the viewer path and its `file://` link, and each variant's name and premise in one line. Then I call `ask_user_question` with one question, so the user can compare in the browser and answer:

- Question: "Which variant should I apply to the actual design?"
- Header: "Pick"
- Options: one per variant, labeled with its number and direction name, such as "Variant 1: Ledger". The description is its premise in one line.
- When there are 2 or 3 variants, I add a last option: "Not yet": keep the original and leave the variants to compare.

The question takes at most 4 options. With 4 variants, the user types "not yet" through Other. With 5 or 6, the options are variants 1 to 4, and the user types 5, 6, or "not yet" through Other. I wait for the answer before I continue.

If the user picks "Not yet" or does not pick a variant, I leave the original design untouched and skip to Step 9. The user can tell me later which one to apply, even in a new session. Then I read the top level of `.commandcode/variants/`, never `previous/`, to find the variant files and their names, and follow Step 8.

---

## Step 8: Apply the picked variant

I update the actual design, the files the variants were made from, so it matches the picked variant. The variant file is the reference. I do not copy it over the original blindly:

- **Standalone HTML page:** I bring the variant's markup structure, styles, and scripts into the original file. If the original links external CSS or JS files, I update those files instead of inlining everything. I keep the original's file names, IDs, data hooks, form actions, and links that other code or pages depend on.
- **Framework app:** I rebuild the real components in the picked direction. I keep their data, logic, props, routes, handlers, and state. Only the markup structure and styling change. Design tokens and theme files change where the direction needs it.
- **Built from scratch in Step 2:** the base design is the original. I apply the variant to it the same way.

The applied design keeps every state the original has and works at phone width and desktop width. I leave `.commandcode/variants/` in place, so the user can still compare against the other directions.

Then I verify:

- The actual design now matches the picked variant in composition, palette, type, edges, and controls.
- Every state of the original still renders, and nothing that other code depends on was renamed or removed.
- If the project has a typecheck, lint, or build script, I run it and it passes.
- I list the changed files with `git status` or a file comparison.

---

## Step 9: Reply

The reply is short and checked:

- Which variant I applied, or that the user chose not to apply one yet.
- The files I changed in the actual design.
- Whether the variants were static previews, if the original is a framework app.
- What I verified, and anything that did not meet the bar.
- The next step: `/design finish` polishes the applied design, or `/design review` checks it.
