
const articles=window.DEADLINE_ARTICLES||[];
const countries=window.DEADLINE_COUNTRIES||[];
const topicNames={politics:'Politics',economics:'Economics',history:'History',philosophy:'Philosophy'};

function normalizeCountryName(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
}
const countryAliases={
  usa:'US',unitedstatesofamerica:'US',uk:'GB',greatbritain:'GB',russia:'RU',southkorea:'KR',northkorea:'KP',
  ivorycoast:'CI',czechia:'CZ',democraticrepublicofthecongo:'CD',drc:'CD',congokinshasa:'CD',congobrazzaville:'CG',
  palestinianterritories:'PS',easttimor:'TL',capeverde:'CV',vatican:'VA',macedonia:'MK',burma:'MM'
};
function countryByCode(code){return countries.find(country=>country.code===String(code||'').toUpperCase())}
function countryForName(name){
  const normalized=normalizeCountryName(name);
  const alias=countryAliases[normalized];
  return alias?countryByCode(alias):countries.find(country=>normalizeCountryName(country.name)===normalized);
}
function countryForArticle(article){return countryByCode(article.country_code)||countryForName(article.country)}
function isRealArticle(article){return !article.is_placeholder}
function countryUrl(country){return `country.html?country=${encodeURIComponent(country.code)}`}
function realArticlesForCountry(country){return articles.filter(article=>isRealArticle(article)&&countryForArticle(article)?.code===country.code)}

function articleTopics(article){
  const topics=Array.isArray(article.topics)?article.topics:[];
  return [...new Set(topics.map(topic=>String(topic).toLowerCase()).filter(topic=>topicNames[topic]))];
}
function topicMeta(article,withLeadingSeparator=false){
  return articleTopics(article).map((topic,index)=>
    `${index||withLeadingSeparator?'<span class="topic-separator"> · </span>':''}<span class="topic-label topic-${topic}">${topicNames[topic]}</span>`
  ).join('');
}
function articleMeta(article,linkCountry=false){
  const country=linkCountry?countryForArticle(article):null;
  const countryLabel=country
    ? `<a class="country-label country-transition-link" href="${countryUrl(country)}" aria-label="View ${country.name} stories">${article.country}</a>`
    : `<span class="country-label">${article.country}</span>`;
  return `${countryLabel}${topicMeta(article,true)}`;
}

