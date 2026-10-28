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
  console.log('Logged in successfully.');

  // 1. Search PL72610210066 with E4=7
  const pl = 'PL72610210066';
  const postBody = `E4=7&picking_code=${encodeURIComponent(pl)}`;
  
  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/order/orders/list/page/1/pageSize/50',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
      'Content-Length': Buffer.byteLength(postBody)
    }
  }, postBody);

  const data = JSON.parse(res.body);
  console.log(`Found ${data.total} orders for ${pl}:`);
  if (data.data && data.data.length > 0) {
    console.log('Sample order:');
    const sample = data.data[0];
    console.log({
      order_id: sample.E0,
      order_code: sample.E1,
      ref_no: sample.E17,
      status: sample.E11,
      picking_code: sample.picking_code,
      warehouse: sample.E4,
      channel: sample.E7,
      tracking: sample.tracking_number
    });

    // Count by status
    const statusCounts = {};
    data.data.forEach(o => {
      statusCounts[o.E11] = (statusCounts[o.E11] || 0) + 1;
    });
    console.log('Status distribution (E11):', statusCounts);
  }

  // Also let's check picking list module in YunWMS!
  // In YunWMS, picking lists are often at /order/picking/list or /order/picking-list or /warehouse/picking
  const pickingPaths = [
    '/order/picking/list/page/1/pageSize/10',
    '/order/picking-list/page/1/pageSize/10',
    '/order/order-picking/list/page/1/pageSize/10',
    '/order/picking/index',
    '/order/orders/batch-ship',
    '/order/orders/update-status'
  ];

  for (const path of pickingPaths) {
    try {
      const pRes = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://czwh.wms.yunwms.com/',
          'Content-Length': 0
        }
      });
      console.log(`Probe POST ${path} -> HTTP ${pRes.statusCode}, body length: ${pRes.body.length}, snippet: ${pRes.body.slice(0, 100)}`);
    } catch (e) {
      console.log(`Probe POST ${path} -> error: ${e.message}`);
    }
  }
}

main().catch(console.error);
