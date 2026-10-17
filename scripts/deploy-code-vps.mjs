import { runRemoteCommands } from './vps-exec.mjs';

async function main() {
  console.log('🚀 Bắt đầu cập nhật mã nguồn trên VPS...');
  const cmds = [
    'cd /var/www/wms-order-tool && git reset --hard && git pull origin main',
    'cd /var/www/wms-order-tool && npm install',
    'cd /var/www/wms-order-tool && npm run build',
    'pm2 restart wms-server || (cd /var/www/wms-order-tool && pm2 start npm --name "wms-server" -- run preview -- --port 3000 --host 0.0.0.0)',
    'pm2 list'
  ];

  await runRemoteCommands(cmds);
  console.log('✅ Hoàn tất build và restart wms-server trên VPS!');
}

main().catch(err => {
  console.error('❌ Lỗi khi cập nhật VPS:', err);
  process.exit(1);
});
