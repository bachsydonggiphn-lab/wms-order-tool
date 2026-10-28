import https from 'https';
import XLSX from 'xlsx';

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function extractCookies(headers) {
  const raw = headers['set-cookie'] || [];
  if (Array.isArray(raw)) return raw.map(c => c.split(';')[0]).join('; ');
  if (typeof raw === 'string') return raw.split(';')[0];
  return '';
}

async function login() {
  const initRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/',
    method: 'GET',
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const initCookies = extractCookies(initRes.headers);

  const passwordBase64 = Buffer.from('12345abc').toString('base64');
  const loginBody = 'userName=' + encodeURIComponent('David') + '&userPass=' + encodeURIComponent(passwordBase64);

  const loginRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/login.html',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': initCookies,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/',
      'Content-Length': Buffer.byteLength(loginBody)
    }
  }, loginBody);

  const loginCookies = extractCookies(loginRes.headers);
  return [initCookies, loginCookies].filter(Boolean).join('; ');
}

// Function to generate Excel xls buffer for batch checkout
function createCheckoutExcelBuffer(orderList) {
  const rows = [
    ['订单号/Order Code', '订单类型/Order Type', '跟踪号/Tracking Number', '签出重/Checkout Weight', '体积重/Volume Weight'],
    ...orderList.map(item => [item.orderCode, 0, item.trackingNo || '', item.weight || '', ''])
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  
  const wsDoc = XLSX.utils.aoa_to_sheet([['订单类型/Order Type : 0单个订单，1退仓订单，2转仓订单，不填默认为0']]);
  XLSX.utils.book_append_sheet(wb, wsDoc, '字段说明');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xls' });
}

async function testUpload() {
  const cookie = await login();

  // Test with order from PL72610210066: 'YD-261021-4686' with tracking 'SPXVN06807104706A'
  const excelBuffer = createCheckoutExcelBuffer([{
    orderCode: 'YD-261021-4686',
    trackingNo: 'SPXVN06807104706A',
    weight: '0.2'
  }]);

  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

  const preFile = [
    `--${boundary}\r\nContent-Disposition: form-data; name="warehouse_id"\r\n\r\n7\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="FileName"; filename="batch_checkout.xls"\r\nContent-Type: application/vnd.ms-excel\r\n\r\n`
  ].join('');

  const postFile = `\r\n--${boundary}--\r\n`;

  const payload = Buffer.concat([
    Buffer.from(preFile, 'utf8'),
    excelBuffer,
    Buffer.from(postFile, 'utf8')
  ]);

  console.log('Sending upload-check-out with tracking number...');
  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/job-queue/upload-check-out',
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/shipment/job-queue/list',
      'Content-Length': payload.length
    }
  }, payload);

  console.log('Upload response status:', res.statusCode);
  console.log('Upload response body:', res.body);

  if (res.body.includes('"success":1') || res.body.includes('"state":1')) {
    console.log('Now testing run-check-out...');
    const runRes = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: '/shipment/job-queue/run-check-out',
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/shipment/job-queue/list',
        'Content-Length': 0
      }
    });
    console.log('run-check-out response:', runRes.body);

    // Let's check status of order YD-261021-4686
    console.log('Checking order status on YunWMS...');
    const checkQuery = 'E4=7&searchCode=YD-261021-4686';
    const checkRes = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: '/order/orders/list/page/1/pageSize/10',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
        'Content-Length': Buffer.byteLength(checkQuery)
      }
    }, checkQuery);

    const checkData = JSON.parse(checkRes.body);
    if (checkData.data && checkData.data.length > 0) {
      console.log('Order status after checkout: E11 =', checkData.data[0].E11, '(Expected 8 for Shipped)');
    }
  }
}

testUpload().catch(console.error);
