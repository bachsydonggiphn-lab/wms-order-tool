import React from 'react';
import { Clock } from 'lucide-react';
import { ShippedStats } from '../types';

interface ShippedUnscannedAgeBreakdownProps {
  stats: ShippedStats;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (status: string) => void;
}

export const ShippedUnscannedAgeBreakdown: React.FC<ShippedUnscannedAgeBreakdownProps> = ({
  stats,
  selectedStatusFilter,
  setSelectedStatusFilter,
}) => {
  if (stats.notScanned === 0) return null;

  return (
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

        {/* 3+ Days Old */}
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
  );
};
