# Moving the new site into WordPress

Written 29 October 2026. Decision taken the same day: option B, the WordPress
theme. **Status: Phase 1 is built, reviewed and running locally** — see "Where
things stand" just below, and `wordpress/README.md` for how to run it.

This is the working document for taking the design in this repository live on
Claudia's own WordPress, at hubsfera's hosting, with Claudia editing everything
herself. It is written for someone who has not used WordPress before. It will be
updated as each phase lands.

## Where things stand (30 October 2026)

Built, imported and checked on this Mac at http://localhost:8888 (WordPress
7.1, PHP 8.3, in Docker). Everything below was looked at in a browser.

Since 29 October:

- **The three editions of What's Color?** are the designer's composed sheets,
  as on the static site: which column each person sits in, how far down, where
  the photographs and Claudia's paragraphs fall. That placement is layout and
  lives in the theme; what Claudia edits is the words — each edition's entry
  holds her paragraphs in the order the sheet sets them, and each person is an
  entry under Answers. A person she adds appears after the composition until
  the sheet is redrawn to place them.
- **Checked against the static site, byte for byte.** `npm run wp:diff` reads
  every page from the static build and from WordPress and diffs the markup
  with the intended differences set aside. Every page is the same, except the
  three things listed under "For the designer" below.
- **Reviewed.** A review of the theme, the plugin, the importer and the
  exporter — eight readers, each finding checked three ways — turned up
  thirty-four things, all fixed: among them, the importer no longer overwrites
  an entry Claudia has edited since the last run, keeps the old site's
  filenames in every case (a hundred of them were being renamed), and never
  dates a show into the future where WordPress would hide it; a work saved
  without a year gets the current one instead of vanishing from the grid; a
  show or project at its own address while still a draft previews properly; a
  page served with its panel open still works without scripting; old
  addresses redirect with their query string and with headers a browser may
  cache; WordPress's own block styles no longer reach the page; the artwork
  index makes a handful of queries rather than four hundred.
- **The admin in Spanish and Catalan.** Every label and help text of the
  plugin, proofread; WordPress's own language packs do the rest. Set per site
  or per user (`wordpress/README.md`).
- **WebP** beside every JPEG, through the Modern Image Formats plugin, as the
  static site serves it; the theme already offered the formats when present.

- **The theme** draws every page of the site from WordPress with the design's
  own stylesheet and scripts, copied from `src/` unchanged: the home page with
  the film and the rosters, the stack and the grid with the year rail and the
  density controls, each painting's page with its cut-out, the photograph
  behind it and the way through the collection, the exhibitions and
  commissioned indexes with their panels, each edition of What's Color?, the
  Colour Chart with its order form, About as the red card over the start page.
- **Real addresses.** Each exhibition and project has one (`/exhibitions/<slug>/`,
  `/commissioned/<slug>/`) that opens the index with its panel up, and About is
  `/about/`. Closing a panel returns to the index.
- **The content**, imported once from the dataset: 181 works (152 with their
  cut-out as the main picture and the photograph beside it), 14 commissioned
  projects in their three groups, 49 exhibitions (6 with pages), 3 editions
  with 81 people, About, the Colour Chart; 369 photographs and 152 cut-outs in
  the media library, each photograph in the uploads folder of its original
  month under its original filename, so old image links keep working.
- **Claudia's editor**: Artwork, Commissioned, Exhibitions and What's Color?
  in the admin menu; a fields panel beside each entry (year, dimensions,
  materials, available, the photograph in place, venue and dates, colour
  references…); only the blocks a page of this site can use. A field saved in
  the editor shows on the page at once — checked.
- **Old addresses** answer with a permanent redirect to their new home — all of
  section 5, checked over HTTP.
- **The order desk** is a WordPress endpoint with the worker's checks; the
  honeypot, the time trap and the validation were exercised. Sending real mail
  needs the host's mailer (Phase 2).

Not done yet, in order:

1. **Review** on this Mac by Frank and Claudia; her trying to add a work.
2. **For the designer** — the places where WordPress reads differently from
   the static site, each on purpose, each needing a yes or a no:
   - **The record on About** is read out of the Exhibitions entries (one list
     to maintain) rather than retyped, so a few lines read differently from
     her sheet. Her sheet also sets each entry's place in a lighter weight
     (`.about-show-place`); WordPress has no place field yet, so every line
     under a title there is regular weight. The fairs break into their second
     column at the same row on both sides.
   - **The heading of a panel.** On the static site an exhibition's or a
     project's panel opens with the title and venue of the old page it was
     derived from (“TRANSITIONS”, “Color palette for Santa & Cole, 2023-on
     going”); in WordPress with the entry's own title and venue, the ones the
     row shows. One title per entry.
   - **Two dates disagree between her two lists**: Transitions is 2023 on the
     About record and 2025 on the exhibitions list, and Color Dialogues runs
     December to January with its years the other way round. WordPress shows
     the list's; the static site shows both.
   - The static site carries a panel for the Terranova project that no row
     opens; in WordPress that project is the third edition of What's Color?.
