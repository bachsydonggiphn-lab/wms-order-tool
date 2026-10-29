import React from 'react';
import {
  Layers,
  X,
  Search,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Package,
  Zap,
  TrendingUp,
  TrendingDown,
  Link2,
  ArrowUpRight
} from 'lucide-react';
import { SkuGroupsMap } from '../../../types';
import { HotSkuAnalysisItem } from '../../../../sqliteDb';

interface HotSkuAbcTableProps {
  filteredItems: HotSkuAnalysisItem[];
  selectedZoneFilter: 'ALL' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'INBOUND';
  setSelectedZoneFilter: (zone: 'ALL' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'INBOUND') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedAbc: 'ALL' | 'A' | 'B' | 'C';
  setSelectedAbc: (abc: 'ALL' | 'A' | 'B' | 'C') => void;
  filterStockoutIncomingOnly: boolean;
  setFilterStockoutIncomingOnly: (val: boolean) => void;
  selectedGroup: string;
  setSelectedGroup: (grp: string) => void;
  skuGroups?: SkuGroupsMap;
  rankingMode: 'normalized' | 'actual';
  isLoading: boolean;
  errorMessage: string | null;
  stockoutIncomingCount: number;
  onNavigateToInventory?: (sku?: string) => void;
}

export const HotSkuAbcTable: React.FC<HotSkuAbcTableProps> = ({
  filteredItems,
  selectedZoneFilter,
  setSelectedZoneFilter,
  searchTerm,
  setSearchTerm,
  selectedAbc,
  setSelectedAbc,
  filterStockoutIncomingOnly,
  setFilterStockoutIncomingOnly,
  selectedGroup,
  setSelectedGroup,
  skuGroups = {},
  rankingMode,
  isLoading,
  errorMessage,
  stockoutIncomingCount,
  onNavigateToInventory
}) => {
  const items = Array.isArray(filteredItems) ? filteredItems : [];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Filter Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Bảng Chi Tiết Phân Hạng SKU & Tồn Kho ({items.length} mã)
          </h3>
          {selectedZoneFilter !== 'ALL' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 flex items-center gap-1.5">
              Đang lọc: {selectedZoneFilter}
              <button onClick={() => setSelectedZoneFilter('ALL')} className="hover:text-indigo-950">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã SKU, tên SP..."
              className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Filter by ABC */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 text-xs">
            <span className="text-[11px] text-slate-400 px-2 font-medium">Hạng:</span>
            {(['ALL', 'A', 'B', 'C'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedAbc(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedAbc === r
                    ? r === 'A'
                      ? 'bg-amber-500 text-slate-950'
                      : r === 'B'
                      ? 'bg-blue-600 text-white'
                      : r === 'C'
                      ? 'bg-slate-700 text-white'
                      : 'bg-indigo-600 text-white'
                    : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {r === 'ALL' ? 'Tất Cả' : `Hạng ${r}`}
              </button>
            ))}
          </div>

          {/* Quick Filter: Đứt Hàng Có Hàng Về */}
          <button
            onClick={() => setFilterStockoutIncomingOnly(!filterStockoutIncomingOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
              filterStockoutIncomingOnly
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
            }`}
            title="Lọc các mã đang cạn tồn nhưng có lượng hàng onWay đang về"
          >
            <Sparkles className={`w-3.5 h-3.5 ${filterStockoutIncomingOnly ? 'text-slate-950' : 'text-amber-500'}`} />
            Đứt hàng chờ về ({stockoutIncomingCount || 0})
          </button>

          {/* Filter by Group */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="ALL">Tất Cả Nhóm Hàng</option>
            {Object.keys(skuGroups).map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm font-medium">Đang truy vấn phân tích SQL và đối chiếu tồn kho WMS...</p>
        </div>
      ) : errorMessage ? (
        <div className="py-16 text-center text-rose-600 space-y-2">
          <AlertTriangle className="w-8 h-8 mx-auto" />
          <p className="font-semibold">{errorMessage}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-slate-500 space-y-2">
          <Package className="w-8 h-8 mx-auto text-slate-400" />
          <p className="font-semibold">Không tìm thấy mã SKU nào phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-3 text-center w-12">STT</th>
                <th className="py-3 px-3 text-center w-20">Hạng ABC</th>
                <th className="py-3 px-3 text-center w-28" title="Điểm ưu tiên vị trí kho: 70% Số lần ghé nhặt (Pick Hits) + 30% Sản lượng">
                  Điểm Slotting
                </th>
                <th className="py-3 px-3 text-center w-28" title="So sánh vận tốc 7 ngày qua vs trung bình cả kỳ">
                  Xu Hướng (7d)
                </th>
                <th className="py-3 px-3">Mã SKU & Tên Sản Phẩm</th>
                <th className="py-3 px-3">Nhóm Hàng</th>
                <th className="py-3 px-3 text-right">
                  {rankingMode === 'normalized' ? 'Sản Lượng (Thực / Tiềm Năng)' : 'Sản Lượng Bán'}
                </th>
                <th className="py-3 px-3 text-right">Vận Tốc Thực Bán</th>
                <th className="py-3 px-3 text-right">Tồn Khả Dụng</th>
                <th className="py-3 px-3 text-right">Hàng Đang Về</th>
                <th className="py-3 px-3 text-center">Dự Báo Hết Tồn</th>
                <th className="py-3 px-3">Đề Xuất Vị Trí Kệ Kho</th>
                <th className="py-3 px-3 text-center">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <tr
                  key={item.sku}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    item.isStockoutWithIncoming
                      ? 'bg-amber-100/30'
                      : item.abcRank === 'A'
                      ? 'bg-amber-50/20'
                      : ''
                  }`}
                >
                  {/* STT */}
                  <td className="py-3 px-3 text-center text-slate-400 font-mono">
                    {idx + 1}
                  </td>

                  {/* Hạng ABC */}
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full font-black text-xs shadow-sm ${
                        item.abcRank === 'A'
                          ? 'bg-amber-500 text-slate-950'
                          : item.abcRank === 'B'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {item.abcRank}
                    </span>
                  </td>

                  {/* Điểm Slotting Priority */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-black font-mono shadow-sm ${
                        (item.slottingScore ?? 50) >= 80
                          ? 'bg-amber-500 text-slate-950'
                          : (item.slottingScore ?? 50) >= 50
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.slottingScore ?? 50}
                      </span>
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            (item.slottingScore ?? 50) >= 80
                              ? 'bg-amber-500'
                              : (item.slottingScore ?? 50) >= 50
                              ? 'bg-blue-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, item.slottingScore ?? 50))}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Xu Hướng Bán 7d */}
                  <td className="py-3 px-3 text-center">
                    {item.trendCategory === 'viral' ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black">
                          <Zap className="w-3 h-3 text-purple-700 animate-pulse" />
                          🚀 BÙNG NỔ ({item.trendRatio}x)
                        </span>
                        <span className="text-[9px] text-purple-700 font-semibold">
                          7d: {item.qty7d ?? 0} pcs
                        </span>
                      </div>
                    ) : item.trendCategory === 'up' ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                          <TrendingUp className="w-3 h-3 text-emerald-600" />
                          📈 Tăng ({item.trendRatio}x)
                        </span>
                        <span className="text-[9px] text-emerald-700">
                          7d: {item.qty7d ?? 0} pcs
                        </span>
                      </div>
                    ) : item.trendCategory === 'down' ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium">
                          <TrendingDown className="w-3 h-3 text-rose-500" />
                          📉 Thoái trào ({item.trendRatio}x)
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                        ⚖️ Ổn định
                      </span>
                    )}
                  </td>

                  {/* Mã SKU & Tên */}
                  <td className="py-3 px-3">
                    <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span>{item.sku}</span>
                      {item.isStockoutWithIncoming && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-sans font-bold border border-orange-300">
                          ⭐ Đặt chỗ Zone A
                        </span>
                      )}
                      {!item.isStockoutWithIncoming && item.stockoutWarning && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[10px] font-sans font-semibold">
                          🚨 Sắp cháy
                        </span>
                      )}
                      {item.incomingWarning && !item.isStockoutWithIncoming && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 text-[10px] font-sans font-semibold">
                          📦 Hàng về ({item.onWay})
                        </span>
                      )}
                    </div>
                    {item.productTitle && (
                      <p className="text-[11px] text-slate-500 truncate max-w-xs" title={item.productTitle}>
                        {item.productTitle}
                      </p>
                    )}
                    {/* Cặp sản phẩm hay mua kèm trong đơn ghép */}
                    {item.topPairedSkus && item.topPairedSkus.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-indigo-700 font-semibold flex items-center gap-1">
                          <Link2 className="w-3 h-3 text-indigo-500" /> Hay kèm:
                        </span>
                        {item.topPairedSkus.slice(0, 3).map(p => (
                          <span
                            key={p.sku}
                            className="px-1.5 py-0.2 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 font-mono text-[10px] font-bold"
                            title={`Xuất hiện cùng nhau trong ${p.pairCount} đơn hàng ghép`}
                          >
                            {p.sku} <span className="text-indigo-500 font-sans font-normal">({p.pairCount})</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Nhóm Hàng */}
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                      {item.groupName}
                    </span>
                  </td>

                  {/* Sản Lượng Bán (Thực tế & Tiềm năng chuẩn hóa) */}
                  <td className="py-3 px-3 text-right">
                    <span className="font-bold text-slate-900 text-sm">
                      {item.totalSold.toLocaleString()}
                    </span>
                    {rankingMode === 'normalized' && (item.potentialVolume || 0) > item.totalSold && (
                      <p className="text-[10px] text-indigo-600 font-semibold" title="Doanh số tiềm năng nếu không bị đứt hàng">
                        Tiềm năng: ~{(item.potentialVolume || 0).toLocaleString()}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      {item.orderCount} đơn ({item.singleSkuOrders} đơn lẻ)
                    </p>
                  </td>

                  {/* Tốc Độ Bán PCS/Ngày (Đã chuẩn hóa đứt hàng) */}
                  <td className="py-3 px-3 text-right">
                    <span className="font-bold text-indigo-600 text-sm">
                      {item.adjustedVelocity ?? item.velocityDaily}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">pcs/ngày</span>
                    {(item.stockoutDays || 0) > 0 ? (
                      <div className="mt-0.5">
                        <span className="inline-block px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-semibold">
                          ⚠️ Đứt hàng {item.stockoutDays} ngày
                        </span>
                        <p className="text-[9px] text-slate-400">
                          (Có hàng: {item.effectiveSellingDays} ngày)
                        </p>
                      </div>
                    ) : (
                      <p className="text-[9px] text-slate-400">Đầy đủ tồn kỳ này</p>
                    )}
                  </td>

                  {/* Tồn Khả Dụng */}
                  <td className="py-3 px-3 text-right">
                    <span className={`font-bold ${
                      (item.sellable ?? 0) <= 0
                        ? 'text-rose-600 font-black'
                        : (item.sellable ?? 0) < 50
                        ? 'text-amber-600'
                        : 'text-slate-800'
                    }`}>
                      {(item.sellable ?? 0).toLocaleString()}
                    </span>
                    {(item.inUsed ?? 0) > 0 && (
                      <p className="text-[10px] text-slate-400">Đang chuẩn bị: {item.inUsed}</p>
                    )}
                  </td>

                  {/* Hàng Đang Về & Độ phủ dự kiến */}
                  <td className="py-3 px-3 text-right">
                    {(item.onWay ?? 0) > 0 ? (
                      <div>
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          +{(item.onWay ?? 0).toLocaleString()}
                        </span>
                        {item.daysOfSupplyIncoming !== null && item.daysOfSupplyIncoming !== undefined && (
                          <p className="text-[10px] text-emerald-700 font-medium mt-0.5" title="Dự kiến bán hết lượng hàng đang về này">
                            Đủ bán: ~{item.daysOfSupplyIncoming} ngày
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Dự Báo Ngày Hết Tồn Hiện Tại */}
                  <td className="py-3 px-3 text-center">
                    {(item.sellable ?? 0) <= 0 ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        HẾT HÀNG
                      </span>
                    ) : item.daysOfInventory !== null ? (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          item.daysOfInventory < 3
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.daysOfInventory < 7
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        ~{item.daysOfInventory} ngày
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">N/A</span>
                    )}
                  </td>

                  {/* Đề Xuất Vị Trí Kho & Đặt Chỗ */}
                  <td className="py-3 px-3">
                    {item.isStockoutWithIncoming ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] shadow-sm">
                          <Sparkles className="w-3 h-3 text-slate-950" />
                          ZONE A (ĐẶT CHỖ TRƯỚC)
                        </span>
                        <p className="text-[10px] text-amber-900 font-medium mt-0.5">
                          {item.recommendedSlotting}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-slate-800 text-[11px]">
                          {item.recommendedZone}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {item.recommendedSlotting}
                        </p>
                      </div>
                    )}
                  </td>

                  {/* Hành Động */}
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onNavigateToInventory?.(item.sku)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Xem chi tiết tại Tab Tồn Kho"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
