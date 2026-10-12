const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {video,mediaPath}=require('../article-media.js');
const {validateVideos}=require('../build-media.cjs');
test('video blocks use safe local uploads, native playback and escaped captions',()=>{
 const html=video({video:'/media/clip.mp4',title:'A "quote" & clip',poster:'/media/still.jpg',caption:'<script>bad</script>',credit:'Agency',subtitles:'/media/clip.vtt',subtitles_language:'fr',aspect_ratio:'9/16'});
 for(const expected of ['controls playsinline preload="none"','data-ratio="9/16"','poster="/media/still.jpg"','type="video/mp4"','kind="captions"','srclang="fr"','&quot;quote&quot;','&lt;script&gt;','<cite>Agency</cite>'])assert(html.includes(expected),expected);
 assert(!/autoplay|loop|<script>/.test(html));
 assert(video({video:'/media/clip.webm'}).includes('type="video/webm"'));
 for(const src of ['javascript:alert(1)','https://example.com/a.mp4','/media/../secret.mp4','/media/%2e%2e/secret.mp4','/media/a.mp4?x=1','/media/clip.mov','/media//clip.mp4','/media/clip.mp4%00'])assert.equal(mediaPath(src,'video'),'');
 assert.equal(video({video:'javascript:alert(1)'}),'');
});
test('publishing validates uploaded files, host size limits and subtitle format',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'deadline-video-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 fs.mkdirSync(path.join(root,'media'));
 const section={type:'video',video:'/media/clip.mp4',subtitles:'/media/clip.vtt'};
 const check=()=>validateVideos(root,[{slug:'story',sections:[section]}]);
 assert.throws(check,/missing/);
 fs.writeFileSync(path.join(root,'media/clip.mp4'),'small fixture');
 fs.writeFileSync(path.join(root,'media/clip.vtt'),'WEBVTT\n\n00:00.000 --> 00:01.000\nSpeech.\n');check();
 fs.writeFileSync(path.join(root,'media/clip.vtt'),'not subtitles');assert.throws(check,/WebVTT/);
 delete section.subtitles;
 fs.truncateSync(path.join(root,'media/clip.mp4'),25*1024*1024+1);assert.throws(check,/25 MiB/);
 fs.truncateSync(path.join(root,'media/clip.mp4'),0);assert.throws(check,/non-empty/);
});
