(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.DeadlineMedia=factory();
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const extensions={video:['mp4','webm'],poster:['jpg','jpeg','png','webp','avif','gif','svg'],subtitles:['vtt']};
  const languages={en:'English',es:'Español',fr:'Français',de:'Deutsch',nl:'Nederlands',hu:'Magyar'};
  function mediaPath(value,kind){
    if(typeof value!=='string'||!value.startsWith('/media/'))return '';
    let decoded;try{decoded=decodeURIComponent(value)}catch{return '';}
    if(/[\\?#\x00-\x1f]/.test(decoded)||decoded.slice(1).split('/').some(p=>!p||p==='.'||p==='..'))return '';
    const ext=decoded.split('.').pop().toLowerCase();
    return extensions[kind]?.includes(ext)?value:'';
  }
  function video(section){
    const src=mediaPath(section.video,'video');if(!src)return '';
    const poster=mediaPath(section.poster,'poster'),subtitles=mediaPath(section.subtitles,'subtitles');
    const ratio=['16/9','9/16','1/1'].includes(section.aspect_ratio)?section.aspect_ratio:'16/9';
    const lang=Object.hasOwn(languages,section.subtitles_language)?section.subtitles_language:'en';
    const [width,height]=ratio.split('/').map(Number);
    return `<figure class="article-inline-video" data-ratio="${ratio}"><video controls playsinline preload="none" width="${width*80}" height="${height*80}" aria-label="${escape(section.title||section.caption||'Video')}"${poster?` poster="${escape(poster)}"`:''}><source src="${escape(src)}" type="${src.toLowerCase().endsWith('.webm')?'video/webm':'video/mp4'}">${subtitles?`<track kind="captions" src="${escape(subtitles)}" srclang="${lang}" label="${languages[lang]}">`:''}<a href="${escape(src)}">${escape(section.title||'Video')}</a></video>${section.caption||section.credit?`<figcaption>${section.caption?`<span>${escape(section.caption)}</span>`:''}${section.credit?`<cite>${escape(section.credit)}</cite>`:''}</figcaption>`:''}</figure>`;
  }
  return {video,mediaPath};
});
