import React from 'react';
import { Flame, Clock, Boxes, RefreshCw, Download, Zap, Calendar } from 'lucide-react';
import { HotSkuAnalyticsResult } from '../../../../sqliteDb';

interface HotSkuBannerToolbarProps {
  analytics: HotSkuAnalyticsResult | null;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenSyncModal: () => void;
  onExportExcel: () => void;
  timeframe: '3d' | '7d' | '30d' | '90d' | 'all' | 'custom';
  setTimeframe: (tf: '3d' | '7d' | '30d' | '90d' | 'all' | 'custom') => void;
  rankingMode: 'normalized' | 'actual';
  setRankingMode: (mode: 'normalized' | 'actual') => void;
  customFromDate: string;
  setCustomFromDate: (date: string) => void;
  customToDate: string;
  setCustomToDate: (date: string) => void;
}

export const HotSkuBannerToolbar: React.FC<HotSkuBannerToolbarProps> = ({
  analytics,
  isLoading,
  onRefresh,
  onOpenSyncModal,
  onExportExcel,
  timeframe,
  setTimeframe,
  rankingMode,
  setRankingMode,
  customFromDate,
  setCustomFromDate,
  customToDate,
  setCustomToDate,
}) => {
  return (
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
                Cập nhật lần cuối:{' '}
                <b className="text-slate-200">
                  {analytics.syncMeta.lastSyncTime
                    ? new Date(analytics.syncMeta.lastSyncTime).toLocaleString('vi-VN')
                    : 'Chưa có'}
                </b>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                Tổng đơn trong SQL:{' '}
                <b className="text-slate-200">
                  {(analytics.syncMeta.totalOrdersInDb || 0).toLocaleString()} đơn
                </b>
              </span>
            </div>
          )}
        </div>

        {/* Cụm Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            title="Làm mới phân tích"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Làm Mới</span>
          </button>

          <button
            onClick={onOpenSyncModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
            title="Kéo thêm ngày đơn từ hệ thống YunWMS"
          >
            <RefreshCw className="w-4 h-4 text-slate-950" />
            <span>Kéo Đơn YunWMS</span>
          </button>

          <button
            onClick={onExportExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
            title="Xuất kết quả phân tích ra file Excel"
          >
            <Download className="w-4 h-4 text-white" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Dải Lựa Chọn Khung Thời Gian & Chế Độ Phân Hạng */}
      <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar-dark py-1 w-full sm:w-auto">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mr-1 shrink-0">
            Khung Giờ:
          </span>
          {[
            { id: '3d', label: '3 Ngày' },
            { id: '7d', label: '7 Ngày' },
            { id: '30d', label: '30 Ngày (Chuẩn)' },
            { id: '90d', label: '90 Ngày' },
            { id: 'all', label: 'Tất Cả' },
            { id: 'custom', label: 'Tùy Chọn' },
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
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar-dark py-1 w-full sm:w-auto">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mr-1 shrink-0 hidden sm:inline">
            Góc Nhìn ABC:
          </span>
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
  );
};
