import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { BatchSearchResultsData } from '../types';

interface BatchPrintDashboardCardsProps {
  searchResults: BatchSearchResultsData;
}

export const BatchPrintDashboardCards: React.FC<BatchPrintDashboardCardsProps> = ({
  searchResults,
}) => {
  const [copiedMissing, setCopiedMissing] = useState<boolean>(false);

  return (
    <div className="space-y-4">
      {/* 4 Thẻ Thống Kê Nhanh */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
            {searchResults.currentPickingList ? `Picking List: ${searchResults.currentPickingList}` : 'Đơn Tìm Thấy'}
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {searchResults.totalFound} <span className="text-xs font-normal text-slate-500">đơn hàng</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide block">Đã Có File PDF Nhãn</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {searchResults.totalWithPdf}
            <span className="text-xs font-semibold text-emerald-600 ml-1.5">
              ({Math.round((searchResults.totalWithPdf / (searchResults.totalFound || 1)) * 100)}%)
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-200 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide block">Số Mã SKU Cần Nhặt</span>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {searchResults.skuSummary.length} <span className="text-xs font-normal text-slate-500">loại SKU</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide block">Tổng Số Lượng (PCS)</span>
          <div className="text-2xl font-black text-amber-700 mt-1">
            {searchResults.totalPcs} <span className="text-xs font-normal text-slate-500">sản phẩm</span>
          </div>
        </div>
      </div>

      {/* Cảnh báo mã đơn không tìm thấy (nếu có) */}
      {searchResults.missingCodes.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Không tìm thấy {searchResults.missingCodes.length} mã đơn trên WMS:</span>
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(searchResults.missingCodes.join('\n'));
                setCopiedMissing(true);
                setTimeout(() => setCopiedMissing(false), 2000);
              }}
              className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-200/80 hover:bg-amber-200 text-amber-900 cursor-pointer"
            >
              {copiedMissing ? '✓ Đã sao chép' : 'Sao chép mã thiếu'}
            </button>
          </div>
          <div className="font-mono text-[11px] text-amber-800 break-all bg-white/60 p-2 rounded-lg border border-amber-200/60 max-h-20 overflow-y-auto">
            {searchResults.missingCodes.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};
