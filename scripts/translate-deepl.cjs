'use strict';
// Runs only in Node/GitHub Actions. The API key never enters the public build.
const fs = require('node:fs');
const path = require('node:path');
const {sourceHash, contentHash, checkHTML, blocks, locales} = require('../build-translations.cjs');
const targets = {es:'ES', fr:'FR', de:'DE', nl:'NL', hu:'HU'};
const articleFields = ['title', 'dek', 'body', 'hero_alt', 'hero_caption'];
const sectionFields = ['body', 'heading', 'title', 'alt', 'caption'];

function readArticles(root) {
  return fs.readdirSync(path.join(root, 'content/articles')).filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(root, 'content/articles', f), 'utf8')))
    .filter(a => a.status === 'published').map(a => {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug) || a.slug.length > 120) throw Error('Invalid article slug');
      return a;
    });
}

function entries(article) {
  const result = articleFields.filter(k => article[k]?.trim()).map(key => ({keys:[key], text:article[key]}));
  (article.sections || []).forEach((section, index) => {
    for (const key of sectionFields) if (section[key]?.trim()) result.push({keys:['sections', index, key], text:section[key]});
  });
  return result;
}

function valid(article, translation, locale) {
  if (!translation || translation.slug !== article.slug || translation.language !== locale) return false;
  if (translation.sourceHash !== sourceHash(article) && translation.contentHash !== contentHash(article)) return false;
  try {
    if ((article.sections || []).length !== (translation.sections || []).length) return false;
    for (const entry of entries(article)) {
      const value = entry.keys.reduce((value, key) => value?.[key], translation);
      if (typeof value !== 'string' || !value.trim()) return false;
      checkHTML(entry.text, value, entry.keys.join('.'));
      if (blocks(entry.text).length !== blocks(value).length) return false;
    }
    for (let i = 0; i < (article.sections || []).length; i++) {
      for (const key of ['type','image','credit']) {
        if (JSON.stringify(article.sections[i][key]) !== JSON.stringify(translation.sections[i][key])) return false;
      }
    }
    return true;
  } catch { return false; }
}

function jobsFor(root, articles) {
  const jobs = [];
  for (const article of articles) for (const locale of locales) {
    const file = path.join(root, 'content/translations', locale, article.slug + '.json');
    let saved;
    if (fs.existsSync(file)) saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!valid(article, saved, locale)) jobs.push({article, locale, file});
  }
  return jobs;
}

function client({key, fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms))}) {
  if (!key?.trim()) throw Error('Add the DEEPL_API_KEY repository secret in GitHub Actions settings.');
  const host = key.trim().endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  async function request(endpoint, body) {
    for (let attempt = 0; attempt < 4; attempt++) {
      let response;
      try {
        response = await fetchImpl(host + endpoint, {
          method:body ? 'POST' : 'GET',
          headers:{Authorization:'DeepL-Auth-Key ' + key.trim(), 'Content-Type':'application/json'},
          ...(body ? {body:JSON.stringify(body)} : {}),
          signal:AbortSignal.timeout(45000)
        });
      } catch {
        // Do not retry ambiguous network failures: the request may already have been billed.
        throw Error('DeepL connection failed or timed out. Rerun the workflow when the connection is restored.');
      }
      if (response.ok) return response.json();
      if (response.status === 403) throw Error('DeepL rejected the API key. Check the DEEPL_API_KEY secret and API subscription.');
      if (response.status === 456) throw Error('DeepL character quota or spending limit reached. Increase the limit or wait for renewal, then rerun.');
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      // Never include a raw response/request: it could contain private account details or the key.
      throw Error(`DeepL returned HTTP ${response.status}. No unvalidated translation was saved.`);
    }
  }
  return {
    usage:() => request('/v2/usage'),
    async translate(text, locale, context) {
      const body = {text, source_lang:'EN', target_lang:targets[locale], context,
        tag_handling:'html', tag_handling_version:'v2', preserve_formatting:true,
        model_type:'prefer_quality_optimized'};
      if (!targets[locale]) throw Error('Unsupported translation language');
      if (Buffer.byteLength(JSON.stringify(body)) > 120 * 1024) throw Error('DeepL request exceeds the safe size limit. Split the article into shorter sections in Pages CMS.');
      const data = await request('/v2/translate', body);
      if (!Array.isArray(data.translations) || data.translations.length !== text.length ||
          data.translations.some(t => typeof t.text !== 'string' || !t.text.trim())) throw Error('DeepL returned incomplete translations.');
      return data.translations.map(t => t.text);
    }
  };
}

