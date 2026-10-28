import React from 'react';
import { Flame, RefreshCw, Download } from 'lucide-react';
import { HotSkuAnalyticsResult } from '../../../../sqliteDb';

interface HotSkuHeaderBannerProps {
  analytics: HotSkuAnalyticsResult | null;
  onOpenSyncModal: () => void;
  onExportExcel: () => void;
}

export const HotSkuHeaderBanner: React.FC<HotSkuHeaderBannerProps> = ({
  analytics,
  onOpenSyncModal,
  onExportExcel,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 shadow-2xs">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            Phân Tích Hàng Bán Chạy & Tối Ưu Vị Trí Kệ Kho (Slotting)
            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-semibold">
              Kho VN02
            </span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Dựa trên lịch sử xuất kho thực tế (YunWMS) kết hợp Tồn kho khả dụng & Hàng đang về để phân hạng ABC và tối ưu lối đi nhặt hàng.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenSyncModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Kéo Đơn Shipped Mới (YunWMS)</span>
        </button>

        <button
          onClick={onExportExcel}
          disabled={!analytics?.items || analytics.items.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold border border-gray-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-gray-500" />
          <span>Xuất Excel Phân Tích</span>
        </button>
      </div>
    </div>
  );
};
