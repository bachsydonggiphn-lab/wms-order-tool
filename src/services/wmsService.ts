/**
 * WMS YunWMS Service: Tự động đăng nhập, duy trì Cookie phiên và kéo dữ liệu đơn hàng
 * Hỗ trợ các trạng thái: Submitted (E11=4), Shipped (E11=8) và các kho VN02 (E4=7), VN01 (E4=4)
 */

import https from 'https';
import http from 'http';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { RawOrderRow, SkuGroupsMap, WmsInventoryItem, InventoryGroupSummary, InventoryQueryResult } from '../types';
import { DEFAULT_SKU_GROUPS } from '../utils/skuData';
import { parseRawOrderRows, layNhomTuSKU } from '../utils/orderProcessor';
import * as XLSX from 'xlsx';

export interface WmsFetchOptions {
  username?: string;
  password?: string;
  warehouse?: string; // '7' = VN02 HCM, '4' = VN01 Hai Ngoai, '' = All
  status?: string;    // '4' = Submitted., '8' = Shipped, '' = All
  pageSize?: number;  // 300 - 1000
  maxPages?: number;  // 0 = All pages
  skuGroups?: SkuGroupsMap;
  dateFor?: string;
  dateTo?: string;
  searchDateType?: string;
  forceRefresh?: boolean;
}

export interface WmsRawOrderItem {
  order_id?: string;
  product_barcode?: string;
  op_quantity?: string | number;
  product_title?: string;
  [key: string]: any;
}

export interface WmsRawOrderData {
  E0?: string;
  E1?: string;   // Order No (VD: YD-260906-2422)
  E3?: string;   // Customer code (VD: YD)
  E4?: string;   // Warehouse ID (7 = VN02, 4 = VN01)
  E7?: string;   // Shipping channel (LEXTH_53, JTTH_25...)
  E11?: string;  // Order status (4 = Submitted., 8 = Shipped)
  E14?: string;  // Creation time
  E17?: string;  // Ref No / Platform order number (VD: 585921995722491510)
  E32?: string;  // Channel code
  tracking_number?: string; // Mã vận đơn (862..., SPX..., VNGH...)
  picking_code?: string;    // Mã picking list nếu có
  productList?: WmsRawOrderItem[];
  [key: string]: any;
}

export interface WmsFetchResult {
  success: boolean;
  totalOrders: number;
  returnedOrders: number;
  orders: RawOrderRow[];
  warehouse: string;
  status: string;
  message?: string;
}

// Session cache
let cachedSessionCookie = '';
let sessionExpiresAt = 0;

const defaultHttpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 60,
  maxFreeSockets: 30,
  timeout: 45000
});

// Cache file đính kèm đơn hàng để phản hồi ngay lập tức (0ms)
const wmsAttachmentCache = new Map<string, {
  hasAttachment: boolean;
  fileName?: string;
  attachmentUrl?: string;
  oatId?: string;
  error?: string;
}>();

// Cache toàn bộ nội dung Buffer của file PDF nhãn (0ms khi xem trước và in)
const pdfFileBufferCache = new Map<string, Buffer>();

