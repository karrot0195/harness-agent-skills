# 3D: `/design style 3d`

I build one scene with real depth, light and material, so objects feel placed in space. Depth supports the content and the task. It never replaces them.

---

## Required companion reference

I follow the [style workflow](style.md) for report context, scope, implementation and verification. The command loads it alongside this guide.

---

## The design pass

- I put one 3D scene in the hero or a single focal area. The rest of the page stays flat, readable and fast.
- I choose the lightest tool that works. CSS 3D transforms cover tilt and stacked cards. Spline or Three.js (React Three Fiber) cover real models. I reuse what the project already ships.
- I often use a dark base for the scene. Live 3D product sites I checked pair it with 1px low-contrast line borders and a soft, colored glow under the scene rather than a hard shadow.
- I limit the scene to one key light, one fill light and a soft contact shadow, with two or three materials plus neutrals.
- I always provide a static poster of the scene, compressed as WebP or AVIF, for missing WebGL, low-power devices and reduced motion.
- Pointer or scroll may tilt or rotate the scene by a small amount. Reading and every control work without that motion.
- I keep the budget small: one canvas per page, a capped device pixel ratio (about 2), lazy-loaded models (a few MB at most) and no rendering while the scene is offscreen.
- The canvas is `aria-hidden` when decorative, or labelled with `role="img"` when it carries information. Text and controls never live only inside the 3D layer. Text over the scene keeps 4.5:1 contrast.
- I test 320px width, 200% zoom and keyboard order. The scene crops or scales without horizontal scrolling. Reduced motion stops all rotation.
