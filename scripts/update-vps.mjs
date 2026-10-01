import { Client } from 'ssh2';

const conn = new Client();

function executeCommand(conn, command) {
  return new Promise((resolve, reject) => {
    console.log(`[EXEC] ${command}`);
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      stream.on('close', (code) => {
        resolve(stdout);
      }).on('data', (data) => {
        process.stdout.write(data.toString());
        stdout += data.toString();
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('SSH connected to VPS.');
  await executeCommand(conn, 'cd /var/www/wms-order-tool && git pull origin main && npm run build && pm2 restart wms-server');
  console.log('Update complete!');
  conn.end();
}).connect({
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@',
  readyTimeout: 15000,
});
