import React, { useState, useEffect, useMemo } from 'react';
import {
  Boxes,
  RefreshCw,
  Download,
  Search,
  Check,
  Copy,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Truck,
  Clock,
  Warehouse,
  TrendingUp,
  Layers,
  ListFilter,
  ShieldAlert,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';
import { InventoryQueryResult, InventoryGroupSummary, WmsInventoryItem, SkuGroupsMap } from '../../types';
import { loadWmsInventory, getCachedInventory, exportInventoryToExcel } from '../../services/inventoryService';

interface InventoryQueryViewProps {
  skuGroups: SkuGroupsMap;
}

type StockFilterType = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK' | 'ON_WAY' | 'PENDING_OUTBOUND' | 'DEFECTIVE';
type ViewMode = 'GROUPED' | 'TABLE';
type SortField = 'inUsed' | 'sellable' | 'onWay' | 'outbound' | 'sku' | 'group';
type SortOrder = 'asc' | 'desc';

export const InventoryQueryView: React.FC<InventoryQueryViewProps> = ({ skuGroups }) => {
  const [data, setData] = useState<InventoryQueryResult | null>(() => getCachedInventory());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('7'); // 7 = VN02 [Đồng Nai]
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<StockFilterType>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('GROUPED');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);

  // Sorting for table mode
  const [sortField, setSortField] = useState<SortField>('inUsed');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Initial load
  useEffect(() => {
    fetchData(selectedWarehouse);
  }, [selectedWarehouse]);

  const fetchData = async (warehouseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await loadWmsInventory({
        warehouse: warehouseId,
        skuGroups
      });
      setData(res);
      // Mở sẵn top 3 nhóm có tồn nhiều nhất
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
      // Nhóm
      if (selectedGroup !== 'ALL' && item.group !== selectedGroup) return false;

      // Tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchGroup = item.group.toLowerCase().includes(q);
        if (!matchSku && !matchTitle && !matchGroup) return false;
      }

      // Trạng thái tồn
      if (stockFilter === 'IN_STOCK' && item.inUsed <= 0) return false;
      if (stockFilter === 'OUT_OF_STOCK' && item.inUsed > 0) return false;
      if (stockFilter === 'ON_WAY' && item.onWay <= 0) return false;
      if (stockFilter === 'PENDING_OUTBOUND' && item.outbound <= 0) return false;
      if (stockFilter === 'DEFECTIVE' && item.unsellable <= 0) return false;

      return true;
    });
  }, [data, selectedGroup, searchQuery, stockFilter]);

  // Grouped results based on filtered items
  const filteredGroups = useMemo(() => {
    if (!data?.groups) return [];
    // Nhóm lại theo các item đã lọc
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

    const totalAvail = Object.values(map).reduce((sum, g) => sum + g.totalInUsed, 0);
    const list = Object.values(map).map((g) => {
      g.percentageOfTotal = totalAvail > 0 ? Math.round((g.totalInUsed / totalAvail) * 1000) / 10 : 0;
      g.items.sort((a, b) => b.inUsed - a.inUsed);
      return g;
    });

    return list.sort((a, b) => b.totalInUsed - a.totalInUsed);
  }, [filteredItems, data]);

  // Sorted items for Table View
  const sortedTableItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredItems, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExportExcel = () => {
    if (!data) return;
    exportInventoryToExcel(data, selectedGroup);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Card with Live Status & Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Tra Cứu & Tổng Hợp Tồn Kho YunWMS
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/80 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live API czwh.wms.yunwms.com
                </span>
                {data?.fetchedAt && (
                  <span className="text-xs text-slate-500 font-medium">
                    (Cập nhật: {data.fetchedAt})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Tự động đồng bộ và gom nhóm thông minh theo danh mục SKU (YD-A, YD-D, YD-K, YD-L...) phục vụ điều phối và xuất kho
              </p>
            </div>
          </div>

          {/* Warehouse Selector & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700">
              <Warehouse className="w-4 h-4 text-emerald-600" />
              <span>Kho:</span>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="7">VN02 [Đồng Nai]</option>
                <option value="4">VN01 [Hải Ngoại]</option>
                <option value="">Tất cả kho</option>
              </select>
            </div>

            <button
              onClick={() => fetchData(selectedWarehouse)}
              disabled={loading}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                loading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Đang đồng bộ...' : 'Làm mới WMS'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!data || data.items.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 2. KPI Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Tổng SKU */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng SKU</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900">
              {data.totalSkus.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {data.groups.length} nhóm SKU
            </div>
          </div>

          {/* Khả Dụng Thực Tế (In Used) */}
          <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Khả Dụng (In Used)</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <PackageCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-emerald-700">
              {data.totalInUsed.toLocaleString()}
            </div>
            <div className="text-[11px] text-emerald-600 mt-0.5 font-semibold">
              Tồn kho thực tế
            </div>
          </div>

          {/* Có Thể Bán (Sellable) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Có Thể Bán</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-indigo-700">
              {data.totalSellable.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Sellable outbound
            </div>
          </div>

          {/* Đang Về (In Transit) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đang Về (On Way)</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-amber-600">
              {data.totalOnWay.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Hàng đang nhập
            </div>
          </div>

          {/* Chờ Xuất (Outbound) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chờ Xuất</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-purple-700">
              {data.totalOutbound.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Pending Outbound
            </div>
          </div>

          {/* Hàng Lỗi (Defective) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hàng Lỗi/Hỏng</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-rose-600">
              {data.totalUnsellable.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Defective Products
            </div>
          </div>
        </div>
      )}

      {/* 3. Search Bar, Group Tabs & View Mode Switcher */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm mã SKU, tên sản phẩm, nhóm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
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

              {data.groups.map((g) => {
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

      {/* 4. CONTENT RENDERING */}
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
        /* 4A. GROUPED VIEW */
        <div className="space-y-4">
          {filteredGroups.map((g) => {
            const isExpanded = !!expandedGroups[g.group];
            const isCopied = copiedGroup === g.group;

            return (
              <div
                key={g.group}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200"
              >
                {/* Group Header Bar */}
                <div
                  onClick={() => toggleGroupExpand(g.group)}
                  className="p-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 hover:bg-slate-100/60 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center border border-emerald-200 shrink-0">
                      {g.group.replace('YD-', '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-slate-900 tracking-tight">
                          Nhóm {g.group}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {g.skuCount} mã SKU
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {g.percentageOfTotal}% tổng kho
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                        <span>
                          Khả dụng: <strong className="text-emerald-700">{g.totalInUsed.toLocaleString()}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Có thể bán: <strong className="text-indigo-700">{g.totalSellable.toLocaleString()}</strong>
                        </span>
                        {g.totalOnWay > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 font-semibold">
                              Đang về: +{g.totalOnWay.toLocaleString()}
                            </span>
                          </>
                        )}
                        {g.totalOutbound > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 font-semibold">
                              Chờ xuất: {g.totalOutbound.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Chevron */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyGroupSkus(g);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
                      title="Sao chép bảng SKU và số lượng của nhóm này"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{isCopied ? 'Đã sao chép!' : 'Copy nhóm'}</span>
                    </button>

                    <div className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Group Details Table (When expanded) */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-4 w-12 text-center">STT</th>
                          <th className="py-2.5 px-4 w-44">Mã SKU</th>
                          <th className="py-2.5 px-4">Tên Sản Phẩm (Title)</th>
                          <th className="py-2.5 px-3 text-right">Khả Dụng (In Used)</th>
                          <th className="py-2.5 px-3 text-right">Có Thể Bán (Sellable)</th>
                          <th className="py-2.5 px-3 text-right">Đang Về (On Way)</th>
                          <th className="py-2.5 px-3 text-right">Chờ Xuất</th>
                          <th className="py-2.5 px-3 text-right">Hàng Lỗi</th>
                          <th className="py-2.5 px-4 text-center w-28">Cập Nhật</th>
                          <th className="py-2.5 px-3 text-center w-16">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {g.items.map((item, idx) => {
                          const isItemCopied = copiedSku === item.sku;
                          const isZero = item.inUsed <= 0;

                          return (
                            <tr
                              key={item.id || item.sku}
                              className={`hover:bg-emerald-50/30 transition-colors ${
                                isZero ? 'bg-rose-50/30' : ''
                              }`}
                            >
                              <td className="py-2 px-4 text-center text-slate-400 font-semibold text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-4 font-mono font-bold text-slate-900">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                                  {item.sku}
                                </span>
                              </td>
                              <td className="py-2 px-4 text-slate-700 max-w-md truncate" title={item.title}>
                                {item.title || item.productName}
                              </td>
                              <td className="py-2 px-3 text-right font-bold">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-extrabold ${
                                    isZero
                                      ? 'bg-rose-100 text-rose-700'
                                      : item.inUsed > 500
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-slate-100 text-slate-800'
                                  }`}
                                >
                                  {item.inUsed.toLocaleString()}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-700">
                                {item.sellable.toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-amber-600">
                                {item.onWay > 0 ? `+${item.onWay.toLocaleString()}` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-purple-600">
                                {item.outbound > 0 ? item.outbound.toLocaleString() : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-rose-600">
                                {item.unsellable > 0 ? item.unsellable.toLocaleString() : '-'}
                              </td>
                              <td className="py-2 px-4 text-center text-[10px] text-slate-400">
                                {item.updateTime ? item.updateTime.slice(5) : '-'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  onClick={() => handleCopySku(item.sku)}
                                  className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                                  title="Sao chép mã SKU"
                                >
                                  {isItemCopied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* 4B. TABLE VIEW (Bảng Toàn Bộ) */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Hiển thị {sortedTableItems.length} mã sản phẩm</span>
            <span className="text-[11px] text-slate-400 font-normal">
              Bấm vào tiêu đề cột để sắp xếp
            </span>
          </div>

          <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
                <tr className="text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th
                    onClick={() => handleSort('sku')}
                    className="py-3 px-4 w-44 cursor-pointer hover:bg-slate-200/80 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Mã SKU</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('group')}
                    className="py-3 px-3 w-28 cursor-pointer hover:bg-slate-200/80 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Nhóm SKU</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Tên Sản Phẩm</th>
                  <th
                    onClick={() => handleSort('inUsed')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Khả Dụng</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('sellable')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Có Thể Bán</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('onWay')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Đang Về</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('outbound')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Chờ Xuất</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Hàng Lỗi</th>
                  <th className="py-3 px-4 text-center w-28">Cập Nhật</th>
                  <th className="py-3 px-3 text-center w-14">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedTableItems.map((item, idx) => {
                  const isItemCopied = copiedSku === item.sku;
                  const isZero = item.inUsed <= 0;

                  return (
                    <tr
                      key={item.id || item.sku}
                      className={`hover:bg-emerald-50/30 transition-colors ${
                        isZero ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center text-slate-400 font-semibold text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                          {item.sku}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-800">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                          {item.group}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 max-w-md truncate" title={item.title}>
                        {item.title || item.productName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md font-extrabold ${
                            isZero
                              ? 'bg-rose-100 text-rose-700'
                              : item.inUsed > 500
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {item.inUsed.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                        {item.sellable.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-amber-600">
                        {item.onWay > 0 ? `+${item.onWay.toLocaleString()}` : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-purple-600">
                        {item.outbound > 0 ? item.outbound.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                        {item.unsellable > 0 ? item.unsellable.toLocaleString() : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center text-[10px] text-slate-400">
                        {item.updateTime ? item.updateTime.slice(5) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleCopySku(item.sku)}
                          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                          title="Sao chép mã SKU"
                        >
                          {isItemCopied ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
