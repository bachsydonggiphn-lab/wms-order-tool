import React from 'react';
import {
  Package,
  ExternalLink,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Truck,
  Sparkles,
  RotateCcw,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { CarrierId, TrackingStatusCategory } from '../../../../../types/tracking';
import { TrackingOrderItemView } from '../types';

interface ShippedTrackingTableProps {
  filteredItems: TrackingOrderItemView[];
  shippedOrdersCount: number;
  expandedOrderKey: string | null;
  setExpandedOrderKey: (key: string | null) => void;
  handleSingleTrack: (code: string, carrier: CarrierId) => void;
}

export const ShippedTrackingTable: React.FC<ShippedTrackingTableProps> = ({
  filteredItems,
  shippedOrdersCount,
  expandedOrderKey,
  setExpandedOrderKey,
  handleSingleTrack,
}) => {
  const getStatusBadge = (category: TrackingStatusCategory, rawText: string) => {
    switch (category) {
      case 'scanned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{rawText || 'Đã scan lấy hàng'}</span>
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Truck className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>{rawText || 'Đang vận chuyển'}</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-900 border border-green-400">
            <Sparkles className="w-3.5 h-3.5 text-green-700" />
            <span>{rawText || 'Giao thành công'}</span>
          </span>
        );
      case 'returned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span>{rawText || 'Chuyển hoàn'}</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{rawText || 'Đã hủy'}</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>{rawText || 'Lỗi tra cứu'}</span>
          </span>
        );
      case 'not_scanned':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{rawText || 'Chưa scan lấy hàng'}</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4">STT</th>
              <th className="py-3 px-4">Mã Đơn / Mã Vận Đơn</th>
              <th className="py-3 px-4">ĐVVC</th>
              <th className="py-3 px-4">Trạng Thái Scan</th>
              <th className="py-3 px-4">Thời Gian Scan / Xuất Kho</th>
              <th className="py-3 px-4">Chi Tiết Đơn Hàng</th>
              <th className="py-3 px-4 text-center">Hành Trình</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-sm text-slate-600">
                    {shippedOrdersCount === 0 ? 'Chưa có đơn Shipped nào trong cache' : 'Không tìm thấy đơn hàng phù hợp với bộ lọc'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {shippedOrdersCount === 0
                      ? 'Bấm "⬇️ Kéo đơn Shipped mới" để lấy đơn E11=8 từ YunWMS'
                      : 'Thử chọn "Tất cả ngày" hoặc bỏ bộ lọc ĐVVC'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => {
                const isExpanded = expandedOrderKey === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <div className="text-slate-900 flex items-center gap-1.5">
                          <span>{item.trackingCode}</span>
                          <a
                            href={item.directUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Mở trang tra cứu chính thức của hãng"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => handleSingleTrack(item.trackingCode, item.carrier)}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                            title="Quét lại mốc API đơn này"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${item.isChecking ? 'animate-spin text-amber-500' : ''}`} />
                          </button>
                        </div>
                        {item.orderNo && item.orderNo !== item.trackingCode && (
                          <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                            Mã đơn: {item.orderNo}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {item.carrierName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.isChecking ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 animate-pulse shadow-xs">
                            <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                            <span>Đang gọi API {item.carrierName}...</span>
                          </span>
                        ) : (
                          getStatusBadge(item.statusCategory, item.rawStatusText)
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {item.scannedAt ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {item.scannedAt}
                          </span>
                        ) : item.shippedTime ? (
                          <span className="text-slate-600">
                            {item.shippedTime}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có mốc giờ</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800 font-medium max-w-xs truncate" title={item.skuText}>
                          {item.skuText || '---'}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {item.pickingList && <span>PL: {item.pickingList}</span>}
                          <span>Tổng SL: {item.quantity}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setExpandedOrderKey(isExpanded ? null : item.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>{item.timeline.length} mốc</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Timeline Section */}
                    {isExpanded && (
                      <tr className="bg-slate-50/90 border-b border-slate-200">
                        <td colSpan={7} className="p-4">
                          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 pb-2 border-b border-slate-100">
                              <span>Hành trình chi tiết đơn {item.trackingCode} ({item.carrierName})</span>
                              <span className="text-slate-500 font-normal">{item.statusDetail}</span>
                            </div>

                            {item.timeline.length === 0 ? (
                              <p className="text-xs text-slate-500 italic py-2">
                                Chưa có lịch sử mốc scan được ghi nhận từ cổng vận chuyển.
                              </p>
                            ) : (
                              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-2">
                                {item.timeline.map((step, sIdx) => (
                                  <div key={sIdx} className="flex items-start gap-3 text-xs">
                                    <span className="font-mono font-bold text-slate-500 w-32 shrink-0 pt-0.5">
                                      {step.time}
                                    </span>
                                    <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                                    <div className="flex-1">
                                      <p className="font-bold text-slate-900">{step.statusText}</p>
                                      {step.location && (
                                        <p className="text-slate-500 text-[11px] mt-0.5">{step.location}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
