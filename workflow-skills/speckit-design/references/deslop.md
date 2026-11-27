# Deslop: `/design deslop`

The reflexes in [reflexes.md](reflexes.md) hold here: I don't produce them, and I flag every one I find, unless the user asked for that element by name.

Deslop removes AI slop from a design surface. I don't repaint for its own sake, I don't polish what no report flagged, and I don't add new effects. I read all three diagnostic reports, find every generic tell, and replace each one with a real decision.

This mode is the treatment that follows the full diagnostic pass. Reports find the rot. Deslop cuts it out and replaces it with authored work.

A pass that only swaps colors, fonts, or shadows is not deslop — it's a reskin wearing deslop's name. If a report names a structural or composition-class smell, the fix changes the structure. A differently colored center-stack hero is still a center-stack hero. How far the structure has to move is not a fixed per-odor rule — it's set by the reports' own AI slop score. See **How The Slop Score Sets The Fix**. And even a structurally sound surface can still read as safe and flat once every named tell is gone — the closing step borrows [refine.md](refine.md)'s **Push** move for that. See **The Closing Move: Push**.

---

## Prerequisites: All Three Reports

Before I touch anything, I check `.commandcode/design/` for all three reports:

- `smell-report.md`
- `checkup-report.md`
- `review-report.md`

**If any report is missing**, I generate it before proceeding:

- Missing `smell-report.md` → read [smell.md](smell.md) and run `/design smell`
- Missing `checkup-report.md` → read [checkup.md](checkup.md) and run `/design checkup`
- Missing `review-report.md` → read [review.md](review.md) and run `/design review`

I never skip a missing report. Each one surfaces a different class of problem and the fix priority depends on all three together.

---

## How I Work From The Reports

I read all three reports front to back, then extract and rank every finding by severity:

1. **Critical checkup vitals first** — anything scored Critical in `checkup-report.md` blocks shipping and gets fixed before anything else
2. **Review failures second** — low-scoring lenses in `review-report.md` (first impression, hierarchy, color voice, type voice, interaction feel)
3. **Strong smells last** — clustered or strong tells from `smell-report.md`; faint isolates get cleaned after everything above is resolved

For each finding I address:

1. **I name the reflex it came from** — what lazy default produced this pattern
2. **I pick a deliberate replacement** — not the opposite, not a different default, but a choice tied to the project
3. **I apply the change to real files** — no markdown mockups, no commentary-only passes
4. **I verify the result** — the old pattern is gone and the new choice reads as intentional

This ranking decides what I fix first. It does not decide how deep each fix goes — that is set by the slop score, below.

I fix every finding the reports name. I do not skip faint smells. A few faint smells clustered in one section is a strong smell in waiting.

---

## How The Slop Score Sets The Fix

A composition-class finding does not get a fixed-size fix just because it showed up as one row in a report. `smell-report.md` already carries a score for exactly how sloppy the surface is — and that score, not a per-odor default, is what decides how much of the structure has to move.

Composition-class findings are center stack, feature tile grid, and any finding under checkup's Composition vital sign. Checkup composition findings use the smell score like any other.

There are three tiers. I check them from the top down and use the first one that matches — a surface never gets a lighter fix because it also matches a lighter tier.

Before I read the score for a tier, I re-count the tells by section. Tells that all sit in one section — a tile grid with an icon on every tile, centered in its band — count as one finding for that section, not three. The smell report counts odors, not places, so one bad section can push the raw score to PRESENT on its own. For picking a tier, I use the re-counted number on the same scale: 0 is CLEAN, 1–2 FAINT, 3–4 PRESENT, 5–6 STRONG, 7+ IDENTITY FAILURE. A page-wide tell, like a default type or a tech hue on every section, still counts once on its own. The Domain Default Trap does not count here, just as it doesn't count toward the smell score. I still fix it, but it never raises the tier. The co-location still matters: a section carrying several tells is the "alongside other-system findings" case below.

**Score IDENTITY FAILURE (7+ tells, 0–2/10), or checkup marks Intentionality Critical, or review scores both First impression and Hierarchy at 4/10 or below** — the problem is not one section, it's the system. I rebuild composition, color, type, components, depth, and motion together as one direction, not as a stack of separate patches layered on top of each other. The rebuilt components, cards, and headings must look like a different system from the old ones — if an old card could be dropped back in without anyone noticing, the rebuild didn't go far enough. Patch-level findings inside this pass still get fixed, but as part of the one rebuilt system, not as leftover touch-ups on an unmoved skeleton.

