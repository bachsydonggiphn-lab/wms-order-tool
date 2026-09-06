/**
 * WMS YunWMS Service: Tự động đăng nhập, duy trì Cookie phiên và kéo dữ liệu đơn hàng
 * Hỗ trợ các trạng thái: Submitted (E11=4), Shipped (E11=8) và các kho VN02 (E4=7), VN01 (E4=4)
 */

import https from 'https';
import { RawOrderRow, SkuGroupsMap } from '../types';
import { DEFAULT_SKU_GROUPS } from '../utils/skuData';
import { parseRawOrderRows } from '../utils/orderProcessor';

export interface WmsFetchOptions {
  username?: string;
  password?: string;
  warehouse?: string; // '7' = VN02 HCM, '4' = VN01 Hai Ngoai, '' = All
  status?: string;    // '4' = Submitted., '8' = Shipped, '' = All
  pageSize?: number;  // 300 - 1000
  maxPages?: number;  // 0 = All pages
  skuGroups?: SkuGroupsMap;
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
    req.setTimeout(30000, () => {
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
      order.E14 ? `Creation Time: ${order.E14}` : '',
    ].filter(Boolean).join('\n');

    const rawPickingText = pickingList ? `Picking List No.: ${pickingList}` : '';

    return {
      rawOrderText,
      rawPieceText,
      rawPickingText,
      orderNo,
      trackingNo,
      pickingList,
    };
  });

  return parseRawOrderRows(intermediateList, skuGroups);
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
    maxPages = 0,    // 0 = kéo hết các trang
    skuGroups = DEFAULT_SKU_GROUPS
  } = options;

  let sessionCookie = await getWmsSessionCookie(username, password);

  // Chuẩn bị tham số lọc
  const params: string[] = [];
  if (warehouse) params.push(`E4=${encodeURIComponent(warehouse)}`);
  if (status) params.push(`E11=${encodeURIComponent(status)}`);
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
  let pagesToFetch = maxPages > 0 ? Math.min(maxPages, totalPages) : totalPages;

  // Bảo vệ thông minh tránh timeout và quá tải bộ nhớ:
  // Với trạng thái Shipped (E11 = 8) có tới >150.000 đơn lịch sử, nếu người dùng không chỉ định maxPages thì tự động lấy tối đa 2 trang (1.000 đơn mới nhất)
  if (status === '8' && (!maxPages || maxPages === 0)) {
    pagesToFetch = Math.min(totalPages, 2);
  } else if (!maxPages || maxPages === 0) {
    // Với các trạng thái khác, nếu số trang > 10, chỉ lấy tối đa 10 trang (5.000 đơn)
    pagesToFetch = Math.min(totalPages, 10);
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

  return {
    success: true,
    totalOrders,
    returnedOrders: parsedRows.length,
    orders: parsedRows,
    warehouse,
    status,
    message: `Đã kết nối và lấy thành công ${parsedRows.length}/${totalOrders} đơn từ YunWMS.`
  };
}

/**
 * Bắt đơn mới thời gian thực (Polling siêu tốc):
 * Chỉ lấy trang 1 (50 đơn mới nhất), so sánh với các đơn đã có trong hệ thống và trả về đơn mới xuất hiện
 */
export async function pollLatestWmsOrders(
  knownOrderNos: string[] = [],
  options: {
    warehouse?: string;
    status?: string;
    username?: string;
    password?: string;
    skuGroups?: SkuGroupsMap;
  } = {}
): Promise<{
  success: boolean;
  totalOrders: number;
  newOrders: RawOrderRow[];
  hasNew: boolean;
  latestOrderNo?: string;
}> {
  const {
    warehouse = '7',
    status = '4',
    username = 'David',
    password = '12345abc',
    skuGroups = DEFAULT_SKU_GROUPS
  } = options;

  let sessionCookie = await getWmsSessionCookie(username, password);

  const params: string[] = [];
  if (warehouse) params.push(`E4=${encodeURIComponent(warehouse)}`);
  if (status) params.push(`E11=${encodeURIComponent(status)}`);
  const postData = params.join('&');

  const fetchPage1 = async (currentCookie: string) => {
    const res = await httpsRequest({
      hostname: 'czwh.wms.yunwms.com',
      path: '/order/orders/list/page/1/pageSize/50',
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

    const json = JSON.parse(res.body);
    if (json.state === 0 && (json.reLogin === 1 || (json.message && json.message.includes('登录')))) {
      const freshCookie = await getWmsSessionCookie(username, password, true);
      return fetchPage1(freshCookie);
    }
    return json;
  };

  const json = await fetchPage1(sessionCookie);
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

  return {
    success: true,
    totalOrders,
    newOrders: newParsedRows,
    hasNew: newParsedRows.length > 0,
    latestOrderNo
  };
}

