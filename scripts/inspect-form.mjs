import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-orders-delivery.html', 'utf8');

const match = html.match(/<form[^>]+id=["']delivery_form["'][^>]*>([\s\S]*?)<\/form>/i);
if (match) {
  console.log('--- Form HTML ---');
  // Print inputs
  const inputs = [...match[1].matchAll(/<input[^>]+name=["']([^"']+)["'][^>]*>/gi)].map(m => m[0]);
  console.log('Inputs found:');
  inputs.forEach(inp => console.log(inp));
} else {
  console.log('No form id=delivery_form found!');
}
