(function(){
  function validState(state,path,now=Date.now()){
    return !!state&&['region','country'].includes(state.kind)&&typeof state.name==='string'&&state.name.length>0&&state.name.length<=160&&
      state.path===path&&Number.isFinite(state.time)&&now-state.time>=0&&now-state.time<30000&&
      Array.isArray(state.flags)&&state.flags.length<=250&&state.flags.every(src=>typeof src==='string'&&/^\/flags\/[a-z]{2}\.svg$/.test(src));
  }
  function flagLayout(count,width,height){
    if(!count)return {positions:[],gap:0};
    const lengths=[width,height,width,height],intervals=[1,1,1,1];
    for(let remaining=count-4;remaining>0;remaining--){
      let side=0;
      for(let i=1;i<4;i++)if(lengths[i]/intervals[i]>lengths[side]/intervals[side])side=i;
      intervals[side]++;
    }
    const positions=[];
    intervals.forEach((n,side)=>{for(let step=0;step<n;step++){
      const t=step/n;
      positions.push(side===0?[width*t,0]:side===1?[width,height*t]:side===2?[width*(1-t),height]:[0,height*(1-t)]);
    }});
    return {positions:positions.slice(0,count),gap:Math.min(...lengths.map((length,i)=>length/intervals[i]))};
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={validState,flagLayout};
  if(typeof window==='undefined')return;
  window.validDeadlineTransition=state=>validState(state,location.pathname+location.search);
  const flagSprite='/transition-flags.webp';
  let flagImage,flagReady;
  window.prepareDeadlineFlags=function(){
    if(!flagReady){
      flagImage=new Image();flagImage.decoding='async';flagImage.src=flagSprite;
      flagReady=flagImage.decode?flagImage.decode():new Promise(resolve=>{flagImage.onload=resolve;flagImage.onerror=resolve});
      flagReady=flagReady.catch(()=>{flagReady=null;});
    }
    return flagReady;
  };
  const warmFlags=()=>{if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!navigator.connection?.saveData)window.prepareDeadlineFlags();};
  addEventListener('load',()=>{if('requestIdleCallback' in window)requestIdleCallback(warmFlags,{timeout:1500});else setTimeout(warmFlags,500);},{once:true});

  // Shared geometry keeps the outgoing and first destination frame identical.
  window.createDeadlineTitle=function(name,flags=[]){
    const layer=document.createElement('div');
    layer.className='page-transition-layer';
    layer.setAttribute('aria-hidden','true');
    layer.setAttribute('data-no-translate','true');
    layer.innerHTML='<span class="page-transition-backdrop"></span>';
    const word=document.createElement('span');
    word.className='page-transition-word is-centered';
    const localizedBreaks={'Oriente Medio y Norte de África':'Oriente Medio y\nNorte de África','Moyen-Orient et Afrique du Nord':'Moyen-Orient et\nAfrique du Nord','África subsahariana':'África\nsubsahariana','Afrique subsaharienne':'Afrique\nsubsaharienne'};
    Object.assign(localizedBreaks,{"Naher Osten und Nordafrika": "Naher Osten und\nNordafrika", "Midden-Oosten en Noord-Afrika": "Midden-Oosten en\nNoord-Afrika", "Közel-Kelet és Észak-Afrika": "Közel-Kelet és\nÉszak-Afrika", "Noord- en Zuid-Amerika": "Noord- en\nZuid-Amerika", "Ázsia és a csendes-óceáni térség": "Ázsia és a\ncsendes-óceáni térség"});
    const display=localizedBreaks[name]|| (name==='Middle East & North Africa'?'Middle East &\nNorth Africa':name==='Sub-Saharan Africa'?'Sub-Saharan\nAfrica':name);
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
      const {positions,gap}=flagLayout(flags.length,width,height);
      flags.forEach((flag,index)=>{
        const image=document.createElement('span');
        image.className='page-transition-flag';image.dataset.flag=flag;
        const code=flag.match(/\/([a-z]{2})\.svg$/)?.[1];
        if(!code)return;
        const [x,y]=positions[index];
        const size=Math.min(innerWidth<=700?19:28,gap*.58),height=size/1.4;
        image.style.left=`${x}px`;image.style.top=`${y}px`;
        image.style.width=`${size}px`;image.style.height=`${height}px`;
        image.style.backgroundImage=`url("${flagSprite}")`;
        image.style.backgroundSize=`${size*26}px ${height*26}px`;
        image.style.backgroundPosition=`${-(code.charCodeAt(0)-97)*size}px ${-(code.charCodeAt(1)-97)*height}px`;
        frame.appendChild(image);
      });
      // Reveal a complete decoded frame instead of flags popping in one by one.
      frame.style.visibility='hidden';
      window.prepareDeadlineFlags().then(()=>{
        if(frame.isConnected){frame.style.visibility='';frame.dataset.flagsReady='true';}
      });
    }
    return {layer,word,backdrop:layer.firstElementChild,flagFrame:frame};
  };
  const prefix='#deadline-transition=';
  if(!location.hash.startsWith(prefix)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let state;
  try{state=JSON.parse(decodeURIComponent(location.hash.slice(prefix.length)))}catch(error){return}
  if(!window.validDeadlineTransition(state))return;
  window.__DEADLINE_TRANSITION_BOOT=state;
  const {layer,backdrop}=window.createDeadlineTitle(state.name,state.kind==='region'?state.flags:[]);
  layer.dataset.transitionBoot='true';
  backdrop.style.opacity='1';
  // Recover if a destination script fails to load.
  window.__DEADLINE_TRANSITION_TIMER=window.setTimeout(()=>{layer.remove();document.querySelectorAll('.page-transition-target').forEach(el=>el.classList.remove('page-transition-target'))},4000);
})();
