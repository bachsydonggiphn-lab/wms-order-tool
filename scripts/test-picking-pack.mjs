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

  // 1. Test get-picking in orders-one-pack
  const res1 = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/orders-one-pack/get-picking?pickingCode=PL72610210066',
    method: 'GET',
    headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0', 'X-Requested-With': 'XMLHttpRequest' }
  });
  console.log('orders-one-pack get-picking:', res1.statusCode, res1.body.slice(0, 500));

  // 2. Test virtual delivery get-virtual-order-info with order_code or pickingCode
  const postData = 'code=PL72610210066';
  const res2 = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/virtual-delivery/get-virtual-order-info',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);
  console.log('virtual-delivery get-virtual-order-info (PL):', res2.statusCode, res2.body.slice(0, 500));

  // 3. Test virtual delivery with order_code
  const postData2 = 'code=YD-261021-4686';
  const res3 = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/virtual-delivery/get-virtual-order-info',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Length': Buffer.byteLength(postData2)
    }
  }, postData2);
  console.log('virtual-delivery get-virtual-order-info (order_code):', res3.statusCode, res3.body.slice(0, 500));
}

main().catch(console.error);