export function httpsRequest(options: https.RequestOptions, postData?: string | Buffer): Promise<{ statusCode: number; headers: any; body: string; raw: Buffer }> {
  return new Promise((resolve, reject) => {
    const opts: https.RequestOptions = {
      agent: defaultHttpsAgent,
      ...options
    };
    const req = https.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', chunk => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: raw.toString('utf8'),
          raw
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(45000, () => {
      req.destroy(new Error('Request timeout to czwh.wms.yunwms.com'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function extractCookies(headers: any): string {
  const raw = headers['set-cookie'] || [];
  if (Array.isArray(raw)) {
    return raw.map(c => c.split(';')[0]).join('; ');
  } else if (typeof raw === 'string') {
    return raw.split(';')[0];
  }
  return '';
}

/**
 * Đăng nhập vào YunWMS và lấy Cookie phiên làm việc
 */
export async function getWmsSessionCookie(
  username = 'David',
  password = '12345abc',
  forceRefresh = false
): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedSessionCookie && now < sessionExpiresAt) {
    return cachedSessionCookie;
  }

  // 1. Lấy cookie ban đầu từ trang chủ
  const initRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/',
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const initCookies = extractCookies(initRes.headers);

  // 2. Gửi form đăng nhập với mật khẩu encode Base64
  const passwordBase64 = Buffer.from(password).toString('base64');
  const loginBody = `userName=${encodeURIComponent(username)}&userPass=${encodeURIComponent(passwordBase64)}`;

  const loginRes = await httpsRequest({
    hostname: 'czwh.wms.yunwms.com',
    path: '/login.html',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Cookie': initCookies,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://czwh.wms.yunwms.com/',
      'Content-Length': Buffer.byteLength(loginBody)
    }
  }, loginBody);

  let loginData: any = {};
  try {
    loginData = JSON.parse(loginRes.body);
  } catch (e) {
    throw new Error(`Phản hồi đăng nhập WMS không hợp lệ: ${loginRes.body.slice(0, 150)}`);
  }

  if (loginData.state !== 1) {
    throw new Error(loginData.message || 'Đăng nhập WMS thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.');
  }

  const loginCookies = extractCookies(loginRes.headers);
  const combinedCookies = [initCookies, loginCookies].filter(Boolean).join('; ');

  cachedSessionCookie = combinedCookies;
  // Cache trong 25 phút (tránh phiên làm việc 30 phút bị timeout)
  sessionExpiresAt = now + 25 * 60 * 1000;

  return combinedCookies;
}

/**
 * Chuyển đổi dữ liệu WMS thô sang danh sách RawOrderRow chuẩn của công cụ
 */
export function convertWmsOrdersToRawOrderRows(
  wmsOrders: WmsRawOrderData[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS
): RawOrderRow[] {
  const intermediateList = wmsOrders.map((order) => {
    const orderNo = (order.E1 || order.E17 || '').trim();
    const trackingNo = (order.tracking_number || '').trim();
    const pickingList = (order.picking_code || '').trim();

    // Trích xuất các mốc thời gian (Thời gian tạo & thời gian xuất kho Shipped)
    const creationTime = (order.E14 || '').trim();
    const shippedTime = (
      order.E15 ||
      order.E16 ||
      order.E18 ||
      order.E20 ||
      order.shipped_time ||
      order.outbound_time ||
      order.ship_time ||
      ''
    ).trim();
    const statusE11 = (order.E11 || '').trim();

    // Lấy danh sách sản phẩm
    const productList = order.productList || [];
    const itemStrings: string[] = [];

    productList.forEach((p) => {
      const sku = (p.product_barcode || '').trim();
      const qty = parseInt(String(p.op_quantity || 1), 10) || 1;
      if (sku) {
        itemStrings.push(`${sku}*${qty}`);
      }
    });

    const rawPieceText = itemStrings.join('\n');
    const rawOrderText = [
      `Order No.: ${orderNo}`,
      trackingNo ? `Tracking No.: ${trackingNo}` : '',
      order.E17 ? `RefNo.: ${order.E17}` : '',
      order.E7 ? `Channel: ${order.E7}` : '',
      creationTime ? `Creation Time: ${creationTime}` : '',
      shippedTime ? `Shipped Time: ${shippedTime}` : '',
    ].filter(Boolean).join('\n');

    const rawPickingText = pickingList ? `Picking List No.: ${pickingList}` : '';

    return {
      rawOrderText,
      rawPieceText,
      rawPickingText,
      orderNo,
      trackingNo,
      pickingList,
      creationTime,
      shippedTime,
      statusE11,
    };
  });

  return parseRawOrderRows(intermediateList, skuGroups);
}

interface ServerOrderCacheItem {
  timestamp: number;
  data: WmsFetchResult;
}
const serverOrderCache = new Map<string, ServerOrderCacheItem>();

export function getVnTodayString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Lấy danh sách đơn hàng từ YunWMS bằng API nội bộ POST /order/orders/list/page/{page}/pageSize/{pageSize}
 */
export async function fetchWmsOrders(
  options: WmsFetchOptions = {},
  onProgress?: (info: { page: number; totalPages: number; fetched: number; total: number }) => void
): Promise<WmsFetchResult> {
  const {
    username = 'David',
    password = '12345abc',
    warehouse = '7', // VN02 HCM mặc định
    status = '4',    // Submitted mặc định
    pageSize = 500,  // Kéo 500 đơn mỗi lần
    maxPages = 0,    // 0 = kéo toàn bộ các trang
    skuGroups = DEFAULT_SKU_GROUPS,
    dateFor = '',
    dateTo = '',
    searchDateType = '',
    forceRefresh = false
  } = options;

  // Đối với status '8' (Shipped), nếu không truyền ngày cụ thể thì mặc định là NGÀY HÔM NAY (theo giờ VN)
  // để thống kê chính xác số đơn kho đã đóng gói / xuất kho hôm nay (thay vì 300k+ đơn lịch sử)
  const vnToday = getVnTodayString();
  const effectiveDateFor = (status === '8' && !dateFor) ? vnToday : dateFor;
  const effectiveDateTo = (status === '8' && !dateTo) ? (dateFor ? dateTo : vnToday) : dateTo;
  const effectiveSearchDateType = (status === '8' && (!searchDateType || searchDateType === 'createDate'))
    ? 'packTime'
    : (searchDateType || 'createDate');

  // 1. Kiểm tra Cache Bộ Nhớ Phía Máy Chủ (Server In-Memory Hot Cache)
  // Phản hồi siêu tốc trong 2-5ms nếu dữ liệu đã có trong 4 giây qua
  const cacheKey = `${warehouse}_${status}_${pageSize}_${maxPages}_${effectiveDateFor}_${effectiveSearchDateType}`;
  if (!forceRefresh) {
    const cached = serverOrderCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 4000) {
      return cached.data;
    }
  }

  let sessionCookie = await getWmsSessionCookie(username, password);

  // Chuẩn bị tham số lọc
  const params: string[] = [];
  if (warehouse) params.push(`E4=${encodeURIComponent(warehouse)}`);
  if (status) params.push(`E11=${encodeURIComponent(status)}`);
  if (effectiveDateFor) {
    params.push(`searchDateType=${encodeURIComponent(effectiveSearchDateType)}`);
    params.push(`dateFor=${encodeURIComponent(effectiveDateFor.includes(':') ? effectiveDateFor : `${effectiveDateFor} 00:00`)}`);
    params.push(`dateTo=${encodeURIComponent(effectiveDateTo ? (effectiveDateTo.includes(':') ? effectiveDateTo : `${effectiveDateTo} 23:59`) : `${effectiveDateFor} 23:59`)}`);
  }
  const postData = params.join('&');

  // Gọi trang 1 trước để xác định tổng số đơn hàng
  const fetchPage = async (page: number, currentCookie: string) => {
    const res = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: `/order/orders/list/page/${page}/pageSize/${pageSize}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': currentCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    let json: any = {};
    try {
      json = JSON.parse(res.body);
    } catch (err) {
      throw new Error(`Không phân tích được phản hồi JSON từ WMS trang ${page}: ${res.body.slice(0, 150)}`);
    }

    // Nếu session hết hạn, thử login lại
    if (json.state === 0 && (json.reLogin === 1 || (json.message && json.message.includes('登录')))) {
      const freshCookie = await getWmsSessionCookie(username, password, true);
      return fetchPage(page, freshCookie);
    }

    return json;
  };

  const page1Json = await fetchPage(1, sessionCookie);
  const totalOrders = parseInt(String(page1Json.total || 0), 10);
  const allWmsOrders: WmsRawOrderData[] = Array.isArray(page1Json.data) ? page1Json.data : [];

  const totalPages = Math.ceil(totalOrders / pageSize) || 1;

  // Nếu maxPages > 0 thì chỉ lấy số trang đó, ngược lại lấy toàn bộ (totalPages)
  let pagesToFetch = maxPages > 0 ? Math.min(maxPages, totalPages) : totalPages;
  if (status === '8' && maxPages <= 0 && !effectiveDateFor) {
    // Chỉ giới hạn 1 trang nếu status=8 hoàn toàn không có bộ lọc ngày (kéo 300k+ đơn toàn thời gian)
    pagesToFetch = Math.min(totalPages, 1);
  }

  if (onProgress) {
    onProgress({
      page: 1,
      totalPages: pagesToFetch,
      fetched: allWmsOrders.length,
      total: totalOrders
    });
  }

  // Nếu còn các trang tiếp theo, kéo song song với giới hạn concurrency pool
  if (pagesToFetch > 1) {
    const remainingPages: number[] = [];
    for (let p = 2; p <= pagesToFetch; p++) {
      remainingPages.push(p);
    }

    // Concurrency pool 5 luồng song song
    const CONCURRENCY = 5;
    for (let i = 0; i < remainingPages.length; i += CONCURRENCY) {
      const batch = remainingPages.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (page) => {
          const resJson = await fetchPage(page, sessionCookie);
          return { page, data: (resJson.data || []) as WmsRawOrderData[] };
        })
      );

      batchResults.forEach((res) => {
        allWmsOrders.push(...res.data);
        if (onProgress) {
          onProgress({
            page: res.page,
            totalPages: pagesToFetch,
            fetched: allWmsOrders.length,
            total: totalOrders
          });
        }
      });
    }
  }

  // Chuyển đổi sang RawOrderRow
  const parsedRows = convertWmsOrdersToRawOrderRows(allWmsOrders, skuGroups);

  const result: WmsFetchResult = {
    success: true,
    totalOrders,
    returnedOrders: parsedRows.length,
    orders: parsedRows,
    warehouse,
    status,
    message: `Đã kết nối và lấy thành công ${parsedRows.length}/${totalOrders} đơn từ YunWMS.`
  };

  if (!dateFor) {
    serverOrderCache.set(cacheKey, { timestamp: Date.now(), data: result });
  }

  return result;
}

/**
 * Bắt đơn mới thời gian thực (Polling siêu tốc):
 * Chỉ lấy trang 1 (50-60 đơn mới nhất), so sánh với các đơn đã có trong hệ thống và trả về đơn mới xuất hiện
 */
export async function pollLatestWmsOrders(
  knownOrderNos: string[] = [],
  options: {
    warehouse?: string;
    status?: string;
    pageSize?: number;
    username?: string;
    password?: string;
    skuGroups?: SkuGroupsMap;
    dateFor?: string;
    dateTo?: string;
    searchDateType?: string;
  } = {}
): Promise<{
  success: boolean;
  totalOrders: number;
  newOrders: RawOrderRow[];
  hasNew: boolean;
  latestOrderNo?: string;
  statusCounts?: Record<string, number>;
}> {
  const {
    warehouse = '7',
    status = '4',
    pageSize = 60,
    username = 'David',
    password = '12345abc',
    skuGroups = DEFAULT_SKU_GROUPS,
    dateFor = '',
    dateTo = '',
    searchDateType = ''
  } = options;

  const vnToday = getVnTodayString();
  const effectiveDateFor = (status === '8' && !dateFor) ? vnToday : dateFor;
  const effectiveDateTo = (status === '8' && !dateTo) ? (dateFor ? dateTo : vnToday) : dateTo;
  const effectiveSearchDateType = (status === '8' && (!searchDateType || searchDateType === 'createDate'))
    ? 'packTime'
    : (searchDateType || 'packTime');

  let sessionCookie = await getWmsSessionCookie(username, password);

  const params: string[] = [];
  if (warehouse) params.push(`E4=${encodeURIComponent(warehouse)}`);
  if (status) params.push(`E11=${encodeURIComponent(status)}`);
  if (effectiveDateFor) {
    params.push(`searchDateType=${encodeURIComponent(effectiveSearchDateType)}`);
    params.push(`dateFor=${encodeURIComponent(effectiveDateFor.includes(':') ? effectiveDateFor : `${effectiveDateFor} 00:00`)}`);
    params.push(`dateTo=${encodeURIComponent(effectiveDateTo ? (effectiveDateTo.includes(':') ? effectiveDateTo : `${effectiveDateTo} 23:59`) : `${effectiveDateFor} 23:59`)}`);
  }
  const postData = params.join('&');

  const fetchPage1 = async (currentCookie: string) => {
    const res = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: `/order/orders/list/page/1/pageSize/${pageSize}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': currentCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    let json: any = {};
    try {
      json = JSON.parse(res.body);
    } catch {
      json = { state: 0, total: 0, data: [] };
    }
    if (json.state === 0 && (json.reLogin === 1 || (json.message && json.message.includes('登录')))) {
      const freshCookie = await getWmsSessionCookie(username, password, true);
      return fetchPage1(freshCookie);
    }
    return json;
  };

  const fetchCountFor = async (postBody: string, currentCookie: string) => {
    try {
      const res = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: '/order/orders/list/page/1/pageSize/1',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': currentCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
          'Content-Length': Buffer.byteLength(postBody)
        }
      }, postBody);
      const j = JSON.parse(res.body);
      return parseInt(String(j.total || 0), 10);
    } catch {
      return null;
    }
  };

  // Kéo đồng thời số lượng của 2 trạng thái còn lại trong bộ 3 (4: Submitted, 5: Shelved, 8: Shipped Hôm Nay)
  const todayShippedQuery = `E4=${encodeURIComponent(warehouse)}&E11=8&searchDateType=packTime&dateFor=${encodeURIComponent(vnToday + ' 00:00')}&dateTo=${encodeURIComponent(vnToday + ' 23:59')}`;
  
  let otherPromises: Promise<{ key: string; count: number | null }>[] = [];
  if (status === '4') {
    otherPromises = [
      fetchCountFor(`E4=${encodeURIComponent(warehouse)}&E11=5`, sessionCookie).then(c => ({ key: '5', count: c })),
      fetchCountFor(todayShippedQuery, sessionCookie).then(c => ({ key: '8', count: c }))
    ];
  } else if (status === '5') {
    otherPromises = [
      fetchCountFor(`E4=${encodeURIComponent(warehouse)}&E11=4`, sessionCookie).then(c => ({ key: '4', count: c })),
      fetchCountFor(todayShippedQuery, sessionCookie).then(c => ({ key: '8', count: c }))
    ];
  } else {
    // status === '8'
    otherPromises = [
      fetchCountFor(`E4=${encodeURIComponent(warehouse)}&E11=4`, sessionCookie).then(c => ({ key: '4', count: c })),
      fetchCountFor(`E4=${encodeURIComponent(warehouse)}&E11=5`, sessionCookie).then(c => ({ key: '5', count: c }))
    ];
  }

  const [json, ...otherCounts] = await Promise.all([
    fetchPage1(sessionCookie),
    ...otherPromises
  ]);

  const totalOrders = parseInt(String(json.total || 0), 10);
  const rawOrders: WmsRawOrderData[] = Array.isArray(json.data) ? json.data : [];

  const knownSet = new Set(knownOrderNos.map(s => String(s).trim().toUpperCase()));
  const newWmsOrders: WmsRawOrderData[] = [];

  for (const o of rawOrders) {
    const oNo = (o.E1 || o.E17 || '').trim().toUpperCase();
    const tNo = (o.tracking_number || '').trim().toUpperCase();
    if (oNo && !knownSet.has(oNo) && (!tNo || !knownSet.has(tNo))) {
      newWmsOrders.push(o);
    }
  }

  const newParsedRows = convertWmsOrdersToRawOrderRows(newWmsOrders, skuGroups);
  const latestOrderNo = rawOrders.length > 0 ? (rawOrders[0].E1 || rawOrders[0].E17) : undefined;

  const statusCounts: Record<string, number> = {
    [status]: totalOrders
  };
  for (const item of otherCounts) {
    if (item && item.count !== null && item.count !== undefined) {
      statusCounts[item.key] = item.count;
    }
  }

  return {
    success: true,
    totalOrders,
    newOrders: newParsedRows,
    hasNew: newParsedRows.length > 0,
    latestOrderNo,
    statusCounts
  };
}

export interface WmsInventoryFetchOptions {
  username?: string;
  password?: string;
  warehouse?: string; // '7' = VN02 [Đồng Nai], '4' = VN01 [Hải Ngoại], '' = Tất cả
  customerCode?: string;
  productBarcode?: string;
  pageSize?: number;
  skuGroups?: SkuGroupsMap;
}

/**
 * Kéo dữ liệu tồn kho từ YunWMS bằng API nội bộ POST /warehouse/inventory/list/page/{page}/pageSize/{pageSize}
 * và tự động tổng hợp phân loại theo Nhóm mã SKU
 */
let cachedInventoryResult: { result: InventoryQueryResult; expiresAt: number; warehouse: string } | null = null;

export async function fetchWmsInventory(
  options: WmsInventoryFetchOptions = {}
): Promise<InventoryQueryResult> {
  const {
    username = 'David',
    password = '12345abc',
    warehouse = '7', // VN02 Đồng Nai mặc định
    customerCode = '',
    productBarcode = '',
    pageSize = 500,
    skuGroups = DEFAULT_SKU_GROUPS
  } = options;

  // Trả về cache bộ nhớ 3 phút nếu không có bộ lọc tìm kiếm cụ thể
  const now = Date.now();
  if (
    !customerCode &&
    !productBarcode &&
    cachedInventoryResult &&
    cachedInventoryResult.warehouse === warehouse &&
    now < cachedInventoryResult.expiresAt
  ) {
    return cachedInventoryResult.result;
  }

  let sessionCookie = await getWmsSessionCookie(username, password);

  // Chuẩn bị tham số
  const params: string[] = [];
  if (warehouse) params.push(`warehouse_id=${encodeURIComponent(warehouse)}`);
  if (customerCode) params.push(`customerCode=${encodeURIComponent(customerCode)}`);
  if (productBarcode) params.push(`product_barcode=${encodeURIComponent(productBarcode)}`);
  const postData = params.join('&');

  const fetchPage = async (page: number, currentCookie: string) => {
    const res = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: `/warehouse/inventory/list/page/${page}/pageSize/${pageSize}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': currentCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/warehouse/inventory/list',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, postData);

    let json: any = {};
    try {
      json = JSON.parse(res.body);
    } catch (err) {
      throw new Error(`Không phân tích được phản hồi JSON tồn kho WMS trang ${page}: ${res.body.slice(0, 150)}`);
    }

    if (json.state === 0 && (json.reLogin === 1 || (json.message && json.message.includes('登录')))) {
      const freshCookie = await getWmsSessionCookie(username, password, true);
      return fetchPage(page, freshCookie);
    }

    return json;
  };

  const page1Json = await fetchPage(1, sessionCookie);
  const totalSkus = parseInt(String(page1Json.total || 0), 10);
  const allRawItems: any[] = Array.isArray(page1Json.data) ? [...page1Json.data] : [];

  const totalPages = Math.ceil(totalSkus / pageSize) || 1;
  if (totalPages > 1) {
    for (let p = 2; p <= totalPages; p++) {
      const pJson = await fetchPage(p, sessionCookie);
      if (Array.isArray(pJson.data)) {
        allRawItems.push(...pJson.data);
      }
    }
  }

  // Parse từng sản phẩm
  const items: WmsInventoryItem[] = allRawItems.map((raw) => {
    const sku = (raw.product_barcode || '').trim();
    const group = layNhomTuSKU(sku, skuGroups);
    const whId = String(raw.warehouse_id || warehouse || '7');
    const whName = whId === '7' ? 'VN02 [Đồng Nai]' : (whId === '4' ? 'VN01 [Hải Ngoại]' : `Kho ${whId}`);

    return {
      id: String(raw.pi_id || raw.product_id || sku || Math.random()),
      sku,
      group,
      title: (raw.product_title || '').trim(),
      productName: (raw.product_name || raw.product_title || '').trim(),
      customerCode: raw.customer_code || 'YD',
      warehouseId: whId,
      warehouseName: whName,
      inUsed: parseInt(String(raw.pi_in_used ?? 0), 10) || 0,
      sellable: parseInt(String(raw.pi_sellable ?? 0), 10) || 0,
      onWay: parseInt(String(raw.pi_onway ?? 0), 10) || 0,
      pending: parseInt(String(raw.pi_pending ?? 0), 10) || 0,
      outbound: parseInt(String(raw.pi_outbound ?? 0), 10) || 0,
      unsellable: parseInt(String(raw.pi_unsellable ?? 0), 10) || 0,
      unconfirmed: parseInt(String(raw.pi_unconfirmed ?? 0), 10) || 0,
      shared: parseInt(String(raw.pi_shared ?? 0), 10) || 0,
      warningQty: parseInt(String(raw.pi_warning_qty ?? 0), 10) || 0,
      updateTime: raw.pi_update_time || '',
      productId: raw.product_id ? String(raw.product_id) : undefined,
      raw
    };
  });

  // Tính toán tổng số & tổng hợp theo nhóm
  let totalInUsed = 0;
  let totalSellable = 0;
  let totalOnWay = 0;
  let totalPending = 0;
  let totalOutbound = 0;
  let totalUnsellable = 0;

  const groupMap: Record<string, InventoryGroupSummary> = {};

  items.forEach((item) => {
    totalInUsed += item.inUsed;
    totalSellable += item.sellable;
    totalOnWay += item.onWay;
    totalPending += item.pending;
    totalOutbound += item.outbound;
    totalUnsellable += item.unsellable;

    if (!groupMap[item.group]) {
      groupMap[item.group] = {
        group: item.group,
        skuCount: 0,
        totalInUsed: 0,
        totalSellable: 0,
        totalOnWay: 0,
        totalPending: 0,
        totalOutbound: 0,
        totalUnsellable: 0,
        items: [],
        percentageOfTotal: 0
      };
    }

    const g = groupMap[item.group];
    g.skuCount += 1;
    g.totalInUsed += item.inUsed;
    g.totalSellable += item.sellable;
    g.totalOnWay += item.onWay;
    g.totalPending += item.pending;
    g.totalOutbound += item.outbound;
    g.totalUnsellable += item.unsellable;
    g.items.push(item);
  });

  // Tính phần trăm & sắp xếp SKU trong từng nhóm theo thứ tự chữ cái và số (A-Z, 0-9)
  const groups: InventoryGroupSummary[] = Object.values(groupMap).map((g) => {
    g.percentageOfTotal = totalInUsed > 0 ? Math.round((g.totalInUsed / totalInUsed) * 1000) / 10 : 0;
    // Sắp xếp SKU theo vần chữ cái và số tự nhiên
    g.items.sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }));
    return g;
  });

  // Sắp xếp danh sách nhóm theo thứ tự chuẩn DEFAULT_AREA_ORDER hoặc vần chữ cái & số
  groups.sort((a, b) => {
    const isYdA = a.group.startsWith('YD-');
    const isYdB = b.group.startsWith('YD-');
    if (isYdA && !isYdB) return -1;
    if (!isYdA && isYdB) return 1;
    return a.group.localeCompare(b.group, undefined, { numeric: true, sensitivity: 'base' });
  });

  const result: InventoryQueryResult = {
    success: true,
    totalSkus: items.length,
    totalInUsed,
    totalSellable,
    totalOnWay,
    totalPending,
    totalOutbound,
    totalUnsellable,
    groups,
    items,
    fetchedAt: new Date().toLocaleString('vi-VN'),
    warehouse: warehouse === '7' ? 'VN02 [Đồng Nai]' : (warehouse === '4' ? 'VN01 [Hải Ngoại]' : `Kho ${warehouse}`)
  };

  if (!customerCode && !productBarcode) {
    cachedInventoryResult = {
      result,
      expiresAt: Date.now() + 3 * 60 * 1000,
      warehouse
    };
  }

  return result;
}

// Cache in-memory SKU -> Product Image
const skuImageRamCache = new Map<string, { productId: string; imageUrl: string }>();

/**
 * Lấy URL hình ảnh sản phẩm từ hệ thống YunWMS dựa trên SKU hoặc productId
 * Hệ thống sử dụng: GET /product/product/detail/skuid/{productId}
 * Trích xuất hàm _loadImage({ ... "src": "http://czwh.yunwms.com/default/index/view-img?..." })
 * và follow redirect 302 sang CDN HTTPS vĩnh viễn (https://hk-wms-oms-cdn.yunwms.com/...)
 */
export async function fetchSkuImage(
  sku: string,
  productId?: string,
  username = 'David',
  password = '12345abc'
): Promise<{ success: boolean; sku: string; productId?: string; imageUrl?: string; message?: string }> {
  const cleanSku = (sku || '').trim();
  if (!cleanSku && !productId) {
    return { success: false, sku: '', message: 'Thiếu mã SKU hoặc productId' };
  }

  // 1. Kiểm tra RAM cache
  if (cleanSku && skuImageRamCache.has(cleanSku)) {
    const cached = skuImageRamCache.get(cleanSku)!;
    return { success: true, sku: cleanSku, productId: cached.productId, imageUrl: cached.imageUrl };
  }

  let finalProductId = productId ? String(productId).trim() : '';

  // 2. Nếu chưa có productId, thử tìm trong tồn kho theo SKU
  if (!finalProductId && cleanSku) {
    try {
      const sessionCookie = await getWmsSessionCookie(username, password);
      const postData = `product_barcode=${encodeURIComponent(cleanSku)}`;
      const res = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: '/warehouse/inventory/list/page/1/pageSize/5',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Cookie': sessionCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://czwh.wms.yunwms.com/warehouse/inventory/list',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, postData);

      const json = JSON.parse(res.body);
      if (json.data && json.data.length > 0 && json.data[0].product_id) {
        finalProductId = String(json.data[0].product_id);
      }
    } catch (err: any) {
      console.warn(`[fetchSkuImage] Lỗi tìm productId cho SKU ${cleanSku}:`, err?.message);
    }
  }

  if (!finalProductId) {
    return { success: false, sku: cleanSku, message: 'Không tìm thấy ID sản phẩm trên YunWMS' };
  }

  try {
    const sessionCookie = await getWmsSessionCookie(username, password);
    const detailRes = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: `/product/product/detail/skuid/${finalProductId}`,
      method: 'GET',
      headers: {
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/product/product/list'
      }
    });

    // Trích xuất _loadImage({...})
    const match = detailRes.body.match(/_loadImage\((.*?)\);/);
    if (!match) {
      return { success: false, sku: cleanSku, productId: finalProductId, message: 'Sản phẩm chưa có hình ảnh' };
    }

    let imgObj: any = {};
    try {
      imgObj = JSON.parse(match[1]);
    } catch {
      return { success: false, sku: cleanSku, productId: finalProductId, message: 'Lỗi parse dữ liệu ảnh' };
    }

    let rawImgUrl = (imgObj.src || imgObj.pa_path || '').replace(/\\\//g, '/');
    if (!rawImgUrl) {
      return { success: false, sku: cleanSku, productId: finalProductId, message: 'Không có đường dẫn ảnh' };
    }

    // Kiểm tra follow 302 redirect để lấy URL CDN HTTPS vĩnh viễn
    let cdnUrl = rawImgUrl;
    if (rawImgUrl.startsWith('http://czwh.yunwms.com/')) {
      try {
        const redirectPromise = new Promise<string>((resolve) => {
          const req = http.get(rawImgUrl, (res) => {
            if (res.statusCode === 302 && res.headers.location) {
              resolve(res.headers.location);
            } else {
              resolve(rawImgUrl);
            }
          });
          req.on('error', () => resolve(rawImgUrl));
          req.setTimeout(3000, () => {
            req.destroy();
            resolve(rawImgUrl);
          });
        });
        cdnUrl = await redirectPromise;
      } catch {
        cdnUrl = rawImgUrl;
      }
    }

    // Lưu vào RAM cache
    if (cleanSku) {
      skuImageRamCache.set(cleanSku, { productId: finalProductId, imageUrl: cdnUrl });
    }

    return {
      success: true,
      sku: cleanSku,
      productId: finalProductId,
      imageUrl: cdnUrl
    };
  } catch (err: any) {
    return {
      success: false,
      sku: cleanSku,
      productId: finalProductId,
      message: err?.message || 'Lỗi khi tải hình ảnh từ YunWMS'
    };
  }
}

export interface OrderAttachmentInfo {
  orderNo: string;
  orderId: string;
  trackingNo: string;
  refNo: string;
  carrier?: string;
  shippingMethod?: string;
  pickingList?: string;
  status: string;
  statusCode: string;
  warehouseId: string;
  createDate: string;
  items: Array<{
    sku: string;
    qty: number;
    title?: string;
  }>;
  skuGroup?: string;
  hasAttachment: boolean;
  attachmentFileName?: string;
  attachmentUrl?: string;
  oatId?: string;
  error?: string;
}

export interface SkuPickingSummaryItem {
  sku: string;
  group?: string;
  totalQty: number;
  orderCount: number;
  orderNos: string[];
}

export interface BatchSearchOrderAttachmentsResult {
  success: boolean;
  totalInputCodes: number;
  totalFound: number;
  totalWithPdf: number;
  orders: OrderAttachmentInfo[];
  skuSummary: SkuPickingSummaryItem[];
  totalPcs: number;
  missingCodes: string[];
}

/**
 * Tìm kiếm đơn hàng theo danh sách mã hoặc Picking List No., bóc tách SKU & tự động lấy tệp đính kèm PDF nhãn vận chuyển từ YunWMS
 */
export async function searchOrdersWithAttachments(options: {
  searchCodes: string | string[];
  warehouse?: string;
  username?: string;
  password?: string;
  skuGroups?: SkuGroupsMap;
}): Promise<BatchSearchOrderAttachmentsResult> {
  const {
    searchCodes,
    warehouse = '7',
    username = 'David',
    password = '12345abc',
    skuGroups = DEFAULT_SKU_GROUPS
  } = options;

  let codesList: string[] = [];
  if (Array.isArray(searchCodes)) {
    codesList = searchCodes;
  } else if (typeof searchCodes === 'string') {
    codesList = searchCodes
      .split(/[\r\n,\t\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Deduplicate
  const uniqueCodes = Array.from(new Set(codesList));
  if (uniqueCodes.length === 0) {
    return {
      success: true,
      totalInputCodes: 0,
      totalFound: 0,
      totalWithPdf: 0,
      orders: [],
      skuSummary: [],
      totalPcs: 0,
      missingCodes: []
    };
  }

  const sessionCookie = await getWmsSessionCookie(username, password);
  const rawFoundOrders: WmsRawOrderData[] = [];

  // 1. Phân loại mã: Mã bắt đầu bằng PL (Picking List) vs Mã đơn thông thường
  const plCodes: string[] = [];
  const normalCodes: string[] = [];

  for (const c of uniqueCodes) {
    if (/^PL/i.test(c)) {
      plCodes.push(c);
    } else {
      normalCodes.push(c);
    }
  }

  // 2. Tìm kiếm theo Picking List No. (YunWMS sử dụng tham số picking_code)
  for (const pl of plCodes) {
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const postBody = `E4=${encodeURIComponent(warehouse)}&picking_code=${encodeURIComponent(pl)}`;
      try {
        const res = await httpsRequest({
          hostname: 'czwh.wms.yunwms.com',
          path: `/order/orders/list/page/${page}/pageSize/500`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': sessionCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
            'Content-Length': Buffer.byteLength(postBody)
          }
        }, postBody);

        const json = JSON.parse(res.body);
        const total = parseInt(String(json.total || 0), 10);
        totalPages = Math.ceil(total / 500) || 1;
        if (Array.isArray(json.data)) {
          rawFoundOrders.push(...json.data);
        }
      } catch (err: any) {
        console.warn(`Lỗi tìm đơn theo picking_code ${pl}:`, err?.message);
        break;
      }
      page++;
    }
  }

  // 3. Tìm kiếm theo danh sách mã đơn thông thường (searchCode, chunk 35 mã)
  if (normalCodes.length > 0) {
    const CHUNK_SIZE = 35;
    const chunks: string[][] = [];
    for (let i = 0; i < normalCodes.length; i += CHUNK_SIZE) {
      chunks.push(normalCodes.slice(i, i + CHUNK_SIZE));
    }

    for (const chunk of chunks) {
      const postBody = `E4=${encodeURIComponent(warehouse)}&searchCode=${encodeURIComponent(chunk.join(' '))}`;
      try {
        const res = await httpsRequest({
          hostname: 'czwh.wms.yunwms.com',
          path: `/order/orders/list/page/1/pageSize/${Math.max(chunk.length * 2, 50)}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': sessionCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'https://czwh.wms.yunwms.com/order/orders/list',
            'Content-Length': Buffer.byteLength(postBody)
          }
        }, postBody);

        const json = JSON.parse(res.body);
        if (Array.isArray(json.data)) {
          rawFoundOrders.push(...json.data);
        }
      } catch (err: any) {
        console.warn('Lỗi tìm kiếm đơn theo chunk:', err?.message);
      }
    }
  }

  // Khử trùng lặp đơn hàng theo order_id (E0)
  const orderMap = new Map<string, WmsRawOrderData>();
  for (const o of rawFoundOrders) {
    const key = o.E0 || o.E1 || '';
    if (key && !orderMap.has(key)) {
      orderMap.set(key, o);
    }
  }

  const foundOrdersList = Array.from(orderMap.values());

  // Kéo file đính kèm cho từng đơn hàng song song (concurrency pool 6 luồng)
  const fetchAttachmentForOrder = async (order: WmsRawOrderData): Promise<OrderAttachmentInfo> => {
    const orderNo = (order.E1 || '').trim();
    const orderId = String(order.E0 || '').trim();
    const trackingNo = (order.tracking_number || '').trim();
    const refNo = (order.E17 || '').trim();
    const pickingList = (order.picking_code || '').trim();
    const carrier = (order.E7 || order.E32 || '').trim();
    const shippingMethod = (order.E32 || order.E7 || '').trim();
    const statusCode = String(order.E11 || '');
    const statusText = statusCode === '8' ? 'Shipped' : statusCode === '5' ? 'Shelved' : statusCode === '4' ? 'Submitted' : `Trạng thái ${statusCode}`;
    const createDate = order.E14 || order.warehouse_E14 || '';

    const items: Array<{ sku: string; qty: number; title?: string }> = [];
    if (Array.isArray(order.productList)) {
      for (const p of order.productList) {
        const sku = (p.product_barcode || '').trim();
        const qty = parseInt(String(p.op_quantity || 1), 10) || 1;
        if (sku) {
          items.push({ sku, qty, title: p.product_title });
        }
      }
    }

    if (!orderId) {
      return {
        orderNo,
        orderId,
        trackingNo,
        refNo,
        pickingList,
        status: statusText,
        statusCode,
        warehouseId: String(order.E4 || warehouse),
        createDate,
        items,
        hasAttachment: false,
        error: 'Thiếu Order ID'
      };
    }

    // Kiểm tra cache trước (0ms)
    if (wmsAttachmentCache.has(orderId)) {
      const cached = wmsAttachmentCache.get(orderId)!;
      return {
        orderNo,
        orderId,
        trackingNo,
        refNo,
        carrier,
        shippingMethod,
        pickingList,
        status: statusText,
        statusCode,
        warehouseId: String(order.E4 || warehouse),
        createDate,
        items,
        hasAttachment: cached.hasAttachment,
        attachmentFileName: cached.fileName,
        attachmentUrl: cached.attachmentUrl,
        oatId: cached.oatId,
        error: cached.error
      };
    }

    try {
      const attachRes = await httpsRequest({
        hostname: 'czwh.wms.yunwms.com',
        path: `/order/orders/attachment-edit/page/1/pageSize/10/order_id/${orderId}`,
        method: 'POST',
        headers: {
          'Cookie': sessionCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }, '');

      const attachJson = JSON.parse(attachRes.body);
      const attachFiles = Array.isArray(attachJson.attach_file) ? attachJson.attach_file : [];

      // Tìm file PDF nhãn đơn hàng
      const pdfItem = attachFiles.find((f: any) =>
        f.oat_file_type === 'pdf' ||
        (f.oat_file_name && f.oat_file_name.toLowerCase().endsWith('.pdf')) ||
        f.oat_type === '3' ||
        f.oat_type === 3
      ) || attachFiles[0];

      if (pdfItem) {
        const fileUrl = (pdfItem.download_file || pdfItem.oat_file_path || '').replace(/\\\//g, '/');
        const oatId = String(pdfItem.oat_id || pdfItem.ref_oat_id || '');
        const fileName = pdfItem.oat_file_name || `order_${orderNo}.pdf`;

        wmsAttachmentCache.set(orderId, {
          hasAttachment: true,
          fileName,
          attachmentUrl: fileUrl,
          oatId
        });

        return {
          orderNo,
          orderId,
          trackingNo,
          refNo,
          carrier,
          shippingMethod,
          pickingList,
          status: statusText,
          statusCode,
          warehouseId: String(order.E4 || warehouse),
          createDate,
          items,
          hasAttachment: true,
          attachmentFileName: fileName,
          attachmentUrl: fileUrl,
          oatId
        };
      } else {
        wmsAttachmentCache.set(orderId, {
          hasAttachment: false,
          error: 'Chưa có tệp đính kèm trên WMS'
        });
        return {
          orderNo,
          orderId,
          trackingNo,
          refNo,
          carrier,
          shippingMethod,
          pickingList,
          status: statusText,
          statusCode,
          warehouseId: String(order.E4 || warehouse),
          createDate,
          items,
          hasAttachment: false,
          error: 'Chưa có tệp đính kèm trên WMS'
        };
      }
    } catch (err: any) {
      return {
        orderNo,
        orderId,
        trackingNo,
        refNo,
        carrier,
        shippingMethod,
        pickingList,
        status: statusText,
        statusCode,
        warehouseId: String(order.E4 || warehouse),
        createDate,
        items,
        hasAttachment: false,
        error: err?.message || 'Lỗi lấy file đính kèm'
      };
    }
  };

  // Concurrency pool luồng động liên tục (35 workers) giúp xử lý nhanh gấp nhiều lần
  const CONCURRENCY = 35;
  const processedOrders: OrderAttachmentInfo[] = new Array(foundOrdersList.length);
  let currentIndex = 0;
  let activeWorkers = 0;

  await new Promise<void>((resolve) => {
    if (foundOrdersList.length === 0) return resolve();
    function runNext() {
      if (currentIndex >= foundOrdersList.length && activeWorkers === 0) {
        return resolve();
      }
      while (activeWorkers < CONCURRENCY && currentIndex < foundOrdersList.length) {
        const itemIdx = currentIndex++;
        activeWorkers++;
        fetchAttachmentForOrder(foundOrdersList[itemIdx])
          .then((res) => {
            processedOrders[itemIdx] = res;
          })
          .catch((err) => {
            processedOrders[itemIdx] = {
              orderNo: foundOrdersList[itemIdx].E1 || '',
              orderId: String(foundOrdersList[itemIdx].E0 || ''),
              trackingNo: foundOrdersList[itemIdx].tracking_number || '',
              refNo: foundOrdersList[itemIdx].E17 || '',
              pickingList: foundOrdersList[itemIdx].picking_code || '',
              status: '',
              statusCode: String(foundOrdersList[itemIdx].E11 || ''),
              warehouseId: String(foundOrdersList[itemIdx].E4 || ''),
              createDate: '',
              items: [],
              hasAttachment: false,
              error: err?.message || 'Lỗi lấy file'
            };
          })
          .finally(() => {
            activeWorkers--;
            runNext();
          });
      }
    }
    runNext();
  });

  // Tổng hợp SKU Lấy Hàng (Picking Summary)
  const skuMap = new Map<string, { totalQty: number; orderCount: number; orderNos: Set<string> }>();
  let totalPcs = 0;

  for (const o of processedOrders) {
    for (const item of o.items) {
      totalPcs += item.qty;
      const current = skuMap.get(item.sku) || { totalQty: 0, orderCount: 0, orderNos: new Set<string>() };
      current.totalQty += item.qty;
      current.orderNos.add(o.orderNo || o.trackingNo);
      current.orderCount = current.orderNos.size;
      skuMap.set(item.sku, current);
    }
  }

  // 1. Tổng hợp & sắp xếp SKU: SKU nhiều đơn / sản phẩm nhất đứng đầu
  const skuSummary: SkuPickingSummaryItem[] = Array.from(skuMap.entries())
    .map(([sku, info]) => {
      // Sắp xếp các mã đơn trong từng SKU từ thấp đến cao (numeric ascending)
      const sortedNos = Array.from(info.orderNos).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      return {
        sku,
        group: layNhomTuSKU(sku, skuGroups),
        totalQty: info.totalQty,
        orderCount: info.orderCount,
        orderNos: sortedNos
      };
    })
    .sort((a, b) => b.totalQty - a.totalQty || b.orderCount - a.orderCount || a.sku.localeCompare(b.sku));

  // 2. Sắp xếp toàn bộ danh sách đơn hàng đồng bộ tuyệt đối với thứ tự in:
  // - Đi theo từng nhóm SKU (SKU nhiều đứng trước)
  // - Trong từng SKU, sắp xếp mã đơn từ thấp đến cao (YD-.....-... từ thấp đến cao)
  const orderLookupMap = new Map<string, OrderAttachmentInfo>();
  processedOrders.forEach((o) => {
    if (o.orderNo) orderLookupMap.set(o.orderNo.trim().toUpperCase(), o);
    if (o.trackingNo) orderLookupMap.set(o.trackingNo.trim().toUpperCase(), o);
  });

  const sortedOrders: OrderAttachmentInfo[] = [];
  const assignedKeys = new Set<string>();

  for (const s of skuSummary) {
    const skuOrders: OrderAttachmentInfo[] = [];
    for (const no of s.orderNos) {
      const upper = (no || '').trim().toUpperCase();
      if (orderLookupMap.has(upper) && !assignedKeys.has(upper)) {
        const ord = orderLookupMap.get(upper)!;
        skuOrders.push(ord);
        if (ord.orderNo) assignedKeys.add(ord.orderNo.trim().toUpperCase());
        if (ord.trackingNo) assignedKeys.add(ord.trackingNo.trim().toUpperCase());
      }
    }
    skuOrders.sort((a, b) =>
      (a.orderNo || '').localeCompare(b.orderNo || '', undefined, { numeric: true, sensitivity: 'base' })
    );
    sortedOrders.push(...skuOrders);
  }

  // Đơn hàng còn lại chưa thuộc SKU chính (nếu có)
  const remainingOrders = processedOrders
    .filter((o) => {
      const k1 = o.orderNo && assignedKeys.has(o.orderNo.trim().toUpperCase());
      const k2 = o.trackingNo && assignedKeys.has(o.trackingNo.trim().toUpperCase());
      return !k1 && !k2;
    })
    .sort((a, b) =>
      (a.orderNo || '').localeCompare(b.orderNo || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  sortedOrders.push(...remainingOrders);

  // Xác định mã đơn nào trong danh sách tìm kiếm chưa tìm thấy
  const foundCodeSet = new Set<string>();
  for (const o of sortedOrders) {
    if (o.orderNo) foundCodeSet.add(o.orderNo.toUpperCase());
    if (o.trackingNo) foundCodeSet.add(o.trackingNo.toUpperCase());
    if (o.refNo) foundCodeSet.add(o.refNo.toUpperCase());
    if (o.pickingList) foundCodeSet.add(o.pickingList.toUpperCase());
  }
  plCodes.forEach((pl) => foundCodeSet.add(pl.toUpperCase()));

  const missingCodes = uniqueCodes.filter((c) => !foundCodeSet.has(c.toUpperCase()));
  const totalWithPdf = sortedOrders.filter((o) => o.hasAttachment).length;

  return {
    success: true,
    totalInputCodes: uniqueCodes.length,
    totalFound: sortedOrders.length,
    totalWithPdf,
    orders: sortedOrders,
    skuSummary,
    totalPcs,
    missingCodes
  };
}

function cleanAsciiText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7E]/g, ' ')
    .trim();
}

