// Dependency-free local preview of the generated Cloudflare Worker and static files.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.env.DEADLINE_DIST||path.join(path.dirname(fileURLToPath(import.meta.url)),'dist'));
const worker=(await import('data:text/javascript;base64,'+fs.readFileSync(process.env.DEADLINE_WORKER||path.join(path.dirname(fileURLToPath(import.meta.url)),'.cloudflare/worker.mjs')).toString('base64'))).default;
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.xml':'application/xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.vtt':'text/vtt; charset=utf-8'};
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
  const bytes=fs.readFileSync(file),headers={'content-type':types[path.extname(file)]||'application/octet-stream','content-length':String(bytes.length),'accept-ranges':'bytes'};
  const range=request.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
  if(exists&&request.method!=='HEAD'&&range&&(range[1]||range[2])){
    const start=range[1]?Number(range[1]):Math.max(0,bytes.length-Number(range[2]));
    const end=range[1]&&range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;
    if(start>end||start>=bytes.length)return new Response(null,{status:416,headers:{...headers,'content-length':'0','content-range':`bytes */${bytes.length}`}});
    return new Response(bytes.subarray(start,end+1),{status:206,headers:{...headers,'content-length':String(end-start+1),'content-range':`bytes ${start}-${end}/${bytes.length}`}});
  }
  return new Response(request.method==='HEAD'?null:bytes,{status:exists?200:404,headers});
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
