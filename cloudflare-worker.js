// build.js prepends the shared router and the published route manifest.
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const routes=globalThis.DeadlineRoutes;
    const route=routes.resolve(url,publishedRoutes);
    const legacy=/^\/(article|region|country)(?:\.html)?\/?$/.test(url.pathname);
    let destination=route.kind==='home'?'/':route.kind==='about'?'/about':route.kind==='write'?'/write':null;
    const production=['deadlinejournal.org','www.deadlinejournal.org'].includes(url.hostname);
    const upgrade=production&&(url.protocol!=='https:'||url.hostname!=='deadlinejournal.org');
    if(upgrade){url.protocol='https:';url.hostname='deadlinejournal.org'}
    if(route.kind==='article'&&publishedRoutes.some(article=>article.slug===route.slug))destination=routes.articleUrl(route.slug);
    if(route.kind==='region'&&route.name)destination=routes.regionUrl(route.name);
    if(route.kind==='country'&&route.code)destination=routes.countryUrl(route.code);
    if(destination){
      if(url.pathname!==destination||legacy||upgrade){
        url.pathname=destination;
        url.searchParams.delete('slug');
        url.searchParams.delete('region');
        url.searchParams.delete('country');
        return Response.redirect(url.href,301);
      }
      // Workers static assets use drop-trailing-slash HTML handling.
      // Fetch through ASSETS (not the public Worker URL) to avoid redirect loops.
      const assetUrl=new URL(url);
      assetUrl.pathname=destination;
      return env.ASSETS.fetch(new Request(assetUrl,request));
    }
    if(upgrade)return Response.redirect(url.href,301);
    if(legacy){
      const notFound=new URL('/404',url);
      const response=await env.ASSETS.fetch(new Request(notFound,request));
      return new Response(response.body,{status:404,headers:response.headers});
    }
    return env.ASSETS.fetch(request);
  }
};
