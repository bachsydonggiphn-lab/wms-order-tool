import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Radio,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  Warehouse,
  Sparkles,
  Package,
  Layers,
  Truck,
  Check,
  FileSpreadsheet,
  Trash2,
  Settings,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RawOrderRow, SkuGroupsMap } from '../types';
import { playOrderAlertSound } from '../utils/audioAlert';
import { tinhTongHopSKU } from '../utils/orderProcessor';
import { TelegramBotSettingsModal } from './TelegramBotSettingsModal';
import {
  TelegramBotConfig,
  loadTelegramConfig,
  saveTelegramConfig,
  formatTelegramReport,
  sendTelegramMessage,
  WmsStatusCounts,
} from '../services/telegramService';

export interface RealTimeTrackerBarProps {
  orders?: RawOrderRow[];
  currentOrders?: RawOrderRow[];
  onNewOrders?: (newOrders: RawOrderRow[]) => void;
  onNewOrdersDetected?: (newOrders: RawOrderRow[]) => void;
  onReloadStatusOrders?: (orders: RawOrderRow[], statusName?: string) => void;
  onSwitchStatus?: (targetStatus: WmsStatusKey) => void;
  skuGroups?: SkuGroupsMap;
  pickingLists?: string[];
  totalSkus?: number;
  totalPcs?: number;
  onOpenWmsSync?: () => void;
  onLoadSample?: () => void;
  onClear?: () => void;
}

export type WmsStatusKey = '5' | '4' | '8';

export interface StatusConfig {
  key: WmsStatusKey;
  label: string;
  shortLabel: string;
  desc: string;
  badgeBg: string;
  badgeBorder: string;
  activeBg: string;
  icon: string;
}

export const WMS_STATUS_CONFIG: Record<WmsStatusKey, StatusConfig> = {
  '5': {
    key: '5',
    label: 'Shelved (Đã lên kệ kho)',
    shortLabel: 'Shelved (5)',
    desc: 'Đơn đã phân bổ kệ & có Picking List',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    badgeBorder: 'border-amber-400/40',
    activeBg: 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/30',
    icon: '⭐',
  },
  '4': {
    key: '4',
    label: 'Submitted. (Chờ xử lý / Đã tạo)',
    shortLabel: 'Submitted (4)',
    desc: 'Đơn mới tạo từ sàn, chờ kho nhặt hàng',
    badgeBg: 'bg-blue-500/20 text-blue-300',
    badgeBorder: 'border-blue-400/40',
    activeBg: 'bg-blue-600 text-white ring-4 ring-blue-500/30',
    icon: '⚡',
  },
  '8': {
    key: '8',
    label: 'Shipped (Đã đóng gói / Xuất kho hôm nay)',
    shortLabel: 'Shipped Hôm Nay (8)',
    desc: 'Đơn đã đóng gói & xuất kho trong ngày hôm nay',
    badgeBg: 'bg-emerald-500/20 text-emerald-300',
    badgeBorder: 'border-emerald-400/40',
    activeBg: 'bg-emerald-600 text-white ring-4 ring-emerald-500/30',
    icon: '🚚',
  },
};

