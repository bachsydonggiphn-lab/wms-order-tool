import React from 'react';
import { Printer, AlertCircle, CheckCircle2 } from 'lucide-react';
import { OrderAttachmentInfo } from '../../../services/wmsService';

interface OrdersAttachmentTableProps {
  displayedOrders: OrderAttachmentInfo[];
  selectedSkus: Set<string>;
  shippedOrdersSet: Set<string>;
  onPrintSingleOrder: (order: OrderAttachmentInfo) => void;
}

export const OrdersAttachmentTable: React.FC<OrdersAttachmentTableProps> = ({
  displayedOrders,
  selectedSkus,
  shippedOrdersSet,
  onPrintSingleOrder
}) => {
  return (
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
          {displayedOrders.map((o, idx) => {
            const isShipped = o.statusCode === '8' || shippedOrdersSet.has(o.orderNo);
            return (
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
                      isShipped
                        ? 'bg-emerald-100 text-emerald-800'
                        : o.statusCode === '5'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {isShipped ? 'Shipped (Đã xuất)' : (o.status || 'Shelved')}
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
                      onClick={() => onPrintSingleOrder(o)}
                      title="In nhãn riêng cho đơn này"
                      className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
