import fs from 'fs';
import path from 'path';
import { fetchWmsOrders } from '../src/services/wmsService';
import { fetchGHNLive, fetchJNTBatchLive, fetchSPXLive, fetchNinjaVanLive } from '../src/server/trackingBackend';
import { detectCarrier } from '../src/services/carrierDetector';

async function runAutoTrackCron() {
  console.log('🚀 [GitHub Cloud Cron] Đang khởi động tự động kiểm tra trạng thái đơn Shipped...');

  const warehouse = process.env.WMS_WAREHOUSE || '7'; // 7 = VN02
  const username = process.env.WMS_USERNAME || 'David';
  const password = process.env.WMS_PASSWORD || '12345abc';

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const outputPath = path.join(publicDir, 'shipped_tracking_results.json');

  // 1. Đọc file kết quả cũ trên GitHub nếu đã có
  let existingResults: Record<string, any> = {};
  if (fs.existsSync(outputPath)) {
    try {
      const prevContent = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      if (prevContent && prevContent.results) {
        existingResults = prevContent.results;
        const totalOld = Object.keys(existingResults).length;
        console.log(`📂 Đã nạp ${totalOld} đơn từ file JSON lịch sử trên GitHub.`);
      }
    } catch (e: any) {
      console.warn('⚠️ File JSON cũ bị lỗi hoặc chưa có, sẽ khởi tạo mới:', e.message);
    }
  }

  // 2. Kéo 5.000 đơn Shipped gần nhất từ YunWMS
  console.log(`📡 Đang gọi YunWMS (Kho ${warehouse}, Status 8 - Shipped)...`);
  const wmsResult = await fetchWmsOrders({
    warehouse,
    status: '8', // Shipped
    pageSize: 500,
    maxPages: 10, // Kéo tối đa 5.000 đơn
    username,
    password
  });

  if (!wmsResult.success || !wmsResult.orders || wmsResult.orders.length === 0) {
    console.error('❌ Không kéo được đơn từ YunWMS:', wmsResult.message);
    process.exit(1);
  }

  const orders = wmsResult.orders;
  console.log(`✅ Đã nạp thành công ${orders.length} đơn Shipped từ YunWMS.`);

  // 3. Phân loại danh sách đơn
  const itemsToTrack = orders.map((o, idx) => {
    const code = o.trackingNo || o.orderNo || `ORDER-${idx}`;
    const carrier = detectCarrier(code, o.carrierName || o.carrier);
    return {
      code,
      carrier,
      orderNo: o.orderNo,
      pickingList: o.pickingList || '',
      shippedTime: o.shippedTime || '',
      phone: (o as any).customerPhone || (o as any).phone || '8836'
    };
  });

  // 4. LỌC ĐƠN: Giữ nguyên đơn đã scan, CHỈ quét tiếp những đơn CHƯA SCAN
  const results: Record<string, any> = { ...existingResults };
  
  const itemsNeedScan = itemsToTrack.filter(item => {
    const prev = existingResults[item.code];
    if (!prev || !prev.success || !prev.data) {
      return true; // Chưa có kết quả => Phải quét
    }
    const cat = prev.data.statusCategory;
    // Nếu là not_scanned hoặc chưa xác định => Phải tiếp tục quét kiểm tra bưu tá đã lấy chưa
    if (cat === 'not_scanned' || !cat) {
      return true;
    }
    // Nếu đã scanned / in_transit / delivered / cancelled / returned => Đã chốt, không quét lại
    return false;
  });

  const alreadyConfirmedCount = itemsToTrack.length - itemsNeedScan.length;
  console.log(`⚡ Đơn đã scan từ trước: ${alreadyConfirmedCount} đơn (giữ nguyên).`);
  console.log(`🔍 Đơn CẦN TIẾP TỤC QUÉT KIỂM TRA: ${itemsNeedScan.length} đơn.`);

  // 5. Tách nhóm đơn cần quét
  const jtItems = itemsNeedScan.filter(i => i.carrier === 'jt');
  const otherItems = itemsNeedScan.filter(i => i.carrier !== 'jt');

  // 6. Quét J&T Express (dùng cụm 10 mã và cellphone=8836)
  if (jtItems.length > 0) {
    console.log(`🚚 Bắt đầu quét ${jtItems.length} đơn J&T Express (Cellphone=8836)...`);
    const JT_CHUNK_SIZE = 10;
    for (let i = 0; i < jtItems.length; i += JT_CHUNK_SIZE) {
      const chunk = jtItems.slice(i, i + JT_CHUNK_SIZE);
      const codes = chunk.map(c => c.code);
      try {
        const batchRes = await fetchJNTBatchLive(codes, '8836');
        for (const [code, resObj] of Object.entries(batchRes)) {
          results[code] = resObj;
        }
      } catch (err: any) {
        console.warn(`⚠️ Lỗi cụm J&T ${i}-${i + chunk.length}:`, err.message);
      }
    }
  }

  // 7. Quét các hãng khác (SPX, GHN, NinjaVan)
  if (otherItems.length > 0) {
    console.log(`📦 Bắt đầu quét ${otherItems.length} đơn hãng khác (SPX, GHN, NinjaVan)...`);
    const CONCURRENCY = 20;
    for (let i = 0; i < otherItems.length; i += CONCURRENCY) {
      const chunk = otherItems.slice(i, i + CONCURRENCY);
      await Promise.all(
        chunk.map(async (item) => {
          try {
            if (item.carrier === 'spx') {
              results[item.code] = await fetchSPXLive(item.code);
            } else if (item.carrier === 'ghn') {
              results[item.code] = await fetchGHNLive(item.code, '8836');
            } else if (item.carrier === 'ninjavan') {
              results[item.code] = await fetchNinjaVanLive(item.code);
            } else {
              results[item.code] = { success: false, error: 'Chưa hỗ trợ API' };
            }
          } catch (err: any) {
            results[item.code] = { success: false, error: err.message };
          }
        })
      );
    }
  }

  // 8. Thống kê kết quả toàn diện
  let checkedCount = 0;
  let scannedCount = 0;
  let notScannedCount = 0;
  let inTransitCount = 0;
  let deliveredCount = 0;
  let returnedCount = 0;
  let cancelledCount = 0;

  for (const [code, itemRes] of Object.entries<any>(results)) {
    if (itemRes.success && itemRes.data) {
      checkedCount++;
      const cat = itemRes.data.statusCategory;
      if (cat === 'scanned') scannedCount++;
      else if (cat === 'in_transit') inTransitCount++;
      else if (cat === 'delivered') deliveredCount++;
      else if (cat === 'returned') returnedCount++;
      else if (cat === 'cancelled') cancelledCount++;
      else notScannedCount++;
    } else {
      notScannedCount++;
    }
  }

  const outputPayload = {
    updatedAt: new Date().toISOString(),
    totalOrders: orders.length,
    stats: {
      checkedCount,
      scannedCount,
      notScannedCount,
      inTransitCount,
      deliveredCount,
      returnedCount,
      cancelledCount,
      confirmedPercent: Math.round(((scannedCount + inTransitCount + deliveredCount) / orders.length) * 100)
    },
    results
  };

  // 9. Lưu vào public/shipped_tracking_results.json
  fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf-8');

  console.log(`🎉 [GitHub Cloud Cron] Đã hoàn thành! Kết quả ghi tại public/shipped_tracking_results.json`);
  console.log(`📊 Tổng kết: ${scannedCount + inTransitCount + deliveredCount}/${orders.length} đơn ĐÃ SCAN (${outputPayload.stats.confirmedPercent}%). Còn lại ${notScannedCount} đơn CHƯA SCAN sẽ tiếp tục kiểm tra ở lần quét sau.`);
}

runAutoTrackCron().catch(err => {
  console.error('💥 Lỗi chạy Cloud Cron:', err);
  process.exit(1);
});
