import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-virtual-delivery.html', 'utf8');

// Find script tags
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
for (const s of scripts) {
  if (s.includes('virtual-delivery') || s.includes('virtual_order')) {
    console.log('--- Virtual Delivery script snippet ---');
    console.log(s.slice(0, 3000));
  }
}
