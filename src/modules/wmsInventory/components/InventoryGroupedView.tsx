import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  Printer
} from 'lucide-react';
import { InventoryGroupSummary, WmsInventoryItem } from '../../../types';
import { SkuHoverImage } from '../../../components/common/SkuHoverImage';

interface SkuDiffInfo {
  diffInUsed: number;
  diffSellable: number;
  diffOnWay: number;
  diffOutbound: number;
}

interface InventoryGroupedViewProps {
  filteredGroups: InventoryGroupSummary[];
  expandedGroups: Record<string, boolean>;
  toggleGroupExpand: (groupName: string) => void;
  copiedGroup: string | null;
  handleCopyGroupSkus: (group: InventoryGroupSummary) => void;
  handleOpenPrintForGroup: (groupName: string) => void;
  copiedSku: string | null;
  handleCopySku: (sku: string) => void;
  handleOpenSkuLabel: (item: WmsInventoryItem) => void;
  changedSkuMap: Record<string, SkuDiffInfo>;
}

export const InventoryGroupedView: React.FC<InventoryGroupedViewProps> = ({
  filteredGroups,
  expandedGroups,
  toggleGroupExpand,
  copiedGroup,
  handleCopyGroupSkus,
  handleOpenPrintForGroup,
  copiedSku,
  handleCopySku,
  handleOpenSkuLabel,
  changedSkuMap
}) => {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {filteredGroups.map((g) => {
        const isExpanded = !!expandedGroups[g.group];
        const isCopied = copiedGroup === g.group;

        return (
          <div
            key={g.group}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200"
          >
            {/* Group Header Bar */}
            <div
              onClick={() => toggleGroupExpand(g.group)}
              className="p-3 sm:p-4 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50 hover:bg-slate-100/60 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 select-none"
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-100 text-emerald-800 font-black text-xs sm:text-sm flex items-center justify-center border border-emerald-200 shrink-0">
                  {g.group.replace('YD-', '')}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      Nhóm {g.group}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {g.skuCount} mã SKU
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {g.percentageOfTotal}% kho
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span>
                      Khả dụng: <strong className="text-emerald-700">{g.totalInUsed.toLocaleString()}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Bán: <strong className="text-indigo-700">{g.totalSellable.toLocaleString()}</strong>
                    </span>
                    {g.totalOnWay > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 font-semibold">
                          +{g.totalOnWay.toLocaleString()} về
                        </span>
                      </>
                    )}
                    {g.totalOutbound > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-purple-600 font-semibold">
                          Chờ: {g.totalOutbound.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions & Chevron */}
              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyGroupSkus(g);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 shrink-0"
                  title="Sao chép bảng SKU và số lượng của nhóm này"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{isCopied ? 'Đã copy!' : 'Copy nhóm'}</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenPrintForGroup(g.group);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-emerald-800 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 transition-all shrink-0"
                  title={`In danh sách SKU của nhóm ${g.group}`}
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>In nhóm</span>
                </button>

                <div className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-500 shrink-0">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
            </div>

            {/* Group Details Table (When expanded) */}
            {isExpanded && (
              <div className="overflow-x-auto overscroll-contain scrollbar-thin" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200/80 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-4 w-12 text-center">STT</th>
                      <th className="py-2.5 px-4 w-44">Mã SKU</th>
                      <th className="py-2.5 px-4">Tên Sản Phẩm (Title)</th>
                      <th className="py-2.5 px-3 text-right">Khả Dụng (In Used)</th>
                      <th className="py-2.5 px-3 text-right">Có Thể Bán (Sellable)</th>
                      <th className="py-2.5 px-3 text-right">Đang Về (On Way)</th>
                      <th className="py-2.5 px-3 text-right">Chờ Xuất</th>
                      <th className="py-2.5 px-3 text-right">Hàng Lỗi</th>
                      <th className="py-2.5 px-4 text-center w-28">Cập Nhật</th>
                      <th className="py-2.5 px-3 text-center w-20">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.items.map((item, idx) => {
                      const isItemCopied = copiedSku === item.sku;
                      const isZero = item.inUsed <= 0;
                      const diff = changedSkuMap[item.sku];
                      const isSelected = selectedSku === item.sku;

                      return (
                        <tr
                          key={item.id || item.sku}
                          onClick={() => setSelectedSku((prev) => (prev === item.sku ? null : item.sku))}
                          className={`group relative cursor-pointer transition-all duration-150 select-text ${
                            isSelected
                              ? 'bg-blue-50/90 text-slate-900 shadow-sm border-y border-blue-200'
                              : diff
                              ? 'bg-amber-100/70 ring-1 ring-amber-400 hover:bg-amber-100'
                              : isZero
                              ? 'bg-rose-50/30 hover:bg-rose-100/60'
                              : 'hover:bg-gradient-to-r hover:from-blue-50/90 hover:via-indigo-50/60 hover:to-blue-50/70 hover:shadow-xs'
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center relative font-semibold text-[11px] transition-colors">
                            {/* Thanh line nổi bật ở mép trái khi kéo chuột qua hoặc click chọn */}
                            <span
                              className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-200 ${
                                isSelected
                                  ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]'
                                  : 'bg-transparent group-hover:bg-blue-500 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                              }`}
                            />
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-mono text-[11px] transition-all duration-150 ${
                                isSelected
                                  ? 'bg-blue-600 text-white font-black shadow-xs scale-110'
                                  : 'text-slate-400 group-hover:bg-blue-600 group-hover:text-white group-hover:font-black group-hover:scale-110 group-hover:shadow-xs'
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <SkuHoverImage
                                sku={item.sku}
                                productId={item.productId}
                                productTitle={item.title || item.productName}
                              >
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-xs transition-all duration-150 cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white font-black shadow-xs ring-2 ring-blue-400/50'
                                      : 'bg-slate-100 border border-slate-200 text-slate-900 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 group-hover:shadow-xs group-hover:scale-105 font-bold'
                                  }`}
                                  title="Rê chuột hoặc nhấp để xem ảnh sản phẩm WMS"
                                >
                                  <span>{item.sku}</span>
                                  <span className="text-[10px] opacity-40 group-hover:opacity-100 transition-opacity" title="Có hình ảnh WMS">🖼️</span>
                                </span>
                              </SkuHoverImage>
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
                          <td
                            className="py-2.5 px-4 text-slate-700 group-hover:text-slate-950 group-hover:font-medium max-w-md truncate transition-colors"
                            title={item.title}
                          >
                            {item.title || item.productName}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md font-extrabold transition-all duration-150 ${
                                isZero
                                  ? 'bg-rose-100 text-rose-700'
                                  : item.inUsed > 500
                                  ? 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-xs group-hover:scale-110'
                                  : 'bg-slate-100 text-slate-800 group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-xs group-hover:scale-110'
                              }`}
                            >
                              {item.inUsed.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-700 group-hover:text-slate-950 group-hover:font-extrabold transition-colors">
                            {item.sellable.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-amber-600 group-hover:font-extrabold transition-colors">
                            {item.onWay > 0 ? `+${item.onWay.toLocaleString()}` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-purple-600 group-hover:font-extrabold transition-colors">
                            {item.outbound > 0 ? item.outbound.toLocaleString() : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-rose-600 group-hover:font-extrabold transition-colors">
                            {item.unsellable > 0 ? item.unsellable.toLocaleString() : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-center text-[10px] text-slate-400 group-hover:text-slate-600 group-hover:font-semibold transition-colors">
                            {item.updateTime ? item.updateTime.slice(5) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenSkuLabel(item);
                                }}
                                className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 cursor-pointer transition-all shadow-2xs group-hover:scale-110 active:scale-95"
                                title={`In tem nhãn SKU ${item.sku} (Máy in nhiệt XP-D465B)`}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopySku(item.sku);
                                }}
                                className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-900 cursor-pointer transition-all group-hover:scale-110 active:scale-95"
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
            )}
          </div>
        );
      })}
    </div>
  );
};
