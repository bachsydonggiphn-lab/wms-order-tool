import React from 'react';
import { Target, Tag, Layers, Sparkles, Copy, Check, Info, CheckCircle2, Split, FolderTree, Package } from 'lucide-react';
import { GroupingType, PcsFilter, SubGroupTab } from '../types';
import { MixOrderByGroupResult, MixGroupPureItem, MixGroupCrossPair, MixGroupSummaryItem, MixOrderAnalysisResult } from '../../../../../types';
import { formatCompactOrderList } from '../utils/mixPrintTemplates';

interface MixByGroupTabProps {
  mixByGroup: MixOrderByGroupResult;
  mixAnalysis: MixOrderAnalysisResult;
  groupingType: GroupingType;
  setGroupingType: (type: GroupingType) => void;
  subGroupTab: SubGroupTab;
  setSubGroupTab: (tab: SubGroupTab) => void;
  pcsFilter: PcsFilter;
  setPcsFilter: (filter: PcsFilter) => void;
  filteredPureGroupList: MixGroupPureItem[];
  filteredCrossGroupPairs: MixGroupCrossPair[];
  filteredAllGroupSummaries: MixGroupSummaryItem[];
  copiedKey: string | null;
  handleCopyOrders: (orderNos: string[], key: string) => void;
}

