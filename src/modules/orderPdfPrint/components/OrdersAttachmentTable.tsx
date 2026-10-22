import React from 'react';
import { Printer, AlertCircle, CheckCircle2 } from 'lucide-react';
import { OrderAttachmentInfo, SkuPickingSummaryItem } from '../../../services/wmsService';

interface OrdersAttachmentTableProps {
  displayedOrders: OrderAttachmentInfo[];
  selectedSkus: Set<string>;
  shippedOrdersSet: Set<string>;
  pageNumberMode?: 'CONTINUOUS' | 'PER_SKU';
  skuSummary?: SkuPickingSummaryItem[];
  onPrintSingleOrder: (order: OrderAttachmentInfo) => void;
}

export const OrdersAttachmentTable: React.FC<OrdersAttachmentTableProps> = ({
  displayedOrders,
  selectedSkus,
  shippedOrdersSet,
  pageNumberMode = 'CONTINUOUS',
  skuSummary,
  onPrintSingleOrder
}) => {
  // Tính toán số thứ tự (STT) đồng bộ 100% với số in trên nhãn PDF
  const sttList = React.useMemo(() => {
    if (pageNumberMode !== 'PER_SKU' || !skuSummary || skuSummary.length === 0) {
      return displayedOrders.map((_, i) => i + 1);
    }
    const orderSkuMap = new Map<string, string>();
    const assigned = new Set<string>();
    for (const s of skuSummary) {
      for (const no of s.orderNos) {
        const upper = (no || '').trim().toUpperCase();
        if (!assigned.has(upper)) {
          orderSkuMap.set(upper, s.sku);
          assigned.add(upper);
        }
      }
    }
    const skuCounters = new Map<string, number>();
    return displayedOrders.map((o) => {
      const key = (o.orderNo || o.trackingNo || '').trim().toUpperCase();
      const sku = orderSkuMap.get(key) || o.items?.[0]?.sku || 'KHAC';
      const count = (skuCounters.get(sku) || 0) + 1;
      skuCounters.set(sku, count);
      return count;
    });
  }, [displayedOrders, pageNumberMode, skuSummary]);

  return (
    <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-slate-100/90 sticky top-0 z-10 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
          <tr>
            <th className="py-2.5 px-3 text-center w-14">
              {pageNumberMode === 'PER_SKU' ? 'STT (SKU)' : 'STT'}
            </th>
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
            const isNewSkuStart = pageNumberMode === 'PER_SKU' && idx > 0 && sttList[idx] === 1;
            return (
              <tr
                key={o.orderNo || idx}
                className={`hover:bg-slate-50/60 transition-colors ${
                  isNewSkuStart ? 'border-t-2 border-t-sky-400 bg-sky-50/20' : ''
                }`}
              >
                <td className="py-2.5 px-3 text-center font-bold font-mono">
                  {pageNumberMode === 'PER_SKU' ? (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-black bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs">
                      #{sttList[idx]}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-bold">{sttList[idx]}</span>
                  )}
                </td>
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
