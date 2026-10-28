import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-orders-one-pack.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('submit-pack') || l.includes('batch-submit-pack') || l.includes('submitPack')) {
    console.log(`L${idx + 1}: ${l.trim()}`);
    const start = Math.max(0, idx - 2);
    const end = Math.min(lines.length - 1, idx + 45);
    console.log(lines.slice(start, end).join('\n'));
    console.log('-------------------------------------------');
  }
});
