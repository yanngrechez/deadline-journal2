const test=require('node:test'),assert=require('node:assert/strict');
const {feed,renderSignup,settings}=require('../build-newsletter.cjs');
const story={slug:'example-story',title:'A title & a question',dek:'A short subtitle.',author:'A Writer',status:'published',published_at:'2026-09-20T12:00'};
const now=new Date('2026-10-03T12:00:00Z');
const notice={slug:'october-edition',title:'The October edition',message:'A new edition.\n\nRead the stories.',status:'published',kind:'edition',published_at:'2026-10-02T12:00',link:'/'};
test('publication feed excludes drafts, placeholders and future content',()=>{
 const xml=feed({now,articles:[story,{...story,slug:'draft',status:'draft'},{...story,slug:'placeholder',is_placeholder:true},{...story,slug:'future',published_at:'2099-01-01'}],announcements:[notice,{...notice,slug:'draft-notice',status:'draft'}]});
 assert.equal((xml.match(/<item>/g)||[]).length,2);assert(xml.includes('A title &amp; a question'));
 assert(xml.includes('urn:deadlinejournal:article:example-story'));assert(xml.includes('urn:deadlinejournal:announcement:october-edition'));
 assert(xml.includes('https://deadlinejournal.org/example-story'));assert(xml.includes('<category>Edition</category>'));
});
test('edits, cover moves and translation deployments do not change feed IDs or publication dates',()=>{
 const before=feed({now,articles:[story]});const after=feed({now,articles:[{...story,title:'Revised title',updated_at:'2026-10-03',homepage_position:1}]});
 assert.equal(before.match(/<guid.*?<\/guid>/)[0],after.match(/<guid.*?<\/guid>/)[0]);
 assert.equal(before.match(/<pubDate>.*?<\/pubDate>/)[0],after.match(/<pubDate>.*?<\/pubDate>/)[0]);
 assert.equal(before,feed({now:new Date('2026-10-04'),articles:[story]}));
});
test('announcements can share the homepage URL without sharing their identity',()=>{
 const xml=feed({now,articles:[],announcements:[notice,{...notice,kind:'announcement',slug:'call-for-writers'}]});
 assert.equal((xml.match(/<item>/g)||[]).length,2);
 assert.throws(()=>feed({now,articles:[],announcements:[notice,notice]}),/Duplicate/);
 assert.throws(()=>feed({now,articles:[],announcements:[{...notice,link:'javascript:alert(1)'}]}),/must point/);
 assert.throws(()=>feed({now,articles:[{...story,published_at:'invalid'}]}),/valid publication/);
});
test('signup is hidden until a real provider account and delivery verification are configured',()=>{
 assert.deepEqual(renderSignup(),{button:'',dialog:''});
 assert.throws(()=>settings({enabled:true,buttondown_username:'journal'}),/verify confirmation/);
 assert.throws(()=>settings({enabled:true,buttondown_username:'x/evil',delivery_verified:true}),/valid Buttondown/);
 const live=renderSignup({enabled:true,buttondown_username:'journal',delivery_verified:true});
 assert(live.button.includes('aria-haspopup="dialog"'));
 assert(live.dialog.includes('action="https://buttondown.com/api/emails/embed-subscribe/journal" method="post"'));
 assert(live.dialog.includes('type="checkbox"'));assert(live.dialog.includes('required'));
 const preview=renderSignup({}, {preview:true});assert(preview.button);assert(!preview.dialog.includes(' action='));assert(preview.dialog.includes('data-preview="true"'));
});
