import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-index.html', 'utf8');

const matches = [...html.matchAll(/leftMenu\s*\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/g)]
  .map(m => ({ id: m[1], name: m[2], url: m[3] }));

const keywords = ['单', '出', '发', '拣', '包', '下架', '波次', '波', '库', '货', 'order', 'ship', 'pick', 'pack'];
const relevant = matches.filter(m => keywords.some(k => m.name.toLowerCase().includes(k) || m.url.toLowerCase().includes(k)));

console.log(`Relevant menus (${relevant.length}):`);
relevant.forEach(r => console.log(`[${r.id}] ${r.name} -> ${r.url.split('?')[0]}`));
