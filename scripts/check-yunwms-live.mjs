import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected.');
  const nodeScript = `
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

      const loginData = JSON.parse(loginRes.body);
      console.log('Login result:', loginData);
      const loginCookies = extractCookies(loginRes.headers);
      return [initCookies, loginCookies].filter(Boolean).join('; ');
    }

    async function run() {
      const cookie = await login();

      // 1. Query total shipped orders
      const query1 = 'E4=7&E11=8';
      const res1 = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: '/order/orders/list/page/1/pageSize/10',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
          'Content-Length': Buffer.byteLength(query1)
        }
      }, query1);

      const json1 = JSON.parse(res1.body);
      console.log('=== YUNWMS ALL SHIPPED (Kho VN02, Mã 8) ===');
      console.log('Total Orders in YunWMS:', json1.total);
      if (json1.data && json1.data.length > 0) {
        console.log('Latest 3 Orders in YunWMS:');
        json1.data.slice(0, 3).forEach(o => {
          console.log({
            orderNo: o.E1 || o.E17,
            trackingNo: o.tracking_number,
            creationTime: o.E14,
            shippedTime: o.E15 || o.E16 || o.E18 || o.E20
          });
        });
      }

      // 2. Query orders on 2026-10-01 to 2026-10-03
      const query2 = 'E4=7&E11=8&searchDateType=createDate&dateFor=' + encodeURIComponent('2026-10-01 00:00') + '&dateTo=' + encodeURIComponent('2026-10-03 23:59');
      const res2 = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: '/order/orders/list/page/1/pageSize/10',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
          'Content-Length': Buffer.byteLength(query2)
        }
      }, query2);

      const json2 = JSON.parse(res2.body);
      console.log('=== YUNWMS ORDERS (01/10/2026 - 03/10/2026) ===');
      console.log('Total in range:', json2.total);
      if (json2.data && json2.data.length > 0) {
        console.log('Latest in range:', json2.data[0].E1, json2.data[0].E14);
      }

      // 3. Query SQLite local
      const { createClient } = await import('@libsql/client');
      const db = createClient({ url: 'file:data/tracking.sqlite' });
      const sqlTotal = await db.execute('SELECT count(*) as cnt FROM wms_shipped_orders');
      console.log('=== SQLITE LOCAL DATABASE ===');
      console.log('Total in SQLite:', sqlTotal.rows[0].cnt);
    }

    run().catch(console.error);
  `;

  conn.exec(`cd /var/www/wms-order-tool && node --input-type=module -e "${nodeScript.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect({
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@'
});
