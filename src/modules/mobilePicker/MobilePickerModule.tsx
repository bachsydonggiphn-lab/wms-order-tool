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
import { layNhomTuSKU } from '../../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';
import { PrintPickingModal } from '../../components/PrintPickingModal';
import { ShieldCheck, Smartphone, CheckCircle2, RefreshCw } from 'lucide-react';

const STORAGE_KEY_CONFIG = 'wms_picker_admin_config_v1';
const STORAGE_KEY_ACCOUNTS = 'wms_picker_accounts_v1';
const STORAGE_KEY_BATCHES = 'wms_picker_batches_v1';

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
      const saved = localStorage.getItem(STORAGE_KEY_BATCHES);
      if (saved) return JSON.parse(saved);
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

  // HÀM NẠP NGUYÊN BẢN CÁC PICKING LIST TỪ TAB 1 (HỌC TẬP TAB 1)
  const handleImportBatchesFromTab1 = useCallback(() => {
    if (tab1PickingLists.length === 0) {
      alert('Không tìm thấy mã Picking List (PL...) nào trong danh sách đơn hàng đã nạp của Tab 1.');
      return;
    }

    const newBatches: PickingBatch[] = [];
    const activeAccountsList = accounts.filter(a => a.isActive);

    tab1PickingLists.forEach((plGroup, idx) => {
      const { plNo, orders: ords } = plGroup;
      const skuMap: Record<string, { qty: number; orderNos: Set<string>; productTitle?: string }> = {};
      const pcsMap: Record<string, number> = { '1 PCS': 0, '2 PCS': 0, 'Multi': 0 };
      const orderNos: string[] = [];

      ords.forEach(o => {
        orderNos.push(o.orderNo);
        let ordQty = 0;
        if (o.items && o.items.length > 0) {
          o.items.forEach(it => {
            if (!skuMap[it.sku]) {
              skuMap[it.sku] = { qty: 0, orderNos: new Set(), productTitle: it.sku };
            }
            skuMap[it.sku].qty += it.qty;
            skuMap[it.sku].orderNos.add(o.orderNo);
            ordQty += it.qty;
          });
        } else {
          const s = o.orderNo;
          const q = Number(o.totalQty) || 1;
          if (!skuMap[s]) skuMap[s] = { qty: 0, orderNos: new Set(), productTitle: s };
          skuMap[s].qty += q;
          skuMap[s].orderNos.add(o.orderNo);
          ordQty += q;
        }

        if (ordQty === 1) pcsMap['1 PCS']++;
        else if (ordQty === 2) pcsMap['2 PCS']++;
        else pcsMap['Multi']++;
      });

      // Kiểm tra đặc tính để gắn nhãn chiến lược
      let strategy: PickingStrategyType = 'ALL';
      let strategyLabel = 'Đợt Nhặt Tổng Hợp';
      if (pcsMap['1 PCS'] === ords.length) {
        strategy = 'SINGLE_PCS';
        strategyLabel = '1 PCS (Nhặt Nhanh)';
      } else if (pcsMap['2 PCS'] === ords.length) {
        strategy = 'MULTI_PCS_SAME_AREA';
        strategyLabel = '2 PCS Cùng Kệ';
      } else if (pcsMap['Multi'] > 0) {
        strategy = 'MIX_MULTI_AREA';
        strategyLabel = 'Mix Đa Khu Vực';
      }

      // Sắp xếp SKU theo Kệ/Khu vực chuẩn DEFAULT_AREA_ORDER
      const items: PickingItemDetail[] = Object.entries(skuMap).map(([sku, data]) => {
        const area = layNhomTuSKU(sku, skuGroups, DEFAULT_AREA_ORDER);
        return {
          sku,
          productTitle: data.productTitle || sku,
          area,
          location: area,
          quantityNeeded: data.qty,
          quantityPicked: 0,
          isPicked: false,
          orderNos: Array.from(data.orderNos),
        };
      }).sort((a, b) => {
        if (a.area !== b.area) return a.area.localeCompare(b.area);
        return a.sku.localeCompare(b.sku);
      });

      const totalPcs = items.reduce((sum, it) => sum + it.quantityNeeded, 0);

      // Phân bổ vòng tròn cho các account active
      const assignedAccount = activeAccountsList.length > 0 ? activeAccountsList[idx % activeAccountsList.length] : null;

      newBatches.push({
        id: plNo,
        pickingCode: plNo,
        pickerId: assignedAccount ? assignedAccount.id : 'unassigned',
        pickerName: assignedAccount ? assignedAccount.name : 'Chưa gán',
        strategy,
        strategyLabel,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        totalOrders: ords.length,
        totalItems: items.length,
        totalPcs,
        pickedPcs: 0,
        pcsSummary: pcsMap,
        items,
        orderNos,
      });
    });

    setBatches(newBatches);
    if (newBatches.length > 0) {
      setSelectedBatchId(newBatches[0].id);
    }
    showToast(`Đã nạp thành công ${newBatches.length} Picking List từ Tab 1!`);
  }, [tab1PickingLists, accounts, skuGroups]);

  // HÀM TỰ ĐỘNG PHÂN BỔ ĐƠN THÀNH CÁC PHIẾU NHẶT (BATCH GENERATOR)
  const handleGenerateBatches = useCallback(() => {
    if (!orders || orders.length === 0) {
      alert('Chưa có đơn hàng trong hệ thống để phân bổ. Vui lòng nạp đơn ở Tab 1 trước.');
      return;
    }

    // 1. Phân loại đơn hàng theo chuẩn YunWMS Lifecycle:
    // - singlePcsOrders: Đơn 1 PCS (Nhặt siêu nhanh)
    // - yogaOrders: Thảm Yoga & cồng kềnh
    // - sameAreaMultiPcsMap: Đơn >= 2 PCS nhưng CÙNG 1 KHU VỰC KỆ KHO
    // - mixMultiAreaOrders: Đơn mix liên khu vực
    const singlePcsOrders: RawOrderRow[] = [];
    const yogaOrders: RawOrderRow[] = [];
    const sameAreaMultiPcsMap: Record<string, RawOrderRow[]> = {};
    const mixMultiAreaOrders: RawOrderRow[] = [];

    // Chỉ lấy đơn đang chờ xuất (Submitted E11=4 hoặc chưa có PL)
    const submittedOrders = orders.filter(o => {
      const status = String(o.orderStatus || '');
      return status === '4' || status === 'Submitted' || status === 'Submitted.' || !o.pickingList;
    });

    const targetOrders = submittedOrders.length > 0 ? submittedOrders : orders;

    targetOrders.forEach(order => {
      const totalPcs = Number(order.totalQuantity) || 1;
      const rawText = (order.rawOrderText || '').toUpperCase();
      const isYoga = rawText.includes('THẢM YOGA') || rawText.includes('YOGA') || (order.skus || []).some(s => s.sku.toUpperCase().includes('YOGA'));

      if (isYoga) {
        yogaOrders.push(order);
        return;
      }

      if (totalPcs === 1) {
        singlePcsOrders.push(order);
        return;
      }

      // Đơn >= 2 PCS: Kiểm tra khu vực kệ
      const skuList = order.skus && order.skus.length > 0 ? order.skus.map(s => s.sku) : [order.sku || order.orderNo];
      const areaSet = new Set(skuList.map(sku => layNhomTuSKU(sku.trim(), skuGroups)));

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

    // Helper tạo batch từ danh sách đơn
    const createBatchList = (
      orderList: RawOrderRow[],
      strategy: PickingStrategyType,
      strategyLabel: string,
      targetPickerId: string,
      targetPickerName: string,
      batchSize: number
    ) => {
      for (let i = 0; i < orderList.length; i += batchSize) {
        const slice = orderList.slice(i, i + batchSize);
        // Gom SKU lại thành danh sách cần nhặt
        const skuMap: Record<string, PickingItemDetail> = {};

        slice.forEach(order => {
          if (order.skus && order.skus.length > 0) {
            order.skus.forEach(s => {
              const cleanSku = s.sku.trim();
              const area = layNhomTuSKU(cleanSku, skuGroups);
              if (!skuMap[cleanSku]) {
                skuMap[cleanSku] = {
                  sku: cleanSku,
                  productTitle: s.productTitle || order.productTitle || '',
                  area,
                  location: `${area}-T01-01`,
                  quantityNeeded: 0,
                  quantityPicked: 0,
                  isPicked: false,
                  orderNos: [],
                };
              }
              skuMap[cleanSku].quantityNeeded += s.quantity;
              skuMap[cleanSku].orderNos.push(order.orderNo);
            });
          } else {
            const cleanSku = (order.sku || order.orderNo).trim();
            const area = layNhomTuSKU(cleanSku, skuGroups);
            if (!skuMap[cleanSku]) {
              skuMap[cleanSku] = {
                sku: cleanSku,
                productTitle: order.productTitle || '',
                area,
                location: `${area}-T01-01`,
                quantityNeeded: 0,
                quantityPicked: 0,
                isPicked: false,
                orderNos: [],
              };
            }
            skuMap[cleanSku].quantityNeeded += Number(order.totalQuantity) || 1;
            skuMap[cleanSku].orderNos.push(order.orderNo);
          }
        });

        // Sắp xếp SKU theo khu vực kệ để tối ưu đường đi nhặt (Walking path)
        const items = Object.values(skuMap).sort((a, b) => a.area.localeCompare(b.area));
        const totalPcs = items.reduce((sum, item) => sum + item.quantityNeeded, 0);

        newBatches.push({
          id: `PL-BATCH-${String(batchCounter++).padStart(3, '0')}`,
          pickingCode: slice[0]?.pickingList || undefined,
          pickerId: targetPickerId,
          pickerName: targetPickerName,
          strategy,
          strategyLabel,
          status: newBatches.length === 0 ? 'IN_PROGRESS' : 'PENDING',
          createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          totalOrders: slice.length,
          totalItems: items.length,
          totalPcs,
          pickedPcs: 0,
          items,
          orderNos: slice.map(o => o.orderNo),
        });
      }
    };

    // Phân bổ thông minh cho các tài khoản theo chuyên môn
    const tkSingle = accounts.find(a => a.assignedStrategy === 'SINGLE_PCS') || accounts[0];
    const tkYoga = accounts.find(a => a.assignedStrategy === 'YOGA_ONLY') || accounts[1] || accounts[0];
    const tkMultiArea = accounts.find(a => a.assignedStrategy === 'MULTI_PCS_SAME_AREA' || a.assignedStrategy === 'MULTI_PCS') || accounts[0];
    const tkMix = accounts.find(a => a.assignedStrategy === 'MIX_ONLY' || a.assignedStrategy === 'MIX_MULTI_AREA') || accounts[2] || accounts[0];

    // 1. Nhóm 1 PCS
    if (singlePcsOrders.length > 0) {
      createBatchList(singlePcsOrders, 'SINGLE_PCS', '⚡ Đơn 1 PCS (Nhặt Nhanh)', tkSingle.id, tkSingle.name, tkSingle.maxOrdersPerBatch || 25);
    }

    // 2. Nhóm Đơn >= 2 PCS CÙNG KHU VỰC KỆ
    Object.entries(sameAreaMultiPcsMap).forEach(([area, areaOrders]) => {
      createBatchList(areaOrders, 'MULTI_PCS_SAME_AREA', `📦 Đơn ≥2 PCS Cùng ${area}`, tkMultiArea.id, tkMultiArea.name, 20);
    });

    // 3. Nhóm Thảm Yoga
    if (yogaOrders.length > 0) {
      createBatchList(yogaOrders, 'YOGA_ONLY', '🧘 Thảm Yoga & Cồng Kềnh', tkYoga.id, tkYoga.name, tkYoga.maxOrdersPerBatch || 20);
    }

    // 4. Nhóm Đơn Mix Liên Khu Vực
    if (mixMultiAreaOrders.length > 0) {
      createBatchList(mixMultiAreaOrders, 'MIX_MULTI_AREA', '🔀 Đơn Mix Liên Khu Vực', tkMix.id, tkMix.name, tkMix.maxOrdersPerBatch || 15);
    }

    setBatches(newBatches);
    showToast(`Đã phân bổ thành công ${newBatches.length} phiếu nhặt hàng (1 PCS, Cùng Kệ, Thảm Yoga, Mix)!`);
  }, [orders, skuGroups, accounts]);

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
