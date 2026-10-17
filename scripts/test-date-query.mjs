import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const script = `
    import https from 'https';
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
    async function test() {
      // 1. Login
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
      console.log('Login cookie obtained');
      
      // Test 1: dateFor as sent by current wmsApiMiddleware (no time, no dateTo)
      const post1 = 'E4=7&E11=8&searchDateType=createDate&dateFor=2026-10-02';
      const r1 = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: '/order/orders/list/page/1/pageSize/50',
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
      console.log('Test 1 status:', r1.statusCode, 'body prefix:', r1.body.slice(0, 300));
      
      // Test 2: dateFor with 00:00 and dateTo with 23:59
      const post2 = 'E4=7&E11=8&searchDateType=createDate&dateFor=2026-10-02%2000%3A00&dateTo=2026-10-02%2023%3A59';
      const r2 = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: '/order/orders/list/page/1/pageSize/50',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
          'Content-Length': Buffer.byteLength(post2)
        }
      }, post2);
      console.log('Test 2 status:', r2.statusCode, 'body prefix:', r2.body.slice(0, 300));
    }
    test().catch(console.error);
  `;
  conn.exec(`cd /var/www/wms-order-tool && node --input-type=module -e "${script.replace(/"/g, '\\"').replace(/\$/g, '\\$')}"`, (err, stream) => {
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
