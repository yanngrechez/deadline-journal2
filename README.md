# Deadline Journal — free CMS edition

This project preserves the Deadline Journal editorial template and adds a free publishing workflow using:

- GitHub — source/content repository
- Pages CMS — visual article editor
- Cloudflare Workers with static assets — public hosting and automatic deployment

## Cloudflare build settings
- Production branch: main
- Build command: npm run build
- Deploy command: npx wrangler deploy --assets ./dist --compatibility-date 2026-08-28 --name deadline-journal2
- Static asset directory: dist
- Worker and asset settings: wrangler.jsonc

## Publishing
Open https://app.pagescms.org, sign in with GitHub, select this repository, open Articles, edit/create a story, set Status to Published, and Save.

Every save commits the content to GitHub. Cloudflare then rebuilds the site automatically.

## Clean routes

`npm run build` generates `dist/<article-slug>/index.html` for every published
article and directory pages for the six region paths in `routes.js`. Each has
a clean canonical URL, root-relative assets, and the existing article/region
renderer. New CMS articles need only a unique slug and Published status.

The build rejects reserved, malformed, and duplicate slugs before changing
the output. Region paths, static pages (`about`, `write`, `country`, etc.),
and asset directories are reserved. Change a conflicting slug in Pages CMS.

Cloudflare Workers Builds still builds `main` with `npm run build` and the
existing `wrangler deploy --assets ./dist` command. `wrangler.jsonc` points to
`.cloudflare/worker.mjs`, generated outside the public asset directory. The
Worker redirects `/article[.html]?slug=...` and `/region[.html]?region=...` URLs
with HTTP 301, retaining campaign parameters. Unknown/unpublished legacy
articles return 404. Assets use `drop-trailing-slash` HTML handling so directory
pages are served at slashless canonical paths. The Worker normalizes page URLs and HTTPS before serving generated HTML through
the static asset binding. Fingerprinted scripts, styles and images bypass the Worker. No framework or external redirect service is needed.

Country desks use stable name-based URLs such as `/spain` and `/united-states`, generated as static directories from `countries-data.js`. Country slugs are reserved against article collisions. Old `/country[.html]?country=ES` links redirect permanently, retaining campaign parameters. All country desks have canonical URLs. Only desks with real published coverage are indexable and included in the sitemap.

Run `npm run build` then `npm run preview` for local routing on port 4173.
`npm test` verifies generated pages, redirects, future CMS articles, and
slug collision protection. The preview uses the generated Worker with a local
static-asset adapter; production verification must also check Cloudflare.

## Drafts
Articles with Status = Draft are omitted from the public `data.js` by `build.js`, so they do not appear on the public site.

## Homepage positioning
Open **Front cover** in Pages CMS to select one published article for each image slot:
Main story, Bottom story, Side story up, Side story down, and Side story right.
Save the entire cover once. These selections remain fixed when new stories are published
or dates change. The old per-article position field is no longer used.

All other published articles form the title-only column, newest first (up to four).
Blank image slots stay empty. No column story is promoted automatically.
Choose an article only once. A missing, draft, or duplicate selection stops deployment
with an actionable error and keeps the existing live site intact. Before deleting,
unpublishing, or renaming a selected article, clear or replace its cover selection.

Latest and regional sections are determined automatically from publication date and region.

## Images throughout an article

Existing articles keep their Article body unchanged. For an illustrated story,
keep the opening paragraphs in Article body, then use **Additional article
sections** in Pages CMS. Add an **Image** section, followed by a **Text** section
for the next paragraphs. Repeat as needed and reorder sections to choose where
the images appear. When adapting an existing story, move (rather than copy)
the subsequent paragraphs into Text sections to avoid duplicate text.

Each Image section has an upload/picker, a screen-reader description, a caption,
and a photo credit/source. Captions and credits appear in small grey type.
Photographs retain their natural proportions. All sections belong to the same
article body, so reading progress and analytics include the complete story.

## Article sources

Paste formatted citations into the optional **Sources** rich-text field in Pages
CMS. Formatting and links are preserved; no citation reformatting is performed.
A purple **SOURCES +** disclosure appears after the article and opens the references
beneath it. Empty Sources fields do not render a control. Existing references
written into Article body remain untouched; move them into Sources when desired.

## Search visibility and performance

See [SEO-AUDIT.md](SEO-AUDIT.md) for the indexing policy, generated metadata,
responsive image pipeline, validation and remaining editorial/account tasks.
Run `pnpm install --frozen-lockfile` before building to install the image tooling.

## Search metadata after article updates

For a substantial revision, set **Last significant update (optional)** in Pages CMS.
This supplies the visible updated date, Article structured data and sitemap freshness.
Leave it blank on first publication; future or pre-publication update dates are ignored.
Publication dates remain separate. Run `npm run build` then `npm test` to check
canonical pages, local links, sitemap eligibility, structured data and redirects.