const pageTransitionKey='deadline-page-transition';
const pageTransitionWindowPrefix='deadline-page-transition:';
function savePageTransition(transition){
  const value=JSON.stringify({kind:transition.kind,name:transition.name,path:transition.url.pathname+transition.url.search,flags:transition.flags||[],time:Date.now()});
  try{sessionStorage.setItem(pageTransitionKey,value);return value}catch(error){}
  window.name=pageTransitionWindowPrefix+value;
  return value;
}
function takePageTransition(){
  let value=window.__DEADLINE_TRANSITION_BOOT?JSON.stringify(window.__DEADLINE_TRANSITION_BOOT):null;
  try{value=value||sessionStorage.getItem(pageTransitionKey);sessionStorage.removeItem(pageTransitionKey)}catch(error){}
  if(!value&&String(window.name||'').startsWith(pageTransitionWindowPrefix)){
    value=String(window.name).slice(pageTransitionWindowPrefix.length);
    window.name='';
  }
  const hashPrefix='#deadline-transition=';
  if(location.hash.startsWith(hashPrefix)){
    if(!value){try{value=decodeURIComponent(location.hash.slice(hashPrefix.length))}catch(error){}}
    history.replaceState(history.state,'',location.pathname+location.search);
  }
  try{return JSON.parse(value||'null')}catch(error){return null}
}
function transitionDestination(link){
  const url=new URL(link.href,location.href);
  if(url.origin!==location.origin)return null;
  if(/\/region(?:\.html)?$/.test(url.pathname)){
    const name=url.searchParams.get('region');
    const flags=countries.filter(country=>country.region===name).map(country=>country.flag);
    return name?{kind:'region',name,url,flags}:null;
  }
  if(/\/country(?:\.html)?$/.test(url.pathname)){
    const country=countryByCode(url.searchParams.get('country'))||countryForName(url.searchParams.get('country'));
    return country?{kind:'country',name:country.name,url}:null;
  }
  return null;
}
function clearPageTransition(){
  document.body.classList.remove('page-transition-outgoing','page-transition-arriving');
  document.querySelectorAll('.page-transition-layer').forEach(layer=>layer.remove());
  document.querySelectorAll('.page-transition-target').forEach(target=>target.classList.remove('page-transition-target'));
}
function startPageTransition(event,link,transition){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank'||link.hasAttribute('download'))return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  event.preventDefault();
  if(document.body.classList.contains('page-transition-outgoing'))return;
  const source=link.closest('svg')&&event.clientX
    ? {left:event.clientX,top:event.clientY,width:1,height:1}
    : (link.querySelector('strong')||link).getBoundingClientRect();
  const {backdrop,word,flagFrame}=window.createDeadlineTitle(transition.name,transition.kind==='region'?transition.flags:[]);
  const hero=word.getBoundingClientRect();
  const scale=Math.min(.45,Math.max(.12,source.width/hero.width));
  const x=source.left+source.width/2-innerWidth/2;
  const y=source.top+source.height/2-innerHeight/2;
  document.body.classList.add('page-transition-outgoing');
  const navigationUrl=new URL(transition.url.href);
  navigationUrl.hash=`deadline-transition=${encodeURIComponent(savePageTransition(transition))}`;
  const timing={duration:500,easing:'cubic-bezier(.22,.7,.22,1)',fill:'forwards'};
  backdrop.animate([{opacity:0},{opacity:1}],timing);
  word.animate([
    {transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(${scale})`,opacity:0},
    {opacity:1,offset:.2},
    {transform:'translate(-50%,-50%) scale(1)',opacity:1}
  ],timing);
  if(flagFrame){
    const flags=[...flagFrame.querySelectorAll('img')];
    flags.forEach((flag,index)=>{
      const x=(parseFloat(flag.style.left)/flagFrame.offsetWidth-.5)*-28;
      const y=(parseFloat(flag.style.top)/flagFrame.offsetHeight-.5)*-28;
      flag.animate([
        {opacity:0,transform:`translate(calc(-50% + ${x}px),calc(-50% + ${y}px)) scale(.65) rotate(-5deg)`,filter:'blur(2px)'},
        {opacity:1,transform:'translate(-50%,-50%) scale(1.06) rotate(1deg)',filter:'blur(0px)',offset:.75},
        {opacity:1,transform:'translate(-50%,-50%) scale(1) rotate(0deg)',filter:'blur(0px)'}
      ],{duration:380,delay:100+index/Math.max(1,flags.length-1)*170,easing:'cubic-bezier(.22,.7,.22,1)',fill:'both'});
    });
  }
  window.setTimeout(()=>location.assign(navigationUrl.href),700);
}
function showArrivalTransition(){
  const saved=takePageTransition();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){clearPageTransition();return}
  const params=new URLSearchParams(location.search);
  const destinationName=saved?.kind==='region'?params.get('region'):(countryByCode(params.get('country'))||countryForName(params.get('country')))?.name;
  const route=location.pathname.replace(/\.html$/,'').replace(/\/$/,'');
  if(!saved||Date.now()-saved.time>30000||route!==`/${saved.kind}`||destinationName!==saved.name){clearPageTransition();return}
  const target=saved.kind==='region'?document.getElementById('regionName'):document.querySelector('.country-page-head h1');
  if(!target){clearPageTransition();return}
  const layer=document.querySelector('[data-transition-boot]')||window.createDeadlineTitle(saved.name,saved.kind==='region'?saved.flags:[]).layer;
  const word=layer.querySelector('.page-transition-word');
  const backdrop=layer.querySelector('.page-transition-backdrop');
  const frame=layer.querySelector('.page-transition-flag-frame');
  const style=getComputedStyle(target);
  // Measure individual destination letters without modifying the real heading.
  const destinations=[];
  const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    for(let i=0;i<node.length;i++){
      if(/\s/.test(node.textContent[i]))continue;
      const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
      destinations.push(range.getBoundingClientRect());
    }
  }
  const glyphs=[...word.querySelectorAll('.page-transition-glyph')].filter(glyph=>glyph.textContent.trim());
  if(glyphs.length!==destinations.length){clearPageTransition();return}
  const starts=glyphs.map(glyph=>glyph.getBoundingClientRect());
  const heroFont=parseFloat(getComputedStyle(word).fontSize);
  const scale=parseFloat(style.fontSize)/heroFont;
  target.classList.add('page-transition-target');
  backdrop.style.opacity='1';
  const timing={duration:680,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'};
  const animations=glyphs.map((glyph,i)=>{
    const start=starts[i],end=destinations[i];
    const clone=glyph.cloneNode(true);
    Object.assign(clone.style,{position:'fixed',left:`${start.left}px`,top:`${start.top}px`,fontFamily:style.fontFamily,fontWeight:style.fontWeight,fontSize:`${heroFont}px`,lineHeight:'normal',color:getComputedStyle(word).color,transformOrigin:'0 0',whiteSpace:'pre'});
    // Range rectangles include font ascent/descent, so anchor each glyph by its own measured rectangle.
    layer.appendChild(clone);
    const range=document.createRange();range.selectNodeContents(clone);
    const glyphRect=range.getBoundingClientRect(),box=clone.getBoundingClientRect();
    const dx=glyphRect.left-box.left,dy=glyphRect.top-box.top;
    clone.style.left=`${start.left-dx}px`;
    clone.style.top=`${start.top-dy}px`;
    return clone.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${end.left-start.left+dx*(1-scale)}px,${end.top-start.top+dy*(1-scale)}px) scale(${scale})`,color:style.color}],timing);
  });
  word.style.visibility='hidden';
  backdrop.animate([{opacity:1},{opacity:0}],timing);
  frame?.animate([{opacity:1},{opacity:0,offset:.55},{opacity:0}],timing);
  const finish=()=>clearPageTransition();
  Promise.all(animations.map(animation=>animation.finished)).then(finish,finish);
  window.setTimeout(finish,950);
}

