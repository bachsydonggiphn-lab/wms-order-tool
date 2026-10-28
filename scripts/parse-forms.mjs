import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-pick-list.html', 'utf8');

// Find offShelfForm
const formMatch = html.match(/<form[^>]*id=["']offShelfForm["'][\s\S]*?<\/form>/i);
if (formMatch) {
  console.log('=== offShelfForm FOUND ===');
  console.log(formMatch[0].slice(0, 2000));
} else {
  console.log('offShelfForm tag not found directly, searching for id="offShelfForm"...');
  const idx = html.indexOf('offShelfForm');
  console.log(html.slice(Math.max(0, idx - 100), Math.min(html.length, idx + 400)));
}

// Find table or inputs for orders in table-module-list-data
console.log('\n=== Table / Checkbox inputs ===');
const tableMatch = html.match(/<form[^>]*id=["']searchForm["'][\s\S]*?<\/form>/i);
if (tableMatch) {
  console.log('searchForm inputs:');
  const inputs = [...tableMatch[0].matchAll(/<input[^>]+name=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  console.log(inputs);
}
