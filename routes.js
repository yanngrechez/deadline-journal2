(function(root){
  'use strict';
  const countries=typeof module==='object'&&module.exports?require('./countries-data.js'):root.DEADLINE_COUNTRIES;
  const regions=Object.freeze({
    'Europe':'europe',
    'Americas':'americas',
    'Middle East & North Africa':'middle-east-north-africa',
    'Sub-Saharan Africa':'sub-saharan-africa',
    'Asia-Pacific':'asia-pacific',
    'Actors':'actors'
  });
  const reserved=Object.freeze(['index','about','write','article','region','country','search','latest','404','api','admin','assets','media','flags','content','functions','dist','node_modules','robots','sitemap','favicon','data','script','styles','analytics','routes','transition-boot','countries-data','world-map-data',...Object.values(regions),...countries.map(country=>country.slug)]);
  function pathKey(pathname){
    try{return decodeURIComponent(pathname).replace(/\/index\.html$/,'').replace(/\/$/,'').replace(/\.html$/,'')}catch(error){return pathname}
  }
  function regionName(name){
    if(name==='North America'||name==='Latin America')return 'Americas';
    return Object.hasOwn(regions,name)?name:null;
  }
  function articleUrl(article){return '/'+encodeURIComponent(typeof article==='string'?article:article.slug)}
  function regionUrl(name){const value=regionName(name);return value?'/'+regions[value]:null}
  function countryUrl(country){const item=typeof country==='string'?countries.find(c=>c.code===country.toUpperCase()||c.name.toLowerCase()===country.toLowerCase()):country;return item?'/'+item.slug:null}
  function resolve(url,articles=[]){
    const key=pathKey(url.pathname);
    if(key===''||key==='/index')return {kind:'home'};
    if(key==='/article')return {kind:'article',slug:url.searchParams.get('slug')};
    if(key==='/region')return {kind:'region',name:regionName(url.searchParams.get('region'))};
    if(key==='/country'){const value=url.searchParams.get('country')||'';const country=countries.find(c=>c.code===value.toUpperCase()||c.name.toLowerCase()===value.toLowerCase());return {kind:'country',code:country?.code||null}}
    const country=countries.find(c=>key==='/'+c.slug);
    if(country)return {kind:'country',code:country.code};
    if(key==='/about'||key==='/write')return {kind:key.slice(1)};
    const name=Object.keys(regions).find(name=>key==='/'+regions[name]);
    if(name)return {kind:'region',name};
    const article=articles.find(article=>key==='/'+article.slug);
    return article?{kind:'article',slug:article.slug}:{kind:'other'};
  }
  const routes={regions,reserved,pathKey,regionName,articleUrl,regionUrl,countryUrl,resolve};
  if(typeof module==='object'&&module.exports)module.exports=routes;
  root.DeadlineRoutes=routes;
})(typeof window!=='undefined'?window:globalThis);
