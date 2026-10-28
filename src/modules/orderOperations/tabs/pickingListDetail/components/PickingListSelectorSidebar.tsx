import React from 'react';
import { Check, Copy } from 'lucide-react';
import { CarrierCode } from '../../../../../types';
import { PickingListStatItem } from '../types';

interface PickingListSelectorSidebarProps {
  filteredPlList: PickingListStatItem[];
  activePlFilter: string;
  setActivePlFilter: (pl: string) => void;
  onSelectPickingList: (pl: string) => void;
  selectedCarrier?: CarrierCode;
  carrierInfo: any;
  showOnlyCarrierLists: boolean;
  setShowOnlyCarrierLists: (show: boolean) => void;
  listsWithCarrierCount: number;
  totalPlCount: number;
  copiedKey: string | null;
  handleCopyText: (text: string, key: string, message?: string) => void;
}

export const PickingListSelectorSidebar: React.FC<PickingListSelectorSidebarProps> = ({
  filteredPlList,
  activePlFilter,
  setActivePlFilter,
  onSelectPickingList,
  selectedCarrier = 'ALL',
  carrierInfo,
  showOnlyCarrierLists,
  setShowOnlyCarrierLists,
  listsWithCarrierCount,
  totalPlCount,
  copiedKey,
  handleCopyText,
}) => {
  return (
    <div className="lg:col-span-4 space-y-3">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
        {/* Header sidebar */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>Chọn Picking List</span>
            <span className="text-indigo-600">({filteredPlList.length})</span>
          </h3>
          {activePlFilter && (
            <button
              onClick={() => {
                setActivePlFilter('');
                onSelectPickingList('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer"
            >
              Bỏ chọn
            </button>
          )}
        </div>

        {/* Toggle filter carrier lists vs all lists when carrier is active */}
        {selectedCarrier !== 'ALL' && (
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-3 text-xs">
            <button
              onClick={() => setShowOnlyCarrierLists(true)}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                showOnlyCarrierLists
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title={`Chỉ hiển thị các Picking List có đơn hàng của ${carrierInfo?.shortName || selectedCarrier}`}
            >
              Có đơn {carrierInfo?.shortName || selectedCarrier} ({listsWithCarrierCount})
            </button>
            <button
              onClick={() => setShowOnlyCarrierLists(false)}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                !showOnlyCarrierLists
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="Hiển thị tất cả các Picking List trong hệ thống"
            >
              Tất cả list ({totalPlCount})
            </button>
          </div>
        )}

        <div className="space-y-2.5 max-h-[660px] overflow-y-auto pr-1">
          {filteredPlList.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              {selectedCarrier !== 'ALL'
                ? `Không có Picking List nào chứa đơn của ${carrierInfo?.name || selectedCarrier}`
                : 'Không tìm thấy Picking List nào'}
            </div>
          ) : (
            filteredPlList.map((item) => {
              const isSelected = activePlFilter === item.pickingListNo;
              const skuCount = selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                ? Object.keys(item.carrierSkuMap).length
                : Object.keys(item.skuMap).length;
              const totalPcs = selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                ? item.carrierTotalPcs
                : item.totalPcs;

              return (
                <div
                  key={item.pickingListNo}
                  onClick={() => {
                    setActivePlFilter(item.pickingListNo);
                    onSelectPickingList(item.pickingListNo === 'Chưa gán PL' ? '' : item.pickingListNo);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                  }`}
                >
                  {/* Card Header: PL No & Badge số đơn */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isSelected ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-amber-500'
                        }`}
                      ></span>
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {item.pickingListNo}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {selectedCarrier !== 'ALL' && carrierInfo ? (
                        <div className="flex items-center gap-1 text-right">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${carrierInfo.badgeBg} ${carrierInfo.badgeText} ${carrierInfo.badgeBorder}`}
                          >
                            {item.carrierOrderCount} đơn {carrierInfo.shortName}
                          </span>
                          <span className="text-[10px] text-gray-400">({item.orders.length})</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {item.orders.length} đơn
                        </span>
                      )}
                    </div>
                  </div>

                  {/* SKU & PCS Count */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      Gồm <strong className="text-gray-800">{skuCount}</strong> mã SKU
                    </span>
                    <span className="font-medium text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                      {totalPcs} PCS
                    </span>
                  </div>

                  {/* Khu vực kho */}
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    {Array.from(item.areas).slice(0, 5).map((area) => (
                      <span
                        key={area}
                        className="text-[9px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded border border-gray-200 font-mono"
                      >
                        {area}
                      </span>
                    ))}
                    {item.areas.size > 5 && (
                      <span className="text-[9px] text-gray-400">+{item.areas.size - 5}</span>
                    )}
                  </div>

                  {/* Quick Copy Button */}
                  <div className="mt-2.5 pt-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetOrders =
                          selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                            ? item.carrierOrders
                            : item.orders;
                        const text = targetOrders.map((o) => o.orderNo).filter(Boolean).join('\n');
                        const label =
                          selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                            ? carrierInfo?.shortName || selectedCarrier
                            : 'List';
                        handleCopyText(
                          text,
                          `card_ord_${item.pickingListNo}`,
                          `Đã sao chép ${targetOrders.length} mã đơn ${label} của ${item.pickingListNo}`
                        );
                      }}
                      className={`w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                        copiedKey === `card_ord_${item.pickingListNo}`
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border-gray-200 hover:border-indigo-200'
                      }`}
                      title={`Sao chép toàn bộ mã đơn của ${item.pickingListNo}`}
                    >
                      {copiedKey === `card_ord_${item.pickingListNo}` ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Đã chép {selectedCarrier !== 'ALL' && item.carrierOrderCount > 0 ? item.carrierOrders.length : item.orders.length} mã đơn!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-gray-400 group-hover:text-indigo-600" />
                          <span>
                            {selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                              ? `Copy ${item.carrierOrders.length} mã đơn ${carrierInfo?.shortName || ''}`
                              : `Copy ${item.orders.length} mã đơn`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
