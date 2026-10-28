import React from 'react';
import { Copy, Check } from 'lucide-react';

interface AreaGroupingCardsGridProps {
  activeAreas: string[];
  donTheoNhom: Record<string, Record<string, string[]>>;
  loaiKeys: readonly string[];
  copiedKey: string | null;
  onCopyAreaColumn: (title: string, list: string[]) => void;
  onCopyWholeArea: (nhom: string) => void;
  onCopyCell: (orderNo: string, cellKey: string) => void;
  getTotalOrdersInArea: (nhom: string) => number;
}

export const AreaGroupingCardsGrid: React.FC<AreaGroupingCardsGridProps> = ({
  activeAreas,
  donTheoNhom,
  loaiKeys,
  copiedKey,
  onCopyAreaColumn,
  onCopyWholeArea,
  onCopyCell,
  getTotalOrdersInArea,
}) => {
  return (
    <div className="space-y-6">
      {activeAreas.map((nhom) => {
        const dataNhom = donTheoNhom[nhom];
        const totalOrders = getTotalOrdersInArea(nhom);

        return (
          <div
            key={nhom}
            className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden"
          >
            {/* Area Header */}
            <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {nhom.replace('YD-', '')}
                </div>
                <div>
                  <h3 className="font-semibold text-xs text-gray-900 tracking-wide">
                    KHU VỰC: {nhom}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Tổng cộng: {totalOrders} đơn hàng
                  </p>
                </div>
              </div>

              <button
                onClick={() => onCopyWholeArea(nhom)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors shadow-2xs cursor-pointer"
                title="Sao chép toàn bộ mã đơn của khu vực này"
              >
                {copiedKey === `all_${nhom}` ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                )}
                <span>
                  {copiedKey === `all_${nhom}` ? 'Đã sao chép khu vực' : 'Sao chép khu vực'}
                </span>
              </button>
            </div>

            {/* Sub-headers & Columns */}
            <div className="p-5 overflow-x-auto">
              <div className="flex gap-3 min-w-max">
                {loaiKeys.map((loai) => {
                  const list = (dataNhom as Record<string, string[]> | undefined)?.[loai] || [];
                  const hasData = list.length > 0;
                  const copyId = `${nhom}_${loai}`;

                  return (
                    <div
                      key={loai}
                      className={`w-40 rounded-xl border flex flex-col overflow-hidden transition-all ${
                        hasData
                          ? 'bg-gray-50/60 border-gray-200 shadow-2xs'
                          : 'bg-gray-50/20 border-gray-100 opacity-50'
                      }`}
                    >
                      {/* Sub Column Header */}
                      <div className="p-2.5 bg-white border-b border-gray-200 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${hasData ? 'bg-indigo-600' : 'bg-gray-300'}`}></span>
                            <span>{loai}</span>
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {list.length} đơn
                          </div>
                        </div>

                        {hasData && (
                          <button
                            onClick={() => onCopyAreaColumn(copyId, list)}
                            title={`Sao chép ${list.length} mã đơn`}
                            className="p-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                          >
                            {copiedKey === copyId ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Orders List */}
                      <div className="p-2 space-y-1 max-h-56 overflow-y-auto font-mono">
                        {list.length === 0 ? (
                          <div className="text-[11px] text-gray-400 text-center py-4 italic font-sans">
                            Trống
                          </div>
                        ) : (
                          list.map((orderNo, idx) => (
                            <div
                              key={idx}
                              onClick={() => onCopyCell(orderNo, `ord_${orderNo}`)}
                              className="text-[11px] text-gray-700 hover:text-indigo-600 hover:bg-white p-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer flex items-center justify-between group"
                            >
                              <span>{orderNo}</span>
                              {copiedKey === `ord_${orderNo}` ? (
                                <span className="text-[9px] text-emerald-600 font-bold font-sans">✓</span>
                              ) : (
                                <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
