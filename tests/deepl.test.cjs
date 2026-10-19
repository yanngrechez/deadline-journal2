const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {client, run, translateArticle} = require('../scripts/translate-deepl.cjs');
const {compile, sourceHash, contentHash, locales} = require('../build-translations.cjs');
const article = {
  slug:'test-story', status:'published', title:'A headline', dek:'A subtitle',
  body:'<p>A <em>report</em> with <a href="https://example.org/report">evidence</a>.</p>',
  author:'Original Author', sources:'<p>ORIGINAL CITATION 2026.</p>',
  hero_alt:'Photo description', hero_caption:'Photo description',
  sections:[{type:'image', image:'/media/report.jpg', alt:'Image description', caption:'A caption', credit:'Original Agency'},
    {type:'text', heading:'A heading', body:'<p>Another paragraph.</p>'},
    {type:'video',video:'/media/clip.mp4',poster:'/media/still.jpg',title:'Interview clip',caption:'A short interview',credit:'Video Agency',aspect_ratio:'9/16',subtitles:'/media/clip.vtt',subtitles_language:'en'}]
};
function mockAPI(requests = []) {
  return {usage:async () => ({character_count:0, character_limit:500000}),
    translate:async (texts, locale, context) => {
      requests.push({texts, locale, context});
      return texts.map(text => text.replace(/(^|>)([^<]+)/g, (_, start, value) => start + locale + ': ' + value));
    }};
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deadline-deepl-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  fs.mkdirSync(path.join(root,'content/articles'), {recursive:true});
  fs.writeFileSync(path.join(root,'content/articles/test-story.json'), JSON.stringify(article));
  fs.writeFileSync(path.join(root,'content/articles/draft.json'), JSON.stringify({...article,slug:'draft',status:'draft'}));
  return root;
}

test('new CMS articles translate fully in all supported languages; repeat runs cost no API calls', async t => {
  const root = fixture(t), requests = [], api = mockAPI(requests);
  const result = await run({root, api, log:() => {}});
  assert.equal(result.written, locales.length);
  assert.deepEqual(compile({root,articles:[article],strict:true}).coverage[article.slug], locales);
  assert.equal(requests.length, locales.length);
  assert.ok(requests.every(r => !r.texts.join(' ').includes('ORIGINAL CITATION')));
  assert.ok(requests.every(r => !r.texts.join(' ').includes('Original Author')));
  assert.ok(requests.every(r => !r.texts.join(' ').includes('Original Agency')));
  assert.equal(requests[0].texts.filter(s => s === article.hero_alt).length, 1);
  const saved = JSON.parse(fs.readFileSync(path.join(root,'content/translations/es/test-story.json')));
  assert.equal(saved.sections[0].credit, 'Original Agency');
  assert.equal(saved.sections[0].image, '/media/report.jpg');
  for(const key of ['video','poster','credit','aspect_ratio','subtitles','subtitles_language'])assert.equal(saved.sections[2][key],article.sections[2][key]);
  assert.equal(saved.sections[2].title,'es: Interview clip');
  assert.equal(saved.sections[2].caption,'es: A short interview');
  assert(!requests.some(r=>r.texts.some(t=>/clip\.mp4|clip\.vtt|Video Agency/.test(t))));
  assert.equal(saved.sourceHash, sourceHash(article));
  assert.equal(saved.contentHash, contentHash(article));
  assert.equal(saved.sources, undefined);
  assert.equal(saved.provider, 'deepl');
  await run({root, api:{usage:() => assert.fail('No paid request needed')}, log:() => {}});
  assert.equal(requests.length, locales.length);
});

