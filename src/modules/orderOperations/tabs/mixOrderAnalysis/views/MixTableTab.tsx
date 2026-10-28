import React from 'react';
import { Table, Boxes, Check, Copy } from 'lucide-react';
import { SkuInMixSummary, MixOrderAnalysisResult } from '../../../../../types';
import { formatCompactOrderList } from '../utils/mixPrintTemplates';

interface MixTableTabProps {
  filteredSkus: SkuInMixSummary[];
  mixAnalysis: MixOrderAnalysisResult;
  copiedKey: string | null;
  handleCopyOrders: (orderNos: string[], key: string) => void;
  setSelectedSku: (sku: string) => void;
  setViewMode: (mode: 'cluster') => void;
}

export const MixTableTab: React.FC<MixTableTabProps> = ({
  filteredSkus,
  mixAnalysis,
  copiedKey,
  handleCopyOrders,
  setSelectedSku,
  setViewMode,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden space-y-0">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Table className="w-4 h-4 text-indigo-600" />
            Bảng Tổng Hợp SKU Trùng Lặp Trong Đơn MIX ({filteredSkus.length} Mã SKU)
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Liệt kê chính xác từng mã SKU xuất hiện trùng nhau ở bao nhiêu đơn hàng MIX khác nhau để lấy 1 lần duy nhất toàn bộ số lượng.
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
          Tổng {filteredSkus.reduce((a, b) => a + b.totalQty, 0)} PCS trên {mixAnalysis.totalMixOrders} đơn MIX
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-3 w-12 text-center">Hạng</th>
              <th className="py-3 px-4 w-44">Mã SKU</th>
              <th className="py-3 px-3 w-28 text-center">Khu Vực Kệ</th>
              <th className="py-3 px-3 w-36 text-center">Trùng Trong Đơn MIX</th>
              <th className="py-3 px-3 w-32 text-center">Tổng SL Cần Lấy (PCS)</th>
              <th className="py-3 px-3 w-28 text-center">Tỷ Lệ / Tổng MIX</th>
              <th className="py-3 px-4 min-w-[200px]">Các SKU Mua Kèm Thường Gặp</th>
              <th className="py-3 px-4 min-w-[220px]">Danh Sách Mã Đơn Hàng MIX Trùng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredSkus.map((item, idx) => {
              const percentage = ((item.orderCount / (mixAnalysis.totalMixOrders || 1)) * 100).toFixed(0);
              const isTop3 = idx < 3;

              return (
                <tr
                  key={item.sku}
                  className={`hover:bg-indigo-50/50 transition-colors ${
                    isTop3 ? 'bg-amber-50/20' : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                        idx === 0
                          ? 'bg-amber-500 text-white shadow-2xs'
                          : idx === 1
                          ? 'bg-slate-400 text-white'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'text-gray-400 font-mono'
                      }`}
                    >
                      {idx + 1}
                    </span>
                  </td>

                  {/* SKU */}
                  <td className="py-3 px-4 font-mono font-bold text-sm text-gray-900">
                    <div className="flex items-center gap-1.5">
                      <span>{item.sku}</span>
                      <button
                        onClick={() => {
                          setSelectedSku(item.sku);
                          setViewMode('cluster');
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer hover:underline"
                        title="Xem chi tiết gom đơn"
                      >
                        Xem cụm
                      </button>
                    </div>
                  </td>

                  {/* Area */}
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                      {item.area}
                    </span>
                  </td>

                  {/* Order Count */}
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      <Boxes className="w-3 h-3" />
                      {item.orderCount} đơn MIX
                    </span>
                  </td>

                  {/* Total Qty PCS */}
                  <td className="py-3 px-3 text-center font-mono font-black text-sm text-rose-600">
                    {item.totalQty} <span className="text-[10px] font-normal text-gray-500">PCS</span>
                  </td>

                  {/* Percentage */}
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="text-xs font-bold text-gray-700">{percentage}%</span>
                      <div className="w-12 bg-gray-100 rounded-full h-1 mt-0.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Co-occurring SKUs */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {item.coOccurringSkus.slice(0, 3).map((co, cIdx) => (
                        <span
                          key={cIdx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-700 border border-gray-200"
                          title={`${co.sku} (${co.totalQty} PCS trong ${co.orderCount} đơn)`}
                        >
                          {co.sku} ({co.totalQty})
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

                  {/* Orders & Copy */}
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
                            `tbl-${item.sku}`
                          )
                        }
                        className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer shrink-0"
                        title={`Copy toàn bộ ${item.orderCount} mã đơn của SKU ${item.sku}`}
                      >
                        {copiedKey === `tbl-${item.sku}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
