import React, { useState } from 'react';
import { Package, Copy, Check, Printer, Eye, RefreshCw } from 'lucide-react';
import { BatchSearchResultsData } from '../types';
import { OrderAttachmentInfo } from '../../../services/wmsService';

interface SkuPickingSummaryCardProps {
  searchResults: BatchSearchResultsData;
  selectedSkus: Set<string>;
  ordersOfSelectedSkus: OrderAttachmentInfo[];
  totalPcsOfSelectedSkus: number;
  isMergingPdf: boolean;
  onToggleSelectSku: (sku: string) => void;
  onSelectAllSkus: () => void;
  onDeselectAllSkus: () => void;
  onCopySkuTable: () => void;
  onPrintPickingSlip: () => void;
  onPrintOrders: (orders: OrderAttachmentInfo[], title: string) => void;
  onPreviewOrders: (orders: OrderAttachmentInfo[], title: string) => void;
  copiedSkuTable: boolean;
}

export const SkuPickingSummaryCard: React.FC<SkuPickingSummaryCardProps> = ({
  searchResults,
  selectedSkus,
  ordersOfSelectedSkus,
  totalPcsOfSelectedSkus,
  isMergingPdf,
  onToggleSelectSku,
  onSelectAllSkus,
  onDeselectAllSkus,
  onCopySkuTable,
  onPrintPickingSlip,
  onPrintOrders,
  onPreviewOrders,
  copiedSkuTable,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Card */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <span>BẢNG TỔNG HỢP SKU LẤY HÀNG ĐÓNG ĐƠN ({searchResults.skuSummary.length} SKU - {searchResults.totalPcs} PCS)</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Hệ thống tổng hợp bao nhiêu SKU vào bao nhiêu đơn hàng cho mỗi SKU. Bạn có thể <b>chọn và in nhãn theo từng SKU</b> hoặc in toàn bộ!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onCopySkuTable}
            title="Sao chép dạng bảng: SKU [Tab] SỐ LƯỢNG để dán trực tiếp vào Excel hoặc Sheet"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            {copiedSkuTable ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Đã Sao Chép Bảng!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
                <span>Sao Chép Bảng (Excel)</span>
              </>
            )}
          </button>

          <button
            onClick={onPrintPickingSlip}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Phiếu Nhặt Hàng</span>
          </button>
        </div>
      </div>

      {/* THANH TÁC VỤ IN THEO NHÓM SKU ĐƯỢC CHỌN */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 select-none">
            <input
              type="checkbox"
              checked={selectedSkus.size === searchResults.skuSummary.length && searchResults.skuSummary.length > 0}
              onChange={(e) => {
                if (e.target.checked) onSelectAllSkus();
                else onDeselectAllSkus();
              }}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
            />
            <span>Chọn tất cả ({searchResults.skuSummary.length} SKU)</span>
          </label>

          <div className="text-xs font-medium text-slate-600">
            Đã chọn: <b className="text-emerald-700">{selectedSkus.size}</b> / {searchResults.skuSummary.length} SKU
            <span className="mx-1.5 text-slate-300">•</span>
            Chứa: <b className="text-indigo-700">{ordersOfSelectedSkus.length}</b> đơn hàng
            <span className="mx-1.5 text-slate-300">•</span>
            Tổng: <b className="text-amber-700">{totalPcsOfSelectedSkus}</b> PCS
          </div>
        </div>

        {/* Nút In các SKU đã chọn */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPreviewOrders(ordersOfSelectedSkus, `Xem Trước ${selectedSkus.size} SKU Đã Chọn`)}
            disabled={isMergingPdf || ordersOfSelectedSkus.length === 0}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Xem Trước ({ordersOfSelectedSkus.length} đơn)</span>
          </button>

          <button
            onClick={() => onPrintOrders(ordersOfSelectedSkus, `In ${selectedSkus.size} SKU Đã Chọn`)}
            disabled={isMergingPdf || ordersOfSelectedSkus.length === 0}
            className="px-4 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-200 disabled:opacity-50"
          >
            {isMergingPdf ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Đang Xử Lý In...</span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5" />
                <span>IN CÁC SKU ĐÃ CHỌN ({ordersOfSelectedSkus.length} ĐƠN)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bảng SKU Chi Tiết */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/90 sticky top-0 z-10 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-center w-10">CHỌN</th>
              <th className="py-2.5 px-3 text-center w-12">STT</th>
              <th className="py-2.5 px-3">MÃ SKU</th>
              <th className="py-2.5 px-3">NHÓM HÀNG</th>
              <th className="py-2.5 px-3 text-center font-black text-indigo-900 bg-indigo-50/60">SỐ LƯỢNG (PCS)</th>
              <th className="py-2.5 px-3 text-center">SỐ ĐƠN HÀNG</th>
              <th className="py-2.5 px-3">CÁC ĐƠN HÀNG CHỨA SKU</th>
              <th className="py-2.5 px-3 text-center">THAO TÁC IN RIÊNG SKU</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {searchResults.skuSummary.map((item, idx) => {
              const isChecked = selectedSkus.has(item.sku);
              // Lọc đơn hàng chứa SKU này
              const ordersOfThisSku = searchResults.orders.filter((o) => item.orderNos.includes(o.orderNo));
              const withPdfCount = ordersOfThisSku.filter((o) => o.hasAttachment).length;

              return (
                <tr
                  key={item.sku}
                  className={`transition-colors ${
                    isChecked ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleSelectSku(item.sku)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    />
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                  <td className="py-2 px-3 font-mono font-bold text-slate-900 text-xs">
                    {item.sku}
                  </td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.group || 'Khác'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center font-mono font-black text-sm text-indigo-700 bg-indigo-50/40">
                    {item.totalQty}
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-slate-900">
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-800">
                      {item.orderCount} đơn
                    </span>
                  </td>
                  <td className="py-2 px-3 font-mono text-[11px] text-slate-500 max-w-xs truncate" title={item.orderNos.join(', ')}>
                    {item.orderNos.slice(0, 3).join(', ')}
                    {item.orderNos.length > 3 ? ` (+${item.orderNos.length - 3})` : ''}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Nút Xem Trước của riêng SKU này */}
                      <button
                        onClick={() => onPreviewOrders(ordersOfThisSku, `Xem Trước Nhãn SKU ${item.sku}`)}
                        title={`Xem trước nhãn của ${ordersOfThisSku.length} đơn có SKU ${item.sku}`}
                        disabled={isMergingPdf || withPdfCount === 0}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-all cursor-pointer disabled:opacity-40 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Nút In Nhãn Riêng của SKU này */}
                      <button
                        onClick={() => onPrintOrders(ordersOfThisSku, `In Đơn SKU ${item.sku}`)}
                        title={`In ${withPdfCount}/${ordersOfThisSku.length} nhãn PDF của SKU ${item.sku}`}
                        disabled={isMergingPdf || withPdfCount === 0}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 shadow-2xs"
                      >
                        <Printer className="w-3 h-3" />
                        <span>In SKU Này ({withPdfCount})</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
