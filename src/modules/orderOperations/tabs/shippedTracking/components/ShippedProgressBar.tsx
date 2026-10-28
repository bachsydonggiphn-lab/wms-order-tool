import React from 'react';
import { Activity, Zap, Sparkles, Timer } from 'lucide-react';
import { ShippedStats, CheckingProgress } from '../types';

interface ShippedProgressBarProps {
  stats: ShippedStats;
  isBatchChecking: boolean;
  checkingProgress: CheckingProgress;
  shippedOrdersCount: number;
}

export const ShippedProgressBar: React.FC<ShippedProgressBarProps> = ({
  stats,
  isBatchChecking,
  checkingProgress,
  shippedOrdersCount,
}) => {
  return (
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
              Cache cố định – F5 không mất dữ liệu · {shippedOrdersCount} đơn
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
  );
};
