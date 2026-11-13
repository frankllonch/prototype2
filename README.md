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

The Colour Chart is a page of type and nothing else: the statement across the
full width, the way to order one under it, the price, her thanks, and the site's
line at the foot. The sheet before it had a margin column, a stack of the
chart's own colours, the three photographs and a record of Features, technical
notes and About a colour chart; the simplification took all of them.

`src/content/colour-chart.ts` still reads every one of those out of WordPress —
the sections are parsed and still travel in the WordPress manifest — the page
simply no longer sets them.

The sizes come from the designer's own sheet, which is drawn at 1728 and
specified in points of that frame: 40 for text, 45 for a control, 45 of leading
on 40 of text. The site's one type size is 40 of a 1920 frame, so her point is a
tenth larger. Rather than scatter 1.111 through the stylesheet, it is stated
once as a unit — `--pt: calc(var(--type) / 36)` — and every figure below it is
hers.

The page stands whole on one screen and does not move: everything the sheet
sets is in a block stuck to the top of the view, with the line at the foot
pushed to the foot, and behind it runs a strip of empty height whose only job
is to be scrolled through. Each of the eighty-eight words has a slice of that
run, so the statement is typed by the reader's own hand, and the last word
lands on the last pixel — when the sentence stands there is nothing left to
scroll to. Scrolling back unwrites it, which is not a feature but what a
scroll timeline is: the words are at a position, not partway through a
performance.

Four fifths of the run writes the sentence; the last fifth brings in what is
under it — the way to order one, the price, the thanks and the line at the foot
— each rising a little out of a blur over its own slice, the way the last part
of About arrives. They are not typed: written word by word they would read as
more of the statement.

On arrival the page travels the first paragraph's worth of slices itself —
"Color has always been my inspiration: a source of knowledge, a way of life!",
the question and its answer — over 1.2s, and stops there with the chevron
still asking for the rest (`client/chart.ts`). The length is counted off the
paragraph rather than stated, so it goes on stopping at the end of it however
the text is rewritten. It is the same scroll, so the reader can take it
straight back up and unwrite them; a clock would have written them once and
for good.

The chevron holds until the sentence stands — the share of the scroll the
words are spread over, which the page states as `data-chart-written` and
`client/scroll-cue.ts` reads. That is also the moment before the line at the
foot begins to arrive, so the two never share the bottom of the screen.
At rest the page is blank: the words start a slice in rather than at the top of
the document, because a stepped animation jumps at the start of its range and a
first word ranged from nought is a word that is simply always there.

The page sets "color" where WordPress holds "colour" — the chart's own spelling,
normalised in `content/colour-chart.ts` rather than asked of Claudia.

The slices are worked out at build in `components/colour-chart.ts`; `--chart-run`
in the stylesheet is how much scroll the writing takes, and can be tuned on its
own, since a slice is a fraction of the run whatever its height. The sheet's
spacing has been taken in to make one screen of it — her type to the point, the
air between it rather less. Without scroll-run animations, or with motion
reduced, there is no run at all, no word is hidden, and the page is the static
one the sheet draws.

**Thanks to everyone!** opens the photographs people have sent of the chart in
use — fanned on a shelf, on a workbench, in a hand, open on a restaurant table.
They are the same sheet an exhibition that is photographs and nothing else
gets (`components/plates.ts`): the masthead top left, one picture in the middle
of the frame, an arrow either side, raised and put away by `client/panels.ts`
and stepped through by `client/figures.ts`. No new mechanism, which is why it
reads the same as every other detail on the site.

They were sent rather than published, so there is no URL to fetch them from and
the files are the record. Drop pictures into `content/raw/local/chart` and run:

```bash
npm run add-chart-photos && npm run images && npm run build
```

Like everything under `content/raw`, those files are not in git — so, as with
the paintings, the machine that holds them is the machine that can publish.

The arrow beside **Order yours** turns slowly on hover: 1.2s, eased at both
ends, and only where `(hover: hover) and (pointer: fine)` holds. A tap leaves
`:hover` standing on a touch screen, so on a phone it turned once and stayed
turned; it is off `:focus-visible` too, since closing the order form puts focus
back on the control and left the arrow turned by a form the reader had
finished with.

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
- The Colour Chart's three photographs and the credits that named them, and its
  record — Features, the technical characteristics, About a colour chart. None
  is on the simplified sheet. All of it is still read out of the source; the
  page's component is what no longer sets it.
The chrome has moved with the final sheets, in three places in `00-base.css`:

- `--bar-top` is where the bar's first line sits, and with it the close control
  of every overlay. 3rem, because all of her sheets put the cap of the wordmark
  48 below the top of the window, against the 25.6 it was.
- `--pad`, the page margin, has its ceiling at 3.125rem — her 45pt, which is 50
  where ours was 40. The bar and the pages take the same variable, so they move
  together and stay flush.
- The menu order is hers: Color Chart, Commissioned, Exhibitions, Artwork,
  About.

`--bar`, the room kept clear below the bar, is unchanged, and so is the mobile
bar, which sets its own padding. Seven page types were checked at 1200, 900 and
390 for anything the narrower measure pushes off the edge; nothing does.
- The WordPress theme's own Colour Chart component
  (`wordpress/themes/claudiavalsells/inc/components/chart.php`) is a hand-port
  of the markup this page had before the sheet arrived, so it still renders the
  old composition. The stylesheet it serves is built from `src/styles`, so the
  two are now out of step until that component is ported.
