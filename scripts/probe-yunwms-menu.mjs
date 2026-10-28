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
  const cookie = await login();

  // GET /order/orders/list
  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/order/orders/list',
    method: 'GET',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('GET /order/orders/list status:', res.statusCode);
  fs.writeFileSync('scripts/scratch-orders-list.html', res.body);

  // Find all script src
  const scripts = [...res.body.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  console.log('Script sources:', scripts);

  // Let's also check default menu / left menu
  const menuRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/default/index/get-menu',
    method: 'POST',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  console.log('Menu response status:', menuRes.statusCode, 'body length:', menuRes.body.length);
  if (menuRes.statusCode === 200) {
    fs.writeFileSync('scripts/scratch-menu.json', menuRes.body);
  }
}

main().catch(console.error);
