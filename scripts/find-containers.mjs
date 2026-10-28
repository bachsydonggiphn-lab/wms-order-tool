import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-index.html', 'utf8');

// Look for iframes or containers
const iframes = [...html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
console.log('Iframes:', iframes);

// Look for any links with id or class containing menu
const menuDivs = [...html.matchAll(/<div[^>]+id=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
console.log('Div IDs:', menuDivs.filter(id => /menu|nav|sidebar|tree|left/i.test(id)));

// Print line containing sidebar or menu
const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (/menu|sidebar|navigation|quick/i.test(l) && l.includes('<')) {
    console.log(`L${idx + 1}: ${l.trim().slice(0, 120)}`);
  }
});
