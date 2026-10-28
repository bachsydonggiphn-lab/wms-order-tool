import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-index.html', 'utf8');

// Find all ur_url or user menu items
const urUrls = [...html.matchAll(/ur_url["']?\s*:\s*["']([^"']+)["']/g)].map(m => m[1]);
console.log('ur_url count:', urUrls.length);
console.log('ur_urls sample:', [...new Set(urUrls)].slice(0, 50));

// Find any HTML menu list <li ... or <a href=...
const aTags = [...html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  .map(m => ({ href: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }))
  .filter(item => item.href.startsWith('/') && !item.href.includes('css') && !item.href.includes('png'));

console.log('A tags count:', aTags.length);
console.log('A tags sample:', aTags.slice(0, 50));
