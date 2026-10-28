import React from 'react';
import { Box, Copy, Check } from 'lucide-react';

interface YogaNormalOrdersSectionProps {
  totalNormalOrders: number;
  cacSoLuongThuong: number[];
  donThuong: Record<number, string[]>;
  copiedKey: string | null;
  onCopyList: (key: string, list: string[]) => void;
}

export const YogaNormalOrdersSection: React.FC<YogaNormalOrdersSectionProps> = ({
  totalNormalOrders,
  cacSoLuongThuong,
  donThuong,
  copiedKey,
  onCopyList,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            3. Đơn Thông Thường Theo PCS ({totalNormalOrders} đơn)
          </h3>
        </div>
      </div>

      <div className="p-5">
        {cacSoLuongThuong.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">Trống</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-3.5">
            {cacSoLuongThuong.map((qty) => {
              const list = donThuong[qty] || [];
              const label = `${qty} PCS Thường`;

              return (
                <div
                  key={qty}
                  className="w-full bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs"
                >
                  <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span>{qty} PCS</span>
                      </div>
                      <div className="text-[10px] text-gray-400">{list.length} đơn</div>
                    </div>
                    <button
                      onClick={() => onCopyList(label, list)}
                      className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                    >
                      {copiedKey === label ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
                    {list.map((orderNo, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] text-gray-700 p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all"
                      >
                        {orderNo}
                      </div>
                    ))}
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
