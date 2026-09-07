
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

function clearCountryTransition(){
  document.body.classList.remove('country-transitioning');
  document.querySelector('.country-transition-word')?.remove();
}
function startCountryTransition(event,link){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank'||link.hasAttribute('download'))return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  event.preventDefault();
  if(document.body.classList.contains('country-transitioning'))return;
  const destination=link.href;
  const bounds=link.getBoundingClientRect();
  const word=link.cloneNode(true);
  word.removeAttribute('href');
  word.removeAttribute('aria-label');
  word.setAttribute('aria-hidden','true');
  word.className='country-transition-word';
  word.style.left=`${bounds.left}px`;
  word.style.top=`${bounds.top}px`;
  word.style.fontSize=getComputedStyle(link).fontSize;
  document.body.appendChild(word);
  document.body.classList.add('country-transitioning');
  requestAnimationFrame(()=>word.classList.add('is-active'));
  window.setTimeout(()=>location.assign(destination),380);
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
});
document.addEventListener('click',event=>{
  const link=event.target.closest?.('.country-transition-link');
  if(link)startCountryTransition(event,link);
});
window.addEventListener('pageshow',clearCountryTransition);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch()});
