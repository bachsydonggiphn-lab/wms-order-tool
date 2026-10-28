import React from 'react';
import { Sparkles } from 'lucide-react';

interface MixCombosTabProps {
  popularPairs: Array<{
    sku1: string;
    sku2: string;
    count: number;
    area1: string;
    area2: string;
  }>;
}

export const MixCombosTab: React.FC<MixCombosTabProps> = ({ popularPairs }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Ma Trận Các Cặp SKU Thường Được Mua Chung Trong Đơn MIX
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Giúp nhân viên kho chuẩn bị sẵn các combo sản phẩm gần nhau để đẩy nhanh tốc độ đóng gói.
          </p>
        </div>
        <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg">
          Top {popularPairs.length} Cặp SKU
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {popularPairs.map((pair, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Combo #{idx + 1}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                {pair.count} Đơn MIX
              </span>
            </div>

            <div className="space-y-1.5 my-1">
              <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-gray-200">
                <span className="font-mono text-xs font-bold text-gray-900">{pair.sku1}</span>
                <span className="text-[10px] text-gray-500 px-1.5 bg-gray-100 rounded">Khu {pair.area1}</span>
              </div>
              <div className="text-center text-[10px] text-gray-400 font-bold">+ ĐI KÈM +</div>
              <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-gray-200">
                <span className="font-mono text-xs font-bold text-gray-900">{pair.sku2}</span>
                <span className="text-[10px] text-gray-500 px-1.5 bg-gray-100 rounded">Khu {pair.area2}</span>
              </div>
            </div>

            <div className="text-[11px] text-indigo-600 font-medium pt-2 border-t border-gray-200/70 text-right">
              Đã ghép trong {pair.count} đơn hàng
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
