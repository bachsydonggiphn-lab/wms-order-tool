import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-orders-list.html', 'utf8');

// Find all occurrences of $.post, $.ajax, or url:
const matches = [...html.matchAll(/(?:\$\.(?:post|get|ajax)|url\s*:\s*|href\s*=\s*)['"]([^'"]+)['"]/g)].map(m => m[1]);
console.log('Found endpoints:', [...new Set(matches)]);

// Find buttons or actions with Chinese text like 出库, 发货, 出货, 拣货
const actionMatches = [...html.matchAll(/<button[^>]*>([^<]+)<\/button>|<a[^>]*class="[^"]*btn[^"]*"[^>]*>([^<]+)<\/a>/gi)]
  .map(m => (m[1] || m[2]).trim());
console.log('Buttons/Actions:', [...new Set(actionMatches)].slice(0, 50));

// Search for any function names related to ship or status
const fnMatches = [...html.matchAll(/function\s+([a-zA-Z0-9_]*(?:ship|status|out|pick|shelf)[a-zA-Z0-9_]*)/gi)].map(m => m[1]);
console.log('Matching functions:', [...new Set(fnMatches)]);
