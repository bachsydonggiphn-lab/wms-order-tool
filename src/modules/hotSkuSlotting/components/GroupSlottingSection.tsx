import React from 'react';
import {
  FolderTree,
  LayoutGrid,
  Boxes,
  Sliders,
  Download,
  Printer,
  Flame,
  Warehouse,
  Truck,
  Sparkles,
  ChevronRight,
  Search,
  X,
  ArrowUpRight
} from 'lucide-react';
import { HotSkuAnalysisItem, HotSkuAnalyticsResult } from '../../../../sqliteDb';

export interface GroupSlottingMetricItem {
  groupName: string;
  totalSold: number;
  totalOrders: number;
  skuCount: number;
  classACount: number;
  classBCount: number;
  classCCount: number;
  totalInUsed: number;
  totalOnWay: number;
  items: HotSkuAnalysisItem[];
  percentageOfWarehouseSold: number;
  optimalAisleRecommendation: {
    aisleCode: string;
    zoneTag: 'ZONE_A' | 'ZONE_B' | 'ZONE_C';
    priority: 'high' | 'medium' | 'low';
    levelRecommendation: string;
    reason: string;
    distanceLabel: string;
  };
  topHotSkus: HotSkuAnalysisItem[];
}

interface GroupSlottingSectionProps {
  groupSlottingMetrics: GroupSlottingMetricItem[];
  analytics: HotSkuAnalyticsResult | null;
  selectedSlottingGroup: string;
  setSelectedSlottingGroup: (group: string) => void;
  slottingGroupViewMode: '2d_aisles' | 'cards' | 'table';
  setSlottingGroupViewMode: (mode: '2d_aisles' | 'cards' | 'table') => void;
  slottingGroupSearch: string;
  setSlottingGroupSearch: (search: string) => void;
  slottingGroupAbcFilter: 'ALL' | 'A' | 'B' | 'C';
  setSlottingGroupAbcFilter: (filter: 'ALL' | 'A' | 'B' | 'C') => void;
  displayedSlottingSkus: Array<{
    item: HotSkuAnalysisItem;
    groupName: string;
    aisleCode: string;
    zoneTag: string;
    levelRecommendation: string;
  }>;
  handleExportGroupSlottingExcel: (onlyCurrentGroup?: boolean) => void;
  handlePrintGroupSlottingReport: (onlyCurrentGroup?: boolean) => void;
  onNavigateToInventory?: (sku?: string) => void;
}

