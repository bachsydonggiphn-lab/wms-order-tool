import React, { useState, useMemo } from 'react';
import {
  ListFilter,
  Package,
  Layers,
  Box,
  Copy,
  Check,
  Search,
  ExternalLink,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { RawOrderRow, SkuGroupsMap } from '../../types';
import { tinhTongHopSKU, layNhomTuSKU } from '../../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';

interface PickingListDetailViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  onSelectPickingList: (pl: string) => void;
  searchTerm: string;
  onOpenPrintModal?: (pl?: string) => void;
}

export const PickingListDetailView: React.FC<PickingListDetailViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  onSelectPickingList,
  searchTerm,
  onOpenPrintModal,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activePlFilter, setActivePlFilter] = useState<string>(selectedPickingList || '');

  // 1. Thống kê toàn bộ Picking Lists có trong tập dữ liệu
  const pickingListStats = useMemo(() => {
    const map = new Map<
      string,
      {
        pickingListNo: string;
        orders: RawOrderRow[];
        skuMap: Record<string, number>;
        totalPcs: number;
        singlePcsCount: number;
        multiPcsCount: number;
        areas: Set<string>;
      }
    >();

    orders.forEach((order) => {
      const plKey = order.pickingList && order.pickingList.trim() !== '' ? order.pickingList.trim() : 'Chưa gán PL';
      if (!map.has(plKey)) {
        map.set(plKey, {
          pickingListNo: plKey,
          orders: [],
          skuMap: {},
          totalPcs: 0,
          singlePcsCount: 0,
          multiPcsCount: 0,
          areas: new Set<string>(),
        });
      }

      const entry = map.get(plKey)!;
      entry.orders.push(order);

      let orderPcs = 0;
      order.items.forEach((item) => {
        entry.skuMap[item.sku] = (entry.skuMap[item.sku] || 0) + item.qty;
        entry.totalPcs += item.qty;
        orderPcs += item.qty;

        const area = layNhomTuSKU(item.sku, skuGroups, DEFAULT_AREA_ORDER);
        entry.areas.add(area);
      });

      if (orderPcs === 1) {
        entry.singlePcsCount += 1;
      } else {
        entry.multiPcsCount += 1;
      }
    });

    const list = Array.from(map.values());
    // Sắp xếp theo tên Picking List
    list.sort((a, b) => a.pickingListNo.localeCompare(b.pickingListNo));
    return list;
  }, [orders, skuGroups]);

  // Cập nhật khi props selectedPickingList thay đổi từ thanh công cụ
  React.useEffect(() => {
    if (selectedPickingList !== undefined) {
      setActivePlFilter(selectedPickingList);
    }
  }, [selectedPickingList]);

  // Lọc theo search
  const filteredPlList = useMemo(() => {
    if (!searchTerm.trim()) return pickingListStats;
    const term = searchTerm.toLowerCase();
    return pickingListStats.filter((item) => {
      const matchPl = item.pickingListNo.toLowerCase().includes(term);
      const matchSku = Object.keys(item.skuMap).some((sku) => sku.toLowerCase().includes(term));
      const matchOrder = item.orders.some((o) => o.orderNo.toLowerCase().includes(term) || o.trackingNo.toLowerCase().includes(term));
      return matchPl || matchSku || matchOrder;
    });
  }, [pickingListStats, searchTerm]);

  // Picking list đang được chọn xem chi tiết
  const currentPl = useMemo(() => {
    if (activePlFilter) {
      return pickingListStats.find((item) => item.pickingListNo === activePlFilter);
    }
    return pickingListStats[0] || null;
  }, [pickingListStats, activePlFilter]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleCopyPlSkuTable = (plNo: string, skuMap: Record<string, number>) => {
    const rows = [
      `PICKING LIST: ${plNo}`,
      'STT\tMÃ SKU\tSỐ LƯỢNG (PCS)',
      ...Object.entries(skuMap).map(([sku, qty], idx) => `${idx + 1}\t${sku}\t${qty}`),
    ];
    handleCopyText(rows.join('\n'), `table_${plNo}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <ListFilter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Tổng Hợp SKU Theo Từng Picking List (Mã Đợt Nhặt Hàng)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Xem chính xác từng Picking List (VD: <span className="font-mono font-medium text-indigo-600">PL72608160015</span>, <span className="font-mono font-medium text-indigo-600">PL72608160016</span>...) gồm những SKU nào, số lượng bao nhiêu cái
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-gray-500 hidden sm:inline">
            Tổng cộng: <strong className="text-gray-900">{pickingListStats.length}</strong> Picking Lists
          </span>
          {onOpenPrintModal && (
            <button
              onClick={() => onOpenPrintModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="In hàng loạt từng Picking List ra khổ tem 100x150 mm"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>In Hàng Loạt (100×150)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left side list of PLs, Right side detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Cards / Danh sách các Picking List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Chọn Picking List ({filteredPlList.length})
              </h3>
              {activePlFilter && (
                <button
                  onClick={() => {
                    setActivePlFilter('');
                    onSelectPickingList('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline cursor-pointer"
                >
                  Bỏ chọn
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredPlList.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  Không tìm thấy Picking List nào
                </div>
              ) : (
                filteredPlList.map((item) => {
                  const isSelected = activePlFilter === item.pickingListNo;
                  const skuCount = Object.keys(item.skuMap).length;

                  return (
                    <div
                      key={item.pickingListNo}
                      onClick={() => {
                        setActivePlFilter(item.pickingListNo);
                        onSelectPickingList(item.pickingListNo);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-amber-500'}`}></span>
                          <span className="font-mono text-xs font-bold text-gray-900">
                            {item.pickingListNo}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {item.orders.length} đơn
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-500">
                        <span>
                          Gồm <strong className="text-gray-800">{skuCount}</strong> mã SKU
                        </span>
                        <span className="font-medium text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-md">
                          Tổng {item.totalPcs} PCS
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {Array.from(item.areas).map((area) => (
                          <span
                            key={area}
                            className="text-[9px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded border border-gray-200"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Chi tiết SKU và đơn hàng của Picking List đang chọn */}
        <div className="lg:col-span-8 space-y-6">
          {currentPl ? (
            <div className="space-y-6">
              {/* Header Box of Selected Picking List */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500">Đang xem chi tiết:</span>
                      <h3 className="text-base font-bold text-indigo-600 font-mono tracking-tight">
                        {currentPl.pickingListNo}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tổng hợp toàn bộ danh sách sản phẩm & số lượng cần lấy cho đợt nhặt này
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {onOpenPrintModal && (
                      <button
                        onClick={() => onOpenPrintModal(currentPl.pickingListNo)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        title="In tem nhặt hàng 100x150 mm cho Picking List này"
                      >
                        <Printer className="w-3.5 h-3.5 text-indigo-400" />
                        <span>In Tem 100×150</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleCopyPlSkuTable(currentPl.pickingListNo, currentPl.skuMap)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors cursor-pointer"
                    >
                      {copiedKey === `table_${currentPl.pickingListNo}` ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {copiedKey === `table_${currentPl.pickingListNo}` ? 'Đã sao chép' : 'Sao chép List SKU'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Metrics of Selected PL */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Số lượng đơn</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">{currentPl.orders.length} đơn</div>
                  </div>
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Số mã SKU khác nhau</div>
                    <div className="text-sm font-bold text-indigo-600 mt-0.5">
                      {Object.keys(currentPl.skuMap).length} mã
                    </div>
                  </div>
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Tổng sản phẩm (PCS)</div>
                    <div className="text-sm font-bold text-emerald-600 mt-0.5">{currentPl.totalPcs} cái</div>
                  </div>
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Loại đơn (1 PCS / MULTI)</div>
                    <div className="text-xs font-semibold text-gray-700 mt-0.5">
                      {currentPl.singlePcsCount} đơn 1 PCS | {currentPl.multiPcsCount} đơn Multi
                    </div>
                  </div>
                </div>
              </div>

              {/* SKU Breakdown Table */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Danh Sách SKU & Số Lượng Cần Lấy Cho {currentPl.pickingListNo}
                    </h4>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {Object.keys(currentPl.skuMap).length} mã SKU
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="py-2.5 px-3.5 w-12 text-center text-gray-400 font-normal">STT</th>
                        <th className="py-2.5 px-3.5">Mã SKU</th>
                        <th className="py-2.5 px-3.5">Khu Vực Kho</th>
                        <th className="py-2.5 px-3.5 text-center">Số Lượng Cần Lấy</th>
                        <th className="py-2.5 px-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {Object.entries(currentPl.skuMap).map(([sku, qty], idx) => {
                        const area = layNhomTuSKU(sku, skuGroups, DEFAULT_AREA_ORDER);
                        return (
                          <tr key={sku} className="hover:bg-gray-50/80 transition-colors">
                            <td className="py-2.5 px-3.5 text-center text-gray-400 text-[11px] font-sans">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3.5 font-bold text-gray-900">{sku}</td>
                            <td className="py-2.5 px-3.5 font-sans">
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-[11px] font-medium border border-gray-200">
                                {area}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-center">
                              <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {qty}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-sans">
                              <button
                                onClick={() => handleCopyText(sku, `sku_${sku}`)}
                                className="text-gray-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-gray-100 cursor-pointer"
                                title="Sao chép mã SKU"
                              >
                                {copiedKey === `sku_${sku}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50/90 font-semibold text-gray-900 border-t border-gray-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3.5 text-right text-xs uppercase font-sans">
                          Tổng cộng sản phẩm cần nhặt:
                        </td>
                        <td className="py-2.5 px-3.5 text-center text-sm font-bold text-emerald-600">
                          {currentPl.totalPcs} PCS
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Danh sách các đơn hàng thuộc Picking List này */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Danh Sách {currentPl.orders.length} Đơn Hàng Trong {currentPl.pickingListNo}
                    </h4>
                  </div>
                  <button
                    onClick={() => {
                      const orderList = currentPl.orders.map((o) => o.orderNo).join('\n');
                      handleCopyText(orderList, `orders_${currentPl.pickingListNo}`);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === `orders_${currentPl.pickingListNo}` ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>Copy tất cả Order No</span>
                  </button>
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                  {currentPl.orders.map((order, idx) => (
                    <div
                      key={order.id || idx}
                      className="p-3 bg-gray-50/70 border border-gray-200 rounded-xl flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gray-900">
                          <span>{order.orderNo}</span>
                          <button
                            onClick={() => handleCopyText(order.orderNo, `ord_${order.id}`)}
                            className="text-gray-400 hover:text-indigo-600 cursor-pointer"
                          >
                            {copiedKey === `ord_${order.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-600 font-medium">
                          {order.items.reduce((s, i) => s + i.qty, 0)} PCS
                        </span>
                      </div>

                      {order.trackingNo && (
                        <div className="text-[11px] text-gray-500 font-mono flex items-center justify-between">
                          <span>Track: {order.trackingNo}</span>
                        </div>
                      )}

                      <div className="space-y-1 bg-white p-2 rounded-lg border border-gray-100 text-[11px] font-mono">
                        {order.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-gray-700">
                            <span>{it.sku}</span>
                            <span className="font-bold text-indigo-600">x{it.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400">
              Vui lòng chọn một Picking List ở cột bên trái để xem chi tiết danh sách SKU & số lượng.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
