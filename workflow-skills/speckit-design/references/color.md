# Color: `/design recolor`

I treat color as atmosphere, structure, and promise. A palette is not a bag of nice swatches. It is the emotional weather of the interface, the hierarchy system, and the accessibility contract.

I pick color after I know what the surface is trying to make someone feel. Calm is a different palette from urgency. Trust is different from momentum. A brand page can flood the room. A product screen earns restraint.

---

## Pre-execution checklist

Before proceeding, check for existing reports in the `.commandcode/design/` directory. Look for these files:

- `checkup-report.md`
- `review-report.md`
- `smell-report.md`

If any of these files exist, read the report content and use it as context for your analysis. Prioritize issues flagged in the reports and reference specific findings when making changes.

If no reports are found, proceed with the task normally.

---


---

## Color Follows Composition

The work pattern decides where color is allowed to carry weight.

Monitor surfaces reserve strong color for urgency, status, freshness, and thresholds.

Operate surfaces use color to separate tools, active objects, selection, and feedback.

Compare surfaces keep color stable across rows, columns, legends, and categories.

Configure surfaces use color for dependency, validation, preview, and commit risk.

Learn surfaces use color for pacing, section memory, progress, and emphasis.

Decide surfaces use color to focus proof, action, reassurance, and risk.

Explore surfaces use color for category, active filters, map clusters, and reversible paths.

I do not spread accent color evenly because the composition feels empty.

---

## System Bar

`/design recolor` creates or repairs a color system. It is not an accent swap.

At minimum, I define and apply roles for canvas, surface, text, muted text, border, primary action, secondary action, focus, selection, success, warning, error, disabled, and any domain-specific status colors.

I verify that real components use the roles: navigation, hero or page header, body content, controls, cards or panels, forms, states, and at least one edge case.

Changing one button color, adding a gradient, or darkening the background is not enough unless the user explicitly asked for that one change.

---

## What I Decide First

I decide the emotional arc before I decide the hue.

- Arrival: what the user feels before reading
- Decision: what needs the strongest signal
- Completion: what confirms progress or relief
- Risk: where danger, loss, or uncertainty appears
- Rest: where the eye gets to stop working

If the palette does not support that arc, the colors are decorative. I replace them.

---

## My Color Space

I build fresh palettes in OKLCH. I do this because lightness has to behave visually, not mathematically. Equal lightness moves should look equal. HSL cannot promise that.

I keep chroma under control at the extremes. Near-white high chroma fluoresces. Near-black high chroma muddies. The middle of a scale can carry more color; the ends need restraint.

I tint neutrals toward the brand hue. Pure gray goes cold next to color. A tiny hue cast makes surfaces feel related without shouting.

---

## Palette Strategies

I choose the strategy by intent.

**Whisper** means neutrals carry the surface and one accent carries action. Product UI starts here. The accent stays rare enough to mean something.

**Statement** means one color owns a large part of the surface. Brand work often belongs here. If the color is the voice, I let it speak.

**Conversation** means several named roles, each with a job. Campaigns, editorial systems, and data-rich surfaces can use this. I avoid decorative extras with no role.

**Flood** means the surface is the color. Hero moments, capsule pages, launch pages, and art-directed sections can earn this. Product chrome almost never does.

---

## What I Refuse

- Indigo or blue-purple because the brief says tech
- Cyan accent on neutral SaaS because it feels safe
- Indigo-to-violet gradients on CTAs
- Color used only because a component needed "visual interest"
- Calling a one-off accent change a recolor pass
- Adding decorative gradients without semantic color roles
- Red and green as the only difference between states
- Pure black, pure white, or pure gray as a lazy default
- Accent color spread across everything
- Dark mode made by inversion
- Transparency used because the palette is unfinished

---

## Contrast Is Not Optional

I check contrast as a design material, not as a late compliance pass.

Body text must be comfortably readable. UI components and icons must remain visible. Placeholder text still counts. Text over images needs a stable backing treatment, not hope.

I never let color carry meaning alone. State needs shape, label, icon, position, or motion support.

---

## Contrast Mechanics

Contrast is always measured between a **foreground** and the **background it actually renders against** — usually the nearest parent's background, not the page's.

**Report, don't repaint.** When a pair fails, I report the pair, its measured value, and the threshold it misses. A project's colors are a design decision; I change them when the user asks, or when the mode I am running is a fix mode.

APCA is the default because it is perceptually accurate and pairs naturally with OKLCH. Lc is signed — positive is dark-on-light, negative is light-on-dark — so I compare absolute values.

| Content | APCA minimum | Preferred |
|---|---|---|
| Body text (blocks and columns) | Lc 75 | Lc 90 |
| Non-body text (labels, headlines) | Lc 60 | Lc 75 |
| Large text (≥36px) | Lc 45 | Lc 60 |
| UI components, placeholder, disabled | Lc 30 | — |

WCAG 2 still governs a formal conformance claim: 4.5:1 AA and 7:1 AAA for normal text, 3:1 AA for large text (≥24px, or ≥18.5px bold) and for UI components and graphical objects.

**Fixing in OKLCH.** Lightness is the clearest first lever. I move L and preserve C and H where I can, then remeasure the rendered pair:

```css
/* Failing: too little lightness distance (Lc ≈ 50) */
color: oklch(0.65 0.08 250);
background: oklch(0.95 0.02 250);

/* Fixed: darken the foreground, C and H unchanged (Lc ≈ 90) */
color: oklch(0.3 0.08 250);
background: oklch(0.95 0.02 250);
```

