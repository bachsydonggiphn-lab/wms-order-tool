import https from 'https';

const postData = JSON.stringify({ orders: [] });

const req = https.request('https://wms.gepoder.click/api/wms/batch-ship-orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    console.log('Live VPS Status:', res.statusCode);
    console.log('Live VPS Body:', body);
  });
});

req.on('error', console.error);
req.write(postData);
req.end();
