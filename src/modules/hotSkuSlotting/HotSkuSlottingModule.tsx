import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Warehouse,
  Boxes,
  Clock,
  Calendar,
  RefreshCw,
  Download,
  AlertTriangle,
  Layers,
  Sparkles,
  Zap,
  FolderTree,
  ClipboardList,
  Link2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SkuGroupsMap } from '../../types';
import { HotSkuAnalysisItem, HotSkuAnalyticsResult, PairedSkuInfo } from '../../../sqliteDb';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';
import { TabErrorBoundary } from '../../components/common/TabErrorBoundary';

// Subcomponents
import { HotSkuSummaryMetrics } from './components/HotSkuSummaryMetrics';
import { Warehouse2DSlottingMap } from './components/Warehouse2DSlottingMap';
import { HotSkuAbcTable } from './components/HotSkuAbcTable';
import { GroupSlottingSection, GroupSlottingMetricItem } from './components/GroupSlottingSection';
import { RelocationTasksSection } from './components/RelocationTasksSection';
import { PairedSkusSection } from './components/PairedSkusSection';
import { SyncShippedModal, SyncStats } from './components/SyncShippedModal';

interface HotSkuSlottingModuleProps {
  skuGroups?: SkuGroupsMap;
  onNavigateToInventory?: (sku?: string) => void;
  onNavigateToOrders?: () => void;
}

