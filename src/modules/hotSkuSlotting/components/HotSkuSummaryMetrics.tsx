import React from 'react';
import { TrendingUp, AlertTriangle, Sparkles } from 'lucide-react';
import { HotSkuAnalyticsResult } from '../../../../sqliteDb';

interface HotSkuSummaryMetricsProps {
  analytics: HotSkuAnalyticsResult | null;
  stockoutRiskCount: number;
  filterStockoutIncomingOnly: boolean;
  onToggleStockoutFilter: () => void;
}

export const HotSkuSummaryMetrics: React.FC<HotSkuSummaryMetricsProps> = ({
  analytics,
  stockoutRiskCount,
  filterStockoutIncomingOnly,
  onToggleStockoutFilter,
}) => {
  return (
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
        onClick={onToggleStockoutFilter}
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
  );
};
