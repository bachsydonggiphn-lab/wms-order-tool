import React from 'react';
import { Link2, Boxes } from 'lucide-react';
import { PairedSkuInfo } from '../../../../sqliteDb';

interface PairedSkusSectionProps {
  uniquePairs: PairedSkuInfo[];
  onNavigateToInventory?: (sku?: string) => void;
}

export const PairedSkusSection: React.FC<PairedSkusSectionProps> = ({
  uniquePairs,
  onNavigateToInventory,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-2">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-emerald-600" />
          Ma Trận Cặp Sản Phẩm Mua Kèm Trong Đơn Ghép (Basket Affinity & Cross-Docking)
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Phát hiện các cặp sản phẩm thường xuyên xuất hiện chung trong cùng một đơn hàng Mix SKU. 
          Sắp xếp 2 mã này tại <b>2 ngăn liền kề hoặc cùng một kệ</b> giúp nhân viên nhặt hàng lấy cả 2 món chỉ với 1 bước chân dừng lại, 
          triệt tiêu tới 50% quãng đường di chuyển trong kho!
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {uniquePairs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <Boxes className="w-8 h-8 mx-auto text-slate-400" />
            <p className="font-semibold text-sm">Chưa phát hiện cặp sản phẩm nào có tần suất mua kèm đáng kể trong kỳ phân tích này.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/80 sticky top-0 z-10 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="py-3 px-3 text-center w-12">STT</th>
                  <th className="py-3 px-3">Sản Phẩm 1 (SKU A)</th>
                  <th className="py-3 px-3 text-center w-16">Liên Kết</th>
                  <th className="py-3 px-3">Sản Phẩm Mua Kèm (SKU B)</th>
                  <th className="py-3 px-3 text-center w-36">Số Đơn Ghép Mua Chung</th>
                  <th className="py-3 px-3">Khuyến Nghị Sắp Xếp Kệ Kho</th>
                  <th className="py-3 px-3 text-center w-24">Tồn Kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uniquePairs.map((pair, idx) => (
                  <tr key={`${pair.skuA}___${pair.skuB}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {pair.skuA}
                      </span>
                      {pair.titleA && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">{pair.titleA}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                        <Link2 className="w-4 h-4" />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {pair.skuB}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-1 rounded-full font-black text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono">
                        {pair.count.toLocaleString()} đơn
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <p className="text-xs font-semibold text-slate-800">
                        ⚡ Bố trí cùng ô kệ hoặc 2 ngăn cạnh nhau
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cặp đôi này thường xuyên xuất hiện cùng nhau trong đơn Mix. Gom cùng dãy giúp nhặt hàng 1 lần.
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onNavigateToInventory?.(pair.skuA)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        Xem tồn
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
