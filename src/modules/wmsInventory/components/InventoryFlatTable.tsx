import React from 'react';
import {
  Printer,
  ArrowUpDown,
  Check,
  Copy
} from 'lucide-react';
import { WmsInventoryItem, InventoryQueryResult } from '../../../types';

type SortField = 'inUsed' | 'sellable' | 'onWay' | 'outbound' | 'sku' | 'group';
type SortOrder = 'asc' | 'desc';

interface SkuDiffInfo {
  diffInUsed: number;
  diffSellable: number;
  diffOnWay: number;
  diffOutbound: number;
}

interface InventoryFlatTableProps {
  sortedTableItems: WmsInventoryItem[];
  data: InventoryQueryResult | null;
  handleOpenPrintModal: (mode: 'COLUMN_MATRIX' | 'DETAILED_TABLE') => void;
  sortField: SortField;
  setSortField: (f: SortField) => void;
  sortOrder: SortOrder;
  setSortOrder: (o: SortOrder) => void;
  handleSort: (field: SortField) => void;
  copiedSku: string | null;
  handleCopySku: (sku: string) => void;
  handleOpenSkuLabel: (item: WmsInventoryItem) => void;
  changedSkuMap: Record<string, SkuDiffInfo>;
}

export const InventoryFlatTable: React.FC<InventoryFlatTableProps> = ({
  sortedTableItems,
  data,
  handleOpenPrintModal,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  handleSort,
  copiedSku,
  handleCopySku,
  handleOpenSkuLabel,
  changedSkuMap
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-700">
        <div className="flex items-center gap-2">
          <span>Hiển thị {sortedTableItems.length} mã sản phẩm</span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-extrabold">
            Sắp xếp vần chữ cái & số (A → Z, 0 → 9)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenPrintModal('COLUMN_MATRIX')}
            disabled={!data || data.items.length === 0}
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-800 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all disabled:opacity-50"
            title="In danh sách SKU đang lọc"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-600" />
            <span>In Bảng Này</span>
          </button>

          <span className="text-slate-500 font-semibold text-[11px]">Sắp xếp theo:</span>
          <select
            value={`${sortField}_${sortOrder}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('_') as [SortField, SortOrder];
              setSortField(f);
              setSortOrder(o);
            }}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="sku_asc">🔤 Mã SKU (A → Z & Số) [Chuẩn]</option>
            <option value="sku_desc">🔤 Mã SKU (Z → A)</option>
            <option value="group_asc">🏷️ Nhóm SKU (A → Z)</option>
            <option value="inUsed_desc">📦 Khả dụng (Nhiều → Ít)</option>
            <option value="inUsed_asc">📦 Khả dụng (Ít → Nhiều)</option>
            <option value="onWay_desc">🚚 Đang về (Nhiều → Ít)</option>
            <option value="outbound_desc">⏳ Chờ xuất (Nhiều → Ít)</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[750px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
            <tr className="text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
              <th className="py-3 px-4 w-12 text-center">STT</th>
              <th
                onClick={() => handleSort('sku')}
                className="py-3 px-4 w-44 cursor-pointer hover:bg-slate-200/80 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Mã SKU</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('group')}
                className="py-3 px-3 w-28 cursor-pointer hover:bg-slate-200/80 transition-colors"
              >
                <div className="flex items-center gap-1">
                  <span>Nhóm SKU</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">Tên Sản Phẩm</th>
              <th
                onClick={() => handleSort('inUsed')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Khả Dụng</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('sellable')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Có Thể Bán</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('onWay')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Đang Về</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('outbound')}
                className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200/80 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Chờ Xuất</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-3 text-right">Hàng Lỗi</th>
              <th className="py-3 px-4 text-center w-28">Cập Nhật</th>
              <th className="py-3 px-3 text-center w-20">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedTableItems.map((item, idx) => {
              const isItemCopied = copiedSku === item.sku;
              const isZero = item.inUsed <= 0;
              const diff = changedSkuMap[item.sku];

              return (
                <tr
                  key={item.id || item.sku}
                  className={`transition-colors ${
                    diff
                      ? 'bg-amber-100/60 ring-2 ring-amber-400'
                      : isZero
                      ? 'bg-rose-50/20'
                      : 'hover:bg-emerald-50/30'
                  }`}
                >
                  <td className="py-2.5 px-4 text-center text-slate-400 font-semibold text-[11px]">
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        {item.sku}
                      </span>
                      {diff && diff.diffInUsed !== 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-black animate-bounce ${
                            diff.diffInUsed > 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}
                        >
                          {diff.diffInUsed > 0 ? `+${diff.diffInUsed}` : diff.diffInUsed}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-emerald-800">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                      {item.group}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 max-w-md truncate" title={item.title}>
                    {item.title || item.productName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-md font-extrabold ${
                        isZero
                          ? 'bg-rose-100 text-rose-700'
                          : item.inUsed > 500
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {item.inUsed.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                    {item.sellable.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-amber-600">
                    {item.onWay > 0 ? `+${item.onWay.toLocaleString()}` : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-purple-600">
                    {item.outbound > 0 ? item.outbound.toLocaleString() : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                    {item.unsellable > 0 ? item.unsellable.toLocaleString() : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-center text-[10px] text-slate-400">
                    {item.updateTime ? item.updateTime.slice(5) : '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenSkuLabel(item)}
                        className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-colors shadow-2xs"
                        title={`In tem nhãn SKU ${item.sku} (Máy in nhiệt XP-D465B)`}
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleCopySku(item.sku)}
                        className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                        title="Sao chép mã SKU"
                      >
                        {isItemCopied ? (
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
