import React, { useState, useMemo } from 'react';
import {
  Layers,
  MapPin,
  Sparkles,
  Search,
  Filter,
  Download,
  Printer,
  Settings,
  TableProperties,
  ListOrdered,
  Code2,
  Boxes,
  Truck,
  CheckCircle2,
  Zap,
  Copy,
  Check,
  Warehouse,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { RawOrderRow, CarrierCode } from '../types';
import { CARRIER_CONFIG } from '../utils/orderProcessor';
import { CopyCarrierOrdersModal } from './CopyCarrierOrdersModal';

export type ActiveTabType =
  | 'sku_pcs'
  | 'inventory_query'
  | 'shipped_tracking'
  | 'picking_detail'
  | 'area_group'
  | 'mix_analysis'
  | 'yoga_mat'
  | 'single_pcs'
  | 'all_table'
  | 'sku_settings'
  | 'apps_script';

interface ToolbarProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  pickingLists: string[];
  selectedPickingList: string;
  setSelectedPickingList: (pl: string) => void;
  selectedCarrier: CarrierCode;
  setSelectedCarrier: (carrier: CarrierCode) => void;
  carrierCounts: Record<CarrierCode, number>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onExportExcel: () => void;
  onPrintPreview: () => void;
  totalOrders: number;
  orders?: RawOrderRow[];
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTab,
  setActiveTab,
  pickingLists = [],
  selectedPickingList = '',
  setSelectedPickingList,
  selectedCarrier = 'ALL',
  setSelectedCarrier = (_c: CarrierCode) => {},
  carrierCounts = { ALL: 0, JNT: 0, SPX: 0, GHN: 0, OTHER: 0 },
  searchTerm = '',
  setSearchTerm,
  onExportExcel,
  onPrintPreview,
  totalOrders = 0,
  orders = [],
}) => {
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [copyModalCarrier, setCopyModalCarrier] = useState<CarrierCode>('ALL');
  const [quickCopiedCarrier, setQuickCopiedCarrier] = useState<CarrierCode | null>(null);
  const [quickToastMessage, setQuickToastMessage] = useState<string | null>(null);

  const handleQuickCopyOrders = (carrierCode: CarrierCode, carrierLabel: string) => {
    if (!orders || orders.length === 0) {
      alert('Không có dữ liệu đơn hàng để sao chép.');
      return;
    }

    const list = orders.filter((o) => {
      if (selectedPickingList && o.pickingList !== selectedPickingList) return false;
      if (carrierCode === 'ALL') return true;
      if (carrierCode === 'GHN_ALL') return o.carrier === 'GHN' || o.carrier === 'GHN_TIKTOK';
      return o.carrier === carrierCode;
    });

    if (list.length === 0) {
      alert(`Không có đơn hàng nào cho hãng ${carrierLabel}!`);
      return;
    }

    const text = list.map((o) => o.orderNo).filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);

    setQuickCopiedCarrier(carrierCode);
    setQuickToastMessage(`Đã copy ${list.length} mã đơn ${carrierLabel}`);
    setTimeout(() => {
      setQuickCopiedCarrier(null);
      setQuickToastMessage(null);
    }, 2200);
  };
  const tabs = [
    {
      id: 'sku_pcs' as ActiveTabType,
      label: 'Tổng hợp SKU & Gộp PCS',
      icon: Layers,
      badge: 'Cột S:T & PCS',
    },
    {
      id: 'inventory_query' as ActiveTabType,
      label: 'Tra Cứu Tồn Kho WMS',
      icon: Warehouse,
      badge: 'Inventory Query',
    },
    {
      id: 'shipped_tracking' as ActiveTabType,
      label: 'Tra Cứu Vận Đơn Shipped',
      icon: Truck,
      badge: 'E11 = 8 & Realtime',
    },
    {
      id: 'picking_detail' as ActiveTabType,
      label: 'Tổng Hợp Theo Picking List',
      icon: ListOrdered,
      badge: `${pickingLists.length} Lists`,
    },
    {
      id: 'area_group' as ActiveTabType,
      label: 'Phân nhóm Khu Vực',
      icon: MapPin,
      badge: '13 Khu Vực',
    },
    {
      id: 'mix_analysis' as ActiveTabType,
      label: 'Bóc Tách Đơn MIX',
      icon: Boxes,
      badge: 'Lấy 1 lần',
    },
    {
      id: 'yoga_mat' as ActiveTabType,
      label: 'Phân loại Thảm Yoga',
      icon: Sparkles,
      badge: 'Yoga & L46',
    },
    {
      id: 'single_pcs' as ActiveTabType,
      label: 'Phân Tách SKU & Đóng Gói PCS',
      icon: Zap,
      badge: '1, 2, 3, Đồng chất...',
    },
    {
      id: 'all_table' as ActiveTabType,
      label: 'Dữ Liệu Gốc & Tra Cứu',
      icon: TableProperties,
      badge: `${totalOrders} đơn`,
    },
    {
      id: 'sku_settings' as ActiveTabType,
      label: 'Cấu hình SKU',
      icon: Settings,
    },
    {
      id: 'apps_script' as ActiveTabType,
      label: 'Mã Google Apps Script',
      icon: Code2,
      badge: 'Code.gs',
    },
  ];

  const carrierOptions: { code: CarrierCode; label: string; prefixHint: string; colorStyle: string; activeStyle: string }[] = [
    {
      code: 'ALL',
      label: 'Tất Cả ĐVVC',
      prefixHint: 'Tất cả đơn',
      colorStyle: 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50',
      activeStyle: 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200',
    },
    {
      code: 'SPX',
      label: 'Shopee Express',
      prefixHint: 'SPX, SPXVN...',
      colorStyle: 'border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-50',
      activeStyle: 'bg-orange-600 text-white border-orange-600 shadow-xs ring-2 ring-orange-200',
    },
    {
      code: 'JNT',
      label: 'J&T Express',
      prefixHint: 'Đầu 8..., JT...',
      colorStyle: 'border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50',
      activeStyle: 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-200',
    },
    {
      code: 'JT_CARGO',
      label: 'J&T Cargo',
      prefixHint: 'Đầu 530..., 53...',
      colorStyle: 'border-rose-300 text-rose-800 bg-rose-50/50 hover:bg-rose-50',
      activeStyle: 'bg-rose-700 text-white border-rose-700 shadow-xs ring-2 ring-rose-200',
    },
    {
      code: 'GHN',
      label: 'GHN',
      prefixHint: 'GY, GHN...',
      colorStyle: 'border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50',
      activeStyle: 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200',
    },
    {
      code: 'GHN_TIKTOK',
      label: 'GHN TikTok',
      prefixHint: 'VNGH...',
      colorStyle: 'border-cyan-300 text-cyan-800 bg-cyan-50/50 hover:bg-cyan-50',
      activeStyle: 'bg-cyan-700 text-white border-cyan-700 shadow-xs ring-2 ring-cyan-200',
    },
    {
      code: 'NINJAVAN',
      label: 'Ninja Van',
      prefixHint: 'NIVN, SHP...',
      colorStyle: 'border-purple-300 text-purple-800 bg-purple-50/50 hover:bg-purple-50',
      activeStyle: 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-200',
    },
    {
      code: 'VIETTELPOST',
      label: 'Viettel Post',
      prefixHint: 'SHOPEEVTP, VTP...',
      colorStyle: 'border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50',
      activeStyle: 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200',
    },
    {
      code: 'VNPOST',
      label: 'VNPost / EMS',
      prefixHint: 'EA, EB...',
      colorStyle: 'border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-50',
      activeStyle: 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-200',
    },
    {
      code: 'BEST',
      label: 'Best Express',
      prefixHint: 'TTVN, 61..., BEST',
      colorStyle: 'border-sky-300 text-sky-800 bg-sky-50/50 hover:bg-sky-50',
      activeStyle: 'bg-sky-600 text-white border-sky-600 shadow-xs ring-2 ring-sky-200',
    },
    {
      code: 'OTHER',
      label: 'Khác / Chưa Rõ',
      prefixHint: 'ĐVVC khác',
      colorStyle: 'border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200',
      activeStyle: 'bg-slate-700 text-white border-slate-700 shadow-xs ring-2 ring-slate-300',
    },
  ];

  // Helper lấy danh sách mã hãng đang được chọn
  const getSelectedCarrierCodes = (val: string): CarrierCode[] => {
    if (!val || val === 'ALL') return [];
    if (val === 'GHN_ALL') return ['GHN', 'GHN_TIKTOK'];
    return val.split(',').map((s) => s.trim() as CarrierCode);
  };

  // Helper kiểm tra 1 đơn hàng có khớp với bộ lọc ĐVVC hay không (hỗ trợ cả gộp nhiều hãng)
  const isOrderMatchCarrier = (orderCarrier: string | undefined, filter: string): boolean => {
    if (!filter || filter === 'ALL') return true;
    if (filter === 'GHN_ALL') return orderCarrier === 'GHN' || orderCarrier === 'GHN_TIKTOK';
    if (filter.includes(',')) {
      const list = filter.split(',').map((s) => s.trim());
      return list.some((c) => {
        if (c === 'ALL') return true;
        if (c === 'GHN_ALL') return orderCarrier === 'GHN' || orderCarrier === 'GHN_TIKTOK';
        return orderCarrier === c;
      });
    }
    return orderCarrier === filter;
  };

  // Cần gạt cho phép gộp nhiều ĐVVC (lưu vào localStorage)
  const [isMultiCarrierMode, setIsMultiCarrierMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('WMS_MULTI_CARRIER_MODE') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleMultiCarrierMode = () => {
    const next = !isMultiCarrierMode;
    setIsMultiCarrierMode(next);
    try {
      localStorage.setItem('WMS_MULTI_CARRIER_MODE', String(next));
    } catch {}

    if (!next) {
      // Khi gạt TẮT: Nếu đang gộp nhiều hãng, an toàn giữ lại hãng đầu tiên để người dùng không bị quên
      const currentList = getSelectedCarrierCodes(selectedCarrier);
      if (currentList.length > 1) {
        setSelectedCarrier(currentList[0]);
        setQuickToastMessage(`Đã TẮT gộp ĐVVC: Giữ lại ${CARRIER_CONFIG[currentList[0]]?.shortName || currentList[0]}`);
      } else {
        setQuickToastMessage('Đã TẮT chế độ gộp ĐVVC (Chế độ chọn 1 hãng an toàn)');
      }
      setTimeout(() => setQuickToastMessage(null), 2500);
    } else {
      setQuickToastMessage('Đã BẬT cần gạt gộp ĐVVC: Bạn có thể click chọn thêm hãng để gộp dữ liệu');
      setTimeout(() => setQuickToastMessage(null), 2500);
    }
  };

  // Danh sách các hãng đang active
  const activeCarrierCodes = useMemo(() => {
    return getSelectedCarrierCodes(selectedCarrier);
  }, [selectedCarrier]);

  // Tên hiển thị tóm tắt của các hãng đang chọn
  const activeCarriersSummary = useMemo(() => {
    if (selectedCarrier === 'ALL' || activeCarrierCodes.length === 0) return 'Tất cả ĐVVC';
    if (selectedCarrier === 'GHN_ALL') return 'Gộp Cả GHN';
    if (activeCarrierCodes.length === 1) {
      return CARRIER_CONFIG[activeCarrierCodes[0]]?.shortName || activeCarrierCodes[0];
    }
    return activeCarrierCodes
      .map((c) => CARRIER_CONFIG[c]?.shortName || c)
      .join(' + ');
  }, [selectedCarrier, activeCarrierCodes]);

  // Tổng số đơn của nhóm hãng đang lọc hiện tại
  const currentCarrierTotalOrders = useMemo(() => {
    if (selectedCarrier === 'ALL') return orders.length;
    if (selectedCarrier === 'GHN_ALL') return carrierCounts.GHN_ALL || 0;
    return activeCarrierCodes.reduce((sum, c) => sum + (carrierCounts[c] || 0), 0);
  }, [selectedCarrier, activeCarrierCodes, carrierCounts, orders.length]);

  // 1. Thống kê đơn theo từng Picking List & ĐVVC
  const pickingListStats = useMemo(() => {
    const stats: Record<string, { totalInList: number; carrierCount: number }> = {};
    pickingLists.forEach((pl) => {
      stats[pl] = { totalInList: 0, carrierCount: 0 };
    });

    orders.forEach((o) => {
      const pl = (o.pickingList || '').trim();
      if (!pl) return;
      if (!stats[pl]) {
        stats[pl] = { totalInList: 0, carrierCount: 0 };
      }
      stats[pl].totalInList++;
      const isMatch = isOrderMatchCarrier(o.carrier, selectedCarrier);
      if (isMatch) {
        stats[pl].carrierCount++;
      }
    });

    return stats;
  }, [orders, pickingLists, selectedCarrier]);

  // 2. Sắp xếp danh sách Picking List: danh sách có đơn của ĐVVC đang chọn được ưu tiên đưa lên trước
  const sortedPickingLists = useMemo(() => {
    return [...pickingLists].sort((a, b) => {
      if (selectedCarrier !== 'ALL') {
        const countA = pickingListStats[a]?.carrierCount || 0;
        const countB = pickingListStats[b]?.carrierCount || 0;
        if (countA !== countB) return countB - countA; // Có nhiều đơn của ĐVVC hơn lên trước
      }
      return a.localeCompare(b);
    });
  }, [pickingLists, pickingListStats, selectedCarrier]);

  // 3. Danh sách các Picking List có đơn cho ĐVVC đang chọn (dùng cho quick list chips)
  const listsWithCarrierOrders = useMemo(() => {
    if (selectedCarrier === 'ALL') return [];
    return sortedPickingLists
      .map((pl) => ({
        name: pl,
        count: pickingListStats[pl]?.carrierCount || 0,
        totalInList: pickingListStats[pl]?.totalInList || 0,
      }))
      .filter((it) => it.count > 0);
  }, [sortedPickingLists, pickingListStats, selectedCarrier]);

  // 4. Thống kê chi tiết các ĐVVC có trong Picking List đang chọn
  const carriersInSelectedList = useMemo(() => {
    if (!selectedPickingList) return [];
    const counts: Record<string, number> = {};
    orders.forEach((o) => {
      if ((o.pickingList || '').trim() === selectedPickingList) {
        const c = o.carrier || 'OTHER';
        counts[c] = (counts[c] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([code, count]) => ({
        code: code as CarrierCode,
        label: CARRIER_CONFIG[code as keyof typeof CARRIER_CONFIG]?.shortName || code,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders, selectedPickingList]);

  // 5. Số đơn hiện tại thoả mãn cả Picking List và ĐVVC
  const currentFilteredCount = useMemo(() => {
    return orders.filter((o) => {
      const matchPl = !selectedPickingList || (o.pickingList || '').trim() === selectedPickingList;
      const matchCarrier = isOrderMatchCarrier(o.carrier, selectedCarrier);
      return matchPl && matchCarrier;
    }).length;
  }, [orders, selectedPickingList, selectedCarrier]);

  const totalInCurrentList = useMemo(() => {
    if (!selectedPickingList) return 0;
    return orders.filter((o) => (o.pickingList || '').trim() === selectedPickingList).length;
  }, [orders, selectedPickingList]);

  // 6. Copy nhanh các mã đơn của riêng List và ĐVVC hiện tại
  const handleCopyCurrentListCarrier = () => {
    const matched = orders.filter((o) => {
      const matchPl = !selectedPickingList || (o.pickingList || '').trim() === selectedPickingList;
      const matchCarrier = isOrderMatchCarrier(o.carrier, selectedCarrier);
      return matchPl && matchCarrier;
    });
    const orderNos = matched.map((o) => o.orderNo).filter(Boolean);
    if (orderNos.length === 0) return;
    navigator.clipboard.writeText(orderNos.join('\n'));
    setQuickToastMessage(`Đã copy ${orderNos.length} đơn (${selectedPickingList || 'Tất cả list'} - ${activeCarriersSummary})`);
    setTimeout(() => setQuickToastMessage(null), 2500);
  };

  // 7. Xử lý click chọn hãng: có cần gạt an toàn, khi bật thì cho phép click chọn thêm bất kỳ hãng nào
  const handleCarrierClick = (code: CarrierCode) => {
    if (code === 'ALL') {
      setSelectedCarrier('ALL');
      return;
    }

    if (!isMultiCarrierMode) {
      // CHẾ ĐỘ AN TOÀN (Cần gạt TẮT): Người dùng chỉ chọn 1 hãng duy nhất, không bao giờ gộp nhầm
      if (code === 'GHN_ALL') {
        setSelectedCarrier(selectedCarrier === 'GHN_ALL' ? 'ALL' : 'GHN_ALL');
      } else {
        setSelectedCarrier(selectedCarrier === code ? 'ALL' : code);
      }
      return;
    }

    // CHẾ ĐỘ GỘP (Cần gạt BẬT): Cho phép click chọn thêm ĐVVC bất kỳ
    if (code === 'GHN_ALL') {
      const currentList = getSelectedCarrierCodes(selectedCarrier);
      const hasBoth = currentList.includes('GHN') && currentList.includes('GHN_TIKTOK');
      let next: CarrierCode[];
      if (hasBoth) {
        next = currentList.filter((c) => c !== 'GHN' && c !== 'GHN_TIKTOK');
      } else {
        const set = new Set([...currentList, 'GHN' as CarrierCode, 'GHN_TIKTOK' as CarrierCode]);
        next = Array.from(set);
      }
      if (next.length === 0) setSelectedCarrier('ALL');
      else if (next.length === 1) setSelectedCarrier(next[0]);
      else setSelectedCarrier(next.join(',') as CarrierCode);
      return;
    }

    // Toggle từng hãng đơn lẻ trong danh sách gộp
    const currentList = getSelectedCarrierCodes(selectedCarrier);
    let next: CarrierCode[];
    if (currentList.includes(code)) {
      // Đang có -> Bỏ chọn hãng này
      next = currentList.filter((c) => c !== code);
    } else {
      // Chưa có -> Thêm hãng này vào nhóm gộp
      next = [...currentList, code];
    }

    if (next.length === 0) {
      setSelectedCarrier('ALL');
    } else if (next.length === 1) {
      setSelectedCarrier(next[0]);
    } else {
      setSelectedCarrier(next.join(',') as CarrierCode);
    }
  };

  // Tự động chuyển về 'ALL' nếu tất cả các hãng đang chọn đều không có đơn hàng nào (0 đơn)
  React.useEffect(() => {
    if (orders.length > 0 && selectedCarrier !== 'ALL') {
      const activeList = getSelectedCarrierCodes(selectedCarrier);
      const hasAnyOrders = activeList.some((c) => (carrierCounts[c] || 0) > 0);
      if (!hasAnyOrders && activeList.length > 0) {
        setSelectedCarrier('ALL');
      }
    }
  }, [carrierCounts, selectedCarrier, orders.length, setSelectedCarrier]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs mb-6 overflow-hidden">
      {/* Top Filter and Actions Row */}
      <div className="p-3 sm:p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col gap-2.5">
        {/* Picking List Selector */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white px-2 sm:px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs shrink-0">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Picking List (Ô V1):</span>
            <span className="sm:hidden">List:</span>
          </div>

          <select
            value={selectedPickingList}
            onChange={(e) => setSelectedPickingList(e.target.value)}
            className="flex-1 min-w-[160px] text-xs font-medium bg-white border border-gray-200 rounded-xl px-2 sm:px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
          >
            <option value="">
              {selectedCarrier !== 'ALL'
                ? `-- Tất cả Lists (${currentCarrierTotalOrders} đơn ${activeCarriersSummary}) --`
                : `-- Tất cả Picking Lists (${orders.length} đơn) --`}
            </option>
            {sortedPickingLists.map((pl) => {
              const stat = pickingListStats[pl] || { totalInList: 0, carrierCount: 0 };
              const label =
                selectedCarrier !== 'ALL'
                  ? `${pl} ➔ ${stat.carrierCount} đơn ${activeCarriersSummary} (${stat.totalInList} tổng)`
                  : `${pl} ➔ ${stat.totalInList} đơn`;
              return (
                <option key={pl} value={pl}>
                  {label}
                </option>
              );
            })}
          </select>

          {selectedPickingList && (
            <button
              onClick={() => setSelectedPickingList('')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline px-1 cursor-pointer shrink-0"
            >
              Tất cả
            </button>
          )}

          {selectedPickingList && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold shadow-2xs">
              <span>📦 {selectedPickingList}:</span>
              <span className="text-indigo-600">
                {selectedCarrier !== 'ALL'
                  ? `${currentFilteredCount} đơn / ${totalInCurrentList} tổng`
                  : `${totalInCurrentList} đơn`}
              </span>
            </span>
          )}
        </div>

        {/* Search & Export Buttons - full width search on mobile */}
        <div className="flex items-center gap-2">
          {/* Quick Search - flex-1 trên mobile */}
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã đơn, SKU..."
              className="text-xs pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48 md:w-56 shadow-2xs"
            />
          </div>

          {/* Export Excel Button - icon only trên mobile nhỏ */}
          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            title="Xuất file Excel"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất Excel (.xlsx)</span>
          </button>

          {/* Print Button */}
          <button
            onClick={onPrintPreview}
            className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
            title="In phiếu gom hàng"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">In Phiếu</span>
            <span className="hidden lg:inline text-[10px] px-1.5 bg-indigo-50 text-indigo-700 rounded-md font-mono font-bold border border-indigo-200">
              100×150
            </span>
          </button>
        </div>
      </div>

      {/* Row 2: Chọn Đơn Vị Vận Chuyển */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-indigo-50/40 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-3">
        <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 bg-white px-2 sm:px-2.5 py-1.5 rounded-xl border border-indigo-200 shadow-2xs shrink-0">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Đóng Gói Theo ĐVVC:</span>
            <span className="sm:hidden">ĐVVC:</span>
          </div>

          {/* Nút mở Modal Sao Chép Đơn Theo Hãng */}
          <button
            type="button"
            onClick={() => {
              setCopyModalCarrier(selectedCarrier);
              setIsCopyModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs transition-all cursor-pointer hover:border-indigo-300"
            title="Mở bảng sao chép mã đơn hàng hoặc tracking theo từng hãng vận chuyển"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-600" />
            <span>Copy Đơn Theo Hãng</span>
          </button>

          {/* CẦN GẠT BẬT/TẮT GỘP ĐVVC (Tránh trường hợp người dùng quên đang gộp) */}
          <div
            onClick={handleToggleMultiCarrierMode}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer select-none shadow-2xs ${
              isMultiCarrierMode
                ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white border-indigo-600 shadow-indigo-500/20'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
            title={
              isMultiCarrierMode
                ? 'Cần gạt gộp ĐVVC đang BẬT: Bạn có thể click chọn thêm nhiều hãng để gộp dữ liệu. Click để TẮT'
                : 'Cần gạt gộp ĐVVC đang TẮT: Chế độ an toàn, chỉ chọn 1 hãng duy nhất tránh người dùng quên. Click để BẬT'
            }
          >
            {/* Toggle Switch Pill */}
            <div
              className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors ${
                isMultiCarrierMode ? 'bg-white/35 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="w-3 h-3 rounded-full bg-white shadow-xs" />
            </div>

            <div className="flex items-center gap-1 text-xs font-black">
              {isMultiCarrierMode ? (
                <span className="flex items-center gap-1 text-white">
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  <span>Gộp ĐVVC: BẬT</span>
                </span>
              ) : (
                <span className="text-slate-600">
                  <span>Gộp ĐVVC: TẮT</span>
                </span>
              )}
            </div>
          </div>

          {quickToastMessage && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 animate-in fade-in zoom-in-95 duration-150">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{quickToastMessage}</span>
            </span>
          )}

          <span className="text-[11px] text-gray-500 hidden xl:inline">
            {isMultiCarrierMode ? '(Click chọn thêm nhiều hãng để gộp)' : '(Bấm icon 📋 trên từng hãng để copy nhanh)'}
          </span>
        </div>

        {/* Carrier Badges Filter Group & 1-Click Copy */}
        <div className="flex items-center flex-wrap gap-2">
          {carrierOptions.map((opt) => {
            const count = carrierCounts[opt.code] || 0;

            // Tự động nhận diện: chỉ hiện hãng có từ 1 đơn trở lên (count >= 1). Hãng không có đơn (0 đơn) thì ẩn đi.
            // Riêng 'ALL' (Tất Cả ĐVVC) luôn luôn hiển thị để xem toàn bộ đơn.
            if (opt.code !== 'ALL' && count === 0) {
              return null;
            }

            const isSelected =
              opt.code === 'ALL'
                ? selectedCarrier === 'ALL' || !selectedCarrier || activeCarrierCodes.length === 0
                : activeCarrierCodes.includes(opt.code) || (opt.code === 'GHN' && selectedCarrier === 'GHN_ALL') || (opt.code === 'GHN_TIKTOK' && selectedCarrier === 'GHN_ALL');
            const isCopied = quickCopiedCarrier === opt.code;
            const isMergedPart = activeCarrierCodes.length > 1 && isSelected;

            return (
              <React.Fragment key={opt.code}>
                <div
                  className={`inline-flex items-center rounded-xl border transition-all ${
                    isSelected ? opt.activeStyle : opt.colorStyle
                  } ${isMergedPart ? 'ring-2 ring-blue-300' : ''}`}
                >
                  {/* Nút lọc hãng (Click chọn gộp nếu click cả GHN và GHN TikTok) */}
                  <button
                    onClick={() => handleCarrierClick(opt.code)}
                    className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-xs font-semibold cursor-pointer"
                    title={
                      isMergedPart
                        ? `Đang gộp cả GHN & GHN TikTok. Click để bỏ chọn ${opt.label}`
                        : opt.code === 'GHN' && selectedCarrier === 'GHN_TIKTOK'
                        ? 'Click để GỘP chung với GHN TikTok'
                        : opt.code === 'GHN_TIKTOK' && selectedCarrier === 'GHN'
                        ? 'Click để GỘP chung với GHN'
                        : `Lọc đơn ${opt.label}`
                    }
                  >
                    {isMergedPart && <CheckCircle2 className="w-3.5 h-3.5 text-white animate-in zoom-in" />}
                    <span>{opt.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-white/30 text-white'
                          : 'bg-black/5 text-gray-700'
                      }`}
                    >
                      {count}
                    </span>
                    <span className="text-[10px] opacity-75 hidden xl:inline">
                      ({opt.prefixHint})
                    </span>
                  </button>

                  {/* Nút Copy Nhanh 1-Click trực tiếp trên từng Badge */}
                  {count > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickCopyOrders(opt.code, opt.label);
                      }}
                      title={`Click để copy nhanh ${count} mã đơn của ${opt.label} (mỗi mã 1 dòng)`}
                      className={`p-1.5 mr-1 rounded-lg transition-colors cursor-pointer ${
                        isSelected
                          ? 'hover:bg-white/20 text-white'
                          : 'hover:bg-black/10 text-gray-600'
                      }`}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
                      )}
                    </button>
                  )}
                </div>

                {/* Nút Gộp Cả GHN: chỉ hiển thị khi CẢ 2 hãng GHN và GHN TikTok đều có từ 1 đơn trở lên */}
                {opt.code === 'GHN_TIKTOK' && (carrierCounts.GHN || 0) > 0 && (carrierCounts.GHN_TIKTOK || 0) > 0 && (
                  <div
                    key="GHN_ALL_BTN"
                    className={`inline-flex items-center rounded-xl border transition-all ${
                      selectedCarrier === 'GHN_ALL'
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300'
                        : 'border-blue-300 text-blue-800 bg-blue-50/80 hover:bg-blue-100/90'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleCarrierClick('GHN_ALL')}
                      className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 text-xs font-bold cursor-pointer"
                      title={
                        selectedCarrier === 'GHN_ALL'
                          ? 'Đang gộp GHN & GHN TikTok. Click để hủy gộp'
                          : 'Click để gộp toàn bộ dữ liệu Giao Hàng Nhanh (GHN + GHN TikTok VNGH...)'
                      }
                    >
                      <Zap className={`w-3.5 h-3.5 ${selectedCarrier === 'GHN_ALL' ? 'text-amber-300 fill-amber-300' : 'text-blue-600'}`} />
                      <span>Gộp Cả GHN</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          selectedCarrier === 'GHN_ALL'
                            ? 'bg-white/30 text-white'
                            : 'bg-blue-200/90 text-blue-900'
                        }`}
                      >
                        {carrierCounts.GHN_ALL || 0}
                      </span>
                      <span className="text-[10px] opacity-85 hidden xl:inline">
                        ({carrierCounts.GHN || 0}+{carrierCounts.GHN_TIKTOK || 0})
                      </span>
                    </button>

                    {(carrierCounts.GHN_ALL || 0) > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickCopyOrders('GHN_ALL', 'Gộp GHN (GHN + TikTok)');
                        }}
                        title={`Click để copy nhanh toàn bộ ${(carrierCounts.GHN_ALL || 0)} mã đơn của GHN & GHN TikTok`}
                        className={`p-1.5 mr-1 rounded-lg transition-colors cursor-pointer ${
                          selectedCarrier === 'GHN_ALL'
                            ? 'hover:bg-white/20 text-white'
                            : 'hover:bg-blue-200 text-blue-700'
                        }`}
                      >
                        {quickCopiedCarrier === 'GHN_ALL' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Dynamic List & Carrier Breakdown Insights Bar (Thống kê chi tiết List & ĐVVC) */}
      {(selectedCarrier !== 'ALL' || selectedPickingList) && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-white border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Case A: User selected a Carrier (e.g. SPX or JNT or GHN_ALL or multi-carrier merge) */}
          {selectedCarrier !== 'ALL' && (
            <div className="flex items-center flex-wrap gap-2">
              {activeCarrierCodes.length > 1 ? (
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-indigo-600 fill-indigo-500" />
                  <span>
                    ⚡ Đang gộp {activeCarrierCodes.length} hãng:{' '}
                    {activeCarrierCodes.map((c, idx) => (
                      <span key={c}>
                        {idx > 0 && ' + '}
                        <b>{CARRIER_CONFIG[c]?.name || c}</b> ({carrierCounts[c] || 0} đơn)
                      </span>
                    ))}{' '}
                    = <b className="text-indigo-700">{currentCarrierTotalOrders} đơn</b>
                    {listsWithCarrierOrders.length > 0
                      ? ` phân bổ trong ${listsWithCarrierOrders.length} Picking Lists:`
                      : ' (Không có trong list nào)'}
                  </span>
                </span>
              ) : selectedCarrier === 'GHN_ALL' ? (
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-blue-600 fill-blue-500" />
                  <span>
                    ⚡ Đang gộp 2 hãng: <b>Giao Hàng Nhanh</b> ({carrierCounts.GHN || 0} đơn) + <b>GHN TikTok</b> ({carrierCounts.GHN_TIKTOK || 0} đơn) = <b className="text-blue-700">{carrierCounts.GHN_ALL || 0} đơn</b>
                    {listsWithCarrierOrders.length > 0 ? ` phân bổ trong ${listsWithCarrierOrders.length} Picking Lists:` : ' (Không có trong list nào)'}
                  </span>
                </span>
              ) : (
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>
                    Hãng <b>{CARRIER_CONFIG[activeCarrierCodes[0] || selectedCarrier]?.name || selectedCarrier}</b> ({currentCarrierTotalOrders} đơn)
                    {listsWithCarrierOrders.length > 0 ? ` phân bổ trong ${listsWithCarrierOrders.length} Picking Lists:` : ' (Không có trong list nào)'}
                  </span>
                </span>
              )}

              {/* All Lists chip */}
              <button
                type="button"
                onClick={() => setSelectedPickingList('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer border transition-all ${
                  !selectedPickingList
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
                title="Xem toàn bộ các list của hãng này"
              >
                Tất cả ({currentCarrierTotalOrders} đơn)
              </button>

              {/* Clickable List Chips with direct counts */}
              {listsWithCarrierOrders.map((it) => {
                const isListSelected = selectedPickingList === it.name;
                return (
                  <button
                    key={it.name}
                    type="button"
                    onClick={() => setSelectedPickingList(it.name)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all flex items-center gap-1.5 ${
                      isListSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200'
                        : 'bg-white text-gray-800 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300'
                    }`}
                    title={`Chọn ${it.name}: có ${it.count} đơn ${activeCarriersSummary} trên tổng ${it.totalInList} đơn`}
                  >
                    <span>{it.name}:</span>
                    <span className={`font-bold ${isListSelected ? 'text-white' : 'text-indigo-600'}`}>
                      {it.count} đơn
                    </span>
                    <span className={`text-[10px] ${isListSelected ? 'text-indigo-200' : 'text-gray-400'}`}>
                      ({it.totalInList} tổng)
                    </span>
                  </button>
                );
              })}

              {/* Nút Hủy Gộp nhanh khi đang gộp >= 2 hãng */}
              {activeCarrierCodes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedCarrier('ALL')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-all shadow-2xs"
                  title="Hủy gộp tất cả hãng, quay lại xem toàn bộ đơn"
                >
                  <X className="w-3.5 h-3.5 text-rose-600" />
                  <span>Hủy gộp</span>
                </button>
              )}
            </div>
          )}

          {/* Case B: Carrier is ALL but a Picking List is selected */}
          {selectedCarrier === 'ALL' && selectedPickingList && (
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" />
                <span>
                  List <b>{selectedPickingList}</b> (<b>{totalInCurrentList} đơn</b>) gồm các hãng vận chuyển:
                </span>
              </span>

              {carriersInSelectedList.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCarrier(c.code)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
                  title={`Lọc chỉ xem ${c.label} trong list này`}
                >
                  <span>{c.label}:</span>
                  <span className="font-bold text-indigo-600">{c.count} đơn</span>
                </button>
              ))}
            </div>
          )}

          {/* Right Action: Quick Copy for currently filtered selection */}
          {selectedPickingList && currentFilteredCount > 0 && (
            <div className="flex items-center gap-2 shrink-0 ml-auto">
              <button
                type="button"
                onClick={handleCopyCurrentListCarrier}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
                title={`Sao chép ${currentFilteredCount} mã đơn của List ${selectedPickingList} (${activeCarriersSummary})`}
              >
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  Copy {currentFilteredCount} đơn ({selectedPickingList}
                  {selectedCarrier !== 'ALL' ? ` - ${activeCarriersSummary}` : ''})
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Tabs Navigation - scroll ngang mượt trên mobile */}
      <div className="flex items-center overflow-x-auto scrollbar-none p-1.5 sm:p-2 gap-0.5 sm:gap-1 bg-white border-t border-gray-100">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 rounded-full font-medium hidden sm:inline ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Modal Sao Chép Đơn Theo Hãng Vận Chuyển */}
      {isCopyModalOpen && (
        <CopyCarrierOrdersModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          orders={orders || []}
          selectedPickingList={selectedPickingList}
          initialCarrier={copyModalCarrier}
        />
      )}
    </div>
  );
};
