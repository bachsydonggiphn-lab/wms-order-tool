import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RawOrderRow, SkuGroupsMap } from '../../types';
import {
  PickerAccount,
  AdminDispatchConfig,
  PickingBatch,
  PickingItemDetail,
  PickingStrategyType,
  AutoDispatchLogEntry,
} from './types';
import { AdminLockModal } from './components/AdminLockModal';
import { AdminDispatchSettings } from './components/AdminDispatchSettings';
import { PickerMobileView } from './components/PickerMobileView';
import { layNhomTuSKU, parsePieceText } from '../../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';
import { PrintPickingModal } from '../../components/PrintPickingModal';
import { ShieldCheck, Smartphone, CheckCircle2, RefreshCw } from 'lucide-react';
import { getCachedInventory } from '../../services/inventoryService';

const STORAGE_KEY_CONFIG = 'wms_picker_admin_config_v2';
const STORAGE_KEY_ACCOUNTS = 'wms_picker_accounts_v1';
const STORAGE_KEY_BATCHES = 'wms_picker_batches_v2';
const STORAGE_KEY_LOGS = 'wms_picker_auto_logs_v1';

const DEFAULT_CONFIG: AdminDispatchConfig = {
  adminPin: '8888',
  autoAssignNext: true,
  defaultBatchSize: 20,
  enableRealtimeInventory: true,
  enableProductImage: true,
  warehouseId: '7',
  syncToWmsOnComplete: false,
  enableAutoSchedule: true,
  scheduleSlots: [
    { id: 'slot-1', time: '08:00', label: 'Đợt 1 - Sáng Sớm (Chính 8AM)', enabled: true },
    { id: 'slot-2', time: '13:30', label: 'Đợt 2 - Đầu Giờ Chiều', enabled: true },
    { id: 'slot-3', time: '17:00', label: 'Đợt 3 - Chiều Muộn (Vét Ca)', enabled: true },
  ],
  autoPrintThermal: true,
  autoSyncWms: false,
  batchSize1Pcs: 150,
  batchSize2Pcs: 50,
  batchSizeMultiPcs: 25,
};

const DEFAULT_ACCOUNTS: PickerAccount[] = [
  {
    id: 'tk1',
    name: 'TK 1 - TAI',
    pickerCode: 'TAI',
    pin: '1111',
    roleLabel: 'Chuyên Đơn 1 PCS',
    assignedStrategy: 'SINGLE_PCS',
    maxOrdersPerBatch: 25,
    maxPcsPerBatch: 25,
    isActive: true,
    status: 'IDLE',
    currentBatchId: null,
    todayCompletedBatches: 0,
    todayCompletedPcs: 0,
  },
  {
    id: 'tk2',
    name: 'TK 2 - ART',
    pickerCode: 'ART',
    pin: '2222',
    roleLabel: 'Chuyên Thảm Yoga & Hàng Dài',
    assignedStrategy: 'YOGA_ONLY',
    maxOrdersPerBatch: 20,
    maxPcsPerBatch: 30,
    isActive: true,
    status: 'IDLE',
    currentBatchId: null,
    todayCompletedBatches: 0,
    todayCompletedPcs: 0,
  },
  {
    id: 'tk3',
    name: 'TK 3 - Packing',
    pickerCode: 'Packing',
    pin: '3333',
    roleLabel: 'Chuyên Đơn Mix & Nhiều PCS',
    assignedStrategy: 'MIX_ONLY',
    maxOrdersPerBatch: 15,
    maxPcsPerBatch: 40,
    isActive: true,
    status: 'IDLE',
    currentBatchId: null,
    todayCompletedBatches: 0,
    todayCompletedPcs: 0,
  },
];

interface MobilePickerModuleProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
}

