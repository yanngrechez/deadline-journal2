(function(){
  'use strict';
  const hosts=['deadlinejournal.org','www.deadlinejournal.org'];
  const params=new URLSearchParams(location.search);
  if(!hosts.includes(location.hostname)||params.has('preview')||params.has('verify'))return;

  // This is the public ingestion token, not a personal API key.
  const token='phc_xokMcWhGooi6hqx2pjxFj34ABHn7NU89EcQBVw9ji8Pq';
  const consentKey='deadline-analytics-consent-v1';
  const doNotTrack=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';
  let consent=null;
  try{consent=localStorage.getItem(consentKey)}catch(error){}
  if(doNotTrack)consent='declined';
  let sdk=null,loading=false,started=false,stopReading=null,readingState=null;
  let banner,settingsButton,previousFocus;
  const allowedEvents=new Set(['$pageview','$pageleave','article_read_progress','article_engaged','article_read_time']);

  function cleanUrl(value,referrer=false){
    if(!value||value==='$direct')return value||'';
    try{
      const url=new URL(value,location.origin);
      if(!hosts.includes(url.hostname))return referrer?url.origin:'';
      url.hostname='deadlinejournal.org';
      url.hash='';
      url.pathname=url.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
      if(url.pathname==='/index')url.pathname='/';
      const kept=new URLSearchParams();
      const routeParam={'/article':'slug','/region':'region','/country':'country'}[url.pathname];
      const keys=[routeParam,...(referrer?[]:['utm_source','utm_medium','utm_campaign','utm_content','utm_term'])].filter(Boolean);
      keys.forEach(key=>{if(url.searchParams.has(key))kept.set(key,url.searchParams.get(key).slice(0,300))});
      url.search=kept.toString();
      return url.href;
    }catch(error){return ''}
  }

  function pageProperties(){
    const url=new URL(cleanUrl(location.href));
    const type={'/':'home','/article':'article','/region':'region','/country':'country','/about':'about','/write':'write'}[url.pathname]||'other';
    const article=type==='article'?(window.DEADLINE_ARTICLES||[]).find(item=>item.slug===params.get('slug')):null;
    const properties={page_type:type,page_path:url.pathname,$pathname:url.pathname,$current_url:url.href,$title:document.title};
    if(type==='region')properties.region=params.get('region');
    if(type==='country')properties.country_code=params.get('country');
    if(type==='article')properties.article_found=Boolean(article);
    if(article)Object.assign(properties,{
      article_slug:article.slug,article_title:article.title,article_author:article.author,
      article_region:article.region,article_country:article.country,
      article_country_code:typeof countryForArticle==='function'?countryForArticle(article)?.code:null,
      article_topics:article.topics||[],is_placeholder:Boolean(article.is_placeholder)
    });
    return properties;
  }

  function beforeSend(event){
    if(consent!=='accepted'||doNotTrack||!allowedEvents.has(event.event))return null;
    Object.assign(event.properties,pageProperties());
    // Strip transition JSON, arbitrary query values and external referrer paths.
    [event.properties,event.properties.$set,event.properties.$set_once].filter(Boolean).forEach(properties=>{
      Object.keys(properties).forEach(key=>{
        if(/url|referrer/i.test(key)&&typeof properties[key]==='string'){
          properties[key]=cleanUrl(properties[key],/referr/i.test(key));
        }
      });
    });
    return event;
  }

  function capture(name,properties={},options){
    if(consent==='accepted'&&sdk&&!doNotTrack){
      sdk.capture(name,{...pageProperties(),...properties},options);
    }
  }

  function trackArticle(){
    if(!pageProperties().article_found)return ()=>{};
    const body=document.querySelector('#articlePage .body');
    if(!body)return ()=>{};
    readingState=readingState||{sent:new Set(),activeMs:0,reportedMs:0,engaged:false,visitId:crypto.randomUUID()};
    const state=readingState;
    let lastTick=performance.now(),lastActivity=lastTick;
    function visibleBody(){
      const rect=body.getBoundingClientRect();
      return !document.hidden&&rect.bottom>0&&rect.top<innerHeight;
    }
    function measureProgress(options){
      if(!visibleBody())return;
      const rect=body.getBoundingClientRect();
      const depth=Math.min(100,Math.max(0,(innerHeight-rect.top)/Math.max(1,rect.height)*100));
      [25,50,75,100].forEach(milestone=>{
        if(depth>=milestone&&!state.sent.has(milestone)){
          state.sent.add(milestone);
          capture('article_read_progress',{article_visit_id:state.visitId,percent:milestone},options);
        }
      });
    }
    function tick(options){
      const now=performance.now();
      const elapsed=now-lastTick;
      if(visibleBody()&&now-lastActivity<60000&&elapsed<2500)state.activeMs+=elapsed;
      lastTick=now;
      if(!state.engaged&&state.activeMs>=30000){
        state.engaged=true;
        capture('article_engaged',{article_visit_id:state.visitId,active_seconds:30},options);
      }
      measureProgress(options);
    }
    function flush(){
      const seconds=Math.floor((state.activeMs-state.reportedMs)/1000);
      if(seconds>0){
        state.reportedMs+=seconds*1000;
        capture('article_read_time',{article_visit_id:state.visitId,active_seconds:seconds},{transport:'sendBeacon'});
      }
    }
    function activity(){lastActivity=performance.now()}
    function visibility(){flush();lastTick=performance.now();if(!document.hidden)activity()}
    function leave(){tick({transport:'sendBeacon'});flush()}
    const timer=setInterval(tick,1000);
    ['scroll','pointerdown','keydown'].forEach(type=>window.addEventListener(type,activity,{passive:true}));
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener('pagehide',leave);
    measureProgress();
    return ()=>{
      clearInterval(timer);
      ['scroll','pointerdown','keydown'].forEach(type=>window.removeEventListener(type,activity));
      document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('pagehide',leave);
    };
  }

  function startTracking(instance){
    sdk=instance;
    if(consent!=='accepted'||doNotTrack){sdk.opt_out_capturing();return}
    // A previous opt-out survives reloads; clear it only after consent is renewed.
    sdk.opt_in_capturing({captureEventName:false});
    if(!started){
      started=true;
      // Metadata is ready here, after the article template has rendered.
      capture('$pageview');
    }
    if(!stopReading)stopReading=trackArticle();
  }

  function enable(){
    if(doNotTrack||consent!=='accepted')return;
    if(sdk){startTracking(sdk);return}
    if(loading)return;
    loading=true;
    const script=document.createElement('script');
    script.src='https://eu-assets.i.posthog.com/static/array.js';
    script.async=true;
    script.crossOrigin='anonymous';
    script.onerror=()=>{loading=false;script.remove()};
    script.onload=()=>{
      loading=false;
      if(consent!=='accepted'||doNotTrack)return;
      if(!window.posthog?.init)return;
      window.posthog.init(token,{
        api_host:'https://eu.i.posthog.com',ui_host:'https://eu.posthog.com',defaults:'2026-05-30',
        person_profiles:'never',capture_pageview:false,capture_pageleave:true,
        autocapture:false,disable_session_recording:true,disable_surveys:true,
        capture_dead_clicks:false,capture_heatmaps:false,capture_performance:false,capture_exceptions:false,
        persistence:'localStorage+cookie',cross_subdomain_cookie:false,cookie_expiration:180,
        opt_out_persistence_by_default:true,
        before_send:beforeSend,loaded:startTracking
      });
    };
    document.head.appendChild(script);
  }

  function choose(value,persist=true){
    consent=value;
    if(persist){try{localStorage.setItem(consentKey,value)}catch(error){}}
    if(value==='accepted')enable();
    else{
      stopReading?.();stopReading=null;
      sdk?.opt_out_capturing();
      // Also clears persistence when consent is revoked from a different tab.
    }
    banner.hidden=true;
    settingsButton.setAttribute('aria-expanded','false');
    if(banner.contains(document.activeElement))(previousFocus||settingsButton).focus({preventScroll:true});
  }

  function showChoices(){
    previousFocus=document.activeElement;
    banner.hidden=false;
    settingsButton.setAttribute('aria-expanded','true');
    banner.querySelector('button').focus({preventScroll:true});
  }

  function init(){
    settingsButton=document.createElement('button');
    settingsButton.className='analytics-settings';settingsButton.type='button';
    settingsButton.textContent='Analytics preferences';
    settingsButton.setAttribute('aria-controls','analyticsConsent');
    settingsButton.setAttribute('aria-expanded','false');
    settingsButton.addEventListener('click',showChoices);
    (document.querySelector('footer')||document.body).appendChild(settingsButton);
    banner=document.createElement('section');
    banner.id='analyticsConsent';banner.className='analytics-consent';
    banner.setAttribute('aria-label','Analytics preferences');
    banner.innerHTML='<div><strong>Help us understand our readers</strong><p>Allow analytics cookies to measure visits, traffic sources and article reading on Deadline Journal? We use PostHog in the EU. We do not record your screen or collect proposal-form contents. You can change your choice in the footer.</p></div><div class="analytics-consent-actions"><button type="button" data-choice="declined">Decline</button><button type="button" data-choice="accepted">Allow analytics</button></div>';
    document.body.appendChild(banner);
    banner.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>choose(button.dataset.choice)));
    if(doNotTrack){
      banner.querySelector('p').textContent='Your browser requests that you are not tracked. Analytics stays off while this preference is enabled.';
      banner.querySelector('[data-choice="accepted"]').hidden=true;
      banner.querySelector('[data-choice="declined"]').textContent='Close';
    }
    banner.hidden=consent==='accepted'||consent==='declined';
    settingsButton.setAttribute('aria-expanded',String(!banner.hidden));
    if(consent==='accepted')enable();
    window.addEventListener('storage',event=>{
      if(event.key===consentKey||event.key===null){
        let latest=null;
        try{latest=localStorage.getItem(consentKey)}catch(error){}
        choose(latest==='accepted'?'accepted':'declined',false);
      }
    });
    // Restored documents keep their original pageview, but restart the active clock.
    window.addEventListener('pageshow',event=>{if(event.persisted&&consent==='accepted'&&sdk){stopReading?.();stopReading=trackArticle()}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
