export interface OrderItem {
  sku: string;
  qty: number;
}

export type CarrierCode =
  | 'ALL'
  | 'SPX'
  | 'JNT'
  | 'JT_CARGO'
  | 'GHN'
  | 'GHN_TIKTOK'
  | 'NINJAVAN'
  | 'VIETTELPOST'
  | 'VNPOST'
  | 'BEST'
  | 'OTHER';

export interface CarrierDetails {
  code: CarrierCode;
  name: string;
  shortName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconColor: string;
  description: string;
}

export interface RawOrderRow {
  id: string;
  rawOrderText: string;     // Cột C: Chứa Order No & Tracking No
  rawPieceText: string;     // Cột G: Chứa danh sách SKU*SL
  rawPickingText: string;   // Cột R: Chứa Picking List No.
  orderNo: string;          // Cột P: Order No đã trích xuất
  trackingNo: string;       // Cột Q: Tracking No đã trích xuất
  pickingList: string;      // Cột U: Mã Picking List đã trích xuất
  carrier: CarrierCode;     // ĐVVC
  carrierName: string;      // Tên ĐVVC hiển thị
  items: OrderItem[];
  totalQty: number;
  isSingleSku: boolean;
  hasL46: boolean;
  hasYoga: boolean;
  isRealTimeNew?: boolean;   // Đơn mới bắt được trong phiên Live Tracker
  newTimestamp?: number;     // Thời điểm đơn được bắt
  creationTime?: string;     // Thời gian tạo đơn (vd: 2026-09-07 10:15:30)
  shippedTime?: string;      // Thời gian xuất kho / Shipped (vd: 2026-09-07 12:30:15)
  statusE11?: string;        // Trạng thái WMS E11 ('4' = Submitted, '8' = Shipped, '5' = Shelved)
}

export type SkuGroupsMap = Record<string, string[]>;

export interface SkuCountResult {
  [sku: string]: number;
}

export interface PcsGroupResult {
  [pcsKey: string]: string[]; // e.g. '1', '2', '3', 'MIX', 'MIX L46' -> [orderNo1, orderNo2, ...]
}

export interface AreaGroupResult {
  [area: string]: {
    '1 PCS': string[];
    '2 PCS': string[];
    '3 PCS': string[];
    '4 PCS': string[];
    '5 PCS': string[];
    '6 PCS': string[];
    '7 PCS': string[];
    '8+ PCS': string[];
    '4+ PCS': string[];
    'MIX': string[];
  };
}

export interface YogaClassificationResult {
  skuResult: SkuCountResult;
  donThamYoga: Record<string, string[]>; // '1', '2', 'MIX', 'MIX_L46' -> orderNo[]
  donThuong: Record<number, string[]>;   // 1, 2, 3, ... -> orderNo[]
  donL46: Array<{ orderNo: string; qty: number }>;
  donMix2PCSL46: string[];
  donMixKhac: string[];
}

export interface SinglePcsAreaResult {
  [area: string]: string[];
}

export interface SkuInMixSummary {
  sku: string;
  area: string;
  totalQty: number;
  orderCount: number;
  orders: RawOrderRow[];
  coOccurringSkus: Array<{
    sku: string;
    area: string;
    totalQty: number;
    orderCount: number;
  }>;
}

export interface MixOrderAnalysisResult {
  totalMixOrders: number;
  totalMixPcs: number;
  distinctSkusInMix: number;
  rankedSkus: SkuInMixSummary[];
  allMixOrders: RawOrderRow[];
  totalAllMixOrdersCount?: number;
  totalYogaMixOrdersCount?: number;
  totalNonYogaMixOrdersCount?: number;
  yogaFilterApplied?: 'exclude' | 'only' | 'all';
}

export interface PcsBreakdownItem {
  pcs: number | string;
  label: string;
  orderCount: number;
  totalPcs: number;
  orderNos: string[];
}

export interface MixByGroupItem {
  groupName: string;
  isPureGroup: boolean;
  orderCount: number;
  totalPcs: number;
  orders: RawOrderRow[];
  orderNos: string[];
  skuBreakdown: Array<{ sku: string; qty: number; orderCount: number }>;
  pcsBreakdown: PcsBreakdownItem[];
  ordersByPcs: Record<string, string[]>;
}

export interface MixCrossGroupPair {
  groupComboKey: string;
  groups: string[];
  orderCount: number;
  totalPcs: number;
  orders: RawOrderRow[];
  orderNos: string[];
  skuList: string[];
  pcsBreakdown: PcsBreakdownItem[];
  ordersByPcs: Record<string, string[]>;
}

export interface MixAllGroupSummary {
  groupName: string;
  totalOrders: number;
  pureOrders: number;
  crossOrders: number;
  totalPcs: number;
  skus: Array<{ sku: string; qty: number }>;
  allOrderNos: string[];
  allOrders?: RawOrderRow[];
  pcsBreakdown: PcsBreakdownItem[];
  ordersByPcs: Record<string, string[]>;
}

export interface MixGroupByResult {
  pureGroupList: MixByGroupItem[];
  totalPureOrders: number;
  totalPurePcs: number;
  crossGroupPairs: MixCrossGroupPair[];
  totalCrossOrders: number;
  totalCrossPcs: number;
  totalMixOrders: number;
  allMixOrders: RawOrderRow[];
  totalAllMixOrdersCount?: number;
  totalYogaMixOrdersCount?: number;
  totalNonYogaMixOrdersCount?: number;
  yogaFilterApplied?: 'exclude' | 'only' | 'all';
  allGroupSummaries: MixAllGroupSummary[];
  globalPcsBreakdown: PcsBreakdownItem[];
  globalOrdersByPcs: Record<string, string[]>;
}

export type SkuPackingPcsMode =
  | '1_PCS'
  | '2_PCS'
  | '3_PCS'
  | '4_PCS'
  | '5_PLUS_PCS'
  | 'SINGLE_SKU'
  | 'CUSTOM_PCS'
  | 'MIX_ORDERS'
  | 'ALL_ORDERS';
export type SkuPackingSortMode = 'order_count_desc' | 'qty_desc' | 'sku_asc' | 'area_asc';

export interface SkuPackingItem {
  sku: string;
  area: string;
  orderCount: number;
  totalQty: number;
  orderNos: string[];
  orders: RawOrderRow[];
  percentage: number;
}

export interface SkuPackingBreakdownResult {
  skuList: SkuPackingItem[];
  totalOrders: number;
  totalSkus: number;
  totalPcs: number;
}

