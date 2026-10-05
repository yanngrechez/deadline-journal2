const test=require('node:test'),assert=require('node:assert/strict');
const {validState,flagLayout}=require('../transition-boot.js');
const countries=require('../countries-data.js');
const now=Date.now();
const state={kind:'region',name:'Europe',path:'/europe',time:now,flags:['/flags/es.svg','/flags/tr.svg']};
test('only a fresh matching route with local flag assets can restore a transition',()=>{
 assert(validState(state,'/europe',now));
 for(const patch of [{time:now-30001},{time:now+1},{time:NaN},{kind:'article'},{name:''},{name:'x'.repeat(161)},{flags:['https://example.com/tracking.svg']},{flags:['/flags/../media/a.svg']}])assert(!validState({...state,...patch},'/europe',now));
 assert(!validState(state,'/americas',now));
 assert(!validState(null,'/europe',now));
});
test('every regional flag fits on a balanced frame at desktop and phone widths',()=>{
 for(const region of new Set(countries.map(c=>c.region))){
  const n=countries.filter(c=>c.region===region).length;
  for(const [width,height] of [[760,220],[362,170],[292,170]]){
   const {positions,gap}=flagLayout(n,width,height);
   assert.equal(positions.length,n,region);
   assert.equal(new Set(positions.map(p=>p.join(','))).size,n,region);
   for(const [x,y] of positions){assert(x>=0&&x<=width&&y>=0&&y<=height);assert(x===0||x===width||y===0||y===height);}
   if(n>=4)for(const corner of [[0,0],[width,0],[width,height],[0,height]])assert(positions.some(p=>p[0]===corner[0]&&p[1]===corner[1]));
   const flagWidth=Math.min(width<400?19:28,gap*.58);
   assert(flagWidth<gap);
  }
 }
 assert.deepEqual(flagLayout(0,760,220),{positions:[],gap:0});
 assert(countries.find(c=>c.code==='TR').region==='Europe');
});
test('the cached flag sheet contains the correct high-resolution country tiles',async()=>{
 const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
 const root=path.resolve(__dirname,'..'),boot=fs.readFileSync(path.join(root,'dist/transition-boot.js'),'utf8');
 const sprite=boot.match(/\/static\/transition-flags\.[a-f0-9]+\.webp/)[0];
 for(const code of ['tr','de','jp','es']){
  const expected=await sharp(path.join(root,'node_modules/flag-icons/flags/4x3',code+'.svg')).resize(56,40,{fit:'fill'}).ensureAlpha().raw().toBuffer();
  const actual=await sharp(path.join(root,'dist',sprite)).extract({left:(code.charCodeAt(0)-97)*56,top:(code.charCodeAt(1)-97)*40,width:56,height:40}).ensureAlpha().raw().toBuffer();
  assert.deepEqual(actual,expected,code);
 }
});
