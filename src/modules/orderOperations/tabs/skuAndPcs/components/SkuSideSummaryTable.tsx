import React from 'react';
import { Layers, ChevronLeft } from 'lucide-react';
import { MobileColumnTab } from '../types';

interface SkuSideSummaryTableProps {
  isSkuTableCollapsed: boolean;
  toggleSkuTableCollapsed: () => void;
  mobileColumnTab: MobileColumnTab;
  skuEntries: [string, number][];
  totalSkuQty: number;
  skuSortMode: 'name' | 'qty';
  setSkuSortMode: (mode: 'name' | 'qty') => void;
  copiedKey: string | null;
  onCopySku: (sku: string) => void;
}

export const SkuSideSummaryTable: React.FC<SkuSideSummaryTableProps> = ({
  isSkuTableCollapsed,
  toggleSkuTableCollapsed,
  mobileColumnTab,
  skuEntries,
  totalSkuQty,
  skuSortMode,
  setSkuSortMode,
  copiedKey,
  onCopySku,
}) => {
  if (isSkuTableCollapsed) return null;

  return (
    <div
      className={`lg:col-span-4 xl:col-span-3 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex-col ${
        mobileColumnTab === 'pcs' ? 'hidden lg:flex' : 'flex'
      }`}
    >
      {/* Header */}
      <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Tổng Hợp SKU (Cột S:T)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-gray-200/70 text-gray-700 rounded-full text-[11px] font-medium">
            {skuEntries.length} mã ({totalSkuQty} PCS)
          </span>
          <button
            type="button"
            onClick={toggleSkuTableCollapsed}
            className="p-1 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-200/80 transition-colors cursor-pointer"
            title="Thu gọn bảng SKU (thụt vào để mở rộng cột PCS)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sorter & Filter bar */}
      <div className="p-2.5 bg-white border-b border-gray-100 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSkuSortMode('name')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              skuSortMode === 'name' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            A-Z
          </button>
          <button
            onClick={() => setSkuSortMode('qty')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              skuSortMode === 'qty' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Số lượng ↓
          </button>
        </div>
        <span className="text-[11px] text-gray-400">Click SKU để copy</span>
      </div>

      {/* SKU Table List */}
      <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
        {skuEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            Không có dữ liệu SKU nào
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold sticky top-0 border-b border-gray-100">
              <tr>
                <th className="py-2.5 px-3.5 w-12 text-center font-normal text-gray-400">STT</th>
                <th className="py-2.5 px-3.5">MÃ SKU</th>
                <th className="py-2.5 px-3.5 text-right">SỐ LƯỢNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {skuEntries.map(([sku, qty], idx) => {
                return (
                  <tr
                    key={sku}
                    onClick={() => onCopySku(sku)}
                    className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-3.5 text-gray-400 text-center text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3.5 font-medium text-gray-800 flex items-center justify-between">
                      <span>{sku}</span>
                      {copiedKey === `sku_${sku}` && (
                        <span className="text-[10px] text-emerald-600 font-sans font-bold ml-1">✓ Copied</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                        {qty}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
