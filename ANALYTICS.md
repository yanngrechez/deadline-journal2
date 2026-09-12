# Deadline Journal analytics

PostHog project region: EU (`https://eu.posthog.com`). The public ingestion token is in `analytics.js`; no personal API key is stored in the website.

## Collection and reader choices

The build injects `analytics.js` into all six page templates. It runs only on `deadlinejournal.org` and `www.deadlinejournal.org`. Local previews, Cloudflare preview hostnames, and URLs carrying `preview` or `verify` are excluded.

Readers choose **Allow analytics** or **Decline**. PostHog is downloaded and initialized only after allowing analytics. **Analytics preferences** in the footer lets them change that choice. Browser Do Not Track and Global Privacy Control signals keep analytics off. The consent choice is saved locally; analytics identifiers are used only after consent. Session recordings, form/click autocapture, surveys, heatmaps and exception capture are disabled. We do not identify visitors by name or send proposal-form contents.

These are consented browser measurements, not a census: declined consent, blockers and browser restrictions reduce counts. Unique visitors represent browser identifiers, not verified individuals or cross-device identities. Tracking starts with installation; prior visits cannot be recovered.

## Events

| Event | Meaning | Extra properties |
| --- | --- | --- |
| `$pageview` | One view per document, after its metadata is rendered and consent permits capture | `page_type`, `page_path`, article metadata where relevant |
| `$pageleave` | PostHog's page departure event | Current page/article metadata |
| `article_read_progress` | Bottom of the viewport reached 25, 50, 75 or 100 percent of the article body | `percent`, `article_visit_id` |
| `article_engaged` | At least 30 seconds of estimated active reading on that visit | `active_seconds: 30`, `article_visit_id` |
| `article_read_time` | Additional active reading seconds since the previous report, sent when the tab hides or page leaves | `active_seconds`, `article_visit_id` |

Every article event includes `article_slug`, `article_title`, `article_author`, `article_region`, `article_country`, `article_country_code`, `article_topics` and `is_placeholder`. Missing article URLs have `article_found: false` on the pageview and never emit reading events. New articles use their Pages CMS metadata automatically.

`article_slug` is the stable identity. All articles share the `/article` pathname, so grouping only by pathname combines all stories. URLs are normalized (`.html` and extensionless forms are equivalent) and stripped of transition fragments and arbitrary query parameters. Routing keys and the five standard UTM parameters are retained.

Scroll depth is a measure of exposure, not proof of reading. Fast scrolling can cross all four thresholds. Active reading counts only while the article body is in view and the tab is visible, and pauses after 60 seconds without keyboard, pointer or scroll activity. It is an estimate, especially on mobile where a browser may be terminated before a final event can be delivered. Add `active_seconds` across `article_read_time` events; each is an increment, not a running total.

## Open your reports

1. In your EU PostHog project, open **Web Analytics**. Use a 7-day or 30-day range for overall visitors, views, sessions, referring channels, countries and device types.
2. In **Product Analytics → Insights → New insight → Trends**, choose `$pageview`, total count, and filter `page_type = article` and `is_placeholder = false`. Break down by `article_slug`, display as a table, and save it as **Article views** in a **Deadline Journal — Readership** dashboard.
3. Duplicate it, change the aggregation to unique users, and save as **Article readers**. Keep the same article and placeholder filters.
4. Add a trend using `article_engaged`, unique users, broken down by `article_slug`, filtered to `is_placeholder = false`: **Engaged readers (30 seconds)**.
5. Add a trend using `article_read_progress`, filter `percent = 100` and `is_placeholder = false`, unique users, broken down by `article_slug`: **Readers reaching the article end**.
6. Add `article_read_time`, sum of the `active_seconds` property, broken down by `article_slug`, filtered to `is_placeholder = false`: **Total active reading seconds**. For average active time per view, divide that sum by the article's pageviews over the same range. This includes views with no measured reading time.

Filter the dashboard by `article_slug = spain-populism` (or another story) to inspect that article. The article title remains available as a readable property. Leave placeholders excluded from editorial comparisons.

PostHog's standard bounce-rate calculation depends partly on autocaptured interactions. Because this integration deliberately disables general autocapture, use the explicit engagement and scroll-depth events for editorial decisions instead of relying on bounce rate alone.

## Attribute social traffic

Use tagged links in social posts and bios:

- Instagram: `https://deadlinejournal.org/?utm_source=instagram&utm_medium=social&utm_campaign=launch`
- TikTok: `https://deadlinejournal.org/?utm_source=tiktok&utm_medium=social&utm_campaign=launch`
- Article: `https://deadlinejournal.org/article?slug=spain-populism&utm_source=instagram&utm_medium=social&utm_campaign=spain_populism`

UTMs belong on external promotional links, not on links between pages of the journal. Untagged links from social apps can be reported as direct traffic when referrer information is absent.

## Verification and maintenance

After deployment, open a production URL without `preview` or `verify`, allow analytics, then check **Activity / live events** in PostHog for `$pageview`. Confirm its `article_slug` on an article. Decline in the footer to stop tracking your own browser afterward. A public ingestion token allows sending events; it cannot read dashboards or administer the project.

The code is deployed with the site. Dashboard creation and historical-data verification require an authenticated PostHog session; a website deployment does not itself create the dashboard above.

References: [JavaScript SDK](https://posthog.com/docs/libraries/js), [configuration](https://posthog.com/docs/libraries/js/config), [Web Analytics dashboard](https://posthog.com/docs/web-analytics/dashboard).
