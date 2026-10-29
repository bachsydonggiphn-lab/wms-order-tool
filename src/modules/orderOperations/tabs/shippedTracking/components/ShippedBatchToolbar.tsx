import React from 'react';
import {
  Play,
  Square,
  Calendar,
  RotateCcw,
  CloudDownload,
  XCircle,
  Copy,
  Download,
  Search,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { ShippedStats, TrackingOrderItemView } from '../types';

interface ShippedBatchToolbarProps {
  isBatchChecking: boolean;
  filteredItems: TrackingOrderItemView[];
  handleStartBatchTrack: (onlyUnscanned?: boolean) => void;
  handleStopBatchTrack: () => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (val: string) => void;
  stats: ShippedStats;
  isFetchingWms: boolean;
  fetchShippedFromWms: () => void;
  lastFetchedAt: string | null;
  newOrdersCount: number;
  handleClearShippedCache: () => void;
  shippedOrdersCount: number;
  handleCopyCodes: () => void;
  copySuccess: boolean;
  handleExportReport: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  fetchError: string | null;
  setFetchError: (err: string | null) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (status: string) => void;
  selectedCarrierFilter: string;
  setSelectedCarrierFilter: (carrier: string) => void;
}

export const ShippedBatchToolbar: React.FC<ShippedBatchToolbarProps> = ({
  isBatchChecking,
  filteredItems,
  handleStartBatchTrack,
  handleStopBatchTrack,
  selectedDateFilter,
  setSelectedDateFilter,
  stats,
  isFetchingWms,
  fetchShippedFromWms,
  lastFetchedAt,
  newOrdersCount,
  handleClearShippedCache,
  shippedOrdersCount,
  handleCopyCodes,
  copySuccess,
  handleExportReport,
  searchTerm,
  setSearchTerm,
  fetchError,
  setFetchError,
  selectedStatusFilter,
  setSelectedStatusFilter,
  selectedCarrierFilter,
  setSelectedCarrierFilter,
}) => {
  return (
    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {!isBatchChecking ? (
            <button
              onClick={() => handleStartBatchTrack(false)}
              disabled={filteredItems.length === 0}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Quét toàn bộ ({filteredItems.length} đơn)</span>
            </button>
          ) : (
            <button
              onClick={handleStopBatchTrack}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Dừng Tra Cứu</span>
            </button>
          )}

          {/* Quick Date Range Selectors */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 px-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Ngày:
            </span>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: '01_06_SEP', label: '🗓️ 01-06/09' },
              { id: '3DAYS', label: '3 ngày' },
              { id: '7DAYS', label: '7 ngày' },
            ].map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedDateFilter(d.id)}
                className={`px-2 sm:px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
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
            className="px-3 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs border border-amber-600 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Chưa scan ({stats.notScanned})</span>
          </button>

          <button
            onClick={fetchShippedFromWms}
            disabled={isFetchingWms || isBatchChecking}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            title="Kéo thêm đơn Shipped (E11=8) mới từ YunWMS và merge vào cache (chỉ thêm đơn mới, không xóa cũ)"
          >
            <CloudDownload className={`w-3.5 h-3.5 text-emerald-600 ${isFetchingWms ? 'animate-bounce' : ''}`} />
            <span>{isFetchingWms ? 'Đang kéo...' : '⬇️ Kéo Shipped mới'}</span>
            {lastFetchedAt && !isFetchingWms && (
              <span className="text-[10px] bg-emerald-200 text-emerald-950 px-1.5 py-0.5 rounded font-mono ml-0.5">
                {lastFetchedAt}
              </span>
            )}
            {newOrdersCount > 0 && !isFetchingWms && (
              <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-mono ml-0.5 animate-pulse">
                +{newOrdersCount} mới
              </span>
            )}
          </button>

          <button
            onClick={handleClearShippedCache}
            disabled={shippedOrdersCount === 0}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Xóa toàn bộ cache đơn Shipped và kết quả tracking đã lưu"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Xóa cache ({shippedOrdersCount})</span>
          </button>

          <button
            onClick={handleCopyCodes}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copySuccess ? 'Đã sao chép!' : 'Sao chép mã...'}</span>
          </button>

          <button
            onClick={handleExportReport}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Xuất báo cáo</span>
            <span className="sm:hidden">Excel</span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-56 lg:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm mã vận đơn, SĐT..."
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Error Banner */}
      {fetchError && (
        <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-medium">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="flex-1">{fetchError}</span>
          <button onClick={() => setFetchError(null)} className="text-rose-400 hover:text-rose-600 cursor-pointer">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Carrier Selector & Status Filter Bar with custom-scrollbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5 max-w-full">
          {[
            { id: 'ALL', label: `Tất cả (${filteredItems.length})` },
            { id: 'not_scanned', label: `Chưa scan (${stats.notScanned})` },
            { id: 'scanned', label: `Đã scan (${stats.scannedTotal})` },
            { id: 'cancelled', label: `Đã hủy (${stats.cancelled})` },
            { id: 'in_transit', label: `Đang giao (${stats.inTransit})` },
            { id: 'delivered', label: `Thành công (${stats.delivered})` },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStatusFilter(s.id)}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
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
  );
};