export const MixByGroupTab: React.FC<MixByGroupTabProps> = ({
  mixByGroup,
  mixAnalysis,
  groupingType,
  setGroupingType,
  subGroupTab,
  setSubGroupTab,
  pcsFilter,
  setPcsFilter,
  filteredPureGroupList,
  filteredCrossGroupPairs,
  filteredAllGroupSummaries,
  copiedKey,
  handleCopyOrders,
}) => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-emerald-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              Bóc Tách & Gom Đơn Hàng MIX Theo Nhóm Sản Phẩm
            </span>
            <h2 className="text-xl font-black mt-1">
              Tổng Hợp {mixByGroup.totalPureOrders} Đơn MIX Cùng Nhóm & {mixByGroup.totalCrossOrders} Đơn MIX Chéo Nhóm
            </h2>
            <p className="text-xs text-emerald-200 mt-1 max-w-2xl">
              Hệ thống tự động lọc ra các <b>Đơn MIX thuần cùng 1 nhóm hàng</b> (nhân viên chỉ cần đứng tại 1 kệ là nhặt xong toàn bộ đơn) và tổng hợp toàn bộ các <b>Đơn MIX chéo nhóm</b>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-black/25 p-2 rounded-xl border border-white/10 shrink-0">
            <span className="text-[11px] font-semibold text-emerald-200 whitespace-nowrap">Quy cách gom nhóm:</span>
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg">
              <button
                onClick={() => setGroupingType('model')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  groupingType === 'model'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                <Tag className="w-3 h-3" />
                Theo Dòng Model (YD-W82, YD-D107...)
              </button>
              <button
                onClick={() => setGroupingType('area')}
                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  groupingType === 'area'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                <Layers className="w-3 h-3" />
                Theo Khu Vực Kệ (YD-W, YD-D...)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PCS Breakdown & Quick Copy Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span>Bóc Tách Số Lượng PCS Trong Đơn MIX</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                  Tổng {mixByGroup.totalMixOrders} Đơn
                </span>
              </h4>
              <p className="text-[11px] text-gray-500">
                Bóc tách đơn hàng theo số lượng sản phẩm (2 PCS, 3 PCS, 4 PCS, 5 PCS, 6 PCS, ≥7 PCS) &mdash; Cho phép sao chép nhanh từng phân loại hoặc sao chép tổng.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-center">
            <button
              onClick={() =>
                handleCopyOrders(
                  mixByGroup.allMixOrders.map((o) => o.orderNo),
                  'global-mix-all'
                )
              }
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'global-mix-all' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  Đã copy toàn bộ {mixByGroup.totalMixOrders} đơn MIX!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Tổng Tất Cả ({mixByGroup.totalMixOrders} Đơn MIX)
                </>
              )}
            </button>
          </div>
        </div>

        {/* PCS Filter Pills & Direct Copy Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Lọc & Copy PCS:
          </span>

          <button
            onClick={() => setPcsFilter('all')}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              pcsFilter === 'all'
                ? 'bg-gray-900 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>Tất Cả ({mixByGroup.totalMixOrders} đơn)</span>
          </button>

          {mixByGroup.globalPcsBreakdown
            .filter((b) => b.orderCount > 0)
            .map((b) => {
              const isSelected = pcsFilter === String(b.pcs);
              const copyKey = `global-tier-pcs-${b.pcs}`;

              return (
                <div
                  key={b.pcs}
                  className={`inline-flex items-center rounded-xl border overflow-hidden shadow-2xs transition-all ${
                    isSelected
                      ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/70'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() =>
                      setPcsFilter(pcsFilter === String(b.pcs) ? 'all' : (String(b.pcs) as any))
                    }
                    className={`px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={`Bấm để lọc danh sách hiển thị chỉ gồm đơn ${b.label}`}
                  >
                    <span>{b.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                        isSelected ? 'bg-indigo-800 text-white' : 'bg-black/10 text-gray-800'
                      }`}
                    >
                      {b.orderCount} đơn
                    </span>
                  </button>

                  <button
                    onClick={() => handleCopyOrders(b.orderNos, copyKey)}
                    className={`px-2 py-1 border-l text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-700 hover:bg-indigo-800 text-white border-indigo-500'
                        : 'bg-white hover:bg-indigo-50 text-indigo-700 border-gray-200'
                    }`}
                    title={`Sao chép toàn bộ ${b.orderCount} mã đơn ${b.label}`}
                  >
                    {copiedKey === copyKey ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-300" />
                        <span>Đã copy!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-current opacity-70" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}

          {(mixByGroup.globalOrdersByPcs['ge6']?.length || 0) > 0 &&
            (mixByGroup.globalOrdersByPcs['6']?.length || 0) > 0 &&
            (mixByGroup.globalOrdersByPcs['ge7']?.length || 0) > 0 && (
              <div
                className={`inline-flex items-center rounded-xl border overflow-hidden shadow-2xs transition-all ${
                  pcsFilter === 'ge6'
                    ? 'border-rose-400 ring-2 ring-rose-500/20 bg-rose-50'
                    : 'border-rose-200 bg-rose-50/50'
                }`}
              >
                <button
                  onClick={() => setPcsFilter(pcsFilter === 'ge6' ? 'all' : 'ge6')}
                  className={`px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    pcsFilter === 'ge6'
                      ? 'bg-rose-600 text-white'
                      : 'text-rose-900 hover:bg-rose-100'
                  }`}
                >
                  <span>≥ 6 PCS (Tổng)</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 text-rose-900 font-bold font-mono">
                    {mixByGroup.globalOrdersByPcs['ge6']?.length || 0} đơn
                  </span>
                </button>

                <button
                  onClick={() =>
                    handleCopyOrders(
                      mixByGroup.globalOrdersByPcs['ge6'] || [],
                      'global-tier-pcs-ge6'
                    )
                  }
                  className={`px-2 py-1 border-l text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    pcsFilter === 'ge6'
                      ? 'bg-rose-700 hover:bg-rose-800 text-white border-rose-500'
                      : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                  title="Sao chép toàn bộ mã đơn có từ 6 PCS trở lên"
                >
                  {copiedKey === 'global-tier-pcs-ge6' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-300" />
                      <span>Đã copy!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-rose-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            )}

          {pcsFilter !== 'all' && (
            <button
              onClick={() => setPcsFilter('all')}
              className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-1 ml-auto"
            >
              <span>&times; Xóa bộ lọc PCS (Hiển thị tất cả)</span>
            </button>
          )}
        </div>

        {pcsFilter !== 'all' && (
          <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Đang lọc hiển thị các đơn <b>{pcsFilter === 'ge6' ? '≥ 6 PCS' : pcsFilter === 'ge7' ? '≥ 7 PCS' : `${pcsFilter} PCS`}</b>: Có{' '}
                <b>{mixByGroup.globalOrdersByPcs[pcsFilter]?.length || 0} đơn</b> phù hợp.
              </span>
            </div>
            <button
              onClick={() => setPcsFilter('all')}
              className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer shrink-0"
            >
              Xem tất cả
            </button>
          </div>
        )}
      </div>

      {/* 3 Metric Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Đơn MIX Thuần Cùng Nhóm */}
        <div
          onClick={() => setSubGroupTab('pure')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            subGroupTab === 'pure'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-gray-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Đơn MIX Cùng 1 Nhóm</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {filteredPureGroupList.reduce((sum, g) => sum + (pcsFilter === 'all' ? g.orderCount : (g.ordersByPcs[pcsFilter]?.length || 0)), 0)}{' '}
              <span className="text-xs font-normal text-gray-500">Đơn</span>
              {pcsFilter !== 'all' && (
                <span className="text-xs font-bold text-emerald-600 block">
                  (Đã lọc {pcsFilter === 'ge6' ? '≥6' : pcsFilter} PCS &bull; Gốc: {mixByGroup.totalPureOrders} đơn)
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Tổng <b>{mixByGroup.totalPurePcs} PCS</b> &mdash; Chiếm{' '}
              <b>{((mixByGroup.totalPureOrders / (mixByGroup.totalMixOrders || 1)) * 100).toFixed(1)}%</b> tổng đơn MIX
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-emerald-100 text-[11px] text-emerald-700 font-semibold flex items-center justify-between">
            <span>⭐ Nhặt siêu tốc tại 1 kệ</span>
            <span className="underline">Xem {filteredPureGroupList.length} nhóm &rarr;</span>
          </div>
        </div>

        {/* Card 2: Đơn MIX Chéo Nhiều Nhóm */}
        <div
          onClick={() => setSubGroupTab('cross')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            subGroupTab === 'cross'
              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-white border-gray-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Đơn MIX Chéo Nhóm</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Split className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-indigo-700 font-mono">
              {filteredCrossGroupPairs.reduce((sum, c) => sum + (pcsFilter === 'all' ? c.orderCount : (c.ordersByPcs[pcsFilter]?.length || 0)), 0)}{' '}
              <span className="text-xs font-normal text-gray-500">Đơn</span>
              {pcsFilter !== 'all' && (
                <span className="text-xs font-bold text-indigo-600 block">
                  (Đã lọc {pcsFilter === 'ge6' ? '≥6' : pcsFilter} PCS &bull; Gốc: {mixByGroup.totalCrossOrders} đơn)
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Tổng <b>{mixByGroup.totalCrossPcs} PCS</b> &mdash; Gồm{' '}
              <b>{filteredCrossGroupPairs.length}</b> cặp nhóm kết hợp
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-indigo-100 text-[11px] text-indigo-700 font-semibold flex items-center justify-between">
            <span>🔀 Đơn kết hợp nhiều kệ</span>
            <span className="underline">Xem {filteredCrossGroupPairs.length} combo &rarr;</span>
          </div>
        </div>

        {/* Card 3: Bảng Tổng Hợp Chi Tiết */}
        <div
          onClick={() => setSubGroupTab('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
            subGroupTab === 'all'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Tổng Số Nhóm Hàng</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <FolderTree className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-blue-700 font-mono">
              {filteredAllGroupSummaries.length}{' '}
              <span className="text-xs font-normal text-gray-500">Nhóm</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Tổng <b>{mixAnalysis.totalMixPcs} PCS</b> ({mixAnalysis.distinctSkusInMix} SKU)
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-blue-100 text-[11px] text-blue-700 font-semibold flex items-center justify-between">
            <span>📊 Ma trận chi tiết & PCS</span>
            <span className="underline">Xem bảng tổng &rarr;</span>
          </div>
        </div>
      </div>

      {/* Sub-Tab Selector Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-2 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSubGroupTab('pure')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              subGroupTab === 'pure'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đơn MIX Thuần Cùng Nhóm ({filteredPureGroupList.length} nhóm)
          </button>
          <button
            onClick={() => setSubGroupTab('cross')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              subGroupTab === 'cross'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            Đơn MIX Chéo Nhóm ({filteredCrossGroupPairs.length} combo)
          </button>
          <button
            onClick={() => setSubGroupTab('all')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              subGroupTab === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            Bảng Tổng Hợp Chi Tiết Toàn Bộ Nhóm ({filteredAllGroupSummaries.length})
          </button>
        </div>

        {subGroupTab === 'pure' && (
          <button
            onClick={() =>
              handleCopyOrders(
                filteredPureGroupList.flatMap((g) =>
                  pcsFilter === 'all' ? g.orderNos : g.ordersByPcs[pcsFilter] || []
                ),
                'all-pure-orders'
              )
            }
            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            {copiedKey === 'all-pure-orders' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Đã copy mã đơn cùng nhóm!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Tất Cả Mã Đơn Cùng Nhóm
              </>
            )}
          </button>
        )}
      </div>

      {/* SUB-TAB 1: ĐƠN MIX THUẦN CÙNG 1 NHÓM */}
      {subGroupTab === 'pure' && (
        <div className="space-y-4">
          {filteredPureGroupList.length === 0 ? (
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl text-center">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <div className="text-sm font-bold text-gray-700">
                {pcsFilter !== 'all'
                  ? `Không có đơn MIX thuần cùng nhóm nào có ${pcsFilter} PCS`
                  : 'Không tìm thấy đơn MIX thuần cùng 1 nhóm'}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {pcsFilter !== 'all' ? (
                  <button
                    onClick={() => setPcsFilter('all')}
                    className="text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    Bấm vào đây để xem lại toàn bộ các mức PCS
                  </button>
                ) : (
                  'Tất cả các đơn MIX trong đợt này đều là đơn kết hợp chéo giữa các dòng sản phẩm khác nhau.'
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPureGroupList.map((group, idx) => {
                const targetOrderNos =
                  pcsFilter === 'all' ? group.orderNos : group.ordersByPcs[pcsFilter] || [];

                return (
                  <div
                    key={group.groupName}
                    className="bg-white rounded-2xl border border-emerald-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
                  >
                    {/* Group Header */}
                    <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/50 border-b border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="text-xs font-black text-emerald-950 font-mono">
                            NHÓM {group.groupName}
                          </span>
                          <div className="text-[10px] text-emerald-700">
                            {group.skuBreakdown.length} mã SKU trong nhóm
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
                          {group.orderCount} Đơn MIX
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                          {group.totalPcs} PCS
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 space-y-3">
                      {/* PCS Breakdown Badges inside the group */}
                      <div className="bg-emerald-50/50 rounded-xl p-2 border border-emerald-100 space-y-1.5">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                          <span>Bóc Tách Số Lượng PCS:</span>
                          <span className="text-emerald-600 font-normal">
                            {group.pcsBreakdown.filter((b) => b.orderCount > 0).length} mức kết hợp
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {group.pcsBreakdown
                            .filter((b) => b.orderCount > 0)
                            .map((b) => (
                              <span
                                key={b.pcs}
                                className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-white border border-emerald-200 text-emerald-900 shadow-2xs inline-flex items-center gap-1"
                              >
                                <span className="text-emerald-700">{b.label}:</span>
                                <b className="text-gray-900 font-black">{b.orderCount} đơn</b>
                                <span className="text-[9px] text-gray-500 font-normal">
                                  ({b.totalPcs} PCS)
                                </span>
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* SKU Breakdown Chips */}
                      <div>
                        <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between mb-1.5">
                          <span>Danh sách SKU cần lấy gom:</span>
                          <span className="text-gray-400 font-normal">Nhặt 1 lượt tại kệ này</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {group.skuBreakdown.map((item) => (
                            <div
                              key={item.sku}
                              className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between"
                            >
                              <span className="font-mono text-xs font-bold text-gray-800">{item.sku}</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-rose-600">{item.qty} PCS</span>
                                <span className="text-[10px] text-gray-400">({item.orderCount} đơn)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Order Nos List & Quick Copy Group Buttons */}
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                              Mã đơn cần cấp ({targetOrderNos.length}):
                            </span>
                            <button
                              onClick={() =>
                                handleCopyOrders(
                                  group.orderNos,
                                  `pure-group-${group.groupName}-total`
                                )
                              }
                              className="text-[11px] text-emerald-800 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                              title="Sao chép toàn bộ mã đơn của nhóm này"
                            >
                              {copiedKey === `pure-group-${group.groupName}-total` ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                                  Đã copy {group.orderNos.length} đơn!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  Copy Tổng ({group.orderNos.length} đơn)
                                </>
                              )}
                            </button>
                          </div>

                          {/* Mini Quick Copy Buttons for each PCS level */}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-gray-400 font-medium mr-0.5">
                              Copy theo PCS:
                            </span>
                            {group.pcsBreakdown
                              .filter((b) => b.orderCount > 0)
                              .map((b) => {
                                const copyKey = `pure-${group.groupName}-pcs-${b.pcs}`;
                                return (
                                  <button
                                    key={b.pcs}
                                    onClick={() => handleCopyOrders(b.orderNos, copyKey)}
                                    className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 border border-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                                    title={`Copy ${b.orderCount} đơn ${b.label}`}
                                  >
                                    {copiedKey === copyKey ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3 text-gray-400" />
                                    )}
                                    <span>
                                      {b.label} ({b.orderCount}đ)
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        </div>

                        <div className="p-2 bg-gray-50 rounded-lg text-[10px] font-mono text-gray-700 max-h-16 overflow-y-auto leading-relaxed border border-gray-200/60">
                          {formatCompactOrderList(targetOrderNos)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: ĐƠN MIX CHÉO NHIỀU NHÓM (COMBOS) */}
      {subGroupTab === 'cross' && (
        <div className="space-y-4">
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <b>Đơn MIX Chéo Nhóm:</b> Là các đơn hàng khách mua kết hợp từ 2 nhóm sản phẩm trở lên (Ví dụ: Thảm Yoga + Bình nước). Gom theo cặp nhóm giúp người nhặt hàng chuẩn bị xe gom đi theo lộ trình ngắn nhất.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCrossGroupPairs.map((pair, idx) => {
              const targetOrderNos =
                pcsFilter === 'all' ? pair.orderNos : pair.ordersByPcs[pcsFilter] || [];

              return (
                <div
                  key={pair.groupComboKey}
                  className="bg-white rounded-2xl border border-indigo-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50/50 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-black text-indigo-950 font-mono">
                        {pair.groupComboKey}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white">
                        {pair.orderCount} Đơn
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                        {pair.totalPcs} PCS
                      </span>
                    </div>
                  </div>

                  <div className="p-3 space-y-2.5">
                    {/* PCS Breakdown for cross pair */}
                    <div className="flex flex-wrap gap-1">
                      {pair.pcsBreakdown
                        .filter((b) => b.orderCount > 0)
                        .map((b) => (
                          <span
                            key={b.pcs}
                            className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 border border-indigo-200 text-indigo-800"
                          >
                            {b.label}: {b.orderCount}đ
                          </span>
                        ))}
                    </div>

                    <div className="text-[10px] text-gray-500">
                      <b>SKU liên quan:</b> {pair.skuList.join(', ')}
                    </div>

                    <div className="pt-2 border-t border-gray-100 space-y-1.5">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Mã đơn ({targetOrderNos.length}):
                          </span>
                          <button
                            onClick={() =>
                              handleCopyOrders(
                                pair.orderNos,
                                `cross-combo-${pair.groupComboKey}-total`
                              )
                            }
                            className="text-[10px] text-indigo-700 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                          >
                            {copiedKey === `cross-combo-${pair.groupComboKey}-total` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                Đã copy {pair.orderNos.length} mã!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy Tổng ({pair.orderNos.length}đ)
                              </>
                            )}
                          </button>
                        </div>

                        {/* Mini copy by PCS for cross pair */}
                        <div className="flex flex-wrap items-center gap-1">
                          {pair.pcsBreakdown
                            .filter((b) => b.orderCount > 0)
                            .map((b) => {
                              const copyKey = `cross-${pair.groupComboKey}-pcs-${b.pcs}`;
                              return (
                                <button
                                  key={b.pcs}
                                  onClick={() => handleCopyOrders(b.orderNos, copyKey)}
                                  className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 border border-gray-200 transition-colors flex items-center gap-0.5 cursor-pointer"
                                  title={`Copy ${b.orderCount} đơn ${b.label}`}
                                >
                                  {copiedKey === copyKey ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5 text-gray-400" />
                                  )}
                                  <span>
                                    {b.label} ({b.orderCount})
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>

                      <div className="p-1.5 bg-gray-50 rounded-lg text-[10px] font-mono text-gray-700 max-h-16 overflow-y-auto leading-relaxed border border-gray-200/60">
                        {formatCompactOrderList(targetOrderNos)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BẢNG TỔNG HỢP TOÀN BỘ CÁC NHÓM */}
      {subGroupTab === 'all' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Bảng Thống Kê Chi Tiết Toàn Bộ Nhóm Hàng Trong Đơn MIX ({filteredAllGroupSummaries.length} Nhóm)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Thống kê chi tiết từng nhóm hàng, bóc tách số lượng theo PCS (2đ, 3đ, 4đ, 5đ, 6đ, ≥7đ), đơn thuần 1 nhóm, đơn chéo nhóm và cho phép copy theo từng mức hoặc copy tổng.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-xs uppercase font-bold border-b border-gray-200">
                  <th className="py-2.5 px-3 text-center w-12">STT</th>
                  <th className="py-2.5 px-3 min-w-[130px]">Tên Nhóm Hàng</th>
                  <th className="py-2.5 px-3 text-center">Tổng Đơn MIX</th>
                  <th className="py-2.5 px-3 min-w-[220px]">Bóc Tách Số Đơn Theo PCS</th>
                  <th className="py-2.5 px-3 text-center">Thuần 1 Nhóm (100%)</th>
                  <th className="py-2.5 px-3 text-center">Chéo Nhóm</th>
                  <th className="py-2.5 px-3 text-center">Tổng PCS</th>
                  <th className="py-2.5 px-3 min-w-[180px]">Các Mã SKU Trực Thuộc</th>
                  <th className="py-2.5 px-3 text-center min-w-[140px]">Thao Tác Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredAllGroupSummaries.map((item, idx) => (
                  <tr key={item.groupName} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-gray-500">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-black text-gray-900 text-sm">
                      {item.groupName}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-blue-700 font-mono text-sm">
                      {item.totalOrders} đơn
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {item.pcsBreakdown
                          .filter((b) => b.orderCount > 0)
                          .map((b) => (
                            <span
                              key={b.pcs}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border inline-flex items-center gap-0.5 ${
                                b.pcs === 2
                                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                                  : b.pcs === 3
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : b.pcs === 4
                                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                                  : b.pcs === 5
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-orange-50 text-orange-800 border-orange-200'
                              }`}
                              title={`${b.label}: ${b.orderCount} đơn (${b.totalPcs} PCS)`}
                            >
                              <span>{b.label}:</span>
                              <b className="text-gray-900">{b.orderCount}đ</b>
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono">
                      {item.pureOrders > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          {item.pureOrders} đơn
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-gray-700">
                      {item.crossOrders > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold">
                          {item.crossOrders} đơn
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-rose-600 font-mono text-sm">
                      {item.totalPcs} PCS
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {item.skus.map((s) => (
                          <span
                            key={s.sku}
                            className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-mono text-gray-700 border border-gray-200"
                          >
                            {s.sku} <b>({s.qty})</b>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() =>
                            handleCopyOrders(item.allOrderNos, `summary-group-${item.groupName}`)
                          }
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer border border-indigo-200 w-full justify-center"
                          title="Copy toàn bộ mã đơn có mặt nhóm này"
                        >
                          {copiedKey === `summary-group-${item.groupName}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              Đã copy!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy Tổng ({item.allOrderNos.length}đ)
                            </>
                          )}
                        </button>

                        <div className="flex flex-wrap items-center justify-center gap-0.5">
                          {item.pcsBreakdown
                            .filter((b) => b.orderCount > 0)
                            .map((b) => {
                              const copyKey = `sum-${item.groupName}-pcs-${b.pcs}`;
                              return (
                                <button
                                  key={b.pcs}
                                  onClick={() => handleCopyOrders(b.orderNos, copyKey)}
                                  className="px-1 py-0.5 text-[9px] font-bold rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-0.5 cursor-pointer"
                                  title={`Copy ${b.orderCount} đơn ${b.label}`}
                                >
                                  {copiedKey === copyKey ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  ) : null}
                                  <span>
                                    {b.pcs}đ ({b.orderCount})
                                  </span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