export const GroupSlottingSection: React.FC<GroupSlottingSectionProps> = ({
  groupSlottingMetrics,
  analytics,
  selectedSlottingGroup,
  setSelectedSlottingGroup,
  slottingGroupViewMode,
  setSlottingGroupViewMode,
  slottingGroupSearch,
  setSlottingGroupSearch,
  slottingGroupAbcFilter,
  setSlottingGroupAbcFilter,
  displayedSlottingSkus,
  handleExportGroupSlottingExcel,
  handlePrintGroupSlottingReport,
  onNavigateToInventory
}) => {
  return (
    <div className="space-y-6">
      {/* Header Bar của Bố Trí Theo Nhóm */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-blue-600" />
            Quy Hoạch Bố Trí Kho Theo Nhóm Hàng Hóa (Category & Family Slotting)
          </h2>
          <p className="text-xs text-slate-500">
            Phân bổ dãy kệ (Aisles) và định vị tầng kệ (Shelf Tiers 1-5) theo từng nhóm hàng chủ lực dựa trên sản lượng xuất, tỉ trọng kho và khoảng cách nhặt hàng tới bàn đóng gói.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Chế độ xem: Sơ Đồ 2D / Thẻ Nhóm / Bảng Chi Tiết */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSlottingGroupViewMode('2d_aisles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                slottingGroupViewMode === '2d_aisles'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem sơ đồ dãy kệ 2D mặt bằng kho"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Sơ Đồ Dãy 2D</span>
            </button>
            <button
              onClick={() => setSlottingGroupViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                slottingGroupViewMode === 'cards'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem dạng thẻ nhóm hàng"
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Thẻ Nhóm</span>
            </button>
            <button
              onClick={() => setSlottingGroupViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                slottingGroupViewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem bảng phân bổ từng SKU"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Bảng SKU</span>
            </button>
          </div>

          {/* Nút Xuất Excel Báo Cáo Nhóm (Xếp từ Bán Nhanh Đến Bán Chậm) */}
          <button
            onClick={() => handleExportGroupSlottingExcel(false)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            title="Xuất file Excel báo cáo toàn bộ các nhóm hàng xếp thứ tự từ bán nhanh nhất đến bán chậm nhất"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel Nhóm (Nhanh &rarr; Chậm)</span>
          </button>

          {/* Nút In Toàn Bộ Danh Sách Nhóm (Xếp từ Bán Nhanh Đến Bán Chậm) */}
          <button
            onClick={() => handlePrintGroupSlottingReport(false)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            title="In báo cáo toàn bộ các nhóm hàng xếp thứ tự từ bán nhanh nhất đến bán chậm nhất"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>In Báo Cáo (PDF / Giấy)</span>
          </button>
        </div>
      </div>

      {/* 4 Thẻ KPI Tóm Tắt */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Nhóm Hoạt Động</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {groupSlottingMetrics.length} <span className="text-sm font-semibold text-slate-500">nhóm hàng</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Tổng cộng <b>{(analytics?.totalSoldVolume || 0).toLocaleString()}</b> PCS xuất kho
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Nhóm Chủ Lực Số 1</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 truncate" title={groupSlottingMetrics[0]?.groupName}>
            {groupSlottingMetrics[0]?.groupName || 'Chưa có'}
          </div>
          <div className="text-xs text-rose-600 font-semibold mt-1">
            Chiếm <b>{groupSlottingMetrics[0]?.percentageOfWarehouseSold || 0}%</b> tổng lượng bán kho
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Dãy Kệ Zone A (Mặt Tiền)</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">
            {groupSlottingMetrics.filter(g => g.optimalAisleRecommendation.zoneTag === 'ZONE_A').length} <span className="text-sm font-semibold text-slate-500">nhóm</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Đặt tại Dãy 01 - 02 (&lt; 5m tới Bàn Đóng Gói)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tổng Tồn Kho & Đang Về</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-700">
            {groupSlottingMetrics.reduce((s, g) => s + g.totalInUsed, 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">tồn kho</span>
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">
            + {groupSlottingMetrics.reduce((s, g) => s + g.totalOnWay, 0).toLocaleString()} PCS hàng trên đường về
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SƠ ĐỒ DÃY KỆ 2D MẶT BẰNG KHO */}
      {(slottingGroupViewMode === '2d_aisles' || slottingGroupViewMode === 'cards') && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-indigo-600" />
                Sơ Đồ Dãy Kệ Kho 2D (Warehouse Aisle Blueprint by Category)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Khoảng cách thực tế: Mặt tiền gần bàn đóng gói nhặt nhanh nhất (Zone A), hàng bán đều ở giữa kho (Zone B), hàng chậm lưu trữ sâu (Zone C).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                Zone A (&lt; 5m)
              </span>
              <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                Zone B (5 - 15m)
              </span>
              <span className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                Zone C (&gt; 15m)
              </span>
            </div>
          </div>

          {/* Layout Warehouse Blueprint */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Cột Trái: Bàn Đóng Gói & Cửa Xuất (Dock / Packing Station) */}
            <div className="lg:col-span-3 bg-gradient-to-b from-slate-900 to-indigo-950 text-white rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl"></div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-indigo-800/80 pb-3">
                  <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl font-black">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase font-extrabold tracking-wider text-amber-400">Hub Đóng Gói</div>
                    <div className="text-sm font-black text-white">Bàn Đóng Gói & Xuất Hàng</div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs text-slate-300">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Nguyên Tắc Bố Trí Kệ Vàng:
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      Các nhóm hàng chiếm trên <b>60% sản lượng</b> bắt buộc đặt tại <b>Dãy Kệ 01-02</b> ngay sát cửa xuất để giảm 70% số bước chân nhặt hàng hàng ngày.
                    </p>
                  </div>

                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                    <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" /> Chiến Lược Tầng Kệ:
                    </div>
                    <ul className="text-[11px] space-y-1 text-slate-300 list-disc list-inside">
                      <li><b>Tầng 1-2:</b> SKU Hạng A (tầm thắt lưng/ngực)</li>
                      <li><b>Tầng 3:</b> SKU Hạng B (tầm mắt, với chuẩn)</li>
                      <li><b>Tầng 4-5:</b> SKU Hạng C & Thùng nguyên lưu trữ</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-indigo-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span>Dòng xuất hàng:</span>
                  <span className="text-emerald-400 font-bold">Tối ưu 1 chiều</span>
                </div>
                <div className="w-full h-1.5 bg-indigo-900 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-indigo-400"></div>
                </div>
              </div>
            </div>

            {/* Cột Phải: Các Dãy Kệ Song Song (Aisles) */}
            <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {groupSlottingMetrics.map((g) => {
                const isZoneA = g.optimalAisleRecommendation.zoneTag === 'ZONE_A';
                const isZoneB = g.optimalAisleRecommendation.zoneTag === 'ZONE_B';
                const isSelected = selectedSlottingGroup === g.groupName;

                return (
                  <div
                    key={g.groupName}
                    onClick={() => {
                      setSelectedSlottingGroup(isSelected ? 'ALL' : g.groupName);
                    }}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'ring-2 ring-blue-600 bg-blue-50/60 border-blue-400 shadow-md'
                        : isZoneA
                        ? 'bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 border-amber-300/80 hover:border-amber-400 hover:shadow-md'
                        : isZoneB
                        ? 'bg-gradient-to-br from-blue-50/40 via-white to-blue-50/20 border-blue-200 hover:border-blue-300 hover:shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow'
                    }`}
                  >
                    {/* Header Aisle */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isZoneA
                            ? 'bg-amber-500 text-slate-950'
                            : isZoneB
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          <Warehouse className="w-3 h-3" />
                          {g.optimalAisleRecommendation.aisleCode.split('(')[0].trim()}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">
                          {g.optimalAisleRecommendation.distanceLabel}
                        </span>
                      </div>

                      {/* Nhóm Hàng & Sản Lượng */}
                      <div className="pt-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-base font-black text-slate-900 truncate" title={g.groupName}>
                            {g.groupName}
                          </h4>
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {g.percentageOfWarehouseSold}% kho
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span><b>{g.totalSold.toLocaleString()}</b> PCS</span>
                          <span>•</span>
                          <span><b>{g.skuCount}</b> mã SKU</span>
                          <span>•</span>
                          <span><b>{g.totalOrders.toLocaleString()}</b> đơn</span>
                        </div>
                      </div>

                      {/* Phân Tầng Kệ Thực Tế (Visual 3-Tier Rack) */}
                      <div className="space-y-1.5 pt-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Phân bổ tầng khuyến nghị:
                        </div>

                        {/* Tầng 1-2 */}
                        <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-amber-100/70 border border-amber-200 text-xs">
                          <span className="font-bold text-amber-900 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                            Tầng 1 - 2 (Hạng A):
                          </span>
                          <span className="font-extrabold text-amber-800">
                            {g.classACount} SKU hot
                          </span>
                        </div>

                        {/* Tầng 3 */}
                        <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-blue-100/60 border border-blue-200 text-xs">
                          <span className="font-bold text-blue-900 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            Tầng 3 (Hạng B):
                          </span>
                          <span className="font-extrabold text-blue-800">
                            {g.classBCount} SKU đều
                          </span>
                        </div>

                        {/* Tầng 4-5 */}
                        <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Tầng 4 - 5 (Hạng C):
                          </span>
                          <span className="font-extrabold text-slate-600">
                            {g.classCCount} SKU chậm
                          </span>
                        </div>
                      </div>

                      {/* Top 3 Hot SKUs trong nhóm */}
                      {g.topHotSkus && g.topHotSkus.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                            Top SKU nhặt nhiều nhất:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {g.topHotSkus.slice(0, 3).map(sk => (
                              <span
                                key={sk.sku}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-mono text-slate-800"
                                title={`${sk.productTitle || sk.sku} (${sk.totalSold} PCS)`}
                              >
                                {sk.sku} <b className="text-amber-600">({sk.totalSold})</b>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Card */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">
                        {isSelected ? 'Đang lọc nhóm này' : 'Nhấp để lọc bảng SKU'}
                      </span>
                      <span className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                        Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: THẺ TÓM TẮT TỪNG NHÓM HÀNG (EXPANDED CARDS VIEW) */}
      {slottingGroupViewMode === 'cards' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-5 h-5 text-blue-600" />
              Danh Sách Thẻ Chỉ Số Toàn Diện Các Nhóm Hàng ({groupSlottingMetrics.length} Nhóm)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupSlottingMetrics.map((g, idx) => (
              <div
                key={g.groupName}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <h4 className="text-base font-black text-slate-900">{g.groupName}</h4>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {g.optimalAisleRecommendation.aisleCode}
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                    g.optimalAisleRecommendation.zoneTag === 'ZONE_A'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : g.optimalAisleRecommendation.zoneTag === 'ZONE_B'
                      ? 'bg-blue-100 text-blue-900 border border-blue-300'
                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                  }`}>
                    {g.optimalAisleRecommendation.zoneTag}
                  </span>
                </div>

                {/* Progress Bar Tỉ Trọng Bán */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-600">Sản lượng đã xuất:</span>
                    <span className="text-slate-900 font-bold">{g.totalSold.toLocaleString()} PCS ({g.percentageOfWarehouseSold}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                      style={{ width: `${Math.min(100, g.percentageOfWarehouseSold)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Phân Bổ Hạng A / B / C */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                  <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                    <div className="text-[10px] font-bold uppercase text-rose-600">Hạng A (Hot)</div>
                    <div className="text-sm font-black text-rose-700">{g.classACount} mã</div>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="text-[10px] font-bold uppercase text-blue-600">Hạng B (Đều)</div>
                    <div className="text-sm font-black text-blue-700">{g.classBCount} mã</div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold uppercase text-slate-600">Hạng C (Chậm)</div>
                    <div className="text-sm font-black text-slate-700">{g.classCCount} mã</div>
                  </div>
                </div>

                {/* Tồn Kho & Hàng Đang Về */}
                <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-500">Tồn sẵn có: </span>
                    <b className="text-slate-900">{g.totalInUsed.toLocaleString()}</b>
                  </div>
                  <div>
                    <span className="text-slate-500">Đang về: </span>
                    <b className="text-emerald-600">{g.totalOnWay.toLocaleString()}</b>
                  </div>
                </div>

                {/* Lý do nghiệp vụ */}
                <p className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                  💡 {g.optimalAisleRecommendation.reason}
                </p>

                <button
                  onClick={() => {
                    setSelectedSlottingGroup(g.groupName);
                    setSlottingGroupViewMode('table');
                  }}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Xem & Lọc {g.skuCount} SKU Trong Nhóm</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BẢNG CHI TIẾT PHÂN BỔ SKU THEO TẦNG KỆ (DETAILED SKU SLOTTING TABLE) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Bảng Phân Bổ Chi Tiết Từng SKU Theo Dãy & Tầng Kệ
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Định vị chính xác từng SKU vào dãy kệ tương ứng của nhóm và gán tầng kệ 1-5 theo phân hạng ABC.
            </p>
          </div>

          {/* Bộ lọc bảng SKU */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Lọc Nhóm */}
            <select
              value={selectedSlottingGroup}
              onChange={(e) => setSelectedSlottingGroup(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất Cả Các Nhóm ({groupSlottingMetrics.length})</option>
              {groupSlottingMetrics.map(g => (
                <option key={g.groupName} value={g.groupName}>
                  {g.groupName} ({g.skuCount} SKU - {g.percentageOfWarehouseSold}%)
                </option>
              ))}
            </select>

            {/* Lọc Hạng ABC */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              {(['ALL', 'A', 'B', 'C'] as const).map(rk => (
                <button
                  key={rk}
                  onClick={() => setSlottingGroupAbcFilter(rk)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    slottingGroupAbcFilter === rk
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {rk === 'ALL' ? 'Tất cả' : `Hạng ${rk}`}
                </button>
              ))}
            </div>

            {/* Tìm kiếm */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm SKU, tên..."
                value={slottingGroupSearch}
                onChange={(e) => setSlottingGroupSearch(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40 sm:w-48"
              />
              {slottingGroupSearch && (
                <button
                  onClick={() => setSlottingGroupSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-xl">
              {displayedSlottingSkus.length} SKU
            </span>

            {/* Nút Xuất Excel nhanh theo bộ lọc */}
            <button
              onClick={() => handleExportGroupSlottingExcel(selectedSlottingGroup !== 'ALL')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
              title="Xuất file Excel danh sách SKU nhóm này hoặc toàn bộ"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{selectedSlottingGroup !== 'ALL' ? `Xuất Excel ${selectedSlottingGroup}` : 'Xuất Excel'}</span>
            </button>

            {/* Nút In bảng danh sách SKU theo nhóm */}
            <button
              onClick={() => handlePrintGroupSlottingReport(selectedSlottingGroup !== 'ALL')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
              title="In danh sách này ra giấy hoặc PDF"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>{selectedSlottingGroup !== 'ALL' ? `In Nhóm ${selectedSlottingGroup}` : 'In Toàn Bộ'}</span>
            </button>
          </div>
        </div>

        {/* Bảng Hiển Thị SKU */}
        {displayedSlottingSkus.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <FolderTree className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">Không tìm thấy mã SKU nào khớp với bộ lọc</p>
            <button
              onClick={() => {
                setSelectedSlottingGroup('ALL');
                setSlottingGroupAbcFilter('ALL');
                setSlottingGroupSearch('');
              }}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              Xóa toàn bộ bộ lọc
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 w-12 text-center">STT</th>
                  <th className="py-3 px-3">Nhóm Hàng</th>
                  <th className="py-3 px-3">Mã SKU & Sản Phẩm</th>
                  <th className="py-3 px-3 text-center">Hạng ABC</th>
                  <th className="py-3 px-3">Dãy Kệ Quy Hoạch</th>
                  <th className="py-3 px-3">Phân Bổ Tầng Khuyến Nghị</th>
                  <th className="py-3 px-3 text-right">Sản Lượng (PCS)</th>
                  <th className="py-3 px-3 text-right">Vận Tốc (PCS/ngày)</th>
                  <th className="py-3 px-3 text-right">Tồn Khả Dụng</th>
                  <th className="py-3 px-3 text-right">Đang Về</th>
                  <th className="py-3 px-3 text-center">Xem Tồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedSlottingSkus.map(({ item, groupName, aisleCode, zoneTag, levelRecommendation }, idx) => (
                  <tr key={item.sku} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                        {groupName}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-900">{item.sku}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs" title={item.productTitle}>
                        {item.productTitle || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-black ${
                        item.abcRank === 'A'
                          ? 'bg-rose-100 text-rose-700 border border-rose-300'
                          : item.abcRank === 'B'
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        Hạng {item.abcRank}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800 text-[11px]">
                        {aisleCode}
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        zoneTag === 'ZONE_A'
                          ? 'bg-amber-100 text-amber-800'
                          : zoneTag === 'ZONE_B'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {zoneTag}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        item.abcRank === 'A'
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : item.abcRank === 'B'
                          ? 'bg-blue-50 text-blue-900 border border-blue-200'
                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {levelRecommendation}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {item.totalSold.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      {item.velocityDaily}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                      {item.inUsed ? item.inUsed.toLocaleString() : 0}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600">
                      {item.onWay ? item.onWay.toLocaleString() : 0}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onNavigateToInventory?.(item.sku)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
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
    </div>
  );
};
