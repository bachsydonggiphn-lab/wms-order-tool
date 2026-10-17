import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected.');
  const nodeScript = `
    import { createClient } from '@libsql/client';
    const db = createClient({ url: 'file:data/tracking.sqlite' });

    const totalOrdersRes = await db.execute("SELECT count(*) as cnt FROM wms_shipped_orders");
    const totalItemsRes = await db.execute("SELECT count(*) as cnt FROM wms_shipped_order_items");
    const countOrders = totalOrdersRes.rows[0].cnt;
    const countItems = totalItemsRes.rows[0].cnt;

    const minMaxRes = await db.execute("SELECT min(shipped_time) as min_date, max(shipped_time) as max_date FROM wms_shipped_orders WHERE length(shipped_time) >= 8");
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

    const statements = [
      {
        sql: 'INSERT INTO wms_sync_meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
        args: ['last_shipped_sync_time', vnNow]
      },
      {
        sql: 'INSERT INTO wms_sync_meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
        args: ['shipped_total_orders', String(countOrders)]
      },
      {
        sql: 'INSERT INTO wms_sync_meta (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
        args: ['shipped_sync_status', 'idle']
      }
    ];

    await db.batch(statements, 'write');

    console.log('=== METADATA SAVED ===');
    console.log('Total Orders in SQLite:', countOrders);
    console.log('Total Items in SQLite:', countItems);
    console.log('Min Date:', minDate);
    console.log('Max Date:', maxDate);
    console.log('Updated At:', vnNow);

    const dates = await db.execute("SELECT substr(shipped_time, 1, 8) as dt, count(*) as cnt FROM wms_shipped_orders GROUP BY dt ORDER BY dt DESC LIMIT 10");
    console.table(dates.rows);
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
