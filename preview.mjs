// Dependency-free local preview of the generated Cloudflare Worker and static files.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.env.DEADLINE_DIST||path.join(path.dirname(fileURLToPath(import.meta.url)),'dist'));
const worker=(await import('data:text/javascript;base64,'+fs.readFileSync(process.env.DEADLINE_WORKER||path.join(path.dirname(fileURLToPath(import.meta.url)),'.cloudflare/worker.mjs')).toString('base64'))).default;
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.xml':'application/xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const assets={async fetch(request){
  const url=new URL(request.url);
  let pathname;
  try{pathname=decodeURIComponent(url.pathname)}catch(error){return new Response('Bad request',{status:400})}
  let file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)&&file!==root)return new Response('Not found',{status:404});
  if(pathname.split('/').some(part=>part.startsWith('_')||part.startsWith('.')))return new Response('Not found',{status:404});
  if(pathname.endsWith('/index.html')||pathname.endsWith('.html')){
    url.pathname=pathname.endsWith('/index.html')?pathname.slice(0,-10):pathname.slice(0,-5);
    return Response.redirect(url.href,301);
  }
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory()){
    file=path.join(file,'index.html');
  }else if(!path.extname(file))file+='.html';
  const exists=fs.existsSync(file)&&fs.statSync(file).isFile();
  if(!exists)file=path.join(root,'404.html');
  return new Response(request.method==='HEAD'?null:fs.readFileSync(file),{status:exists?200:404,headers:{'content-type':types[path.extname(file)]||'application/octet-stream'}});
}};
const server=http.createServer(async(req,res)=>{
  try{
    const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers});
    const response=await worker.fetch(request,{ASSETS:assets});
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(500);res.end(String(error));}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Deadline Journal preview: http://127.0.0.1:${server.address().port}`));
