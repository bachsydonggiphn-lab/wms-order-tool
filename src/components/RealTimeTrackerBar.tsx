import React, { useState, useEffect, useRef } from 'react';
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
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RawOrderRow, SkuGroupsMap } from '../types';
import { playOrderAlertSound } from '../utils/audioAlert';

interface RealTimeTrackerBarProps {
  orders: RawOrderRow[];
  onNewOrders: (newOrders: RawOrderRow[]) => void;
  onReloadStatusOrders?: (orders: RawOrderRow[], statusName: string) => void;
  skuGroups: SkuGroupsMap;
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
    label: 'Shipped (Đã xuất kho / Đang giao)',
    shortLabel: 'Shipped (8)',
    desc: 'Đơn đã đóng gói & giao bưu cục',
    badgeBg: 'bg-emerald-500/20 text-emerald-300',
    badgeBorder: 'border-emerald-400/40',
    activeBg: 'bg-emerald-600 text-white ring-4 ring-emerald-500/30',
    icon: '🚚',
  },
};

export const RealTimeTrackerBar: React.FC<RealTimeTrackerBarProps> = ({
  orders,
  onNewOrders,
  onReloadStatusOrders,
  skuGroups,
}) => {
  // Trạng thái bắt live thời gian thực: Mặc định BẬT (TRUE) để tự động làm mới liên tục
  const [isLive, setIsLive] = useState<boolean>(true);
  const [status, setStatus] = useState<WmsStatusKey>('4'); // Mặc định '4' = Submitted (trạng thái submit mới nhất)
  const [intervalSec, setIntervalSec] = useState<number>(10); // Chu kỳ 10s mặc định
  const [autoReplace, setAutoReplace] = useState<boolean>(true); // Mặc định TRUE: Xóa dữ liệu cũ & nạp mới trạng thái Submit mới nhất
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [warehouse, setWarehouse] = useState<string>('7'); // 7 = VN02 Hồ Chí Minh

  // Trạng thái theo dõi
  const [countdown, setCountdown] = useState<number>(10);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isSwitchingStatus, setIsSwitchingStatus] = useState<boolean>(false);
  const [totalInWms, setTotalInWms] = useState<number | null>(null);
  const [sessionNewCount, setSessionNewCount] = useState<number>(0);
  const [lastDetectedOrders, setLastDetectedOrders] = useState<RawOrderRow[]>([]);
  const [latestOrderNo, setLatestOrderNo] = useState<string>('');
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  // Refs để tránh closure stale state trong setInterval
  const countdownIntervalRef = useRef<any>(null);
  const ordersRef = useRef<RawOrderRow[]>(orders);
  const statusRef = useRef<WmsStatusKey>(status);
  const warehouseRef = useRef<string>(warehouse);
  const autoReplaceRef = useRef<boolean>(autoReplace);
  const isPollingRef = useRef<boolean>(false);
  const soundEnabledRef = useRef<boolean>(soundEnabled);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

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

  // 1. Hàm tự động làm mới (Auto-Refresh): Xóa dữ liệu cũ & nạp lại dữ liệu mới nhất (hoặc cộng dồn)
  const executeAutoRefresh = async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    setIsPolling(true);

    const currentStatus = statusRef.current;
    const currentWarehouse = warehouseRef.current;
    // Bật Replace Mode nếu người dùng chọn Xóa cũ & Kéo mới (áp dụng cho tất cả trạng thái)
    const isReplaceMode = autoReplaceRef.current;

    try {
      if (isReplaceMode) {
        // CHẾ ĐỘ XÓA DỮ LIỆU CŨ VÀ NẠP MỚI TOÀN BỘ (DỮ LIỆU THẬT 100%, KHÔNG CẮT XÉN 500 ĐƠN)
        const res = await fetch('/api/wms/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse: currentWarehouse,
            status: currentStatus,
            pageSize: 500,
            maxPages: 0, // Kéo TOÀN BỘ tất cả các trang, không giới hạn 500 đơn hay cắt xén
            username: 'David',
            password: '12345abc',
            skuGroups,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.orders)) {
            const freshOrders: RawOrderRow[] = data.orders;
            setTotalInWms(data.totalOrders);
            if (freshOrders.length > 0) {
              setLatestOrderNo(freshOrders[0].orderNo);
            }

            const nowStr = new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            setLastCheckTime(nowStr);

            const prevCount = ordersRef.current.length;
            const newCount = freshOrders.length;
            const statusConfig = WMS_STATUS_CONFIG[currentStatus];

            // Ghi đè: nạp dữ liệu thật 100% đầy đủ
            if (onReloadStatusOrders) {
              onReloadStatusOrders(freshOrders, statusConfig.shortLabel);
            } else {
              onNewOrders(freshOrders);
            }

            if (newCount !== prevCount) {
              if (soundEnabledRef.current) {
                playOrderAlertSound();
              }
              setSessionNewCount(newCount);
            }
          }
        }
      } else {
        // CHẾ ĐỘ CỘNG DỒN ĐƠN MỚI
        const known = ordersRef.current
          .map((o) => o.orderNo)
          .filter(Boolean);

        const res = await fetch('/api/wms/poll-new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            knownOrderNos: known,
            warehouse: currentWarehouse,
            status: currentStatus,
            username: 'David',
            password: '12345abc',
            skuGroups,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setTotalInWms(data.totalOrders);
            if (data.latestOrderNo) {
              setLatestOrderNo(data.latestOrderNo);
            }

            const nowStr = new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            setLastCheckTime(nowStr);

            if (data.hasNew && Array.isArray(data.newOrders) && data.newOrders.length > 0) {
              const freshOrders: RawOrderRow[] = data.newOrders.map((o: RawOrderRow) => ({
                ...o,
                isRealTimeNew: true,
                newTimestamp: Date.now(),
              }));

              if (soundEnabledRef.current) {
                playOrderAlertSound();
              }

              try {
                confetti({
                  particleCount: 35,
                  spread: 55,
                  origin: { y: 0.2, x: 0.85 },
                });
              } catch (e) {}

              setSessionNewCount((prev) => prev + freshOrders.length);
              setLastDetectedOrders(freshOrders);
              onNewOrders(freshOrders);
            }
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

  // 2. Hàm chuyển trạng thái: Cào dữ liệu sạch của trạng thái mới VÀ tiếp tục làm mới liên tục
  const switchStatusAndFetch = async (targetStatus: WmsStatusKey) => {
    setStatus(targetStatus);
    statusRef.current = targetStatus;
    setIsSwitchingStatus(true);
    setSessionNewCount(0);
    setLastDetectedOrders([]);

    try {
      const res = await fetch('/api/wms/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse: warehouseRef.current,
          status: targetStatus,
          pageSize: 500,
          // Kéo TOÀN BỘ dữ liệu thật tất cả các trang, không giới hạn 500 hay cắt xén
          maxPages: 0,
          username: 'David',
          password: '12345abc',
          skuGroups,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setTotalInWms(data.totalOrders);
          const statusConfig = WMS_STATUS_CONFIG[targetStatus];
          if (onReloadStatusOrders) {
            onReloadStatusOrders(data.orders, statusConfig.shortLabel);
          } else {
            onNewOrders(data.orders);
          }

          if (soundEnabled) {
            playOrderAlertSound();
          }

          try {
            confetti({
              particleCount: 45,
              spread: 60,
              origin: { y: 0.25 },
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error switching status:', err);
    } finally {
      setIsSwitchingStatus(false);
      // Tự động bật Live Tracker và reset đếm ngược để tiếp tục làm mới liên tục
      setIsLive(true);
      setCountdown(intervalSec);
    }
  };

  // 3. Vòng lặp đếm ngược và quét liên tục theo thời gian thực (Mỗi 10s)
  useEffect(() => {
    if (!isLive) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    // Reset đếm ngược
    setCountdown(intervalSec);

    // Vòng lặp chạy mỗi 1 giây
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          executeAutoRefresh();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isLive, intervalSec, status, warehouse]);

  const currentConfig = WMS_STATUS_CONFIG[status];

  return (
    <div className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white border-b border-indigo-900/60 shadow-lg sticky top-14 z-20">
      <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* CỤM 1: BỘ 3 NÚT CHUYỂN TRẠNG THÁI (Submitted Mặc định, Shelved, Shipped) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1 font-semibold">
              <span className="text-amber-400">⚡</span>
              <span>AUTO-REFRESH:</span>
            </div>

            {/* Nút 1: Submitted (4) - TRẠNG THÁI SUBMIT MỚI NHẤT (MẶC ĐỊNH) */}
            <button
              onClick={() => switchStatusAndFetch('4')}
              disabled={isSwitchingStatus}
              title="Kéo trạng thái Submit mới nhất (Đã tạo / Chờ xử lý kho)"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                status === '4'
                  ? WMS_STATUS_CONFIG['4'].activeBg
                  : 'bg-slate-800/90 hover:bg-slate-700 text-blue-200/90 border border-slate-700'
              }`}
            >
              <span>{WMS_STATUS_CONFIG['4'].icon}</span>
              <span>Submitted (E11 = 4)</span>
              {status === '4' && (
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              )}
            </button>

            {/* Nút 2: Shelved (5) */}
            <button
              onClick={() => switchStatusAndFetch('5')}
              disabled={isSwitchingStatus}
              title="Kéo đơn Shelved (Đã lên kệ kho, có Picking List)"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                status === '5'
                  ? WMS_STATUS_CONFIG['5'].activeBg
                  : 'bg-slate-800/90 hover:bg-slate-700 text-amber-200/90 border border-slate-700'
              }`}
            >
              <span>{WMS_STATUS_CONFIG['5'].icon}</span>
              <span>Shelved (E11 = 5)</span>
              {status === '5' && (
                <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping"></span>
              )}
            </button>

            {/* Nút 3: Shipped (8) */}
            <button
              onClick={() => switchStatusAndFetch('8')}
              disabled={isSwitchingStatus}
              title="Kéo đơn Shipped (Đã xuất kho / Đang giao)"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                status === '8'
                  ? WMS_STATUS_CONFIG['8'].activeBg
                  : 'bg-slate-800/90 hover:bg-slate-700 text-emerald-200/90 border border-slate-700'
              }`}
            >
              <span>{WMS_STATUS_CONFIG['8'].icon}</span>
              <span>Shipped (E11 = 8)</span>
              {status === '8' && (
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              )}
            </button>

            {/* Loading spinner khi chuyển đổi trạng thái */}
            {isSwitchingStatus && (
              <span className="text-xs text-amber-300 flex items-center gap-1 font-semibold animate-pulse ml-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang tải đơn {currentConfig.shortLabel}...</span>
              </span>
            )}
          </div>

          {/* CỤM 2: TRẠNG THÁI REAL-TIME SCAN, CHẾ ĐỘ XÓA CŨ - KÉO MỚI VÀ CẤU HÌNH */}
          <div className="flex items-center flex-wrap gap-2.5 text-xs">
            
            {/* Công tắc Chế độ: Xóa cũ & Kéo mới mỗi 10s */}
            <button
              onClick={() => setAutoReplace(!autoReplace)}
              title={
                autoReplace
                  ? 'Đang bật: Mỗi 10s tự động xóa dữ liệu cũ và kéo lại trạng thái Submit mới nhất'
                  : 'Đang tắt: Mỗi 10s chỉ giữ dữ liệu cũ và cộng dồn đơn mới'
              }
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                autoReplace
                  ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-blue-200 border border-blue-400/50 shadow-xs'
                  : 'bg-slate-800/90 text-slate-400 border border-slate-700 hover:text-slate-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoReplace ? 'text-blue-300' : 'text-slate-500'}`} />
              <span>{autoReplace ? '🔄 Xóa cũ & Kéo mới Submit' : '➕ Cộng dồn đơn'}</span>
            </button>

            {/* Công tắc BẬT / TẮT LIVE */}
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isLive
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {isLive ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </>
                ) : (
                  <span className="inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
                )}
              </div>
              <span>{isLive ? 'AUTO 10S: ON' : 'AUTO 10S: OFF'}</span>
            </button>

            {/* Radar làm mới liên tục & Đếm ngược */}
            {isLive ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/70 px-2.5 py-1 rounded-lg border border-emerald-500/40">
                <Radio className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-amber-300' : 'animate-pulse text-emerald-400'}`} />
                <span className="font-mono font-bold">
                  {isPolling ? 'Đang cập nhật...' : `Làm mới: ${countdown}s`}
                </span>
              </div>
            ) : null}

            {/* Số lượng đơn hiện tại trên WMS */}
            {totalInWms !== null && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-300 border border-slate-700 font-mono text-[11px]">
                <span className="text-slate-400 font-sans">{currentConfig.shortLabel}:</span>
                <b className="text-emerald-400 font-bold">{totalInWms} đơn</b>
                {latestOrderNo && (
                  <>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400 font-sans">Mới nhất:</span>
                    <b className="text-indigo-300">{latestOrderNo}</b>
                  </>
                )}
              </div>
            )}

            {/* Badge đếm lần làm mới */}
            {sessionNewCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold animate-bounce text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đã nạp {sessionNewCount} đơn Submit mới!</span>
              </div>
            )}

            {/* Tùy chọn Kho */}
            <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-0.5 text-xs">
              <Warehouse className="w-3.5 h-3.5 text-indigo-400" />
              <select
                value={warehouse}
                onChange={(e) => {
                  const val = e.target.value;
                  setWarehouse(val);
                  warehouseRef.current = val;
                  switchStatusAndFetch(status);
                }}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="7" className="bg-slate-900 text-white">VN02 [HCM]</option>
                <option value="4" className="bg-slate-900 text-white">VN01 [Hải Ngoại]</option>
              </select>
            </div>

            {/* Tùy chọn Tần suất quét */}
            <div className="flex items-center gap-1 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-0.5 text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <select
                value={intervalSec}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setIntervalSec(val);
                  setCountdown(val);
                }}
                className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value={10} className="bg-slate-900 text-white">10s (Mặc định)</option>
                <option value={5} className="bg-slate-900 text-white">5s (Siêu tốc)</option>
                <option value={15} className="bg-slate-900 text-white">15s</option>
                <option value={30} className="bg-slate-900 text-white">30s</option>
              </select>
            </div>

            {/* Nút Chuông Báo */}
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

            {/* Nút Làm Mới & Xóa Cũ Ngay Lập Tức */}
            <button
              onClick={executeAutoRefresh}
              disabled={isPolling || isSwitchingStatus}
              title="Làm mới & xóa dữ liệu cũ kéo đơn mới nhất ngay lập tức"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPolling ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Thông báo banner trượt khi vừa làm mới xong */}
        {lastCheckTime && (
          <div className="mt-2 pt-2 border-t border-indigo-900/40 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto py-0.5 text-[11px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {`Đã tự động kéo toàn bộ dữ liệu thật ${currentConfig.shortLabel} (Tổng WMS: ${totalInWms?.toLocaleString() || '?'} đơn | Đang hiển thị: ${orders.length.toLocaleString()} đơn) lúc ${lastCheckTime}`}
                </span>
              </span>
              {autoReplace ? (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md font-mono shrink-0">
                  (Chế độ: Xóa cũ - Nạp toàn bộ mới mỗi {intervalSec}s)
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md font-mono shrink-0">
                  (Chế độ: Cộng dồn đơn mới mỗi {intervalSec}s)
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
