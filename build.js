const fs=require('fs');
const path=require('path');
const routes=require('./routes.js');
const root=__dirname;
const dist=path.join(root,'dist');
const baseUrl='https://deadlinejournal.org';
const htmlFiles=['index.html','article.html','region.html','country.html','about.html','write.html'];
const articles=fs.readdirSync(path.join(root,'content/articles'))
  .filter(file=>file.endsWith('.json'))
  .map(file=>JSON.parse(fs.readFileSync(path.join(root,'content/articles',file),'utf8')))
  .filter(article=>article.status==='published')
  .map(article=>{
    const allowed=['politics','economics','history','philosophy'];
    const source=Array.isArray(article.topics)?article.topics:(article.type?['politics']:[]);
    const topics=[...new Set(source.map(topic=>String(topic).toLowerCase()).filter(topic=>allowed.includes(topic)))];
    const {type,...rest}=article;
    return {...rest,country:String(article.country||'').toUpperCase(),topics:topics.length?topics:['politics'],homepage_rank:Number(article.homepage_rank||999)};
  }).sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0));

// Validate before replacing output: a bad CMS slug must fail the build, not
// overwrite a region, public asset, or another article's directory.
const reserved=new Set([...routes.reserved,...fs.readdirSync(root).map(name=>name.split('.')[0])]);
const seen=new Set();
for(const article of articles){
  if(typeof article.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)||article.slug.length>120)
    throw new Error(`Invalid article slug: ${article.slug}. Use lowercase words separated by hyphens (maximum 120 characters).`);
  if(reserved.has(article.slug))throw new Error(`Reserved article slug: ${article.slug}. Choose a different slug in Pages CMS.`);
  if(seen.has(article.slug))throw new Error(`Duplicate published article slug: ${article.slug}.`);
  seen.add(article.slug);
}
function cleanContentLinks(html){
  return String(html||'').replace(/href=(['"])(.*?)\1/g,(match,quote,value)=>{
    let url;
    try{url=new URL(value,baseUrl)}catch(error){return match}
    if(url.origin!==baseUrl)return match;
    const route=routes.resolve(url,articles);
    const clean=route.kind==='article'&&seen.has(route.slug)?routes.articleUrl(route.slug):route.kind==='region'&&route.name?routes.regionUrl(route.name):null;
    if(!clean)return match;
    url.searchParams.delete('slug');url.searchParams.delete('region');
    return `href=${quote}${clean}${url.search}${url.hash}${quote}`;
  });
}
articles.forEach(article=>{
  if(article.body)article.body=cleanContentLinks(article.body);
  if(Array.isArray(article.sections))article.sections.forEach(section=>{
    if(section?.type==='text'&&section.body)section.body=cleanContentLinks(section.body);
  });
});

fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
for(const name of ['styles.css','script.js','analytics.js','routes.js','transition-boot.js','countries-data.js','world-map-data.js','favicon.svg','googlef859bf9f1619f912.html'])
  fs.copyFileSync(path.join(root,name),path.join(dist,name));
for(const dir of ['assets','media'])fs.cpSync(path.join(root,dir),path.join(dist,dir),{recursive:true});
fs.cpSync(path.join(root,'node_modules/flag-icons/flags/4x3'),path.join(dist,'flags'),{recursive:true});

const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function canonical(html,route){
  return html.replace(/<link\s+rel="canonical"[^>]*>/g,'').replace('</head>',`<link rel="canonical" href="${baseUrl}${route}"></head>`);
}
const templates={};
for(const name of htmlFiles){
  let html=fs.readFileSync(path.join(root,name),'utf8')
    .replaceAll('href="/styles.css"','href="/styles.css?v=11"')
    .replaceAll('src="/script.js"','src="/script.js?v=9"')
    .replaceAll('src="/countries-data.js"','src="/countries-data.js?v=2"')
    .replaceAll('src="/transition-boot.js?v=2"','src="/transition-boot.js?v=7"')
    .replace('</head>','<script defer src="/analytics.js?v=3"></script></head>');
  if(name==='about.html'||name==='write.html')html=canonical(html,'/'+name.replace('.html',''));
  templates[name]=html;
  // Legacy entry points are redirect-only on Cloudflare; don't index their shells.
  const output=/^(article|region)\.html$/.test(name)?html.replace('</head>','<meta name="robots" content="noindex"></head>'):html;
  fs.writeFileSync(path.join(dist,name),output);
}
function writeRoute(route,template,title,description){
  let html=canonical(template,route).replace(/<title>[^<]*<\/title>/,`<title>${escapeHtml(title)}</title>`);
  if(description)html=html.replace('</head>',`<meta name="description" content="${escapeHtml(description.replace(/<[^>]*>/g,''))}"></head>`);
  const directory=path.join(dist,route.slice(1));
  fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'index.html'),html);
}
for(const article of articles)writeRoute(routes.articleUrl(article),templates['article.html'],article.title+' | Deadline Journal',article.dek);
for(const name of Object.keys(routes.regions))writeRoute(routes.regionUrl(name),templates['region.html'],name+' | Deadline Journal');
fs.writeFileSync(path.join(dist,'data.js'),'window.DEADLINE_ARTICLES='+JSON.stringify(articles)+';\n');
fs.writeFileSync(path.join(dist,'404.html'),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | Deadline Journal</title><link rel="stylesheet" href="/styles.css?v=11"><link rel="icon" href="/favicon.svg"><meta name="robots" content="noindex"></head><body><main class="container section"><h1 class="headline">Page not found</h1><p>This page may have moved or is not published.</p><a class="cta" href="/">Return to Deadline Journal</a></main></body></html>');

// Keep the Worker entry outside public assets. The existing Workers Builds
// deploy command reads wrangler.jsonc and uploads dist as static assets.
const manifest=articles.map(({slug})=>({slug}));
fs.mkdirSync(path.join(root,'.cloudflare'),{recursive:true});
const workerRoutes=fs.readFileSync(path.join(root,'routes.js'),'utf8').replace("  if(typeof module==='object'&&module.exports)module.exports=routes;\n",'');
fs.writeFileSync(path.join(root,'.cloudflare/worker.mjs'),workerRoutes+'\nconst publishedRoutes='+JSON.stringify(manifest)+';\n'+fs.readFileSync(path.join(root,'cloudflare-worker.js'),'utf8'));

// Country URLs intentionally retain their existing query-based format. Keep
// this sitemap limited to clean canonical routes; countries remain linked on site.
const entries=[...['/','/about','/write',...Object.keys(routes.regions).map(routes.regionUrl)].map(url=>({url})),...articles.map(article=>({url:routes.articleUrl(article),date:article.published_at}))];
fs.writeFileSync(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+entries.map(({url,date})=>`  <url><loc>${baseUrl}${url}</loc>${date?`<lastmod>${new Date(date).toISOString().slice(0,10)}</lastmod>`:''}</url>`).join('\n')+'\n</urlset>\n');
fs.writeFileSync(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
console.log(`Built Deadline Journal with ${articles.length} published articles and ${Object.keys(routes.regions).length} clean region routes.`);
