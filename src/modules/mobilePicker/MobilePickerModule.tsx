import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RawOrderRow, SkuGroupsMap } from '../../types';
import {
  PickerAccount,
  AdminDispatchConfig,
  PickingBatch,
  PickingItemDetail,
  PickingStrategyType
} from './types';
import { AdminLockModal } from './components/AdminLockModal';
import { AdminDispatchSettings } from './components/AdminDispatchSettings';
import { PickerMobileView } from './components/PickerMobileView';
import { layNhomTuSKU, parsePieceText } from '../../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';
import { PrintPickingModal } from '../../components/PrintPickingModal';
import { ShieldCheck, Smartphone, CheckCircle2, RefreshCw } from 'lucide-react';

const STORAGE_KEY_CONFIG = 'wms_picker_admin_config_v1';
const STORAGE_KEY_ACCOUNTS = 'wms_picker_accounts_v1';
const STORAGE_KEY_BATCHES = 'wms_picker_batches_v2';

const DEFAULT_CONFIG: AdminDispatchConfig = {
  adminPin: '8888',
  autoAssignNext: true,
  defaultBatchSize: 20,
  enableRealtimeInventory: true,
  enableProductImage: true,
  warehouseId: '7',
  syncToWmsOnComplete: false,
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
      if (saved) return JSON.parse(saved);
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
        // Kiểm tra xem có batch nào bị lỗi SKU nhầm thành mã đơn (orderNo) không:
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

  // Quản lý Modal In Phiếu Nhặt Hàng Tem Nhiệt 100x150 mm (Học tập Tab 1)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printPickingCode, setPrintPickingCode] = useState<string>('');

  const handleOpenPrintModal = (code: string) => {
    setPrintPickingCode(code);
    setIsPrintModalOpen(true);
  };

  // Lưu cấu hình vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (e) {}
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
    } catch (e) {}
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BATCHES, JSON.stringify(batches));
    } catch (e) {}
  }, [batches]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const activeAccount = useMemo(() => {
    return accounts.find(a => a.id === activeAccountId) || accounts[0] || null;
  }, [accounts, activeAccountId]);

  // Trích xuất danh sách các Picking List (PL...) có sẵn trong đơn hàng từ Tab 1
  const tab1PickingLists = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const map = new Map<string, RawOrderRow[]>();
    orders.forEach((o) => {
      const pl = o.pickingList && o.pickingList.trim() !== '' ? o.pickingList.trim() : '';
      if (pl && pl !== 'Chưa gán PL') {
        if (!map.has(pl)) map.set(pl, []);
        map.get(pl)!.push(o);
      }
    });
    return Array.from(map.entries())
      .map(([plNo, ords]) => ({ plNo, orders: ords }))
      .sort((a, b) => a.plNo.localeCompare(b.plNo));
  }, [orders]);

  // Batch hiện tại đang được thực hiện bởi tài khoản này
  const currentBatch = useMemo(() => {
    if (selectedBatchId) {
      const found = batches.find(b => b.id === selectedBatchId);
      if (found) return found;
    }
    if (!activeAccount) return batches[0] || null;
    // Tìm batch đang IN_PROGRESS của account
    const inProgress = batches.find(b => b.pickerId === activeAccount.id && b.status === 'IN_PROGRESS');
    if (inProgress) return inProgress;

    // Nếu không có, tìm batch PENDING đầu tiên phù hợp với strategy của account
    const pending = batches.find(
      b => (b.pickerId === activeAccount.id || b.strategy === activeAccount.assignedStrategy || b.strategy === 'ALL') && b.status === 'PENDING'
    );
    return pending || batches[0] || null;
  }, [batches, activeAccount, selectedBatchId]);

  /**
   * Helper: Bóc tách danh sách SKU thực tế từ 1 đơn hàng (Ưu tiên order.items, sau đó parsePieceText của Cột G)
   */
  const extractItemsFromOrder = useCallback((order: RawOrderRow): { sku: string; qty: number }[] => {
    if (Array.isArray(order.items) && order.items.length > 0) {
      return order.items.filter(it => it && it.sku && it.sku.trim() !== '');
    }
    if (order.rawPieceText) {
      const parsed = parsePieceText(order.rawPieceText);
      if (parsed.length > 0) return parsed;
    }
    if (order.rawOrderText) {
      const parsed = parsePieceText(order.rawOrderText);
      if (parsed.length > 0) return parsed;
    }
    return [];
  }, []);

  /**
   * Helper: Tạo 1 PickingBatch chuẩn từ 1 danh sách đơn hàng (Giữ nguyên số đơn của list pick, gom nhóm SKU chính xác)
   */
  const createBatchFromOrders = useCallback((
    batchId: string,
    pickingCode: string,
    ords: RawOrderRow[],
    assignedAccount?: PickerAccount | null,
    customStrategyLabel?: string
  ): PickingBatch => {
    const skuMap: Record<string, { qty: number; orderNos: Set<string> }> = {};
    const pcsMap: Record<string, number> = { '1 PCS': 0, '2 PCS': 0, 'Multi': 0 };
    const orderNos: string[] = [];

    ords.forEach((ord) => {
      orderNos.push(ord.orderNo);
      const items = extractItemsFromOrder(ord);
      const ordQty = items.reduce((sum, it) => sum + it.qty, 0) || Number(ord.totalQty) || 1;

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
        return {
          sku,
          productTitle: sku,
          area,
          location: area,
          quantityNeeded: data.qty,
          quantityPicked: 0,
          isPicked: false,
          orderNos: Array.from(data.orderNos),
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
      // Mỗi Picking List từ WMS giữ nguyên toàn bộ số đơn của nó (ví dụ PL72610250044 có 50 đơn thì đúng 50 đơn)
      return createBatchFromOrders(plGroup.plNo, plGroup.plNo, plGroup.orders, assignedAccount);
    });

    setBatches(newBatches);
    if (newBatches.length > 0) {
      setSelectedBatchId(newBatches[0].id);
    }
    showToast(`Đã nạp thành công ${newBatches.length} Picking List từ Tab 1 với đầy đủ SKU & số đơn!`);
  }, [tab1PickingLists, accounts, createBatchFromOrders]);

  // TỰ ĐỘNG LÀM SẠCH VÀ ĐỒNG BỘ NẾU BATCHES BỊ LỖI LẶP MÃ HOẶC BỊ CHIA NHỎ
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

  // HÀM TỰ ĐỘNG PHÂN BỔ ĐƠN THÀNH CÁC PHIẾU NHẶT (BATCH GENERATOR)
  const handleGenerateBatches = useCallback(() => {
    if (!orders || orders.length === 0) {
      alert('Chưa có đơn hàng trong hệ thống để phân bổ. Vui lòng nạp đơn ở Tab 1 trước.');
      return;
    }

    // Nếu đơn hàng đã có sẵn các mã Picking List từ WMS (như PL7261...), nạp nguyên bản theo từng List Pick
    if (tab1PickingLists.length > 0) {
      handleImportBatchesFromTab1();
      return;
    }

    // Nếu là đơn lẻ chưa có Picking List: phân bổ thông minh theo PCS & khu vực
    const singlePcsOrders: RawOrderRow[] = [];
    const yogaOrders: RawOrderRow[] = [];
    const sameAreaMultiPcsMap: Record<string, RawOrderRow[]> = {};
    const mixMultiAreaOrders: RawOrderRow[] = [];

    orders.forEach(order => {
      const items = extractItemsFromOrder(order);
      const totalPcs = items.reduce((sum, it) => sum + it.qty, 0) || Number(order.totalQty) || 1;
      const isYoga = order.hasYoga || items.some(it => layNhomTuSKU(it.sku, skuGroups, DEFAULT_AREA_ORDER) === 'Thảm Yoga');

      if (isYoga) {
        yogaOrders.push(order);
        return;
      }

      if (totalPcs === 1) {
        singlePcsOrders.push(order);
        return;
      }

      const areaSet = new Set(items.map(it => layNhomTuSKU(it.sku, skuGroups, DEFAULT_AREA_ORDER)));
      if (areaSet.size === 1) {
        const area = [...areaSet][0];
        if (!sameAreaMultiPcsMap[area]) sameAreaMultiPcsMap[area] = [];
        sameAreaMultiPcsMap[area].push(order);
      } else {
        mixMultiAreaOrders.push(order);
      }
    });

    const newBatches: PickingBatch[] = [];
    let batchCounter = 1;

    const tkSingle = accounts.find(a => a.assignedStrategy === 'SINGLE_PCS') || accounts[0];
    const tkYoga = accounts.find(a => a.assignedStrategy === 'YOGA_ONLY') || accounts[1] || accounts[0];
    const tkMultiArea = accounts.find(a => a.assignedStrategy === 'MULTI_PCS_SAME_AREA' || a.assignedStrategy === 'MULTI_PCS') || accounts[0];
    const tkMix = accounts.find(a => a.assignedStrategy === 'MIX_ONLY' || a.assignedStrategy === 'MIX_MULTI_AREA') || accounts[2] || accounts[0];

    const sliceAndPush = (list: RawOrderRow[], size: number, account: PickerAccount, label: string) => {
      for (let i = 0; i < list.length; i += size) {
        const slice = list.slice(i, i + size);
        const bId = `PL-BATCH-${String(batchCounter++).padStart(3, '0')}`;
        newBatches.push(createBatchFromOrders(bId, bId, slice, account, label));
      }
    };

    if (singlePcsOrders.length > 0) sliceAndPush(singlePcsOrders, config.defaultBatchSize || 25, tkSingle, '⚡ Đơn 1 PCS (Nhặt Nhanh)');
    Object.entries(sameAreaMultiPcsMap).forEach(([area, ords]) => {
      sliceAndPush(ords, 20, tkMultiArea, `📦 Đơn ≥2 PCS Cùng ${area}`);
    });
    if (yogaOrders.length > 0) sliceAndPush(yogaOrders, 20, tkYoga, '🧘 Thảm Yoga & Cồng Kềnh');
    if (mixMultiAreaOrders.length > 0) sliceAndPush(mixMultiAreaOrders, 15, tkMix, '🔀 Đơn Mix Liên Khu Vực');

    setBatches(newBatches);
    if (newBatches.length > 0) setSelectedBatchId(newBatches[0].id);
    showToast(`Đã phân bổ thành công ${newBatches.length} đợt nhặt hàng với SKU chính xác!`);
  }, [orders, tab1PickingLists, handleImportBatchesFromTab1, extractItemsFromOrder, skuGroups, accounts, config.defaultBatchSize, createBatchFromOrders]);

  // HÀM GỌI API WMS THẬT: TẠO PICKING LIST & CHUYỂN TRẠNG THÁI SUBMITTED (4) -> SHELVED (5)
  const handleSyncWmsPickingList = useCallback(async (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;

    const account = accounts.find(a => a.id === batch.pickerId) || accounts[0];
    const pickerId = account.pickerCode || '1'; // user_id WMS (ví dụ 117, 118, 119...)

    try {
      showToast('Đang gọi API YunWMS tạo Picking List và chuyển trạng thái...');
      const res = await fetch('/api/wms/create-picking-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderCodes: batch.orderNos,
          pickerId: pickerId,
          pickingMode: 1,
          orderType: 1
        })
      });
      const data = await res.json();
      if (data.success && data.pickCode) {
        setBatches(prev => prev.map(b => b.id === batchId ? { ...b, pickingCode: data.pickCode } : b));
        showToast(`🎉 Thành công! WMS đã cấp mã ${data.pickCode} và chuyển các đơn sang Shelved (E11=5).`);
      } else {
        alert(data.message || 'Không thể tạo phiếu trên YunWMS');
      }
    } catch (e: any) {
      alert('Lỗi kết nối YunWMS: ' + e.message);
    }
  }, [batches, accounts]);

  // Đánh dấu 1 món đã nhặt / chưa nhặt
  const handleToggleItemPicked = useCallback((batchId: string, sku: string) => {
    setBatches(prevBatches => {
      return prevBatches.map(batch => {
        if (batch.id !== batchId) return batch;

        const nextItems = batch.items.map(item => {
          if (item.sku === sku) {
            const nextIsPicked = !item.isPicked;
            return {
              ...item,
              isPicked: nextIsPicked,
              quantityPicked: nextIsPicked ? item.quantityNeeded : 0,
            };
          }
          return item;
        });

        const nextPickedPcs = nextItems.reduce((sum, i) => sum + (i.isPicked ? i.quantityNeeded : 0), 0);

        return {
          ...batch,
          status: 'IN_PROGRESS' as const,
          items: nextItems,
          pickedPcs: nextPickedPcs,
        };
      });
    });
  }, []);

  // Hoàn thành 1 phiếu nhặt & TỰ ĐỘNG CẤP LIST TIẾP THEO
  const handleCompleteBatch = useCallback((batchId: string) => {
    setBatches(prevBatches => {
      const target = prevBatches.find(b => b.id === batchId);
      if (!target) return prevBatches;

      // Đánh dấu hoàn thành
      const updatedBatches = prevBatches.map(b => {
        if (b.id === batchId) {
          return {
            ...b,
            status: 'COMPLETED' as const,
            completedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          };
        }
        return b;
      });

      // Tăng số lượng đã hoàn thành cho Account
      setAccounts(prevAccounts => {
        return prevAccounts.map(acc => {
          if (acc.id === target.pickerId) {
            return {
              ...acc,
              todayCompletedBatches: acc.todayCompletedBatches + 1,
              todayCompletedPcs: acc.todayCompletedPcs + target.totalPcs,
            };
          }
          return acc;
        });
      });

      // TỰ ĐỘNG CẤP BATCH TIẾP THEO (AUTO-QUEUE)
      if (config.autoAssignNext) {
        const nextPending = updatedBatches.find(b => b.status === 'PENDING');
        if (nextPending) {
          return updatedBatches.map(b => {
            if (b.id === nextPending.id) {
              return {
                ...b,
                pickerId: target.pickerId,
                pickerName: target.pickerName,
                status: 'IN_PROGRESS' as const,
              };
            }
            return b;
          });
        }
      }

      return updatedBatches;
    });

    showToast('🎉 Hoàn thành phiếu nhặt! Đang nạp danh sách tiếp theo...');
  }, [config.autoAssignNext]);

  return (
    <div className="space-y-4">
      {/* Toast thông báo nổi */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* HEADER PHÂN HỆ 5 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Phân Hệ 5: Chế Độ Đi Nhặt Kho (Mobile Picker App)
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Paperless WMS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Nhân viên đi nhặt qua điện thoại • Bấm vào SKU xem ảnh & tồn kho • Tự động cấp phiếu liên tục
          </p>
        </div>

        {/* Nút Điều Khiển Chế Độ Quản Trị / Nhân Viên */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isLocked ? (
            <button
              type="button"
              onClick={() => setIsLocked(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>Khóa & Chuyển Về Màn Hình Nhân Viên</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdminLockModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Mở Khóa Quản Trị Viên (Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* NỘI DUNG CHÍNH: CHẾ ĐỘ QUẢN TRỊ VIÊN HOẶC CHẾ ĐỘ NHÂN VIÊN */}
      {!isLocked ? (
        /* CHẾ ĐỘ QUẢN TRỊ VIÊN: Cài đặt quy tắc, tài khoản con, phân bổ đơn */
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
        />
      ) : (
        /* CHẾ ĐỘ NHÂN VIÊN: Giao diện Mobile Picker tối ưu cho điện thoại */
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
