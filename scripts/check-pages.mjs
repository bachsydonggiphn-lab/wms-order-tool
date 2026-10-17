import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const script = `
    import https from 'https';
    import { createClient } from '@libsql/client';

    function httpsRequest(options, postData) {
      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
      });
    }

    async function checkPages() {
      const p = Buffer.from('12345abc').toString('base64');
      const lb = 'userName=David&userPass=' + encodeURIComponent(p);
      const lr = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: '/login.html',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Length': Buffer.byteLength(lb)
        }
      }, lb);
      const rawCookies = lr.headers['set-cookie'] || [];
      const cookie = rawCookies.map(c => c.split(';')[0]).join('; ');

      const db = createClient({ url: 'file:/var/www/wms-order-tool/data/tracking.sqlite' });
      const recentOrdersRes = await db.execute('SELECT order_no FROM wms_shipped_orders ORDER BY creation_time DESC LIMIT 30000');
      const existingOrderNos = new Set(recentOrdersRes.rows.map(r => String(r.order_no)));

      console.log('Loaded ' + existingOrderNos.size + ' existing order numbers from SQLite.');

      for (let page = 6; page <= 15; page++) {
        const post = 'E4=7&E11=8';
        const res = await httpsRequest({
          hostname: 'czwh.wms.yunwms.com',
          path: '/order/orders/list/page/' + page + '/pageSize/500',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
            'Content-Length': Buffer.byteLength(post)
          }
        }, post);

        const json = JSON.parse(res.body);
        const orders = json.data || [];
        let newCount = 0;
        let sampleNew = [];
        let dates = [];
        for (const o of orders) {
          if (!existingOrderNos.has(o.E1)) {
            newCount++;
            if (sampleNew.length < 3) sampleNew.push({ order: o.E1, cTime: o.E14, sTime: o.E15 || o.shipped_time });
          }
        }
        const first = orders[0];
        const last = orders[orders.length - 1];
        console.log('Page ' + page + ': total ' + orders.length + ' orders | first: ' + first?.E1 + ' (' + first?.E14 + ') | last: ' + last?.E1 + ' (' + last?.E14 + ') | NEW orders in SQL: ' + newCount);
        if (sampleNew.length > 0) {
          console.log('   Sample new:', JSON.stringify(sampleNew));
        }
      }
    }
    checkPages().catch(console.error);
  `;

  conn.exec(`cd /var/www/wms-order-tool && node --input-type=module << 'EOF'\n${script}\nEOF`, (err, stream) => {
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
