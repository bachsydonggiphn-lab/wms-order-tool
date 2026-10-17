import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const config = {
  host: '162.4.176.249',
  port: 24700,
  username: 'root',
  password: '8QRkN417-)++$JTT>$h@',
  readyTimeout: 30000,
};

const localTar = path.join(process.cwd(), 'data_backup.tar.gz');
const remoteTar = '/tmp/data_backup.tar.gz';

async function uploadDb() {
  if (!fs.existsSync(localTar)) {
    throw new Error(`File ${localTar} không tồn tại!`);
  }

  const stat = fs.statSync(localTar);
  const totalBytes = stat.size;
  console.log(`📦 Bắt đầu upload database nén (${(totalBytes / 1024 / 1024).toFixed(1)} MB) lên VPS...`);

  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', () => {
      console.log('✅ SSH connected, opening SFTP...');
      conn.sftp((err, sftp) => {
        if (err) return reject(err);

        const readStream = fs.createReadStream(localTar);
        const writeStream = sftp.createWriteStream(remoteTar);

        let uploadedBytes = 0;
        let lastLoggedPercent = 0;

        readStream.on('data', (chunk) => {
          uploadedBytes += chunk.length;
          const pct = Math.floor((uploadedBytes / totalBytes) * 100);
          if (pct >= lastLoggedPercent + 10 || pct === 100) {
            console.log(`⏳ Đang tải lên: ${pct}% (${(uploadedBytes / 1024 / 1024).toFixed(1)} MB)`);
            lastLoggedPercent = pct;
          }
        });

        writeStream.on('close', () => {
          console.log('✅ Upload file nén lên VPS thành công!');
          resolve();
        });

        writeStream.on('error', reject);
        readStream.on('error', reject);

        readStream.pipe(writeStream);
      });
    }).on('error', reject).connect(config);
  });

  // Giải nén trên VPS
  console.log('📂 Đang giải nén database vào /var/www/wms-order-tool/data/ trên VPS...');
  await new Promise((resolve, reject) => {
    const cmd = `
      mkdir -p /var/www/wms-order-tool/data &&
      tar -xzvf ${remoteTar} -C /var/www/wms-order-tool/data/ &&
      rm -f ${remoteTar} &&
      ls -lh /var/www/wms-order-tool/data/ &&
      pm2 restart wms-server
    `;

    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      stream.on('close', (code) => {
        console.log(`✅ Hoàn tất giải nén & restart wms-server (Code: ${code})`);
        conn.end();
        resolve();
      }).on('data', d => process.stdout.write(d.toString()))
        .stderr.on('data', d => process.stderr.write(d.toString()));
    });
  });

  console.log('🎉 ĐỒNG BỘ TOÀN BỘ DATABASE LÊN VPS THÀNH CÔNG RỰC RỠ!');
}

uploadDb().catch(err => {
  console.error('❌ Lỗi upload:', err);
  process.exit(1);
});
