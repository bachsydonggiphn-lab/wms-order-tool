import React from 'react';
import { Printer, Download, Eye, RefreshCw, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';
import { BatchSearchResultsData } from '../types';
import { OrderAttachmentInfo } from '../../../services/wmsService';

interface OrdersAttachmentListCardProps {
  searchResults: BatchSearchResultsData;
  ordersOfSelectedSkus: OrderAttachmentInfo[];
  selectedSkus: Set<string>;
  orderTableFilter: 'ALL' | 'SELECTED_SKUS';
  setOrderTableFilter: (filter: 'ALL' | 'SELECTED_SKUS') => void;
  drawPackingOverlay: boolean;
  setDrawPackingOverlay: (val: boolean) => void;
  isMergingPdf: boolean;
  mergeError: string | null;
  onPreviewOrders: (orders: OrderAttachmentInfo[], title: string) => void;
  onDownloadOrdersPdf: (orders: OrderAttachmentInfo[], prefix: string) => void;
  onPrintOrders: (orders: OrderAttachmentInfo[], title: string) => void;
}

export const OrdersAttachmentListCard: React.FC<OrdersAttachmentListCardProps> = ({
  searchResults,
  ordersOfSelectedSkus,
  selectedSkus,
  orderTableFilter,
  setOrderTableFilter,
  drawPackingOverlay,
  setDrawPackingOverlay,
  isMergingPdf,
  mergeError,
  onPreviewOrders,
  onDownloadOrdersPdf,
  onPrintOrders,
}) => {
  const displayedOrders = orderTableFilter === 'SELECTED_SKUS' ? ordersOfSelectedSkus : searchResults.orders;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Card với 3 Nút Hành Động Lớn */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>DANH SÁCH ĐƠN HÀNG & FILE PDF NHÃN ({searchResults.totalFound} ĐƠN)</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Tất cả các file PDF nhãn từ YunWMS được tự động gộp liên tục thành 1 tài liệu duy nhất.
          </p>
        </div>

        {/* 3 Nút Hành Động Lớn */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onPreviewOrders(searchResults.orders, 'Xem Trước Toàn Bộ Nhãn PDF')}
            disabled={isMergingPdf || searchResults.totalWithPdf === 0}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Xem Trước Tất Cả</span>
          </button>

          <button
            onClick={() => onDownloadOrdersPdf(searchResults.orders, 'Tong_Hop_In_Nhan')}
            disabled={isMergingPdf || searchResults.totalWithPdf === 0}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>Tải File Gộp ({searchResults.totalWithPdf} đơn)</span>
          </button>

          <button
            onClick={() => onPrintOrders(searchResults.orders, 'In Toàn Bộ Đơn Hàng')}
            disabled={isMergingPdf || searchResults.totalWithPdf === 0}
            className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-200 disabled:opacity-50"
          >
            {isMergingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang Gộp PDF...</span>
              </>
            ) : (
              <>
                <Printer className="w-4 h-4" />
                <span>IN TOÀN BỘ ({searchResults.totalWithPdf} ĐƠN)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bộ lọc bảng đơn: Tất cả vs Chỉ đơn của SKU đã chọn & Tuỳ chọn Packing Overlay */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-700">Xem danh sách:</span>

          <button
            onClick={() => setOrderTableFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orderTableFilter === 'ALL'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Tất Cả ({searchResults.orders.length} đơn)
          </button>

          <button
            onClick={() => setOrderTableFilter('SELECTED_SKUS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              orderTableFilter === 'SELECTED_SKUS'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Chỉ SKU Đã Chọn ({ordersOfSelectedSkus.length} đơn)
          </button>
        </div>

        {/* Thanh tuỳ chọn In Kèm Overlay Đóng Gói */}
        <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-indigo-950 select-none">
          <input
            type="checkbox"
            checked={drawPackingOverlay}
            onChange={(e) => setDrawPackingOverlay(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
          />
          <span className="flex items-center gap-1.5">
            <span>Vẽ thêm bảng SKU cần đóng gói (Packing Overlay)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-200 text-indigo-800">
              Khuyên Dùng
            </span>
          </span>
        </label>
      </div>

      {mergeError && (
        <div className="m-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{mergeError}</span>
        </div>
      )}

      {/* Bảng Danh Sách Đơn Hàng */}
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/90 sticky top-0 z-10 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-center w-12">STT</th>
              <th className="py-2.5 px-3">MÃ ĐƠN (ORDER NO)</th>
              <th className="py-2.5 px-3">MÃ VẬN ĐƠN / REF NO</th>
              <th className="py-2.5 px-3 text-center">TRẠNG THÁI</th>
              <th className="py-2.5 px-3">CHI TIẾT SẢN PHẨM & SKU</th>
              <th className="py-2.5 px-3 text-center">FILE PDF NHÃN</th>
              <th className="py-2.5 px-3 text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
            {displayedOrders.map((o, idx) => (
              <tr key={o.orderNo || idx} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2.5 px-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                  {o.orderNo || '-'}
                </td>
                <td className="py-2.5 px-3 font-mono text-[11px]">
                  <div className="font-bold text-indigo-700">{o.trackingNo || '-'}</div>
                  {o.refNo && <div className="text-slate-400 text-[10px]">{o.refNo}</div>}
                </td>
                <td className="py-2.5 px-3 text-center">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      o.statusCode === '8'
                        ? 'bg-emerald-100 text-emerald-800'
                        : o.statusCode === '5'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  {o.items && o.items.length > 0 ? (
                    <div className="space-y-1">
                      {o.items.map((it, i) => (
                        <div key={i} className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className={`font-bold ${selectedSkus.has(it.sku) ? 'text-emerald-700 underline' : 'text-slate-800'}`}>
                            {it.sku}
                          </span>
                          <span className="text-slate-400">×</span>
                          <span className="font-black text-indigo-700">{it.qty}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Không có chi tiết</span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {o.hasAttachment ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Đã Sẵn Sàng</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      <span>{o.error || 'Thiếu PDF'}</span>
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-center">
                  {o.hasAttachment && (
                    <button
                      onClick={() => onPrintOrders([o], `In Đơn ${o.orderNo}`)}
                      title="In nhãn riêng cho đơn này"
                      className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
