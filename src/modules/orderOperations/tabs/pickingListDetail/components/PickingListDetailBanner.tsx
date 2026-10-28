import React from 'react';
import { ListFilter, Truck, X, Printer } from 'lucide-react';
import { CarrierCode } from '../../../../../types';

interface PickingListDetailBannerProps {
  selectedCarrier?: CarrierCode;
  carrierInfo: any;
  listsWithCarrierCount: number;
  onSelectCarrier?: (carrier: CarrierCode) => void;
  filteredPlCount: number;
  totalPlCount: number;
  onOpenPrintModal?: () => void;
}

export const PickingListDetailBanner: React.FC<PickingListDetailBannerProps> = ({
  selectedCarrier = 'ALL',
  carrierInfo,
  listsWithCarrierCount,
  onSelectCarrier,
  filteredPlCount,
  totalPlCount,
  onOpenPrintModal,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <ListFilter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-900">
                Tổng Hợp SKU Theo Từng Picking List (Mã Đợt Nhặt Hàng)
              </h2>
              {selectedCarrier !== 'ALL' && carrierInfo && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${carrierInfo.badgeBg} ${carrierInfo.badgeText} ${carrierInfo.badgeBorder}`}>
                  <Truck className={`w-3.5 h-3.5 ${carrierInfo.iconColor}`} />
                  <span>Hãng: {carrierInfo.shortName} ({listsWithCarrierCount} lists có đơn)</span>
                  {onSelectCarrier && (
                    <button
                      onClick={() => onSelectCarrier('ALL')}
                      className="hover:opacity-75 ml-0.5 cursor-pointer"
                      title="Bỏ lọc hãng này để xem tất cả"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Xem chính xác từng Picking List gồm những SKU nào, số lượng bao nhiêu cái & sao chép mã đơn nhanh chóng theo từng list
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        <span className="text-xs text-gray-500 hidden sm:inline">
          Hiển thị: <strong className="text-gray-900">{filteredPlCount}</strong> / {totalPlCount} Picking Lists
        </span>
        {onOpenPrintModal && (
          <button
            onClick={() => onOpenPrintModal()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            title="In hàng loạt từng Picking List ra khổ tem 100x150 mm"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-400" />
            <span>In Hàng Loạt (100×150)</span>
          </button>
        )}
      </div>
    </div>
  );
};
