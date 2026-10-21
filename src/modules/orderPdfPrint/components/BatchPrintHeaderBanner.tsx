import React from 'react';
import { Printer, Sparkles, Layers } from 'lucide-react';

interface BatchPrintHeaderBannerProps {
  ordersCount: number;
  onLoadSampleCodes: () => void;
  onImportCurrentOrders: () => void;
}

export const BatchPrintHeaderBanner: React.FC<BatchPrintHeaderBannerProps> = ({
  ordersCount,
  onLoadSampleCodes,
  onImportCurrentOrders,
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
              ⭐ Tính Năng Mới
            </span>
            <span className="text-blue-200 text-xs font-semibold">
              Khai Báo Picking List No. & Bóc Tách SKU Đóng Hàng
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
            <Printer className="w-6 h-6 text-amber-300" />
            <span>Tổng Hợp PDF Đơn Hàng & Bảng Nhặt Hàng In 1 Lần</span>
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-2xl">
            Khai báo <b>Picking List No.</b> hoặc dán danh sách mã đơn để tự động bóc tách <b>bảng SKU cần nhặt theo từng đơn</b> và <b>chọn in nhãn theo từng SKU hoặc in toàn bộ 1 lần duy nhất</b>!
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onLoadSampleCodes}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Dán Mẫu 11 Đơn</span>
          </button>
          {ordersCount > 0 && (
            <button
              onClick={onImportCurrentOrders}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Lấy Từ {ordersCount} Đơn Đang Mở</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
