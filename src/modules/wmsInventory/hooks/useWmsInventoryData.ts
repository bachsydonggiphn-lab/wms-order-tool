import { useState, useEffect, useMemo, useRef } from 'react';
import { InventoryQueryResult, InventoryGroupSummary, WmsInventoryItem, SkuGroupsMap } from '../../../types';
import { loadWmsInventory, getCachedInventory } from '../../../services/inventoryService';
import { playOrderAlertSound } from '../../../utils/audioAlert';
import { DEFAULT_AREA_ORDER } from '../../../utils/skuData';
import { StockFilterType, ViewMode, SortField, SortOrder, SkuDiffInfo } from '../types';

export function compareGroups(a: string, b: string): number {
  const idxA = DEFAULT_AREA_ORDER.indexOf(a);
  const idxB = DEFAULT_AREA_ORDER.indexOf(b);
  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

interface UseWmsInventoryDataParams {
  skuGroups: SkuGroupsMap;
}

export const useWmsInventoryData = ({ skuGroups }: UseWmsInventoryDataParams) => {
  const [data, setData] = useState<InventoryQueryResult | null>(() => getCachedInventory());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Real-Time Polling States
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [countdown, setCountdown] = useState<number>(10);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [recentChanges, setRecentChanges] = useState<{
    time: string;
    changedCount: number;
    details: Array<{ sku: string; diffInUsed: number }>;
  } | null>(null);
  const [changedSkuMap, setChangedSkuMap] = useState<Record<string, SkuDiffInfo>>({});

  // Filters & Controls
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('7');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('GROUPED');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);

  // Sorting for table mode
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Refs for background interval to avoid stale closures
  const dataRef = useRef<InventoryQueryResult | null>(data);
  dataRef.current = data;
  const isAutoRefreshRef = useRef<boolean>(isAutoRefresh);
  isAutoRefreshRef.current = isAutoRefresh;
  const refreshIntervalRef = useRef<number>(refreshInterval);
  refreshIntervalRef.current = refreshInterval;
  const warehouseRef = useRef<string>(selectedWarehouse);
  warehouseRef.current = selectedWarehouse;
  const isPollingRef = useRef<boolean>(isPolling);
  isPollingRef.current = isPolling;
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  soundEnabledRef.current = soundEnabled;
  const skuGroupsRef = useRef<SkuGroupsMap>(skuGroups);
  skuGroupsRef.current = skuGroups;

  const performSilentPoll = async () => {
    if (isPollingRef.current) return;
    setIsPolling(true);
    try {
      const res = await loadWmsInventory({
        warehouse: warehouseRef.current,
        skuGroups: skuGroupsRef.current,
      });

      const oldMap = new Map<string, WmsInventoryItem>();
      if (dataRef.current?.items) {
        dataRef.current.items.forEach((it) => oldMap.set(it.sku, it));
      }

      const diffs: Array<{ sku: string; diffInUsed: number }> = [];
      const newChangedMap: Record<string, SkuDiffInfo> = {};

      if (oldMap.size > 0) {
        res.items.forEach((newItem) => {
          const old = oldMap.get(newItem.sku);
          if (old) {
            const diffInUsed = newItem.inUsed - old.inUsed;
            const diffSellable = newItem.sellable - old.sellable;
            const diffOnWay = newItem.onWay - old.onWay;
            const diffOutbound = newItem.outbound - old.outbound;

            if (diffInUsed !== 0 || diffSellable !== 0 || diffOnWay !== 0 || diffOutbound !== 0) {
              diffs.push({ sku: newItem.sku, diffInUsed });
              newChangedMap[newItem.sku] = {
                diffInUsed,
                diffSellable,
                diffOnWay,
                diffOutbound,
              };
            }
          }
        });
      }

      setData(res);

      if (diffs.length > 0) {
        setRecentChanges({
          time: new Date().toLocaleTimeString('vi-VN'),
          changedCount: diffs.length,
          details: diffs.slice(0, 5),
        });
        setChangedSkuMap(newChangedMap);
        if (soundEnabledRef.current) {
          playOrderAlertSound();
        }
        setTimeout(() => {
          setChangedSkuMap({});
        }, 8000);
      }
    } catch (e) {
      console.warn('Silent inventory poll error:', e);
    } finally {
      setIsPolling(false);
    }
  };

  const fetchData = async (warehouseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loadWmsInventory({
        warehouse: warehouseId,
        skuGroups,
      });
      setData(res);
      if (res.groups && res.groups.length > 0) {
        const top3: Record<string, boolean> = {};
        res.groups.slice(0, 3).forEach((g) => {
          top3[g.group] = true;
        });
        setExpandedGroups(top3);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu tồn kho từ YunWMS.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(selectedWarehouse);
  }, [selectedWarehouse]);

  // Re-fetch when skuGroups changes
  useEffect(() => {
    if (dataRef.current) {
      fetchData(selectedWarehouse);
    }
  }, [skuGroups]);

  // Background Real-Time Polling Effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (!isAutoRefreshRef.current) return;

      setCountdown((prev) => {
        if (prev <= 1) {
          performSilentPoll();
          return refreshIntervalRef.current;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const toggleGroupExpand = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const expandAllGroups = () => {
    if (!data) return;
    const all: Record<string, boolean> = {};
    data.groups.forEach((g) => {
      all[g.group] = true;
    });
    setExpandedGroups(all);
  };

  const collapseAllGroups = () => {
    setExpandedGroups({});
  };

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1800);
  };

  const handleCopyGroupSkus = (group: InventoryGroupSummary) => {
    const text = group.items.map((it) => `${it.sku}\t${it.inUsed}\t${it.sellable}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedGroup(group.group);
    setTimeout(() => setCopiedGroup(null), 2000);
  };

  // Filtered items logic
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter((item) => {
      if (selectedGroup !== 'ALL' && item.group !== selectedGroup) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchGroup = item.group.toLowerCase().includes(q);
        if (!matchSku && !matchTitle && !matchGroup) return false;
      }

      if (stockFilter === 'IN_STOCK' && item.inUsed <= 0) return false;
      if (stockFilter === 'OUT_OF_STOCK' && item.inUsed > 0) return false;
      if (stockFilter === 'ON_WAY' && item.onWay <= 0) return false;
      if (stockFilter === 'PENDING_OUTBOUND' && item.outbound <= 0) return false;
      if (stockFilter === 'DEFECTIVE' && item.unsellable <= 0) return false;

      return true;
    });
  }, [data, selectedGroup, searchQuery, stockFilter]);

  // Smart Autocomplete Suggestions calculation
  const smartSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !data?.items) return [];

    const matched = data.items
      .map((item) => {
        const skuLower = item.sku.toLowerCase();
        const titleLower = (item.title || item.productName || '').toLowerCase();
        const groupLower = (item.group || '').toLowerCase();

        let score = 0;
        if (skuLower === q) {
          score = 100;
        } else if (skuLower.startsWith(q)) {
          score = 80;
        } else if (skuLower.includes(q)) {
          score = 60;
        } else if (titleLower.includes(q)) {
          score = 40;
        } else if (groupLower.includes(q)) {
          score = 20;
        }

        return { item, score };
      })
      .filter((entry) => entry.score > 0);

    matched.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.item.inUsed !== a.item.inUsed) return b.item.inUsed - a.item.inUsed;
      return a.item.sku.localeCompare(b.item.sku, undefined, { numeric: true, sensitivity: 'base' });
    });

    return matched.slice(0, 10).map((m) => m.item);
  }, [data?.items, searchQuery]);

  // Grouped results based on filtered items
  const filteredGroups = useMemo(() => {
    if (!data?.groups) return [];
    const map: Record<string, InventoryGroupSummary> = {};
    filteredItems.forEach((item) => {
      if (!map[item.group]) {
        map[item.group] = {
          group: item.group,
          skuCount: 0,
          totalInUsed: 0,
          totalSellable: 0,
          totalOnWay: 0,
          totalPending: 0,
          totalOutbound: 0,
          totalUnsellable: 0,
          items: [],
          percentageOfTotal: 0,
        };
      }
      const g = map[item.group];
      g.skuCount += 1;
      g.totalInUsed += item.inUsed;
      g.totalSellable += item.sellable;
      g.totalOnWay += item.onWay;
      g.totalPending += item.pending;
      g.totalOutbound += item.outbound;
      g.totalUnsellable += item.unsellable;
      g.items.push(item);
    });

    const totalInUsed = data.totalInUsed || 1;
    return Object.values(map)
      .map((g) => ({
        ...g,
        percentageOfTotal: Math.round((g.totalInUsed / totalInUsed) * 1000) / 10,
        items: g.items.sort((a, b) =>
          a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' })
        ),
      }))
      .sort((a, b) => compareGroups(a.group, b.group));
  }, [filteredItems, data]);

  // Sorted items for table mode
  const sortedTableItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA: any = a[sortField as keyof WmsInventoryItem];
      let valB: any = b[sortField as keyof WmsInventoryItem];

      if (sortField === 'sku') {
        const cmp = a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' });
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      if (sortField === 'group') {
        const cmp = compareGroups(a.group, b.group);
        return sortOrder === 'asc' ? cmp : -cmp;
      }

      valA = Number(valA || 0);
      valB = Number(valB || 0);
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredItems, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return {
    data,
    loading,
    error,
    isAutoRefresh,
    setIsAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    countdown,
    isPolling,
    soundEnabled,
    setSoundEnabled,
    recentChanges,
    changedSkuMap,
    selectedWarehouse,
    setSelectedWarehouse,
    selectedGroup,
    setSelectedGroup,
    searchQuery,
    setSearchQuery,
    stockFilter,
    setStockFilter,
    viewMode,
    setViewMode,
    expandedGroups,
    toggleGroupExpand,
    expandAllGroups,
    collapseAllGroups,
    copiedSku,
    copiedGroup,
    handleCopySku,
    handleCopyGroupSkus,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    handleSort,
    filteredItems,
    smartSuggestions,
    filteredGroups,
    sortedTableItems,
    fetchData,
  };
};
