// Domain-allowlisted poster fallback; does not proxy films or media streams.
const ALLOWED = new Set(['pbcdnw.aoneroom.com','pbcdn.aoneroom.com','macdn.aoneroom.com']);
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).end();
 let url;
 try{
   url=new URL(String(req.query.url||''));
   if(url.protocol!=='https:'||!ALLOWED.has(url.hostname)||!/^\/image\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(url.pathname)||url.username||url.password||url.port)throw Error();
 }catch{return res.status(400).json({error:'Invalid poster URL'});}
 try{
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8500);
   let upstream;try{upstream=await fetch(url.toString(),{headers:{Accept:'image/avif,image/webp,image/jpeg,image/png,image/*','User-Agent':'Mozilla/5.0','Referer':'https://movieboxph.org/'},redirect:'error',signal:abort.signal});}finally{clearTimeout(timer);}
   if(!upstream.ok)return res.status(502).end();
   const type=upstream.headers.get('content-type')||'';
   if(!/^image\/(jpeg|png|webp)$/i.test(type.split(';')[0]))return res.status(415).end();
   if(Number(upstream.headers.get('content-length'))>5_000_000)return res.status(413).end();
   const bytes=Buffer.from(await upstream.arrayBuffer());
   if(bytes.length>5_000_000)return res.status(413).end();
   res.setHeader('Content-Type',type);
   res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
   return res.status(200).end(bytes);
 }catch{return res.status(502).end();}
}