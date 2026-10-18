import https from 'https';

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function extractCookies(headers) {
  const raw = headers['set-cookie'] || [];
  return (Array.isArray(raw) ? raw : [raw]).map(c => c.split(';')[0]).join('; ');
}

async function getCookie() {
  const initRes = await httpsRequest({ hostname: 'czwh.wms.yunwms.com', path: '/', method: 'GET' });
  const initCookies = extractCookies(initRes.headers);
  const passwordBase64 = Buffer.from('12345abc').toString('base64');
  const loginBody = 'userName=David&userPass=' + encodeURIComponent(passwordBase64);
  const loginRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/login.html',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': initCookies,
      'Content-Length': Buffer.byteLength(loginBody),
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/'
    }
  }, loginBody);
  const loginCookies = extractCookies(loginRes.headers);
  return [initCookies, loginCookies].filter(Boolean).join('; ');
}

async function main() {
  const cookie = await getCookie();
  console.log('Login success! Testing inventory...');

  const postData = 'warehouse_id=7';
  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/warehouse/inventory/list/page/1/pageSize/5',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'Content-Length': Buffer.byteLength(postData),
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/warehouse/inventory/list'
    }
  }, postData);

  const json = JSON.parse(res.body);
  console.log('Total inventory items:', json.total);
  if (json.data && json.data.length > 0) {
    const item = json.data[0];
    console.log('Item 0:', {
      product_id: item.product_id,
      product_barcode: item.product_barcode,
      product_title: item.product_title,
      allKeys: Object.keys(item)
    });

    // Test product detail for this item.product_id
    const pDetail = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: '/product/product/detail/product_id/' + item.product_id,
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/product/product/list'
      }
    });

    const candidateUrls = [
      '/product/product/detail/productId/30279',
      '/product/product/detail/product_id/30279',
      '/product/product/get-detail/product_id/30279',
      '/product/product/get-detail/productId/30279',
      '/product/product/view-detail/product_id/30279',
      '/product/product/view-detail/productId/30279',
      '/product/product/product-detail/productId/30279',
      '/product/product/product-detail/product_id/30279',
      '/product/product/view/productId/30279',
      '/product/product/view/product_id/30279',
      '/product/product/get-product/product_id/30279',
      '/product/product/get-product/productId/30279',
      '/product/product/get-product-image/product_id/30279',
      '/product/product/get-product-image/productId/30279',
      '/product/product/edit/productId/30279',
      '/product/product/edit/product_id/30279',
      '/order/orders/get-product-image/product_id/30279',
      '/order/orders/get-product-image/productId/30279',
      '/default/index/get-product-image/product_id/30279',
      '/default/index/get-product-image/productId/30279',
      '/product/product-image/get-image/product_id/30279',
      '/product/product-image/get-image/productId/30279',
      '/product/product/get-image/productId/30279',
      '/product/product/get-image/product_id/30279',
      '/product/product-attach/get-image/product_id/30279',
      '/product/product-attach/get-image/productId/30279',
    ];

  const htmlRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/product/product/list',
    method: 'GET',
    headers: {
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0'
    }
  });
  const html = htmlRes.body;
  const inputRegex = /<input[^>]+name=["']([^"']+)["'][^>]*>/gi;
  const inputs = [];
  let m;
  while ((m = inputRegex.exec(html)) !== null) {
    inputs.push(m[1]);
  }
  console.log('Unique input names in product/list:', [...new Set(inputs)]);

  // Check form id or search function
  const formMatch = html.match(/<form[^>]+id=["']([^"']+)["'][^>]*>/gi);
  console.log('Forms:', formMatch);

  // Test searching with likely names like E1, product_barcode, code
  for (const field of ['E1', 'code', 'product_barcode', 'sku', 'product_sku']) {
    const postData = `${field}=${encodeURIComponent('YD-HM1032-0')}`;
    const searchRes = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: '/product/product/list/page/1/pageSize/5',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookie,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/product/product/list',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);
    const searchJson = JSON.parse(searchRes.body);
    console.log(`Search by ${field}: total = ${searchJson.total}`);
    if (searchJson.total < 34000) {
      console.log(`>>> MATCH for field: ${field}! Item:`, searchJson.data[0]);
    }
  }
  }
}

main().catch(console.error);
