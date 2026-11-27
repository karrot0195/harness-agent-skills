# Motion: `/design motion`

Motion explains behavior. It is the body language of the interface. If motion does not clarify state, direction, causality, or attention, I cut it.

`motion` and `animate` point to the same discipline here. Animation is one sentence. Motion is the grammar.

This mode is additive by default. I do not merely adjust existing easing unless the user explicitly asks for tuning.

---

## Motion Follows Composition

The work pattern decides what movement is useful.

Monitor screens move only to reveal change, urgency, freshness, or new data.

Operate screens respond immediately to touch, drag, command, selection, and undo.

Compare screens preserve orientation. Motion should keep rows, columns, and selections understandable.

Configure screens show dependencies, validation, preview changes, and save progress.

Learn screens use motion for pacing, reveal, progress, and transition between concepts.

Decide screens use motion sparingly to focus attention and reduce doubt.

Explore screens use motion to preserve location while filtering, opening, closing, and backtracking.

I do not animate a centered grid because it feels empty. Movement must explain the work.

---

## Creation Bar

When the user asks for `/design motion`, I create a motion system across the surface.

At minimum, I add or verify motion for:

- Page or section arrival
- Primary action feedback
- Interactive hover and press feedback where interaction exists
- Focus-visible behavior that feels intentional
- Opening and closing of menus, drawers, dialogs, accordions, tabs, or expandable regions
- Loading, progress, or waiting states when the product can wait
- Success, error, selection, or state-change feedback where those states exist
- Reduced-motion behavior

Existing animations are inputs, not the whole job. I refine them after the missing motion states are added.

If the page has no meaningful animation after the pass, `/design motion` has failed.

---

## Existing Motion Is Not Enough

Tuning easing, duration, delay, or curve values is only a motion pass when the interface already has a complete motion system.

If most of the page is static, I add motion first: reveal, response, transition, feedback, and reduced-motion alternatives. Then I adjust timing.

I do not report "motion improved" because I changed a duration from one value to another. The user must be able to see new or clearly better behavior.

---

## My Default Timing

I keep a small budget in my head.

- Tactile feedback is fast, usually around the instant-to-brief range
- Menus, popovers, and small state changes are short and clear
- Drawers, accordions, and layout reflows get more time because the eye has to track space
- Brand entrances can breathe when the page earns choreography

Leaving is faster than arriving. The user already understands the object by then.

---

## What Motion Is Allowed To Say

Motion can say:

- This changed
- This came from there
- This belongs to that trigger
- This is processing
- This is now selected
- This failed
- This is safe to touch
- This is important right now

Motion cannot say "look at me" with no reason.

---

## Material

I mostly move transform and opacity because they stay smooth. I also use blur, masks, clipping, shadow bloom, filters, and variable type when the effect genuinely needs that material and stays performant.

The rule is not austerity. The rule is responsibility. Expensive effects stay bounded, purposeful, and verified in the browser.

---

## Physics

I avoid default easing. Real motion has weight.

Heavy surfaces enter with more gravity. Tooltips and small menus move lightly. Press feedback should feel immediate. Confirmation can have a tiny lift. Error motion must be brief and useful, never theatrical.

Bounce and elastic effects are not banned because motion cannot be playful. They are refused because they usually make software feel cheap. One playful brand moment can earn them. Repetition cannot.

---

## Choreography

I stagger sequences when the user needs to understand order. I keep the total delay short. Mechanical delay patterns feel generated, so I vary with restraint.

Brand pages can open with a composed reveal. Product pages should arrive ready to use. A dashboard does not need to perform before the operator can work.

---

## Reduced Motion
 
Reduced motion is part of the design, not a patch.
 
I replace spatial movement with fades, instant state changes, or low-motion alternatives.
 
Functional signals remain alive: focus, progress, loading, and confirmation still communicate.
 
If the reduced version loses meaning, the original motion was carrying too much of the interface.
 
**Example:**
- Full motion: Element slides in over 400ms
- Reduced motion: Element fades in over 150ms (no translation)

I write motion as **opt-in**, so the static version is the default and I am not chasing every animation with an override:

```css
.card { /* static styles */ }
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 200ms ease-out; }
}
```

In an existing codebase where opt-in is not feasible, the global kill switch uses `0.01ms` rather than `none`, so `transitionend` and `animationend` still fire and any JS waiting on them does not hang.

The preference asks for less motion, not none. What it protects against is vestibular upset, not the interface answering the user:

