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

  // 1. Get HTML of /shipment/picking/list
  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/picking/list',
    method: 'GET',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0'
    }
  });

  console.log('GET /shipment/picking/list status:', res.statusCode);
  fs.writeFileSync('scripts/scratch-picking-list.html', res.body);

  // 2. Query picking list page
  const queryPl = 'picking_code=PL72610210066';
  const listRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/picking/list/page/1/pageSize/20',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/shipment/picking/list',
      'Content-Length': Buffer.byteLength(queryPl)
    }
  }, queryPl);

  console.log('POST /shipment/picking/list/... status:', listRes.statusCode);
  console.log('Picking List response:', listRes.body.slice(0, 1000));

  // 3. Also check quick delivery /shipment/quick-delivery/index
  const qdRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/quick-delivery/index',
    method: 'GET',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0'
    }
  });
  console.log('GET /shipment/quick-delivery/index status:', qdRes.statusCode);
  fs.writeFileSync('scripts/scratch-quick-delivery.html', qdRes.body);

  // 4. Also check order delivery /shipment/orders/delivery
  const delivRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/orders/delivery',
    method: 'GET',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0'
    }
  });
  console.log('GET /shipment/orders/delivery status:', delivRes.statusCode);
  fs.writeFileSync('scripts/scratch-orders-delivery.html', delivRes.body);
}

main().catch(console.error);
