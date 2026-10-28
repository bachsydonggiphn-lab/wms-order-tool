import React from 'react';
import { CheckSquare, Check, Copy, Zap } from 'lucide-react';

interface SkuBatchWmsFloatingBarProps {
  isSubmittedStatus: boolean;
  selectedStats: {
    count: number;
    skuCount: number;
    orderCount: number;
    totalPcs: number;
    allOrderNos: string[];
  };
  onClearSelection: () => void;
  onCopyAllOrderNos: () => void;
  copiedKey: string | null;
  handleOpenCreateWmsModal: (orderCodes: string[], batchTitle: string) => void;
}

export const SkuBatchWmsFloatingBar: React.FC<SkuBatchWmsFloatingBarProps> = ({
  isSubmittedStatus,
  selectedStats,
  onClearSelection,
  onCopyAllOrderNos,
  copiedKey,
  handleOpenCreateWmsModal,
}) => {
  if (!isSubmittedStatus || selectedStats.orderCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[94%] bg-slate-900/95 text-white backdrop-blur-md px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center shrink-0">
          <CheckSquare className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white">
              Đã chọn: <span className="text-amber-400 font-extrabold">{selectedStats.skuCount} SKU</span>
            </span>
            <span className="text-xs text-slate-300">
              ({selectedStats.orderCount} đơn • {selectedStats.totalPcs} PCS)
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Các SKU đã được chọn trên các cột PCS để gom tạo Picking List
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onClearSelection}
          className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
        >
          Bỏ chọn tất cả
        </button>

        <button
          onClick={onCopyAllOrderNos}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-semibold text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          {copiedKey === 'floating_batch_copy' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300 font-bold">Đã chép {selectedStats.orderCount} đơn</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-300" />
              <span>Sao chép {selectedStats.orderCount} mã đơn</span>
            </>
          )}
        </button>

        <button
          onClick={() =>
            handleOpenCreateWmsModal(
              selectedStats.allOrderNos,
              `${selectedStats.skuCount} SKU đã chọn (${selectedStats.orderCount} đơn)`
            )
          }
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95"
        >
          <Zap className="w-4 h-4 fill-current text-white" />
          <span>⚡ Tạo List WMS ({selectedStats.orderCount} đơn)</span>
        </button>
      </div>
    </div>
  );
};
