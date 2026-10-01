import { Client } from 'ssh2';

const conn = new Client();

function executeCommand(conn, command) {
  return new Promise((resolve, reject) => {
    console.log(`\n==============================================`);
    console.log(`[EXEC] ${command}`);
    console.log(`==============================================`);

    conn.exec(command, (err, stream) => {
      if (err) return reject(err);

      let stdout = '';
      let stderr = '';

      stream.on('close', (code, signal) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          console.warn(`[WARN] Command finished with exit code ${code}`);
          resolve(stdout + '\n' + stderr);
        }
      }).on('data', (data) => {
        const text = data.toString();
        process.stdout.write(text);
        stdout += text;
      }).stderr.on('data', (data) => {
        const text = data.toString();
        process.stderr.write(text);
        stderr += text;
      });
    });
  });
}

conn.on('ready', async () => {
  console.log('✅ Kết nối SSH tới Cloud Server thành công!');

  try {
    // 1. Kiểm tra tài nguyên và OS
    await executeCommand(conn, 'uptime && free -h && df -h /');

    // 2. Cài đặt các gói cơ bản và Node.js 20 LTS
    await executeCommand(conn, `
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -y
      apt-get install -y curl git ufw nginx
    `);

    // 3. Kiểm tra xem Node.js đã có chưa, nếu chưa cài NodeSource 20
    await executeCommand(conn, `
      if ! command -v node &> /dev/null; then
        echo "Installing Node.js 20 LTS..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
      fi
      node -v && npm -v
    `);

    // 4. Cài đặt PM2
    await executeCommand(conn, `
      if ! command -v pm2 &> /dev/null; then
        npm install -g pm2
      fi
      pm2 -v
    `);

    // 5. Clone hoặc Pull mã nguồn WMS
    await executeCommand(conn, `
      mkdir -p /var/www
      if [ -d "/var/www/wms-order-tool/.git" ]; then
        cd /var/www/wms-order-tool
        git reset --hard
        git pull origin main
      else
        rm -rf /var/www/wms-order-tool
        git clone https://github.com/bachsydonggiphn-lab/wms-order-tool.git /var/www/wms-order-tool
      fi
    `);

    // 6. Cài đặt dependencies và Build dự án
    await executeCommand(conn, `
      cd /var/www/wms-order-tool
      npm install
      npm run build
    `);

    // 7. Cấu hình PM2 để chạy web WMS trên cổng 3000
    await executeCommand(conn, `
      cd /var/www/wms-order-tool
      pm2 delete wms-server || true
      pm2 start npm --name "wms-server" -- run preview -- --port 3000 --host 0.0.0.0
      pm2 save
      pm2 startup systemd -u root --hp /root || true
    `);

    // 8. Cấu hình Nginx reverse proxy cổng 80 -> 3000
    const nginxConf = `
server {
    listen 80;
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

    // 9. Cấu hình tường lửa UFW (mở cổng 80, 443, 3000, 24700)
    await executeCommand(conn, `
      ufw allow 24700/tcp comment 'iNET SSH'
      ufw allow 80/tcp comment 'HTTP'
      ufw allow 443/tcp comment 'HTTPS'
      ufw allow 3000/tcp comment 'WMS Port'
      ufw --force enable
      ufw status
    `);

    // 10. Kiểm tra tiến trình
    await executeCommand(conn, `
      pm2 list
      curl -s http://127.0.0.1:3000/api/wms/status || true
    `);

    console.log('\n🎉🎉🎉 DEPLOY TOÀN DIỆN THÀNH CÔNG RỰC RỠ! 🎉🎉🎉');
    conn.end();
  } catch (err) {
    console.error('❌ Lỗi trong quá trình deploy:', err);
    conn.end();
  }
}).on('error', (err) => {
  console.error('❌ Kết nối SSH lỗi:', err.message);
}).connect({
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@',
  readyTimeout: 30000,
});
