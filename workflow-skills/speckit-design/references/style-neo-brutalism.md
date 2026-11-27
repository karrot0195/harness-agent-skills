# Neo-brutalism: `/design style neo-brutalism`

I build a legible, deliberately blunt interface with solid color and hard edges. The structure stays disciplined.

---

## Required companion reference

I follow the [style workflow](style.md) for report context, scope, implementation and verification. The command loads it alongside this guide.

---

## The design pass

- I use a neutral canvas, dark ink and one or two assertive accents. Large headings carry the composition.
- I give emphasized elements a 3 to 6px solid ink border. Controls keep 2 to 3px. Radii stay between 0 and 4px.
- Hard offset shadows are a choice, not a default. I use an unblurred offset in ink or an accent on a few primary elements. Large production sites mostly use thin inset borders instead, so I do not put a shadow on every card.
- Buttons press into their shadow on hover and active. Focus gets a separate, visible outline.
- I use flat fills and visible alignment. I avoid frosted panels, glossy gradients and broken reading order.
- Errors, selected and disabled states use text or an icon as well as color.
- I test long labels and mobile wrapping. Headings cannot overlap controls or force horizontal scrolling.