Critical Accessibility, Performance, or Prompt Fidelity vitals do not trigger this tier on their own. They block shipping and get fixed first, but they are not evidence that the visual system is generic.

**Score PRESENT/STRONG, or a composition finding at any score sitting alongside other-system findings in the same section** — I stop treating the composition finding as separable from the rest. I re-derive that section's composition from its dominant work pattern (monitor, operate, compare, configure, learn, decide, explore) and rebuild it end to end. The rebuild covers the sections the reports flagged. Sections no report flagged keep their structure — at this tier, a good hero stays the hero it was. A finding at this level is only fixed when I can point to at least one of:

- a new dominant focal point
- a reordered section sequence
- a changed relationship between the text and its proof object
- a transformed grid, table, stack, or flow
- a changed navigation, sidebar, toolbar, or action placement

Spacing, padding, alignment, and color can accompany this fix. They cannot replace it — if none of the five things above changed, the finding is still open, no matter how the colors look now.

**Score CLEAN/FAINT, and the composition finding sits alone with no other-system finding in the same section** — the fix stays local. I rework the flagged section directly: give it a real focal point, break its uniform grid, reorder its own content around what actually matters. Nothing else on the page has to move, because nothing else is broken.

I don't wait for a separate command to justify this depth. Deslop already has permission to fix everything the reports name, and a clustered or severe finding is still a named finding — it just needs more of the surface to move before it counts as fixed.

---

## The Odors And Their Antidotes

### Tech Gradient

Blue-violet, indigo-cyan, purple-to-teal glossy energy. The visual shorthand for "AI startup."

**Fix**: I build a palette with a specific reason. The hue must come from the product's domain, not the industry. A logistics tool might earn slate and amber. A reading app might earn warm paper and ink. I refuse purple-to-cyan and blue-violet-to-indigo as category reflexes.

### Generic Tech Hue

Blue-purple as the primary identity for anything vaguely technical.

**Fix**: I replace the identity hue with one that has project-level justification. If the product handles water data, teal is earned, not guessed. If it manages gardens, green is earned. If there is genuinely no domain anchor, I pick an unexpected saturation or temperature and commit to it fully.

### Feature Tile Grid — composition-class

Icon, heading, one sentence, repeated in a uniform grid until the section stops meaning anything.

**Fix**: This is a composition-class finding — see **How The Slop Score Sets The Fix** for how far it has to move. At minimum I lead with the strongest feature, vary the layout rhythm, break the uniform grid, or kill the section entirely if it's filler. Cards are not automatically wrong. Equal cards with no priority, left equal after the fix, are always wrong.

### Accent Rail

A colored stripe on one side of cards or callouts that simulates structure.

**Fix**: I remove the rail. If the card needs differentiation, I decide it through density, type weight, or border treatment as part of the section's real structure — not a decoration standing in for one. If it doesn't need differentiation, the rail was decoration and simply goes.

### Unearned Blur

Frosted glass panels applied because the surface never committed to a depth system.

**Fix**: I remove the blur. If depth is needed, I build a real elevation system with shadow, border, or opacity layers. If depth isn't needed, the element becomes opaque and sits flat in the composition.

### Stat Monument

An oversized number cluster filling space where a real product story belongs.

**Fix**: I replace stats with proof. A number alone proves nothing. I convert stat blocks into case language — a before/after, a customer outcome, a specific metric with context, or a product capability shown in action. If the stat is real and meaningful, I give it a sentence, not a monument.

### Icon Topper

A rounded-square icon placed above every section heading with no function beyond filling the template.

**Fix**: I remove the icon. Section headings do not need a decoration above them. If the icon carries real meaning, I bring it inline with the heading text. If it doesn't, it goes.

### Bounce Everywhere

Motion that turns every interaction into a toy. Elastic easing applied because it was available.

**Fix**: I audit every animated element. I keep motion that reveals state, responds to input, or marks meaningful transitions. I strip motion that is purely decorative. What remains uses sharp deceleration curves — quart, quint, or expo out. No bounce. No elastic.

### Default Type

A common family used with no voice, no scale, no reason. The font that appeared because no choice was made.

