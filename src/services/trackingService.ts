import { CarrierId, OrderItem, TrackingEvent, TrackingStatusCategory } from '../types/tracking';
import { detectCarrier, getDirectTrackingUrl } from './carrierDetector';

// Cache to prevent duplicate lookups
const trackingCache = new Map<string, Partial<OrderItem>>();

/**
 * Safely extracts the actual pickup/first-received scan timestamp from tracking timeline.
 * Explicitly ignores pre-pickup issue logs (e.g. "Kiện Vấn Đề", "Kiện khó") or creation logs.
 */
export function extractScannedAtTime(timeline: TrackingEvent[] = []): string | undefined {
  if (!timeline || timeline.length === 0) return undefined;

  // 1. Search chronologically for explicit courier/hub pickup scans
  const pickupItem = timeline.slice().reverse().find(item => {
    const txt = (item.statusText || '').toLowerCase();
    const isIssue = txt.includes('kiện vấn đề') || 
                    txt.includes('kiện khó') || 
                    txt.includes('vấn đề') || 
                    txt.includes('tạo đơn') || 
                    txt.includes('khởi tạo') ||
                    txt.includes('chuẩn bị');
    if (isIssue) return false;

    return txt.includes('đã nhận hàng') || 
           (txt.includes('nhân viên') && txt.includes('đã nhận')) ||
           txt.includes('nhận kiện hàng') || 
           txt.includes('nhập bưu cục') || 
           txt.includes('lấy hàng thành công') || 
           txt.includes('đã lấy hàng') || 
           txt.includes('tiếp nhận') || 
           txt.includes('quét mã tiếp nhận') || 
           txt.includes('picked up');
  });

  if (pickupItem) {
    return pickupItem.time;
  }

  // 2. If no explicit pickup keyword found, find the earliest event that is NOT a problem log or initial creation
  const validTransitItem = timeline.slice().reverse().find(item => {
    const txt = (item.statusText || '').toLowerCase();
    const isExcluded = txt.includes('kiện vấn đề') || 
                       txt.includes('kiện khó') || 
                       txt.includes('vấn đề') || 
                       txt.includes('tạo đơn') || 
                       txt.includes('được tạo') || 
                       txt.includes('chờ lấy') ||
                       txt.includes('chuẩn bị');
    return !isExcluded;
  });

  if (validTransitItem) {
    return validTransitItem.time;
  }

  return undefined;
}

/**
 * Robust logistics classifier that determines the correct status category and timestamp
 * based on raw status strings and timeline history.
 */
