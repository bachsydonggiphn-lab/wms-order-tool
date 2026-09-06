/**
 * Mã nguồn Google Apps Script (Code.gs) & Dialog.html
 * Tự động hóa hoàn toàn quy trình xử lý đơn hàng kho trên Google Sheets
 */

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT: TỰ ĐỘNG HÓA TỔNG HỢP SKU & PHÂN LOẠI ĐƠN HÀNG KHO
 * Tên Sheet mục tiêu: "Lọc đơn kho cũ"
 * Tác giả: Quản lý Kho E-commerce
 * Phiên bản: 2.0 (Toàn diện, Chuẩn màu Google Sheets, Kháng lỗi)
 * =========================================================================
 */

// 1. CẤU HÌNH TÊN SHEET & CỘT
const TEN_SHEET_MUC_TIEU = 'Lọc đơn kho cũ';

// 2. DANH MỤC NHÓM SKU & KHU VỰC KHO
const SKU_GROUPS = {
  'YD-A': [
    'YD-A12-1', 'YD-A12-10', 'YD-A12-11', 'YD-A12-12', 'YD-A12-13',
    'YD-A12-2', 'YD-A12-3', 'YD-A12-4', 'YD-A12-5', 'YD-A12-6', 'YD-A12-9'
  ],
  'YD-B': [
    'YD-B8-1L', 'YD-B8-2L', 'YD-B8-4L', 'YD-B8-5L',
    'YD-B9-1L', 'YD-B9-2L', 'YD-B9-4L', 'YD-B9-5L'
  ],
  'YD-D': [
    'YD-D107-1', 'YD-D107-2', 'YD-D107-3', 'YD-D107-4', 'YD-D107-5',
    'YD-D113-1', 'YD-D113-2', 'YD-D113-3',
    'YD-D114-1', 'YD-D114-2', 'YD-D114-3', 'YD-D114-4', 'YD-D114-5', 'YD-D114-6',
    'YD-D120-1', 'YD-D120-2', 'YD-D120-4', 'YD-D120-5',
    'YD-D121-1', 'YD-D121-2',
    'YD-D138-1', 'YD-D138-3',
    'YD-D146-1',
    'YD-D149-3', 'YD-D149-4', 'YD-D149-5',
    'YD-D150-2', 'YD-D150-3', 'YD-D150-4',
    'YD-D162-3', 'YD-D162-4', 'YD-D162-5',
    'YD-D165-5', 'YD-D165-6',
    'YD-D166-6',
    'YD-D171-5',
    'YD-D172-5',
    'YD-D207-3', 'YD-D207-4',
    'YD-D231-1', 'YD-D231-2', 'YD-D231-3', 'YD-D231-4', 'YD-D231-5', 'YD-D231-6',
    'YD-D90-1', 'YD-D90-2'
  ],
  'YD-G': [
    'YD-G39-2', 'YD-G42-4', 'YD-G48-2',
    'YD-G54-1',
    'YD-G84-1',
    'YD-G87-1',
    'YD-G89-1', 'YD-G89-2',
    'YD-G90-1',
    'YD-G91-1',
    'YD-G92-1'
  ],
  'YD-H': [
    'YD-H124-1',
    'YD-H82-1', 'YD-H82-2', 'YD-H82-3', 'YD-H82-4',
    'YD-H83-1', 'YD-H83-2', 'YD-H83-3', 'YD-H83-4'
  ],
  'YD-HM': [
    'YD-HM1025-B', 'YD-HM1025-B2', 'YD-HM1025-B3', 'YD-HM1025-B4',
    'YD-HM105-B', 'YD-HM105-G', 'YD-HM105-N'
  ],
  'YD-HMC': [
    'YD-HMC96-B', 'YD-HMC96-GD', 'YD-HMC96-GN',
    'YD-HMC96-PE', 'YD-HMC96-PK', 'YD-HMC96-W'
  ],
  'YD-HMS': [
    'YD-HMS41-1', 'YD-HMS41-1G', 'YD-HMS41-1W',
    'YD-HMS41-2', 'YD-HMS41-2G', 'YD-HMS41-2W'
  ],
  'YD-K': [
    'YD-K01-1', 'YD-K01-13', 'YD-K01-14', 'YD-K01-2', 'YD-K01-3',
    'YD-K01-4', 'YD-K01-5', 'YD-K01-6', 'YD-K01-7', 'YD-K01-8', 'YD-K01-9',
    'YD-K02-1', 'YD-K02-3', 'YD-K02-4',
    'YD-K03-1', 'YD-K03-2', 'YD-K03-3', 'YD-K03-4',
    'YD-K10-4',
    'YD-K11-1', 'YD-K11-2',
    'YD-K12-1', 'YD-K12-3', 'YD-K12-4',
    'YD-K32-1', 'YD-K32-2', 'YD-K32-3', 'YD-K32-4',
    'YD-K33-1', 'YD-K33-2', 'YD-K33-3', 'YD-K33-4',
    'YD-K34-1', 'YD-K34-2',
    'YD-K44-1',
    'YD-K45-1', 'YD-K45-2', 'YD-K45-3',
    'YD-K52-1',
    'YD-K53-1', 'YD-K53-2',
    'YD-K54-1',
    'YD-K55-1',
    'YD-K56-2', 'YD-K56-3', 'YD-K56-4',
    'YD-K57-1',
    'YD-K58-1',
    'YD-K59-1',
    'YD-K60-1', 'YD-K60-2', 'YD-K60-3'
  ],
  'YD-L': [
    'YD-L08-1',
    'YD-L13-1', 'YD-L13-2',
    'YD-L14-1',
    'YD-L17-1', 'YD-L17-2', 'YD-L17-3', 'YD-L17-5',
    'YD-L22-1', 'YD-L22-2', 'YD-L22-3',
    'YD-L24-1', 'YD-L24-2', 'YD-L24-3', 'YD-L24-4', 'YD-L24-5', 'YD-L24-6',
    'YD-L25-1', 'YD-L25-2', 'YD-L25-3',
    'YD-L27-1', 'YD-L27-2', 'YD-L27-5',
    'YD-L35-1',
    'YD-L38-1',
    'YD-L44-1', 'YD-L44-2', 'YD-L44-3',
    'YD-L46-1',
    'YD-L57-1', 'YD-L57-2',
    'YD-L60-1', 'YD-L60-2', 'YD-L60-3',
    'YD-L65-1', 'YD-L65-2', 'YD-L65-3',
    'YD-L67-1', 'YD-L67-2', 'YD-L67-3',
    'YD-L76-1', 'YD-L76-2', 'YD-L76-3', 'YD-L76-4',
    'YD-L77-1', 'YD-L77-2', 'YD-L77-3', 'YD-L77-4',
    'YD-L80-1', 'YD-L80-2', 'YD-L80-4', 'YD-L80-5',
    'YD-L81-1'
  ],
  'YD-P': [
    'YD-P-Y301-09', 'YD-P-Y301-12', 'YD-P-Y301-B', 'YD-P-Y301-G',
    'YD-P-Y301-G2', 'YD-P-Y301-K', 'YD-P-Y301-P2', 'YD-P-Y301-W',
    'YD-P-Y301-X'
  ],
  'YD-SD': ['YD-SD999'],
  'YD-W': [
    'YD-W127-1',
    'YD-W145-1',
    'YD-W152-1', 'YD-W152-2', 'YD-W152-3', 'YD-W152-4',
    'YD-W152-5', 'YD-W152-6', 'YD-W152-7', 'YD-W152-8',
    'YD-W160-1', 'YD-W160-2',
    'YD-W161-1', 'YD-W161-2', 'YD-W161-3', 'YD-W161-4',
    'YD-W161-5', 'YD-W161-6', 'YD-W161-7',
    'YD-W178-1', 'YD-W178-2', 'YD-W178-3', 'YD-W178-4',
    'YD-W179-1', 'YD-W179-4',
    'YD-W181-2', 'YD-W181-3',
    'YD-W193-1', 'YD-W193-2',
    'YD-W194-1', 'YD-W194-2', 'YD-W194-3',
    'YD-W28-1', 'YD-W28-2', 'YD-W28-3',
    'YD-W31-11', 'YD-W31-12', 'YD-W31-13', 'YD-W31-14', 'YD-W31-15',
    'YD-W75-1',
    'YD-W82-1', 'YD-W82-1-0', 'YD-W82-2', 'YD-W82-2-0',
    'YD-W82-3', 'YD-W82-3-0', 'YD-W82-4', 'YD-W82-4-0',
    'YD-W82-5', 'YD-W82-5-0'
  ],
  'Thảm Yoga': [
    'YD-B8-1L', 'YD-B8-2L', 'YD-B8-4L', 'YD-B8-5L',
    'YD-B9-1L', 'YD-B9-2L', 'YD-B9-4L', 'YD-B9-5L',
    'YD-L28-1L', 'YD-L28-1LB', 'YD-L28-2L', 'YD-L28-2LB',
    'YD-L28-3L', 'YD-L28-3LB',
    'YD-L29-1L', 'YD-L29-1LB', 'YD-L29-2L', 'YD-L29-2LB',
    'YD-L29-3L', 'YD-L29-3LB'
  ]
};

