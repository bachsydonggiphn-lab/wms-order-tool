import fs from 'fs';

const html = fs.readFileSync('scripts/scratch-job-queue.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('upload-check-out') || l.includes('run-check-out') || l.includes('check-out')) {
    console.log(`L${idx + 1}: ${l.trim()}`);
    const start = Math.max(0, idx - 2);
    const end = Math.min(lines.length - 1, idx + 30);
    console.log(lines.slice(start, end).join('\n'));
    console.log('-------------------------------------------');
  }
});
