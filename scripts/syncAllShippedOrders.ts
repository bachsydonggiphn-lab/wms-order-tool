/**
 * Script Cào Toàn Bộ Đơn Hàng Đã Xuất Kho (Shipped - Mã 8) Từ YunWMS (Kho VN02)
 * Lưu vào SQLite Local Database với Checkpoint & Khả năng Resume tự động
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import {
  initSqliteDb,
  insertShippedOrdersBatch,
  getShippedSyncMeta,
  updateShippedSyncMeta,
  ShippedOrderInput
} from '../sqliteDb';
import { getWmsSessionCookie } from '../src/services/wmsService';
import { layNhomTuSKU } from '../src/utils/orderProcessor';
import { DEFAULT_SKU_GROUPS } from '../src/utils/skuData';

const DATA_DIR = path.join(process.cwd(), 'data');
const CHECKPOINT_FILE = path.join(DATA_DIR, 'shipped_sync_checkpoint.json');

// Interface Checkpoint
interface SyncCheckpoint {
  lastCompletedPage: number;
  totalPages: number;
  totalOrders: number;
  syncedOrdersCount: number;
  syncedItemsCount: number;
  lastRunAt: string;
}

function loadCheckpoint(): SyncCheckpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const raw = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {}
  return null;
}

function saveCheckpoint(data: SyncCheckpoint) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Checkpoint Save Error]', e);
  }
}

// Request Helper
function httpsRequest(options: https.RequestOptions, postData?: string): Promise<{ statusCode: number; headers: any; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(45000, () => {
      req.destroy(new Error('Request timeout to YunWMS'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Format date in Vietnam timezone
function getVnNowString(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date());
}

async function main() {
  console.log('='.repeat(70));
  console.log('🚀 KHỞI ĐỘNG ĐỘNG CƠ CÀO TOÀN BỘ ĐƠN XUẤT KHO YUNWMS (VN02 - SHIPPED)');
  console.log('='.repeat(70));

  await initSqliteDb();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const isFresh = args.includes('--fresh');
  const customLimit = args.find(a => a.startsWith('--maxPages='))?.split('=')[1];
  const maxPagesLimit = customLimit ? parseInt(customLimit, 10) : 0;
  const customConcurrency = args.find(a => a.startsWith('--concurrency='))?.split('=')[1];
  const CONCURRENCY = customConcurrency ? parseInt(customConcurrency, 10) : 6;
  const PAGE_SIZE = 500;

  const username = process.env.WMS_USER || 'David';
  const password = process.env.WMS_PASS || '12345abc';
  const warehouse = '7'; // VN02 HCM
  const status = '8';    // Shipped

  console.log(`[Config] Kho: VN02 (ID: 7) | Trạng thái: Shipped (E11: 8) | Kích thước trang: ${PAGE_SIZE}`);
  console.log(`[Config] Concurrency: ${CONCURRENCY} luồng song song | Tài khoản: ${username}`);

  let sessionCookie = await getWmsSessionCookie(username, password);
  console.log('✅ Đăng nhập YunWMS thành công. Phiên làm việc đã sẵn sàng.');

  // Gọi trang 1 để lấy tổng số đơn hàng hiện tại
  const postParams = [
    `E4=${encodeURIComponent(warehouse)}`,
    `E11=${encodeURIComponent(status)}`
  ];
  const postData = postParams.join('&');

  const fetchPageWithRetry = async (page: number, maxRetries = 3): Promise<any> => {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        const res = await httpsRequest({
          hostname: 'czwh.wms.yunwms.com',
          path: `/order/orders/list/page/${page}/pageSize/${PAGE_SIZE}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': sessionCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
            'Content-Length': Buffer.byteLength(postData)
          }
        }, postData);

        let json: any = {};
        try {
          json = JSON.parse(res.body);
        } catch (e) {
          throw new Error(`Invalid JSON: ${res.body.slice(0, 100)}`);
        }

        // Re-login nếu session hết hạn
        if (json.state === 0 && (json.reLogin === 1 || (json.message && json.message.includes('登录')))) {
          console.warn(`[Session] Phiên hết hạn ở trang ${page}. Đang đăng nhập lại...`);
          sessionCookie = await getWmsSessionCookie(username, password, true);
          retries++;
          continue;
        }

        return json;
      } catch (err: any) {
        retries++;
        console.warn(`[Retry] Trang ${page} gặp lỗi (Lần ${retries}/${maxRetries}): ${err?.message}`);
        await new Promise(r => setTimeout(r, 2000 * retries));
      }
    }
    throw new Error(`Thất bại tải trang ${page} sau ${maxRetries} lần thử.`);
  };

  console.log('\n[1/3] Đang gọi kiểm tra tổng số đơn hàng trang 1...');
  const page1Json = await fetchPageWithRetry(1);
  const totalOrders = parseInt(String(page1Json.total || 0), 10);
  const totalPages = Math.ceil(totalOrders / PAGE_SIZE) || 1;

  console.log(`📊 TỔNG SỐ ĐƠN XUẤT KHO HIỆN TẠI: ${totalOrders.toLocaleString()} ĐƠN (~${totalPages} trang)`);

  // Checkpoint Resume logic
  let startPage = 1;
  let syncedOrdersCount = 0;
  let syncedItemsCount = 0;

  const checkpoint = isFresh ? null : loadCheckpoint();
  if (checkpoint && checkpoint.lastCompletedPage > 0 && checkpoint.lastCompletedPage < totalPages) {
    startPage = checkpoint.lastCompletedPage + 1;
    syncedOrdersCount = checkpoint.syncedOrdersCount || 0;
    syncedItemsCount = checkpoint.syncedItemsCount || 0;
    console.log(`\n🔄 [RESUME] Tìm thấy Checkpoint hợp lệ! Tiếp tục từ trang ${startPage} / ${totalPages} (Đã có ${syncedOrdersCount.toLocaleString()} đơn)`);
  } else {
    console.log(`\n🆕 Bắt đầu đồng bộ mới từ trang 1 đến trang ${maxPagesLimit > 0 ? maxPagesLimit : totalPages}...`);
  }

  const endPage = maxPagesLimit > 0 ? Math.min(maxPagesLimit, totalPages) : totalPages;

  // Cập nhật trạng thái đang chạy vào SQLite
  await updateShippedSyncMeta({
    shipped_sync_status: 'running',
    shipped_total_orders: String(totalOrders),
    last_shipped_sync_time: getVnNowString()
  });

  // Helper convert raw WMS item to ShippedOrderInput
  const convertRawToInput = (rawOrders: any[]): ShippedOrderInput[] => {
    return rawOrders.map(raw => {
      const orderNo = (raw.E1 || raw.E17 || '').trim();
      const trackingNo = (raw.tracking_number || '').trim();
      const refNo = (raw.E17 || '').trim();
      const channel = (raw.E7 || '').trim();
      const customerCode = (raw.E3 || 'YD').trim();
      const creationTime = (raw.E14 || '').trim();
      let shippedTime = (
        raw.E15 || raw.E16 || raw.E18 || raw.E20 ||
        raw.shipped_time || raw.outbound_time || raw.ship_time || ''
      ).trim();
      if (!shippedTime || shippedTime === '0') {
        shippedTime = creationTime;
      }
      const pickingList = (raw.picking_code || '').trim();
      const statusE11 = (raw.E11 || '8').trim();

      const productList = Array.isArray(raw.productList) ? raw.productList : [];
      const items = productList.map((p: any) => {
        const sku = (p.product_barcode || '').trim();
        const qty = parseInt(String(p.op_quantity || 1), 10) || 1;
        const productTitle = (p.product_title || '').trim();
        const groupName = layNhomTuSKU(sku, DEFAULT_SKU_GROUPS);
        return { sku, qty, productTitle, groupName };
      });

      return {
        orderNo,
        trackingNo,
        refNo,
        channel,
        customerCode,
        warehouseId: warehouse,
        warehouseName: 'VN02 [Kho Hồ Chí Minh]',
        creationTime,
        shippedTime,
        pickingList,
        statusE11,
        items
      };
    });
  };

  // Graceful exit handler
  const handleExit = async () => {
    console.log('\n⚠️ Đang lưu checkpoint trước khi dừng...');
    saveCheckpoint({
      lastCompletedPage: startPage > 1 ? startPage - 1 : 0,
      totalPages,
      totalOrders,
      syncedOrdersCount,
      syncedItemsCount,
      lastRunAt: getVnNowString()
    });
    await updateShippedSyncMeta({
      shipped_sync_status: 'idle',
      last_shipped_sync_time: getVnNowString()
    });
    console.log('✅ Đã lưu checkpoint an toàn.');
    process.exit(0);
  };
  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);

  // Nếu trang 1 chưa xử lý (startPage === 1)
  if (startPage === 1 && Array.isArray(page1Json.data) && page1Json.data.length > 0) {
    const ordersBatch1 = convertRawToInput(page1Json.data);
    const res1 = await insertShippedOrdersBatch(ordersBatch1);
    syncedOrdersCount += res1.insertedOrders;
    syncedItemsCount += res1.insertedItems;

    saveCheckpoint({
      lastCompletedPage: 1,
      totalPages,
      totalOrders,
      syncedOrdersCount,
      syncedItemsCount,
      lastRunAt: getVnNowString()
    });
    console.log(`[Trang 1/${totalPages}] Đã nạp thành công ${ordersBatch1.length} đơn vào database.`);
    startPage = 2;
  }

  // Chạy các trang còn lại theo lô Concurrency
  const pagesList: number[] = [];
  for (let p = startPage; p <= endPage; p++) {
    pagesList.push(p);
  }

  console.log(`\n[2/3] BẮT ĐẦU CÀO ${pagesList.length} TRANG CÒN LẠI VỚI ${CONCURRENCY} LUỒNG ĐỒNG THỜI...`);
  const startTime = Date.now();

  for (let i = 0; i < pagesList.length; i += CONCURRENCY) {
    const chunk = pagesList.slice(i, i + CONCURRENCY);
    const chunkStartTime = Date.now();

    const chunkResults = await Promise.all(
      chunk.map(async (p) => {
        const json = await fetchPageWithRetry(p);
        const rawData = Array.isArray(json.data) ? json.data : [];
        return { page: p, orders: convertRawToInput(rawData) };
      })
    );

    // Gộp và nạp vào SQLite
    const batchOrders: ShippedOrderInput[] = [];
    chunkResults.forEach(r => batchOrders.push(...r.orders));

    const insertResult = await insertShippedOrdersBatch(batchOrders);
    syncedOrdersCount += insertResult.insertedOrders;
    syncedItemsCount += insertResult.insertedItems;

    const highestCompletedPage = chunk[chunk.length - 1];
    saveCheckpoint({
      lastCompletedPage: highestCompletedPage,
      totalPages,
      totalOrders,
      syncedOrdersCount,
      syncedItemsCount,
      lastRunAt: getVnNowString()
    });

    // Thống kê tiến độ & tốc độ
    const elapsedSec = (Date.now() - startTime) / 1000;
    const speed = elapsedSec > 0 ? (syncedOrdersCount / elapsedSec).toFixed(0) : '0';
    const percent = ((highestCompletedPage / totalPages) * 100).toFixed(1);
    const remainingPages = totalPages - highestCompletedPage;
    const etaSec = remainingPages > 0 && elapsedSec > 0 ? ((remainingPages / (highestCompletedPage - startPage + 1)) * elapsedSec).toFixed(0) : '0';

    console.log(
      `[Tiến độ: ${percent}%] Trang ${highestCompletedPage}/${totalPages} | ` +
      `Đã nạp: ${syncedOrdersCount.toLocaleString()} đơn (${syncedItemsCount.toLocaleString()} SKUs) | ` +
      `Tốc độ: ~${speed} đơn/s | Còn lại: ~${Math.ceil(Number(etaSec) / 60)} phút`
    );

    // Cập nhật meta vào SQL sau mỗi lô
    await updateShippedSyncMeta({
      shipped_checkpoint_page: String(highestCompletedPage),
      shipped_total_orders: String(syncedOrdersCount),
      last_shipped_sync_time: getVnNowString()
    });

    // Nghỉ nhẹ 100ms giữa các batch để giữ kết nối ổn định
    await new Promise(r => setTimeout(r, 100));
  }

  const totalTimeMin = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log('\n' + '='.repeat(70));
  console.log(`🎉 HOÀN TẤT ĐỒNG BỘ TOÀN BỘ ĐƠN HÀNG XUẤT KHO YUNWMS (VN02)!`);
  console.log(`⏱️ Thời gian chạy: ${totalTimeMin} phút`);
  console.log(`📦 Tổng đơn đã nạp: ${syncedOrdersCount.toLocaleString()} đơn`);
  console.log(`🏷️ Tổng dòng sản phẩm: ${syncedItemsCount.toLocaleString()} sản phẩm`);
  console.log('='.repeat(70));

  await updateShippedSyncMeta({
    shipped_sync_status: 'completed',
    shipped_checkpoint_page: String(totalPages),
    last_shipped_sync_time: getVnNowString()
  });

  const finalMeta = await getShippedSyncMeta();
  console.log('[Database Status]', finalMeta);
}

main().catch(async (err) => {
  console.error('\n❌ LỖI TRONG TIẾN TRÌNH ĐỒNG BỘ:', err);
  await updateShippedSyncMeta({
    shipped_sync_status: 'error',
    last_shipped_sync_time: getVnNowString()
  });
  process.exit(1);
});
