/* MovieBox source catalogue. Reads publicly presented cards, never fabricates video URLs. */
const ORIGIN = 'https://movieboxph.org';
const PATHS = Object.freeze({home:'/',movies:'/films',shows:'/shows',animation:'/animation',korean:'/k-series',shorts:'/quick-shorts',popular:'/top-picks'});
const SAFE_HEADERS = { 'Accept':'text/html,application/xhtml+xml', 'Accept-Language':'en-US,en;q=0.9', 'User-Agent':'Mozilla/5.0 (compatible; MovieBoxCatalogue/1.0)' };

function unescapeHTML(str='') {
 return String(str).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|hellip|ndash|mdash|#39);/gi,(m,key)=> {
  if (key[0]==='#') { const n=key[1]?.toLowerCase()==='x' ? parseInt(key.slice(2),16):parseInt(key.slice(1),10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n):m; }
  return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',hellip:'…',ndash:'–',mdash:'—'}[key.toLowerCase()] ?? m;
 });
}
function textOnly(value='') {return unescapeHTML(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());}
function attr(str,key){const m = String(str).match(new RegExp(`\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,'i'));return m?unescapeHTML(m[1]??m[2]??m[3]??''):'';}
function absolute(path){ try {const url = new URL(path,ORIGIN); if (!['http:','https:'].includes(url.protocol))return '';return url.href;}catch{return '';}}
function mediaUrl(path){ if(!path||!String(path).trim())return ''; const link=absolute(path);try {const u = new URL(link);return /(^|\.)aoneroom\.com$|(^|\.)movieboxph\.org$/i.test(u.hostname)?link:'';}catch{return '';}}
function mediaLink(path) {try {const u = new URL(path,ORIGIN);return u.origin===ORIGIN && /^\/movies\/[a-z0-9-]{5,}$/i.test(u.pathname) ? `${u.origin}${u.pathname}`:'';}catch{return '';}}
function sectionFrom(text){return text.replace(/^[🔥🎬🎥🏆📺\s]+/gu,'').trim().slice(0,60)||'Trending';}
// Server-rendered cards often show only the first ~8 <img> tags.
// Next.js flight data contains the authoritative cover URL for every item.
function embeddedCovers(html){
 const images=new Map();
 const flight=/self\.__next_f\.push\(\[1,("(?:\\.|[^"\\])*")\]\)/g;
 const card=/"subjectId":"\d+","subjectType":\d+,"title":"([^"]+)"[\s\S]{0,1800}?"cover":\{"url":"([^"]+)"[\s\S]{0,2000}?"detailPath":"([^"]+)"/g;
 for(const [,encoded] of html.matchAll(flight)){
   let part;try{part=JSON.parse(encoded);}catch{continue;}
   for(const hit of part.matchAll(card)){
     const url=mediaUrl(hit[2]);
     if(url && !images.has(hit[3])) images.set(hit[3],url);
   }
 }
 return images;
}
function extract(html,page){
 const sourceCovers=embeddedCovers(html);
 const headers=[{pos:0,name:page==='home'?'Trending Now':page}];
 for(const match of html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)){
  let title=sectionFrom(textOnly(match[1]));if(title.length>2 && title.length<65)headers.push({pos:match.index,name:title});
 }
 const sections=new Map();const seen=new Set();const featured=[];
 let sectionIndex=0;
 for(const match of html.matchAll(/<a\b([^>]*\bhref\s*=\s*(?:"[^"]+"|'[^']+'|[^\s>]+)[^>]*)>([\s\S]*?)<\/a>/gi)){
   const href=mediaLink(attr(match[1],'href'));if(!href||seen.has(href))continue;
   const nested=match[2];const imgMatch=nested.match(/<img\b([^>]*?)\/?\s*>/i);
   const imageAttrs=imgMatch?.[1]||'';
   let image=mediaUrl(attr(imageAttrs,'src')||attr(imageAttrs,'data-src')||attr(imageAttrs,'data-original'));
   if(!image){const srcset=attr(imageAttrs,'srcset');image=mediaUrl(srcset.split(',')[0]?.trim().split(' ')[0]||'');}
   if(!image)image=sourceCovers.get(new URL(href).pathname.slice(8))||'';
   let title=attr(imageAttrs,'alt')||attr(match[1],'title');
   const label=textOnly(nested);
   if(!title||/^(image|poster|thumbnail|cover)$/i.test(title)) {
     title=label.replace(/^(?:Action|Drama|Comedy|Anime|Crime|Adventure|Romance|Horror|Thriller|Modern Drama|Reality-TV|History|Fantasy)\s*[★☆]\s*[\d.]+\s*/i,'').trim();
   }
   title=title.replace(/^Image:\s*/i,'').replace(/\bWatch Now\b|\bNew arrivals this week\b/gi,'').trim();
   if(!title||title.length>150||title.length<2)continue;
   const score=label.match(/[★☆]\s*([0-9](?:\.[0-9])?)/)?.[1]||'';
   const genre=label.match(/^(Action|Drama|Comedy|Anime|Crime|Adventure|Romance|Horror|Thriller|Fantasy|Modern Drama|Reality-TV|History)/i)?.[1]||'';
   while(sectionIndex+1<headers.length && headers[sectionIndex+1].pos<=match.index)sectionIndex++;
   let section=headers[sectionIndex].name;
   if (/^(movieboxtv|home|movie|watch|stream|navigation)/i.test(section))section='Trending Now';
   if(!sections.has(section))sections.set(section,[]);
   const item={id:new URL(href).pathname.split('/').pop(),title,href,image,genre,score,section};
   seen.add(href);sections.get(section).push(item);
   if(featured.length<8)featured.push(item);
 }
 const list=[...sections].map(([title,items])=>({title,items})).filter(section=>section.items.length);
 if(!list.length)throw new Error('No readable catalogue cards were found in the source page');
 return {page,updatedAt:new Date().toISOString(),source:ORIGIN,sections:list,featured:featured.slice(0,6),count:seen.size,posterCount:[...sections.values()].flat().filter(x=>Boolean(x.image)).length};
}
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 const page= typeof req.query?.page==='string' ? req.query.page:'home';
 if(!Object.hasOwn(PATHS,page))return res.status(400).json({error:'Invalid category'});
 try {
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9500);
  let upstream;
  try {upstream=await fetch(`${ORIGIN}${PATHS[page]}`,{headers:SAFE_HEADERS,signal:controller.signal,redirect:'follow'});}finally{clearTimeout(timer);}
  if(!upstream.ok)throw Error(`Source responded ${upstream.status}`);
  const html=(await upstream.text()).slice(0,5_000_000);
  const payload=extract(html,page);
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=900');
  return res.status(200).json(payload);
 }catch(error){return res.status(502).json({error:'Catalogue temporarily unavailable',details:String(error.message||error).slice(0,180),source:ORIGIN});}
}
export {extract,PATHS};
