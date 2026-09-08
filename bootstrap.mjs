import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const archive = new URL('./source.tgz', import.meta.url);
const buf = zlib.gunzipSync(fs.readFileSync(archive));
const root = process.cwd();
let off = 0;
function text(a,b){ return buf.subarray(a,b).toString('utf8').replace(/\0.*$/s,'').trim(); }
while (off + 512 <= buf.length) {
  const hdr = buf.subarray(off, off + 512);
  if (hdr.every(b => b === 0)) break;
  let name = hdr.subarray(0,100).toString('utf8').replace(/\0.*$/s,'');
  const prefix = hdr.subarray(345,500).toString('utf8').replace(/\0.*$/s,'');
  if (prefix) name = `${prefix}/${name}`;
  const sizeRaw = hdr.subarray(124,136).toString('ascii').replace(/\0/g,'').trim();
  const size = parseInt(sizeRaw || '0', 8) || 0;
  const type = String.fromCharCode(hdr[156] || 48);
  off += 512;
  const data = buf.subarray(off, off + size);
  off += Math.ceil(size / 512) * 512;
  const parts = name.split('/').filter(Boolean);
  if (parts[0] === 'anime-witcher-web') parts.shift();
  if (!parts.length) continue;
  const rel = parts.join('/');
  if (rel === 'source.tgz' || rel === 'bootstrap.mjs') continue;
  const dest = path.resolve(root, rel);
  if (!dest.startsWith(root + path.sep) && dest !== root) continue;
  if (type === '5') { fs.mkdirSync(dest, {recursive:true}); continue; }
  if (type === '0' || type === '\0') {
    fs.mkdirSync(path.dirname(dest), {recursive:true});
    fs.writeFileSync(dest, data);
  }
}
console.log('Anime Witcher source materialized for Vercel build');
