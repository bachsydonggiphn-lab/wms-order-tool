import React from 'react';
import { Copy, Check } from 'lucide-react';
import { RawOrderRow, CarrierCode } from '../../../../../types';
import { CARRIER_CONFIG } from '../../../../../utils/orderProcessor';

interface AllOrdersToolbarProps {
  totalOrdersCount: number;
  filteredOrders: RawOrderRow[];
  selectedCarrier?: CarrierCode;
  copiedKey: string | null;
  handleCopy: (text: string, id: string) => void;
  pageSize: number;
  onPageSizeChange: (newPageSize: number) => void;
}

export const AllOrdersToolbar: React.FC<AllOrdersToolbarProps> = ({
  totalOrdersCount,
  filteredOrders,
  selectedCarrier = 'ALL',
  copiedKey,
  handleCopy,
  pageSize,
  onPageSizeChange,
}) => {
  return (
    <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Bảng Dữ Liệu Chi Tiết Từng Đơn Hàng
          </h2>
          {selectedCarrier && selectedCarrier !== 'ALL' && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              ĐVVC: {CARRIER_CONFIG[selectedCarrier]?.name || selectedCarrier}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Hiển thị {filteredOrders.length} / {totalOrdersCount} đơn hàng (Cột P: Order No, Q: Tracking, U: Picking List, Thời gian Xuất Kho)
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        {filteredOrders.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => {
                const text = filteredOrders.map((o) => o.orderNo).filter(Boolean).join('\n');
                handleCopy(text, 'all_filtered_orderNo');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Sao chép toàn bộ mã đơn đang lọc (mỗi mã 1 dòng)"
            >
              {copiedKey === 'all_filtered_orderNo' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>
                {copiedKey === 'all_filtered_orderNo' ? 'Đã copy!' : `Copy ${filteredOrders.length} Mã Đơn`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                const text = filteredOrders.map((o) => o.trackingNo).filter(Boolean).join('\n');
                handleCopy(text, 'all_filtered_trackingNo');
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
              title="Sao chép toàn bộ mã vận đơn (tracking) đang lọc (mỗi mã 1 dòng)"
            >
              {copiedKey === 'all_filtered_trackingNo' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>
                {copiedKey === 'all_filtered_trackingNo' ? 'Đã copy!' : `Copy ${filteredOrders.length} Tracking`}
              </span>
            </button>
          </>
        )}

        <label className="text-xs text-gray-500 ml-1">Hiển thị:</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="text-xs bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-gray-700 shadow-2xs cursor-pointer focus:outline-none focus:border-indigo-500"
        >
          <option value={15}>15 dòng</option>
          <option value={25}>25 dòng</option>
          <option value={50}>50 dòng</option>
          <option value={100}>100 dòng</option>
        </select>
      </div>
    </div>
  );
};
