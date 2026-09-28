const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {compile,sourceHash,checkHTML,locales}=require('../build-translations.cjs');
const root=path.resolve(__dirname,'..');
const articles=fs.readdirSync(path.join(root,'content/articles')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(root,'content/articles',f)))).filter(a=>a.status==='published');
test('every published article has five complete current-source translations',()=>{
 const result=compile({root,articles,strict:true});
 assert.ok(articles.length>=10);
 for(const a of articles){assert.deepEqual(result.coverage[a.slug],locales);assert.ok(result.articleRows[a.slug].length>0);}
});
test('source edits disable outdated translations instead of serving stale content',()=>{
 const changed={...articles[0],body:articles[0].body+'<p>New reporting.</p>'};
 assert.notEqual(sourceHash(changed),sourceHash(articles[0]));
 const result=compile({root,articles:[changed]});
 assert.deepEqual(result.coverage[changed.slug],[]);
 assert.equal(result.issues.length,5);
 assert.throws(()=>compile({root,articles:[changed],strict:true}),/English source changed/);
});
test('formatting and citation links cannot disappear or change',()=>{
 checkHTML('<p><em>Report</em></p>','<p><em>Rapport</em></p>','valid');
 assert.throws(()=>checkHTML('<p><em>Report</em></p>','<p>Rapport</p>','bad'),/formatting/);
 assert.throws(()=>checkHTML('<p><a href="https://example.org">Report</a></p>','<p><a href="https://other.org">Rapport</a></p>','bad'),/links/);
});
test('missing translations leave CMS publishing available with English fallback',()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'journal-translations-'));
 try{const result=compile({root:temporary,articles});assert.equal(result.issues.length,articles.length*5);}
 finally{fs.rmSync(temporary,{recursive:true,force:true});}
});
