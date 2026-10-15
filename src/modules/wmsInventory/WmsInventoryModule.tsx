import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Boxes,
  Search,
  Layers,
  ListFilter,
  Printer,
  Sparkles,
  CornerDownLeft,
  X
} from 'lucide-react';
import { InventoryQueryResult, InventoryGroupSummary, WmsInventoryItem, SkuGroupsMap } from '../../types';
import { loadWmsInventory, getCachedInventory, exportInventoryToExcel } from '../../services/inventoryService';
import { playOrderAlertSound } from '../../utils/audioAlert';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';
import { TabErrorBoundary } from '../../components/common/TabErrorBoundary';
import { InventoryPrintModal } from '../../components/InventoryPrintModal';
import { SingleSkuLabelModal } from '../../components/SingleSkuLabelModal';

// Subcomponents
import { InventoryHeaderBar } from './components/InventoryHeaderBar';
import { InventoryKpiCards } from './components/InventoryKpiCards';
import { InventoryGroupedView } from './components/InventoryGroupedView';
import { InventoryFlatTable } from './components/InventoryFlatTable';

function compareGroups(a: string, b: string): number {
  const idxA = DEFAULT_AREA_ORDER.indexOf(a);
  const idxB = DEFAULT_AREA_ORDER.indexOf(b);
  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

interface WmsInventoryModuleProps {
  skuGroups: SkuGroupsMap;
  onNavigateToSlotting?: () => void;
  onNavigateToOrders?: () => void;
}

type StockFilterType = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_WAY' | 'PENDING_OUTBOUND' | 'DEFECTIVE';
type ViewMode = 'GROUPED' | 'TABLE';
type SortField = 'inUsed' | 'sellable' | 'onWay' | 'outbound' | 'sku' | 'group';
type SortOrder = 'asc' | 'desc';

interface SkuDiffInfo {
  diffInUsed: number;
  diffSellable: number;
  diffOnWay: number;
  diffOutbound: number;
}

export const WmsInventoryModule: React.FC<WmsInventoryModuleProps> = ({
  skuGroups,
  onNavigateToSlotting,
  onNavigateToOrders
}) => {
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

  // Autocomplete Suggestion States
  const [isSuggestOpen, setIsSuggestOpen] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sorting for table mode
  const [sortField, setSortField] = useState<SortField>('sku');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Print Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printModalInitialGroup, setPrintModalInitialGroup] = useState<string>('ALL');
  const [printModalLayoutMode, setPrintModalLayoutMode] = useState<'COLUMN_MATRIX' | 'DETAILED_TABLE'>('COLUMN_MATRIX');

  const handleOpenPrintModal = (layoutMode: 'COLUMN_MATRIX' | 'DETAILED_TABLE' = 'COLUMN_MATRIX') => {
    setPrintModalInitialGroup(selectedGroup !== 'ALL' ? selectedGroup : 'ALL');
    setPrintModalLayoutMode(layoutMode);
    setIsPrintModalOpen(true);
  };

  const handleOpenPrintForGroup = (groupName: string) => {
    setPrintModalInitialGroup(groupName);
    setPrintModalLayoutMode('COLUMN_MATRIX');
    setIsPrintModalOpen(true);
  };

  // Single SKU Thermal Label Print States
  const [selectedSkuForLabel, setSelectedSkuForLabel] = useState<WmsInventoryItem | null>(null);
  const [isSkuLabelModalOpen, setIsSkuLabelModalOpen] = useState<boolean>(false);

  const handleOpenSkuLabel = (item: WmsInventoryItem) => {
    setSelectedSkuForLabel(item);
    setIsSkuLabelModalOpen(true);
  };

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

  const performSilentPoll = async () => {
    if (isPollingRef.current) return;
    setIsPolling(true);
    try {
      const res = await loadWmsInventory({
        warehouse: warehouseRef.current,
        skuGroups: skuGroupsRef.current
      });

      const oldMap = new Map<string, WmsInventoryItem>();
      if (dataRef.current?.items) {
        dataRef.current.items.forEach(it => oldMap.set(it.sku, it));
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
                diffOutbound
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
          details: diffs.slice(0, 5)
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
        skuGroups
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

  const toggleGroupExpand = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const expandAllGroups = () => {
    if (!data) return;
    const all: Record<string, boolean> = {};
    data.groups.forEach((g) => { all[g.group] = true; });
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
    const text = group.items.map(it => `${it.sku}\t${it.inUsed}\t${it.sellable}`).join('\n');
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

    const matched = data.items.map((item) => {
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
    }).filter(entry => entry.score > 0);

    matched.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.item.inUsed !== a.item.inUsed) return b.item.inUsed - a.item.inUsed;
      return a.item.sku.localeCompare(b.item.sku, undefined, { numeric: true, sensitivity: 'base' });
    });

    return matched.slice(0, 10).map(m => m.item);
  }, [data?.items, searchQuery]);

  const handleSelectSku = (sku: string) => {
    setSearchQuery(sku);
    setIsSuggestOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestOpen || smartSuggestions.length === 0) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && smartSuggestions.length > 0) {
        setIsSuggestOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < smartSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : smartSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < smartSuggestions.length) {
        e.preventDefault();
        handleSelectSku(smartSuggestions[highlightedIndex].sku);
      }
    } else if (e.key === 'Escape') {
      setIsSuggestOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    const q = query.trim();
    if (!q || !text) return text;
    try {
      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark key={i} className="bg-emerald-100 text-emerald-800 font-black px-0.5 rounded not-italic">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

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
          percentageOfTotal: 0
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
        items: g.items.sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }))
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

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredItems, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'sku' || field === 'group' ? 'asc' : 'desc');
    }
  };

  const handleExport = () => {
    if (!data) return;
    exportInventoryToExcel(data, `Ton_Kho_WMS_VN02_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <TabErrorBoundary tabName="Tra Cứu Tồn Kho WMS (VN02)" onNavigateBack={onNavigateToOrders}>
      <div className="space-y-4 animate-fade-in pb-12">
        {/* 1. Header Bar */}
        <InventoryHeaderBar
          data={data}
          loading={loading}
          selectedWarehouse={selectedWarehouse}
          setSelectedWarehouse={setSelectedWarehouse}
          isAutoRefresh={isAutoRefresh}
          setIsAutoRefresh={setIsAutoRefresh}
          refreshInterval={refreshInterval}
          setRefreshInterval={setRefreshInterval}
          countdown={countdown}
          isPolling={isPolling}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          recentChanges={recentChanges}
          setRecentChanges={setRecentChanges}
          fetchInventory={() => fetchData(selectedWarehouse)}
          handleExport={handleExport}
          handleOpenPrintModal={handleOpenPrintModal}
          onNavigateToSlotting={onNavigateToSlotting}
        />

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* 2. KPI Summary Cards */}
        <InventoryKpiCards data={data} />

        {/* 3. Search Bar, Group Tabs & View Mode Switcher */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Box with Smart Autocomplete */}
            <div ref={searchContainerRef} className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Tìm mã SKU, tên SP (gõ gợi ý tức thì)..."
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length > 0 && smartSuggestions.length > 0) {
                    setIsSuggestOpen(true);
                  }
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSuggestOpen(e.target.value.trim().length > 0);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setIsSuggestOpen(false);
                    setHighlightedIndex(-1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Dropdown Smart Autocomplete */}
              {isSuggestOpen && smartSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden z-50 animate-fade-in max-h-96 flex flex-col">
                  <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1.5 text-emerald-800">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Gợi Ý Nhanh ({smartSuggestions.length} mã phù hợp)
                    </span>
                    <span className="text-slate-400 text-[10px] font-mono">Dùng phím ↑ ↓ Enter</span>
                  </div>

                  <div className="overflow-y-auto divide-y divide-slate-100 max-h-80">
                    {smartSuggestions.map((item, sIdx) => {
                      const isSelected = highlightedIndex === sIdx;
                      return (
                        <div
                          key={item.sku}
                          onMouseEnter={() => setHighlightedIndex(sIdx)}
                          onClick={() => handleSelectSku(item.sku)}
                          className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors text-xs ${
                            isSelected ? 'bg-emerald-50/90 text-emerald-950 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                                {highlightMatch(item.sku, searchQuery)}
                              </span>
                              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                {item.group}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5" title={item.title}>
                              {highlightMatch(item.title || item.productName || '', searchQuery)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-right">
                            <div className="flex flex-col items-end">
                              <span
                                className={`px-2 py-0.5 rounded-md text-xs font-black ${
                                  item.inUsed > 0
                                    ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-300/60'
                                    : 'bg-rose-100/80 text-rose-800 border border-rose-300/60'
                                }`}
                              >
                                {item.inUsed > 0 ? `Tồn: ${item.inUsed}` : 'Hết hàng (0)'}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                Bán: <strong className="text-slate-600">{item.sellable}</strong>
                                {item.onWay > 0 && <span className="text-amber-600 ml-1 font-bold">+{item.onWay} về</span>}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSkuLabel(item);
                              }}
                              className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer shadow-2xs"
                              title={`In tem nhãn SKU ${item.sku} (Máy in nhiệt)`}
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <CornerDownLeft className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-300'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <button
                      type="button"
                      onClick={() => setIsSuggestOpen(false)}
                      className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
                    >
                      🔍 Xem bảng chi tiết cho "{searchQuery.trim()}"
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSuggestOpen(false);
                        setHighlightedIndex(-1);
                      }}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer font-medium"
                    >
                      Đóng [Esc]
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Filter Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setStockFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  stockFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                }`}
              >
                Tất Cả
              </button>
              <button
                onClick={() => setStockFilter('IN_STOCK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  stockFilter === 'IN_STOCK'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                }`}
              >
                Còn Hàng
              </button>
              <button
                onClick={() => setStockFilter('OUT_OF_STOCK')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  stockFilter === 'OUT_OF_STOCK'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                }`}
              >
                Hết Hàng (=0)
              </button>
              <button
                onClick={() => setStockFilter('ON_WAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  stockFilter === 'ON_WAY'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                }`}
              >
                Đang Về
              </button>
              <button
                onClick={() => setStockFilter('PENDING_OUTBOUND')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  stockFilter === 'PENDING_OUTBOUND'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-800'
                }`}
              >
                Chờ Xuất
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode('GROUPED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'GROUPED'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Gom Nhóm SKU</span>
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'TABLE'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Bảng Toàn Bộ</span>
              </button>
            </div>
          </div>

          {/* Group Filter Badges */}
          {data?.groups && data.groups.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <span>Chọn Nhanh Nhóm SKU:</span>
                  <span className="text-emerald-700 font-extrabold">({filteredGroups.length} nhóm)</span>
                </span>
                {viewMode === 'GROUPED' && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={expandAllGroups}
                      className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                    >
                      Bung tất cả
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={collapseAllGroups}
                      className="text-slate-500 hover:underline font-semibold cursor-pointer"
                    >
                      Thu gọn
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedGroup('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedGroup === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Tất Cả ({data.totalSkus})
                </button>

                {[...data.groups].sort((a, b) => compareGroups(a.group, b.group)).map((g) => {
                  const isSelected = selectedGroup === g.group;
                  return (
                    <button
                      key={g.group}
                      onClick={() => setSelectedGroup(isSelected ? 'ALL' : g.group)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{g.group}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {g.skuCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 4. Content Rendering */}
        {loading && !data ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-bold text-slate-700">Đang kết nối và kéo tồn kho từ YunWMS...</p>
            <p className="text-xs text-slate-400 mt-1">Đang phân tích 334+ mã sản phẩm và nhóm SKU</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">Không tìm thấy sản phẩm nào phù hợp</h4>
            <p className="text-xs text-slate-400 mt-1">Thử đổi từ khóa tìm kiếm hoặc chọn nhóm SKU khác.</p>
          </div>
        ) : viewMode === 'GROUPED' ? (
          <InventoryGroupedView
            filteredGroups={filteredGroups}
            expandedGroups={expandedGroups}
            toggleGroupExpand={toggleGroupExpand}
            copiedGroup={copiedGroup}
            handleCopyGroupSkus={handleCopyGroupSkus}
            handleOpenPrintForGroup={handleOpenPrintForGroup}
            copiedSku={copiedSku}
            handleCopySku={handleCopySku}
            handleOpenSkuLabel={handleOpenSkuLabel}
            changedSkuMap={changedSkuMap}
          />
        ) : (
          <InventoryFlatTable
            sortedTableItems={sortedTableItems}
            data={data}
            handleOpenPrintModal={handleOpenPrintModal}
            sortField={sortField}
            setSortField={setSortField}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            handleSort={handleSort}
            copiedSku={copiedSku}
            handleCopySku={handleCopySku}
            handleOpenSkuLabel={handleOpenSkuLabel}
            changedSkuMap={changedSkuMap}
          />
        )}

        {/* 5. Print Modal */}
        <InventoryPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          data={data}
          initialGroup={printModalInitialGroup}
          initialLayoutMode={printModalLayoutMode}
        />

        {/* 6. Single SKU Thermal Label Print Modal */}
        <SingleSkuLabelModal
          isOpen={isSkuLabelModalOpen}
          onClose={() => {
            setIsSkuLabelModalOpen(false);
            setSelectedSkuForLabel(null);
          }}
          item={selectedSkuForLabel}
        />
      </div>
    </TabErrorBoundary>
  );
};