**Fix**: I either commit to the current family with a real reason and a tuned scale, or I switch to a family that has project-level intention. Inter is not wrong. Inter with no scale, no weight contrast, and no voice is wrong. System fonts for product UI are legitimate. Brand surfaces need a deliberate type choice.

### Center Stack — composition-class

Everything aligned to the safe middle because no composition decision was made.

**Fix**: This is a composition-class finding — see **How The Slop Score Sets The Fix** for how far it has to move. At minimum I choose a composition based on the dominant work pattern, and confirm the result is actually a different arrangement, not a recolored version of the same centered stack. Centered is valid when symmetry is the right answer for that work pattern. Centered as the unexamined default is not.

---

## Domain Default Trap

If the visual direction can be guessed from the industry alone, the design hasn't found itself yet.

A note-taking app as cream and rounded sans. A developer tool as dark with terminal mono. A health product as white and calm blue. A legal platform as navy and serif.

**Fix**: I identify the domain default and break it in at least one dimension — unexpected saturation, a different temperature, an unusual composition, a deliberate texture, or a specific art direction choice that only fits this product.

---

## Fixing Order

I work in this order because each fix ripples into the next:

1. **Composition** — center stack, feature tile grid. Composition-class: how far it moves is set by the slop score, not a fixed per-odor default.
2. **Color** — tech gradient, generic tech hue, domain default trap. These set the mood.
3. **Type** — default type. This gives the surface its voice.
4. **Depth** — unearned blur, stat monument. These are spatial decisions.
5. **Motion** — bounce everywhere. Motion comes last because it reacts to the settled composition.
6. **Decoration** — icon topper, accent rail. These are the last things to address.

At IDENTITY FAILURE score, I don't run this order as six separate passes — the whole system gets rebuilt together. The order above still describes the internal sequencing of that rebuild: composition settles before color is chosen, color before type, and so on.

I don't jump to color before fixing composition. A new palette on a broken layout is still broken.

---

## What A Fixed Smell Looks Like

A smell is fixed when:

- The old pattern is not visible anywhere on the surface
- The replacement is not another template reflex — it's a specific choice
- The choice would survive the prompt changing — it belongs to the product, not the request
- The section or element still does its job, now with intention
- The fix does not create a new smell in another category
- If the finding was composition-class, the fix clears the bar in **How The Slop Score Sets The Fix** at the level the score actually calls for — not just this checklist

---

## The Closing Move: Push

Every deslop pass ends with one required step, run after every named finding is fixed: I check whether the result still reads as safe and flat even though every named tell is gone, and if it does, I push it — stronger commitment, sharper point of view, not a new effect layered on top.

The check always runs. The push only happens when the check finds flatness. Its reach follows the tier: at CLEAN/FAINT it stays inside the sections deslop already touched, and the rest of the page is left alone. At PRESENT/STRONG it covers the rebuilt sections and the seams around them. At IDENTITY FAILURE it covers the whole rebuilt system.

This is the same move [refine.md](refine.md) calls **Push**, one of several moves refine chooses between depending on diagnosis. Deslop doesn't need refine's full move set — settle, strip, proof, activate, texture, push past limits all answer problems deslop isn't diagnosing — but Push specifically answers "safe and flat," which is exactly the failure mode left over after every other named smell is gone. So this check runs every time, not as a diagnosis choice.

This exists because a surface can clear every named finding and still be forgettable — competent, safe, the kind of thing a stranger clocks as AI-made in two seconds without any single odor from the catalog above being present.

Brand surfaces get stronger type, a more unexpected color choice, a sharper composition, a hero moment with an actual point of view. Product surfaces get stronger hierarchy, a clearer primary action, better density, more useful contrast — confidence, not spectacle. I refuse purple gradients, glass panels, neon on dark, gradient text, and bounce as the answer to "make it stronger" — those are new slop, not a fix.

I know this step worked when the focal point jumps out and the surface still feels coherent. One small detail does not count as having run it.

The check is mandatory, not conditional on a failed stranger test below. The stranger test is how I *notice* flatness; Push is how I *fix* it, as the last thing deslop does before calling itself done.

---

## Cohesion Check

After fixing all named smells and running Push, I scan the full surface for new tension.

Sometimes removing one smell exposes another. Sometimes the fixes create visual whiplash between sections. If two sections now feel like different products, I tune the border between them until they share the same DNA.

