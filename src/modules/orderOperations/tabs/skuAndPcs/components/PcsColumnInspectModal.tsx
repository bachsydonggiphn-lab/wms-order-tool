import React from 'react';
import {
  Flame,
  X,
  Search,
  Download,
  CheckSquare,
  Square,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { ColumnSkuItem } from '../types';

interface PcsColumnInspectModalProps {
  inspectColumnKey: string | null;
  onClose: () => void;
  inspectColumnTitle: string;
  activeModalTotalOrders: number;
  activeModalBreakdown: ColumnSkuItem[];
  modalSearch: string;
  setModalSearch: (val: string) => void;
  filteredModalSkus: ColumnSkuItem[];
  modalSelectedSkus: Set<string>;
  setModalSelectedSkus: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleExportModalExcel: () => void;
  modalSelectedStats: {
    items: ColumnSkuItem[];
    totalOrders: number;
    allOrderNos: string[];
    skuCount: number;
  };
  handleCopyModalSelectedOrders: () => void;
  copiedKey: string | null;
  handleCopySkuInColumn: (keyIdentifier: string, orderNos: string[]) => void;
  onCopySingleOrder: (orderNo: string) => void;
  handleCopyColumn: (title: string, list: string[]) => void;
  pcsGroups: Record<string, string[]>;
  isSubmittedStatus: boolean;
  handleOpenCreateWmsModal: (orderCodes: string[], batchTitle: string) => void;
}

export const PcsColumnInspectModal: React.FC<PcsColumnInspectModalProps> = ({
  inspectColumnKey,
  onClose,
  inspectColumnTitle,
  activeModalTotalOrders,
  activeModalBreakdown,
  modalSearch,
  setModalSearch,
  filteredModalSkus,
  modalSelectedSkus,
  setModalSelectedSkus,
  handleExportModalExcel,
  modalSelectedStats,
  handleCopyModalSelectedOrders,
  copiedKey,
  handleCopySkuInColumn,
  onCopySingleOrder,
  handleCopyColumn,
  pcsGroups,
  isSubmittedStatus,
  handleOpenCreateWmsModal,
}) => {
  if (!inspectColumnKey) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-bold">
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>Phân Tách SKU Của Cột: {inspectColumnTitle}</span>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold">
                  {activeModalTotalOrders} đơn ({activeModalBreakdown.length} mã SKU)
                </span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Sắp xếp theo thứ tự số lượng đơn từ <strong>Cao ➔ Thấp</strong>. Chọn các mã cần đóng hoặc sao chép mã đơn từng SKU.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm mã SKU, Order No..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Quick preset buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Chọn nhanh:</span>
            
            {/* Preset < 5 đơn */}
            {filteredModalSkus.filter((it) => it.orderCount < 5).length > 0 && (
              <button
                onClick={() => {
                  const skusLt5 = filteredModalSkus.filter((it) => it.orderCount < 5).map((it) => it.sku);
                  setModalSelectedSkus(new Set(skusLt5));
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>&lt; 5 đơn</span>
                <span className="text-[10px] bg-slate-300 text-slate-800 px-1 rounded-full font-bold">
                  {filteredModalSkus.filter((it) => it.orderCount < 5).length} SKU
                </span>
              </button>
            )}

            {/* Preset 5 - 9 đơn */}
            {filteredModalSkus.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).length > 0 && (
              <button
                onClick={() => {
                  const skus5_9 = filteredModalSkus.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).map((it) => it.sku);
                  setModalSelectedSkus(new Set(skus5_9));
                }}
                className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>5 - 9 đơn</span>
                <span className="text-[10px] bg-sky-200 text-sky-900 px-1 rounded-full">
                  {filteredModalSkus.filter((it) => it.orderCount >= 5 && it.orderCount <= 9).length} SKU
                </span>
              </button>
            )}

            {/* Preset 10 - 19 đơn */}
            {filteredModalSkus.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).length > 0 && (
              <button
                onClick={() => {
                  const skus10_19 = filteredModalSkus.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).map((it) => it.sku);
                  setModalSelectedSkus(new Set(skus10_19));
                }}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>10 - 19 đơn</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1 rounded-full">
                  {filteredModalSkus.filter((it) => it.orderCount >= 10 && it.orderCount <= 19).length} SKU
                </span>
              </button>
            )}

            {/* Preset >= 20 đơn */}
            {filteredModalSkus.filter((it) => it.orderCount >= 20).length > 0 && (
              <button
                onClick={() => {
                  const skus20 = filteredModalSkus.filter((it) => it.orderCount >= 20).map((it) => it.sku);
                  setModalSelectedSkus(new Set(skus20));
                }}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>≥ 20 đơn</span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded-full">
                  {filteredModalSkus.filter((it) => it.orderCount >= 20).length} SKU
                </span>
              </button>
            )}

            {/* Preset >= 5 đơn (Tổng hợp) */}
            {filteredModalSkus.filter((it) => it.orderCount >= 5).length > 0 && (
              <button
                onClick={() => {
                  const skusGe5 = filteredModalSkus.filter((it) => it.orderCount >= 5).map((it) => it.sku);
                  setModalSelectedSkus(new Set(skusGe5));
                }}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>≥ 5 đơn (Tổng)</span>
                <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1 rounded-full">
                  {filteredModalSkus.filter((it) => it.orderCount >= 5).length} SKU
                </span>
              </button>
            )}

            <button
              onClick={() => {
                const top3 = filteredModalSkus.slice(0, 3).map((it) => it.sku);
                setModalSelectedSkus(new Set(top3));
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Top 3
            </button>

            <button
              onClick={() => {
                const top5 = filteredModalSkus.slice(0, 5).map((it) => it.sku);
                setModalSelectedSkus(new Set(top5));
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Top 5
            </button>

            <button
              onClick={() => {
                const top10 = filteredModalSkus.slice(0, 10).map((it) => it.sku);
                setModalSelectedSkus(new Set(top10));
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-800 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Top 10
            </button>

            <button
              onClick={() => {
                if (modalSelectedSkus.size === filteredModalSkus.length && filteredModalSkus.length > 0) {
                  setModalSelectedSkus(new Set());
                } else {
                  setModalSelectedSkus(new Set(filteredModalSkus.map((it) => it.sku)));
                }
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors cursor-pointer"
            >
              {modalSelectedSkus.size === filteredModalSkus.length && filteredModalSkus.length > 0
                ? 'Bỏ chọn'
                : 'Tất cả'}
            </button>

            <button
              onClick={handleExportModalExcel}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ml-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
          </div>
        </div>

        {/* Batch Action Bar if SKUs are selected */}
        {modalSelectedStats.skuCount > 0 && (
          <div className="bg-indigo-900 text-white px-5 py-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-400 text-indigo-950 font-bold rounded-full text-[11px]">
                {modalSelectedStats.skuCount} SKU
              </span>
              <span className="font-semibold">
                = {modalSelectedStats.totalOrders} đơn hàng được chọn
              </span>
            </div>

            <button
              onClick={handleCopyModalSelectedOrders}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              {copiedKey === 'modal_batch_copy' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Đã sao chép {modalSelectedStats.totalOrders} mã đơn!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao Chép {modalSelectedStats.totalOrders} Mã Đơn Đã Chọn</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Modal Body: SKU List */}
        <div className="p-5 overflow-y-auto max-h-[60vh] space-y-3">
          {filteredModalSkus.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              Không tìm thấy mã SKU nào phù hợp với từ khóa.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredModalSkus.map((item, idx) => {
                const isSelected = modalSelectedSkus.has(item.sku);
                const isTop1 = idx === 0;
                const isTop2 = idx === 1;
                const isTop3 = idx === 2;

                return (
                  <div
                    key={item.sku}
                    className={`rounded-2xl border transition-all flex flex-col justify-between p-3.5 ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-400 shadow-xs ring-1 ring-indigo-500/20'
                        : isTop1
                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* SKU Top info */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 truncate">
                          <button
                            onClick={() => {
                              setModalSelectedSkus((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.sku)) next.delete(item.sku);
                                else next.add(item.sku);
                                return next;
                              });
                            }}
                            className="mt-0.5 text-gray-400 hover:text-indigo-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="truncate">
                            <div className="flex items-center gap-1.5">
                              {isTop1 ? (
                                <span className="px-1.5 py-0.2 bg-amber-400 text-indigo-950 rounded text-[10px] font-black">
                                  #1 TOP
                                </span>
                              ) : isTop2 ? (
                                <span className="px-1.5 py-0.2 bg-slate-300 text-gray-800 rounded text-[10px] font-bold">
                                  #2
                                </span>
                              ) : isTop3 ? (
                                <span className="px-1.5 py-0.2 bg-amber-700/20 text-amber-900 rounded text-[10px] font-bold">
                                  #3
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-gray-400">
                                  #{idx + 1}
                                </span>
                              )}
                              <h4 className="font-mono font-bold text-xs text-gray-900 truncate" title={item.sku}>
                                {item.sku}
                              </h4>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Chiếm {item.percentage}% ({item.totalQty} PCS)
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 bg-gray-100 text-gray-900 font-bold rounded-lg text-xs shrink-0">
                          {item.orderCount} đơn
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-2.5">
                        <div
                          className={`h-full rounded-full ${isTop1 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                          style={{ width: `${Math.min(100, Math.max(8, item.percentage * 2.5))}%` }}
                        />
                      </div>

                      {/* Preview Order Nos */}
                      <div className="mt-2.5 max-h-24 overflow-y-auto space-y-1 font-mono text-[10px] bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                        {item.orderNos.map((no, nIdx) => (
                          <div
                            key={nIdx}
                            onClick={() => onCopySingleOrder(no)}
                            className="text-gray-600 hover:text-indigo-600 hover:bg-white p-0.5 rounded cursor-pointer flex items-center justify-between"
                          >
                            <span>{no}</span>
                            {copiedKey === `modal_ord_${no}` ? (
                              <span className="text-emerald-600 font-sans font-bold">✓</span>
                            ) : (
                              <Copy className="w-2 h-2 text-gray-400" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Copy button for this SKU */}
                    <button
                      onClick={() => handleCopySkuInColumn(`modal_sku_${item.sku}`, item.orderNos)}
                      className="mt-3 w-full py-1.5 px-3 bg-white hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl text-xs font-semibold text-gray-800 hover:text-indigo-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      {copiedKey === `modal_sku_${item.sku}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Đã chép {item.orderCount} mã đơn</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Sao chép {item.orderCount} Order No</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                handleCopyColumn(inspectColumnTitle, pcsGroups[inspectColumnKey] || []);
              }}
              className="px-3.5 py-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-700 font-medium cursor-pointer transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {copiedKey === inspectColumnTitle ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Sao chép tất cả {activeModalTotalOrders} mã đơn</span>
            </button>

            {isSubmittedStatus && (
              <button
                onClick={() => {
                  const ordersToSubmit = pcsGroups[inspectColumnKey] || [];
                  handleOpenCreateWmsModal(ordersToSubmit, `Cột ${inspectColumnTitle} (${ordersToSubmit.length} đơn)`);
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <Zap className="w-3.5 h-3.5 fill-current text-white" />
                <span>⚡ Tạo List WMS Cột Này ({activeModalTotalOrders} đơn)</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-xl cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