export function classifyLogisticsStatus(
  rawStatusText: string, 
  timeline: TrackingEvent[] = [],
  fallbackCategory: TrackingStatusCategory = 'not_scanned'
): { statusCategory: TrackingStatusCategory; scannedAt?: string } {
  const rawLower = (rawStatusText || '').toLowerCase().trim();
  const latestEventText = (timeline[0]?.statusText || '').toLowerCase().trim();
  const scannedTime = extractScannedAtTime(timeline);
  const hasPickup = Boolean(scannedTime);

  // 1. Cancelled
  if (
    rawLower.includes('đã hủy') ||
    rawLower.includes('hủy đơn') ||
    rawLower.includes('hủy phiếu') ||
    rawLower.includes('cancelled') ||
    rawLower.includes('từ chối nhận lúc lấy') ||
    latestEventText.includes('hủy') ||
    latestEventText.includes('cancelled')
  ) {
    return { statusCategory: 'cancelled', scannedAt: undefined };
  }

  // 2. Returned / Chuyển hoàn / Trả hàng
  if (
    rawLower.includes('chuyển hoàn') ||
    rawLower.includes('trả hàng') ||
    rawLower.includes('hoàn hàng') ||
    rawLower.includes('returning') ||
    rawLower.includes('returned') ||
    latestEventText.includes('trả hàng') ||
    latestEventText.includes('chuyển hoàn') ||
    latestEventText.includes('hoàn trả')
  ) {
    return { statusCategory: 'returned', scannedAt: scannedTime };
  }

  // 3. Delivered / Ký nhận thành công
  if (
    rawLower.includes('giao hàng thành công') ||
    rawLower.includes('giao thành công') ||
    rawLower.includes('đã giao hàng') ||
    rawLower.includes('phát thành công') ||
    rawLower.includes('đã phát') ||
    rawLower.includes('đã ký nhận') ||
    rawLower.includes('ký nhận thành công') ||
    rawLower.includes('người nhận đã nhận') ||
    rawLower.includes('khách đã nhận') ||
    rawLower.includes('delivered') ||
    latestEventText.includes('giao hàng thành công') ||
    latestEventText.includes('giao thành công') ||
    latestEventText.includes('đã ký nhận') ||
    latestEventText.includes('phát thành công') ||
    latestEventText.includes('delivered')
  ) {
    return { statusCategory: 'delivered', scannedAt: scannedTime };
  }

  // 4. Kiện vấn đề / Kiện khó
  if (
    rawLower.includes('kiện vấn đề') ||
    rawLower.includes('kiện khó') ||
    latestEventText.includes('kiện vấn đề') ||
    latestEventText.includes('kiện khó')
  ) {
    if (hasPickup) {
      return { statusCategory: 'error', scannedAt: scannedTime };
    } else {
      return { statusCategory: 'not_scanned', scannedAt: undefined };
    }
  }

  // 5. In Transit / Delivering
  if (
    rawLower.includes('đang giao') ||
    rawLower.includes('đang phát') ||
    rawLower.includes('đang vận chuyển') ||
    rawLower.includes('đang chuyển hàng') ||
    rawLower.includes('trung chuyển') ||
    rawLower.includes('luân chuyển') ||
    rawLower.includes('phân tuyến') ||
    rawLower.includes('xuất kho') ||
    rawLower.includes('nhập kho trung chuyển') ||
    rawLower.includes('in_transit') ||
    rawLower.includes('transporting') ||
    rawLower.includes('delivering') ||
    latestEventText.includes('đang giao') ||
    latestEventText.includes('đang phát') ||
    latestEventText.includes('đang vận chuyển') ||
    latestEventText.includes('trung chuyển')
  ) {
    return { statusCategory: 'in_transit', scannedAt: scannedTime };
  }

  // 6. Scanned / Picked up by courier / Hub received
  if (
    rawLower.includes('đã lấy hàng') ||
    rawLower.includes('đã lấy') ||
    rawLower.includes('đã scan') ||
    rawLower.includes('quét mã tiếp nhận') ||
    rawLower.includes('tiếp nhận') ||
    rawLower.includes('đã nhận hàng') ||
    rawLower.includes('nhân viên đã nhận') ||
    rawLower.includes('bưu tá đã nhận') ||
    rawLower.includes('bưu cục đã nhận') ||
    rawLower.includes('nhập bưu cục') ||
    rawLower.includes('picked up') ||
    rawLower.includes('storing') ||
    latestEventText.includes('đã lấy') ||
    latestEventText.includes('tiếp nhận') ||
    latestEventText.includes('đã nhận hàng') ||
    latestEventText.includes('quét mã') ||
    latestEventText.includes('bưu tá')
  ) {
    return { statusCategory: 'scanned', scannedAt: scannedTime };
  }

  // 7. Not Scanned / Ready to pick / Seller preparing
  if (
    rawLower.includes('chờ lấy') ||
    rawLower.includes('chưa scan') ||
    rawLower.includes('chưa lấy') ||
    rawLower.includes('chuẩn bị hàng') ||
    rawLower.includes('mới tạo') ||
    rawLower.includes('đã tạo') ||
    rawLower.includes('ready_to_pick') ||
    rawLower.includes('created') ||
    latestEventText.includes('chuẩn bị hàng') ||
    latestEventText.includes('chờ lấy') ||
    latestEventText.includes('được tạo')
  ) {
    return { statusCategory: 'not_scanned', scannedAt: undefined };
  }

  if (!hasPickup && fallbackCategory === 'scanned') {
    return { statusCategory: 'not_scanned', scannedAt: undefined };
  }

  return { statusCategory: fallbackCategory, scannedAt: scannedTime };
}

