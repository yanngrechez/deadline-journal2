const fs=require('fs');
const path=require('path');
const routes=require('./routes.js');
const countries=require('./countries-data.js');
const seo=require('./seo.cjs');
const {createRenderer}=require('./static-render.cjs');
const {prepareImages}=require('./build-images.cjs');
const crypto=require('node:crypto');
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
    return {...rest,country:String(article.country||'').toUpperCase(),topics:topics.length?topics:['politics'],homepage_position:require('./cover.js').positions.includes(article.homepage_position)?article.homepage_position:'column-stories'};
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
    const clean=route.kind==='article'&&seen.has(route.slug)?routes.articleUrl(route.slug):route.kind==='region'&&route.name?routes.regionUrl(route.name):route.kind==='country'&&route.code?routes.countryUrl(route.code):null;
    if(!clean)return match;
    url.searchParams.delete('slug');url.searchParams.delete('region');url.searchParams.delete('country');
    return `href=${quote}${clean}${url.search}${url.hash}${quote}`;
  });
}
articles.forEach(article=>{
  if(article.body)article.body=cleanContentLinks(article.body);
  if(article.sources)article.sources=cleanContentLinks(article.sources);
  if(Array.isArray(article.sections))article.sections.forEach(section=>{
    if(section?.type==='text'&&section.body)section.body=cleanContentLinks(section.body);
  });
});

