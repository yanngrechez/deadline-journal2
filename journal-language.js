(()=>{
'use strict';
// Cached translations approved in the local preview. No API requests or credentials in the browser.
const languages=['en','es','fr','de','nl','hu'];
const availableLanguages=['en','es','fr'];
const key='deadline-language';let language='en';try{const saved=localStorage.getItem(key);if(availableLanguages.includes(saved))language=saved}catch{}
const decode=document.createElement('textarea');const plain=html=>{decode.innerHTML=String(html).replace(/<[^>]*>/g,'');return decode.value};
const norm=s=>plain(s).replace(/\s+/g,' ').trim();
const catalog=new Map((window.JOURNAL_LANGUAGE_CATALOG||[]).map(row=>[norm(row[0]).toLowerCase(),row]));
const countryNames=new Map((window.DEADLINE_COUNTRIES||[]).map(c=>[c.name.toLowerCase(),c.code]));
const originals=new WeakMap(),attributes=new WeakMap(),blocks=new WeakMap();
const labels={
 en:{Languages:'Languages',About:'About',Write:'Write for Us',Search:'Search',By:'By',Desk:'COUNTRY DESK',article:'article',articles:'articles',from:'from',flag:'flag',view:'View stories',country:'country',countries:'countries'},
 es:{Languages:'Idiomas',About:'Acerca de',Write:'Colabora',Search:'Buscar',By:'Por',Desk:'SECCIÓN DEL PAÍS',article:'artículo',articles:'artículos',from:'de',flag:'Bandera',view:'Ver artículos',country:'país',countries:'países'},
 fr:{Languages:'Langues',About:'À propos',Write:'Contribuer',Search:'Rechercher',By:'Par',Desk:'RUBRIQUE PAYS',article:'article',articles:'articles',from:'de',flag:'Drapeau',view:'Voir les articles',country:'pays',countries:'pays'},
 de:{Languages:'Sprachen',About:'Über uns',Write:'Mitmachen',Search:'Suche',By:'Von',Desk:'LÄNDERRUBRIK',article:'Artikel',articles:'Artikel',from:'aus',flag:'Flagge',view:'Artikel ansehen',country:'Land',countries:'Ländern'},
 nl:{Languages:'Talen',About:'Over ons',Write:'Schrijf mee',Search:'Zoeken',By:'Door',Desk:'LANDENRUBRIEK',article:'artikel',articles:'artikelen',from:'uit',flag:'Vlag',view:'Artikelen bekijken',country:'land',countries:'landen'},
 hu:{Languages:'Nyelvek',About:'Rólunk',Write:'Írj nekünk',Search:'Keresés',By:'Szerző:',Desk:'ORSZÁGROVAT',article:'cikk',articles:'cikk',from:'',flag:'Zászló',view:'Cikkek megtekintése',country:'országból',countries:'országból'}
};
const notices={
 en:'translation are generated automatically and may contain errors or inaccuracies',
 es:'Las traducciones se generan automáticamente y pueden contener errores o imprecisiones.',
 fr:'Les traductions sont générées automatiquement et peuvent contenir des erreurs ou des inexactitudes.',
 de:'Die Übersetzungen werden automatisch erstellt und können Fehler oder Ungenauigkeiten enthalten.',
 nl:'De vertalingen worden automatisch gegenereerd en kunnen fouten of onnauwkeurigheden bevatten.',
 hu:'A fordítások automatikusan készülnek, és hibákat vagy pontatlanságokat tartalmazhatnak.'
};
function translate(value){
 if(typeof value!=='string'||language==='en'||!value.trim())return value;
 const trimmed=norm(value),ui=labels[language];
 const shortcut={'languages':ui.Languages,'about':ui.About,'write for us':ui.Write,'search':ui.Search};
 if(shortcut[trimmed.toLowerCase()])return shortcut[trimmed.toLowerCase()];
 const entry=catalog.get(trimmed.toLowerCase());
 if(entry?.[languages.indexOf(language)])return plain(entry[languages.indexOf(language)]);
 const code=countryNames.get(trimmed.toLowerCase());
 if(code)return new Intl.DisplayNames([language==='nl'?'nl-NL':language],{type:'region'}).of(code);
 let m;
 if((m=trimmed.match(/^Voices from (\d+) countr(?:y|ies), and counting\.$/))){
 const n=m[1];return {es:`Voces de ${n} ${n==='1'?'país':'países'}, y seguimos sumando.`,fr:`Des voix de ${n} pays, et ce n’est qu’un début.`,de:`Stimmen aus ${n} ${n==='1'?'Land':'Ländern'} – und es werden mehr.`,nl:`Stemmen uit ${n} ${n==='1'?'land':'landen'}, en er komen er meer bij.`,hu:`Hangok ${n} országból – és egyre több helyről.`}[language];
 }
 if((m=trimmed.match(/^(\d+) (?:story|stories|article|articles)$/)))return `${m[1]} ${m[1]==='1'?ui.article:ui.articles}`;
 if((m=trimmed.match(/^(\d+) stories? from (.+)$/)))return `${translate(m[1]+' stories')} · ${translate(m[2])}`;
 if((m=trimmed.match(/^(.+) — (\d+) articles?$/)))return `${translate(m[1])} — ${translate(m[2]+' articles')}`;
 if((m=trimmed.match(/^View (.+) stories$/)))return `${ui.view}: ${translate(m[1])}`;
 if((m=trimmed.match(/^(.+) flag$/)))return `${ui.flag}: ${translate(m[1])}`;
 if((m=trimmed.match(/^BY\s+(.+)$/i)))return ui.By+' '+translate(m[1]);
 if(trimmed.startsWith('COUNTRY DESK ·'))return ui.Desk+' · ';
 if(trimmed.includes(' | Deadline Journal'))return translate(trimmed.replace(' | Deadline Journal',''))+' | Deadline Journal';
 const date=trimmed.match(/\b(\d{1,2}) (January|February|March|April|May|June|July|August|September|October|November|December) (\d{4})\b/);
 if(date){const formatted=new Intl.DateTimeFormat(language==='nl'?'nl-NL':language,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${date[2]} ${date[1]}, ${date[3]} 12:00:00 GMT`));return trimmed.replace(date[0],formatted).replace(/^BY /,ui.By+' ')}
 return value;
}
window.journalTranslate=translate;
const utility=document.querySelector('.utility-links');
if(!utility)return;
const chooser=document.createElement('div');chooser.className='journal-languages';chooser.dataset.noTranslate='true';
chooser.innerHTML=`<button class="language-toggle" type="button" aria-expanded="false" aria-controls="journalLanguagePanel"><svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><circle cx="10" cy="10" r="8"/><ellipse cx="10" cy="10" rx="3.4" ry="8"/><path d="M2 10h16M4 5.5h12M4 14.5h12"/></svg><span class="language-toggle-label">Languages</span><svg class="language-chevron" viewBox="0 0 10 6" width="8" height="5" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="m1 1 4 4 4-4"/></svg></button><div class="language-panel" id="journalLanguagePanel" hidden><div class="language-panel-title">Languages</div><div class="language-options" role="group" aria-label="Journal language"><button type="button" lang="en" data-choice="en"><span>English</span><small class="english-origin">Original</small><span class="language-check" aria-hidden="true">✓</span></button><button type="button" lang="es" data-choice="es"><span>Español</span><span class="language-check" aria-hidden="true">✓</span></button><button type="button" lang="fr" data-choice="fr"><span>Français</span><span class="language-check" aria-hidden="true">✓</span></button><button type="button" lang="de" data-choice="de"><span>Deutsch</span><span class="language-check" aria-hidden="true">✓</span></button><button type="button" lang="nl-NL" data-choice="nl"><span>Nederlands <small>(Nederland)</small></span><span class="language-check" aria-hidden="true">✓</span></button><button type="button" lang="hu" data-choice="hu"><span>Magyar</span><span class="language-check" aria-hidden="true">✓</span></button></div><p class="language-panel-note"></p></div>`;
utility.append(chooser);
chooser.querySelectorAll('[data-choice]').forEach(button=>{if(!availableLanguages.includes(button.dataset.choice)){button.disabled=true;button.title='Coming soon';}});
const trigger=chooser.querySelector('.language-toggle'),panel=chooser.querySelector('.language-panel');

const live=document.createElement('div');live.className='visually-hidden';live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.dataset.noTranslate='true';document.body.append(live);
const excluded='script,style,noscript,template,cite,.article-sources-content,[translate="no"],[data-no-translate],.page-transition-glyph';
function visit(el){
 if(el.nodeType===Node.TEXT_NODE){
   if(!originals.has(el))originals.set(el,el.nodeValue);
   const source=originals.get(el),replacement=translate(source);
   const next=replacement===source?source:(source.match(/^\s*/)[0]+replacement+source.match(/\s*$/)[0]);
   if(el.nodeValue!==next)el.nodeValue=next;
   return;
 }
 if(el.nodeType!==Node.ELEMENT_NODE||el.matches(excluded))return;
 if(el===article&&!articleTranslationAvailable&&language!=='en'){const selected=language;language='en';visit(el);language=selected;return;}
 for(const name of ['placeholder','aria-label','title','alt','data-tooltip'])if(el.hasAttribute(name)){
   let saved=attributes.get(el);if(!saved){saved={};attributes.set(el,saved)}
   if(!(name in saved))saved[name]=el.getAttribute(name);
   const next=translate(saved[name]);if(el.getAttribute(name)!==next)el.setAttribute(name,next);
 }
 // Whole paragraphs can contain emphasis; use a curated HTML translation, preserving citations separately.
 if(el.tagName==='P'){
   if(!blocks.has(el))blocks.set(el,el.innerHTML);
   const source=blocks.get(el),entry=catalog.get(norm(source).toLowerCase());
   if(entry){const next=language==='en'?source:(entry[languages.indexOf(language)]||source);if(el.innerHTML!==next)el.innerHTML=next;return;}
 }
 for(const child of [...el.childNodes])visit(child);
}
const sourceDocumentTitle=document.title;
const article=document.getElementById('articlePage');
const articleSegments=article?[...article.querySelectorAll('h1,.article-dek,.body p,figcaption span')].map(el=>el.innerHTML):[];
const articleTranslationAvailable=articleSegments.every(html=>!norm(html)||catalog.has(norm(html).toLowerCase()));
let articleNotice;
if(article&&!articleTranslationAvailable){articleNotice=document.createElement('p');articleNotice.className='translation-availability';articleNotice.dataset.noTranslate='true';article.before(articleNotice);}
let observer;let scheduled=false;
function apply(announce=false){
 observer?.disconnect();document.documentElement.lang=language==='nl'?'nl-NL':language;
 if(article){article.lang=articleTranslationAvailable?language:'en';}
 if(articleNotice){articleNotice.hidden=language==='en';articleNotice.textContent=language==='es'?'La traducción de esta versión aún no está disponible. Se muestra el artículo original en inglés.':'La traduction de cette version n’est pas encore disponible. L’article original en anglais est affiché.';}
 visit(document.body);
 document.querySelectorAll('.article-sources-content').forEach(el=>{el.setAttribute('translate','no')});
 chooser.querySelector('.language-toggle-label').textContent=translate('Languages');
 chooser.querySelector('.language-panel-title').textContent=translate('Languages');
 chooser.querySelector('.language-panel-note').textContent=notices[language];
 chooser.querySelector('.english-origin').textContent=language==='fr'?'Original':'Original';
 chooser.querySelector('.language-options').setAttribute('aria-label',labels[language].Languages);
 chooser.querySelectorAll('[data-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.choice===language)));
 if(announce)live.textContent=labels[language].Languages+': '+chooser.querySelector('[data-choice="'+language+'"] span').textContent;
 document.title=translate(sourceDocumentTitle);
 observer?.observe(document.body,{childList:true,subtree:true,characterData:true});
}
function close(focus=false){panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus()}
trigger.addEventListener('click',()=>{const opening=panel.hidden;panel.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening))});
trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();panel.hidden=false;trigger.setAttribute('aria-expanded','true');panel.querySelector('button').focus()}});
chooser.addEventListener('keydown',e=>{if(e.key==='Escape'){close(true);e.preventDefault()}});
document.addEventListener('click',e=>{if(!chooser.contains(e.target))close()});
chooser.addEventListener('focusout',event=>{if(event.relatedTarget&&!chooser.contains(event.relatedTarget))close()});
chooser.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click',()=>{
 if(!availableLanguages.includes(b.dataset.choice))return;
 language=b.dataset.choice;try{localStorage.setItem(key,language)}catch{}
 apply(true);sortCountries();close(true);
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.querySelector('main')?.animate([{opacity:.6},{opacity:1}],{duration:180,easing:'ease-out'});
}));
function sortCountries(){const list=document.getElementById('countryDirectory');if(!list)return;observer?.disconnect();[...list.children].sort((a,b)=>a.querySelector('strong').textContent.localeCompare(b.querySelector('strong').textContent,language)).forEach(a=>list.append(a));observer?.observe(document.body,{childList:true,subtree:true,characterData:true})}
// Match translated headlines in search without changing canonical content or routes.
window.renderSearch=function(q){const t=(q||'').toLocaleLowerCase(language),out=document.getElementById('searchResults');if(!out)return;const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));out.innerHTML=(window.DEADLINE_ARTICLES||[]).filter(a=>!t||[a.title,a.country,a.author,a.region,a.dek,...(a.topics||[])].flatMap(x=>[x,translate(String(x||''))]).join(' ').toLocaleLowerCase(language).includes(t)).map(a=>`<a class="search-result" href="${articleUrl(a)}"><div><span>${escape(a.country)}</span> · <span>${escape(a.region)}</span></div><h3>${escape(a.title)}</h3><p>${escape(a.dek)}</p></a>`).join('');apply()};
apply();sortCountries();
observer=new MutationObserver(()=>{if(!scheduled){scheduled=true;queueMicrotask(()=>{scheduled=false;apply()})}});observer.observe(document.body,{childList:true,subtree:true,characterData:true});
})();