export interface MergeOrderInputItem {
  isSeparator?: boolean;
  separatorLabel?: string;
  orderNo?: string;
  trackingNo?: string;
  refNo?: string;
  carrier?: string;
  shippingMethod?: string;
  attachmentUrl?: string;
  oatId?: string;
  items?: Array<{ sku: string; qty: number; title?: string }>;
  skuGroup?: string;
}

function isShopeeOrder(order: MergeOrderInputItem): boolean {
  const carrier = (order.carrier || '').toUpperCase();
  const method = (order.shippingMethod || '').toUpperCase();
  const tracking = (order.trackingNo || '').toUpperCase();
  const refNo = (order.refNo || '').toUpperCase();

  // 1. Nhận diện qua kênh / đơn vị vận chuyển
  if (
    carrier.includes('SPX') ||
    carrier.includes('SHOPEE') ||
    carrier.includes('VNGH') ||
    method.includes('SPX') ||
    method.includes('SHOPEE') ||
    method.includes('VNGH')
  ) {
    return true;
  }

  // 2. Nhận diện qua tiền tố Tracking No
  // SPX Express luôn bắt đầu bằng SPX (ví dụ SPXVN...)
  if (tracking.startsWith('SPX')) return true;
  // GHN Shopee thường là GYM... (ví dụ GYM6PTVH, GYM6BPKF...)
  if (tracking.startsWith('GYM')) return true;

  // 3. Nhận diện qua Mã đơn sàn (Ref No)
  // Mã sàn Shopee có độ dài khoảng 14-16 ký tự và CHỨA CẢ CHỮ CÁI VÀ SỐ (ví dụ: 2610217X8NARP1, 2610204YTYBCSM)
  // Trong khi TikTok Ref No luôn là chuỗi 18 chữ số THUẦN TÚY (ví dụ: 586688019195266223)
  const isShopeeRef = /^[0-9]{4,10}[A-Z0-9]+$/.test(refNo) && /[A-Z]/.test(refNo);
  if (isShopeeRef) return true;

  // TikTok J&T
  if (tracking.startsWith('862') || /^\d{17,19}$/.test(refNo)) {
    return false;
  }

  // Đơn VN... có chứa ký tự chữ trong ref
  if (tracking.startsWith('VN') && /[A-Z]/.test(refNo)) {
    return true;
  }

  return false;
}

