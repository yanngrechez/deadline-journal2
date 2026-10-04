'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {escape,plain}=require('./seo.cjs');
const base='https://deadlinejournal.org';

function settings(config={}){
  if(config.enabled!==true)return {enabled:false};
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(config.buttondown_username||''))throw Error('Email updates: enter a valid Buttondown username before enabling signup.');
  if(config.delivery_verified!==true)throw Error('Email updates: verify confirmation and delivery before enabling signup.');
  return {enabled:true,action:'https://buttondown.com/api/emails/embed-subscribe/'+config.buttondown_username};
}
function renderSignup(config={}, {preview=false}={}){
  const active=settings(config);
  if(!active.enabled&&!preview)return {button:'',dialog:''};
  const button='<button class="newsletter-bell" type="button" aria-label="Email updates" title="Email updates" aria-haspopup="dialog" aria-controls="newsletterDialog"><svg width="17" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4M12 2V1"/></svg></button>';
  const dialog=`<dialog id="newsletterDialog" class="newsletter-dialog" aria-labelledby="newsletterTitle" aria-describedby="newsletterDescription">
<button class="newsletter-close" type="button" aria-label="Close email signup"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="m4 4 12 12M16 4 4 16"/></svg></button>
<div class="newsletter-eyebrow">DEADLINE JOURNAL</div><h2 id="newsletterTitle">Stay close to the story.</h2>
<p id="newsletterDescription">New articles, new editions, and occasional announcements. Delivered to your inbox.</p>
<form class="newsletter-form"${active.enabled&&!preview?` action="${escape(active.action)}" method="post"`: ' method="dialog" data-preview="true"'}>
<label for="newsletterEmail">Email address</label><input id="newsletterEmail" name="email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" maxlength="254" required autofocus>
<input type="hidden" name="embed" value="1">
<label class="newsletter-consent"><input type="checkbox" name="metadata__email-consent" value="articles-editions-announcements" required><span>I agree to receive emails from Deadline Journal.</span></label>
<button class="newsletter-submit" type="submit">Keep me updated</button>
<p class="newsletter-note">Confirm your subscription by email. Unsubscribe at any time.</p>
<p class="newsletter-provider">Email subscriptions are managed by <a href="https://buttondown.com/legal/privacy" target="_blank" rel="noopener noreferrer">Buttondown</a>.</p>
${preview?'<p class="newsletter-preview" role="status">Preview only. No email address will be saved or sent.</p>':''}</form></dialog>`;
  return {button,dialog};
}
function readAnnouncements(root){
  const dir=path.join(root,'content/announcements');
  return fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'))):[];
}
function date(value,label){
  // CMS date-times without an offset use UTC, consistently across build machines.
  const raw=String(value||'');
  const normalized=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw)?raw+'Z':raw;
  const d=new Date(normalized);
  if(!raw||!Number.isFinite(d.getTime()))throw Error('Email feed: add a valid publication date for '+label);
  return d;
}
function feed({articles,announcements=[],now=new Date()}){
  const items=[],ids=new Set();
  function add(item){
    if(ids.has(item.id))throw Error('Duplicate email feed identity: '+item.id);
    ids.add(item.id);items.push(item);
  }
  for(const a of articles){
    if(a.status!=='published'||a.is_placeholder)continue;
    const published=date(a.published_at,a.slug);
    if(published>now)continue;
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug||''))throw Error('Invalid article slug in email feed');
    add({id:'urn:deadlinejournal:article:'+a.slug,title:a.title,description:plain(a.dek||''),published,
      link:base+'/'+a.slug,category:'Article',author:a.author||'Deadline Journal'});
  }
  for(const a of announcements){
    if(a.status!=='published')continue;
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug||''))throw Error('Invalid announcement ID');
    if(!['edition','announcement'].includes(a.kind)||!a.title?.trim()||!a.message?.trim())throw Error('An email announcement needs a type, title and message.');
    const published=date(a.published_at,a.slug);if(published>now)continue;
    const link=new URL(a.link||'/',base);
    if(link.origin!==base||link.username||link.password)throw Error('Announcement links must point to deadlinejournal.org');
    add({id:'urn:deadlinejournal:announcement:'+a.slug,title:a.title,description:a.message,published,
      link:link.href,category:a.kind==='edition'?'Edition':'Announcement',author:'Deadline Journal'});
  }
  items.sort((a,b)=>b.published-a.published||a.id.localeCompare(b.id));
  const content=items.map(i=>{
    const paragraphs=i.description.split(/\n\s*\n/).map(p=>`<p>${escape(p).replace(/\n/g,'<br>')}</p>`).join('');
    const html=`${paragraphs}<p><a href="${escape(i.link)}">${i.category==='Article'?'Read the article':'Visit Deadline Journal'}</a></p>`;
    return `<item><title>${escape(i.title)}</title><link>${escape(i.link)}</link><guid isPermaLink="false">${escape(i.id)}</guid><pubDate>${i.published.toUTCString()}</pubDate><dc:creator>${escape(i.author)}</dc:creator><category>${i.category}</category><description>${escape(i.description)}</description><content:encoded>${escape(html)}</content:encoded></item>`;
  }).join('\n');
  return '<?xml version="1.0" encoding="UTF-8"?>\n'+
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>'+
    '<title>Deadline Journal</title><link>'+base+'/</link><description>New reporting, editions, and announcements from Deadline Journal.</description><language>en</language>'+
    '<atom:link href="'+base+'/feed.xml" rel="self" type="application/rss+xml"/>'+
    (items.length?'<lastBuildDate>'+items[0].published.toUTCString()+'</lastBuildDate>':'')+'\n'+content+'\n</channel></rss>\n';
}
module.exports={settings,renderSignup,readAnnouncements,feed};
