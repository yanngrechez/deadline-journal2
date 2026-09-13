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
pages are served at slashless canonical paths. The Worker runs before assets
only for legacy URLs and non-canonical path variants; clean pages use the
static asset service. No framework or external redirect service is needed.

Country links retain `/country.html?country=ES` (Cloudflare's existing `.html`
normalization still applies). The sitemap lists only clean canonical home,
About, Write for Us, article, and region URLs; country desks remain reachable
through navigation, the map, and region directories.

Run `npm run build` then `npm run preview` for local routing on port 4173.
`npm test` verifies generated pages, redirects, future CMS articles, and
slug collision protection. The preview uses the generated Worker with a local
static-asset adapter; production verification must also check Cloudflare.

## Drafts
Articles with Status = Draft are omitted from the public `data.js` by `build.js`, so they do not appear on the public site.

## Homepage positioning
Homepage Rank:
1 = lead story
2 = lower-left supporting story
3–4 = middle column
5–8 = right headline rail
999 = normal/default

Latest and regional sections are determined automatically from publication date and region.
