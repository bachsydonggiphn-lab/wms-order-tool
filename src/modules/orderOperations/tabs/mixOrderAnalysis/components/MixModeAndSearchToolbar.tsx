import React from 'react';
import { Target, Layers, Table, Boxes, Sparkles, Printer, Copy, Check, Search } from 'lucide-react';
import { ViewMode, SortBy } from '../types';
import { MixOrderAnalysisResult } from '../../../../../types';

interface MixModeAndSearchToolbarProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  areaFilter: string;
  setAreaFilter: (area: string) => void;
  sortBy: SortBy;
  setSortBy: (sortBy: SortBy) => void;
  availableAreas: string[];
  mixAnalysis: MixOrderAnalysisResult;
  copiedKey: string | null;
  onPrintByGroupTable: () => void;
  onPrintByAreaTable: () => void;
  onPrintFullMixTable: () => void;
  onCopyOrders: (orderNos: string[], key: string) => void;
}

export const MixModeAndSearchToolbar: React.FC<MixModeAndSearchToolbarProps> = ({
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  areaFilter,
  setAreaFilter,
  sortBy,
  setSortBy,
  availableAreas,
  mixAnalysis,
  copiedKey,
  onPrintByGroupTable,
  onPrintByAreaTable,
  onPrintFullMixTable,
  onCopyOrders,
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Mode switch buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto">
          <button
            onClick={() => setViewMode('by_group')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'by_group'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            Bóc Tách Đơn MIX Theo Nhóm Hàng (Cùng Nhóm & Chéo Nhóm)
          </button>
          <button
            onClick={() => setViewMode('by_area')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'by_area'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Gom Đơn MIX Theo Khu Vực Kệ (YD-W, YD-D...)
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'table'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Bảng Tổng Hợp SKU Trùng Lặp (Toàn Bộ Kho)
          </button>
          <button
            onClick={() => setViewMode('cluster')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'cluster'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Chi Tiết Từng SKU & Kế Hoạch Gom Hàng 1 Lần
          </button>
          <button
            onClick={() => setViewMode('combos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              viewMode === 'combos'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Top Cặp SKU Hay Mua Kèm (Combos)
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {viewMode === 'by_group' ? (
            <button
              onClick={onPrintByGroupTable}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="In bảng bóc tách đơn MIX theo nhóm hàng cùng nhóm và chéo nhóm"
            >
              <Printer className="w-3.5 h-3.5" />
              In Bảng Theo Nhóm Hàng
            </button>
          ) : (
            <button
              onClick={onPrintByAreaTable}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="In phiếu nhặt hàng gom theo từng khu vực kệ YD-W, YD-D..."
            >
              <Printer className="w-3.5 h-3.5" />
              In Theo Khu Vực Kệ
            </button>
          )}
          <button
            onClick={onPrintFullMixTable}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200"
          >
            <Printer className="w-3.5 h-3.5" />
            In Bảng Tổng Toàn Kho
          </button>
          <button
            onClick={() =>
              onCopyOrders(
                mixAnalysis.allMixOrders.map((o) => o.orderNo),
                'all-mix-orders'
              )
            }
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {copiedKey === 'all-mix-orders' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Đã copy {mixAnalysis.totalMixOrders} mã đơn!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Tất Cả {mixAnalysis.totalMixOrders} Mã Đơn MIX
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm mã SKU, nhóm hàng hoặc mã đơn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
          />
        </div>

        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
        >
          <option value="ALL">Tất cả khu vực ({availableAreas.length})</option>
          {availableAreas.map((a) => (
            <option key={a} value={a}>
              Khu vực {a}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
        >
          <option value="area_orders">Sắp xếp: Gom theo Khu vực kệ &rarr; Trùng nhiều đơn nhất</option>
          <option value="orders">Sắp xếp: Trùng nhiều Đơn MIX nhất trước (Toàn kho)</option>
          <option value="qty">Sắp xếp: Tổng SL PCS lấy nhiều nhất trước</option>
          <option value="sku">Sắp xếp: Theo Tên Mã SKU (A-Z)</option>
        </select>
      </div>
    </div>
  );
};
