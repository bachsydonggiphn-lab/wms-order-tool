import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-quick-delivery.html', 'utf8');

// Find script tags in quick-delivery
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

for (const s of scripts) {
  if (s.includes('delivery') || s.includes('scan-picking-order')) {
    console.log('--- Quick delivery script snippet ---');
    console.log(s.slice(0, 3000));
  }
}
