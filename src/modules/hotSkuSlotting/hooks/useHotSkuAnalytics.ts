import { useState, useEffect, useMemo } from 'react';
import { HotSkuAnalysisItem, HotSkuAnalyticsResult } from '../../../../sqliteDb';
import { DEFAULT_AREA_ORDER } from '../../../utils/skuData';
import { GroupSlottingMetricItem } from '../components/GroupSlottingSection';
import { HotSkuSubTab } from '../types';

export const useHotSkuAnalytics = () => {
  // Sub-tab: 'map_and_table' | 'group_slotting' | 'relocation_tasks' | 'paired_skus'
  const [activeSubTab, setActiveSubTab] = useState<HotSkuSubTab>('map_and_table');
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  // Category slotting states
  const [selectedSlottingGroup, setSelectedSlottingGroup] = useState<string>('ALL');
  const [slottingGroupSearch, setSlottingGroupSearch] = useState<string>('');
  const [slottingGroupAbcFilter, setSlottingGroupAbcFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [slottingGroupViewMode, setSlottingGroupViewMode] = useState<'2d_aisles' | 'cards' | 'table'>('2d_aisles');

  // Filter states
  const [timeframe, setTimeframe] = useState<'3d' | '7d' | '30d' | '90d' | 'all' | 'custom'>('30d');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedAbc, setSelectedAbc] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<'ALL' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'INBOUND'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [rankingMode, setRankingMode] = useState<'normalized' | 'actual'>('normalized');
  const [filterStockoutIncomingOnly, setFilterStockoutIncomingOnly] = useState<boolean>(false);

  // Analysis result state
  const [analytics, setAnalytics] = useState<HotSkuAnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAnalytics = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/wms/shipped/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeframe,
          fromDate: customFromDate || undefined,
          toDate: customToDate || undefined,
          group: selectedGroup !== 'ALL' ? selectedGroup : undefined,
          includeInventory: true,
          rankingMode,
        }),
      });

      if (!res.ok) {
        throw new Error(`Lỗi máy chủ (${res.status})`);
      }

      const data: HotSkuAnalyticsResult = await res.json();
      if (!data.success) {
        throw new Error('Không thể tải dữ liệu phân tích');
      }

      setAnalytics(data);
    } catch (err: any) {
      console.error('[Analytics Fetch Error]', err);
      setErrorMessage(err?.message || 'Lỗi khi tải dữ liệu phân tích');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, customFromDate, customToDate, selectedGroup, rankingMode]);

  const filteredItems = useMemo(() => {
    if (!analytics?.items) return [];

    return analytics.items.filter((item) => {
      if (filterStockoutIncomingOnly && !item.isStockoutWithIncoming) {
        return false;
      }
      if (searchTerm) {
        const cleanSearch = searchTerm.trim().toLowerCase();
        const matchSku = item.sku.toLowerCase().includes(cleanSearch);
        const matchTitle = (item.productTitle || '').toLowerCase().includes(cleanSearch);
        const matchGroup = item.groupName.toLowerCase().includes(cleanSearch);
        if (!matchSku && !matchTitle && !matchGroup) return false;
      }
      if (selectedAbc !== 'ALL') {
        if (item.abcRank !== selectedAbc) return false;
      }
      if (selectedZoneFilter !== 'ALL') {
        if (selectedZoneFilter === 'ZONE_A' && !item.recommendedZone.includes('A')) return false;
        if (selectedZoneFilter === 'ZONE_B' && !item.recommendedZone.includes('B')) return false;
        if (selectedZoneFilter === 'ZONE_C' && !item.recommendedZone.includes('C')) return false;
        if (selectedZoneFilter === 'INBOUND' && !item.isStockoutWithIncoming) return false;
      }
      return true;
    });
  }, [analytics, searchTerm, selectedAbc, selectedZoneFilter, filterStockoutIncomingOnly]);

  const toggleTaskCompleted = (taskId: string) => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const markAllTasksCompleted = () => {
    if (!analytics?.relocationTasks) return;
    const allIds = new Set(analytics.relocationTasks.map((t) => t.id));
    setCompletedTaskIds(allIds);
  };

  const resetAllTasks = () => {
    setCompletedTaskIds(new Set());
  };

  const groupSlottingMetrics: GroupSlottingMetricItem[] = useMemo(() => {
    if (!analytics?.items || analytics.items.length === 0) return [];

    const map = new Map<
      string,
      {
        groupName: string;
        totalSold: number;
        totalOrders: number;
        skuCount: number;
        classACount: number;
        classBCount: number;
        classCCount: number;
        totalInUsed: number;
        totalOnWay: number;
        items: HotSkuAnalysisItem[];
      }
    >();

    DEFAULT_AREA_ORDER.forEach((gName) => {
      map.set(gName, {
        groupName: gName,
        totalSold: 0,
        totalOrders: 0,
        skuCount: 0,
        classACount: 0,
        classBCount: 0,
        classCCount: 0,
        totalInUsed: 0,
        totalOnWay: 0,
        items: [],
      });
    });

    analytics.items.forEach((it) => {
      const gName = it.groupName || 'Khác';
      if (!map.has(gName)) {
        map.set(gName, {
          groupName: gName,
          totalSold: 0,
          totalOrders: 0,
          skuCount: 0,
          classACount: 0,
          classBCount: 0,
          classCCount: 0,
          totalInUsed: 0,
          totalOnWay: 0,
          items: [],
        });
      }
      const g = map.get(gName)!;
      g.totalSold += it.totalSold;
      g.totalOrders += it.orderCount;
      g.skuCount += 1;
      if (it.abcRank === 'A') g.classACount += 1;
      else if (it.abcRank === 'B') g.classBCount += 1;
      else g.classCCount += 1;
      g.totalInUsed += it.inUsed || 0;
      g.totalOnWay += it.onWay || 0;
      g.items.push(it);
    });

    const totalSoldAll = analytics.totalSoldVolume || 1;

    const list = Array.from(map.values())
      .filter((g) => g.skuCount > 0 || g.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold);

    let cumulative = 0;
    return list.map((g, idx) => {
      cumulative += g.totalSold;
      const cumPct = (cumulative / totalSoldAll) * 100;
      const pctOfTotal = Math.round((g.totalSold / totalSoldAll) * 1000) / 10;

      g.items.sort((a, b) => b.totalSold - a.totalSold);

      let aisleCode = '';
      let zoneTag: 'ZONE_A' | 'ZONE_B' | 'ZONE_C' = 'ZONE_C';
      let priority: 'high' | 'medium' | 'low' = 'low';
      let levelRecommendation = '';
      let reason = '';
      let distanceLabel = '';

      if (idx === 0 || cumPct <= 65) {
        const aisleNum = String(idx + 1).padStart(2, '0');
        aisleCode = `Dãy Kệ ${aisleNum} (Mặt Tiền & Sát Cửa Xuất)`;
        zoneTag = 'ZONE_A';
        priority = 'high';
        levelRecommendation = 'Ưu tiên Tầng 1 - 2 (Ngang tầm ngực & thắt lưng, nhặt < 3-5m)';
        reason = `Nhóm chủ lực chiếm ${pctOfTotal}% tổng sản lượng kho. Cần đặt sát bàn đóng gói để tối ưu tối đa quãng đường di chuyển.`;
        distanceLabel = '< 5m tới Bàn Đóng Gói';
      } else if (cumPct <= 90) {
        const aisleNum = String(idx + 1).padStart(2, '0');
        aisleCode = `Dãy Kệ ${aisleNum} (Khu Vực Trung Tâm)`;
        zoneTag = 'ZONE_B';
        priority = 'medium';
        levelRecommendation = 'Bố trí Tầng 2 - 3 (Lối đi chính, xe đẩy 2 chiều)';
        reason = `Nhóm bán đều chiếm ${pctOfTotal}% sản lượng. Bố trí dãy giữa thuận tiện luân chuyển xe hàng.`;
        distanceLabel = '5 - 15m tới Bàn Đóng Gói';
      } else {
        const aisleNum = String(idx + 1).padStart(2, '0');
        aisleCode = `Dãy Kệ ${aisleNum} (Phía Sau & Kệ Cao)`;
        zoneTag = 'ZONE_C';
        priority = 'low';
        levelRecommendation = 'Tầng 4 - 5 hoặc Kệ lưu trữ sâu trong kho';
        reason = `Nhóm bán chậm hoặc phụ kiện (${pctOfTotal}%). Tránh choán chỗ vàng ở mặt tiền.`;
        distanceLabel = '> 15m tới Bàn Đóng Gói';
      }

      return {
        ...g,
        percentageOfWarehouseSold: pctOfTotal,
        optimalAisleRecommendation: {
          aisleCode,
          zoneTag,
          priority,
          levelRecommendation,
          reason,
          distanceLabel,
        },
        topHotSkus: g.items.slice(0, 5),
      };
    });
  }, [analytics]);

  const displayedSlottingSkus = useMemo(() => {
    if (!groupSlottingMetrics || groupSlottingMetrics.length === 0) return [];

    let targetGroups = groupSlottingMetrics;
    if (selectedSlottingGroup !== 'ALL') {
      targetGroups = groupSlottingMetrics.filter((g) => g.groupName === selectedSlottingGroup);
    }

    const allSkus: Array<{
      item: HotSkuAnalysisItem;
      groupName: string;
      aisleCode: string;
      zoneTag: string;
      levelRecommendation: string;
    }> = [];

    targetGroups.forEach((g) => {
      g.items.forEach((it) => {
        if (slottingGroupAbcFilter !== 'ALL' && it.abcRank !== slottingGroupAbcFilter) {
          return;
        }
        if (slottingGroupSearch) {
          const s = slottingGroupSearch.toLowerCase().trim();
          const matchSku = it.sku.toLowerCase().includes(s);
          const matchTitle = (it.productTitle || '').toLowerCase().includes(s);
          if (!matchSku && !matchTitle) return;
        }
        allSkus.push({
          item: it,
          groupName: g.groupName,
          aisleCode: g.optimalAisleRecommendation?.aisleCode || 'Chưa xếp dãy',
          zoneTag: g.optimalAisleRecommendation?.zoneTag || 'ZONE_C',
          levelRecommendation: g.optimalAisleRecommendation?.levelRecommendation || 'Tầng 3',
        });
      });
    });

    return allSkus;
  }, [groupSlottingMetrics, selectedSlottingGroup, slottingGroupSearch, slottingGroupAbcFilter]);

  return {
    activeSubTab,
    setActiveSubTab,
    completedTaskIds,
    toggleTaskCompleted,
    markAllTasksCompleted,
    resetAllTasks,
    timeframe,
    setTimeframe,
    customFromDate,
    setCustomFromDate,
    customToDate,
    setCustomToDate,
    selectedGroup,
    setSelectedGroup,
    selectedAbc,
    setSelectedAbc,
    selectedZoneFilter,
    setSelectedZoneFilter,
    searchTerm,
    setSearchTerm,
    rankingMode,
    setRankingMode,
    filterStockoutIncomingOnly,
    setFilterStockoutIncomingOnly,
    analytics,
    isLoading,
    errorMessage,
    fetchAnalytics,
    filteredItems,
    groupSlottingMetrics,
    displayedSlottingSkus,
    selectedSlottingGroup,
    setSelectedSlottingGroup,
    slottingGroupSearch,
    setSlottingGroupSearch,
    slottingGroupAbcFilter,
    setSlottingGroupAbcFilter,
    slottingGroupViewMode,
    setSlottingGroupViewMode,
  };
};