Mid-lightness backgrounds cap what is achievable: on a background at L 0.75, even pure black text reaches only about Lc 60. Body text needs a background near one of the extremes.

Quick gaps for body text: on a light background (L > 0.9) the foreground wants L below 0.35; on a dark background (L < 0.25) the foreground wants L above 0.9. The gap is asymmetric because APCA is polarity-aware.

The light/dark crossover sits at **L 0.73** — higher than intuition suggests. Between 0.6 and 0.73 a background already looks light, but white text still scores meaningfully better than black.

---

## OKLCH Mechanics

`oklch(L C H)` or `oklch(L C H / alpha)`. L is 0–1 and perceptually uniform. C is 0 to about 0.4 and its maximum depends on both L and H. H is 0–360. Alpha uses slash syntax, never commas. Three decimals for L and C, and `-0` is written `0`.

**The gamut is irregular.** At L 0.5 in sRGB, purple (H ≈ 285) reaches C ≈ 0.29, red-orange C ≈ 0.20, and cyan (H ≈ 195) only C ≈ 0.09. The peak hue moves with lightness. If chroma exceeds the maximum for its L and H, the color clips — I reduce C and hold L and H.

```css
.accent { color: oklch(0.7 0.2 150); }          /* sRGB-safe */

@media (color-gamut: p3) {
  .accent { color: oklch(0.7 0.3 150); }        /* wider gamut enhancement */
}
```

**Palette scales** run 50 (lightest) to 950 (darkest); 11 steps matches Tailwind, 9 is a leaner default. I clamp lightness to [0.05, 0.95] — pure black and pure white carry zero chroma — distribute L evenly, then clamp chroma *per step* to a percentage of that step's maximum. High-chroma base colors come out less chromatic at the ends. That is correct.

**Multi-hue palettes share the same L and the same chroma *percentage*, not the same absolute C.** Same L guarantees equal perceived brightness; same percentage guarantees equal vividness relative to each hue's own ceiling:

```css
--blue-500:  oklch(0.623 0.141 250);  /* 80% of max 0.176 */
--green-500: oklch(0.623 0.157 145);  /* 80% of max 0.196 */
--red-500:   oklch(0.623 0.202 25);   /* 80% of max 0.253 */
```

**Hue drift** is how I diagnose an inherited HSL ramp: convert each step to OKLCH and compare H. More than 10° of spread across the scale is visible drift — `hsl(240, 80%, 20%)` and `hsl(240, 80%, 90%)` land ~16° apart, which is why the light end of a blue ramp goes purple.

**Respect the existing notation.** I do not convert a hex or RGB token system to OKLCH because this file was loaded. A consistent hex system beats a second color representation introduced for one isolated fix. I convert when the task *is* a color-system pass. In Tailwind v4 the `@theme` block takes OKLCH values directly, and the `/50` opacity modifier compiles to slash-alpha.

---

## The Grey Test

I mentally strip every hue to gray. The hierarchy must survive.

If primary, secondary, and accent collapse into the same value, the palette fails for color-blind users and for tired users in bad lighting. I separate lightness before I add more hue.

---

## Dark Mode

Dark mode is a second theme. It is not light mode with the lights off.

Depth comes from surface lightness, not heavy shadow. Accents lose a little chroma so they do not glow. Borders become subtle light, often with a trace of brand hue. Light text needs careful weight because it reads heavier and brighter than dark text.

I start by swapping the semantic roles, then tune the dark values independently. I do not mechanically reverse every palette step: equal OKLCH steps do not guarantee that every foreground/background pair keeps its contrast when the polarity flips. Every pair gets rechecked in both appearances.

---

## Domain Default Trap

I ask whether the palette could be guessed from the domain.

A legal platform does not have to be navy and serif. A developer tool does not have to be dark with a terminal font. A logistics product does not have to be yellow and utilitarian. A health app does not have to be white and calm blue.

If the palette is the first idea anyone would expect, I change the scene sentence before I change the swatches.

---

## How I Know Color Is Working

- The palette is applied to real UI, not only declared
- Semantic roles cover actions, text, surfaces, borders, focus, and states
- The dominant color is memorable for the right reason
- The primary action is obvious without being loud everywhere
- Neutrals feel related to the brand
- State colors are consistent and learnable
- The design still reads in grayscale
- Color blindness simulation keeps primary roles distinct
- Dark mode feels authored, not inverted
- The palette does not smell like a generated SaaS template

## Design System Update

After all color changes are complete, update the design-system artifacts following [references/system.md](system.md).

- If `.commandcode/design/design-system.md` exists — update only the color system section (palette in OKLCH + hex, semantic roles, dark/light strategy). Leave typography, spacing, and component sections untouched.
- If it does not exist — create both `.commandcode/design/design-system.md` (full token spec) and `.commandcode/design/design-system.html` (visual preview using `references/design-html.md` as template) by extracting non-color sections from the current interface — list any of their values that are still raw literals under **Not yet tokenized** rather than wiring them (do not invent new typography/spacing/component decisions in a recolor pass).

Do this in the same turn. Never ask the user to run a separate command. Every color token written must be backed by a real CSS custom property or Tailwind theme entry that components reference — not a hardcoded value repeated across files. See `references/system.md` for the strict rule.

STRICT RULE — NEVER BREAK THIS
Do not create report.md, any kind of report, summary, analysis file,
or extra documentation. This applies every time this file is used.
Generate no reports unless explicitly asked.
Exception: `.commandcode/design/design-system.md` and `.commandcode/design/design-system.html` are required design-system artifacts, not reports or extra documentation. The "Design System Update" section above applies to those two files and supersedes this rule for them only.
