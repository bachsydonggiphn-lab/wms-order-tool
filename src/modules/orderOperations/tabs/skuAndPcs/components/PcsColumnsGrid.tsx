import React from 'react';
import {
  Box,
  Layers,
  ChevronRight,
  ChevronDown,
  Flame,
  ListOrdered,
  Truck,
  FileText,
  Hash,
  Maximize2,
  CheckSquare,
  Square,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { RawOrderRow } from '../../../../../types';
import { SkuHoverImage } from '../../../../../components/common/SkuHoverImage';
import {
  ColumnSkuItem,
  ColumnViewMode,
  MinOrderThreshold,
  MobileColumnTab,
  SelectedSkuEntry,
} from '../types';

interface PcsColumnsGridProps {
  isSkuTableCollapsed: boolean;
  toggleSkuTableCollapsed: () => void;
  skuEntriesCount: number;
  mobileColumnTab: MobileColumnTab;
  columnViewMode: ColumnViewMode;
  setColumnViewMode: (mode: ColumnViewMode) => void;
  pcsKeys: string[];
  pcsGroups: Record<string, string[]>;
  columnSkuBreakdowns: Record<string, ColumnSkuItem[]>;
  minOrderThreshold: MinOrderThreshold;
  activeThresholdNum: number;
  isSubmittedStatus: boolean;
  selectedSkuMap: Map<string, SelectedSkuEntry>;
  setSelectedSkuMap: React.Dispatch<React.SetStateAction<Map<string, SelectedSkuEntry>>>;
  handleOpenInspectColumn: (colKey: string) => void;
  handleCopyColumn: (title: string, list: string[]) => void;
  handleOpenCreateWmsModal: (orderCodes: string[], batchTitle: string) => void;
  handleCopyColumnRange: (colKey: string, minOrders: number, maxOrders: number, labelKey: string) => void;
  copiedKey: string | null;
  expandedSkus: Set<string>;
  handleToggleExpandSku: (skuKey: string) => void;
  handleCopySkuInColumn: (keyIdentifier: string, orderNos: string[]) => void;
  onCopySingleOrder: (orderNo: string) => void;
  getOrderRefNo: (orderNo: string) => string;
  orderMap: Map<string, RawOrderRow>;
}

export const PcsColumnsGrid: React.FC<PcsColumnsGridProps> = ({
  isSkuTableCollapsed,
  toggleSkuTableCollapsed,
  skuEntriesCount,
  mobileColumnTab,
  columnViewMode,
  setColumnViewMode,
  pcsKeys,
  pcsGroups,
  columnSkuBreakdowns,
  minOrderThreshold,
  activeThresholdNum,
  isSubmittedStatus,
  selectedSkuMap,
  setSelectedSkuMap,
  handleOpenInspectColumn,
  handleCopyColumn,
  handleOpenCreateWmsModal,
  handleCopyColumnRange,
  copiedKey,
  expandedSkus,
  handleToggleExpandSku,
  handleCopySkuInColumn,
  onCopySingleOrder,
  getOrderRefNo,
  orderMap,
}) => {
  return (
    <div
      className={`${
        isSkuTableCollapsed ? 'col-span-12' : 'lg:col-span-8 xl:col-span-9'
      } bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex-col ${
        mobileColumnTab === 'sku' ? 'hidden lg:flex' : 'flex'
      }`}
    >
      {/* Header & Mode Switcher */}
      <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isSkuTableCollapsed && (
            <button
              type="button"
              onClick={toggleSkuTableCollapsed}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all shadow-2xs cursor-pointer hover:scale-102 shrink-0 mr-1"
              title="Mở rộng Bảng SKU (thò ra)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              <Layers className="w-3.5 h-3.5" />
              <span>Bảng SKU ({skuEntriesCount})</span>
            </button>
          )}
          <Box className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Phân Loại Đơn Theo PCS (Cột X trở đi)
          </h3>
        </div>

        {/* Switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-gray-500 font-medium hidden lg:inline shrink-0">Hiển thị:</span>
          <div className="flex items-center p-0.5 bg-gray-200/80 rounded-xl border border-gray-200 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <button
              onClick={() => setColumnViewMode('sku')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                columnViewMode === 'sku'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Gom các đơn theo từng mã SKU (Xếp từ nhiều đến ít) và cho phép copy theo SKU"
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Phân Tách Theo SKU (Copy theo mã)</span>
              <span className="sm:hidden">Theo SKU</span>
            </button>
            <button
              onClick={() => setColumnViewMode('order_no')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                columnViewMode === 'order_no'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Hiển thị danh sách mã đơn thô (Order No.)"
            >
              <ListOrdered className="w-3.5 h-3.5 text-gray-500" />
              <span className="hidden sm:inline">Danh Sách Mã Đơn (Order No.)</span>
              <span className="sm:hidden">Mã Đơn</span>
            </button>
            <button
              onClick={() => setColumnViewMode('tracking_no')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                columnViewMode === 'tracking_no'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Hiển thị danh sách mã vận đơn thuần (chỉ mã)"
            >
              <Truck className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Danh Sách Vận Đơn (Tracking No.)</span>
              <span className="sm:hidden">Vận Đơn</span>
            </button>
            <button
              onClick={() => setColumnViewMode('tracking_prefix')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                columnViewMode === 'tracking_prefix'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold ring-1 ring-blue-300'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Hiển thị danh sách kèm tiền tố 'Tracking No. ：' (Định dạng chuẩn WMS)"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Tracking No.</span>
            </button>
            <button
              onClick={() => setColumnViewMode('ref_prefix')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                columnViewMode === 'ref_prefix'
                  ? 'bg-white text-purple-700 shadow-2xs font-bold ring-1 ring-purple-300'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Hiển thị danh sách kèm tiền tố 'RefNo.：' (Định dạng chuẩn WMS)"
            >
              <Hash className="w-3.5 h-3.5 text-purple-600" />
              <span>RefNo.</span>
            </button>
          </div>
        </div>
      </div>

      {/* Columns Container */}
      <div className="p-5">
        {pcsKeys.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            Chưa có đơn hàng nào được phân loại theo PCS.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3.5">
            {pcsKeys.map((key) => {
              const ordersList = pcsGroups[key] || [];
              const isMixL46 = key === 'MIX L46';
              const isMix = key === 'MIX';
              const headerTitle = isMix ? 'MIX' : isMixL46 ? 'MIX L46' : `${key} PCS`;
              const rawSkuList = columnSkuBreakdowns[key] || [];

              // Áp dụng bộ lọc khoảng đơn
              const skuList = minOrderThreshold === 'lt5'
                ? rawSkuList.filter((it) => it.orderCount < 5)
                : minOrderThreshold === '5-9'
                ? rawSkuList.filter((it) => it.orderCount >= 5 && it.orderCount <= 9)
                : minOrderThreshold === '10-19'
                ? rawSkuList.filter((it) => it.orderCount >= 10 && it.orderCount <= 19)
                : minOrderThreshold === '20'
                ? rawSkuList.filter((it) => it.orderCount >= 20)
                : minOrderThreshold === 'ge5'
                ? rawSkuList.filter((it) => it.orderCount >= 5)
                : minOrderThreshold === 'lt9'
                ? rawSkuList.filter((it) => it.orderCount <= 9)
                : activeThresholdNum > 0
                ? rawSkuList.filter((it) => it.orderCount >= activeThresholdNum)
                : rawSkuList;

              // Thống kê nhanh SKU theo khoảng trong cột này
              const colSkus5_9 = rawSkuList.filter((it) => it.orderCount >= 5 && it.orderCount <= 9);
              const colOrders5_9Count = colSkus5_9.reduce((s, it) => s + it.orderCount, 0);
              const colSkus10_19 = rawSkuList.filter((it) => it.orderCount >= 10 && it.orderCount <= 19);
              const colOrders10_19Count = colSkus10_19.reduce((s, it) => s + it.orderCount, 0);
              const colSkus20 = rawSkuList.filter((it) => it.orderCount >= 20);
              const colOrders20Count = colSkus20.reduce((s, it) => s + it.orderCount, 0);
              const colSkus5Plus = rawSkuList.filter((it) => it.orderCount >= 5);
              const colOrders5PlusCount = colSkus5Plus.reduce((s, it) => s + it.orderCount, 0);
              const colSkusUnder5 = rawSkuList.filter((it) => it.orderCount < 5);
              const colOrdersUnder5Count = colSkusUnder5.reduce((s, it) => s + it.orderCount, 0);

              return (
                <div
                  key={key}
                  className="w-full bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs hover:border-gray-300 transition-colors"
                >
                  {/* Column Header */}
                  <div
                    onClick={() => handleOpenInspectColumn(key)}
                    className="p-3 bg-white border-b border-gray-200 flex items-center justify-between cursor-pointer hover:bg-indigo-50/40 transition-colors group select-none"
                    title={`Bấm để mở chi tiết phân loại SKU của cột ${headerTitle}`}
                  >
                    <div className="flex items-center gap-2 truncate pr-1">
                      {isSubmittedStatus && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSkuMap((prev) => {
                              const next = new Map(prev);
                              const allSelected =
                                rawSkuList.length > 0 &&
                                rawSkuList.every((it) => next.has(`${key}_${it.sku}`));

                              if (allSelected) {
                                rawSkuList.forEach((it) => next.delete(`${key}_${it.sku}`));
                              } else {
                                rawSkuList.forEach((it) => {
                                  next.set(`${key}_${it.sku}`, {
                                    sku: it.sku,
                                    orderCount: it.orderCount,
                                    totalQty: it.totalQty,
                                    orderNos: it.orderNos,
                                    colKey: key,
                                  });
                                });
                              }
                              return next;
                            });
                          }}
                          className="p-1 -ml-1 rounded-md hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                          title={
                            rawSkuList.length > 0 &&
                            rawSkuList.every((it) => selectedSkuMap.has(`${key}_${it.sku}`))
                              ? 'Bỏ chọn toàn bộ SKU trong cột này'
                              : 'Chọn tất cả SKU trong cột này'
                          }
                        >
                          {rawSkuList.length > 0 &&
                          rawSkuList.every((it) => selectedSkuMap.has(`${key}_${it.sku}`)) ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300 hover:text-gray-500" />
                          )}
                        </button>
                      )}

                      <div className="truncate">
                        <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isMixL46 ? 'bg-amber-500' : isMix ? 'bg-purple-500' : 'bg-indigo-600'}`}></span>
                          <span className="group-hover:text-indigo-600 transition-colors">{headerTitle}</span>
                          <Maximize2 className="w-3 h-3 text-gray-300 group-hover:text-indigo-600 transition-colors shrink-0" />
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 font-medium">
                          <span className="text-gray-900 font-bold">{ordersList.length} đơn</span>
                          <span>•</span>
                          <span className="text-indigo-600 font-bold">{rawSkuList.length} mã SKU</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyColumn(headerTitle, ordersList);
                        }}
                        title={
                          columnViewMode === 'ref_prefix'
                            ? `Sao chép toàn bộ ${ordersList.length} dòng dạng "RefNo.：..." của cột ${headerTitle}`
                            : columnViewMode === 'tracking_prefix'
                            ? `Sao chép toàn bộ ${ordersList.length} dòng dạng "Tracking No. ：..." của cột ${headerTitle}`
                            : columnViewMode === 'tracking_no'
                            ? `Sao chép toàn bộ ${ordersList.length} mã vận đơn (Tracking No.) của cột ${headerTitle}`
                            : `Sao chép toàn bộ ${ordersList.length} mã đơn của cột ${headerTitle}`
                        }
                        className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer shrink-0"
                      >
                        {copiedKey === headerTitle ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isSubmittedStatus && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateWmsModal(ordersList, `Cột ${headerTitle} (${ordersList.length} đơn)`);
                          }}
                          title={`⚡ Tạo Picking List WMS cho toàn bộ ${ordersList.length} đơn của cột ${headerTitle}`}
                          className="p-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub-bar inside column card: Quick Copy */}
                  {columnViewMode === 'sku' && (colOrders5_9Count > 0 || colOrders10_19Count > 0 || colOrders20Count > 0 || colOrdersUnder5Count > 0) && (
                    <div className="px-2.5 py-1.5 bg-amber-50/40 border-b border-amber-100 flex items-center justify-between gap-1 text-[10px]">
                      <span className="text-amber-900 font-bold shrink-0">Copy:</span>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {colOrders5PlusCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyColumnRange(key, 5, Infinity, `${key}_col_ge5`);
                            }}
                            title={`Copy ${colOrders5PlusCount} đơn từ ${colSkus5Plus.length} SKU (≥5 đơn Tổng hợp) của cột ${headerTitle}`}
                            className={`px-1.5 py-0.5 rounded font-black transition-colors cursor-pointer shadow-2xs shrink-0 ${
                              copiedKey === `${key}_col_ge5`
                                ? 'bg-emerald-600 text-white'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-700'
                            }`}
                          >
                            {copiedKey === `${key}_col_ge5` ? '✓ Đã chép' : `≥5đ (${colOrders5PlusCount})`}
                          </button>
                        )}

                        {colOrders5_9Count > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyColumnRange(key, 5, 9, `${key}_col_5_9`);
                            }}
                            title={`Copy ${colOrders5_9Count} đơn từ ${colSkus5_9.length} SKU (5 - 9 đơn) của cột ${headerTitle}`}
                            className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer shadow-2xs shrink-0 ${
                              copiedKey === `${key}_col_5_9`
                                ? 'bg-emerald-600 text-white'
                                : 'bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300'
                            }`}
                          >
                            {copiedKey === `${key}_col_5_9` ? '✓ Đã chép' : `5-9đ (${colOrders5_9Count})`}
                          </button>
                        )}

                        {colOrders10_19Count > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyColumnRange(key, 10, 19, `${key}_col_10_19`);
                            }}
                            title={`Copy ${colOrders10_19Count} đơn từ ${colSkus10_19.length} SKU (10 - 19 đơn) của cột ${headerTitle}`}
                            className={`px-1.5 py-0.5 rounded font-black transition-colors cursor-pointer shadow-2xs shrink-0 ${
                              copiedKey === `${key}_col_10_19`
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-300 hover:bg-amber-400 text-indigo-950 border border-amber-400'
                            }`}
                          >
                            {copiedKey === `${key}_col_10_19` ? '✓ Đã chép' : `10-19đ (${colOrders10_19Count})`}
                          </button>
                        )}

                        {colOrders20Count > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyColumnRange(key, 20, Infinity, `${key}_col_ge20`);
                            }}
                            title={`Copy ${colOrders20Count} đơn từ ${colSkus20.length} SKU (≥20 đơn) của cột ${headerTitle}`}
                            className={`px-1.5 py-0.5 rounded font-black transition-colors cursor-pointer shadow-2xs shrink-0 ${
                              copiedKey === `${key}_col_ge20`
                                ? 'bg-emerald-600 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-700'
                            }`}
                          >
                            {copiedKey === `${key}_col_ge20` ? '✓ Đã chép' : `≥20đ (${colOrders20Count})`}
                          </button>
                        )}

                        {colOrdersUnder5Count > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyColumnRange(key, 1, 4, `${key}_col_lt5`);
                            }}
                            title={`Copy ${colOrdersUnder5Count} đơn từ ${colSkusUnder5.length} SKU (<5 đơn) của cột ${headerTitle}`}
                            className={`px-1.5 py-0.5 rounded font-semibold transition-colors cursor-pointer shadow-2xs shrink-0 ${
                              copiedKey === `${key}_col_lt5`
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                            }`}
                          >
                            {copiedKey === `${key}_col_lt5` ? '✓ Đã chép' : `<5đ (${colOrdersUnder5Count})`}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Content: Mode A - SKU Breakdown */}
                  {columnViewMode === 'sku' ? (
                    <div className="p-2 space-y-1.5 max-h-[500px] overflow-y-auto">
                      {minOrderThreshold === 'lt5' && (
                        <div className="p-1.5 bg-slate-100 rounded-lg text-[10px] text-slate-800 font-semibold flex items-center justify-between">
                          <span>Lọc: &lt; 5 đơn (Lẻ)</span>
                          <span>{skuList.length} SKU</span>
                        </div>
                      )}
                      {minOrderThreshold === '5-9' && (
                        <div className="p-1.5 bg-sky-50 rounded-lg text-[10px] text-sky-800 font-bold flex items-center justify-between">
                          <span>Lọc: 5 - 9 đơn</span>
                          <span>{skuList.length} SKU</span>
                        </div>
                      )}
                      {minOrderThreshold === '10-19' && (
                        <div className="p-1.5 bg-amber-50 rounded-lg text-[10px] text-amber-900 font-bold flex items-center justify-between">
                          <span>Lọc: 10 - 19 đơn</span>
                          <span>{skuList.length} SKU</span>
                        </div>
                      )}
                      {minOrderThreshold === '20' && (
                        <div className="p-1.5 bg-emerald-50 rounded-lg text-[10px] text-emerald-900 font-bold flex items-center justify-between">
                          <span>Lọc: ≥ 20 đơn</span>
                          <span>{skuList.length} SKU</span>
                        </div>
                      )}
                      {minOrderThreshold === 'ge5' && (
                        <div className="p-1.5 bg-indigo-50 rounded-lg text-[10px] text-indigo-900 font-bold flex items-center justify-between">
                          <span>Lọc: ≥ 5 đơn (Tổng hợp)</span>
                          <span>{skuList.length} SKU</span>
                        </div>
                      )}
                      {minOrderThreshold === 'custom' && (
                        <div className="p-1.5 bg-indigo-50/80 rounded-lg text-[10px] text-indigo-700 font-semibold flex items-center justify-between">
                          <span>Lọc: ≥ {activeThresholdNum} đơn</span>
                          <span>{skuList.length} SKU</span>
                        </div>
                      )}

                      {skuList.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-400">
                          {minOrderThreshold === '5-9'
                            ? 'Không có SKU nào trong khoảng 5 - 9 đơn'
                            : minOrderThreshold === '10-19'
                            ? 'Không có SKU nào trong khoảng 10 - 19 đơn'
                            : minOrderThreshold === '20'
                            ? 'Không có SKU nào ≥ 20 đơn'
                            : minOrderThreshold === 'ge5'
                            ? 'Không có SKU nào ≥ 5 đơn'
                            : minOrderThreshold === 'lt5'
                            ? 'Không có SKU nào < 5 đơn'
                            : activeThresholdNum > 0
                            ? `Không có SKU nào ≥ ${activeThresholdNum} đơn`
                            : 'Không có đơn'}
                        </div>
                      ) : (
                        skuList.map((item, idx) => {
                          const itemKey = `${key}_${item.sku}`;
                          const isExpanded = expandedSkus.has(itemKey);
                          const isSelected = selectedSkuMap.has(itemKey);
                          const isTop1 = idx === 0;
                          const is20Plus = item.orderCount >= 20;
                          const is10_19 = item.orderCount >= 10 && item.orderCount <= 19;
                          const is5_9 = item.orderCount >= 5 && item.orderCount <= 9;

                          return (
                            <div
                              key={item.sku}
                              className={`rounded-xl border transition-all overflow-hidden ${
                                isSelected
                                  ? 'bg-indigo-50/95 border-indigo-500 ring-2 ring-indigo-400/60 shadow-xs'
                                  : is20Plus
                                  ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                                  : is10_19
                                  ? 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-400/20'
                                  : is5_9
                                  ? 'bg-sky-50/40 border-sky-300 ring-1 ring-sky-400/20'
                                  : isTop1
                                  ? 'bg-amber-50/30 border-amber-200/90'
                                  : 'bg-white border-gray-200/90 hover:border-indigo-200'
                              }`}
                            >
                              {/* SKU Row Header */}
                              <div className="p-2 flex items-center justify-between gap-1.5">
                                {isSubmittedStatus && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSkuMap((prev) => {
                                        const next = new Map(prev);
                                        if (next.has(itemKey)) {
                                          next.delete(itemKey);
                                        } else {
                                          next.set(itemKey, {
                                            sku: item.sku,
                                            orderCount: item.orderCount,
                                            totalQty: item.totalQty,
                                            orderNos: item.orderNos,
                                            colKey: key,
                                          });
                                        }
                                        return next;
                                      });
                                    }}
                                    title={isSelected ? `Bỏ chọn SKU ${item.sku}` : `Chọn SKU ${item.sku} để tạo List`}
                                    className="p-0.5 rounded-md hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                                    ) : (
                                      <Square className="w-4 h-4 text-gray-300 hover:text-indigo-600" />
                                    )}
                                  </button>
                                )}

                                <div
                                  onClick={() => handleToggleExpandSku(itemKey)}
                                  className="flex items-center gap-1.5 truncate cursor-pointer flex-1"
                                  title={`Click để ${isExpanded ? 'thu gọn' : 'xem'} ${item.orderCount} mã đơn`}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
                                  )}
                                  <div className="truncate">
                                    <div className="flex items-center gap-1 truncate">
                                      <SkuHoverImage
                                        sku={item.sku}
                                        productTitle={(item.orders?.[0]?.items?.[0] as any)?.productTitle}
                                      >
                                        <span className="font-mono font-bold text-xs text-gray-900 truncate hover:text-blue-600 transition-colors">
                                          {item.sku}
                                        </span>
                                      </SkuHoverImage>
                                    </div>
                                    <span className="text-[10px] text-gray-500 block">
                                      {item.percentage}% ({item.totalQty} PCS)
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                                      is20Plus
                                        ? 'bg-emerald-600 text-white'
                                        : is10_19
                                        ? 'bg-amber-400 text-indigo-950'
                                        : is5_9
                                        ? 'bg-sky-500 text-white font-bold'
                                        : isTop1
                                        ? 'bg-amber-300 text-indigo-950'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {item.orderCount} đơn
                                  </span>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopySkuInColumn(itemKey, item.orderNos);
                                    }}
                                    title={`Sao chép ${item.orderCount} Order No của SKU ${item.sku}`}
                                    className="p-1 rounded-md hover:bg-indigo-50 border border-transparent hover:border-indigo-200 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                  >
                                    {copiedKey === itemKey ? (
                                      <Check className="w-3 h-3 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>

                                  {isSubmittedStatus && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenCreateWmsModal(item.orderNos, `SKU ${item.sku} (${item.orderCount} đơn)`);
                                      }}
                                      title={`⚡ Tạo Picking List WMS cho ${item.orderCount} đơn của ${item.sku}`}
                                      className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 hover:text-amber-900 border border-amber-300 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                    >
                                      <Zap className="w-3 h-3 fill-current text-amber-500" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Expanded Order Numbers List for this SKU */}
                              {isExpanded && (
                                <div className="bg-gray-50/90 border-t border-gray-100 p-2 space-y-1 font-mono text-[11px]">
                                  <div className="text-[10px] text-gray-400 pb-1 font-sans flex items-center justify-between">
                                    <span>Danh sách Order No ({item.orderCount}):</span>
                                    <button
                                      onClick={() => handleCopySkuInColumn(itemKey, item.orderNos)}
                                      className="text-indigo-600 hover:underline font-bold text-[9px]"
                                    >
                                      {copiedKey === itemKey ? '✓ Đã chép' : 'Chép tất cả'}
                                    </button>
                                  </div>
                                  {item.orderNos.map((orderNo, oIdx) => (
                                    <div
                                      key={oIdx}
                                      onClick={() => onCopySingleOrder(orderNo)}
                                      className="text-gray-700 hover:text-indigo-600 hover:bg-white p-1 rounded transition-colors cursor-pointer flex items-center justify-between group"
                                    >
                                      <span className="truncate">{orderNo}</span>
                                      {copiedKey === `ord_${orderNo}` ? (
                                        <span className="text-[9px] text-emerald-600 font-sans font-bold">✓</span>
                                      ) : (
                                        <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      <button
                        onClick={() => handleOpenInspectColumn(key)}
                        className="w-full py-1.5 px-2 bg-white hover:bg-indigo-50 border border-dashed border-gray-200 hover:border-indigo-200 rounded-xl text-[11px] font-semibold text-indigo-700 text-center transition-colors cursor-pointer flex items-center justify-center gap-1 mt-2"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>Mở Bảng Phân Tách SKU</span>
                      </button>
                    </div>
                  ) : columnViewMode === 'ref_prefix' ? (
                    <div className="p-2.5 space-y-1 max-h-[500px] overflow-y-auto font-mono">
                      {ordersList.map((orderNo, idx) => {
                        const refNo = getOrderRefNo(orderNo);
                        const displayText = `RefNo.：${refNo}`;

                        return (
                          <div
                            key={idx}
                            onClick={() => onCopySingleOrder(displayText)}
                            className="text-[11px] p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between group text-purple-900 bg-purple-50/40 hover:bg-white border-transparent hover:border-purple-200"
                            title={`Click để sao chép: ${displayText}`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Hash className="w-3 h-3 text-purple-600 shrink-0" />
                              <span className="truncate">{displayText}</span>
                            </div>
                            {copiedKey === displayText ? (
                              <span className="text-[9px] text-emerald-600 font-bold font-sans shrink-0">✓ Đã chép</span>
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : columnViewMode === 'tracking_no' || columnViewMode === 'tracking_prefix' ? (
                    <div className="p-2.5 space-y-1 max-h-[500px] overflow-y-auto font-mono">
                      {ordersList.map((orderNo, idx) => {
                        const order = orderMap.get(orderNo);
                        const trackingNo = order?.trackingNo?.trim() || '';
                        const isPrefix = columnViewMode === 'tracking_prefix';
                        const displayText = trackingNo
                          ? (isPrefix ? `Tracking No. ：${trackingNo}` : trackingNo)
                          : (isPrefix ? `Tracking No. ：(Chưa có mã)` : '(Chưa có mã VĐ)');
                        const copyText = trackingNo
                          ? (isPrefix ? `Tracking No. ：${trackingNo}` : trackingNo)
                          : (isPrefix ? `Tracking No. ：${orderNo}` : orderNo);

                        return (
                          <div
                            key={idx}
                            onClick={() => onCopySingleOrder(copyText)}
                            className={`text-[11px] p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between group ${
                              trackingNo
                                ? isPrefix
                                  ? 'text-blue-900 bg-blue-50/40 hover:bg-white border-transparent hover:border-blue-200'
                                  : 'text-gray-800 hover:text-indigo-600 hover:bg-white border-transparent hover:border-gray-200'
                                : 'text-gray-400 italic bg-gray-50/50 border-gray-100'
                            }`}
                            title={
                              trackingNo
                                ? `Click để sao chép: ${copyText}`
                                : `Đơn ${orderNo} chưa có Tracking No`
                            }
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {isPrefix ? (
                                <FileText className="w-3 h-3 text-blue-500 shrink-0" />
                              ) : (
                                <Truck className="w-3 h-3 text-indigo-400 shrink-0" />
                              )}
                              <span className="truncate">{displayText}</span>
                            </div>
                            {copiedKey === copyText ? (
                              <span className="text-[9px] text-emerald-600 font-bold font-sans shrink-0">✓ Đã chép</span>
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100 shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-2.5 space-y-1 max-h-[500px] overflow-y-auto font-mono">
                      {ordersList.map((orderNo, idx) => (
                        <div
                          key={idx}
                          onClick={() => onCopySingleOrder(orderNo)}
                          className="text-[11px] text-gray-700 hover:text-indigo-600 hover:bg-white p-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <span>{orderNo}</span>
                          {copiedKey === orderNo ? (
                            <span className="text-[9px] text-emerald-600 font-bold font-sans">✓</span>
                          ) : (
                            <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