export const RealTimeTrackerBar: React.FC<RealTimeTrackerBarProps> = ({
  orders,
  currentOrders,
  onNewOrders,
  onNewOrdersDetected,
  onReloadStatusOrders,
  onSwitchStatus,
  skuGroups = {},
  pickingLists,
  totalSkus: propTotalSkus,
  totalPcs: propTotalPcs,
  onOpenWmsSync,
  onLoadSample,
  onClear,
}) => {
  const effectiveOrders = orders || currentOrders || [];
  const effectiveOnNewOrders = onNewOrders || onNewOrdersDetected;

  // Tính toán các thông số tổng hợp Đơn, SKU, PCS, Lists
  const skuSummary = useMemo(() => {
    return tinhTongHopSKU(effectiveOrders, '', 'ALL');
  }, [effectiveOrders]);

  const totalSkus = propTotalSkus !== undefined ? propTotalSkus : Object.keys(skuSummary).length;
  const totalPcs =
    propTotalPcs !== undefined
      ? propTotalPcs
      : Object.values(skuSummary).reduce((a: number, b: number) => a + b, 0);

  const totalLists = useMemo(() => {
    if (pickingLists !== undefined) return pickingLists.length;
    const set = new Set<string>();
    effectiveOrders.forEach((o) => {
      if (o.pickingList && o.pickingList.trim() !== '') {
        set.add(o.pickingList.trim());
      }
    });
    return set.size;
  }, [pickingLists, effectiveOrders]);

  // Trạng thái bắt live thời gian thực: Tự động khôi phục từ localStorage hoặc mặc định BẬT
  const [isLive, setIsLive] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wms_auto_refresh_is_live');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [status, setStatus] = useState<WmsStatusKey>(() => {
    try {
      const saved = localStorage.getItem('wms_auto_refresh_status');
      return (saved === '4' || saved === '5' || saved === '8') ? saved : '4';
    } catch {
      return '4';
    }
  });

  const [intervalSec, setIntervalSec] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('wms_auto_refresh_interval'));
      return [5, 10, 15, 30].includes(saved) ? saved : 10;
    } catch {
      return 10;
    }
  });

  const [autoReplace, setAutoReplace] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wms_auto_refresh_replace');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // State cấu hình Telegram Bot
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramBotConfig>(() => loadTelegramConfig());

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wms_auto_refresh_sound');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [warehouse, setWarehouse] = useState<string>(() => {
    try {
      return localStorage.getItem('wms_auto_refresh_warehouse') || '7';
    } catch {
      return '7';
    }
  });

  // Trạng thái theo dõi
  const [countdown, setCountdown] = useState<number>(intervalSec);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isSwitchingStatus, setIsSwitchingStatus] = useState<boolean>(false);
  const [totalInWms, setTotalInWms] = useState<number | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('wms_auto_status_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [sessionNewCount, setSessionNewCount] = useState<number>(0);
  const [lastDetectedOrders, setLastDetectedOrders] = useState<RawOrderRow[]>([]);
  const [latestOrderNo, setLatestOrderNo] = useState<string>('');
  const [lastCheckTime, setLastCheckTime] = useState<string>('');
  const [justSynced, setJustSynced] = useState<boolean>(false);
  const [isSseConnected, setIsSseConnected] = useState<boolean>(false);

  // Lưu cài đặt vào localStorage khi người dùng thay đổi
  useEffect(() => {
    try { localStorage.setItem('wms_auto_refresh_is_live', String(isLive)); } catch {}
  }, [isLive]);

  useEffect(() => {
    try { localStorage.setItem('wms_auto_refresh_status', status); } catch {}
  }, [status]);

  useEffect(() => {
    try { localStorage.setItem('wms_auto_refresh_interval', String(intervalSec)); } catch {}
  }, [intervalSec]);

  useEffect(() => {
    try { localStorage.setItem('wms_auto_refresh_replace', String(autoReplace)); } catch {}
  }, [autoReplace]);

  useEffect(() => {
    try { localStorage.setItem('wms_auto_refresh_warehouse', warehouse); } catch {}
  }, [warehouse]);

  useEffect(() => {
    try { localStorage.setItem('wms_auto_refresh_sound', String(soundEnabled)); } catch {}
  }, [soundEnabled]);

  useEffect(() => {
    try { localStorage.setItem('wms_auto_status_counts', JSON.stringify(statusCounts)); } catch {}
  }, [statusCounts]);

  // Tự động gửi báo cáo Telegram cho bot khi được BẬT
  useEffect(() => {
    if (!telegramConfig.enabled || !telegramConfig.chatId || !telegramConfig.botToken) {
      return;
    }

    const checkAndSendTelegram = async () => {
      const counts: WmsStatusCounts = {
        submitted: statusCounts['4'] ?? 0,
        shelved: statusCounts['5'] ?? 0,
        shipped: statusCounts['8'] ?? 0,
      };

      // Chỉ gửi khi đã có dữ liệu (ít nhất 1 chỉ số > 0)
      if (counts.submitted === 0 && counts.shelved === 0 && counts.shipped === 0) {
        return;
      }

      const lastCounts = telegramConfig.lastCounts || {};
      const isChanged =
        counts.submitted !== lastCounts.submitted ||
        counts.shelved !== lastCounts.shelved ||
        counts.shipped !== lastCounts.shipped;

      const now = Date.now();
      const lastSentTime = telegramConfig.lastSentAt ? new Date(telegramConfig.lastSentAt).getTime() : 0;
      const intervalMs = (telegramConfig.intervalMinutes || 30) * 60 * 1000;
      const isDue = (now - lastSentTime) >= intervalMs;

      if (isDue && (!telegramConfig.onlyOnChange || isChanged)) {
        try {
          const reportText = formatTelegramReport(counts, {
            ...telegramConfig,
            warehouse: warehouseRef.current || warehouse,
          });

          const res = await sendTelegramMessage({
            botToken: telegramConfig.botToken,
            chatId: telegramConfig.chatId,
            text: reportText,
            silent: telegramConfig.silent,
          });

          if (res.ok) {
            const updatedConfig: TelegramBotConfig = {
              ...telegramConfig,
              lastSentAt: new Date().toISOString(),
              lastCounts: counts,
            };
            setTelegramConfig(updatedConfig);
            saveTelegramConfig(updatedConfig);
            console.log('[TelegramBot] Đã gửi báo cáo đơn hàng định kỳ thành công tới @WMSHCMBOT');
          }
        } catch (e) {
          console.error('[TelegramBot] Lỗi gửi báo cáo định kỳ:', e);
        }
      }
    };

    const intervalTimer = setInterval(checkAndSendTelegram, 30000);
    const timeoutTimer = setTimeout(checkAndSendTelegram, 5000);

    return () => {
      clearInterval(intervalTimer);
      clearTimeout(timeoutTimer);
    };
  }, [telegramConfig, statusCounts, warehouse]);

  // Refs để tránh closure stale state trong setInterval & Bộ nhớ đệm chuyển đổi siêu tốc
  const countdownIntervalRef = useRef<any>(null);
  const ordersRef = useRef<RawOrderRow[]>(effectiveOrders);
  const statusRef = useRef<WmsStatusKey>(status);
  const warehouseRef = useRef<string>(warehouse);
  const autoReplaceRef = useRef<boolean>(autoReplace);
  const isPollingRef = useRef<boolean>(false);
  const soundEnabledRef = useRef<boolean>(soundEnabled);
  const skuGroupsRef = useRef<SkuGroupsMap>(skuGroups);
  const initialFetchDoneRef = useRef<boolean>(false);
  const switchAbortControllerRef = useRef<AbortController | null>(null);

  // Hàm thẩm định tính hợp lệ của cache theo trạng thái WMS
  const isCacheValid = useCallback((targetSt: WmsStatusKey, list: RawOrderRow[] | undefined, expectedCount?: number): boolean => {
    if (!list || !Array.isArray(list) || list.length === 0) return false;
    // Status 4 (Submitted): Tuyệt đối chưa có Picking List
    if (targetSt === '4') {
      const hasPickingList = list.some((o) => o.pickingList && o.pickingList.trim() !== '');
      if (hasPickingList) return false;
    }
    // Status 5 (Shelved): Đơn đã lên kệ, hầu hết phải có Picking List
    if (targetSt === '5') {
      const hasPickingList = list.some((o) => o.pickingList && o.pickingList.trim() !== '');
      if (!hasPickingList && list.length > 50) return false;
    }
    // Nếu có expectedCount (từ statusCounts) và lệch quá nhiều (lớn hơn 50 đơn), coi như cache đã cũ
    if (expectedCount && Math.abs(list.length - expectedCount) > 50) {
      return false;
    }
    return true;
  }, []);

  const statusOrdersCacheRef = useRef<Record<string, RawOrderRow[]>>((() => {
    try {
      const c4Str = sessionStorage.getItem('wms_cache_orders_4');
      const c5Str = sessionStorage.getItem('wms_cache_orders_5');
      const c4 = c4Str ? JSON.parse(c4Str) : null;
      const c5 = c5Str ? JSON.parse(c5Str) : null;
      
      const res: Record<string, RawOrderRow[]> = {};
      if (c4 && Array.isArray(c4) && !c4.some((o: RawOrderRow) => o.pickingList && o.pickingList.trim() !== '')) {
        res['4'] = c4;
      } else if (c4Str) {
        sessionStorage.removeItem('wms_cache_orders_4');
      }

      if (c5 && Array.isArray(c5)) {
        res['5'] = c5;
      }
      return res;
    } catch {
      return {};
    }
  })());
  const lastWmsTotalRef = useRef<number | null>(null);

  // Chỉ cập nhật ref orders hiện tại - KHÔNG ghi đè vào cache trạng thái ở đây để tránh race condition
  useEffect(() => {
    ordersRef.current = effectiveOrders;
  }, [effectiveOrders]);

  useEffect(() => {
    skuGroupsRef.current = skuGroups;
  }, [skuGroups]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    warehouseRef.current = warehouse;
  }, [warehouse]);

  useEffect(() => {
    autoReplaceRef.current = autoReplace;
  }, [autoReplace]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // 1. Hàm tự động làm mới: Khi đến chu kỳ 10s, tự động kéo dữ liệu mới nhất từ WMS và cập nhật trực tiếp vào bảng
  const executeAutoRefresh = async (forceFullReload: boolean = false) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    setIsPolling(true);

    const currentStatus = statusRef.current;
    const currentWarehouse = warehouseRef.current;
    const isReplaceMode = autoReplaceRef.current;
    const currentOrders = ordersRef.current || [];

    try {
      if (isReplaceMode || forceFullReload || currentOrders.length === 0) {
        // CHẾ ĐỘ XÓA CŨ & KÉO MỚI (MẶC ĐỊNH): Tự động kéo bản danh sách đơn mới nhất từ WMS và cập nhật bảng
        const res = await fetch('/api/wms/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse: currentWarehouse,
            status: currentStatus,
            pageSize: 500,
            maxPages: 0,
            forceRefresh: true,
            username: 'David',
            password: '12345abc',
            skuGroups: skuGroupsRef.current,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            const freshOrders = data.orders;
            statusOrdersCacheRef.current[currentStatus] = freshOrders;
            try {
              sessionStorage.setItem('wms_cache_orders_' + currentStatus, JSON.stringify(freshOrders.slice(0, 5000)));
            } catch {}

            setTotalInWms(data.totalOrders);
            lastWmsTotalRef.current = data.totalOrders;
            if (freshOrders.length > 0) setLatestOrderNo(freshOrders[0].orderNo);
            const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            setLastCheckTime(nowStr);
            setJustSynced(true);
            setTimeout(() => setJustSynced(false), 2000);

            setStatusCounts((prev) => ({
              ...prev,
              [currentStatus]: data.totalOrders,
            }));

            // Cập nhật lại toàn bộ bảng danh sách đơn hàng mà không cần người dùng click!
            const statusConfig = WMS_STATUS_CONFIG[currentStatus];
            if (onReloadStatusOrders) {
              onReloadStatusOrders(freshOrders, statusConfig.shortLabel);
            } else if (effectiveOnNewOrders) {
              effectiveOnNewOrders(freshOrders);
            }

            // Phát hiện đơn mới để báo chuông
            const prevIds = new Set(currentOrders.map(o => o.orderNo));
            const newCount = freshOrders.filter(o => !prevIds.has(o.orderNo)).length;
            if (newCount > 0) {
              setSessionNewCount((prev) => prev + newCount);
              if (soundEnabledRef.current) {
                playOrderAlertSound();
              }
            }
          }
        }

        // Kéo ngầm số lượng của các trạng thái còn lại để cập nhật số trên nút
        const otherStatus = currentStatus === '4' ? '5' : '4';
        fetch('/api/wms/poll-new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse: currentWarehouse,
            status: otherStatus,
            pageSize: 1,
            username: 'David',
            password: '12345abc',
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            if (d.success) {
              if (d.statusCounts) {
                setStatusCounts((prev) => ({
                  ...prev,
                  ...d.statusCounts,
                }));
              } else if (d.totalOrders !== undefined) {
                setStatusCounts((prev) => ({
                  ...prev,
                  [otherStatus]: d.totalOrders,
                }));
              }
            }
          })
          .catch(() => {});

        return;
      }

      // CHẾ ĐỘ CỘNG DỒN: Chỉ quét và thêm đơn mới vào danh sách hiện tại
      const known = currentOrders.slice(0, 100).map((o) => o?.orderNo).filter(Boolean);
      const res = await fetch('/api/wms/poll-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          knownOrderNos: known,
          warehouse: currentWarehouse,
          status: currentStatus,
          pageSize: 60,
          username: 'David',
          password: '12345abc',
          skuGroups: skuGroupsRef.current,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastCheckTime(nowStr);
          setJustSynced(true);
          setTimeout(() => setJustSynced(false), 2000);

          if (data.statusCounts) {
            setStatusCounts((prev) => ({
              ...prev,
              ...data.statusCounts,
            }));
          }

          setTotalInWms(data.totalOrders);
          if (data.latestOrderNo) setLatestOrderNo(data.latestOrderNo);

          if (data.hasNew && Array.isArray(data.newOrders) && data.newOrders.length > 0) {
            const freshOrders: RawOrderRow[] = data.newOrders.map((o: RawOrderRow) => ({
              ...o,
              isRealTimeNew: true,
              newTimestamp: Date.now(),
            }));

            if (soundEnabledRef.current) playOrderAlertSound();
            setSessionNewCount((prev) => prev + freshOrders.length);
            setLastDetectedOrders(freshOrders);
            if (effectiveOnNewOrders) effectiveOnNewOrders(freshOrders);
          }
        }
      }
    } catch (err) {
      console.warn('Real-Time auto-refresh error:', err);
    } finally {
      isPollingRef.current = false;
      setIsPolling(false);
    }
  };

  // 2. Chuyển trạng thái siêu tốc: Thẩm định cache chặt chẽ, abort request cũ, hiển thị loading rõ ràng
  const switchStatusAndFetch = async (targetStatus: WmsStatusKey, forceFetch = false) => {
    // 1. Hủy bất kỳ tiến trình fetch trước đó đang dở dang
    if (switchAbortControllerRef.current) {
      switchAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    switchAbortControllerRef.current = abortController;

    setStatus(targetStatus);
    statusRef.current = targetStatus;
    setIsSwitchingStatus(true);

    const cached = statusOrdersCacheRef.current[targetStatus];
    const statusConfig = WMS_STATUS_CONFIG[targetStatus];
    const isCacheLegit = !forceFetch && isCacheValid(targetStatus, cached, statusCounts[targetStatus]);

    if (isCacheLegit && cached && cached.length > 0) {
      // Dữ liệu đệm hợp lệ -> hiển thị ngay lập tức
      if (onReloadStatusOrders) {
        onReloadStatusOrders(cached, statusConfig.shortLabel);
      } else if (effectiveOnNewOrders) {
        effectiveOnNewOrders(cached);
      }
      setTotalInWms(cached.length);
    } else {
      // Dữ liệu đệm không hợp lệ hoặc không có -> dọn sạch đơn cũ tránh tình trạng hiển thị nhầm đơn trạng thái khác
      if (onReloadStatusOrders) {
        onReloadStatusOrders([], statusConfig.shortLabel);
      }
      setTotalInWms(null);
    }

    isPollingRef.current = true;
    setSessionNewCount(0);
    setLastDetectedOrders([]);

    try {
      // Tải dữ liệu trạng thái mới: Lấy toàn bộ đơn hàng từ YunWMS
      const res = await fetch('/api/wms/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          warehouse: warehouseRef.current,
          status: targetStatus,
          pageSize: 500,
          maxPages: 0,
          forceRefresh: true,
          username: 'David',
          password: '12345abc',
          skuGroups: skuGroupsRef.current,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Kiểm tra xem trạng thái người dùng đang xem có còn là targetStatus không
        if (statusRef.current !== targetStatus) return;

        if (data.success && Array.isArray(data.orders)) {
          statusOrdersCacheRef.current[targetStatus] = data.orders;
          try {
            sessionStorage.setItem('wms_cache_orders_' + targetStatus, JSON.stringify(data.orders.slice(0, 5000)));
          } catch {}
          setTotalInWms(data.totalOrders);
          lastWmsTotalRef.current = data.totalOrders;
          if (data.orders.length > 0) setLatestOrderNo(data.orders[0].orderNo);
          const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setLastCheckTime(nowStr);

          // Cập nhật số lượng của trạng thái vừa kéo
          setStatusCounts((prev) => ({
            ...prev,
            [targetStatus]: data.totalOrders,
          }));

          if (onReloadStatusOrders) {
            onReloadStatusOrders(data.orders, statusConfig.shortLabel);
          } else if (effectiveOnNewOrders) {
            effectiveOnNewOrders(data.orders);
          }

          if (soundEnabledRef.current && (!cached || cached.length === 0)) {
            playOrderAlertSound();
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error switching status:', err);
      }
    } finally {
      if (statusRef.current === targetStatus) {
        setIsSwitchingStatus(false);
        isPollingRef.current = false;
        setIsPolling(false);
        setIsLive(true);
        setCountdown(intervalSec);
      }
    }
  };

  // 3. TỰ ĐỘNG CHẠY KHI MỞ TRANG: Tự động tải trạng thái hiện tại VÀ ngầm kéo trước trạng thái đối ứng
  useEffect(() => {
    if (isLive && !initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      switchStatusAndFetch(status).then(() => {
        // Tự động tải trước (Pre-fetch) trạng thái còn lại trong nền
        const otherStatus = status === '4' ? '5' : '4';
        if (!statusOrdersCacheRef.current[otherStatus] || statusOrdersCacheRef.current[otherStatus].length === 0) {
          fetch('/api/wms/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              warehouse: warehouseRef.current,
              status: otherStatus,
              pageSize: 500,
              maxPages: 0,
              username: 'David',
              password: '12345abc',
              skuGroups: skuGroupsRef.current,
            }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.success && Array.isArray(d.orders)) {
                statusOrdersCacheRef.current[otherStatus] = d.orders;
                setStatusCounts((prev) => ({
                  ...prev,
                  [otherStatus]: d.totalOrders
                }));
                try {
                  sessionStorage.setItem('wms_cache_orders_' + otherStatus, JSON.stringify(d.orders.slice(0, 5000)));
                } catch {}
              }
            })
            .catch(() => {});
        }
      });
    }
  }, []);

  // 4. Vòng lặp đếm ngược và quét liên tục theo thời gian thực (fallback khi không có SSE)
  useEffect(() => {
    if (!isLive) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    setCountdown(intervalSec);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setTimeout(() => {
            executeAutoRefresh();
          }, 10);
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isLive, intervalSec, status, warehouse]);

  // 5. Kết nối Server-Sent Events (SSE) thời gian thực với backend
  useEffect(() => {
    if (!isLive) {
      setIsSseConnected(false);
      return;
    }

    const sseUrl = `/api/wms/live-stream?warehouse=${warehouse}`;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => {
          setIsSseConnected(true);
        };

        eventSource.addEventListener('init', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            if (data.counts) {
              setStatusCounts((prev) => ({ ...prev, ...data.counts }));
              if (data.counts[statusRef.current] !== undefined) {
                setTotalInWms(data.counts[statusRef.current]);
              }
            }
          } catch {}
        });

        eventSource.addEventListener('heartbeat', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            if (data.counts) {
              setStatusCounts((prev) => ({ ...prev, ...data.counts }));
            }
            if (data.timestamp) {
              setLastCheckTime(data.timestamp);
            }
          } catch {}
        });

        eventSource.addEventListener('wms_pulse', (e: any) => {
          try {
            const data = JSON.parse(e.data);
            const currentStatus = statusRef.current;
            if (data.counts) {
              setStatusCounts((prev) => ({ ...prev, ...data.counts }));
              if (data.counts[currentStatus] !== undefined) {
                setTotalInWms(data.counts[currentStatus]);
              }
            }
            if (data.timestamp) {
              setLastCheckTime(data.timestamp);
            }

            // Kiểm tra xem trạng thái đang xem (Submitted hoặc Shelved) có biến động không
            const isStatus4Changed = currentStatus === '4' && data.status4?.changed;
            const isStatus5Changed = currentStatus === '5' && data.status5?.changed;

            if (isStatus4Changed || isStatus5Changed) {
              setJustSynced(true);
              setTimeout(() => setJustSynced(false), 2000);
              // Kích hoạt nạp dữ liệu mới ngay lập tức không cần đợi 10s
              executeAutoRefresh(true);
            }
          } catch (err) {
            console.warn('SSE wms_pulse parse error:', err);
          }
        });

        eventSource.onerror = () => {
          setIsSseConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Tự động thử kết nối lại sau 3s
          reconnectTimeout = setTimeout(connectSSE, 3000);
        };
      } catch (err) {
        setIsSseConnected(false);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      setIsSseConnected(false);
    };
  }, [isLive, warehouse]);

  const handleSwitchStatus = (targetStatus: WmsStatusKey) => {
    setIsLive(true);
    switchStatusAndFetch(targetStatus);
    if (onSwitchStatus) {
      onSwitchStatus(targetStatus);
    }
  };

  const handleToggleLive = () => {
    const nextLive = !isLive;
    setIsLive(nextLive);
    if (nextLive) {
      setCountdown(intervalSec);
      executeAutoRefresh(true);
    }
  };

  const currentConfig = WMS_STATUS_CONFIG[status];

  return (
    <div className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-indigo-900/60 shadow-lg lg:sticky lg:top-14 z-20">
      <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-2.5 space-y-2">
        {/* ROW 1: 4 STATS (ĐƠN, SKU, PCS, LISTS) & 3 ACTIONS (ĐỒNG BỘ YUNWMS, DỮ LIỆU MẪU, XÓA) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-800/80">
          {/* Left: 4 Stat Cards */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1.5 sm:gap-2.5 w-full sm:w-auto">
            {/* ĐƠN */}
            <div className="bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 rounded-xl px-2.5 sm:px-3 py-1 flex items-center gap-2 shadow-2xs transition-colors shrink-0">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shadow-xs shadow-indigo-400"></span>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">Đơn</div>
                <div className="text-xs sm:text-sm font-black text-white leading-tight font-mono">{effectiveOrders.length}</div>
              </div>
            </div>

            {/* SKU */}
            <div className="bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 rounded-xl px-2.5 sm:px-3 py-1 flex items-center gap-2 shadow-2xs transition-colors shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-400"></span>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">SKU</div>
                <div className="text-xs sm:text-sm font-black text-white leading-tight font-mono">{totalSkus}</div>
              </div>
            </div>

            {/* PCS */}
            <div className="bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 rounded-xl px-2.5 sm:px-3 py-1 flex items-center gap-2 shadow-2xs transition-colors shrink-0">
              <span className="w-2 h-2 rounded-full bg-purple-500 shadow-xs shadow-purple-400"></span>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">PCS</div>
                <div className="text-xs sm:text-sm font-black text-white leading-tight font-mono">{totalPcs}</div>
              </div>
            </div>

            {/* LISTS */}
            <div className="bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 rounded-xl px-2.5 sm:px-3 py-1 flex items-center gap-2 shadow-2xs transition-colors shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs shadow-amber-300"></span>
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">Lists</div>
                <div className="text-xs sm:text-sm font-black text-white leading-tight font-mono">{totalLists}</div>
              </div>
            </div>
          </div>

          {/* Right: 3 Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 overflow-x-auto no-scrollbar">
            {onOpenWmsSync && (
              <button
                type="button"
                onClick={onOpenWmsSync}
                title="Kết nối trực tiếp YunWMS để lấy đơn Submitted"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/30 border border-blue-400/40 transition-all cursor-pointer hover:scale-102 active:scale-98 shrink-0"
              >
                <span className="text-amber-300">⚡</span>
                <span className="hidden sm:inline">Đồng Bộ YunWMS</span>
                <span className="sm:hidden">YunWMS</span>
              </button>
            )}

            {onLoadSample && (
              <button
                type="button"
                onClick={onLoadSample}
                title="Tải 22 đơn hàng mẫu để kiểm tra tính năng"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-850 hover:bg-slate-750 text-slate-200 border border-slate-700 transition-colors cursor-pointer shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Dữ liệu mẫu</span>
                <span className="sm:hidden">Mẫu</span>
              </button>
            )}

            {effectiveOrders.length > 0 && onClear && (
              <button
                type="button"
                onClick={onClear}
                title="Xóa toàn bộ dữ liệu đơn hàng cũ"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Xóa</span>
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: CONTROLS & TRẠNG THÁI */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 lg:gap-3">
          
          {/* CỤM 1: BỘ 3 NÚT CHUYỂN TRẠNG THÁI VỚI SỐ LƯỢNG REALTIME */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 w-full lg:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold shrink-0">
              <span className="text-amber-400">⚡</span>
              <span className="hidden sm:inline font-bold">AUTO-REFRESH:</span>
              <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 sm:px-2.5 py-1 rounded-lg border font-mono font-bold transition-all shrink-0 ${
                isLive
                  ? isSseConnected
                    ? justSynced
                      ? 'bg-amber-400/30 text-amber-200 border-amber-400 ring-2 ring-amber-400/50 shadow-lg animate-pulse'
                      : 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50 shadow-sm'
                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}>
                {isLive ? (
                  isSseConnected ? (
                    <>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>{justSynced ? '⚡ Synced!' : `🟢 Live (2s)`}</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                      <span>{justSynced ? '⚡ Đã đồng bộ' : `Tự chạy (${countdown}s)`}</span>
                    </>
                  )
                ) : (
                  <span>Tạm dừng</span>
                )}
              </span>
            </div>

            {/* Nút 1: Submitted (4) */}
            <button
              onClick={() => handleSwitchStatus('4')}
              title="Kéo trạng thái Submit mới nhất (Đã tạo / Chờ xử lý kho) và tự chạy làm mới"
              className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm shrink-0 ${
                status === '4'
                  ? WMS_STATUS_CONFIG['4'].activeBg
                  : 'bg-slate-800/90 hover:bg-slate-700 text-blue-200/90 border border-slate-700'
              }`}
            >
              <span>
                {status === '4' && isSwitchingStatus ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white inline-block" />
                ) : (
                  WMS_STATUS_CONFIG['4'].icon
                )}
              </span>
              <span className="hidden sm:inline">Submitted (E11=4)</span>
              <span className="sm:hidden">Submit</span>
              {statusCounts['4'] !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  status === '4' ? 'bg-white text-blue-900' : 'bg-blue-500/30 text-blue-200 border border-blue-400/40'
                }`}>
                  {statusCounts['4']}
                </span>
              )}
              {status === '4' && isLive && !isSwitchingStatus && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              )}
            </button>

            {/* Nút 2: Shelved (5) */}
            <button
              onClick={() => handleSwitchStatus('5')}
              title="Kéo đơn Shelved (Đã lên kệ kho, có Picking List) và tự chạy làm mới"
              className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm shrink-0 ${
                status === '5'
                  ? WMS_STATUS_CONFIG['5'].activeBg
                  : 'bg-slate-800/90 hover:bg-slate-700 text-amber-200/90 border border-slate-700'
              }`}
            >
              <span>
                {status === '5' && isSwitchingStatus ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300 inline-block" />
                ) : (
                  WMS_STATUS_CONFIG['5'].icon
                )}
              </span>
              <span className="hidden sm:inline">Shelved (E11=5)</span>
              <span className="sm:hidden">Shelved</span>
              {statusCounts['5'] !== undefined && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  status === '5' ? 'bg-slate-900 text-amber-300' : 'bg-amber-500/30 text-amber-200 border border-amber-400/40'
                }`}>
                  {statusCounts['5']}
                </span>
              )}
              {status === '5' && isLive && !isSwitchingStatus && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping"></span>
              )}
            </button>

            {/* Nút 3: Shipped Hôm Nay (8) */}
            <button
              onClick={() => handleSwitchStatus('8')}
              title={`Kéo đơn Shipped hôm nay (Đã đóng gói & xuất kho: ${(statusCounts['8'] ?? totalInWms ?? 0).toLocaleString('vi-VN')} đơn) và tự chạy làm mới`}
              className={`px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shadow-sm shrink-0 ${
                status === '8'
                  ? WMS_STATUS_CONFIG['8'].activeBg
                  : 'bg-slate-800/90 hover:bg-slate-700 text-emerald-200/90 border border-slate-700'
              }`}
            >
              <span>
                {status === '8' && isSwitchingStatus ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white inline-block" />
                ) : (
                  WMS_STATUS_CONFIG['8'].icon
                )}
              </span>
              <span className="hidden sm:inline">Shipped Hôm Nay (E11=8)</span>
              <span className="sm:hidden">Shipped HN</span>
              {(statusCounts['8'] !== undefined || (status === '8' && totalInWms !== null)) && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  status === '8' ? 'bg-white text-emerald-900' : 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/40'
                }`}>
                  {(statusCounts['8'] ?? totalInWms ?? 0) > 9999
                    ? `${((statusCounts['8'] ?? totalInWms ?? 0) / 1000).toFixed(1)}k`
                    : (statusCounts['8'] ?? totalInWms ?? 0).toLocaleString('vi-VN')}
                </span>
              )}
              {status === '8' && isLive && !isSwitchingStatus && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
              )}
            </button>

            {/* Nút Cài đặt Telegram Bot (icon bánh răng cưa) */}
            <button
              onClick={() => setIsTelegramModalOpen(true)}
              title="Cài đặt tự động gửi báo cáo Telegram Bot (@WMSHCMBOT)"
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0 border ${
                telegramConfig.enabled
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/50 hover:bg-sky-500/30 ring-2 ring-sky-400/20'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Settings className={`w-3.5 h-3.5 ${telegramConfig.enabled ? 'animate-spin text-sky-400' : 'text-slate-400'}`} style={{ animationDuration: '6s' }} />
              <span className="hidden sm:inline">Bot Telegram</span>
              <span className="sm:hidden">Bot</span>
              {telegramConfig.enabled && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
              )}
            </button>

            {/* Loading badge khi chuyển đổi trạng thái */}
            {isSwitchingStatus && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/25 text-amber-300 border border-amber-400/50 text-xs font-bold animate-pulse shrink-0 shadow-sm">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                <span>Đang tải {currentConfig.shortLabel}...</span>
              </div>
            )}
          </div>

          {/* CỤM 2: CONTROLS - LIVE, CONFIG */}
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs overflow-x-auto no-scrollbar py-0.5 w-full lg:w-auto">
            
            {/* Công tắc Chế độ: Xóa cũ & Kéo mới mỗi 10s */}
            <button
              onClick={() => setAutoReplace(!autoReplace)}
              title={
                autoReplace
                  ? 'Đang bật: Mỗi chu kỳ tự động xóa dữ liệu cũ và kéo lại trạng thái mới nhất'
                  : 'Đang tắt: Mỗi chu kỳ chỉ giữ dữ liệu cũ và cộng dồn đơn mới'
              }
              className={`px-2 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                autoReplace
                  ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-200 border border-blue-400/50 shadow-xs'
                  : 'bg-slate-800/90 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${autoReplace ? 'text-blue-300' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">{autoReplace ? '🔄 Xóa cũ & Kéo mới' : '➕ Cộng dồn'}</span>
              <span className="sm:hidden">{autoReplace ? '🔄 Xóa&Kéo' : '➕ Cộng'}</span>
            </button>

            {/* Công tắc BẬT / TẮT LIVE */}
            <button
              onClick={handleToggleLive}
              className={`px-2 sm:px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer ${
                isLive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
              }`}
            >
              <div className="relative flex items-center justify-center w-3 h-3">
                {isLive ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </>
                ) : (
                  <span className="inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
                )}
              </div>
              <span>{isLive ? 'ON' : 'OFF'}</span>
            </button>

            {/* Countdown - gọn trên mobile */}
            {isLive && (
              <div className="flex items-center gap-1 text-xs text-emerald-300 bg-emerald-950/70 px-2 py-1 rounded-lg border border-emerald-500/40">
                <Radio className={`w-3 h-3 shrink-0 ${isPolling ? 'animate-spin text-amber-300' : 'animate-pulse text-emerald-400'}`} />
                <span className="font-mono font-bold text-[11px]">
                  {isPolling ? '...' : `${countdown}s`}
                </span>
              </div>
            )}

            {/* Số đơn trên WMS - ẩn trên mobile nhỏ */}
            {totalInWms !== null && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700 font-mono text-[11px]">
                <span className="text-slate-400 font-sans">{currentConfig.shortLabel}:</span>
                <b className="text-emerald-400 font-bold">{totalInWms}</b>
                {latestOrderNo && (
                  <>
                    <span className="text-slate-500">|</span>
                    <b className="text-indigo-300 truncate max-w-[80px]">{latestOrderNo}</b>
                  </>
                )}
              </div>
            )}

            {/* Badge đơn mới */}
            {sessionNewCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold animate-bounce text-xs">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>+{sessionNewCount} mới!</span>
              </div>
            )}

            {/* Tùy chọn Kho */}
            <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-0.5 text-xs">
              <Warehouse className="w-3 h-3 text-indigo-400 shrink-0" />
              <select
                value={warehouse}
                onChange={(e) => {
                  const val = e.target.value;
                  setWarehouse(val);
                  warehouseRef.current = val;
                  switchStatusAndFetch(status);
                }}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-hidden cursor-pointer max-w-[70px] sm:max-w-none"
              >
                <option value="7" className="bg-slate-900 text-white">VN02</option>
                <option value="4" className="bg-slate-900 text-white">VN01</option>
              </select>
            </div>

            {/* Tần suất quét */}
            <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-0.5 text-xs">
              <Clock className="w-3 h-3 text-amber-400 shrink-0" />
              <select
                value={intervalSec}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIntervalSec(val);
                  setCountdown(val);
                }}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-hidden cursor-pointer max-w-[60px] sm:max-w-none"
              >
                <option value={10} className="bg-slate-900 text-white">10s</option>
                <option value={5} className="bg-slate-900 text-white">5s</option>
                <option value={15} className="bg-slate-900 text-white">15s</option>
                <option value={30} className="bg-slate-900 text-white">30s</option>
              </select>
            </div>

            {/* Chuông */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Tắt âm thanh chuông báo' : 'Bật âm thanh chuông báo'}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                soundEnabled
                  ? 'bg-indigo-600/40 text-amber-300 border-indigo-500/50 hover:bg-indigo-600/60'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Nút Làm Mới ngay */}
            <button
              onClick={() => executeAutoRefresh(true)}
              disabled={isPolling || isSwitchingStatus}
              title="Làm mới & kéo đơn mới nhất ngay"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

      </div>

      {/* MODAL CÀI ĐẶT TELEGRAM BOT */}
      <TelegramBotSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        statusCounts={statusCounts}
        warehouse={warehouse}
        onConfigUpdated={(newCfg) => setTelegramConfig(newCfg)}
      />
    </div>
  );
};
