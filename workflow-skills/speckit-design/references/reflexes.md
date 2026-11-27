# Reflexes: The Patterns I Don't Reach For

Generated design has a look, and everyone can see it. It is not one bad element — it is the sum of reflexes: the gradient nobody chose, the grid nobody questioned, the font nobody considered. Each pattern below is a decision I skipped, dressed up as a decision I made.

This file holds in every tool and every mode. [smell.md](smell.md) diagnoses these tells after the fact; here I catch the reflex before it reaches the file.

---

## The Only Exception

A pattern from this file is right only when the user asks for that specific element by name in the current request.

"Make it modern" is not that. "Use glassmorphism on the nav" is.

When the exception fires, it covers exactly the named element in exactly the named place, and I execute it deliberately and well — a chosen pattern is different work from a reflexive one. Nothing else lifts a pattern off this list: not the brief, not the category, not a previous project, not my own taste. When in doubt, I design something else.

---

## Why These Patterns Fail

Generative models converge on the statistical average of their training data: the same gradients, the same card grids, the same fonts, the same fade-ins. The average of all design is not design — it is the absence of a point of view.

Competent and generic is still generic. Every pattern below fails not because it is ugly but because it means no one was making decisions.

---

## Color and Surface

I never use:

- **Purple-to-blue gradients** on heroes, backgrounds, buttons, or text. This is the single most recognized tell. The same ban covers indigo-to-violet, blue-purple-to-cyan, and every near neighbor of that family used as a default.
- **Glassmorphism**: frosted, semi-transparent panels floating on soft color fields. No `backdrop-filter` cards on gradient backgrounds.
- **Neon glows**: glowing borders, glowing text shadows, cyber accent halos.
- **Hacker monotone**: monospace-on-dark as a reflex for anything developer-adjacent. Monospace is for code, data, and deliberate art direction.
- **Pastel wash**: soft lavender, mint, or peach fields that exist because no color decision was made.
- **Heavy drop shadows**: dramatic elevation like `0 25px 50px -12px rgba(0,0,0,0.15)` on cards and images to fake depth. Real products do not need theatrical shadows to feel tactile. Depth comes from subtle borders, minimal shadows, or none.
- **Low-contrast text on color.** Every pair passes contrast checks. No exceptions.

Instead: a hue with a reason tied to this product, built in OKLCH, neutrals tinted toward the brand, one commitment level chosen and held.

---

## Layout and Structure

I never use:

- **Card-ification**: every section wrapped in a bordered, rounded card. Cards are for content that is genuinely card-shaped — discrete, self-contained, scannable as a unit.
- **Nested cards.** A card inside a card is never right. I flatten with type and dividers.
- **The feature tile grid**: icon + heading + one-sentence description, repeated in a uniform grid. The single most common generated section. I lead with the strongest item, vary the layout, or cut the section if it is filler. Uniform tiles need an explicit request.
- **The template hero**: badge + centered headline + subheadline + two pill buttons + image, or big number plus small label plus stat cards, or a "Trusted by" logo bar, in the order everyone has already seen. I recompose: asymmetry, a different content hierarchy, or one dominant action instead of the dual-button default.
- **Floating stat cards**: absolutely positioned cards with soft shadows hovering around a hero image for "visual interest." Stats belong in the content flow, not floating as decoration.
- **Uniform radius**: one border-radius applied globally by reflex. Radius is a decision per component role.
- **Pill-shaped everything**: `border-radius: 100px` or `9999px` on buttons, badges, and inputs as the default "modern" look. Full rounding is a deliberate choice for at most one component role, not a house style.
- **Section eyebrow labels**: a small uppercase label ("WHAT WE OFFER") above every heading. Decorative noise. Headings stand on their own.
- **Thick colored borders on rounded cards**, and **giant decorative icons above headings**.
- **Off-scale spacing**: random gaps, 18px next to 8px, misaligned grid elements. Every value comes from the spacing scale.
- **Stray whitespace and gradient cutoffs**: blank blocks and hard image edges that look like unfixed bugs.
- **Unnecessary modals**: content hidden behind popups because composing the page was harder. A modal needs a reason.

Instead: composition derived from the work pattern. If the layout could be pasted into an unrelated product without becoming wrong, it is too generic and I recompose.

---

## Typography and Copy

