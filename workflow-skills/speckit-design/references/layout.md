# Layout

I use layout to direct attention. Before color, type, shadow, or motion, I decide where the eye lands, what it understands, and where it goes next.

Layout is not filling containers. It is pressure, rhythm, grouping, and sequence.

---

## Composition Comes From Work

I name the dominant work pattern before I arrange anything.

Monitor layouts expose priority and change: status bands, live feeds, alert columns, metric clusters.

Operate layouts keep tools near action: command bars, canvases, inspectors, side panels, direct controls.

Compare layouts hold alignment steady: tables, matrices, split views, ranked lists, dense rows.

Configure layouts group choices and consequences: forms, settings clusters, summaries, previews, commit areas.

Learn layouts carry attention through time: article flow, walkthrough rhythm, progressive sections.

Decide layouts remove alternatives: proof, objection handling, risk reduction, one dominant action.

Explore layouts make movement cheap: search, filters, maps, galleries, clusters, reversible paths.

A layout that ignores its work pattern is decoration pretending to be structure.

---

## Applied Layout Bar

Layout work must visibly change how the eye moves.

At minimum, I verify focal point, reading path, grouping, section rhythm, responsive order, and the relationship between content and actions.

Changing margins, max-widths, or gap values is not enough if the screen still reads the same.

---

## What I See First

I look for the dominant mass. If everything has equal weight, nothing has meaning.

I ask:

- Where does the eye land first?
- What is the second read?
- What can wait?
- Which groups belong together?
- Which section needs more air?
- Which thing is visually heavy but conceptually minor?

Then I move the surface until the answer is obvious.

---

## Rhythm

Command Code has a strong spatial taste: the 1-4-9 rhythm.

One unit handles micro-breaths. Four units handle ordinary component relationships. Nine units handle section breaks and major shifts. The exact values can translate to the system in front of me, but the rhythm stays intentional.

I avoid random gaps. A strange gap is a bug unless it is doing deliberate optical work.

---

## The Three Planes

I think in planes.

**Background plane** holds canvas, atmosphere, decorative imagery, and anything the user cannot directly operate.

**Content plane** holds text, forms, controls, cards, tables, and the core work.

**Attention plane** holds popovers, drawers, modals, command surfaces, tooltips, and urgent feedback.

When the planes fight, users feel it as confusion. I separate them with position, lightness, depth, and motion.

---

## Composition Mass

Large things are heavy. Saturated things are heavy. High-contrast things are heavy. Isolated things are heavy. Bottom-right weight often needs a top-left counterweight.

I balance mass rather than centering boxes. Sometimes the right layout is stable. Sometimes it needs tension. The key is that the tension is chosen.

---

## Patterns I Use On Purpose

**Centered symmetry** is useful for singular, formal, high-confidence moments. It becomes dull when every section repeats it.

**Asymmetry** creates energy when the counterweight is deliberate. Timid asymmetry looks broken.

**Strict grids** create authority. They work well for technical, editorial, financial, and operational surfaces.

**Z-flow** can guide marketing pages toward a decision, but it becomes formula when every landing page copies it.

**F-flow** belongs to dense reading and scanning surfaces: articles, search results, docs, dashboards.

**Layered sections** work for storytelling, but each layer needs a different role or it becomes stacked wallpaper.

**Modular grids** scale well for catalogs and dashboards. They need featured mass or variation when hierarchy matters.

---

## Cards Are Not The Default

Cards are for distinct, comparable, or clickable objects. They are not a universal layout fluid.

I group with spacing, alignment, type, and dividers before I add another box. I never nest cards to solve a hierarchy problem. Nested cards mean I have not decided what belongs together.

---

## The Cliffhanger

I avoid dead-perfect section endings on long pages. A hint of the next section keeps the page alive. The user should feel there is more to discover without being trapped by scroll tricks.

---

## Layout Mechanics

**Group with space, not lines.** Three tools, in order of preference: negative space, then a background shape when a group must read as one unit, then a separator line — last, and only where space would cost too much (dense tables, long settings lists). The structural rule: **the gap between groups is at least 2× the gap within a group.** 8px inside, 16px+ between. Below that ratio the grouping reads as noise, and adding a line to compensate is treating the symptom.

A line that has genuinely earned its place still keeps its voice down — thin, dim, and never sitting inside a wide gap. If the space is already doing the separating, the line is just repeating it louder.

**Controls must not look like content.** An interactive element needs a background, a border, an underline, or a consistent control zone. A link styled exactly like the sentence around it is invisible. The inverse holds too: a static badge shaped like the buttons beside it collects dead clicks.

