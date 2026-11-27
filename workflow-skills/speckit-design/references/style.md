# Style: `/design style`

I apply one named visual direction to real files. I preserve the requested content, behavior and scope.

---

## Pre-execution checklist

I check `.commandcode/design/` for `checkup-report.md`, `review-report.md` and `smell-report.md`. I read any existing reports and apply relevant findings during this pass. If none exist, I proceed normally.

---

## The direction

`/design style <name> [target]` loads the selected guide directly. If no name was supplied, I show these choices and ask for one before changing files. An unknown name gets the same list, never a silently substituted style.

- `bento`: [Bento](style-bento.md). I make a small set of unequal tiles tell one clear story.
- `neo-brutalism`: [Neo-brutalism](style-neo-brutalism.md). I build a legible, deliberately blunt interface with solid color and hard edges.
- `glassmorphism`: [Glassmorphism](style-glassmorphism.md). I build Liquid Glass-style lenses that pick up, bend and tint the scene behind floating controls.
- `retro-futurism`: [Retro-futurism](style-retro-futurism.md). I choose one past vision of tomorrow and use it consistently.
- `swiss`: [Swiss](style-swiss.md). I make the typographic grid do the work.
- `3d`: [3D](style-3d.md). I build one scene with real depth, light and material, with a static fallback.
- `minimalism`: [Minimalism](style-minimalism.md). I remove everything the task does not need.
- `editorial`: [Editorial](style-editorial.md). I set the page like a printed article.
- `futuristic`: [Futuristic](style-futuristic.md). I design a present-day interface built for what comes next.
- `maximalism`: [Maximalism](style-maximalism.md). I fill the interface with color, pattern and type, held together by hierarchy.

---

## Foundations

A style guide decides how things look. It does not teach me how to lay out a page, build a button or set type. Before I change files, I read the foundation guides for every part the target touches:

| The target has | I read |
|---|---|
| Any page, screen or section | [layout.md](layout.md) |
| Buttons, links that act as buttons, toggles | [button.md](button.md) |
| Headings, body copy, labels, numbers | [typeset.md](typeset.md) |
| A palette, accents, states, dark mode | [color.md](color.md) |
| Depth: shadows, elevation, overlays | [shadow.md](shadow.md) |
| Edges: borders, dividers, outlines | [border.md](border.md) |
| Hover, focus, press, loading, errors, forms | [interaction.md](interaction.md) |
| Transitions or animation | [motion.md](motion.md) |
| More than one viewport | [responsive.md](responsive.md) |
| Any control, form, overlay or motion | [accessibility.md](accessibility.md) |
| An app, dashboard or tool | [surface.md](surface.md) |
| A landing, marketing or portfolio page | [voice.md](voice.md) |

---

## The implementation pass

1. I read the selected guide and the foundation guides above, inspect the existing UI and project taste, and consume relevant existing design reports. I identify the target and its primary task. If there is no existing UI, I build it from scratch with [create.md](create.md), in the selected style.
2. I pick a small token set for type, spacing, color, edges and depth. I state the direction in one sentence and implement it across the requested target, including loading, empty, error and selected states where applicable.
3. I treat explicit style selection as permission to use its defining techniques, including bento tiles, hard shadows or glass, even when generic anti-slop advice discourages them. Accessibility and functionality still apply.
4. I check 320px reflow, desktop, long content, 200% zoom, keyboard order and visible focus. Normal text needs 4.5:1 contrast, large text and necessary control boundaries need 3:1. I honor reduced motion and provide solid material fallbacks.
5. I inspect the rendered result when tools allow, fix mismatches and report the files changed and checks actually run. I never claim a visual check I could not perform.

## Scope and states

- A style changes how the target looks, not what it contains. I keep the original's sections, fields, data and copy. I do not add new settings, toggles, badges, environment labels, sample records or sections that were not there. If the style seems to need more content, I say so in the reply instead of inventing it.
- The page loads in its default state. Error, empty and loading states exist and can be reached, but they stay hidden at rest. A form never shows a validation error under a valid value on load.
- When I hide state with the `hidden` attribute, I add `[hidden] { display: none !important; }`. Any `display: flex` or `display: grid` rule on the same element otherwise overrides `hidden` and shows every error and empty state at once.
- Every icon gets an explicit size, `width` and `height` attributes on the `<svg>` or a CSS size on its class. An unsized inline SVG grows to fill its container.
- Table headers line up with their columns and keep a gap between them. Status markers and badges never overlap the value beside them.

## Verification limits

- Screenshots, probe pages, contrast scripts and other check files go in the system temp directory, never in the project. I delete any I created before I reply, and `git status` shows only the files the style changed.
- I verify once: one render at desktop and one at 320px, one contrast check of the final tokens, then one round of fixes. I do not loop on re-tuning colors or re-rendering. If a check needs a tool I don't have or a command the user has not approved, I skip it and say so.

## Assets

- Icons come from one established set. If the project already uses one, I keep it. Otherwise I use Lucide or Hugeicons: installed as a package and imported by name when the project has a package manager, or copied as that set's SVG files when it is plain HTML with no build step. I do not hand-draw icons or mix sets.
- Photos and video come from Unsplash, Pexels or Pixabay when I can search them, chosen for what the content needs. I check each license and keep the attribution it requires. If I cannot reach them, I keep the project's existing imagery and say so instead of inventing image URLs.

I keep the implementation small enough for one person to maintain. I reuse the existing stack and assets; a style does not justify a new animation library or a rewrite.
