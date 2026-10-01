import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  TrendingUp,
  TrendingDown,
  Warehouse,
  Boxes,
  Clock,
  Calendar,
  RefreshCw,
  Download,
  Printer,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Package,
  Layers,
  ArrowUpRight,
  Sparkles,
  Truck,
  HelpCircle,
  Eye,
  Info,
  X,
  Zap,
  CheckSquare,
  Square,
  Link2,
  ArrowRight,
  CornerDownRight,
  Activity,
  ClipboardList
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SkuGroupsMap } from '../../types';
import { HotSkuAnalysisItem, HotSkuAnalyticsResult, ShippedSyncMeta, SlottingRelocationTask, PairedSkuInfo } from '../../../sqliteDb';

interface HotSkuSlottingViewProps {
  skuGroups?: SkuGroupsMap;
  onNavigateToInventory?: (sku?: string) => void;
}

export const HotSkuSlottingView: React.FC<HotSkuSlottingViewProps> = ({
  skuGroups = {},
  onNavigateToInventory
}) => {
  // State quản lý tab con: 'map_and_table' | 'relocation_tasks' | 'paired_skus'
  const [activeSubTab, setActiveSubTab] = useState<'map_and_table' | 'relocation_tasks' | 'paired_skus'>('map_and_table');
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  // State quản lý bộ lọc
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all' | 'custom'>('30d');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedAbc, setSelectedAbc] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<'ALL' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'INBOUND'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Chế độ phân hạng ABC: Chuẩn hóa đứt hàng (mặc định) hoặc Theo sản lượng thực tế
  const [rankingMode, setRankingMode] = useState<'normalized' | 'actual'>('normalized');
  const [filterStockoutIncomingOnly, setFilterStockoutIncomingOnly] = useState<boolean>(false);

  // State dữ liệu phân tích
  const [analytics, setAnalytics] = useState<HotSkuAnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State Modal Kéo Bổ Sung
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [syncFromDate, setSyncFromDate] = useState<string>('');
  const [syncToDate, setSyncToDate] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string>('');

  // Hàm tải dữ liệu phân tích từ Backend API
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
          rankingMode
        })
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

  // Tự động tải lại khi đổi timeframe, khoảng ngày, nhóm hàng hoặc chế độ phân hạng
  useEffect(() => {
    fetchAnalytics();
  }, [timeframe, customFromDate, customToDate, selectedGroup, rankingMode]);

  // Bộ lọc danh sách SKU theo tìm kiếm, hạng ABC, Zone trên bản đồ và Cờ Đứt Hàng Có Hàng Về
  const filteredItems = useMemo(() => {
    if (!analytics?.items) return [];

    return analytics.items.filter((item) => {
      // 0. Lọc nhanh SKU đứt hàng đang chờ về
      if (filterStockoutIncomingOnly && !item.isStockoutWithIncoming) {
        return false;
      }

      // 1. Lọc theo tìm kiếm SKU / Tên
      if (searchTerm) {
        const cleanSearch = searchTerm.trim().toLowerCase();
        const matchSku = item.sku.toLowerCase().includes(cleanSearch);
        const matchTitle = (item.productTitle || '').toLowerCase().includes(cleanSearch);
        const matchGroup = item.groupName.toLowerCase().includes(cleanSearch);
        if (!matchSku && !matchTitle && !matchGroup) return false;
      }

      // 2. Lọc theo Hạng ABC
      if (selectedAbc !== 'ALL' && item.abcRank !== selectedAbc) {
        return false;
      }

      // 3. Lọc theo Zone chọn trên bản đồ 2D
      if (selectedZoneFilter === 'ZONE_A' && item.abcRank !== 'A') return false;
      if (selectedZoneFilter === 'ZONE_B' && item.abcRank !== 'B') return false;
      if (selectedZoneFilter === 'ZONE_C' && item.abcRank !== 'C') return false;
      if (selectedZoneFilter === 'INBOUND' && (!item.onWay || item.onWay <= 0)) return false;

      return true;
    });
  }, [analytics, searchTerm, selectedAbc, selectedZoneFilter, filterStockoutIncomingOnly]);

  // Thống kê nhanh các nhóm cảnh báo
  const stockoutRiskCount = useMemo(() => {
    if (!analytics?.items) return 0;
    return analytics.items.filter(it => it.stockoutWarning).length;
  }, [analytics]);

  const incomingLargeCount = useMemo(() => {
    if (!analytics?.items) return 0;
    return analytics.items.filter(it => it.incomingWarning).length;
  }, [analytics]);

  // Xử lý kích hoạt kéo bổ sung đơn từ YunWMS
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncProgressMsg('Đang kết nối tới YunWMS để kéo đơn đã xuất kho...');

    try {
      const res = await fetch('/api/wms/shipped/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse: '7',
          dateFor: syncFromDate || undefined,
          dateTo: syncToDate || undefined,
          pageSize: 500,
          maxPages: 0 // Kéo hết các trang trong khoảng ngày
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Lỗi khi đồng bộ đơn từ YunWMS');
      }

      setSyncProgressMsg(`Hoàn tất! ${data.message}`);
      setTimeout(() => {
        setIsSyncModalOpen(false);
        setIsSyncing(false);
        setSyncProgressMsg('');
        fetchAnalytics(false);
      }, 1500);
    } catch (err: any) {
      alert(`Đồng bộ thất bại: ${err.message}`);
      setIsSyncing(false);
      setSyncProgressMsg('');
    }
  };

  // Xử lý toggle hoàn thành nhiệm vụ chuyển kệ
  const handleToggleTask = (taskId: string) => {
    setCompletedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  // Xuất file Excel danh sách nhiệm vụ chuyển kệ cho thủ kho
  const handleExportTasksExcel = () => {
    if (!analytics?.relocationTasks || analytics.relocationTasks.length === 0) {
      alert('Không có nhiệm vụ chuyển kệ nào trong khoảng thời gian này');
      return;
    }

    const rows = analytics.relocationTasks.map((t, idx) => ({
      'STT': idx + 1,
      'Mã SKU': t.sku,
      'Tên Sản Phẩm': t.productTitle || '',
      'Hành Động Đề Xuất': t.title,
      'Mức Độ Khẩn Cấp': t.urgency === 'high' ? 'KHẨN CẤP' : t.urgency === 'medium' ? 'TRUNG BÌNH' : 'THẤP',
      'Vị Trí Hiện Tại': t.currentZone,
      'Vị Trí Mục Tiêu': t.targetZone,
      'Lý Do Nghiệp Vụ': t.reason,
      'Sản Lượng Bán / Tiềm Năng (PCS)': t.potentialVolume,
      'Hàng Đang Về (On-way)': t.onWay ?? 0,
      'Trạng Thái Thực Hiện': completedTaskIds.has(t.id) ? 'ĐÃ HOÀN THÀNH' : 'CHƯA LÀM'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Nhiem_Vu_Doi_Ke');

    const fileName = `Checklist_Nhiem_Vu_Doi_Ke_VN02_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Xuất file Excel phân tích đầy đủ
  const handleExportExcel = () => {
    if (!analytics?.items || analytics.items.length === 0) {
      alert('Không có dữ liệu để xuất Excel');
      return;
    }

    const rows = filteredItems.map((item, idx) => ({
      'STT': idx + 1,
      'Phân Hạng ABC (Đang áp dụng)': item.abcRank,
      'Điểm Slotting Priority (0-100)': item.slottingScore ?? 50,
      'Xu Hướng Bán (7d vs 30d)': item.trendCategory === 'viral' ? `🚀 BÙNG NỔ (${item.trendRatio}x)` : item.trendCategory === 'up' ? `📈 Đang tăng (${item.trendRatio}x)` : item.trendCategory === 'down' ? `📉 Thoái trào (${item.trendRatio}x)` : '⚖️ Ổn định',
      'Sản Lượng 7 Ngày Qua (PCS)': item.qty7d ?? 0,
      'Hạng Chuẩn Hóa (Tiềm Năng)': item.abcRankNormalized || item.abcRank,
      'Hạng Thực Tế (Đã Xuất)': item.abcRankActual || item.abcRank,
      'Mã SKU': item.sku,
      'Tên Sản Phẩm': item.productTitle || '',
      'Nhóm Hàng': item.groupName,
      'Sản Lượng Đã Bán (PCS)': item.totalSold,
      'Số Lần Ghé Kệ Nhặt (Pick Hits)': item.orderCount,
      'Số Ngày Đứt Hàng Cạn Tồn': item.stockoutDays ?? 0,
      'Số Ngày Mở Bán Thực Tế': item.effectiveSellingDays ?? analytics.daysInPeriod,
      'Vận Tốc Bán Thực Tế (PCS/Ngày)': item.adjustedVelocity ?? item.velocityDaily,
      'Sản Lượng Tiềm Năng (PCS)': item.potentialVolume ?? item.totalSold,
      'Tồn Kho Khả Dụng (WMS)': item.sellable ?? 0,
      'Hàng Đang Về (On-way)': item.onWay ?? 0,
      'Độ Phủ Hàng Về (Dự Kiến Bán Hết)': item.daysOfSupplyIncoming !== null && item.daysOfSupplyIncoming !== undefined ? `${item.daysOfSupplyIncoming} ngày` : 'N/A',
      'Đang Chuẩn Bị (In-Used)': item.inUsed ?? 0,
      'Dự Báo Số Ngày Hết Tồn': item.daysOfInventory !== null ? item.daysOfInventory : 'Không tính được',
      'Cặp Sản Phẩm Hay Mua Kèm': item.topPairedSkus?.map(p => `${p.sku} (${p.pairCount} lần)`).join('; ') || 'Không có',
      'Trạng Thái Hàng Hóa': item.isStockoutWithIncoming
        ? '⭐ HẾT HÀNG - CÓ HÀNG VỀ (ĐẶT CHỖ ZONE A)'
        : item.stockoutWarning
        ? 'NGUY CƠ CHÁY HÀNG'
        : 'Bình thường',
      'Đề Xuất Vị Trí Kho': item.recommendedZone,
      'Chi Tiết Sắp Xếp / Đặt Chỗ': item.recommendedSlotting
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Phân Tích Bán Chạy & Kệ Kho');

    const fileName = `Phan_Tich_Slotting_VN02_${rankingMode}_${timeframe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Bộ lọc mức độ khẩn cấp của task đổi kệ
  const [taskUrgencyFilter, setTaskUrgencyFilter] = useState<'ALL' | 'high' | 'medium' | 'low'>('ALL');

  // Tổng hợp danh sách các cặp SKU mua kèm trong đơn ghép (Mix SKU orders)
  const uniquePairs = useMemo(() => {
    if (!analytics?.items) return [];
    const map = new Map<string, { skuA: string; titleA?: string; skuB: string; count: number }>();
    for (const item of analytics.items) {
      if (item.topPairedSkus && item.topPairedSkus.length > 0) {
        for (const p of item.topPairedSkus) {
          const key = [item.sku, p.sku].sort().join('___');
          if (!map.has(key)) {
            map.set(key, {
              skuA: item.sku,
              titleA: item.productTitle,
              skuB: p.sku,
              count: p.pairCount
            });
          }
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [analytics]);

  // Lọc danh sách nhiệm vụ chuyển kệ theo độ khẩn cấp
  const filteredTasks = useMemo(() => {
    if (!analytics?.relocationTasks) return [];
    if (taskUrgencyFilter === 'ALL') return analytics.relocationTasks;
    return analytics.relocationTasks.filter(t => t.urgency === taskUrgencyFilter);
  }, [analytics, taskUrgencyFilter]);

  // In hướng dẫn sắp xếp kho
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HEADER & META STATUS BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/20 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/20">
                <Flame className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-amber-200 to-amber-400 bg-clip-text text-transparent">
                  Phân Tích Sản Phẩm Bán Chạy & Sắp Xếp Vị Trí Kho
                </h1>
                <p className="text-sm text-slate-400">
                  Dữ liệu xuất kho (Shipped - Mã 8, Kho VN02) • Chuẩn Hóa Ngày Đứt Hàng • Đặt Chỗ Zone A Đón Hàng Về
                </p>
              </div>
            </div>

            {/* Sync Meta Info Badge */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Cập nhật lần cuối: <b className="text-amber-300 font-semibold">{analytics?.meta?.lastSyncedAt || 'Đang đồng bộ...'}</b>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                Tổng đơn trong SQL: <b className="text-emerald-300 font-semibold">{analytics?.meta?.totalOrders?.toLocaleString() || 0} đơn</b>
              </span>
              {analytics?.meta?.status === 'running' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang cào dữ liệu ngầm...
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <RefreshCw className="w-4 h-4" />
              Kéo Bổ Sung Từ YunWMS
            </button>

            <button
              onClick={() => fetchAnalytics()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              title="Tải lại phân tích"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
              Làm mới
            </button>

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-sm bg-emerald-600/90 hover:bg-emerald-600 text-white shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Xuất Excel
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              In Bố Trí
            </button>
          </div>
        </div>

        {/* 2. TIMEFRAME & RANKING MODE SELECTOR BAR */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mr-1">Khung Thời Gian:</span>
            {[
              { id: '7d', label: '7 Ngày Gần Nhất' },
              { id: '30d', label: '30 Ngày (Khuyên dùng)' },
              { id: '90d', label: '90 Ngày' },
              { id: 'all', label: 'Toàn Bộ Lịch Sử' },
              { id: 'custom', label: 'Tùy Chọn Ngày' }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setTimeframe(btn.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  timeframe === btn.id
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Toggle Chế Độ Phân Hạng: Chuẩn Hóa Đứt Hàng vs Sản Lượng Thực Tế */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mr-1">Góc Nhìn ABC:</span>
            <div className="flex items-center p-1 rounded-xl bg-slate-800/90 border border-slate-700 text-xs">
              <button
                onClick={() => setRankingMode('normalized')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  rankingMode === 'normalized'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Loại bỏ chuỗi ngày cạn tồn, giữ hạng A và đặt chỗ Zone A đón hàng về"
              >
                <Zap className="w-3.5 h-3.5 text-slate-950" />
                ⚡ Chuẩn Hóa Đứt Hàng (Đón Hàng Về)
              </button>
              <button
                onClick={() => setRankingMode('actual')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  rankingMode === 'actual'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Xếp hạng thuần túy theo số lượng thực tế đã xuất kho"
              >
                <Boxes className="w-3.5 h-3.5" />
                📦 Theo Sản Lượng Thực Tế
              </button>
            </div>
          </div>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700 text-xs">
              <Calendar className="w-4 h-4 text-amber-400 ml-1.5" />
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
              <span className="text-slate-400">đến</span>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* SUB-TABS NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('map_and_table')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'map_and_table'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            <span>Sơ Đồ Kệ Kho & Bảng Phân Tích ABC</span>
          </button>

          <button
            onClick={() => setActiveSubTab('relocation_tasks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === 'relocation_tasks'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Checklist Nhiệm Vụ Chuyển Kệ</span>
            {(analytics?.relocationTasks?.length || 0) > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeSubTab === 'relocation_tasks' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
              }`}>
                {analytics?.relocationTasks?.length} việc
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('paired_skus')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'paired_skus'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Ma Trận Cặp Mua Kèm (Đơn Mix)</span>
            {uniquePairs.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeSubTab === 'paired_skus' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {uniquePairs.length} cặp
              </span>
            )}
          </button>
        </div>

        {/* Quick Summary Badge on Subtabs Bar */}
        <div className="hidden lg:flex items-center gap-3 text-xs pr-2">
          {(analytics?.viralCount || 0) > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
              <Zap className="w-3.5 h-3.5 text-purple-600" />
              <b>{analytics?.viralCount}</b> mã bùng nổ 7 ngày qua
            </span>
          )}
          {(analytics?.stockoutIncomingCount || 0) > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <b>{analytics?.stockoutIncomingCount}</b> mã cạn tồn có hàng về
            </span>
          )}
        </div>
      </div>

      {/* VIEW 1: SƠ ĐỒ KỆ & BẢNG PHÂN HẠNG ABC */}
      {activeSubTab === 'map_and_table' && (
        <>
      {/* 3. KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Tổng Sản Lượng Bán */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sản Lượng Xuất Bán</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {analytics?.totalSoldVolume?.toLocaleString() || 0}
            </span>
            <span className="text-xs font-semibold text-slate-500">PCS</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Từ {analytics?.totalOrders?.toLocaleString() || 0} đơn hàng Shipped
          </p>
        </div>

        {/* Card 2: Hạng A (Fast-Moving / Siêu Chạy) */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-2xl p-5 border border-amber-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Hạng A (Siêu Chạy)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-sm">
              A
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950">
              {analytics?.classACount || 0}
            </span>
            <span className="text-xs font-semibold text-amber-700">mã SKU</span>
          </div>
          <p className="mt-1 text-xs text-amber-800/80">
            Chiếm <b>{analytics?.totalSoldVolume ? ((analytics.classAVolume / analytics.totalSoldVolume) * 100).toFixed(0) : 0}%</b> tổng sản lượng
          </p>
        </div>

        {/* Card 3: Hạng B & C */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hạng B & Hạng C</span>
            <div className="flex gap-1">
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-xs">B</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-xs">C</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {(analytics?.classBCount || 0) + (analytics?.classCCount || 0)}
            </span>
            <span className="text-xs font-semibold text-slate-500">mã SKU</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            B: {analytics?.classBCount || 0} mã • C: {analytics?.classCCount || 0} mã
          </p>
        </div>

        {/* Card 4: Cảnh Báo Nguy Cơ Cháy Hàng */}
        <div className="bg-gradient-to-br from-rose-50 to-red-50/50 rounded-2xl p-5 border border-rose-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">Nguy Cơ Cháy Hàng</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-950">
              {stockoutRiskCount}
            </span>
            <span className="text-xs font-semibold text-rose-700">mã SKU</span>
          </div>
          <p className="mt-1 text-xs text-rose-800/80">
            Tồn kho còn &lt; 7 ngày bán
          </p>
        </div>

        {/* Card 5: SKU Đứt Hàng Đang Chờ Về (Đặt Chỗ Zone A) */}
        <div
          onClick={() => setFilterStockoutIncomingOnly(!filterStockoutIncomingOnly)}
          className={`cursor-pointer rounded-2xl p-5 border transition-all ${
            filterStockoutIncomingOnly
              ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50 shadow-md'
              : 'bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200/80 shadow-sm hover:shadow-md'
          }`}
          title="Bấm để lọc nhanh các SKU đứt hàng đang chờ về"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-900">
              Đứt Hàng Chờ Về
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950">
              {analytics?.stockoutIncomingCount || 0}
            </span>
            <span className="text-xs font-semibold text-amber-800">mã SKU</span>
          </div>
          <p className="mt-1 text-xs text-amber-800/80">
            Tổng về: <b>{(analytics?.stockoutIncomingVolume || 0).toLocaleString()}</b> pcs • Đặt chỗ Zone A
          </p>
        </div>
      </div>

      {/* 4. SƠ ĐỒ 2D BỐ TRÍ KỆ KHO TRỰC QUAN (WAREHOUSE LAYOUT MAP 2D) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Warehouse className="w-5 h-5 text-indigo-600" />
              Sơ Đồ Bố Trí Kệ Kho Trực Quan 2D (Warehouse Slotting Map - VN02)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bấm vào từng khu vực kệ để lọc danh sách SKU tương ứng. Hàng bán chạy nhất được xếp gần bàn đóng gói để tối ưu thời gian nhặt hàng.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Lọc theo Khu Vực Kệ:</span>
            <button
              onClick={() => setSelectedZoneFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedZoneFilter === 'ALL'
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Tất Cả
            </button>
          </div>
        </div>

        {/* Bản Đồ 2D Grid Layout */}
        <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-white shadow-inner relative overflow-hidden">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
            {/* Cột 1: CỬA XUẤT NHẬP & BÀN ĐÓNG GÓI */}
            <div className="md:col-span-3 flex flex-col gap-4">
              {/* Dock Cửa Xuất Hàng */}
              <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 text-center space-y-1">
                <div className="inline-flex p-2 rounded-lg bg-blue-500/20 text-blue-400 mb-1">
                  <Truck className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Cửa Xuất Nhập (Dock)</h4>
                <p className="text-[11px] text-slate-400">Tiếp nhận xe bưu tá & Xe hàng</p>
              </div>

              {/* Bàn Đóng Gói / Kiểm Hàng */}
              <div className="p-4 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-center space-y-1 flex-1 flex flex-col justify-center">
                <div className="inline-flex p-2 rounded-lg bg-indigo-500/20 text-indigo-300 mb-1 self-center">
                  <Boxes className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">Bàn Đóng Gói (Packing)</h4>
                <p className="text-[11px] text-indigo-300/80">Khu vực dán mã & đóng hộp</p>
                <div className="mt-2 text-[10px] text-amber-300 font-semibold bg-amber-500/10 py-1 px-2 rounded border border-amber-500/20">
                  ⚡ Cần lấy hàng nhanh nhất tại đây
                </div>
              </div>
            </div>

            {/* Cột 2: ZONE A - VÙNG VÀNG MẶT TIỀN (GOLDEN ZONE) */}
            <div
              onClick={() => setSelectedZoneFilter(selectedZoneFilter === 'ZONE_A' ? 'ALL' : 'ZONE_A')}
              className={`md:col-span-3 p-5 rounded-xl border cursor-pointer transition-all ${
                selectedZoneFilter === 'ZONE_A'
                  ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/50 shadow-xl'
                  : 'bg-amber-950/40 border-amber-500/40 hover:bg-amber-950/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider shadow-sm">
                  Zone A - Vùng Vàng
                </span>
                <span className="text-xs font-bold text-amber-300">
                  {analytics?.classACount || 0} SKUs
                </span>
              </div>
              <h3 className="font-bold text-sm text-amber-200">Kệ Mặt Tiền (Tầng 1-2)</h3>
              <p className="text-[11px] text-amber-300/70 mt-1 leading-relaxed">
                Dành cho hàng Siêu Chạy (Top 80% doanh số). Ngang tầm tay với, cách bàn đóng gói &lt; 5m.
              </p>

              {/* Incoming Reservation Banner for Zone A */}
              {(analytics?.stockoutIncomingCount || 0) > 0 && (
                <div className="mt-3 p-2.5 rounded-lg bg-orange-500/20 border border-orange-500/50 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      ⭐ Đặt Chỗ Đón Hàng Về ({analytics?.stockoutIncomingCount} mã)
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-200/80 mt-0.5">
                    Đang đứt hàng, chuẩn bị sẵn ô kệ mặt tiền để khi xe bốc hàng về xếp ngay!
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {analytics?.items.filter(it => it.isStockoutWithIncoming && it.abcRank === 'A').slice(0, 4).map(it => (
                      <span key={it.sku} className="px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-400/80 text-amber-300 font-mono text-[9px] font-bold">
                        {it.sku} (+{it.onWay})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Top SKUs in Zone A */}
              <div className="mt-3.5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Top Mã Ưu Tiên:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {analytics?.items.filter(it => it.abcRank === 'A').slice(0, 6).map(it => (
                    <span key={it.sku} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[10px] font-mono font-bold">
                      {it.sku} ({it.totalSold})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Cột 3: ZONE B - KỆ TRUNG TÂM (MIDDLE ZONE) */}
            <div
              onClick={() => setSelectedZoneFilter(selectedZoneFilter === 'ZONE_B' ? 'ALL' : 'ZONE_B')}
              className={`md:col-span-3 p-5 rounded-xl border cursor-pointer transition-all ${
                selectedZoneFilter === 'ZONE_B'
                  ? 'bg-blue-950/80 border-blue-400 ring-2 ring-blue-400/50 shadow-xl'
                  : 'bg-blue-950/40 border-blue-500/30 hover:bg-blue-950/60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500 text-white uppercase tracking-wider">
                  Zone B - Trung Tâm
                </span>
                <span className="text-xs font-bold text-blue-300">
                  {analytics?.classBCount || 0} SKUs
                </span>
              </div>
              <h3 className="font-bold text-sm text-blue-200">Kệ Giữa Kho (Tầng 2-3)</h3>
              <p className="text-[11px] text-blue-300/70 mt-1 leading-relaxed">
                Dành cho hàng Chạy Vừa (15% doanh số). Lối đi chuẩn, lấy hàng xe đẩy 2 chiều.
              </p>

              <div className="mt-3.5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Mã Tiêu Biểu:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {analytics?.items.filter(it => it.abcRank === 'B').slice(0, 6).map(it => (
                    <span key={it.sku} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30 text-[10px] font-mono">
                      {it.sku}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Cột 4: ZONE C - TẦNG CAO & PHÍA SAU (STORAGE ZONE) */}
            <div
              onClick={() => setSelectedZoneFilter(selectedZoneFilter === 'ZONE_C' ? 'ALL' : 'ZONE_C')}
              className={`md:col-span-3 p-5 rounded-xl border cursor-pointer transition-all ${
                selectedZoneFilter === 'ZONE_C'
                  ? 'bg-slate-800 border-slate-400 ring-2 ring-slate-400/50 shadow-xl'
                  : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-600 text-slate-100 uppercase tracking-wider">
                  Zone C - Tầng Cao / Sâu
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {analytics?.classCCount || 0} SKUs
                </span>
              </div>
              <h3 className="font-bold text-sm text-slate-300">Kệ Tầng 4-5 Hoặc Cuối Kho</h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Dành cho hàng Bán Chậm hoặc Tồn kho dự trữ (5% doanh số). Tránh choán chỗ vùng mặt tiền.
              </p>

              <div className="mt-3.5 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hàng Chậm / Dự Trữ:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {analytics?.items.filter(it => it.abcRank === 'C').slice(0, 6).map(it => (
                    <span key={it.sku} className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600 text-[10px] font-mono">
                      {it.sku}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. FULL ANALYTICS DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Bảng Chi Tiết Phân Hạng SKU & Tồn Kho ({filteredItems.length} mã)
            </h3>
            {selectedZoneFilter !== 'ALL' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 flex items-center gap-1.5">
                Đang lọc: {selectedZoneFilter}
                <button onClick={() => setSelectedZoneFilter('ALL')} className="hover:text-indigo-950">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã SKU, tên SP..."
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Filter by ABC */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 text-xs">
              <span className="text-[11px] text-slate-400 px-2 font-medium">Hạng:</span>
              {(['ALL', 'A', 'B', 'C'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedAbc(r)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    selectedAbc === r
                      ? r === 'A'
                        ? 'bg-amber-500 text-slate-950'
                        : r === 'B'
                        ? 'bg-blue-600 text-white'
                        : r === 'C'
                        ? 'bg-slate-700 text-white'
                        : 'bg-indigo-600 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {r === 'ALL' ? 'Tất Cả' : `Hạng ${r}`}
                </button>
              ))}
            </div>

            {/* Quick Filter: Đứt Hàng Có Hàng Về */}
            <button
              onClick={() => setFilterStockoutIncomingOnly(!filterStockoutIncomingOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                filterStockoutIncomingOnly
                  ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
              title="Lọc các mã đang cạn tồn nhưng có lượng hàng onWay đang về"
            >
              <Sparkles className={`w-3.5 h-3.5 ${filterStockoutIncomingOnly ? 'text-slate-950' : 'text-amber-500'}`} />
              Đứt hàng chờ về ({analytics?.stockoutIncomingCount || 0})
            </button>

            {/* Filter by Group */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="ALL">Tất Cả Nhóm Hàng</option>
              {Object.keys(skuGroups).map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm font-medium">Đang truy vấn phân tích SQL và đối chiếu tồn kho WMS...</p>
          </div>
        ) : errorMessage ? (
          <div className="py-16 text-center text-rose-600 space-y-2">
            <AlertTriangle className="w-8 h-8 mx-auto" />
            <p className="font-semibold">{errorMessage}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Package className="w-8 h-8 mx-auto text-slate-400" />
            <p className="font-semibold">Không tìm thấy mã SKU nào phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-3 text-center w-20">Hạng ABC</th>
                  <th className="py-3 px-3 text-center w-28" title="Điểm ưu tiên vị trí kho: 70% Số lần ghé nhặt (Pick Hits) + 30% Sản lượng">
                    Điểm Slotting
                  </th>
                  <th className="py-3 px-3 text-center w-28" title="So sánh vận tốc 7 ngày qua vs trung bình cả kỳ">
                    Xu Hướng (7d)
                  </th>
                  <th className="py-3 px-3">Mã SKU & Tên Sản Phẩm</th>
                  <th className="py-3 px-3">Nhóm Hàng</th>
                  <th className="py-3 px-3 text-right">
                    {rankingMode === 'normalized' ? 'Sản Lượng (Thực / Tiềm Năng)' : 'Sản Lượng Bán'}
                  </th>
                  <th className="py-3 px-3 text-right">Vận Tốc Thực Bán</th>
                  <th className="py-3 px-3 text-right">Tồn Khả Dụng</th>
                  <th className="py-3 px-3 text-right">Hàng Đang Về</th>
                  <th className="py-3 px-3 text-center">Dự Báo Hết Tồn</th>
                  <th className="py-3 px-3">Đề Xuất Vị Trí Kệ Kho</th>
                  <th className="py-3 px-3 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => (
                  <tr
                    key={item.sku}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      item.isStockoutWithIncoming
                        ? 'bg-amber-100/30'
                        : item.abcRank === 'A'
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    {/* STT */}
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>

                    {/* Hạng ABC */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full font-black text-xs shadow-sm ${
                          item.abcRank === 'A'
                            ? 'bg-amber-500 text-slate-950'
                            : item.abcRank === 'B'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-600 text-white'
                        }`}
                      >
                        {item.abcRank}
                      </span>
                    </td>

                    {/* Điểm Slotting Priority */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-black font-mono shadow-sm ${
                          (item.slottingScore ?? 50) >= 80
                            ? 'bg-amber-500 text-slate-950'
                            : (item.slottingScore ?? 50) >= 50
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.slottingScore ?? 50}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (item.slottingScore ?? 50) >= 80
                                ? 'bg-amber-500'
                                : (item.slottingScore ?? 50) >= 50
                                ? 'bg-blue-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, item.slottingScore ?? 50))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Xu Hướng Bán 7d */}
                    <td className="py-3 px-3 text-center">
                      {item.trendCategory === 'viral' ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black">
                            <Zap className="w-3 h-3 text-purple-700 animate-pulse" />
                            🚀 BÙNG NỔ ({item.trendRatio}x)
                          </span>
                          <span className="text-[9px] text-purple-700 font-semibold">
                            7d: {item.qty7d ?? 0} pcs
                          </span>
                        </div>
                      ) : item.trendCategory === 'up' ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            📈 Tăng ({item.trendRatio}x)
                          </span>
                          <span className="text-[9px] text-emerald-700">
                            7d: {item.qty7d ?? 0} pcs
                          </span>
                        </div>
                      ) : item.trendCategory === 'down' ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium">
                            <TrendingDown className="w-3 h-3 text-rose-500" />
                            📉 Thoái trào ({item.trendRatio}x)
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                          ⚖️ Ổn định
                        </span>
                      )}
                    </td>

                    {/* Mã SKU & Tên */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        <span>{item.sku}</span>
                        {item.isStockoutWithIncoming && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-sans font-bold border border-orange-300">
                            ⭐ Đặt chỗ Zone A
                          </span>
                        )}
                        {!item.isStockoutWithIncoming && item.stockoutWarning && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px] font-sans font-semibold">
                            🚨 Sắp cháy
                          </span>
                        )}
                        {item.incomingWarning && !item.isStockoutWithIncoming && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 text-[10px] font-sans font-semibold">
                            📦 Hàng về ({item.onWay})
                          </span>
                        )}
                      </div>
                      {item.productTitle && (
                        <p className="text-[11px] text-slate-500 truncate max-w-xs" title={item.productTitle}>
                          {item.productTitle}
                        </p>
                      )}
                      {/* Cặp sản phẩm hay mua kèm trong đơn ghép */}
                      {item.topPairedSkus && item.topPairedSkus.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
                            <Link2 className="w-3 h-3 text-indigo-500" /> Hay kèm:
                          </span>
                          {item.topPairedSkus.slice(0, 3).map(p => (
                            <span
                              key={p.sku}
                              className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono text-[10px] font-bold"
                              title={`Xuất hiện cùng nhau trong ${p.pairCount} đơn hàng ghép`}
                            >
                              {p.sku} <span className="text-indigo-500 font-sans font-normal">({p.pairCount})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Nhóm Hàng */}
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                        {item.groupName}
                      </span>
                    </td>

                    {/* Sản Lượng Bán (Thực tế & Tiềm năng chuẩn hóa) */}
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-slate-900 text-sm">
                        {item.totalSold.toLocaleString()}
                      </span>
                      {rankingMode === 'normalized' && (item.potentialVolume || 0) > item.totalSold && (
                        <p className="text-[10px] text-indigo-600 font-semibold" title="Doanh số tiềm năng nếu không bị đứt hàng">
                          Tiềm năng: ~{(item.potentialVolume || 0).toLocaleString()}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400">
                        {item.orderCount} đơn ({item.singleSkuOrders} đơn lẻ)
                      </p>
                    </td>

                    {/* Tốc Độ Bán PCS/Ngày (Đã chuẩn hóa đứt hàng) */}
                    <td className="py-3 px-3 text-right">
                      <span className="font-bold text-indigo-600 text-sm">
                        {item.adjustedVelocity ?? item.velocityDaily}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">pcs/ngày</span>
                      {(item.stockoutDays || 0) > 0 ? (
                        <div className="mt-0.5">
                          <span className="inline-block px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-semibold">
                            ⚠️ Đứt hàng {item.stockoutDays} ngày
                          </span>
                          <p className="text-[9px] text-slate-400">
                            (Có hàng: {item.effectiveSellingDays} ngày)
                          </p>
                        </div>
                      ) : (
                        <p className="text-[9px] text-slate-400">Đầy đủ tồn kỳ này</p>
                      )}
                    </td>

                    {/* Tồn Khả Dụng */}
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${
                        (item.sellable ?? 0) <= 0
                          ? 'text-rose-600 font-black'
                          : (item.sellable ?? 0) < 50
                          ? 'text-amber-600'
                          : 'text-slate-800'
                      }`}>
                        {(item.sellable ?? 0).toLocaleString()}
                      </span>
                      {(item.inUsed ?? 0) > 0 && (
                        <p className="text-[10px] text-slate-400">Đang chuẩn bị: {item.inUsed}</p>
                      )}
                    </td>

                    {/* Hàng Đang Về & Độ phủ dự kiến */}
                    <td className="py-3 px-3 text-right">
                      {(item.onWay ?? 0) > 0 ? (
                        <div>
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            +{(item.onWay ?? 0).toLocaleString()}
                          </span>
                          {item.daysOfSupplyIncoming !== null && item.daysOfSupplyIncoming !== undefined && (
                            <p className="text-[10px] text-emerald-700 font-medium mt-0.5" title="Dự kiến bán hết lượng hàng đang về này">
                              Đủ bán: ~{item.daysOfSupplyIncoming} ngày
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Dự Báo Ngày Hết Tồn Hiện Tại */}
                    <td className="py-3 px-3 text-center">
                      {(item.sellable ?? 0) <= 0 ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          HẾT HÀNG
                        </span>
                      ) : item.daysOfInventory !== null ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            item.daysOfInventory < 3
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : item.daysOfInventory < 7
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          ~{item.daysOfInventory} ngày
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">N/A</span>
                      )}
                    </td>

                    {/* Đề Xuất Vị Trí Kho & Đặt Chỗ */}
                    <td className="py-3 px-3">
                      {item.isStockoutWithIncoming ? (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] shadow-sm">
                            <Sparkles className="w-3 h-3 text-slate-950" />
                            ZONE A (ĐẶT CHỖ TRƯỚC)
                          </span>
                          <p className="text-[10px] text-amber-900 font-medium mt-0.5">
                            {item.recommendedSlotting}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-slate-800 text-[11px]">
                            {item.recommendedZone}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {item.recommendedSlotting}
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Hành Động */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onNavigateToInventory?.(item.sku)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Xem chi tiết tại Tab Tồn Kho"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* VIEW 2: CHECKLIST NHIỆM VỤ CHUYỂN KỆ (RELOCATION TASKS) */}
      {activeSubTab === 'relocation_tasks' && (
        <div className="space-y-6">
          {/* Header Bar của Nhiệm Vụ Đổi Kệ */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
                Phiếu Giao Việc Chuyển Đổi Vị Trí Kệ Kho (Slotting Relocation Tasks)
              </h2>
              <p className="text-xs text-slate-500">
                Tự động tạo nhiệm vụ từ dữ liệu bán hàng: Đôn hàng bùng nổ lên Zone A, rút hàng thoái trào về Zone B/C, đặt chỗ ô kệ cho hàng cạn tồn đang về.
              </p>
              <div className="flex items-center gap-3 pt-2 text-xs font-semibold">
                <span className="text-slate-600">
                  Tiến độ: <b className="text-indigo-600">{completedTaskIds.size}</b> / {analytics?.relocationTasks?.length || 0} nhiệm vụ đã xong
                </span>
                <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{
                      width: `${(analytics?.relocationTasks?.length || 0) > 0 ? (completedTaskIds.size / (analytics?.relocationTasks?.length || 1)) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Lọc theo mức độ khẩn cấp */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <span className="text-slate-400 px-2">Lọc:</span>
                {[
                  { id: 'ALL', label: 'Tất Cả' },
                  { id: 'high', label: 'Khẩn Cấp' },
                  { id: 'medium', label: 'Trung Bình' },
                  { id: 'low', label: 'Tiêu Chuẩn' }
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setTaskUrgencyFilter(f.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      taskUrgencyFilter === f.id
                        ? f.id === 'high'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : f.id === 'medium'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleExportTasksExcel}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Xuất Excel Phiếu Đổi Kệ
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                In Phiếu Giao Việc
              </button>
            </div>
          </div>

          {/* Danh Sách Nhiệm Vụ */}
          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-base">Hiện không có nhiệm vụ chuyển kệ nào cần xử lý</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tất cả các vị trí SKU trong kho VN02 hiện tại đã khớp với vận tốc bán hàng thực tế và kế hoạch hàng về.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task) => {
                const isDone = completedTaskIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isDone
                        ? 'bg-slate-50/80 border-slate-200 opacity-60'
                        : task.urgency === 'high'
                        ? 'bg-white border-rose-300 hover:border-rose-400 shadow-sm hover:shadow-md'
                        : task.urgency === 'medium'
                        ? 'bg-white border-amber-300 hover:border-amber-400 shadow-sm hover:shadow-md'
                        : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTask(task.id);
                          }}
                          className={`mt-0.5 p-1 rounded-lg transition-colors ${
                            isDone ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                          }`}
                        >
                          {isDone ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              task.urgency === 'high'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : task.urgency === 'medium'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {task.urgency === 'high' ? 'Khẩn Cấp' : task.urgency === 'medium' ? 'Ưu Tiên' : 'Tiêu Chuẩn'}
                            </span>
                            <span className="font-mono font-bold text-sm text-slate-900">
                              {task.sku}
                            </span>
                            {isDone && (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Đã Hoàn Thành
                              </span>
                            )}
                          </div>
                          {task.productTitle && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-1" title={task.productTitle}>
                              {task.productTitle}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Direction Badges */}
                      <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200/80 text-xs font-mono font-bold">
                        <span className="text-slate-500">{task.currentZone}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-indigo-700">{task.targetZone}</span>
                      </div>
                    </div>

                    {/* Action & Reason */}
                    <div className="mt-3.5 pl-8 space-y-2">
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                        {task.title}
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                        {task.reason}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                        <span>Sản lượng / Tiềm năng: <b className="text-slate-800 font-mono font-bold">{task.potentialVolume.toLocaleString()} pcs</b></span>
                        {(task.onWay ?? 0) > 0 && (
                          <span className="text-emerald-700 font-medium">Hàng về: <b className="font-mono font-bold">+{task.onWay} pcs</b></span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: MA TRẬN CẶP HÀNG MUA KÈM (BASKET AFFINITY) */}
      {activeSubTab === 'paired_skus' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-emerald-600" />
              Ma Trận Cặp Sản Phẩm Mua Kèm Trong Đơn Ghép (Basket Affinity & Cross-Docking)
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Phát hiện các cặp sản phẩm thường xuyên xuất hiện chung trong cùng một đơn hàng Mix SKU. 
              Sắp xếp 2 mã này tại <b>2 ngăn liền kề hoặc cùng một kệ</b> giúp nhân viên nhặt hàng lấy cả 2 món chỉ với 1 bước chân dừng lại, 
              triệt tiêu tới 50% quãng đường di chuyển trong kho!
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {uniquePairs.length === 0 ? (
              <div className="p-16 text-center text-slate-500 space-y-2">
                <Boxes className="w-8 h-8 mx-auto text-slate-400" />
                <p className="font-semibold text-sm">Chưa phát hiện cặp sản phẩm nào có tần suất mua kèm đáng kể trong kỳ phân tích này.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 font-semibold text-slate-700">
                    <tr>
                      <th className="py-3 px-3 text-center w-12">STT</th>
                      <th className="py-3 px-3">Sản Phẩm 1 (SKU A)</th>
                      <th className="py-3 px-3 text-center w-16">Liên Kết</th>
                      <th className="py-3 px-3">Sản Phẩm Mua Kèm (SKU B)</th>
                      <th className="py-3 px-3 text-center w-36">Số Đơn Ghép Mua Chung</th>
                      <th className="py-3 px-3">Khuyến Nghị Sắp Xếp Kệ Kho</th>
                      <th className="py-3 px-3 text-center w-24">Tồn Kho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {uniquePairs.map((pair, idx) => (
                      <tr key={`${pair.skuA}___${pair.skuB}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {pair.skuA}
                          </span>
                          {pair.titleA && (
                            <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">{pair.titleA}</p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                            <Link2 className="w-4 h-4" />
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {pair.skuB}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-1 rounded-full font-black text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                            {pair.count.toLocaleString()} đơn
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <p className="text-xs font-semibold text-slate-800">
                            ⚡ Bố trí cùng ô kệ hoặc 2 ngăn cạnh nhau
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Cặp đôi này thường xuyên xuất hiện cùng nhau trong đơn Mix. Gom cùng dãy giúp nhặt hàng 1 lần.
                          </p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onNavigateToInventory?.(pair.skuA)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                          >
                            Xem tồn
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL KÉO BỔ SUNG ĐƠN TỪ YUNWMS */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-amber-500" />
                Kéo Bổ Sung Đơn Xuất Kho YunWMS
              </h3>
              <button
                onClick={() => !isSyncing && setIsSyncModalOpen(false)}
                disabled={isSyncing}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Kéo đơn trạng thái <b>Shipped (Mã 8)</b> từ kho <b>VN02</b>. Hệ thống tự động kiểm tra trong SQL database: <b>đơn hàng hoặc ngày đã có sẵn sẽ được bỏ qua</b>, không lo bị trùng lặp.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Từ Ngày:</label>
                <input
                  type="date"
                  value={syncFromDate}
                  onChange={(e) => setSyncFromDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Đến Ngày (Để trống = Cùng ngày):</label>
                <input
                  type="date"
                  value={syncToDate}
                  onChange={(e) => setSyncToDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {syncProgressMsg && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600 flex-shrink-0" />
                <span>{syncProgressMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang Kéo...
                  </>
                ) : (
                  'Bắt Đầu Kéo Dữ Liệu'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
