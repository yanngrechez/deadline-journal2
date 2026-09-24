const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const root=path.resolve(__dirname,'..');const dist=path.join(root,'dist');const countries=require('../countries-data.js');const routes=require('../routes.js');
const articles=fs.readdirSync(path.join(root,'content/articles')).map(file=>JSON.parse(fs.readFileSync(path.join(root,'content/articles',file),'utf8'))).filter(a=>a.status==='published');
const html=route=>fs.readFileSync(path.join(dist,route==='/'?'index.html':route+'/index.html'),'utf8');
const graph=source=>JSON.parse(source.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
test('editorial content exists without JavaScript, with one H1 and accurate structured data',()=>{
 const home=html('/');assert(home.includes('id="heroColumn"><article'));assert(home.includes('id="regionGrid"><div'));assert(home.includes('fetchpriority="high"'));assert(home.includes('srcset='));
 for(const a of articles){const source=html(a.slug);assert(source.includes('<html lang="en" data-prerendered>'));assert.equal((source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').match(/<h1(?:\s|>)/g)||[]).length,1);assert(source.includes(a.body));assert(source.includes('max-image-preview:none'));assert.equal(/content="noindex/.test(source),!!a.is_placeholder);
  const data=graph(source).find(d=>d['@type']==='Article');assert.equal(!!data,!a.is_placeholder);if(data){assert.equal(data.author.name,a.author);assert.equal(data.headline,a.title);assert(!data.image);assert(data.datePublished)}
 }
});
test('thin archives are excluded while covered desks remain indexable; sources and verification survive',()=>{
 const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');const real=articles.filter(a=>!a.is_placeholder);
 for(const c of countries){const covered=real.some(a=>a.country_code===c.code||String(a.country).toLowerCase()===c.name.toLowerCase());const source=html(c.slug);assert.equal(/content="noindex/.test(source),!covered,c.name);assert.equal(sitemap.includes('https://deadlinejournal.org/'+c.slug+'</loc>'),covered,c.name)}
 for(const [region,slug] of Object.entries(routes.regions)){assert.equal(/content="noindex/.test(html(slug)),!real.some(a=>a.region===region),region)}
 assert(fs.readFileSync(path.join(dist,'googlef859bf9f1619f912.html')).equals(fs.readFileSync(path.join(root,'googlef859bf9f1619f912.html'))));
 assert(html('/').includes('<title>Deadline Journal</title>'));assert(html('/').includes('name="google-site-verification"'));
 assert(html('europe').includes('href="/turkey"'));assert(!html('middle-east-north-africa').includes('href="/turkey"'));
});
test('canonical home and static paths permanently redirect with HTTPS',async()=>{
 const worker=(await import('data:text/javascript;base64,'+fs.readFileSync(path.join(root,'.cloudflare/worker.mjs')).toString('base64'))).default;
 const env={ASSETS:{fetch:async()=>new Response('ok')}};
 for(const [source,target] of [['http://deadlinejournal.org/','https://deadlinejournal.org/'],['http://deadlinejournal.org/index.html?utm_source=x','https://deadlinejournal.org/?utm_source=x'],['https://deadlinejournal.org/about.html','https://deadlinejournal.org/about'],['https://deadlinejournal.org/write/','https://deadlinejournal.org/write']]){const r=await worker.fetch(new Request(source),env);assert.equal(r.status,301);assert.equal(r.headers.get('location'),target);assert.equal((await worker.fetch(new Request(target),env)).status,200)}
 assert.equal((await worker.fetch(new Request('http://127.0.0.1:4181/'),env)).status,200);
});

test('modification metadata requires a genuine non-future editorial update',()=>{
 const seo=require('../seo.cjs');const now=new Date('2026-09-23T12:00:00Z');
 assert.equal(seo.modified({published_at:'2026-09-01'},now),undefined);
 assert.equal(seo.modified({published_at:'2026-09-01',updated_at:'2026-09-22T10:00'},now),'2026-09-22');
 for(const updated_at of ['nonsense','2026-09-28','2026-08-31'])assert.equal(seo.modified({published_at:'2026-09-01',updated_at},now),undefined);
 const article={title:'Example',author:'Writer',region:'Europe',topics:['politics'],published_at:'2020-01-01',updated_at:'2020-01-02'};
 const source=seo.decorate('<html><head><title>Old</title></head></html>',{route:'/example',title:'Example',article});
 assert.equal(graph(source).find(x=>x['@type']==='Article').dateModified,'2020-01-02');
});
test('all built pages have unique canonical metadata, crawlable links and valid hierarchy',()=>{
 const pages=['/', 'about','write',...articles.map(a=>a.slug),...countries.map(c=>c.slug),...Object.values(routes.regions)];
 const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
 for(const route of pages){
  const source=html(route);const markup=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  for(const pattern of [/<title>/g,/<link rel="canonical"/g,/<meta name="description"/g,/<meta name="robots"/g,/<h1(?:\s|>)/g])assert.equal((markup.match(pattern)||[]).length,1,route+' '+pattern);
  for(const match of markup.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[?#][^"]*)?"/g)){
   const target=decodeURIComponent(match[1]);assert(fs.existsSync(path.join(dist,target==='/'?'index.html':target)),route+' broken local link: '+target);
  }
  if(route!=='/'){
   const breadcrumb=graph(source).find(x=>x['@type']==='BreadcrumbList');assert(breadcrumb,route);
   breadcrumb.itemListElement.forEach((item,i)=>{assert.equal(item.position,i+1);assert(item.name);assert(fs.existsSync(path.join(dist,new URL(item.item).pathname)))});
   assert.equal(breadcrumb.itemListElement.at(-1).item,'https://deadlinejournal.org/'+route);
  }
 }
 for(const entry of sitemap.matchAll(/<url>(.*?)<\/url>/g)){
  const lastmod=entry[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1];
  if(lastmod)assert(lastmod<=new Date().toISOString().slice(0,10));
 }
});
