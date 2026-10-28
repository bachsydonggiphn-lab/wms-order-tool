import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-pick-list.html', 'utf8');

// Find all functions in <script> tags
const scripts = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

console.log(`Total inline script blocks: ${scripts.length}`);

// Search for submitForm or generate picking or ajax calls
for (let i = 0; i < scripts.length; i++) {
  const s = scripts[i];
  if (s.includes('submitForm') || s.includes('create') || s.includes('/shipment/pick/')) {
    console.log(`--- Script block ${i} (length ${s.length}) ---`);
    // Print lines containing ajax or submit or url
    const lines = s.split('\n');
    lines.forEach((l, idx) => {
      if (/function |url:|type:|data:|\$\.ajax|EZ\.url|submitForm|picking_code|order_code/i.test(l)) {
        console.log(`L${idx + 1}: ${l.trim()}`);
      }
    });
  }
}