| Cut it | Swap it | Leave it alone |
|---|---|---|
| Parallax | Anything that slides, scales, or zooms → a plain opacity crossfade | Spinners and progress indicators |
| Video, GIFs, and looping decoration that start themselves | Smooth scrolling → jump straight there | State that changes instantly: hover color, the focus ring |
| Spinning, and anything travelling a long way across the screen | Carousels that rotate on their own → hand them over paused | The short confirmation that a press registered |

Independent of the preference: anything moving, blinking, or updating on its own for more than 5 seconds needs a visible pause control. Every animation stays interruptible and driven by user input.

---

## Enter And Exit Mechanics

For an infrequent staged entrance — a page hero, a success state, an empty state — I split the container into semantic chunks (title, description, action) and stagger them by ~100ms, combining `opacity`, a small `translateY`, and `blur`. Titles can go a level finer, word by word at ~80ms. I do not stagger routine, high-frequency interactions; the attention cost repeats on every trigger.

Exits are softer than enters and run shorter — roughly 150ms against a 300ms entrance. A small fixed `translateY` (about `-12px`) indicates direction without drama; the full container height is theatre. When motion adds no information, or the interaction repeats often, removing the element immediately is the correct exit.

I use CSS transitions for interactive state changes, because they can be interrupted mid-flight, and reserve keyframes for staged sequences that run once. I transition exact properties (`transition-property: opacity, scale`), never `all`. `will-change` is for `transform`, `opacity`, and `filter` only, added when I actually see first-frame stutter — never `will-change: all`.

**Icon swaps** animate with `opacity`, `scale`, and `blur` rather than toggling visibility: scale `0.25` → `1`, opacity `0` → `1`, blur `4px` → `0`. With a motion library, `{ type: "spring", duration: 0.3, bounce: 0 }` — bounce stays `0`. Without one, both icons stay in the DOM (one absolutely positioned) and cross-fade with `cubic-bezier(0.2, 0, 0, 1)`, which gives enter and exit with no dependency.

Nothing is communicated by movement alone. Anything I animate to mark a change also has to read as changed once it stops moving — through color, a glyph, or words.

---

## Timing Reference
 
Keep these consistent across your entire site.
 
| Action | Duration | Use When |
|---|---|---|
| 100ms | Tactile feedback, quick dismissals | Button press alternative, small feedback |
| 150ms | Press feedback, focus rings, hover | All interactive elements, standard responsive feel |
| 200ms | Success flash, small reveals | Confirmation states, brief celebrations |
| 250ms | Menu transitions, small modals | Menus, popovers, small UI changes |
| 300ms | Drawer open, accordion expand | Larger spatial movements, layout changes |
| 400ms | Full-screen transitions | Page changes, major layout shifts |
| 800ms | Loading spinners | Continuous waiting states (steady, not panicked) |
 
**Rule:** 150ms is your baseline for responsiveness. Faster = twitchy. Slower = laggy.
 

---

## Waiting

Perceived speed matters. Skeletons, optimistic updates, progressive reveal, and honest progress beat a lonely spinner.

I never use motion to hide a slow system. I use it to show that the system is still accountable.

---

## What I Refuse

- Motion on every element because it feels "premium"
- Only changing easing or duration when the page lacks animation
- Calling unused keyframes a motion system
- Adding animation that cannot be triggered or seen
- Page-load theater on product surfaces
- Hover-only meaning (motion that disappears on touch devices)
- Scroll-jacking
- Infinite animations near reading content
- Layout-property animation that visibly janks (`width`, `height`, `margin` animation)
- Motion without reduced-motion behavior
- Generic fade-up on every card
- Confetti or celebration for routine actions
- Animating from `scale(0)` — always use intermediate scale with opacity fade
- Overusing `rotateY()` and `rotateX()` without clear purpose (3D is not inherently better)
- Transform animations longer than necessary (every animation should have a reason for its duration)

---

## How I Know Motion Works
 
- Motion exists in the rendered interface, not only in CSS or classes
- The pass added missing motion states before tuning existing ones
- The user can infer where something came from
- State changes are impossible to miss but easy to ignore afterward
- Nothing delays task flow
- The motion system feels consistent across controls
- Reduced motion preserves meaning
- The page stays smooth on target devices (no layout jank, no dropped frames)
- All motion uses `transform` and `opacity` as the primary tools
- Press and hover feedback use `scale()` and scale smoothly at 0.97–0.98
- Movement uses `translate()` with percentage values for responsive behavior
- Loading spinners rotate smoothly at 800ms without interruption
- The interface feels calmer after motion, not busier

STRICT RULE — NEVER BREAK THIS
Do not create report.md, any kind of report, summary, analysis file,
or extra documentation. This applies every time this file is used.
Generate no reports unless explicitly asked.