test('only stale or missing languages regenerate; Sources and whitespace edits do not trigger billing', async t => {
  const root = fixture(t);
  await run({root,api:mockAPI(),log:() => {}});
  const file = path.join(root,'content/articles/test-story.json');
  fs.writeFileSync(file,JSON.stringify({...article,title:' '+article.title+' ',sources:'A new citation'}));
  assert.equal((await run({root,dryRun:true,log:() => {}})).jobs, 0);
  fs.rmSync(path.join(root,'content/translations/fr/test-story.json'));
  const requests = [];
  await run({root,api:mockAPI(requests),log:() => {}});
  assert.deepEqual(requests.map(r => r.locale), ['fr']);
  fs.writeFileSync(file,JSON.stringify({...article,body:article.body+'<p>Updated reporting.</p>'}));
  assert.equal((await run({root,dryRun:true,log:() => {}})).jobs, locales.length);
});

test('current manually reviewed translations are preserved regardless of provider', async t => {
  const root = fixture(t);
  await run({root,api:mockAPI(),log:() => {}});
  for (const locale of locales) {
    const file = path.join(root,'content/translations',locale,'test-story.json');
    const saved = JSON.parse(fs.readFileSync(file)); saved.provider = 'assistant';
    fs.writeFileSync(file,JSON.stringify(saved));
  }
  assert.equal((await run({root,dryRun:true,log:() => {}})).jobs, 0);
});

test('invalid formatting and changed URLs never overwrite an existing translation', async t => {
  const root = fixture(t);
  await run({root,api:mockAPI(),log:() => {}});
  const savedFile = path.join(root,'content/translations/es/test-story.json'), before = fs.readFileSync(savedFile,'utf8');
  fs.writeFileSync(path.join(root,'content/articles/test-story.json'),JSON.stringify({...article,title:'A changed headline'}));
  const api = mockAPI();
  api.translate = async texts => texts.map(text => text.replace('https://example.org/report','https://wrong.example/'));
  await assert.rejects(run({root,api,log:() => {}}),/links changed/);
  assert.equal(fs.readFileSync(savedFile,'utf8'),before);
});

test('DeepL uses correct Free/Pro hosts, English source, HTML and quality options', async () => {
  for (const [key,host] of [['test:fx','api-free.deepl.com'],['test','api.deepl.com']]) {
    let request;
    const api = client({key,fetchImpl:async (url, options) => {
      request = {url, options}; return {ok:true,json:async () => ({translations:[{text:'<p>Hallo</p>'}]})};
    }});
    assert.deepEqual(await api.translate(['<p>Hello</p>'],'de','Editorial context'),['<p>Hallo</p>']);
    assert.equal(new URL(request.url).host,host);
    const body = JSON.parse(request.options.body);
    assert.equal(body.source_lang,'EN'); assert.equal(body.target_lang,'DE');
    assert.equal(body.tag_handling,'html'); assert.equal(body.tag_handling_version,'v2');
    assert.equal(body.model_type,'prefer_quality_optimized'); assert.equal(body.context,'Editorial context');
    assert.equal(request.options.headers.Authorization,'DeepL-Auth-Key '+key);
  }
});

test('quota, missing key, incomplete responses and transient limits are handled safely', async () => {
  assert.throws(() => client({key:''}),/DEEPL_API_KEY/);
  const quota = client({key:'secret',fetchImpl:async () => ({ok:false,status:456})});
  await assert.rejects(quota.translate(['Hello'],'es',''),/quota/);
  const empty = client({key:'secret',fetchImpl:async () => ({ok:true,json:async () => ({translations:[]})})});
  await assert.rejects(empty.translate(['Hello'],'es',''),/incomplete/);
  let calls = 0;
  const retry = client({key:'secret',sleep:async () => {},fetchImpl:async () => {
    calls++; return calls < 3 ? {ok:false,status:429} : {ok:true,json:async () => ({translations:[{text:'Hola'}]})};
  }});
  assert.deepEqual(await retry.translate(['Hello'],'es',''),['Hola']); assert.equal(calls,3);
});

