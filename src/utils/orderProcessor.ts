import * as XLSX from 'xlsx';
import {
  RawOrderRow,
  OrderItem,
  SkuGroupsMap,
  SkuCountResult,
  PcsGroupResult,
  AreaGroupResult,
  YogaClassificationResult,
  SinglePcsAreaResult,
  MixOrderAnalysisResult,
  SkuInMixSummary,
  CarrierCode,
  CarrierDetails,
  SkuPackingBreakdownResult,
  SkuPackingItem,
  SkuPackingPcsMode,
  SkuPackingSortMode,
} from '../types';
import { DEFAULT_AREA_ORDER, DEFAULT_SKU_GROUPS } from './skuData';

/**
 * Cấu hình thông tin chi tiết các Đơn Vị Vận Chuyển (Carrier)
 * - 862... là J&T Express
 * - SPX / SPXVN... là Shopee Express
 * - GY / GHN... là Giao Hàng Nhanh
 * - Khác / Chưa xác định
 */
export const CARRIER_CONFIG: Record<
  | 'JNT'
  | 'JT_CARGO'
  | 'SPX'
  | 'GHN'
  | 'GHN_TIKTOK'
  | 'NINJAVAN'
  | 'VIETTELPOST'
  | 'VNPOST'
  | 'BEST'
  | 'OTHER',
  CarrierDetails
> = {
  SPX: {
    code: 'SPX',
    name: 'Shopee Express (SPX)',
    shortName: 'SPX',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    iconColor: 'text-orange-600',
    description: 'Mã vận đơn bắt đầu bằng SPX / SPXVN / SPE (Shopee Express)',
  },
  JNT: {
    code: 'JNT',
    name: 'J&T Express (Tiêu Chuẩn)',
    shortName: 'J&T Express',
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-200',
    iconColor: 'text-red-600',
    description: 'Mã 12 số bắt đầu bằng 8... (8623..., 84..., 83...), JT..., JNT...',
  },
  JT_CARGO: {
    code: 'JT_CARGO',
    name: 'J&T Cargo (Hàng Nặng)',
    shortName: 'J&T Cargo',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-300',
    iconColor: 'text-rose-700',
    description: 'Mã 12 số bắt đầu bằng 530... hoặc 53... (hàng cồng kềnh)',
  },
  GHN: {
    code: 'GHN',
    name: 'Giao Hàng Nhanh (GHN)',
    shortName: 'GHN',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    iconColor: 'text-blue-600',
    description: 'Mã GY..., GHN..., NL_... hoặc mã TMĐT 8 ký tự (GYY..., GY8...)',
  },
  GHN_TIKTOK: {
    code: 'GHN_TIKTOK',
    name: 'GHN TikTok (VNGH...)',
    shortName: 'GHN TikTok',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    badgeBorder: 'border-cyan-200',
    iconColor: 'text-cyan-600',
    description: 'Mã vận đơn bắt đầu bằng VNGH (Giao Hàng Nhanh trên TikTok Shop)',
  },
  NINJAVAN: {
    code: 'NINJAVAN',
    name: 'Ninja Van',
    shortName: 'Ninja Van',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    iconColor: 'text-purple-600',
    description: 'Mã NIVN..., NLVN..., NV..., hoặc mã Shopee SHP... dài > 10 ký tự',
  },
  VIETTELPOST: {
    code: 'VIETTELPOST',
    name: 'Viettel Post (VTP)',
    shortName: 'Viettel Post',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    iconColor: 'text-emerald-600',
    description: 'Mã SHOPEEVTP..., VT..., VTP... hoặc mã số 9–11 chữ số',
  },
  VNPOST: {
    code: 'VNPOST',
    name: 'Bưu điện Việt Nam (VNPost / EMS)',
    shortName: 'VNPost / EMS',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    iconColor: 'text-amber-600',
    description: 'Chuẩn UPU 13 ký tự (EA...VN, EB...VN, CO...VN), EMS..., VNPOST...',
  },
  BEST: {
    code: 'BEST',
    name: 'Best Express',
    shortName: 'Best Express',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    iconColor: 'text-sky-600',
    description: 'Mã 12 chữ số bắt đầu bằng 61... hoặc tiền tố BEST...',
  },
  OTHER: {
    code: 'OTHER',
    name: 'Khác / Chưa xác định',
    shortName: 'Khác',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    iconColor: 'text-slate-600',
    description: 'Đơn vị vận chuyển khác hoặc chưa có mã',
  },
};

/**
 * Tự động phân loại Đơn Vị Vận Chuyển dựa trên Tracking No và Raw Text
 * Phân loại chính xác 8 hãng vận chuyển theo chuẩn kho vận:
 * 1. Shopee Express (SPX): SPXVN..., SPX..., VNSPX..., SPE...
 * 2. J&T Express (Tiêu Chuẩn): 8... (12 số như 8623..., 84...), JT..., JNT...
 * 3. J&T Cargo (Hàng Nặng): 530..., 53... (12 số)
 * 4. Giao Hàng Nhanh (GHN): GY..., GHN..., NL_..., 8 ký tự alphanumeric
 * 5. GHN TikTok: VNGH...
 * 6. Ninja Van: NIVN..., NLVN..., NV..., SHP... (>10 ký tự)
 * 7. Viettel Post: SHOPEEVTP..., VT..., VTP..., 9-11 số
 * 8. Vietnam Post (VNPost / EMS): EA...VN, EB...VN, CO...VN, EMS..., VNPOST...
 * 9. Best Express: 61..., 81..., BEST...
 * 10. Khác: Chưa rõ
 */
export function xacDinhDonViVanChuyen(
  trackingNo: string | null | undefined,
  rawText?: string | null | undefined
): { carrier: CarrierCode; carrierName: string } {
  const tracking = (trackingNo || '').trim().toUpperCase();
  const raw = (rawText || '').toUpperCase();

  // 1. Viettel Post (VTP): SHOPEEVTP..., VT..., VTP... hoặc mã số 9–11 chữ số
  if (
    tracking.startsWith('SHOPEEVTP') ||
    tracking.startsWith('VTP') ||
    tracking.startsWith('VT') ||
    (tracking.startsWith('VN') && tracking.length >= 14 && /^[A-Z0-9]+$/.test(tracking) && !tracking.endsWith('VN')) ||
    (/^\d{9,11}$/.test(tracking)) ||
    raw.includes('VIETTEL') ||
    raw.includes('VTP')
  ) {
    return { carrier: 'VIETTELPOST', carrierName: CARRIER_CONFIG.VIETTELPOST.name };
  }

  // 2. Vietnam Post (VNPost / EMS): Chuẩn UPU 13 ký tự (EA...VN, EB...VN, CO...VN), EMS..., VNPOST...
  if (
    tracking.startsWith('EA') ||
    tracking.startsWith('EB') ||
    tracking.startsWith('CO') ||
    tracking.startsWith('EMS') ||
    tracking.startsWith('VNPOST') ||
    tracking.startsWith('VNP') ||
    /^[ECR][A-Z0-9]{8,11}VN$/i.test(tracking) ||
    raw.includes('VNPOST') ||
    raw.includes('VIETNAMPOST') ||
    raw.includes('VIETNAM POST') ||
    raw.includes('VNPORT') ||
    raw.includes('BƯU ĐIỆN') ||
    raw.includes('BUU DIEN')
  ) {
    return { carrier: 'VNPOST', carrierName: CARRIER_CONFIG.VNPOST.name };
  }

  // 3. Ninja Van: NIVN..., NLVN..., NV..., hoặc mã Shopee SHP... (dài > 10 ký tự)
  if (
    tracking.startsWith('NIVN') ||
    tracking.startsWith('NLVN') ||
    tracking.startsWith('NV') ||
    (tracking.startsWith('SHP') && tracking.length > 10) ||
    raw.includes('NINJA') ||
    raw.includes('NIVN')
  ) {
    return { carrier: 'NINJAVAN', carrierName: CARRIER_CONFIG.NINJAVAN.name };
  }

  // 4. Best Express: Mã 12 chữ số bắt đầu bằng 61... hoặc tiền tố BEST...
  if (
    tracking.startsWith('BEST') ||
    ((tracking.startsWith('61') || tracking.startsWith('81')) && tracking.length === 12 && /^\d+$/.test(tracking)) ||
    raw.includes('BEST')
  ) {
    return { carrier: 'BEST', carrierName: CARRIER_CONFIG.BEST.name };
  }

  // 5. GHN TikTok: Bắt đầu bằng VNGH... hoặc từ khóa GHN TIKTOK (tách riêng phục vụ đơn TikTok Shop)
  if (
    tracking.startsWith('VNGH') ||
    raw.includes('VNGH') ||
    raw.includes('GHN TIKTOK') ||
    raw.includes('TIKTOK GHN') ||
    (raw.includes('TIKTOK') && (raw.includes('GHN') || tracking.startsWith('GY')))
  ) {
    return { carrier: 'GHN_TIKTOK', carrierName: CARRIER_CONFIG.GHN_TIKTOK.name };
  }

  // 6. Shopee Express (SPX): SPXVN..., SPX..., VNSPX..., SPE...
  if (
    tracking.startsWith('SPXVN') ||
    tracking.startsWith('SPX') ||
    tracking.startsWith('VNSPX') ||
    tracking.startsWith('SPE') ||
    tracking.startsWith('VNSP') ||
    raw.includes('SPXVN') ||
    raw.includes('SPX_') ||
    raw.includes('SHOPEE EXPRESS') ||
    raw.includes('SHOPEE_EXPRESS')
  ) {
    return { carrier: 'SPX', carrierName: CARRIER_CONFIG.SPX.name };
  }

  // 7. J&T Cargo (Hàng Nặng): Mã 12 số bắt đầu bằng 530... hoặc 53...
  if (
    tracking.startsWith('530') ||
    (tracking.startsWith('53') && tracking.length === 12 && /^\d+$/.test(tracking)) ||
    raw.includes('J&T CARGO') ||
    raw.includes('CARGO')
  ) {
    return { carrier: 'JT_CARGO', carrierName: CARRIER_CONFIG.JT_CARGO.name };
  }

  // 8. J&T Express (Tiêu Chuẩn): Mã 12 số bắt đầu bằng 8... (8623..., 84..., 83...), JT..., JNT...
  if (
    tracking.startsWith('862') ||
    (tracking.startsWith('8') && tracking.length === 12 && /^\d+$/.test(tracking)) ||
    tracking.startsWith('JT') ||
    tracking.startsWith('JNT') ||
    tracking.startsWith('JTE') ||
    raw.includes('8622') ||
    (raw.includes('862') && /Tracking\s*No\.?\s*[:：]\s*862/i.test(rawText || '')) ||
    raw.includes('JNT') ||
    raw.includes('J&T') ||
    raw.includes('JT_') ||
    raw.includes('JNT_') ||
    raw.includes('J&T EXPRESS') ||
    raw.includes('JT EXPRESS') ||
    raw.includes('JTTH_')
  ) {
    return { carrier: 'JNT', carrierName: CARRIER_CONFIG.JNT.name };
  }

  // 9. Giao Hàng Nhanh (GHN): GY..., GHN..., NL_..., mã 8 ký tự alphanumeric (GYY..., GY8...)
  if (
    tracking.startsWith('GY') ||
    tracking.startsWith('GHN') ||
    tracking.startsWith('NL_') ||
    (tracking.length === 8 && /^[A-Z0-9]{8}$/.test(tracking)) ||
    raw.includes('GY8D') ||
    raw.includes('GHN') ||
    raw.includes('GY_') ||
    raw.includes('GHN_') ||
    raw.includes('GIAO HANG NHANH') ||
    raw.includes('GIAOHANGNHANH') ||
    raw.includes('GIAO HÀNG NHANH')
  ) {
    return { carrier: 'GHN', carrierName: CARRIER_CONFIG.GHN.name };
  }

  // 10. Fallback heuristics: nếu 12 chữ số thuần chưa gán
  if (/^\d{12}$/.test(tracking)) {
    if (tracking.startsWith('53')) return { carrier: 'JT_CARGO', carrierName: CARRIER_CONFIG.JT_CARGO.name };
    return { carrier: 'JNT', carrierName: CARRIER_CONFIG.JNT.name };
  }

  // 11. Fallback channel hints
  if (raw.includes('SPX')) return { carrier: 'SPX', carrierName: CARRIER_CONFIG.SPX.name };
  if (raw.includes('J&T') || raw.includes('JNT')) return { carrier: 'JNT', carrierName: CARRIER_CONFIG.JNT.name };

  // 12. Khác / Chưa xác định
  return { carrier: 'OTHER', carrierName: CARRIER_CONFIG.OTHER.name };
}

/**
 * Trích xuất Picking List No. từ chuỗi nhiều dòng hoặc chuỗi đơn
 */
