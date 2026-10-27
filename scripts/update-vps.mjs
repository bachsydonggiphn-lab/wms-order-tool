import { Client } from 'ssh2';

const config = {
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@',
  readyTimeout: 60000,
  keepaliveInterval: 5000,
  algorithms: {
    serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'],
    kex: [
      'curve25519-sha256',
      'curve25519-sha256@libssh.org',
      'ecdh-sha2-nistp256',
      'diffie-hellman-group-exchange-sha256',
      'diffie-hellman-group14-sha256',
      'diffie-hellman-group14-sha1'
    ],
    cipher: ['chacha20-poly1305@openssh.com', 'aes128-gcm', 'aes128-gcm@openssh.com', 'aes256-gcm', 'aes256-gcm@openssh.com', 'aes128-ctr', 'aes192-ctr', 'aes256-ctr']
  }
};

async function executeCommand(conn, command) {
  return new Promise((resolve, reject) => {
    console.log(`\n>>> [EXEC] ${command}`);
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      stream.on('close', (code) => {
        if (code !== 0) {
          console.warn(`[WARN] Process exited with code ${code}`);
        }
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

const conn = new Client();

conn.on('ready', async () => {
  console.log('✅ SSH connected to VPS (wms.gepoder.click).');
  try {
    await executeCommand(conn, 'cd /var/www/wms-order-tool && git fetch origin && git reset --hard origin/main');
    await executeCommand(conn, 'cd /var/www/wms-order-tool && npm run build');
    await executeCommand(conn, 'pm2 restart all || pm2 restart wms-server');
    await executeCommand(conn, 'pm2 status');
    console.log('\n🎉 Update to https://wms.gepoder.click/ complete!');
  } catch (err) {
    console.error('❌ Error executing commands:', err);
  } finally {
    conn.end();
  }
});

conn.on('error', (err) => {
  console.error('❌ SSH Connection Error:', err.message);
});

conn.connect(config);
