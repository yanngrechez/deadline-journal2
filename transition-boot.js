(function(){
  const prefix='#deadline-transition=';
  if(!location.hash.startsWith(prefix)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let state;
  try{state=JSON.parse(decodeURIComponent(location.hash.slice(prefix.length)))}catch(error){return}
  if(!state||Date.now()-state.time>30000)return;
  window.__DEADLINE_TRANSITION_BOOT=state;

  const layer=document.createElement('div');
  layer.className='page-transition-layer page-transition-boot';
  layer.dataset.transitionBoot='true';
  layer.setAttribute('aria-hidden','true');
  const backdrop=document.createElement('span');
  backdrop.className='page-transition-backdrop';
  backdrop.style.opacity='.985';
  const word=document.createElement('span');
  word.className='page-transition-word is-centered';
  word.textContent=state.name;
  const base=Math.min(112,Math.max(46,window.innerWidth*.082));
  const factor=state.name.length>=24?.55:state.name.length>=18?.7:1;
  word.style.fontSize=`${base*factor}px`;
  layer.append(backdrop,word);

  if(state.kind==='region'&&state.flags?.length){
    const frame=document.createElement('span');
    frame.className='page-transition-flag-frame is-visible';
    state.flags.forEach((flag,index)=>{
      const image=document.createElement('img');
      image.src=flag;
      image.alt='';
      const width=100,height=58,perimeter=2*(width+height),distance=index/state.flags.length*perimeter;
      let x,y;
      if(distance<width){x=distance;y=0}
      else if(distance<width+height){x=width;y=distance-width}
      else if(distance<2*width+height){x=width-(distance-width-height);y=height}
      else{x=0;y=height-(distance-2*width-height)}
      image.style.left=`${x}%`;
      image.style.top=`${y/height*100}%`;
      frame.appendChild(image);
    });
    layer.appendChild(frame);
  }
  document.body.appendChild(layer);
})();
