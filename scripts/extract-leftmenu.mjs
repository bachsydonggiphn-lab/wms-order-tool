import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-index.html', 'utf8');

const matches = [...html.matchAll(/leftMenu\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/g)]
  .map(m => ({ id: m[1], name: m[2], url: m[3] }));

console.log(`Total leftMenu items found: ${matches.length}`);
console.log(JSON.stringify(matches, null, 2));
