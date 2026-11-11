const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {selectRelated}=require('../related-articles.cjs');
const read=d=>fs.readdirSync(d).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(d+'/'+f)));
const articles=read('content/articles'),editions=read('content/editions');
test('all current recommendations are three unique cross-edition published stories above signup',()=>{
 for(const a of articles.filter(a=>a.status==='published')){
 const picks=selectRelated(a,articles,editions);assert.equal(picks.length,3);assert.equal(new Set(picks.map(x=>x.slug)).size,3);
 for(const p of picks){assert.notEqual(p.edition,a.edition);assert(!p.is_placeholder);assert.equal(p.status,'published');}
 const html=fs.readFileSync('dist/'+a.slug+'/index.html','utf8');assert(html.indexOf('class="continue-reading"')>html.indexOf('id="articleUpdates"'));assert(html.indexOf('class="continue-reading"')<html.indexOf('id="articleNewsletterTitle"'));
 for(const p of picks)assert(html.includes('class="reading-card" href="/'+p.slug+'"'));
 }
});
test('new stories prioritize two geographic matches and one subject match; drafts and future issues never leak',()=>{
 const base={status:'published',published_at:'2026-01-01',edition:'old',region:'Europe',country:'Spain',topics:['politics']};
 const current={...base,slug:'new-story',edition:'new',topics:['economics']};
 const pool=[{...base,slug:'same-country'},{...base,slug:'same-region',country:'France'},{...base,slug:'subject',country:'Argentina',region:'Americas',topics:['economics']},{...base,slug:'draft',status:'draft'},{...base,slug:'future',published_at:'2099-01-01'},{...base,slug:'coming',edition:'soon'}];
 const issues=[{slug:'old',status:'published'},{slug:'new',status:'published'},{slug:'soon',status:'coming-soon'}];
 assert.deepEqual(selectRelated(current,pool,issues).map(a=>a.slug),['same-country','same-region','subject']);
 assert.deepEqual(selectRelated({...current,edition:'soon'},pool,issues),[]);
 assert.equal(selectRelated(current,[pool[0]],issues).length,1);
});
