import React from 'react';
import { Zap, Flame, MapPin } from 'lucide-react';
import { CarrierCode } from '../../../../../types';
import { CARRIER_CONFIG } from '../../../../../utils/orderProcessor';
import { SinglePcsViewMode } from '../types';

interface SinglePcsHeaderBannerProps {
  totalOrders: number;
  totalSkus: number;
  pcsModeLabel: string;
  selectedCarrier?: CarrierCode;
  viewMode: SinglePcsViewMode;
  setViewMode: (mode: SinglePcsViewMode) => void;
}

export const SinglePcsHeaderBanner: React.FC<SinglePcsHeaderBannerProps> = ({
  totalOrders,
  totalSkus,
  pcsModeLabel,
  selectedCarrier = 'ALL',
  viewMode,
  setViewMode,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            Phân Tách Đơn Theo Mã SKU & Số Lượng PCS
          </h2>
          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-semibold">
            {totalOrders} đơn ({totalSkus} mã SKU)
          </span>
          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
            {pcsModeLabel}
          </span>
          {selectedCarrier !== 'ALL' && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CARRIER_CONFIG[selectedCarrier]?.badgeBg} ${CARRIER_CONFIG[selectedCarrier]?.badgeText} ${CARRIER_CONFIG[selectedCarrier]?.badgeBorder}`}
            >
              ĐVVC: {CARRIER_CONFIG[selectedCarrier]?.shortName}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Tùy chọn lọc <strong>Đơn 1 PCS, 2 PCS, 3 PCS, Đơn đồng chất</strong> hoặc bất kỳ số lượng nào. Tự động sắp xếp từ <strong className="text-gray-700">Cao ➔ Thấp</strong> để đóng gói hàng loạt trước.
        </p>
      </div>

      <div className="flex items-center gap-1.5 p-1 bg-gray-100/90 rounded-xl border border-gray-200/80 shrink-0 self-start lg:self-auto">
        <button
          onClick={() => setViewMode('by_sku')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'by_sku'
              ? 'bg-white text-indigo-700 shadow-xs border border-gray-200/70'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Theo Mã SKU (Cao ➔ Thấp)</span>
        </button>
        <button
          onClick={() => setViewMode('by_area')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            viewMode === 'by_area'
              ? 'bg-white text-indigo-700 shadow-xs border border-gray-200/70'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-blue-500" />
          <span>Theo 13 Khu Vực Kho</span>
        </button>
      </div>
    </div>
  );
};
