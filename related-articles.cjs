"use strict";
const curated=require('./content/related-articles.json');
// Slots 1–2 favor geography; slot 3 favors the subject. Editorial choices
// override ranking, but never bypass publication, edition or uniqueness checks.
function selectRelated(article,articles,editions,now=Date.now()){
 const published=new Set(editions.filter(e=>e.status==='published').map(e=>e.slug));
 if(!published.has(article.edition))return [];
 const candidates=articles.filter(a=>a.slug!==article.slug&&a.status==='published'&&!a.is_placeholder&&a.edition!==article.edition&&published.has(a.edition)&&Date.parse(a.published_at)<=now);
 const topicScore=a=>(a.topics||[]).reduce((sum,t)=>sum+((article.topics||[]).includes(t)?(t==='politics'?1:3):0),0);
 const geography=a=>a.country&&String(a.country).toLowerCase()===String(article.country).toLowerCase()?2:a.region&&a.region===article.region?1:0;
 const selected=[];
 for(let slot=0;slot<3;slot++){
  const pool=candidates.filter(a=>!selected.some(s=>s.slug===a.slug));
  const chosen=pool.find(a=>a.slug===curated[article.slug]?.[slot])||pool.sort((a,b)=>{
   const score=x=>slot<2?geography(x)*100+topicScore(x):topicScore(x)*100+geography(x);
   return score(b)-score(a)||Date.parse(a.published_at)-Date.parse(b.published_at)||a.slug.localeCompare(b.slug);
  })[0];
  if(chosen)selected.push(chosen);
 }
 return selected;
}
module.exports={selectRelated};