export function clearTrackingCache() {
  trackingCache.clear();
}

export function categorizeStatus(statusText: string): TrackingStatusCategory {
  const lower = (statusText || '').toLowerCase();

  if (
    lower.includes('hủy') || 
    lower.includes('cancel') || 
    lower.includes('huỷ') ||
    lower.includes('từ chối nhận lúc lấy') ||
    lower.includes('shop huỷ')
  ) {
    return 'cancelled';
  }

  if (
    lower.includes('thành công') || 
    lower.includes('delivered') || 
    lower.includes('đã giao') || 
    lower.includes('ký nhận') ||
    lower.includes('phát thành công')
  ) {
    return 'delivered';
  }

  if (
    lower.includes('hoàn') || 
    lower.includes('trả hàng') || 
    lower.includes('return') || 
    lower.includes('giao không thành công') ||
    lower.includes('thất bại')
  ) {
    return 'returned';
  }

  if (lower.includes('kiện vấn đề') || lower.includes('kiện khó')) {
    return 'not_scanned';
  }

  if (
    lower.includes('chưa scan') || 
    lower.includes('chờ lấy') || 
    lower.includes('chờ bưu tá') || 
    lower.includes('chờ gửi') || 
    lower.includes('mới tạo') || 
    lower.includes('chưa lấy') || 
    lower.includes('ready to ship') ||
    lower.includes('pending pickup') ||
    lower.includes('đã tạo vận đơn')
  ) {
    return 'not_scanned';
  }

  if (
    lower.includes('đang giao') || 
    lower.includes('đang phát') || 
    lower.includes('đang vận chuyển') || 
    lower.includes('luân chuyển') || 
    lower.includes('out for delivery') ||
    lower.includes('trung chuyển')
  ) {
    return 'in_transit';
  }

  if (
    lower.includes('đã scan') || 
    lower.includes('đã lấy') || 
    lower.includes('đã nhận hàng') || 
    lower.includes('nhập kho') || 
    lower.includes('quét') || 
    lower.includes('bưu tá đã lấy') || 
    lower.includes('picked up') ||
    lower.includes('đang phân loại') ||
    lower.includes('đã tiếp nhận')
  ) {
    return 'scanned';
  }

  if (
    lower.includes('không tìm thấy') || 
    lower.includes('lỗi') || 
    lower.includes('không tồn tại') || 
    lower.includes('not found')
  ) {
    return 'error';
  }

  return 'not_scanned';
}

