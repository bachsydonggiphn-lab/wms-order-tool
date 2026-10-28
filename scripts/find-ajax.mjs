import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-index.html', 'utf8');

// Find all script tags or ajax calls in scratch-index.html
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
for (let i = 0; i < scripts.length; i++) {
  const s = scripts[i];
  if (s.includes('$.ajax') || s.includes('$.get') || s.includes('$.post') || s.includes('load(')) {
    console.log(`Script ${i}:`);
    const ajaxCalls = s.match(/(?:\$\.(?:ajax|get|post)|load)\s*\([^)]+\)/g);
    if (ajaxCalls) console.log(ajaxCalls.slice(0, 5));
  }
}
