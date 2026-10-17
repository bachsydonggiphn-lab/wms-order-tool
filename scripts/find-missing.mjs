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

    async function checkDiff() {
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
      const sqlRes = await db.execute('SELECT count(*) as cnt FROM wms_shipped_orders');
      console.log('Current SQLite Total:', sqlRes.rows[0].cnt);

      // Check YunWMS page 1 to 7 again and see if any orders are missing
      let missingInSql = [];
      for (let page = 1; page <= 7; page++) {
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
        if (page === 1) console.log('Current YunWMS Total:', json.total);
        const orders = json.data || [];
        for (const o of orders) {
          const check = await db.execute({
            sql: 'SELECT order_no FROM wms_shipped_orders WHERE order_no = ?',
            args: [o.E1]
          });
          if (check.rows.length === 0) {
            missingInSql.push({ page: page, order: o.E1, cTime: o.E14, items: (o.productList || []).length });
          }
        }
      }
      console.log('Missing orders across pages 1 to 7:', missingInSql.length);
      if (missingInSql.length > 0) {
        console.log('First 5 missing:', JSON.stringify(missingInSql.slice(0, 5), null, 2));
      }
    }
    checkDiff().catch(console.error);
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
