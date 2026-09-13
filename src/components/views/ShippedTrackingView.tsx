import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Play,
  Square,
  Search,
  Filter,
  Download,
  ExternalLink,
  Package,
  ChevronDown,
  ChevronUp,
  CloudDownload,
  Info,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Check,
  XCircle,
  RotateCcw,
  Copy,
  AlertOctagon,
  CheckCheck,
  Zap,
  Activity,
  Timer
} from 'lucide-react';
import { RawOrderRow, SkuGroupsMap } from '../../types';
import { CarrierId, OrderItem, TrackingStatusCategory, TrackingEvent } from '../../types/tracking';
import { CARRIERS, detectCarrier, getDirectTrackingUrl } from '../../services/carrierDetector';
import { trackBatchOrders, trackSingleOrder, classifyLogisticsStatus, createOrderItem } from '../../services/trackingService';

const SHIPPED_ORDERS_KEY = 'shipped_orders_v1';
const SHIPPED_TRACKING_KEY = 'shipped_tracking_v1';

interface ShippedTrackingViewProps {
  skuGroups: SkuGroupsMap;
}

export const ShippedTrackingView: React.FC<ShippedTrackingViewProps> = ({
  skuGroups,
}) => {
  // --- Đơn Shipped: Fixed cache từ localStorage, KHÔNG auto-fetch khi F5 ---
  const [shippedOrders, setShippedOrders] = useState<RawOrderRow[]>(() => {
    try {
      const saved = localStorage.getItem(SHIPPED_ORDERS_KEY);
      if (saved) return JSON.parse(saved) as RawOrderRow[];
    } catch (e) {}
    return [];
  });

  // --- Kết quả tracking ĐVVC: cũng fixed cache từ localStorage ---
  const [trackingResults, setTrackingResults] = useState<Record<string, Partial<OrderItem>>>(() => {
    try {
      const saved = localStorage.getItem(SHIPPED_TRACKING_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  // Lưu tracking results vào localStorage sau mỗi lần quét (tự động persist)
  useEffect(() => {
    try {
      localStorage.setItem(SHIPPED_TRACKING_KEY, JSON.stringify(trackingResults));
    } catch (e) {}
  }, [trackingResults]);

  // --- WMS Fetch State (CHỈ hoạt động khi bấm nút thủ công, KHÔNG tự fetch khi F5) ---
  const [isFetchingWms, setIsFetchingWms] = useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(() => {
    try { return localStorage.getItem('shipped_last_fetched_at'); } catch { return null; }
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);

  const [isBatchChecking, setIsBatchChecking] = useState<boolean>(false);
  const [checkingProgress, setCheckingProgress] = useState<{ completed: number; total: number; speed: number; etaSeconds: number }>({
    completed: 0,
    total: 0,
    speed: 0,
    etaSeconds: 0
  });

  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedOrderKey, setExpandedOrderKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const stopRequestedRef = useRef<boolean>(false);

  // Kéo đơn Shipped (E11=8) từ YunWMS và MERGE vào cache (chỉ thêm đơn mới, không xóa cũ)
  const fetchShippedFromWms = async () => {
    if (isFetchingWms) return;
    setIsFetchingWms(true);
    setFetchError(null);
    setNewOrdersCount(0);
    try {
      const res = await fetch('/api/wms/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse: '7',
          status: '8',
          pageSize: 500,
          maxPages: 0,
          username: 'David',
          password: '12345abc',
        }),
      });
      if (!res.ok) throw new Error(`Lỗi kết nối API: HTTP ${res.status}`);
      const data = await res.json();
      if (data.orders && Array.isArray(data.orders)) {
        const existingNos = new Set(shippedOrders.map(o => o.orderNo));
        const newOrders = (data.orders as RawOrderRow[]).filter(o => !existingNos.has(o.orderNo));
        const merged = [...newOrders, ...shippedOrders];
        setShippedOrders(merged);
        setNewOrdersCount(newOrders.length);
        try { localStorage.setItem(SHIPPED_ORDERS_KEY, JSON.stringify(merged)); } catch (e) {}
        const fetchTime = new Date().toLocaleString('vi-VN');
        setLastFetchedAt(fetchTime);
        try { localStorage.setItem('shipped_last_fetched_at', fetchTime); } catch (e) {}
      } else {
        throw new Error(data.message || 'Không nhận được dữ liệu từ WMS');
      }
    } catch (err: any) {
      setFetchError(err.message || 'Lỗi không xác định khi kết nối WMS');
    } finally {
      setIsFetchingWms(false);
    }
  };

  // Xóa toàn bộ cache Shipped (bấm nút thủ công)
  const handleClearShippedCache = () => {
    if (!confirm(`Xóa toàn bộ ${shippedOrders.length} đơn Shipped và kết quả tracking đã lưu trong cache?`)) return;
    setShippedOrders([]);
    setTrackingResults({});
    setLastFetchedAt(null);
    setNewOrdersCount(0);
    try {
      localStorage.removeItem(SHIPPED_ORDERS_KEY);
      localStorage.removeItem(SHIPPED_TRACKING_KEY);
      localStorage.removeItem('shipped_last_fetched_at');
    } catch (e) {}
  };

  // Map đơn Shipped (fixed cache) vào tracking order list để hiển thị
  const trackingOrderItems = useMemo(() => {
    const now = Date.now();
    return shippedOrders.map((o, idx) => {
      const code = o.trackingNo || o.orderNo || `ORDER-${idx}`;
      const carrierId = detectCarrier(code, o.carrierName || o.carrier);
      const existing = trackingResults[code] || {};

      // Estimate age in days from creation or shipped time
      let ageDays = 1;
      const timeStr = o.shippedTime || o.creationTime || o.rawOrderText?.match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/)?.[0];
      if (timeStr) {
        try {
          const dt = new Date(timeStr.replace(/-/g, '/'));
          if (!isNaN(dt.getTime())) {
            const diffHours = (now - dt.getTime()) / (1000 * 3600);
            if (diffHours >= 48) {
              ageDays = 3;
            } else if (diffHours >= 24) {
              ageDays = 2;
            } else {
              ageDays = 1;
            }
          }
        } catch {
          ageDays = 1;
        }
      }

      return {
        id: `shipped-${idx}-${code}`,
        orderNo: o.orderNo,
        trackingCode: o.trackingNo || o.orderNo,
        carrier: carrierId,
        carrierName: o.carrierName || CARRIERS[carrierId]?.shortName || carrierId,
        statusCategory: (existing.statusCategory || 'not_scanned') as TrackingStatusCategory,
        rawStatusText: existing.rawStatusText || 'Chưa tra cứu',
        statusDetail: existing.statusDetail || 'Đang chờ gọi API ĐVVC...',
        scannedAt: existing.scannedAt,
        updatedAt: existing.updatedAt,
        timeline: existing.timeline || [],
        isChecking: Boolean(existing.isChecking),
        error: existing.error,
        directUrl: getDirectTrackingUrl(carrierId, o.trackingNo || o.orderNo),
        skuText: o.rawPieceText || o.rawOrderText || '',
        quantity: o.totalQty || 1,
        pickingList: o.pickingList || '',
        shippedTime: o.shippedTime || timeStr || '',
        ageDays
      };
    });
  }, [shippedOrders, trackingResults]);

  // Comprehensive statistics calculation
  const stats = useMemo(() => {
    const total = trackingOrderItems.length;
    let checked = 0;
    let scanned = 0;
    let notScanned = 0;
    let inTransit = 0;
    let delivered = 0;
    let returned = 0;
    let cancelled = 0;
    let error = 0;

    let unscanned1Day = 0;
    let unscanned2Days = 0;
    let unscanned3PlusDays = 0;

    trackingOrderItems.forEach(item => {
      if (item.rawStatusText !== 'Chưa tra cứu' && !item.isChecking) {
        checked++;
      }
      switch (item.statusCategory) {
        case 'scanned':
          scanned++;
          break;
        case 'not_scanned':
          notScanned++;
          if (item.ageDays === 1) unscanned1Day++;
          else if (item.ageDays === 2) unscanned2Days++;
          else unscanned3PlusDays++;
          break;
        case 'in_transit':
          inTransit++;
          break;
        case 'delivered':
          delivered++;
          break;
        case 'returned':
          returned++;
          break;
        case 'cancelled':
          cancelled++;
          break;
        case 'error':
          error++;
          break;
        default:
          notScanned++;
          unscanned1Day++;
      }
    });

    const percentComplete = total > 0 ? Math.round((checked / total) * 100) : 0;
    const scannedTotal = scanned + inTransit + delivered;
    const scannedRate = total > 0 ? Math.round((scannedTotal / total) * 100) : 0;
    const unscannedRate = total > 0 ? Math.round((notScanned / total) * 100) : 0;
    const cancelledRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

    return {
      total,
      checked,
      scanned,
      notScanned,
      inTransit,
      delivered,
      returned,
      cancelled,
      error,
      unscanned1Day,
      unscanned2Days,
      unscanned3PlusDays,
      percentComplete,
      scannedRate,
      unscannedRate,
      cancelledRate,
      scannedTotal
    };
  }, [trackingOrderItems]);

  // Single row track execution
  const handleSingleTrack = async (code: string, carrier: CarrierId) => {
    setTrackingResults(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        isChecking: true,
        rawStatusText: 'Đang kết nối API...',
        statusDetail: 'Đang gửi Yêu cầu API realtime...'
      }
    }));

    try {
      const res = await trackSingleOrder(code, carrier, undefined, true);
      setTrackingResults(prev => ({
        ...prev,
        [code]: {
          carrier: res.carrier,
          statusCategory: res.statusCategory,
          rawStatusText: res.rawStatusText,
          statusDetail: res.statusDetail,
          scannedAt: res.scannedAt,
          updatedAt: res.updatedAt,
          timeline: res.timeline,
          isChecking: false,
          error: res.error
        }
      }));
    } catch (err: any) {
      setTrackingResults(prev => ({
        ...prev,
        [code]: {
          ...prev[code],
          isChecking: false,
          statusCategory: 'error',
          rawStatusText: 'Lỗi tra cứu API',
          statusDetail: err.message || 'Không thể kết nối API',
          error: err.message
        }
      }));
    }
  };

  // Batch lookup execution (Processes in real-time chunks with Loading states)
  const handleStartBatchTrack = async (onlyUnscanned: boolean = false) => {
    const listToProcess = onlyUnscanned
      ? filteredItems.filter(o => o.statusCategory === 'not_scanned' || o.rawStatusText === 'Chưa tra cứu')
      : filteredItems;

    if (listToProcess.length === 0 || isBatchChecking) return;

    setIsBatchChecking(true);
    stopRequestedRef.current = false;

    const itemsToTrack = listToProcess.map(o => ({
      code: o.trackingCode,
      carrier: o.carrier,
      cellphone: ''
    }));

    const total = itemsToTrack.length;
    let completed = 0;
    const startTime = Date.now();

    const BATCH_SIZE = 25;
    for (let i = 0; i < itemsToTrack.length; i += BATCH_SIZE) {
      if (stopRequestedRef.current) break;

      const chunk = itemsToTrack.slice(i, i + BATCH_SIZE);

      // 1. Mark ONLY the current active chunk items with Loading state
      setTrackingResults(prev => {
        const next = { ...prev };
        chunk.forEach(item => {
          next[item.code] = {
            ...next[item.code],
            isChecking: true,
            rawStatusText: `Đang gọi API ${item.carrier.toUpperCase()}...`,
            statusDetail: 'Đang kết nối cổng vận chuyển lấy hành trình...'
          };
        });
        return next;
      });

      // 2. Fetch tracking API for current chunk
      const batchRes = await trackBatchOrders(chunk);

      // 3. Update chunk items with actual response and clear isChecking flag
      setTrackingResults(prev => {
        const next = { ...prev };
        for (const [code, res] of Object.entries(batchRes)) {
          next[code] = {
            ...next[code],
            carrier: res.carrier,
            statusCategory: res.statusCategory,
            rawStatusText: res.rawStatusText,
            statusDetail: res.statusDetail,
            scannedAt: res.scannedAt,
            updatedAt: res.updatedAt,
            timeline: res.timeline,
            isChecking: false,
            error: res.error
          };
        }
        return next;
      });

      completed += chunk.length;
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speed = elapsedSec > 0 ? Math.round((completed / elapsedSec) * 10) / 10 : 0;
      const remainingItems = total - completed;
      const etaSeconds = speed > 0 ? Math.round(remainingItems / speed) : 0;

      setCheckingProgress({
        completed,
        total,
        speed,
        etaSeconds
      });
    }

    setIsBatchChecking(false);
  };

  // Đã tắt chế độ tự động quét ngầm trên trình duyệt để không tốn CPU máy tính.
  // Toàn bộ việc quét được thực hiện hoàn toàn trên GitHub Actions Cloud.

  const handleStopBatchTrack = () => {
    stopRequestedRef.current = true;
    setIsBatchChecking(false);
  };

  const handleCopyCodes = () => {
    const codes = filteredItems.map(i => i.trackingCode).join('\n');
    navigator.clipboard.writeText(codes);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Export results to CSV/Excel
  const handleExportReport = () => {
    const headers = ['STT', 'Mã Đơn WMS', 'Mã Vận Đơn', 'Hãng Vận Chuyển', 'Trạng Thái Scan', 'Chi Tiết Trạng Thái', 'Thời Gian Scan', 'Picking List', 'Tổng Số Lượng'];
    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      item.orderNo,
      item.trackingCode,
      item.carrierName,
      item.rawStatusText,
      item.statusDetail,
      item.scannedAt || item.shippedTime || '',
      item.pickingList,
      item.quantity
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bao_Cao_Tracking_Shipped_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered orders list with Date Range Support (01/09 - 06/09)
  const filteredItems = useMemo(() => {
    return trackingOrderItems.filter(item => {
      // Date filter (01/09 - 06/09, 3DAYS, 7DAYS)
      if (selectedDateFilter === '01_06_SEP') {
        const orderNoUpper = item.orderNo.toUpperCase();
        const shippedTimeStr = item.shippedTime || '';
        const isSep01To06 = 
          orderNoUpper.includes('260901') || orderNoUpper.includes('260902') || orderNoUpper.includes('260903') || 
          orderNoUpper.includes('260904') || orderNoUpper.includes('260905') || orderNoUpper.includes('260906') ||
          /2026-09-0[1-6]/.test(shippedTimeStr) || /0[1-6]\/09\/2026/.test(shippedTimeStr);
        if (!isSep01To06) return false;
      }
      if (selectedDateFilter === '3DAYS' && item.ageDays > 3) {
        return false;
      }
      if (selectedDateFilter === '7DAYS' && item.ageDays > 7) {
        return false;
      }

      // Carrier filter
      if (selectedCarrierFilter !== 'ALL' && item.carrier !== selectedCarrierFilter) {
        return false;
      }

      // Age category filter
      if (selectedStatusFilter === 'unscanned_1day') {
        return item.statusCategory === 'not_scanned' && item.ageDays === 1;
      }
      if (selectedStatusFilter === 'unscanned_2days') {
        return item.statusCategory === 'not_scanned' && item.ageDays === 2;
      }
      if (selectedStatusFilter === 'unscanned_3days') {
        return item.statusCategory === 'not_scanned' && item.ageDays >= 3;
      }

      // General Status filter
      if (selectedStatusFilter !== 'ALL' && item.statusCategory !== selectedStatusFilter) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const matchCode = item.trackingCode.toLowerCase().includes(term);
        const matchOrderNo = item.orderNo.toLowerCase().includes(term);
        const matchSku = item.skuText.toLowerCase().includes(term);
        const matchCarrier = item.carrierName.toLowerCase().includes(term);
        if (!matchCode && !matchOrderNo && !matchSku && !matchCarrier) {
          return false;
        }
      }
      return true;
    });
  }, [trackingOrderItems, selectedCarrierFilter, selectedStatusFilter, selectedDateFilter, searchTerm]);

  const getStatusBadge = (category: TrackingStatusCategory, rawText: string) => {
    switch (category) {
      case 'scanned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{rawText || 'Đã scan lấy hàng'}</span>
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Truck className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>{rawText || 'Đang vận chuyển'}</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-900 border border-green-400">
            <Sparkles className="w-3.5 h-3.5 text-green-700" />
            <span>{rawText || 'Giao thành công'}</span>
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span>{rawText || 'Chuyển hoàn'}</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{rawText || 'Đã hủy'}</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>{rawText || 'Lỗi tra cứu'}</span>
          </span>
        );
      case 'not_scanned':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{rawText || 'Chưa scan lấy hàng'}</span>
          </span>
        );
    }
  };

  const cards = [
    {
      id: 'ALL',
      label: 'Tổng vận đơn',
      count: stats.total,
      subtext: `${stats.checked}/${stats.total} (${stats.percentComplete}%) đã kiểm tra`,
      icon: Package,
      borderColor: selectedStatusFilter === 'ALL' ? 'ring-2 ring-slate-900 border-slate-900' : 'border-slate-200',
      bgClass: 'bg-white',
      badgeClass: 'bg-slate-100 text-slate-800',
    },
    {
      id: 'not_scanned',
      label: 'CHƯA SCAN (Chờ lấy)',
      count: stats.notScanned,
      subtext: `${stats.unscannedRate}% chưa tới lấy`,
      icon: Clock,
      borderColor: selectedStatusFilter === 'not_scanned' || selectedStatusFilter.startsWith('unscanned') ? 'ring-2 ring-amber-600 border-amber-600' : 'border-amber-200',
      bgClass: 'bg-amber-50/50',
      badgeClass: 'bg-amber-100 text-amber-900 font-bold',
    },
    {
      id: 'scanned',
      label: 'ĐÃ SCAN (Đã lấy/giao)',
      count: stats.scannedTotal,
      subtext: `${stats.scannedRate}% bưu cục đã nhận`,
      icon: CheckCircle2,
      borderColor: selectedStatusFilter === 'scanned' ? 'ring-2 ring-emerald-600 border-emerald-600' : 'border-emerald-200',
      bgClass: 'bg-emerald-50/40',
      badgeClass: 'bg-emerald-100 text-emerald-900 font-bold',
    },
    {
      id: 'cancelled',
      label: 'ĐÃ HỦY (Cần giữ lại)',
      count: stats.cancelled,
      subtext: `${stats.cancelledRate}% đơn hủy`,
      icon: AlertOctagon,
      borderColor: selectedStatusFilter === 'cancelled' ? 'ring-2 ring-rose-600 border-rose-600' : 'border-rose-200',
      bgClass: 'bg-rose-50/50',
      badgeClass: 'bg-rose-100 text-rose-900 font-bold',
    },
    {
      id: 'in_transit',
      label: 'Đang vận chuyển',
      count: stats.inTransit,
      subtext: 'Đang luân chuyển / Giao',
      icon: Truck,
      borderColor: selectedStatusFilter === 'in_transit' ? 'ring-2 ring-indigo-600 border-indigo-600' : 'border-slate-200',
      bgClass: 'bg-white',
      badgeClass: 'bg-indigo-50 text-indigo-800 font-semibold',
    },
    {
      id: 'delivered',
      label: 'Giao thành công',
      count: stats.delivered,
      subtext: 'Khách đã nhận hàng',
      icon: CheckCheck,
      borderColor: selectedStatusFilter === 'delivered' ? 'ring-2 ring-teal-600 border-teal-600' : 'border-slate-200',
      bgClass: 'bg-white',
      badgeClass: 'bg-teal-50 text-teal-800 font-semibold',
    }
  ];

  return (
    <div className="space-y-5">
      {/* 1. Live Progress Bar Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono flex items-center">
              {isBatchChecking && <Activity className="w-3.5 h-3.5 mr-1 text-emerald-600 animate-pulse" />}
              TIẾN ĐỘ QUÉT LIVE API
            </span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {stats.checked.toLocaleString()} / {stats.total.toLocaleString()} ({stats.percentComplete}%)
            </span>
            {isBatchChecking ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-emerald-400 border border-slate-700 animate-pulse font-mono">
                <Zap className="w-3 h-3 mr-1 text-amber-400" />
                Đang quét thủ công bằng máy tính...
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                Cache cố định – F5 không mất dữ liệu · {shippedOrders.length} đơn
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-medium">
            {isBatchChecking && checkingProgress.speed > 0 && (
              <div className="flex items-center space-x-3 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-mono text-xs">
                <span className="text-emerald-950 font-bold flex items-center">
                  <Timer className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                  Dự kiến: {checkingProgress.etaSeconds}s
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-emerald-900 font-semibold flex items-center">
                  <Zap className="w-3.5 h-3.5 mr-1 text-amber-500" />
                  {checkingProgress.speed.toFixed(1)} đơn/s
                </span>
              </div>
            )}

            <div className="hidden md:flex items-center space-x-3 text-xs font-semibold">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500 mr-1.5"></span>
                Đã lấy: <strong className="ml-1 text-emerald-800 font-mono">{stats.scannedRate}%</strong>
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 mr-1.5"></span>
                Chưa lấy: <strong className="ml-1 text-amber-800 font-mono">{stats.unscannedRate}%</strong>
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 mr-1.5"></span>
                Hủy: <strong className="ml-1 text-rose-800 font-mono">{stats.cancelledRate}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Multi-segment visual progress bar */}
        <div className="w-full bg-slate-100 rounded-lg h-3 flex overflow-hidden border border-slate-200/80 shadow-inner">
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${stats.total > 0 ? (stats.scanned / stats.total) * 100 : 0}%` }}
            title={`Đã Scan: ${stats.scanned}`}
          />
          <div
            className="bg-indigo-500 transition-all duration-300"
            style={{ width: `${stats.total > 0 ? (stats.inTransit / stats.total) * 100 : 0}%` }}
            title={`Đang Vận Chuyển: ${stats.inTransit}`}
          />
          <div
            className="bg-teal-500 transition-all duration-300"
            style={{ width: `${stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0}%` }}
            title={`Giao Thành Công: ${stats.delivered}`}
          />
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${stats.total > 0 ? (stats.notScanned / stats.total) * 100 : 0}%` }}
            title={`Chưa Scan: ${stats.notScanned}`}
          />
          <div
            className="bg-rose-500 transition-all duration-300"
            style={{ width: `${stats.total > 0 ? (stats.cancelled / stats.total) * 100 : 0}%` }}
            title={`Đã Hủy: ${stats.cancelled}`}
          />
          <div
            className="bg-slate-400 transition-all duration-300"
            style={{ width: `${stats.total > 0 ? (stats.error / stats.total) * 100 : 0}%` }}
            title={`Lỗi / Không thấy: ${stats.error}`}
          />
        </div>
      </div>

      {/* 2. Geometric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isSelected = selectedStatusFilter === card.id || 
            (card.id === 'not_scanned' && (selectedStatusFilter === 'unscanned_1day' || selectedStatusFilter === 'unscanned_2days' || selectedStatusFilter === 'unscanned_3days'));

          return (
            <button
              key={card.id}
              onClick={() => setSelectedStatusFilter(card.id)}
              className={`text-left p-3.5 rounded-xl border transition-all relative cursor-pointer hover:shadow-xs ${card.bgClass} ${card.borderColor}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className={`p-1.5 rounded-lg ${card.badgeClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-900 bg-slate-200/80 px-1.5 py-0.5 rounded font-mono">
                    Đang xem
                  </span>
                )}
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                {card.count.toLocaleString()}
              </div>
              <div className="text-xs font-bold text-slate-800 truncate mt-0.5">
                {card.label}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                {card.subtext}
              </div>
              {card.id === 'not_scanned' && card.count > 0 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isBatchChecking) {
                      handleStartBatchTrack(true);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`mt-2 w-full inline-flex items-center justify-center px-2 py-1.5 text-[11px] font-bold rounded-lg transition-all shadow-2xs ${
                    isBatchChecking 
                      ? 'bg-amber-200/60 text-amber-800 cursor-not-allowed opacity-70' 
                      : 'bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-amber-950 border border-amber-500/60 cursor-pointer'
                  }`}
                  title="Cập nhật lại trạng thái các đơn Chưa Scan này"
                >
                  <RotateCcw className="w-3 h-3 mr-1 text-amber-950 shrink-0" />
                  <span>Cập nhật lại ({card.count.toLocaleString()})</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Bóc tách đơn Chưa Scan theo ngày tuổi */}
      {stats.notScanned > 0 && (
        <div className="bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-orange-50/80 rounded-xl p-3.5 sm:p-4 border border-amber-200 shadow-2xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-md bg-amber-200/80 text-amber-900">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider font-mono">
                  BÓC TÁCH ĐƠN CHƯA SCAN THEO NGÀY TUỔI (CHỜ ĐÓNG HÀNG / CHỜ BƯU TÁ)
                </h4>
                <p className="text-[11px] text-amber-800 font-medium">
                  Tổng <strong>{stats.notScanned.toLocaleString()}</strong> đơn hàng đang chờ kho đóng gói hoặc chờ bưu tá đến quét lấy:
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setSelectedStatusFilter('not_scanned')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg font-mono transition-all cursor-pointer ${
                  selectedStatusFilter === 'not_scanned'
                    ? 'bg-amber-900 text-white shadow-2xs'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                }`}
              >
                Xem tất cả Chưa Scan ({stats.notScanned})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {/* 1 Day Old */}
            <button
              onClick={() => setSelectedStatusFilter('unscanned_1day')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                selectedStatusFilter === 'unscanned_1day'
                  ? 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                  : 'bg-white/90 border-emerald-200 hover:bg-emerald-50/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center text-[11px] font-bold text-emerald-900 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                  1 NGÀY TUỔI (Mới tạo)
                </span>
                <span className="font-mono font-black text-sm text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded">
                  {stats.unscanned1Day.toLocaleString()} đơn
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 mt-1">
                Tạo trong ngày / 24h qua. Đang trong quy trình đóng gói & chờ bưu tá lấy ca hôm nay.
              </p>
            </button>

            {/* 2 Days Old */}
            <button
              onClick={() => setSelectedStatusFilter('unscanned_2days')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                selectedStatusFilter === 'unscanned_2days'
                  ? 'bg-amber-100 border-amber-600 ring-2 ring-amber-600 shadow-xs'
                  : 'bg-white/90 border-amber-300 hover:bg-amber-50/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center text-[11px] font-bold text-amber-950 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5"></span>
                  2 NGÀY TUỔI (Cần ưu tiên)
                </span>
                <span className="font-mono font-black text-sm text-amber-950 bg-amber-200/80 px-2 py-0.5 rounded">
                  {stats.unscanned2Days.toLocaleString()} đơn
                </span>
              </div>
              <p className="text-[11px] text-amber-900 mt-1">
                Tạo 24h - 48h trước. Cần ưu tiên đóng gói và giục bưu tá đến quét lấy ngay.
              </p>
            </button>

            {/* 3+ Days Old (Overdue alert) */}
            <button
              onClick={() => setSelectedStatusFilter('unscanned_3days')}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer relative ${
                selectedStatusFilter === 'unscanned_3days'
                  ? 'bg-rose-100 border-rose-600 ring-2 ring-rose-600 shadow-xs'
                  : 'bg-white/90 border-rose-300 hover:bg-rose-50/80'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center text-[11px] font-bold text-rose-950 font-mono">
                  <span className="w-2 h-2 rounded-full bg-rose-600 mr-1.5 animate-ping"></span>
                  ≥ 3 NGÀY TUỔI (TỒN ĐỌNG)
                </span>
                <span className="font-mono font-black text-sm text-rose-950 bg-rose-200 px-2 py-0.5 rounded">
                  {stats.unscanned3PlusDays.toLocaleString()} đơn
                </span>
              </div>
              <p className="text-[11px] text-rose-900 mt-1">
                ⚠️ Tồn đọng từ 3 ngày trở lên! Cần kiểm tra kho xem đã đóng chưa hoặc bưu cục bỏ sót đơn.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* 4. Batch Control Buttons & Action Bar with Date Range Pickers */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {!isBatchChecking ? (
              <button
                onClick={() => handleStartBatchTrack(false)}
                disabled={filteredItems.length === 0}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Quét toàn bộ ({filteredItems.length} đơn)</span>
              </button>
            ) : (
              <button
                onClick={handleStopBatchTrack}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Dừng Tra Cứu</span>
              </button>
            )}

            {/* Quick Date Range Selectors */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 px-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Ngày:
              </span>
              {[
                { id: 'ALL', label: 'Tất cả ngày' },
                { id: '01_06_SEP', label: '🗓️ 01/09 - 06/09' },
                { id: '3DAYS', label: '3 ngày gần nhất' },
                { id: '7DAYS', label: '7 ngày gần nhất' }
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDateFilter(d.id)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedDateFilter === d.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleStartBatchTrack(true)}
              disabled={isBatchChecking || stats.notScanned === 0}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs border border-amber-600 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>CẬP NHẬT CHƯA SCAN ({stats.notScanned})</span>
            </button>

            <button
              onClick={fetchShippedFromWms}
              disabled={isFetchingWms || isBatchChecking}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              title="Kéo thêm đơn Shipped (E11=8) mới từ YunWMS và merge vào cache (chỉ thêm đơn mới, không xóa cũ)"
            >
              <CloudDownload className={`w-3.5 h-3.5 text-emerald-600 ${isFetchingWms ? 'animate-bounce' : ''}`} />
              <span>{isFetchingWms ? 'Đang kéo WMS...' : '⬇️ Kéo đơn Shipped mới'}</span>
              {lastFetchedAt && !isFetchingWms && (
                <span className="text-[10px] bg-emerald-200 text-emerald-950 px-1.5 py-0.5 rounded font-mono ml-1">
                  {lastFetchedAt}
                </span>
              )}
              {newOrdersCount > 0 && !isFetchingWms && (
                <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-mono ml-1 animate-pulse">
                  +{newOrdersCount} mới
                </span>
              )}
            </button>

            <button
              onClick={handleClearShippedCache}
              disabled={shippedOrders.length === 0}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Xóa toàn bộ cache đơn Shipped và kết quả tracking đã lưu"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Xóa cache ({shippedOrders.length})</span>
            </button>

            <button
              onClick={handleCopyCodes}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copySuccess ? 'Đã sao chép!' : 'Sao chép mã...'}</span>
            </button>

            <button
              onClick={handleExportReport}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Xuất báo cáo</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm mã vận đơn, SĐT..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Error Banner (khi kéo WMS thất bại) */}
        {fetchError && (
          <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="flex-1">{fetchError}</span>
            <button onClick={() => setFetchError(null)} className="text-rose-400 hover:text-rose-600 cursor-pointer">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Carrier Selector & Status Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `Tất cả (${filteredItems.length})` },
              { id: 'not_scanned', label: `Chưa scan (${stats.notScanned})` },
              { id: 'scanned', label: `Đã scan (${stats.scannedTotal})` },
              { id: 'cancelled', label: `Đã hủy (${stats.cancelled})` },
              { id: 'in_transit', label: `Đang giao (${stats.inTransit})` },
              { id: 'delivered', label: `Thành công (${stats.delivered})` }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStatusFilter(s.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedStatusFilter === s.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Hãng:
            </span>
            <select
              value={selectedCarrierFilter}
              onChange={e => setSelectedCarrierFilter(e.target.value)}
              className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Tất cả hãng</option>
              <option value="ghn">GHN</option>
              <option value="spx">Shopee Express (SPX)</option>
              <option value="jt">J&T Express</option>
              <option value="ninjavan">Ninja Van</option>
              <option value="vnpost">VNPost</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Main Tracking Order Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">STT</th>
                <th className="py-3 px-4">Mã Đơn / Mã Vận Đơn</th>
                <th className="py-3 px-4">ĐVVC</th>
                <th className="py-3 px-4">Trạng Thái Scan</th>
                <th className="py-3 px-4">Thời Gian Scan / Xuất Kho</th>
                <th className="py-3 px-4">Chi Tiết Đơn Hàng</th>
                <th className="py-3 px-4 text-center">Hành Trình</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-sm text-slate-600">
                      {shippedOrders.length === 0 ? 'Chưa có đơn Shipped nào trong cache' : 'Không tìm thấy đơn hàng phù hợp với bộ lọc'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {shippedOrders.length === 0
                        ? 'Bấm "⬇️ Kéo đơn Shipped mới" để lấy đơn E11=8 từ YunWMS'
                        : 'Thử chọn "Tất cả ngày" hoặc bỏ bộ lọc ĐVVC'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => {
                  const isExpanded = expandedOrderKey === item.id;
                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold">
                          <div className="text-slate-900 flex items-center gap-1.5">
                            <span>{item.trackingCode}</span>
                            <a
                              href={item.directUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-indigo-600 transition-colors"
                              title="Mở trang tra cứu chính thức của hãng"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleSingleTrack(item.trackingCode, item.carrier)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                              title="Quét lại mốc API đơn này"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${item.isChecking ? 'animate-spin text-amber-500' : ''}`} />
                            </button>
                          </div>
                          {item.orderNo && item.orderNo !== item.trackingCode && (
                            <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                              Mã đơn: {item.orderNo}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.carrierName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.isChecking ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse shadow-xs">
                              <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                              <span>Đang gọi API {item.carrierName}...</span>
                            </span>
                          ) : (
                            getStatusBadge(item.statusCategory, item.rawStatusText)
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {item.scannedAt ? (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {item.scannedAt}
                            </span>
                          ) : item.shippedTime ? (
                            <span className="text-slate-600">
                              {item.shippedTime}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa có mốc giờ</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium max-w-xs truncate" title={item.skuText}>
                            {item.skuText || '---'}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            {item.pickingList && <span>PL: {item.pickingList}</span>}
                            <span>Tổng SL: {item.quantity}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setExpandedOrderKey(isExpanded ? null : item.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>{item.timeline.length} mốc</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Timeline Section */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 pb-2 border-b border-slate-100">
                                <span>Hành trình chi tiết đơn {item.trackingCode} ({item.carrierName})</span>
                                <span className="text-slate-500 font-normal">{item.statusDetail}</span>
                              </div>

                              {item.timeline.length === 0 ? (
                                <p className="text-xs text-slate-500 italic py-2">
                                  Chưa có lịch sử mốc scan được ghi nhận từ cổng vận chuyển.
                                </p>
                              ) : (
                                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-2">
                                  {item.timeline.map((step, sIdx) => (
                                    <div key={sIdx} className="flex items-start gap-3 text-xs">
                                      <span className="font-mono font-bold text-slate-500 w-32 shrink-0 pt-0.5">
                                        {step.time}
                                      </span>
                                      <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                                      <div className="flex-1">
                                        <p className="font-bold text-slate-900">{step.statusText}</p>
                                        {step.location && (
                                          <p className="text-slate-500 text-[11px] mt-0.5">{step.location}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
