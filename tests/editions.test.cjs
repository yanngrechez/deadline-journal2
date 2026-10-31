const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const routes=require('../routes');
const {loadEditions}=require('../editions.cjs');
const {createRenderer}=require('../static-render.cjs');
const articles=fs.readdirSync(path.join(root,'content/articles')).map(f=>JSON.parse(fs.readFileSync(path.join(root,'content/articles',f)))).filter(a=>a.status==='published');
const editions=loadEditions(root,articles);
test('edition pages contain exactly their assigned articles, with canonical URLs and sitemap entries',()=>{
 const home=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert(home.includes('id="worldMapShell"'));
 assert(home.includes('id="editionsGallery"'));
 assert(!home.includes('id="regionGrid"'));
 const sitemap=fs.readFileSync(path.join(root,'dist/sitemap.xml'),'utf8');
 for(const e of editions.filter(e=>e.status==='published')){
  const url=routes.editionUrl(e);
  assert(home.includes('href="'+url+'"'));
  assert(sitemap.includes('https://deadlinejournal.org'+url));
  const html=fs.readFileSync(path.join(root,'dist',url,'index.html'),'utf8');
  assert(html.includes('<link rel="canonical" href="https://deadlinejournal.org'+url+'">'));
  const cards=[...html.matchAll(/class="region-card" href="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(cards.sort(),articles.filter(a=>a.edition===e.slug).map(routes.articleUrl).sort());
  assert(html.includes('view-transition-name:edition-cover-'+e.slug));
  assert(html.includes('href="#editionPage"'));
  assert.equal(routes.resolve(new URL('https://deadlinejournal.org'+url)).kind,'edition');
 }
 assert(home.includes('href="/editions/edition-3"'));
 assert(home.includes('edition-soon-badge'));
 const preview=fs.readFileSync(path.join(root,'dist/editions/edition-3/index.html'),'utf8');
 assert(preview.includes('Pressure creates choices.'));
 assert(preview.includes('Coming soon'));
 assert(preview.includes('noindex'));
 assert(!preview.includes('Invalid Date'));
 assert(!preview.includes('class="region-card"'));
 assert(!sitemap.includes('/editions/edition-3'));

 assert(routes.reserved.includes('editions'));
});
test('new CMS editions and article membership work without adding route-specific code',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'journal-editions-'));
 try{
  fs.mkdirSync(path.join(root,'content/editions'),{recursive:true});
  const e={slug:'future-issue',number:4,title:'Future',status:'published',published_at:'2026-12-01',cover:'/media/future.webp'};
  fs.writeFileSync(path.join(root,'content/editions/future.json'),JSON.stringify(e));
  const a={slug:'future-article',title:'Future article',edition:e.slug,published_at:'2027-01-01',status:'published'};
  const loaded=loadEditions(root,[a]);
  const renderer=createRenderer({articles:[a],routes,editions:loaded});
  assert(renderer.home().editionsGallery.includes('/editions/future-issue'));
  assert(renderer.edition(e).includes('href="/future-article"'));
  assert.throws(()=>loadEditions(root,[{...a,edition:'typo'}]),/Unknown edition/);
  fs.writeFileSync(path.join(root,'content/editions/duplicate.json'),JSON.stringify(e));
  assert.throws(()=>loadEditions(root,[a]),/duplicate edition/);
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('edition links remain native and reduced motion bypasses animation',()=>{
 const js=fs.readFileSync(path.join(root,'edition-transition-boot.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'editions.css'),'utf8');
 assert(!js.includes('preventDefault('));
 assert(js.includes('skipTransition()'));
 assert(css.includes('prefers-reduced-motion:reduce'));
 assert(css.includes('@view-transition{navigation:none}'));
 const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert(/<script src="\/static\/edition-transition-boot\.[^"]+\.js"><\/script>/.test(html));
});