async function translateArticle(article, locale, api) {
  // Explicit allowlist excludes Sources, author names, image files, credits and routing metadata.
  const result = {slug:article.slug, language:locale, sourceHash:sourceHash(article), contentHash:contentHash(article),
    provider:'deepl', translatedAt:new Date().toISOString(), sections:structuredClone(article.sections || [])};
  for (const key of articleFields) if (article[key] !== undefined) result[key] = article[key];
  const context = [article.title, article.dek, article.body, ...(article.sections || []).map(s => s.body || '')]
    .filter(Boolean).join('\n').replace(/<[^>]*>/g, ' ').slice(0, 16000);
  // Deduplicate captions repeated as alt text. Complete sections keep paragraph context together.
  const fields = entries(article), unique = [...new Set(fields.map(e => e.text))], translated = new Map();
  let batch = [], size = 0;
  async function flush() {
    if (!batch.length) return;
    const values = await api.translate(batch, locale, context);
    batch.forEach((text, i) => {
      checkHTML(text, values[i], article.slug + '/' + locale);
      if (blocks(text).length !== blocks(values[i]).length) throw Error('DeepL changed paragraph structure: ' + article.slug + '/' + locale);
      translated.set(text, values[i]);
    });
    batch = []; size = 0;
  }
  for (const text of unique) {
    const bytes = Buffer.byteLength(JSON.stringify(text));
    if (batch.length >= 40 || size + bytes > 48000) await flush();
    batch.push(text); size += bytes;
  }
  await flush();
  for (const {keys, text} of fields) {
    const parent = keys.slice(0, -1).reduce((value, key) => value[key], result);
    parent[keys.at(-1)] = translated.get(text);
  }
  if (!valid(article, result, locale)) throw Error('DeepL translation did not pass validation: ' + article.slug + '/' + locale);
  return result;
}

async function run({root = path.resolve(__dirname, '..'), key = process.env.DEEPL_API_KEY,
  dryRun = false, verify = false, api, log = console.log} = {}) {
  const jobs = jobsFor(root, readArticles(root));
  const estimatedCharacters = jobs.reduce((sum, {article}) => sum + [...new Set(entries(article).map(e => e.text))].reduce((n, s) => n + [...s].length, 0), 0);
  log(`${jobs.length} article/language translations need updating; at most approximately ${estimatedCharacters} source characters (including HTML).`);
  if (dryRun) return {jobs:jobs.length, estimatedCharacters, written:0};
  if (!jobs.length && !verify) { log('All published translations are current. No DeepL calls needed.'); return {jobs:0, written:0}; }
  api ||= client({key});
  const usage = await api.usage();
  if (typeof usage.character_count === 'number' && typeof usage.character_limit === 'number') {
    log(`DeepL account usage: ${usage.character_count} of ${usage.character_limit} characters.`);
  }
  if (verify) for (const locale of locales) {
    const sample = '<p>Read independent reporting from <strong>local writers</strong>.</p>';
    const [output] = await api.translate([sample], locale, 'An international student-led journal.');
    checkHTML(sample, output, 'Connection check/' + locale);
    if (output === sample) throw Error('DeepL connection check returned untranslated text: ' + locale);
    log(`DeepL connection and HTML handling verified: ${locale}`);
  }
  // Each complete language file is saved atomically. Never replace a file with a partial response.
  let written = 0;
  for (const {article, locale, file} of jobs) {
    const result = await translateArticle(article, locale, api);
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file + '.tmp', JSON.stringify(result, null, 2) + '\n');
    fs.renameSync(file + '.tmp', file);
    written++;
    log(`Translated and validated ${article.slug}/${locale}`);
  }
  return {jobs:jobs.length, estimatedCharacters, written};
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--dry-run','--verify'].includes(arg))) { console.error('Use --dry-run or --verify.'); process.exitCode = 1; }
  else run({dryRun:args.includes('--dry-run'), verify:args.includes('--verify')}).catch(error => {console.error(error.message); process.exitCode = 1;});
}
module.exports = {client, entries, jobsFor, readArticles, run, translateArticle, valid};
