import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { RawOrderRow, SkuGroupsMap } from '../../../../../types';
import { xuLyGopPCS } from '../../../../../utils/orderProcessor';
import { DEFAULT_SKU_GROUPS } from '../../../../../utils/skuData';
import {
  SkuAndPcsViewProps,
  ColumnSkuItem,
  ColumnViewMode,
  MinOrderThreshold,
  MobileColumnTab,
  SelectedSkuEntry,
} from '../types';

export function useSkuAndPcsData(props: SkuAndPcsViewProps) {
  const {
    orders,
    skuGroups = DEFAULT_SKU_GROUPS,
    selectedPickingList,
    selectedCarrier = 'ALL',
    searchTerm,
    onOrdersChange,
    currentWmsStatus,
  } = props;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [skuSortMode, setSkuSortMode] = useState<'name' | 'qty'>('name');

  // Trạng thái thu gọn / mở rộng ("thò thụt") của Bảng Tổng Hợp SKU (Cột S:T)
  const [isSkuTableCollapsed, setIsSkuTableCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sku_table_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSkuTableCollapsed = () => {
    setIsSkuTableCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sku_table_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Tính năng Tạo Picking List WMS chỉ hoạt động và hiển thị ở trạng thái Submitted (E11=4)
  const isSubmittedStatus = currentWmsStatus
    ? currentWmsStatus === '4'
    : (() => {
        try {
          const s = localStorage.getItem('wms_auto_refresh_status');
          return s === '4' || !s;
        } catch {
          return true;
        }
      })();

  // Trạng thái mở modal Tạo Picking List trực tiếp trên YunWMS (E11=4 -> E11=5)
  const [wmsModalState, setWmsModalState] = useState<{
    isOpen: boolean;
    batchTitle: string;
    orderCodes: string[];
  }>({
    isOpen: false,
    batchTitle: '',
    orderCodes: [],
  });

  const handleOpenCreateWmsModal = (orderCodes: string[], batchTitle: string) => {
    if (!isSubmittedStatus) return;
    if (!orderCodes || orderCodes.length === 0) return;
    setWmsModalState({
      isOpen: true,
      batchTitle,
      orderCodes: Array.from(new Set(orderCodes)),
    });
  };

  const handleWmsSuccess = (pickCode: string, createdCodes: string[]) => {
    setSelectedSkuMap(new Map());
    if (onOrdersChange && orders && orders.length > 0) {
      const codeSet = new Set(createdCodes);
      const updated = orders.map((o) => {
        if (codeSet.has(o.orderNo)) {
          return {
            ...o,
            pickingList: pickCode,
            rawPickingText: pickCode,
          };
        }
        return o;
      });
      onOrdersChange(updated);
    }
  };

  // Trạng thái chọn từng SKU riêng lẻ (checkbox) để gom tạo Picking List WMS
  const [selectedSkuMap, setSelectedSkuMap] = useState<Map<string, SelectedSkuEntry>>(new Map());

  // Thống kê các SKU được chọn thủ công
  const selectedStats = useMemo(() => {
    const entries = Array.from(selectedSkuMap.values());
    const allOrderNos = Array.from(new Set(entries.flatMap((e) => e.orderNos)));
    const totalPcs = entries.reduce((sum, e) => sum + e.totalQty, 0);
    const skuSet = new Set(entries.map((e) => e.sku));

    return {
      count: entries.length,
      skuCount: skuSet.size,
      orderCount: allOrderNos.length,
      totalPcs,
      allOrderNos,
    };
  }, [selectedSkuMap]);

  // Chế độ hiển thị trong các cột PCS
  const [columnViewMode, setColumnViewMode] = useState<ColumnViewMode>('sku');

  // Bộ lọc khoảng số lượng đơn hàng của SKU
  const [minOrderThreshold, setMinOrderThreshold] = useState<MinOrderThreshold>('all');
  const [customMinOrders, setCustomMinOrders] = useState<number>(10);

  // Trạng thái mở rộng danh sách order no cho từng SKU cụ thể: key format `colKey_sku`
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());

  // Modal xem chi tiết phân tách SKU của 1 cột PCS cụ thể
  const [inspectColumnKey, setInspectColumnKey] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState<string>('');
  const [modalSelectedSkus, setModalSelectedSkus] = useState<Set<string>>(new Set());

  // Chế độ xem trên mobile
  const [mobileColumnTab, setMobileColumnTab] = useState<MobileColumnTab>('pcs');

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

  // Thống kê toàn cục các SKU theo từng khoảng đơn hàng
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

  // Copy toàn bộ đơn của các SKU nằm trong khoảng [min, max] (toàn bộ cột PCS)
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

  // Helper lấy mã RefNo của đơn hàng
  const getOrderRefNo = (orderNo: string): string => {
    const o = orderMap.get(orderNo);
    if (!o) return orderNo;
    if (o.refNo && o.refNo.trim()) return o.refNo.trim();
    const match = o.rawOrderText?.match(/Ref\s*No\.?\s*[:：]\s*([^\r\n\t]+)/i);
    return match ? match[1].trim() : (o.orderNo || orderNo);
  };

  // Copy toàn bộ cột PCS
  const handleCopyColumn = (title: string, list: string[]) => {
    if (!list || list.length === 0) return;
    if (columnViewMode === 'ref_prefix') {
      const refNos = list
        .map((orderNo) => {
          const r = getOrderRefNo(orderNo);
          return `RefNo.：${r}`;
        })
        .filter(Boolean);
      navigator.clipboard.writeText(refNos.join('\n'));
      setCopiedKey(title);
      setTimeout(() => setCopiedKey(null), 2000);
      return;
    }
    if (columnViewMode === 'tracking_prefix') {
      const trackingNos = list
        .map((orderNo) => {
          const t = orderMap.get(orderNo)?.trackingNo?.trim();
          return t ? `Tracking No. ：${t}` : `Tracking No. ：${orderNo}`;
        })
        .filter(Boolean);
      if (trackingNos.length > 0) {
        navigator.clipboard.writeText(trackingNos.join('\n'));
      } else {
        navigator.clipboard.writeText(list.join('\n'));
      }
      setCopiedKey(title);
      setTimeout(() => setCopiedKey(null), 2000);
      return;
    }
    if (columnViewMode === 'tracking_no') {
      const trackingNos = list
        .map((orderNo) => orderMap.get(orderNo)?.trackingNo?.trim() || '')
        .filter(Boolean);
      if (trackingNos.length > 0) {
        navigator.clipboard.writeText(trackingNos.join('\n'));
      } else {
        navigator.clipboard.writeText(list.join('\n'));
      }
      setCopiedKey(title);
      setTimeout(() => setCopiedKey(null), 2000);
      return;
    }
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

  return {
    copiedKey,
    skuSortMode,
    setSkuSortMode,
    isSkuTableCollapsed,
    toggleSkuTableCollapsed,
    isSubmittedStatus,
    wmsModalState,
    setWmsModalState,
    handleOpenCreateWmsModal,
    handleWmsSuccess,
    selectedSkuMap,
    setSelectedSkuMap,
    selectedStats,
    columnViewMode,
    setColumnViewMode,
    minOrderThreshold,
    setMinOrderThreshold,
    customMinOrders,
    setCustomMinOrders,
    expandedSkus,
    handleToggleExpandSku,
    inspectColumnKey,
    setInspectColumnKey,
    modalSearch,
    setModalSearch,
    modalSelectedSkus,
    setModalSelectedSkus,
    mobileColumnTab,
    setMobileColumnTab,
    orderMap,
    skuEntries,
    totalSkuQty,
    pcsKeys,
    pcsGroups,
    columnSkuBreakdowns,
    activeThresholdNum,
    globalThresholdStats,
    handleCopyGlobalRange,
    handleCopyColumnRange,
    getOrderRefNo,
    handleCopyColumn,
    handleCopySkuInColumn,
    handleCopySkuTable,
    handleOpenInspectColumn,
    activeModalBreakdown,
    activeModalTotalOrders,
    inspectColumnTitle,
    filteredModalSkus,
    modalSelectedStats,
    handleCopyModalSelectedOrders,
    handleExportModalExcel,
  };
}
