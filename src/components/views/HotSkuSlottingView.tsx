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
  ClipboardList,
  LayoutGrid,
  MapPin,
  Sliders,
  FolderTree,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SkuGroupsMap } from '../../types';
import { HotSkuAnalysisItem, HotSkuAnalyticsResult, ShippedSyncMeta, SlottingRelocationTask, PairedSkuInfo } from '../../../sqliteDb';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';

interface HotSkuSlottingViewProps {
  skuGroups?: SkuGroupsMap;
  onNavigateToInventory?: (sku?: string) => void;
}

export const HotSkuSlottingView: React.FC<HotSkuSlottingViewProps> = ({
  skuGroups = {},
  onNavigateToInventory
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

  // Phân tích Bố Trí Kệ Theo Nhóm Hàng Hóa (Category Slotting Metrics)
  const groupSlottingMetrics = useMemo(() => {
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
      zoneTag: 'ZONE_A' | 'ZONE_B' | 'ZONE_C';
      levelRecommendation: string;
    }> = [];

    targetGroups.forEach(g => {
      g.items.forEach(it => {
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

    return allSkus.filter(({ item, groupName }) => {
      if (slottingGroupAbcFilter !== 'ALL' && item.abcRank !== slottingGroupAbcFilter) {
        return false;
      }
      if (slottingGroupSearch) {
        const clean = slottingGroupSearch.trim().toLowerCase();
        const matchSku = item.sku.toLowerCase().includes(clean);
        const matchTitle = (item.productTitle || '').toLowerCase().includes(clean);
        const matchGroup = groupName.toLowerCase().includes(clean);
        if (!matchSku && !matchTitle && !matchGroup) return false;
      }
      return true;
    });
  }, [groupSlottingMetrics, selectedSlottingGroup, slottingGroupAbcFilter, slottingGroupSearch]);

  const handleExportGroupSlottingExcel = (onlyCurrentGroup = false) => {
    if (!groupSlottingMetrics || groupSlottingMetrics.length === 0) {
      alert('Không có dữ liệu bố trí theo nhóm để xuất');
      return;
    }

    const groupsToExport = onlyCurrentGroup && selectedSlottingGroup !== 'ALL'
      ? groupSlottingMetrics.filter(g => g.groupName === selectedSlottingGroup)
      : groupSlottingMetrics;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Tổng Hợp Dãy Kệ Bố Trí Theo Nhóm (Xếp từ Bán Nhanh Nhất -> Bán Chậm Nhất)
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
      { wch: 22 },
      { wch: 18 },
      { wch: 35 },
      { wch: 18 },
      { wch: 25 },
      { wch: 42 },
      { wch: 18 },
      { wch: 20 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 55 }
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'Tong_Hop_Nhanh_Den_Cham');

    // Sheet 2: Chi Tiết Phân Bổ Từng SKU Trong Nhóm (Xếp từ Bán Nhanh -> Bán Chậm)
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
      { wch: 8 },
      { wch: 18 },
      { wch: 16 },
      { wch: 32 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 38 },
      { wch: 45 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Chi_Tiet_SKU_Theo_Nhom');

    const fileName = onlyCurrentGroup && selectedSlottingGroup !== 'ALL'
      ? `Bao_Cao_Nhom_${selectedSlottingGroup}_Nhanh_Den_Cham_VN02_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Bao_Cao_Nhom_Ban_Nhanh_Den_Cham_VN02_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // In toàn bộ danh sách quy hoạch bố trí kho theo nhóm (Từ bán nhanh -> bán chậm)
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

    const totalSoldAll = analytics?.totalSoldVolume || 1;
    const printDate = new Date().toLocaleString('vi-VN');

    // Tạo HTML bảng tổng hợp thứ tự ưu tiên các dãy kệ (Từ bán nhanh đến bán chậm)
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

    // Tạo HTML chi tiết từng nhóm hàng xếp từ bán nhanh đến bán chậm
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
              font-size: 11px;
              color: #475569;
              margin: 0;
            }
            .meta-info {
              font-size: 11px;
              text-align: right;
              color: #334155;
            }
            .print-btn {
              padding: 6px 16px;
              background-color: #0f172a;
              color: #fff;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: bold;
              font-size: 12px;
              margin-top: 6px;
            }
            .print-btn:hover {
              background-color: #334155;
            }
            @media print {
              .print-btn { display: none !important; }
              body { padding: 0; }
              .page-break { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div class="title-area">
              <h1>KHO VN02 &mdash; BẢNG QUY HOẠCH BỐ TRÍ KHO THEO NHÓM HÀNG HÓA</h1>
              <p>Danh sách sắp xếp từ <b>BÁN NHANH NHẤT (Zone A)</b> đến <b>BÁN CHẬM NHẤT (Zone C)</b> &bull; Phân bổ dãy kệ &amp; tầng kệ (Shelf Tiers 1-5)</p>
            </div>
            <div class="meta-info">
              <div>Thời gian in: <b>${printDate}</b></div>
              <div>Quy mô: <b>${groupsToPrint.length} nhóm</b> (${totalSoldAll.toLocaleString()} PCS xuất kho)</div>
              <button class="print-btn" onclick="window.print()">🖨️ In Báo Cáo Này (Print)</button>
            </div>
          </div>

          <!-- PHẦN 1: BẢNG TỔNG HỢP TẤT CẢ CÁC NHÓM HÀNG -->
          <div style="margin-bottom: 18px;">
            <div style="font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; color: #1e293b;">
              Phần 1: Bảng Tổng Hợp Thứ Tự Ưu Tiên Các Dãy Kệ (Từ Bán Nhanh &rarr; Bán Chậm)
            </div>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; text-align: left;">
              <thead>
                <tr style="background-color: #0f172a; color: #fff; font-size: 11px; text-transform: uppercase;">
                  <th style="padding: 6px 8px; width: 35px; text-align: center;">#</th>
                  <th style="padding: 6px 8px; width: 110px;">Nhóm Hàng</th>
                  <th style="padding: 6px 8px; width: 140px;">Dãy Kệ Đề Xuất</th>
                  <th style="padding: 6px 8px; width: 75px; text-align: center;">Phân Vùng</th>
                  <th style="padding: 6px 8px; width: 100px; text-align: center;">Cự Ly Tới Đóng Gói</th>
                  <th style="padding: 6px 8px; width: 80px; text-align: right;">Bán (PCS)</th>
                  <th style="padding: 6px 8px; width: 65px; text-align: right;">Tỉ Trọng</th>
                  <th style="padding: 6px 8px; width: 150px; text-align: center;">Cơ Cấu SKU (A/B/C)</th>
                  <th style="padding: 6px 8px;">Khuyến Nghị Phân Tầng Kệ</th>
                </tr>
              </thead>
              <tbody>
                ${summaryRowsHtml}
              </tbody>
            </table>
          </div>

          <!-- PHẦN 2: CHI TIẾT DANH SÁCH SKU CỦA TỪNG NHÓM -->
          <div style="margin-top: 24px;">
            <div style="font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 6px; color: #1e293b;">
              Phần 2: Danh Sách Chi Tiết Từng Nhóm &amp; SKU (Xếp Theo Thứ Tự Từ Bán Nhanh Đến Bán Chậm)
            </div>
            ${groupDetailsHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
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
              { id: '3d', label: '3 Ngày Gần Nhất' },
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
            onClick={() => setActiveSubTab('group_slotting')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative ${
              activeSubTab === 'group_slotting'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Bố Trí Theo Nhóm Hàng</span>
            {groupSlottingMetrics.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeSubTab === 'group_slotting' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
              }`}>
                {groupSlottingMetrics.length} nhóm
              </span>
            )}
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

      {/* VIEW: BỐ TRÍ KHO THEO NHÓM HÀNG HÓA (CATEGORY & FAMILY SLOTTING) */}
      {activeSubTab === 'group_slotting' && (
        <div className="space-y-6">
          {/* Header Bar của Bố Trí Theo Nhóm */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-blue-600" />
                Quy Hoạch Bố Trí Kho Theo Nhóm Hàng Hóa (Category & Family Slotting)
              </h2>
              <p className="text-xs text-slate-500">
                Phân bổ dãy kệ (Aisles) và định vị tầng kệ (Shelf Tiers 1-5) theo từng nhóm hàng chủ lực dựa trên sản lượng xuất, tỉ trọng kho và khoảng cách nhặt hàng tới bàn đóng gói.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Chế độ xem: Sơ Đồ 2D / Thẻ Nhóm / Bảng Chi Tiết */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setSlottingGroupViewMode('2d_aisles')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    slottingGroupViewMode === '2d_aisles'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Xem sơ đồ dãy kệ 2D mặt bằng kho"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Sơ Đồ Dãy 2D</span>
                </button>
                <button
                  onClick={() => setSlottingGroupViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    slottingGroupViewMode === 'cards'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Xem dạng thẻ nhóm hàng"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Thẻ Nhóm</span>
                </button>
                <button
                  onClick={() => setSlottingGroupViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    slottingGroupViewMode === 'table'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Xem bảng phân bổ từng SKU"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Bảng SKU</span>
                </button>
              </div>

              {/* Nút Xuất Excel Báo Cáo Nhóm (Xếp từ Bán Nhanh Đến Bán Chậm) */}
              <button
                onClick={() => handleExportGroupSlottingExcel(false)}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                title="Xuất file Excel báo cáo toàn bộ các nhóm hàng xếp thứ tự từ bán nhanh nhất đến bán chậm nhất"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel Nhóm (Nhanh &rarr; Chậm)</span>
              </button>

              {/* Nút In Toàn Bộ Danh Sách Nhóm (Xếp từ Bán Nhanh Đến Bán Chậm) */}
              <button
                onClick={() => handlePrintGroupSlottingReport(false)}
                className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                title="In báo cáo toàn bộ các nhóm hàng xếp thứ tự từ bán nhanh nhất đến bán chậm nhất"
              >
                <Printer className="w-3.5 h-3.5 text-amber-400" />
                <span>In Báo Cáo (PDF / Giấy)</span>
              </button>
            </div>
          </div>

          {/* 4 Thẻ KPI Tóm Tắt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Tổng Nhóm Hoạt Động</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {groupSlottingMetrics.length} <span className="text-sm font-semibold text-slate-500">nhóm hàng</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Tổng cộng <b>{(analytics?.totalSoldVolume || 0).toLocaleString()}</b> PCS xuất kho
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Nhóm Chủ Lực Số 1</span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-slate-900 truncate" title={groupSlottingMetrics[0]?.groupName}>
                {groupSlottingMetrics[0]?.groupName || 'Chưa có'}
              </div>
              <div className="text-xs text-rose-600 font-semibold mt-1">
                Chiếm <b>{groupSlottingMetrics[0]?.percentageOfWarehouseSold || 0}%</b> tổng lượng bán kho
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Dãy Kệ Zone A (Mặt Tiền)</span>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Warehouse className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600">
                {groupSlottingMetrics.filter(g => g.optimalAisleRecommendation.zoneTag === 'ZONE_A').length} <span className="text-sm font-semibold text-slate-500">nhóm</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Đặt tại Dãy 01 - 02 (&lt; 5m tới Bàn Đóng Gói)
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Tổng Tồn Kho & Đang Về</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <Truck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-black text-emerald-700">
                {groupSlottingMetrics.reduce((s, g) => s + g.totalInUsed, 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">tồn kho</span>
              </div>
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                + {groupSlottingMetrics.reduce((s, g) => s + g.totalOnWay, 0).toLocaleString()} PCS hàng trên đường về
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: SƠ ĐỒ DÃY KỆ 2D MẶT BẰNG KHO */}
          {(slottingGroupViewMode === '2d_aisles' || slottingGroupViewMode === 'cards') && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-indigo-600" />
                    Sơ Đồ Dãy Kệ Kho 2D (Warehouse Aisle Blueprint by Category)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Khoảng cách thực tế: Mặt tiền gần bàn đóng gói nhặt nhanh nhất (Zone A), hàng bán đều ở giữa kho (Zone B), hàng chậm lưu trữ sâu (Zone C).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                    Zone A (&lt; 5m)
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                    Zone B (5 - 15m)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                    Zone C (&gt; 15m)
                  </span>
                </div>
              </div>

              {/* Layout Warehouse Blueprint */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Cột Trái: Bàn Đóng Gói & Cửa Xuất (Dock / Packing Station) */}
                <div className="lg:col-span-3 bg-gradient-to-b from-slate-900 to-indigo-950 text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl"></div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-indigo-800/80 pb-3">
                      <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-black">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs uppercase font-extrabold tracking-wider text-amber-400">Hub Đóng Gói</div>
                        <div className="text-sm font-black text-white">Bàn Đóng Gói & Xuất Hàng</div>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-300">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                        <div className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Nguyên Tắc Bố Trí Kệ Vàng:
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-300">
                          Các nhóm hàng chiếm trên <b>60% sản lượng</b> bắt buộc đặt tại <b>Dãy Kệ 01-02</b> ngay sát cửa xuất để giảm 70% số bước chân nhặt hàng hàng ngày.
                        </p>
                      </div>

                      <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                        <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5" /> Chiến Lược Tầng Kệ:
                        </div>
                        <ul className="text-[11px] space-y-1 text-slate-300 list-disc list-inside">
                          <li><b>Tầng 1-2:</b> SKU Hạng A (tầm thắt lưng/ngực)</li>
                          <li><b>Tầng 3:</b> SKU Hạng B (tầm mắt, với chuẩn)</li>
                          <li><b>Tầng 4-5:</b> SKU Hạng C & Thùng nguyên lưu trữ</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-indigo-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Dòng xuất hàng:</span>
                      <span className="text-emerald-400 font-bold">Tối ưu 1 chiều</span>
                    </div>
                    <div className="w-full h-1.5 bg-indigo-900 rounded-full overflow-hidden">
                      <div className="w-full h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-indigo-400"></div>
                    </div>
                  </div>
                </div>

                {/* Cột Phải: Các Dãy Kệ Song Song (Aisles) */}
                <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {groupSlottingMetrics.map((g, idx) => {
                    const isZoneA = g.optimalAisleRecommendation.zoneTag === 'ZONE_A';
                    const isZoneB = g.optimalAisleRecommendation.zoneTag === 'ZONE_B';
                    const isSelected = selectedSlottingGroup === g.groupName;

                    return (
                      <div
                        key={g.groupName}
                        onClick={() => {
                          setSelectedSlottingGroup(isSelected ? 'ALL' : g.groupName);
                        }}
                        className={`cursor-pointer rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'ring-2 ring-blue-600 bg-blue-50/60 border-blue-400 shadow-md'
                            : isZoneA
                            ? 'bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 border-amber-300/80 hover:border-amber-400 hover:shadow-md'
                            : isZoneB
                            ? 'bg-gradient-to-br from-blue-50/40 via-white to-blue-50/20 border-blue-200 hover:border-blue-300 hover:shadow-md'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow'
                        }`}
                      >
                        {/* Header Aisle */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                              isZoneA
                                ? 'bg-amber-500 text-slate-950'
                                : isZoneB
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              <Warehouse className="w-3 h-3" />
                              {g.optimalAisleRecommendation.aisleCode.split('(')[0].trim()}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              {g.optimalAisleRecommendation.distanceLabel}
                            </span>
                          </div>

                          {/* Nhóm Hàng & Sản Lượng */}
                          <div className="pt-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <h4 className="text-base font-black text-slate-900 truncate" title={g.groupName}>
                                {g.groupName}
                              </h4>
                              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                {g.percentageOfWarehouseSold}% kho
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                              <span><b>{g.totalSold.toLocaleString()}</b> PCS</span>
                              <span>•</span>
                              <span><b>{g.skuCount}</b> mã SKU</span>
                              <span>•</span>
                              <span><b>{g.totalOrders.toLocaleString()}</b> đơn</span>
                            </div>
                          </div>

                          {/* Phân Tầng Kệ Thực Tế (Visual 3-Tier Rack) */}
                          <div className="space-y-1.5 pt-2">
                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Phân bổ tầng khuyến nghị:
                            </div>

                            {/* Tầng 1-2 */}
                            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-100/70 border border-amber-200 text-xs">
                              <span className="font-bold text-amber-900 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                                Tầng 1 - 2 (Hạng A):
                              </span>
                              <span className="font-extrabold text-amber-800">
                                {g.classACount} SKU hot
                              </span>
                            </div>

                            {/* Tầng 3 */}
                            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-blue-100/60 border border-blue-200 text-xs">
                              <span className="font-bold text-blue-900 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                Tầng 3 (Hạng B):
                              </span>
                              <span className="font-extrabold text-blue-800">
                                {g.classBCount} SKU đều
                              </span>
                            </div>

                            {/* Tầng 4-5 */}
                            <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                              <span className="font-bold text-slate-700 flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                Tầng 4 - 5 (Hạng C):
                              </span>
                              <span className="font-extrabold text-slate-600">
                                {g.classCCount} SKU chậm
                              </span>
                            </div>
                          </div>

                          {/* Top 3 Hot SKUs trong nhóm */}
                          {g.topHotSkus && g.topHotSkus.length > 0 && (
                            <div className="pt-2">
                              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                                Top SKU nhặt nhiều nhất:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {g.topHotSkus.slice(0, 3).map(sk => (
                                  <span
                                    key={sk.sku}
                                    className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-slate-800"
                                    title={`${sk.productTitle || sk.sku} (${sk.totalSold} PCS)`}
                                  >
                                    {sk.sku} <b className="text-amber-600">({sk.totalSold})</b>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer Card */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-400 text-[11px]">
                            {isSelected ? 'Đang lọc nhóm này' : 'Nhấp để lọc bảng SKU'}
                          </span>
                          <span className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                            Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: THẺ TÓM TẮT TỪNG NHÓM HÀNG (EXPANDED CARDS VIEW) */}
          {slottingGroupViewMode === 'cards' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-blue-600" />
                  Danh Sách Thẻ Chỉ Số Toàn Diện Các Nhóm Hàng ({groupSlottingMetrics.length} Nhóm)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupSlottingMetrics.map((g, idx) => (
                  <div
                    key={g.groupName}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <h4 className="text-base font-black text-slate-900">{g.groupName}</h4>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {g.optimalAisleRecommendation.aisleCode}
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                        g.optimalAisleRecommendation.zoneTag === 'ZONE_A'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : g.optimalAisleRecommendation.zoneTag === 'ZONE_B'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-slate-100 text-slate-800 border border-slate-200'
                      }`}>
                        {g.optimalAisleRecommendation.zoneTag}
                      </span>
                    </div>

                    {/* Progress Bar Tỉ Trọng Bán */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-600">Sản lượng đã xuất:</span>
                        <span className="text-slate-900 font-bold">{g.totalSold.toLocaleString()} PCS ({g.percentageOfWarehouseSold}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                          style={{ width: `${Math.min(100, g.percentageOfWarehouseSold)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Phân Bổ Hạng A / B / C */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                      <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                        <div className="text-[10px] font-bold uppercase text-rose-600">Hạng A (Hot)</div>
                        <div className="text-sm font-black text-rose-700">{g.classACount} mã</div>
                      </div>
                      <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="text-[10px] font-bold uppercase text-blue-600">Hạng B (Đều)</div>
                        <div className="text-sm font-black text-blue-700">{g.classBCount} mã</div>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="text-[10px] font-bold uppercase text-slate-600">Hạng C (Chậm)</div>
                        <div className="text-sm font-black text-slate-700">{g.classCCount} mã</div>
                      </div>
                    </div>

                    {/* Tồn Kho & Hàng Đang Về */}
                    <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-500">Tồn sẵn có: </span>
                        <b className="text-slate-900">{g.totalInUsed.toLocaleString()}</b>
                      </div>
                      <div>
                        <span className="text-slate-500">Đang về: </span>
                        <b className="text-emerald-600">{g.totalOnWay.toLocaleString()}</b>
                      </div>
                    </div>

                    {/* Lý do nghiệp vụ */}
                    <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                      💡 {g.optimalAisleRecommendation.reason}
                    </p>

                    <button
                      onClick={() => {
                        setSelectedSlottingGroup(g.groupName);
                        setSlottingGroupViewMode('table');
                      }}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Xem & Lọc {g.skuCount} SKU Trong Nhóm</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BẢNG CHI TIẾT PHÂN BỔ SKU THEO TẦNG KỆ (DETAILED SKU SLOTTING TABLE) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600" />
                  Bảng Phân Bổ Chi Tiết Từng SKU Theo Dãy & Tầng Kệ
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Định vị chính xác từng SKU vào dãy kệ tương ứng của nhóm và gán tầng kệ 1-5 theo phân hạng ABC.
                </p>
              </div>

              {/* Bộ lọc bảng SKU */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Lọc Nhóm */}
                <select
                  value={selectedSlottingGroup}
                  onChange={(e) => setSelectedSlottingGroup(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Tất Cả Các Nhóm ({groupSlottingMetrics.length})</option>
                  {groupSlottingMetrics.map(g => (
                    <option key={g.groupName} value={g.groupName}>
                      {g.groupName} ({g.skuCount} SKU - {g.percentageOfWarehouseSold}%)
                    </option>
                  ))}
                </select>

                {/* Lọc Hạng ABC */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                  {(['ALL', 'A', 'B', 'C'] as const).map(rk => (
                    <button
                      key={rk}
                      onClick={() => setSlottingGroupAbcFilter(rk)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        slottingGroupAbcFilter === rk
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {rk === 'ALL' ? 'Tất cả' : `Hạng ${rk}`}
                    </button>
                  ))}
                </div>

                {/* Tìm kiếm */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm SKU, tên..."
                    value={slottingGroupSearch}
                    onChange={(e) => setSlottingGroupSearch(e.target.value)}
                    className="pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 sm:w-48"
                  />
                  {slottingGroupSearch && (
                    <button
                      onClick={() => setSlottingGroupSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl">
                  {displayedSlottingSkus.length} SKU
                </span>

                {/* Nút Xuất Excel nhanh theo bộ lọc */}
                <button
                  onClick={() => handleExportGroupSlottingExcel(selectedSlottingGroup !== 'ALL')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                  title="Xuất file Excel danh sách SKU nhóm này hoặc toàn bộ"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{selectedSlottingGroup !== 'ALL' ? `Xuất Excel ${selectedSlottingGroup}` : 'Xuất Excel'}</span>
                </button>

                {/* Nút In bảng danh sách SKU theo nhóm */}
                <button
                  onClick={() => handlePrintGroupSlottingReport(selectedSlottingGroup !== 'ALL')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                  title="In danh sách này ra giấy hoặc PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-300" />
                  <span>{selectedSlottingGroup !== 'ALL' ? `In Nhóm ${selectedSlottingGroup}` : 'In Toàn Bộ'}</span>
                </button>
              </div>
            </div>

            {/* Bảng Hiển Thị SKU */}
            {displayedSlottingSkus.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FolderTree className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">Không tìm thấy mã SKU nào khớp với bộ lọc</p>
                <button
                  onClick={() => {
                    setSelectedSlottingGroup('ALL');
                    setSlottingGroupAbcFilter('ALL');
                    setSlottingGroupSearch('');
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Xóa toàn bộ bộ lọc
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-3 w-12 text-center">STT</th>
                      <th className="py-3 px-3">Nhóm Hàng</th>
                      <th className="py-3 px-3">Mã SKU & Sản Phẩm</th>
                      <th className="py-3 px-3 text-center">Hạng ABC</th>
                      <th className="py-3 px-3">Dãy Kệ Quy Hoạch</th>
                      <th className="py-3 px-3">Phân Bổ Tầng Khuyến Nghị</th>
                      <th className="py-3 px-3 text-right">Sản Lượng (PCS)</th>
                      <th className="py-3 px-3 text-right">Vận Tốc (PCS/ngày)</th>
                      <th className="py-3 px-3 text-right">Tồn Khả Dụng</th>
                      <th className="py-3 px-3 text-right">Đang Về</th>
                      <th className="py-3 px-3 text-center">Xem Tồn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedSlottingSkus.map(({ item, groupName, aisleCode, zoneTag, levelRecommendation }, idx) => (
                      <tr key={item.sku} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                            {groupName}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-900">{item.sku}</div>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs" title={item.productTitle}>
                            {item.productTitle || '-'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-1 rounded-md text-xs font-black ${
                            item.abcRank === 'A'
                              ? 'bg-rose-100 text-rose-700 border border-rose-300'
                              : item.abcRank === 'B'
                              ? 'bg-blue-100 text-blue-700 border border-blue-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            Hạng {item.abcRank}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800 text-[11px]">
                            {aisleCode}
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            zoneTag === 'ZONE_A'
                              ? 'bg-amber-100 text-amber-800'
                              : zoneTag === 'ZONE_B'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {zoneTag}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                            item.abcRank === 'A'
                              ? 'bg-amber-50 text-amber-900 border border-amber-200'
                              : item.abcRank === 'B'
                              ? 'bg-blue-50 text-blue-900 border border-blue-200'
                              : 'bg-slate-50 text-slate-700 border border-slate-200'
                          }`}>
                            {levelRecommendation}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          {item.totalSold.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {item.velocityDaily}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          {item.inUsed ? item.inUsed.toLocaleString() : 0}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                          {item.onWay ? item.onWay.toLocaleString() : 0}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onNavigateToInventory?.(item.sku)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
        </div>
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
