import https from 'https';
import fs from 'fs';

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

async function fetchPickingListsForDate(cookie, date) {
  const dateStart = `${date} 00:00:00`;
  const dateEnd = `${date} 23:59:59`;
  const postBody = `E1=7&dateFor=${encodeURIComponent(dateStart)}&dateTo=${encodeURIComponent(dateEnd)}`;

  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/shipment/picking/list/page/1/pageSize/100',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/shipment/picking/list',
      'Content-Length': Buffer.byteLength(postBody)
    }
  }, postBody);

  try {
    const json = JSON.parse(res.body);
    return json.data || [];
  } catch (e) {
    return [];
  }
}

// Lấy chi tiết đơn hàng trong một Picking List
async function fetchOrdersInPickingList(cookie, plNo) {
  const postBody = `E4=7&picking_code=${encodeURIComponent(plNo)}`;
  const res = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/order/orders/list/page/1/pageSize/200',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': cookie,
      'User-Agent': 'Mozilla/5.0',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
      'Content-Length': Buffer.byteLength(postBody)
    }
  }, postBody);

  try {
    const json = JSON.parse(res.body);
    return json.data || [];
  } catch (e) {
    return [];
  }
}

async function main() {
  console.log('Logging in to YunWMS...');
  const cookie = await login();
  console.log('Logged in successfully.');

  const dates = ['2026-10-25', '2026-10-24', '2026-10-23', '2026-10-22'];
  const allResults = {};

  for (const date of dates) {
    console.log(`\n========================================`);
    console.log(`=== NGHIÊN CỨU NGÀY: ${date} ===`);
    console.log(`========================================`);
    const pls = await fetchPickingListsForDate(cookie, date);
    console.log(`Tổng số Picking List tạo trong ngày ${date}: ${pls.length}`);

    allResults[date] = [];

    for (let i = 0; i < pls.length; i++) {
      const pl = pls[i];
      const plCode = pl.E2;
      const orderCount = parseInt(pl.E5, 10) || 0;
      const totalQty = parseInt(pl.E7, 10) || 0;
      const createdTime = pl.E11;
      const updateTime = pl.E12;
      const creator = pl.createName;
      const carrier = Array.isArray(pl.pdScIdArr)
        ? pl.pdScIdArr.map(c => c.sc_code || c.sp_name).filter(Boolean).join(', ')
        : '';

      console.log(`\n--- [${i + 1}/${pls.length}] PL: ${plCode} ---`);
      console.log(`  Thời gian tạo: ${createdTime} | Cập nhật: ${updateTime} | Người tạo: ${creator}`);
      console.log(`  Số đơn: ${orderCount} | Số PCS (Qty): ${totalQty} | ĐVVC: ${carrier}`);

      // Lấy chi tiết đơn hàng của PL này để phân tích cấu trúc đơn
      const orders = await fetchOrdersInPickingList(cookie, plCode);
      
      let pcs1Count = 0;
      let pcs2Count = 0;
      let pcsMultiCount = 0;
      const skuFreq = {};
      const carrierMap = {};

      orders.forEach(o => {
        // Đếm carrier
        const cCode = o.E7 || 'Unknown';
        carrierMap[cCode] = (carrierMap[cCode] || 0) + 1;

        // Phân tích PCS & SKU
        const pieceText = o.E25 || '';
        let ordQty = 0;
        const pieceRegex = /([^:\s*x×]+)\s*[:*x×]\s*(\d+)/gi;
        let match;
        let foundAny = false;
        while ((match = pieceRegex.exec(pieceText)) !== null) {
          foundAny = true;
          const sku = match[1].trim();
          const q = parseInt(match[2], 10) || 1;
          ordQty += q;
          skuFreq[sku] = (skuFreq[sku] || 0) + q;
        }
        if (!foundAny) {
          ordQty = 1;
          skuFreq[pieceText.trim() || 'UNKNOWN'] = (skuFreq[pieceText.trim() || 'UNKNOWN'] || 0) + 1;
        }

        if (ordQty === 1) pcs1Count++;
        else if (ordQty === 2) pcs2Count++;
        else pcsMultiCount++;
      });

      const uniqueSkus = Object.keys(skuFreq);
      console.log(`  Phân bổ PCS: 1 PCS=${pcs1Count} (${Math.round((pcs1Count/orders.length)*100 || 0)}%), 2 PCS=${pcs2Count}, Multi=${pcsMultiCount}`);
      console.log(`  Số mã SKU khác nhau: ${uniqueSkus.length}`);
      console.log(`  Top SKU tiêu biểu:`, Object.entries(skuFreq).sort((a,b)=>b[1]-a[1]).slice(0, 5).map(([s,q])=>`${s}(${q})`).join(', '));
      console.log(`  ĐVVC trong list:`, Object.entries(carrierMap).map(([c,q])=>`${c}:${q}`).join(', '));

      allResults[date].push({
        plCode,
        createdTime,
        orderCount,
        totalQty,
        creator,
        carrier,
        pcs1Count,
        pcs2Count,
        pcsMultiCount,
        uniqueSkuCount: uniqueSkus.length,
        carrierMap,
        topSkus: Object.entries(skuFreq).sort((a,b)=>b[1]-a[1]).slice(0, 5)
      });
    }
  }

  fs.writeFileSync('scripts/picking-study-results.json', JSON.stringify(allResults, null, 2));
  console.log('\n========================================');
  console.log('Đã lưu kết quả phân tích đầy đủ vào scripts/picking-study-results.json');
}

main().catch(console.error);
