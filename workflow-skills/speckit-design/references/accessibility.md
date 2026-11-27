# Accessibility: `/design a11y`

This is not a checklist I run once the design is done. It is the ground the design stands on, and most of it costs nothing as long as I stop fighting the platform: the browser already gives buttons a keyboard, already reads a real label aloud, already draws a focus ring until someone writes a rule to erase it.

A design that only works for a sighted mouse user is a sketch, not a design.

---

## Pre-execution checklist

Before proceeding, check for existing reports in the `.commandcode/design/` directory. Look for these files:

- `checkup-report.md`
- `review-report.md`
- `smell-report.md`

If any of these files exist, read the report content and use it as context for your analysis. Prioritize issues flagged in the reports and reference specific findings when making changes.

If no reports are found, proceed with the task normally.

---

## Access Follows Composition

The work pattern decides which access failures hurt most.

Monitor screens fail when alerts are color-only, live updates never announce, or an operator cannot acknowledge without a mouse.

Operate screens fail when direct manipulation has no keyboard equivalent, focus is lost after a command, or a drag handle is the only path.

Compare screens fail when table structure is faked with divs, sort controls have no state, or numbers are unreadable at zoom.

Configure screens fail when labels are placeholders, errors are a red border, or the submit button is disabled until the user guesses what is wrong.

Learn screens fail when headings are picked for their size, reading order jumps, or media autoplays.

Decide screens fail when the one action is an unlabeled icon, or the whole pitch is an image with no alt text.

Explore screens fail when filters are unreachable, results never announce their count, or hover is the only way to see anything.

---

## Access Bar

`/design a11y` repairs the access system. It is not an `aria-label` sprinkle.

At minimum, I inspect and repair: focus visibility, the complete keyboard path, semantic elements, accessible names, landmark and heading structure, form labels and error announcement, live regions, hit areas, alt text, reduced motion, and behavior at 200% zoom and 320px width.

I make two passes before I judge anything. Pass one, the mouse is off the table — if a task cannot be finished on the keyboard, it is not finished. Pass two, I listen instead of look: every control has to say what it is called, what kind of thing it is, and what state it is in.

Adding one `aria-label` is not an accessibility pass unless the user asked for that one fix.

---

## Native First, ARIA Last

The first rule of ARIA is: don't use ARIA. If a native element with the semantics and behavior I need exists, I use it.

| Element | Use for | What it gives me free |
|---|---|---|
| `<a href>` | Navigation, anything that changes the URL | Cmd/Ctrl/middle-click, right-click to copy, Enter |
| `<button>` | Actions: submit, toggle, open, delete | Focus, Enter *and* Space, form semantics |
| `<div onClick>` | Nothing at all | Nothing — it is styled text that happens to run code |

No ARIA is better than bad ARIA. A screen reader trusts my roles, so a wrong role is worse than none. A role is a promise: `role="tab"` promises the full tab keyboard model, and I have to deliver it.

The five rules I do not break:

1. Use the native element when one exists.
2. Don't change native semantics unless I truly have to.
3. Every interactive ARIA control is keyboard-operable.
4. Nothing that can hold focus may be erased with `role="presentation"` or `aria-hidden="true"`.
5. Nothing interactive ships without a name.

The rule runs both directions. Anything that reads as pressable has to be pressable — and anything that is not has to stop dressing like it. Give a status badge the same shape as the buttons around it and users will keep clicking it, forever, getting nothing back.

---

## Focus Is Architecture

I style `:focus-visible`, never bare `:focus`. The browser shows `:focus-visible` for keyboard and assistive tech but suppresses it for mouse clicks, where focus is already obvious.

I prefer the browser's own ring, because it adapts to platform and forced-color settings without me predicting every background:

