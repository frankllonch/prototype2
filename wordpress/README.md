# The WordPress site

claudiavalsells.com as a WordPress theme, with Claudia editing everything in the
block editor. The design has one source — `src/` in this repository — and this
folder is its WordPress reading: the stylesheet and the client scripts are
copied in unchanged, and each PHP component under `themes/claudiavalsells/inc/`
is the port of one TypeScript component, emitting the same markup.

```
wordpress/
  .wp-env.json                       Local WordPress in Docker (wp-env)
  themes/claudiavalsells/            The theme
    inc/                             setup, colour, size, image, content; components/
    assets/                          Built by `npm run wp:assets` — not committed
    *.php                            One template per page of the site
  plugins/claudiavalsells-content/   Content types, fields, redirects, the order desk
    includes/                        post-types, queries, editor, settings, redirects, inquiries, colours
    admin/editor.js                  The fields panel beside each entry (no build step)
    import.php                       Brings the content in from the bundle
  import/                            The bundle `npm run wp:export` writes — not committed
```

## Running it locally

Docker Desktop must be running.

```bash
npm install
npm run wp:assets        # src/ → themes/claudiavalsells/assets
npm run wp:start         # WordPress at http://localhost:8888 (admin / password)
npm run wp:export        # content/ + crops → wordpress/import (~240 MB)
npm run wp:import        # into the local WordPress: 2 minutes
```

`wp:start` activates the plugin; the theme is activated once with

```bash
cd wordpress && npx wp-env run cli wp theme activate claudiavalsells
```

`npm run wp:stop` stops the containers; the database persists between runs.
After editing `src/styles` or `src/client`, run `wp:assets` again — the built
files carry a stamp, so browsers fetch the new ones.

The import runs again safely: entries are found by their address and updated,
pictures by the id the bundle gave them and reused.

## What is where in the admin

| Menu | Holds |
|---|---|
| Artwork | One entry per painting: the picture, year, dimensions, materials, reference, available, and the photograph of it in place |
| Commissioned | The projects, in groups (Commissioned, Education, Solidary) |
| Exhibitions | Every show and fair. One with text or photographs opens as a page; one without is a line in the list. "In the record as" decides which About column lists it |
| What's Color? | The editions; under it, Answers: one person per entry, filed under an edition |
| Pages → About | The card (city, year, phone, emails), the biography with its photographs, the collections |
| Pages → Color Chart | The text, the price, the bands, the three photographs |
| Settings → Site texts | The description, the What's Color? note, the opening screen's lines, and where the order form sends |

Order of things: works newest year first; exhibitions and commissioned work in
the order they were listed, with anything new on top.

## The order desk

The Colour Chart's form posts to `/wp-json/cv/v1/inquiries`. The same checks the
Cloudflare worker made (`server/inquiries/`) are made here: a honeypot, the
time the form was open, field shapes, header-safe values, a per-sender rate
limit and a daily ceiling. Mail goes out with `wp_mail()`; on the host, WP Mail
SMTP (or the host's own mailer) carries it. The address it sends to is in
Settings → Site texts and nowhere on the page.

## Old addresses

Every address the old site published answers with a permanent redirect to its
new home — `includes/redirects.php`, and section 5 of
`docs/wordpress-migration.md` in words.

## Packaging for a server

```bash
npm run wp:assets
cd wordpress/themes && zip -r claudiavalsells.zip claudiavalsells
cd ../plugins && zip -r claudiavalsells-content.zip claudiavalsells-content
```

Upload both through Appearance → Themes and Plugins → Add New, copy
`wordpress/import/` to the server's `wp-content/import/`, and run the import
with WP-CLI there (`wp eval-file wp-content/plugins/claudiavalsells-content/import.php`).
Without WP-CLI on the host, a Duplicator package of the local site is the other
way across — see the plan.
