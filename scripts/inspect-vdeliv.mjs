import fs from 'fs';

function inspect(file) {
  console.log(`=== ${file} ===`);
  const html = fs.readFileSync(file, 'utf8');
  const urls = [...html.matchAll(/(?:\$\.(?:post|get|ajax)|url\s*:\s*|action\s*=\s*)['"]([^'"]+)['"]/g)]
    .map(m => m[1])
    .filter(u => u.startsWith('/') && !u.endsWith('.css') && !u.endsWith('.js') && !u.endsWith('.gif') && !u.endsWith('.png'));
  console.log('Endpoints:', [...new Set(urls)]);
}

inspect('scripts/scratch-virtual-delivery.html');
inspect('scripts/scratch-orders-pack.html');
inspect('scripts/scratch-orders-one-pack.html');
