'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const locales=['es','fr','de','nl','hu'];
const fields=['title','dek','body','sections','hero_alt','hero_caption'];
function sorted(value){if(Array.isArray(value))return value.map(sorted);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,sorted(value[k])]));return value;}
function sourceHash(article){return crypto.createHash('sha256').update(JSON.stringify(sorted(Object.fromEntries(fields.map(k=>[k,article[k]??null]))))).digest('hex');}
function blocks(html){return [...String(html||'').matchAll(/<(p|h[1-6]|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m=>m[2]);}
function checkHTML(source,target,label){
 const tags=s=>[...String(s||'').replace(/<(em|strong)>\s*<\/\1>/gi,'').matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)].map(m=>m[0].replace(/\s[^>]*/,'').toLowerCase());
 if(JSON.stringify(tags(source))!==JSON.stringify(tags(target)))throw Error('Translation formatting mismatch: '+label);
 const hrefs=s=>[...String(s||'').matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)].map(m=>m[2]);
 if(JSON.stringify(hrefs(source))!==JSON.stringify(hrefs(target)))throw Error('Translation links changed: '+label);
 if(/<\s*(script|iframe|object)\b|\bon\w+\s*=/i.test(target||''))throw Error('Unsafe translation HTML: '+label);
}
function compile({root,articles,strict=false}){
 const globalRows=new Map(),articleRows={},coverage={},issues=[];
 function add(map,source,target,locale){if(!source||!String(source).trim())return;const row=map.get(source)||[source];row[locales.indexOf(locale)+1]=target;map.set(source,row);}
 for(const a of articles){
  const rows=new Map();coverage[a.slug]=[];
  for(const locale of locales){
   const file=path.join(root,'content/translations',locale,a.slug+'.json');
   if(!fs.existsSync(file)){issues.push(`${a.slug}/${locale}: missing`);continue;}
   const t=JSON.parse(fs.readFileSync(file,'utf8'));
   if(t.sourceHash!==sourceHash(a)){issues.push(`${a.slug}/${locale}: English source changed`);continue;}
   if(t.slug!==a.slug||t.language!==locale)throw Error('Incorrect translation identity: '+file);
   for(const key of ['title','dek','body','hero_alt','hero_caption']){
    if(a[key]&&(!t[key]||typeof t[key]!=='string'))throw Error(`Missing translation ${a.slug}/${locale}/${key}`);
    if(a[key])checkHTML(a[key],t[key],`${a.slug}/${locale}/${key}`);
   }
   if((a.sections||[]).length!==(t.sections||[]).length)throw Error('Translation section count mismatch: '+file);
   const pairs=[[a.body,t.body]];
   for(let i=0;i<(a.sections||[]).length;i++){
    const source=a.sections[i],translated=t.sections[i];
    for(const key of ['type','image','credit'])if(JSON.stringify(source[key])!==JSON.stringify(translated[key]))throw Error(`Translation changed ${key}: ${file} section ${i}`);
    for(const key of ['body','heading','title','alt','caption'])if(source[key]){
     if(!translated[key])throw Error(`Missing section ${key}: ${file} section ${i}`);
     checkHTML(source[key],translated[key],file+' section '+i+' '+key);
     if(key==='body')pairs.push([source[key],translated[key]]);else add(rows,source[key],translated[key],locale);
    }
   }
   for(const key of ['title','dek'])add(globalRows,a[key],t[key],locale);
   for(const key of ['hero_alt','hero_caption'])add(rows,a[key],t[key],locale);
   for(const [source,target] of pairs){const from=blocks(source),to=blocks(target);if(from.length!==to.length)throw Error('Translation paragraph count mismatch: '+file);from.forEach((s,i)=>add(rows,s,to[i],locale));}
   coverage[a.slug].push(locale);
  }
  articleRows[a.slug]=[...rows.values()];
 }
 if(strict&&issues.length)throw Error('Incomplete translations:\n'+issues.join('\n'));
 return {globalRows:[...globalRows.values()],articleRows,coverage,issues};
}
module.exports={compile,sourceHash,checkHTML,blocks,locales};
