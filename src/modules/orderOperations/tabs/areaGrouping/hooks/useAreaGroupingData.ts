import { useState, useMemo } from 'react';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../../../../types';
import { DEFAULT_AREA_ORDER } from '../../../../../utils/skuData';
import { xuLyPhanNhomKhuVuc } from '../../../../../utils/orderProcessor';
import { ColumnMode, DisplayLayout } from '../types';

interface UseAreaGroupingDataParams {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm?: string;
}

export const useAreaGroupingData = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
}: UseAreaGroupingDataParams) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [columnMode, setColumnMode] = useState<ColumnMode>('sheet4');
  const [displayLayout, setDisplayLayout] = useState<DisplayLayout>(() => {
    try {
      const saved = localStorage.getItem('area_grouping_display_layout');
      if (saved === 'matrix' || saved === 'cards') return saved;
    } catch {}
    return 'cards';
  });

  const handleDisplayLayoutChange = (mode: DisplayLayout) => {
    setDisplayLayout(mode);
    try {
      localStorage.setItem('area_grouping_display_layout', mode);
    } catch {}
  };

  const { donTheoNhom, dynamicAreaList } = xuLyPhanNhomKhuVuc(
    orders,
    skuGroups,
    DEFAULT_AREA_ORDER,
    selectedPickingList,
    selectedCarrier
  );

  const loaiKeys = useMemo(() => {
    return columnMode === 'sheet4'
      ? (['1 PCS', '2 PCS', '3 PCS', '4+ PCS', 'MIX'] as const)
      : (['1 PCS', '2 PCS', '3 PCS', '4 PCS', '5 PCS', '6 PCS', '7 PCS', '8+ PCS', 'MIX'] as const);
  }, [columnMode]);

  // Lọc các khu vực hiển thị (bao gồm cả các nhóm động AA, BB, CC...)
  const activeAreas = useMemo(() => {
    return dynamicAreaList.filter((nhom) => {
      const dataNhom = donTheoNhom[nhom] as Record<string, string[]> | undefined;
      if (!dataNhom) return false;
      const hasOrders = (loaiKeys as readonly string[]).some((l) => (dataNhom[l]?.length || 0) > 0);
      if (!hasOrders) return false;
      if (selectedAreaFilter !== 'ALL' && nhom !== selectedAreaFilter) return false;
      return true;
    });
  }, [dynamicAreaList, donTheoNhom, loaiKeys, selectedAreaFilter]);

  // Tìm số dòng lớn nhất trong bảng Matrix
  const maxMatrixRows = useMemo(() => {
    let max = 0;
    activeAreas.forEach((nhom) => {
      const dataNhom = donTheoNhom[nhom] as Record<string, string[]> | undefined;
      if (!dataNhom) return;
      (loaiKeys as readonly string[]).forEach((k) => {
        if ((dataNhom[k]?.length || 0) > max) {
          max = dataNhom[k].length;
        }
      });
    });
    return Math.max(max, 12);
  }, [activeAreas, donTheoNhom, loaiKeys]);

  const handleCopyAreaColumn = (title: string, list: string[]) => {
    if (!list || list.length === 0) return;
    navigator.clipboard.writeText(list.join('\n'));
    setCopiedKey(title);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyWholeArea = (nhom: string) => {
    const dataNhom = donTheoNhom[nhom] as Record<string, string[]> | undefined;
    if (!dataNhom) return;
    const lines: string[] = [`=== KHU VỰC ${nhom} ===`];
    (loaiKeys as readonly string[]).forEach((k) => {
      if (dataNhom[k]?.length > 0) {
        lines.push(`--- ${k} (${dataNhom[k].length} đơn) ---`);
        dataNhom[k].forEach((o) => lines.push(o));
      }
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedKey(`all_${nhom}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyCell = (orderNo: string, cellKey: string) => {
    if (!orderNo) return;
    navigator.clipboard.writeText(orderNo);
    setCopiedKey(cellKey);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const getTotalOrdersInArea = (nhom: string) => {
    const dataNhom = donTheoNhom[nhom] as Record<string, string[]> | undefined;
    if (!dataNhom) return 0;
    return (loaiKeys as readonly string[]).reduce((sum, k) => sum + (dataNhom[k]?.length || 0), 0);
  };

  return {
    copiedKey,
    selectedAreaFilter,
    setSelectedAreaFilter,
    columnMode,
    setColumnMode,
    displayLayout,
    handleDisplayLayoutChange,
    donTheoNhom,
    dynamicAreaList,
    loaiKeys,
    activeAreas,
    maxMatrixRows,
    handleCopyAreaColumn,
    handleCopyWholeArea,
    handleCopyCell,
    getTotalOrdersInArea,
  };
};
