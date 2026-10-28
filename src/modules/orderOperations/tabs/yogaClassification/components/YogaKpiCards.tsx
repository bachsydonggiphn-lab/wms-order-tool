import React from 'react';

interface YogaKpiCardsProps {
  totalYogaOrders: number;
  totalL46Orders: number;
  totalMix2L46: number;
  totalNormalOrders: number;
  totalMixKhac: number;
}

export const YogaKpiCards: React.FC<YogaKpiCardsProps> = ({
  totalYogaOrders,
  totalL46Orders,
  totalMix2L46,
  totalNormalOrders,
  totalMixKhac,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
        <div className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Thảm Yoga
        </div>
        <div className="text-lg font-semibold text-gray-900 mt-1">{totalYogaOrders} đơn</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
        <div className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Đơn có L46
        </div>
        <div className="text-lg font-semibold text-gray-900 mt-1">{totalL46Orders} đơn</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
        <div className="text-xs font-medium text-teal-700 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
          MIX 2 PCS (L46)
        </div>
        <div className="text-lg font-semibold text-gray-900 mt-1">{totalMix2L46} đơn</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
        <div className="text-xs font-medium text-indigo-700 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          Đơn Thông Thường
        </div>
        <div className="text-lg font-semibold text-gray-900 mt-1">{totalNormalOrders} đơn</div>
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
        <div className="text-xs font-medium text-purple-700 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          MIX Khác
        </div>
        <div className="text-lg font-semibold text-gray-900 mt-1">{totalMixKhac} đơn</div>
      </div>
    </div>
  );
};