3. **Edition III's sheet** follows the static site's work in progress of
   30 October (the strip of photographs of the book and its viewer). When that
   design settles, `npm run wp:diff` says where the theme has to follow.
4. **Mail** from the order desk needs the host's mailer (Phase 2).
5. A **page cache** for the host, and the staging checklist (Phase 2).
6. Small: without scripting, an exhibition's own address lands at the top
   of the list with its panel further down, rather than on the panel.

## 1. Where things stand

### The old site — live at www.claudiavalsells.com, hosted by hubsfera

| | |
|---|---|
| WordPress | 6.8.12. A security release (7.1.4) and 11 plugin updates are pending. Site Health reports one critical issue, not yet read. |
| Theme | Koncept, with a child theme. Pages are laid out with WPBakery Page Builder and the Classic Editor. The theme asks for Revolution Slider, which is not installed. |
| Paintings | 181, stored as "Portfolio" entries at `/portfolio/<slug>/`. Two categories: paintings, available. |
| Pages | 26: Home, Artwork (the grid), Available Works, 15 collaborations under `/projects/`, Exhibitions (six shows in one page), Colour Chart, About, Contacto, two shop leftovers (Carrito, Finalizar compra) and one test page ("est"). |
| Plugins | Wordfence (security), Yoast SEO, WPForms Lite (the inquiry form), Duplicator (installed, no backup made yet), Better Search Replace, Classic Editor, Duplicate Page, Database for WPForms, WordPress Importer, Category Order. |
| Access | Frank has an administrator user. Disk raised from 2 to 4 GB for a test environment. Toni (hubsfera) suggests Duplicator. |

### The new site — this repository

Static HTML built from the WordPress content by scripts (extract → crop → images
→ build): eight pages and 181 artwork pages, deployed as a prototype on GitHub
Pages. The design is TypeScript components, CSS and client scripts under `src/`.
The order form posts to a separate Cloudflare Worker, not yet deployed.

## 2. The decision: how the new site runs

There are two ways to make the new design the live site.

**A. Keep what the README assumed.** WordPress stays exactly as it is, hidden
away as the content editor; the public site is the static build, hosted on a
static host and rebuilt every time Claudia publishes. This needs a build server
that downloads the images, a mail worker, moving the domain to the static host
and WordPress to a subdomain, and it keeps Claudia in the old editor for good:
the extraction script reads the old theme's HTML, so modernising WordPress
breaks it.

**B. Make the new design a WordPress theme (recommended).** The site runs on
hubsfera's hosting as WordPress with our theme. Claudia edits in WordPress's
current block editor, in templates made for her content: Artwork, Commissioned,
Exhibition, What's Color, About, Colour Chart. One system, publishing is
immediate, the agency can maintain it, mail goes out from the host, nothing
else to run.

Every requirement you listed points at B: edit in WordPress, the newest
WordPress, the agency's hosting and test space, a migration. What B costs: the
page templates are ported from TypeScript to PHP (the CSS and scripts carry over
unchanged), the image pipeline is replaced by WordPress's media library (the
paintings already cropped are imported once), and the static-site path and the
Cloudflare worker are retired. The worker's checks move into the theme's own
form.

**Block editor, not Site Editor.** WordPress has two editors now. The block
editor is for content and is what Claudia will use. The Site Editor lets anyone
rearrange a theme's layouts by dragging blocks; it needs a "block theme". The
design here is exact and code-driven (the stack, the colour chart, the About
card), so the layouts stay in code and Claudia gets the block editor plus a
few fields per content type. That is what "the one with blocks" should mean for
her: writing and uploading, not rebuilding pages.

## 3. What Claudia will edit

| Content type | Replaces | What she fills in | Where it shows |
|---|---|---|---|
| Artwork | the Portfolio entries | title, the painting image, more photographs (installation views), year, dimensions, materials, reference, available yes/no, optional text | the stack and grid, `/artwork/<slug>/`, the year filter, the lightbox |
| Commissioned | the pages under `/projects/` | title, year, client, group (Commissioned, Education, Solidary), images, text | `/commissioned/`, each as a panel with its own URL |
| Exhibition | the single Exhibitions page | title, venue, from and to, solo or group, images, text | `/exhibitions/`, each as a panel with its own URL |
| What's Color edition | the one Terranova page and two shows | numeral, title, introduction | `/whats-color/<numeral>/` |
| Answer | — (new) | a person's name and their answer, filed under an edition | the run of names on the home page, the three columns on the edition page |
| About | the About page | the red card (name, city, year, phone, emails), biography paragraphs with the two studio photographs, the record of shows, the collections, the copyright line | the About overlay on every page |
| Colour Chart | the Colour Chart page | price, order text; the address the form writes to | `/color-chart/` and the order form |
| Site settings | — | menu labels, footer, social links | everywhere |

