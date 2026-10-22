import { Printer, Download, Eye, RefreshCw, Filter, AlertCircle, CheckCircle2, Send, Zap } from 'lucide-react';
import { BatchSearchResultsData } from '../types';
import { OrderAttachmentInfo } from '../../../services/wmsService';
import { OrdersAttachmentTable } from './OrdersAttachmentTable';

interface OrdersAttachmentListCardProps {
  searchResults: BatchSearchResultsData;
  ordersOfSelectedSkus: OrderAttachmentInfo[];
  selectedSkus: Set<string>;
  orderTableFilter: 'ALL' | 'SELECTED_SKUS';
  setOrderTableFilter: (filter: 'ALL' | 'SELECTED_SKUS') => void;
  drawPackingOverlay: boolean;
  setDrawPackingOverlay: (val: boolean) => void;
  drawPageNumbers?: boolean;
  setDrawPageNumbers?: (val: boolean) => void;
  pageNumberMode?: 'CONTINUOUS' | 'PER_SKU';
  setPageNumberMode?: (mode: 'CONTINUOUS' | 'PER_SKU') => void;
  separateBlankPages?: boolean;
  setSeparateBlankPages?: (val: boolean) => void;
  isMergingPdf: boolean;
  mergeError: string | null;
  onPreviewOrders: (orders: OrderAttachmentInfo[], title: string) => void;
  onDownloadOrdersPdf: (orders: OrderAttachmentInfo[], prefix: string) => void;
  onPrintOrders: (orders: OrderAttachmentInfo[], title: string) => void;
  autoShipOnPrint?: boolean;
  setAutoShipOnPrint?: (val: boolean) => void;
  isShipping?: boolean;
  lastShipResult?: {
    success: boolean;
    message: string;
    shippedCount?: number;
    failedCount?: number;
    timestamp?: number;
  } | null;
  onTriggerBatchShip?: (orders: OrderAttachmentInfo[]) => void;
  shippedOrdersSet?: Set<string>;
}

export const OrdersAttachmentListCard: React.FC<OrdersAttachmentListCardProps> = ({
  searchResults,
  ordersOfSelectedSkus,
  selectedSkus,
  orderTableFilter,
  setOrderTableFilter,
  drawPackingOverlay,
  setDrawPackingOverlay,
  drawPageNumbers = true,
  setDrawPageNumbers,
  pageNumberMode = 'CONTINUOUS',
  setPageNumberMode,
  separateBlankPages = true,
  setSeparateBlankPages,
  isMergingPdf,
  mergeError,
  onPreviewOrders,
  onDownloadOrdersPdf,
  onPrintOrders,
  autoShipOnPrint = false,
  setAutoShipOnPrint,
  isShipping = false,
  lastShipResult = null,
  onTriggerBatchShip,
  shippedOrdersSet = new Set<string>()
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

        {/* Nút Hành Động Lớn */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onTriggerBatchShip && (
            <button
              onClick={() => onTriggerBatchShip(displayedOrders)}
              disabled={isShipping || displayedOrders.length === 0}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              title="Ký xuất kho chuyển Shipped ngay lập tức trên YunWMS"
            >
              {isShipping ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  <span>Đang Ký Xuất...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xuất Kho YunWMS ({displayedOrders.length})</span>
                </>
              )}
            </button>
          )}

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

      {/* Bộ lọc bảng đơn: Tất cả vs Chỉ đơn của SKU đã chọn & Tuỳ chọn Packing Overlay & Auto-Ship */}
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

        {/* Thanh tuỳ chọn In Kèm Overlay Đóng Gói, Số Trang & Tự Động Chuyển Shipped */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-indigo-950 select-none">
            <input
              type="checkbox"
              checked={drawPackingOverlay}
              onChange={(e) => setDrawPackingOverlay(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
            />
            <span className="flex items-center gap-1.5">
              <span>Vẽ thêm bảng SKU (Packing Overlay)</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-indigo-200 text-indigo-800">
                Khuyên Dùng
              </span>
            </span>
          </label>

          {setDrawPageNumbers && (
            <div className="flex items-center gap-2 bg-sky-50/80 border border-sky-300/80 px-2.5 py-1 rounded-lg shadow-2xs">
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-sky-950 select-none hover:text-sky-700 transition-colors">
                <input
                  type="checkbox"
                  checked={drawPageNumbers}
                  onChange={(e) => setDrawPageNumbers(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer accent-sky-600"
                />
                <span>Đánh số thứ tự in</span>
              </label>

              {drawPageNumbers && setPageNumberMode ? (
                <div className="flex items-center bg-white/90 p-0.5 rounded-md border border-sky-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setPageNumberMode('CONTINUOUS')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      pageNumberMode === 'CONTINUOUS' ? 'bg-sky-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-sky-700'
                    }`}
                    title="Đánh số thứ tự liên tục 1..N toàn bộ danh sách đơn hàng"
                  >
                    Toàn bộ (1..N)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPageNumberMode('PER_SKU')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                      pageNumberMode === 'PER_SKU' ? 'bg-sky-600 text-white shadow-2xs font-extrabold' : 'text-slate-600 hover:text-sky-700'
                    }`}
                    title="Mỗi mã SKU được đánh số thứ tự từ 1 (ví dụ SKU 1 từ 1-100, SKU 2 từ 1-11...)"
                  >
                    Từng SKU (1..n)
                  </button>
                </div>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-sky-200 text-sky-900">Chuẩn Khay</span>
              )}
            </div>
          )}

          {setSeparateBlankPages && (
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-slate-700 select-none bg-slate-100/80 border border-slate-300/80 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-slate-200/60 transition-colors">
              <input
                type="checkbox"
                checked={separateBlankPages}
                onChange={(e) => setSeparateBlankPages(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <span>Cách 2 trang trắng giữa SKU</span>
            </label>
          )}

          {setAutoShipOnPrint && (
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-xs text-emerald-950 select-none bg-emerald-50/80 border border-emerald-300/80 px-2.5 py-1 rounded-lg shadow-2xs hover:bg-emerald-100/60 transition-colors">
              <input
                type="checkbox"
                checked={autoShipOnPrint}
                onChange={(e) => setAutoShipOnPrint(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span>Tự động chuyển Shipped trên YunWMS</span>
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Thông báo kết quả Ký Xuất Kho nếu có */}
      {lastShipResult && (
        <div className={`mx-4 my-2.5 p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 shadow-2xs ${
          lastShipResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {lastShipResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{lastShipResult.message}</span>
          </div>
          {lastShipResult.shippedCount !== undefined && lastShipResult.shippedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-extrabold shrink-0">
              Đã xuất: {lastShipResult.shippedCount} đơn
            </span>
          )}
        </div>
      )}

      {mergeError && (
        <div className="m-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{mergeError}</span>
        </div>
      )}

      {/* Bảng Danh Sách Đơn Hàng */}
      <OrdersAttachmentTable
        displayedOrders={displayedOrders}
        selectedSkus={selectedSkus}
        shippedOrdersSet={shippedOrdersSet}
        pageNumberMode={pageNumberMode}
        skuSummary={searchResults.skuSummary}
        onPrintSingleOrder={(o) => onPrintOrders([o], `In Đơn ${o.orderNo}`)}
      />
    </div>
  );
};
