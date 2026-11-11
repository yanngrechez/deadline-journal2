"use strict";
function selectWorthReading(articles,selection={},now=Date.now()){
 const selected=[],seen=new Set();
 for(let i=1;i<=5;i++){
  const slug=selection['story-'+i];if(!slug)continue;
  const article=articles.find(a=>a.slug===slug&&a.status==='published'&&!a.is_placeholder&&Date.parse(a.published_at)<=now);
  if(!article)throw new Error(`Worth reading: story ${i} must reference a published, non-placeholder article. Clear or replace "${slug}" in Pages CMS > Worth reading.`);
  if(seen.has(slug))throw new Error(`Worth reading: "${slug}" is selected twice. Choose each article only once.`);
  seen.add(slug);selected.push(article);
 }
 return selected;
}
module.exports={selectWorthReading};
