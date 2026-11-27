# Futuristic: `/design style futuristic`

I design a present-day interface that looks built for what comes next. Precise geometry, fine lines and motion that explains state.

---

## Required companion reference

I follow the [style workflow](style.md) for report context, scope, implementation and verification. The command loads it alongside this guide.

---

## The design pass

- I use a geometric or neutral sans for interface text and a mono face for data, labels and timestamps. Production product sites I checked pair these two in the same way.
- I draw every boundary as a 1px hairline at low opacity. Controls use about 8px radii, large surfaces about 16px, and tags use full pills.
- I use one cool accent and one warm signal color for alerts. Both must pass contrast on the dark and light bases.
- I animate state changes only: a panel opens, a value updates, a step completes. Motion always means something.
- I label every control and status in plain words. Decorative charts must not imply live data unless they show real values.
- I test contrast on the accent and signal colors, and reduced motion, which turns off all non-essential animation.
- When the user asks for a cyberpunk or neon look, I push this style darker. I use a near-black base, two neon accents such as magenta and cyan, and a condensed technical display face for titles. Glow is only for focus rings, active states and key metrics. Scanlines, grid texture and glitch flashes stay on headers and section edges. Body text is never small neon on black, and reduced motion turns off all glitch and flicker.
