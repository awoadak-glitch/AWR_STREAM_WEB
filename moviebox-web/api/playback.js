// AWR VISION native playback resolver.
// Only explicitly configured/licensed assets are returned; no scraping, embedding or
// bypassing authentication, region restrictions, signatures or DRM.
const slugOk = s => typeof s==='string' && /^[a-z0-9-]{4,160}$/i.test(s);
const webURL = x => {
  try { const u=new URL(x);return u.protocol==='https:' && !u.username && !u.password && !['localhost','127.0.0.1','::1'].includes(u.hostname) ? u.href:null; }
  catch {return null;}
};
function library(){
  try{
    const cfg=JSON.parse(process.env.AWR_MEDIA_LIBRARY||'{}');
    return cfg && typeof cfg==='object' && !Array.isArray(cfg) ? cfg : {};
  }catch{return {};}
}
function normalize(entry){
 if(!entry||typeof entry!=='object') return null;
 const sources=(Array.isArray(entry.sources)?entry.sources:[]).slice(0,20)
  .map(x=>({label:String(x.label||'Auto').slice(0,40),type:String(x.type||'').toLowerCase(),url:webURL(x.url)}))
  .filter(x=>x.url && /^(mp4|hls|dash|webm)$/.test(x.type));
 const subtitles=(Array.isArray(entry.subtitles)?entry.subtitles:[]).slice(0,15)
  .map(x=>({label:String(x.label||'Subtitle').slice(0,35),lang:String(x.lang||'en').slice(0,10),url:webURL(x.url)}))
  .filter(x=>x.url);
 if(!sources.length)return null;
 return {title:String(entry.title||'').slice(0,200),sources,subtitles};
}
export default function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
 const slug=String(req.query?.id||'');
 if(!slugOk(slug))return res.status(400).json({error:'invalid_title'});
 const entry=normalize(library()[slug]);
 if(!entry)return res.status(200).json({available:false,reason:'unlicensed_or_unavailable'});
 return res.status(200).json({available:true,...entry});
}