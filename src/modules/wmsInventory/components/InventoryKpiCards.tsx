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
  className?: string;
  showOnMobile?: boolean;
}

export const InventoryKpiCards: React.FC<InventoryKpiCardsProps> = ({
  data,
  className = '',
  showOnMobile = false,
}) => {
  if (!data) return null;

  return (
    <div
      className={`${
        showOnMobile ? 'grid grid-cols-2' : 'hidden'
      } sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 ${className}`}
    >
      {/* Tổng Mã SKU */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng SKU</span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-xl font-black text-slate-900 truncate">
          {data.totalSkus.toLocaleString()}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
          {data.groups.length} nhóm SKU
        </div>
      </div>

      {/* Khả Dụng Thực Tế (In Used) */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-2.5 sm:p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Khả Dụng</span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <PackageCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-xl font-black text-emerald-700 truncate">
          {data.totalInUsed.toLocaleString()}
        </div>
        <div className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 font-semibold truncate">
          Tồn kho thực tế
        </div>
      </div>

      {/* Có Thể Bán (Sellable) */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Có Thể Bán</span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-xl font-black text-indigo-700 truncate">
          {data.totalSellable.toLocaleString()}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
          Sellable outbound
        </div>
      </div>

      {/* Đang Về (In Transit) */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đang Về</span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-xl font-black text-amber-600 truncate">
          {data.totalOnWay.toLocaleString()}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
          Hàng đang nhập
        </div>
      </div>

      {/* Chờ Xuất (Outbound) */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chờ Xuất</span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-xl font-black text-purple-700 truncate">
          {data.totalOutbound.toLocaleString()}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
          Pending Outbound
        </div>
      </div>

      {/* Hàng Lỗi (Defective) */}
      <div className="bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lỗi/Hỏng</span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="text-lg sm:text-xl font-black text-rose-600 truncate">
          {data.totalUnsellable.toLocaleString()}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
          Defective Products
        </div>
      </div>
    </div>
  );
};
