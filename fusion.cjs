const fs = require('fs');
const path = require('path');

const root = process.cwd();
const source = path.join(root, 'fusion-overrides');

function copyTree(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

copyTree(source, root);
console.log('Anime Witcher + Drama World fusion overlays applied');