function drawPackingOverlayOnPage(
  page: PDFPage,
  fontBold: PDFFont,
  fontRegular: PDFFont,
  orderInfo: MergeOrderInputItem
) {
  const { width, height } = page.getSize();
  // Chỉ vẽ overlay nếu trang có chiều cao tương đối đủ (A6 chuẩn hoặc >= 320pt)
  if (height < 320) return;

  const items = Array.isArray(orderInfo.items) ? orderInfo.items : [];
  if (items.length === 0) return;

  const isShopee = isShopeeOrder(orderInfo);

  if (isShopee) {
    // ========================================================
    // PHONG CÁCH SÀN SHOPEE (SPX Express, Shopee GHN...)
    // Quy ước:
    // - Bảng nhỏ gọn, các dòng nằm gần nhau (rowH = 15 - 19pt)
    // - Nếu có 2 SKU: nhảy thụt xuống phía dưới 1 xíu (boxY = 134)
    // - Nếu có 3 SKU: tiếp tục nhảy thụt xuống (boxY = 132)
    // - Giữ nguyên không che lấp chữ mô tả sản phẩm ở trên và tiền COD ở dưới
    // ========================================================
    const shopeeX = 8;
    const shopeeW = 155; // Nhỏ gọn lại một xíu

    const numRows = Math.min(items.length, 4);
    const colHeaderH = 12;
    // Co chiều cao dòng lại cho gọn gàng, không bị thưa
    const rowH = numRows === 1 ? 15 : (numRows === 2 ? 13.5 : (numRows === 3 ? 12.5 : 12));
    const boxH = colHeaderH + (numRows * rowH);

    // Quy ước vị trí: Nếu 2-3 SKU thì nhảy thụt xuống phía dưới 1 xíu
    const boxY = numRows === 1 ? 140 : (numRows === 2 ? 135 : (numRows === 3 ? 132 : 130));
    const topY = boxY + boxH;

    // 1. Nền trắng viền đen nhỏ gọn
    page.drawRectangle({
      x: shopeeX,
      y: boxY,
      width: shopeeW,
      height: boxH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.1,
      color: rgb(1, 1, 1)
    });

    // 2. Header
    page.drawRectangle({
      x: shopeeX,
      y: topY - colHeaderH,
      width: shopeeW,
      height: colHeaderH,
      color: rgb(0.92, 0.92, 0.92)
    });

    page.drawLine({
      start: { x: shopeeX, y: topY - colHeaderH },
      end: { x: shopeeX + shopeeW, y: topY - colHeaderH },
      thickness: 0.8,
      color: rgb(0, 0, 0)
    });

    const colSttW = 16;
    const colQtyW = 32; // Đổi 'SO LUONG' thành 'SL' nên cột gọn gàng hơn, chừa nhiều đất cho MA SKU
    const colSkuX = shopeeX + colSttW;
    const colQtyX = shopeeX + shopeeW - colQtyW;

    const hQtyW = fontBold.widthOfTextAtSize('SL', 7.5);
    page.drawText('STT', { x: shopeeX + 2.5, y: topY - colHeaderH + 3.5, size: 7, font: fontBold });
    page.drawText('SKU', { x: colSkuX + 4, y: topY - colHeaderH + 3.5, size: 7.5, font: fontBold });
    page.drawText('SL', { x: colQtyX + ((colQtyW - hQtyW) / 2), y: topY - colHeaderH + 3.5, size: 7.5, font: fontBold });

    // Đường kẻ dọc phân chia 3 cột
    page.drawLine({ start: { x: colSkuX, y: boxY }, end: { x: colSkuX, y: topY }, thickness: 0.7, color: rgb(0.3, 0.3, 0.3) });
    page.drawLine({ start: { x: colQtyX, y: boxY }, end: { x: colQtyX, y: topY }, thickness: 0.7, color: rgb(0.3, 0.3, 0.3) });

    for (let i = 0; i < numRows; i++) {
      const item = items[i];
      const rTop = topY - colHeaderH - (i * rowH);
      const rMid = rTop - (rowH / 2);

      if (i > 0) {
        page.drawLine({
          start: { x: shopeeX, y: rTop },
          end: { x: shopeeX + shopeeW, y: rTop },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.75)
        });
      }

      page.drawText(String(i + 1), { x: shopeeX + 5, y: rMid - 2.5, size: 7.5, font: fontRegular });
      page.drawText(cleanAsciiText(item.sku), { x: colSkuX + 4, y: rMid - 3, size: numRows === 1 ? 9 : 8.5, font: fontBold });

      // Cột SL: Chỉ hiển thị con số thuần túy, căn giữa ô, không bôi đen, không chữ x hay PCS
      const qtyStr = String(item.qty || 1);
      const qtyFontSize = numRows === 1 ? 10 : 9.5;
      const qtyWidth = fontBold.widthOfTextAtSize(qtyStr, qtyFontSize);
      const qtyCenterX = colQtyX + ((colQtyW - qtyWidth) / 2);
      page.drawText(qtyStr, {
        x: qtyCenterX,
        y: rMid - 3,
        size: qtyFontSize,
        font: fontBold,
        color: rgb(0, 0, 0)
      });
    }

    if (items.length > 4) {
      page.drawText(`(+${items.length - 4} SKU...)`, {
        x: colSkuX + 4,
        y: boxY + 1.5,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.5, 0.1, 0.1)
      });
    }
  } else {
    // ========================================================
    // PHONG CÁCH SÀN TIKTOK SHOP / J&T EXPRESS
    // Nhãn TikTok có khoảng trắng lớn ở dưới đáy trang
    // Bảng gọn gàng, các dòng gần nhau
    // ========================================================
    const boxMargin = 8;
    const boxX = boxMargin;
    const boxW = width - (boxMargin * 2);
    const topY = Math.min(116, height * 0.28);

    const numRows = Math.min(items.length, 5);
    const colHeaderH = 12.5;
    // Co lại chiều cao dòng cho gọn gàng
    const rowH = numRows === 1 ? 16 : (numRows === 2 ? 14 : (numRows === 3 ? 13 : 12));
    const boxH = colHeaderH + (numRows * rowH);
    const boxY = topY - boxH;

    const colSttW = 20;
    const colQtyW = 42;
    const colSkuX = boxX + colSttW;
    const colQtyX = boxX + boxW - colQtyW;

    // 1. Nền trắng viền đen
    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.2,
      color: rgb(1, 1, 1)
    });

    // 2. Header Bảng Cột
    page.drawRectangle({
      x: boxX,
      y: topY - colHeaderH,
      width: boxW,
      height: colHeaderH,
      color: rgb(0.92, 0.92, 0.92)
    });

    page.drawLine({
      start: { x: boxX, y: topY - colHeaderH },
      end: { x: boxX + boxW, y: topY - colHeaderH },
      thickness: 0.8,
      color: rgb(0, 0, 0)
    });

    const hQtyWTikTok = fontBold.widthOfTextAtSize('SL', 7.5);
    page.drawText('STT', { x: boxX + 4, y: topY - colHeaderH + 3.5, size: 7.5, font: fontBold });
    page.drawText('SKU', { x: colSkuX + 6, y: topY - colHeaderH + 3.5, size: 7.5, font: fontBold });
    page.drawText('SL', { x: colQtyX + ((colQtyW - hQtyWTikTok) / 2), y: topY - colHeaderH + 3.5, size: 7.5, font: fontBold });

    // Đường kẻ dọc 3 cột
    page.drawLine({
      start: { x: colSkuX, y: boxY },
      end: { x: colSkuX, y: topY },
      thickness: 0.8,
      color: rgb(0.3, 0.3, 0.3)
    });
    page.drawLine({
      start: { x: colQtyX, y: boxY },
      end: { x: colQtyX, y: topY },
      thickness: 0.8,
      color: rgb(0.3, 0.3, 0.3)
    });

    // 3. Nội dung từng dòng SKU (các dòng gần nhau)
    for (let i = 0; i < numRows; i++) {
      const item = items[i];
      const rTop = topY - colHeaderH - (i * rowH);
      const rMid = rTop - (rowH / 2);

      if (i > 0) {
        page.drawLine({
          start: { x: boxX, y: rTop },
          end: { x: boxX + boxW, y: rTop },
          thickness: 0.5,
          color: rgb(0.75, 0.75, 0.75)
        });
      }

      page.drawText(String(i + 1), {
        x: boxX + 6,
        y: rMid - 2.5,
        size: 8,
        font: fontRegular
      });

      page.drawText(cleanAsciiText(item.sku), {
        x: colSkuX + 6,
        y: rMid - 3,
        size: numRows === 1 ? 9.5 : 8.5,
        font: fontBold
      });

      // Cột SL: Chỉ hiển thị con số thuần túy, căn giữa ô, không bôi đen, không chữ x hay PCS
      const qtyStr = String(item.qty || 1);
      const qtyFontSize = numRows === 1 ? 10.5 : 9.5;
      const qtyWidth = fontBold.widthOfTextAtSize(qtyStr, qtyFontSize);
      const qtyCenterX = colQtyX + ((colQtyW - qtyWidth) / 2);
      page.drawText(qtyStr, {
        x: qtyCenterX,
        y: rMid - 3,
        size: qtyFontSize,
        font: fontBold,
        color: rgb(0, 0, 0)
      });
    }

    if (items.length > 5) {
      page.drawText(`(+${items.length - 5} SKU khac...)`, {
        x: colSkuX + 6,
        y: boxY + 1.5,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.5, 0.1, 0.1)
      });
    }
  }
}