export const HotSkuSlottingModule: React.FC<HotSkuSlottingModuleProps> = ({
  skuGroups = {},
  onNavigateToInventory,
  onNavigateToOrders
}) => {
  // State quản lý tab con: 'map_and_table' | 'group_slotting' | 'relocation_tasks' | 'paired_skus'
  const [activeSubTab, setActiveSubTab] = useState<'map_and_table' | 'group_slotting' | 'relocation_tasks' | 'paired_skus'>('map_and_table');
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  // State quản lý Bố Trí Kệ Theo Nhóm Hàng Hóa (Category Slotting)
  const [selectedSlottingGroup, setSelectedSlottingGroup] = useState<string>('ALL');
  const [slottingGroupSearch, setSlottingGroupSearch] = useState<string>('');
  const [slottingGroupAbcFilter, setSlottingGroupAbcFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
  const [slottingGroupViewMode, setSlottingGroupViewMode] = useState<'2d_aisles' | 'cards' | 'table'>('2d_aisles');

  // State quản lý bộ lọc
  const [timeframe, setTimeframe] = useState<'3d' | '7d' | '30d' | '90d' | 'all' | 'custom'>('30d');
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
  const [syncPercent, setSyncPercent] = useState<number>(0);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    page: 0,
    maxPages: 0,
    totalFetched: 0,
    totalInserted: 0,
    totalSkipped: 0
  });

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

      // 2. Lọc theo Phân Hạng ABC
      if (selectedAbc !== 'ALL') {
        if (item.abcRank !== selectedAbc) return false;
      }

      // 3. Lọc theo Zone trên bản đồ
      if (selectedZoneFilter !== 'ALL') {
        if (selectedZoneFilter === 'ZONE_A' && !item.recommendedZone.includes('A')) return false;
        if (selectedZoneFilter === 'ZONE_B' && !item.recommendedZone.includes('B')) return false;
        if (selectedZoneFilter === 'ZONE_C' && !item.recommendedZone.includes('C')) return false;
        if (selectedZoneFilter === 'INBOUND' && !item.isStockoutWithIncoming) return false;
      }

      return true;
    });
  }, [analytics, searchTerm, selectedAbc, selectedZoneFilter, filterStockoutIncomingOnly]);

  // Mở modal kéo đơn và gán ngày mặc định (3 ngày gần nhất) nếu chưa chọn
  const handleOpenSyncModal = () => {
    if (!syncFromDate) {
      const d = new Date();
      d.setDate(d.getDate() - 3);
      setSyncFromDate(d.toISOString().slice(0, 10));
      setSyncToDate(new Date().toISOString().slice(0, 10));
    }
    setSyncPercent(0);
    setSyncProgressMsg('');
    setSyncStats({ page: 0, maxPages: 0, totalFetched: 0, totalInserted: 0, totalSkipped: 0 });
    setIsSyncModalOpen(true);
  };

  // Kéo dữ liệu đơn Shipped từ YunWMS bằng EventSource thời gian thực (% và số lượng)
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setSyncPercent(2);
    setSyncProgressMsg('Đang khởi tạo kết nối YunWMS & lấy phiên làm việc...');
    setSyncStats({ page: 0, maxPages: 0, totalFetched: 0, totalInserted: 0, totalSkipped: 0 });

    const params = new URLSearchParams();
    if (syncFromDate) params.set('fromDate', syncFromDate);
    if (syncToDate) params.set('toDate', syncToDate);
    params.set('stream', 'true');

    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/wms/shipped/sync-stream?${params.toString()}`);

      es.addEventListener('start', (e: any) => {
        try {
          const data = JSON.parse(e.data || '{}');
          setSyncProgressMsg(data.message || 'Đang kết nối YunWMS...');
        } catch {}
      });

      es.addEventListener('progress', (e: any) => {
        try {
          const data = JSON.parse(e.data || '{}');
          setSyncPercent(data.percent || 0);
          setSyncProgressMsg(data.message || '');
          setSyncStats({
            page: data.page,
            maxPages: data.maxAllowedPages,
            totalFetched: data.totalFetched,
            totalInserted: data.totalInserted,
            totalSkipped: data.totalSkipped,
          });
        } catch {}
      });

      es.addEventListener('complete', (e: any) => {
        try {
          const data = JSON.parse(e.data || '{}');
          setSyncPercent(100);
          setSyncProgressMsg(data.message || 'Hoàn tất đồng bộ 100%!');
          setSyncStats({
            page: data.maxAllowedPages,
            maxPages: data.maxAllowedPages,
            totalFetched: data.totalOrdersFetched,
            totalInserted: data.insertedOrders,
            totalSkipped: data.skippedDuplicates,
          });
        } catch {}
        if (es) {
          es.close();
          es = null;
        }

        setTimeout(() => {
          setIsSyncModalOpen(false);
          setIsSyncing(false);
          setSyncProgressMsg('');
          setSyncPercent(0);
          fetchAnalytics(false);
        }, 2200);
      });

      es.addEventListener('error', async (err: any) => {
        console.warn('[SyncShipped EventSource warning/error, attempting fallback REST]', err);
        if (es) {
          es.close();
          es = null;
        }
        // Fallback REST call nếu SSE gặp lỗi kết nối
        try {
          setSyncProgressMsg('Đang kéo dữ liệu qua cổng dự phòng...');
          const res = await fetch('/api/wms/shipped/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fromDate: syncFromDate || undefined,
              toDate: syncToDate || undefined,
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.message || 'Lỗi kéo dữ liệu');
          }
          setSyncPercent(100);
          setSyncProgressMsg(data.message || 'Hoàn tất!');
          setSyncStats({
            totalFetched: data.totalOrdersFetched,
            totalInserted: data.insertedOrders,
            totalSkipped: data.skippedDuplicates,
          });
          setTimeout(() => {
            setIsSyncModalOpen(false);
            setIsSyncing(false);
            setSyncProgressMsg('');
            setSyncPercent(0);
            fetchAnalytics(false);
          }, 2200);
        } catch (restErr: any) {
          alert(`Lỗi kéo đơn YunWMS: ${restErr?.message || 'Không thể kết nối'}`);
          setIsSyncing(false);
          setSyncProgressMsg('');
        }
      });
    } catch (createErr: any) {
      alert(`Không thể khởi tạo kết nối: ${createErr?.message}`);
      setIsSyncing(false);
      setSyncProgressMsg('');
    }
  };

  // Toggle trạng thái nhiệm vụ chuyển kệ
  const toggleTaskCompleted = (taskId: string) => {
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

  // Đánh dấu hoàn thành toàn bộ nhiệm vụ
  const markAllTasksCompleted = () => {
    if (!analytics?.relocationTasks) return;
    const allIds = new Set(analytics.relocationTasks.map(t => t.id));
    setCompletedTaskIds(allIds);
  };

  // Reset toàn bộ nhiệm vụ
  const resetAllTasks = () => {
    setCompletedTaskIds(new Set());
  };

  // Xuất checklist nhiệm vụ ra Excel
  const handleExportRelocationTasks = () => {
    if (!analytics?.relocationTasks || analytics.relocationTasks.length === 0) {
      alert('Không có nhiệm vụ nào để xuất!');
      return;
    }

    const rows = analytics.relocationTasks.map((t, idx) => ({
      'STT': idx + 1,
      'Phân Loại': t.type === 'PROMOTE_TO_ZONE_A' ? 'ĐÔN HÀNG VỀ ZONE A' : t.type === 'DEMOTE_TO_ZONE_BC' ? 'RÚT HÀNG VỀ ZONE B/C' : 'ĐẶT CHỖ ĐÓN HÀNG VỀ',
      'Mức Độ Khẩn': t.priority.toUpperCase(),
      'Mã SKU': t.sku,
      'Tên Sản Phẩm': t.title || '',
      'Hành Động Yêu Cầu': t.action,
      'Vị Trí Hiện Tại': t.currentZone,
      'Vị Trí Mới / Đề Xuất': t.targetZone,
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

  // Phân tích Bố Trí Kệ Theo Nhóm Hàng Hóa (Category Slotting Metrics)
  const groupSlottingMetrics: GroupSlottingMetricItem[] = useMemo(() => {
    if (!analytics?.items || analytics.items.length === 0) return [];

    const map = new Map<string, {
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
    }>();

    // Khởi tạo các nhóm chuẩn theo DEFAULT_AREA_ORDER
    DEFAULT_AREA_ORDER.forEach(gName => {
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
        items: []
      });
    });

    // Gom dữ liệu từ analytics.items
    analytics.items.forEach(it => {
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
          items: []
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

    // Lọc bỏ nhóm rỗng nếu không có SKU nào, sắp xếp theo sản lượng bán giảm dần
    const list = Array.from(map.values())
      .filter(g => g.skuCount > 0 || g.totalSold > 0)
      .sort((a, b) => b.totalSold - a.totalSold);

    // Tính toán dãy kệ và vị trí tối ưu
    let cumulative = 0;
    return list.map((g, idx) => {
      cumulative += g.totalSold;
      const cumPct = (cumulative / totalSoldAll) * 100;
      const pctOfTotal = Math.round((g.totalSold / totalSoldAll) * 1000) / 10;

      // Sắp xếp SKU trong nhóm theo sản lượng bán giảm dần
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
          distanceLabel
        },
        topHotSkus: g.items.slice(0, 5)
      };
    });
  }, [analytics]);

  // Danh sách SKU hiển thị trong Bảng Bố Trí Nhóm
  const displayedSlottingSkus = useMemo(() => {
    if (!groupSlottingMetrics || groupSlottingMetrics.length === 0) return [];

    let targetGroups = groupSlottingMetrics;
    if (selectedSlottingGroup !== 'ALL') {
      targetGroups = groupSlottingMetrics.filter(g => g.groupName === selectedSlottingGroup);
    }

    const allSkus: Array<{
      item: HotSkuAnalysisItem;
      groupName: string;
      aisleCode: string;
      zoneTag: string;
      levelRecommendation: string;
    }> = [];

    targetGroups.forEach(g => {
      g.items.forEach(it => {
        // Lọc Hạng ABC
        if (slottingGroupAbcFilter !== 'ALL' && it.abcRank !== slottingGroupAbcFilter) {
          return;
        }

        // Tìm kiếm
        if (slottingGroupSearch) {
          const s = slottingGroupSearch.toLowerCase().trim();
          const matchSku = it.sku.toLowerCase().includes(s);
          const matchTitle = (it.productTitle || '').toLowerCase().includes(s);
          if (!matchSku && !matchTitle) return;
        }

        let level = '';
        if (it.abcRank === 'A') {
          level = '⭐ Tầng 1 - 2 (Ngang tầm ngực & thắt lưng - nhặt tức thì)';
        } else if (it.abcRank === 'B') {
          level = 'Tầng 3 (Tầm mắt - với chuẩn)';
        } else {
          level = 'Tầng 4 - 5 (Tầng cao nóc kệ / sát sàn)';
        }

        allSkus.push({
          item: it,
          groupName: g.groupName,
          aisleCode: g.optimalAisleRecommendation.aisleCode,
          zoneTag: g.optimalAisleRecommendation.zoneTag,
          levelRecommendation: level
        });
      });
    });

    return allSkus;
  }, [groupSlottingMetrics, selectedSlottingGroup, slottingGroupAbcFilter, slottingGroupSearch]);

  // Xuất Excel Báo Cáo Nhóm Hàng Hóa
  const handleExportGroupSlottingExcel = (onlyCurrentGroup = false) => {
    if (!groupSlottingMetrics || groupSlottingMetrics.length === 0) {
      alert('Chưa có dữ liệu phân tích nhóm hàng để xuất Excel');
      return;
    }

    const groupsToExport = onlyCurrentGroup && selectedSlottingGroup !== 'ALL'
      ? groupSlottingMetrics.filter(g => g.groupName === selectedSlottingGroup)
      : groupSlottingMetrics;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng Hợp Dãy Kệ Bố Trí Theo Nhóm
    const summaryRows = groupsToExport.map((g, idx) => ({
      'Thứ Tự Ưu Tiên (Xếp Bán Nhanh -> Chậm)': idx + 1,
      'Nhóm Hàng Hóa': g.groupName,
      'Dãy Kệ Quy Hoạch Đề Xuất': g.optimalAisleRecommendation.aisleCode,
      'Phân Vùng Ưu Tiên (Zone)': g.optimalAisleRecommendation.zoneTag,
      'Cự Ly Tới Bàn Đóng Gói': g.optimalAisleRecommendation.distanceLabel,
      'Khuyến Nghị Phân Tầng Kệ': g.optimalAisleRecommendation.levelRecommendation,
      'Sản Lượng Bán (PCS)': g.totalSold,
      'Tỉ Trọng Bán Toàn Kho (%)': `${g.percentageOfWarehouseSold}%`,
      'Tổng Số Mã SKU': g.skuCount,
      'Số Mã Hạng A (Hot - Nhặt Tức Thì)': g.classACount,
      'Số Mã Hạng B (Bán Đều)': g.classBCount,
      'Số Mã Hạng C (Bán Chậm)': g.classCCount,
      'Tồn Kho Hiện Tại (In-Used)': g.totalInUsed,
      'Hàng Đang Về (On-Way)': g.totalOnWay,
      'Lý Do Quy Hoạch': g.optimalAisleRecommendation.reason
    }));
    const ws1 = XLSX.utils.json_to_sheet(summaryRows);
    ws1['!cols'] = [
      { wch: 22 }, { wch: 18 }, { wch: 35 }, { wch: 18 }, { wch: 25 },
      { wch: 42 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 20 },
      { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 55 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Tong_Hop_Nhanh_Den_Cham');

    // Sheet 2: Chi Tiết Phân Bổ Từng SKU Trong Nhóm
    const skuRows: any[] = [];
    let skuCounter = 1;
    groupsToExport.forEach((g, gIdx) => {
      g.items.forEach((it) => {
        skuRows.push({
          'STT': skuCounter++,
          'Thứ Hạng Nhóm (#1 Nhanh Nhất)': gIdx + 1,
          'Nhóm Hàng': g.groupName,
          'Dãy Kệ Nhóm': g.optimalAisleRecommendation.aisleCode,
          'Phân Vùng Zone': g.optimalAisleRecommendation.zoneTag,
          'Hạng ABC': it.abcRank,
          'Mã SKU': it.sku,
          'Tên Sản Phẩm': it.productTitle || '-',
          'Vị Trí Tầng Khuyến Nghị': it.abcRank === 'A' ? '⭐ Tầng 1 - 2 (Ngang tầm ngực/thắt lưng - nhặt tức thì)' : it.abcRank === 'B' ? 'Tầng 3 (Tầm mắt - với chuẩn)' : 'Tầng 4 - 5 (Tầng cao nóc kệ / sát sàn)',
          'Sản Lượng Bán (PCS)': it.totalSold,
          'Số Đơn Hàng (Pick Hits)': it.orderCount,
          'Vận Tốc Bán (PCS/ngày)': it.velocityDaily,
          'Tồn Khả Dụng (In Used)': it.inUsed || 0,
          'Đang Về (On Way)': it.onWay || 0,
          'Số Ngày Đủ Bán (DOS)': it.daysOfStock === 999 ? 'Dồi dào' : (it.daysOfStock ?? '-'),
          'Độ Phủ Hàng Về': it.daysOfSupplyIncoming !== null && it.daysOfSupplyIncoming !== undefined ? `${it.daysOfSupplyIncoming} ngày` : 'N/A'
        });
      });
    });
    const ws2 = XLSX.utils.json_to_sheet(skuRows);
    ws2['!cols'] = [
      { wch: 8 }, { wch: 18 }, { wch: 16 }, { wch: 32 }, { wch: 14 },
      { wch: 12 }, { wch: 22 }, { wch: 38 }, { wch: 45 }, { wch: 18 },
      { wch: 18 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Chi_Tiet_SKU_Theo_Nhom');

    const fileName = onlyCurrentGroup && selectedSlottingGroup !== 'ALL'
      ? `Bao_Cao_Nhom_${selectedSlottingGroup}_Nhanh_Den_Cham_VN02_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Bao_Cao_Nhom_Ban_Nhanh_Den_Cham_VN02_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // In toàn bộ danh sách quy hoạch bố trí kho theo nhóm
  const handlePrintGroupSlottingReport = (onlyCurrentGroup = false) => {
    if (!groupSlottingMetrics || groupSlottingMetrics.length === 0) {
      alert('Chưa có dữ liệu phân tích nhóm hàng để in');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Trình duyệt đang chặn cửa sổ pop-up. Vui lòng cho phép pop-up để mở bản in.');
      return;
    }

    const groupsToPrint = onlyCurrentGroup && selectedSlottingGroup !== 'ALL'
      ? groupSlottingMetrics.filter(g => g.groupName === selectedSlottingGroup)
      : groupSlottingMetrics;

    const printDate = new Date().toLocaleString('vi-VN');

    const summaryRowsHtml = groupsToPrint.map((g, idx) => {
      const isZoneA = g.optimalAisleRecommendation.zoneTag === 'ZONE_A';
      const isZoneB = g.optimalAisleRecommendation.zoneTag === 'ZONE_B';
      const zoneBg = isZoneA ? '#fef3c7' : isZoneB ? '#e0f2fe' : '#f1f5f9';
      const zoneColor = isZoneA ? '#92400e' : isZoneB ? '#075985' : '#475569';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">${g.groupName}</td>
          <td style="padding: 6px 8px;"><b>${g.optimalAisleRecommendation.aisleCode.split('(')[0].trim()}</b></td>
          <td style="padding: 6px 8px; text-align: center;">
            <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; background: ${zoneBg}; color: ${zoneColor}; font-weight: bold; font-size: 10px;">
              ${g.optimalAisleRecommendation.zoneTag}
            </span>
          </td>
          <td style="padding: 6px 8px; text-align: center;">${g.optimalAisleRecommendation.distanceLabel}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold;">${g.totalSold.toLocaleString()}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #4338ca;">${g.percentageOfWarehouseSold}%</td>
          <td style="padding: 6px 8px; text-align: center;"><b>${g.skuCount}</b> mã (A: ${g.classACount} | B: ${g.classBCount} | C: ${g.classCCount})</td>
          <td style="padding: 6px 8px; font-size: 10px; color: #334155;">${g.optimalAisleRecommendation.levelRecommendation}</td>
        </tr>
      `;
    }).join('');

    const groupDetailsHtml = groupsToPrint.map((g, idx) => {
      const isZoneA = g.optimalAisleRecommendation.zoneTag === 'ZONE_A';
      const isZoneB = g.optimalAisleRecommendation.zoneTag === 'ZONE_B';
      const headerBg = isZoneA ? '#b45309' : isZoneB ? '#1d4ed8' : '#334155';

      const skuRowsHtml = g.items.map((it, sIdx) => {
        const isClassA = it.abcRank === 'A';
        const isClassB = it.abcRank === 'B';
        const rankBg = isClassA ? '#fee2e2' : isClassB ? '#dbeafe' : '#f1f5f9';
        const rankColor = isClassA ? '#991b1b' : isClassB ? '#1e40af' : '#475569';
        const tierText = isClassA
          ? '⭐ Tầng 1 - 2 (Ngang tầm ngực/thắt lưng - nhặt tức thì)'
          : isClassB
          ? 'Tầng 3 (Tầm mắt - với chuẩn)'
          : 'Tầng 4 - 5 (Tầng cao nóc kệ / sát sàn)';

        return `
          <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
            <td style="padding: 5px 6px; text-align: center; color: #64748b;">${sIdx + 1}</td>
            <td style="padding: 5px 6px; font-family: monospace; font-weight: bold; color: #0f172a;">${it.sku}</td>
            <td style="padding: 5px 6px; color: #334155;">${it.productTitle || '-'}</td>
            <td style="padding: 5px 6px; text-align: center;">
              <span style="display:inline-block; padding: 1px 5px; border-radius: 4px; background: ${rankBg}; color: ${rankColor}; font-weight: bold; font-size: 10px;">
                Hạng ${it.abcRank}
              </span>
            </td>
            <td style="padding: 5px 6px; font-size: 10.5px; font-weight: 500;">${tierText}</td>
            <td style="padding: 5px 6px; text-align: right; font-weight: bold;">${it.totalSold.toLocaleString()}</td>
            <td style="padding: 5px 6px; text-align: right;">${it.velocityDaily}</td>
            <td style="padding: 5px 6px; text-align: right; font-weight: bold;">${(it.inUsed || 0).toLocaleString()}</td>
            <td style="padding: 5px 6px; text-align: right; color: #059669; font-weight: bold;">${(it.onWay || 0).toLocaleString()}</td>
            <td style="padding: 5px 6px; text-align: center;">${it.daysOfStock === 999 ? 'Dồi dào' : (it.daysOfStock ?? '-')}</td>
          </tr>
        `;
      }).join('');

      return `
        <div style="margin-top: 20px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
          <div style="background-color: ${headerBg}; color: #ffffff; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <span style="font-size: 14px; font-weight: bold;">#${idx + 1}. NHÓM: ${g.groupName}</span>
              <span style="font-size: 12px; opacity: 0.9; margin-left: 8px;">[${g.optimalAisleRecommendation.aisleCode}]</span>
            </div>
            <div style="font-size: 12px; font-weight: 600;">
              Sản lượng: <b>${g.totalSold.toLocaleString()} PCS</b> (${g.percentageOfWarehouseSold}% kho) &bull; ${g.skuCount} mã SKU &bull; ${g.optimalAisleRecommendation.zoneTag} (${g.optimalAisleRecommendation.distanceLabel})
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
            <div><b>Quy tắc tầng kệ:</b> <span style="color:#b45309;">Tầng 1-2: ${g.classACount} mã Hạng A (Hot)</span> &bull; <span style="color:#1d4ed8;">Tầng 3: ${g.classBCount} mã Hạng B (Đều)</span> &bull; <span style="color:#475569;">Tầng 4-5: ${g.classCCount} mã Hạng C (Lưu trữ)</span></div>
            <div>Tồn kho khả dụng: <b>${g.totalInUsed.toLocaleString()}</b> &bull; Đang về: <b style="color:#059669;">${g.totalOnWay.toLocaleString()}</b></div>
          </div>

          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #f1f5f9; font-size: 10.5px; font-weight: bold; color: #475569; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 5px 6px; width: 30px; text-align: center;">STT</th>
                <th style="padding: 5px 6px; width: 100px;">Mã SKU</th>
                <th style="padding: 5px 6px;">Tên Sản Phẩm</th>
                <th style="padding: 5px 6px; width: 65px; text-align: center;">Hạng ABC</th>
                <th style="padding: 5px 6px; width: 220px;">Vị Trí Tầng Khuyến Nghị</th>
                <th style="padding: 5px 6px; width: 75px; text-align: right;">Bán (PCS)</th>
                <th style="padding: 5px 6px; width: 65px; text-align: right;">Vận Tốc</th>
                <th style="padding: 5px 6px; width: 65px; text-align: right;">Tồn Khả Dụng</th>
                <th style="padding: 5px 6px; width: 65px; text-align: right;">Đang Về</th>
                <th style="padding: 5px 6px; width: 60px; text-align: center;">DOS (Ngày)</th>
              </tr>
            </thead>
            <tbody>
              ${skuRowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bảng Quy Hoạch Bố Trí Kho Theo Nhóm Hàng (Xếp Từ Bán Nhanh Đến Bán Chậm)</title>
          <meta charset="utf-8" />
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              margin: 0;
              padding: 12px;
              background-color: #fff;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .header-bar {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .title-area h1 {
              font-size: 18px;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .title-area p {
              margin: 0;
              font-size: 11px;
              color: #475569;
            }
            .meta-box {
              text-align: right;
              font-size: 11px;
              color: #334155;
            }
            .summary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
            .summary-table th, .summary-table td {
              border: 1px solid #cbd5e1;
            }
            .section-title {
              font-size: 13px;
              font-weight: bold;
              text-transform: uppercase;
              background-color: #0f172a;
              color: #fff;
              padding: 6px 10px;
              border-radius: 4px;
              margin: 15px 0 8px 0;
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div class="title-area">
              <h1>Kế Hoạch Bố Trí Kho Theo Nhóm Hàng (Category & Family Slotting)</h1>
              <p>Kho VN02 • Danh Sách Xếp Thứ Tự Từ Nhóm Bán Nhanh Nhất Đến Chậm Nhất • Quy Hoạch Dãy Kệ & Phân Bổ Tầng Kệ 1-5</p>
            </div>
            <div class="meta-box">
              <div>Thời gian in: <b>${printDate}</b></div>
              <div>Tổng nhóm: <b>${groupsToPrint.length} nhóm</b> &bull; Đơn vị: PCS</div>
            </div>
          </div>

          <div class="section-title">PHẦN 1: BẢNG TỔNG HỢP PHÂN BỔ DÃY KỆ (XẾP THỨ TỰ BÁN NHANH &rarr; CHẬM)</div>
          <table class="summary-table">
            <thead>
              <tr style="background-color: #f1f5f9; font-size: 11px; font-weight: bold; color: #334155;">
                <th style="padding: 6px 8px; width: 35px; text-align: center;">STT</th>
                <th style="padding: 6px 8px;">Tên Nhóm Hàng Hóa</th>
                <th style="padding: 6px 8px; width: 140px;">Dãy Kệ Quy Hoạch</th>
                <th style="padding: 6px 8px; width: 75px; text-align: center;">Zone</th>
                <th style="padding: 6px 8px; width: 130px; text-align: center;">Cự Ly Tới Đóng Gói</th>
                <th style="padding: 6px 8px; width: 85px; text-align: right;">Sản Lượng</th>
                <th style="padding: 6px 8px; width: 75px; text-align: right;">Tỉ Trọng</th>
                <th style="padding: 6px 8px; width: 170px; text-align: center;">Cấu Trúc SKU</th>
                <th style="padding: 6px 8px;">Quy Tắc Bố Trí Tầng Kệ</th>
              </tr>
            </thead>
            <tbody>
              ${summaryRowsHtml}
            </tbody>
          </table>

          <div class="section-title">PHẦN 2: CHI TIẾT DANH MỤC SKU VÀ TẦNG KỆ CỦA TỪNG NHÓM HÀNG</div>
          ${groupDetailsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Gom các cặp mua kèm duy nhất
  const uniquePairs = useMemo(() => {
    if (!analytics?.pairedSkus) return [];
    const seen = new Set<string>();
    const list: PairedSkuInfo[] = [];

    analytics.pairedSkus.forEach((p) => {
      const key = [p.skuA, p.skuB].sort().join('___');
      if (!seen.has(key)) {
        seen.add(key);
        list.push(p);
      }
    });

    return list.sort((a, b) => b.count - a.count);
  }, [analytics]);

  return (
    <TabErrorBoundary tabName="Hàng Bán Chạy & Bố Trí Kho (ABC)" onNavigateBack={onNavigateToOrders}>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* 1. HEADER SECTION (BANNER VÀ KHUNG THỜI GIAN) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Smart Warehouse Slotting Intelligence</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                Phân Tích Sản Phẩm Bán Chạy & Sắp Xếp Vị Trí Kho
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Dữ liệu xuất kho (Shipped - Mã 8, Kho VN02) • Chuẩn Hóa Ngày Đứt Hàng • Đặt Chỗ Zone A Đón Hàng Về
              </p>

              {/* Thông tin metadata cập nhật */}
              {analytics?.syncMeta && (
                <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Cập nhật lần cuối: <b className="text-slate-200">{analytics.syncMeta.lastSyncTime ? new Date(analytics.syncMeta.lastSyncTime).toLocaleString('vi-VN') : 'Chưa có'}</b>
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                    <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                    Tổng đơn trong SQL: <b className="text-slate-200">{(analytics.syncMeta.totalOrdersInDb || 0).toLocaleString()} đơn</b>
                  </span>
                </div>
              )}
            </div>

            {/* Cụm Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => fetchAnalytics(true)}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
                title="Làm mới phân tích"
              >
                <RefreshCw className={`w-4 h-4 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Làm Mới</span>
              </button>

              <button
                onClick={handleOpenSyncModal}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                title="Kéo thêm ngày đơn từ hệ thống YunWMS"
              >
                <RefreshCw className="w-4 h-4 text-slate-950" />
                <span>Kéo Đơn YunWMS</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                title="Xuất kết quả phân tích ra file Excel"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          {/* Dải Lựa Chọn Khung Thời Gian & Chế Độ Phân Hạng */}
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mr-1 shrink-0">Khung Giờ:</span>
              {[
                { id: '3d', label: '3 Ngày' },
                { id: '7d', label: '7 Ngày' },
                { id: '30d', label: '30 Ngày (Chuẩn)' },
                { id: '90d', label: '90 Ngày' },
                { id: 'all', label: 'Tất Cả' },
                { id: 'custom', label: 'Tùy Chọn' }
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setTimeframe(btn.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    timeframe === btn.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Toggle Chế Độ Phân Hạng */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mr-1 shrink-0 hidden sm:inline">Góc Nhìn ABC:</span>
              <div className="flex items-center p-1 rounded-xl bg-slate-800/90 border border-slate-700 text-xs shrink-0">
                <button
                  onClick={() => setRankingMode('normalized')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    rankingMode === 'normalized'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-black'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Loại bỏ chuỗi ngày cạn tồn, giữ hạng A và đặt chỗ Zone A đón hàng về"
                >
                  <Zap className="w-3.5 h-3.5 text-slate-950" />
                  <span className="hidden sm:inline">⚡ Chuẩn Hóa Đứt Hàng (Đón Hàng Về)</span>
                  <span className="sm:hidden">⚡ Chuẩn Hóa</span>
                </button>
                <button
                  onClick={() => setRankingMode('actual')}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    rankingMode === 'actual'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title="Xếp hạng thuần túy theo số lượng thực tế đã xuất kho"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">📦 Theo Sản Lượng Thực Tế</span>
                  <span className="sm:hidden">📦 Thực Tế</span>
                </button>
              </div>
            </div>

            {timeframe === 'custom' && (
              <div className="flex items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700 text-xs shrink-0">
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
        <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto py-1">
            <button
              onClick={() => setActiveSubTab('map_and_table')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeSubTab === 'map_and_table'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Warehouse className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sơ Đồ Kệ Kho & Bảng Phân Tích ABC</span>
              <span className="sm:hidden">Sơ Đồ & Bảng ABC</span>
            </button>

            <button
              onClick={() => setActiveSubTab('group_slotting')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeSubTab === 'group_slotting'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FolderTree className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Bố Trí Theo Nhóm Hàng</span>
              <span className="sm:hidden">Theo Nhóm Hàng</span>
              {groupSlottingMetrics.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeSubTab === 'group_slotting' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
                }`}>
                  {groupSlottingMetrics.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('relocation_tasks')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeSubTab === 'relocation_tasks'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Checklist Nhiệm Vụ Chuyển Kệ</span>
              <span className="sm:hidden">Nhiệm Vụ Kệ</span>
              {(analytics?.relocationTasks?.length || 0) > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeSubTab === 'relocation_tasks' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
                }`}>
                  {analytics?.relocationTasks?.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('paired_skus')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeSubTab === 'paired_skus'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Link2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Ma Trận Cặp Mua Kèm (Đơn Mix)</span>
              <span className="sm:hidden">Cặp Mua Kèm</span>
              {uniquePairs.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeSubTab === 'paired_skus' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {uniquePairs.length}
                </span>
              )}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs pr-2">
            <span className="text-slate-500">
              Tổng sản lượng kỳ này: <b className="text-slate-900 font-mono">{(analytics?.totalSoldVolume || 0).toLocaleString()}</b> pcs
            </span>
          </div>
        </div>

        {/* 2. TOP 5 KPI SUMMARY CARDS */}
        <HotSkuSummaryMetrics
          analytics={analytics}
          rankingMode={rankingMode}
          selectedAbc={selectedAbc}
          setSelectedAbc={setSelectedAbc}
          selectedZoneFilter={selectedZoneFilter}
          setSelectedZoneFilter={setSelectedZoneFilter}
          filterStockoutIncomingOnly={filterStockoutIncomingOnly}
          setFilterStockoutIncomingOnly={setFilterStockoutIncomingOnly}
        />

        {/* 3. SUBTAB 1: SƠ ĐỒ 2D & BẢNG PHÂN HẠNG ABC */}
        {activeSubTab === 'map_and_table' && (
          <div className="space-y-6">
            <Warehouse2DSlottingMap
              analytics={analytics}
              selectedZoneFilter={selectedZoneFilter}
              setSelectedZoneFilter={setSelectedZoneFilter}
              onNavigateToInventory={onNavigateToInventory}
            />

            <HotSkuAbcTable
              filteredItems={filteredItems}
              selectedZoneFilter={selectedZoneFilter}
              setSelectedZoneFilter={setSelectedZoneFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedAbc={selectedAbc}
              setSelectedAbc={setSelectedAbc}
              filterStockoutIncomingOnly={filterStockoutIncomingOnly}
              setFilterStockoutIncomingOnly={setFilterStockoutIncomingOnly}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              skuGroups={skuGroups}
              rankingMode={rankingMode}
              isLoading={isLoading}
              errorMessage={errorMessage}
              stockoutIncomingCount={analytics?.stockoutIncomingCount || 0}
              onNavigateToInventory={onNavigateToInventory}
            />
          </div>
        )}

        {/* 4. SUBTAB 2: QUY HOẠCH BỐ TRÍ THEO NHÓM HÀNG */}
        {activeSubTab === 'group_slotting' && (
          <GroupSlottingSection
            groupSlottingMetrics={groupSlottingMetrics}
            analytics={analytics}
            selectedSlottingGroup={selectedSlottingGroup}
            setSelectedSlottingGroup={setSelectedSlottingGroup}
            slottingGroupViewMode={slottingGroupViewMode}
            setSlottingGroupViewMode={setSlottingGroupViewMode}
            slottingGroupSearch={slottingGroupSearch}
            setSlottingGroupSearch={setSlottingGroupSearch}
            slottingGroupAbcFilter={slottingGroupAbcFilter}
            setSlottingGroupAbcFilter={setSlottingGroupAbcFilter}
            displayedSlottingSkus={displayedSlottingSkus}
            handleExportGroupSlottingExcel={handleExportGroupSlottingExcel}
            handlePrintGroupSlottingReport={handlePrintGroupSlottingReport}
            onNavigateToInventory={onNavigateToInventory}
          />
        )}

        {/* 5. SUBTAB 3: CHECKLIST NHIỆM VỤ CHUYỂN KỆ */}
        {activeSubTab === 'relocation_tasks' && (
          <RelocationTasksSection
            analytics={analytics}
            completedTaskIds={completedTaskIds}
            toggleTaskCompleted={toggleTaskCompleted}
            markAllTasksCompleted={markAllTasksCompleted}
            resetAllTasks={resetAllTasks}
            handleExportRelocationTasks={handleExportRelocationTasks}
            onNavigateToInventory={onNavigateToInventory}
          />
        )}

        {/* 6. SUBTAB 4: MA TRẬN CẶP MUA KÈM (ĐƠN MIX) */}
        {activeSubTab === 'paired_skus' && (
          <PairedSkusSection
            uniquePairs={uniquePairs}
            onNavigateToInventory={onNavigateToInventory}
          />
        )}

        {/* 7. MODAL KÉO BỔ SUNG ĐƠN TỪ YUNWMS */}
        <SyncShippedModal
          isOpen={isSyncModalOpen}
          onClose={() => !isSyncing && setIsSyncModalOpen(false)}
          fromDate={syncFromDate}
          toDate={syncToDate}
          onFromDateChange={setSyncFromDate}
          onToDateChange={setSyncToDate}
          isSyncing={isSyncing}
          progressMsg={syncProgressMsg}
          progressPercent={syncPercent}
          progressStats={syncStats}
          onTriggerSync={handleTriggerSync}
        />
      </div>
    </TabErrorBoundary>
  );
};
