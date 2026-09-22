# Deadline Journal SEO audit — September 2026

Implemented alongside the named front-cover positions. The visible editorial design, article copy, CMS publishing, analytics consent, Google verification, favicon and clean URLs are preserved.

## Crawlable content

The build now renders homepage stories, complete articles (including ordered images, captions and Sources), regional archives and country pages into the HTML. JavaScript enhances search, maps, languages, reading progress and transitions without replacing the editorial markup. Inner pages have one main heading and an English document language. A keyboard skip link and labelled search dialog improve navigation.

## Indexing policy

Real published articles are indexable. Template placeholders and country/region desks with no real coverage remain accessible but receive `noindex,follow,max-image-preview:none` and are excluded from the sitemap. A new real CMS article automatically enables its country and region at the next build. After syncing the latest CMS edits, the sitemap contains thirteen URLs: homepage, About, Write, Europe, Americas, Middle East & North Africa, Spain, Argentina, Lebanon and four non-placeholder articles.

Each page has a self-referencing HTTPS canonical, description and text-only Open Graph/Twitter metadata. The homepage title remains exactly **Deadline Journal**, alongside WebSite and Organization structured data. Real article pages include Article structured data with their actual title, author, publication date and publisher. Article photos are deliberately omitted from structured data and social image tags to preserve the publisher's no-search-thumbnail preference. Every generated page keeps `max-image-preview:none`.

Dates without a CMS timezone use date-only metadata. No build-date modification timestamps are invented. Search Console verification and the SVG favicon are copied unchanged.

## Redirects and delivery

The Worker permanently redirects production HTTP page requests to HTTPS, `/index.html` to `/`, and old article, region, country and static `.html` paths to their clean canonical routes. Campaign parameters are preserved. Unknown pages keep real 404 responses. Static images and fingerprinted assets bypass Worker execution.

Local CMS raster images receive responsive WebP derivatives, intrinsic dimensions and lazy loading, while lead images are loaded with high priority. Originals remain available in the CMS. Inline image space is reserved before lazy loading. CSS/JS and responsive image URLs include content hashes with immutable caching. The client article index contains metadata rather than downloading every full story and reference list on every page. Translation data no longer blocks initial HTML parsing.

## Editorial cover controls

Pages CMS now provides **Front cover position**: Main story, Bottom story, Side story up, Side story down, Column stories. Existing stories were migrated to their current slots. Column stories display newest first, four at a time. When a named slot has multiple assignments, the newest wins and older assignments return to the column pool. Empty slots use the newest remaining published stories; drafts never appear.

## Remaining editorial and account work

- Request reindexing of the homepage and real articles in Search Console and monitor indexing, queries and Core Web Vitals. Search appearance and rankings are controlled by Google and can take time to update.
- The UN article currently has Template placeholder enabled in Pages CMS, so it remains excluded from Google indexing until the editor turns that off. The Argentina and Lebanon articles have publication dates of September 28, 2026, later than this audit; the supplied dates and publication statuses have been preserved.
- Keep placeholder mode enabled for demonstrations. Turn it off only for actual published reporting. Useful reporting, descriptive headlines and source quality remain the main editorial priorities.
- Spanish/French currently translate the same URLs in the browser. They are reader features, not separately indexable editions. Complete translated HTML at separate language URLs is needed before adding valid hreflang; no fabricated language URLs were added.
- `www.deadlinejournal.org` did not resolve during the audit. The apex is canonical; supporting the optional www alias would require a Cloudflare DNS/custom-domain setup followed by a redirect.
- Field Core Web Vitals and Search Console coverage require real traffic/account data. Image and delivery improvements are verified technically, not claimed as a measured Google ranking or field-score increase.

## References

- [Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Robots directives and image permissions](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Multilingual sites](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [Cloudflare Worker asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/)