// 3. THỨ TỰ SẮP XẾP KHU VỰC
const THU_TU_KHU_VUC = [
  'YD-A', 'YD-B', 'YD-D', 'YD-G', 'YD-H', 'YD-K',
  'YD-L', 'YD-P', 'YD-W', 'YD-HM', 'YD-SD', 'YD-HMC', 'YD-HMS'
];

/**
 * Tạo Menu tùy chỉnh khi mở bảng tính Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📦 SKU')
    .addItem('📋 Tổng hợp SKU (chỉ SKU)', 'tongHopSKUChiTietTheoList')
    .addItem('📋 Tổng hợp SKU + Gộp PCS', 'tongHopSKUTheoList')
    .addItem('📊 Tổng hợp toàn bộ (Gộp PCS)', 'tongHopSKUToanBo')
    .addSeparator()
    .addItem('🗂️ Bóc tách & Gom đơn MIX (Lấy 1 lần)', 'bocTachDonMixTheoSKUChinh')
    .addItem('🧘 Phân loại Thảm Yoga', 'phanLoaiThamYoga')
    .addItem('🔍 Lọc đơn 1 PCS theo nhóm', 'locDon1PCSTheoNhom')
    .addItem('📦 Gộp theo PCS (toàn bộ)', 'gopTheoPCS')
    .addItem('🗂️ Phân nhóm khu vực (toàn bộ)', 'phanNhomKhuVuc')
    .addSeparator()
    .addItem('👁️ Xem kết quả tổng hợp', 'xemKetQuaTongHop')
    .addItem('🗑️ Xóa dữ liệu tổng hợp', 'xoaDuLieuTongHop')
    .addItem('⚙️ Chèn lại nút bấm', 'chenNutTienIch')
    .addToUi();
}

/**
 * Lấy Sheet mục tiêu và kiểm tra hợp lệ
 */
function laySheetMucTieu() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TEN_SHEET_MUC_TIEU);
  if (!sheet) {
    // Nếu không tìm thấy tên chính xác, thử lấy sheet đầu tiên đang mở
    sheet = ss.getActiveSheet();
  }
  return sheet;
}

/**
 * Trích xuất mã Picking List từ khối văn bản nhiều dòng
 * Hỗ trợ cả dấu hai chấm ':' và '：', khoảng trắng, không phân biệt hoa thường
 */
function layMaPickingList(giaTri) {
  if (!giaTri) return '';
  const str = String(giaTri);
  // Regex tìm dòng có chứa "Picking List No."
  const match = str.match(/Picking\s*List\s*No\.\s*[:：]\s*([A-Za-z0-9_-]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  // Dự phòng: Tìm bất kỳ chuỗi PL bắt đầu với số (VD: PL72608150031)
  const matchPL = str.match(/\b(PL[0-9A-Za-z]+)\b/i);
  return matchPL ? matchPL[1].trim() : '';
}

/**
 * Trích xuất dòng đầu tiên bắt đầu bằng "YD-" từ một ô nhiều dòng
 */
function layMaYDChinh(giaTri) {
  if (!giaTri) return '';
  const lines = String(giaTri).split(/\\r?\\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.toUpperCase().startsWith('YD-')) {
      return line;
    }
  }
  return '';
}

/**
 * Kiểm tra xem chuỗi có phải là metadata WMS hay RefNo không
 */
function laMetadataWMS(text) {
  if (!text) return true;
  const str = String(text).trim();
  const lower = str.toLowerCase();
  if (
    lower.includes('refno') ||
    lower.includes('ref no') ||
    lower.includes('ref.') ||
    lower.includes('ref：') ||
    lower.includes('ref:') ||
    lower.includes('reference') ||
    lower.includes('order no') ||
    lower.includes('tracking no') ||
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
    lower.includes('status') ||
    lower.includes('shipped') ||
    lower.includes('general')
  ) {
    return true;
  }
  // Bắt đầu bằng 4 số trở lên (RefNo, ngày tháng: 260816..., 58557...)
  if (/^\\d{4,}/.test(str)) return true;
  return false;
}

/**
 * Kiểm tra mã SKU hợp lệ (loại bỏ RefNo, OrderNo, Tracking...)
 */
function laSKUHopLe(sku) {
  if (!sku) return false;
  const clean = String(sku).trim();
  if (clean.length < 2 || clean.length > 35) return false;
  if (laMetadataWMS(clean)) return false;
  if (clean.includes(':') || clean.includes('：') || clean.includes('\\t')) return false;
  if (/^\\d{3,}/.test(clean)) return false;
  if (/^YD-\\d{4,8}-\\d+$/i.test(clean)) return false;
  if (/^(SPXVN|PL72|LEXTH|GY8D|VN02|PL\\d{6,})/i.test(clean)) return false;
  if (/^\\d+$/.test(clean)) return false;
  if (!/[A-Za-z]/.test(clean)) return false;
  return true;
}

/**
 * Tách danh sách SKU và số lượng từ cột G
 * Bỏ qua dòng phụ (mã rút gọn) không theo định dạng SKU*qty
 */
function tachSKUVaSoLuong(chuoiG) {
  const items = [];
  if (!chuoiG) return items;

  const lines = String(chuoiG).split(/\\r?\\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || laMetadataWMS(line)) continue;

    // Định dạng: SKU*Qty (VD: "YD-A12-1*2", "YD-D107-1 * 1")
    const match = line.match(/^([A-Za-z0-9_.-]+)\\s*\\*\\s*(\\d+)/);
    if (match) {
      const sku = match[1].trim();
      const qty = parseInt(match[2], 10) || 1;
      if (laSKUHopLe(sku) && qty > 0) {
        items.push({ sku: sku, qty: qty });
      }
    } else {
      if (laSKUHopLe(line)) {
        items.push({ sku: line, qty: 1 });
      }
    }
  }
  return items;
}

