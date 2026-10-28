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
      res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  const initRes = await req('czwh.wms.yunwms.com', '/', 'GET');
  const initCookies = (initRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  const passwordBase64 = Buffer.from('12345abc').toString('base64');
  const loginRes = await req('czwh.wms.yunwms.com', '/login.html', 'POST', `userName=David&userPass=${encodeURIComponent(passwordBase64)}`, initCookies);
  const authCookies = [initCookies, ...(loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0])].join('; ');

  console.time('fetchList');
  const listRes = await req('czwh.wms.yunwms.com', '/order/orders/list/page/1/pageSize/500', 'POST', 'E4=7&picking_code=PL72610210020', authCookies);
  const json = JSON.parse(listRes.body);
  console.timeEnd('fetchList');
  console.log('Orders found:', json.data.length);

  // Test fetching 50 attachments with concurrency 35
  const sample = json.data.slice(0, 50);
  console.time('fetch50Attachments');
  let active = 0;
  let idx = 0;
  await new Promise((resolve) => {
    function next() {
      if (idx >= sample.length && active === 0) return resolve();
      while (active < 30 && idx < sample.length) {
        active++;
        const o = sample[idx++];
        req('czwh.wms.yunwms.com', `/order/orders/attachment-edit/page/1/pageSize/10/order_id/${o.E0}`, 'POST', '', authCookies)
          .then(res => {
            active--;
            next();
          }).catch(() => {
            active--;
            next();
          });
      }
    }
    next();
  });
  console.timeEnd('fetch50Attachments');
}

run().catch(console.error);
