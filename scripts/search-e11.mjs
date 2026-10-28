import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-orders-list.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('E11') || l.includes('order_status')) {
    console.log(`L${idx + 1}: ${l.trim().slice(0, 150)}`);
  }
});
