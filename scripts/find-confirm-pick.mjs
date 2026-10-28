import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-picking-list.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('confirm-pick-orders') || l.includes('confirmPickOrders')) {
    console.log(`L${idx + 1}: ${l.trim()}`);
    const start = Math.max(0, idx - 5);
    const end = Math.min(lines.length - 1, idx + 35);
    console.log(lines.slice(start, end).join('\n'));
    console.log('-------------------------------------------');
  }
});
