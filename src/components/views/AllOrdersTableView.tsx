import React, { useState, useMemo } from 'react';
import { Search, Copy, Check, Filter, ExternalLink, ChevronDown, ChevronRight, Truck } from 'lucide-react';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../types';
import { layNhomTuSKU, CARRIER_CONFIG, xacDinhDonViVanChuyen } from '../../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';

interface AllOrdersTableViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  onSelectCarrier?: (c: CarrierCode) => void;
  searchTerm: string;
}

export const AllOrdersTableView: React.FC<AllOrdersTableViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
  onSelectCarrier,
  searchTerm,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (selectedPickingList && order.pickingList !== selectedPickingList) {
        return false;
      }
      if (selectedCarrier && selectedCarrier !== 'ALL') {
        const orderCarrier = xacDinhDonViVanChuyen(order.trackingNo, order.rawOrderText).carrier;
        if (orderCarrier !== selectedCarrier) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchOrder = order.orderNo.toLowerCase().includes(term);
        const matchTracking = order.trackingNo.toLowerCase().includes(term);
        const matchCarrier = (order.carrierName || '').toLowerCase().includes(term);
        const matchPicking = order.pickingList.toLowerCase().includes(term);
        const matchSku = order.items.some((it) => it.sku.toLowerCase().includes(term));
        const matchRaw = order.rawOrderText.toLowerCase().includes(term);
        if (!matchOrder && !matchTracking && !matchCarrier && !matchPicking && !matchSku && !matchRaw) {
          return false;
        }
      }
      return true;
    });
  }, [orders, selectedPickingList, selectedCarrier, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const displayedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const getCarrierBadge = (carrier?: CarrierCode, carrierName?: string) => {
    const c = carrier || 'OTHER';
    if (c === 'JNT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
          J&T Express
        </span>
      );
    }
    if (c === 'SPX') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
          Shopee Express
        </span>
      );
    }
    if (c === 'GHN') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
          GHN
        </span>
      );
    }
    if (c === 'GHN_TIKTOK') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
          GHN TikTok
        </span>
      );
    }
    if (c === 'VNPOST') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Vietnam Post
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        {carrierName || 'Khác'}
      </span>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden space-y-0">
      {/* Top Header */}
      <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              Bảng Dữ Liệu Chi Tiết Từng Đơn Hàng
            </h2>
            {selectedCarrier && selectedCarrier !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                ĐVVC: {CARRIER_CONFIG[selectedCarrier]?.name || selectedCarrier}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Hiển thị {filteredOrders.length} / {orders.length} đơn hàng (Cột P: Order No, Q: Tracking, U: Picking List, ĐVVC)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">Hiển thị:</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 shadow-2xs cursor-pointer focus:outline-none focus:border-indigo-500"
          >
            <option value={15}>15 dòng</option>
            <option value={25}>25 dòng</option>
            <option value={50}>50 dòng</option>
            <option value={100}>100 dòng</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
            <tr>
              <th className="py-2.5 px-3.5 w-12 text-center font-normal text-gray-400">STT</th>
              <th className="py-2.5 px-3.5">Mã Đơn (Order No)</th>
              <th className="py-2.5 px-3.5">Mã Tracking</th>
              <th className="py-2.5 px-3.5">ĐVVC (Vận Chuyển)</th>
              <th className="py-2.5 px-3.5">Picking List</th>
              <th className="py-2.5 px-3.5">Chi Tiết SKU (Piece)</th>
              <th className="py-2.5 px-3.5 text-center">Tổng PCS</th>
              <th className="py-2.5 px-3.5">Khu Vực</th>
              <th className="py-2.5 px-3.5 text-center">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400">
                  Không tìm thấy đơn hàng nào khớp với tìm kiếm hoặc bộ lọc ĐVVC.
                </td>
              </tr>
            ) : (
              displayedOrders.map((order, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                const isExpanded = expandedRowId === order.id;
                const primaryArea =
                  order.items.length === 1
                    ? layNhomTuSKU(order.items[0].sku, skuGroups, DEFAULT_AREA_ORDER)
                    : 'MIX';

                return (
                  <React.Fragment key={order.id}>
                    <tr
                      className={`hover:bg-gray-50/80 transition-colors ${
                        order.isRealTimeNew
                          ? 'bg-emerald-50/80 border-l-4 border-l-emerald-500'
                          : isExpanded
                          ? 'bg-gray-50/50'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-3.5 text-center text-gray-400 font-mono text-[11px]">
                        {globalIndex}
                      </td>

                      <td className="py-2.5 px-3.5 font-medium text-gray-900 font-mono">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{order.orderNo}</span>
                          {order.isRealTimeNew && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500 text-white animate-pulse">
                              MỚI
                            </span>
                          )}
                          <button
                            onClick={() => handleCopy(order.orderNo, `ord_${order.id}`)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            {copiedKey === `ord_${order.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 font-mono text-gray-600">
                        {order.trackingNo ? (
                          <div className="flex items-center gap-1">
                            <span>{order.trackingNo}</span>
                            <button
                              onClick={() => handleCopy(order.trackingNo, `trk_${order.id}`)}
                              className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {copiedKey === `trk_${order.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5">
                        {(() => {
                          const cInfo = xacDinhDonViVanChuyen(order.trackingNo, order.rawOrderText);
                          return getCarrierBadge(cInfo.carrier, cInfo.carrierName);
                        })()}
                      </td>

                      <td className="py-2.5 px-3.5 font-mono">
                        {order.pickingList ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {order.pickingList}
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3.5">
                        <div className="flex flex-wrap gap-1">
                          {order.items.map((it, i) => (
                            <span
                              key={i}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono ${
                                it.sku === 'YD-L46-1'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : order.hasYoga
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-gray-100 text-gray-700 border border-gray-200'
                              }`}
                            >
                              <span>{it.sku}</span>
                              <span className="font-semibold text-indigo-600">×{it.qty}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            order.totalQty === 1
                              ? 'bg-gray-100 text-gray-700'
                              : order.totalQty === 2
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}
                        >
                          {order.totalQty} PCS
                        </span>
                      </td>

                      <td className="py-2.5 px-3.5 font-medium text-gray-700">
                        <span>{primaryArea || 'Chưa rõ'}</span>
                      </td>

                      <td className="py-2.5 px-3.5 text-center">
                        <button
                          onClick={() => setExpandedRowId(isExpanded ? null : order.id)}
                          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer"
                          title="Xem dữ liệu gốc của dòng này"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <tr className="bg-gray-50/60 border-b border-gray-100">
                        <td colSpan={9} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                              <div className="font-semibold text-gray-700 mb-1 flex items-center justify-between">
                                <span>Gốc Cột C (Thông tin đơn):</span>
                                <span className="text-[10px] text-gray-500 font-normal">
                                  {order.carrierName}
                                </span>
                              </div>
                              <pre className="font-mono text-[11px] text-gray-600 whitespace-pre-wrap">
                                {order.rawOrderText || '(trống)'}
                              </pre>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                              <div className="font-semibold text-gray-700 mb-1">
                                Gốc Cột G (Piece):
                              </div>
                              <pre className="font-mono text-[11px] text-gray-600 whitespace-pre-wrap">
                                {order.rawPieceText || '(trống)'}
                              </pre>
                            </div>

                            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
                              <div className="font-semibold text-gray-700 mb-1">
                                Gốc Cột R (Picking List):
                              </div>
                              <pre className="font-mono text-[11px] text-gray-600 whitespace-pre-wrap">
                                {order.rawPickingText || '(trống)'}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
          <div>
            Trang {currentPage} / {totalPages} (Tổng {filteredOrders.length} đơn)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 shadow-2xs cursor-pointer"
            >
              ← Trước
            </button>
            <span className="px-2 font-semibold text-gray-900">{currentPage}</span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 shadow-2xs cursor-pointer"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
