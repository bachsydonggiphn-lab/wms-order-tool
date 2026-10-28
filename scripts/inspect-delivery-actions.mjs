import fs from 'fs';

function inspectFile(filePath) {
  console.log(`=== Inspecting ${filePath} ===`);
  const html = fs.readFileSync(filePath, 'utf8');

  // Find all endpoints (post, get, ajax, action)
  const endpoints = [...html.matchAll(/(?:\$\.(?:post|get|ajax)|url\s*:\s*|action\s*=\s*)['"]([^'"]+)['"]/g)]
    .map(m => m[1])
    .filter(u => u.startsWith('/') && !u.endsWith('.css') && !u.endsWith('.js') && !u.endsWith('.gif') && !u.endsWith('.png'));
  console.log('Endpoints:', [...new Set(endpoints)]);

  // Find function names
  const fns = [...html.matchAll(/function\s+([a-zA-Z0-9_]+)/g)].map(m => m[1]);
  const actionFns = fns.filter(f => /ship|deliver|pack|shelf|pick|status|finish|submit|check|scan/i.test(f));
  console.log('Action Functions:', [...new Set(actionFns)]);
}

inspectFile('scripts/scratch-picking-list.html');
inspectFile('scripts/scratch-orders-delivery.html');
inspectFile('scripts/scratch-quick-delivery.html');
