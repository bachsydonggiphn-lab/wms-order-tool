import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  RawOrderRow,
  SkuGroupsMap,
  CarrierCode,
  SkuPackingPcsMode,
  SkuPackingSortMode,
  SkuPackingItem,
} from '../../../../../types';
import { DEFAULT_AREA_ORDER } from '../../../../../utils/skuData';
import {
  xuLyLocDon1PCS,
  xuLyPhanTachTheoSKU,
} from '../../../../../utils/orderProcessor';
import { SinglePcsViewProps, SinglePcsViewMode, SelectedSkuStats } from '../types';

export function useSinglePcsData(props: SinglePcsViewProps) {
  const {
    orders,
    skuGroups,
    selectedPickingList,
    selectedCarrier = 'ALL',
    searchTerm: globalSearchTerm,
  } = props;

  const [viewMode, setViewMode] = useState<SinglePcsViewMode>('by_sku');
  const [pcsMode, setPcsMode] = useState<SkuPackingPcsMode>('1_PCS');
  const [customPcsInput, setCustomPcsInput] = useState<number>(10);
  const [sortMode, setSortMode] = useState<SkuPackingSortMode>('order_count_desc');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [localSearch, setLocalSearch] = useState<string>('');

  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [completedSkus, setCompletedSkus] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
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

  const activeAreas = useMemo(() => {
    return dynamicAreaList.filter(
      (nhom) => don1PCSTheoNhom[nhom] && don1PCSTheoNhom[nhom].length > 0
    );
  }, [dynamicAreaList, don1PCSTheoNhom]);

  const totalSinglePcsInArea = useMemo(() => {
    return Object.values(don1PCSTheoNhom).reduce((sum, arr) => sum + arr.length, 0);
  }, [don1PCSTheoNhom]);

  const searchFilter = (localSearch || globalSearchTerm || '').trim().toLowerCase();

  const filteredSkuList = useMemo(() => {
    return breakdownResult.skuList.filter((item) => {
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

  const selectedStats: SelectedSkuStats = useMemo(() => {
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

  const top1Sku = breakdownResult.skuList.length > 0 ? breakdownResult.skuList[0] : null;

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

  const handleSelectTopN = (n: number) => {
    const topSkus = filteredSkuList.slice(0, n).map((it) => it.sku);
    setSelectedSkus(new Set(topSkus));
  };

  const handleSelectRangeOrders = (minOrders: number, maxOrders: number) => {
    const matched = filteredSkuList
      .filter((it) => it.orderCount >= minOrders && it.orderCount <= maxOrders)
      .map((it) => it.sku);
    setSelectedSkus(new Set(matched));
  };

  const handleSelectMinOrders = (minOrders: number) => {
    const matched = filteredSkuList.filter((it) => it.orderCount >= minOrders).map((it) => it.sku);
    setSelectedSkus(new Set(matched));
  };

  const handleSelectAllVisible = () => {
    if (selectedSkus.size === filteredSkuList.length && filteredSkuList.length > 0) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set(filteredSkuList.map((it) => it.sku)));
    }
  };

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

  const handleMarkSelectedCompleted = () => {
    setCompletedSkus((prev) => {
      const next = new Set(prev);
      selectedSkus.forEach((sku) => next.add(sku));
      return next;
    });
    setSelectedSkus(new Set());
  };

  const handleCopySkuOrders = (sku: string, orderNos: string[]) => {
    if (!orderNos || orderNos.length === 0) return;
    navigator.clipboard.writeText(orderNos.join('\n'));
    setCopiedKey(`sku_${sku}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopySelectedOrders = () => {
    if (selectedStats.allSelectedOrderNos.length === 0) return;
    navigator.clipboard.writeText(selectedStats.allSelectedOrderNos.join('\n'));
    setCopiedKey('batch_selected');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleExportSelectedExcel = () => {
    if (selectedStats.selectedItems.length === 0) return;

    const dataRows = selectedStats.selectedItems.map((it) => ({
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

  const handleCopyArea = (nhom: string, list: string[]) => {
    if (!list || list.length === 0) return;
    navigator.clipboard.writeText(list.join('\n'));
    setCopiedKey(nhom);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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

  return {
    viewMode,
    setViewMode,
    pcsMode,
    setPcsMode,
    customPcsInput,
    setCustomPcsInput,
    sortMode,
    setSortMode,
    selectedAreaFilter,
    setSelectedAreaFilter,
    localSearch,
    setLocalSearch,
    selectedSkus,
    setSelectedSkus,
    completedSkus,
    setCompletedSkus,
    hideCompleted,
    setHideCompleted,
    copiedKey,
    setCopiedKey,
    availablePcsStats,
    breakdownResult,
    don1PCSTheoNhom,
    dynamicAreaList,
    activeAreas,
    totalSinglePcsInArea,
    filteredSkuList,
    selectedStats,
    top1Sku,
    handleToggleSku,
    handleSelectTopN,
    handleSelectRangeOrders,
    handleSelectMinOrders,
    handleSelectAllVisible,
    handleToggleComplete,
    handleMarkSelectedCompleted,
    handleCopySkuOrders,
    handleCopySelectedOrders,
    handleExportSelectedExcel,
    handleCopyArea,
    getPcsModeLabel,
  };
}