export function layMaPickingList(giaTri: string | null | undefined): string {
  if (!giaTri || typeof giaTri !== 'string') return '';
  
  // 1. Tìm theo nhãn Picking List No.
  const matchLabel = giaTri.match(/Picking\s*List\s*(?:No\.?)?\s*[:：]?\s*([A-Za-z0-9-_]+)/i);
  if (matchLabel && matchLabel[1] && !matchLabel[1].toLowerCase().includes('order')) {
    return matchLabel[1].trim();
  }

  // 2. Tìm mã có dạng PL... (VD: PL72608160034, PL2026-0815)
  const matchPl = giaTri.match(/\b(PL\d{6,}[A-Za-z0-9-_]*)\b/i);
  if (matchPl && matchPl[1]) {
    return matchPl[1].trim();
  }

  // 3. Nếu chuỗi đơn là mã trực tiếp (không chứa từ khoá lạ)
  const trimmed = giaTri.trim();
  if (trimmed.length >= 3 && !trimmed.includes('\n') && !trimmed.toLowerCase().includes('order') && !trimmed.toLowerCase().includes('type')) {
    return trimmed;
  }
  return '';
}

/**
 * Trích xuất Order No. từ chuỗi text
 */
export function layMaOrderNo(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  
  // 1. Ưu tiên tìm nhãn "Order No.：" hoặc "Order No:"
  const match = text.match(/Order\s*No\.?\s*[:：]\s*([A-Za-z0-9-_]+)/i);
  if (match && match[1]) return match[1].trim();

  // 2. Tìm theo nhãn Public platform order number
  const matchPublic = text.match(/Public\s*platform\s*order\s*number\s*[:：]\s*([A-Za-z0-9-_]+)/i);
  if (matchPublic && matchPublic[1]) return matchPublic[1].trim();

  // 3. Tìm mã đơn có tiền tố YD- kèm ngày tháng (VD: YD-260816-1996, YD-260815-4750)
  const matchYdOrder = text.match(/\b(YD-\d{4,8}-\d{2,8})\b/i);
  if (matchYdOrder && matchYdOrder[1]) return matchYdOrder[1].trim();

  // 4. Fallback: nếu chuỗi chỉ gồm 1 mã đơn (vd: "ORD-99882" hoặc chữ+số dài)
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    const subMatch = line.match(/^([A-Za-z0-9-_]{4,})$/);
    if (subMatch && !line.includes('*') && !line.includes(':') && !/^\d{1,3}$/.test(line)) {
      return subMatch[1].trim();
    }
  }
  return '';
}

/**
 * Trích xuất Tracking No. từ chuỗi text
 */
export function layMaTrackingNo(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') return '';
  
  // 1. Theo nhãn Tracking No
  const match = text.match(/Tracking\s*No\.?\s*[:：]\s*([A-Za-z0-9-_]+)/i);
  if (match && match[1]) return match[1].trim();

  // 2. Tìm theo format mã vận đơn J&T (862...)
  const matchJnt = text.match(/\b(862\d{7,}[A-Za-z0-9]*)\b/i);
  if (matchJnt && matchJnt[1]) return matchJnt[1].trim();

  // 3. Tìm theo format mã vận đơn SPX (SPXVN...)
  const matchSpx = text.match(/\b(SPXVN\d{6,}[A-Za-z0-9]*)\b/i);
  if (matchSpx && matchSpx[1]) return matchSpx[1].trim();

  // 4. Tìm theo format mã vận đơn GHN TikTok (VNGH...)
  const matchVngh = text.match(/\b(VNGH\d{6,}[A-Za-z0-9]*)\b/i) || text.match(/\b(VNGH[A-Za-z0-9]{5,})\b/i);
  if (matchVngh && matchVngh[1]) return matchVngh[1].trim();

  // 5. Tìm theo format mã vận đơn GHN chuẩn (GY... / GHN...)
  const matchGy = text.match(/\b(GY[A-Za-z0-9]{5,})\b/i);
  if (matchGy && matchGy[1]) return matchGy[1].trim();

  const matchGhn = text.match(/\b(GHN[A-Za-z0-9]{5,})\b/i);
  if (matchGhn && matchGhn[1]) return matchGhn[1].trim();

  // 6. Tìm theo format LEXTH (Lazada Express)
  const matchLex = text.match(/\b(LEXTH[A-Za-z0-9_-]+)\b/i);
  if (matchLex && matchLex[1]) return matchLex[1].trim();

  return '';
}

/**
 * Bộ lọc chuẩn: lọc theo Picking List và Đơn vị vận chuyển (Carrier)
 */
export function locDonHang(
  orders: RawOrderRow[],
  pickingListFilter?: string,
  carrierFilter?: CarrierCode | string
): RawOrderRow[] {
  return orders.filter(order => {
    if (pickingListFilter && pickingListFilter.trim() !== '') {
      if (order.pickingList !== pickingListFilter.trim()) return false;
    }
    if (carrierFilter && carrierFilter !== 'ALL') {
      const effCarrier = xacDinhDonViVanChuyen(order.trackingNo, order.rawOrderText).carrier;
      if (effCarrier !== carrierFilter) return false;
    }
    return true;
  });
}

const INVALID_SKU_WORDS = new Set([
  'submitted', 'creation', 'time', 'zone', 'recipient', 'provider', 'channel',
  'logistics', 'product', 'general', 'multiple', 'items', 'order', 'picking',
  'type', 'refno', 'ref', 'reference', 'tracking', 'public', 'platform', 'return', 'mail', 'warehouse',
  'customer', 'code', 'status', 'date', 'operation', 'piece', 'count', 'details',
  'more', 'one', 'vn02', 'lexth', 'spxvn', 'submitted.', 'vn', 'number', 'packages',
  'shelved', 'intercept', 'requested', 'delete', 'package'
]);

/**
 * Kiểm tra xem một chuỗi có phải là metadata WMS / hệ thống (RefNo, OrderNo, Tracking...) hay không
 */
export function isMetadataText(text: string): boolean {
  if (!text) return true;
  const clean = text.trim();
  const lower = clean.toLowerCase();
  
  // 1. Kiểm tra từ khóa metadata WMS
  if (
    lower.includes('refno') ||
    lower.includes('ref no') ||
    lower.includes('ref.') ||
    lower.includes('ref：') ||
    lower.includes('ref:') ||
    lower.includes('reference') ||
    lower.includes('order no') ||
    lower.includes('order number') ||
    lower.includes('tracking no') ||
    lower.includes('tracking number') ||
    lower.includes('public platform') ||
    lower.includes('return mail') ||
    lower.includes('picking list') ||
    lower.includes('picking type') ||
    lower.includes('order type') ||
    lower.includes('provider channel') ||
    lower.includes('logistics product') ||
    lower.includes('recipient') ||
    lower.includes('creation time') ||
    lower.includes('time zone') ||
    lower.includes('print time') ||
    lower.includes('packing time') ||
    lower.includes('shipping time') ||
    lower.includes('product details') ||
    lower.includes('piece count') ||
    lower.includes('number of packages') ||
    lower.includes('shelved') ||
    lower.includes('intercept') ||
    lower.includes('warehouse') ||
    lower.includes('customer code') ||
    lower.includes('status') ||
    lower.includes('delete') ||
    lower.includes('more') ||
    lower.includes('shipped') ||
    lower.includes('general') ||
    lower.includes('multiple items') ||
    lower.includes('one item per order')
  ) {
    return true;
  }

  // 2. Kiểm tra định dạng ngày giờ WMS (VD: "26-08-16 09:53", "2026-08-16")
  if (/^\d{2,4}-\d{2}-\d{2}/.test(clean)) return true;

  // 3. Chuỗi bắt đầu bằng 4 chữ số trở lên (100% là RefNo, mã đơn sàn, ngày tháng: 260816..., 58557..., 8822...)
  if (/^\d{4,}/.test(clean)) return true;

  return false;
}

/**
 * Kiểm tra tính hợp lệ của mã SKU (loại bỏ tuyệt đối RefNo, Tracking, OrderNo, rác hệ thống)
 */
export function isValidSkuName(sku: string): boolean {
  if (!sku || typeof sku !== 'string') return false;
  const clean = sku.trim();
  if (clean.length < 2 || clean.length > 35) return false;

  const lower = clean.toLowerCase();

  // 1. Không chứa từ khóa metadata WMS hoặc từ cấm
  if (isMetadataText(clean) || INVALID_SKU_WORDS.has(lower)) return false;

  // 2. Không chứa ký tự phân cách như dấu hai chấm, tab, bằng
  if (clean.includes(':') || clean.includes('：') || clean.includes('\t') || clean.includes('=')) return false;

  // 3. TUYỆT ĐỐI KHÔNG BẮT ĐẦU BẰNG SỐ (Mã RefNo 260816..., 58557..., 8822...)
  if (/^\d{3,}/.test(clean)) return false;

  // 4. TUYỆT ĐỐI KHÔNG PHẢI MÃ ĐƠN YD-260816-0852
  if (/^YD-\d{4,8}-\d+$/i.test(clean)) return false;

  // 5. TUYỆT ĐỐI KHÔNG PHẢI MÃ REFNO HOẶC TRACKING / PICKING LIST DÀI
  if (/^(SPXVN|PL72|LEXTH|GY8D|VN02|REFNO|PL\d{6,})/i.test(clean)) return false;

  // 6. Không phải số nguyên thuần túy
  if (/^\d+$/.test(clean)) return false;

  // 7. Phải có ít nhất 1 chữ cái
  if (!/[A-Za-z]/.test(clean)) return false;

  return true;
}

/**
 * Parse danh sách SKU và số lượng từ text ô Product Details / PCS (vd: "YD-D107-1*2\nYD-K01-1*1")
 */
export function parsePieceText(piece: string | null | undefined): OrderItem[] {
  if (!piece || typeof piece !== 'string') return [];
  const lines = piece.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
  const items: OrderItem[] = [];

  for (const line of lines) {
    if (!line) continue;
    
    // Bỏ qua tuyệt đối các dòng metadata WMS (RefNo, Tracking, Order No...)
    if (isMetadataText(line)) {
      continue;
    }

    // Format 1: SKU*Qty hoặc SKU * Qty (VD: "YD-D107-3*2", "YD-W161-6*1", "YD-W28-2*20")
    // Lưu ý: Chỉ chấp nhận dấu '*' làm ký tự nhân, hoặc 'x/X' khi SKU hợp lệ
    const matchAsterisk = line.match(/^(.+?)\s*\*\s*(\d+)$/);
    const matchX = line.match(/^([A-Za-z][A-Za-z0-9-_/.]*)\s*[xX]\s*(\d+)$/);
    const match = matchAsterisk || matchX;

    if (match) {
      const sku = match[1].trim();
      const qty = parseInt(match[2], 10);
      if (isValidSkuName(sku) && !isNaN(qty) && qty > 0) {
        items.push({ sku, qty });
      }
    } else {
      // Format 2: Nếu chỉ có mã SKU không có dấu * (mặc định qty = 1)
      const cleanSku = line.trim();
      if (isValidSkuName(cleanSku)) {
        items.push({ sku: cleanSku, qty: 1 });
      }
    }
  }
  return items;
}

/**
 * Trích xuất tiền tố nhóm (Area Prefix) hoàn toàn tự động từ mã SKU
 * Tự động phân tích cấu trúc mã mà không cần fix cứng:
 *  - "YD-A2-1*1" -> "YD-A2"
 *  - "YD-AB-12" -> "YD-AB"
 *  - "YD-AB12-1" -> "YD-AB"
 *  - "YD-HMS41-1" -> "YD-HMS"
 *  - "YD-HMC96-GN" -> "YD-HMC"
 *  - "YD-HM1025-B" -> "YD-HM"
 *  - "YD-SD12-1" -> "YD-SD"
 *  - "YD-W161-2" -> "YD-W"
 *  - "YD-D114-2" -> "YD-D"
 *  - "YD-A12-1" -> "YD-A"
 *  - "AA-123-1" -> "AA"
 *  - "BB-456" -> "BB"
 *  - "CC-789-2" -> "CC"
 */
