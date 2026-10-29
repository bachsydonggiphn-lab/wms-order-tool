import React, { useRef, useState, useEffect } from 'react';
import { Search, Sparkles, CornerDownLeft, X, Layers, ListFilter, Printer, RefreshCw } from 'lucide-react';
import { InventoryGroupSummary, WmsInventoryItem, InventoryQueryResult } from '../../../types';
import { StockFilterType, ViewMode } from '../types';
import { compareGroups } from '../hooks/useWmsInventoryData';

interface InventoryFilterToolbarProps {
  data: InventoryQueryResult | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  smartSuggestions: WmsInventoryItem[];
  handleOpenSkuLabel: (item: WmsInventoryItem) => void;
  stockFilter: StockFilterType;
  setStockFilter: (filter: StockFilterType) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedGroup: string;
  setSelectedGroup: (grp: string) => void;
  filteredGroups: InventoryGroupSummary[];
  expandAllGroups: () => void;
  collapseAllGroups: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  isPolling?: boolean;
}

export const InventoryFilterToolbar: React.FC<InventoryFilterToolbarProps> = ({
  data,
  searchQuery,
  setSearchQuery,
  smartSuggestions,
  handleOpenSkuLabel,
  stockFilter,
  setStockFilter,
  viewMode,
  setViewMode,
  selectedGroup,
  setSelectedGroup,
  filteredGroups,
  expandAllGroups,
  collapseAllGroups,
  onRefresh,
  loading = false,
  isPolling = false,
}) => {
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
      setHighlightedIndex((prev) => (prev < smartSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : smartSuggestions.length - 1));
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

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Box with Smart Autocomplete */}
        <div className="flex items-center gap-2 flex-1 max-w-md w-full">
          <div ref={searchContainerRef} className="relative flex-1">
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
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || isPolling}
            className="sm:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 active:scale-95 transition-all shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu tồn kho"
          >
            <RefreshCw className={`w-4 h-4 ${loading || isPolling ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        )}
      </div>

        {/* Filter Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setStockFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              stockFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            Tất Cả
          </button>
          <button
            onClick={() => setStockFilter('IN_STOCK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              stockFilter === 'IN_STOCK' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            Còn Hàng
          </button>
          <button
            onClick={() => setStockFilter('OUT_OF_STOCK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              stockFilter === 'OUT_OF_STOCK' ? 'bg-rose-600 text-white' : 'bg-rose-50 hover:bg-rose-100 text-rose-700'
            }`}
          >
            Hết Hàng (=0)
          </button>
          <button
            onClick={() => setStockFilter('ON_WAY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              stockFilter === 'ON_WAY' ? 'bg-amber-500 text-white' : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
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
              viewMode === 'GROUPED' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gom Nhóm SKU</span>
          </button>
          <button
            onClick={() => setViewMode('TABLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'TABLE' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
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
                <button onClick={expandAllGroups} className="text-emerald-700 hover:underline font-semibold cursor-pointer">
                  Bung tất cả
                </button>
                <span className="text-slate-300">•</span>
                <button onClick={collapseAllGroups} className="text-slate-500 hover:underline font-semibold cursor-pointer">
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

            {[...data.groups]
              .sort((a, b) => compareGroups(a.group, b.group))
              .map((g) => {
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
  );
};
