const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');

const COMMIT = '49fad6c00b5a1ea76a88a13b5233f23631a7a93b';
const ARCHIVE = `/tmp/anime-witcher-${COMMIT}.tar.gz`;
const URL = `https://codeload.github.com/awoadak-glitch/STREMING_WEP/tar.gz/${COMMIT}`;

const remove = [
  'app', 'components', 'lib', 'public', 'api', 'aurorastream-web', 'data',
  'next.config.js', 'next.config.mjs', 'next.config.ts', 'tsconfig.json'
];
for (const rel of remove) fs.rmSync(path.join(process.cwd(), rel), { recursive: true, force: true });

function download(url, out, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Anime-Witcher-Vercel-Deploy' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirects > 5) return reject(new Error('Too many redirects'));
        return resolve(download(res.headers.location, out, redirects + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }
      const file = fs.createWriteStream(out);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  await download(URL, ARCHIVE);
  execFileSync('tar', ['-xzf', ARCHIVE, '--strip-components=1', '-C', process.cwd()], { stdio: 'inherit' });
  fs.rmSync(ARCHIVE, { force: true });
  console.log(`Anime Witcher source restored from STREMING_WEP commit ${COMMIT}`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
