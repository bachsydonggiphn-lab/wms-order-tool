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

  // Tạo chứng chỉ SSL tự ký cho Nginx để Cloudflare kết nối ở bất kỳ chế độ nào (Flexible, Full, Full Strict)
  await executeCommand(conn, `
    mkdir -p /etc/nginx/ssl
    if [ ! -f /etc/nginx/ssl/nginx.crt ]; then
      openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \\
        -keyout /etc/nginx/ssl/nginx.key \\
        -out /etc/nginx/ssl/nginx.crt \\
        -subj "/C=VN/ST=HCM/L=HCM/O=WMS/CN=*.gepoder.click"
    fi
  `);

  const nginxConf = `
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;

    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;

    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
    }
}
`.trim();

  await executeCommand(conn, `
    cat << 'EOF' > /etc/nginx/sites-available/default
${nginxConf}
EOF
    nginx -t && systemctl reload nginx
  `);

  console.log('Nginx SSL and Port 80/443 ready for Cloudflare!');
  conn.end();
}).connect({
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@',
  readyTimeout: 15000,
});
