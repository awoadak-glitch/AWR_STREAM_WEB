// Public title metadata only: no player scraping and no authentication interception.
const ENDPOINT='https://movieboxph.org/movies/';
function decode(s){return String(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();}
function meta(html,key,type='name'){
 const re=new RegExp('<meta\\s+(?:'+type+'="'+key+'"\\s+content="([^"]*)"|content="([^"]*)"\\s+'+type+'="'+key+'")','i');
 const m=html.match(re);return decode(m?.[1]||m?.[2]||'');
}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
 const id=String(req.query?.id||'');
 if(!/^[a-z0-9-]{5,150}$/i.test(id))return res.status(400).json({error:'invalid_id'});
 try{
   const c=new AbortController();const timeout=setTimeout(()=>c.abort(),8500);
   let response;try{response=await fetch(ENDPOINT+id,{signal:c.signal,headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}});}finally{clearTimeout(timeout);}
   if(!response.ok)return res.status(404).json({error:'not_found'});
   const html=(await response.text()).slice(0,500000);
   const candidate=html.match(/<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
   let json={};if(candidate)try{const object=JSON.parse(candidate[1]);json=Array.isArray(object)?object[0]:object;}catch{}
   const description=String(json.description||meta(html,'description')||meta(html,'og:description','property')).slice(0,1500);
   const year=String(json.datePublished||'').slice(0,4);
   const rating=String(json.aggregateRating?.ratingValue||'');
   res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
   return res.status(200).json({description,year,genre:String(json.genre||'').slice(0,160),rating});
 }catch(e){return res.status(503).json({error:'details_unavailable'});}
}