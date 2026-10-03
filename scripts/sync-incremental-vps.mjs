import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected to VPS.');
  const nodeScript = `
    import https from 'https';
    import { createClient } from '@libsql/client';

    const db = createClient({ url: 'file:data/tracking.sqlite' });

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

    function layNhomTuSKU(sku) {
      if (!sku) return 'Khác';
      const clean = sku.trim().toUpperCase();
      if (clean.includes('THAM') || clean.includes('YOGA') || clean.includes('DINH TUYEN')) return 'Thảm Yoga';
      if (clean.startsWith('YD-A')) return 'YD-A';
      if (clean.startsWith('YD-B')) return 'YD-B';
      if (clean.startsWith('YD-D')) return 'YD-D';
      if (clean.startsWith('YD-G')) return 'YD-G';
      if (clean.startsWith('YD-HMC')) return 'YD-HMC';
      if (clean.startsWith('YD-HMS')) return 'YD-HMS';
      if (clean.startsWith('YD-HM')) return 'YD-HM';
      if (clean.startsWith('YD-H')) return 'YD-H';
      if (clean.startsWith('YD-K')) return 'YD-K';
      if (clean.startsWith('YD-L')) return 'YD-L';
      if (clean.startsWith('YD-P')) return 'YD-P';
      if (clean.startsWith('YD-W')) return 'YD-W';
      if (clean.startsWith('YD-SD')) return 'YD-SD';
      if (clean.startsWith('YD-BUBBLEWRAP')) return 'YD-BUBBLEWRAP';
      return 'Khác';
    }

    async function syncNewOrders() {
      console.log('--- BẮT ĐẦU ĐỒNG BỘ ĐƠN MỚI TỪ YUNWMS VÀO SQLITE ---');
      const cookie = await login();
      console.log('✅ Đã đăng nhập YunWMS thành công.');

      // 1. Kiểm tra tổng số đơn hiện tại trong SQLite
      const beforeCountRes = await db.execute('SELECT count(*) as cnt FROM wms_shipped_orders');
      const countBefore = beforeCountRes.rows[0].cnt;
      console.log('📊 Số đơn hiện có trong SQLite:', countBefore);

      // 2. Lấy danh sách 10,000 order_no gần nhất trong SQLite để kiểm tra trùng nhanh
      const recentOrdersRes = await db.execute('SELECT order_no FROM wms_shipped_orders ORDER BY creation_time DESC LIMIT 15000');
      const existingOrderNos = new Set(recentOrdersRes.rows.map(r => r.order_no));
      console.log('⚡ Đã tải cache ' + existingOrderNos.size + ' mã đơn gần nhất để chống trùng lặp.');

      let totalNewOrdersInserted = 0;
      let totalNewItemsInserted = 0;
      let consecutiveFullExistingPages = 0;
      const pageSize = 500;

      for (let page = 1; page <= 30; page++) {
        const query = 'E4=7&E11=8';
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
            'Content-Length': Buffer.byteLength(query)
          }
        }, query);

        let json = {};
        try {
          json = JSON.parse(res.body);
        } catch (e) {
          console.error('Lỗi parse JSON trang ' + page, e);
          break;
        }

        const orders = json.data || [];
        if (orders.length === 0) {
          console.log('Trang ' + page + ' không có dữ liệu, dừng.');
          break;
        }

        let newOrdersOnPage = 0;
        const statements = [];

        for (const o of orders) {
          const orderNo = (o.E1 || o.E17 || '').trim();
          if (!orderNo) continue;

          // Nếu đơn này đã có trong database
          if (existingOrderNos.has(orderNo)) {
            continue;
          }

          newOrdersOnPage++;
          existingOrderNos.add(orderNo);

          const trackingNo = (o.tracking_number || '').trim();
          const creationTime = (o.E14 || '').trim();
          const shippedTime = (o.E15 || o.E16 || o.E18 || o.E20 || o.shipped_time || creationTime || '').trim();
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
            const groupName = layNhomTuSKU(it.sku);
            statements.push({
              sql: 'INSERT OR IGNORE INTO wms_shipped_order_items (id, order_no, sku, qty, product_title, group_name, shipped_time, creation_time, is_single_sku) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              args: [
                itemId, orderNo, it.sku, it.qty, it.productTitle || null, groupName, shippedTime || null, creationTime || null, isSingleSku
              ]
            });
            totalNewItemsInserted++;
          }
        }

        if (statements.length > 0) {
          await db.batch(statements, 'write');
          totalNewOrdersInserted += newOrdersOnPage;
        }

        console.log('Trang ' + page + ': có ' + orders.length + ' đơn, trong đó ' + newOrdersOnPage + ' đơn MỚI được nạp vào SQL.');

        if (newOrdersOnPage === 0) {
          consecutiveFullExistingPages++;
          if (consecutiveFullExistingPages >= 2) {
            console.log('Đã chạm tới các đơn cũ đã tồn tại liên tiếp (2 trang). Quá trình đồng bộ hoàn tất!');
            break;
          }
        } else {
          consecutiveFullExistingPages = 0;
        }
      }

      // 3. Cập nhật Metadata
      const afterCountRes = await db.execute('SELECT count(*) as cnt FROM wms_shipped_orders');
      const countAfter = afterCountRes.rows[0].cnt;

      const minMaxRes = await db.execute('SELECT min(COALESCE(NULLIF(shipped_time, "0"), creation_time)) as min_date, max(COALESCE(NULLIF(shipped_time, "0"), creation_time)) as max_date FROM wms_shipped_orders WHERE (shipped_time IS NOT NULL AND shipped_time != "0") OR (creation_time IS NOT NULL AND creation_time != "")');
      const minDate = minMaxRes.rows[0].min_date;
      const maxDate = minMaxRes.rows[0].max_date;

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

      console.log('==============================================');
      console.log('🎉 ĐỒNG BỘ THÀNH CÔNG:');
      console.log('- Đơn mới nạp vào SQL:', totalNewOrdersInserted, 'đơn');
      console.log('- Chi tiết sản phẩm mới:', totalNewItemsInserted, 'items');
      console.log('- Tổng đơn trong SQLite hiện tại:', countAfter, 'đơn');
      console.log('- Thời gian xuất kho sớm nhất:', minDate);
      console.log('- Thời gian xuất kho mới nhất:', maxDate);
      console.log('- Thời gian cập nhật:', vnNow);
      console.log('==============================================');
    }

    syncNewOrders().catch(console.error);
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
