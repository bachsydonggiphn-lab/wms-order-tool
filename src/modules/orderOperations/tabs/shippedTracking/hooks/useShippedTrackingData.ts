import { useState, useMemo, useEffect, useRef } from 'react';
import { RawOrderRow } from '../../../../../types';
import { CarrierId, OrderItem, TrackingStatusCategory } from '../../../../../types/tracking';
import { CARRIERS, detectCarrier, getDirectTrackingUrl } from '../../../../../services/carrierDetector';
import { trackBatchOrders, trackSingleOrder } from '../../../../../services/trackingService';
import { TrackingOrderItemView, ShippedStats, CheckingProgress } from '../types';

export const SHIPPED_ORDERS_KEY = 'shipped_orders_v1';
export const SHIPPED_TRACKING_KEY = 'shipped_tracking_v1';

export function useShippedTrackingData() {
  const [shippedOrders, setShippedOrders] = useState<RawOrderRow[]>(() => {
    try {
      const saved = localStorage.getItem(SHIPPED_ORDERS_KEY);
      if (saved) return JSON.parse(saved) as RawOrderRow[];
    } catch (e) {}
    return [];
  });

  const [trackingResults, setTrackingResults] = useState<Record<string, Partial<OrderItem>>>(() => {
    try {
      const saved = localStorage.getItem(SHIPPED_TRACKING_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(SHIPPED_TRACKING_KEY, JSON.stringify(trackingResults));
    } catch (e) {}
  }, [trackingResults]);

  const [isFetchingWms, setIsFetchingWms] = useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(() => {
    try { return localStorage.getItem('shipped_last_fetched_at'); } catch { return null; }
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState<number>(0);

  const [isBatchChecking, setIsBatchChecking] = useState<boolean>(false);
  const [checkingProgress, setCheckingProgress] = useState<CheckingProgress>({
    completed: 0,
    total: 0,
    speed: 0,
    etaSeconds: 0,
  });

  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedOrderKey, setExpandedOrderKey] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  const stopRequestedRef = useRef<boolean>(false);

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

  const trackingOrderItems: TrackingOrderItemView[] = useMemo(() => {
    const now = Date.now();
    return shippedOrders.map((o, idx) => {
      const code = o.trackingNo || o.orderNo || `ORDER-${idx}`;
      const carrierId = detectCarrier(code, o.carrierName || o.carrier);
      const existing = trackingResults[code] || {};

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
        ageDays,
      };
    });
  }, [shippedOrders, trackingResults]);

  const stats: ShippedStats = useMemo(() => {
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
      scannedTotal,
    };
  }, [trackingOrderItems]);

  const filteredItems = useMemo(() => {
    return trackingOrderItems.filter(item => {
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

      if (selectedCarrierFilter !== 'ALL' && item.carrier !== selectedCarrierFilter) {
        return false;
      }

      if (selectedStatusFilter === 'unscanned_1day') {
        return item.statusCategory === 'not_scanned' && item.ageDays === 1;
      }
      if (selectedStatusFilter === 'unscanned_2days') {
        return item.statusCategory === 'not_scanned' && item.ageDays === 2;
      }
      if (selectedStatusFilter === 'unscanned_3days') {
        return item.statusCategory === 'not_scanned' && item.ageDays >= 3;
      }

      if (selectedStatusFilter !== 'ALL' && item.statusCategory !== selectedStatusFilter) {
        return false;
      }

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

  const handleSingleTrack = async (code: string, carrier: CarrierId) => {
    setTrackingResults(prev => ({
      ...prev,
      [code]: {
        ...prev[code],
        isChecking: true,
        rawStatusText: 'Đang kết nối API...',
        statusDetail: 'Đang gửi Yêu cầu API realtime...',
      },
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
          error: res.error,
        },
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
          error: err.message,
        },
      }));
    }
  };

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
      cellphone: '',
    }));

    const total = itemsToTrack.length;
    let completed = 0;
    const startTime = Date.now();

    const BATCH_SIZE = 25;
    for (let i = 0; i < itemsToTrack.length; i += BATCH_SIZE) {
      if (stopRequestedRef.current) break;

      const chunk = itemsToTrack.slice(i, i + BATCH_SIZE);

      setTrackingResults(prev => {
        const next = { ...prev };
        chunk.forEach(item => {
          next[item.code] = {
            ...next[item.code],
            isChecking: true,
            rawStatusText: `Đang gọi API ${item.carrier.toUpperCase()}...`,
            statusDetail: 'Đang kết nối cổng vận chuyển lấy hành trình...',
          };
        });
        return next;
      });

      const batchRes = await trackBatchOrders(chunk);

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
            error: res.error,
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
        etaSeconds,
      });
    }

    setIsBatchChecking(false);
  };

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
      item.quantity,
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

  return {
    shippedOrders,
    isFetchingWms,
    lastFetchedAt,
    fetchError,
    setFetchError,
    newOrdersCount,
    isBatchChecking,
    checkingProgress,
    selectedCarrierFilter,
    setSelectedCarrierFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    selectedDateFilter,
    setSelectedDateFilter,
    searchTerm,
    setSearchTerm,
    expandedOrderKey,
    setExpandedOrderKey,
    copySuccess,
    trackingOrderItems,
    stats,
    filteredItems,
    fetchShippedFromWms,
    handleClearShippedCache,
    handleSingleTrack,
    handleStartBatchTrack,
    handleStopBatchTrack,
    handleCopyCodes,
    handleExportReport,
  };
}
