import React from 'react';
import {
  Boxes,
  RefreshCw,
  Download,
  Printer,
  Volume2,
  VolumeX,
  Clock,
  Warehouse,
  Zap,
  Activity,
  ChevronDown
} from 'lucide-react';
import { InventoryQueryResult } from '../../../types';

interface InventoryHeaderBarProps {
  data: InventoryQueryResult | null;
  loading: boolean;
  selectedWarehouse: string;
  setSelectedWarehouse: (w: string) => void;
  isAutoRefresh: boolean;
  setIsAutoRefresh: (val: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (sec: number) => void;
  countdown: number;
  isPolling: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  recentChanges: {
    time: string;
    changedCount: number;
    details: Array<{ sku: string; diffInUsed: number }>;
  } | null;
  setRecentChanges: (val: any) => void;
  fetchInventory: (isBackground?: boolean) => void;
  handleExport: () => void;
  handleOpenPrintModal: (mode: 'COLUMN_MATRIX' | 'DETAILED_TABLE') => void;
  onNavigateToSlotting?: () => void;
}

export const InventoryHeaderBar: React.FC<InventoryHeaderBarProps> = ({
  data,
  loading,
  selectedWarehouse,
  setSelectedWarehouse,
  isAutoRefresh,
  setIsAutoRefresh,
  refreshInterval,
  setRefreshInterval,
  countdown,
  isPolling,
  soundEnabled,
  setSoundEnabled,
  recentChanges,
  setRecentChanges,
  fetchInventory,
  handleExport,
  handleOpenPrintModal,
  onNavigateToSlotting
}) => {
  return (
    <div className="space-y-3">
      {/* 1. Header Bar: Tiêu Đề + Controls + Real-Time Poller */}
      <div className="bg-white rounded-2xl p-3.5 sm:p-4 md:p-6 border border-slate-200/90 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xs shrink-0">
                <Boxes className="w-4 h-4 sm:w-5 h-5" />
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                Tra Cứu Tồn Kho WMS
              </h1>
              <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                Kho VN02 (Đồng Nai)
              </span>

              {/* Live Polling Status Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isPolling
                      ? 'bg-amber-500 animate-ping'
                      : isAutoRefresh
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="text-[11px]">
                  {isPolling ? 'Đang cập nhật...' : isAutoRefresh ? `Tự động (${countdown}s)` : 'Tạm dừng'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>Đồng bộ thời gian thực từ YunWMS • Tự động quét thay đổi số lượng</span>
              {data?.fetchedAt && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1 text-slate-600 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Cập nhật: {(() => {
                      try {
                        const d = new Date(data.fetchedAt);
                        if (!isNaN(d.getTime())) return d.toLocaleTimeString('vi-VN');
                        return String(data.fetchedAt).split(' ')[0] || String(data.fetchedAt);
                      } catch {
                        return String(data.fetchedAt);
                      }
                    })()}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Action Tools & Polling Controls */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1 w-full lg:w-auto">
            {/* Auto-Refresh Toggle + Interval Dropdown */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
              <button
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAutoRefresh
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={isAutoRefresh ? 'Nhấp để tạm dừng tự động cập nhật' : 'Nhấp để bật tự động cập nhật'}
              >
                <Activity className={`w-3.5 h-3.5 ${isAutoRefresh ? 'animate-pulse' : ''}`} />
                <span>{isAutoRefresh ? 'Live' : 'Pause'}</span>
              </button>

              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-700 px-2 py-1 focus:outline-none cursor-pointer"
                title="Chu kỳ tự động tải lại"
              >
                <option value={5}>5s</option>
                <option value={10}>10s (chuẩn)</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                soundEnabled
                  ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
              }`}
              title={soundEnabled ? 'Âm thanh thông báo: BẬT (khi có biến động tồn kho)' : 'Âm thanh thông báo: TẮT'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-600" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Warehouse Select */}
            <div className="relative shrink-0">
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-xl px-3 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
              >
                <option value="7">Kho VN02 (Đồng Nai)</option>
                <option value="1">Kho VN01 (Hà Nội)</option>
              </select>
              <Warehouse className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchInventory(false)}
              disabled={loading || isPolling}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all disabled:opacity-50 shrink-0"
              title="Kéo dữ liệu tồn kho mới nhất ngay lập tức"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || isPolling ? 'animate-spin text-emerald-600' : ''}`} />
              <span>Làm Mới</span>
            </button>

            {/* Nút Mở Hộp Thoại In Danh Sách Tồn Kho */}
            <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 p-0.5 rounded-xl shrink-0">
              <button
                onClick={() => handleOpenPrintModal('COLUMN_MATRIX')}
                disabled={!data || data.items.length === 0}
                className="px-3 py-2 rounded-lg text-xs font-extrabold bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-50"
                title="Mở bảng in ma trận 6 cột tiết kiệm giấy (Khổ A4 Ngang)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Ma Trận 6 Cột</span>
              </button>

              <button
                onClick={() => handleOpenPrintModal('DETAILED_TABLE')}
                disabled={!data || data.items.length === 0}
                className="px-2.5 py-2 rounded-lg text-xs font-bold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                title="In dạng bảng chi tiết (Khổ A4 Dọc)"
              >
                <span>Bảng Chi Tiết</span>
              </button>
            </div>

            {/* Export Excel Button */}
            <button
              onClick={handleExport}
              disabled={!data || data.items.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all disabled:opacity-50 shrink-0"
              title="Xuất danh sách tồn kho ra file Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>

            {/* Nút Điều Hướng Sang Tab Bố Trí Kệ Kho (Slotting) */}
            {onNavigateToSlotting && (
              <button
                onClick={onNavigateToSlotting}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0"
                title="Chuyển sang Tab Phân Tích Bán Chạy & Sắp Xếp Vị Trí Kho (Slotting)"
              >
                <Zap className="w-3.5 h-3.5 text-slate-950" />
                <span>Bố Trí Kho (ABC)</span>
              </button>
            )}
          </div>
        </div>

        {/* Change Banner (Biến động vừa cập nhật) */}
        {recentChanges && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span className="font-bold">
                [{recentChanges.time}] Phát hiện biến động tại {recentChanges.changedCount} mã SKU:
              </span>
              <span className="font-mono text-amber-800 truncate max-w-xl">
                {recentChanges.details.map(d => `${d.sku} (${d.diffInUsed > 0 ? `+${d.diffInUsed}` : d.diffInUsed})`).join(', ')}
              </span>
            </div>
            <button
              onClick={() => setRecentChanges(null)}
              className="text-amber-700 hover:text-amber-950 font-bold ml-2 shrink-0 cursor-pointer"
            >
              Đã xem
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