export const MobilePickerModule: React.FC<MobilePickerModuleProps> = ({
  orders,
  skuGroups,
}) => {
  // 1. Quản lý cấu hình Admin
  const [config, setConfig] = useState<AdminDispatchConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          scheduleSlots: parsed.scheduleSlots && parsed.scheduleSlots.length > 0 ? parsed.scheduleSlots : DEFAULT_CONFIG.scheduleSlots,
        };
      }
    } catch (e) {}
    return DEFAULT_CONFIG;
  });

  // 2. Quản lý danh sách tài khoản con
  const [accounts, setAccounts] = useState<PickerAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_ACCOUNTS;
  });

  // 3. Quản lý các đợt nhặt hàng (Batches)
  const [batches, setBatches] = useState<PickingBatch[]>(() => {
    try {
      localStorage.removeItem('wms_picker_batches_v1'); // Dọn dẹp cache cũ bị lỗi
      const saved = localStorage.getItem(STORAGE_KEY_BATCHES);
      if (saved) {
        const parsed: PickingBatch[] = JSON.parse(saved);
        const isCorrupted = parsed.some(b =>
          b.items && b.items.some(it => it.sku.startsWith('YD-26') && b.orderNos.includes(it.sku))
        );
        if (!isCorrupted && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // 4. Quản lý trạng thái giao diện: 'PICKER' (nhân viên) hay 'ADMIN' (quản trị)
  const [isLocked, setIsLocked] = useState<boolean>(true); // Mặc định ở chế độ nhân viên
  const [isAdminLockModalOpen, setIsAdminLockModalOpen] = useState<boolean>(false);
  const [activeAccountId, setActiveAccountId] = useState<string>(() => accounts[0]?.id || 'tk1');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quản lý lịch sử tự động hóa
  const [autoDispatchLogs, setAutoDispatchLogs] = useState<AutoDispatchLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Quản lý Modal In Phiếu Nhặt Hàng Tem Nhiệt 100x150 mm (Học tập Tab 1)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printPickingCode, setPrintPickingCode] = useState<string>('');

  const handleOpenPrintModal = useCallback((code: string) => {
    setPrintPickingCode(code);
    setIsPrintModalOpen(true);
  }, []);

  // Lưu cấu hình vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {}
  }, [config]);

  // Lưu tài khoản vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {}
  }, [accounts]);

  // Lưu batches vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(batches));
    } catch (e) {}
  }, [batches]);

  // Lưu logs vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(autoDispatchLogs));
    } catch (e) {}
  }, [autoDispatchLogs]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Tài khoản đang chọn
  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === activeAccountId) || accounts[0] || null;
  }, [accounts, activeAccountId]);

  // Đợt nhặt hàng đang xem
  const currentBatch = useMemo(() => {
    if (selectedBatchId) {
      const found = batches.find(b => b.id === selectedBatchId);
      if (found) return found;
    }
    // Hoặc lấy batch của account hiện tại
    if (activeAccount && activeAccount.currentBatchId) {
      const found = batches.find(b => b.id === activeAccount.currentBatchId);
      if (found) return found;
    }
    return batches[0] || null;
  }, [batches, selectedBatchId, activeAccount]);

  // Nhóm các đơn theo Picking List No. có sẵn từ WMS
  const tab1PickingLists = useMemo(() => {
    const plMap = new Map<string, RawOrderRow[]>();
    orders.forEach((o) => {
      const pl = (o.pickingList || '').trim();
      if (pl && pl !== 'Chưa gán PL') {
        if (!plMap.has(pl)) plMap.set(pl, []);
        plMap.get(pl)!.push(o);
      }
    });
    return Array.from(plMap.entries())
      .map(([plNo, ords]) => ({ plNo, orders: ords }))
      .sort((a, b) => a.plNo.localeCompare(b.plNo));
  }, [orders]);

  // Helper trích xuất các sản phẩm thực tế từ đơn hàng
  const extractItemsFromOrder = useCallback((order: RawOrderRow): Array<{ sku: string; qty: number }> => {
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      return order.items.map(it => ({ sku: (it.sku || '').trim(), qty: it.qty || 1 }));
    }
    if (order.rawPieceText) {
      const parsed = parsePieceText(order.rawPieceText);
      if (parsed.length > 0) {
        return parsed.map(it => ({ sku: it.sku, qty: it.qty || 1 }));
      }
    }
    return [{ sku: 'SKU_CHUA_DAT_TEN', qty: 1 }];
  }, []);

  // Helper tạo đối tượng PickingBatch từ danh sách đơn hàng
  const createBatchFromOrders = useCallback((
    batchId: string,
    pickingCode: string,
    ords: RawOrderRow[],
    assignedAccount: PickerAccount | null,
    customStrategyLabel?: string
  ): PickingBatch => {
    const skuMap: Record<string, { qty: number; orderNos: Set<string> }> = {};
    const pcsMap: Record<string, number> = { '1 PCS': 0, '2 PCS': 0, 'Multi': 0 };
    const orderNos: string[] = [];

    // Nạp tồn kho cache nhanh
    const cachedInv = getCachedInventory();
    const invMap = new Map<string, { inUsed: number; sellable: number; title?: string }>();
    if (cachedInv && Array.isArray(cachedInv.items)) {
      cachedInv.items.forEach(it => {
        const cleanSku = (it.sku || it.productBarcode || '').trim().toUpperCase();
        if (cleanSku) {
          invMap.set(cleanSku, {
            inUsed: it.inUsed ?? it.sellable ?? 0,
            sellable: it.sellable ?? 0,
            title: it.title || it.productName,
          });
        }
      });
    }

    ords.forEach((ord) => {
      orderNos.push(ord.orderNo);
      const items = extractItemsFromOrder(ord);
      const ordQty = items.reduce((sum, it) => sum + (it.qty || 1), 0);

      if (ordQty === 1) pcsMap['1 PCS'] = (pcsMap['1 PCS'] || 0) + 1;
      else if (ordQty === 2) pcsMap['2 PCS'] = (pcsMap['2 PCS'] || 0) + 1;
      else pcsMap['Multi'] = (pcsMap['Multi'] || 0) + 1;

      items.forEach((it) => {
        const cleanSku = (it.sku || '').trim();
        if (!cleanSku) return;
        if (!skuMap[cleanSku]) {
          skuMap[cleanSku] = { qty: 0, orderNos: new Set() };
        }
        skuMap[cleanSku].qty += (it.qty || 1);
        skuMap[cleanSku].orderNos.add(ord.orderNo);
      });
    });

    // Xác định chiến lược & nhãn hiển thị
    let strategy: PickingStrategyType = 'ALL';
    let strategyLabel = customStrategyLabel || 'Đợt Nhặt Tổng Hợp';
    if (!customStrategyLabel) {
      if (pcsMap['1 PCS'] === ords.length) {
        strategy = 'SINGLE_PCS';
        strategyLabel = '⚡ 1 PCS (Nhặt Nhanh)';
      } else if (pcsMap['2 PCS'] === ords.length) {
        strategy = 'MULTI_PCS_SAME_AREA';
        strategyLabel = '📦 2 PCS Cùng Kệ';
      } else if (pcsMap['Multi'] > 0) {
        strategy = 'MIX_MULTI_AREA';
        strategyLabel = '🔀 Mix Đa Khu Vực';
      }
    }

    // Sắp xếp SKU theo thứ tự Kệ/Khu vực chuẩn DEFAULT_AREA_ORDER
    const items: PickingItemDetail[] = Object.entries(skuMap)
      .map(([sku, data]) => {
        const area = layNhomTuSKU(sku, skuGroups, DEFAULT_AREA_ORDER);
        const stockData = invMap.get(sku.trim().toUpperCase());
        return {
          sku,
          productTitle: stockData?.title || sku,
          area,
          location: area,
          quantityNeeded: data.qty,
          quantityPicked: 0,
          isPicked: false,
          orderNos: Array.from(data.orderNos),
          inventoryOnHand: stockData?.inUsed,
          inventoryAvailable: stockData?.sellable,
          inventoryLocations: [area],
        };
      })
      .sort((a, b) => {
        if (a.area !== b.area) return a.area.localeCompare(b.area);
        return a.sku.localeCompare(b.sku);
      });

    const totalPcs = items.reduce((sum, item) => sum + item.quantityNeeded, 0);

    return {
      id: batchId,
      pickingCode: pickingCode || batchId,
      pickerId: assignedAccount ? assignedAccount.id : 'unassigned',
      pickerName: assignedAccount ? assignedAccount.name : 'Chưa gán',
      strategy,
      strategyLabel,
      status: 'PENDING',
      createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      totalOrders: ords.length,
      totalItems: items.length,
      totalPcs,
      pickedPcs: 0,
      pcsSummary: pcsMap,
      items,
      orderNos,
    };
  }, [extractItemsFromOrder, skuGroups]);

  // HÀM NẠP NGUYÊN BẢN CÁC PICKING LIST TỪ TAB 1 (KHÔNG CHIA NHỎ, ĐỦ SỐ ĐƠN CỦA LIST PICK)
  const handleImportBatchesFromTab1 = useCallback(() => {
    if (tab1PickingLists.length === 0) {
      alert('Không tìm thấy mã Picking List (PL...) nào trong danh sách đơn hàng đã nạp của Tab 1.');
      return;
    }

    const activeAccountsList = accounts.filter(a => a.isActive);
    const newBatches: PickingBatch[] = tab1PickingLists.map((plGroup, idx) => {
      const assignedAccount = activeAccountsList.length > 0 ? activeAccountsList[idx % activeAccountsList.length] : null;
      return createBatchFromOrders(plGroup.plNo, plGroup.plNo, plGroup.orders, assignedAccount);
    });

    setBatches(newBatches);
    if (newBatches.length > 0) {
      setSelectedBatchId(newBatches[0].id);
    }
    showToast(`Đã nạp thành công ${newBatches.length} Picking List từ Tab 1 với đầy đủ SKU & số đơn!`);
  }, [tab1PickingLists, accounts, createBatchFromOrders, showToast]);

  // TỰ ĐỘNG LÀM SẠCH VÀ ĐỒNG BỘ NẾU BATCHES BỊ LỖI
  useEffect(() => {
    if (tab1PickingLists.length > 0) {
      const isCorrupted = batches.length === 0 || batches.some(b =>
        (b.items && b.items.some(it => it.sku.startsWith('YD-26') && b.orderNos.includes(it.sku))) ||
        batches.filter(x => (x.pickingCode || x.id) === (b.pickingCode || b.id)).length > 1
      );

      if (isCorrupted) {
        handleImportBatchesFromTab1();
      }
    }
  }, [tab1PickingLists.length, batches.length, handleImportBatchesFromTab1]);

  // ==============================================================================
  // HÀM TỰ ĐỘNG HÓA TẠO LIST & IN ĐƠN (8:00 AM HOẶC GIỜ DO NGƯỜI DÙNG CÀI ĐẶT)
  // ==============================================================================
  const handleExecuteAutoDispatch = useCallback(async (slotTime: string = '08:00', label?: string) => {
    // 1. Tìm các đơn Submitted (E11=4)
    let candidateOrders = orders.filter(
      o => !o.statusE11 || o.statusE11 === '4' || o.statusE11.includes('4') || o.statusE11.includes('Submitted')
    );

    // Nếu trong orders hiện tại chưa có, thử kéo trực tiếp từ YunWMS
    if (candidateOrders.length === 0) {
      try {
        const res = await fetch('/api/wms/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse: config.warehouseId || '7',
            statusE11: '4',
            pageSize: 1000,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            candidateOrders = data.orders;
          }
        }
      } catch (e) {}
    }

    if (candidateOrders.length === 0) {
      const logEntry: AutoDispatchLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        slotTime,
        totalOrdersFetched: 0,
        batchesCreated: 0,
        pcsSummary: {},
        status: 'NO_ORDERS',
        message: `Đợt ${slotTime}: Quét không có đơn mới ở trạng thái Submitted (E11=4).`,
      };
      setAutoDispatchLogs(prev => [logEntry, ...prev.slice(0, 49)]);
      return {
        success: false,
        message: `Không tìm thấy đơn mới cần nhặt lúc ${slotTime}.`,
        ordersCount: 0,
        batchesCount: 0,
      };
    }

    // 2. Phân loại chuẩn xác theo quy luật học từ 4 ngày qua:
    // - Nhóm 1 PCS (~75% tổng đơn): chunk thành các batch lớn (config.batchSize1Pcs || 150)
    // - Nhóm 2 PCS (~14% tổng đơn): chunk thành các batch vừa (config.batchSize2Pcs || 50)
    // - Nhóm Multi / 3+ PCS: chunk thành các batch nhỏ (config.batchSizeMultiPcs || 25)
    const orders1Pcs: RawOrderRow[] = [];
    const orders2Pcs: RawOrderRow[] = [];
    const ordersMulti: RawOrderRow[] = [];

    candidateOrders.forEach(ord => {
      const items = extractItemsFromOrder(ord);
      const totalPcs = items.reduce((sum, it) => sum + (it.qty || 1), 0);
      if (totalPcs === 1) orders1Pcs.push(ord);
      else if (totalPcs === 2) orders2Pcs.push(ord);
      else ordersMulti.push(ord);
    });

    const activeAccountsList = accounts.filter(a => a.isActive);
    const targetAccounts = activeAccountsList.length > 0 ? activeAccountsList : accounts;

    const newBatches: PickingBatch[] = [];
    let accIdx = 0;
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    let batchCounter = batches.length + 1;

    const createChunks = (orderList: RawOrderRow[], chunkSize: number, strategyLabel: string) => {
      for (let i = 0; i < orderList.length; i += chunkSize) {
        const chunk = orderList.slice(i, i + chunkSize);
        const assignedAccount = targetAccounts[accIdx % targetAccounts.length];
        accIdx++;
        const autoBatchId = `PL7${dateStr}${String(batchCounter).padStart(5, '0')}`;
        batchCounter++;

        const batch = createBatchFromOrders(autoBatchId, autoBatchId, chunk, assignedAccount, strategyLabel);
        newBatches.push(batch);
      }
    };

    if (orders1Pcs.length > 0) {
      createChunks(orders1Pcs, config.batchSize1Pcs || 150, '⚡ 1 PCS (Nhặt Nhanh)');
    }
    if (orders2Pcs.length > 0) {
      createChunks(orders2Pcs, config.batchSize2Pcs || 50, '📦 2 PCS (Cùng Kệ)');
    }
    if (ordersMulti.length > 0) {
      createChunks(ordersMulti, config.batchSizeMultiPcs || 25, '🔀 Multi / Mix Đa Khu Vực');
    }

    setBatches(newBatches);
    if (newBatches.length > 0) {
      setSelectedBatchId(newBatches[0].id);
      if (config.autoPrintThermal) {
        handleOpenPrintModal(newBatches[0].pickingCode || newBatches[0].id);
      }
    }

    const logEntry: AutoDispatchLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      slotTime,
      totalOrdersFetched: candidateOrders.length,
      batchesCreated: newBatches.length,
      pcsSummary: {
        '1 PCS': orders1Pcs.length,
        '2 PCS': orders2Pcs.length,
        'Multi': ordersMulti.length,
      },
      status: 'SUCCESS',
      message: `Đợt ${slotTime}: Tự động gom ${candidateOrders.length} đơn thành ${newBatches.length} Picking List (1 PCS: ${orders1Pcs.length}đ, 2 PCS: ${orders2Pcs.length}đ, Multi: ${ordersMulti.length}đ).`,
    };

    setAutoDispatchLogs(prev => [logEntry, ...prev.slice(0, 49)]);
    showToast(`⚡ [Tự Động Hóa ${slotTime}]: Đã tạo thành công ${newBatches.length} Picking List cho ${candidateOrders.length} đơn!`);

    return {
      success: true,
      message: logEntry.message,
      ordersCount: candidateOrders.length,
      batchesCount: newBatches.length,
    };
  }, [orders, config, accounts, batches, extractItemsFromOrder, createBatchFromOrders, showToast, handleOpenPrintModal]);

  // ==============================================================================
  // ĐỒNG HỒ CHẠY NGẦM CANH GIỜ CHÍNH XÁC TRÊN MÁY LOCAL NÀY
  // ==============================================================================
  useEffect(() => {
    if (!config.enableAutoSchedule) return;

    let lastTriggerMinute = '';

    const checkSchedule = () => {
      const now = new Date();
      const currentHhMm = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      if (currentHhMm === lastTriggerMinute) return;

      const slots = config.scheduleSlots || [];
      const matchedSlot = slots.find(slot => slot.enabled && slot.time === currentHhMm);

      if (matchedSlot) {
        lastTriggerMinute = currentHhMm;
        console.log(`[AutoDispatch] Kích hoạt tự động lúc ${currentHhMm}: ${matchedSlot.label}`);
        handleExecuteAutoDispatch(matchedSlot.time, matchedSlot.label);
      }
    };

    const interval = setInterval(checkSchedule, 15000); // Quét mỗi 15 giây
    return () => clearInterval(interval);
  }, [config.enableAutoSchedule, config.scheduleSlots, handleExecuteAutoDispatch]);

  // Phân bổ đơn thông thường
  const handleGenerateBatches = useCallback(() => {
    handleExecuteAutoDispatch('Thủ công');
  }, [handleExecuteAutoDispatch]);

  // Gọi API WMS: Tạo Picking List & chuyển trạng thái Submitted (4) -> Shelved (5)
  const handleSyncWmsPickingList = useCallback(async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    const account = accounts.find(a => a.id === batch.pickerId) || accounts[0];
    const pickerId = account.pickerCode || '1';

    try {
      showToast('Đang gọi API YunWMS tạo Picking List và chuyển trạng thái...');
      const res = await fetch('/api/wms/create-picking-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCodes: batch.orderNos,
          pickerId: pickerId,
          pickingMode: 1,
          orderType: 1,
        }),
      });
      const data = await res.json();
      if (data.success && data.pickCode) {
        setBatches(prev => prev.map(b => (b.id === batchId ? { ...b, pickingCode: data.pickCode } : b)));
        showToast(`🎉 Thành công! WMS đã cấp mã ${data.pickCode} và chuyển các đơn sang Shelved (E11=5).`);
      } else {
        alert(data.message || 'Không thể tạo phiếu trên YunWMS');
      }
    } catch (e: any) {
      alert('Lỗi kết nối YunWMS: ' + e.message);
    }
  }, [batches, accounts, showToast]);

  // Đánh dấu 1 món đã nhặt / chưa nhặt
  const handleToggleItemPicked = useCallback((batchId: string, sku: string) => {
    setBatches(prevBatches => {
      return prevBatches.map(b => {
        if (b.id !== batchId) return b;

        const updatedItems = b.items.map(it => {
          if (it.sku === sku) {
            const nextPicked = !it.isPicked;
            return {
              ...it,
              isPicked: nextPicked,
              quantityPicked: nextPicked ? it.quantityNeeded : 0,
            };
          }
          return it;
        });

        const newPickedPcs = updatedItems.reduce(
          (sum, it) => sum + (it.isPicked ? it.quantityNeeded : 0),
          0
        );
        const allDone = updatedItems.every(it => it.isPicked);

        return {
          ...b,
          items: updatedItems,
          pickedPcs: newPickedPcs,
          status: allDone ? 'COMPLETED' : newPickedPcs > 0 ? 'IN_PROGRESS' : 'PENDING',
        };
      });
    });
  }, []);

  // Hoàn thành cả đợt nhặt
  const handleCompleteBatch = useCallback((batchId: string) => {
    setBatches(prev => {
      return prev.map(b => {
        if (b.id !== batchId) return b;
        const fullyPickedItems = b.items.map(it => ({
          ...it,
          isPicked: true,
          quantityPicked: it.quantityNeeded,
        }));
        return {
          ...b,
          status: 'COMPLETED',
          completedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          pickedPcs: b.totalPcs,
          items: fullyPickedItems,
        };
      });
    });

    if (activeAccount) {
      setAccounts(prev =>
        prev.map(a => {
          if (a.id !== activeAccount.id) return a;
          const targetBatch = batches.find(b => b.id === batchId);
          const pcsAdded = targetBatch ? targetBatch.totalPcs : 0;
          return {
            ...a,
            status: 'IDLE',
            currentBatchId: null,
            todayCompletedBatches: a.todayCompletedBatches + 1,
            todayCompletedPcs: a.todayCompletedPcs + pcsAdded,
          };
        })
      );
    }

    showToast('🎉 Xuất sắc! Bạn đã hoàn thành toàn bộ đợt nhặt hàng này.');
  }, [activeAccount, batches, showToast]);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Switch Chế Độ */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-xs">
            5
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
              <span>Chế Độ Đi Nhặt Kho (Mobile Picker & Auto Dispatch Hub)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Tab 5
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Đang hoạt động ở chế độ: <strong className="text-slate-800">{!isLocked ? 'Quản Trị Viên (Admin)' : `Nhân Viên Đi Nhặt (${activeAccount?.name})`}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {!isLocked ? (
            <button
              type="button"
              onClick={() => setIsLocked(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Khóa Màn Hình (Chế Độ Nhân Viên)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdminLockModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Mở Khóa Quản Trị Viên (Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* NỘI DUNG CHÍNH: CHẾ ĐỘ QUẢN TRỊ VIÊN HOẶC CHẾ ĐỘ NHÂN VIÊN */}
      {!isLocked ? (
        <AdminDispatchSettings
          config={config}
          onUpdateConfig={setConfig}
          accounts={accounts}
          onUpdateAccounts={setAccounts}
          batches={batches}
          onGenerateBatchesFromOrders={handleGenerateBatches}
          onSyncWmsPickingList={handleSyncWmsPickingList}
          onExitAdminMode={() => setIsLocked(true)}
          tab1PlCount={tab1PickingLists.length}
          onImportTab1Pls={handleImportBatchesFromTab1}
          onOpenPrintModal={handleOpenPrintModal}
          onTriggerAutoDispatch={handleExecuteAutoDispatch}
          autoDispatchLogs={autoDispatchLogs}
          onClearLogs={() => setAutoDispatchLogs([])}
        />
      ) : (
        <PickerMobileView
          accounts={accounts}
          activeAccount={activeAccount}
          onSelectAccount={(acc) => setActiveAccountId(acc.id)}
          batches={batches}
          currentBatch={currentBatch}
          onSelectBatch={(bId) => setSelectedBatchId(bId)}
          onToggleItemPicked={handleToggleItemPicked}
          onCompleteBatch={handleCompleteBatch}
          onRequestAdminMode={() => setIsAdminLockModalOpen(true)}
          onOpenPrintModal={handleOpenPrintModal}
          tab1PlCount={tab1PickingLists.length}
          onImportTab1Pls={handleImportBatchesFromTab1}
        />
      )}

      {/* MODAL MẬT KHẨU QUẢN TRỊ VIÊN */}
      <AdminLockModal
        isOpen={isAdminLockModalOpen}
        onClose={() => setIsAdminLockModalOpen(false)}
        onSuccess={() => {
          setIsAdminLockModalOpen(false);
          setIsLocked(false);
          showToast('✅ Đã xác thực thành công quyền Quản Trị Viên!');
        }}
        currentAdminPin={config.adminPin}
      />

      {/* MODAL IN PHIẾU NHẶT HÀNG TEM NHIỆT 100x150 mm (HỌC TẬP TAB 1) */}
      <PrintPickingModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        orders={orders}
        selectedPickingList={printPickingCode}
        selectedCarrier="ALL"
        skuGroups={skuGroups}
      />
    </div>
  );
};
