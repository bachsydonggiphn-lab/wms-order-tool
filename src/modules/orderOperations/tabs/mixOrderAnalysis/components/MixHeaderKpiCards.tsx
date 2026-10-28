import React from 'react';
import { TrendingUp, Zap, Boxes, Package, Layers } from 'lucide-react';
import { SkuInMixSummary, MixOrderAnalysisResult } from '../../../../../types';

interface MixHeaderKpiCardsProps {
  top1Sku: SkuInMixSummary | null;
  mixAnalysis: MixOrderAnalysisResult;
  totalOrdersCount: number;
}

export const MixHeaderKpiCards: React.FC<MixHeaderKpiCardsProps> = ({
  top1Sku,
  mixAnalysis,
  totalOrdersCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Card Top SKU Trùng Nhiều Đơn Nhất */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden md:col-span-2">
        <div className="absolute top-2 right-2 opacity-15">
          <TrendingUp className="w-28 h-28" />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" /> SKU Trùng Lặp Nhiều Nhất Giữa Các Đơn MIX
          </span>
        </div>
        {top1Sku ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black tracking-tight font-mono">{top1Sku.sku}</span>
              <span className="text-xs bg-white text-orange-700 font-bold px-2.5 py-1 rounded-lg">
                Khu vực kệ: {top1Sku.area}
              </span>
            </div>
            <div className="flex items-center gap-4 text-amber-100 text-xs">
              <div>
                Trùng lặp trong: <b className="text-white text-base font-bold">{top1Sku.orderCount} đơn MIX khác nhau</b>
              </div>
              <div>•</div>
              <div>
                Tổng SL cần lấy: <b className="text-white text-base font-bold">{top1Sku.totalQty} PCS</b>
              </div>
              <div>•</div>
              <div>
                Tỷ lệ: <b className="text-white font-bold">{((top1Sku.orderCount / mixAnalysis.totalMixOrders) * 100).toFixed(0)}%</b> đơn MIX
              </div>
            </div>
            <p className="text-[11px] text-orange-100/95 pt-1.5 border-t border-white/20 flex items-center gap-1.5">
              <span>💡 <b>Quy trình gom hàng:</b> Thay vì đi nhiều lần, nhân viên chỉ cần ra kệ <b>{top1Sku.area}</b> lấy 1 lần <b>{top1Sku.totalQty} PCS</b> là cấp đủ mã này cho <b>{top1Sku.orderCount} đơn MIX</b>!</span>
            </p>
          </div>
        ) : null}
      </div>

      {/* Card Total Mix Orders */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Đơn Hàng MIX</span>
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-gray-800 font-mono">{mixAnalysis.totalMixOrders}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            Chiếm {((mixAnalysis.totalMixOrders / (totalOrdersCount || 1)) * 100).toFixed(1)}% tổng đơn trong đợt
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 rounded-full"
            style={{ width: `${(mixAnalysis.totalMixOrders / (totalOrdersCount || 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Card Total Distinct SKUs in Mix */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Số Mã SKU Trong Đơn MIX</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {mixAnalysis.distinctSkusInMix} <span className="text-xs font-normal text-gray-500">Mã SKU</span>
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Tổng cộng <b>{mixAnalysis.totalMixPcs} PCS</b> hàng
          </div>
        </div>
        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-2">
          <Layers className="w-3 h-3 text-emerald-600" />
          TB {(mixAnalysis.totalMixPcs / (mixAnalysis.totalMixOrders || 1)).toFixed(1)} PCS/đơn MIX
        </div>
      </div>
    </div>
  );
};
