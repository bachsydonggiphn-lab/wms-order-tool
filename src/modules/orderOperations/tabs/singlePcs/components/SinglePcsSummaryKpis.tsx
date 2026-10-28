import React from 'react';
import { Zap, Layers, Trophy, PackageCheck } from 'lucide-react';
import { SkuPackingItem } from '../../../../../types';
import { SelectedSkuStats } from '../types';

interface SinglePcsSummaryKpisProps {
  pcsModeLabel: string;
  totalOrders: number;
  totalPcs: number;
  totalSkus: number;
  completedSkusCount: number;
  top1Sku: SkuPackingItem | null;
  selectedSkus: Set<string>;
  onToggleSku: (sku: string) => void;
  selectedStats: SelectedSkuStats;
}

export const SinglePcsSummaryKpis: React.FC<SinglePcsSummaryKpisProps> = ({
  pcsModeLabel,
  totalOrders,
  totalPcs,
  totalSkus,
  completedSkusCount,
  top1Sku,
  selectedSkus,
  onToggleSku,
  selectedStats,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Card 1: Tổng đơn chế độ chọn */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            {pcsModeLabel}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">
            {totalOrders} <span className="text-xs font-normal text-gray-400">đơn</span>
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Tổng cộng {totalPcs} chiếc (PCS)
          </p>
        </div>
        <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 text-amber-600">
          <Zap className="w-5 h-5" />
        </div>
      </div>

      {/* Card 2: Tổng mã SKU */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Tổng Số Mã SKU</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">
            {totalSkus} <span className="text-xs font-normal text-gray-400">mã</span>
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {completedSkusCount > 0 ? `Đã hoàn thành ${completedSkusCount} mã` : 'Sắp xếp theo số đơn'}
          </p>
        </div>
        <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 text-indigo-600">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* Card 3: Top 1 SKU nhiều đơn nhất */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between bg-radial-[at_top_right] from-amber-50/40 via-white to-white">
        <div className="truncate pr-2">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Top 1 Nhiều Đơn Nhất
          </p>
          {top1Sku ? (
            <>
              <p className="text-lg font-bold text-gray-900 mt-0.5 font-mono truncate" title={top1Sku.sku}>
                {top1Sku.sku}
              </p>
              <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                {top1Sku.orderCount} đơn ({top1Sku.percentage}% tổng đơn)
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Chưa có dữ liệu</p>
          )}
        </div>
        {top1Sku && (
          <button
            onClick={() => onToggleSku(top1Sku.sku)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer border ${
              selectedSkus.has(top1Sku.sku)
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200'
            }`}
          >
            {selectedSkus.has(top1Sku.sku) ? '✓ Đang chọn' : 'Đóng trước'}
          </button>
        )}
      </div>

      {/* Card 4: Trạng thái chọn đóng hàng loạt */}
      <div
        className={`rounded-2xl p-4 shadow-2xs flex items-center justify-between border transition-all ${
          selectedStats.skuCount > 0
            ? 'bg-indigo-50/50 border-indigo-200'
            : 'bg-white border-gray-200/80'
        }`}
      >
        <div>
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Đang Chọn Đóng Gói</p>
          <p className="text-2xl font-bold text-indigo-700 mt-0.5">
            {selectedStats.skuCount} <span className="text-xs font-semibold text-gray-500">mã SKU</span>
          </p>
          <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">
            = {selectedStats.totalSelectedOrders} đơn hàng ({selectedStats.totalSelectedPcs} PCS)
          </p>
        </div>
        <div className="w-11 h-11 bg-indigo-100/70 rounded-xl flex items-center justify-center border border-indigo-200 text-indigo-700">
          <PackageCheck className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
