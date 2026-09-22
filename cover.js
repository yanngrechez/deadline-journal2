(function(root,factory){
  const cover=factory();
  if(typeof module==='object'&&module.exports)module.exports=cover;
  else root.DeadlineCover=cover;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const positions=['main-story','bottom-story','side-story-up','side-story-down','column-stories'];
  const date=a=>Number.isFinite(Date.parse(a.published_at))?Date.parse(a.published_at):0;
  const newest=(a,b)=>date(b)-date(a)||String(a.slug).localeCompare(String(b.slug),'en');
  function select(articles){
    const published=articles.filter(a=>!a.status||a.status==='published').sort(newest);
    const selected=positions.slice(0,4).map(position=>published.find(a=>a.homepage_position===position));
    const used=new Set(selected.filter(Boolean));
    const remaining=published.filter(a=>!used.has(a));
    // Explicit slots win. Empty slots fall back to recent stories; older
    // assignments to an occupied slot return to the chronological column.
    for(let i=0;i<selected.length;i++)if(!selected[i])selected[i]=remaining.shift();
    return {hero:selected[0],secondary:selected[1],mids:selected.slice(2).filter(Boolean),rails:remaining.slice(0,4)};
  }
  return {positions,select};
});
