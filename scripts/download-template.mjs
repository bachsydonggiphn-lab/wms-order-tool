import https from 'https';
import fs from 'fs';

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode === 200) {
        const stream = fs.createWriteStream(dest);
        res.pipe(stream);
        stream.on('finish', () => resolve(true));
      } else {
        reject(new Error(`Failed with status ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function main() {
  await downloadFile('https://czwh.wms.yunwms.com/download/upload-check-out.xls', 'scripts/upload-check-out.xls');
  console.log('Downloaded upload-check-out.xls successfully.');
}

main().catch(console.error);
