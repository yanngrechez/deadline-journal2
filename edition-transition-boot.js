// Parser-blocking on the homepage and edition pages only. Links remain ordinary
// navigations: no fetch/DOM replacement, click interception or navigation delay.
(()=>{
 if(location.hash==='#editions')document.documentElement.classList.add('edition-anchor-entry');
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const editionPath=path=>/^\/editions\/[a-z0-9]+(?:-[a-z0-9]+)*\/?$/.test(path);
 const path=value=>{try{return new URL(value,location.href).pathname}catch{return ''}};
 const isPair=(from,to)=>(from==='/'&&editionPath(to))||(editionPath(from)&&to==='/');
 addEventListener('pageswap',event=>{
  if(!event.viewTransition)return;
  const to=path(event.activation?.entry?.url||'');
  if(reduced()||!isPair(location.pathname,to)){event.viewTransition.skipTransition();return;}
  document.documentElement.classList.add('edition-native-transition');
  event.viewTransition.finished.finally(()=>document.documentElement.classList.remove('edition-native-transition'));
 });
 addEventListener('pagereveal',event=>{
  if(!event.viewTransition){
   if(editionPath(location.pathname)&&!reduced())document.documentElement.classList.add('edition-fallback-arrival');
   return;
  }
  const from=path(window.navigation?.activation?.from?.url||document.referrer);
  if(reduced()||!isPair(from,location.pathname)){event.viewTransition.skipTransition();return;}
  document.documentElement.classList.add('edition-native-transition');
  event.viewTransition.finished.finally(()=>document.documentElement.classList.remove('edition-native-transition'));
 });
 // Older browsers keep navigation intact and reveal the destination gently.
 if(!('onpagereveal' in window)&&editionPath(location.pathname)&&!reduced())document.documentElement.classList.add('edition-fallback-arrival');
 const prefetched=new Set();
 document.addEventListener('pointerover',event=>{
  const link=event.target.closest?.('a.edition-card');
  if(!link||prefetched.has(link.href)||navigator.connection?.saveData)return;
  prefetched.add(link.href);
  const hint=document.createElement('link');hint.rel='prefetch';hint.href=link.href;document.head.append(hint);
 },{passive:true});
})();
