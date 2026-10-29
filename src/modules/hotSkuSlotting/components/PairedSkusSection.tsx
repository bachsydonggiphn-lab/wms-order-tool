import React, { useState, useMemo } from 'react';
import { Link2, Boxes, Search } from 'lucide-react';
import { PairedSkuMatrixItem } from '../../../../sqliteDb';

interface PairedSkusSectionProps {
  uniquePairs: PairedSkuMatrixItem[];
  onNavigateToInventory?: (sku?: string) => void;
}

export const PairedSkusSection: React.FC<PairedSkusSectionProps> = ({
  uniquePairs,
  onNavigateToInventory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPairs = useMemo(() => {
    if (!searchQuery.trim()) return uniquePairs;
    const q = searchQuery.trim().toLowerCase();
    return uniquePairs.filter(
      (p) =>
        p.skuA.toLowerCase().includes(q) ||
        p.skuB.toLowerCase().includes(q) ||
        (p.titleA || '').toLowerCase().includes(q) ||
        (p.titleB || '').toLowerCase().includes(q) ||
        (p.groupA || '').toLowerCase().includes(q) ||
        (p.groupB || '').toLowerCase().includes(q)
    );
  }, [uniquePairs, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
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

        {uniquePairs.length > 0 && (
          <div className="relative shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã SKU trong cặp..."
              className="pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs w-60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredPairs.length === 0 ? (
          <div className="p-16 text-center text-slate-500 space-y-2">
            <Boxes className="w-8 h-8 mx-auto text-slate-400" />
            <p className="font-semibold text-sm">
              {uniquePairs.length === 0
                ? 'Chưa phát hiện cặp sản phẩm nào có tần suất mua kèm đáng kể trong kỳ phân tích này.'
                : 'Không tìm thấy cặp sản phẩm nào khớp với từ khóa tìm kiếm.'}
            </p>
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
                  <th className="py-3 px-3 text-center w-28">Tồn Kho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPairs.map((pair, idx) => (
                  <tr key={`${pair.skuA}___${pair.skuB}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {pair.skuA}
                        </span>
                        {pair.groupA && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {pair.groupA}
                          </span>
                        )}
                      </div>
                      {pair.titleA && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs" title={pair.titleA}>
                          {pair.titleA}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                        <Link2 className="w-4 h-4" />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {pair.skuB}
                        </span>
                        {pair.groupB && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50/60 text-indigo-700">
                            {pair.groupB}
                          </span>
                        )}
                      </div>
                      {pair.titleB && (
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs" title={pair.titleB}>
                          {pair.titleB}
                        </p>
                      )}
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
                        {pair.groupA && pair.groupB && pair.groupA !== pair.groupB
                          ? `Cặp liên nhóm (${pair.groupA} ↔ ${pair.groupB}). Ưu tiên gom khu vực giáp ranh hoặc bàn đóng gói Mix.`
                          : 'Cặp đôi này thường xuyên xuất hiện cùng nhau trong đơn Mix. Gom cùng dãy giúp nhặt hàng 1 lần.'}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => onNavigateToInventory?.(pair.skuA)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                          title={`Xem tồn kho ${pair.skuA}`}
                        >
                          Tồn A
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => onNavigateToInventory?.(pair.skuB)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer"
                          title={`Xem tồn kho ${pair.skuB}`}
                        >
                          Tồn B
                        </button>
                      </div>
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
