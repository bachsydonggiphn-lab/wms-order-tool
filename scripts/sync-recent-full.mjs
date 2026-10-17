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

    async function fullSyncRecent() {
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
      const recentOrdersRes = await db.execute('SELECT order_no FROM wms_shipped_orders ORDER BY creation_time DESC LIMIT 40000');
      const existingOrderNos = new Set(recentOrdersRes.rows.map(r => String(r.order_no)));
      console.log('Loaded ' + existingOrderNos.size + ' existing order numbers from SQLite.');

      let totalNewOrders = 0;
      let totalNewItems = 0;
      const pageSize = 500;

      // Scan pages 1 through 40 to catch ANY gap or late-shipped orders
      for (let page = 1; page <= 40; page++) {
        const post = 'E4=7&E11=8';
        const res = await httpsRequest({
          hostname: 'czwh.wms.yunwms.com',
          path: '/order/orders/list/page/' + page + '/pageSize/' + pageSize,
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
        if (orders.length === 0) break;

        const statements = [];
        let pageNew = 0;

        for (const o of orders) {
          const orderNo = (o.E1 || o.E17 || '').trim();
          if (!orderNo || existingOrderNos.has(orderNo)) continue;

          existingOrderNos.add(orderNo);
          pageNew++;

          const trackingNo = (o.tracking_number || '').trim();
          const creationTime = (o.E14 || '').trim();
          let shippedTime = (o.E15 || o.E16 || o.E18 || o.E20 || o.shipped_time || creationTime || '').trim();
          if (!shippedTime || shippedTime.length < 8) shippedTime = creationTime;
          const pickingList = (o.picking_code || '').trim();
          const carrier = (o.E7 || o.carrier || '').trim();

          const rawItems = Array.isArray(o.productList) ? o.productList : [];
          const items = rawItems.map(it => ({
            sku: (it.product_barcode || it.sku || '').trim(),
            qty: Math.max(1, parseInt(String(it.op_quantity || it.qty || 1), 10)),
            productTitle: it.product_title || ''
          })).filter(it => it.sku);

          const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
          const skuCount = items.length;
          const isSingleSku = (skuCount === 1 && totalQty === 1) ? 1 : (skuCount === 1 ? 1 : 0);

          statements.push({
            sql: 'INSERT OR IGNORE INTO wms_shipped_orders (order_no, tracking_no, ref_no, channel, customer_code, warehouse_id, warehouse_name, carrier, creation_time, shipped_time, picking_list, total_qty, sku_count, is_single_sku, status_e11, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            args: [
              orderNo, trackingNo || null, null, null, 'YD', '7', 'VN02 [Kho Hồ Chí Minh]',
              carrier || null, creationTime || null, shippedTime || null, pickingList || null,
              totalQty, skuCount, isSingleSku, '8'
            ]
          });

          for (let idx = 0; idx < items.length; idx++) {
            const it = items[idx];
            const itemId = orderNo + '_' + it.sku + '_' + idx;
            statements.push({
              sql: 'INSERT OR IGNORE INTO wms_shipped_order_items (id, order_no, sku, qty, product_title, group_name, shipped_time, creation_time, is_single_sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              args: [
                itemId, orderNo, it.sku, it.qty, it.productTitle || null, 'DEFAULT', shippedTime || null, creationTime || null, isSingleSku
              ]
            });
            totalNewItems++;
          }
        }

        if (statements.length > 0) {
          await db.batch(statements, 'write');
          totalNewOrders += pageNew;
        }

        const first = orders[0];
        const last = orders[orders.length - 1];
        console.log('Page ' + page + ': ' + orders.length + ' orders [' + first?.E14 + ' -> ' + last?.E14 + '] -> NEW: ' + pageNew);
      }

      const totalRes = await db.execute('SELECT count(*) as total FROM wms_shipped_orders');
      const countAfter = totalRes.rows[0].total;

      const vnNow = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date());

      await db.execute({
        sql: 'INSERT INTO wms_sync_meta (key, value, updated_at) VALUES ("last_shipped_sync_time", ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
        args: [vnNow]
      });
      await db.execute({
        sql: 'INSERT INTO wms_sync_meta (key, value, updated_at) VALUES ("shipped_total_orders", ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
        args: [String(countAfter)]
      });
      await db.execute({
        sql: 'INSERT INTO wms_sync_meta (key, value, updated_at) VALUES ("shipped_sync_status", "idle", CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value="idle", updated_at=CURRENT_TIMESTAMP',
        args: []
      });

      console.log('SYNC COMPLETE:');
      console.log('- Total New Orders Added:', totalNewOrders);
      console.log('- Total New Items Added:', totalNewItems);
      console.log('- Current Total in SQLite:', countAfter);
    }
    fullSyncRecent().catch(console.error);
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
