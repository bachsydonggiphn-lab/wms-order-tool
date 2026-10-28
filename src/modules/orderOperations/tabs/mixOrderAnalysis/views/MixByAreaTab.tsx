import React from 'react';
import { Layers, Printer, Copy, Check, Boxes } from 'lucide-react';
import { SkuInMixSummary, MixOrderAnalysisResult } from '../../../../../types';
import { formatCompactOrderList } from '../utils/mixPrintTemplates';

interface MixByAreaTabProps {
  skusGroupedByArea: Array<{
    area: string;
    skus: SkuInMixSummary[];
    totalAreaQty: number;
    distinctOrdersCount: number;
    distinctOrderNos: string[];
  }>;
  mixAnalysis: MixOrderAnalysisResult;
  copiedKey: string | null;
  onPrintByAreaTable: () => void;
  handleCopyOrders: (orderNos: string[], key: string) => void;
  setSelectedSku: (sku: string) => void;
  setViewMode: (mode: 'cluster') => void;
}

export const MixByAreaTab: React.FC<MixByAreaTabProps> = ({
  skusGroupedByArea,
  mixAnalysis,
  copiedKey,
  onPrintByAreaTable,
  handleCopyOrders,
  setSelectedSku,
  setViewMode,
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-800/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-blue-300 uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Quy Trình Nhặt Hàng Gom Theo Từng Khu Vực Kệ (1-Trip Picking Per Area)
            </span>
            <h2 className="text-xl font-black mt-1">
              Đã Phân Bổ Thành {skusGroupedByArea.length} Khu Vực Kệ ({mixAnalysis.totalMixOrders} Đơn MIX)
            </h2>
            <p className="text-xs text-blue-200 mt-1 max-w-2xl">
              Nhân viên chỉ cần đến từng khu vực (VD: <b>Khu YD-W</b>), nhặt toàn bộ các mã SKU được liệt kê từ trên xuống (xếp theo số đơn trùng nhiều nhất &rarr; ít nhất) là cấp đủ hàng cho các đơn MIX liên quan!
            </p>
          </div>
          <button
            onClick={onPrintByAreaTable}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-center shrink-0"
          >
            <Printer className="w-4 h-4" />
            In Phiếu Gom Theo Khu Vực
          </button>
        </div>
      </div>

      {/* Danh sách từng khu vực */}
      <div className="space-y-5">
        {skusGroupedByArea.map((group, groupIdx) => (
          <div
            key={group.area}
            className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden"
          >
            {/* Header từng khu vực */}
            <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50/40 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-2xs">
                  #{groupIdx + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900 font-mono">
                      KHU VỰC KỆ: <span className="text-blue-700">{group.area}</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-xs">
                      {group.skus.length} Mã SKU
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Cần lấy 1 lượt tổng cộng <b className="text-rose-600 font-mono font-bold text-sm">{group.totalAreaQty} PCS</b> &mdash; Phục vụ <b className="text-blue-600 font-bold">{group.distinctOrdersCount} đơn MIX</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyOrders(group.distinctOrderNos, `area-${group.area}`)}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === `area-${group.area}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Đã copy {group.distinctOrdersCount} mã đơn!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy {group.distinctOrdersCount} Mã Đơn Khu Này
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bảng SKU trong khu vực này */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-4 w-48">Mã SKU</th>
                    <th className="py-2.5 px-3 w-36 text-center">SL Cần Lấy (PCS)</th>
                    <th className="py-2.5 px-3 w-40 text-center">Trùng Trong Đơn MIX</th>
                    <th className="py-2.5 px-4 min-w-[200px]">SKU Mua Kèm Thường Gặp</th>
                    <th className="py-2.5 px-4 min-w-[220px]">Danh Sách Mã Đơn Cần Giao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.skus.map((item, idx) => (
                    <tr
                      key={item.sku}
                      className="hover:bg-blue-50/40 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-gray-400 font-mono font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{item.sku}</span>
                          <button
                            onClick={() => {
                              setSelectedSku(item.sku);
                              setViewMode('cluster');
                            }}
                            className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer hover:underline font-normal"
                          >
                            Xem cụm
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-base text-rose-600">
                        {item.totalQty} <span className="text-[10px] font-normal text-gray-500">PCS</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Boxes className="w-3 h-3" />
                          {item.orderCount} đơn MIX
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {item.coOccurringSkus.slice(0, 3).map((co, cIdx) => (
                            <span
                              key={cIdx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-700 border border-gray-200"
                            >
                              {co.sku} ({co.totalQty} PCS)
                            </span>
                          ))}
                          {item.coOccurringSkus.length > 3 && (
                            <span className="text-[10px] text-gray-400 self-center">
                              +{item.coOccurringSkus.length - 3} mã khác
                            </span>
                          )}
                          {item.coOccurringSkus.length === 0 && (
                            <span className="text-gray-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-[11px] text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 truncate max-w-[240px]"
                            title={item.orders.map((o) => o.orderNo).join(', ')}
                          >
                            {formatCompactOrderList(item.orders.map((o) => o.orderNo))}
                          </span>
                          <button
                            onClick={() =>
                              handleCopyOrders(
                                item.orders.map((o) => o.orderNo),
                                `area-${group.area}-${item.sku}`
                              )
                            }
                            className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer shrink-0"
                            title={`Copy toàn bộ ${item.orderCount} mã đơn`}
                          >
                            {copiedKey === `area-${group.area}-${item.sku}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
