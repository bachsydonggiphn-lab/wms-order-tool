import http from 'http';

function post(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  // Test empty orders
  const res1 = await post('http://localhost:3000/api/wms/batch-ship-orders', { orders: [] });
  console.log('Empty orders test status:', res1.status, res1.body);
}

main().catch(console.error);
