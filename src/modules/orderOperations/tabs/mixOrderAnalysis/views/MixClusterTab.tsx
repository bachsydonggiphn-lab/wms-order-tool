import React from 'react';
import { TrendingUp, Sparkles, Copy, Check, Printer, Layers, Boxes } from 'lucide-react';
import { SkuInMixSummary, MixOrderAnalysisResult } from '../../../../../types';

interface MixClusterTabProps {
  filteredSkus: SkuInMixSummary[];
  mixAnalysis: MixOrderAnalysisResult;
  currentSelectedSummary?: SkuInMixSummary;
  selectedSku: string | null;
  setSelectedSku: (sku: string) => void;
  copiedKey: string | null;
  handleCopyOrders: (orderNos: string[], key: string) => void;
  onPrintMixCluster: (summary: SkuInMixSummary) => void;
}

export const MixClusterTab: React.FC<MixClusterTabProps> = ({
  filteredSkus,
  mixAnalysis,
  currentSelectedSummary,
  selectedSku,
  setSelectedSku,
  copiedKey,
  handleCopyOrders,
  onPrintMixCluster,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT: SKU Ranking List (5 cols) */}
      <div className="lg:col-span-5 space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            Mã SKU Trùng Nhiều Đơn MIX Nhất ({filteredSkus.length})
          </h3>
          <span className="text-[11px] text-gray-400">Chọn 1 SKU để xem chi tiết</span>
        </div>

        <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
          {filteredSkus.map((skuItem, idx) => {
            const isSelected = currentSelectedSummary?.sku === skuItem.sku;
            const percentage = ((skuItem.orderCount / mixAnalysis.totalMixOrders) * 100).toFixed(0);

            return (
              <div
                key={skuItem.sku}
                onClick={() => setSelectedSku(skuItem.sku)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-indigo-50/90 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                    : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-gray-50/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                        idx === 0
                          ? 'bg-amber-500 text-white'
                          : idx === 1
                          ? 'bg-gray-400 text-white'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-mono font-bold text-sm text-gray-900 flex items-center gap-1.5">
                        <span>{skuItem.sku}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                          Khu {skuItem.area}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          Trùng <b>{skuItem.orderCount}</b> đơn MIX ({percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black text-indigo-700 font-mono">
                      {skuItem.totalQty} <span className="text-[10px] font-normal text-gray-500">PCS</span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {skuItem.coOccurringSkus.length} SKU đi kèm
                    </div>
                  </div>
                </div>

                {/* Progress bar of order dominance */}
                <div className="w-full bg-gray-100 rounded-full h-1 mt-2.5 overflow-hidden">
                  <div
                    className={`h-1 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-gray-300'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}

          {filteredSkus.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200 text-xs">
              Không tìm thấy SKU nào phù hợp với bộ lọc tìm kiếm.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Detail & 1-Trip Picking Plan (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {currentSelectedSummary ? (
          <>
            {/* 1-Trip Picking Directive Box */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <span className="text-[11px] font-bold tracking-wider text-indigo-300 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Kế Hoạch Gom Hàng 1 Lần Cho SKU Này (1-Trip Picking)
                  </span>
                  <h2 className="text-xl font-black font-mono mt-0.5 text-white flex items-center gap-2">
                    {currentSelectedSummary.sku}
                    <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-indigo-800 text-indigo-200 border border-indigo-700">
                      Kệ {currentSelectedSummary.area}
                    </span>
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleCopyOrders(
                        currentSelectedSummary.orders.map((o) => o.orderNo),
                        'top-copy'
                      )
                    }
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    title="Copy toàn bộ mã đơn của cụm SKU này"
                  >
                    {copiedKey === 'top-copy' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Đã copy {currentSelectedSummary.orderCount} đơn!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy {currentSelectedSummary.orderCount} Mã Đơn
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onPrintMixCluster(currentSelectedSummary)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    In Phiếu Gom Cụm
                  </button>
                </div>
              </div>

              {/* 2-Step Pick Strategy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                    Bước 1: Lấy SKU Này 1 Lần
                  </span>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    {currentSelectedSummary.totalQty} PCS
                  </div>
                  <div className="text-xs text-indigo-200 mt-0.5">
                    Tại khu vực kệ <b>{currentSelectedSummary.area}</b> để phục vụ <b>{currentSelectedSummary.orderCount} đơn hàng MIX</b>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                  <span className="text-[10px] text-sky-300 font-bold uppercase tracking-wider block">
                    Bước 2: Lấy Các SKU Phụ Đi Kèm
                  </span>
                  <div className="text-lg font-black text-white font-mono mt-0.5">
                    {currentSelectedSummary.coOccurringSkus.reduce((a, b) => a + b.totalQty, 0)} PCS
                  </div>
                  <div className="text-xs text-indigo-200 mt-0.5">
                    Gồm <b>{currentSelectedSummary.coOccurringSkus.length} loại SKU khác</b> cần gom kèm về bàn đóng gói
                  </div>
                </div>
              </div>
            </div>

            {/* Co-occurring SKUs Tags */}
            {currentSelectedSummary.coOccurringSkus.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    Danh Sách SKU Phụ Cần Lấy Kèm ({currentSelectedSummary.coOccurringSkus.length} Mã)
                  </h4>
                  <span className="text-[11px] text-gray-400">Được sắp xếp theo số lượng nhiều nhất</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {currentSelectedSummary.coOccurringSkus.map((co) => (
                    <div
                      key={co.sku}
                      className="p-2 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-gray-800 truncate" title={co.sku}>
                          {co.sku}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-white text-gray-600 rounded border border-gray-200">
                          {co.area}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500">Cần lấy:</span>
                        <span className="font-mono font-bold text-amber-700">
                          {co.totalQty} PCS ({co.orderCount} đơn)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Associated Orders Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                  Chi Tiết {currentSelectedSummary.orderCount} Đơn Hàng MIX Chứa SKU Này
                </h4>
                <button
                  onClick={() =>
                    handleCopyOrders(
                      currentSelectedSummary.orders.map((o) => o.orderNo),
                      'table-copy'
                    )
                  }
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'table-copy' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" /> Đã sao chép!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Sao chép tất cả mã đơn
                    </>
                  )}
                </button>
              </div>

              <div className="max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3">Mã Đơn (Order No)</th>
                      <th className="py-2.5 px-3">Mã Vận Đơn</th>
                      <th className="py-2.5 px-3 text-center">Tổng PCS</th>
                      <th className="py-2.5 px-3">Các Sản Phẩm Trong Đơn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentSelectedSummary.orders.map((order, idx) => (
                      <tr key={order.id || idx} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span>{order.orderNo}</span>
                            <button
                              onClick={() => handleCopyOrders([order.orderNo], `order-${idx}`)}
                              className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                              title="Copy mã đơn"
                            >
                              {copiedKey === `order-${idx}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-600">{order.trackingNo || '-'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-full font-bold text-gray-800">
                            {order.totalQty}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {order.items.map((it, itemIdx) => {
                              const isPrimary = it.sku === currentSelectedSummary.sku;
                              return (
                                <span
                                  key={itemIdx}
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                                    isPrimary
                                      ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                      : 'bg-gray-100 text-gray-700 border border-gray-200'
                                  }`}
                                >
                                  {it.sku} &times; <b>{it.qty}</b>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