function initializeReadingProgress(){
  const bar=document.getElementById('readingProgressBar');
  const article=document.getElementById('articlePage');
  if(!bar||!article)return;
  let scheduled=false;
  const update=()=>{
    const articleStart=article.getBoundingClientRect().top+window.scrollY;
    const articleEnd=articleStart+article.offsetHeight-window.innerHeight;
    const distance=Math.max(1,articleEnd-articleStart);
    const progress=Math.max(0,Math.min(1,(window.scrollY-articleStart)/distance));
    bar.style.transform=`scaleX(${progress})`;
    bar.parentElement.dataset.progress=Math.round(progress*100);
    scheduled=false;
  };
  const requestUpdate=()=>{
    if(!scheduled){scheduled=true;requestAnimationFrame(update)}
  };
  update();
  window.addEventListener('scroll',requestUpdate,{passive:true});
  window.addEventListener('resize',requestUpdate);
  window.addEventListener('load',requestUpdate,{once:true});
  if('ResizeObserver' in window)new ResizeObserver(requestUpdate).observe(article);
}

function openSearch(){
  document.getElementById('searchOverlay')?.classList.add('open');
  const i=document.getElementById('searchInput');
  if(i){setTimeout(()=>i.focus(),30);renderSearch('');}
}
function closeSearch(){document.getElementById('searchOverlay')?.classList.remove('open')}
function renderSearch(q){
  const t=(q||'').toLowerCase(),o=document.getElementById('searchResults');
  if(!o)return;
  o.innerHTML=articles.filter(a=>!t||[a.title,a.country,articleTopics(a).join(' '),a.author,a.region,a.dek].join(' ').toLowerCase().includes(t))
    .map(a=>`<a class="search-result" href="article.html?slug=${a.slug}">
      <div>${articleMeta(a)}</div><h3>${a.title}</h3></a>`).join('');
}
document.addEventListener('DOMContentLoaded',()=>{
  const i=document.getElementById('searchInput');
  if(i)i.addEventListener('input',e=>renderSearch(e.target.value));
  initializeReadingProgress();
  requestAnimationFrame(showArrivalTransition);
});
document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href]');
  const transition=link&&transitionDestination(link);
  if(transition)startPageTransition(event,link,transition);
});
window.addEventListener('pageshow',event=>{if(event.persisted)clearPageTransition()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch()});