export async function trackSingleOrder(
  code: string, 
  forcedCarrier?: CarrierId,
  customerPhone?: string,
  forceRefresh: boolean = false,
  fallbackJtPhoneSuffix: string = '8036'
): Promise<{
  carrier: CarrierId;
  statusCategory: TrackingStatusCategory;
  rawStatusText: string;
  statusDetail: string;
  scannedAt?: string;
  updatedAt?: string;
  timeline: TrackingEvent[];
  error?: string;
}> {
  const cleanCode = code.trim();
  const detected = detectCarrier(cleanCode);
  const carrier: CarrierId = detected !== 'unknown' 
    ? detected 
    : (forcedCarrier && forcedCarrier !== 'unknown' ? forcedCarrier : 'unknown');

  const effectivePhone = customerPhone?.replace(/\D/g, '').slice(-4) || fallbackJtPhoneSuffix || '8036';
  const cacheKey = `${carrier}:${cleanCode}:${effectivePhone}`;
  if (!forceRefresh && trackingCache.has(cacheKey)) {
    const cached = trackingCache.get(cacheKey)!;
    return {
      carrier: cached.carrier || carrier,
      statusCategory: cached.statusCategory || 'scanned',
      rawStatusText: cached.rawStatusText || 'Đã scan - Đang xử lý',
      statusDetail: cached.statusDetail || '',
      scannedAt: cached.scannedAt,
      timeline: cached.timeline || [],
      error: cached.error
    };
  }

  const upperCode = cleanCode.toUpperCase();

  // 1. Shopee Express (SPX) tracking
  if (
    carrier === 'spx' || 
    upperCode.startsWith('SPXVN') || 
    upperCode.startsWith('SPX') || 
    upperCode.startsWith('VNSPX') || 
    upperCode.startsWith('SPE') ||
    upperCode.startsWith('VNSP')
  ) {
    try {
      const liveRes = await fetch('/api/track/spx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode: cleanCode, force: forceRefresh })
      });

      const json = await liveRes.json();
      if (liveRes.ok && json.success && json.data) {
        const liveTimeline = json.data.timeline || [];
        const classified = classifyLogisticsStatus(json.data.rawStatusText || '', liveTimeline, json.data.statusCategory as TrackingStatusCategory);
        const liveData = {
          carrier: 'spx' as CarrierId,
          statusCategory: classified.statusCategory,
          rawStatusText: json.data.rawStatusText,
          statusDetail: json.data.statusDetail,
          scannedAt: json.data.scannedAt || classified.scannedAt,
          updatedAt: json.data.updatedAt || liveTimeline[0]?.time,
          timeline: liveTimeline,
          error: undefined
        };
        trackingCache.set(cacheKey, liveData);
        return liveData;
      } else {
        const errDetail = json.error || 'SPX: Không tìm thấy dữ liệu vận đơn trên cổng Shopee Express';
        return {
          carrier: 'spx' as CarrierId,
          statusCategory: 'error' as TrackingStatusCategory,
          rawStatusText: 'Lỗi tra cứu SPX',
          statusDetail: errDetail,
          timeline: [],
          error: errDetail
        };
      }
    } catch (err: any) {
      return {
        carrier: 'spx' as CarrierId,
        statusCategory: 'error',
        rawStatusText: 'Lỗi mạng khi gọi SPX',
        statusDetail: err.message || 'Không thể kết nối đến cổng SPX',
        timeline: [],
        error: err.message || 'Lỗi mạng'
      };
    }
  }

  // 2. Giao Hàng Nhanh (GHN) tracking
  if (
    carrier === 'ghn' || 
    upperCode.startsWith('VNGH') || 
    upperCode.startsWith('GY') || 
    upperCode.startsWith('G8') || 
    upperCode.startsWith('GHN') ||
    upperCode.startsWith('NL_') ||
    (upperCode.length === 8 && /^[A-Z0-9]{8}$/.test(upperCode) && upperCode.startsWith('G'))
  ) {
    try {
      const liveRes = await fetch('/api/track/ghn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orderCode: cleanCode, 
          cellphone: effectivePhone 
        })
      });

      const json = await liveRes.json();
      if (liveRes.ok && json.success && json.data) {
        const liveTimeline = json.data.timeline || [];
        const classified = classifyLogisticsStatus(json.data.rawStatusText || '', liveTimeline, json.data.statusCategory as TrackingStatusCategory);
        const liveData = {
          carrier: 'ghn' as CarrierId,
          statusCategory: classified.statusCategory,
          rawStatusText: json.data.rawStatusText,
          statusDetail: json.data.statusDetail,
          scannedAt: json.data.scannedAt || classified.scannedAt,
          timeline: liveTimeline,
          error: undefined
        };
        trackingCache.set(cacheKey, liveData);
        return liveData;
      } else {
        const errDetail = json.error || 'GHN: Không tìm thấy dữ liệu vận đơn';
        return {
          carrier: 'ghn' as CarrierId,
          statusCategory: 'error' as TrackingStatusCategory,
          rawStatusText: 'Lỗi kết nối GHN',
          statusDetail: errDetail,
          timeline: [],
          error: errDetail
        };
      }
    } catch (err: any) {
      return {
        carrier: 'ghn' as CarrierId,
        statusCategory: 'error',
        rawStatusText: 'Lỗi mạng khi gọi GHN',
        statusDetail: err.message || 'Không thể kết nối đến máy chủ',
        timeline: [],
        error: err.message || 'Lỗi mạng'
      };
    }
  }

  // 3. J&T Express & J&T Cargo tracking
  if (
    (carrier === 'jt' || 
    carrier === 'jt_cargo' ||
    upperCode.startsWith('JT') || 
    upperCode.startsWith('JTE') || 
    upperCode.startsWith('JNT') || 
    upperCode.startsWith('530') || 
    (/^\d{10,14}$/.test(cleanCode) && (cleanCode.startsWith('86') || cleanCode.startsWith('84') || cleanCode.startsWith('53')))) &&
    !upperCode.startsWith('SPX') &&
    !upperCode.startsWith('VNGH') &&
    !upperCode.startsWith('NIVN')
  ) {
    try {
      const liveRes = await fetch('/api/track/jnt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          billCode: cleanCode, 
          cellphone: effectivePhone
        })
      });

      const json = await liveRes.json();
      const currentCarrier: CarrierId = (carrier === 'jt_cargo' || upperCode.startsWith('53')) ? 'jt_cargo' : 'jt';
      if (liveRes.ok && json.success && json.data) {
        const liveTimeline = json.data.timeline || [];
        const classified = classifyLogisticsStatus(json.data.rawStatusText || '', liveTimeline, json.data.statusCategory as TrackingStatusCategory);
        const liveData = {
          carrier: currentCarrier,
          statusCategory: classified.statusCategory,
          rawStatusText: json.data.rawStatusText,
          statusDetail: json.data.statusDetail,
          scannedAt: json.data.scannedAt || classified.scannedAt,
          updatedAt: json.data.updatedAt || (liveTimeline[0]?.time),
          timeline: liveTimeline,
          error: undefined
        };
        trackingCache.set(cacheKey, liveData);
        return liveData;
      } else {
        const errDetail = json.error || 'J&T: Không tìm thấy thông tin vận đơn';
        return {
          carrier: currentCarrier,
          statusCategory: 'error' as TrackingStatusCategory,
          rawStatusText: 'Lỗi tra cứu J&T',
          statusDetail: errDetail,
          timeline: [],
          error: errDetail
        };
      }
    } catch (err: any) {
      return {
        carrier: (carrier === 'jt_cargo' || upperCode.startsWith('53')) ? 'jt_cargo' : 'jt',
        statusCategory: 'error',
        rawStatusText: 'Lỗi mạng khi gọi J&T',
        statusDetail: err.message || 'Không thể kết nối đến cổng J&T',
        timeline: [],
        error: err.message || 'Lỗi mạng'
      };
    }
  }

  // 4. Ninja Van tracking
  if (carrier === 'ninjavan' || upperCode.startsWith('NIVN') || upperCode.startsWith('SHP')) {
    try {
      const liveRes = await fetch('/api/track/ninjavan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingId: cleanCode })
      });

      const json = await liveRes.json();
      if (liveRes.ok && json.success && json.data) {
        const liveTimeline = json.data.timeline || [];
        const classified = classifyLogisticsStatus(json.data.rawStatusText || '', liveTimeline, json.data.statusCategory as TrackingStatusCategory);
        const liveData = {
          carrier: 'ninjavan' as CarrierId,
          statusCategory: classified.statusCategory,
          rawStatusText: json.data.rawStatusText,
          statusDetail: json.data.statusDetail,
          scannedAt: json.data.scannedAt || classified.scannedAt,
          timeline: liveTimeline,
          error: undefined
        };
        trackingCache.set(cacheKey, liveData);
        return liveData;
      } else {
        const errDetail = json.error || 'Ninja Van: Không tìm thấy dữ liệu vận đơn';
        return {
          carrier: 'ninjavan' as CarrierId,
          statusCategory: 'error' as TrackingStatusCategory,
          rawStatusText: 'Lỗi tra cứu Ninja Van',
          statusDetail: errDetail,
          timeline: [],
          error: errDetail
        };
      }
    } catch (err: any) {
      return {
        carrier: 'ninjavan' as CarrierId,
        statusCategory: 'error',
        rawStatusText: 'Lỗi mạng Ninja Van',
        statusDetail: err.message || 'Không thể kết nối',
        timeline: [],
        error: err.message || 'Lỗi mạng'
      };
    }
  }

  return {
    carrier,
    statusCategory: 'error',
    rawStatusText: 'Chưa hỗ trợ API',
    statusDetail: `Hãng vận chuyển [${carrier}] chưa có cổng API tra cứu tự động. Vui lòng bấm liên kết tra cứu trực tiếp.`,
    timeline: [],
    error: `Chưa hỗ trợ tự động hãng ${carrier}`
  };
}

