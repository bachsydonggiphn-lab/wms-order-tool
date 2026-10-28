import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-index.html', 'utf8');

// Look for menu JSON or menu HTML elements
const menuMatches = html.match(/menu\w*|nav\w*|quick\w*/gi);
console.log('Occurrences:', menuMatches ? menuMatches.length : 0);

// Find any script blocks that define menus or submenus
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
for (const s of scripts) {
  if (s.includes('menu') || s.includes('left') || s.includes('nav') || s.includes('url')) {
    const lines = s.split('\n').filter(l => l.includes('url') || l.includes('title') || l.includes('name') || l.includes('order') || l.includes('picking'));
    if (lines.length > 0) {
      console.log('Script lines matching:', lines.slice(0, 30).join('\n'));
    }
  }
}
