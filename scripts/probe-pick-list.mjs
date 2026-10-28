import https from 'https';
import fs from 'fs';

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function extractCookies(headers) {
  const raw = headers['set-cookie'] || [];
  if (Array.isArray(raw)) return raw.map(c => c.split(';')[0]).join('; ');
  if (typeof raw === 'string') return raw.split(';')[0];
  return '';
}

async function login() {
  const initRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/',
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const initCookies = extractCookies(initRes.headers);

  const passwordBase64 = Buffer.from('12345abc').toString('base64');
  const loginBody = 'userName=' + encodeURIComponent('David') + '&userPass=' + encodeURIComponent(passwordBase64);

  const loginRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/login.html',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': initCookies,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/',
      'Content-Length': Buffer.byteLength(loginBody)
    }
  }, loginBody);

  const loginCookies = extractCookies(loginRes.headers);
  return [initCookies, loginCookies].filter(Boolean).join('; ');
}

async function main() {
  console.log('Logging in to czwh.wms.yunwms.com...');
  const cookie = await login();
  console.log('Logged in successfully.');

  // Fetch /shipment/pick/list
  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/pick/list?quick=101',
    method: 'GET',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  console.log('GET /shipment/pick/list status:', res.statusCode);
  fs.writeFileSync('scripts/scratch-pick-list.html', res.body);
  console.log('Saved to scripts/scratch-pick-list.html, length:', res.body.length);

  // Look for buttons, scripts, forms, endpoints
  const scriptMatches = [...res.body.matchAll(/<script[^>]*src=["']([^"']+)["']/gi)].map(m => m[1]);
  console.log('Scripts found:', scriptMatches);

  // Search for keywords like "create", "picking", "generate", "btn", "add"
  const lines = res.body.split('\n');
  const relevantLines = lines.filter(l => /create|pick|button|action|modal|dialog/i.test(l)).slice(0, 30);
  console.log('\nRelevant lines preview:');
  relevantLines.forEach(l => console.log('  ', l.trim().slice(0, 120)));
}

main().catch(console.error);
