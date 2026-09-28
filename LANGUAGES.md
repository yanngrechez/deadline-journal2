# Journal translations

English is the original language. All ten currently published articles have complete assistant-generated Spanish, French, German, Dutch (Netherlands), and Hungarian translations. No external translation API or DeepL connection is used.

Reviewed article translations live in `content/translations/<language>/<slug>.json`. Each file preserves the original paragraph and section structure, images, links, and credit names. Sources remain in their original language. The existing language selector applies the saved choice across the journal without changing canonical URLs or analytics metadata.

`build-translations.cjs` validates translation structure and compares `sourceHash` against the article's title, dek, body, sections, and image descriptions. `build.js` generates a shared headline catalog and a separate translation bundle for each article; readers only download the body translations for the article they open.

New or edited articles are not automatically translated. Missing or outdated translations fall back to the current English article with a localized notice. Publishing through Pages CMS continues normally. To update translations, translate the current source, review terminology and completeness, and set its source hash using `sourceHash` exported by `build-translations.cjs`. Never refresh a hash without reviewing the actual source changes.

`node --test tests/translations.test.cjs` verifies complete coverage of the current published collection, stale-source handling, and preservation of formatting and links. The build exposes `translation-coverage.json` for deployment verification. Translations are AI-generated and may still contain errors; the selector retains the requested disclosure.
