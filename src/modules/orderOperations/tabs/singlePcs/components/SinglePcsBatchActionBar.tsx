import React from 'react';
import { Check, Copy, Download, CheckCircle2 } from 'lucide-react';
import { SelectedSkuStats } from '../types';

interface SinglePcsBatchActionBarProps {
  selectedStats: SelectedSkuStats;
  copiedKey: string | null;
  handleCopySelectedOrders: () => void;
  handleExportSelectedExcel: () => void;
  handleMarkSelectedCompleted: () => void;
}

export const SinglePcsBatchActionBar: React.FC<SinglePcsBatchActionBarProps> = ({
  selectedStats,
  copiedKey,
  handleCopySelectedOrders,
  handleExportSelectedExcel,
  handleMarkSelectedCompleted,
}) => {
  if (selectedStats.skuCount === 0) return null;

  return (
    <div className="bg-indigo-900 text-white rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-3 text-sm">
        <div className="w-9 h-9 bg-indigo-800 rounded-xl flex items-center justify-center text-amber-300 font-bold border border-indigo-700">
          {selectedStats.skuCount}
        </div>
        <div>
          <p className="font-bold flex items-center gap-2">
            <span>Đã chọn {selectedStats.skuCount} mã SKU</span>
            <span className="px-2 py-0.5 bg-amber-400 text-indigo-950 rounded-full text-xs font-extrabold">
              {selectedStats.totalSelectedOrders} ĐƠN HÀNG
            </span>
          </p>
          <p className="text-xs text-indigo-200">
            Sẵn sàng xuất hàng hoặc sao chép mã đơn để dán vào máy in bill / hệ thống kho
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={handleCopySelectedOrders}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-indigo-950 font-bold rounded-xl text-xs shadow-sm transition-colors cursor-pointer"
        >
          {copiedKey === 'batch_selected' ? (
            <>
              <Check className="w-4 h-4 text-emerald-800" />
              <span>Đã chép {selectedStats.totalSelectedOrders} mã đơn!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Sao Chép {selectedStats.totalSelectedOrders} Order No</span>
            </>
          )}
        </button>

        <button
          onClick={handleExportSelectedExcel}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-medium rounded-xl text-xs border border-indigo-600 transition-colors cursor-pointer"
          title="Xuất file Excel danh sách các SKU đã chọn"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Xuất Excel Đợt Này</span>
        </button>

        <button
          onClick={handleMarkSelectedCompleted}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer"
          title="Đánh dấu các SKU này là Đã Đóng Gói"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Xong Đợt Này ✓</span>
        </button>
      </div>
    </div>
  );
};
