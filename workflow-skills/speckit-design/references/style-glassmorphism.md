# Glassmorphism: `/design style glassmorphism`

I build glass the way Apple's Liquid Glass does. It is a lens, not a frosted sticker. It picks up color from the scene behind it, intensifies that color, bends light at its edges and catches a highlight on its rim. The material stays on the control and navigation layer, and the content stays readable.

---

## Required companion reference

I follow the [style workflow](style.md) for report context, scope, implementation and verification. The command loads it alongside this guide.

---

## What glass is, and what it is not

- Glass needs something behind it to work with: a photo, video, a map, artwork, or a colorful mesh field built from the brand or the hero image. Over a flat color, glass is just a gray box. In that case, I make the scene first.
- The color comes from the scene, not from a fill. A glass header over a sunset photo turns warm pink and orange. Over a sky it turns blue and yellow. I sample the colors behind the glass. I never paint a generic white tint at 10% everywhere.
- Glass is a layer that floats above the content. Navigation bars, tab bars, toolbars, segmented controls, pill buttons, sheets, popovers, and one hero header or stat panel can be glass. Lists, tables, articles, forms and dense charts sit on a solid surface below it.
- I never stack glass on glass. A control inside a glass panel is a solid fill, or a tinted capsule that is clearly darker or lighter than the panel.
- Clichés I avoid: purple-blue blob backgrounds with identical white cards, a glass card behind every section, a thick white border, and glass with no backdrop.

---

## The material, layer by layer

I build each glass element as a stack of absolutely positioned layers under the content, all sharing one `border-radius`:

1. **Lens.** `backdrop-filter: blur(12px–24px) saturate(160%–190%)`, plus a little `brightness` to match the mode. Saturation makes the glass look like it is gathering light, not muddying it. For refraction on the hero or primary control, I add an SVG filter: `feTurbulence` (fractal noise, very low `baseFrequency` such as `0.003 0.007`, one octave) feeding `feDisplacementMap` (R/G channels). The displacement should be strongest at the edges, where the glass bends the scene, and quiet in the center.
2. **Tint.** A thin wash that follows the scene: `rgb(255 255 255 / 0.08–0.2)` on dark scenes, `rgb(0 0 0 / 0.15–0.3)` behind light text on bright scenes. Capsule controls on a glass header get a darker tint than the header, so they read as separate pieces of glass.
3. **Specular edge.** Inset highlights instead of a solid border: a bright top-left rim and a fainter bottom-right rim, for example `inset 1px 1px 0 rgb(255 255 255 / 0.5), inset -1px -1px 0 rgb(255 255 255 / 0.15)`, plus a soft linear sheen across the top third. On pointer devices, the sheen can follow the cursor slightly.
4. **Depth.** A soft, wide outer shadow (`0 8px 32px rgb(0 0 0 / 0.12)`) and an optional faint white outer glow. No hard drop shadows.
5. **Grain.** A 3–6% noise or fine dot texture over the tinted area stops banding and makes the material feel physical.
6. **Content.** Text and icons sit on top, at full opacity.

For a large material field, like a hero or stats header over a photo, the glass dissolves into the content: the field fades from the blurred, saturated scene into a solid sheet where the lists and details live. Big numbers and titles go on the field. Fine print goes on the sheet.

---

## Shape and motion

- Shapes are concentric. An inner radius equals the outer radius minus the padding, so nested pills and cards share one center. Controls are capsules.
- Glass responds to touch and pointer with a small scale (1.01 on hover, 0.98 on press) and an elastic, springy return. Selected states can glide between positions, like a tab indicator sliding between tabs, rather than cross-fading.
- Content scrolling under a glass bar fades or blurs at the edge, so text never collides with the bar.
- Reduced motion turns off morphing, cursor-tracked sheen and displacement animation. The static material stays.

---

## Legibility and fallbacks

- Text on glass keeps 4.5:1 contrast against both the brightest and the darkest point of the scene behind it. I check both. If a scene is too busy, I darken the tint, add a dimming gradient under the text, or move the text onto the solid sheet.
- I use large, bold type on glass. I keep thin weights and small captions off it.
- SVG displacement inside `backdrop-filter` only works in Chromium. Elsewhere I keep the blur, saturation, tint and specular layers, which still read as glass. Without `backdrop-filter` (`@supports not`), or under `prefers-reduced-transparency: reduce`, the element falls back to an opaque surface sampled from the scene color.
- I test over a busy photo, over a bright area, over a dark area and over the plain fallback. The glass must stay readable on all of them, at 320px and at 200% zoom.
