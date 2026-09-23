'use strict';

// Render the journal's existing page components into the build output. Browser
// enhancements can hydrate this markup without hiding content from HTML readers.
const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g,
  character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
const topicNames = {politics:'Politics', economics:'Economics', history:'History', philosophy:'Philosophy'};
const regionLabels = {
  Europe:'EUROPE', Americas:'AMERICAS', 'Middle East & North Africa':'MENA',
  'Sub-Saharan Africa':'SUB-SAHARAN AFRICA', 'Asia-Pacific':'ASIA-PACIFIC', Actors:'ACTORS'
};
const countryAliases = {
  usa:'US', unitedstatesofamerica:'US', uk:'GB', greatbritain:'GB', russia:'RU', southkorea:'KR', northkorea:'KP',
  ivorycoast:'CI', czechia:'CZ', democraticrepublicofthecongo:'CD', drc:'CD', congokinshasa:'CD', congobrazzaville:'CG',
  palestinianterritories:'PS', easttimor:'TL', capeverde:'CV', vatican:'VA', macedonia:'MK', burma:'MM', turkey:'TR', turkiye:'TR'
};
const normalizeCountryName = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
const timestamp = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const newestFirst = (a, b) => timestamp(b.published_at) - timestamp(a.published_at);
function imageSource(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const source = new URL(value, 'https://deadlinejournal.org');
    if (source.protocol !== 'https:' && !(source.protocol === 'http:' && source.hostname === 'deadlinejournal.org')) return '';
    return value;
  } catch { return ''; }
}
function defaultImage(src, options = {}) {
  if (!imageSource(src)) return '';
  return `<img src="${escapeHtml(src)}" alt="${escapeHtml(options.alt || '')}" decoding="async"${options.priority ? ' fetchpriority="high"' : ''}${options.lazy ? ' loading="lazy"' : ''}>`;
}
function createRenderer({articles = [], countries = [], routes, image = defaultImage, authorUrl} = {}) {
  const byCode = new Map(countries.map(country => [String(country.code).toUpperCase(), country]));
  const byName = new Map(countries.map(country => [normalizeCountryName(country.name), country]));
  const countryForArticle = article => byCode.get(String(article.country_code || '').toUpperCase()) ||
    byCode.get(countryAliases[normalizeCountryName(article.country)]) || byName.get(normalizeCountryName(article.country));
  const articleRegion = article => article.region === 'Actors' ? 'Actors' : countryForArticle(article)?.region || article.region;
  const articleUrl = article => routes ? routes.articleUrl(article) : '/' + encodeURIComponent(article.slug);
  const regionUrl = name => routes ? routes.regionUrl(name) : '/' + ({Europe:'europe', Americas:'americas', 'Middle East & North Africa':'middle-east-north-africa', 'Sub-Saharan Africa':'sub-saharan-africa', 'Asia-Pacific':'asia-pacific', Actors:'actors'}[name] || '');
  const countryUrl = country => routes ? routes.countryUrl(country) : '/' + country.slug;
  const realArticlesForCountry = country => articles.filter(article => !article.is_placeholder && countryForArticle(article)?.code === country.code);
  const renderImage = (src, options = {}, className = '') => {
    if (!imageSource(src)) return '';
    const markup = image(src, options);
    return className ? markup.replace(/<img\b/, `<img class="${escapeHtml(className)}"`) : markup;
  };
  const topicMeta = (article, withLeadingSeparator = false) => {
    const topics = [...new Set((Array.isArray(article.topics) ? article.topics : []).map(value => String(value).toLowerCase()).filter(topic => Object.hasOwn(topicNames, topic)))];
    return topics.map((topic, index) => `${index || withLeadingSeparator ? '<span class="topic-separator"> · </span>' : ''}<span class="topic-label topic-${topic}">${topicNames[topic]}</span>`).join('');
  };
  const articleMeta = (article, linkCountry = false) => {
    const country = article.region === 'Actors' ? null : countryForArticle(article);
    const label = escapeHtml(country ? country.name.toUpperCase() : article.country);
    const markup = country && linkCountry
      ? `<a class="country-label country-transition-link" href="${escapeHtml(countryUrl(country))}" aria-label="View ${escapeHtml(country.name)} stories">${label}</a>`
      : `<span class="country-label">${label}</span>`;
    return markup + topicMeta(article, true);
  };
  const heroImage = (article, options = {}) => renderImage(article.hero_image, {alt:article.hero_alt || article.hero_caption || '', ...options});
  const caption = (explanation, credit) => explanation || credit
    ? `<figcaption>${explanation ? `<span>${escapeHtml(explanation)}</span>` : ''}${credit ? `<cite>${escapeHtml(credit)}</cite>` : ''}</figcaption>` : '';
  const sections = article => (Array.isArray(article.sections) ? article.sections : []).map(section => {
    if (!section || typeof section !== 'object') return '';
    if (section.type === 'text' && typeof section.body === 'string') return section.body;
    if (section.type !== 'image' || !imageSource(section.image)) return '';
    return `<figure class="article-inline-image">${renderImage(section.image, {alt:section.alt || '', lazy:true, sizes:'(max-width: 700px) calc(100vw - 36px), 660px'})}${caption(section.caption, section.credit)}</figure>`;
  }).join('');
  const sources = article => {
    if (typeof article.sources !== 'string' || !article.sources.replace(/<[^>]*>/g, '').replace(/&(?:nbsp|#160|#x0*a0);/gi, '').replace(/[\s\u200b]/g, '')) return '';
    return `<details class="article-sources"><summary>SOURCES <span class="sources-symbol" aria-hidden="true"></span></summary><div class="article-sources-content" translate="no">${article.sources}</div></details>`;
  };
  const cards = items => items.map(article => `<a class="region-card" href="${escapeHtml(articleUrl(article))}">${heroImage(article, {lazy:true, sizes:'(max-width: 700px) calc(100vw - 36px), (max-width: 1000px) 45vw, 30vw'})}<div class="kicker">${articleMeta(article)}</div><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.dek)}</p><div class="byline">${escapeHtml(article.author)}</div></a>`).join('');

  function home() {
    const byDate = [...articles].sort(newestFirst);
    const {hero,secondary,mids,rails}=require('./cover.js').select(articles);
    const heroColumn = hero ? `<article class="hero"><a href="${escapeHtml(articleUrl(hero))}">${heroImage(hero, {alt:hero.hero_alt || hero.hero_caption || hero.title, priority:true, sizes:'(max-width: 700px) calc(100vw - 36px), 48vw'})}</a><div class="kicker" style="text-align:center">${articleMeta(hero)}</div><a href="${escapeHtml(articleUrl(hero))}"><h2 class="headline">${escapeHtml(hero.title)}</h2></a><p class="dek">${escapeHtml(hero.dek)}</p><div class="byline">${escapeHtml(hero.author)}</div></article>` + (secondary ? `<a class="small-horizontal" href="${escapeHtml(articleUrl(secondary))}">${heroImage(secondary, {lazy:true, sizes:'(max-width: 700px) 35vw, 180px'})}<div><div class="kicker">${articleMeta(secondary)}</div><h3 class="headline">${escapeHtml(secondary.title)}</h3><p>${escapeHtml(secondary.dek)}</p><div class="byline">${escapeHtml(secondary.author)}</div></div></a>` : '') : '';
    const middleColumn = mids.map(article => `<article class="medium-story"><a href="${escapeHtml(articleUrl(article))}">${heroImage(article, {alt:article.hero_alt || article.hero_caption || article.title, lazy:true, sizes:'(max-width: 700px) calc(100vw - 36px), 24vw'})}</a><div class="kicker">${articleMeta(article)}</div><a href="${escapeHtml(articleUrl(article))}"><h3 class="headline">${escapeHtml(article.title)}</h3></a><p class="dek">${escapeHtml(article.dek)}</p><div class="byline">${escapeHtml(article.author)}</div></article>`).join('');
    const railColumn = rails.map(article => `<a class="rail-story" href="${escapeHtml(articleUrl(article))}"><h3 class="headline">${escapeHtml(article.title)}</h3><div class="meta">${articleMeta(article)} | ${escapeHtml(article.author)}</div></a>`).join('');
    const regionGrid = Object.entries(regionLabels).map(([name, label]) => {
      const items = byDate.filter(article => articleRegion(article) === name);
      const link = `<a class="region-label" href="${escapeHtml(regionUrl(name))}">${label}</a>`;
      if (!items.length) return `<div class="region-col">${link}<div class="mini">No published stories yet.</div></div>`;
      const [feature, ...rest] = items;
      return `<div class="region-col">${link}<a href="${escapeHtml(articleUrl(feature))}">${heroImage(feature, {alt:feature.hero_alt || feature.hero_caption || feature.title, lazy:true, sizes:'(max-width: 700px) 45vw, 16vw'})}</a><a href="${escapeHtml(articleUrl(feature))}"><h3 class="feature-title">${escapeHtml(feature.title)}</h3></a><div class="byline">${topicMeta(feature)} | ${escapeHtml(feature.author)}</div>${rest.slice(0, 4).map(item => `<a class="mini" href="${escapeHtml(articleUrl(item))}">${escapeHtml(item.title)}</a>`).join('')}</div>`;
    }).join('');
    return {heroColumn, middleColumn, railColumn, regionGrid};
  }
  function article(value) {
    if (!value) return '<h1>Article not found</h1><p>This article may be a draft or may have been removed.</p>';
    const authorLink = typeof authorUrl === 'function' ? authorUrl(value.author) : null;
    const byline = authorLink ? `<a href="${escapeHtml(authorLink)}">${escapeHtml(value.author)}</a>` : escapeHtml(value.author);
    const published = new Date(value.published_at);
    const validDate = value.published_at && Number.isFinite(published.getTime());
    const date = validDate ? `<time datetime="${escapeHtml(String(value.published_at).slice(0,10))}">${escapeHtml(published.toLocaleDateString('en-GB', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'}))}</time>` : '';
    return `<div class="article-kicker">${articleMeta(value, true)}</div><h1>${escapeHtml(value.title)}</h1><div class="article-dek">${escapeHtml(value.dek)}</div><div class="article-meta">${byline} &nbsp; · &nbsp; ${date} &nbsp; · &nbsp; DEADLINE JOURNAL</div><figure class="article-hero">${heroImage(value, {priority:true, sizes:'(max-width: 860px) calc(100vw - 36px), 820px'})}${caption(value.hero_caption, value.hero_credit)}</figure><div class="body">${typeof value.body === 'string' ? value.body : ''}${sections(value)}</div>${sources(value)}`;
  }
  function region(name) {
    const items = articles.filter(article => articleRegion(article) === name).sort(newestFirst);
    const directory = countries.filter(country => country.region === name).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    return {
      regionName:escapeHtml(name),
      deskLabel:name === 'Actors' ? 'GLOBAL ACTORS' : 'REGIONAL DESK',
      regionList:items.length ? cards(items) : '<p style="padding:30px 0">No published stories in this region yet.</p>',
      countryDirectory:directory.map(country => {
        const count = realArticlesForCountry(country).length;
        return `<a class="country-directory-link ${count ? 'has-stories' : ''}" href="${escapeHtml(countryUrl(country))}"><span><strong>${escapeHtml(country.name)}</strong><small>${count ? `${count} ${count === 1 ? 'story' : 'stories'}` : 'No stories yet'}</small></span>${renderImage(country.flag, {alt:country.name + ' flag', lazy:true, sizes:'30px'}, 'country-flag')}</a>`;
      }).join(''),
      hideCountryDirectory:name === 'Actors'
    };
  }
  function country(value) {
    if (!value) return '<section class="container country-empty"><div class="kicker">COUNTRY DESK</div><h1>Country not found</h1><a class="country-back" href="/#latest">Return to the world map</a></section>';
    const stories = realArticlesForCountry(value).sort(newestFirst);
    const heading = `<section class="country-page-head container"><div><div class="kicker">COUNTRY DESK · <a href="${escapeHtml(regionUrl(value.region))}">${escapeHtml(value.region)}</a></div><h1>${escapeHtml(value.name)}</h1></div>${renderImage(value.flag, {alt:value.name + ' flag', sizes:'96px'}, 'country-page-flag')}</section>`;
    if (!stories.length) return heading + '<section class="container country-empty"><p>No stories yet.</p><a class="cta" href="/write">Know this place? Write for Deadline</a></section>';
    return heading + `<section class="container country-stories"><div class="country-stories-head">${stories.length} ${stories.length === 1 ? 'story' : 'stories'} from ${escapeHtml(value.name)}</div>${stories.map(article => `<a class="country-story-card" href="${escapeHtml(articleUrl(article))}">${heroImage(article, {lazy:true, sizes:'(max-width: 700px) calc(100vw - 36px), 360px'})}<div><div class="kicker">${topicMeta(article)}</div><h2>${escapeHtml(article.title)}</h2><p>${escapeHtml(article.dek)}</p><div class="byline">${escapeHtml(article.author)}</div></div></a>`).join('')}</section>`;
  }
  return {home, article, region, country};
}

module.exports = {createRenderer};
