const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const dist=path.join(root,'dist');
const routes=require('../routes.js');
const articles=JSON.parse(fs.readFileSync(path.join(dist,'data.js'),'utf8').replace(/^window.DEADLINE_ARTICLES=/,'').replace(/;\s*$/,''));
const origin='https://deadlinejournal.org';
const workerPromise=import('data:text/javascript;base64,'+fs.readFileSync(path.join(root,'.cloudflare/worker.mjs')).toString('base64')).then(module=>module.default);

test('all published articles and every region have clean canonical static pages',()=>{
  const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
  assert.equal(config.name,'deadline-journal2');
  assert.equal(config.main,'.cloudflare/worker.mjs');
  assert.equal(config.assets.binding,'ASSETS');
  assert.equal(config.assets.html_handling,'drop-trailing-slash');
  assert(config.assets.run_worker_first.includes('/*'));
  assert(!fs.readFileSync(path.join(root,'.cloudflare/worker.mjs'),'utf8').includes("require('./countries-data.js')"));
  assert(!fs.existsSync(path.join(dist,'_worker.js')),'server code must not be uploaded as a public asset');
  const expected=[...articles.map(routes.articleUrl),...Object.keys(routes.regions).map(routes.regionUrl),...require('../countries-data.js').map(routes.countryUrl)];
  for(const route of expected){
    const html=fs.readFileSync(path.join(dist,route,'index.html'),'utf8');
    assert(html.includes(`<link rel="canonical" href="${origin}${route}">`));
    assert(!html.includes('content="noindex"'));
    assert(/src="\/static\/analytics\.[a-f0-9]+\.js"/.test(html));
    assert(/src="\/static\/routes\.[a-f0-9]+\.js"/.test(html));
    assert(!/href="(?:article|region)(?:\.html)?\?/.test(html));
    assert(!/(?:href|src)="(?:styles|script|data|routes)\./.test(html));
  }
  const sitemap=fs.readFileSync(path.join(dist,'sitemap.xml'),'utf8');
  const urls=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
  for(const url of urls){const pathname=new URL(url).pathname;const html=fs.readFileSync(pathname==='/'?path.join(dist,'index.html'):path.join(dist,pathname,'index.html'),'utf8');assert(!/content="noindex/.test(html),url)}
  for(const a of articles)assert.equal(urls.includes(origin+routes.articleUrl(a)),!a.is_placeholder);
  assert(!urls.some(url=>url.includes('?')||url.includes('.html')));
  const home=fs.readFileSync(path.join(dist,'index.html'),'utf8');
  for(const text of ['<title>Deadline Journal</title>','name="google-site-verification"','content="max-image-preview:none"','property="og:site_name"','"@type": "WebSite"','href="https://deadlinejournal.org/"','href="/favicon.svg"','POLITICS FROM THE PEOPLE CLOSEST TO IT'])assert(home.includes(text));
  assert(fs.readFileSync(path.join(root,'favicon.svg')).equals(fs.readFileSync(path.join(dist,'favicon.svg'))));
});

test('legacy URLs permanently redirect once; clean paths serve static directory content',async()=>{
  const worker=await workerPromise;
  const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname)}};
  for(const article of articles){
    const target=routes.articleUrl(article);
    for(const source of [`/article?slug=${article.slug}`,`/article.html?slug=${article.slug}`,target+'/',target+'/index.html',target+'.html']){
      const response=await worker.fetch(new Request(origin+source),env);
      assert.equal(response.status,301,source);
      assert.equal(response.headers.get('location'),origin+target);
      const next=await worker.fetch(new Request(response.headers.get('location')),env);
      assert.equal(next.status,200);
      assert.equal(await next.text(),target);
    }
  }
  for(const [name,slug] of Object.entries(routes.regions)){
    for(const base of ['/region','/region.html']){
      const response=await worker.fetch(new Request(origin+base+'?region='+encodeURIComponent(name)+'&utm_source=instagram'),env);
      assert.equal(response.status,301);
      assert.equal(response.headers.get('location'),origin+'/'+slug+'?utm_source=instagram');
    }
    assert.deepEqual(routes.resolve(new URL(origin+'/'+slug)),{kind:'region',name});
  }
  for(const source of ['/article?slug=missing','/article.html?slug=../../about','/region?region=unknown']){
    assert.equal((await worker.fetch(new Request(origin+source),env)).status,404);
  }
  assert.equal((await worker.fetch(new Request(origin+'/country?country=ES'),env)).headers.get('location'),origin+'/spain');
  assert.equal(routes.resolve(new URL(origin+'/spain-populism'),articles).slug,'spain-populism');
});

test('new CMS articles generate automatically; draft, reserved, invalid and duplicate slugs stay safe',()=>{
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'deadline-routing-'));
  try{
    for(const name of ['seo.cjs','static-render.cjs','build-images.cjs','cover.js','journal-language.js','journal-language.css','journal-language-data.js','build.js','routes.js','cloudflare-worker.js','styles.css','script.js','analytics.js','transition-boot.js','countries-data.js','world-map-data.js','favicon.svg','googlef859bf9f1619f912.html','index.html','article.html','region.html','country.html','about.html','write.html'])fs.copyFileSync(path.join(root,name),path.join(fixture,name));
    for(const name of ['assets','media','node_modules'])fs.symlinkSync(path.join(root,name),path.join(fixture,name),'dir');
    fs.mkdirSync(path.join(fixture,'content/articles'),{recursive:true});
    const file=path.join(fixture,'content/articles/new.json');
    const write=article=>fs.writeFileSync(file,JSON.stringify(article));
    const article={...articles[0],is_placeholder:false,body:'<p>Original article content.</p>',slug:'future-cms-story',status:'published',sections:[
      {type:'image',image:'/media/sample.jpg',alt:'Sample photo',caption:'A caption',credit:'Photo source'},
      {type:'text',body:'<p>Continued reporting. <a href="/region.html?region=Europe">Europe</a></p>'},
      {type:'image',image:'/media/second.jpg',alt:'Second photo'}
    ]};
    const build=()=>execFileSync(process.execPath,[path.join(fixture,'build.js')],{stdio:'pipe'});
    write(article);build();
    assert(fs.existsSync(path.join(fixture,'dist/future-cms-story/index.html')));
    const generated=JSON.parse(fs.readFileSync(path.join(fixture,'dist/data.js'),'utf8').replace(/^window.DEADLINE_ARTICLES=/,'').replace(/;\s*$/,''))[0];
    assert(!Object.hasOwn(generated,'body'),'full text is rendered in HTML instead of downloaded for every search');
    const rendered=fs.readFileSync(path.join(fixture,'dist/future-cms-story/index.html'),'utf8');
    assert(rendered.includes(article.body));
    assert(rendered.includes('href="/europe"'));
    assert(rendered.includes('alt="Sample photo"'));
    assert(rendered.indexOf('A caption')<rendered.indexOf('Continued reporting.'));
    assert(rendered.indexOf('Continued reporting.')<rendered.indexOf('alt="Second photo"'));

    assert(fs.readFileSync(path.join(fixture,'.cloudflare/worker.mjs'),'utf8').includes('future-cms-story'));
    assert(fs.readFileSync(path.join(fixture,'dist/sitemap.xml'),'utf8').includes('/future-cms-story</loc>'));
    for(const slug of [...routes.reserved,'../escape','bad/slug','Bad-Slug','two--hyphens']){
      write({...article,slug});
      assert.throws(build,undefined,slug);
      assert(fs.existsSync(path.join(fixture,'dist/future-cms-story/index.html')),'failed build must not replace previous output');
    }
    write(article);
    fs.writeFileSync(path.join(fixture,'content/articles/duplicate.json'),JSON.stringify(article));
    assert.throws(build,/Duplicate published article slug/);
    fs.unlinkSync(path.join(fixture,'content/articles/duplicate.json'));
    write({...article,status:'draft'});build();
    assert(!fs.existsSync(path.join(fixture,'dist/future-cms-story')));
  }finally{fs.rmSync(fixture,{recursive:true,force:true})}
});

test('all country routes redirect legacy links, preserve campaigns and reject unknown countries',async()=>{
  const countries=require('../countries-data.js');
  const worker=await workerPromise;
  const env={ASSETS:{fetch:async request=>new Response(new URL(request.url).pathname)}};
  assert.equal(new Set(countries.map(c=>c.slug)).size,countries.length);
  for(const c of countries){
    const target=routes.countryUrl(c);
    assert.deepEqual(routes.resolve(new URL(origin+target)),{kind:'country',code:c.code});
    assert(routes.reserved.includes(c.slug));
    for(const old of ['/country','/country.html','/country/','/country.html/']){
      const response=await worker.fetch(new Request(origin+old+'?country='+c.code.toLowerCase()+'&utm_source=test'),env);
      assert.equal(response.status,301);
      assert.equal(response.headers.get('location'),origin+target+'?utm_source=test');
    }
    assert.equal((await worker.fetch(new Request(origin+target),env)).status,200);
  }
  assert.equal((await worker.fetch(new Request(origin+'/country?country=INVALID'),env)).status,404);
});
