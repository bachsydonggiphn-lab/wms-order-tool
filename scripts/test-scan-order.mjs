import https from 'https';

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

  // Test scan-order-info
  const postData = 'sc_code=&order_code=YD-261021-4686&scanProduct=1&isAutoChannel=1&deliveryScan=0&isTrackConvent=';
  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/orders/scan-order-info',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/shipment/orders/delivery',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  console.log('scan-order-info status:', res.statusCode);
  console.log('scan-order-info body:', res.body);
}

main().catch(console.error);
