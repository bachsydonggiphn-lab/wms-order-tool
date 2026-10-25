import { RawOrderRow, SkuGroupsMap } from '../../types';

export type PickingStrategyType =
  | 'ALL'
  | 'SINGLE_PCS'            // Đơn 1 PCS (Nhặt nhanh)
  | 'MULTI_PCS_SAME_AREA'   // Đơn >= 2 PCS CÙNG KHU VỰC KỆ
  | 'MULTI_PCS'             // Đơn nhiều PCS chung
  | 'AREA_GROUP'            // Gom theo khu vực kệ kho
  | 'YOGA_ONLY'             // Nhóm thảm Yoga & hàng dài
  | 'MIX_ONLY'              // Nhóm đơn mix nhiều mã
  | 'MIX_MULTI_AREA';       // Đơn mix liên khu vực kệ

export interface PickerAccount {
  id: string;               // 'tk1', 'tk2', 'tk3'...
  name: string;             // 'Thợ 1 - TAI'
  pickerCode: string;       // Mã picker trên WMS (ví dụ 'TAI', 'ART', 'Packing')
  pin: string;              // PIN đăng nhập nhanh (ví dụ '1111')
  roleLabel: string;        // 'Chuyên 1 PCS' | 'Chuyên Kệ A-B' | 'Chuyên Mix'
  assignedStrategy: PickingStrategyType;
  assignedArea?: string;    // 'Khu A', 'Khu B'...
  maxOrdersPerBatch: number;// Giới hạn đơn/lượt (ví dụ 20)
  maxPcsPerBatch: number;   // Giới hạn PCS/lượt (ví dụ 30)
  isActive: boolean;
  status: 'IDLE' | 'PICKING' | 'RESTING';
  currentBatchId: string | null;
  todayCompletedBatches: number;
  todayCompletedPcs: number;
  lastActiveTime?: string;
}

export interface AutoScheduleTimeSlot {
  id: string;
  time: string;             // '08:00', '13:30', '17:00'...
  label: string;            // 'Đợt 1 - Sáng Sớm (Chính)', 'Đợt 2 - Chiều'...
  enabled: boolean;
}

export interface AutoDispatchLogEntry {
  id: string;
  timestamp: string;
  slotTime: string;
  totalOrdersFetched: number;
  batchesCreated: number;
  pcsSummary: Record<string, number>;
  status: 'SUCCESS' | 'NO_ORDERS' | 'FAILED';
  message: string;
}

export interface AdminDispatchConfig {
  adminPin: string;             // Mật khẩu quản trị viên (Mặc định '8888')
  autoAssignNext: boolean;      // Tự động cấp list tiếp theo khi hoàn thành
  defaultBatchSize: number;     // Mặc định 20 đơn/phiếu
  enableRealtimeInventory: boolean;
  enableProductImage: boolean;
  warehouseId: string;          // Mặc định '7' (VN02)
  syncToWmsOnComplete: boolean; // Tự động cập nhật WMS khi hoàn thành

  // Cấu hình Tự Động Hóa Giờ In Đơn (8:00 AM hoặc giờ do người dùng cài)
  enableAutoSchedule: boolean;          // Bật/tắt tự động hóa
  scheduleSlots: AutoScheduleTimeSlot[];// Danh sách khung giờ người dùng cài
  autoPrintThermal: boolean;            // Tự động in tem nhiệt 100x150 mm
  autoSyncWms: boolean;                 // Tự động đồng bộ tạo Picking List trên WMS
  batchSize1Pcs: number;                // Quy mô list 1 PCS (Mặc định 150 đơn)
  batchSize2Pcs: number;                // Quy mô list 2 PCS (Mặc định 50 đơn)
  batchSizeMultiPcs: number;            // Quy mô list Multi (Mặc định 25 đơn)
  lastAutoRunTime?: string;

  // Quy tắc nâng cao: Đơn trên 20 PCS (YD-W/Bulk) & YD-H không giới hạn đơn
  enableBulkOrderSplit: boolean;        // Tách đơn >= 20 PCS (YD-W / Đơn sỉ) thành list riêng
  bulkPcsThreshold: number;             // Ngưỡng PCS đơn lớn (Mặc định 20 PCS)
  unlimitedYdH: boolean;                // Dòng YD-H & đơn 1 vị trí kệ: Không giới hạn số đơn / list
}

export interface PickingItemDetail {
  sku: string;
  productTitle: string;
  productId?: string;
  productImgUrl?: string;
  area: string;
  location?: string;
  quantityNeeded: number;
  quantityPicked: number;
  isPicked: boolean;
  orderNos: string[];
  customerCode?: string;
  inventoryOnHand?: number;     // Tồn kho thực tế
  inventoryAvailable?: number;  // Tồn kho có thể bán
  inventoryLocations?: string[];// Danh sách vị trí kệ
}

export interface PickingBatch {
  id: string;                   // 'PL-BATCH-001'
  pickingCode?: string;         // 'PL72610250001' nếu đã đẩy lên WMS
  pickerId: string;             // 'tk1'
  pickerName: string;
  strategy: PickingStrategyType;
  strategyLabel: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
  completedAt?: string;
  totalOrders: number;
  totalItems: number;
  totalPcs: number;
  pickedPcs: number;
  pcsSummary?: Record<string, number>; // { '1 PCS': 0, '2 PCS': 6, 'Multi': 0 }
  items: PickingItemDetail[];
  orderNos: string[];
}

export interface SkuRealtimeInfo {
  sku: string;
  productTitle?: string;
  imageUrl?: string;
  totalStock: number;
  sellableStock: number;
  locations: string[];
  lastUpdated: string;
}