async function build(){
fs.rmSync(dist,{recursive:true,force:true});
fs.mkdirSync(dist,{recursive:true});
for(const name of ['cover.js','journal-language.js','journal-language.css','journal-language-data.js','styles.css','script.js','analytics.js','routes.js','transition-boot.js','countries-data.js','world-map-data.js','favicon.svg','googlef859bf9f1619f912.html'])
  fs.copyFileSync(path.join(root,name),path.join(dist,name));
for(const dir of ['assets','media'])fs.cpSync(path.join(root,dir),path.join(dist,dir),{recursive:true});
fs.cpSync(path.join(root,'node_modules/flag-icons/flags/4x3'),path.join(dist,'flags'),{recursive:true});

const escapeHtml=seo.escape;
// Resolve country membership once, for browsing, metadata and analytics alike.
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
const aliases={usa:'US',unitedstatesofamerica:'US',uk:'GB',greatbritain:'GB',russia:'RU',southkorea:'KR',northkorea:'KP',ivorycoast:'CI',czechia:'CZ',drc:'CD',drcongo:'CD',turkiye:'TR',turkey:'TR',easttimor:'TL',capeverde:'CV',vatican:'VA',macedonia:'MK',burma:'MM'};
function countryOf(a){return countries.find(c=>c.code===a.country_code||c.code===aliases[norm(a.country)]||norm(c.name)===norm(a.country)||c.code===a.country)}
articles.forEach(a=>{const country=countryOf(a);if(country&&a.region!=='Actors'){a.region=country.region;a.country_code=country.code}});
const real=articles.filter(a=>!a.is_placeholder);
const coveredCountries=countries.filter(c=>real.some(a=>a.region!=='Actors'&&countryOf(a)?.code===c.code));
const coveredRegions=Object.keys(routes.regions).filter(name=>real.some(a=>a.region===name));
const image=await prepareImages({root,dist,articles});
const render=createRenderer({articles,countries,routes,image});
const templates={};
for(const name of htmlFiles){
 let html=fs.readFileSync(path.join(root,name),'utf8')
  .replace('<html>','<html lang="en" data-prerendered>')
  .replace('</head>','<script defer src="/analytics.js"></script><link rel="stylesheet" href="/journal-language.css"><script defer src="/journal-language-data.js"></script><script defer src="/journal-language.js"></script></head>');
 if(name!=='index.html')html=html.replace('<h1 class="masthead">Deadline Journal</h1>','<div class="masthead">Deadline Journal</div>');
 html=html.replace('<body>','<body><a class="skip-link" href="#main-content">Skip to content</a>');
 if(!html.includes('<main id='))html=html.replace('<main','<main id="main-content" tabindex="-1"');
 else html=html.replace('href="#main-content"','href="#countryPage"').replace('<main id="countryPage"','<main tabindex="-1" id="countryPage"');
 html=html.replace('id="searchOverlay"','id="searchOverlay" role="dialog" aria-modal="true" aria-label="Search Deadline Journal"')
  .replace('id="searchInput"','id="searchInput" type="search" aria-label="Search articles"')
  .replace('class="close-search"','class="close-search" aria-label="Close search"');
 templates[name]=html;
}
function fill(html,id,content){
 const pattern=new RegExp('(<[a-z0-9]+[^>]*\\bid="'+id+'"[^>]*>)([\\s\\S]*?)(</[a-z0-9]+>)');
 if(!pattern.test(html))throw new Error('Missing template container '+id);
 return html.replace(pattern,(_,open,old,close)=>open+content+close);
}
function writeRoute(route,template,options){
 const html=seo.decorate(template,{route,...options});
 const file=route==='/'?path.join(dist,'index.html'):path.join(dist,route.slice(1),'index.html');
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);
}
let home=templates['index.html'];
for(const [id,markup] of Object.entries(render.home()))home=fill(home,id,markup);
home=fill(home,'mapTitle',`Voices from ${coveredCountries.length} ${coveredCountries.length===1?'country':'countries'}, and counting.`);
writeRoute('/',home,{title:'Deadline Journal',description:'Deadline Journal is a student-led international publication featuring political perspectives from young writers closest to the places they cover.'});
writeRoute('/about',templates['about.html'],{title:'About | Deadline Journal',type:'AboutPage',description:'Learn about Deadline Journal, a student-led publication sharing political perspectives from young writers with direct knowledge of their communities.'});
writeRoute('/write',templates['write.html'],{title:'Write for Us | Deadline Journal',description:'Tell us what the headlines are missing. Submit your article proposal to Deadline Journal and hear back within 48 hours.'});
for(const country of countries){
 const covered=coveredCountries.includes(country);
 writeRoute(routes.countryUrl(country),fill(templates['country.html'],'countryPage',render.country(country)),{title:country.name+' | Deadline Journal',description:covered?`Read reporting and political perspectives from ${country.name}, written by contributors with a direct connection to the country.`:`Deadline Journal's ${country.name} desk. No stories yet. Know this place? Submit your article proposal.`,index:covered,type:'CollectionPage'});
}
for(const article of articles)writeRoute(routes.articleUrl(article),fill(templates['article.html'],'articlePage',render.article(article)),{title:article.title+' | Deadline Journal',description:article.dek||seo.plain(article.body).slice(0,180),article,index:!article.is_placeholder});
for(const name of Object.keys(routes.regions)){
 const content=render.region(name);let html=templates['region.html'];
 for(const id of ['regionName','deskLabel','regionList','countryDirectory'])html=fill(html,id,content[id]);
 if(content.hideCountryDirectory)html=html.replace('id="countryDirectorySection"','id="countryDirectorySection" hidden');
 writeRoute(routes.regionUrl(name),html,{title:name+' | Deadline Journal',description:name==='Actors'?'Explore Deadline Journal articles on international institutions, organizations and other actors shaping global politics.':`Explore Deadline Journal reporting on ${name}: local political perspectives, history and economics from young contributors connected to the region.`,index:coveredRegions.includes(name),type:'CollectionPage'});
}
// Old URLs are handled by the Worker, never indexed as duplicate entry points.
for(const name of ['article.html','region.html','country.html'])fs.writeFileSync(path.join(dist,name),templates[name].replace(' data-prerendered','').replace('</head>','<meta name="robots" content="noindex,follow,max-image-preview:none"></head>'));
// Interactions/search/analytics need article metadata, not every story's full text.
const summaries=articles.map(({body,sections,sources,...metadata})=>metadata);
fs.writeFileSync(path.join(dist,'data.js'),'window.DEADLINE_ARTICLES='+JSON.stringify(summaries)+';\n');
fs.writeFileSync(path.join(dist,'404.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | Deadline Journal</title><link rel="stylesheet" href="/styles.css"><link rel="icon" href="/favicon.svg"><meta name="robots" content="noindex,max-image-preview:none"></head><body><main class="container section"><h1 class="headline">Page not found</h1><p>This page may have moved or is not published.</p><a class="cta" href="/">Return to Deadline Journal</a></main></body></html>');

// Content hashes avoid stale JS/CSS after CMS publishing and support long-lived caches.
const assets=new Map();
for(const name of fs.readdirSync(dist).filter(name=>/\.(?:js|css)$/.test(name))){
 const content=fs.readFileSync(path.join(dist,name));
 const hashed=name.replace(/(\.[^.]+)$/,'.'+crypto.createHash('sha256').update(content).digest('hex').slice(0,12)+'$1');
 fs.mkdirSync(path.join(dist,'static'),{recursive:true});fs.writeFileSync(path.join(dist,'static',hashed),content);assets.set(name,'/static/'+hashed);
}
function fingerprint(directory){for(const item of fs.readdirSync(directory,{withFileTypes:true})){
 const file=path.join(directory,item.name);
 if(item.isDirectory())fingerprint(file);
 else if(item.name.endsWith('.html')){let html=fs.readFileSync(file,'utf8');html=html.replace(/((?:src|href)=")\/([^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g,(match,start,name)=>assets.has(name)?start+assets.get(name)+'"':match);fs.writeFileSync(file,html)}
}}
fingerprint(dist);
fs.writeFileSync(path.join(dist,'_headers'),'/static/*\n  Cache-Control: public, max-age=31536000, immutable\n/responsive/*\n  Cache-Control: public, max-age=31536000, immutable\n');

// Keep the Worker entry outside public assets. The existing Workers Builds
// deploy command reads wrangler.jsonc and uploads dist as static assets.
const manifest=articles.map(({slug})=>({slug}));
fs.mkdirSync(path.join(root,'.cloudflare'),{recursive:true});
const workerRoutes=fs.readFileSync(path.join(root,'routes.js'),'utf8').replace("typeof module==='object'&&module.exports?require('./countries-data.js'):root.DEADLINE_COUNTRIES",'root.DEADLINE_COUNTRIES').replace("  if(typeof module==='object'&&module.exports)module.exports=routes;\n",'');
fs.writeFileSync(path.join(root,'.cloudflare/worker.mjs'),'globalThis.DEADLINE_COUNTRIES='+JSON.stringify(countries)+';\n'+workerRoutes+'\nconst publishedRoutes='+JSON.stringify(manifest)+';\n'+fs.readFileSync(path.join(root,'cloudflare-worker.js'),'utf8'));

// Only useful, indexable canonical pages belong in the sitemap. Coverage
// automatically makes a country/region eligible on the next CMS publish.
const entries=[...['/','/about','/write',...coveredRegions.map(routes.regionUrl),...coveredCountries.map(routes.countryUrl)].map(url=>({url})),...real.map(article=>({url:routes.articleUrl(article),date:seo.date(article.published_at)}))];
fs.writeFileSync(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+entries.map(({url,date})=>`  <url><loc>${baseUrl}${url}</loc>${date?`<lastmod>${date.slice(0,10)}</lastmod>`:''}</url>`).join('\n')+'\n</urlset>\n');
fs.writeFileSync(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
console.log(`Built ${articles.length} published articles; ${real.length} real stories, ${coveredCountries.length} covered countries and ${coveredRegions.length} covered regions eligible for indexing.`);
}
build().catch(error=>{console.error(error);process.exitCode=1});
