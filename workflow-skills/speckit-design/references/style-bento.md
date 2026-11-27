# Bento: `/design style bento`

I make a small set of unequal tiles tell one clear story. Each tile has one job.

---

## Required companion reference

I follow the [style workflow](style.md) for report context, scope, implementation and verification. The command loads it alongside this guide.

---

## The design pass

- I lay the tiles on one grid with a 12 to 16px gap. A tile spans two to four columns and one or two rows.
- The grid is the page's composition, not a row of cards. At desktop width I use at least four tiles in at least two sizes, and at least one tile spans two rows. Two or three equal cards side by side are not bento. If the content is too thin for four tiles, I split existing content into tiles (a plan tile, a renewal tile, an invoices tile) and never invent new content to fill the grid.
- I give every tile the same corner radius, around 12px, and a 1px low-contrast border. I avoid heavy shadows.
- Each tile holds one headline, one proof element (a number, a screenshot or one short line) and at most one action.
- I put the largest tile where the main message starts, usually top left. Smaller tiles support it rather than compete.
- On mobile the tiles stack in DOM order, and each keeps its own internal layout.
- I test 320px width, 200% zoom and keyboard focus moving tile by tile. Hover effects never hide the content.
