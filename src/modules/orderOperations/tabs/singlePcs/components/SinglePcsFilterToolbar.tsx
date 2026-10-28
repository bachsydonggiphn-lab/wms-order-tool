import React from 'react';
import {
  Boxes,
  Minus,
  Plus,
  Filter,
  ArrowUpDown,
  Search,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import { SkuPackingPcsMode, SkuPackingSortMode, SkuPackingItem } from '../../../../../types';
import { AvailablePcsStats } from '../types';

interface SinglePcsFilterToolbarProps {
  availablePcsStats: AvailablePcsStats;
  pcsMode: SkuPackingPcsMode;
  setPcsMode: (mode: SkuPackingPcsMode) => void;
  customPcsInput: number;
  setCustomPcsInput: (n: number) => void;
  sortMode: SkuPackingSortMode;
  setSortMode: (mode: SkuPackingSortMode) => void;
  selectedAreaFilter: string;
  setSelectedAreaFilter: (area: string) => void;
  dynamicAreaList: string[];
  localSearch: string;
  setLocalSearch: (val: string) => void;
  filteredSkuList: SkuPackingItem[];
  handleSelectRangeOrders: (min: number, max: number) => void;
  handleSelectMinOrders: (min: number) => void;
  handleSelectTopN: (n: number) => void;
  handleSelectAllVisible: () => void;
  selectedSkus: Set<string>;
  setSelectedSkus: React.Dispatch<React.SetStateAction<Set<string>>>;
  completedSkus: Set<string>;
  setCompletedSkus: React.Dispatch<React.SetStateAction<Set<string>>>;
  hideCompleted: boolean;
  setHideCompleted: (val: boolean) => void;
}

export const SinglePcsFilterToolbar: React.FC<SinglePcsFilterToolbarProps> = ({
  availablePcsStats,
  pcsMode,
  setPcsMode,
  customPcsInput,
  setCustomPcsInput,
  sortMode,
  setSortMode,
  selectedAreaFilter,
  setSelectedAreaFilter,
  dynamicAreaList,
  localSearch,
  setLocalSearch,
  filteredSkuList,
  handleSelectRangeOrders,
  handleSelectMinOrders,
  handleSelectTopN,
  handleSelectAllVisible,
  selectedSkus,
  setSelectedSkus,
  completedSkus,
  setCompletedSkus,
  hideCompleted,
  setHideCompleted,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3.5">
      {/* Quick Available PCS Chips */}
      <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/70 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
            <Boxes className="w-3.5 h-3.5 text-indigo-600" />
            Chọn nhanh theo số lượng thực tế:
          </span>

          {/* Single SKU */}
          <button
            onClick={() => setPcsMode('SINGLE_SKU')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
              pcsMode === 'SINGLE_SKU'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
            }`}
            title="Gồm tất cả các đơn chỉ có 1 mã SKU duy nhất (bất kể 1, 2, 3, 10 PCS...)"
          >
            🎯 Đơn Đồng Chất ({availablePcsStats.singleSkuTotalOrders} đơn)
          </button>

          {/* Specific PCS options */}
          {availablePcsStats.distinctQtys.map((qty) => {
            const count = availablePcsStats.qtyCounts[qty] || 0;
            const isActive =
              (pcsMode === '1_PCS' && qty === 1) ||
              (pcsMode === '2_PCS' && qty === 2) ||
              (pcsMode === '3_PCS' && qty === 3) ||
              (pcsMode === '4_PCS' && qty === 4) ||
              (pcsMode === 'CUSTOM_PCS' && customPcsInput === qty);

            return (
              <button
                key={qty}
                onClick={() => {
                  if (qty === 1) setPcsMode('1_PCS');
                  else if (qty === 2) setPcsMode('2_PCS');
                  else if (qty === 3) setPcsMode('3_PCS');
                  else if (qty === 4) setPcsMode('4_PCS');
                  else {
                    setCustomPcsInput(qty);
                    setPcsMode('CUSTOM_PCS');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                {qty === 1 ? '⚡ 1 PCS' : `📦 ${qty} PCS`} ({count} đơn)
              </button>
            );
          })}

          {/* MIX */}
          {availablePcsStats.mixTotalOrders > 0 && (
            <button
              onClick={() => setPcsMode('MIX_ORDERS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                pcsMode === 'MIX_ORDERS'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
              }`}
            >
              🔀 Đơn MIX ({availablePcsStats.mixTotalOrders} đơn)
            </button>
          )}
        </div>

        {/* Custom PCS */}
        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-gray-200">
          <span className="text-[11px] text-gray-500 font-medium">Số PCS tùy chọn:</span>
          <button
            onClick={() => {
              const next = Math.max(1, customPcsInput - 1);
              setCustomPcsInput(next);
              setPcsMode('CUSTOM_PCS');
            }}
            className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min={1}
            max={100}
            value={customPcsInput}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              setCustomPcsInput(val);
              setPcsMode('CUSTOM_PCS');
            }}
            className="w-10 text-center font-bold text-xs bg-gray-50 border border-gray-200 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={() => {
              const next = customPcsInput + 1;
              setCustomPcsInput(next);
              setPcsMode('CUSTOM_PCS');
            }}
            className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
          </button>
          <span className="text-[11px] font-semibold text-gray-600">PCS</span>
        </div>
      </div>

      {/* Row 2: Modes & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            Chế độ:
          </span>
          <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-200">
            <button
              onClick={() => setPcsMode('1_PCS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                pcsMode === '1_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚡ 1 PCS
            </button>
            <button
              onClick={() => setPcsMode('2_PCS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                pcsMode === '2_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 2 PCS
            </button>
            <button
              onClick={() => setPcsMode('3_PCS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                pcsMode === '3_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 3 PCS
            </button>
            <button
              onClick={() => setPcsMode('4_PCS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                pcsMode === '4_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 4 PCS
            </button>
            <button
              onClick={() => setPcsMode('5_PLUS_PCS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                pcsMode === '5_PLUS_PCS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 5+ PCS
            </button>
            <button
              onClick={() => setPcsMode('SINGLE_SKU')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                pcsMode === 'SINGLE_SKU' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Đơn đồng chất: 1 mã SKU duy nhất, bất kể số lượng PCS"
            >
              🎯 Đồng chất
            </button>
            <button
              onClick={() => setPcsMode('ALL_ORDERS')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                pcsMode === 'ALL_ORDERS' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🌐 Tất cả đơn
            </button>
          </div>

          {/* Sắp xếp */}
          <div className="flex items-center gap-1.5 ml-0 sm:ml-2">
            <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
              Xếp:
            </span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SkuPackingSortMode)}
              className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="order_count_desc">🏆 Số đơn: Cao ➔ Thấp</option>
              <option value="qty_desc">📦 Tổng PCS: Nhiều ➔ Ít</option>
              <option value="sku_asc">🔤 Tên SKU: A ➔ Z</option>
              <option value="area_asc">📍 Theo Khu Vực Kho</option>
            </select>
          </div>

          {/* Lọc Khu Vực */}
          <select
            value={selectedAreaFilter}
            onChange={(e) => setSelectedAreaFilter(e.target.value)}
            className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">📍 Tất cả khu vực kho</option>
            {dynamicAreaList.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* Search Box */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm mã SKU, mã đơn..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          {localSearch && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Quick Selection Presets & Completed Toggle */}
      <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-gray-500 font-medium">Chọn nhanh:</span>

          {filteredSkuList.filter((it) => it.orderCount < 5).length > 0 && (
            <button
              onClick={() => handleSelectRangeOrders(1, 4)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>&lt; 5 đơn</span>
              <span className="text-[10px] bg-slate-300 text-slate-800 px-1 rounded-full font-bold">
                {filteredSkuList.filter((it) => it.orderCount < 5).length} SKU
              </span>
            </button>
          )}

          {filteredSkuList.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).length > 0 && (
            <button
              onClick={() => handleSelectRangeOrders(5, 9)}
              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>5 - 9 đơn</span>
              <span className="text-[10px] bg-sky-200 text-sky-900 px-1 rounded-full">
                {filteredSkuList.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).length} SKU
              </span>
            </button>
          )}

          {filteredSkuList.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).length > 0 && (
            <button
              onClick={() => handleSelectRangeOrders(10, 19)}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>10 - 19 đơn</span>
              <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded-full">
                {filteredSkuList.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).length} SKU
              </span>
            </button>
          )}

          {filteredSkuList.filter((it) => it.orderCount >= 20).length > 0 && (
            <button
              onClick={() => handleSelectMinOrders(20)}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>≥ 20 đơn</span>
              <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded-full">
                {filteredSkuList.filter((it) => it.orderCount >= 20).length} SKU
              </span>
            </button>
          )}

          {filteredSkuList.filter((it) => it.orderCount >= 5).length > 0 && (
            <button
              onClick={() => handleSelectMinOrders(5)}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>≥ 5 đơn (Tổng)</span>
              <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1 rounded-full">
                {filteredSkuList.filter((it) => it.orderCount >= 5).length} SKU
              </span>
            </button>
          )}

          <button
            onClick={() => handleSelectTopN(3)}
            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Top 3
          </button>
          <button
            onClick={() => handleSelectTopN(5)}
            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Top 5
          </button>
          <button
            onClick={() => handleSelectTopN(10)}
            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Top 10
          </button>
          <button
            onClick={handleSelectAllVisible}
            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors cursor-pointer"
          >
            {selectedSkus.size === filteredSkuList.length && filteredSkuList.length > 0
              ? 'Bỏ chọn tất cả'
              : 'Chọn tất cả'}
          </button>
          {selectedSkus.size > 0 && (
            <button
              onClick={() => setSelectedSkus(new Set())}
              className="px-2 py-1 text-gray-400 hover:text-red-600 font-medium transition-colors cursor-pointer"
            >
              Xóa chọn ({selectedSkus.size})
            </button>
          )}
        </div>

        {/* Hide / Show completed toggle */}
        <div className="flex items-center gap-3">
          {completedSkus.size > 0 && (
            <button
              onClick={() => setHideCompleted(!hideCompleted)}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            >
              {hideCompleted ? <Eye className="w-3.5 h-3.5 text-indigo-600" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{hideCompleted ? `Hiện lại ${completedSkus.size} SKU đã đóng` : `Ẩn ${completedSkus.size} SKU đã đóng`}</span>
            </button>
          )}
          {completedSkus.size > 0 && (
            <button
              onClick={() => setCompletedSkus(new Set())}
              className="flex items-center gap-1 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
              title="Đặt lại trạng thái hoàn thành"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
