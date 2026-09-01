const fs = require('fs');
const path = require('path');

const root = __dirname;
const dist = path.join(root, 'dist');

fs.rmSync(dist, {recursive:true, force:true});
fs.mkdirSync(dist, {recursive:true});

const copyFile = (name) => fs.copyFileSync(path.join(root,name), path.join(dist,name));
['index.html','article.html','region.html','about.html','write.html','styles.css','script.js'].forEach(copyFile);

for (const dir of ['assets','media']) {
  fs.cpSync(path.join(root,dir), path.join(dist,dir), {recursive:true});
}

const articleDir = path.join(root,'content','articles');
const articles = fs.readdirSync(articleDir)
  .filter(f=>f.endsWith('.json'))
  .map(f=>JSON.parse(fs.readFileSync(path.join(articleDir,f),'utf8')))
  .filter(a=>a.status === 'published')
  .map(a=>({
    ...a,
    country:String(a.country||'').toUpperCase(),
    type:String(a.type||'').toUpperCase(),
    homepage_rank:Number(a.homepage_rank||999)
  }))
  .sort((a,b)=>new Date(b.published_at||0)-new Date(a.published_at||0));

fs.writeFileSync(
  path.join(dist, 'data.js'),
  'window.DEADLINE_ARTICLES=' + JSON.stringify(articles) + ';\n'
);
console.log(`Built Deadline Journal with ${articles.length} published articles.`);