export async function trackBatchOrders(
  orders: { code: string; carrier?: CarrierId; cellphone?: string }[]
): Promise<Record<string, {
  carrier: CarrierId;
  statusCategory: TrackingStatusCategory;
  rawStatusText: string;
  statusDetail: string;
  scannedAt?: string;
  updatedAt?: string;
  timeline: TrackingEvent[];
  error?: string;
}>> {
  if (orders.length === 0) return {};
  
  try {
    const res = await fetch('/api/track/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders })
    });
    
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.results) {
        const out: Record<string, any> = {};
        for (const [code, itemRes] of Object.entries<any>(json.results)) {
          const matchingOrder = orders.find(o => o.code === code);
          const detected = detectCarrier(code);
          const carrier = itemRes.data?.carrier || (detected !== 'unknown' 
            ? detected 
            : (matchingOrder?.carrier && matchingOrder.carrier !== 'unknown' ? matchingOrder.carrier : 'unknown'));

          if (itemRes.success && itemRes.data) {
            const liveTimeline = itemRes.data.timeline || [];
            const classified = classifyLogisticsStatus(itemRes.data.rawStatusText || '', liveTimeline, itemRes.data.statusCategory);
            out[code] = {
              carrier: itemRes.data.carrier || carrier,
              statusCategory: classified.statusCategory,
              rawStatusText: itemRes.data.rawStatusText,
              statusDetail: itemRes.data.statusDetail,
              scannedAt: itemRes.data.scannedAt || classified.scannedAt,
              updatedAt: itemRes.data.updatedAt || (liveTimeline[0]?.time),
              timeline: liveTimeline,
              error: undefined
            };
          } else {
            const errDetail = itemRes.error || 'Không tìm thấy dữ liệu vận đơn';
            out[code] = {
              carrier,
              statusCategory: 'error',
              rawStatusText: 'Lỗi tra cứu',
              statusDetail: errDetail,
              timeline: [],
              error: errDetail
            };
          }
        }
        return out;
      }
    }
  } catch (err: any) {
    console.warn('Batch tracking API error, falling back to individual calls', err);
  }

  // Fallback to parallel individual calls
  const out: Record<string, any> = {};
  await Promise.all(
    orders.map(async (o) => {
      try {
        const res = await trackSingleOrder(o.code, o.carrier, o.cellphone, true);
        out[o.code] = res;
      } catch (err: any) {
        out[o.code] = {
          carrier: o.carrier || 'unknown',
          statusCategory: 'error',
          rawStatusText: 'Lỗi mạng',
          statusDetail: err.message || 'Không thể kết nối',
          timeline: [],
          error: err.message
        };
      }
    })
  );
  return out;
}

export function createOrderItem(
  code: string, 
  index: number, 
  extraInfo?: any,
  forcedCarrier?: CarrierId
): OrderItem {
  const clean = code.trim();
  const detected = detectCarrier(clean);
  const carrier = detected !== 'unknown'
    ? detected
    : (forcedCarrier && forcedCarrier !== 'unknown' ? forcedCarrier : 'unknown');
  
  const phone = extraInfo?.customerPhone || extraInfo?.phone || extraInfo?.cellphone || undefined;
  const normalizedExtra = extraInfo ? {
    ...extraInfo,
    customerPhone: phone
  } : undefined;

  const directUrl = getDirectTrackingUrl(carrier, clean, phone);

  return {
    id: `order-${index}-${clean}`,
    trackingCode: clean,
    carrier,
    statusCategory: 'not_scanned',
    rawStatusText: 'Chưa kiểm tra',
    statusDetail: 'Sẵn sàng quét',
    timeline: [],
    isChecking: false,
    directUrl,
    originalRowIndex: index,
    extraInfo: normalizedExtra
  };
}
