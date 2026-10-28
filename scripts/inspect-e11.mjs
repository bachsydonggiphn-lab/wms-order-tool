import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-orders-list.html', 'utf8');

const match = html.match(/<select[^>]+name=["']E11["'][^>]*>([\s\S]*?)<\/select>/i);
if (match) {
  console.log('--- E11 options ---');
  const options = [...match[1].matchAll(/<option[^>]+value=["']([^"']*)["'][^>]*>([^<]*)<\/option>/gi)]
    .map(m => ({ value: m[1], text: m[2].trim() }));
  console.log(options);
} else {
  console.log('No select E11 found!');
}
