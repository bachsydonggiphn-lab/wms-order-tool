import { Client } from 'ssh2';

const config = {
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@',
  readyTimeout: 30000,
};

export function runRemoteCommands(commands) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', async () => {
      console.log('✅ SSH connected to VPS');
      try {
        for (const cmd of commands) {
          console.log(`\n>>> [EXEC] ${cmd}`);
          await new Promise((res, rej) => {
            conn.exec(cmd, (err, stream) => {
              if (err) return rej(err);
              stream.on('close', (code) => {
                if (code !== 0) {
                  console.warn(`[WARN] Code: ${code}`);
                }
                res();
              }).on('data', d => process.stdout.write(d.toString()))
                .stderr.on('data', d => process.stderr.write(d.toString()));
            });
          });
        }
        conn.end();
        resolve();
      } catch (err) {
        conn.end();
        reject(err);
      }
    }).on('error', err => {
      reject(err);
    }).connect(config);
  });
}

// Nếu chạy trực tiếp
if (process.argv[1]?.endsWith('vps-exec.mjs')) {
  const cmds = [
    'pm2 list',
    'ls -la /var/www/wms-order-tool',
    'df -h /'
  ];
  runRemoteCommands(cmds).then(() => console.log('Done.')).catch(console.error);
}