test('large articles batch fields and preserve full context; oversized fields fail clearly', async () => {
  const requests = [];
  const large = {...article,sections:Array.from({length:65},(_,i)=>({type:'text',body:`<p>Section ${i}</p>`}))};
  const translated = await translateArticle(large,'de',mockAPI(requests));
  assert.equal(translated.sections.length,65); assert.ok(requests.length > 1);
  assert.ok(requests.every(r => r.texts.length <= 40 && r.context.includes(article.title)));
  const api = client({key:'secret',fetchImpl:() => assert.fail('Oversized request sent')});
  await assert.rejects(api.translate(['x'.repeat(130*1024)],'es',''),/safe size limit/);
});

test('new language codes map to the precise DeepL targets', async () => {
  const expected={'pt-BR':'PT-BR',cs:'CS',ko:'KO',uk:'UK'};
  for(const [locale,target] of Object.entries(expected)) {
    let body;
    const api=client({key:'test:fx',fetchImpl:async (_url,options)=>{
      body=JSON.parse(options.body);
      return {ok:true,json:async()=>({translations:[{text:'Translated'}]})};
    }});
    await api.translate(['English'],locale,'');
    assert.equal(body.target_lang,target);
  }
});

test('missing interface columns translate once and retain existing editorial copy', async t => {
  const root=fixture(t),file=path.join(root,'journal-language-data.js');
  fs.writeFileSync(file,'window.JOURNAL_LANGUAGE_CATALOG=[["About","Acerca de","À propos","Über uns","Over ons","Rólunk"]];');
  const {translateInterface}=require('../scripts/translate-deepl.cjs');
  const requests=[];
  assert.equal(await translateInterface(root,mockAPI(requests),()=>{}),4);
  assert.deepEqual(requests.map(r=>r.locale),['pt-BR','cs','ko','uk']);
  const context={window:{}};require('node:vm').runInNewContext(fs.readFileSync(file,'utf8'),context);
  const row=context.window.JOURNAL_LANGUAGE_CATALOG[0];
  assert.equal(row.length,locales.length+1);
  assert.equal(row[1],'Acerca de');
  assert.equal(row[6],'pt-BR: About');
  assert.equal(await translateInterface(root,{translate:()=>assert.fail('Already translated')},()=>{}),0);
});

test('punctuation-only emphasis artifacts are cleaned without another request', async () => {
  let calls=0;
  const api=client({key:'test',fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({translations:[{text:'<p><em>Zpráva</em><em>,</em> pokračuje.</p>'}]})}}});
  assert.deepEqual(await api.translate(['<p><em>Report</em>, continued.</p>'],'cs',''),['<p><em>Zpráva</em>, pokračuje.</p>']);
  assert.equal(calls,1);
});

test('translated emphasis can move while paragraphs and links remain protected', async () => {
  const {checkHTML}=require('../build-translations.cjs');
  checkHTML('<p><em>Report</em> and <em>context</em>.</p>','<p>문맥과 <em>기사</em>.</p>','word order');
  assert.throws(()=>checkHTML('<p>Text</p>','<p><em>Text</p>','unbalanced'),/Unbalanced/);
  assert.throws(()=>checkHTML('<p>Text</p>','<h2>Text</h2>','structure'),/formatting/);
});


test('a quota failure preserves completed languages and a retry skips them', async t => {
  const root = fixture(t), api = mockAPI();
  const translate = api.translate;
  api.translate = async (texts, locale, context) => {
    if (locale === 'de') throw Error('DeepL character quota reached');
    return translate(texts, locale, context);
  };
  await assert.rejects(run({root, api, log:() => {}}), /quota/);
  assert.deepEqual(compile({root, articles:[article]}).coverage[article.slug], ['es','fr']);
  const requests = [];
  await run({root, api:mockAPI(requests), log:() => {}});
  assert.deepEqual(requests.map(r => r.locale), locales.slice(2));
  assert.deepEqual(compile({root, articles:[article], strict:true}).coverage[article.slug], locales);
});
