import React from 'react';
import { MapPin, Check, Copy } from 'lucide-react';

interface SinglePcsByAreaViewProps {
  totalSinglePcsInArea: number;
  activeAreas: string[];
  don1PCSTheoNhom: Record<string, string[]>;
  copiedKey: string | null;
  handleCopyArea: (nhom: string, list: string[]) => void;
  onCopyAllAreas: () => void;
  onCopySingleOrder: (orderNo: string) => void;
}

export const SinglePcsByAreaView: React.FC<SinglePcsByAreaViewProps> = ({
  totalSinglePcsInArea,
  activeAreas,
  don1PCSTheoNhom,
  copiedKey,
  handleCopyArea,
  onCopyAllAreas,
  onCopySingleOrder,
}) => {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-500" />
            Phân Bổ Đơn 1 PCS Theo 13 Khu Vực Kho
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Tổng cộng {totalSinglePcsInArea} đơn 1 món phân bổ đều theo từng phân khu lưu trữ kho.
          </p>
        </div>

        <button
          onClick={onCopyAllAreas}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-700 transition-colors cursor-pointer border border-gray-200 shadow-2xs shrink-0"
        >
          {copiedKey === 'all_single' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
          <span>{copiedKey === 'all_single' ? 'Đã sao chép tất cả' : 'Sao chép tất cả khu vực'}</span>
        </button>
      </div>

      {activeAreas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
          Không có đơn hàng nào thuộc diện 1 PCS trong danh sách hiện tại.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {activeAreas.map((nhom) => {
            const list = don1PCSTheoNhom[nhom] || [];

            return (
              <div
                key={nhom}
                className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden flex flex-col hover:border-gray-300 transition-all"
              >
                {/* Header */}
                <div className="p-3.5 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-xs text-gray-900">{nhom}</h3>
                    <p className="text-[11px] text-gray-400">{list.length} đơn 1 PCS</p>
                  </div>

                  <button
                    onClick={() => handleCopyArea(nhom, list)}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                    title={`Sao chép ${list.length} mã đơn của ${nhom}`}
                  >
                    {copiedKey === nhom ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Orders List */}
                <div className="p-3 space-y-1 max-h-64 overflow-y-auto font-mono">
                  {list.map((orderNo, idx) => (
                    <div
                      key={idx}
                      onClick={() => onCopySingleOrder(orderNo)}
                      className="text-[11px] text-gray-700 hover:text-indigo-600 hover:bg-gray-50 p-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <span>{orderNo}</span>
                      {copiedKey === `ord_${orderNo}` ? (
                        <span className="text-[9px] text-emerald-600 font-bold font-sans">✓</span>
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
