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

async function getPlDetail(cookie, plNo) {
  const postData = `E01=${encodeURIComponent(plNo)}`;
  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/picking-detail/list/page/1/pageSize/100',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, postData);

  try {
    const json = JSON.parse(res.body);
    return json.data || [];
  } catch (e) {
    return [];
  }
}

async function main() {
  const cookie = await login();

  const samplePls = ['PL72610240020', 'PL72610230018', 'PL72610250050', 'PL72610220009', 'PL72610250007'];

  for (const pl of samplePls) {
    console.log(`\n=== Chi Tiết PL: ${pl} ===`);
    const details = await getPlDetail(cookie, pl);
    console.log(`Số dòng chi tiết SKU: ${details.length}`);
    if (details.length > 0) {
      console.log('Sample detail:', JSON.stringify(details[0]));
    }
  }
}

main().catch(console.error);
