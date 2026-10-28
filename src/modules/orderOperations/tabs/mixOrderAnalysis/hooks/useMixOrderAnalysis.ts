import { useState, useMemo } from 'react';
import { RawOrderRow, SkuGroupsMap, CarrierCode, SkuInMixSummary } from '../../../../../types';
import { xuLyPhanTichDonMix, xuLyGomDonMixTheoNhom } from '../../../../../utils/orderProcessor';
import {
  ViewMode,
  GroupingType,
  SubGroupTab,
  YogaFilter,
  PcsFilter,
  SortBy,
} from '../types';

export function useMixOrderAnalysis(
  orders: RawOrderRow[],
  skuGroups: SkuGroupsMap,
  selectedPickingList: string,
  selectedCarrier: CarrierCode = 'ALL'
) {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortBy>('area_orders');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('by_group');
  const [groupingType, setGroupingType] = useState<GroupingType>('model');
  const [subGroupTab, setSubGroupTab] = useState<SubGroupTab>('pure');
  const [yogaFilter, setYogaFilter] = useState<YogaFilter>('exclude');
  const [pcsFilter, setPcsFilter] = useState<PcsFilter>('all');

  // Phân tích đơn MIX theo nhóm sản phẩm (Cùng nhóm vs Chéo nhóm)
  const mixByGroup = useMemo(() => {
    return xuLyGomDonMixTheoNhom(orders, skuGroups, groupingType, selectedPickingList, yogaFilter, selectedCarrier);
  }, [orders, skuGroups, groupingType, selectedPickingList, yogaFilter, selectedCarrier]);

  // Lọc danh sách nhóm thuần theo PCS nếu có bộ lọc
  const filteredPureGroupList = useMemo(() => {
    if (pcsFilter === 'all') return mixByGroup.pureGroupList;
    return mixByGroup.pureGroupList.filter(
      (g) => (g.ordersByPcs[pcsFilter]?.length || 0) > 0
    );
  }, [mixByGroup.pureGroupList, pcsFilter]);

  // Lọc danh sách cặp nhóm chéo theo PCS nếu có bộ lọc
  const filteredCrossGroupPairs = useMemo(() => {
    if (pcsFilter === 'all') return mixByGroup.crossGroupPairs;
    return mixByGroup.crossGroupPairs.filter(
      (c) => (c.ordersByPcs[pcsFilter]?.length || 0) > 0
    );
  }, [mixByGroup.crossGroupPairs, pcsFilter]);

  // Lọc danh sách tổng hợp theo PCS nếu có bộ lọc
  const filteredAllGroupSummaries = useMemo(() => {
    if (pcsFilter === 'all') return mixByGroup.allGroupSummaries;
    return mixByGroup.allGroupSummaries.filter(
      (s) => (s.ordersByPcs[pcsFilter]?.length || 0) > 0
    );
  }, [mixByGroup.allGroupSummaries, pcsFilter]);

  // Phân tích đơn MIX theo SKU
  const mixAnalysis = useMemo(() => {
    return xuLyPhanTichDonMix(orders, skuGroups, selectedPickingList, yogaFilter, selectedCarrier);
  }, [orders, skuGroups, selectedPickingList, yogaFilter, selectedCarrier]);

  // Lấy danh sách các khu vực có trong đơn MIX
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    mixAnalysis.rankedSkus.forEach((s) => set.add(s.area));
    return Array.from(set).sort();
  }, [mixAnalysis]);

  // Lọc và sắp xếp SKU
  const filteredSkus = useMemo(() => {
    let list = [...mixAnalysis.rankedSkus];

    if (areaFilter !== 'ALL') {
      list = list.filter((s) => s.area === areaFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toUpperCase();
      list = list.filter(
        (s) =>
          s.sku.toUpperCase().includes(q) ||
          s.area.toUpperCase().includes(q) ||
          s.orders.some((o) => o.orderNo.toUpperCase().includes(q))
      );
    }

    if (sortBy === 'area_orders') {
      list.sort((a, b) => {
        if (a.area !== b.area) return a.area.localeCompare(b.area);
        return b.orderCount - a.orderCount || b.totalQty - a.totalQty;
      });
    } else if (sortBy === 'orders') {
      list.sort((a, b) => b.orderCount - a.orderCount || b.totalQty - a.totalQty);
    } else if (sortBy === 'qty') {
      list.sort((a, b) => b.totalQty - a.totalQty || b.orderCount - a.orderCount);
    } else if (sortBy === 'sku') {
      list.sort((a, b) => a.sku.localeCompare(b.sku));
    }

    return list;
  }, [mixAnalysis, areaFilter, searchTerm, sortBy]);

  // Nhóm SKU theo từng khu vực (để đi nhặt 1 lượt trong 1 khu)
  const skusGroupedByArea = useMemo(() => {
    const groups: Record<
      string,
      {
        area: string;
        skus: SkuInMixSummary[];
        totalAreaQty: number;
        distinctOrdersCount: number;
        distinctOrderNos: string[];
      }
    > = {};

    filteredSkus.forEach((item) => {
      if (!groups[item.area]) {
        groups[item.area] = {
          area: item.area,
          skus: [],
          totalAreaQty: 0,
          distinctOrdersCount: 0,
          distinctOrderNos: [],
        };
      }
      groups[item.area].skus.push(item);
      groups[item.area].totalAreaQty += item.totalQty;
    });

    Object.values(groups).forEach((g) => {
      const orderSet = new Set<string>();
      g.skus.forEach((s) => s.orders.forEach((o) => orderSet.add(o.orderNo)));
      g.distinctOrdersCount = orderSet.size;
      g.distinctOrderNos = Array.from(orderSet);
      g.skus.sort((a, b) => b.orderCount - a.orderCount || b.totalQty - a.totalQty);
    });

    return Object.values(groups).sort((a, b) => b.totalAreaQty - a.totalAreaQty);
  }, [filteredSkus]);

  // SKU đang chọn hiện tại (mặc định là SKU top 1)
  const currentSelectedSummary: SkuInMixSummary | undefined = useMemo(() => {
    if (selectedSku) {
      const found = mixAnalysis.rankedSkus.find((s) => s.sku === selectedSku);
      if (found) return found;
    }
    return filteredSkus[0] || mixAnalysis.rankedSkus[0];
  }, [selectedSku, filteredSkus, mixAnalysis]);

  // Top 1 SKU trùng nhiều đơn MIX nhất
  const top1Sku = useMemo(() => {
    if (!mixAnalysis.rankedSkus.length) return null;
    const sorted = [...mixAnalysis.rankedSkus].sort(
      (a, b) => b.orderCount - a.orderCount || b.totalQty - a.totalQty
    );
    return sorted[0];
  }, [mixAnalysis]);

  // Tính các cặp SKU thường đi cùng nhau
  const popularPairs = useMemo(() => {
    const pairMap: Record<string, { sku1: string; sku2: string; count: number; area1: string; area2: string }> = {};

    mixAnalysis.allMixOrders.forEach((order) => {
      const skus: string[] = Array.from(new Set(order.items.map((i) => i.sku)));
      for (let i = 0; i < skus.length; i++) {
        for (let j = i + 1; j < skus.length; j++) {
          const s1: string = skus[i] < skus[j] ? skus[i] : skus[j];
          const s2: string = skus[i] < skus[j] ? skus[j] : skus[i];
          const key = `${s1} <-> ${s2}`;
          if (!pairMap[key]) {
            pairMap[key] = {
              sku1: s1,
              sku2: s2,
              count: 0,
              area1: mixAnalysis.rankedSkus.find((r) => r.sku === s1)?.area || 'Khác',
              area2: mixAnalysis.rankedSkus.find((r) => r.sku === s2)?.area || 'Khác',
            };
          }
          pairMap[key].count += 1;
        }
      }
    });

    return Object.values(pairMap).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [mixAnalysis]);

  // Copy danh sách mã đơn
  const handleCopyOrders = (orderNos: string[], key: string) => {
    navigator.clipboard.writeText(orderNos.join('\n'));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return {
    selectedSku,
    setSelectedSku,
    searchTerm,
    setSearchTerm,
    areaFilter,
    setAreaFilter,
    sortBy,
    setSortBy,
    copiedKey,
    viewMode,
    setViewMode,
    groupingType,
    setGroupingType,
    subGroupTab,
    setSubGroupTab,
    yogaFilter,
    setYogaFilter,
    pcsFilter,
    setPcsFilter,
    mixByGroup,
    filteredPureGroupList,
    filteredCrossGroupPairs,
    filteredAllGroupSummaries,
    mixAnalysis,
    availableAreas,
    filteredSkus,
    skusGroupedByArea,
    currentSelectedSummary,
    top1Sku,
    popularPairs,
    handleCopyOrders,
  };
}