The 23 bands of the colour chart and the grouping of the commissioned work are
the designer's decisions and stay in code, as they are now.

**Images.** Claudia uploads a photograph; WordPress makes the sizes (400, 800,
1600) and the WebP and AVIF versions. The 120 crops this repository already
made are imported once as each painting's main image, with the installation
photograph kept as a second image, so nothing is lost. For a new work she
uploads either the cut-out painting or the photograph as it is.

**The order form.** The theme's own form, with the same checks the Cloudflare
worker made (honeypot, time trap, rate limit, nothing from the form reaches a
mail header), sending through the host's mail. Claudia's address stays out of
the page; it is a setting only an administrator sees.

**Plugins on the new site, deliberately few:** Wordfence, a backup plugin
(Duplicator's schedules or UpdraftPlus), WP Mail SMTP, the Modern Image Formats
plugin, and Yoast SEO only if we want its meta descriptions (WordPress makes its
own sitemap). Not carried over: WPBakery, Classic Editor, Revolution Slider,
WPForms, Duplicate Page, Database for WPForms, Category Order, Better Search
Replace.

## 4. Phases

### Phase 0 — Safety first: this week, on the live site, nothing visible changes

1. Change the password Toni sent. It travelled by email and in chat in plain
   text. Users → Profile → Set New Password.
2. Duplicator → Backups → Create New: a full backup of the live site. Download
   both files (the archive and the installer) and keep them somewhere safe.
   This is our rollback and a copy of every image and the database.
3. Read the Site Health critical item, but press no "Update" button on the live
   site yet. The pending security release should be applied by hubsfera after
   their own backup, because Koncept and WPBakery may not like WordPress 7.
4. Send Toni the questions in section 7.

### Phase 1 — Build the theme locally, in this repository

- WordPress runs in Docker on this Mac (wp-env), latest version, nothing
  installed on the machine itself.
- A new `wordpress/` folder: the theme, a small plugin that defines the content
  types, fields and redirects, and the import scripts.
- Each page of `src/` is ported; the dataset in `content/projects.json` and the
  crops are imported into WordPress as real entries and media: 181 artworks,
  15 commissioned, the exhibitions, the three editions with their answers,
  About, Colour Chart.
- Checkpoint: you and Claudia look at it on this Mac with the real content, and
  Claudia adds a work herself.

### Phase 2 — Staging at hubsfera, private

- Toni provides a subdomain (for example nova.claudiavalsells.com) with its own
  folder, a database and HTTPS, plus SFTP access. Alternatively we hand him a
  Duplicator package of the local site and he installs it.
- We install with Duplicator (package built locally, installer run on staging).
- The staging stays private: Settings → Reading → "Discourage search engines",
  plus a password at the server door (HTTP authentication, which Toni can set
  in a minute). Nobody without the password sees anything. The order form
  sends to your address only.
- Testing on the real server: PHP version, image generation, mail delivery,
  speed, phone and tablet.
- Claudia and the designer review there. Fixes go into this repository and up
  again.

### Phase 3 — Content freeze and final import: one or two days before go-live

- Claudia stops editing the old site. The extract runs once more against the
  live site, the import runs again on staging, and the counts are checked
  against the old site (works added since the dataset's date included).
- Claudia gets her user on the new site and sets her own password.

### Phase 4 — Go-live: one morning, with Toni on hand

- Preferred: Toni points the domain at the new site's folder. The old site's
  folder stays untouched as the rollback. Alternative: a Duplicator package of
  staging installed over the live folder, with the staging address replaced by
  the real one.
- Then, in order: remove the staging password and the "discourage search
  engines" flag; confirm the redirects (section 5) by crawling every old URL;
  save permalinks once; check HTTPS; test the order form; submit the sitemap in
  Google Search Console; confirm Wordfence and the scheduled backup.
- Keep the old folder and the Phase 0 backup for a month.

### Phase 5 — Handover

A one-page guide inside WordPress (a dashboard panel) and as a PDF: add a work,
add an exhibition, edit About, change the price. A half-hour session with
Claudia.

## 5. Link map — old URLs to new

Every address the old site ever published keeps working: it answers with a
permanent redirect (301) to its new home, so bookmarks, Instagram links and
Google keep resolving. Three patterns cover almost everything.

| Old | New | Note |
|---|---|---|
| `/` | `/` | the home page becomes What's Color? |
| `/artwork/` | `/artwork/` | unchanged |
| `/portfolio/<slug>/` | `/artwork/<slug>/` | 181 works; every slug is kept exactly |
| `/portfolio_category/pinturas-paintings/` | `/artwork/` | |
| `/portfolio_category/available/` and `/available-works/` | `/artwork/` | the new design has no separate "available" view; to decide with the designer |
| `/projects/` | `/commissioned/` | |
| `/projects/<slug>/` | `/commissioned/<slug>/` | 14 pages; opens the index with that panel |
| `/projects/whats-color-3rd-edition-llibreria-terranova-abril-2024/` | `/whats-color/iii/` | the one exception |
| `/whats-color-exhibitions/` | `/exhibitions/` | the two What's Color shows live at `/whats-color/i/` and `/whats-color/ii/` |
| `/colour-chart/` | `/color-chart/` | the spelling changes |
| `/about/` | `/about/` | opens the About overlay; About gets a real address on the new site |
| `/contacto/` | `/about/` | the card carries phone and emails |
| `/carrito/`, `/finalizar-compra/` | `/artwork/` | shop leftovers |
| `/4824-2/` | `/` | a test page |
| `/wp-content/uploads/…` | unchanged | the import keeps the year/month folders and filenames, so old image links keep working |
| `/sitemap_index.xml` | `/wp-sitemap.xml` | Yoast's sitemap to WordPress's own |

The redirects live in the theme's companion plugin, versioned here, and are
exported as a list for Toni. The full list of 220 old addresses, each with its
target, is generated from `content/projects.json` and the old sitemaps, and a
script checks every one after go-live.

## 6. Keeping the test private

Staging sits on its own address with a server password, search engines told to
stay away, no analytics, and the order form pointed at your address. All of it
comes off in Phase 4, from a checklist, so none of it is forgotten on the live
site.

## 7. Questions for Toni

A draft, in Catalan, to read over and send:

> Hola Toni,
>
> Gràcies per l'accés i l'espai. Per muntar la web nova ens caldria aclarir
> alguns punts:
>
> 1. **Entorn de proves.** Ens podeu crear un subdomini (p. ex.
>    nova.claudiavalsells.com) amb la seva carpeta, una base de dades nova i
>    HTTPS, i passar-nos accés SFTP i les dades de la base de dades? Si ho
>    preferiu, us enviem nosaltres un paquet de Duplicator de la web nova i la
>    instal·leu vosaltres.
> 2. **PHP.** Quina versió hi ha al servidor (idealment 8.2 o superior), i si
>    Imagick o GD tenen suport per WebP i AVIF. També els valors actuals de
>    memory_limit, upload_max_filesize i max_execution_time.
> 3. **Correu.** Com s'envia correu des del WordPress? Hi ha un compte SMTP del
>    domini que puguem fer servir? SPF i DKIM estan configurats?
> 4. **Posada en marxa.** El dia del canvi, podríeu apuntar
>    www.claudiavalsells.com a la carpeta de la web nova, deixant l'antiga com
>    a còpia? O preferiu que ho fem nosaltres amb Duplicator sobreescrivint?
> 5. **Còpies.** Feu còpies a nivell de servidor? Nosaltres en farem una amb
>    Duplicator abans de tocar res.
> 6. **Actualitzacions pendents a la web actual** (WordPress 7.1.4, de
>    seguretat, i 11 plugins): les feu vosaltres? El tema Koncept i WPBakery
>    podrien donar problemes.
> 7. **Espai.** Quant ocupa ara la web (fitxers i base de dades) dins dels 4 GB?
> 8. **Site Health** marca un problema crític a l'escriptori. Ho podeu mirar?
>
> Merci,
> Frank

## 8. What is needed from you now

1. The decision in section 2.
2. The email to Toni.
3. When we work inside wp-admin together, log in in the app's own browser pane
   so I can see the screen and click with you. The Chrome extension is not
   connected from here. I never type your password.
4. The new password, as in Phase 0.

## 9. Open points

- The old Portfolio entries are not exposed by the public API; the existing
  extract script and the sitemaps cover them, which is why Phase 3 needs the
  freeze.
- Whether an "available works" view exists on the new site: the designer's
  call.
- Shared hosting is slower than a static host; a page cache (plugin or at the
  server) gives back most of the difference.
- Cropping new paintings automatically: the crop script can stay as a tool
  Frank runs now and then, or Claudia uploads cut-outs herself.
- Space: the old site, the new site and the backups must all fit in 4 GB until
  go-live. Toni's answer to question 7 decides whether that is comfortable.
