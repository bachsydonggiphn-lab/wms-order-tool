import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-picking-list.html', 'utf8');

// Find all buttons, links, or actions
const actionMatches = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>|<a[^>]*class="[^"]*(?:btn|button|action)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)]
  .map(m => (m[1] || m[2]).replace(/<[^>]+>/g, '').trim())
  .filter(Boolean);

console.log('Picking List Buttons/Actions:', [...new Set(actionMatches)]);

// Find table column headers
const ths = [...html.matchAll(/<td[^>]*class="[^"]*table-module-title[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi)]
  .map(m => m[0]);
console.log('Table header lines:', ths);

// Look for EZ.getListData in scratch-picking-list.html
const getListDataMatch = html.match(/EZ\.getListData\s*=\s*function[\s\S]*?<\/script>/);
if (getListDataMatch) {
  console.log('EZ.getListData snippet:');
  console.log(getListDataMatch[0].slice(0, 3000));
}
