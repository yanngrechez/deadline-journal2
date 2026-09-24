const test=require('node:test');const assert=require('node:assert/strict');const {select,validate}=require('../cover.js');
const story=(slug,day=1,status='published')=>({slug,published_at:`2026-09-${String(day).padStart(2,'0')}T12:00`,status});
const layout={'main-story':'main','bottom-story':'bottom','side-story-up':'up','side-story-down':'down','side-story-right':'right'};
const featured=Object.values(layout).map(slug=>story(slug));
test('new publications and date edits never move pinned image stories',()=>{
 const articles=[...featured,...Array.from({length:6},(_,i)=>story('column-'+i,i+2))];
 for(const list of [articles,[story('new',25),...articles],articles.map(a=>({...a,published_at:'2026-09-30'})).reverse()]){
  const p=select(list,layout);assert.equal(p.hero.slug,'main');assert.equal(p.secondary.slug,'bottom');assert.deepEqual(p.mids.map(a=>a.slug),['up','down']);assert.equal(p.extra.slug,'right');
  assert(p.rails.every(a=>!Object.values(layout).includes(a.slug)));
 }
 assert.deepEqual(select(articles,layout).rails.map(a=>a.slug),['column-5','column-4','column-3','column-2']);
});
test('empty slots never steal column stories; old per-article positions are ignored',()=>{
 const p=select([story('one'),{...story('two',2),homepage_position:'bottom-story'}],{});
 assert.equal(p.hero,undefined);assert.equal(p.secondary,undefined);assert.equal(p.extra,undefined);assert.deepEqual(p.mids,[]);assert.deepEqual(p.rails.map(a=>a.slug),['two','one']);
});
test('one atomic cover edit replaces a slot without duplicate or lost stories',()=>{
 const p=select([...featured,story('replacement',5)],{...layout,'bottom-story':'replacement'});
 assert.equal(p.secondary.slug,'replacement');assert.deepEqual(p.rails.map(a=>a.slug),['bottom']);
});
test('invalid cover selections fail clearly; drafts never appear',()=>{
 validate(featured,layout);validate(featured,{});
 assert.throws(()=>validate(featured,{...layout,'bottom-story':'main'}),/selected twice/);
 assert.throws(()=>validate(featured,{'main-story':'missing'}),/missing or unpublished/);
 assert.throws(()=>validate([story('draft',1,'draft')],{'main-story':'draft'}),/missing or unpublished/);
 assert.throws(()=>validate(featured,[]),/must be an object/);
 assert.deepEqual(select([story('draft',1,'draft')],{}).rails,[]);
});
