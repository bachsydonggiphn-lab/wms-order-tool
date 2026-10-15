import React from 'react';
import {
  Boxes,
  PackageCheck,
  TrendingUp,
  Truck,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { InventoryQueryResult } from '../../../types';

interface InventoryKpiCardsProps {
  data: InventoryQueryResult | null;
}

export const InventoryKpiCards: React.FC<InventoryKpiCardsProps> = ({ data }) => {
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Tổng Mã SKU */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng SKU</span>
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-black text-slate-900">
          {data.totalSkus.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {data.groups.length} nhóm SKU
        </div>
      </div>

      {/* Khả Dụng Thực Tế (In Used) */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Khả Dụng (In Used)</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <PackageCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-black text-emerald-700">
          {data.totalInUsed.toLocaleString()}
        </div>
        <div className="text-[11px] text-emerald-600 mt-0.5 font-semibold">
          Tồn kho thực tế
        </div>
      </div>

      {/* Có Thể Bán (Sellable) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Có Thể Bán</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-black text-indigo-700">
          {data.totalSellable.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Sellable outbound
        </div>
      </div>

      {/* Đang Về (In Transit) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đang Về (On Way)</span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-black text-amber-600">
          {data.totalOnWay.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Hàng đang nhập
        </div>
      </div>

      {/* Chờ Xuất (Outbound) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chờ Xuất</span>
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-black text-purple-700">
          {data.totalOutbound.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Pending Outbound
        </div>
      </div>

      {/* Hàng Lỗi (Defective) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hàng Lỗi/Hỏng</span>
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl font-black text-rose-600">
          {data.totalUnsellable.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Defective Products
        </div>
      </div>
    </div>
  );
};
