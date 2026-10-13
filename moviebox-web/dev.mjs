import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import { fileURLToPath } from 'node:url';
import handler from './api/catalog.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/catalog'){req.query=Object.fromEntries(url.searchParams);res.status=(code)=>{res.statusCode=code;return res;};res.json=(payload)=>res.end(JSON.stringify(payload));res.setHeader('Content-Type','application/json; charset=utf-8');return handler(req,res);}
 const key=url.pathname==='/'||url.pathname==='/watch'?'/index.html':url.pathname;
 const dest=path.resolve(root,'.'+key);
 if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{const data=await fs.readFile(dest);res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'}[path.extname(dest)]||'application/octet-stream')+'; charset=utf-8');res.end(data);}catch{res.writeHead(404).end('Not found');}
}).listen(3000,()=>console.log('http://localhost:3000'));
