(()=>{
 'use strict';
 const controls=document.querySelector('.article-sharing');
 if(!controls)return;
 const canonical=document.querySelector('link[rel="canonical"]')?.href;
 const url=new URL(canonical||location.pathname,location.origin).href;
 const title=()=>document.querySelector('#articlePage h1')?.textContent.trim()||'Deadline Journal';
 const translate=text=>window.journalTranslate?.(text)||text;
 const status=controls.querySelector('[role="status"]');
 const native=controls.querySelector('[data-native-share]');
 const copy=controls.querySelector('[data-copy-link]');
 const email=controls.querySelector('[data-email-share]');
 const fallback=controls.querySelector('.article-share-fallback');
 function manualCopy(){
  fallback.hidden=false;
  const input=fallback.querySelector('input');input.value=url;input.focus();input.select();
  status.textContent=translate('Select and copy the link below.');
 }
 async function copyLink(){
  try{
   if(!navigator.clipboard?.writeText){manualCopy();return;}
   await navigator.clipboard.writeText(url);
   fallback.hidden=true;status.textContent=translate('Link copied.');
  }catch{manualCopy();}
 }
 copy.addEventListener('click',copyLink);
 if(typeof navigator.share==='function'){
  native.hidden=false;
  const compact=matchMedia('(max-width:700px)');
  let secondary;
  function arrange(){
   if(compact.matches&&!secondary){
    secondary=document.createElement('details');secondary.className='article-share-more';
    const toggle=document.createElement('summary');toggle.textContent='⋯';toggle.setAttribute('aria-label','Share this article');
    secondary.append(toggle);copy.before(secondary);secondary.append(copy);
   }else if(!compact.matches&&secondary){secondary.before(copy);secondary.remove();secondary=null;}
  }
  arrange();compact.addEventListener('change',arrange);
  document.addEventListener('click',event=>{if(secondary&&!secondary.contains(event.target))secondary.open=false;});
  controls.addEventListener('keydown',event=>{if(event.key==='Escape'&&secondary?.open){secondary.open=false;secondary.querySelector('summary').focus();}});
  copy.addEventListener('click',()=>{if(secondary)secondary.open=false;});
  native.addEventListener('click',async()=>{
   try{await navigator.share({title:title(),url});}
   catch(error){if(error.name!=='AbortError')manualCopy();}
  });
 }else{
  email.hidden=false;
  const emailUrl=()=>{email.href='mailto:?subject='+encodeURIComponent(title())+'&body='+encodeURIComponent(url);};
  emailUrl();email.addEventListener('click',emailUrl);
 }
})();
