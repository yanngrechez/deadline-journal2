(function(){
  // Shared geometry keeps the outgoing and first destination frame identical.
  window.createDeadlineTitle=function(name,flags=[]){
    const layer=document.createElement('div');
    layer.className='page-transition-layer';
    layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<span class="page-transition-backdrop"></span>';
    const word=document.createElement('span');
    word.className='page-transition-word is-centered';
    const display=name==='Middle East & North Africa'?'Middle East &\nNorth Africa':name==='Sub-Saharan Africa'?'Sub-Saharan\nAfrica':name;
    display.split('\n').forEach((line,index)=>{
      if(index)word.appendChild(document.createElement('br'));
      const row=document.createElement('span');
      row.className='page-transition-line';
      Array.from(line).forEach(letter=>{
        const glyph=document.createElement('span');
        glyph.className='page-transition-glyph';
        glyph.textContent=letter;
        row.appendChild(glyph);
      });
      word.appendChild(row);
    });
    const available=Math.min(660,innerWidth-96);
    const longest=Math.max(...display.split('\n').map(line=>line.length));
    word.style.fontSize=`${Math.min(90,Math.max(28,innerWidth*.07),available/(longest*.62))}px`;
    layer.appendChild(word);
    document.body.appendChild(layer);
    let frame=null;
    if(flags.length){
      frame=document.createElement('span');
      frame.className='page-transition-flag-frame is-visible';
      layer.appendChild(frame);
      const {width,height}=frame.getBoundingClientRect();
      // Reserve a flag at every corner, then balance intervals on each side.
      const lengths=[width,height,width,height];
      const intervals=[1,1,1,1];
      for(let remaining=flags.length-4;remaining>0;remaining--){
        let side=0;
        for(let i=1;i<4;i++)if(lengths[i]/intervals[i]>lengths[side]/intervals[side])side=i;
        intervals[side]++;
      }
      const gap=Math.min(...lengths.map((length,i)=>length/intervals[i]));
      const positions=[];
      intervals.forEach((count,side)=>{
        for(let step=0;step<count;step++){
          const t=step/count;
          positions.push(side===0?[width*t,0]:side===1?[width,height*t]:side===2?[width*(1-t),height]:[0,height*(1-t)]);
        }
      });
      flags.forEach((flag,index)=>{
        const image=document.createElement('img');
        image.src=flag;image.alt='';
        const [x,y]=positions[index];
        image.style.left=`${x}px`;image.style.top=`${y}px`;
        image.style.width=`${Math.min(innerWidth<=700?19:28,gap*.58)}px`;
        image.style.height='auto';
        image.style.aspectRatio='1.4';
        frame.appendChild(image);
      });
    }
    return {layer,word,backdrop:layer.firstElementChild,flagFrame:frame};
  };
  const prefix='#deadline-transition=';
  if(!location.hash.startsWith(prefix)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let state;
  try{state=JSON.parse(decodeURIComponent(location.hash.slice(prefix.length)))}catch(error){return}
  if(!state||Date.now()-state.time>30000)return;
  window.__DEADLINE_TRANSITION_BOOT=state;
  const {layer,backdrop}=window.createDeadlineTitle(state.name,state.kind==='region'?state.flags:[]);
  layer.dataset.transitionBoot='true';
  backdrop.style.opacity='1';
  // Recover if a destination script fails to load.
  window.setTimeout(()=>{layer.remove();document.querySelectorAll('.page-transition-target').forEach(el=>el.classList.remove('page-transition-target'))},4000);
})();
