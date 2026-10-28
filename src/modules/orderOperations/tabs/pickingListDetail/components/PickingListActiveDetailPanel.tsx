import React from 'react';
import {
  Printer,
  Check,
  Copy,
  Truck,
  Package,
  Box,
} from 'lucide-react';
import { CarrierCode, SkuGroupsMap } from '../../../../../types';
import { layNhomTuSKU, CARRIER_CONFIG } from '../../../../../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../../../../../utils/skuData';
import { PickingListStatItem, ActiveDetailData } from '../types';

interface PickingListActiveDetailPanelProps {
  currentPl: PickingListStatItem | null;
  activeDetailData: ActiveDetailData | null;
  selectedCarrier?: CarrierCode;
  carrierInfo: any;
  viewScope: 'CARRIER_ONLY' | 'ALL_ORDERS';
  setViewScope: (scope: 'CARRIER_ONLY' | 'ALL_ORDERS') => void;
  onOpenPrintModal?: (pl?: string) => void;
  handleCopyPlSkuTable: (plNo: string, skuMap: Record<string, number>, label?: string) => void;
  handleCopyText: (text: string, key: string, message?: string) => void;
  copiedKey: string | null;
  skuGroups: SkuGroupsMap;
}

export const PickingListActiveDetailPanel: React.FC<PickingListActiveDetailPanelProps> = ({
  currentPl,
  activeDetailData,
  selectedCarrier = 'ALL',
  carrierInfo,
  viewScope,
  setViewScope,
  onOpenPrintModal,
  handleCopyPlSkuTable,
  handleCopyText,
  copiedKey,
  skuGroups,
}) => {
  if (!currentPl || !activeDetailData) {
    return (
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">
          Vui lòng chọn một Picking List ở cột bên trái để xem chi tiết danh sách SKU & số lượng.
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-8 space-y-6">
      <div className="space-y-6">
        {/* Header Box of Selected Picking List */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500">Đang xem chi tiết:</span>
                <h3 className="text-base font-bold text-indigo-600 font-mono tracking-tight">
                  {currentPl.pickingListNo}
                </h3>
                {selectedCarrier !== 'ALL' && carrierInfo && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${carrierInfo.badgeBg} ${carrierInfo.badgeText} ${carrierInfo.badgeBorder}`}>
                    {carrierInfo.shortName}: {currentPl.carrierOrderCount} đơn
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tổng hợp toàn bộ danh sách sản phẩm & số lượng cần lấy cho đợt nhặt hàng này
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onOpenPrintModal && (
                <button
                  onClick={() => onOpenPrintModal(currentPl.pickingListNo)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="In tem nhặt hàng 100x150 mm cho Picking List này"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                  <span>In Tem 100×150</span>
                </button>
              )}
              <button
                onClick={() =>
                  handleCopyPlSkuTable(
                    currentPl.pickingListNo,
                    activeDetailData.skuMap,
                    activeDetailData.isScopeCarrier ? carrierInfo?.shortName || '' : 'Tất cả'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors cursor-pointer"
              >
                {copiedKey === `table_${currentPl.pickingListNo}` ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>
                  {copiedKey === `table_${currentPl.pickingListNo}` ? 'Đã sao chép' : 'Sao chép List SKU'}
                </span>
              </button>
            </div>
          </div>

          {/* Carrier highlight box */}
          {selectedCarrier !== 'ALL' && carrierInfo && (
            <div className={`mt-4 p-4 rounded-xl border ${carrierInfo.badgeBg} ${carrierInfo.badgeBorder} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/90 shadow-xs flex items-center justify-center shrink-0">
                  <Truck className={`w-5 h-5 ${carrierInfo.iconColor}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">
                      {carrierInfo.name}
                    </span>
                    <span className="text-xs font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                      {currentPl.carrierOrderCount} / {currentPl.orders.length} đơn
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {currentPl.carrierOrderCount > 0
                      ? `List này có ${currentPl.carrierOrderCount} đơn ${carrierInfo.shortName} (${currentPl.carrierTotalPcs} PCS sản phẩm)`
                      : `List này không có đơn hàng nào của ${carrierInfo.shortName}`}
                  </p>
                </div>
              </div>

              {currentPl.carrierOrderCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const orderNos = currentPl.carrierOrders.map((o) => o.orderNo).filter(Boolean).join('\n');
                      handleCopyText(
                        orderNos,
                        `banner_ord_${currentPl.pickingListNo}`,
                        `Đã sao chép ${currentPl.carrierOrders.length} mã đơn ${carrierInfo.shortName} của ${currentPl.pickingListNo}!`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedKey === `banner_ord_${currentPl.pickingListNo}` ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedKey === `banner_ord_${currentPl.pickingListNo}`
                        ? `Đã sao chép ${currentPl.carrierOrders.length} mã!`
                        : `Sao chép ${currentPl.carrierOrders.length} Mã Đơn ${carrierInfo.shortName}`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const trackingNos = currentPl.carrierOrders
                        .map((o) => o.trackingNo)
                        .filter(Boolean)
                        .join('\n');
                      handleCopyText(
                        trackingNos,
                        `banner_track_${currentPl.pickingListNo}`,
                        `Đã sao chép mã vận đơn (Tracking) ${carrierInfo.shortName} của ${currentPl.pickingListNo}!`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold border border-gray-200 shadow-xs transition-colors cursor-pointer"
                  >
                    {copiedKey === `banner_track_${currentPl.pickingListNo}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-gray-500" />
                    )}
                    <span>
                      {copiedKey === `banner_track_${currentPl.pickingListNo}`
                        ? 'Đã sao chép Tracking!'
                        : 'Sao chép Tracking'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Scope selector tabs */}
          {selectedCarrier !== 'ALL' && currentPl.carrierOrderCount > 0 && (
            <div className="mt-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setViewScope('CARRIER_ONLY')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    viewScope === 'CARRIER_ONLY'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Chỉ xem {carrierInfo?.shortName} ({currentPl.carrierOrderCount} đơn)
                </button>
                <button
                  onClick={() => setViewScope('ALL_ORDERS')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    viewScope === 'ALL_ORDERS'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Xem toàn bộ {currentPl.orders.length} đơn trong List
                </button>
              </div>

              <span className="text-xs text-gray-500 hidden sm:inline">
                Đang xem: <strong>{activeDetailData.isScopeCarrier ? carrierInfo?.name : 'Toàn bộ đơn'}</strong>
              </span>
            </div>
          )}

          {/* Metrics of Selected PL */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
              <div className="text-[10px] uppercase font-bold text-gray-400">Số lượng đơn</div>
              <div className="text-sm font-bold text-gray-900 mt-0.5">
                {activeDetailData.orders.length} đơn
                {activeDetailData.isScopeCarrier && currentPl.orders.length !== activeDetailData.orders.length && (
                  <span className="text-[11px] font-normal text-gray-400 ml-1">
                    / {currentPl.orders.length} tổng
                  </span>
                )}
              </div>
            </div>
            <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
              <div className="text-[10px] uppercase font-bold text-gray-400">Số mã SKU khác nhau</div>
              <div className="text-sm font-bold text-indigo-600 mt-0.5">
                {Object.keys(activeDetailData.skuMap).length} mã
              </div>
            </div>
            <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
              <div className="text-[10px] uppercase font-bold text-gray-400">Tổng sản phẩm (PCS)</div>
              <div className="text-sm font-bold text-emerald-600 mt-0.5">
                {activeDetailData.totalPcs} cái
              </div>
            </div>
            <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
              <div className="text-[10px] uppercase font-bold text-gray-400">Loại đơn (1 PCS / MULTI)</div>
              <div className="text-xs font-semibold text-gray-700 mt-0.5">
                {activeDetailData.singlePcsCount} đơn 1 PCS | {activeDetailData.multiPcsCount} đơn Multi
              </div>
            </div>
          </div>
        </div>

        {/* SKU Breakdown Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Danh Sách SKU & Số Lượng Cần Lấy ({activeDetailData.isScopeCarrier ? carrierInfo?.shortName : currentPl.pickingListNo})
              </h4>
            </div>
            <span className="text-xs font-medium text-gray-500">
              {Object.keys(activeDetailData.skuMap).length} mã SKU | Tổng {activeDetailData.totalPcs} PCS
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-2.5 px-3.5 w-12 text-center text-gray-400 font-normal">STT</th>
                  <th className="py-2.5 px-3.5">Mã SKU</th>
                  <th className="py-2.5 px-3.5">Khu Vực Kho</th>
                  <th className="py-2.5 px-3.5 text-center">Số Lượng Cần Lấy</th>
                  <th className="py-2.5 px-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {Object.keys(activeDetailData.skuMap).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-gray-400 font-sans">
                      Không có sản phẩm nào cho đợt lọc này
                    </td>
                  </tr>
                ) : (
                  Object.entries(activeDetailData.skuMap).map(([sku, qty], idx) => {
                    const area = layNhomTuSKU(sku, skuGroups, DEFAULT_AREA_ORDER);
                    return (
                      <tr key={sku} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 text-center text-gray-400 text-[11px] font-sans">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-gray-900">{sku}</td>
                        <td className="py-2.5 px-3.5 font-sans">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium border border-gray-200">
                            {area}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {qty}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-sans">
                          <button
                            onClick={() => handleCopyText(sku, `sku_${sku}`, `Đã sao chép mã SKU ${sku}`)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-gray-100 cursor-pointer"
                            title="Sao chép mã SKU"
                          >
                            {copiedKey === `sku_${sku}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-gray-50/90 font-semibold text-gray-900 border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3.5 text-right text-xs uppercase font-sans">
                    Tổng cộng sản phẩm cần nhặt:
                  </td>
                  <td className="py-2.5 px-3.5 text-center text-sm font-bold text-emerald-600">
                    {activeDetailData.totalPcs} PCS
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Danh sách các đơn hàng thuộc Picking List này */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Danh Sách {activeDetailData.orders.length} Đơn Hàng Trong {currentPl.pickingListNo}
                {activeDetailData.isScopeCarrier && ` (${carrierInfo?.shortName})`}
              </h4>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const orderList = activeDetailData.orders.map((o) => o.orderNo).filter(Boolean).join('\n');
                  handleCopyText(
                    orderList,
                    `orders_${currentPl.pickingListNo}`,
                    `Đã sao chép ${activeDetailData.orders.length} Order No!`
                  );
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
              >
                {copiedKey === `orders_${currentPl.pickingListNo}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy {activeDetailData.orders.length} Order No</span>
              </button>

              <button
                onClick={() => {
                  const trackingList = activeDetailData.orders
                    .map((o) => o.trackingNo)
                    .filter(Boolean)
                    .join('\n');
                  handleCopyText(
                    trackingList,
                    `trackings_${currentPl.pickingListNo}`,
                    `Đã sao chép Tracking No!`
                  );
                }}
                className="text-xs text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1 cursor-pointer bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200"
              >
                {copiedKey === `trackings_${currentPl.pickingListNo}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                )}
                <span>Copy Tracking</span>
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto">
            {activeDetailData.orders.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-xs text-gray-400">
                Không có đơn hàng nào
              </div>
            ) : (
              activeDetailData.orders.map((order, idx) => {
                const cConfig = CARRIER_CONFIG[order.carrier] || CARRIER_CONFIG.OTHER;
                return (
                  <div
                    key={order.id || idx}
                    className="p-3 bg-gray-50/70 border border-gray-200 rounded-xl flex flex-col justify-between gap-2 hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gray-900">
                        <span>{order.orderNo}</span>
                        <button
                          onClick={() =>
                            handleCopyText(order.orderNo, `ord_${order.id}`, `Đã sao chép ${order.orderNo}`)
                          }
                          className="text-gray-400 hover:text-indigo-600 cursor-pointer p-0.5"
                          title="Sao chép Order No"
                        >
                          {copiedKey === `ord_${order.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${cConfig.badgeBg} ${cConfig.badgeText} ${cConfig.badgeBorder}`}
                        >
                          {cConfig.shortName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-600 font-medium">
                          {order.items.reduce((s, i) => s + i.qty, 0)} PCS
                        </span>
                      </div>
                    </div>

                    {order.trackingNo && (
                      <div className="text-[11px] text-gray-500 font-mono flex items-center justify-between">
                        <span className="truncate">Track: {order.trackingNo}</span>
                        <button
                          onClick={() =>
                            handleCopyText(
                              order.trackingNo,
                              `trk_${order.id}`,
                              `Đã sao chép Tracking ${order.trackingNo}`
                            )
                          }
                          className="text-gray-400 hover:text-indigo-600 cursor-pointer p-0.5 shrink-0"
                          title="Sao chép Tracking No"
                        >
                          {copiedKey === `trk_${order.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    <div className="space-y-1 bg-white p-2 rounded-lg border border-gray-100 text-[11px] font-mono">
                      {order.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-gray-700">
                          <span>{it.sku}</span>
                          <span className="font-bold text-indigo-600">x{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