---

## Verify Like A Designer

After applying all fixes and the closing Push step, I run a designer verification pass before calling it done.

**Stranger test**: Would a stranger still say "AI made that" without hesitation? If yes, I missed something — check which of the checks below actually failed rather than looking for a vague "tell."

**Structure check**: For every composition-class finding, does it clear the bar from **How The Slop Score Sets The Fix** at the level the score called for — a new dominant focal point, a reordered sequence, a changed text/proof relationship, a transformed grid or flow? If the layout skeleton is identical to before and only the paint changed, the finding is not fixed, no matter what the report checklist says.

**Rebuild check**: If the score put this at IDENTITY FAILURE, could the old and new components, cards, and headings be swapped without anyone noticing? If yes, the systemic rebuild didn't go far enough.

**Push check**: Did the flatness check run, and if it found flatness, does the pushed area now pass Push's own verification — does the focal point jump out, and does the surface still feel coherent? If an area inside Push's reach still reads as safe and flat, Push was not actually applied, only claimed. Changes outside Push's reach for this tier are a regression, not a push.

**Regression check**: Did the fixes break anything new? I scan every section I touched for new tension, whiplash, or introduced smells.

**Reality check**: Are the changes real and visible in actual files? No commentary-only passes count.

**Judgment check**: Would a working designer approve each decision? Not just accept — actively approve it as the right call for this product.

If any check fails, I go back to the specific finding or step that check names and redo it properly — I do not treat "the stranger test failed" as license to invent a new, unrelated fix.

---

## Ship or Iterate

If all seven verification checks pass, deslop is done.

If any check fails, I go back to what it names: an unfixed report finding, a composition-class fix that didn't move enough for its score, or a skipped or token Push step. I do not invent unrelated new work, change product scope, or add features nobody asked for. I finish applying the depth the reports' own score and this file already define.

---

## What I Refuse

- Fixing a smell by swapping in a different AI default
- Removing a smell without replacing it with a real decision
- Polishing around the smell instead of removing it
- Calling a recolor pass a deslop pass
- Marking a composition finding fixed because the colors and font changed while the layout skeleton stayed the same
- Applying the same small, local fix to a composition finding regardless of what the slop score actually says about it
- Patching an IDENTITY FAILURE surface finding-by-finding instead of rebuilding it as one system
- Calling deslop done without running the closing Push check
- Using Push to restyle sections no report flagged on a CLEAN/FAINT surface
- Restructuring a section no report flagged, below IDENTITY FAILURE
- Escalating the tier because one broken section tripped several odors at once
- Fixing only the hero section when the smell is structural
- Treating Inter as wrong when it is clearly intentional
- Treating all centered layouts as bad when symmetry is the right lane
- Adding decoration to hide generic structure
- Creating any reports, summaries, or documentation beyond the work itself

---

## How I Know Deslop Worked

- Every finding from all three reports has been addressed in real files
- Every composition-class finding cleared the bar its slop score actually called for — a real rearrangement, not new paint on the old skeleton
- A surface that scored IDENTITY FAILURE now reads as one rebuilt system, not a pile of old components swapped for new-colored copies
- The closing Push check ran, and any push it triggered stayed inside its tier's reach and clears its own verification
- The surface reads as authored, not generated
- The color strategy cannot be guessed from the industry
- The type has a project-specific reason
- The composition is not the median generated landing page
- Repeated sections have hierarchy and variation
- A stranger would not immediately say the page was generated
- No new smells were introduced
- The product still works and still does its job

STRICT RULE — NEVER BREAK THIS
Deslop checks `.commandcode/design/` for all three reports before touching any file.
Missing reports are generated on the spot by running the corresponding design mode.
It never creates extra reports, summaries, analysis files, or documentation beyond the three diagnostic reports.
After fixes, it always runs the closing Push check, then the designer verification pass, and ships or iterates based on the result.
A pass that changes only color, type, or decoration while a composition-class finding remains structurally untouched is incomplete, not done — the slop-score-based structure bar governs, not the report checklist.
A pass that patches an IDENTITY FAILURE surface one finding at a time instead of rebuilding it as one system is incomplete, not done.
A pass that skips the closing Push check, or answers real flatness with a token gesture, is incomplete, not done — the Push verification governs, not "the report checklist is empty."