export function trichXuatTienToSKU(sku: string): string {
  if (!sku || typeof sku !== 'string') return 'KHAC';
  const cleanSku = sku.trim().toUpperCase();
  if (isMetadataText(cleanSku) || INVALID_SKU_WORDS.has(cleanSku.toLowerCase())) return 'KHAC';
  if (/^YD-\d{4,8}-\d+$/i.test(cleanSku)) return 'KHAC';
  if (/^\d{6,}[A-Za-z0-9]*$/i.test(cleanSku)) return 'KHAC';

  // 1. Nếu bắt đầu bằng tiền tố "YD-"
  if (cleanSku.startsWith('YD-')) {
    const afterYD = cleanSku.slice(3); // Chuỗi sau "YD-"

    // Trường hợp 1a: Phân tách bởi dấu gạch nối (VD: "YD-A2-1", "YD-AB-12", "YD-HMS-41", "YD-A-1")
    const hyphenMatch = afterYD.match(/^([A-Z0-9]{1,8})(?=-)/);
    if (hyphenMatch && hyphenMatch[1]) {
      const segment = hyphenMatch[1];
      
      // Kiểm tra nếu segment có dạng chữ + số (VD: "A2", "AB12", "W75", "D114")
      const letterDigitMatch = segment.match(/^([A-Z]+)(\d+)$/);
      if (letterDigitMatch) {
        const letters = letterDigitMatch[1];
        const digits = letterDigitMatch[2];
        
        // Nếu số chỉ có 1 chữ số (VD: A1, A2, B1, B2...) -> Đây là định danh nhóm con riêng (VD: YD-A2, YD-B1)
        if (digits.length === 1 && letters.length <= 2) {
          return `YD-${segment}`;
        }
        // Nếu số từ 2 chữ số trở lên (VD: W75, D114, HM1025, AB12) -> Phần chữ chính là nhóm (VD: YD-W, YD-D, YD-HM, YD-AB)
        return `YD-${letters}`;
      }
      
      // Nếu segment thuần chữ (VD: "AB", "HMS", "HMC", "SD", "A", "W") -> Nhóm là YD-AB, YD-HMS,...
      return `YD-${segment}`;
    }

    // Trường hợp 1b: Chữ và số viết liền không có dấu gạch nối giữa nhóm và mã sản phẩm (VD: "YD-HMC96-GN", "YD-HMS41-1", "YD-HM1025-B", "YD-AB12-1", "YD-W75-1")
    const letterMatch = afterYD.match(/^([A-Z]+)(?=\d)/);
    if (letterMatch && letterMatch[1]) {
      return `YD-${letterMatch[1]}`;
    }

    // Trường hợp 1c: Chữ + 1 chữ số dính liền đầu tiên (VD: "YD-A212-1" -> "YD-A2")
    const subGroupMatch = afterYD.match(/^([A-Z]{1,2}\d)(?=\d{2,}|-)/);
    if (subGroupMatch && subGroupMatch[1]) {
      return `YD-${subGroupMatch[1]}`;
    }

    // Trường hợp 1d: Lấy toàn bộ phần ký tự chữ/số đầu
    const fallbackMatch = afterYD.match(/^([A-Z0-9]+)/);
    if (fallbackMatch && fallbackMatch[1]) {
      return `YD-${fallbackMatch[1]}`;
    }
  }

  // 2. Nhóm không bắt đầu bằng "YD-" (VD: "AA-12-1", "BB-45-1", "CC-78-1", "AA12-1", "BB456", "CC789")
  // 2a: Có dấu gạch nối (VD: "AA-12-1", "BB-456", "CC-789-2", "A2-10")
  const nonYdHyphen = cleanSku.match(/^([A-Z0-9]{1,8})(?=-)/);
  if (nonYdHyphen && nonYdHyphen[1]) {
    const seg = nonYdHyphen[1];
    const ldMatch = seg.match(/^([A-Z]+)(\d{2,})$/);
    if (ldMatch) {
      return ldMatch[1];
    }
    return seg;
  }

  // 2b: Dính liền chữ và số (VD: "AA123", "BB456", "CC789")
  const nonYdLetters = cleanSku.match(/^([A-Z]{1,6})(?=\d)/);
  if (nonYdLetters && nonYdLetters[1]) {
    return nonYdLetters[1];
  }

  // 3. Mặc định
  return cleanSku.slice(0, 4);
}

/**
 * Tự động tìm nhóm khu vực cho một SKU:
 * 1. Tìm trong skuGroups nếu đã định nghĩa hoặc cấu hình trước đó
 * 2. Tự động nhận dạng thông minh tiền tố nhóm từ mã SKU (kể cả nhóm mới YD-A2, YD-AB, AA, BB, CC...)
 */
export function layNhomTuSKU(
  sku: string,
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  areaOrder?: string[]
): string {
  if (!sku) return 'KHAC';
  const cleanSku = sku.trim();

  // 1. Kiểm tra chính xác trong danh sách SKU đã được gán vào nhóm
  for (const [nhom, skus] of Object.entries(skuGroups)) {
    if (Array.isArray(skus) && skus.includes(cleanSku)) {
      return nhom;
    }
  }

  // 2. Thử so khớp các nhóm đã cấu hình (ưu tiên nhóm dài hơn trước để tránh nhầm lẫn)
  const allKnownGroups = Object.keys(skuGroups).sort((a, b) => b.length - a.length);
  for (const nhom of allKnownGroups) {
    if (nhom === 'Thảm Yoga') continue;
    if (cleanSku.startsWith(nhom + '-') || cleanSku.startsWith(nhom)) {
      return nhom;
    }
  }

  // 3. TỰ ĐỘNG BÓC TÁCH NHÓM ĐỘNG (Dynamic Auto-discovery: YD-A2, YD-AB, AA, BB, CC, YD-SD, v.v...)
  return trichXuatTienToSKU(cleanSku);
}

/**
 * Trích xuất danh sách tất cả các nhóm khu vực thực tế từ đơn hàng hiện tại
 * (Kết hợp DEFAULT_AREA_ORDER + các nhóm mới tự động phát hiện như AA, BB, CC...)
 */
