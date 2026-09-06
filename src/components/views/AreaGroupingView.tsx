import React, { useState, useMemo } from 'react';
import { MapPin, Copy, Check, Filter, Layers, Table, Grid } from 'lucide-react';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../types';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';
import { xuLyPhanNhomKhuVuc, CARRIER_CONFIG } from '../../utils/orderProcessor';

interface AreaGroupingViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm: string;
}

export const AreaGroupingView: React.FC<AreaGroupingViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
  searchTerm,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [columnMode, setColumnMode] = useState<'sheet4' | 'expanded8'>('sheet4');
  const [displayLayout, setDisplayLayout] = useState<'matrix' | 'cards'>('matrix');

  const { donTheoNhom, dynamicAreaList } = xuLyPhanNhomKhuVuc(
    orders,
    skuGroups,
    DEFAULT_AREA_ORDER,
    selectedPickingList,
    selectedCarrier
  );

  const loaiKeys =
    columnMode === 'sheet4'
      ? (['1 PCS', '2 PCS', '3 PCS', '4+ PCS', 'MIX'] as const)
      : (['1 PCS', '2 PCS', '3 PCS', '4 PCS', '5 PCS', '6 PCS', '7 PCS', '8+ PCS', 'MIX'] as const);

  // Lọc các khu vực hiển thị (bao gồm cả các nhóm động AA, BB, CC...)
  const activeAreas = dynamicAreaList.filter((nhom) => {
    const dataNhom = donTheoNhom[nhom] as Record<string, string[]> | undefined;
    if (!dataNhom) return false;
    const hasOrders = (loaiKeys as readonly string[]).some((l) => (dataNhom[l]?.length || 0) > 0);
    if (!hasOrders) return false;
    if (selectedAreaFilter !== 'ALL' && nhom !== selectedAreaFilter) return false;
    return true;
  });

  // Tìm số dòng lớn nhất trong bảng Matrix
  const maxMatrixRows = useMemo(() => {
    let max = 0;
    activeAreas.forEach((nhom) => {
      const dataNhom = donTheoNhom[nhom] as Record<string, string[]> | undefined;
      if (!dataNhom) return;
      (loaiKeys as readonly string[]).forEach((k) => {
        if ((dataNhom[k]?.length || 0) > max) {
          max = dataNhom[k].length;
        }
      });
    });
    return Math.max(max, 12);
  }, [activeAreas, donTheoNhom, loaiKeys]);

  const handleCopyAreaColumn = (title: string, list: string[]) => {
    if (!list || list.length === 0) return;
    navigator.clipboard.writeText(list.join('\n'));
    setCopiedKey(title);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyWholeArea = (nhom: string) => {
    const dataNhom = donTheoNhom[nhom] as Record<string, string[]> | undefined;
    if (!dataNhom) return;
    const lines: string[] = [`=== KHU VỰC ${nhom} ===`];
    (loaiKeys as readonly string[]).forEach((k) => {
      if (dataNhom[k]?.length > 0) {
        lines.push(`--- ${k} (${dataNhom[k].length} đơn) ---`);
        dataNhom[k].forEach((o) => lines.push(o));
      }
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedKey(`all_${nhom}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getTotalOrdersInArea = (nhom: string) => {
    const dataNhom = donTheoNhom[nhom] as Record<string, string[]> | undefined;
    if (!dataNhom) return 0;
    return (loaiKeys as readonly string[]).reduce((sum, k) => sum + (dataNhom[k]?.length || 0), 0);
  };

  return (
    <div className="space-y-6">
      {/* Banner & Controls */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-gray-900">Phân Nhóm Đơn Hàng Theo Khu Vực Kho</h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-medium">
              {DEFAULT_AREA_ORDER.length} Nhóm Khu Vực (YD-A → YD-HMS)
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Giao diện đồng bộ chính xác với Bảng Google Sheets thực tế (Header xanh dương, sub-headers 1 PCS, 2 PCS, 3 PCS, MIX).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Display Layout Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setDisplayLayout('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                displayLayout === 'matrix'
                  ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Bảng Sheet Ma Trận</span>
            </button>
            <button
              onClick={() => setDisplayLayout('cards')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                displayLayout === 'cards'
                  ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Dạng Thẻ Khu Vực</span>
            </button>
          </div>

          {/* Columns Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setColumnMode('sheet4')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                columnMode === 'sheet4'
                  ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="4 Cột chuẩn Google Sheet: 1 PCS, 2 PCS, 3 PCS, MIX"
            >
              4 Cột Chuẩn
            </button>
            <button
              onClick={() => setColumnMode('expanded8')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                columnMode === 'expanded8'
                  ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              title="8 Cột mở rộng: 1 đến 7 PCS và MIX"
            >
              1-7 PCS
            </button>
          </div>
        </div>
      </div>

      {/* Filter Area Quick Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedAreaFilter('ALL')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
            selectedAreaFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}
        >
          Tất cả khu vực ({orders.length})
        </button>
        {dynamicAreaList.map((nhom) => {
          const count = getTotalOrdersInArea(nhom);
          if (count === 0) return null;
          return (
            <button
              key={nhom}
              onClick={() => setSelectedAreaFilter(nhom)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                selectedAreaFilter === nhom
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {nhom} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Area Content */}
      {activeAreas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
          Không có đơn hàng nào thuộc khu vực đã chọn.
        </div>
      ) : displayLayout === 'matrix' ? (
        /* GOOGLE SHEETS MATRIX TABLE (Khớp 100% Giao diện Google Sheets) */
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

          <div className="overflow-x-auto max-w-full">
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
                              onClick={() => {
                                if (orderNo) {
                                  navigator.clipboard.writeText(orderNo);
                                  setCopiedKey(`cell_${nhom}_${loai}_${rIdx}`);
                                  setTimeout(() => setCopiedKey(null), 1500);
                                }
                              }}
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
      ) : (
        /* CARDS VIEW */
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
                    onClick={() => handleCopyWholeArea(nhom)}
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
                                onClick={() => handleCopyAreaColumn(copyId, list)}
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
                                  onClick={() => {
                                    navigator.clipboard.writeText(orderNo);
                                    setCopiedKey(`ord_${orderNo}`);
                                    setTimeout(() => setCopiedKey(null), 1500);
                                  }}
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
      )}
    </div>
  );
};
