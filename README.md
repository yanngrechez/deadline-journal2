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

## Automatic article translation with DeepL

The **Translate articles with DeepL** GitHub Actions workflow runs after Pages CMS
saves published article content to `main`. It generates missing or outdated
Spanish, French, German, Dutch and Hungarian translations, validates their HTML,
and commits the translation JSON files. Cloudflare's existing GitHub integration
then builds and publishes that commit. No DeepL key or request is sent to readers.

### One-time activation

1. Create a **DeepL API** account/key (API Free or API Pro; a normal Translator
   subscription alone does not provide this integration):
   https://www.deepl.com/en/your-account/keys
2. In https://github.com/yanngrechez/deadline-journal2/settings/secrets/actions,
   add a repository secret named **DEEPL_API_KEY** with the complete key.
3. Open **Actions → Translate articles with DeepL → Run workflow**, leave the
   connection check enabled, and run it on `main`. This translates one short test
   sentence into each language, checks the returned HTML, and updates any missing
   translations. The check uses a small amount of the API character allowance.
4. Confirm the workflow succeeds. If it saves article translations, also confirm
   the Cloudflare Workers Builds check on its generated commit succeeds.

The key suffix chooses DeepL's Free (`api-free.deepl.com`) or Pro
(`api.deepl.com`) endpoint automatically. Do not put the key in article fields,
browser JavaScript, Cloudflare public variables, or repository files.

### What is translated and preserved

- Headlines, subtitles, article body, text sections, section headings, image alt
  descriptions and captions are translated using DeepL's HTML handling and
  preferred quality model. Article context accompanies the requests.
- Sources are never sent to DeepL. Author names, URLs, image paths and separate
  photo-credit fields stay unchanged. Existing translated interface text remains
  in the shared language catalog.
- Current saved translations, including earlier editorial/AI translations, are
  retained. DeepL replaces them when their English article content changes; it
  does not automatically retranslate the existing archive just to change provider.
- Whitespace-only edits, new citations, publication dates, cover placement and
  author metadata do not cause new requests. An article-text revision refreshes
  that article in each affected language. Drafts are not sent to DeepL.
- Validated translations are cached in Git, so ordinary builds and reader visits
  consume no translation quota. `provider: "deepl"` identifies new API output.

### Publishing and failures

The English CMS save and translated commit are separate deployments. English may
publish first; the updated translations follow when the workflow and Cloudflare
finish. During that interval the existing availability notice identifies any
translation that is not yet current. No stale article is presented as up to date.

Missing credentials, quota exhaustion, invalid responses or broken formatting
fail the workflow visibly. They do not deploy unvalidated translations or prevent
English publishing. Check the failed **Actions** run, resolve its reported issue,
then use **Re-run jobs**. Failed runs retain completed translation files as a
seven-day artifact for recovery; these files are not automatically published.
Rate-limit/server errors receive bounded retries. Ambiguous connection timeouts
are not automatically retried to avoid duplicate billing.

The workflow serializes translation jobs and never force-pushes. If another CMS
save reaches `main` during translation, the first push can be rejected; the queued
run reads the latest content and regenerates against that source. A failed run
can require retranslating work that was not committed. Set spending limits in
DeepL and monitor the account usage reported in the workflow log.

### Local commands

`npm run translate:check` reports missing/outdated translations without a key,
API calls, or file writes. `npm run translate` refreshes them when DEEPL_API_KEY
is present in the local process environment. The script does not read `.env`
automatically. `npm run translate -- --verify` also tests the live API connection.
`npm test` includes mocked API tests; these do not incur charges or require secrets.

Reference: https://developers.deepl.com/docs/translate/translating-html

## Email updates

See [NEWSLETTER.md](NEWSLETTER.md) for the bell signup, publication feed, edition
and announcement editor, provider setup, and delivery verification. Signup is
disabled until an email account is connected and tested.
