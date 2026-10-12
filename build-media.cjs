const fs=require('node:fs'),path=require('node:path');
const {mediaPath}=require('./article-media.js');
function validateVideos(root,articles){
  for(const article of articles)for(const [index,section] of (article.sections||[]).entries()){
    if(section?.type!=='video')continue;
    const label=`${article.slug}, Video section ${index+1}`;
    for(const key of ['video','poster','subtitles']){
      if(key!=='video'&&!section[key])continue;
      const src=mediaPath(section[key],key);
      if(!src)throw Error(`${label}: choose a valid uploaded ${key} file in Pages CMS.`);
      const file=path.join(root,decodeURIComponent(src));
      if(!fs.existsSync(file)||!fs.statSync(file).isFile())throw Error(`${label}: missing ${src}. Upload it before publishing.`);
      const size=fs.statSync(file).size;
      if(!size||size>25*1024*1024)throw Error(`${label}: ${src} must be non-empty and no larger than 25 MiB. Compress the clip before uploading.`);
      if(key==='subtitles'&&!/^\uFEFF?WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(fs.readFileSync(file,'utf8')))throw Error(`${label}: subtitles must be a WebVTT file starting with WEBVTT.`);
    }
    if(section.aspect_ratio&&!['16/9','9/16','1/1'].includes(section.aspect_ratio))throw Error(`${label}: choose Landscape, Portrait or Square.`);
  }
}
module.exports={validateVideos};
