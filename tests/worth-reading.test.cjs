const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {selectWorthReading}=require('../worth-reading.cjs');
const base={status:'published',published_at:'2026-01-01'};
test('CMS slots keep exact order and never backfill; unsafe selections fail',()=>{
 const articles=['a','b','c','d','e'].map(slug=>({...base,slug}));
 assert.deepEqual(selectWorthReading(articles,{'story-1':'c','story-3':'a'}).map(a=>a.slug),['c','a']);
 assert.deepEqual(selectWorthReading(articles,{}),[]);
 assert.throws(()=>selectWorthReading(articles,{'story-1':'a','story-2':'a'}),/twice/);
 for(const change of [{status:'draft'},{is_placeholder:true},{published_at:'2099-01-01'}])assert.throws(()=>selectWorthReading([{...base,slug:'a',...change}],{'story-1':'a'}),/published/);
 assert.throws(()=>selectWorthReading([],{'story-1':'missing'}),/published/);
});
test('homepage contains the five configured stories between map and editions',()=>{
 const html=fs.readFileSync('dist/index.html','utf8'),selection=require('../content/worth-reading.json');
 const start=html.indexOf('id="worthReadingSection"'),end=html.indexOf('id="editions"');
 assert(start>html.indexOf('id="worldMap"'));assert(end>start);
 const section=html.slice(start,end);assert.equal((section.match(/class="reading-card"/g)||[]).length,5);
 let previous=-1;for(const slug of Object.values(selection)){const i=section.indexOf('href="/'+slug+'"');assert(i>previous);previous=i;}
});
