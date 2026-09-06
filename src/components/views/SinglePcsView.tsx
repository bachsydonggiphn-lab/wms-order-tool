import React, { useState, useMemo } from 'react';
import {
  Zap,
  Copy,
  Check,
  CheckCircle2,
  ArrowUpDown,
  Search,
  Download,
  Layers,
  Filter,
  Trophy,
  PackageCheck,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
  MapPin,
  Flame,
  Plus,
  Minus,
  SlidersHorizontal,
  Boxes,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  RawOrderRow,
  SkuGroupsMap,
  CarrierCode,
  SkuPackingPcsMode,
  SkuPackingSortMode,
  SkuPackingItem,
} from '../../types';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';
import {
  xuLyLocDon1PCS,
  xuLyPhanTachTheoSKU,
  CARRIER_CONFIG,
} from '../../utils/orderProcessor';

interface SinglePcsViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm: string;
}

export const SinglePcsView: React.FC<SinglePcsViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
  searchTerm: globalSearchTerm,
}) => {
  // Chế độ xem: 'by_sku' (Theo từng mã SKU - Xếp từ cao đến thấp) hoặc 'by_area' (Theo 13 Khu Vực)
  const [viewMode, setViewMode] = useState<'by_sku' | 'by_area'>('by_sku');

  // Cấu hình lọc SKU & PCS
  const [pcsMode, setPcsMode] = useState<SkuPackingPcsMode>('1_PCS');
  const [customPcsInput, setCustomPcsInput] = useState<number>(10);
  const [sortMode, setSortMode] = useState<SkuPackingSortMode>('order_count_desc');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState<string>('');

  // Trạng thái chọn SKU để đóng gói trước
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());

  // Trạng thái đánh dấu SKU đã đóng gói xong
  const [completedSkus, setCompletedSkus] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Phát hiện các số lượng PCS thực tế có trong dữ liệu đơn đồng chất (Single SKU)
  const availablePcsStats = useMemo(() => {
    const qtyCounts: Record<number, number> = {};
    let singleSkuTotalOrders = 0;
    let mixTotalOrders = 0;

    orders.forEach((ord) => {
      if (!ord.items || ord.items.length === 0) return;
      if (ord.items.length === 1) {
        singleSkuTotalOrders++;
        const q = ord.items[0].qty;
        qtyCounts[q] = (qtyCounts[q] || 0) + 1;
      } else {
        mixTotalOrders++;
      }
    });

    const distinctQtys = Object.keys(qtyCounts)
      .map(Number)
      .sort((a, b) => a - b);

    return {
      qtyCounts,
      distinctQtys,
      singleSkuTotalOrders,
      mixTotalOrders,
    };
  }, [orders]);

  // 1. Dữ liệu Phân Tách Theo SKU
  const breakdownResult = useMemo(() => {
    return xuLyPhanTachTheoSKU(
      orders,
      skuGroups,
      pcsMode,
      sortMode,
      selectedPickingList,
      selectedCarrier,
      selectedAreaFilter,
      customPcsInput
    );
  }, [orders, skuGroups, pcsMode, sortMode, selectedPickingList, selectedCarrier, selectedAreaFilter, customPcsInput]);

  // 2. Dữ liệu Phân Theo Khu Vực (Chế độ cũ)
  const { don1PCSTheoNhom, dynamicAreaList } = useMemo(() => {
    return xuLyLocDon1PCS(
      orders,
      skuGroups,
      DEFAULT_AREA_ORDER,
      selectedPickingList,
      selectedCarrier
    );
  }, [orders, skuGroups, selectedPickingList, selectedCarrier]);

  // Danh sách các khu vực có đơn
  const activeAreas = useMemo(() => {
    return dynamicAreaList.filter(
      (nhom) => don1PCSTheoNhom[nhom] && don1PCSTheoNhom[nhom].length > 0
    );
  }, [dynamicAreaList, don1PCSTheoNhom]);

  const totalSinglePcsInArea = useMemo(() => {
    return Object.values(don1PCSTheoNhom).reduce((sum, arr) => sum + arr.length, 0);
  }, [don1PCSTheoNhom]);

  // Lọc tìm kiếm cục bộ hoặc toàn cục
  const searchFilter = (localSearch || globalSearchTerm || '').trim().toLowerCase();

  const filteredSkuList = useMemo(() => {
    return breakdownResult.skuList.filter((item) => {
      // Ẩn SKU đã đóng nếu có tùy chọn
      if (hideCompleted && completedSkus.has(item.sku)) {
        return false;
      }

      if (!searchFilter) return true;

      const matchSku = item.sku.toLowerCase().includes(searchFilter);
      const matchArea = item.area.toLowerCase().includes(searchFilter);
      const matchOrderNo = item.orderNos.some((no) => no.toLowerCase().includes(searchFilter));

      return matchSku || matchArea || matchOrderNo;
    });
  }, [breakdownResult.skuList, hideCompleted, completedSkus, searchFilter]);

  // Thống kê nhanh danh sách đã chọn
  const selectedStats = useMemo(() => {
    const selectedItems = breakdownResult.skuList.filter((item) => selectedSkus.has(item.sku));
    const totalSelectedOrders = selectedItems.reduce((sum, it) => sum + it.orderCount, 0);
    const totalSelectedPcs = selectedItems.reduce((sum, it) => sum + it.totalQty, 0);
    const allSelectedOrderNos: string[] = [];
    selectedItems.forEach((it) => {
      it.orderNos.forEach((no) => allSelectedOrderNos.push(no));
    });

    return {
      selectedItems,
      totalSelectedOrders,
      totalSelectedPcs,
      allSelectedOrderNos,
      skuCount: selectedSkus.size,
    };
  }, [breakdownResult.skuList, selectedSkus]);

  // SKU Top 1 (Nhiều đơn nhất)
  const top1Sku = breakdownResult.skuList.length > 0 ? breakdownResult.skuList[0] : null;

  // Toggle chọn 1 SKU
  const handleToggleSku = (sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  };

  // Chọn Top N SKU
  const handleSelectTopN = (n: number) => {
    const topSkus = filteredSkuList.slice(0, n).map((it) => it.sku);
    setSelectedSkus(new Set(topSkus));
  };

  // Chọn tất cả SKU có số đơn trong khoảng [min, max]
  const handleSelectRangeOrders = (minOrders: number, maxOrders: number) => {
    const matched = filteredSkuList
      .filter((it) => it.orderCount >= minOrders && it.orderCount <= maxOrders)
      .map((it) => it.sku);
    setSelectedSkus(new Set(matched));
  };

  // Chọn tất cả SKU có từ N đơn hàng trở lên
  const handleSelectMinOrders = (minOrders: number) => {
    const matched = filteredSkuList.filter((it) => it.orderCount >= minOrders).map((it) => it.sku);
    setSelectedSkus(new Set(matched));
  };

  // Chọn tất cả SKU có từ N đơn hàng trở xuống (<= N đơn)
  const handleSelectMaxOrders = (maxOrders: number) => {
    const matched = filteredSkuList.filter((it) => it.orderCount <= maxOrders).map((it) => it.sku);
    setSelectedSkus(new Set(matched));
  };

  // Chọn tất cả SKU đang hiển thị
  const handleSelectAllVisible = () => {
    if (selectedSkus.size === filteredSkuList.length && filteredSkuList.length > 0) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set(filteredSkuList.map((it) => it.sku)));
    }
  };

  // Toggle hoàn thành đóng gói
  const handleToggleComplete = (sku: string) => {
    setCompletedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  };

  // Đánh dấu các SKU đã chọn là Đã Đóng Gói
  const handleMarkSelectedCompleted = () => {
    setCompletedSkus((prev) => {
      const next = new Set(prev);
      selectedSkus.forEach((sku) => next.add(sku));
      return next;
    });
    setSelectedSkus(new Set());
  };

  // Sao chép Order No cho 1 SKU cụ thể
  const handleCopySkuOrders = (sku: string, orderNos: string[]) => {
    if (!orderNos || orderNos.length === 0) return;
    navigator.clipboard.writeText(orderNos.join('\n'));
    setCopiedKey(`sku_${sku}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Sao chép toàn bộ Order No các SKU đã chọn
  const handleCopySelectedOrders = () => {
    if (selectedStats.allSelectedOrderNos.length === 0) return;
    navigator.clipboard.writeText(selectedStats.allSelectedOrderNos.join('\n'));
    setCopiedKey('batch_selected');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Xuất file Excel danh sách SKU đã chọn
  const handleExportSelectedExcel = () => {
    if (selectedStats.selectedItems.length === 0) return;

    const dataRows: Array<{
      'Mã SKU': string;
      'Khu Vực': string;
      'Số Đơn': number;
      'Tổng PCS': number;
      'Danh Sách Order No': string;
    }> = selectedStats.selectedItems.map((it) => ({
      'Mã SKU': it.sku,
      'Khu Vực': it.area,
      'Số Đơn': it.orderCount,
      'Tổng PCS': it.totalQty,
      'Danh Sách Order No': it.orderNos.join(', '),
    }));

    const detailRows: Array<{
      'STT': number;
      'Mã SKU': string;
      'Khu Vực': string;
      'Mã Đơn Hàng (Order No)': string;
      'Tracking No': string;
      'ĐVVC': string;
      'Picking List': string;
    }> = [];

    let count = 1;
    selectedStats.selectedItems.forEach((it) => {
      it.orders.forEach((ord) => {
        detailRows.push({
          'STT': count++,
          'Mã SKU': it.sku,
          'Khu Vực': it.area,
          'Mã Đơn Hàng (Order No)': ord.orderNo,
          'Tracking No': ord.trackingNo,
          'ĐVVC': ord.carrierName,
          'Picking List': ord.pickingList,
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(dataRows);
    const wsDetail = XLSX.utils.json_to_sheet(detailRows);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Hop_SKU_Chon');
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi_Tiet_Don_Hang');

    const fileName = `Danh_Sach_Dong_Goi_SKU_${selectedCarrier}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Copy Area (Chế độ cũ)
  const handleCopyArea = (nhom: string, list: string[]) => {
    if (!list || list.length === 0) return;
    navigator.clipboard.writeText(list.join('\n'));
    setCopiedKey(nhom);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper label chế độ PCS
  const getPcsModeLabel = () => {
    switch (pcsMode) {
      case '1_PCS':
        return 'Đơn 1 PCS (1 món)';
      case '2_PCS':
        return 'Đơn 2 PCS (2 món cùng loại)';
      case '3_PCS':
        return 'Đơn 3 PCS (3 món cùng loại)';
      case '4_PCS':
        return 'Đơn 4 PCS (4 món cùng loại)';
      case '5_PLUS_PCS':
        return 'Đơn 5+ PCS (Từ 5 món cùng loại)';
      case 'CUSTOM_PCS':
        return `Đơn đúng ${customPcsInput} PCS (Cùng loại)`;
      case 'SINGLE_SKU':
        return 'Đơn Đồng Chất (Single SKU - Mọi PCS)';
      case 'MIX_ORDERS':
        return 'Đơn MIX (Đa mã SKU)';
      case 'ALL_ORDERS':
        return 'Tất cả đơn hàng';
      default:
        return 'Đơn hàng';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Banner & Switcher */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
              Phân Tách Đơn Theo Mã SKU & Số Lượng PCS
            </h2>
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
              {breakdownResult.totalOrders} đơn ({breakdownResult.totalSkus} mã SKU)
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
              {getPcsModeLabel()}
            </span>
            {selectedCarrier !== 'ALL' && (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CARRIER_CONFIG[selectedCarrier]?.badgeBg} ${CARRIER_CONFIG[selectedCarrier]?.badgeText} ${CARRIER_CONFIG[selectedCarrier]?.badgeBorder}`}>
                ĐVVC: {CARRIER_CONFIG[selectedCarrier]?.shortName}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Tùy chọn lọc <strong>Đơn 1 PCS, 2 PCS, 3 PCS, Đơn đồng chất</strong> hoặc bất kỳ số lượng nào. Tự động sắp xếp từ <strong className="text-gray-700">Cao ➔ Thấp</strong> để đóng gói hàng loạt trước.
          </p>
        </div>

        {/* Chuyển chế độ xem */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl border border-gray-200/80 shrink-0 self-start lg:self-auto">
          <button
            onClick={() => setViewMode('by_sku')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'by_sku'
                ? 'bg-white text-indigo-700 shadow-xs border border-gray-200/70'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Theo Mã SKU (Cao ➔ Thấp)</span>
          </button>
          <button
            onClick={() => setViewMode('by_area')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'by_area'
                ? 'bg-white text-indigo-700 shadow-xs border border-gray-200/70'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span>Theo 13 Khu Vực Kho</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      {viewMode === 'by_sku' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Tổng đơn chế độ chọn */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                {getPcsModeLabel()}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {breakdownResult.totalOrders} <span className="text-xs font-normal text-gray-400">đơn</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Tổng cộng {breakdownResult.totalPcs} chiếc (PCS)
              </p>
            </div>
            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 text-amber-600">
              <Zap className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Tổng mã SKU */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Tổng Số Mã SKU</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {breakdownResult.totalSkus} <span className="text-xs font-normal text-gray-400">mã</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {completedSkus.size > 0 ? `Đã hoàn thành ${completedSkus.size} mã` : 'Sắp xếp theo số đơn'}
              </p>
            </div>
            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Top 1 SKU nhiều đơn nhất */}
          <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between bg-radial-[at_top_right] from-amber-50/40 via-white to-white">
            <div className="truncate pr-2">
              <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Top 1 Nhiều Đơn Nhất
              </p>
              {top1Sku ? (
                <>
                  <p className="text-lg font-bold text-gray-900 mt-0.5 font-mono truncate" title={top1Sku.sku}>
                    {top1Sku.sku}
                  </p>
                  <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                    {top1Sku.orderCount} đơn ({top1Sku.percentage}% tổng đơn)
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Chưa có dữ liệu</p>
              )}
            </div>
            {top1Sku && (
              <button
                onClick={() => handleToggleSku(top1Sku.sku)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer border ${
                  selectedSkus.has(top1Sku.sku)
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200'
                }`}
              >
                {selectedSkus.has(top1Sku.sku) ? '✓ Đang chọn' : 'Đóng trước'}
              </button>
            )}
          </div>

          {/* Card 4: Trạng thái chọn đóng hàng loạt */}
          <div className={`rounded-2xl p-4 shadow-2xs flex items-center justify-between border transition-all ${
            selectedStats.skuCount > 0
              ? 'bg-indigo-50/50 border-indigo-200'
              : 'bg-white border-gray-200/80'
          }`}>
            <div>
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Đang Chọn Đóng Gói</p>
              <p className="text-2xl font-bold text-indigo-700 mt-0.5">
                {selectedStats.skuCount} <span className="text-xs font-semibold text-gray-500">mã SKU</span>
              </p>
              <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                = {selectedStats.totalSelectedOrders} đơn hàng ({selectedStats.totalSelectedPcs} PCS)
              </p>
            </div>
            <div className="w-11 h-11 bg-indigo-100/70 rounded-xl flex items-center justify-center border border-indigo-200 text-indigo-700">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: THEO TỪNG MÃ SKU */}
      {viewMode === 'by_sku' && (
        <div className="space-y-4">
          {/* Controls Bar: Filters & Quick Actions */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3.5">
            {/* Quick Available PCS Chips (Tự động phát hiện các số lượng PCS thực tế trong lô hàng) */}
            <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/70 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                  <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                  Chọn nhanh theo số lượng thực tế:
                </span>

                {/* Nút Đơn Đồng Chất (Single SKU) */}
                <button
                  onClick={() => setPcsMode('SINGLE_SKU')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    pcsMode === 'SINGLE_SKU'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                  title="Gồm tất cả các đơn chỉ có 1 mã SKU duy nhất (bất kể 1, 2, 3, 10 PCS...)"
                >
                  🎯 Đơn Đồng Chất ({availablePcsStats.singleSkuTotalOrders} đơn)
                </button>

                {/* Các nút PCS cụ thể có trong dataset */}
                {availablePcsStats.distinctQtys.map((qty) => {
                  const count = availablePcsStats.qtyCounts[qty] || 0;
                  const isActive =
                    (pcsMode === '1_PCS' && qty === 1) ||
                    (pcsMode === '2_PCS' && qty === 2) ||
                    (pcsMode === '3_PCS' && qty === 3) ||
                    (pcsMode === '4_PCS' && qty === 4) ||
                    (pcsMode === 'CUSTOM_PCS' && customPcsInput === qty);

                  return (
                    <button
                      key={qty}
                      onClick={() => {
                        if (qty === 1) setPcsMode('1_PCS');
                        else if (qty === 2) setPcsMode('2_PCS');
                        else if (qty === 3) setPcsMode('3_PCS');
                        else if (qty === 4) setPcsMode('4_PCS');
                        else {
                          setCustomPcsInput(qty);
                          setPcsMode('CUSTOM_PCS');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {qty === 1 ? '⚡ 1 PCS' : `📦 ${qty} PCS`} ({count} đơn)
                    </button>
                  );
                })}

                {/* Nút Đơn MIX nếu có */}
                {availablePcsStats.mixTotalOrders > 0 && (
                  <button
                    onClick={() => setPcsMode('MIX_ORDERS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      pcsMode === 'MIX_ORDERS'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
                    }`}
                  >
                    🔀 Đơn MIX ({availablePcsStats.mixTotalOrders} đơn)
                  </button>
                )}
              </div>

              {/* Tùy chỉnh số PCS linh hoạt */}
              <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-200">
                <span className="text-[11px] text-gray-500 font-medium">Số PCS tùy chọn:</span>
                <button
                  onClick={() => {
                    const next = Math.max(1, customPcsInput - 1);
                    setCustomPcsInput(next);
                    setPcsMode('CUSTOM_PCS');
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={customPcsInput}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setCustomPcsInput(val);
                    setPcsMode('CUSTOM_PCS');
                  }}
                  className="w-10 text-center font-bold text-xs bg-gray-50 border border-gray-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={() => {
                    const next = customPcsInput + 1;
                    setCustomPcsInput(next);
                    setPcsMode('CUSTOM_PCS');
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <span className="text-[11px] font-semibold text-gray-600">PCS</span>
              </div>
            </div>

            {/* Row 2: Bộ lọc chính, Sắp xếp, Khu vực & Tìm kiếm */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  Chế độ:
                </span>
                <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-200">
                  <button
                    onClick={() => setPcsMode('1_PCS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      pcsMode === '1_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ⚡ 1 PCS
                  </button>
                  <button
                    onClick={() => setPcsMode('2_PCS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      pcsMode === '2_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📦 2 PCS
                  </button>
                  <button
                    onClick={() => setPcsMode('3_PCS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      pcsMode === '3_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📦 3 PCS
                  </button>
                  <button
                    onClick={() => setPcsMode('4_PCS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      pcsMode === '4_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📦 4 PCS
                  </button>
                  <button
                    onClick={() => setPcsMode('5_PLUS_PCS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      pcsMode === '5_PLUS_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📦 5+ PCS
                  </button>
                  <button
                    onClick={() => setPcsMode('SINGLE_SKU')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      pcsMode === 'SINGLE_SKU' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Đơn đồng chất: 1 mã SKU duy nhất, bất kể số lượng PCS"
                  >
                    🎯 Đồng chất
                  </button>
                  <button
                    onClick={() => setPcsMode('ALL_ORDERS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      pcsMode === 'ALL_ORDERS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🌐 Tất cả đơn
                  </button>
                </div>

                {/* Sắp xếp */}
                <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
                  <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    Xếp:
                  </span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SkuPackingSortMode)}
                    className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="order_count_desc">🏆 Số đơn: Cao ➔ Thấp</option>
                    <option value="qty_desc">📦 Tổng PCS: Nhiều ➔ Ít</option>
                    <option value="sku_asc">🔤 Tên SKU: A ➔ Z</option>
                    <option value="area_asc">📍 Theo Khu Vực Kho</option>
                  </select>
                </div>

                {/* Lọc Khu Vực */}
                <select
                  value={selectedAreaFilter}
                  onChange={(e) => setSelectedAreaFilter(e.target.value)}
                  className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="ALL">📍 Tất cả khu vực kho</option>
                  {dynamicAreaList.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm mã SKU, mã đơn..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {localSearch && (
                  <button
                    onClick={() => setLocalSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Selection Presets & Completed Toggle */}
            <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-gray-500 font-medium">Chọn nhanh:</span>

                {/* Preset < 5 đơn */}
                {filteredSkuList.filter((it) => it.orderCount < 5).length > 0 && (
                  <button
                    onClick={() => handleSelectRangeOrders(1, 4)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>&lt; 5 đơn</span>
                    <span className="text-[10px] bg-slate-300 text-slate-800 px-1 rounded-full font-bold">
                      {filteredSkuList.filter((it) => it.orderCount < 5).length} SKU
                    </span>
                  </button>
                )}

                {/* Preset 5 - 9 đơn */}
                {filteredSkuList.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).length > 0 && (
                  <button
                    onClick={() => handleSelectRangeOrders(5, 9)}
                    className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>5 - 9 đơn</span>
                    <span className="text-[10px] bg-sky-200 text-sky-900 px-1 rounded-full">
                      {filteredSkuList.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).length} SKU
                    </span>
                  </button>
                )}

                {/* Preset 10 - 19 đơn */}
                {filteredSkuList.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).length > 0 && (
                  <button
                    onClick={() => handleSelectRangeOrders(10, 19)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>10 - 19 đơn</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded-full">
                      {filteredSkuList.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).length} SKU
                    </span>
                  </button>
                )}

                {/* Preset >= 20 đơn */}
                {filteredSkuList.filter((it) => it.orderCount >= 20).length > 0 && (
                  <button
                    onClick={() => handleSelectMinOrders(20)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>≥ 20 đơn</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded-full">
                      {filteredSkuList.filter((it) => it.orderCount >= 20).length} SKU
                    </span>
                  </button>
                )}

                {/* Preset >= 5 đơn (Tổng hợp từ 5 trở lên) */}
                {filteredSkuList.filter((it) => it.orderCount >= 5).length > 0 && (
                  <button
                    onClick={() => handleSelectMinOrders(5)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>≥ 5 đơn (Tổng)</span>
                    <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1 rounded-full">
                      {filteredSkuList.filter((it) => it.orderCount >= 5).length} SKU
                    </span>
                  </button>
                )}

                <button
                  onClick={() => handleSelectTopN(3)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Top 3
                </button>
                <button
                  onClick={() => handleSelectTopN(5)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Top 5
                </button>
                <button
                  onClick={() => handleSelectTopN(10)}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Top 10
                </button>
                <button
                  onClick={handleSelectAllVisible}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  {selectedSkus.size === filteredSkuList.length && filteredSkuList.length > 0
                    ? 'Bỏ chọn tất cả'
                    : 'Chọn tất cả'}
                </button>
                {selectedSkus.size > 0 && (
                  <button
                    onClick={() => setSelectedSkus(new Set())}
                    className="px-2 py-1 text-gray-400 hover:text-red-600 font-medium transition-colors cursor-pointer"
                  >
                    Xóa chọn ({selectedSkus.size})
                  </button>
                )}
              </div>

              {/* Hide / Show completed toggle */}
              <div className="flex items-center gap-3">
                {completedSkus.size > 0 && (
                  <button
                    onClick={() => setHideCompleted(!hideCompleted)}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    {hideCompleted ? <Eye className="w-3.5 h-3.5 text-indigo-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{hideCompleted ? `Hiện lại ${completedSkus.size} SKU đã đóng` : `Ẩn ${completedSkus.size} SKU đã đóng`}</span>
                  </button>
                )}
                {completedSkus.size > 0 && (
                  <button
                    onClick={() => setCompletedSkus(new Set())}
                    className="flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                    title="Đặt lại trạng thái hoàn thành"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Floating Batch Action Toolbar when SKUs are selected */}
          {selectedStats.skuCount > 0 && (
            <div className="bg-indigo-900 text-white rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-9 h-9 bg-indigo-800 rounded-xl flex items-center justify-center text-amber-300 font-bold border border-indigo-700">
                  {selectedStats.skuCount}
                </div>
                <div>
                  <p className="font-bold flex items-center gap-2">
                    <span>Đã chọn {selectedStats.skuCount} mã SKU</span>
                    <span className="px-2 py-0.5 bg-amber-400 text-indigo-950 rounded-full text-xs font-extrabold">
                      {selectedStats.totalSelectedOrders} ĐƠN HÀNG
                    </span>
                  </p>
                  <p className="text-xs text-indigo-200">
                    Sẵn sàng xuất hàng hoặc sao chép mã đơn để dán vào máy in bill / hệ thống kho
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={handleCopySelectedOrders}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
                >
                  {copiedKey === 'batch_selected' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-800" />
                      <span>Đã chép {selectedStats.totalSelectedOrders} mã đơn!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao Chép {selectedStats.totalSelectedOrders} Order No</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleExportSelectedExcel}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-medium rounded-xl text-xs border border-indigo-600 transition-colors cursor-pointer"
                  title="Xuất file Excel danh sách các SKU đã chọn"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Excel Đợt Này</span>
                </button>

                <button
                  onClick={handleMarkSelectedCompleted}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
                  title="Đánh dấu các SKU này là Đã Đóng Gói"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Xong Đợt Này ✓</span>
                </button>
              </div>
            </div>
          )}

          {/* SKU Cards Grid */}
          {filteredSkuList.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
              Không tìm thấy mã SKU nào phù hợp với bộ lọc hiện tại ({getPcsModeLabel()}).
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
              {filteredSkuList.map((item, index) => {
                const isSelected = selectedSkus.has(item.sku);
                const isCompleted = completedSkus.has(item.sku);
                const isTop1 = index === 0 && sortMode === 'order_count_desc';
                const isTop2 = index === 1 && sortMode === 'order_count_desc';
                const isTop3 = index === 2 && sortMode === 'order_count_desc';

                return (
                  <div
                    key={item.sku}
                    className={`rounded-2xl border transition-all flex flex-col overflow-hidden ${
                      isCompleted
                        ? 'bg-emerald-50/40 border-emerald-200 opacity-75'
                        : isSelected
                        ? 'bg-indigo-50/40 border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    {/* Header */}
                    <div className={`p-3.5 border-b flex items-start justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-200'
                        : isCompleted
                        ? 'bg-emerald-100/50 border-emerald-200'
                        : 'bg-gray-50/70 border-gray-100'
                    }`}>
                      <div className="flex items-start gap-2.5 truncate">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleSku(item.sku)}
                          className="mt-0.5 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                          title={isSelected ? 'Bỏ chọn SKU này' : 'Chọn SKU này để đóng gói'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>

                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            {/* Rank Badge */}
                            {isTop1 ? (
                              <span className="px-1.5 py-0.2 bg-amber-400 text-indigo-950 rounded text-[10px] font-black tracking-tight shrink-0">
                                #1 TOP
                              </span>
                            ) : isTop2 ? (
                              <span className="px-1.5 py-0.2 bg-slate-300 text-gray-800 rounded text-[10px] font-bold shrink-0">
                                #2
                              </span>
                            ) : isTop3 ? (
                              <span className="px-1.5 py-0.2 bg-amber-700/20 text-amber-900 rounded text-[10px] font-bold shrink-0">
                                #3
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-gray-400 shrink-0">
                                #{index + 1}
                              </span>
                            )}

                            <h3
                              className="font-mono font-bold text-xs text-gray-900 truncate"
                              title={item.sku}
                            >
                              {item.sku}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] px-2 py-0.5 bg-gray-200/80 text-gray-700 rounded-md font-medium truncate max-w-[120px]">
                              {item.area}
                            </span>
                            {isCompleted && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-md flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Đã đóng
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Order Count Badge */}
                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black border ${
                          isTop1
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                            : isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-800 border-gray-200'
                        }`}>
                          {item.orderCount} <span className="text-[10px] font-normal ml-0.5">đơn</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar & Stats */}
                    <div className="px-3.5 py-2 bg-white/60 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                      <div className="flex items-center gap-1.5 w-1/2">
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isTop1 ? 'bg-amber-500' : isSelected ? 'bg-indigo-600' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(8, item.percentage * 3))}%` }}
                          />
                        </div>
                      </div>
                      <span className="font-semibold text-gray-700 text-[10px]">
                        {item.percentage}% ({item.totalQty} PCS)
                      </span>
                    </div>

                    {/* Order No List */}
                    <div className="p-3 space-y-1 max-h-48 overflow-y-auto font-mono flex-1 bg-white">
                      {item.orderNos.map((orderNo, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            navigator.clipboard.writeText(orderNo);
                            setCopiedKey(`ord_${orderNo}`);
                            setTimeout(() => setCopiedKey(null), 1500);
                          }}
                          className="text-[11px] text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/60 p-1.5 rounded-lg border border-transparent hover:border-indigo-100 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <span className="truncate">{orderNo}</span>
                          {copiedKey === `ord_${orderNo}` ? (
                            <span className="text-[9px] text-emerald-600 font-bold font-sans">✓ Đã chép</span>
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-2.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => handleCopySkuOrders(item.sku, item.orderNos)}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-semibold text-gray-700 transition-colors cursor-pointer shadow-2xs"
                        title={`Sao chép toàn bộ ${item.orderCount} Order No của SKU ${item.sku}`}
                      >
                        {copiedKey === `sku_${item.sku}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-700">Đã chép {item.orderCount} đơn</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-gray-500" />
                            <span>Chép {item.orderCount} đơn</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleToggleComplete(item.sku)}
                        className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-white hover:bg-emerald-50 text-gray-400 hover:text-emerald-700 border-gray-200'
                        }`}
                        title={isCompleted ? 'Hủy đánh dấu hoàn thành' : 'Đánh dấu đã đóng gói xong'}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: THEO 13 KHU VỰC KHO (Chế độ cũ) */}
      {viewMode === 'by_area' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-500" />
                Phân Bổ Đơn 1 PCS Theo 13 Khu Vực Kho
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Tổng cộng {totalSinglePcsInArea} đơn 1 món phân bổ đều theo từng phân khu lưu trữ kho.
              </p>
            </div>

            <button
              onClick={() => {
                const lines: string[] = [];
                activeAreas.forEach((nhom) => {
                  lines.push(`=== ${nhom} (${don1PCSTheoNhom[nhom].length} ĐƠN) ===`);
                  don1PCSTheoNhom[nhom].forEach((o) => lines.push(o));
                  lines.push('');
                });
                navigator.clipboard.writeText(lines.join('\n'));
                setCopiedKey('all_single');
                setTimeout(() => setCopiedKey(null), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-700 transition-colors cursor-pointer border border-gray-200 shadow-2xs shrink-0"
            >
              {copiedKey === 'all_single' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
              <span>{copiedKey === 'all_single' ? 'Đã sao chép tất cả' : 'Sao chép tất cả khu vực'}</span>
            </button>
          </div>

          {activeAreas.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
              Không có đơn hàng nào thuộc diện 1 PCS trong danh sách hiện tại.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {activeAreas.map((nhom) => {
                const list = don1PCSTheoNhom[nhom] || [];

                return (
                  <div
                    key={nhom}
                    className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col hover:border-gray-300 transition-all"
                  >
                    {/* Header */}
                    <div className="p-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-xs text-gray-900">{nhom}</h3>
                        <p className="text-[11px] text-gray-400">{list.length} đơn 1 PCS</p>
                      </div>

                      <button
                        onClick={() => handleCopyArea(nhom, list)}
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                        title={`Sao chép ${list.length} mã đơn của ${nhom}`}
                      >
                        {copiedKey === nhom ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Orders List */}
                    <div className="p-3 space-y-1 max-h-64 overflow-y-auto font-mono">
                      {list.map((orderNo, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            navigator.clipboard.writeText(orderNo);
                            setCopiedKey(`ord_${orderNo}`);
                            setTimeout(() => setCopiedKey(null), 1500);
                          }}
                          className="text-[11px] text-gray-700 hover:text-indigo-600 hover:bg-gray-50 p-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <span>{orderNo}</span>
                          {copiedKey === `ord_${orderNo}` ? (
                            <span className="text-[9px] text-emerald-600 font-bold font-sans">✓</span>
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
