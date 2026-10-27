import { Client } from 'ssh2';

const config = {
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@',
  readyTimeout: 30000,
};

const nginxConf = `
# 1. Chuyển hướng toàn bộ HTTP (Port 80) sang HTTPS (Port 443)
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    return 301 https://$host$request_uri;
}

# 2. Máy chủ HTTPS (Port 443) với chứng chỉ Let's Encrypt chính thức
server {
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name wms.gepoder.click _;

    ssl_certificate /etc/letsencrypt/live/wms.gepoder.click/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wms.gepoder.click/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
`.trim();

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ SSH connected to VPS');
  const cmd = `cat << 'EOF' > /etc/nginx/sites-available/default
${nginxConf}
EOF
nginx -t && systemctl reload nginx
`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', code => {
      console.log(`\nNginx reload finished with code ${code}`);
      conn.end();
    });
  });
}).connect(config);
