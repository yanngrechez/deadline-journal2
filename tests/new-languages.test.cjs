const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {readArticles,valid}=require('../scripts/translate-deepl.cjs');
const {compile}=require('../build-translations.cjs');
const root=path.resolve(__dirname,'..');
const articles=readArticles(root);
for(const locale of ['sr','bg','tr'])test(`all published articles have complete current ${locale} translations`,()=>{
 const missing=[];
 for(const article of articles){
  const file=path.join(root,'content/translations',locale,article.slug+'.json');
  if(!fs.existsSync(file)||!valid(article,JSON.parse(fs.readFileSync(file)),locale))missing.push(article.slug);
 }
 assert.deepEqual(missing,[],`Missing or invalid ${locale} translations: ${missing.join(', ')}`);
 const result=compile({root,articles});
 for(const article of articles)assert(result.coverage[article.slug].includes(locale),article.slug);
});
