import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const script = `
    import { createClient } from '@libsql/client';
    async function updateMeta() {
      const db = createClient({ url: 'file:/var/www/wms-order-tool/data/tracking.sqlite' });
      const r = await db.execute('SELECT count(*) as cnt FROM wms_shipped_orders');
      const total = String(r.rows[0].cnt);
      
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
        sql: "INSERT INTO wms_sync_meta (key, value, updated_at) VALUES ('shipped_total_orders', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        args: [total]
      });
      await db.execute({
        sql: "INSERT INTO wms_sync_meta (key, value, updated_at) VALUES ('last_shipped_sync_time', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
        args: [vnNow]
      });
      await db.execute({
        sql: "INSERT INTO wms_sync_meta (key, value, updated_at) VALUES ('shipped_sync_status', 'idle', CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = 'idle', updated_at = CURRENT_TIMESTAMP",
        args: []
      });

      console.log('UPDATED META: total=' + total + ', time=' + vnNow);
    }
    updateMeta().catch(console.error);
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
