'use strict';
const origin='https://deadlinejournal.org';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
function date(value){
  if(!value||!/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)||!Number.isFinite(Date.parse(value)))return undefined;
  // CMS timestamps without an offset do not establish a timezone.
  return /(?:Z|[+-]\d\d:\d\d)$/.test(value)?value:value.slice(0,10);
}
// Last modification is an editorial fact, never the build or publication time.
function modified(article,now=new Date()){
 const value=date(article.updated_at);
 const published=date(article.published_at);
 if(!value||value.slice(0,10)>now.toISOString().slice(0,10))return undefined;
 if(published&&value.slice(0,10)<published.slice(0,10))return undefined;
 return value;
}
const organization={'@type':'Organization','@id':origin+'/#organization',name:'Deadline Journal',url:origin+'/',logo:origin+'/favicon.svg',sameAs:['https://www.instagram.com/deadlinejournal/','https://www.tiktok.com/@deadlinejournal']};
const website={'@type':'WebSite','@id':origin+'/#website',name:'Deadline Journal',url:origin+'/',inLanguage:'en',publisher:{'@id':organization['@id']}};
function decorate(html,{route,title,description,index=true,article,type='WebPage',breadcrumbs=[]}){
 const url=origin+route;
 const desc=plain(description);
 const page={'@type':type,'@id':url+'#webpage',url,name:title,description:desc,inLanguage:'en',isPartOf:{'@id':website['@id']}};
 const graph=[organization,website,page];
 if(route!=='/'){
  const trail=[{name:'Deadline Journal',route:'/'},...breadcrumbs,{name:article?article.title:title.replace(/ \| Deadline Journal$/,''),route}];
  const breadcrumb={'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:trail.map((item,i)=>({'@type':'ListItem',position:i+1,name:item.name,item:origin+item.route}))};
  page.breadcrumb={'@id':breadcrumb['@id']};graph.push(breadcrumb);
 }
 if(article&&index){
  const entry={'@type':'Article','@id':url+'#article',headline:article.title,description:desc,url,mainEntityOfPage:{'@id':page['@id']},inLanguage:'en',author:{'@type':'Person',name:article.author},publisher:{'@id':organization['@id']},datePublished:date(article.published_at),dateModified:modified(article),articleSection:[article.region,...article.topics].filter(Boolean)};
  // Image previews were explicitly disabled by the publisher. Do not grant
  // a separate permission by including article photos in structured data.
  graph.push(entry);
 }
 html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${escape(title)}</title>`)
  .replace(/<link\s+rel="canonical"[^>]*>/gi,'')
  .replace(/<meta\s+(?:name="(?:description|robots|twitter:[^"]*)"|property="(?:og|article):[^"]*")[^>]*>/gi,'')
  .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi,'');
 const tags=[`<link rel="canonical" href="${url}">`,`<meta name="description" content="${escape(desc)}">`,`<meta name="robots" content="${index?'':'noindex,follow,'}max-image-preview:none">`,
  ...Object.entries({'og:site_name':'Deadline Journal','og:title':title,'og:description':desc,'og:url':url,'og:type':article?'article':'website','og:locale':'en_GB'}).map(([name,value])=>`<meta property="${name}" content="${escape(value)}">`),
  '<meta name="twitter:card" content="summary">',`<meta name="twitter:title" content="${escape(title)}">`,`<meta name="twitter:description" content="${escape(desc)}">`,
  `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph},null,2).replace(/</g,'\\u003c')}</script>`];
 return html.replace('</head>',tags.join('\n')+'\n</head>');
}
module.exports={decorate,plain,date,modified,escape};
