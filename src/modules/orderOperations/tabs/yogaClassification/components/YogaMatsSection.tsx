import React from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import { RawOrderRow } from '../../../../../types';

interface YogaMatsSectionProps {
  totalYogaOrders: number;
  cacSoLuongYoga: string[];
  donThamYoga: Record<string, string[]>;
  orderMap: Map<string, RawOrderRow>;
  copiedKey: string | null;
  onCopyList: (key: string, list: string[]) => void;
  onCopySingle: (key: string, text: string) => void;
}

export const YogaMatsSection: React.FC<YogaMatsSectionProps> = ({
  totalYogaOrders,
  cacSoLuongYoga,
  donThamYoga,
  orderMap,
  copiedKey,
  onCopyList,
  onCopySingle,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            1. Phân Loại Đơn Thảm Yoga ({totalYogaOrders} đơn)
          </h3>
        </div>
        <span className="text-xs text-gray-400">
          Mã SKU: YD-B8, YD-B9, YD-L28, YD-L29...
        </span>
      </div>

      <div className="p-5">
        {cacSoLuongYoga.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            Không có đơn thảm Yoga nào trong đợt này.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3.5">
            {cacSoLuongYoga.map((key) => {
              const list = donThamYoga[key] || [];
              const label =
                key === 'MIX_L46'
                  ? 'Thảm Yoga + L46'
                  : key === 'MIX'
                  ? 'MIX Thảm Yoga'
                  : `Thảm Yoga ${key} PCS`;
              const subHint =
                key === 'MIX_L46'
                  ? '1 Thảm + 1 L46 (Đúng 2 PCS)'
                  : key === 'MIX'
                  ? 'MIX Thảm hoặc > 2 PCS'
                  : undefined;

              return (
                <div
                  key={key}
                  className="w-full bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs"
                >
                  <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{label}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <span>{list.length} đơn</span>
                        {subHint && (
                          <span className="text-gray-500 bg-gray-100 px-1 py-0.2 rounded text-[9px] font-sans font-medium">
                            {subHint}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onCopyList(label, list)}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                      title="Sao chép danh sách"
                    >
                      {copiedKey === label ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
                    {list.map((orderNo, idx) => {
                      const ord = orderMap.get(orderNo);
                      return (
                        <div
                          key={idx}
                          onClick={() => onCopySingle(`ord_${orderNo}`, orderNo)}
                          title={ord?.rawPieceText || ord?.items.map((i) => `${i.sku}*${i.qty}`).join(', ') || ''}
                          className="text-[11px] text-gray-700 hover:text-emerald-700 hover:bg-white p-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <span className="truncate">{orderNo}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {ord && (
                              <span className="text-gray-500 bg-gray-100/90 border border-gray-200/60 px-1.5 py-0.2 rounded text-[9px] font-sans font-medium">
                                {ord.totalQty} PCS
                              </span>
                            )}
                            {copiedKey === `ord_${orderNo}` ? (
                              <span className="text-[9px] text-emerald-600 font-bold font-sans">✓</span>
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
