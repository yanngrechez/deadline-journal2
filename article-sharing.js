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