I never use:

- **Reflex fonts**: Inter, Roboto, Plus Jakarta Sans, or any generic sans chosen because it is safe. System fonts are legitimate for product UI. On brand surfaces the typeface is a decision.
- **Reflex pairings**: DM Sans + DM Serif Display, Inter + Playfair Display, Space Grotesk on anything "tech" — pairings that signal "friendly and premium" without a reason tied to this product. A pairing earns its place or I use system fonts and let composition carry the character.
- **Style hodgepodge**: one word of a headline in a different font, weight, or gradient fill for no structural reason.
- **Emoji in UI copy**: not in headings, buttons, labels, empty states, or microcopy.
- **Filler copy**: "Clean. Modern. Simple.", "Supercharge your workflow", "Unlock the power of", vague benefit-speak with no voice, placeholder text shipped as content.
- **Exclamation points, Title Case buttons, or em dashes**, per the writing rules.
- **Flat hierarchy**: heading levels so close they blur. Minimum 1.3 scale ratio on product surfaces.

Instead: copy that names the actual thing, the actual action, the actual work.

---

## Iconography and Assets

I never use:

- **3D abstract humans**: faceless gradient figures in impossible poses, floating geometric collaboration blobs.
- **Mixed icon sets**: outline next to filled next to duotone in one view. One set, one stroke weight, one size grid.
- **Hallucinated icons**: icons that do not match their labels, abstract shapes standing in for meaning. Every icon is verified against its label.
- **Off-theme strays**: a lone component in the wrong theme color or style, betraying a paste from another context.

Instead: one curated icon set used consistently, or real product imagery and domain artifacts as proof.

---

## Motion and Interaction

I never use:

- **Blanket scroll reveals**: every element fading in and rising as the page scrolls, uniformly.
- **Bounce and elastic easing.** Toys, dated on arrival.
- **Uniform stagger delays**: mechanical index-times-constant cascades. The eye reads mechanical precision as robotic.
- **Default parallax**: parallax as reflex rather than directed camera work.
- **Layout-property animation.** Only `transform` and `opacity`.
- **Idle-only components.** A component designed in one state is a sketch. All nine states exist.

Instead: motion as character — physics-based, sharp deceleration, exits at roughly 70% of entrance duration, `prefers-reduced-motion` respected.

---

## The Gate

Before I call design work done, I read the actual output the way a stranger would:

1. **Gradient check** — search the styles for gradients. Any purple, blue, or violet family gradient without an explicit request gets removed.
2. **Card census** — count cards. Nested cards get flattened. Cards holding non-card-shaped content get restructured. A uniform icon-heading-sentence tile grid gets broken or cut.
3. **Radius and shadow sweep** — search for `border-radius` and `box-shadow`. Pill radii outside one deliberate role get squared to 4–8px. Theatrical shadows get replaced with borders or minimal elevation. One global radius gets differentiated per role.
4. **Hero check** — does the hero follow badge-headline-subtext-two-buttons-image, or have floating decorative cards? It gets recomposed.
5. **Font check** — is the typeface (and the pairing) a decision or a reflex? An unjustified Inter, Roboto, or DM Sans + DM Serif Display gets replaced or justified.
6. **Copy read** — any emoji, filler phrase, exclamation point, Title Case button, or uppercase eyebrow label above a heading gets rewritten or removed.
7. **Spacing lint** — every margin, padding, and gap on the scale. Off-scale values get fixed.
8. **Icon audit** — one set, and every icon matches its label.
9. **Motion audit** — no bounce, no blanket scroll reveal, reduced motion handled.
10. **The two-second test** — if a stranger could glance at this and say "AI made that", it has failed. I rework the reflex, not the symptom.

In a mode that changes files, a failed check inside the request gets fixed before I respond. A failed check outside the request, or on an element the user named, stays as it is and I name it in my reply. In a report mode every failed check becomes a finding instead. The fix goes after the reflex, not the symptom — swapping a purple gradient for a teal one, or a pill button for its nearest rounded neighbor, is the same skipped decision wearing a different color.

---

## How I Know the Work Is Mine

- Every pattern in the output traces to a decision about this product, or to an element the user named
- "The brief implies it" and "it fits the category" never stood in for a decision
- The gate ran and every check passed
- A stranger glancing at the result would not say a machine made it
