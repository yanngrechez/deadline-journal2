(()=>{
  'use strict';
  const dialog=document.getElementById('newsletterDialog'),bell=document.querySelector('.newsletter-bell');
  if(!dialog||!bell)return;
  // Keep the bell after the language chooser, regardless of deferred script order.
  bell.parentElement.append(bell);
  const close=dialog.querySelector('.newsletter-close');
  let opener;
  bell.addEventListener('click',()=>{opener=document.activeElement;dialog.showModal();});
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{
    const r=dialog.getBoundingClientRect();
    if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();
  });
  dialog.addEventListener('close',()=>opener?.focus());
  const form=dialog.querySelector('form');
  if(form.dataset.preview==='true')form.addEventListener('submit',event=>{
    event.preventDefault();
    // A preview must never claim a real subscription or transmit an address.
    dialog.querySelector('.newsletter-preview').textContent='Preview only. No email address will be saved or sent.';
  });
  // Production uses the provider's normal form POST so CAPTCHA and confirmation
  // cannot be bypassed. Never send the address to analytics or local storage.
})();