/**
 * Tự động trích xuất tiền tố nhóm (Area Prefix) từ mã SKU
 * Tự động phân tích cấu trúc mã mà không fix cứng:
 *  - "YD-A2-1*1" -> "YD-A2"
 *  - "YD-AB-12" -> "YD-AB"
 *  - "YD-AB12-1" -> "YD-AB"
 *  - "YD-HMS41-1" -> "YD-HMS"
 *  - "YD-HMC96-GN" -> "YD-HMC"
 *  - "YD-HM1025-B" -> "YD-HM"
 *  - "YD-SD12-1" -> "YD-SD"
 *  - "YD-W161-2" -> "YD-W"
 *  - "YD-D114-2" -> "YD-D"
 *  - "AA-12-1" -> "AA"
 *  - "BB-45-1" -> "BB"
 *  - "CC-78-1" -> "CC"
 */
function layTienToNhomSKU(sku) {
  if (!sku) return 'Khác';
  const cleanSku = String(sku).trim().toUpperCase();

  // 1. Kiểm tra trong danh mục SKU_GROUPS cấu hình sẵn
  for (let nhom in SKU_GROUPS) {
    if (nhom === 'Thảm Yoga') continue;
    if (SKU_GROUPS[nhom] && SKU_GROUPS[nhom].indexOf(cleanSku) !== -1) {
      return nhom;
    }
  }

  // 2. Nếu bắt đầu bằng YD-
  if (cleanSku.startsWith('YD-')) {
    const afterYD = cleanSku.slice(3);
    
    // 2a. Phân tách bởi dấu gạch nối (VD: "YD-A2-1", "YD-AB-12", "YD-HMS-41")
    const hyphenMatch = afterYD.match(/^([A-Z0-9]{1,8})(?=-)/);
    if (hyphenMatch && hyphenMatch[1]) {
      const segment = hyphenMatch[1];
      const ldMatch = segment.match(/^([A-Z]+)(\\d+)$/);
      if (ldMatch) {
        const letters = ldMatch[1];
        const digits = ldMatch[2];
        if (digits.length === 1 && letters.length <= 2) {
          return 'YD-' + segment; // VD: YD-A2, YD-B1
        }
        return 'YD-' + letters; // VD: YD-W, YD-D, YD-HM
      }
      return 'YD-' + segment;
    }

    // 2b. Chữ dính liền số (VD: "YD-HMC96-GN", "YD-HMS41-1", "YD-HM1025-B", "YD-AB12-1", "YD-W75-1")
    const letterMatch = afterYD.match(/^([A-Z]+)(?=\\d)/);
    if (letterMatch && letterMatch[1]) {
      return 'YD-' + letterMatch[1];
    }

    // 2c. Chữ + 1 số dính liền (VD: "YD-A212-1" -> "YD-A2")
    const subMatch = afterYD.match(/^([A-Z]{1,2}\\d)(?=\\d{2,}|-)/);
    if (subMatch && subMatch[1]) {
      return 'YD-' + subMatch[1];
    }

    const fallback = afterYD.match(/^([A-Z0-9]+)/);
    if (fallback && fallback[1]) {
      return 'YD-' + fallback[1];
    }
  }

  // 3. Nhóm ngoài YD- (VD: "AA-12-1", "BB-45-1", "CC-78-1", "AA12-1")
  const nonYdHyphen = cleanSku.match(/^([A-Z0-9]{1,8})(?=-)/);
  if (nonYdHyphen && nonYdHyphen[1]) {
    const seg = nonYdHyphen[1];
    const ldMatch = seg.match(/^([A-Z]+)(\\d{2,})$/);
    if (ldMatch) {
      return ldMatch[1];
    }
    return seg;
  }

  const nonYdLetters = cleanSku.match(/^([A-Z]{1,6})(?=\\d)/);
  if (nonYdLetters && nonYdLetters[1]) {
    return nonYdLetters[1];
  }

  return 'Khác';
}

/**
 * Tìm khu vực chính của đơn hàng dựa trên danh sách SKU (hỗ trợ nhóm động)
 */
function timKhuVucCuaDon(items) {
  if (!items || items.length === 0) return 'Khác';

  const groupsFound = new Set();
  items.forEach(function(item) {
    const nhom = layTienToNhomSKU(item.sku);
    groupsFound.add(nhom);
  });

  if (groupsFound.size === 1) {
    return Array.from(groupsFound)[0];
  }
  return 'MIX';
}

/**
 * Kiểm tra xem đơn hàng có chứa Thảm Yoga hay không
 */
function laDonThamYoga(items) {
  const yogaList = SKU_GROUPS['Thảm Yoga'] || [];
  return items.some(function(item) {
    return yogaList.includes(item.sku);
  });
}

/**
 * Kiểm tra xem đơn hàng có SKU YD-L46-1 không
 */
function coSkuL46(items) {
  return items.some(function(item) {
    return item.sku === 'YD-L46-1' || item.sku.includes('L46');
  });
}

/**
 * Tự động cập nhật Cột P (Order No) & Cột Q (Tracking No) từ Cột C
 */
function capNhatOrderTracking(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Lấy dữ liệu Cột C (Cột 3)
  const colCValues = sheet.getRange(2, 3, lastRow - 1, 1).getDisplayValues();
  const outP = [];
  const outQ = [];

  for (let i = 0; i < colCValues.length; i++) {
    const textC = colCValues[i][0] || '';
    
    // Tìm Order No. (VD: "Order No.：YD-260815-2843" hoặc "Order No.: YD-...")
    const orderMatch = textC.match(/Order\\s*No\\.?\\s*[:：]\\s*([A-Za-z0-9_-]+)/i);
    let orderNo = orderMatch ? orderMatch[1].trim() : '';
    if (!orderNo) {
      const ydMatch = textC.match(/\\b(YD-[0-9A-Za-z-]+)\\b/);
      if (ydMatch) orderNo = ydMatch[1].trim();
    }

    // Tìm Tracking No. (VD: "Tracking No. ：SPXVN064258614848")
    const trackMatch = textC.match(/Tracking\\s*No\\.?\\s*[:：]\\s*([A-Za-z0-9_-]+)/i);
    const trackingNo = trackMatch ? trackMatch[1].trim() : '';

    outP.push([orderNo]);
    outQ.push([trackingNo]);
  }

  // Ghi vào Cột P (Cột 16) và Cột Q (Cột 17)
  sheet.getRange(2, 16, outP.length, 1).setValues(outP);
  sheet.getRange(2, 17, outQ.length, 1).setValues(outQ);
}

