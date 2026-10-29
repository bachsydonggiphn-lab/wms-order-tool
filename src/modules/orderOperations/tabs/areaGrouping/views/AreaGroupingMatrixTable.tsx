import React from 'react';
import { Table } from 'lucide-react';

interface AreaGroupingMatrixTableProps {
  activeAreas: string[];
  loaiKeys: readonly string[];
  donTheoNhom: Record<string, Record<string, string[]>>;
  maxMatrixRows: number;
  copiedKey: string | null;
  onCopyCell: (orderNo: string, cellKey: string) => void;
  getTotalOrdersInArea: (nhom: string) => number;
}

export const AreaGroupingMatrixTable: React.FC<AreaGroupingMatrixTableProps> = ({
  activeAreas,
  loaiKeys,
  donTheoNhom,
  maxMatrixRows,
  copiedKey,
  onCopyCell,
  getTotalOrdersInArea,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-3.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
          <Table className="w-4 h-4 text-indigo-600" />
          Bảng Ma Trận Phân Khu Vực Kho (Google Sheets Layout)
        </span>
        <span className="text-[11px] text-gray-400 font-mono">
          Hiển thị {activeAreas.length} nhóm khu vực
        </span>
      </div>

      <div className="overflow-x-auto max-w-full custom-scrollbar">
        <table className="w-full text-xs border-collapse font-sans min-w-max">
          {/* DÒNG 1: HEADER KHU VỰC (MÀU XANH DƯƠNG #1A73E8) */}
          <thead>
            <tr className="bg-[#1A73E8] text-white">
              {activeAreas.map((nhom, idx) => (
                <React.Fragment key={nhom}>
                  <th
                    colSpan={loaiKeys.length}
                    className="py-2 px-3 text-center font-bold tracking-wider border-r border-blue-400 text-xs uppercase"
                  >
                    {nhom} ({getTotalOrdersInArea(nhom)})
                  </th>
                  {idx < activeAreas.length - 1 && (
                    <th className="w-4 bg-gray-100 border-r border-gray-200"></th>
                  )}
                </React.Fragment>
              ))}
            </tr>

            {/* DÒNG 2: SUB-HEADERS (MÀU XANH LÁ #34A853) */}
            <tr className="bg-[#34A853] text-white font-semibold">
              {activeAreas.map((nhom, idx) => (
                <React.Fragment key={nhom}>
                  {loaiKeys.map((loai) => {
                    const count = (donTheoNhom[nhom] as Record<string, string[]> | undefined)?.[loai]?.length || 0;
                    return (
                      <th
                        key={loai}
                        className="py-1.5 px-2.5 text-center font-medium border-r border-emerald-600 min-w-[125px] text-[11px]"
                      >
                        {loai} {count > 0 ? `(${count})` : ''}
                      </th>
                    );
                  })}
                  {idx < activeAreas.length - 1 && (
                    <th className="w-4 bg-gray-100 border-r border-gray-200"></th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          {/* DÒNG 3 TRỞ ĐI: CÁC MÃ ĐƠN HÀNG XẾP DỌC */}
          <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
            {Array.from({ length: maxMatrixRows }).map((_, rIdx) => (
              <tr key={rIdx} className="hover:bg-blue-50/30 transition-colors">
                {activeAreas.map((nhom, aIdx) => (
                  <React.Fragment key={nhom}>
                    {loaiKeys.map((loai) => {
                      const orderNo = (donTheoNhom[nhom] as Record<string, string[]> | undefined)?.[loai]?.[rIdx] || '';
                      const isCopied = copiedKey === `cell_${nhom}_${loai}_${rIdx}`;
                      return (
                        <td
                          key={loai}
                          onClick={() => onCopyCell(orderNo, `cell_${nhom}_${loai}_${rIdx}`)}
                          className={`py-1.5 px-2 text-center border-r border-gray-100 ${
                            orderNo
                              ? 'text-gray-800 hover:text-indigo-600 hover:bg-indigo-50/50 cursor-pointer font-medium'
                              : 'text-transparent select-none'
                          }`}
                        >
                          {orderNo ? (
                            <div className="flex items-center justify-center gap-1">
                              <span>{orderNo}</span>
                              {isCopied && <span className="text-emerald-600 font-sans text-[10px]">✓</span>}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    })}
                    {aIdx < activeAreas.length - 1 && (
                      <td className="w-4 bg-gray-50/50 border-r border-gray-200"></td>
                    )}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
