const fs = require('fs');
const path = require('path');

const root = __dirname;
const dist = path.join(root, 'dist');

fs.rmSync(dist, {recursive:true, force:true});
fs.mkdirSync(dist, {recursive:true});

const copyFile = (name) => fs.copyFileSync(path.join(root,name), path.join(dist,name));
['index.html','article.html','region.html','about.html','write.html','styles.css','script.js','favicon.svg','googlef859bf9f1619f912.html'].forEach(copyFile);

for (const dir of ['assets','media']) {
  fs.cpSync(path.join(root,dir), path.join(dist,dir), {recursive:true});
}

const articleDir = path.join(root,'content','articles');
const articles = fs.readdirSync(articleDir)
  .filter(f=>f.endsWith('.json'))
  .map(f=>JSON.parse(fs.readFileSync(path.join(articleDir,f),'utf8')))
  .filter(a=>a.status === 'published')
  .map(a=>{
    const allowedTopics = ['politics','economics','history','philosophy'];
    const sourceTopics = Array.isArray(a.topics) ? a.topics : (a.type ? ['politics'] : []);
    const topics = [...new Set(sourceTopics.map(topic=>String(topic).toLowerCase()).filter(topic=>allowedTopics.includes(topic)))];
    const {type, ...article} = a;
    return {
      ...article,
      country:String(a.country||'').toUpperCase(),
      topics:topics.length ? topics : ['politics'],
      homepage_rank:Number(a.homepage_rank||999)
    };
  })
  .sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0));

fs.writeFileSync(
  path.join(dist, 'data.js'),
  'window.DEADLINE_ARTICLES=' + JSON.stringify(articles) + ';\n'
);
const baseUrl = 'https://deadline-journal2.yanngrechez.workers.dev';

// Create sitemap entries for the main pages
const staticPages = [
  '/',
  '/about.html',
  '/write.html'
];

const staticEntries = staticPages.map(page => `
  <url>
    <loc>${baseUrl}${page}</loc>
  </url>
`).join('');

// Create sitemap entries automatically for every published article
const articleEntries = articles.map(article => `
  <url>
    <loc>${baseUrl}/article.html?slug=${encodeURIComponent(article.slug)}</loc>
    ${article.published_at ? `<lastmod>${new Date(article.published_at).toISOString().slice(0, 10)}</lastmod>` : ''}
  </url>
`).join('');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${articleEntries}
</urlset>`;

fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  sitemap
);

// Also tell search engines where the sitemap is
const robots = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

fs.writeFileSync(
  path.join(dist, 'robots.txt'),
  robots
);
console.log(`Built Deadline Journal with ${articles.length} published articles.`);
