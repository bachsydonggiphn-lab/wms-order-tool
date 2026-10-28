import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-pick-list.html', 'utf8');

const regex = /table-module-list-data/gi;
let match;
while ((match = regex.exec(html)) !== null) {
  const start = Math.max(0, match.index - 100);
  const end = Math.min(html.length, match.index + 200);
  console.log(`Match at ${match.index}:`);
  console.log(html.slice(start, end));
  console.log('---');
}
