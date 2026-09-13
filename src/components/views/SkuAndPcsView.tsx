import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  Search,
  Layers,
  Box,
  CheckCircle2,
  FileText,
  ArrowUpDown,
  Zap,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Maximize2,
  X,
  CheckSquare,
  Square,
  Trophy,
  Download,
  Flame,
  ListOrdered,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RawOrderRow, SkuCountResult, PcsGroupResult, CarrierCode, SkuGroupsMap } from '../../types';
import { xuLyGopPCS, CARRIER_CONFIG } from '../../utils/orderProcessor';
import { DEFAULT_SKU_GROUPS } from '../../utils/skuData';
import { ActiveTabType } from '../Toolbar';

interface SkuAndPcsViewProps {
  orders: RawOrderRow[];
  skuGroups?: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm: string;
  onNavigateTab?: (tab: ActiveTabType) => void;
}

export interface ColumnSkuItem {
  sku: string;
  orderCount: number;
  totalQty: number;
  orderNos: string[];
  orders: RawOrderRow[];
  percentage: number;
}

export const SkuAndPcsView: React.FC<SkuAndPcsViewProps> = ({
  orders,
  skuGroups = DEFAULT_SKU_GROUPS,
  selectedPickingList,
  selectedCarrier = 'ALL',
  searchTerm,
  onNavigateTab,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [skuSortMode, setSkuSortMode] = useState<'name' | 'qty'>('name');

  // Chế độ hiển thị trong các cột PCS: 'sku' (Phân loại theo SKU) hoặc 'order_no' (Mã đơn thô)
  const [columnViewMode, setColumnViewMode] = useState<'sku' | 'order_no'>('sku');

  // Bộ lọc khoảng số lượng đơn hàng của SKU: 'all' | 'lt5' | '5-9' | '10-19' | '20' | 'ge5' | 'lt9' | 'custom'
  const [minOrderThreshold, setMinOrderThreshold] = useState<'all' | 'lt5' | '5-9' | '10-19' | '20' | 'ge5' | 'lt9' | 'custom'>('all');
  const [customMinOrders, setCustomMinOrders] = useState<number>(10);

  // Trạng thái mở rộng danh sách order no cho từng SKU cụ thể: key format `colKey_sku`
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());

  // Modal xem chi tiết phân tách SKU của 1 cột PCS cụ thể
  const [inspectColumnKey, setInspectColumnKey] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState<string>('');
  const [modalSelectedSkus, setModalSelectedSkus] = useState<Set<string>>(new Set());

  const { skuResult, pcsGroups } = xuLyGopPCS(orders, selectedPickingList, selectedCarrier, skuGroups);

  // Map nhanh OrderNo -> RawOrderRow
  const orderMap = useMemo(() => {
    const map = new Map<string, RawOrderRow>();
    orders.forEach((o) => {
      map.set(o.orderNo, o);
    });
    return map;
  }, [orders]);

  // Xử lý danh sách SKU cột bên trái (S:T)
  let skuEntries = Object.entries(skuResult);
  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    skuEntries = skuEntries.filter(([sku]) => sku.toLowerCase().includes(term));
  }

  if (skuSortMode === 'name') {
    skuEntries.sort((a, b) => a[0].localeCompare(b[0]));
  } else {
    skuEntries.sort((a, b) => b[1] - a[1]);
  }

  const totalSkuQty = Object.values(skuResult).reduce((a: number, b: number) => a + b, 0);

  // Xử lý thứ tự các cột PCS
  const pcsKeys: string[] = [];
  for (const k in pcsGroups) {
    if (k !== 'MIX' && k !== 'MIX L46') pcsKeys.push(k);
  }
  pcsKeys.sort((a, b) => Number(a) - Number(b));
  if (pcsGroups['MIX L46']) pcsKeys.push('MIX L46');
  if (pcsGroups['MIX']) pcsKeys.push('MIX');

  // Phân tích SKU cho từng cột PCS (Sắp xếp Cao ➔ Thấp)
  const columnSkuBreakdowns = useMemo(() => {
    const breakdownMap: Record<string, ColumnSkuItem[]> = {};

    pcsKeys.forEach((key) => {
      const orderNos = pcsGroups[key] || [];
      const skuMap = new Map<string, {
        sku: string;
        orderNos: Set<string>;
        ordersMap: Map<string, RawOrderRow>;
        totalQty: number;
      }>();

      orderNos.forEach((orderNo) => {
        const order = orderMap.get(orderNo);
        if (!order || !order.items || order.items.length === 0) return;

        let targetSku = '';
        let targetQty = 0;

        if (order.items.length === 1) {
          targetSku = order.items[0].sku.trim();
          targetQty = order.items[0].qty;
        } else {
          // Đơn MIX: hiển thị combo các SKU
          targetSku = order.items.map((it) => `${it.qty}x ${it.sku}`).join(' + ');
          targetQty = order.items.reduce((s, it) => s + it.qty, 0);
        }

        if (!targetSku) return;

        let entry = skuMap.get(targetSku);
        if (!entry) {
          entry = {
            sku: targetSku,
            orderNos: new Set(),
            ordersMap: new Map(),
            totalQty: 0,
          };
          skuMap.set(targetSku, entry);
        }

        entry.orderNos.add(orderNo);
        entry.ordersMap.set(orderNo, order);
        entry.totalQty += targetQty;
      });

      const totalOrdersInCol = orderNos.length;
      const skuList: ColumnSkuItem[] = Array.from(skuMap.values()).map((entry) => {
        const list = Array.from(entry.orderNos);
        const orderCount = list.length;
        const percentage = totalOrdersInCol > 0 ? (orderCount / totalOrdersInCol) * 100 : 0;

        return {
          sku: entry.sku,
          orderCount,
          totalQty: entry.totalQty,
          orderNos: list,
          orders: Array.from(entry.ordersMap.values()),
          percentage: Number(percentage.toFixed(1)),
        };
      });

      // Sắp xếp số đơn Cao ➔ Thấp
      skuList.sort((a, b) => b.orderCount - a.orderCount || a.sku.localeCompare(b.sku));
      breakdownMap[key] = skuList;
    });

    return breakdownMap;
  }, [pcsKeys, pcsGroups, orderMap]);

  // Số lượng đơn tối thiểu đang kích hoạt (0 = Tất cả)
  const activeThresholdNum = useMemo(() => {
    if (minOrderThreshold === 'all' || minOrderThreshold === 'lt9' || minOrderThreshold === 'lt5' || minOrderThreshold === '5-9' || minOrderThreshold === '10-19' || minOrderThreshold === '20') return 0;
    if (minOrderThreshold === 'ge5') return 5;
    if (minOrderThreshold === 'custom') return Math.max(1, customMinOrders || 1);
    return 0;
  }, [minOrderThreshold, customMinOrders]);

  // Thống kê toàn cục các SKU theo từng khoảng đơn hàng: 5-9 đơn, 10-19 đơn, >=20 đơn, <=9 đơn, <5 đơn
  const globalThresholdStats = useMemo(() => {
    const allColSkus: ColumnSkuItem[] = [];
    Object.values(columnSkuBreakdowns).forEach((list) => {
      allColSkus.push(...list);
    });

    const getStatsForRange = (minOrders: number, maxOrders: number = Infinity) => {
      const matched = allColSkus.filter((it) => it.orderCount >= minOrders && it.orderCount <= maxOrders);
      const orderNos: string[] = [];
      matched.forEach((it) => it.orderNos.forEach((no) => orderNos.push(no)));
      return {
        matchedSkus: matched,
        skuCount: matched.length,
        totalOrders: orderNos.length,
        orderNos,
      };
    };

    return {
      under5: getStatsForRange(1, 4),
      r5_9: getStatsForRange(5, 9),
      r10_19: getStatsForRange(10, 19),
      ge20: getStatsForRange(20, Infinity),
      under9: getStatsForRange(1, 9),
      ge10: getStatsForRange(10, Infinity),
      ge5: getStatsForRange(5, Infinity),
    };
  }, [columnSkuBreakdowns]);

  // Copy toàn bộ đơn của các SKU nằm trong khoảng [min, max] (trên toàn bộ các cột PCS)
  const handleCopyGlobalRange = (minOrders: number, maxOrders: number = Infinity, labelKey: string) => {
    const allColSkus: ColumnSkuItem[] = [];
    Object.values(columnSkuBreakdowns).forEach((list) => {
      allColSkus.push(...list);
    });
    const matched = allColSkus.filter((it) => it.orderCount >= minOrders && it.orderCount <= maxOrders);
    const orderNos: string[] = [];
    matched.forEach((it) => it.orderNos.forEach((no) => orderNos.push(no)));
    if (orderNos.length === 0) return;

    navigator.clipboard.writeText(orderNos.join('\n'));
    setCopiedKey(labelKey);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Copy toàn bộ đơn của các SKU nằm trong khoảng [min, max] trong 1 cột PCS cụ thể
  const handleCopyColumnRange = (colKey: string, minOrders: number, maxOrders: number = Infinity, labelKey: string) => {
    const list = columnSkuBreakdowns[colKey] || [];
    const matched = list.filter((it) => it.orderCount >= minOrders && it.orderCount <= maxOrders);
    const orderNos: string[] = [];
    matched.forEach((it) => it.orderNos.forEach((no) => orderNos.push(no)));
    if (orderNos.length === 0) return;

    navigator.clipboard.writeText(orderNos.join('\n'));
    setCopiedKey(labelKey);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Copy toàn bộ cột PCS
  const handleCopyColumn = (title: string, list: string[]) => {
    if (!list || list.length === 0) return;
    navigator.clipboard.writeText(list.join('\n'));
    setCopiedKey(title);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Copy danh sách đơn của 1 SKU trong cột
  const handleCopySkuInColumn = (keyIdentifier: string, orderNos: string[]) => {
    if (!orderNos || orderNos.length === 0) return;
    navigator.clipboard.writeText(orderNos.join('\n'));
    setCopiedKey(keyIdentifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Copy toàn bộ bảng SKU bên trái
  const handleCopySkuTable = () => {
    const text = ['SKU\tSỐ LƯỢNG', ...skuEntries.map(([sku, qty]) => `${sku}\t${qty}`)].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedKey('sku_table');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Toggle mở rộng mã đơn cho 1 SKU trong card
  const handleToggleExpandSku = (skuKey: string) => {
    setExpandedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(skuKey)) {
        next.delete(skuKey);
      } else {
        next.add(skuKey);
      }
      return next;
    });
  };

  // Mở modal kiểm tra chi tiết SKU của 1 cột PCS
  const handleOpenInspectColumn = (colKey: string) => {
    setInspectColumnKey(colKey);
    setModalSearch('');
    setModalSelectedSkus(new Set());
  };

  // Lọc dữ liệu trong Modal
  const activeModalBreakdown = inspectColumnKey ? columnSkuBreakdowns[inspectColumnKey] || [] : [];
  const activeModalTotalOrders = inspectColumnKey ? pcsGroups[inspectColumnKey]?.length || 0 : 0;
  const inspectColumnTitle = inspectColumnKey
    ? inspectColumnKey === 'MIX'
      ? 'MIX'
      : inspectColumnKey === 'MIX L46'
      ? 'MIX L46'
      : `${inspectColumnKey} PCS`
    : '';

  const filteredModalSkus = useMemo(() => {
    if (!modalSearch.trim()) return activeModalBreakdown;
    const term = modalSearch.toLowerCase();
    return activeModalBreakdown.filter(
      (item) => item.sku.toLowerCase().includes(term) || item.orderNos.some((no) => no.toLowerCase().includes(term))
    );
  }, [activeModalBreakdown, modalSearch]);

  // Thống kê các SKU đang chọn trong modal
  const modalSelectedStats = useMemo(() => {
    const items = activeModalBreakdown.filter((it) => modalSelectedSkus.has(it.sku));
    const totalOrders = items.reduce((sum, it) => sum + it.orderCount, 0);
    const allOrderNos: string[] = [];
    items.forEach((it) => it.orderNos.forEach((no) => allOrderNos.push(no)));

    return {
      items,
      totalOrders,
      allOrderNos,
      skuCount: modalSelectedSkus.size,
    };
  }, [activeModalBreakdown, modalSelectedSkus]);

  // Copy các SKU đã chọn trong modal
  const handleCopyModalSelectedOrders = () => {
    if (modalSelectedStats.allOrderNos.length === 0) return;
    navigator.clipboard.writeText(modalSelectedStats.allOrderNos.join('\n'));
    setCopiedKey('modal_batch_copy');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Xuất Excel cho cột đang xem trong modal
  const handleExportModalExcel = () => {
    if (!inspectColumnKey) return;
    const dataToExport = modalSelectedStats.items.length > 0 ? modalSelectedStats.items : activeModalBreakdown;

    const summaryRows = dataToExport.map((it, idx) => ({
      'Hạng (#)': idx + 1,
      'Mã SKU': it.sku,
      'Số Đơn': it.orderCount,
      'Tổng PCS': it.totalQty,
      'Tỷ Trọng (%)': `${it.percentage}%`,
      'Danh Sách Order No': it.orderNos.join(', '),
    }));

    const detailRows: Array<{
      'STT': number;
      'Mã SKU': string;
      'Mã Đơn Hàng (Order No)': string;
      'Tracking No': string;
      'ĐVVC': string;
      'Picking List': string;
    }> = [];

    let count = 1;
    dataToExport.forEach((it) => {
      it.orders.forEach((ord) => {
        detailRows.push({
          'STT': count++,
          'Mã SKU': it.sku,
          'Mã Đơn Hàng (Order No)': ord.orderNo,
          'Tracking No': ord.trackingNo,
          'ĐVVC': ord.carrierName,
          'Picking List': ord.pickingList,
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    const wsDetail = XLSX.utils.json_to_sheet(detailRows);

    XLSX.utils.book_append_sheet(wb, wsSummary, `Tong_Hop_SKU_${inspectColumnKey}`);
    XLSX.utils.book_append_sheet(wb, wsDetail, `Chi_Tiet_Don_${inspectColumnKey}`);

    XLSX.writeFile(wb, `Phan_Tach_SKU_${inspectColumnTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Information */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-gray-900">Bảng Tổng Hợp SKU & Gộp PCS</h2>
            {selectedPickingList ? (
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold">
                List {selectedPickingList}
                {selectedCarrier && selectedCarrier !== 'ALL'
                  ? ` (${CARRIER_CONFIG[selectedCarrier]?.shortName || selectedCarrier})`
                  : ''}
              </span>
            ) : selectedCarrier && selectedCarrier !== 'ALL' ? (
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold">
                ĐVVC: {CARRIER_CONFIG[selectedCarrier]?.name || selectedCarrier}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                Toàn bộ đơn ({orders.length} đơn)
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Cột S:T lưu danh sách SKU & Tổng số lượng; Cột X trở đi phân chia Order No theo số lượng PCS (1 PCS, 2 PCS, ..., MIX).{' '}
            <span className="text-indigo-600 font-semibold">
              💡 Bấm vào tiêu đề cột (ví dụ: 1 PCS, 2 PCS) để phân loại từng mã SKU và sao chép đơn theo mã!
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('single_pcs')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Chế độ đóng gói chuyên sâu (Cao ➔ Thấp)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopySkuTable}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-700 transition-colors cursor-pointer border border-gray-200 shadow-2xs"
          >
            {copiedKey === 'sku_table' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
            <span>{copiedKey === 'sku_table' ? 'Đã sao chép bảng' : 'Sao chép bảng SKU'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Bảng Tổng Hợp SKU (Cột S:T) */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Tổng Hợp SKU (Cột S:T)
              </h3>
            </div>
            <span className="px-2.5 py-0.5 bg-gray-200/70 text-gray-700 rounded-full text-[11px] font-medium">
              {skuEntries.length} mã ({totalSkuQty} PCS)
            </span>
          </div>

          {/* Sorter & Filter bar */}
          <div className="p-2.5 bg-white border-b border-gray-100 flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSkuSortMode('name')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  skuSortMode === 'name' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                A-Z
              </button>
              <button
                onClick={() => setSkuSortMode('qty')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  skuSortMode === 'qty' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Số lượng ↓
              </button>
            </div>
            <span className="text-[11px] text-gray-400">Click SKU để copy</span>
          </div>

          {/* SKU Table List */}
          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
            {skuEntries.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                Không có dữ liệu SKU nào
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 font-semibold sticky top-0 border-b border-gray-100">
                  <tr>
                    <th className="py-2.5 px-3.5 w-12 text-center font-normal text-gray-400">STT</th>
                    <th className="py-2.5 px-3.5">MÃ SKU</th>
                    <th className="py-2.5 px-3.5 text-right">SỐ LƯỢNG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {skuEntries.map(([sku, qty], idx) => {
                    return (
                      <tr
                        key={sku}
                        onClick={() => {
                          navigator.clipboard.writeText(sku);
                          setCopiedKey(`sku_${sku}`);
                          setTimeout(() => setCopiedKey(null), 1500);
                        }}
                        className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                      >
                        <td className="py-2.5 px-3.5 text-gray-400 text-center text-[11px]">{idx + 1}</td>
                        <td className="py-2.5 px-3.5 font-medium text-gray-800 flex items-center justify-between">
                          <span>{sku}</span>
                          {copiedKey === `sku_${sku}` && (
                            <span className="text-[10px] text-emerald-600 font-sans font-bold ml-1">✓ Copied</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                            {qty}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Bảng Gộp PCS (Cột X trở đi) */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          {/* Header & Mode Switcher */}
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Phân Loại Đơn Theo PCS (Cột X trở đi)
              </h3>
            </div>

            {/* Switcher: Phân loại theo SKU vs Mã Đơn Thuần */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">Hiển thị trong cột:</span>
              <div className="flex items-center p-0.5 bg-gray-200/80 rounded-xl border border-gray-200">
                <button
                  onClick={() => setColumnViewMode('sku')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    columnViewMode === 'sku'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Gom các đơn theo từng mã SKU (Xếp từ nhiều đến ít) và cho phép copy theo SKU"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Phân Tách Theo SKU (Copy theo mã)</span>
                </button>
                <button
                  onClick={() => setColumnViewMode('order_no')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    columnViewMode === 'order_no'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Hiển thị danh sách mã đơn thô"
                >
                  <ListOrdered className="w-3.5 h-3.5 text-gray-500" />
                  <span>Danh Sách Mã Đơn</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter by Order Count Range & Quick Batch Copy for 5-9, 10-19, >=20 orders */}
          {columnViewMode === 'sku' && (
            <div className="px-4 py-3 bg-indigo-50/40 border-b border-indigo-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
              {/* Left: Threshold Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-gray-700 flex items-center gap-1 mr-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Lọc lượng đơn:</span>
                </span>

                <button
                  onClick={() => setMinOrderThreshold('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    minOrderThreshold === 'all'
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  Tất cả
                </button>

                <button
                  onClick={() => setMinOrderThreshold('lt5')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    minOrderThreshold === 'lt5'
                      ? 'bg-slate-700 text-white shadow-2xs font-bold'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Các SKU có dưới 5 đơn hàng (1 - 4 đơn)"
                >
                  <span>&lt; 5 đơn (Lẻ)</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${minOrderThreshold === 'lt5' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {globalThresholdStats.under5.skuCount} SKU ({globalThresholdStats.under5.totalOrders}đ)
                  </span>
                </button>

                <button
                  onClick={() => setMinOrderThreshold('5-9')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    minOrderThreshold === '5-9'
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'bg-sky-50 text-sky-900 border border-sky-300 hover:bg-sky-100'
                  }`}
                  title="Các SKU có từ 5 đến 9 đơn hàng"
                >
                  <span>5 - 9 đơn</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${minOrderThreshold === '5-9' ? 'bg-sky-800 text-white' : 'bg-sky-200 text-sky-900'}`}>
                    {globalThresholdStats.r5_9.skuCount} SKU ({globalThresholdStats.r5_9.totalOrders}đ)
                  </span>
                </button>

                <button
                  onClick={() => setMinOrderThreshold('10-19')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    minOrderThreshold === '10-19'
                      ? 'bg-amber-400 text-indigo-950 shadow-2xs ring-1 ring-amber-500'
                      : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                  title="Các SKU có từ 10 đến 19 đơn hàng"
                >
                  <span>10 - 19 đơn</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${minOrderThreshold === '10-19' ? 'bg-indigo-950 text-amber-300' : 'bg-amber-200 text-amber-900'}`}>
                    {globalThresholdStats.r10_19.skuCount} SKU ({globalThresholdStats.r10_19.totalOrders}đ)
                  </span>
                </button>

                <button
                  onClick={() => setMinOrderThreshold('20')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    minOrderThreshold === '20'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                  }`}
                  title="Các SKU có từ 20 đơn hàng trở lên"
                >
                  <span>≥ 20 đơn</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${minOrderThreshold === '20' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                    {globalThresholdStats.ge20.skuCount} SKU ({globalThresholdStats.ge20.totalOrders}đ)
                  </span>
                </button>

                {/* Filter >= 5 orders (Aggregated: 5 trở lên) */}
                <button
                  onClick={() => setMinOrderThreshold('ge5')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    minOrderThreshold === 'ge5'
                      ? 'bg-indigo-700 text-white shadow-2xs ring-1 ring-indigo-900'
                      : 'bg-indigo-50 text-indigo-900 border border-indigo-300 hover:bg-indigo-100'
                  }`}
                  title="Tổng hợp tất cả các SKU có từ 5 đơn trở lên (5-9, 10-19 và >=20)"
                >
                  <span>≥ 5 đơn (Tổng hợp)</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${minOrderThreshold === 'ge5' ? 'bg-indigo-950 text-indigo-100' : 'bg-indigo-200 text-indigo-900'}`}>
                    {globalThresholdStats.ge5.skuCount} SKU ({globalThresholdStats.ge5.totalOrders}đ)
                  </span>
                </button>

                {/* Custom Threshold Input */}
                <div className="inline-flex items-center gap-1 ml-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
                  <button
                    onClick={() => setMinOrderThreshold('custom')}
                    className={`px-2 py-0.5 rounded-md text-xs font-semibold cursor-pointer ${
                      minOrderThreshold === 'custom' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    ≥ N đơn:
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={customMinOrders}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      setCustomMinOrders(val);
                      setMinOrderThreshold('custom');
                    }}
                    className="w-12 px-1 py-0.5 text-xs text-center border border-gray-200 rounded bg-gray-50 font-bold focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Right: Quick Batch Copy Buttons for Global 5-9, 10-19, >= 20 */}
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                {/* Copy 5 - 9 đơn */}
                <button
                  onClick={() => handleCopyGlobalRange(5, 9, 'global_5_9')}
                  disabled={globalThresholdStats.r5_9.totalOrders === 0}
                  title="Sao chép toàn bộ Order No của tất cả SKU trong khoảng 5 - 9 đơn"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shadow-2xs cursor-pointer ${
                    copiedKey === 'global_5_9'
                      ? 'bg-emerald-600 text-white'
                      : globalThresholdStats.r5_9.totalOrders > 0
                      ? 'bg-sky-600 hover:bg-sky-500 text-white hover:shadow-xs'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {copiedKey === 'global_5_9' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Đã copy {globalThresholdStats.r5_9.totalOrders} đơn (5-9đ)!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-white" />
                      <span>Copy Đơn 5 - 9 đơn ({globalThresholdStats.r5_9.totalOrders} đơn)</span>
                    </>
                  )}
                </button>

                {/* Copy 10 - 19 đơn */}
                <button
                  onClick={() => handleCopyGlobalRange(10, 19, 'global_10_19')}
                  disabled={globalThresholdStats.r10_19.totalOrders === 0}
                  title="Sao chép toàn bộ Order No của tất cả SKU trong khoảng 10 - 19 đơn"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shadow-2xs cursor-pointer ${
                    copiedKey === 'global_10_19'
                      ? 'bg-emerald-600 text-white'
                      : globalThresholdStats.r10_19.totalOrders > 0
                      ? 'bg-amber-400 hover:bg-amber-300 text-indigo-950 hover:shadow-xs'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {copiedKey === 'global_10_19' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Đã copy {globalThresholdStats.r10_19.totalOrders} đơn (10-19đ)!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-indigo-950" />
                      <span>Copy Đơn 10 - 19 đơn ({globalThresholdStats.r10_19.totalOrders} đơn)</span>
                    </>
                  )}
                </button>

                {/* Copy >= 20 đơn */}
                <button
                  onClick={() => handleCopyGlobalRange(20, Infinity, 'global_ge20')}
                  disabled={globalThresholdStats.ge20.totalOrders === 0}
                  title="Sao chép toàn bộ Order No của tất cả SKU có từ 20 đơn trở lên"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shadow-2xs cursor-pointer ${
                    copiedKey === 'global_ge20'
                      ? 'bg-emerald-600 text-white'
                      : globalThresholdStats.ge20.totalOrders > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white hover:shadow-xs'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {copiedKey === 'global_ge20' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Đã copy {globalThresholdStats.ge20.totalOrders} đơn (≥20đ)!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-white" />
                      <span>Copy Đơn ≥ 20 đơn ({globalThresholdStats.ge20.totalOrders} đơn)</span>
                    </>
                  )}
                </button>

                {/* Copy >= 5 đơn (Tổng hợp: gộp từ 5 đơn trở lên) */}
                <button
                  onClick={() => handleCopyGlobalRange(5, Infinity, 'global_ge5')}
                  disabled={globalThresholdStats.ge5.totalOrders === 0}
                  title="Sao chép toàn bộ Order No của tất cả SKU có từ 5 đơn trở lên (Tổng hợp)"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shadow-2xs cursor-pointer ${
                    copiedKey === 'global_ge5'
                      ? 'bg-emerald-600 text-white'
                      : globalThresholdStats.ge5.totalOrders > 0
                      ? 'bg-indigo-700 hover:bg-indigo-600 text-white hover:shadow-xs ring-1 ring-indigo-900/40'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {copiedKey === 'global_ge5' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Đã copy {globalThresholdStats.ge5.totalOrders} đơn (≥5đ Tổng hợp)!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Copy Đơn ≥ 5 đơn (Tổng: {globalThresholdStats.ge5.totalOrders} đơn)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Columns Container */}
          <div className="p-5">
            {pcsKeys.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400">
                Chưa có đơn hàng nào được phân loại theo PCS.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3.5">
                {pcsKeys.map((key) => {
                  const ordersList = pcsGroups[key] || [];
                  const isMixL46 = key === 'MIX L46';
                  const isMix = key === 'MIX';
                  const headerTitle = isMix ? 'MIX' : isMixL46 ? 'MIX L46' : `${key} PCS`;
                  const rawSkuList = columnSkuBreakdowns[key] || [];

                  // Áp dụng bộ lọc khoảng đơn
                  const skuList = minOrderThreshold === 'lt5'
                    ? rawSkuList.filter((it) => it.orderCount < 5)
                    : minOrderThreshold === '5-9'
                    ? rawSkuList.filter((it) => it.orderCount >= 5 && it.orderCount <= 9)
                    : minOrderThreshold === '10-19'
                    ? rawSkuList.filter((it) => it.orderCount >= 10 && it.orderCount <= 19)
                    : minOrderThreshold === '20'
                    ? rawSkuList.filter((it) => it.orderCount >= 20)
                    : minOrderThreshold === 'ge5'
                    ? rawSkuList.filter((it) => it.orderCount >= 5)
                    : minOrderThreshold === 'lt9'
                    ? rawSkuList.filter((it) => it.orderCount <= 9)
                    : activeThresholdNum > 0
                    ? rawSkuList.filter((it) => it.orderCount >= activeThresholdNum)
                    : rawSkuList;

                  // Thống kê nhanh SKU theo khoảng trong cột này
                  const colSkus5_9 = rawSkuList.filter((it) => it.orderCount >= 5 && it.orderCount <= 9);
                  const colOrders5_9Count = colSkus5_9.reduce((s, it) => s + it.orderCount, 0);
                  const colSkus10_19 = rawSkuList.filter((it) => it.orderCount >= 10 && it.orderCount <= 19);
                  const colOrders10_19Count = colSkus10_19.reduce((s, it) => s + it.orderCount, 0);
                  const colSkus20 = rawSkuList.filter((it) => it.orderCount >= 20);
                  const colOrders20Count = colSkus20.reduce((s, it) => s + it.orderCount, 0);
                  const colSkus5Plus = rawSkuList.filter((it) => it.orderCount >= 5);
                  const colOrders5PlusCount = colSkus5Plus.reduce((s, it) => s + it.orderCount, 0);
                  const colSkusUnder5 = rawSkuList.filter((it) => it.orderCount < 5);
                  const colOrdersUnder5Count = colSkusUnder5.reduce((s, it) => s + it.orderCount, 0);

                  return (
                    <div
                      key={key}
                      className="w-full bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs hover:border-gray-300 transition-colors"
                    >
                      {/* Column Header - Clickable to open detailed Modal */}
                      <div
                        onClick={() => handleOpenInspectColumn(key)}
                        className="p-3 bg-white border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-indigo-50/40 transition-colors group select-none"
                        title={`Bấm để mở chi tiết phân loại SKU của cột ${headerTitle}`}
                      >
                        <div className="truncate pr-1">
                          <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isMixL46 ? 'bg-amber-500' : isMix ? 'bg-purple-500' : 'bg-indigo-600'}`}></span>
                            <span className="group-hover:text-indigo-600 transition-colors">{headerTitle}</span>
                            <Maximize2 className="w-3 h-3 text-gray-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 font-medium">
                            <span className="text-gray-900 font-bold">{ordersList.length} đơn</span>
                            <span>•</span>
                            <span className="text-indigo-600 font-bold">{rawSkuList.length} mã SKU</span>
                          </div>
                        </div>

                        {/* Copy Entire Column button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyColumn(headerTitle, ordersList);
                          }}
                          title={`Sao chép toàn bộ ${ordersList.length} mã đơn của cột ${headerTitle}`}
                          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer shrink-0"
                        >
                          {copiedKey === headerTitle ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Sub-bar inside column card: Quick Copy for 5-9, 10-19, >=20, >=5 (Tổng), <5 in this column */}
                      {columnViewMode === 'sku' && (colOrders5_9Count > 0 || colOrders10_19Count > 0 || colOrders20Count > 0 || colOrdersUnder5Count > 0) && (
                        <div className="px-2.5 py-1.5 bg-amber-50/40 border-b border-amber-100 flex items-center justify-between gap-1 text-[10px]">
                          <span className="text-amber-900 font-bold shrink-0">Copy:</span>
                          <div className="flex items-center gap-1 overflow-x-auto">
                            {/* >= 5 đơn (Tổng hợp) */}
                            {colOrders5PlusCount > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyColumnRange(key, 5, Infinity, `${key}_col_ge5`);
                                }}
                                title={`Copy ${colOrders5PlusCount} đơn từ ${colSkus5Plus.length} SKU (≥5 đơn Tổng hợp) của cột ${headerTitle}`}
                                className={`px-1.5 py-0.5 rounded font-black transition-colors cursor-pointer shadow-2xs shrink-0 ${
                                  copiedKey === `${key}_col_ge5`
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-700'
                                }`}
                              >
                                {copiedKey === `${key}_col_ge5` ? '✓ Đã chép' : `≥5đ (${colOrders5PlusCount})`}
                              </button>
                            )}

                            {/* 5-9 đơn */}
                            {colOrders5_9Count > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyColumnRange(key, 5, 9, `${key}_col_5_9`);
                                }}
                                title={`Copy ${colOrders5_9Count} đơn từ ${colSkus5_9.length} SKU (5 - 9 đơn) của cột ${headerTitle}`}
                                className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer shadow-2xs shrink-0 ${
                                  copiedKey === `${key}_col_5_9`
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300'
                                }`}
                              >
                                {copiedKey === `${key}_col_5_9` ? '✓ Đã chép' : `5-9đ (${colOrders5_9Count})`}
                              </button>
                            )}

                            {/* 10-19 đơn */}
                            {colOrders10_19Count > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyColumnRange(key, 10, 19, `${key}_col_10_19`);
                                }}
                                title={`Copy ${colOrders10_19Count} đơn từ ${colSkus10_19.length} SKU (10 - 19 đơn) của cột ${headerTitle}`}
                                className={`px-1.5 py-0.5 rounded font-black transition-colors cursor-pointer shadow-2xs shrink-0 ${
                                  copiedKey === `${key}_col_10_19`
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-300 hover:bg-amber-400 text-indigo-950 border border-amber-400'
                                }`}
                              >
                                {copiedKey === `${key}_col_10_19` ? '✓ Đã chép' : `10-19đ (${colOrders10_19Count})`}
                              </button>
                            )}

                            {/* >=20 đơn */}
                            {colOrders20Count > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyColumnRange(key, 20, Infinity, `${key}_col_ge20`);
                                }}
                                title={`Copy ${colOrders20Count} đơn từ ${colSkus20.length} SKU (≥20 đơn) của cột ${headerTitle}`}
                                className={`px-1.5 py-0.5 rounded font-black transition-colors cursor-pointer shadow-2xs shrink-0 ${
                                  copiedKey === `${key}_col_ge20`
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-700'
                                }`}
                              >
                                {copiedKey === `${key}_col_ge20` ? '✓ Đã chép' : `≥20đ (${colOrders20Count})`}
                              </button>
                            )}

                            {/* <5 đơn (nếu có) */}
                            {colOrdersUnder5Count > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyColumnRange(key, 1, 4, `${key}_col_lt5`);
                                }}
                                title={`Copy ${colOrdersUnder5Count} đơn từ ${colSkusUnder5.length} SKU (<5 đơn) của cột ${headerTitle}`}
                                className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer shadow-2xs shrink-0 ${
                                  copiedKey === `${key}_col_lt5`
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                                }`}
                              >
                                {copiedKey === `${key}_col_lt5` ? '✓ Đã chép' : `<5đ (${colOrdersUnder5Count})`}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Content: Mode A - SKU Breakdown (Phân loại theo SKU) */}
                      {columnViewMode === 'sku' ? (
                        <div className="p-2 space-y-1.5 max-h-[500px] overflow-y-auto">
                          {minOrderThreshold === 'lt5' && (
                            <div className="p-1.5 bg-slate-100 rounded-lg text-[10px] text-slate-800 font-semibold flex items-center justify-between">
                              <span>Lọc: &lt; 5 đơn (Lẻ)</span>
                              <span>{skuList.length} SKU</span>
                            </div>
                          )}
                          {minOrderThreshold === '5-9' && (
                            <div className="p-1.5 bg-sky-50 rounded-lg text-[10px] text-sky-800 font-bold flex items-center justify-between">
                              <span>Lọc: 5 - 9 đơn</span>
                              <span>{skuList.length} SKU</span>
                            </div>
                          )}
                          {minOrderThreshold === '10-19' && (
                            <div className="p-1.5 bg-amber-50 rounded-lg text-[10px] text-amber-900 font-bold flex items-center justify-between">
                              <span>Lọc: 10 - 19 đơn</span>
                              <span>{skuList.length} SKU</span>
                            </div>
                          )}
                          {minOrderThreshold === '20' && (
                            <div className="p-1.5 bg-emerald-50 rounded-lg text-[10px] text-emerald-900 font-bold flex items-center justify-between">
                              <span>Lọc: ≥ 20 đơn</span>
                              <span>{skuList.length} SKU</span>
                            </div>
                          )}
                          {minOrderThreshold === 'ge5' && (
                            <div className="p-1.5 bg-indigo-50 rounded-lg text-[10px] text-indigo-900 font-bold flex items-center justify-between">
                              <span>Lọc: ≥ 5 đơn (Tổng hợp)</span>
                              <span>{skuList.length} SKU</span>
                            </div>
                          )}
                          {minOrderThreshold === 'custom' && (
                            <div className="p-1.5 bg-indigo-50/80 rounded-lg text-[10px] text-indigo-700 font-semibold flex items-center justify-between">
                              <span>Lọc: ≥ {activeThresholdNum} đơn</span>
                              <span>{skuList.length} SKU</span>
                            </div>
                          )}

                          {skuList.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400">
                              {minOrderThreshold === '5-9'
                                ? 'Không có SKU nào trong khoảng 5 - 9 đơn'
                                : minOrderThreshold === '10-19'
                                ? 'Không có SKU nào trong khoảng 10 - 19 đơn'
                                : minOrderThreshold === '20'
                                ? 'Không có SKU nào ≥ 20 đơn'
                                : minOrderThreshold === 'ge5'
                                ? 'Không có SKU nào ≥ 5 đơn'
                                : minOrderThreshold === 'lt5'
                                ? 'Không có SKU nào < 5 đơn'
                                : activeThresholdNum > 0
                                ? `Không có SKU nào ≥ ${activeThresholdNum} đơn`
                                : 'Không có đơn'}
                            </div>
                          ) : (
                            skuList.map((item, idx) => {
                              const itemKey = `${key}_${item.sku}`;
                              const isExpanded = expandedSkus.has(itemKey);
                              const isTop1 = idx === 0;
                              const is20Plus = item.orderCount >= 20;
                              const is10_19 = item.orderCount >= 10 && item.orderCount <= 19;
                              const is5_9 = item.orderCount >= 5 && item.orderCount <= 9;

                              return (
                                <div
                                  key={item.sku}
                                  className={`rounded-xl border transition-all overflow-hidden ${
                                    is20Plus
                                      ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                                      : is10_19
                                      ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-400/20'
                                      : is5_9
                                      ? 'bg-sky-50/40 border-sky-300 ring-1 ring-sky-400/20'
                                      : isTop1
                                      ? 'bg-amber-50/30 border-amber-200/90'
                                      : 'bg-white border-gray-200/90 hover:border-indigo-200'
                                  }`}
                                >
                                  {/* SKU Row Header */}
                                  <div className="p-2 flex items-center justify-between gap-1.5">
                                    <div
                                      onClick={() => handleToggleExpandSku(itemKey)}
                                      className="flex items-center gap-1.5 truncate cursor-pointer flex-1"
                                      title={`Click để ${isExpanded ? 'thu gọn' : 'xem'} ${item.orderCount} mã đơn`}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                                      )}
                                      <div className="truncate">
                                        <div className="flex items-center gap-1 truncate">
                                          <span className="font-mono font-bold text-xs text-gray-900 truncate">
                                            {item.sku}
                                          </span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 block">
                                          {item.percentage}% ({item.totalQty} PCS)
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {/* Badge Số Đơn */}
                                      <span
                                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                          is20Plus
                                            ? 'bg-emerald-600 text-white'
                                            : is10_19
                                            ? 'bg-amber-400 text-indigo-950'
                                            : is5_9
                                            ? 'bg-sky-500 text-white font-bold'
                                            : isTop1
                                            ? 'bg-amber-300 text-indigo-950'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}
                                      >
                                        {item.orderCount} đơn
                                      </span>

                                      {/* Nút Sao Chép Đơn Của Riêng SKU Này */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopySkuInColumn(itemKey, item.orderNos);
                                        }}
                                        title={`Sao chép ${item.orderCount} Order No của SKU ${item.sku}`}
                                        className="p-1 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                      >
                                        {copiedKey === itemKey ? (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3 h-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>

                                  {/* Expanded Order Numbers List for this SKU */}
                                  {isExpanded && (
                                    <div className="bg-gray-50/90 border-t border-gray-100 p-2 space-y-1 font-mono text-[11px]">
                                      <div className="text-[10px] text-gray-400 pb-1 font-sans flex items-center justify-between">
                                        <span>Danh sách Order No ({item.orderCount}):</span>
                                        <button
                                          onClick={() => handleCopySkuInColumn(itemKey, item.orderNos)}
                                          className="text-indigo-600 hover:underline font-bold text-[9px]"
                                        >
                                          {copiedKey === itemKey ? '✓ Đã chép' : 'Chép tất cả'}
                                        </button>
                                      </div>
                                      {item.orderNos.map((orderNo, oIdx) => (
                                        <div
                                          key={oIdx}
                                          onClick={() => {
                                            navigator.clipboard.writeText(orderNo);
                                            setCopiedKey(`ord_${orderNo}`);
                                            setTimeout(() => setCopiedKey(null), 1500);
                                          }}
                                          className="text-gray-700 hover:text-indigo-600 hover:bg-white p-1 rounded transition-colors cursor-pointer flex items-center justify-between group"
                                        >
                                          <span className="truncate">{orderNo}</span>
                                          {copiedKey === `ord_${orderNo}` ? (
                                            <span className="text-[9px] text-emerald-600 font-sans font-bold">✓</span>
                                          ) : (
                                            <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          )}

                          {/* Action footer inside card */}
                          <button
                            onClick={() => handleOpenInspectColumn(key)}
                            className="w-full py-1.5 px-2 bg-white hover:bg-indigo-50 border border-dashed border-gray-200 hover:border-indigo-200 rounded-xl text-[11px] font-semibold text-indigo-700 text-center transition-colors cursor-pointer flex items-center justify-center gap-1 mt-2"
                          >
                            <Maximize2 className="w-3 h-3" />
                            <span>Mở Bảng Phân Tách SKU</span>
                          </button>
                        </div>
                      ) : (
                        /* Content: Mode B - Raw Order Nos (Mã đơn thuần) */
                        <div className="p-2.5 space-y-1 max-h-[500px] overflow-y-auto font-mono">
                          {ordersList.map((orderNo, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                navigator.clipboard.writeText(orderNo);
                                setCopiedKey(`ord_${orderNo}`);
                                setTimeout(() => setCopiedKey(null), 1500);
                              }}
                              className="text-[11px] text-gray-700 hover:text-indigo-600 hover:bg-white p-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer flex items-center justify-between group"
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
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: CHI TIẾT PHÂN TÁCH SKU CHO CỘT PCS ĐƯỢC CHỌN */}
      {inspectColumnKey && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-bold">
                  <Flame className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <span>Phân Tách SKU Của Cột: {inspectColumnTitle}</span>
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold">
                      {activeModalTotalOrders} đơn ({activeModalBreakdown.length} mã SKU)
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sắp xếp theo thứ tự số lượng đơn từ <strong>Cao ➔ Thấp</strong>. Chọn các mã cần đóng hoặc sao chép mã đơn từng SKU.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setInspectColumnKey(null)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls Bar */}
            <div className="p-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm mã SKU, Order No..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Quick preset buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-gray-500 font-medium">Chọn nhanh:</span>
                
                {/* Preset < 5 đơn */}
                {filteredModalSkus.filter((it) => it.orderCount < 5).length > 0 && (
                  <button
                    onClick={() => {
                      const skusLt5 = filteredModalSkus.filter((it) => it.orderCount < 5).map((it) => it.sku);
                      setModalSelectedSkus(new Set(skusLt5));
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>&lt; 5 đơn</span>
                    <span className="text-[10px] bg-slate-300 text-slate-800 px-1 rounded-full font-bold">
                      {filteredModalSkus.filter((it) => it.orderCount < 5).length} SKU
                    </span>
                  </button>
                )}

                {/* Preset 5 - 9 đơn */}
                {filteredModalSkus.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).length > 0 && (
                  <button
                    onClick={() => {
                      const skus5_9 = filteredModalSkus.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).map((it) => it.sku);
                      setModalSelectedSkus(new Set(skus5_9));
                    }}
                    className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>5 - 9 đơn</span>
                    <span className="text-[10px] bg-sky-200 text-sky-900 px-1 rounded-full">
                      {filteredModalSkus.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).length} SKU
                    </span>
                  </button>
                )}

                {/* Preset 10 - 19 đơn */}
                {filteredModalSkus.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).length > 0 && (
                  <button
                    onClick={() => {
                      const skus10_19 = filteredModalSkus.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).map((it) => it.sku);
                      setModalSelectedSkus(new Set(skus10_19));
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>10 - 19 đơn</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded-full">
                      {filteredModalSkus.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).length} SKU
                    </span>
                  </button>
                )}

                {/* Preset >= 20 đơn */}
                {filteredModalSkus.filter((it) => it.orderCount >= 20).length > 0 && (
                  <button
                    onClick={() => {
                      const skus20 = filteredModalSkus.filter((it) => it.orderCount >= 20).map((it) => it.sku);
                      setModalSelectedSkus(new Set(skus20));
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>≥ 20 đơn</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded-full">
                      {filteredModalSkus.filter((it) => it.orderCount >= 20).length} SKU
                    </span>
                  </button>
                )}

                {/* Preset >= 5 đơn (Tổng hợp) */}
                {filteredModalSkus.filter((it) => it.orderCount >= 5).length > 0 && (
                  <button
                    onClick={() => {
                      const skusGe5 = filteredModalSkus.filter((it) => it.orderCount >= 5).map((it) => it.sku);
                      setModalSelectedSkus(new Set(skusGe5));
                    }}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>≥ 5 đơn (Tổng)</span>
                    <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1 rounded-full">
                      {filteredModalSkus.filter((it) => it.orderCount >= 5).length} SKU
                    </span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const top3 = filteredModalSkus.slice(0, 3).map((it) => it.sku);
                    setModalSelectedSkus(new Set(top3));
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Top 3
                </button>

                <button
                  onClick={() => {
                    const top5 = filteredModalSkus.slice(0, 5).map((it) => it.sku);
                    setModalSelectedSkus(new Set(top5));
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Top 5
                </button>

                <button
                  onClick={() => {
                    const top10 = filteredModalSkus.slice(0, 10).map((it) => it.sku);
                    setModalSelectedSkus(new Set(top10));
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  Top 10
                </button>

                <button
                  onClick={() => {
                    if (modalSelectedSkus.size === filteredModalSkus.length && filteredModalSkus.length > 0) {
                      setModalSelectedSkus(new Set());
                    } else {
                      setModalSelectedSkus(new Set(filteredModalSkus.map((it) => it.sku)));
                    }
                  }}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors cursor-pointer"
                >
                  {modalSelectedSkus.size === filteredModalSkus.length && filteredModalSkus.length > 0
                    ? 'Bỏ chọn'
                    : 'Tất cả'}
                </button>

                <button
                  onClick={handleExportModalExcel}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ml-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất Excel</span>
                </button>
              </div>
            </div>

            {/* Batch Action Bar if SKUs are selected */}
            {modalSelectedStats.skuCount > 0 && (
              <div className="bg-indigo-900 text-white px-5 py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-400 text-indigo-950 font-bold rounded-full text-[11px]">
                    {modalSelectedStats.skuCount} SKU
                  </span>
                  <span className="font-semibold">
                    = {modalSelectedStats.totalOrders} đơn hàng được chọn
                  </span>
                </div>

                <button
                  onClick={handleCopyModalSelectedOrders}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {copiedKey === 'modal_batch_copy' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-800" />
                      <span>Đã sao chép {modalSelectedStats.totalOrders} mã đơn!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao Chép {modalSelectedStats.totalOrders} Mã Đơn Đã Chọn</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Modal Body: SKU List */}
            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
              {filteredModalSkus.length === 0 ? (
                <div className="p-12 text-center text-xs text-gray-400">
                  Không tìm thấy mã SKU nào phù hợp với từ khóa.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredModalSkus.map((item, idx) => {
                    const isSelected = modalSelectedSkus.has(item.sku);
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;

                    return (
                      <div
                        key={item.sku}
                        className={`rounded-2xl border transition-all flex flex-col justify-between p-3.5 ${
                          isSelected
                            ? 'bg-indigo-50/50 border-indigo-400 shadow-xs ring-1 ring-indigo-500/20'
                            : isTop1
                            ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* SKU Top info */}
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 truncate">
                              <button
                                onClick={() => {
                                  setModalSelectedSkus((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(item.sku)) next.delete(item.sku);
                                    else next.add(item.sku);
                                    return next;
                                  });
                                }}
                                className="mt-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>

                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  {isTop1 ? (
                                    <span className="px-1.5 py-0.2 bg-amber-400 text-indigo-950 rounded text-[10px] font-black">
                                      #1 TOP
                                    </span>
                                  ) : isTop2 ? (
                                    <span className="px-1.5 py-0.2 bg-slate-300 text-gray-800 rounded text-[10px] font-bold">
                                      #2
                                    </span>
                                  ) : isTop3 ? (
                                    <span className="px-1.5 py-0.2 bg-amber-700/20 text-amber-900 rounded text-[10px] font-bold">
                                      #3
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-gray-400">
                                      #{idx + 1}
                                    </span>
                                  )}
                                  <h4 className="font-mono font-bold text-xs text-gray-900 truncate" title={item.sku}>
                                    {item.sku}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  Chiếm {item.percentage}% ({item.totalQty} PCS)
                                </p>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 bg-gray-100 text-gray-900 font-bold rounded-lg text-xs shrink-0">
                              {item.orderCount} đơn
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-2.5">
                            <div
                              className={`h-full rounded-full ${isTop1 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                              style={{ width: `${Math.min(100, Math.max(8, item.percentage * 2.5))}%` }}
                            />
                          </div>

                          {/* Preview Order Nos */}
                          <div className="mt-2.5 max-h-24 overflow-y-auto space-y-1 font-mono text-[10px] bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                            {item.orderNos.map((no, nIdx) => (
                              <div
                                key={nIdx}
                                onClick={() => {
                                  navigator.clipboard.writeText(no);
                                  setCopiedKey(`modal_ord_${no}`);
                                  setTimeout(() => setCopiedKey(null), 1500);
                                }}
                                className="text-gray-600 hover:text-indigo-600 hover:bg-white p-0.5 rounded cursor-pointer flex items-center justify-between"
                              >
                                <span>{no}</span>
                                {copiedKey === `modal_ord_${no}` ? (
                                  <span className="text-emerald-600 font-sans font-bold">✓</span>
                                ) : (
                                  <Copy className="w-2 h-2 text-gray-400" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Copy button for this SKU */}
                        <button
                          onClick={() => handleCopySkuInColumn(`modal_sku_${item.sku}`, item.orderNos)}
                          className="mt-3 w-full py-1.5 px-3 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl text-xs font-semibold text-gray-800 hover:text-indigo-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          {copiedKey === `modal_sku_${item.sku}` ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Đã chép {item.orderCount} mã đơn</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-gray-500" />
                              <span>Sao chép {item.orderCount} Order No</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  handleCopyColumn(inspectColumnTitle, pcsGroups[inspectColumnKey] || []);
                }}
                className="px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-700 font-medium cursor-pointer transition-colors flex items-center gap-1.5"
              >
                {copiedKey === inspectColumnTitle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Sao chép tất cả {activeModalTotalOrders} mã đơn của cột này</span>
              </button>

              <button
                onClick={() => setInspectColumnKey(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

