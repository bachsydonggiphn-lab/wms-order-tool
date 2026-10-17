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

    async function inspect() {
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

      const post1 = 'E4=7&E11=8';
      const r1 = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: '/order/orders/list/page/1/pageSize/10',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
          'Content-Length': Buffer.byteLength(post1)
        }
      }, post1);
      
      const json1 = JSON.parse(r1.body);
      console.log('YunWMS Total Orders:', json1.total);
      const yOrders = json1.data || [];
      for (let i = 0; i < Math.min(5, yOrders.length); i++) {
        const o = yOrders[i];
        console.log('YunWMS #' + (i+1) + ': E0=' + o.E0 + ', E1=' + o.E1 + ', E17=' + o.E17 + ', E14=' + o.E14);
      }

      const db = createClient({ url: 'file:/var/www/wms-order-tool/data/tracking.sqlite' });
      const recent = await db.execute('SELECT order_no, creation_time FROM wms_shipped_orders ORDER BY creation_time DESC LIMIT 5');
      console.log('SQLite Recent:');
      recent.rows.forEach((r, i) => {
        console.log('SQLite #' + (i+1) + ': order_no=' + r.order_no + ', creation_time=' + r.creation_time);
      });

      // Check if YunWMS orders exist in SQLite
      for (const o of yOrders.slice(0, 5)) {
        const exists = await db.execute({
          sql: 'SELECT order_no FROM wms_shipped_orders WHERE order_no = ?',
          args: [o.E1]
        });
        console.log('Check ' + o.E1 + ' in SQLite: ' + (exists.rows.length > 0 ? 'EXISTS' : 'NOT_FOUND'));
      }
    }
    inspect().catch(console.error);
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
