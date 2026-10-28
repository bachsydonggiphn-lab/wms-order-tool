import https from 'https';

async function test() {
  const initRes = await req('czwh.wms.yunwms.com', '/', 'GET');
  const initCookies = (initRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');

  const passwordBase64 = Buffer.from('12345abc').toString('base64');
  const loginBody = `userName=David&userPass=${encodeURIComponent(passwordBase64)}`;
  const loginRes = await req('czwh.wms.yunwms.com', '/login.html', 'POST', loginBody, initCookies);
  const loginCookies = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  const authCookies = [initCookies, loginCookies].join('; ');

  const postBody = 'E4=7&picking_code=PL72610210020';
  const listRes = await req('czwh.wms.yunwms.com', '/order/orders/list/page/1/pageSize/5', 'POST', postBody, authCookies);
  const json = JSON.parse(listRes.body);
  console.log('Total:', json.total);
  if (json.data && json.data[0]) {
    console.log('Keys of first order:', Object.keys(json.data[0]));
    console.log('Sample order data:', JSON.stringify(json.data[0], null, 2));
  }
}

function req(hostname, path, method, data, cookie) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname, path, method,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookie || '',
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/'
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

test().catch(console.error);