export function layDanhSachNhomTuDong(
  orders: RawOrderRow[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  baseAreaOrder: string[] = DEFAULT_AREA_ORDER
): string[] {
  const detectedAreas = new Set<string>(baseAreaOrder);

  // Cũng thêm các nhóm đang có trong skuGroups
  Object.keys(skuGroups).forEach((k) => {
    if (k !== 'Thảm Yoga') detectedAreas.add(k);
  });

  // Quét toàn bộ SKU trong đơn hàng để tự động bổ sung nhóm mới phát sinh (AA, BB, CC...)
  orders.forEach((order) => {
    order.items.forEach((item) => {
      const nhom = layNhomTuSKU(item.sku, skuGroups, Array.from(detectedAreas));
      if (nhom && nhom !== 'KHAC') {
        detectedAreas.add(nhom);
      }
    });
  });

  const list = Array.from(detectedAreas);
  // Sắp xếp ưu tiên: những nhóm YD chuẩn trước, sau đó tới các nhóm khác A-Z
  return list.sort((a, b) => {
    const isYdA = a.startsWith('YD-');
    const isYdB = b.startsWith('YD-');
    if (isYdA && !isYdB) return -1;
    if (!isYdA && isYdB) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Lấy nhóm chung cho đơn MIX nếu tất cả SKU cùng 1 nhóm
 */
export function layNhomChungChoMix(
  items: OrderItem[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  areaOrder: string[] = DEFAULT_AREA_ORDER
): string | null {
  let nhomChung: string | null = null;
  for (const item of items) {
    const nhom = layNhomTuSKU(item.sku, skuGroups, areaOrder);
    if (nhom) {
      if (nhomChung === null) {
        nhomChung = nhom;
      } else if (nhomChung !== nhom) {
        return null;
      }
    } else {
      return null;
    }
  }
  return nhomChung;
}

/**
 * Phân tích danh sách đơn hàng thô thành đối tượng RawOrderRow chuẩn
 */
export function parseRawOrderRows(
  rows: Array<{
    rawOrderText?: string;
    rawPieceText?: string;
    rawPickingText?: string;
    orderNo?: string;
    trackingNo?: string;
    pickingList?: string;
    creationTime?: string;
    shippedTime?: string;
    statusE11?: string;
  }>,
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS
): RawOrderRow[] {
  const yogaSkus = new Set(skuGroups['Thảm Yoga'] || []);

  return rows.map((row, index) => {
    const rawOrder = row.rawOrderText || '';
    const rawPiece = row.rawPieceText || '';
    const rawPicking = row.rawPickingText || '';

    const orderNo = row.orderNo?.trim() || layMaOrderNo(rawOrder) || `ORDER-${index + 1}`;
    const trackingNo = row.trackingNo?.trim() || layMaTrackingNo(rawOrder);
    const pickingList = row.pickingList?.trim() || layMaPickingList(rawPicking) || layMaPickingList(rawOrder);
    const carrierInfo = xacDinhDonViVanChuyen(trackingNo, rawOrder);

    const items = parsePieceText(rawPiece);
    const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
    const isSingleSku = items.length === 1;
    const hasL46 = items.some(it => it.sku === 'YD-L46-1' || it.sku.toUpperCase().includes('L46'));
    const hasYoga = items.some(it => yogaSkus.has(it.sku));

    return {
      id: `ord_${index}_${Date.now()}`,
      rawOrderText: rawOrder,
      rawPieceText: rawPiece,
      rawPickingText: rawPicking,
      orderNo,
      trackingNo,
      pickingList,
      carrier: carrierInfo.carrier,
      carrierName: carrierInfo.carrierName,
      items,
      totalQty,
      isSingleSku,
      hasL46,
      hasYoga,
      creationTime: row.creationTime,
      shippedTime: row.shippedTime,
      statusE11: row.statusE11,
    };
  });
}

/**
 * 1. TỔNG HỢP SKU (Đếm tổng số lượng cho từng SKU, có lọc theo Picking List và Carrier)
 */
export function tinhTongHopSKU(
  orders: RawOrderRow[],
  pickingListFilter?: string,
  carrierFilter?: CarrierCode | string
): SkuCountResult {
  const skuResult: SkuCountResult = {};
  const filtered = locDonHang(orders, pickingListFilter, carrierFilter);

  filtered.forEach(order => {
    order.items.forEach(item => {
      skuResult[item.sku] = (skuResult[item.sku] || 0) + item.qty;
    });
  });

  return skuResult;
}

/**
 * 2. GỘP THEO PCS (1 PCS, 2 PCS, ..., MIX, MIX L46)
 * QUY TẮC: Nếu L46 (YD-L46-1) kết hợp với 1 trong các SKU của danh sách "Thảm Yoga",
 * đơn này là ĐƠN MIX (thường tổng 2 PCS: 1 L46 + 1 Thảm Yoga) và được xếp vào cột 'MIX'.
 * Cột 'MIX L46' chỉ dành riêng cho các đơn có L46 kết hợp với các sản phẩm khác (không phải Thảm Yoga).
 */
export function xuLyGopPCS(
  orders: RawOrderRow[],
  pickingListFilter?: string,
  carrierFilter?: CarrierCode | string,
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS
): { skuResult: SkuCountResult; pcsGroups: PcsGroupResult } {
  const filtered = locDonHang(orders, pickingListFilter, carrierFilter);
  const skuResult = tinhTongHopSKU(orders, pickingListFilter, carrierFilter);
  const pcsGroups: PcsGroupResult = {};
  const yogaSkus = new Set(skuGroups['Thảm Yoga'] || []);

  filtered.forEach(order => {
    if (!order.orderNo || order.items.length === 0) return;

    if (order.items.length > 1) {
      const hasL46 = order.items.some(it => it.sku === 'YD-L46-1' || it.sku.toUpperCase().includes('L46'));
      const hasYogaMat = order.items.some(it => yogaSkus.has(it.sku));

      // Nếu L46 kết hợp với 1 trong các SKU Thảm Yoga thì đơn đó thuộc nhóm MIX
      const isMixL46Special = hasL46 && !hasYogaMat;
      const key = isMixL46Special ? 'MIX L46' : 'MIX';
      if (!pcsGroups[key]) pcsGroups[key] = [];
      pcsGroups[key].push(order.orderNo);
    } else {
      const key = String(order.totalQty);
      if (!pcsGroups[key]) pcsGroups[key] = [];
      pcsGroups[key].push(order.orderNo);
    }
  });

  return { skuResult, pcsGroups };
}

/**
 * 3. PHÂN NHÓM KHU VỰC (TỰ ĐỘNG TẠO NHÓM ĐỘNG NẾU CÓ MÃ MỚI NHƯ AA, BB, CC)
 */
export function xuLyPhanNhomKhuVuc(
  orders: RawOrderRow[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  areaOrder: string[] = DEFAULT_AREA_ORDER,
  pickingListFilter?: string,
  carrierFilter?: CarrierCode | string
): { skuResult: SkuCountResult; donTheoNhom: AreaGroupResult; dynamicAreaList: string[] } {
  const filtered = locDonHang(orders, pickingListFilter, carrierFilter);
  const skuResult = tinhTongHopSKU(orders, pickingListFilter, carrierFilter);
  const donTheoNhom: AreaGroupResult = {};

  // Tự động phát hiện toàn bộ nhóm có trong đơn hàng và skuGroups
  const dynamicAreaList = layDanhSachNhomTuDong(orders, skuGroups, areaOrder);

  dynamicAreaList.forEach(nhom => {
    donTheoNhom[nhom] = {
      '1 PCS': [],
      '2 PCS': [],
      '3 PCS': [],
      '4 PCS': [],
      '5 PCS': [],
      '6 PCS': [],
      '7 PCS': [],
      '8+ PCS': [],
      '4+ PCS': [],
      'MIX': [],
    };
  });

  filtered.forEach(order => {
    if (!order.orderNo || order.items.length === 0) return;

    if (order.items.length === 1) {
      const item = order.items[0];
      const nhom = layNhomTuSKU(item.sku, skuGroups, dynamicAreaList);
      if (nhom) {
        if (!donTheoNhom[nhom]) {
          donTheoNhom[nhom] = {
            '1 PCS': [],
            '2 PCS': [],
            '3 PCS': [],
            '4 PCS': [],
            '5 PCS': [],
            '6 PCS': [],
            '7 PCS': [],
            '8+ PCS': [],
            '4+ PCS': [],
            'MIX': [],
          };
        }

        // Phân loại chính xác cho đơn 1 SKU nhiều chiếc (TUYỆT ĐỐI KHÔNG GÁN VÀO MIX)
        if (item.qty === 1) donTheoNhom[nhom]['1 PCS'].push(order.orderNo);
        else if (item.qty === 2) donTheoNhom[nhom]['2 PCS'].push(order.orderNo);
        else if (item.qty === 3) donTheoNhom[nhom]['3 PCS'].push(order.orderNo);
        else if (item.qty === 4) donTheoNhom[nhom]['4 PCS'].push(order.orderNo);
        else if (item.qty === 5) donTheoNhom[nhom]['5 PCS'].push(order.orderNo);
        else if (item.qty === 6) donTheoNhom[nhom]['6 PCS'].push(order.orderNo);
        else if (item.qty === 7) donTheoNhom[nhom]['7 PCS'].push(order.orderNo);
        else donTheoNhom[nhom]['8+ PCS'].push(order.orderNo);

        // Hỗ trợ đồng thời cột tổng hợp '4+ PCS' cho bảng hiển thị rút gọn (1 SKU có từ 4 PCS trở lên)
        if (item.qty >= 4) {
          donTheoNhom[nhom]['4+ PCS'].push(order.orderNo);
        }
      }
    } else {
      // ĐƠN MIX THỰC SỰ: Bắt buộc phải có từ 2 sản phẩm/SKU trở lên (items.length > 1)
      const nhomChung = layNhomChungChoMix(order.items, skuGroups, dynamicAreaList);
      if (nhomChung) {
        if (!donTheoNhom[nhomChung]) {
          donTheoNhom[nhomChung] = {
            '1 PCS': [],
            '2 PCS': [],
            '3 PCS': [],
            '4 PCS': [],
            '5 PCS': [],
            '6 PCS': [],
            '7 PCS': [],
            '8+ PCS': [],
            '4+ PCS': [],
            'MIX': [],
          };
        }
        donTheoNhom[nhomChung]['MIX'].push(order.orderNo);
      }
    }
  });

  return { skuResult, donTheoNhom, dynamicAreaList };
}

/**
 * 4. PHÂN LOẠI THẢM YOGA
 */
export function xuLyPhanLoaiThamYoga(
  orders: RawOrderRow[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  pickingListFilter?: string,
  carrierFilter?: CarrierCode | string
): YogaClassificationResult {
  const filtered = locDonHang(orders, pickingListFilter, carrierFilter);
  const skuResult = tinhTongHopSKU(orders, pickingListFilter, carrierFilter);
  const result: YogaClassificationResult = {
    skuResult,
    donThuong: {},
    donThamYoga: {},
    donL46: [],
    donMix2PCSL46: [],
    donMixKhac: [],
  };

  const thamYogaSKU = new Set(skuGroups['Thảm Yoga'] || []);

  filtered.forEach(order => {
    if (!order.orderNo || order.items.length === 0) return;

    const hasThamYoga = order.items.some(it => thamYogaSKU.has(it.sku));
    const hasL46 = order.items.some(it => it.sku === 'YD-L46-1' || it.sku.toUpperCase().includes('L46'));
    const tongSoLuong = order.totalQty;

    if (order.items.length === 1) {
      const item = order.items[0];
      const sku = item.sku;
      const qty = item.qty;

      if (sku === 'YD-L46-1' || sku.toUpperCase().includes('L46')) {
        result.donL46.push({ orderNo: order.orderNo, qty });
      } else if (thamYogaSKU.has(sku)) {
        const key = String(qty);
        if (!result.donThamYoga[key]) result.donThamYoga[key] = [];
        result.donThamYoga[key].push(order.orderNo);
      } else {
        if (!result.donThuong[qty]) result.donThuong[qty] = [];
        result.donThuong[qty].push(order.orderNo);
      }
    } else {
      // Đơn nhiều SKU hoặc đơn MIX
      // Điều kiện nghiêm ngặt cho Thảm Yoga + L46:
      // Bắt buộc CHỈ GỒM: đúng 1 Thảm Yoga (qty = 1) và đúng 1 YD-L46-1 (qty = 1), tổng số lượng đúng 2 PCS.
      // Tuyệt đối không nhận đơn > 2 PCS hoặc kèm SKU nào khác.
      const isStrictYogaPlusL46 =
        order.items.length === 2 &&
        tongSoLuong === 2 &&
        order.items.some(it => thamYogaSKU.has(it.sku) && it.qty === 1) &&
        order.items.some(it => (it.sku === 'YD-L46-1' || it.sku.toUpperCase().includes('L46')) && it.qty === 1);

      if (isStrictYogaPlusL46) {
        if (!result.donThamYoga['MIX_L46']) result.donThamYoga['MIX_L46'] = [];
        result.donThamYoga['MIX_L46'].push(order.orderNo);
      } else if (hasThamYoga) {
        // Có Thảm Yoga kết hợp khác (Thảm + L46 trên 2 PCS, nhiều thảm, hoặc thảm + SKU khác) -> MIX Thảm Yoga
        if (!result.donThamYoga['MIX']) result.donThamYoga['MIX'] = [];
        result.donThamYoga['MIX'].push(order.orderNo);
      } else if (hasL46 && tongSoLuong === 2) {
        // Đơn MIX 2 PCS có L46 kết hợp với sản phẩm khác (không phải Thảm Yoga)
        result.donMix2PCSL46.push(order.orderNo);
      } else if (hasL46) {
        result.donL46.push({ orderNo: order.orderNo, qty: tongSoLuong });
      } else {
        result.donMixKhac.push(order.orderNo);
      }
    }
  });

  return result;
}

/**
 * 5. LỌC ĐƠN 1 PCS THEO NHÓM (HỖ TRỢ NHÓM ĐỘNG AA, BB, CC, YD-SD,...)
 */
export function xuLyLocDon1PCS(
  orders: RawOrderRow[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  areaOrder: string[] = DEFAULT_AREA_ORDER,
  pickingListFilter?: string,
  carrierFilter?: CarrierCode | string
): { don1PCSTheoNhom: SinglePcsAreaResult; dynamicAreaList: string[] } {
  const dynamicAreaList = layDanhSachNhomTuDong(orders, skuGroups, areaOrder);
  const don1PCSTheoNhom: SinglePcsAreaResult = {};
  const filtered = locDonHang(orders, pickingListFilter, carrierFilter);
  
  dynamicAreaList.forEach(nhom => {
    don1PCSTheoNhom[nhom] = [];
  });

  filtered.forEach(order => {
    if (!order.orderNo || order.items.length !== 1) return;

    const item = order.items[0];
    if (item.qty !== 1) return;

    const nhom = layNhomTuSKU(item.sku, skuGroups, dynamicAreaList);
    if (nhom) {
      if (!don1PCSTheoNhom[nhom]) {
        don1PCSTheoNhom[nhom] = [];
      }
      don1PCSTheoNhom[nhom].push(order.orderNo);
    }
  });

  return { don1PCSTheoNhom, dynamicAreaList };
}

/**
 * 5.1. PHÂN TÁCH ĐƠN THEO MÃ SKU (SẮP XẾP CAO ĐẾN THẤP, PHỤC VỤ ĐÓNG GÓI THEO BATCH / ĐƠN 1 PCS)
 * Hỗ trợ chọn SKU nào nhiều đơn nhất để xuất hàng/đóng gói trước.
 */
export function xuLyPhanTachTheoSKU(
  orders: RawOrderRow[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  pcsMode: SkuPackingPcsMode = '1_PCS',
  sortMode: SkuPackingSortMode = 'order_count_desc',
  pickingListFilter?: string,
  carrierFilter?: CarrierCode | string,
  areaFilter: string = 'ALL',
  customPcs?: number
): SkuPackingBreakdownResult {
  const filtered = locDonHang(orders, pickingListFilter, carrierFilter);
  const dynamicAreaList = layDanhSachNhomTuDong(orders, skuGroups, DEFAULT_AREA_ORDER);

  // Lọc danh sách đơn thỏa mãn chế độ PCS
  const matchedOrders: Array<{ order: RawOrderRow; sku: string; qty: number }> = [];

  filtered.forEach((order) => {
    if (!order.orderNo || !order.items || order.items.length === 0) return;

    if (pcsMode === '1_PCS') {
      if (order.items.length === 1 && order.items[0].qty === 1) {
        matchedOrders.push({
          order,
          sku: order.items[0].sku,
          qty: 1,
        });
      }
    } else if (pcsMode === '2_PCS') {
      if (order.items.length === 1 && order.items[0].qty === 2) {
        matchedOrders.push({
          order,
          sku: order.items[0].sku,
          qty: 2,
        });
      }
    } else if (pcsMode === '3_PCS') {
      if (order.items.length === 1 && order.items[0].qty === 3) {
        matchedOrders.push({
          order,
          sku: order.items[0].sku,
          qty: 3,
        });
      }
    } else if (pcsMode === '4_PCS') {
      if (order.items.length === 1 && order.items[0].qty === 4) {
        matchedOrders.push({
          order,
          sku: order.items[0].sku,
          qty: 4,
        });
      }
    } else if (pcsMode === '5_PLUS_PCS') {
      if (order.items.length === 1 && order.items[0].qty >= 5) {
        matchedOrders.push({
          order,
          sku: order.items[0].sku,
          qty: order.items[0].qty,
        });
      }
    } else if (pcsMode === 'CUSTOM_PCS') {
      const targetQty = customPcs || 1;
      if (order.items.length === 1 && order.items[0].qty === targetQty) {
        matchedOrders.push({
          order,
          sku: order.items[0].sku,
          qty: order.items[0].qty,
        });
      }
    } else if (pcsMode === 'SINGLE_SKU') {
      // Đơn đồng chất: Đơn chỉ có đúng 1 loại SKU duy nhất, bất kể số lượng 1, 2, 3, 10 PCS...
      if (order.items.length === 1) {
        matchedOrders.push({
          order,
          sku: order.items[0].sku,
          qty: order.items[0].qty,
        });
      }
    } else if (pcsMode === 'MIX_ORDERS') {
      // Đơn MIX: Đơn chứa từ 2 loại SKU trở lên
      if (order.items.length > 1) {
        order.items.forEach((it) => {
          matchedOrders.push({
            order,
            sku: it.sku,
            qty: it.qty,
          });
        });
      }
    } else if (pcsMode === 'ALL_ORDERS') {
      order.items.forEach((it) => {
        matchedOrders.push({
          order,
          sku: it.sku,
          qty: it.qty,
        });
      });
    }
  });

  // Gom theo SKU
  const skuMap = new Map<string, {
    sku: string;
    area: string;
    orderNos: Set<string>;
    ordersMap: Map<string, RawOrderRow>;
    totalQty: number;
  }>();

  matchedOrders.forEach(({ order, sku, qty }) => {
    const cleanSku = sku.trim();
    if (!cleanSku) return;

    let entry = skuMap.get(cleanSku);
    if (!entry) {
      const area = layNhomTuSKU(cleanSku, skuGroups, dynamicAreaList) || 'Chưa phân nhóm';
      entry = {
        sku: cleanSku,
        area,
        orderNos: new Set(),
        ordersMap: new Map(),
        totalQty: 0,
      };
      skuMap.set(cleanSku, entry);
    }

    entry.orderNos.add(order.orderNo);
    entry.ordersMap.set(order.orderNo, order);
    entry.totalQty += qty;
  });

  const totalOrdersCount = matchedOrders.length;
  let skuList: SkuPackingItem[] = Array.from(skuMap.values()).map((entry) => {
    const orderNos = Array.from(entry.orderNos);
    const orderCount = orderNos.length;
    const percentage = totalOrdersCount > 0 ? (orderCount / totalOrdersCount) * 100 : 0;

    return {
      sku: entry.sku,
      area: entry.area,
      orderCount,
      totalQty: entry.totalQty,
      orderNos,
      orders: Array.from(entry.ordersMap.values()),
      percentage: Number(percentage.toFixed(1)),
    };
  });

  // Lọc theo Khu vực nếu có
  if (areaFilter && areaFilter !== 'ALL') {
    skuList = skuList.filter((item) => item.area === areaFilter);
  }

  // Sắp xếp
  skuList.sort((a, b) => {
    if (sortMode === 'order_count_desc') {
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      if (b.totalQty !== a.totalQty) return b.totalQty - a.totalQty;
      return a.sku.localeCompare(b.sku);
    }
    if (sortMode === 'qty_desc') {
      if (b.totalQty !== a.totalQty) return b.totalQty - a.totalQty;
      if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
      return a.sku.localeCompare(b.sku);
    }
    if (sortMode === 'sku_asc') {
      return a.sku.localeCompare(b.sku);
    }
    if (sortMode === 'area_asc') {
      if (a.area !== b.area) return a.area.localeCompare(b.area);
      return b.orderCount - a.orderCount;
    }
    return 0;
  });

  const totalOrders = skuList.reduce((sum, item) => sum + item.orderCount, 0);
  const totalPcs = skuList.reduce((sum, item) => sum + item.totalQty, 0);

  return {
    skuList,
    totalOrders,
    totalSkus: skuList.length,
    totalPcs,
  };
}

export const YOGA_MAT_SKU_LIST: string[] = [
  'YD-B8-1L', 'YD-B8-2L', 'YD-B8-4L', 'YD-B8-5L',
  'YD-B9-1L', 'YD-B9-2L', 'YD-B9-4L', 'YD-B9-5L',
  'YD-L28-1L', 'YD-L28-1LB', 'YD-L28-2L', 'YD-L28-2LB',
  'YD-L28-3L', 'YD-L28-3LB',
  'YD-L29-1L', 'YD-L29-1LB', 'YD-L29-2L', 'YD-L29-2LB',
  'YD-L29-3L', 'YD-L29-3LB',
];
export const YOGA_MAT_SKUS_SET = new Set(YOGA_MAT_SKU_LIST);

/**
 * Kiểm tra xem 1 mã SKU có thuộc danh sách Thảm Yoga hay không
 */
export function isYogaMatSku(sku: string, skuGroups?: SkuGroupsMap): boolean {
  if (!sku) return false;
  const clean = sku.trim();
  if (YOGA_MAT_SKUS_SET.has(clean)) return true;
  if (skuGroups && skuGroups['Thảm Yoga'] && skuGroups['Thảm Yoga'].includes(clean)) return true;
  return false;
}

/**
 * Kiểm tra xem 1 đơn hàng có chứa bất kỳ mã Thảm Yoga nào hay không
 */
export function isYogaMatOrder(order: RawOrderRow, skuGroups?: SkuGroupsMap): boolean {
  if (!order || !order.items || order.items.length === 0) return false;
  return order.items.some(it => isYogaMatSku(it.sku, skuGroups));
}

/**
 * 6. PHÂN TÍCH & BÓC TÁCH ĐƠN MIX THEO SKU CHỦ ĐẠO (DOMINANT SKU CLUSTERING)
 * Tự động tìm SKU nào chiếm số lượng lớn nhất trong toàn bộ các đơn MIX
 * Hỗ trợ bóc tách loại trừ Thảm Yoga theo yêu cầu kho.
 */
export function xuLyPhanTichDonMix(
  orders: RawOrderRow[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  pickingListFilter?: string,
  yogaFilter: 'exclude' | 'only' | 'all' = 'exclude',
  carrierFilter?: CarrierCode | string
): MixOrderAnalysisResult {
  const dynamicAreas = layDanhSachNhomTuDong(orders, skuGroups);
  const filtered = locDonHang(orders, pickingListFilter, carrierFilter);

  // Lọc ra tất cả các đơn MIX (có từ 2 items trở lên hoặc có nhiều SKU)
  const allMixOrdersRaw = filtered.filter(order => {
    if (!order.orderNo || !order.items || order.items.length === 0) return false;
    return order.items.length > 1;
  });

  const totalAllMixOrdersCount = allMixOrdersRaw.length;
  const totalYogaMixOrdersCount = allMixOrdersRaw.filter(o => isYogaMatOrder(o, skuGroups)).length;
  const totalNonYogaMixOrdersCount = totalAllMixOrdersCount - totalYogaMixOrdersCount;

  // Áp dụng bộ lọc Thảm Yoga cho danh sách đơn MIX
  const mixOrders = allMixOrdersRaw.filter(order => {
    const isYoga = isYogaMatOrder(order, skuGroups);
    if (yogaFilter === 'exclude') {
      return !isYoga; // Loại trừ toàn bộ đơn có Thảm Yoga
    }
    if (yogaFilter === 'only') {
      return isYoga; // Chỉ lấy đơn có Thảm Yoga
    }
    return true; // Tất cả
  });

  const skuMap: Record<
    string,
    {
      sku: string;
      area: string;
      totalQty: number;
      orderCount: number;
      orders: RawOrderRow[];
      coMap: Record<string, { sku: string; area: string; totalQty: number; orderCount: number }>;
    }
  > = {};

  let totalMixPcs = 0;

  mixOrders.forEach(order => {
    totalMixPcs += order.totalQty;

    order.items.forEach(item => {
      const sku = item.sku;
      if (!skuMap[sku]) {
        const area = layNhomTuSKU(sku, skuGroups, dynamicAreas);
        skuMap[sku] = {
          sku,
          area,
          totalQty: 0,
          orderCount: 0,
          orders: [],
          coMap: {},
        };
      }

      skuMap[sku].totalQty += item.qty;
      skuMap[sku].orderCount += 1;
      skuMap[sku].orders.push(order);

      // Thống kê các SKU đi kèm trong đơn MIX này
      order.items.forEach(otherItem => {
        if (otherItem.sku !== sku) {
          const otherSku = otherItem.sku;
          if (!skuMap[sku].coMap[otherSku]) {
            skuMap[sku].coMap[otherSku] = {
              sku: otherSku,
              area: layNhomTuSKU(otherSku, skuGroups, dynamicAreas),
              totalQty: 0,
              orderCount: 0,
            };
          }
          skuMap[sku].coMap[otherSku].totalQty += otherItem.qty;
          skuMap[sku].coMap[otherSku].orderCount += 1;
        }
      });
    });
  });

  const rankedSkus: SkuInMixSummary[] = Object.values(skuMap)
    .map(item => {
      const coOccurringSkus = Object.values(item.coMap).sort((a, b) => b.totalQty - a.totalQty);
      return {
        sku: item.sku,
        area: item.area,
        totalQty: item.totalQty,
        orderCount: item.orderCount,
        orders: item.orders,
        coOccurringSkus,
      };
    })
    .sort((a, b) => {
      // Ưu tiên: Tổng số lượng PCS trong đơn MIX lớn nhất trước, sau đó là số đơn
      if (b.totalQty !== a.totalQty) return b.totalQty - a.totalQty;
      return b.orderCount - a.orderCount;
    });

  return {
    totalMixOrders: mixOrders.length,
    totalMixPcs,
    distinctSkusInMix: rankedSkus.length,
    rankedSkus,
    allMixOrders: mixOrders,
    totalAllMixOrdersCount,
    totalYogaMixOrdersCount,
    totalNonYogaMixOrdersCount,
    yogaFilterApplied: yogaFilter,
  };
}

/**
 * Trích xuất dòng/model sản phẩm cụ thể từ mã SKU (VD: YD-W82-2-0 -> YD-W82, YD-D107-1 -> YD-D107)
 */
export function trichXuatDongSanPham(sku: string): string {
  if (!sku || typeof sku !== 'string') return 'KHAC';
  const clean = sku.trim().toUpperCase();

  const parts = clean.split('-');
  if (parts.length >= 3 && parts[0] === 'YD') {
    // VD: YD-W82-2, YD-D107-1, YD-W161-6 -> "YD-W82", "YD-D107", "YD-W161"
    return `${parts[0]}-${parts[1]}`;
  }
  if (parts.length === 2 && parts[0] === 'YD') {
    // VD: YD-BUBBLEWRAP
    return clean;
  }
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return clean;
}

/**
 * 7. BÓC TÁCH & GOM ĐƠN MIX THEO NHÓM SẢN PHẨM
 * - Gom toàn bộ các đơn MIX có cùng 1 nhóm (Single-Group MIX)
 * - Gom các đơn MIX chéo nhóm (Cross-Group MIX) theo từng cặp nhóm
 * - Tổng hợp thống kê theo từng nhóm sản phẩm
 * - Hỗ trợ bóc tách loại trừ Thảm Yoga theo yêu cầu kho
 */
export function xuLyGomDonMixTheoNhom(
  orders: RawOrderRow[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  groupingType: 'model' | 'area' = 'model',
  pickingListFilter?: string,
  yogaFilter: 'exclude' | 'only' | 'all' = 'exclude',
  carrierFilter?: CarrierCode | string
) {
  const dynamicAreas = layDanhSachNhomTuDong(orders, skuGroups);
  const filtered = locDonHang(orders, pickingListFilter, carrierFilter);

  // Lọc ra các đơn MIX: có từ 2 items trở lên hoặc có nhiều SKU
  const allMixOrdersRaw = filtered.filter((order) => {
    if (!order.orderNo || !order.items || order.items.length === 0) return false;
    return order.items.length > 1;
  });

  const totalAllMixOrdersCount = allMixOrdersRaw.length;
  const totalYogaMixOrdersCount = allMixOrdersRaw.filter(o => isYogaMatOrder(o, skuGroups)).length;
  const totalNonYogaMixOrdersCount = totalAllMixOrdersCount - totalYogaMixOrdersCount;

  // Lọc đơn MIX theo tuỳ chọn Thảm Yoga
  const mixOrders = allMixOrdersRaw.filter(order => {
    const isYoga = isYogaMatOrder(order, skuGroups);
    if (yogaFilter === 'exclude') {
      return !isYoga;
    }
    if (yogaFilter === 'only') {
      return isYoga;
    }
    return true;
  });

  // Helper lấy nhóm cho 1 SKU tuỳ theo groupingType
  const getGroupForSku = (sku: string): string => {
    if (groupingType === 'area') {
      return layNhomTuSKU(sku, skuGroups, dynamicAreas);
    }
    return trichXuatDongSanPham(sku);
  };

  // Map đơn thuần cùng nhóm
  const pureGroupMap: Record<
    string,
    {
      groupName: string;
      orderCount: number;
      totalPcs: number;
      orders: RawOrderRow[];
      orderNos: string[];
      skuMap: Record<string, { qty: number; orderCount: number }>;
    }
  > = {};

  // Map đơn chéo nhóm
  const crossGroupMap: Record<
    string,
    {
      groupComboKey: string;
      groups: string[];
      orderCount: number;
      totalPcs: number;
      orders: RawOrderRow[];
      orderNos: string[];
      skuSet: Set<string>;
    }
  > = {};

  // Map tổng hợp toàn bộ các nhóm
  const allGroupsMap: Record<
    string,
    {
      groupName: string;
      totalOrders: number;
      pureOrders: number;
      crossOrders: number;
      totalPcs: number;
      skuMap: Record<string, number>;
      orderNoSet: Set<string>;
      orders: RawOrderRow[];
    }
  > = {};

  let totalPureOrders = 0;
  let totalPurePcs = 0;
  let totalCrossOrders = 0;
  let totalCrossPcs = 0;

  mixOrders.forEach((order) => {
    // Xác định tất cả các nhóm có trong đơn hàng này
    const groupsInOrderSet = new Set<string>();
    order.items.forEach((it) => {
      const g = getGroupForSku(it.sku);
      groupsInOrderSet.add(g);

      if (!allGroupsMap[g]) {
        allGroupsMap[g] = {
          groupName: g,
          totalOrders: 0,
          pureOrders: 0,
          crossOrders: 0,
          totalPcs: 0,
          skuMap: {},
          orderNoSet: new Set(),
          orders: [],
        };
      }
      allGroupsMap[g].totalPcs += it.qty;
      allGroupsMap[g].skuMap[it.sku] = (allGroupsMap[g].skuMap[it.sku] || 0) + it.qty;
      if (!allGroupsMap[g].orderNoSet.has(order.orderNo)) {
        allGroupsMap[g].orderNoSet.add(order.orderNo);
        allGroupsMap[g].orders.push(order);
      }
    });

    const groupsInOrder = Array.from(groupsInOrderSet).sort();

    // 1. Nếu đơn CHỈ CHỨA DUY NHẤT 1 NHÓM SẢN PHẨM (Đơn MIX thuần cùng nhóm)
    if (groupsInOrder.length === 1) {
      const singleGroup = groupsInOrder[0];
      totalPureOrders += 1;
      totalPurePcs += order.totalQty;

      if (!pureGroupMap[singleGroup]) {
        pureGroupMap[singleGroup] = {
          groupName: singleGroup,
          orderCount: 0,
          totalPcs: 0,
          orders: [],
          orderNos: [],
          skuMap: {},
        };
      }

      pureGroupMap[singleGroup].orderCount += 1;
      pureGroupMap[singleGroup].totalPcs += order.totalQty;
      pureGroupMap[singleGroup].orders.push(order);
      pureGroupMap[singleGroup].orderNos.push(order.orderNo);

      order.items.forEach((it) => {
        if (!pureGroupMap[singleGroup].skuMap[it.sku]) {
          pureGroupMap[singleGroup].skuMap[it.sku] = { qty: 0, orderCount: 0 };
        }
        pureGroupMap[singleGroup].skuMap[it.sku].qty += it.qty;
        pureGroupMap[singleGroup].skuMap[it.sku].orderCount += 1;
      });

      // Cập nhật thống kê allGroups
      allGroupsMap[singleGroup].pureOrders += 1;
      allGroupsMap[singleGroup].totalOrders += 1;
    } else {
      // 2. Đơn MIX CHÉO NHIỀU NHÓM
      totalCrossOrders += 1;
      totalCrossPcs += order.totalQty;

      const comboKey = groupsInOrder.join(' + ');

      if (!crossGroupMap[comboKey]) {
        crossGroupMap[comboKey] = {
          groupComboKey: comboKey,
          groups: groupsInOrder,
          orderCount: 0,
          totalPcs: 0,
          orders: [],
          orderNos: [],
          skuSet: new Set(),
        };
      }

      crossGroupMap[comboKey].orderCount += 1;
      crossGroupMap[comboKey].totalPcs += order.totalQty;
      crossGroupMap[comboKey].orders.push(order);
      crossGroupMap[comboKey].orderNos.push(order.orderNo);
      order.items.forEach((it) => crossGroupMap[comboKey].skuSet.add(it.sku));

      // Cập nhật thống kê allGroups cho từng nhóm có mặt trong đơn chéo
      groupsInOrder.forEach((g) => {
        allGroupsMap[g].crossOrders += 1;
        allGroupsMap[g].totalOrders += 1;
      });
    }
  });

  // Chuyển đổi và sắp xếp kèm bóc tách PCS
  const pureGroupList = Object.values(pureGroupMap)
    .map((g) => {
      const { pcsBreakdown, ordersByPcs } = tinhPhanTachDonTheoPcs(g.orders);
      return {
        groupName: g.groupName,
        isPureGroup: true,
        orderCount: g.orderCount,
        totalPcs: g.totalPcs,
        orders: g.orders,
        orderNos: g.orderNos,
        skuBreakdown: Object.entries(g.skuMap)
          .map(([sku, data]) => ({ sku, qty: data.qty, orderCount: data.orderCount }))
          .sort((a, b) => b.qty - a.qty || b.orderCount - a.orderCount),
        pcsBreakdown,
        ordersByPcs,
      };
    })
    .sort((a, b) => b.orderCount - a.orderCount || b.totalPcs - a.totalPcs);

  const crossGroupPairs = Object.values(crossGroupMap)
    .map((c) => {
      const { pcsBreakdown, ordersByPcs } = tinhPhanTachDonTheoPcs(c.orders);
      return {
        groupComboKey: c.groupComboKey,
        groups: c.groups,
        orderCount: c.orderCount,
        totalPcs: c.totalPcs,
        orders: c.orders,
        orderNos: c.orderNos,
        skuList: Array.from(c.skuSet),
        pcsBreakdown,
        ordersByPcs,
      };
    })
    .sort((a, b) => b.orderCount - a.orderCount || b.totalPcs - a.totalPcs);

  const allGroupSummaries = Object.values(allGroupsMap)
    .map((g) => {
      const { pcsBreakdown, ordersByPcs } = tinhPhanTachDonTheoPcs(g.orders);
      return {
        groupName: g.groupName,
        totalOrders: g.totalOrders,
        pureOrders: g.pureOrders,
        crossOrders: g.crossOrders,
        totalPcs: g.totalPcs,
        skus: Object.entries(g.skuMap)
          .map(([sku, qty]) => ({ sku, qty }))
          .sort((a, b) => b.qty - a.qty),
        allOrderNos: Array.from(g.orderNoSet),
        allOrders: g.orders,
        pcsBreakdown,
        ordersByPcs,
      };
    })
    .sort((a, b) => b.totalOrders - a.totalOrders || b.totalPcs - a.totalPcs);

  const { pcsBreakdown: globalPcsBreakdown, ordersByPcs: globalOrdersByPcs } =
    tinhPhanTachDonTheoPcs(mixOrders);

  return {
    pureGroupList,
    totalPureOrders,
    totalPurePcs,
    crossGroupPairs,
    totalCrossOrders,
    totalCrossPcs,
    allGroupSummaries,
    totalMixOrders: mixOrders.length,
    allMixOrders: mixOrders,
    totalAllMixOrdersCount,
    totalYogaMixOrdersCount,
    totalNonYogaMixOrdersCount,
    yogaFilterApplied: yogaFilter,
    globalPcsBreakdown,
    globalOrdersByPcs,
  };
}

/**
 * Helper: Bóc tách đơn theo số lượng PCS (2 PCS, 3 PCS, 4 PCS, 5 PCS, 6 PCS, ≥7 PCS)
 */
export function tinhPhanTachDonTheoPcs(orders: RawOrderRow[]): {
  pcsBreakdown: Array<{
    pcs: number | string;
    label: string;
    orderCount: number;
    totalPcs: number;
    orderNos: string[];
  }>;
  ordersByPcs: Record<string, string[]>;
} {
  const buckets: Record<string, { label: string; orderNos: string[]; totalPcs: number }> = {
    '2': { label: '2 PCS', orderNos: [], totalPcs: 0 },
    '3': { label: '3 PCS', orderNos: [], totalPcs: 0 },
    '4': { label: '4 PCS', orderNos: [], totalPcs: 0 },
    '5': { label: '5 PCS', orderNos: [], totalPcs: 0 },
    '6': { label: '6 PCS', orderNos: [], totalPcs: 0 },
    'ge7': { label: '≥ 7 PCS', orderNos: [], totalPcs: 0 },
  };

  orders.forEach((o) => {
    const qty = o.totalQty;
    let key = '2';
    if (qty === 2) key = '2';
    else if (qty === 3) key = '3';
    else if (qty === 4) key = '4';
    else if (qty === 5) key = '5';
    else if (qty === 6) key = '6';
    else if (qty >= 7) key = 'ge7';
    else key = '2';

    if (buckets[key]) {
      buckets[key].orderNos.push(o.orderNo);
      buckets[key].totalPcs += qty;
    }
  });

  const ordersByPcs: Record<string, string[]> = {
    '2': buckets['2'].orderNos,
    '3': buckets['3'].orderNos,
    '4': buckets['4'].orderNos,
    '5': buckets['5'].orderNos,
    '6': buckets['6'].orderNos,
    'ge6': [...buckets['6'].orderNos, ...buckets['ge7'].orderNos],
    'ge7': buckets['ge7'].orderNos,
    'all': orders.map((o) => o.orderNo),
  };

  const pcsBreakdown = [
    { pcs: 2, label: '2 PCS', orderCount: buckets['2'].orderNos.length, totalPcs: buckets['2'].totalPcs, orderNos: buckets['2'].orderNos },
    { pcs: 3, label: '3 PCS', orderCount: buckets['3'].orderNos.length, totalPcs: buckets['3'].totalPcs, orderNos: buckets['3'].orderNos },
    { pcs: 4, label: '4 PCS', orderCount: buckets['4'].orderNos.length, totalPcs: buckets['4'].totalPcs, orderNos: buckets['4'].orderNos },
    { pcs: 5, label: '5 PCS', orderCount: buckets['5'].orderNos.length, totalPcs: buckets['5'].totalPcs, orderNos: buckets['5'].orderNos },
    { pcs: 6, label: '6 PCS', orderCount: buckets['6'].orderNos.length, totalPcs: buckets['6'].totalPcs, orderNos: buckets['6'].orderNos },
    { pcs: 'ge7', label: '≥ 7 PCS', orderCount: buckets['ge7'].orderNos.length, totalPcs: buckets['ge7'].totalPcs, orderNos: buckets['ge7'].orderNos },
  ];

  return { pcsBreakdown, ordersByPcs };
}

/**
 * Helper: Parse CSV / TSV text hỗ trợ đầy đủ các ô nhiều dòng có dấu ngoặc kép ("...")
 */
export function parseCsvOrTsv(text: string): string[][] {
  const delimiter = text.includes('\t') ? '\t' : (text.includes(';') ? ';' : ',');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Parse từ Clipboard (hỗ trợ copy-paste từ web WMS/OMS, Google Sheets dạng TSV/CSV hoặc text tự do)
 */
export function parsePastedTableData(
  text: string,
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS
): RawOrderRow[] {
  if (!text || text.trim() === '') return [];

  const rawText = text.trim();

  // 1. Kiểm tra nếu văn bản chứa các khối đơn WMS dạng "Order No.：" hoặc "Order No:" lặp lại nhiều lần
  const orderMatches = Array.from(rawText.matchAll(/Order\s*No\.?\s*[:：]\s*([A-Za-z0-9-_]+)/gi));
  if (orderMatches.length > 0) {
    // Tách văn bản thành các block đơn dựa theo vị trí xuất hiện của Order No
    const parsedRows: Array<{
      rawOrderText?: string;
      rawPieceText?: string;
      rawPickingText?: string;
      orderNo?: string;
      trackingNo?: string;
      pickingList?: string;
    }> = [];

    for (let i = 0; i < orderMatches.length; i++) {
      const match = orderMatches[i];
      const startPos = match.index ?? 0;
      const nextMatch = orderMatches[i + 1];
      const endPos = nextMatch ? (nextMatch.index ?? rawText.length) : rawText.length;
      const block = rawText.slice(startPos, endPos);

      const orderNo = match[1]?.trim() || '';
      const trackingMatch = block.match(/Tracking\s*No\.?\s*[:：]\s*([A-Za-z0-9-_]+)/i);
      const trackingNo = trackingMatch ? trackingMatch[1].trim() : '';

      const pickingMatch = block.match(/Picking\s*List\s*No\.?\s*[:：]\s*([^\r\n\t]*)/i);
      const pickingList = pickingMatch ? pickingMatch[1].trim() : '';

      // Loại bỏ tất cả các dòng metadata trước khi tìm SKU
      const blockLines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const cleanProductLines: string[] = [];

      for (const line of blockLines) {
        if (
          isMetadataText(line) ||
          /^(Order No|RefNo|Tracking No|Public platform|Return mail|Picking List|Provider channel|Logistics product|Recipient|Creation Time|Print Time|Packing Time|Shipping Time|Time ZoneTime|Order Type|Picking Type|Number of packages|Shipped|Shelved|VN02|VN|More)\b/i.test(line)
        ) {
          continue;
        }
        cleanProductLines.push(line);
      }

      // Trích xuất các mã SKU từ các dòng sản phẩm sạch
      const itemLines: string[] = [];
      const cleanBlockText = cleanProductLines.join('\n');
      const itemsFromBlock = parsePieceText(cleanBlockText);
      for (const item of itemsFromBlock) {
        itemLines.push(`${item.sku}*${item.qty}`);
      }

      // Nếu không tìm thấy SKU bằng parsePieceText, thử quét các mã SKU bắt đầu bằng YD- trong các dòng sạch
      if (itemLines.length === 0) {
        const ydRegex = /\b(YD-[A-Za-z0-9-_]+)\b/g;
        let ydMatch;
        while ((ydMatch = ydRegex.exec(cleanBlockText)) !== null) {
          const skuCandidate = ydMatch[1].trim();
          if (isValidSkuName(skuCandidate) && skuCandidate !== orderNo) {
            itemLines.push(`${skuCandidate}*1`);
          }
        }
      }

      parsedRows.push({
        rawOrderText: block,
        rawPieceText: itemLines.join('\n'),
        rawPickingText: pickingList,
        orderNo,
        trackingNo,
        pickingList,
      });
    }

    if (parsedRows.length > 0) {
      return parseRawOrderRows(parsedRows, skuGroups);
    }
  }

  // 2. Parser bảng TSV / CSV / Clipboard từ Google Sheets / Excel
  const rawTable = parseCsvOrTsv(rawText);
  if (rawTable.length === 0) return [];

  const parsedRows: Array<{
    rawOrderText?: string;
    rawPieceText?: string;
    rawPickingText?: string;
    orderNo?: string;
    trackingNo?: string;
    pickingList?: string;
  }> = [];

  const firstRow = rawTable[0] || [];
  const colCount = firstRow.length;

  if (colCount > 1) {
    let colOrderIdx = -1;
    let colProductDetailsIdx = -1;
    let colPickingIdx = -1;
    let colTrackingDirectIdx = -1;

    const lowerHeaders = firstRow.map((h) => h.toLowerCase().trim());
    lowerHeaders.forEach((h, idx) => {
      // 1. Cột Order No
      if (h.includes('order no') || h.includes('mã đơn') || h.includes('order number')) {
        if (colOrderIdx === -1) colOrderIdx = idx;
      }
      
      // 2. Cột Product Details (SKU * Qty) - TUYỆT ĐỐI KHÔNG LẤY 'piece count'
      if (
        h.includes('product detail') ||
        h.includes('chi tiết sản phẩm') ||
        h.includes('chi tiết hàng') ||
        h.includes('mặt hàng') ||
        h === 'sku' ||
        h.includes('mã sku') ||
        h.includes('sku details')
      ) {
        colProductDetailsIdx = idx;
      }

      // 3. Cột Picking List
      if (h.includes('picking list') || h.includes('list no') || h.includes('danh sách nhặt')) {
        colPickingIdx = idx;
      }

      // 4. Cột Tracking No
      if (h.includes('tracking no') || h.includes('mã vận đơn')) {
        colTrackingDirectIdx = idx;
      }
    });

    const isHeaderPresent =
      colOrderIdx !== -1 ||
      colProductDetailsIdx !== -1 ||
      lowerHeaders.some((h) => h.includes('warehouse') || h.includes('customer') || h.includes('logistics') || h.includes('no.'));

    const startRow = isHeaderPresent ? 1 : 0;

    for (let i = startRow; i < rawTable.length; i++) {
      const cells = rawTable[i];
      if (!cells || cells.length === 0) continue;

      // 1. Tự động nhận diện ô chứa Khối Thông Tin Đơn Hàng (Order No, Tracking, RefNo, Picking List)
      let rawOrder = '';
      for (let c = 0; c < cells.length; c++) {
        const val = cells[c] || '';
        if (
          val.includes('Order No.') ||
          val.includes('Order No:') ||
          val.includes('Order No.：') ||
          val.includes('Public platform order') ||
          val.includes('RefNo.') ||
          val.includes('RefNo:') ||
          val.includes('RefNo.：')
        ) {
          rawOrder = val;
          break;
        }
      }
      if (!rawOrder) {
        rawOrder = colOrderIdx !== -1 ? (cells[colOrderIdx] || '') : (cells[2] || cells[1] || cells[0] || '');
      }

      // 2. Tự động nhận diện ô chứa Danh Sách Hàng Hóa SKU (Product Details / Piece)
      let rawPiece = '';
      let maxItemCount = 0;
      for (let c = 0; c < cells.length; c++) {
        const val = cells[c] || '';
        // Bỏ qua nếu là ô thông tin đơn hàng, ngày tháng, thông tin vận chuyển hoặc rác
        if (
          val === rawOrder ||
          isMetadataText(val) ||
          val.includes('Creation Time') ||
          val.includes('Provider channel') ||
          val.includes('Logistics product') ||
          val.includes('Recipient') ||
          val.includes('RefNo') ||
          val.includes('Ref No') ||
          val.includes('Order No')
        ) {
          continue;
        }
        const itemsFound = parsePieceText(val);
        if (itemsFound.length > maxItemCount) {
          maxItemCount = itemsFound.length;
          rawPiece = val;
        } else if (itemsFound.length > 0 && !rawPiece) {
          rawPiece = val;
        }
      }
      if (!rawPiece) {
        // Nếu cột cấu hình chứa metadata thì bỏ qua
        const colVal = colProductDetailsIdx !== -1 ? cells[colProductDetailsIdx] || '' : '';
        if (colVal && !isMetadataText(colVal)) {
          rawPiece = colVal;
        } else {
          // Thử tìm ô hợp lệ khác
          for (let c = 0; c < cells.length; c++) {
            const v = cells[c] || '';
            if (v && !isMetadataText(v) && /[A-Za-z0-9]/.test(v)) {
              const testItems = parsePieceText(v);
              if (testItems.length > 0) {
                rawPiece = v;
                break;
              }
            }
          }
        }
      }

      // 3. Tự động nhận diện ô Picking List
      let rawPicking = colPickingIdx !== -1 ? (cells[colPickingIdx] || '') : '';
      if (!rawPicking) {
        // Quét các ô khác xem có mã PL... không
        for (let c = 0; c < cells.length; c++) {
          const val = cells[c] || '';
          if (val.includes('PL') && (val.includes('Picking List') || /PL\d{6,}/.test(val))) {
            rawPicking = val;
            break;
          }
        }
      }

      // 4. Trích xuất các trường
      const extractedOrderNo = layMaOrderNo(rawOrder);
      const extractedTracking = (colTrackingDirectIdx !== -1 ? cells[colTrackingDirectIdx] : '') || layMaTrackingNo(rawOrder);
      const extractedPickingList = layMaPickingList(rawPicking) || layMaPickingList(rawOrder);

      // Nếu có thông tin đơn hoặc có SKU hợp lệ thì đưa vào danh sách
      const pieceItems = parsePieceText(rawPiece);
      if (extractedOrderNo || pieceItems.length > 0 || rawOrder) {
        parsedRows.push({
          rawOrderText: rawOrder,
          rawPieceText: rawPiece,
          rawPickingText: rawPicking,
          orderNo: extractedOrderNo,
          trackingNo: extractedTracking,
          pickingList: extractedPickingList,
        });
      }
    }
    return parseRawOrderRows(parsedRows, skuGroups);
  } else {
    rawTable.forEach((row) => {
      const line = row[0] || '';
      const order = layMaOrderNo(line);
      const pieceItems = parsePieceText(line);
      if (pieceItems.length > 0 || order) {
        parsedRows.push({
          rawOrderText: line,
          rawPieceText: line,
          rawPickingText: line,
        });
      }
    });
  }

  return parseRawOrderRows(parsedRows, skuGroups);
}

/**
 * Tạo dữ liệu mẫu thực tế của kho (20 đơn hàng thực tế từ hệ thống)
 */
export function taoDuLieuMau(skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS): RawOrderRow[] {
  const sampleData = [
    // 20 ĐƠN HÀNG THỰC TẾ TỪ WMS KHO CHUẨN PICKING LIST
    {
      rawOrder: "Order No.：YD-260816-0922\nRefNo.：260816FUSCMAMH\nTracking No. ：SPXVN069306932268\nPublic platform order number：YD-260816-0922\nPicking List No.：PL72608160018\nRecipient：N******o",
      piece: "YD-K02-3*3",
      picking: "Picking List No.：PL72608160018",
      orderNo: "YD-260816-0922",
      trackingNo: "SPXVN069306932268",
      pickingList: "PL72608160018",
    },
    {
      rawOrder: "Order No.：YD-260816-0896\nRefNo.：585568756806944672\nTracking No. ：862215760394\nPublic platform order number：YD-260816-0896\nPicking List No.：PL72608160016\nRecipient：A** đ**",
      piece: "YD-L46-1*1\nYD-B9-4L*1",
      picking: "Picking List No.：PL72608160016",
      orderNo: "YD-260816-0896",
      trackingNo: "862215760394",
      pickingList: "PL72608160016",
    },
    {
      rawOrder: "Order No.：YD-260816-0897\nRefNo.：585568685114820125\nTracking No. ：862284410444\nPublic platform order number：YD-260816-0897\nPicking List No.：PL72608160016\nRecipient：T***h C*** T***",
      piece: "YD-L46-1*1\nYD-B9-4L*1",
      picking: "Picking List No.：PL72608160016",
      orderNo: "YD-260816-0897",
      trackingNo: "862284410444",
      pickingList: "PL72608160016",
    },
    {
      rawOrder: "Order No.：YD-260816-0877\nRefNo.：260816FTE04FSA\nTracking No. ：SPXVN060052948488\nPublic platform order number：YD-260816-0877\nPicking List No.：PL72608160013\nRecipient：L*****ỷ",
      piece: "YD-D114-2*3",
      picking: "Picking List No.：PL72608160013",
      orderNo: "YD-260816-0877",
      trackingNo: "SPXVN060052948488",
      pickingList: "PL72608160013",
    },
    {
      rawOrder: "Order No.：YD-260816-0845\nRefNo.：260815ESD4W8B3\nTracking No. ：SPXVN065287768858\nPublic platform order number：YD-260816-0845\nPicking List No.：PL72608160012\nRecipient：D******h",
      piece: "YD-D114-3*2",
      picking: "Picking List No.：PL72608160012",
      orderNo: "YD-260816-0845",
      trackingNo: "SPXVN065287768858",
      pickingList: "PL72608160012",
    },
    {
      rawOrder: "Order No.：YD-260816-0827\nRefNo.：260816FS92GT87\nTracking No. ：SPXVN062613249418\nPublic platform order number：YD-260816-0827\nPicking List No.：PL72608160012\nRecipient：N******n",
      piece: "YD-D114-6*2",
      picking: "Picking List No.：PL72608160012",
      orderNo: "YD-260816-0827",
      trackingNo: "SPXVN062613249418",
      pickingList: "PL72608160012",
    },
    {
      rawOrder: "Order No.：YD-260816-0816\nRefNo.：260816FSGA7Y6K\nTracking No. ：SPXVN068516946988\nPublic platform order number：YD-260816-0816\nPicking List No.：PL72608160012\nRecipient：Y**ư",
      piece: "YD-D107-3*2",
      picking: "Picking List No.：PL72608160012",
      orderNo: "YD-260816-0816",
      trackingNo: "SPXVN068516946988",
      pickingList: "PL72608160012",
    },
    {
      rawOrder: "Order No.：YD-260816-0800\nRefNo.：260816FRGA1EF3\nTracking No. ：SPXVN065160175878\nPublic platform order number：YD-260816-0800\nPicking List No.：PL72608160015\nRecipient：V******n",
      piece: "YD-HMC96-GN*2",
      picking: "Picking List No.：PL72608160015",
      orderNo: "YD-260816-0800",
      trackingNo: "SPXVN065160175878",
      pickingList: "PL72608160015",
    },
    {
      rawOrder: "Order No.：YD-260816-0783\nRefNo.：260816FPW1N5PH\nTracking No. ：SPXVN061611976978\nPublic platform order number：YD-260816-0783\nPicking List No.：PL72608160013\nRecipient：T******y",
      piece: "YD-D113-2*3",
      picking: "Picking List No.：PL72608160013",
      orderNo: "YD-260816-0783",
      trackingNo: "SPXVN061611976978",
      pickingList: "PL72608160013",
    },
    {
      rawOrder: "Order No.：YD-260816-0777\nRefNo.：260816FQ4XEKX6\nTracking No. ：SPXVN064415824338\nPublic platform order number：YD-260816-0777\nPicking List No.：PL72608160015\nRecipient：Đ******n",
      piece: "YD-HMC96-PE*2",
      picking: "Picking List No.：PL72608160015",
      orderNo: "YD-260816-0777",
      trackingNo: "SPXVN064415824338",
      pickingList: "PL72608160015",
    },
    {
      rawOrder: "Order No.：YD-260816-0769\nRefNo.：260816FPH1BUB7\nTracking No. ：SPXVN063978374718\nPublic platform order number：YD-260816-0769\nPicking List No.：PL72608160005\nRecipient：K******h",
      piece: "YD-H82-2*1",
      picking: "Picking List No.：PL72608160005",
      orderNo: "YD-260816-0769",
      trackingNo: "SPXVN063978374718",
      pickingList: "PL72608160005",
    },
    {
      rawOrder: "Order No.：YD-260816-0768\nRefNo.：585567798972417696\nTracking No. ：862269249783\nPublic platform order number：YD-260816-0768\nPicking List No.：PL72608160008\nRecipient：B** K***h",
      piece: "YD-W75-1*1",
      picking: "Picking List No.：PL72608160008",
      orderNo: "YD-260816-0768",
      trackingNo: "862269249783",
      pickingList: "PL72608160008",
    },
    {
      rawOrder: "Order No.：YD-260816-0767\nRefNo.：585567842965947735\nTracking No. ：862281599793\nPublic platform order number：YD-260816-0767\nPicking List No.：PL72608160008\nRecipient：q***g t** p***ng á**",
      piece: "YD-W75-1*1",
      picking: "Picking List No.：PL72608160008",
      orderNo: "YD-260816-0767",
      trackingNo: "862281599793",
      pickingList: "PL72608160008",
    },
    {
      rawOrder: "Order No.：YD-260816-0765\nRefNo.：585567761697899956\nTracking No. ：862287579783\nPublic platform order number：YD-260816-0765\nPicking List No.：PL72608160002\nRecipient：T*** T** L***",
      piece: "YD-B8-2L*1",
      picking: "Picking List No.：PL72608160002",
      orderNo: "YD-260816-0765",
      trackingNo: "862287579783",
      pickingList: "PL72608160002",
    },
    {
      rawOrder: "Order No.：YD-260816-0766\nRefNo.：585567821722846212\nTracking No. ：862252579753\nPublic platform order number：YD-260816-0766\nPicking List No.：PL72608160008\nRecipient：M*** H**",
      piece: "YD-W75-1*1",
      picking: "Picking List No.：PL72608160008",
      orderNo: "YD-260816-0766",
      trackingNo: "862252579753",
      pickingList: "PL72608160008",
    },
    {
      rawOrder: "Order No.：YD-260816-0760\nRefNo.：585567779229238487\nTracking No. ：862286969783\nPublic platform order number：YD-260816-0760\nPicking List No.：PL72608160008\nRecipient：M***hh",
      piece: "YD-W75-1*1",
      picking: "Picking List No.：PL72608160008",
      orderNo: "YD-260816-0760",
      trackingNo: "862286969783",
      pickingList: "PL72608160008",
    },
    {
      rawOrder: "Order No.：YD-260816-0756\nRefNo.：260816FPHXVFC3\nTracking No. ：SPXVN068461726668\nPublic platform order number：YD-260816-0756\nPicking List No.：PL72608160015\nRecipient：T******n",
      piece: "YD-HMC96-W*2",
      picking: "Picking List No.：PL72608160015",
      orderNo: "YD-260816-0756",
      trackingNo: "SPXVN068461726668",
      pickingList: "PL72608160015",
    },
    {
      rawOrder: "Order No.：YD-260906-0733\nRefNo.：260906VNGHTIKTOK1\nTracking No. ：VNGH80170369010\nPublic platform order number：YD-260906-0733\nPicking List No.：PL72608160009\nRecipient：TikTok User",
      piece: "YD-B8-4L*1",
      picking: "Picking List No.：PL72608160009",
      orderNo: "YD-260906-0733",
      trackingNo: "VNGH80170369010",
      pickingList: "PL72608160009",
    },
    {
      rawOrder: "Order No.：YD-260816-0752\nRefNo.：260816FPTEPC2A\nTracking No. ：GY8DYPNX\nPublic platform order number：YD-260816-0752\nPicking List No.：PL72608160009\nRecipient：Q******h",
      piece: "YD-HM105-B*1",
      picking: "Picking List No.：PL72608160009",
      orderNo: "YD-260816-0752",
      trackingNo: "GY8DYPNX",
      pickingList: "PL72608160009",
    },
    {
      rawOrder: "Order No.：YD-260816-0751\nRefNo.：260816FPMX8YNC\nTracking No. ：SPXVN066273279568\nPublic platform order number：YD-260816-0751\nPicking List No.：PL72608160009\nRecipient：T******n",
      piece: "YD-HM1025-B*1",
      picking: "Picking List No.：PL72608160009",
      orderNo: "YD-260816-0751",
      trackingNo: "SPXVN066273279568",
      pickingList: "PL72608160009",
    },
    {
      rawOrder: "Order No.：YD-260816-0748\nRefNo.：585567674747684791\nTracking No. ：862239549633\nPublic platform order number：YD-260816-0748\nPicking List No.：PL72608160002\nRecipient：H***",
      piece: "YD-B8-4L*1",
      picking: "Picking List No.：PL72608160002",
      orderNo: "YD-260816-0748",
      trackingNo: "862239549633",
      pickingList: "PL72608160002",
    },
    {
      rawOrder: "Order No.：YD-260817-0573\nRefNo.：260817HPDHBXE3\nTracking No. ：GY8D9921471\nPublic platform order number：YD-260817-0573\nPicking List No.：PL72608160009\nRecipient：H******t",
      piece: "YD-W28-2*20",
      picking: "Picking List No.：PL72608160009",
      orderNo: "YD-260817-0573",
      trackingNo: "GY8D9921471",
      pickingList: "PL72608160009",
    },
    {
      rawOrder: "Order No.：YD-260817-0991\nRefNo.：260817LEXTH881\nTracking No. ：LEXTH_64299104\nPublic platform order number：YD-260817-0991\nPicking List No.：PL72608160005\nRecipient：V*** K***",
      piece: "YD-HM96-1*2",
      picking: "Picking List No.：PL72608160005",
      orderNo: "YD-260817-0991",
      trackingNo: "LEXTH_64299104",
      pickingList: "PL72608160005",
    },
  ];

  return parseRawOrderRows(
    sampleData.map((d) => ({
      rawOrderText: d.rawOrder,
      rawPieceText: d.piece,
      rawPickingText: d.picking,
      orderNo: d.orderNo,
      trackingNo: d.trackingNo,
      pickingList: d.pickingList,
    })),
    skuGroups
  );
}

/**
 * Xuất file Excel (.xlsx) với các bảng kết quả đầy đủ & màu sắc chuẩn như Google Sheets
 */
export function exportResultsToExcel(
  orders: RawOrderRow[],
  skuGroups: SkuGroupsMap = DEFAULT_SKU_GROUPS,
  areaOrder: string[] = DEFAULT_AREA_ORDER,
  pickingListFilter?: string,
  carrierFilter?: CarrierCode | string
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Tổng hợp SKU & Gộp PCS
  const { skuResult, pcsGroups } = xuLyGopPCS(orders, pickingListFilter, carrierFilter, skuGroups);
  const skuList = Object.entries(skuResult).sort((a, b) => a[0].localeCompare(b[0]));

  const pcsKeys: string[] = [];
  for (const k in pcsGroups) {
    if (k !== 'MIX' && k !== 'MIX L46') pcsKeys.push(k);
  }
  pcsKeys.sort((a, b) => Number(a) - Number(b));
  if (pcsGroups['MIX L46']) pcsKeys.push('MIX L46');
  if (pcsGroups['MIX']) pcsKeys.push('MIX');

  // Xây dựng matrix sheet 1
  const maxRows = Math.max(
    skuList.length + 1,
    ...pcsKeys.map(k => (pcsGroups[k] || []).length + 1)
  );

  const carrierLabel = carrierFilter && carrierFilter !== 'ALL' ? CARRIER_CONFIG[carrierFilter]?.shortName || carrierFilter : 'TẤT CẢ';

  const sheet1Data: (string | number)[][] = [];
  // Row 0: Headers
  const h1 = ['SKU', 'SỐ LƯỢNG', '', 'PICKING LIST', 'ĐVVC', ...pcsKeys.map(k => (k === 'MIX' || k === 'MIX L46' ? k : `${k} PCS`))];
  sheet1Data.push(h1);

  for (let r = 0; r < maxRows; r++) {
    const rowData: (string | number)[] = [];
    // Cột SKU & Qty (S:T)
    if (r < skuList.length) {
      rowData.push(skuList[r][0], skuList[r][1]);
    } else {
      rowData.push('', '');
    }
    // Cột trống ngăn cách & Picking List & Carrier
    rowData.push('', r === 0 ? (pickingListFilter || 'TẤT CẢ') : '', r === 0 ? carrierLabel : '');

    // Cột PCS
    pcsKeys.forEach(k => {
      const list = pcsGroups[k] || [];
      rowData.push(r < list.length ? list[r] : '');
    });

    sheet1Data.push(rowData);
  }
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'Tong_Hop_SKU_Gop_PCS');

  // 2. Sheet Phân nhóm Khu Vực
  const { donTheoNhom, dynamicAreaList } = xuLyPhanNhomKhuVuc(orders, skuGroups, areaOrder, pickingListFilter, carrierFilter);
  const loaiKeys = ['1 PCS', '2 PCS', '3 PCS', '4 PCS', '5 PCS', '6 PCS', '7 PCS', 'MIX'];
  const activeAreas = dynamicAreaList.filter(nhom => {
    const dataNhom = donTheoNhom[nhom];
    return dataNhom && loaiKeys.some(l => dataNhom[l].length > 0);
  });

  const sheet2Data: string[][] = [];
  // Header 1: Tên khu vực
  const r1: string[] = [];
  const r2: string[] = [];
  activeAreas.forEach(nhom => {
    r1.push(nhom);
    for (let i = 1; i < loaiKeys.length; i++) r1.push('');
    r1.push(''); // Cột trống ngăn cách
    loaiKeys.forEach(l => r2.push(l));
    r2.push(''); // Cột trống ngăn cách
  });
  sheet2Data.push(r1);
  sheet2Data.push(r2);

  // Rows dữ liệu đơn
  let maxAreaRows = 0;
  activeAreas.forEach(nhom => {
    loaiKeys.forEach(l => {
      if (donTheoNhom[nhom][l].length > maxAreaRows) maxAreaRows = donTheoNhom[nhom][l].length;
    });
  });

  for (let r = 0; r < maxAreaRows; r++) {
    const rowArr: string[] = [];
    activeAreas.forEach(nhom => {
      loaiKeys.forEach(l => {
        const arr = donTheoNhom[nhom][l];
        rowArr.push(r < arr.length ? arr[r] : '');
      });
      rowArr.push('');
    });
    sheet2Data.push(rowArr);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, 'Phan_Nhom_Khu_Vuc');

  // 3. Sheet Thảm Yoga
  const yogaResult = xuLyPhanLoaiThamYoga(orders, skuGroups, pickingListFilter, carrierFilter);
  const yogaHeaders: string[] = [];
  const yogaCols: string[][] = [];

  // Yoga buckets
  for (const k in yogaResult.donThamYoga) {
    if (yogaResult.donThamYoga[k].length > 0) {
      if (k === 'MIX_L46') yogaHeaders.push('Thảm Yoga + L46');
      else if (k === 'MIX') yogaHeaders.push('MIX Thảm Yoga');
      else yogaHeaders.push(`Thảm Yoga ${k} PCS`);
      yogaCols.push(yogaResult.donThamYoga[k]);
    }
  }
  // Regular
  for (const k in yogaResult.donThuong) {
    const num = Number(k);
    if (yogaResult.donThuong[num].length > 0) {
      yogaHeaders.push(`${num} PCS Thường`);
      yogaCols.push(yogaResult.donThuong[num]);
    }
  }
  // L46
  if (yogaResult.donL46.length > 0) {
    yogaHeaders.push('Đơn có L46');
    yogaCols.push(yogaResult.donL46.map(it => `${it.orderNo} (${it.qty} PCS)`));
  }
  if (yogaResult.donMix2PCSL46.length > 0) {
    yogaHeaders.push('MIX 2 PCS (L46)');
    yogaCols.push(yogaResult.donMix2PCSL46);
  }
  if (yogaResult.donMixKhac.length > 0) {
    yogaHeaders.push('MIX Khác');
    yogaCols.push(yogaResult.donMixKhac);
  }

  const maxYogaRows = Math.max(1, ...yogaCols.map(c => c.length));
  const sheet3Data: string[][] = [yogaHeaders];
  for (let r = 0; r < maxYogaRows; r++) {
    const rowArr: string[] = [];
    yogaCols.forEach(col => {
      rowArr.push(r < col.length ? col[r] : '');
    });
    sheet3Data.push(rowArr);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  XLSX.utils.book_append_sheet(wb, ws3, 'Phan_Loai_Tham_Yoga');

  // 4. Sheet Bóc Tách Đơn MIX Theo SKU Chủ Đạo
  const mixAnalysis = xuLyPhanTichDonMix(orders, skuGroups, pickingListFilter, 'exclude', carrierFilter);
  const mixExportData: any[] = [];
  mixAnalysis.rankedSkus.forEach((skuSummary, rank) => {
    const coSkusStr = skuSummary.coOccurringSkus
      .map(co => `${co.sku} (${co.totalQty} PCS/${co.orderCount} đơn)`)
      .join(', ');
    const orderListStr = skuSummary.orders.map(o => o.orderNo).join(', ');

    mixExportData.push({
      'Hạng': rank + 1,
      'Mã SKU Chủ Đạo': skuSummary.sku,
      'Khu Vực': skuSummary.area,
      'Tổng SL Lấy Trong Đơn MIX (PCS)': skuSummary.totalQty,
      'Số Đơn MIX Chứa SKU Này': skuSummary.orderCount,
      'Tỷ Lệ / Tổng Đơn MIX': `${((skuSummary.orderCount / (mixAnalysis.totalMixOrders || 1)) * 100).toFixed(1)}%`,
      'Các SKU Thường Mua Kèm': coSkusStr,
      'Danh Sách Mã Đơn Hàng': orderListStr,
    });
  });
  const wsMix = XLSX.utils.json_to_sheet(mixExportData);
  XLSX.utils.book_append_sheet(wb, wsMix, 'Boc_Tach_Don_MIX');

  // 5. Sheet Phân Tách SKU 1 PCS (Xếp Cao ➔ Thấp)
  const skuBreakdown = xuLyPhanTachTheoSKU(orders, skuGroups, '1_PCS', 'order_count_desc', pickingListFilter, carrierFilter);
  const sku1PcsExportData = skuBreakdown.skuList.map((item, idx) => ({
    'Hạng (#)': idx + 1,
    'Mã SKU': item.sku,
    'Khu Vực': item.area,
    'Số Đơn 1 PCS': item.orderCount,
    'Tổng Số Lượng (PCS)': item.totalQty,
    'Tỷ Trọng (%)': `${item.percentage}%`,
    'Danh Sách Order No': item.orderNos.join(', '),
  }));
  const wsSku1Pcs = XLSX.utils.json_to_sheet(sku1PcsExportData);
  XLSX.utils.book_append_sheet(wb, wsSku1Pcs, 'Dong_Goi_Theo_SKU_1PCS');

  // 6. Sheet Dữ liệu đơn gốc
  const filteredOrders = locDonHang(orders, pickingListFilter, carrierFilter);
  const rawExport = filteredOrders.map((o, idx) => ({
    STT: idx + 1,
    'Order No (Cột P)': o.orderNo,
    'Tracking No (Cột Q)': o.trackingNo,
    'ĐVVC': o.carrierName,
    'Picking List (Cột U)': o.pickingList,
    'Tổng PCS': o.totalQty,
    'Chi tiết SKU': o.items.map(it => `${it.sku}*${it.qty}`).join('\n'),
    'Gốc Cột C (Order/Track)': o.rawOrderText,
    'Gốc Cột G (Piece)': o.rawPieceText,
    'Gốc Cột R (Picking)': o.rawPickingText,
  }));
  const ws4 = XLSX.utils.json_to_sheet(rawExport);
  XLSX.utils.book_append_sheet(wb, ws4, 'Du_Lieu_Goc');

  // Tải file xuống
  const plPart = pickingListFilter ? pickingListFilter.replace(/[^a-zA-Z0-9_-]/g, '_') : 'ALL';
  const carrierPart = carrierFilter && carrierFilter !== 'ALL' ? carrierFilter : 'ALL_CARRIERS';
  const fileName = `Tong_Hop_Don_Hang_${plPart}_${carrierPart}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
