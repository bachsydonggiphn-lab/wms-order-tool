import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-quick-delivery.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('scanPickingOrder') || l.includes('delivery(') || l.includes('/shipment/quick-delivery/delivery')) {
    console.log(`L${idx + 1}: ${l.trim()}`);
    // Print 15 lines before and after
    const start = Math.max(0, idx - 5);
    const end = Math.min(lines.length - 1, idx + 25);
    console.log(lines.slice(start, end).join('\n'));
    console.log('-------------------------------------------');
  }
});