/**
 * Tự động trích xuất mã Picking List từ Cột R ghi vào Cột U
 */
function capNhatPickingList(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Lấy dữ liệu Cột R (Cột 18)
  const colRValues = sheet.getRange(2, 18, lastRow - 1, 1).getDisplayValues();
  const outU = [];

  for (let i = 0; i < colRValues.length; i++) {
    const textR = colRValues[i][0] || '';
    const pl = layMaPickingList(textR);
    outU.push([pl]);
  }

  // Ghi vào Cột U (Cột 21)
  sheet.getRange(2, 21, outU.length, 1).setValues(outU);
}

/**
 * Lấy danh sách toàn bộ đơn hàng đã chuẩn hóa từ Sheet
 */
function layDuLieuDonHang(sheet, locPickingList) {
  // Cập nhật các cột P, Q, U trước
  capNhatOrderTracking(sheet);
  capNhatPickingList(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  // Đọc toàn bộ các cột từ A đến U (Cột 1 đến 21)
  const data = sheet.getRange(2, 1, lastRow - 1, 21).getDisplayValues();
  const donHangs = [];

  // Chuẩn hóa chuỗi lọc Picking List nếu có
  let plFilter = '';
  if (locPickingList) {
    plFilter = layMaPickingList(locPickingList) || String(locPickingList).trim();
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const pieceText = row[6] || '';       // Cột G (index 6)
    let orderNo = row[15] || '';          // Cột P (index 15)
    const trackingNo = row[16] || '';     // Cột Q (index 16)
    const pickingList = row[20] || '';    // Cột U (index 20)

    // Nếu cột P trống, thử tìm từ cột C
    if (!orderNo) {
      const textC = row[2] || '';
      const orderMatch = textC.match(/Order\\s*No\\.?\\s*[:：]\\s*([A-Za-z0-9_-]+)/i);
      orderNo = orderMatch ? orderMatch[1].trim() : ('ĐƠN_' + (i + 1));
    }

    // Lọc theo Picking List nếu có chỉ định
    if (plFilter && pickingList && pickingList.toUpperCase() !== plFilter.toUpperCase()) {
      continue;
    }

    const items = tachSKUVaSoLuong(pieceText);
    let totalQty = 0;
    items.forEach(function(it) { totalQty += it.qty; });

    // Nếu không có SKU, bỏ qua dòng trống
    if (items.length === 0 && !orderNo) continue;

    donHangs.push({
      rowIndex: i + 2,
      orderNo: orderNo,
      trackingNo: trackingNo,
      pickingList: pickingList,
      items: items,
      totalQty: totalQty,
      hasYoga: laDonThamYoga(items),
      hasL46: coSkuL46(items),
      area: timKhuVucCuaDon(items)
    });
  }

  return donHangs;
}

/**
 * 1. TỔNG HỢP SKU CHI TIẾT THEO LIST (Chỉ Cột S:T)
 * Lọc theo Picking List ở ô V1 (nếu có), đếm SKU và ghi vào S:T
 */
function tongHopSKUChiTietTheoList() {
  const sheet = laySheetMucTieu();
  if (!sheet) return;

  const locV1 = sheet.getRange('V1').getDisplayValue().trim();
  const donHangs = layDuLieuDonHang(sheet, locV1);

  if (donHangs.length === 0) {
    SpreadsheetApp.getUi().alert('⚠️ Thông báo', 'Không tìm thấy đơn hàng nào phù hợp' + (locV1 ? ' với Picking List: ' + locV1 : '') + '.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Xóa vùng S:T cũ
  const maxRows = sheet.getMaxRows();
  sheet.getRange('S1:T' + maxRows).clear({ contentsOnly: false });

  // Gom số lượng theo SKU
  const skuMap = {};
  donHangs.forEach(function(don) {
    don.items.forEach(function(it) {
      skuMap[it.sku] = (skuMap[it.sku] || 0) + it.qty;
    });
  });

  // Chuyển thành mảng và sắp xếp giảm dần theo số lượng
  const skuList = Object.keys(skuMap).map(function(k) {
    return [k, skuMap[k]];
  });
  skuList.sort(function(a, b) {
    return b[1] - a[1]; // Sắp xếp số lượng lớn nhất lên đầu
  });

  // Tạo tiêu đề
  const tieuDe = [['MÃ SKU', 'SỐ LƯỢNG']];
  sheet.getRange('S1:T1').setValues(tieuDe)
    .setBackground('#1A73E8')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  if (skuList.length > 0) {
    const rowCount = skuList.length;
    const rangeData = sheet.getRange(2, 19, rowCount, 2);
    rangeData.setValues(skuList)
      .setFontFamily('Roboto')
      .setFontSize(10);
    
    // Canh lề
    sheet.getRange(2, 19, rowCount, 1).setHorizontalAlignment('left').setFontWeight('medium');
    sheet.getRange(2, 20, rowCount, 1).setHorizontalAlignment('right').setNumberFormat('#,##0');

    // Dòng TỔNG CỘNG
    const totalRow = rowCount + 2;
    let tongSoLuong = 0;
    skuList.forEach(function(it) { tongSoLuong += it[1]; });

    sheet.getRange(totalRow, 19).setValue('TỔNG CỘNG').setFontWeight('bold').setBackground('#E8F0FE');
    sheet.getRange(totalRow, 20).setValue(tongSoLuong).setFontWeight('bold').setBackground('#E8F0FE').setNumberFormat('#,##0');

    // Viền bảng
    sheet.getRange(1, 19, rowCount + 2, 2).setBorder(true, true, true, true, true, true, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);
  }

  sheet.autoResizeColumn(19);
  sheet.autoResizeColumn(20);

  SpreadsheetApp.getActiveSpreadsheet().toast('Đã tổng hợp thành công ' + skuList.length + ' mã SKU!', '✅ Hoàn Tất', 3);
}

/**
 * 2. TỔNG HỢP SKU + GỘP PCS (Cột S:T & Cột X trở đi)
 * Có lọc theo ô V1
 */
function tongHopSKUTheoList() {
  const sheet = laySheetMucTieu();
  if (!sheet) return;

  const locV1 = sheet.getRange('V1').getDisplayValue().trim();
  thucHienTongHopVaGopPCS(sheet, locV1);
}

/**
 * 3. TỔNG HỢP TOÀN BỘ (GỘP PCS)
 * Không lọc theo V1, xử lý 100% đơn hàng
 */
function tongHopSKUToanBo() {
  const sheet = laySheetMucTieu();
  if (!sheet) return;

  thucHienTongHopVaGopPCS(sheet, '');
}

/**
 * Hàm lõi thực hiện Tổng Hợp SKU + Gộp PCS
 */
function thucHienTongHopVaGopPCS(sheet, plFilter) {
  const donHangs = layDuLieuDonHang(sheet, plFilter);

  if (donHangs.length === 0) {
    SpreadsheetApp.getUi().alert('⚠️ Thông báo', 'Không có đơn hàng nào để xử lý.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const maxCols = sheet.getMaxColumns();
  const maxRows = sheet.getMaxRows();

  // Xóa vùng S:T và từ X trở đi
  sheet.getRange('S1:T' + maxRows).clear({ contentsOnly: false });
  if (maxCols >= 24) {
    sheet.getRange(1, 24, maxRows, maxCols - 23).clear({ contentsOnly: false });
  }

  // 1. TỔNG HỢP SKU VÀO S:T
  const skuMap = {};
  donHangs.forEach(function(don) {
    don.items.forEach(function(it) {
      skuMap[it.sku] = (skuMap[it.sku] || 0) + it.qty;
    });
  });

  const skuList = Object.keys(skuMap).map(function(k) {
    return [k, skuMap[k]];
  });
  skuList.sort(function(a, b) { return b[1] - a[1]; });

  sheet.getRange('S1:T1').setValues([['MÃ SKU', 'SỐ LƯỢNG']])
    .setBackground('#1A73E8')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  if (skuList.length > 0) {
    sheet.getRange(2, 19, skuList.length, 2).setValues(skuList);
    sheet.getRange(skuList.length + 2, 19, 1, 2).setValues([['TỔNG CỘNG', '=SUM(T2:T' + (skuList.length + 1) + ')']])
      .setFontWeight('bold')
      .setBackground('#E8F0FE');
    sheet.getRange(1, 19, skuList.length + 2, 2).setBorder(true, true, true, true, true, true, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);
  }

  // 2. GỘP THEO PCS TỪ CỘT X TRỞ ĐI
  // Các nhóm: 1 PCS, 2 PCS, 3 PCS, 4 PCS, 5 PCS, 6 PCS, 7 PCS, MIX L46, MIX
  const pcsGroups = {
    '1 PCS': [],
    '2 PCS': [],
    '3 PCS': [],
    '4 PCS': [],
    '5 PCS': [],
    '6 PCS': [],
    '7 PCS': [],
    'MIX L46': [],
    'MIX': []
  };

  donHangs.forEach(function(don) {
    const isSingleSku = don.items.length === 1;
    const qty = don.totalQty;
    const hasL46 = don.hasL46;

    if (isSingleSku && qty >= 1 && qty <= 7) {
      pcsGroups[qty + ' PCS'].push(don.orderNo);
    } else if (hasL46) {
      pcsGroups['MIX L46'].push(don.orderNo);
    } else {
      pcsGroups['MIX'].push(don.orderNo);
    }
  });

  const cotBatDau = 24; // Cột X
  const cacCot = ['1 PCS', '2 PCS', '3 PCS', '4 PCS', '5 PCS', '6 PCS', '7 PCS', 'MIX L46', 'MIX'];
  
  cacCot.forEach(function(tenNhom, idx) {
    const colIndex = cotBatDau + idx;
    const list = pcsGroups[tenNhom] || [];

    // Header màu sắc đẹp
    let bgHeader = '#1A73E8'; // Xanh chuẩn
    if (tenNhom === 'MIX L46') bgHeader = '#D97706'; // Vàng cam
    if (tenNhom === 'MIX') bgHeader = '#7C3AED';     // Tím

    sheet.getRange(1, colIndex).setValue(tenNhom + ' (' + list.length + ')')
      .setBackground(bgHeader)
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');

    if (list.length > 0) {
      const data2D = list.map(function(orderNo) { return [orderNo]; });
      sheet.getRange(2, colIndex, data2D.length, 1)
        .setValues(data2D)
        .setFontFamily('Roboto')
        .setFontSize(10)
        .setHorizontalAlignment('center');

      sheet.getRange(1, colIndex, data2D.length + 1, 1)
        .setBorder(true, true, true, true, true, true, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);
    }
    sheet.autoResizeColumn(colIndex);
  });

  sheet.autoResizeColumn(19);
  sheet.autoResizeColumn(20);

  SpreadsheetApp.getActiveSpreadsheet().toast('Đã hoàn thành Tổng hợp SKU & Gộp PCS (' + donHangs.length + ' đơn)!', '✅ Hoàn Tất', 3);
}

/**
 * 4. PHÂN LOẠI THẢM YOGA & ĐƠN ĐẶC BIỆT (L46)
 * Tách riêng đơn Thảm Yoga theo PCS, đơn có L46, đơn thông thường
 */
function phanLoaiThamYoga() {
  const sheet = laySheetMucTieu();
  if (!sheet) return;

  const locV1 = sheet.getRange('V1').getDisplayValue().trim();
  const donHangs = layDuLieuDonHang(sheet, locV1);

  if (donHangs.length === 0) {
    SpreadsheetApp.getUi().alert('⚠️ Thông báo', 'Không có đơn hàng nào.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const maxCols = sheet.getMaxColumns();
  const maxRows = sheet.getMaxRows();
  if (maxCols >= 24) {
    sheet.getRange(1, 24, maxRows, maxCols - 23).clear({ contentsOnly: false });
  }

  // Khởi tạo các nhóm
  const yogaGroups = {
    'Thảm 1 PCS': [],
    'Thảm 2 PCS': [],
    'Thảm 3 PCS': [],
    'Thảm + L46': [],
    'MIX Thảm': [],
    'Đơn L46': [],
    'MIX 2 PCS (L46)': [],
    'MIX Khác': [],
    '1 PCS Thường': [],
    '2 PCS Thường': [],
    '3 PCS Thường': [],
    '4+ PCS Thường': []
  };

  donHangs.forEach(function(don) {
    const isYoga = don.hasYoga;
    const isL46 = don.hasL46;
    const qty = don.totalQty;
    const isSingleSku = don.items.length === 1;

    // Điều kiện nghiêm ngặt: Chỉ đơn có đúng 2 items: 1 Thảm Yoga (qty = 1) và 1 YD-L46-1 (qty = 1), tổng đúng 2 PCS
    const isStrictYogaPlusL46 = 
      don.items.length === 2 && 
      qty === 2 && 
      don.items.some(function(it) { return SKU_GROUPS['Thảm Yoga'] && SKU_GROUPS['Thảm Yoga'].indexOf(it.sku) !== -1 && it.qty === 1; }) &&
      don.items.some(function(it) { return (it.sku === 'YD-L46-1' || it.sku.indexOf('L46') !== -1) && it.qty === 1; });

    if (isYoga) {
      if (isStrictYogaPlusL46) {
        yogaGroups['Thảm + L46'].push(don.orderNo);
      } else if (isSingleSku && qty === 1) {
        yogaGroups['Thảm 1 PCS'].push(don.orderNo);
      } else if (isSingleSku && qty === 2) {
        yogaGroups['Thảm 2 PCS'].push(don.orderNo);
      } else if (isSingleSku && qty === 3) {
        yogaGroups['Thảm 3 PCS'].push(don.orderNo);
      } else {
        yogaGroups['MIX Thảm'].push(don.orderNo);
      }
    } else if (isL46) {
      if (qty === 2 && don.items.length === 2) {
        yogaGroups['MIX 2 PCS (L46)'].push(don.orderNo);
      } else {
        yogaGroups['Đơn L46'].push(don.orderNo);
      }
    } else if (!isSingleSku) {
      yogaGroups['MIX Khác'].push(don.orderNo);
    } else {
      if (qty === 1) yogaGroups['1 PCS Thường'].push(don.orderNo);
      else if (qty === 2) yogaGroups['2 PCS Thường'].push(don.orderNo);
      else if (qty === 3) yogaGroups['3 PCS Thường'].push(don.orderNo);
      else yogaGroups['4+ PCS Thường'].push(don.orderNo);
    }
  });

  const cotBatDau = 24;
  const cacNhom = Object.keys(yogaGroups);

  cacNhom.forEach(function(tenNhom, idx) {
    const colIndex = cotBatDau + idx;
    const list = yogaGroups[tenNhom] || [];

    let bg = '#059669'; // Xanh lá ngọc cho Thảm Yoga
    if (tenNhom.includes('L46')) bg = '#D97706'; // Cam L46
    if (tenNhom.includes('MIX Khác')) bg = '#7C3AED'; // Tím
    if (tenNhom.includes('Thường')) bg = '#2563EB'; // Xanh dương

    sheet.getRange(1, colIndex).setValue(tenNhom + ' (' + list.length + ')')
      .setBackground(bg)
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');

    if (list.length > 0) {
      const data2D = list.map(function(it) { return [it]; });
      sheet.getRange(2, colIndex, data2D.length, 1)
        .setValues(data2D)
        .setFontFamily('Roboto')
        .setFontSize(10)
        .setHorizontalAlignment('center');
      
      sheet.getRange(1, colIndex, data2D.length + 1, 1)
        .setBorder(true, true, true, true, true, true, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);
    }
    sheet.autoResizeColumn(colIndex);
  });

  SpreadsheetApp.getActiveSpreadsheet().toast('Đã phân loại xong Thảm Yoga & L46!', '✅ Hoàn Tất', 3);
}

/**
 * 5. GỘP THEO PCS (TOÀN BỘ)
 * Chỉ gộp theo số lượng PCS cho toàn bộ đơn hàng
 */
function gopTheoPCS() {
  tongHopSKUToanBo();
}

/**
 * 6. PHÂN NHÓM KHU VỰC KHO (TOÀN BỘ)
 * Phân bổ từng khu vực (YD-A, YD-B, ...) với các cột con 1 PCS -> 7 PCS, MIX
 */
function phanNhomKhuVuc() {
  const sheet = laySheetMucTieu();
  if (!sheet) return;

  const locV1 = sheet.getRange('V1').getDisplayValue().trim();
  const donHangs = layDuLieuDonHang(sheet, locV1);

  if (donHangs.length === 0) {
    SpreadsheetApp.getUi().alert('⚠️ Thông báo', 'Không có đơn hàng nào.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  const maxCols = sheet.getMaxColumns();
  const maxRows = sheet.getMaxRows();
  if (maxCols >= 24) {
    sheet.getRange(1, 24, maxRows, maxCols - 23).clear({ contentsOnly: false });
  }

  // Khởi tạo ma trận dữ liệu theo khu vực: 5 cột chuẩn [1 PCS, 2 PCS, 3 PCS, 4+ PCS, MIX]
  const subCols = ['1 PCS', '2 PCS', '3 PCS', '4+ PCS', 'MIX'];
  const areaData = {};
  THU_TU_KHU_VUC.forEach(function(nhom) {
    areaData[nhom] = {
      '1 PCS': [],
      '2 PCS': [],
      '3 PCS': [],
      '4+ PCS': [],
      'MIX': []
    };
  });

  donHangs.forEach(function(don) {
    const area = don.area;
    const qty = don.totalQty;
    const isSingleSku = don.items.length === 1;

    if (areaData[area]) {
      if (isSingleSku) {
        if (qty === 1) {
          areaData[area]['1 PCS'].push(don.orderNo);
        } else if (qty === 2) {
          areaData[area]['2 PCS'].push(don.orderNo);
        } else if (qty === 3) {
          areaData[area]['3 PCS'].push(don.orderNo);
        } else {
          areaData[area]['4+ PCS'].push(don.orderNo); // 1 SKU có số lượng >= 4 chiếc (VD: YD-W28-2*20)
        }
      } else {
        // ĐƠN MIX THỰC SỰ: Có từ 2 SKU/mặt hàng khác nhau trở lên
        areaData[area]['MIX'].push(don.orderNo);
      }
    }
  });

  let currentCol = 24; // Cột X

  THU_TU_KHU_VUC.forEach(function(nhom) {
    const numSubCols = 5;

    // Dòng 1: Header Khu Vực Merge 5 cột (Nền Xanh Dương #1A73E8)
    sheet.getRange(1, currentCol, 1, numSubCols)
      .merge()
      .setValue(nhom)
      .setBackground('#1A73E8')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setFontSize(11)
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');

    // Dòng 2: 5 Sub-headers [1 PCS, 2 PCS, 3 PCS, 4+ PCS, MIX] (Nền Xanh Lá #34A853)
    for (let i = 0; i < numSubCols; i++) {
      const subName = subCols[i];
      const colIdx = currentCol + i;
      const list = areaData[nhom][subName] || [];

      sheet.getRange(2, colIdx).setValue(subName)
        .setBackground('#34A853')
        .setFontColor('#FFFFFF')
        .setFontWeight('bold')
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');

      if (list.length > 0) {
        const data2D = list.map(function(o) { return [o]; });
        sheet.getRange(3, colIdx, data2D.length, 1)
          .setValues(data2D)
          .setFontFamily('Roboto')
          .setFontSize(10)
          .setHorizontalAlignment('center')
          .setVerticalAlignment('middle');

        sheet.getRange(2, colIdx, data2D.length + 1, 1)
          .setBorder(true, true, true, true, true, true, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);
      }

      sheet.setColumnWidth(colIdx, 130);
    }

    // Cột phân cách giữa các nhóm (độ rộng 25px)
    const sepCol = currentCol + numSubCols;
    sheet.setColumnWidth(sepCol, 25);

    currentCol += numSubCols + 1;
  });

  SpreadsheetApp.getActiveSpreadsheet().toast('Đã phân nhóm 13 khu vực kho hoàn tất!', '✅ Hoàn Tất', 3);
}

/**
 * 7. LỌC ĐƠN 1 PCS THEO TỪNG NHÓM KHU VỰC
 * Chỉ lấy các đơn đúng 1 món duy nhất với số lượng = 1
 */
function locDon1PCSTheoNhom() {
  const sheet = laySheetMucTieu();
  if (!sheet) return;

  const locV1 = sheet.getRange('V1').getDisplayValue().trim();
  const donHangs = layDuLieuDonHang(sheet, locV1);

  const maxCols = sheet.getMaxColumns();
  const maxRows = sheet.getMaxRows();
  if (maxCols >= 24) {
    sheet.getRange(1, 24, maxRows, maxCols - 23).clear({ contentsOnly: false });
  }

  // Khởi tạo các nhóm
  const singlePcsByArea = {};
  THU_TU_KHU_VUC.forEach(function(nhom) {
    singlePcsByArea[nhom] = [];
  });

  let totalSingle = 0;
  donHangs.forEach(function(don) {
    if (don.items.length === 1 && don.totalQty === 1) {
      totalSingle++;
      const area = don.area;
      if (singlePcsByArea[area]) {
        singlePcsByArea[area].push(don.orderNo);
      }
    }
  });

  let currentCol = 24;
  THU_TU_KHU_VUC.forEach(function(nhom) {
    const list = singlePcsByArea[nhom] || [];
    
    sheet.getRange(1, currentCol).setValue(nhom + ' (1 PCS: ' + list.length + ')')
      .setBackground('#D97706')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');

    if (list.length > 0) {
      const data2D = list.map(function(o) { return [o]; });
      sheet.getRange(2, currentCol, data2D.length, 1)
        .setValues(data2D)
        .setFontFamily('Roboto')
        .setFontSize(10)
        .setHorizontalAlignment('center');

      sheet.getRange(1, currentCol, data2D.length + 1, 1)
        .setBorder(true, true, true, true, true, true, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);
    }

    sheet.autoResizeColumn(currentCol);
    currentCol++;
  });

  SpreadsheetApp.getActiveSpreadsheet().toast('Đã lọc ' + totalSingle + ' đơn 1 PCS theo từng nhóm!', '✅ Hoàn Tất', 3);
}

/**
 * 7.5. BÓC TÁCH ĐƠN MIX THEO SKU CHỦ ĐẠO (1-TRIP PICKING BATCH)
 * Tự động phân tích đơn MIX, tìm SKU chiếm số lượng lớn nhất để nhân viên lấy 1 lần.
 */
function bocTachDonMixTheoSKUChinh() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = laySheetMucTieu();
  if (!sheet) return;

  const locV1 = sheet.getRange('V1').getDisplayValue().trim();
  const donHangs = layDuLieuDonHang(sheet, locV1);

  // Lọc các đơn MIX (có từ 2 món trở lên và LOẠI TRỪ Thảm Yoga)
  const donMix = donHangs.filter(function(d) { 
    return d.items && d.items.length > 1 && !d.hasYoga; 
  });

  if (donMix.length === 0) {
    SpreadsheetApp.getUi().alert('Thông báo', 'Không có đơn hàng MIX nào để phân tích bóc tách.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Tạo hoặc lấy Sheet "Bóc Tách Đơn MIX"
  let sheetMix = ss.getSheetByName('Bóc Tách Đơn MIX');
  if (!sheetMix) {
    sheetMix = ss.insertSheet('Bóc Tách Đơn MIX');
  } else {
    sheetMix.clear();
  }

  // Tổng hợp các SKU trong đơn MIX
  const skuMap = {};
  donMix.forEach(function(don) {
    don.items.forEach(function(it) {
      if (!skuMap[it.sku]) {
        skuMap[it.sku] = {
          sku: it.sku,
          area: layTienToNhomSKU(it.sku),
          totalQty: 0,
          orderCount: 0,
          orders: []
        };
      }
      skuMap[it.sku].totalQty += it.qty;
      skuMap[it.sku].orderCount += 1;
      skuMap[it.sku].orders.push(don.orderNo);
    });
  });

  const rankedSkus = Object.keys(skuMap).map(function(k) { return skuMap[k]; });
  rankedSkus.sort(function(a, b) { return b.totalQty - a.totalQty || b.orderCount - a.orderCount; });

  // Ghi bảng kết quả vào Sheet
  const headers = ['HẠNG', 'MÃ SKU CHỦ ĐẠO', 'KHU VỰC KỆ', 'TỔNG SL CẦN LẤY (PCS)', 'SỐ ĐƠN MIX CÓ MÃ NÀY', 'DANH SÁCH MÃ ĐƠN HÀNG (COPY)'];
  sheetMix.getRange('A1:F1').setValues([headers])
    .setBackground('#1E3A8A')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const rows = [];
  rankedSkus.forEach(function(item, idx) {
    rows.push([
      idx + 1,
      item.sku,
      item.area,
      item.totalQty,
      item.orderCount,
      item.orders.join(', ')
    ]);
  });

  if (rows.length > 0) {
    sheetMix.getRange(2, 1, rows.length, 6).setValues(rows);
    sheetMix.getRange(2, 1, rows.length, 1).setHorizontalAlignment('center');
    sheetMix.getRange(2, 2, rows.length, 1).setFontFamily('Roboto Mono').setFontWeight('bold');
    sheetMix.getRange(2, 3, rows.length, 1).setHorizontalAlignment('center');
    sheetMix.getRange(2, 4, rows.length, 1).setHorizontalAlignment('right').setFontWeight('bold').setFontColor('#DC2626');
    sheetMix.getRange(2, 5, rows.length, 1).setHorizontalAlignment('right');
    sheetMix.getRange(1, 1, rows.length + 1, 6).setBorder(true, true, true, true, true, true, '#CBD5E1', SpreadsheetApp.BorderStyle.SOLID);
  }

  sheetMix.autoResizeColumns(1, 6);
  ss.setActiveSheet(sheetMix);

  const top1 = rankedSkus[0];
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'SKU lớn nhất đơn MIX: ' + top1.sku + ' (' + top1.totalQty + ' PCS trong ' + top1.orderCount + ' đơn MIX)',
    '🎯 Đã Bóc Tách Đơn MIX',
    5
  );
}

/**
 * 8. XEM KẾT QUẢ TỔNG HỢP (HTML Dialog Popup)
 */
function xemKetQuaTongHop() {
  const sheet = laySheetMucTieu();
  if (!sheet) return;

  const locV1 = sheet.getRange('V1').getDisplayValue().trim();
  const donHangs = layDuLieuDonHang(sheet, locV1);

  if (donHangs.length === 0) {
    SpreadsheetApp.getUi().alert('Thông báo', 'Không có dữ liệu đơn hàng.', SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }

  // Thống kê nhanh
  const skuMap = {};
  let totalPieces = 0;
  let count1Pcs = 0;
  let count2Pcs = 0;
  let countMix = 0;

  donHangs.forEach(function(don) {
    totalPieces += don.totalQty;
    if (don.items.length === 1 && don.totalQty === 1) count1Pcs++;
    else if (don.items.length === 1 && don.totalQty === 2) count2Pcs++;
    else countMix++;

    don.items.forEach(function(it) {
      skuMap[it.sku] = (skuMap[it.sku] || 0) + it.qty;
    });
  });

  const skuList = Object.keys(skuMap).map(function(k) {
    return { sku: k, qty: skuMap[k] };
  });
  skuList.sort(function(a, b) { return b.qty - a.qty; });

  const top15 = skuList.slice(0, 15);

  // Tạo HTML động
  let html = '<!DOCTYPE html><html><head><base target="_top">'
    + '<meta charset="utf-8">'
    + '<style>'
    + 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 20px; background: #f8fafc; color: #1e293b; font-size: 13px; }'
    + '.card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }'
    + '.grid-stat { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }'
    + '.stat-box { background: #f1f5f9; border-radius: 8px; padding: 12px; text-align: center; }'
    + '.stat-box .num { font-size: 20px; font-weight: bold; color: #1a73e8; margin-top: 4px; }'
    + '.stat-box .label { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; }'
    + 'table { width: 100%; border-collapse: collapse; margin-top: 8px; }'
    + 'th { background: #1a73e8; color: #fff; text-align: left; padding: 8px 12px; font-size: 12px; }'
    + 'td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-family: monospace; }'
    + 'tr:hover { background: #f8fafc; }'
    + '.btn-close { background: #1a73e8; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; font-weight: bold; cursor: pointer; float: right; }'
    + '.btn-close:hover { background: #1557b0; }'
    + '</style></head><body>';

  html += '<h2>📊 Báo Cáo Tổng Hợp Đơn Hàng Kho</h2>';
  if (locV1) {
    html += '<p style="color:#64748b;margin-top:-6px;">Đang lọc theo Picking List: <b>' + locV1 + '</b></p>';
  }

  html += '<div class="grid-stat">'
    + '<div class="stat-box"><div class="label">Tổng Số Đơn</div><div class="num">' + donHangs.length + '</div></div>'
    + '<div class="stat-box"><div class="label">Tổng Sản Phẩm</div><div class="num">' + totalPieces + '</div></div>'
    + '<div class="stat-box"><div class="label">Đơn 1 PCS</div><div class="num">' + count1Pcs + '</div></div>'
    + '<div class="stat-box"><div class="label">Mã SKU Khác Nhau</div><div class="num">' + skuList.length + '</div></div>'
    + '</div>';

  html += '<div class="card">'
    + '<h3 style="margin-top:0;margin-bottom:8px;font-size:14px;">🔥 Top 15 Mã SKU Số Lượng Lớn Nhất</h3>'
    + '<table><thead><tr><th>STT</th><th>Mã SKU</th><th style="text-align:right;">Số Lượng</th></tr></thead><tbody>';

  top15.forEach(function(item, idx) {
    html += '<tr><td>' + (idx + 1) + '</td><td><b>' + item.sku + '</b></td><td style="text-align:right;">' + item.qty + '</td></tr>';
  });

  html += '</tbody></table></div>';
  html += '<button class="btn-close" onclick="google.script.host.close()">Đóng Lại</button>';
  html += '</body></html>';

  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(620)
    .setHeight(540);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, '📦 Kết Quả Tổng Hợp Đơn Hàng');
}

/**
 * 9. XÓA DỮ LIỆU TỔNG HỢP
 * Xóa sạch cột S:T và từ Cột X trở đi, đưa bảng tính về nguyên trạng
 */
function xoaDuLieuTongHop() {
  const sheet = laySheetMucTieu();
  if (!sheet) return;

  const ui = SpreadsheetApp.getUi();
  const resp = ui.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa toàn bộ kết quả tổng hợp (Cột S:T và từ Cột X trở đi)?', ui.ButtonSet.YES_NO);
  if (resp !== ui.Button.YES) return;

  const maxCols = sheet.getMaxColumns();
  const maxRows = sheet.getMaxRows();

  sheet.getRange('S1:T' + maxRows).clear({ contentsOnly: false });
  if (maxCols >= 24) {
    sheet.getRange(1, 24, maxRows, maxCols - 23).clear({ contentsOnly: false });
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('Đã xóa sạch kết quả tổng hợp.', '🗑️ Đã Xóa', 3);
}

/**
 * 10. CHÈN NÚT TIỆN ÍCH / HƯỚNG DẪN GÁN MACRO
 */
function chenNutTienIch() {
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '⚙️ Hướng Dẫn Gán Macro Lên Nút Bấm',
    'Để thao tác nhanh bằng 1 click chuột trực tiếp trên Sheet:\\n\\n'
    + '1. Vào Menu Chèn (Insert) > Bản vẽ (Drawing).\\n'
    + '2. Vẽ hình chữ nhật bo góc, nhập chữ: "TỔNG HỢP SKU" hoặc "PHÂN NHÓM".\\n'
    + '3. Nhấn Lưu và Đóng để chèn nút lên Sheet.\\n'
    + '4. Click vào dấu 3 chấm góc phải nút vừa tạo > Chọn "Gán tập lệnh" (Assign Script).\\n'
    + '5. Dán tên một trong các hàm sau:\\n'
    + '   - tongHopSKUChiTietTheoList\\n'
    + '   - tongHopSKUTheoList\\n'
    + '   - tongHopSKUToanBo\\n'
    + '   - phanLoaiThamYoga\\n'
    + '   - locDon1PCSTheoNhom\\n'
    + '   - phanNhomKhuVuc\\n'
    + '   - xemKetQuaTongHop\\n'
    + '   - xoaDuLieuTongHop',
    ui.ButtonSet.OK
  );
}
`;

export const GOOGLE_APPS_SCRIPT_DIALOG_HTML = `<!DOCTYPE html>
<html>
  <head>
    <base target="_top" />
    <meta charset="utf-8" />
    <title>Kết Quả Tổng Hợp SKU & Đơn Hàng Kho</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #f8fafc;
        color: #0f172a;
        font-size: 13px;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .header h2 {
        margin: 0;
        font-size: 16px;
        color: #1e293b;
      }
      .card {
        background: #ffffff;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      .grid-4 {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
      .stat-card {
        background: #f1f5f9;
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      }
      .stat-card .label {
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
        text-transform: uppercase;
      }
      .stat-card .val {
        font-size: 22px;
        font-weight: 700;
        color: #1a73e8;
        margin-top: 4px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th {
        background: #1a73e8;
        color: #ffffff;
        padding: 8px 12px;
        font-size: 12px;
        text-align: left;
      }
      td {
        padding: 8px 12px;
        border-bottom: 1px solid #f1f5f9;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }
      tr:hover {
        background-color: #f8fafc;
      }
      .footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 16px;
      }
      .btn {
        padding: 8px 18px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 13px;
        cursor: pointer;
        border: none;
      }
      .btn-primary {
        background-color: #1a73e8;
        color: #ffffff;
      }
      .btn-primary:hover {
        background-color: #1557b0;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>📊 Tổng Quan Đơn Hàng Kho</h2>
      <span style="font-size: 12px; color: #64748b;">Sheet: Lọc đơn kho cũ</span>
    </div>

    <div class="card">
      <div class="grid-4">
        <div class="stat-card">
          <div class="label">Tổng Đơn</div>
          <div class="val" id="totalOrders">-</div>
        </div>
        <div class="stat-card">
          <div class="label">Tổng PCS</div>
          <div class="val" id="totalPcs">-</div>
        </div>
        <div class="stat-card">
          <div class="label">Số Mã SKU</div>
          <div class="val" id="totalSkus">-</div>
        </div>
        <div class="stat-card">
          <div class="label">Đơn 1 Món</div>
          <div class="val" id="totalSingle">-</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <button class="btn btn-primary" onclick="google.script.host.close()">Đóng Lại</button>
    </div>
  </body>
</html>
`;
