(function(root,factory){
  const cover=factory();
  if(typeof module==='object'&&module.exports)module.exports=cover;
  else root.DeadlineCover=cover;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const positions=['main-story','bottom-story','side-story-up','side-story-down','side-story-right'];
  const columnPositions=['column-story-1','column-story-2','column-story-3','column-story-4'];
  function select(articles,layout={}){
    const published=articles.filter(a=>!a.status||a.status==='published');
    const selected=positions.map(position=>published.find(a=>a.slug===layout[position]));
    const used=new Set(selected.filter(Boolean).map(a=>a.slug));
    // Both image and headline slots are editorial choices; never backfill.
    const rails=columnPositions.map(position=>published.find(a=>a.slug===layout[position])).filter(a=>{if(!a||used.has(a.slug))return false;used.add(a.slug);return true;});
    return {hero:selected[0],secondary:selected[1],mids:selected.slice(2,4).filter(Boolean),extra:selected[4],rails};
  }
  function validate(articles,layout){
    if(!layout||typeof layout!=='object'||Array.isArray(layout))throw new Error('Front cover must be an object. Edit Front cover in Pages CMS.');
    const used=new Set();
    for(const position of [...positions,...columnPositions]){
      const slug=layout[position];
      if(slug==null||slug==='')continue;
      if(typeof slug!=='string'||!articles.some(a=>a.slug===slug&&(!a.status||a.status==='published')))throw new Error(`Front cover: ${position} references missing or unpublished article "${slug}". Clear or replace it in Pages CMS > Front cover.`);
      if(used.has(slug))throw new Error(`Front cover: "${slug}" is selected twice. Choose a different story for ${position}.`);
      used.add(slug);
    }
  }
  return {positions,select,validate};
});
