# Claudia Valsells — site

A static site built from the content of [claudiavalsells.com](https://www.claudiavalsells.com).
WordPress stays the CMS; Claudia publishes exactly as she does today. This
repository is the design and front-end, rebuilt from the ground up around the
designer's three mockups: the stack, the grid, and the peach About.

## Quick start

```bash
npm install
npm run build && npm run serve     # → http://localhost:4321
```

The dataset (`content/projects.json`), the crop decisions (`content/crops.json`,
`content/crops.final.json`) and the rendered images are committed or cached, so
`build` works offline. To refresh from the live site:

| Script | Does |
|---|---|
| `npm run extract` | Crawls the WordPress sitemaps, parses each page, writes the typed dataset |
| `npm run crop` | Finds the painting in every gallery photograph and cuts it out (see below) |
| `npm run images` | Renders every image — cropped where a crop was accepted — as AVIF + WebP + JPEG at 400/800/1600px |
| `npm run build` | Renders the pages into `dist/` |
| `npm run serve` | Static server for `dist/` |
| `npm run typecheck` | `tsc --noEmit` |

## Pages

| Route | What it is |
|---|---|
| `/` | What's Color? — everyone who has answered, in one run of names, with the three editions introduced beneath |
| `/whats-color/<numeral>/` | One edition: its own names, then each person's answer in three columns |
| `/artwork/` | Every painting gathered into one stack, dispersing into the grid as you scroll |
| `/artwork/<slug>/` | One painting — what a shared link opens; from the grid the same work opens in the lightbox |
| `/exhibitions/` | The exhibitions as an index; each opens as a panel over the page |
| `/commissioned/` | The commissioned work, grouped, likewise |
| `/color-chart/` | The color chart: the price and the way to order held still in the margin, the chart's own colours beside them, and only the text moving |
| About | An overlay on any page, the work faint behind, told in four parts as you scroll: the capitals lead writes itself, the studio photographs slide in from the side (and open large), the biography writes itself as it rises, and the record, the collections and the contact come in last |

### The stack

The grid is the real layout; the stack is a transform on each tile. At the top
of the page every tile is translated and scaled onto the pile in the middle of
the screen; over the first screen of scrolling those transforms ease to nothing
and the tiles are simply where the grid put them (`src/client/stack.ts`). The
pile follows the viewport while it dissolves, so it never jumps. Density and
filter changes fire `gridchange` so the stack re-measures its targets.

### The grid

Rows of one height, widths following the pictures, left-aligned with wide
gutters — the grid in the mockup. `--unit` (the row height) is the only thing
the density control changes: 24 / 60 / 154, after tylermitchell.co's 50 / 200 /
500, labelled by roughly how many works fit on a screen at that size. All 154
are always shown; the year filter toggles `hidden`.

### The colour chart, and the one thing that is not a file

The Colour Chart is the only page of the site that is exactly a window tall.
Nothing on it scrolls but the text: the price and **Order yours** stay beside
the words for as long as anyone reads them, and the chart itself stands between
them as twenty-three bands of its own colour, measured off the designer's
reference (`src/content/colour-chart.ts`). A band under the pointer steps out to
the right by about its own height, and nothing else moves.

**Order yours** opens the inquiry form over the page. A static host cannot send
mail, so the form posts to a small handler deployed separately —
`server/inquiries/`, a Cloudflare Worker — which is where every check that
matters happens: a honeypot, the time the form was open, field shapes, control
characters stripped out of anything bound for a mail header, an origin
allow-list, a per-sender rate limit, a daily ceiling, and Cloudflare's Turnstile
if a key is configured. Its README covers deploying it.

Claudia's address is not in this repository and not in the page. It is a secret
in the handler's environment, so the page offers to write to her without saying
where — and the two source paragraphs that used to print it, and the price, are
taken out of the body and said by the margin instead.

```bash
INQUIRIES_ENDPOINT=https://… TURNSTILE_SITE_KEY=… npm run build
```

Built without the endpoint, the form renders and refuses to send, and the build
says so.

### The crops

127 of the 154 covers are installation photographs — the canvas on a white
wall, floor often visible. `scripts/crop.ts` finds the painting and cuts it out:

1. Sample the wall colour from the top corners.
2. Mask every pixel that is not wall-coloured; close small gaps.
3. Label connected components, drop floor-like bands and edge strips, take the
   dominant remainder and merge sizeable neighbours.
4. **Validate against the metadata**: the crop's proportions must match the
   painting's catalogued dimensions within 6%. A crop that fails is thrown away
   — a wrong crop is worse than none.

Every accepted crop was then reviewed visually on contact sheets, and every
near-miss rejection re-judged: 110 passed the automated check, 10 of those were
dropped on review (wall left around the painting, floor at the bottom), and 20
near misses were rescued (clean crops of framed canvases whose listed size is
the canvas alone). 120 of the 154 works are served from their crop; 6 were
already flat reproductions; 28 stay as photographs (angled shots, close-ups,
leaning canvases with floor). `content/crops.json` records every decision. The image pipeline
renders those ids from the crop under a distinct key (`<id>c-…`), so nothing
rendered from the uncropped photograph is ever reused by mistake.

### Titles

On hover the characters of the menu and wordmark roll upward in place, one 25ms
after the next, after the links on landonorris.com. Each character is a span
whose own text is transparent, with two pseudo-elements drawing the same
character — one in place, one held just below and clipped. Nothing new appears.

## Publishing — unchanged

Claudia publishes as she does today: Portfolio → Add New → title → images and
text → Publish. This site reads WordPress rather than replacing it:

```
WordPress (unchanged) → npm run extract → npm run crop → npm run images → npm run build → static HTML
```

The one piece to add for production is a trigger — a `save_post` hook calling a
build webhook — so publishing rebuilds the site within a minute.

## Architecture

```
scripts/
  extract.ts      Sitemap-driven crawler → typed dataset
  crop.ts         Painting detection + metadata validation + contact sheets
  images.ts       Image pipeline (crop-aware)
  serve.ts        Zero-dependency static server
src/
  content/        types, load (the only disk reader), title, describe, sections
  components/     html (the 40-line template tag), image, gallery, panels, slider, layout
  pages/index.ts  The pages and the artwork detail
  client/         stack, controls, slider, panels, lightbox, text-roll — no framework
  styles/         base + top bar, grid + detail, overlays, colour chart
  build.ts        Renders every route
server/
  inquiries/      The order desk: the one piece that is not a static file
content/
  projects.json   The dataset (172 records, 370 images)
  crops.json      Every crop decision, with reasons
  crops.final.json  Ids whose crop passed review
```

Runtime dependencies: none — the site is files. Build dependencies:
`typescript`, `node-html-parser`, `sharp`. The order desk under `server/` is
deployed on its own and shares none of this.

## Not in this build, by decision

- The full biography, collections list and CV from the source About page are in
  the dataset (`content/projects.json`, slug `about`) but not rendered; the About
  overlay shows the designer's short version.
- Catalan. The previous prototype carried it; it can return as a locale layer
  over the same dataset.
- Inquiries as a section of their own. The Colour Chart has an order form;
  everything else still points at the gallery contact on the source data.
- The designer's line breaks in the Colour Chart's text. Her reference sets it
  in clauses — a break after each comma — where the source holds one run of
  prose and the column wraps it. Those breaks belong in WordPress, which is
  where the text is written.
