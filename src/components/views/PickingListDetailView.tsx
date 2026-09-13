import React, { useState, useMemo, useEffect } from 'react';
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
  Truck,
  Filter,
  X,
} from 'lucide-react';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../../types';
import { tinhTongHopSKU, layNhomTuSKU, CARRIER_CONFIG } from '../../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../../utils/skuData';

export interface PickingListDetailViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  onSelectPickingList: (pl: string) => void;
  searchTerm: string;
  selectedCarrier?: CarrierCode;
  onSelectCarrier?: (carrier: CarrierCode) => void;
  onOpenPrintModal?: (pl?: string) => void;
}

export const PickingListDetailView: React.FC<PickingListDetailViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  onSelectPickingList,
  searchTerm,
  selectedCarrier = 'ALL',
  onSelectCarrier,
  onOpenPrintModal,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activePlFilter, setActivePlFilter] = useState<string>(selectedPickingList || '');
  const [showOnlyCarrierLists, setShowOnlyCarrierLists] = useState<boolean>(true);
  const [viewScope, setViewScope] = useState<'CARRIER_ONLY' | 'ALL_ORDERS'>('CARRIER_ONLY');

  const carrierInfo = selectedCarrier !== 'ALL' ? CARRIER_CONFIG[selectedCarrier] : null;

  // Tự động điều chỉnh scope xem chi tiết khi đổi carrier
  useEffect(() => {
    if (selectedCarrier !== 'ALL') {
      setViewScope('CARRIER_ONLY');
      setShowOnlyCarrierLists(true);
    } else {
      setViewScope('ALL_ORDERS');
    }
  }, [selectedCarrier]);

  // 1. Thống kê toàn bộ Picking Lists có trong tập dữ liệu (kèm chi tiết theo ĐVVC)
  const pickingListStats = useMemo(() => {
    const map = new Map<
      string,
      {
        pickingListNo: string;
        orders: RawOrderRow[];
        carrierOrders: RawOrderRow[];
        carrierOrderCount: number;
        carrierCounts: Partial<Record<CarrierCode, number>>;
        skuMap: Record<string, number>;
        carrierSkuMap: Record<string, number>;
        totalPcs: number;
        carrierTotalPcs: number;
        singlePcsCount: number;
        multiPcsCount: number;
        carrierSinglePcsCount: number;
        carrierMultiPcsCount: number;
        areas: Set<string>;
        carrierAreas: Set<string>;
      }
    >();

    orders.forEach((order) => {
      const plKey = order.pickingList && order.pickingList.trim() !== '' ? order.pickingList.trim() : 'Chưa gán PL';
      if (!map.has(plKey)) {
        map.set(plKey, {
          pickingListNo: plKey,
          orders: [],
          carrierOrders: [],
          carrierOrderCount: 0,
          carrierCounts: {},
          skuMap: {},
          carrierSkuMap: {},
          totalPcs: 0,
          carrierTotalPcs: 0,
          singlePcsCount: 0,
          multiPcsCount: 0,
          carrierSinglePcsCount: 0,
          carrierMultiPcsCount: 0,
          areas: new Set<string>(),
          carrierAreas: new Set<string>(),
        });
      }

      const entry = map.get(plKey)!;
      entry.orders.push(order);
      entry.carrierCounts[order.carrier] = (entry.carrierCounts[order.carrier] || 0) + 1;

      const isCarrierMatch = !selectedCarrier || selectedCarrier === 'ALL' || order.carrier === selectedCarrier;
      if (isCarrierMatch) {
        entry.carrierOrders.push(order);
        entry.carrierOrderCount += 1;
      }

      let orderPcs = 0;
      order.items.forEach((item) => {
        entry.skuMap[item.sku] = (entry.skuMap[item.sku] || 0) + item.qty;
        entry.totalPcs += item.qty;
        orderPcs += item.qty;

        const area = layNhomTuSKU(item.sku, skuGroups, DEFAULT_AREA_ORDER);
        entry.areas.add(area);

        if (isCarrierMatch) {
          entry.carrierSkuMap[item.sku] = (entry.carrierSkuMap[item.sku] || 0) + item.qty;
          entry.carrierTotalPcs += item.qty;
          entry.carrierAreas.add(area);
        }
      });

      if (orderPcs === 1) {
        entry.singlePcsCount += 1;
        if (isCarrierMatch) entry.carrierSinglePcsCount += 1;
      } else {
        entry.multiPcsCount += 1;
        if (isCarrierMatch) entry.carrierMultiPcsCount += 1;
      }
    });

    const list = Array.from(map.values());
    // Sắp xếp: nếu đang lọc hãng, ưu tiên các list có đơn của hãng đó trước
    list.sort((a, b) => {
      if (selectedCarrier !== 'ALL') {
        if (b.carrierOrderCount !== a.carrierOrderCount) {
          return b.carrierOrderCount - a.carrierOrderCount;
        }
      }
      return a.pickingListNo.localeCompare(b.pickingListNo);
    });
    return list;
  }, [orders, skuGroups, selectedCarrier]);

  // Cập nhật khi props selectedPickingList thay đổi từ thanh công cụ
  useEffect(() => {
    if (selectedPickingList !== undefined && selectedPickingList !== '') {
      setActivePlFilter(selectedPickingList);
    }
  }, [selectedPickingList]);

  // Danh sách các Picking List có chứa đơn của ĐVVC đang chọn
  const listsWithCarrierCount = useMemo(() => {
    return pickingListStats.filter((item) => item.carrierOrderCount > 0).length;
  }, [pickingListStats]);

  // Lọc danh sách theo toggle ĐVVC và ô tìm kiếm
  const filteredPlList = useMemo(() => {
    let list = pickingListStats;

    // Nếu đang chọn ĐVVC cụ thể và bật toggle chỉ hiện list có đơn hãng đó
    if (selectedCarrier !== 'ALL' && showOnlyCarrierLists) {
      list = list.filter((item) => item.carrierOrderCount > 0);
    }

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter((item) => {
      const matchPl = item.pickingListNo.toLowerCase().includes(term);
      const matchSku = Object.keys(item.skuMap).some((sku) => sku.toLowerCase().includes(term));
      const matchOrder = item.orders.some(
        (o) => o.orderNo.toLowerCase().includes(term) || (o.trackingNo && o.trackingNo.toLowerCase().includes(term))
      );
      return matchPl || matchSku || matchOrder;
    });
  }, [pickingListStats, selectedCarrier, showOnlyCarrierLists, searchTerm]);

  // Tự động chọn PL đầu tiên nếu PL hiện tại không có trong danh sách lọc
  useEffect(() => {
    if (filteredPlList.length > 0) {
      const exists = filteredPlList.some((it) => it.pickingListNo === activePlFilter);
      if (!exists && activePlFilter !== '') {
        setActivePlFilter(filteredPlList[0].pickingListNo);
        onSelectPickingList(filteredPlList[0].pickingListNo);
      } else if (!activePlFilter && filteredPlList.length > 0) {
        setActivePlFilter(filteredPlList[0].pickingListNo);
        onSelectPickingList(filteredPlList[0].pickingListNo);
      }
    }
  }, [filteredPlList, activePlFilter, onSelectPickingList]);

  // Picking list đang được chọn xem chi tiết
  const currentPl = useMemo(() => {
    if (activePlFilter) {
      return pickingListStats.find((item) => item.pickingListNo === activePlFilter);
    }
    return filteredPlList[0] || pickingListStats[0] || null;
  }, [pickingListStats, filteredPlList, activePlFilter]);

  // Dữ liệu hiển thị trong panel chi tiết phụ thuộc vào viewScope
  const activeDetailData = useMemo(() => {
    if (!currentPl) return null;

    const isScopeCarrier = selectedCarrier !== 'ALL' && viewScope === 'CARRIER_ONLY';
    const displayedOrders = isScopeCarrier ? currentPl.carrierOrders : currentPl.orders;
    const displayedSkuMap = isScopeCarrier ? currentPl.carrierSkuMap : currentPl.skuMap;
    const displayedTotalPcs = isScopeCarrier ? currentPl.carrierTotalPcs : currentPl.totalPcs;
    const displayedSingleCount = isScopeCarrier ? currentPl.carrierSinglePcsCount : currentPl.singlePcsCount;
    const displayedMultiCount = isScopeCarrier ? currentPl.carrierMultiPcsCount : currentPl.multiPcsCount;

    return {
      isScopeCarrier,
      orders: displayedOrders,
      skuMap: displayedSkuMap,
      totalPcs: displayedTotalPcs,
      singlePcsCount: displayedSingleCount,
      multiPcsCount: displayedMultiCount,
    };
  }, [currentPl, selectedCarrier, viewScope]);

  const handleCopyText = (text: string, key: string, message?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (message) {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 2500);
    }
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyPlSkuTable = (plNo: string, skuMap: Record<string, number>, label = '') => {
    const rows = [
      `PICKING LIST: ${plNo} ${label ? `(${label})` : ''}`,
      'STT\tMÃ SKU\tSỐ LƯỢNG (PCS)',
      ...Object.entries(skuMap).map(([sku, qty], idx) => `${idx + 1}\t${sku}\t${qty}`),
    ];
    handleCopyText(rows.join('\n'), `table_${plNo}`, `Đã sao chép bảng SKU của ${plNo}`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <ListFilter className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-semibold text-gray-900">
                  Tổng Hợp SKU Theo Từng Picking List (Mã Đợt Nhặt Hàng)
                </h2>
                {selectedCarrier !== 'ALL' && carrierInfo && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${carrierInfo.badgeBg} ${carrierInfo.badgeText} ${carrierInfo.badgeBorder}`}>
                    <Truck className={`w-3.5 h-3.5 ${carrierInfo.iconColor}`} />
                    <span>Hãng: {carrierInfo.shortName} ({listsWithCarrierCount} lists có đơn)</span>
                    {onSelectCarrier && (
                      <button
                        onClick={() => onSelectCarrier('ALL')}
                        className="hover:opacity-75 ml-0.5 cursor-pointer"
                        title="Bỏ lọc hãng này để xem tất cả"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Xem chính xác từng Picking List gồm những SKU nào, số lượng bao nhiêu cái & sao chép mã đơn nhanh chóng theo từng list
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <span className="text-xs text-gray-500 hidden sm:inline">
            Hiển thị: <strong className="text-gray-900">{filteredPlList.length}</strong> / {pickingListStats.length} Picking Lists
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
            {/* Header sidebar */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <span>Chọn Picking List</span>
                <span className="text-indigo-600">({filteredPlList.length})</span>
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

            {/* Toggle filter carrier lists vs all lists when carrier is active */}
            {selectedCarrier !== 'ALL' && (
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-3 text-xs">
                <button
                  onClick={() => setShowOnlyCarrierLists(true)}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                    showOnlyCarrierLists
                      ? 'bg-white text-gray-900 shadow-xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title={`Chỉ hiển thị các Picking List có đơn hàng của ${carrierInfo?.shortName || selectedCarrier}`}
                >
                  Có đơn {carrierInfo?.shortName || selectedCarrier} ({listsWithCarrierCount})
                </button>
                <button
                  onClick={() => setShowOnlyCarrierLists(false)}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                    !showOnlyCarrierLists
                      ? 'bg-white text-gray-900 shadow-xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  title="Hiển thị tất cả các Picking List trong hệ thống"
                >
                  Tất cả list ({pickingListStats.length})
                </button>
              </div>
            )}

            <div className="space-y-2.5 max-h-[660px] overflow-y-auto pr-1">
              {filteredPlList.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  {selectedCarrier !== 'ALL'
                    ? `Không có Picking List nào chứa đơn của ${carrierInfo?.name || selectedCarrier}`
                    : 'Không tìm thấy Picking List nào'}
                </div>
              ) : (
                filteredPlList.map((item) => {
                  const isSelected = activePlFilter === item.pickingListNo;
                  const skuCount = selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                    ? Object.keys(item.carrierSkuMap).length
                    : Object.keys(item.skuMap).length;
                  const totalPcs = selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                    ? item.carrierTotalPcs
                    : item.totalPcs;

                  return (
                    <div
                      key={item.pickingListNo}
                      onClick={() => {
                        setActivePlFilter(item.pickingListNo);
                        onSelectPickingList(item.pickingListNo);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                      }`}
                    >
                      {/* Card Header: PL No & Badge số đơn */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              isSelected ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-amber-500'
                            }`}
                          ></span>
                          <span className="font-mono text-xs font-bold text-gray-900">
                            {item.pickingListNo}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Badge riêng cho ĐVVC nếu đang lọc */}
                          {selectedCarrier !== 'ALL' && carrierInfo ? (
                            <div className="flex items-center gap-1 text-right">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${carrierInfo.badgeBg} ${carrierInfo.badgeText} ${carrierInfo.badgeBorder}`}
                              >
                                {item.carrierOrderCount} đơn {carrierInfo.shortName}
                              </span>
                              <span className="text-[10px] text-gray-400">({item.orders.length})</span>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {item.orders.length} đơn
                            </span>
                          )}
                        </div>
                      </div>

                      {/* SKU & PCS Count */}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                        <span>
                          Gồm <strong className="text-gray-800">{skuCount}</strong> mã SKU
                        </span>
                        <span className="font-medium text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                          {totalPcs} PCS
                        </span>
                      </div>

                      {/* Khu vực kho */}
                      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                        {Array.from(item.areas).slice(0, 5).map((area) => (
                          <span
                            key={area}
                            className="text-[9px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded border border-gray-200 font-mono"
                          >
                            {area}
                          </span>
                        ))}
                        {item.areas.size > 5 && (
                          <span className="text-[9px] text-gray-400">+{item.areas.size - 5}</span>
                        )}
                      </div>

                      {/* Quick Copy Button trực tiếp ngay trên từng thẻ List */}
                      <div className="mt-2.5 pt-2 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetOrders =
                              selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                                ? item.carrierOrders
                                : item.orders;
                            const text = targetOrders.map((o) => o.orderNo).filter(Boolean).join('\n');
                            const label =
                              selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                                ? carrierInfo?.shortName || selectedCarrier
                                : 'List';
                            handleCopyText(
                              text,
                              `card_ord_${item.pickingListNo}`,
                              `Đã sao chép ${targetOrders.length} mã đơn ${label} của ${item.pickingListNo}`
                            );
                          }}
                          className={`w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                            copiedKey === `card_ord_${item.pickingListNo}`
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-gray-50 hover:bg-indigo-50 text-gray-700 hover:text-indigo-700 border-gray-200 hover:border-indigo-200'
                          }`}
                          title={`Sao chép toàn bộ mã đơn của ${item.pickingListNo}`}
                        >
                          {copiedKey === `card_ord_${item.pickingListNo}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Đã chép {selectedCarrier !== 'ALL' && item.carrierOrderCount > 0 ? item.carrierOrders.length : item.orders.length} mã đơn!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-gray-400 group-hover:text-indigo-600" />
                              <span>
                                {selectedCarrier !== 'ALL' && item.carrierOrderCount > 0
                                  ? `Copy ${item.carrierOrders.length} mã đơn ${carrierInfo?.shortName || ''}`
                                  : `Copy ${item.orders.length} mã đơn`}
                              </span>
                            </>
                          )}
                        </button>
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
          {currentPl && activeDetailData ? (
            <div className="space-y-6">
              {/* Header Box of Selected Picking List */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-500">Đang xem chi tiết:</span>
                      <h3 className="text-base font-bold text-indigo-600 font-mono tracking-tight">
                        {currentPl.pickingListNo}
                      </h3>
                      {selectedCarrier !== 'ALL' && carrierInfo && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${carrierInfo.badgeBg} ${carrierInfo.badgeText} ${carrierInfo.badgeBorder}`}>
                          {carrierInfo.shortName}: {currentPl.carrierOrderCount} đơn
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Tổng hợp toàn bộ danh sách sản phẩm & số lượng cần lấy cho đợt nhặt hàng này
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
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
                      onClick={() =>
                        handleCopyPlSkuTable(
                          currentPl.pickingListNo,
                          activeDetailData.skuMap,
                          activeDetailData.isScopeCarrier ? carrierInfo?.shortName || '' : 'Tất cả'
                        )
                      }
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

                {/* Hộp ĐVVC Nổi Bật & Các nút sao chép mã đơn nhanh cho ĐVVC này */}
                {selectedCarrier !== 'ALL' && carrierInfo && (
                  <div className={`mt-4 p-4 rounded-xl border ${carrierInfo.badgeBg} ${carrierInfo.badgeBorder} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/90 shadow-xs flex items-center justify-center shrink-0">
                        <Truck className={`w-5 h-5 ${carrierInfo.iconColor}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">
                            {carrierInfo.name}
                          </span>
                          <span className="text-xs font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                            {currentPl.carrierOrderCount} / {currentPl.orders.length} đơn
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {currentPl.carrierOrderCount > 0
                            ? `List này có ${currentPl.carrierOrderCount} đơn ${carrierInfo.shortName} (${currentPl.carrierTotalPcs} PCS sản phẩm)`
                            : `List này không có đơn hàng nào của ${carrierInfo.shortName}`}
                        </p>
                      </div>
                    </div>

                    {/* Quick Action Buttons for Carrier */}
                    {currentPl.carrierOrderCount > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const orderNos = currentPl.carrierOrders.map((o) => o.orderNo).filter(Boolean).join('\n');
                            handleCopyText(
                              orderNos,
                              `banner_ord_${currentPl.pickingListNo}`,
                              `Đã sao chép ${currentPl.carrierOrders.length} mã đơn ${carrierInfo.shortName} của ${currentPl.pickingListNo}!`
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          {copiedKey === `banner_ord_${currentPl.pickingListNo}` ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {copiedKey === `banner_ord_${currentPl.pickingListNo}`
                              ? `Đã sao chép ${currentPl.carrierOrders.length} mã!`
                              : `Sao chép ${currentPl.carrierOrders.length} Mã Đơn ${carrierInfo.shortName}`}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const trackingNos = currentPl.carrierOrders
                              .map((o) => o.trackingNo)
                              .filter(Boolean)
                              .join('\n');
                            handleCopyText(
                              trackingNos,
                              `banner_track_${currentPl.pickingListNo}`,
                              `Đã sao chép mã vận đơn (Tracking) ${carrierInfo.shortName} của ${currentPl.pickingListNo}!`
                            );
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold border border-gray-200 shadow-xs transition-colors cursor-pointer"
                        >
                          {copiedKey === `banner_track_${currentPl.pickingListNo}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-500" />
                          )}
                          <span>
                            {copiedKey === `banner_track_${currentPl.pickingListNo}`
                              ? 'Đã sao chép Tracking!'
                              : 'Sao chép Tracking'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Scope selector tabs: Carrier Only vs All Orders in PL */}
                {selectedCarrier !== 'ALL' && currentPl.carrierOrderCount > 0 && (
                  <div className="mt-4 flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs">
                      <button
                        onClick={() => setViewScope('CARRIER_ONLY')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          viewScope === 'CARRIER_ONLY'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Chỉ xem {carrierInfo?.shortName} ({currentPl.carrierOrderCount} đơn)
                      </button>
                      <button
                        onClick={() => setViewScope('ALL_ORDERS')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                          viewScope === 'ALL_ORDERS'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Xem toàn bộ {currentPl.orders.length} đơn trong List
                      </button>
                    </div>

                    <span className="text-xs text-gray-500 hidden sm:inline">
                      Đang xem: <strong>{activeDetailData.isScopeCarrier ? carrierInfo?.name : 'Toàn bộ đơn'}</strong>
                    </span>
                  </div>
                )}

                {/* Metrics of Selected PL (recalculated according to active scope) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Số lượng đơn</div>
                    <div className="text-sm font-bold text-gray-900 mt-0.5">
                      {activeDetailData.orders.length} đơn
                      {activeDetailData.isScopeCarrier && currentPl.orders.length !== activeDetailData.orders.length && (
                        <span className="text-[11px] font-normal text-gray-400 ml-1">
                          / {currentPl.orders.length} tổng
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Số mã SKU khác nhau</div>
                    <div className="text-sm font-bold text-indigo-600 mt-0.5">
                      {Object.keys(activeDetailData.skuMap).length} mã
                    </div>
                  </div>
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Tổng sản phẩm (PCS)</div>
                    <div className="text-sm font-bold text-emerald-600 mt-0.5">
                      {activeDetailData.totalPcs} cái
                    </div>
                  </div>
                  <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-100">
                    <div className="text-[10px] uppercase font-bold text-gray-400">Loại đơn (1 PCS / MULTI)</div>
                    <div className="text-xs font-semibold text-gray-700 mt-0.5">
                      {activeDetailData.singlePcsCount} đơn 1 PCS | {activeDetailData.multiPcsCount} đơn Multi
                    </div>
                  </div>
                </div>
              </div>

              {/* SKU Breakdown Table */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Danh Sách SKU & Số Lượng Cần Lấy ({activeDetailData.isScopeCarrier ? carrierInfo?.shortName : currentPl.pickingListNo})
                    </h4>
                  </div>
                  <span className="text-xs font-medium text-gray-500">
                    {Object.keys(activeDetailData.skuMap).length} mã SKU | Tổng {activeDetailData.totalPcs} PCS
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
                      {Object.keys(activeDetailData.skuMap).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-xs text-gray-400 font-sans">
                            Không có sản phẩm nào cho đợt lọc này
                          </td>
                        </tr>
                      ) : (
                        Object.entries(activeDetailData.skuMap).map(([sku, qty], idx) => {
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
                                  onClick={() => handleCopyText(sku, `sku_${sku}`, `Đã sao chép mã SKU ${sku}`)}
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
                        })
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50/90 font-semibold text-gray-900 border-t border-gray-200">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3.5 text-right text-xs uppercase font-sans">
                          Tổng cộng sản phẩm cần nhặt:
                        </td>
                        <td className="py-2.5 px-3.5 text-center text-sm font-bold text-emerald-600">
                          {activeDetailData.totalPcs} PCS
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Danh sách các đơn hàng thuộc Picking List này */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Danh Sách {activeDetailData.orders.length} Đơn Hàng Trong {currentPl.pickingListNo}
                      {activeDetailData.isScopeCarrier && ` (${carrierInfo?.shortName})`}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const orderList = activeDetailData.orders.map((o) => o.orderNo).filter(Boolean).join('\n');
                        handleCopyText(
                          orderList,
                          `orders_${currentPl.pickingListNo}`,
                          `Đã sao chép ${activeDetailData.orders.length} Order No!`
                        );
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200"
                    >
                      {copiedKey === `orders_${currentPl.pickingListNo}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copy {activeDetailData.orders.length} Order No</span>
                    </button>

                    <button
                      onClick={() => {
                        const trackingList = activeDetailData.orders
                          .map((o) => o.trackingNo)
                          .filter(Boolean)
                          .join('\n');
                        handleCopyText(
                          trackingList,
                          `trackings_${currentPl.pickingListNo}`,
                          `Đã sao chép Tracking No!`
                        );
                      }}
                      className="text-xs text-gray-600 hover:text-gray-900 font-medium inline-flex items-center gap-1 cursor-pointer bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200"
                    >
                      {copiedKey === `trackings_${currentPl.pickingListNo}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      <span>Copy Tracking</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto">
                  {activeDetailData.orders.length === 0 ? (
                    <div className="col-span-2 p-8 text-center text-xs text-gray-400">
                      Không có đơn hàng nào
                    </div>
                  ) : (
                    activeDetailData.orders.map((order, idx) => {
                      const cConfig = CARRIER_CONFIG[order.carrier] || CARRIER_CONFIG.OTHER;
                      return (
                        <div
                          key={order.id || idx}
                          className="p-3 bg-gray-50/70 border border-gray-200 rounded-xl flex flex-col justify-between gap-2 hover:border-indigo-200 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gray-900">
                              <span>{order.orderNo}</span>
                              <button
                                onClick={() =>
                                  handleCopyText(order.orderNo, `ord_${order.id}`, `Đã sao chép ${order.orderNo}`)
                                }
                                className="text-gray-400 hover:text-indigo-600 cursor-pointer p-0.5"
                                title="Sao chép Order No"
                              >
                                {copiedKey === `ord_${order.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${cConfig.badgeBg} ${cConfig.badgeText} ${cConfig.badgeBorder}`}
                              >
                                {cConfig.shortName}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-600 font-medium">
                                {order.items.reduce((s, i) => s + i.qty, 0)} PCS
                              </span>
                            </div>
                          </div>

                          {order.trackingNo && (
                            <div className="text-[11px] text-gray-500 font-mono flex items-center justify-between">
                              <span className="truncate">Track: {order.trackingNo}</span>
                              <button
                                onClick={() =>
                                  handleCopyText(
                                    order.trackingNo,
                                    `trk_${order.id}`,
                                    `Đã sao chép Tracking ${order.trackingNo}`
                                  )
                                }
                                className="text-gray-400 hover:text-indigo-600 cursor-pointer p-0.5 shrink-0"
                                title="Sao chép Tracking No"
                              >
                                {copiedKey === `trk_${order.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
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
                      );
                    })
                  )}
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
