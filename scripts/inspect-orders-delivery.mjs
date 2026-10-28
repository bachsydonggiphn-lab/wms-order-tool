import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-orders-delivery.html', 'utf8');

// Find all script tags
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

for (const s of scripts) {
  if (s.includes('delivery') || s.includes('scan') || s.includes('$.post') || s.includes('$.ajax')) {
    console.log('--- Orders delivery script snippet ---');
    console.log(s.slice(0, 4000));
  }
}
