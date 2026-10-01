const { createClient } = require('@libsql/client');
const path = require('path');

const db = createClient({
  url: 'file:' + path.join(__dirname, '..', 'data', 'tracking.sqlite')
});

async function main() {
  console.log('1. Cập nhật wms_shipped_order_items...');
  const t0 = Date.now();
  await db.execute(`
    UPDATE wms_shipped_order_items 
    SET shipped_time = creation_time 
    WHERE shipped_time = '0' OR shipped_time IS NULL OR length(shipped_time) < 5;
  `);
  console.log(`Đã chuẩn hóa items xong trong ${Date.now() - t0} ms`);

  console.log('2. Cập nhật wms_shipped_orders...');
  const t1 = Date.now();
  await db.execute(`
    UPDATE wms_shipped_orders 
    SET shipped_time = creation_time 
    WHERE shipped_time = '0' OR shipped_time IS NULL OR length(shipped_time) < 5;
  `);
  console.log(`Đã chuẩn hóa orders xong trong ${Date.now() - t1} ms`);

  const res = await db.execute(`
    SELECT length(shipped_time) as len, count(*) as cnt 
    FROM wms_shipped_order_items 
    GROUP BY length(shipped_time);
  `);
  console.log('Phân bố độ dài shipped_time sau khi sửa:', res.rows);
}

main().catch(console.error);
