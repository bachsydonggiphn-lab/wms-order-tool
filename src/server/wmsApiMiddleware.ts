import { IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { fetchWmsOrders, getWmsSessionCookie, pollLatestWmsOrders, fetchWmsInventory, httpsRequest } from '../services/wmsService';
import { fetchGHNLive, fetchJNTLive, fetchJNTBatchLive, fetchSPXLive, fetchNinjaVanLive } from './trackingBackend';
import {
  getShippedSyncMeta,
  getShippedOrdersAnalytics,
  insertShippedOrdersBatch,
  updateShippedSyncMeta,
  getSqliteDb,
  ShippedOrderInput
} from '../../sqliteDb';
import { layNhomTuSKU } from '../utils/orderProcessor';
import { DEFAULT_SKU_GROUPS } from '../utils/skuData';

// Helper parse JSON body (tương thích cả Vite dev server lẫn Express body-parser)
function parseJsonBody(req: any): Promise<any> {
  // Nếu Express đã parse sẵn body thành object
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  // Nếu stream đã kết thúc
  if (req.readableEnded || req._body) {
    return Promise.resolve(req.body || {});
  }

  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : (req.body || {}));
      } catch (e) {
        resolve(req.body || {});
      }
    });

    // An toàn tuyệt đối: Timeout 2 giây tự động trả về req.body nếu stream không phát ra sự kiện end
    setTimeout(() => {
      resolve(req.body || {});
    }, 2000);
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