**Shared edges.** I pick a small set of alignment edges and put everything on them. Every stray edge — an icon 2px off the text edge, a card padded differently from its neighbor — reads as noise even when nobody can name it. One spacing step expresses each level of subordination, and deeper nesting repeats the same step rather than inventing a new one.

**Logical properties, not physical.** Direction-dependent position is written as leading/trailing so the layout mirrors under `dir="rtl"`:

| Physical (avoid) | Logical (use) |
|---|---|
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `border-right` | `border-inline-end` |

Physical properties are reserved for genuinely physical geometry: a device notch, a gesture direction. When an arrangement encodes progression — star ratings, step indicators, progress bars — the sequence mirrors too; flexbox and grid with logical properties do it automatically, hand-positioned elements do not.

**Breathing room between targets.** Without an established density scale: `12px` between adjacent bordered or filled controls, `24px` around borderless text and icon buttons, `24px`+ between unrelated groups. Borderless controls need more because nothing marks where one target ends and the next begins — the space *is* the boundary. Compact professional tools may use less, as long as hit areas stay distinct and never overlap ([accessibility.md](accessibility.md#hit-areas)). I preserve an established, usable density rather than inflating controls to match a number.

**Progressive disclosure needs an affordance.** Hiding complexity is good; hiding it with no cue is a trap. In a horizontal scroller, items are sized so the next one peeks `16–32px` past the edge — a row that ends exactly at the container edge looks complete, and nobody scrolls it. Collapsed sections get a control whose label states what is hidden ("Show 12 more results", not "More"). Clamped text shows an ellipsis *and* a way to expand.

**Content bleeds, controls float.** Backgrounds, hero media, and scrollable lists extend to the viewport edges. Text and controls stay inside the layout margins and safe areas. Sticky chrome floats above the content layer; it does not dam it.

```css
/* Full-bleed media inside a constrained article */
.article { display: grid; grid-template-columns: 1fr min(65ch, calc(100% - 48px)) 1fr; }
.article > * { grid-column: 2; }
.article > .full-bleed { grid-column: 1 / -1; }

/* Floating chrome respects the notch */
.fab {
  position: fixed;
  inset-inline-end: calc(16px + env(safe-area-inset-right));
  bottom: calc(16px + env(safe-area-inset-bottom));
}
```

**Breakpoints come from content.** I break where the layout actually stops fitting — where the sidebar squeezes content below its minimum measure, where the card grid drops below a usable column width — not at 768px because a preset says so. I collapse late: a layout that holds its expanded structure as long as it genuinely fits stays stable and familiar, and premature collapsing throws away space the user paid for. I test the smallest and largest supported sizes first, because those break first.

**Plan for growth and clipping.** String expansion varies by language and by source-string length, so no universal percentage saves me. No fixed widths sized to English labels — `max-width` plus wrapping. No fixed heights on text containers — `min-height` if a floor is needed. Buttons size from their label via `padding-inline`, never a hardcoded width. And I never park a critical action where resizing, scrolling, or an expanding keyboard can clip it: primary actions live in the normal flow or in stable chrome with safe-area padding. If a modal's content scrolls, its action row does not.

---

## Container Sense

Components should know the space they live in. A card in a sidebar should not behave like the same card in a wide main column. Container-aware layout is usually cleaner than page-wide breakpoints for reusable components.

```css
/* The component adapts to its column */
.card-list { container-type: inline-size; }
@container (max-width: 400px) { .card { grid-template-columns: 1fr; } }

/* A viewport query breaks the same card inside a narrow sidebar */
@media (max-width: 768px) { .card { grid-template-columns: 1fr; } }
```

Viewport rules still matter for page shell decisions. Component composition belongs closer to the component.

---

## What I Refuse

- A centered hero followed by three identical icon cards by reflex
- Treating layout as spacing tweaks only
- Equal spacing everywhere
- Arbitrary stacking order values
- Decorative wrappers around every group
- A layout that only works at the designer's viewport
- Important content placed where the eye only finds it by accident
- Testimonials, proof, or calls to action dropped in by formula
- Horizontal overflow treated as a mobile detail
- Composition built only for left-to-right reading when the product needs to support RTL languages — see [responsive.md](responsive.md#text-direction)

---

## How I Know Layout Is Working

- The rendered page reads differently where layout was changed
- The first three reads survive a squint
- Every group has the right amount of air
- The reading path matches the content priority
- Heavy elements are balanced or intentionally tense
- Sections feel related without feeling repetitive
- Mobile order tells the same story as desktop
- The interface still has structure when imagery is blocked out

STRICT RULE — NEVER BREAK THIS
Do not create report.md, any kind of report, summary, analysis file,
or extra documentation. This applies every time this file is used.
Generate no reports unless explicitly asked.
