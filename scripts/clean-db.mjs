import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connected.');
  const nodeScript = `
    import { createClient } from '@libsql/client';
    const db = createClient({ url: 'file:data/tracking.sqlite' });

    // Clean up shipped_time < 8 chars
    const upOrders = await db.execute("UPDATE wms_shipped_orders SET shipped_time = creation_time WHERE length(shipped_time) < 8 OR shipped_time IS NULL");
    console.log('Updated orders count:', upOrders.rowsAffected);

    const upItems = await db.execute("UPDATE wms_shipped_order_items SET shipped_time = creation_time WHERE length(shipped_time) < 8 OR shipped_time IS NULL");
    console.log('Updated items count:', upItems.rowsAffected);

    const minMaxRes = await db.execute("SELECT min(shipped_time) as min_date, max(shipped_time) as max_date FROM wms_shipped_orders WHERE length(shipped_time) >= 8");
    console.log('Min Shipped Time:', minMaxRes.rows[0].min_date);
    console.log('Max Shipped Time:', minMaxRes.rows[0].max_date);

    const totalOrdersRes = await db.execute("SELECT count(*) as cnt FROM wms_shipped_orders");
    const totalItemsRes = await db.execute("SELECT count(*) as cnt FROM wms_shipped_order_items");
    console.log('Total Orders in SQLite:', totalOrdersRes.rows[0].cnt);
    console.log('Total Items in SQLite:', totalItemsRes.rows[0].cnt);
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