```css
/* Best: keep the browser ring, give it breathing room */
:focus-visible {
  outline-offset: 2px;
}

/* Custom ring when the design requires one: use the project's verified token */
:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

A bare `outline: 2px solid` renders `currentColor`, which is not automatically safe — the ring may cross colors unrelated to the text's own background. Before I ship a custom ring I inspect the whole perimeter against every adjacent color it crosses: component fills, page surfaces, images, gradients, hover and selected states. At least a `2px` solid perimeter, or an equivalent visible area.

`outline: none` and `focus:outline-none` without a verified replacement are hostile. In `forced-colors: active` I keep the default color adjustment or use a system color such as `Highlight`; I never freeze the authored color with `forced-color-adjust: none` unless the control stays perceivable.

`:focus-within` groups the ring on a wrapper when an inner input takes focus — a search box with an icon inside the border.

---

## The Keyboard Path

Every pointer interaction needs a keyboard path. `tabindex` has exactly two legal values:

- `tabindex="0"` — puts a custom control into the tab order it should already have been in. Only for things the platform does not focus on its own.
- `tabindex="-1"` — reachable from script, skipped by Tab. This is for the heading I throw focus at after a route change, the modal shell, and the inactive members of a roving group.
- Anything positive — no. One positive value reorders the entire page around itself, and the actual problem is always the DOM order, so that is what I go fix.

Composite widgets occupy one Tab stop and use roving tabindex: the active item is `0`, every other is `-1`, and arrow keys move both focus and the `0`.

| Widget | Keys |
|---|---|
| Dialog | Tab/Shift+Tab cycle inside and wrap; Escape closes |
| Tabs | Arrows move between tabs and wrap; Tab exits to the panel; Home/End jump to the ends |
| Menu button | Enter/Space/ArrowDown opens on the first item; ArrowUp opens on the last; Escape closes and refocuses the button |
| Disclosure / accordion | The header itself is a `<button aria-expanded>`, toggled by Enter or Space |
| Combobox | ArrowDown opens and moves in; Enter accepts; Escape closes and returns to the input |
| Listbox / radio group | Arrows move selection; one Tab stop for the whole group |

Three rules hold everywhere. Escape unwinds one layer at a time, newest first — the tooltip goes before the menu it sits in, and the menu goes before the dialog holding both. Arrows travel *inside* a widget while Tab travels *between* them. And Enter submits from a focused input, except in a `<textarea>`, where it owes the user a newline and Cmd/Ctrl+Enter does the submitting.

A tab set has to decide what an arrow key means. If the panels are cheap to render, arrowing onto a tab can open it outright. If switching costs a fetch or a heavy re-render, arrowing only moves focus and the user confirms with Enter or Space — otherwise skimming the row fires off every panel on the way past.

---

## Trap and Restore

A modal has to hold focus inside itself. The cheapest way to get that is `inert` on whatever sits behind the dialog: one attribute, and the background stops being tabbable and stops existing for assistive tech at the same time.

```js
// On open
appContent.inert = true;
(dialog.querySelector("[autofocus]") ??
  dialog.querySelector("button, [href], input, select, textarea"))?.focus();

// On close
appContent.inert = false;
trigger?.focus(); // always return focus to what opened it
```

Native `<dialog>` with `showModal()` gives me the trap, the inert background, and Escape handling for free, so I prefer it. A custom overlay that cannot use `<dialog>` needs `role="dialog"`, `aria-modal="true"`, and an accessible name via `aria-labelledby` pointing at its heading.

Either way: on open, focus the first focusable element — but for a destructive confirmation, focus the *least* destructive action. On close, return focus to the trigger; if the trigger is gone, move focus to the nearest logical container. Add `overscroll-behavior: contain` so scrolling inside never scrolls the page behind it.

**Client-side navigation** changes the screen and tells nobody. The page never reloads, so focus stays wherever it was and a screen reader announces nothing at all. I do that work by hand: retitle the document for wherever the user has landed, then throw focus at the new view's `<h1>` — `tabindex="-1"` makes it a legal target — or at `<main>` if there is no heading. Going back or forward restores the old scroll position; going somewhere new starts at the top.

---

## Accessible Names

When several naming sources compete, the winner is decided in this order: `aria-labelledby`, then `aria-label`, then whatever the platform derives (`<label>`, text content, `alt`), and `title` only if nothing else exists.

I reach for visible text or `aria-labelledby` first. `aria-label` is a string nobody can see, which means it quietly falls out of step with the interface it describes, and translation tooling treats it unevenly.

```tsx
// Name from visible text, icon hidden
<button>
  <TrashIcon aria-hidden="true" /> Delete
