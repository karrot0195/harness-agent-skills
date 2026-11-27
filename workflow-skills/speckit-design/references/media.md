# Media

I pick imagery and video that lifts the page the moment it loads, belongs to this project and no other, and never ships broken or rights-unclear.

---

## I Lock Direction First

```
ERA · LIGHT · PALETTE (3 hexes) · SUBJECT · DISTANCE · FORBIDDEN
```

Filled from the brand, not the category. No vibe signal in the brief? I ask for two reference images.

---

## Own Photos Beat Stock

Before searching, I look for the project's real photos: the brief (attachments, links, live site), the repo (`find . -path ./node_modules -prune -o -type f \( -iname '*.jpg' -o -iname '*.png' -o -iname '*.webp' -o -iname '*.mp4' \) -print`), and existing `src`/`url()` values or CMS hosts in config. Logos, icons, screenshots, and placeholders don't count. If I find nothing and the subject is physical, I ask once: "Do you have photos of the real <subject>?"

---

## I Match It To The Project

| Project | What lifts it | Look first |
|---|---|---|
| Food, café, restaurant | Close, hard-lit plates, steam, hands | Pexels, Unsplash, Kaboompics |
| Hotel, travel, place | Wide shot at golden or blue hour, one person for scale | Unsplash, Pexels, Wikimedia |
| Fashion, beauty, craft | Editorial crop, one strong light, texture | Pexels, Unsplash, Burst |
| SaaS, dev, AI | Material macro, light on glass, slow ambient loop | Pexels Videos, Coverr, Poly Haven |
| Finance, legal | Architecture, stone, shadow geometry | Unsplash, Openverse |
| Science, space | Real instrument or observation imagery | NASA, Wikimedia |
| Culture, editorial, luxury | Public-domain paintings, engravings, maps | The Met, Openverse |
| Event, music, fitness | Motion, stage light, grain | Pexels Videos, Pixabay, Mixkit |

---

## It Earns The Slot

"Aesthetic" is the bar, never a query word. Every asset needs: **one subject** the eye lands on in under a second, **real directional light**, **depth**, **calm space for the headline**, **palette fit**, **one detail worth zooming into**, and **2× display resolution**. Gut test: would someone screenshot the page for this image? If not, it's filler.

**Video:** a 6–15s seamless loop with one slow move and no cuts. `autoplay muted loop playsinline` + `poster`, still image under `prefers-reduced-motion`, ≤ ~4 MB (re-encode with `ffmpeg -an -crf 28` if available), and a scrim so text passes contrast on every frame.

---

## I Search The Photograph, Not The Subject

Query = **[film or camera] + [light] + [subject] + [distance]**, 4–7 words. `healthy food` → `overhead ceramic plate hard shadow film`. Banned: *beautiful, modern, professional, stunning, creative, aesthetic.* Up to five queries per slot across at least two hosts, then the fallback ladder.

---

## Hosts

- **Photo:** Unsplash, Pexels, Pixabay, Burst, Kaboompics, StockSnap
- **Video:** Pexels, Pixabay, Coverr, Mixkit
- **Public domain / open:** Openverse, Wikimedia Commons, The Met, NASA. The least overused, and often the most striking.
- **Texture:** Poly Haven, ambientCG (CC0)
- **Never:** flat vector packs (unDraw, Storyset). They read as template.

Stock sites show curl a bot wall or an empty JavaScript shell, so I search through hosts with a keyless JSON API (Openverse, Wikimedia Commons, The Met keeping only `isPublicDomain` objects, NASA) and take the file URL and licence from the response. Pexels, Pixabay, and Unsplash only if `PEXELS_API_KEY`, `PIXABAY_API_KEY`, or `UNSPLASH_ACCESS_KEY` is already set; I never hardcode a key. I send curl's default User-Agent, never a fake browser one. A 4xx, a retirement notice, or a "Just a moment…" bot wall is a failed fetch, so I move to the next source.

---

## Reject Test

Any one fails it: a stock caption writable in five words · no detail worth a second look · won't sit in PALETTE even duotoned · could appear unchanged on a competitor's site.

Hard bans: people at laptops, handshakes, sticky notes, product on white, blue-purple mesh gradients, glowing circuitry, lens flare, watermarks, baked-in text, flat vector people.

---

## I Verify Before It Ships

- I never write a media URL from memory or build one from a host's usual URL shape. `source.unsplash.com` is dead, and guessed `images.unsplash.com/photo-<id>` or `images.pexels.com/photos/<id>` URLs are banned. The host's own size parameters (`w=`, `q=`, `fit=`) on a URL I read are fine.
- `curl -sL -o /dev/null -w '%{http_code} %{content_type}' "<final url>"` must return `200` with `image/*` or `video/*`. Nothing is downloaded yet.

---

## I Clear The Rights

I read the licence on the source page or in the API response before anything is downloaded.
- **Clear:** CC0 and public domain (Met public-domain objects, Poly Haven, ambientCG); Unsplash, Pexels, Pixabay, Burst, Kaboompics, StockSnap, Coverr, and Mixkit under their own licences. Unsplash+ shows up in normal Unsplash results and is paid: rejected.
- **Per file:** Openverse and Wikimedia (`license` / `extmetadata.LicenseShortName`). NASA: reject anything credited to a third party, and never imply endorsement.
- **CC-BY:** only with credit in the footer or `ATTRIBUTION.md`. **CC-BY-SA:** only if the project can share-alike. **NC, ND, unclear, or all rights reserved:** rejected.
- One verdict line per asset before download: `<source> · <licence as stated> · clear | credit | rejected`.

---

## I Bring It Into The Project

- **Temp first:** scratch pages, candidates, and logs stay in `tmp=$(mktemp -d)`, never the project. `curl -sL "<url>" -o "$tmp/<name>.<ext>"`.
- **Size:** ~2× the largest display width, as WebP: `cwebp -q 80 -resize <w> 0 in.jpg -o out.webp` or `magick in.jpg -resize <w>x -quality 80 out.webp`. Neither installed: a resized JPEG via `sips -Z <w> in.jpg --out out.jpg`, never the full-size original. `sips` cannot write WebP.
- **Check:** `file` confirms a real image, not an error page with an image extension.
- **Place:** in the project's existing asset directory (`public/`, `assets/`, `static/`, or beside a standalone `index.html`). I never hotlink.
- **Src:** the path the site serves, not the disk path. Vite or Next `public/images/x.webp` is `src="/images/x.webp"`.
- **Markup:** hero gets `srcset` (two widths) + `sizes`; the rest get `width`, `height`, `loading="lazy"`. Alt text describes what I actually fetched.

---

## Fewer, Larger, One Set

Landing budget: hero, mid-page break, close. One treatment across all of them: either a duotone into the palette (`grayscale(1)` + accent background + `mix-blend-mode: luminosity`) or ~12% SVG grain. One crop ratio, one radius. Assets from different hosts must look like one shoot.

---

## Fallback Ladder

Nothing passed, fetched, or cleared? I never ship a weak asset or a broken `<img>`.
- **Physical subject:** ask who can supply a real photo → SVG/CSS illustration → a labeled stand-in sized for the real photo.
- **Non-physical subject:** oversized type (12–20vw) → generated texture → macro of one material → flat color.

I say which rung I landed on and why.
