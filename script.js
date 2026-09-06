
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
function articleMeta(article){
  return `<span class="country-label">${article.country}</span>${topicMeta(article,true)}`;
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
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch()});