</button>

// Icon-only, explicit name
<button aria-label="Delete">
  <TrashIcon aria-hidden="true" />
</button>
```

Whatever the user can read on the control has to be contained in the name the control reports. Label a button "Send" on screen and `"Submit message"` underneath, and someone driving the interface by voice says "click Send" and nothing happens.

Brand names, code tokens, and identifiers get `translate="no"`, so machine translation leaves them alone instead of mangling them.

| Mistake | Why it fails |
|---|---|
| `aria-label` on a plain `<div>` or `<span>` | Names on role-less, non-interactive elements are ignored |
| `<button role="button">` | Redundant role: noise, no benefit |
| `aria-hidden="true"` on or above a focusable element | A Tab stop that does not exist for screen readers |
| `aria-labelledby`/`aria-describedby` aimed at an ID that isn't there | Fails without a warning: the control ends up nameless |
| `role="menu"` on site navigation | `menu` promises app-style arrow keys; site nav is `<nav>` with a list |

---

## Structure Is Navigation

There is exactly one primary `<main>` on the page. The other structural elements — `<header>`, `<nav>`, `<aside>`, `<footer>` — become the waypoints a screen-reader user jumps between, so when two of the same kind exist I name them apart: `<nav aria-label="Primary">` next to `<nav aria-label="Breadcrumbs">`.

Headings describe their sections and form a coherent outline. One page-level `<h1>` with properly nested levels is the recommended default. Headings are structure, not styling — I pick the level semantically and set the visual size in CSS, never the reverse.

When repeated navigation or chrome precedes the content, the first focusable element is a skip link:

```css
.skip-link { position: absolute; inset-inline-start: -999px; }
.skip-link:focus { inset-inline-start: 16px; top: 16px; }
```

In-page anchor targets get `scroll-margin-top` so a sticky header does not swallow them. `<title>` matches the current context, most specific first: `Billing · Settings · Acme`.

---

## Forms

The label has to be wired to the field, not merely near it: `<label for>` aimed at the input's `id`, or a `<label>` wrapped around it. Placeholder text does not qualify. It vanishes at the first keystroke — exactly when the user most needs to remember what they are filling in — and it usually fails contrast on the way out.

Label and field are one target, not two. If the words "Send me updates" do not toggle the checkbox, there is a dead strip between them, and I close it.

The complete error pattern:

```html
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email"
       aria-invalid="true" aria-describedby="email-error" />