export function handleWmsApi(req: IncomingMessage, res: ServerResponse, next: () => void) {
  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname || '';

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // 1. Endpoint kiểm tra kết nối & session
  if (pathname === '/api/wms/status') {
    getWmsSessionCookie('David', '12345abc')
      .then(() => {
        sendJson(res, 200, {
          success: true,
          connected: true,
          message: 'Kết nối YunWMS (czwh.wms.yunwms.com) sẵn sàng'
        });
      })
      .catch((err) => {
        sendJson(res, 200, {
          success: false,
          connected: false,
          message: err?.message || 'Không thể kết nối YunWMS'
        });
      });
    return;
  }

  // 2. Endpoint lấy danh sách đơn hàng
  if (pathname === '/api/wms/orders' && (req.method === 'POST' || req.method === 'GET')) {
    const handleOrders = async () => {
      let options: any = {};
      if (req.method === 'POST') {
        options = await parseJsonBody(req);
      } else {
        options = parsedUrl.query;
      }

      const warehouse = String(options.warehouse ?? '7'); // 7 = VN02
      const status = String(options.status ?? '4');       // 4 = Submitted
      const pageSize = Math.min(1000, Math.max(10, parseInt(String(options.pageSize || 500), 10)));
      const maxPages = parseInt(String(options.maxPages || 0), 10);
      const username = String(options.username || 'David');
      const password = String(options.password || '12345abc');

      const result = await fetchWmsOrders({
        warehouse,
        status,
        pageSize,
        maxPages,
        username,
        password,
        skuGroups: options.skuGroups
      });

      sendJson(res, 200, result);
    };

    handleOrders().catch((err) => {
      sendJson(res, 500, {
        success: false,
        message: err?.message || 'Lỗi xử lý khi lấy đơn từ YunWMS'
      });
    });
    return;
  }

  // 3. Endpoint Bắt Đơn Mới Thời Gian Thực (Real-Time Polling siêu tốc)
  if (pathname === '/api/wms/poll-new' && (req.method === 'POST' || req.method === 'GET')) {
    const handlePollNew = async () => {
      let options: any = {};
      if (req.method === 'POST') {
        options = await parseJsonBody(req);
      } else {
        options = parsedUrl.query;
      }

      const knownOrderNos: string[] = Array.isArray(options.knownOrderNos) ? options.knownOrderNos : [];
      const warehouse = String(options.warehouse ?? '7');
      const status = String(options.status ?? '4');
      const username = String(options.username || 'David');
      const password = String(options.password || '12345abc');

      const result = await pollLatestWmsOrders(knownOrderNos, {
        warehouse,
        status,
        username,
        password,
        skuGroups: options.skuGroups
      });

      sendJson(res, 200, result);
    };

    handlePollNew().catch((err) => {
      sendJson(res, 500, {
        success: false,
        message: err?.message || 'Lỗi polling đơn mới WMS'
      });
    });
    return;
  }

  // 4. Endpoint SSE Stream tiến độ thời gian thực
  if (pathname === '/api/wms/sync-stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const sendSse = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const warehouse = String(parsedUrl.query.warehouse ?? '7');
    const status = String(parsedUrl.query.status ?? '4');
    const pageSize = Math.min(1000, Math.max(10, parseInt(String(parsedUrl.query.pageSize || 500), 10)));
    const maxPages = parseInt(String(parsedUrl.query.maxPages || 0), 10);
    const username = String(parsedUrl.query.username || 'David');
    const password = String(parsedUrl.query.password || '12345abc');

    sendSse('start', { message: 'Đang kết nối tới YunWMS...' });

    fetchWmsOrders({
      warehouse,
      status,
      pageSize,
      maxPages,
      username,
      password,
    }, (progress) => {
      sendSse('progress', progress);
    })
      .then((result) => {
        sendSse('complete', result);
        res.end();
      })
      .catch((err) => {
        sendSse('error', { message: err?.message || 'Lỗi kéo đơn WMS' });
        res.end();
      });

    return;
  }

  // 5. Endpoint Tra Cứu & Tổng Hợp Tồn Kho YunWMS (Inventory Query)
  if (pathname === '/api/wms/inventory' && (req.method === 'POST' || req.method === 'GET')) {
    const handleInventory = async () => {
      let options: any = {};
      if (req.method === 'POST') {
        options = await parseJsonBody(req);
      } else {
        options = parsedUrl.query;
      }

      const warehouse = String(options.warehouse ?? '7'); // 7 = VN02 mặc định
      const customerCode = String(options.customerCode || '');
      const productBarcode = String(options.productBarcode || '');
      const pageSize = Math.min(1000, Math.max(50, parseInt(String(options.pageSize || 500), 10)));
      const username = String(options.username || 'David');
      const password = String(options.password || '12345abc');

      const result = await fetchWmsInventory({
        warehouse,
        customerCode,
        productBarcode,
        pageSize,
        username,
        password,
        skuGroups: options.skuGroups
      });

      sendJson(res, 200, result);
    };

    handleInventory().catch((err) => {
      sendJson(res, 500, {
        success: false,
        message: err?.message || 'Lỗi khi kéo tồn kho từ YunWMS'
      });
    });
    return;
  }

  // 4. Endpoint Lấy Metadata Đồng Bộ Đơn Xuất Kho
  if (pathname === '/api/wms/shipped/meta') {
    getShippedSyncMeta()
      .then(meta => sendJson(res, 200, { success: true, meta }))
      .catch(err => sendJson(res, 500, { success: false, error: err?.message || 'Lỗi khi đọc metadata' }));
    return;
  }

  // 5. Endpoint Kéo Bổ Sung Đơn Xuất Kho (Theo Ngày Hoặc Mới Nhất - Streaming Incremental)
  if (pathname === '/api/wms/shipped/sync' && (req.method === 'POST' || req.method === 'GET')) {
    const handleShippedSync = async () => {
      let options: any = {};
      if (req.method === 'POST') {
        options = await parseJsonBody(req);
      } else {
        options = parsedUrl.query;
      }

      const dateFor = (options.dateFor || '').trim();
      const dateTo = (options.dateTo || '').trim();
      const warehouse = String(options.warehouse ?? '7');
      const maxPages = parseInt(String(options.maxPages || 0), 10);
      const pageSize = Math.min(1000, Math.max(50, parseInt(String(options.pageSize || 500), 10)));
      const username = String(options.username || 'David');
      const password = String(options.password || '12345abc');

      // Cập nhật trạng thái đang chạy
      await updateShippedSyncMeta({
        shipped_sync_status: 'running'
      });

      // Lấy phiên làm việc YunWMS
      const cookie = await getWmsSessionCookie(username, password);
      const db = getSqliteDb();

      // Nạp danh sách 25,000 order_no mới nhất để kiểm tra trùng tức thì O(1), không tốn RAM
      const recentOrdersRes = await db.execute('SELECT order_no FROM wms_shipped_orders ORDER BY creation_time DESC LIMIT 25000');
      const existingOrderNos = new Set(recentOrdersRes.rows.map(r => String(r.order_no)));

      // Chuẩn bị query YunWMS
      let postParams = `E4=${encodeURIComponent(warehouse)}&E11=8`;
      if (dateFor) {
        postParams += `&searchDateType=${encodeURIComponent(options.searchDateType || 'createDate')}&dateFor=${encodeURIComponent(dateFor)}`;
        if (dateTo) {
          postParams += `&dateTo=${encodeURIComponent(dateTo)}`;
        }
      }

      let totalInsertedOrders = 0;
      let totalInsertedItems = 0;
      let consecutiveFullExistingPages = 0;
      const targetMaxPages = maxPages > 0 ? maxPages : (dateFor ? 100 : 50);

      for (let page = 1; page <= targetMaxPages; page++) {
        const reqPath = `/order/orders/list/page/${page}/pageSize/${pageSize}`;
        const response = await httpsRequest({
          hostname: 'czwh.wms.yunwms.com',
          path: reqPath,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': cookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
            'Content-Length': Buffer.byteLength(postParams)
          }
        }, postParams);

        let json: any = {};
        try {
          json = JSON.parse(response.body);
        } catch (e) {
          console.error(`[WMS Sync] Lỗi parse JSON trang ${page}:`, e);
          break;
        }

        const rawOrders = json.data || [];
        if (!Array.isArray(rawOrders) || rawOrders.length === 0) {
          break;
        }

        const pageOrdersToInsert: ShippedOrderInput[] = [];
        for (const o of rawOrders) {
          const orderNo = (o.E1 || o.E17 || '').trim();
          if (!orderNo || existingOrderNos.has(orderNo)) {
            continue;
          }
          existingOrderNos.add(orderNo);

          const trackingNo = (o.tracking_number || '').trim();
          const creationTime = (o.E14 || '').trim();
          let shippedTime = (o.E15 || o.E16 || o.E18 || o.E20 || o.shipped_time || creationTime || '').trim();
          if (!shippedTime || shippedTime.length < 8) {
            shippedTime = creationTime;
          }
          const pickingList = (o.picking_code || '').trim();
          const carrier = (o.E7 || o.carrier || '').trim();

          const rawItems = Array.isArray(o.productList) ? o.productList : [];
          const items = rawItems.map((it: any) => ({
            sku: (it.product_barcode || it.sku || '').trim(),
            qty: Math.max(1, parseInt(String(it.op_quantity || it.qty || 1), 10)),
            productTitle: it.product_title || '',
            groupName: layNhomTuSKU((it.product_barcode || it.sku || '').trim(), DEFAULT_SKU_GROUPS)
          })).filter((it: any) => it.sku);

          const totalQty = items.reduce((sum: number, it: any) => sum + it.qty, 0);
          const skuCount = items.length;
          const isSingleSku = (skuCount === 1 && totalQty === 1) ? 1 : (skuCount === 1 ? 1 : 0);

          pageOrdersToInsert.push({
            orderNo,
            trackingNo,
            refNo: undefined,
            channel: undefined,
            customerCode: 'YD',
            warehouseId: warehouse,
            warehouseName: warehouse === '7' ? 'VN02 [Kho Hồ Chí Minh]' : `Kho ${warehouse}`,
            carrier,
            creationTime,
            shippedTime,
            pickingList,
            totalQty,
            skuCount,
            isSingleSku,
            statusE11: '8',
            items
          });
        }

        if (pageOrdersToInsert.length > 0) {
          const insertRes = await insertShippedOrdersBatch(pageOrdersToInsert);
          totalInsertedOrders += insertRes.insertedOrders;
          totalInsertedItems += insertRes.insertedItems;
        }

        // Tự động dừng thông minh khi quét tới các đơn cũ đã lưu trong SQL
        if (!dateFor) {
          if (pageOrdersToInsert.length === 0) {
            consecutiveFullExistingPages++;
            if (consecutiveFullExistingPages >= 2) {
              console.log(`[WMS Sync] Đã gặp 2 trang toàn đơn cũ liên tiếp ở trang ${page}. Hoàn tất đồng bộ!`);
              break;
            }
          } else {
            consecutiveFullExistingPages = 0;
          }
        }
      }

      const vnNow = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date());

      const countRes = await db.execute('SELECT count(*) as total FROM wms_shipped_orders');
      const currentTotal = Number(countRes.rows[0]?.total || 0);

      await updateShippedSyncMeta({
        shipped_sync_status: 'idle',
        last_shipped_sync_time: vnNow,
        shipped_total_orders: String(currentTotal)
      });

      const updatedMeta = await getShippedSyncMeta();

      sendJson(res, 200, {
        success: true,
        message: `Đã nạp ${totalInsertedOrders} đơn mới (${totalInsertedItems} sản phẩm) vào SQL database.`,
        insertedOrders: totalInsertedOrders,
        insertedItems: totalInsertedItems,
        totalWmsOrders: currentTotal,
        meta: updatedMeta
      });
    };

    handleShippedSync().catch(async (err) => {
      console.error('[handleShippedSync Error]', err);
      await updateShippedSyncMeta({ shipped_sync_status: 'error' });
      sendJson(res, 500, {
        success: false,
        message: err?.message || 'Lỗi khi đồng bộ đơn xuất kho từ YunWMS'
      });
    });
    return;
  }

  // 6. Endpoint Phân Tích Bán Chạy & Đề Xuất Vị Trí Kho (Hot SKUs & Slotting)
  if (pathname === '/api/wms/shipped/analytics' && (req.method === 'POST' || req.method === 'GET')) {
    const handleAnalytics = async () => {
      let options: any = {};
      if (req.method === 'POST') {
        options = await parseJsonBody(req);
      } else {
        options = parsedUrl.query;
      }

      const timeframe = String(options.timeframe || '30d');
      const fromDate = options.fromDate ? String(options.fromDate) : undefined;
      const toDate = options.toDate ? String(options.toDate) : undefined;
      const group = options.group ? String(options.group) : undefined;
      const includeInventory = options.includeInventory !== false;
      const rankingMode: 'normalized' | 'actual' = options.rankingMode === 'actual' ? 'actual' : 'normalized';

      // 1. Phân tích doanh số bán & xếp hạng ABC từ SQLite
      const analytics = await getShippedOrdersAnalytics({ timeframe, fromDate, toDate, group });

      // Helper chuyển chuỗi ngày WMS (YY-MM-DD hoặc YYYY-MM-DD) thành Date object
      const parseWmsDate = (dStr?: string): Date | null => {
        if (!dStr) return null;
        let s = dStr.trim();
        if (/^\d{2}-\d{2}-\d{2}/.test(s)) {
          s = '20' + s;
        }
        const parsed = new Date(s);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      // 2. Nếu includeInventory: Lấy live inventory từ WMS để đối chiếu & chuẩn hóa đứt hàng
      if (includeInventory) {
        try {
          const invResult = await fetchWmsInventory({ warehouse: '7' });
          const invMap = new Map<string, any>();
          invResult.items.forEach(it => {
            if (it.sku) invMap.set(it.sku.toUpperCase(), it);
          });

          const now = new Date();
          const daysInPeriod = Math.max(1, analytics.daysInPeriod || 30);
          const periodStartDate = parseWmsDate(analytics.startDate) || new Date(now.getTime() - daysInPeriod * 24 * 3600 * 1000);

          let stockoutIncomingCount = 0;
          let stockoutIncomingVolume = 0;

          // Bước 2.1: Tính toán số ngày cạn tồn, vận tốc chuẩn hóa & hàng đang về cho từng SKU
          analytics.items.forEach(item => {
            const inv = invMap.get(item.sku.toUpperCase());
            const sellable = inv ? (inv.sellable ?? 0) : 0;
            const onWay = inv ? (inv.onWay ?? 0) : 0;
            const inUsed = inv ? (inv.inUsed ?? 0) : 0;

            item.sellable = sellable;
            item.onWay = onWay;
            item.inUsed = inUsed;
            item.abcRankActual = item.abcRank; // Lưu lại hạng theo sản lượng thực tế

            // Tính số ngày cạn tồn liên tục gần nhất (stockoutDays) nếu sellable = 0
            let stockoutDays = 0;
            if (sellable === 0) {
              const lastShipDate = parseWmsDate(item.lastShipped);
              if (lastShipDate) {
                const diffMs = Math.max(0, now.getTime() - lastShipDate.getTime());
                stockoutDays = Math.min(daysInPeriod, Math.floor(diffMs / (24 * 3600 * 1000)));
              } else {
                stockoutDays = daysInPeriod;
              }
            }

            // Tính khoảng thời gian trước khi SKU bắt đầu mở bán lần đầu trong kỳ (nếu là hàng mới ra mắt)
            let newProductGap = 0;
            const firstShipDate = parseWmsDate(item.firstShipped);
            if (firstShipDate && firstShipDate > periodStartDate) {
              const gapMs = Math.max(0, firstShipDate.getTime() - periodStartDate.getTime());
              newProductGap = Math.min(daysInPeriod, Math.floor(gapMs / (24 * 3600 * 1000)));
            }

            // Số ngày thực tế mở bán có hàng trong kỳ
            const effectiveSellingDays = Math.max(1, daysInPeriod - stockoutDays - newProductGap);
            const adjustedVelocity = Number((item.totalSold / effectiveSellingDays).toFixed(2));
            const potentialVolume = Math.round(adjustedVelocity * daysInPeriod);

            item.stockoutDays = stockoutDays;
            item.effectiveSellingDays = effectiveSellingDays;
            item.adjustedVelocity = adjustedVelocity;
            item.potentialVolume = potentialVolume;

            // Độ phủ của lô hàng đang về (bán hết trong bao nhiêu ngày)
            if (onWay > 0 && adjustedVelocity > 0) {
              item.daysOfSupplyIncoming = Number((onWay / adjustedVelocity).toFixed(1));
            } else {
              item.daysOfSupplyIncoming = null;
            }

            // Cảnh báo & Đặt chỗ
            item.isStockoutWithIncoming = (sellable === 0 && onWay > 0);
            if (item.isStockoutWithIncoming) {
              stockoutIncomingCount++;
              stockoutIncomingVolume += onWay;
            }

            item.daysOfInventory = adjustedVelocity > 0 ? Number((sellable / adjustedVelocity).toFixed(1)) : null;
            item.stockoutWarning = (sellable === 0 && item.totalSold > 0) || (item.daysOfInventory !== null && item.daysOfInventory < 7 && item.totalSold > 5);
            item.incomingWarning = (onWay > 0 && (item.abcRank === 'A' || item.isStockoutWithIncoming));
          });

          // Bước 2.2: Phân loại ABC Chuẩn Hóa Tiềm Năng (Loại trừ đứt hàng)
          const sortedByPotential = [...analytics.items].sort((a, b) => (b.potentialVolume || 0) - (a.potentialVolume || 0));
          const totalPotentialVolume = sortedByPotential.reduce((sum, it) => sum + (it.potentialVolume || 0), 0);

          let cumulativePotential = 0;
          let normClassACount = 0;
          let normClassBCount = 0;
          let normClassCCount = 0;
          let normClassAVol = 0;
          let normClassBVol = 0;
          let normClassCVol = 0;

          sortedByPotential.forEach(it => {
            cumulativePotential += (it.potentialVolume || 0);
            const pct = totalPotentialVolume > 0 ? (cumulativePotential / totalPotentialVolume) * 100 : 100;
            if (pct <= 80 || (normClassACount === 0 && totalPotentialVolume > 0)) {
              it.abcRankNormalized = 'A';
              normClassACount++;
              normClassAVol += (it.potentialVolume || 0);
            } else if (pct <= 95) {
              it.abcRankNormalized = 'B';
              normClassBCount++;
              normClassBVol += (it.potentialVolume || 0);
            } else {
              it.abcRankNormalized = 'C';
              normClassCCount++;
              normClassCVol += (it.potentialVolume || 0);
            }
          });

          // Bước 2.3: Áp dụng góc nhìn người dùng chọn (mặc định: 'normalized')
          analytics.rankingMode = rankingMode;
          analytics.stockoutIncomingCount = stockoutIncomingCount;
          analytics.stockoutIncomingVolume = stockoutIncomingVolume;

          if (rankingMode === 'normalized') {
            analytics.items = sortedByPotential;
            analytics.classACount = normClassACount;
            analytics.classBCount = normClassBCount;
            analytics.classCCount = normClassCCount;
            analytics.classAVolume = normClassAVol;
            analytics.classBVolume = normClassBVol;
            analytics.classCVolume = normClassCVol;

            // Tính lại slottingScore chuẩn hóa theo potentialVolume
            const maxHit = Math.max(1, ...analytics.items.map(it => it.orderCount || 0));
            const maxPot = Math.max(1, ...analytics.items.map(it => it.potentialVolume || it.totalSold || 0));
            analytics.items.forEach(it => {
              const hitScore = ((it.orderCount || 0) / maxHit) * 100;
              const volScore = (((it.potentialVolume || it.totalSold) || 0) / maxPot) * 100;
              it.slottingScore = Math.min(100, Math.round(hitScore * 0.7 + volScore * 0.3));

              it.abcRank = it.abcRankNormalized;
              if (it.abcRank === 'A') {
                it.recommendedZone = 'Zone A - Vàng (Gần bàn đóng gói, Tầng 1-2)';
                if (it.isStockoutWithIncoming) {
                  it.slotReservationZone = 'Zone A (Đặt Chỗ Trước)';
                  it.recommendedSlotting = '⭐ ĐẶT CHỖ ĐÓN HÀNG VỀ: Mặt tiền Zone A (Tầng 1-2) chờ xe hàng về bốc xếp vào ngay!';
                } else {
                  it.recommendedSlotting = 'Mặt tiền lối đi chính, ngang tầm với (Tầng 1-2) để nhặt hàng siêu tốc';
                }
              } else if (it.abcRank === 'B') {
                it.recommendedZone = 'Zone B - Trung tâm (Kệ giữa kho)';
                it.recommendedSlotting = 'Khu vực kệ chuẩn giữa lối đi, tầng 2-3 thuận tiện';
              } else {
                it.recommendedZone = 'Zone C - Tầng cao / Phía sau kho';
                it.recommendedSlotting = 'Khu vực lưu trữ tầng trên hoặc kệ trong cùng (Ít xuất nhập)';
              }
            });
          } else {
            // 'actual'
            analytics.items.sort((a, b) => b.totalSold - a.totalSold);
            analytics.items.forEach(it => {
              it.abcRank = it.abcRankActual;
              if (it.isStockoutWithIncoming && it.abcRankNormalized === 'A') {
                it.slotReservationZone = 'Zone A (Đặt Chỗ Trước)';
                it.recommendedSlotting = '⭐ Tiềm năng Zone A: Đang đứt hàng, chuẩn bị sẵn vị trí Zone A đón hàng về!';
              }
            });
          }

          // Bổ sung các nhiệm vụ đặt chỗ đón hàng về vào đầu danh sách relocationTasks
          if (!analytics.relocationTasks) analytics.relocationTasks = [];
          const existingTaskSkus = new Set(analytics.relocationTasks.map(t => t.sku));

          analytics.items.filter(it => it.isStockoutWithIncoming).slice(0, 5).forEach(it => {
            if (!existingTaskSkus.has(it.sku)) {
              analytics.relocationTasks!.unshift({
                id: `reloc_reserve_${it.sku}`,
                sku: it.sku,
                productTitle: it.productTitle,
                actionType: 'reserve_incoming',
                title: `⭐ Đặt chỗ Zone A đón hàng về: ${it.sku} (+${it.onWay} pcs)`,
                reason: `Đã hết hàng ${it.stockoutDays} ngày qua. Lô hàng ${it.onWay} pcs đang về sẽ đủ bán trong ~${it.daysOfSupplyIncoming || 30} ngày. Cần dọn trống ô kệ mặt tiền Zone A tầng 1-2 ngay!`,
                currentZone: 'Khoang chờ nhập',
                targetZone: 'Zone A - Vàng (Mặt tiền Tầng 1-2)',
                urgency: 'high',
                potentialVolume: it.potentialVolume || it.totalSold,
                onWay: it.onWay
              });
              existingTaskSkus.add(it.sku);
            }
          });

        } catch (invErr) {
          console.warn('[Analytics Inventory Warning]', invErr);
        }
      }

      sendJson(res, 200, analytics);
    };

    handleAnalytics().catch((err) => {
      sendJson(res, 500, {
        success: false,
        message: err?.message || 'Lỗi khi phân tích đơn xuất kho'
      });
    });
    return;
  }

  // 6. Tracking API Proxy Routes
  if (pathname === '/api/track/ghn' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { orderCode, cellphone } = body;
      if (!orderCode) {
        sendJson(res, 400, { success: false, error: 'Missing orderCode' });
        return;
      }
      const result = await fetchGHNLive(orderCode, cellphone);
      sendJson(res, 200, result);
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  if (pathname === '/api/track/jnt' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { billCode, billCodes, cellphone } = body;
      const rawCodes = billCodes || (typeof billCode === 'string' && billCode.includes(',') ? billCode.split(',') : [billCode]);
      const codes = (Array.isArray(rawCodes) ? rawCodes : [rawCodes]).map((c: any) => String(c).trim()).filter(Boolean);
      if (codes.length === 0) {
        sendJson(res, 400, { success: false, error: 'Missing billCode or billCodes' });
        return;
      }
      if (codes.length === 1 && (!billCodes || billCodes.length === 1)) {
        const result = await fetchJNTLive(codes[0], cellphone);
        sendJson(res, 200, result);
      } else {
        const results = await fetchJNTBatchLive(codes, cellphone);
        sendJson(res, 200, { success: true, results });
      }
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  if (pathname === '/api/track/spx' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { orderCode, force } = body;
      if (!orderCode) {
        sendJson(res, 400, { success: false, error: 'Missing orderCode' });
        return;
      }
      const result = await fetchSPXLive(orderCode, Boolean(force));
      sendJson(res, 200, result);
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  if (pathname === '/api/track/ninjavan' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { trackingId } = body;
      if (!trackingId) {
        sendJson(res, 400, { success: false, error: 'Missing trackingId' });
        return;
      }
      const result = await fetchNinjaVanLive(trackingId);
      sendJson(res, 200, result);
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  if (pathname === '/api/track/batch' && req.method === 'POST') {
    parseJsonBody(req).then(async (body) => {
      const { orders } = body;
      if (!Array.isArray(orders)) {
        sendJson(res, 400, { success: false, error: 'Invalid orders array' });
        return;
      }

      const results: Record<string, any> = {};
      const jtItems: typeof orders = [];
      const otherItems: typeof orders = [];

      for (const item of orders) {
        const upper = (item.code || '').toUpperCase().trim();
        let resolvedCarrier = item.carrier;

        if (
          upper.startsWith('SPXVN') || 
          upper.startsWith('SPX') || 
          upper.startsWith('VNSPX') || 
          upper.startsWith('SPE') ||
          upper.startsWith('VNSP')
        ) {
          resolvedCarrier = 'spx';
        } else if (
          upper.startsWith('VNGH') || 
          upper.startsWith('GY') || 
          upper.startsWith('G8') || 
          upper.startsWith('GHN') ||
          upper.startsWith('NL_') ||
          (upper.length === 8 && /^[A-Z0-9]{8}$/.test(upper) && upper.startsWith('G'))
        ) {
          resolvedCarrier = 'ghn';
        } else if (
          upper.startsWith('NIVN') || 
          upper.startsWith('NLVN') || 
          upper.startsWith('NV') ||
          (upper.startsWith('SHP') && upper.length > 10)
        ) {
          resolvedCarrier = 'ninjavan';
        } else if (
          upper.startsWith('JT') || 
          upper.startsWith('JTE') || 
          upper.startsWith('JNT') || 
          upper.startsWith('530') || 
          ((upper.startsWith('86') || upper.startsWith('84') || upper.startsWith('53')) && upper.length === 12 && /^\d+$/.test(upper)) ||
          /^\d{12}$/.test(upper)
        ) {
          resolvedCarrier = 'jt';
        }

        item.carrier = resolvedCarrier;

        if (resolvedCarrier === 'jt') {
          jtItems.push(item);
        } else {
          otherItems.push(item);
        }
      }

      // Process J&T in batch chunks of 10
      const JT_CHUNK_SIZE = 10;
      const jtChunks: (typeof jtItems)[] = [];
      for (let i = 0; i < jtItems.length; i += JT_CHUNK_SIZE) {
        jtChunks.push(jtItems.slice(i, i + JT_CHUNK_SIZE));
      }
      await Promise.all(
        jtChunks.map(async (jtChunk) => {
          const codes = jtChunk.map(o => o.code);
          const phone = jtChunk.find(o => o.cellphone)?.cellphone;
          const batchRes = await fetchJNTBatchLive(codes, phone);
          for (const [code, resObj] of Object.entries(batchRes)) {
            results[code] = resObj;
          }
        })
      );

      // Process other carriers in parallel
      const concurrency = 20;
      for (let i = 0; i < otherItems.length; i += concurrency) {
        const chunk = otherItems.slice(i, i + concurrency);
        await Promise.all(
          chunk.map(async (item) => {
            const upper = (item.code || '').toUpperCase().trim();
            if (item.carrier === 'spx' || upper.startsWith('SPX') || upper.startsWith('VNSPX') || upper.startsWith('SPE')) {
              results[item.code] = await fetchSPXLive(item.code);
            } else if (
              item.carrier === 'ghn' || 
              upper.startsWith('VNGH') || 
              upper.startsWith('GY') || 
              upper.startsWith('G8') || 
              upper.startsWith('GHN') ||
              (upper.length === 8 && upper.startsWith('G'))
            ) {
              results[item.code] = await fetchGHNLive(item.code, item.cellphone);
            } else if (item.carrier === 'ninjavan' || upper.startsWith('NIVN') || upper.startsWith('SHP')) {
              results[item.code] = await fetchNinjaVanLive(item.code);
            } else {
              results[item.code] = {
                success: false,
                error: `Chưa có API tra cứu tự động cho hãng ${item.carrier || 'này'}`
              };
            }
          })
        );
      }

      sendJson(res, 200, { success: true, results });
    }).catch(err => sendJson(res, 500, { success: false, error: err.message }));
    return;
  }

  next();
}

