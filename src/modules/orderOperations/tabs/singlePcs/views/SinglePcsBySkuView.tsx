import React from 'react';
import {
  CheckSquare,
  Square,
  Check,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { SkuPackingItem, SkuPackingSortMode } from '../../../../../types';

interface SinglePcsBySkuViewProps {
  filteredSkuList: SkuPackingItem[];
  pcsModeLabel: string;
  sortMode: SkuPackingSortMode;
  selectedSkus: Set<string>;
  completedSkus: Set<string>;
  copiedKey: string | null;
  handleToggleSku: (sku: string) => void;
  handleToggleComplete: (sku: string) => void;
  handleCopySkuOrders: (sku: string, orderNos: string[]) => void;
  onCopySingleOrder: (orderNo: string) => void;
}

export const SinglePcsBySkuView: React.FC<SinglePcsBySkuViewProps> = ({
  filteredSkuList,
  pcsModeLabel,
  sortMode,
  selectedSkus,
  completedSkus,
  copiedKey,
  handleToggleSku,
  handleToggleComplete,
  handleCopySkuOrders,
  onCopySingleOrder,
}) => {
  if (filteredSkuList.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
        Không tìm thấy mã SKU nào phù hợp với bộ lọc hiện tại ({pcsModeLabel}).
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
      {filteredSkuList.map((item, index) => {
        const isSelected = selectedSkus.has(item.sku);
        const isCompleted = completedSkus.has(item.sku);
        const isTop1 = index === 0 && sortMode === 'order_count_desc';
        const isTop2 = index === 1 && sortMode === 'order_count_desc';
        const isTop3 = index === 2 && sortMode === 'order_count_desc';

        return (
          <div
            key={item.sku}
            className={`rounded-2xl border transition-all flex flex-col overflow-hidden ${
              isCompleted
                ? 'bg-emerald-50/40 border-emerald-200 opacity-75'
                : isSelected
                ? 'bg-indigo-50/40 border-indigo-400 shadow-md ring-2 ring-indigo-500/20'
                : 'bg-white border-gray-200 hover:border-gray-300 shadow-2xs hover:shadow-xs'
            }`}
          >
            {/* Header */}
            <div
              className={`p-3.5 border-b flex items-start justify-between gap-2 ${
                isSelected
                  ? 'bg-indigo-50/80 border-indigo-200'
                  : isCompleted
                  ? 'bg-emerald-100/50 border-emerald-200'
                  : 'bg-gray-50/70 border-gray-100'
              }`}
            >
              <div className="flex items-start gap-2.5 truncate">
                {/* Checkbox */}
                <button
                  onClick={() => handleToggleSku(item.sku)}
                  className="mt-0.5 text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer shrink-0"
                  title={isSelected ? 'Bỏ chọn SKU này' : 'Chọn SKU này để đóng gói'}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>

                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    {/* Rank Badge */}
                    {isTop1 ? (
                      <span className="px-1.5 py-0.2 bg-amber-400 text-indigo-950 rounded text-[10px] font-black tracking-tight shrink-0">
                        #1 TOP
                      </span>
                    ) : isTop2 ? (
                      <span className="px-1.5 py-0.2 bg-slate-300 text-gray-800 rounded text-[10px] font-bold shrink-0">
                        #2
                      </span>
                    ) : isTop3 ? (
                      <span className="px-1.5 py-0.2 bg-amber-700/20 text-amber-900 rounded text-[10px] font-bold shrink-0">
                        #3
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-gray-400 shrink-0">
                        #{index + 1}
                      </span>
                    )}

                    <h3
                      className="font-mono font-bold text-xs text-gray-900 truncate"
                      title={item.sku}
                    >
                      {item.sku}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] px-2 py-0.5 bg-gray-200/80 text-gray-700 rounded-md font-medium truncate max-w-[120px]">
                      {item.area}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-md flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" /> Đã đóng
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order Count Badge */}
              <div className="text-right shrink-0">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black border ${
                    isTop1
                      ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                      : isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-800 border-gray-200'
                  }`}
                >
                  {item.orderCount} <span className="text-[10px] font-normal ml-0.5">đơn</span>
                </span>
              </div>
            </div>

            {/* Progress Bar & Stats */}
            <div className="px-3.5 py-2 bg-white/60 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <div className="flex items-center gap-1.5 w-1/2">
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isTop1 ? 'bg-amber-500' : isSelected ? 'bg-indigo-600' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(8, item.percentage * 3))}%` }}
                  />
                </div>
              </div>
              <span className="font-semibold text-gray-700 text-[10px]">
                {item.percentage}% ({item.totalQty} PCS)
              </span>
            </div>

            {/* Order No List */}
            <div className="p-3 space-y-1 max-h-48 overflow-y-auto font-mono flex-1 bg-white">
              {item.orderNos.map((orderNo, idx) => (
                <div
                  key={idx}
                  onClick={() => onCopySingleOrder(orderNo)}
                  className="text-[11px] text-gray-700 hover:text-indigo-600 hover:bg-indigo-50/60 p-1.5 rounded-lg border border-transparent hover:border-indigo-100 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <span className="truncate">{orderNo}</span>
                  {copiedKey === `ord_${orderNo}` ? (
                    <span className="text-[9px] text-emerald-600 font-bold font-sans">✓ Đã chép</span>
                  ) : (
                    <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="p-2.5 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-1.5">
              <button
                onClick={() => handleCopySkuOrders(item.sku, item.orderNos)}
                className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-semibold text-gray-700 transition-colors cursor-pointer shadow-2xs"
                title={`Sao chép toàn bộ ${item.orderCount} Order No của SKU ${item.sku}`}
              >
                {copiedKey === `sku_${item.sku}` ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Đã chép {item.orderCount} đơn</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-gray-500" />
                    <span>Chép {item.orderCount} đơn</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleToggleComplete(item.sku)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-white hover:bg-emerald-50 text-gray-400 hover:text-emerald-700 border-gray-200'
                }`}
                title={isCompleted ? 'Hủy đánh dấu hoàn thành' : 'Đánh dấu đã đóng gói xong'}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