<p id="email-error">Enter a valid email address.</p>
```

- `aria-invalid="true"` goes on while the field is wrong and comes back off the moment it is right.
- `aria-describedby` ties the field to the message beneath it, so the two are read as one thing rather than as an orphaned sentence.
- Errors render inline next to their field with text or an icon. A red border alone is color-only and fails.
- Submitting a broken form throws focus at the first thing that failed. I do not need to announce it separately; landing there says it.
- I do not disable submit until the form is valid. A disabled action hides what must be fixed. I keep it enabled until the request starts, then disable it with a spinner **while keeping the original label** — the label is what tells assistive tech which button is busy.
- I accept free text and validate after; I never filter characters as the user types. I trim before validating, because autocomplete and text expansion add trailing spaces.

`autocomplete` with a meaningful `name` fills a form in one tap and is a WCAG requirement for fields about the user:

| Field | `autocomplete` |
|---|---|
| Name | `name`, or `given-name` / `family-name` |
| Email / phone | `email` / `tel` |
| Address | `street-address`, `address-line1`, `postal-code`, `country` |
| Card | `cc-number`, `cc-exp`, `cc-csc`, `cc-name` |
| Login | `username`, `current-password` |
| Signup / reset | `new-password` |
| 2FA code | `one-time-code` |

Correct `type` and `inputmode` pick the right mobile keyboard: `type="email"` / `url` / `tel`; `type="text" inputmode="numeric"` for OTP, PIN, and card numbers (keeps text semantics, no spinner); `type="text" inputmode="decimal"` for money; `type="number"` only for a true numeric quantity. `spellcheck="false"` on emails, codes, and usernames.

I never block paste — users paste passwords and one-time codes — and I stay compatible with password managers: a real `<form>`, correct `autocomplete`, no fake inputs.

**Disabled states.** Native `disabled` supplies the platform's complete behavior: out of the tab order, no activation, `:disabled` styling, excluded from submission. `aria-disabled="true"` only *announces* the state — it changes nothing else. I use it only when keeping the control discoverable is intentional, and then I block pointer and keyboard activation in code, style the state explicitly, and say nearby why the action is unavailable. Never both attributes on one element.

---

## Announcing Change

I take the first of these that fits and stop there:

1. **Focus already goes there** — an opening modal, the first broken field. The movement carries the message; adding anything else means saying it twice.
2. **It belongs to one control** — a field's error, a character count. `aria-describedby` on that control.
3. **It belongs to no control and can wait** — a toast, "Saved", a result count, a loading update. A polite region, `role="status"`.
4. **It belongs to no control and cannot wait** — the form failed as a whole, the session is about to expire. `role="alert"`.

For repeated polite updates I keep a stable empty region in the DOM and change its text; inserting a new polite region together with its content is announced inconsistently.

```tsx
<div role="status" className="sr-only">{statusMessage}</div>
```

Polite is the default and `assertive` is the exception, because reaching for `assertive` by habit is how a live region goes from helpful to hostile: it cuts off whatever sentence the user was in the middle of. I keep each message short and able to stand alone, since `aria-atomic` reads the entire region again every time any of it changes. And a toast never steals focus — it speaks from where it is, and the user keeps their hands where they were.

The canonical visually-hidden pattern (Tailwind ships it as `sr-only`):

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

The box is `1px`, not `0`, because a few screen readers walk straight past anything with no size. And this is the one job `display: none` and `visibility: hidden` cannot do: they do not hide the text visually, they delete it from the accessibility tree along with everything else.

---

## Alt Text by Purpose

I choose alt by what the image *does*, not by what it looks like.

| Purpose | Alt | Example |
|---|---|---|
| Decorative or redundant with adjacent text | `alt=""`, empty but present | Logo beside the company name in text |
| Informative | The meaning it adds | `alt="Ticket QR code"` |
| Functional (the image is the control) | The action or destination | Search icon → `alt="Search"`, not `alt="magnifying glass"` |
| Image of text | The exact text (better: use real text) | `alt="50% off everything"` |
| Complex (chart, diagram) | Short summary, full data nearby | `alt="Revenue by quarter, described below"` |

Leaving `alt` off entirely is the worst of the options — with nothing to read, screen readers fall back to announcing the file name.

**SVG:** decorative gets `aria-hidden="true"` and `focusable="false"`. Meaningful inline SVG gets `role="img"` plus `aria-label`. Prerecorded video needs captions, audio needs transcripts, nothing autoplays with sound, controls always render.

---

## Hit Areas

What the user sees is allowed to be tiny. What the user has to hit is not.

| Standard | Minimum |
|---|---|
| WCAG 2.5.8 (AA) | 24×24px — the hard floor |
| WCAG 2.5.5 (AAA) | 44×44px |
| Apple HIG | 44×44pt |
| Material | 48×48dp |

I treat 44px as the target for touch and 40px as a useful desktop size when density permits. Smaller controls are not automatic failures — I check the spacing, equivalent-control, inline, user-agent, and essential exceptions first. Under the spacing exception, an undersized target passes if a 24px circle centered on it does not intersect another target's circle; in the simple case, 20px targets need a 4px gap.

```css
/* Expand without changing the visual size — on the label or button, never the input */
.checkbox-label { position: relative; width: 20px; height: 20px; }
.checkbox-label::after {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 44px; height: 44px;
}
```

When the element can afford real box size I skip the pseudo-element and let the box be the target (`min-width: 44px; min-height: 44px; display: inline-grid; place-items: center`) — the browser then gets the real geometry for scrolling and gestures.

**Collision rule:** two interactive elements never have overlapping hit areas. If an extended area would collide, I shrink it to the largest size that does not.

`touch-action: manipulation` removes the double-tap-to-zoom delay. `-webkit-tap-highlight-color` matches the design instead of flashing gray.

---

## Motion, Zoom, and Reflow

Motion is opt-in, not chased with overrides:

```css
.card { /* static */ }
@media (prefers-reduced-motion: no-preference) {
  .card { transition: transform 200ms ease-out; }
}
```

Inheriting a codebase too far gone to invert, I fall back to a blanket override — but I set durations to `0.01ms` instead of `none`. Zero means the browser never fires `transitionend` or `animationend`, and any script waiting on one of those events sits there forever.

The preference asks for less motion, not none. What it is protecting against is vestibular upset, not the interface answering the user:

| Cut it | Swap it | Leave it alone |
|---|---|---|
| Parallax | Anything that slides, scales, or zooms → a plain opacity crossfade | Spinners and progress indicators |
| Video, GIFs, and looping decoration that start themselves | Smooth scrolling → jump straight there | State that changes instantly: hover color, the focus ring |
| Spinning, and anything travelling a long way across the screen | Carousels that rotate on their own → hand them over paused | The short confirmation that a press registered |

Independent of the preference: anything that moves, blinks, or updates automatically for more than 5 seconds needs a visible pause control — muted looping hero video included. Auto-dismissing toasts are for low-stakes confirmations only; anything carrying an action or an error stays until dismissed. Never put the only path to an action inside a timed element — that is data loss on a schedule.

**Zoom:** all content and functionality survives 200% zoom, and the page reflows at 320px width with vertical scrolling only. Genuinely two-dimensional content (tables, maps, code blocks) scrolls inside its own container. Fixed heights are what break under zoom — `min-height` on anything containing text, and let containers grow.

**rem vs px:** I respect how the codebase is set up and never introduce mixed units into someone else's system. Where I do have the choice: `rem` for `font-size`, text container `max-width`, media-query breakpoints, and spacing that should scale with text; `px` for borders, focus outline width and offset, shadow details, and fixed decorations. Breakpoints are where it matters most — at a larger base font size, a `rem` query switches to the mobile layout when the text needs it and a `px` query does not.

---

## Never Color Alone

Status needs a redundant cue: an icon, text, or an underline alongside the color. Red-and-green as the only difference between two states is a failure for roughly one in twelve men.

Contrast is measured between a foreground and the background it actually renders against. I identify which requirement applies, measure the rendered pair, and report the pair, its measured value, and the threshold it misses. Thresholds and the OKLCH remediation method live in [color.md](color.md#contrast-mechanics).

---

## What I Refuse

- `outline: none` with no verified replacement
- Calling one `aria-label` an accessibility pass
- `<div onClick>` where a `<button>` or `<a href>` belongs
- Placeholder used as the only label
- Positive `tabindex` to fix a focus order the DOM should fix
- Submit disabled until the form is valid
- `assertive` live regions for routine toasts
- `aria-hidden="true"` on a focusable element
- Functional icon alt that describes the picture instead of the action
- A modal that traps nothing and returns focus nowhere
- Motion or autoplay that ignores `prefers-reduced-motion`
- Fixed heights on text containers that clip at 200% zoom
- Hover as the only way to reach a feature
- Reporting a color contrast failure by repainting the brand without being asked

---

## How I Know Access Works

- The primary task completes with the keyboard alone, start to finish
- Focus is visible on every interactive element and never disappears
- Every control announces a name, a role, and its state
- Overlays trap focus, close on Escape, and return focus to the trigger
- Every input has a real label, the right `type`, and useful `autocomplete`
- Errors announce, sit beside their field, and say how to recover
- No state is carried by color alone
- Every hit area clears the floor and none of them overlap
- Motion respects `prefers-reduced-motion` and nothing autoplays without a pause
- The page works at 200% zoom and reflows at 320px without horizontal scrolling
- I verified these by walking the interface, not by reading the CSS

STRICT RULE — NEVER BREAK THIS
Do not create report.md, any kind of report, summary, analysis file,
or extra documentation. This applies every time this file is used.
Generate no reports unless explicitly asked.