/**
 * Vẽ số thứ tự đơn hàng (1, 2, ..., 111) tương ứng 1-1 với cột STT trong bảng danh sách
 * Giúp nhân viên kho dễ dàng kiểm đếm, tìm thứ tự đơn hàng khi thiếu giấy hoặc mất đơn
 */
function drawPageNumberOnPage(
  page: PDFPage,
  orderSeq: number,
  fontBold: PDFFont,
  isSeparator: boolean = false
) {
  const { width, height } = page.getSize();

  if (isSeparator) {
    // Với trang phân cách giữa các SKU: in dòng thông báo rõ ràng ở giữa trang
    const sepText = `--- TRANG PHAN CACH SKU ---`;
    const sepFontSize = 11;
    const sepTextW = fontBold.widthOfTextAtSize(sepText, sepFontSize);
    page.drawText(sepText, {
      x: Math.max(10, (width - sepTextW) / 2),
      y: height / 2,
      size: sepFontSize,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2)
    });
    return;
  }

  // Vẽ số thứ tự đơn hàng thuần túy (không ô vuông, không viền, nằm ở mép ngoài lề dưới cùng bên phải)
  // Hoàn toàn không đè và không vào khung nhãn vận chuyển
  const numText = String(orderSeq);
  const fontSize = 9;
  const textWidth = fontBold.widthOfTextAtSize(numText, fontSize);

  // Đặt ở mép ngoài phía dưới góc phải: cách mép phải 6pt, mép đáy 3.5pt
  const numX = width - textWidth - 6;
  const numY = 3.5;

  page.drawText(numText, {
    x: numX,
    y: numY,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
}

/**
 * Tải các file PDF nhãn đơn hàng và gộp thành 1 file PDF duy nhất để người dùng in một lần
 * Hỗ trợ tự động vẽ overlay thông tin SKU đóng gói ở chân trang và đánh số trang in hệ thống
 */
export async function mergeOrderPdfs(
  items: Array<MergeOrderInputItem>,
  username: string = 'David',
  password: string = '12345abc',
  options?: { drawPackingOverlay?: boolean; drawPageNumbers?: boolean; pageNumberMode?: 'CONTINUOUS' | 'PER_SKU' }
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  let sessionCookie = '';

  const drawPackingOverlay = options?.drawPackingOverlay !== false;
  const drawPageNumbers = options?.drawPageNumbers !== false;
  let fontBold: PDFFont | null = null;
  let fontRegular: PDFFont | null = null;

  if (drawPackingOverlay || drawPageNumbers) {
    try {
      fontBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
      fontRegular = await mergedPdf.embedFont(StandardFonts.Helvetica);
    } catch (e) {
      console.warn('[mergeOrderPdfs] Khong the embed StandardFonts:', e);
    }
  }

  let lastPageWidth = 288;
  let lastPageHeight = 432;

  // 1. Tải trước toàn bộ file PDF song song (Continuous Queue 35 workers)
  const downloadSinglePdf = async (item: MergeOrderInputItem): Promise<Buffer | null> => {
    if (item.isSeparator) return null;
    const cacheKey = item.attachmentUrl || item.oatId || item.orderNo || '';
    if (cacheKey && pdfFileBufferCache.has(cacheKey)) {
      return pdfFileBufferCache.get(cacheKey)!;
    }

    let buf: Buffer | null = null;

    // a. Tải trực tiếp qua CDN
    if (item.attachmentUrl && item.attachmentUrl.startsWith('http')) {
      try {
        const u = new URL(item.attachmentUrl);
        const res = await httpsRequest({
          hostname: u.hostname,
          path: u.pathname + u.search,
          method: 'GET'
        });
        if (res.statusCode === 200 && res.raw && res.raw.length > 0) {
          buf = res.raw;
        }
      } catch (err: any) {}
    }

    // b. Dự phòng WMS endpoint nội bộ
    if (!buf && item.oatId) {
      try {
        if (!sessionCookie) {
          sessionCookie = await getWmsSessionCookie(username, password);
        }
        const dlPath = `/default/download/order-attached/value/${item.oatId}/type/file`;
        const res = await httpsRequest({
          hostname: 'czwh.wms.yunwms.com',
          path: dlPath,
          method: 'GET',
          headers: {
            'Cookie': sessionCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (res.statusCode === 200 && res.raw && res.raw.length > 0) {
          buf = res.raw;
        }
      } catch (err: any) {}
    }

    if (buf && cacheKey) {
      pdfFileBufferCache.set(cacheKey, buf);
    }
    return buf;
  };

  const nonSeparatorItems = items.filter((it) => !it.isSeparator);
  const CONCURRENCY = 35;
  let currentIndex = 0;
  let activeWorkers = 0;

  await new Promise<void>((resolve) => {
    if (nonSeparatorItems.length === 0) return resolve();
    function runNext() {
      if (currentIndex >= nonSeparatorItems.length && activeWorkers === 0) {
        return resolve();
      }
      while (activeWorkers < CONCURRENCY && currentIndex < nonSeparatorItems.length) {
        const it = nonSeparatorItems[currentIndex++];
        activeWorkers++;
        downloadSinglePdf(it)
          .catch(() => {})
          .finally(() => {
            activeWorkers--;
            runNext();
          });
      }
    }
    runNext();
  });

  let orderCounter = 0;
  let currentSkuGroup: string | null = null;
  const pageNumberMode = options?.pageNumberMode || 'CONTINUOUS';

  // 2. Gộp tuần tự các file PDF vào tài liệu hoàn chỉnh (xử lý bộ nhớ nhanh < 0.5s)
  for (const item of items) {
    // Nếu là phần tử phân tách giữa các nhóm SKU: Thêm đúng 2 trang trắng chuẩn kích cỡ
    if (item.isSeparator) {
      if (pageNumberMode === 'PER_SKU') {
        orderCounter = 0;
      }
      currentSkuGroup = null;

      const p1 = mergedPdf.addPage([lastPageWidth, lastPageHeight]);
      if (drawPageNumbers && fontBold) {
        drawPageNumberOnPage(p1, 0, fontBold, true);
      }

      const p2 = mergedPdf.addPage([lastPageWidth, lastPageHeight]);
      if (drawPageNumbers && fontBold) {
        drawPageNumberOnPage(p2, 0, fontBold, true);
      }
      continue;
    }

    const itemSkuGroup = item.skuGroup || (item.items && item.items[0]?.sku) || '';
    if (pageNumberMode === 'PER_SKU' && itemSkuGroup) {
      if (currentSkuGroup !== null && currentSkuGroup !== itemSkuGroup) {
        orderCounter = 0; // Đổi sang nhóm SKU mới: reset số thứ tự bắt đầu lại từ 1
      }
      currentSkuGroup = itemSkuGroup;
    }

    const cacheKey = item.attachmentUrl || item.oatId || item.orderNo || '';
    const pdfBytes = cacheKey ? pdfFileBufferCache.get(cacheKey) : null;

    if (pdfBytes) {
      try {
        const singleDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(singleDoc, singleDoc.getPageIndices());

        if (copiedPages.length > 0) {
          const sz = copiedPages[0].getSize();
          lastPageWidth = sz.width;
          lastPageHeight = sz.height + (drawPageNumbers && fontBold ? 12 : 0);
        }

        orderCounter++;
        
        copiedPages.forEach((p, pageIdx) => {
          // Vẽ overlay thông tin đóng gói lên trang đầu tiên của đơn nếu được bật
          if (drawPackingOverlay && fontBold && fontRegular && pageIdx === 0 && item.items && item.items.length > 0) {
            try {
              drawPackingOverlayOnPage(p, fontBold, fontRegular, item);
            } catch (overlayErr: any) {
              console.warn(`[mergeOrderPdfs] Lỗi vẽ overlay cho đơn ${item.orderNo}:`, overlayErr?.message);
            }
          }

          // Dịch toàn bộ nội dung nhãn lên 12pt và mở rộng lề đáy trang thêm 12pt
          // Đảm bảo số thứ tự nằm 100% ở mép ngoài lề dưới, tuyệt đối không đè vào khung nhãn
          if (drawPageNumbers && fontBold) {
            const sz = p.getSize();
            p.translateContent(0, 12);
            p.setSize(sz.width, sz.height + 12);

            try {
              drawPageNumberOnPage(p, orderCounter, fontBold, false);
            } catch (pNumErr: any) {
              console.warn(`[mergeOrderPdfs] Lỗi vẽ số thứ tự cho đơn ${item.orderNo}:`, pNumErr?.message);
            }
          }

          mergedPdf.addPage(p);
        });
      } catch (docErr: any) {
        console.warn(`[mergeOrderPdfs] Lỗi nạp PDF của đơn ${item.orderNo}:`, docErr?.message);
      }
    }
  }

  return await mergedPdf.save();
}

export interface BatchShipOrderItem {
  orderCode: string;
  trackingNo?: string;
  weight?: string | number;
}

export interface BatchShipResult {
  success: boolean;
  message: string;
  totalOrders: number;
  shippedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Ký xuất kho hàng loạt đơn hàng (chuyển sang trạng thái Shipped - E11=8) trên YunWMS
 * Sử dụng API chuẩn: /shipment/job-queue/upload-check-out & /shipment/job-queue/run-check-out
 */
export async function batchShipWmsOrders(
  orders: BatchShipOrderItem[],
  warehouse: string = '7',
  username = 'David',
  password = '12345abc'
): Promise<BatchShipResult> {
  const validOrders = (orders || []).filter(o => o && o.orderCode && o.orderCode.trim());
  if (validOrders.length === 0) {
    return {
      success: false,
      message: 'Không có đơn hàng hợp lệ để xuất kho',
      totalOrders: 0,
      shippedCount: 0,
      failedCount: 0,
      errors: ['Danh sách đơn rỗng']
    };
  }

  try {
    const sessionCookie = await getWmsSessionCookie(username, password);

    // 1. Tạo file Excel .xls chuẩn theo cấu trúc yêu cầu của YunWMS Job Queue
    const rows = [
      ['订单号/Order Code', '订单类型/Order Type', '跟踪号/Tracking Number', '签出重/Checkout Weight', '体积重/Volume Weight'],
      ...validOrders.map(item => [
        item.orderCode.trim(),
        0,
        (item.trackingNo || '').trim(),
        item.weight || '',
        ''
      ])
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Sheet1');

    const wsDoc = XLSX.utils.aoa_to_sheet([['订单类型/Order Type : 0单个订单，1退仓订单，2转仓订单，不填默认为0']]);
    XLSX.utils.book_append_sheet(wb, wsDoc, '字段说明');

    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xls' }) as Buffer;

    // 2. Tạo multipart/form-data payload
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const preFile = [
      `--${boundary}\r\nContent-Disposition: form-data; name="warehouse_id"\r\n\r\n${warehouse}\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="FileName"; filename="batch_checkout.xls"\r\nContent-Type: application/vnd.ms-excel\r\n\r\n`
    ].join('');
    const postFile = `\r\n--${boundary}--\r\n`;

    const payload = Buffer.concat([
      Buffer.from(preFile, 'utf8'),
      excelBuffer,
      Buffer.from(postFile, 'utf8')
    ]);

    // 3. Upload file lên job-queue
    const uploadRes = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: '/shipment/job-queue/upload-check-out',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/shipment/job-queue/list',
        'Content-Length': payload.length
      }
    }, payload);

    let uploadJson: any = {};
    try {
      uploadJson = JSON.parse(uploadRes.body);
    } catch {
      uploadJson = { state: 0, message: uploadRes.body };
    }

    if (!uploadJson.state && uploadJson.state !== 1) {
      return {
        success: false,
        message: uploadJson.message || 'Lỗi tải danh sách lên YunWMS',
        totalOrders: validOrders.length,
        shippedCount: 0,
        failedCount: validOrders.length,
        errors: uploadJson.error || [uploadJson.message || 'Lỗi không xác định khi upload']
      };
    }

    // 4. Kích hoạt xuất kho qua run-check-out
    const runRes = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: '/shipment/job-queue/run-check-out',
      method: 'POST',
      headers: {
        'Cookie': sessionCookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://czwh.wms.yunwms.com/shipment/job-queue/list',
        'Content-Length': 0
      }
    });

    let runJson: any = {};
    try {
      runJson = JSON.parse(runRes.body);
    } catch {
      runJson = { state: 1, message: 'Đã gửi lệnh chạy xuất kho' };
    }

    const successCount = typeof uploadJson.success === 'number' ? uploadJson.success : validOrders.length;
    const failCount = typeof uploadJson.fail === 'number' ? uploadJson.fail : 0;
    const errorList = Array.isArray(uploadJson.error) ? uploadJson.error : [];

    return {
      success: successCount > 0,
      message: `Đã chuyển Shipped thành công ${successCount}/${validOrders.length} đơn trên YunWMS.`,
      totalOrders: validOrders.length,
      shippedCount: successCount,
      failedCount: failCount,
      errors: errorList
    };
  } catch (err: any) {
    console.error('[batchShipWmsOrders] Exception:', err);
    return {
      success: false,
      message: `Lỗi kết nối YunWMS: ${err.message}`,
      totalOrders: validOrders.length,
      shippedCount: 0,
      failedCount: validOrders.length,
      errors: [err.message]
    };
  }
}


