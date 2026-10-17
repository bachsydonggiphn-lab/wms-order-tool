import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const remoteCmd = `cd /var/www/wms-order-tool && node --input-type=module -e "
    import { createClient } from '@libsql/client';
    const db = createClient({ url: 'file:/var/www/wms-order-tool/data/tracking.sqlite' });
    const r = await db.execute('SELECT count(*) as total FROM wms_shipped_orders');
    const items = await db.execute('SELECT count(*) as total_items FROM wms_shipped_order_items');
    const m = await db.execute('SELECT * FROM wms_sync_meta');
    const minMax = await db.execute('SELECT min(creation_time) as min_c, max(creation_time) as max_c, min(shipped_time) as min_s, max(shipped_time) as max_s FROM wms_shipped_orders');
    console.log(JSON.stringify({ totalOrders: r.rows[0].total, totalItems: items.rows[0].total_items, minMax: minMax.rows[0], meta: m.rows }, null, 2));
  "`;

  conn.exec(remoteCmd, (err, stream) => {
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
