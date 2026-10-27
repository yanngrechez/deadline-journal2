const fs=require('node:fs');
const path=require('node:path');
function loadEditions(root,articles){
 const editions=fs.readdirSync(path.join(root,'content/editions')).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(root,'content/editions',f),'utf8')));
 const slugs=new Set(),numbers=new Set();
 for(const e of editions){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.slug)||slugs.has(e.slug))throw Error('Invalid or duplicate edition slug: '+e.slug);
  if(!Number.isInteger(e.number)||e.number<1||numbers.has(e.number))throw Error('Invalid or duplicate edition number: '+e.number);
  if(!['published','coming-soon','draft'].includes(e.status))throw Error('Invalid edition status: '+e.slug);
  if(e.status==='published'&&(!e.title||!e.cover||!Number.isFinite(Date.parse(e.published_at))))throw Error('Published editions need a title, cover and publication date: '+e.slug);
  slugs.add(e.slug);numbers.add(e.number);
 }
 for(const a of articles)if(a.edition&&!slugs.has(a.edition))throw Error('Unknown edition for '+a.slug+': '+a.edition);
 return editions.sort((a,b)=>a.number-b.number);
}
module.exports={loadEditions};
