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

  const orderCode = 'YD-261021-4686';

  // 1. /shipment/orders-pack/initialize-by-orders/orderCode/YD-261021-4686
  const res1 = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: `/shipment/orders-pack/initialize-by-orders/orderCode/${orderCode}`,
    method: 'GET',
    headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' }
  });
  console.log('initialize-by-orders:', res1.statusCode, res1.body.slice(0, 500));

  // 2. /shipment/orders-one-pack/get-order-info
  const postData = `orderCode=${orderCode}`;
  const res2 = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/orders-one-pack/get-order-info',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);
  console.log('orders-one-pack get-order-info:', res2.statusCode, res2.body.slice(0, 500));
}

main().catch(console.error);
