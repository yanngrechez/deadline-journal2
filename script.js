
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
  const value=JSON.stringify({kind:transition.kind,name:transition.name,path:transition.url.pathname+transition.url.search,time:Date.now()});
  try{sessionStorage.setItem(pageTransitionKey,value);return value}catch(error){}
  window.name=pageTransitionWindowPrefix+value;
  return value;
}
function takePageTransition(){
  let value=null;
  try{value=sessionStorage.getItem(pageTransitionKey);sessionStorage.removeItem(pageTransitionKey)}catch(error){}
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
  if(url.pathname.endsWith('/region.html')){
    const name=url.searchParams.get('region');
    return name?{kind:'region',name,url}:null;
  }
  if(url.pathname.endsWith('/country.html')){
    const country=countryByCode(url.searchParams.get('country'))||countryForName(url.searchParams.get('country'));
    return country?{kind:'country',name:country.name,url}:null;
  }
  return null;
}
function createPageTransitionLayer(name){
  const layer=document.createElement('div');
  layer.className='page-transition-layer';
  layer.setAttribute('aria-hidden','true');
  layer.innerHTML='<span class="page-transition-backdrop"></span>';
  const word=document.createElement('span');
  word.className='page-transition-word';
  word.textContent=name;
  layer.appendChild(word);
  document.body.appendChild(layer);
  return {layer,backdrop:layer.firstElementChild,word};
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
  const {backdrop,word}=createPageTransitionLayer(transition.name);
  const sourceSize=Math.max(10,Math.min(28,parseFloat(getComputedStyle(link).fontSize)||10));
  word.style.left=`${source.left}px`;
  word.style.top=`${source.top}px`;
  word.style.fontSize=`${sourceSize}px`;
  const wordBounds=word.getBoundingClientRect();
  const heroSize=Math.min(140,Math.max(56,window.innerWidth*.105));
  const scale=Math.min(heroSize/sourceSize,(window.innerWidth-32)/Math.max(1,wordBounds.width));
  const x=(window.innerWidth-wordBounds.width*scale)/2-source.left;
  const y=(window.innerHeight-wordBounds.height*scale)/2-source.top;
  document.body.classList.add('page-transition-outgoing');
  const transitionValue=savePageTransition(transition);
  const navigationUrl=new URL(transition.url.href);
  navigationUrl.hash=`deadline-transition=${encodeURIComponent(transitionValue)}`;
  backdrop.animate([{opacity:0},{opacity:.97}],{duration:330,easing:'ease-out',fill:'forwards'});
  word.animate([
    {transform:'translate(0,0) scale(1)',letterSpacing:getComputedStyle(link).letterSpacing,opacity:.82},
    {transform:`translate(${x}px,${y}px) scale(${scale})`,letterSpacing:'.015em',opacity:1}
  ],{duration:360,easing:'cubic-bezier(.22,.76,.22,1)',fill:'forwards'});
  window.setTimeout(()=>location.assign(navigationUrl.href),370);
}
function showArrivalTransition(){
  const saved=takePageTransition();
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(!saved||Date.now()-saved.time>3000||saved.path!==location.pathname+location.search)return;
  const target=saved.kind==='region'?document.getElementById('regionName'):document.querySelector('.country-page-head h1');
  if(!target)return;
  const bounds=target.getBoundingClientRect();
  const targetStyle=getComputedStyle(target);
  const {layer,backdrop,word}=createPageTransitionLayer(saved.name);
  word.style.left=`${bounds.left}px`;
  word.style.top=`${bounds.top}px`;
  word.style.fontFamily=targetStyle.fontFamily;
  word.style.fontWeight=targetStyle.fontWeight;
  word.style.fontSize=targetStyle.fontSize;
  word.style.letterSpacing=targetStyle.letterSpacing;
  const wordBounds=word.getBoundingClientRect();
  const targetSize=Math.max(1,parseFloat(targetStyle.fontSize));
  const heroSize=Math.min(140,Math.max(56,window.innerWidth*.105));
  const scale=Math.min(heroSize/targetSize,(window.innerWidth-32)/Math.max(1,wordBounds.width));
  const x=(window.innerWidth-wordBounds.width*scale)/2-bounds.left;
  const y=(window.innerHeight-wordBounds.height*scale)/2-bounds.top;
  target.classList.add('page-transition-target');
  document.body.classList.add('page-transition-arriving');
  backdrop.style.opacity='.97';
  const wordAnimation=word.animate([
    {transform:`translate(${x}px,${y}px) scale(${scale})`,letterSpacing:'.015em'},
    {transform:'translate(0,0) scale(1)',letterSpacing:targetStyle.letterSpacing}
  ],{duration:430,easing:'cubic-bezier(.22,.76,.22,1)',fill:'forwards'});
  backdrop.animate([{opacity:.97},{opacity:.97,offset:.55},{opacity:0}],{duration:430,easing:'ease-out',fill:'forwards'});
  wordAnimation.finished.finally(()=>{target.classList.remove('page-transition-target');layer.remove();document.body.classList.remove('page-transition-arriving')});
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
