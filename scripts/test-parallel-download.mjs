import https from 'https';

const agent = new https.Agent({ keepAlive: true, maxSockets: 50, timeout: 30000 });

async function req(hostname, path, method, data, cookie) {
  return new Promise((resolve, reject) => {
    const r = https.request({
      hostname, path, method, agent,
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
      res.on('end', () => resolve({ headers: res.headers, raw: Buffer.concat(chunks), body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function testParallelDownload() {
  const initRes = await req('czwh.wms.yunwms.com', '/', 'GET');
  const initCookies = (initRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  const passwordBase64 = Buffer.from('12345abc').toString('base64');
  const loginRes = await req('czwh.wms.yunwms.com', '/login.html', 'POST', `userName=David&userPass=${encodeURIComponent(passwordBase64)}`, initCookies);
  const authCookies = [initCookies, ...(loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0])].join('; ');

  // Get first 10 orders from PL72610210020
  const listRes = await req('czwh.wms.yunwms.com', '/order/orders/list/page/1/pageSize/10', 'POST', 'E4=7&picking_code=PL72610210020', authCookies);
  const list = JSON.parse(listRes.body).data;

  // Get attachment info for these 10 orders
  const attachUrls = [];
  for (const o of list) {
    const attachRes = await req('czwh.wms.yunwms.com', `/order/orders/attachment-edit/page/1/pageSize/10/order_id/${o.E0}`, 'POST', '', authCookies);
    const attachJson = JSON.parse(attachRes.body);
    const f = (attachJson.attach_file || [])[0];
    if (f) attachUrls.push(f.download_file || f.oat_file_path);
  }

  console.log('Got', attachUrls.length, 'attachment URLs. Now testing parallel download of these 10 PDFs:');
  console.time('parallelDownload10');
  await Promise.all(attachUrls.map(async u => {
    try {
      const parsed = new URL(u);
      return await req(parsed.hostname, parsed.pathname + parsed.search, 'GET');
    } catch (e) {
      return null;
    }
  }));
  console.timeEnd('parallelDownload10');
}

testParallelDownload().catch(console.error);
