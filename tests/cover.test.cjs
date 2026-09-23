const test=require('node:test');const assert=require('node:assert/strict');const {select}=require('../cover.js');
const story=(slug,position,day=1,status='published')=>({slug,homepage_position:position,published_at:`2026-09-${String(day).padStart(2,'0')}T12:00`,status});
test('named slots stay fixed while columns are newest first',()=>{
 const a=[story('main','main-story'),story('bottom','bottom-story'),story('up','side-story-up'),story('down','side-story-down'),story('right','side-story-right'),...Array.from({length:6},(_,i)=>story('column-'+i,'column-stories',i+2))];
 const page=select(a.reverse());assert.equal(page.hero.slug,'main');assert.equal(page.secondary.slug,'bottom');assert.deepEqual(page.mids.map(a=>a.slug),['up','down']);assert.equal(page.extra.slug,'right');assert.deepEqual(page.rails.map(a=>a.slug),['column-5','column-4','column-3','column-2']);
});
test('new assignment wins collisions, old assignment returns to columns, drafts never appear',()=>{
 const page=select([story('old','main-story',3),story('new','main-story',5),story('bottom','bottom-story'),story('up','side-story-up'),story('down','side-story-down'),story('right','side-story-right'),story('draft','main-story',7,'draft')]);
 assert.equal(page.hero.slug,'new');assert.equal(page.rails[0].slug,'old');assert.equal(JSON.stringify(page).includes('draft'),false);
});
test('empty slots gracefully use newest stories without duplicates',()=>{
 const page=select([story('one','column-stories',1),story('two','column-stories',2)]);
 assert.equal(page.hero.slug,'two');assert.equal(page.secondary.slug,'one');assert.deepEqual(page.mids,[]);assert.deepEqual(page.rails,[]);assert.equal(select([]).hero,undefined);
});

test('an empty right image slot promotes the newest remaining story only once',()=>{
 const page=select([story('main','main-story'),story('bottom','bottom-story'),story('up','side-story-up'),story('down','side-story-down'),story('recent','column-stories',5),story('older','column-stories',4)]);
 assert.equal(page.extra.slug,'recent');assert.deepEqual(page.rails.map(a=>a.slug),['older']);
 assert.equal(new Set([page.hero,page.secondary,...page.mids,page.extra,...page.rails]).size,6);
});
