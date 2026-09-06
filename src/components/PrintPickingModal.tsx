import React, { useState, useMemo } from 'react';
import {
  Printer,
  X,
  CheckSquare,
  Layers,
  MapPin,
  Truck,
  Barcode,
  Copy,
  Settings2,
  FileText,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Info,
  Check,
  Tag,
  ListOrdered,
  Calendar,
} from 'lucide-react';
import { RawOrderRow, SkuGroupsMap, CarrierCode } from '../types';
import { xuLyGopPCS, layNhomTuSKU, CARRIER_CONFIG, locDonHang } from '../utils/orderProcessor';
import { DEFAULT_AREA_ORDER } from '../utils/skuData';
import { BarcodeView } from './BarcodeView';

interface PrintPickingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: RawOrderRow[];
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  skuGroups: SkuGroupsMap;
}

type PaperSizeType = '100x150' | 'a4';
type PrintScopeType = 'current' | 'all_batch' | 'aggregate';
type FontSizeOption = 'normal' | 'large';

interface LabelPageData {
  pickingListNo: string;
  carrierLabel: string;
  ordersCount: number;
  totalPcs: number;
  skuCount: number;
  pcsSummary: Record<string, number>;
  skuList: { sku: string; qty: number; area: string }[];
  orders: RawOrderRow[];
  pageIndex: number;
  totalPages: number;
}

export const PrintPickingModal: React.FC<PrintPickingModalProps> = ({
  isOpen,
  onClose,
  orders,
  selectedPickingList,
  selectedCarrier = 'ALL',
  skuGroups,
}) => {
  // 1. Cấu hình in
  const [paperSize, setPaperSize] = useState<PaperSizeType>('100x150');
  const [printScope, setPrintScope] = useState<PrintScopeType>(
    selectedPickingList ? 'current' : 'all_batch'
  );
  const [showBarcode, setShowBarcode] = useState<boolean>(true);
  const [showWarehouseArea, setShowWarehouseArea] = useState<boolean>(true);
  const [showOrderList, setShowOrderList] = useState<boolean>(false);
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<FontSizeOption>('normal');
  const [activePickingList, setActivePickingList] = useState<string>(selectedPickingList || '');
  const [selectedBatchPls, setSelectedBatchPls] = useState<Set<string>>(new Set());
  const [previewPageIndex, setPreviewPageIndex] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Khi modal mở ra, đồng bộ lại picking list đang chọn
  React.useEffect(() => {
    if (selectedPickingList) {
      setActivePickingList(selectedPickingList);
      setPrintScope('current');
    } else {
      setPrintScope('all_batch');
    }
  }, [selectedPickingList, isOpen]);

  // Lọc tập dữ liệu theo ĐVVC (nếu có lọc)
  const carrierFilteredOrders = useMemo(() => {
    return locDonHang(orders, '', selectedCarrier);
  }, [orders, selectedCarrier]);

  // Danh sách các Picking List có trong tập dữ liệu
  const allPickingLists = useMemo(() => {
    const map = new Map<string, RawOrderRow[]>();
    carrierFilteredOrders.forEach((o) => {
      const pl = o.pickingList && o.pickingList.trim() !== '' ? o.pickingList.trim() : 'Chưa gán PL';
      if (!map.has(pl)) {
        map.set(pl, []);
      }
      map.get(pl)!.push(o);
    });
    return Array.from(map.entries())
      .map(([plNo, ords]) => ({ plNo, orders: ords }))
      .sort((a, b) => a.plNo.localeCompare(b.plNo));
  }, [carrierFilteredOrders]);

  // Khởi tạo danh sách chọn hàng loạt mặc định là tất cả
  React.useEffect(() => {
    if (allPickingLists.length > 0 && selectedBatchPls.size === 0) {
      setSelectedBatchPls(new Set(allPickingLists.map((p) => p.plNo)));
    }
  }, [allPickingLists]);

  // Tên ĐVVC hiển thị
  const carrierDisplayName = useMemo(() => {
    if (selectedCarrier === 'ALL') return 'TẤT CẢ ĐVVC';
    return CARRIER_CONFIG[selectedCarrier]?.shortName || selectedCarrier;
  }, [selectedCarrier]);

  // Số lượng SKU tối đa trên 1 tem 100x150 mm trước khi ngắt trang
  const MAX_SKU_PER_LABEL = fontSize === 'large' ? 12 : 16;

  // Tính toán danh sách các trang nhãn (Labels) cần in
  const labelPages: LabelPageData[] = useMemo(() => {
    const pages: LabelPageData[] = [];

    // Helper tạo cấu trúc nhãn từ 1 tập đơn hàng
    const buildLabelPagesForOrders = (plNo: string, ords: RawOrderRow[]) => {
      const skuMap: Record<string, number> = {};
      const pcsMap: Record<string, number> = { '1 PCS': 0, '2 PCS': 0, 'Multi': 0 };

      ords.forEach((ord) => {
        let orderQty = 0;
        ord.items.forEach((item) => {
          skuMap[item.sku] = (skuMap[item.sku] || 0) + item.qty;
          orderQty += item.qty;
        });

        if (orderQty === 1) pcsMap['1 PCS'] = (pcsMap['1 PCS'] || 0) + 1;
        else if (orderQty === 2) pcsMap['2 PCS'] = (pcsMap['2 PCS'] || 0) + 1;
        else pcsMap['Multi'] = (pcsMap['Multi'] || 0) + 1;
      });

      const fullSkuList = Object.entries(skuMap)
        .map(([sku, qty]) => ({
          sku,
          qty,
          area: layNhomTuSKU(sku, skuGroups, DEFAULT_AREA_ORDER),
        }))
        .sort((a, b) => {
          if (a.area !== b.area) return a.area.localeCompare(b.area);
          return a.sku.localeCompare(b.sku);
        });

      const totalPcs = fullSkuList.reduce((sum, item) => sum + item.qty, 0);

      // Nếu số SKU dài hơn 1 tem ở khổ 100x150, tự động phân trang tem 1/2, 2/2
      if (paperSize === '100x150' && fullSkuList.length > MAX_SKU_PER_LABEL) {
        const totalPageCount = Math.ceil(fullSkuList.length / MAX_SKU_PER_LABEL);
        for (let i = 0; i < totalPageCount; i++) {
          const slice = fullSkuList.slice(i * MAX_SKU_PER_LABEL, (i + 1) * MAX_SKU_PER_LABEL);
          pages.push({
            pickingListNo: plNo,
            carrierLabel: carrierDisplayName,
            ordersCount: ords.length,
            totalPcs,
            skuCount: fullSkuList.length,
            pcsSummary: pcsMap,
            skuList: slice,
            orders: ords,
            pageIndex: i + 1,
            totalPages: totalPageCount,
          });
        }
      } else {
        pages.push({
          pickingListNo: plNo,
          carrierLabel: carrierDisplayName,
          ordersCount: ords.length,
          totalPcs,
          skuCount: fullSkuList.length,
          pcsSummary: pcsMap,
          skuList: fullSkuList,
          orders: ords,
          pageIndex: 1,
          totalPages: 1,
        });
      }
    };

    if (printScope === 'current') {
      const targetPl = activePickingList || allPickingLists[0]?.plNo || 'TẤT CẢ';
      const plOrders = carrierFilteredOrders.filter((o) => {
        const pl = o.pickingList && o.pickingList.trim() !== '' ? o.pickingList.trim() : 'Chưa gán PL';
        return pl === targetPl;
      });
      buildLabelPagesForOrders(targetPl, plOrders.length > 0 ? plOrders : carrierFilteredOrders);
    } else if (printScope === 'all_batch') {
      // In hàng loạt từng Picking List đã chọn
      allPickingLists.forEach(({ plNo, orders: plOrds }) => {
        if (selectedBatchPls.has(plNo)) {
          buildLabelPagesForOrders(plNo, plOrds);
        }
      });
    } else if (printScope === 'aggregate') {
      // In tổng hợp toàn bộ các đơn hàng đã lọc
      buildLabelPagesForOrders('TỔNG HỢP GOM HÀNG', carrierFilteredOrders);
    }

    return pages;
  }, [
    printScope,
    activePickingList,
    allPickingLists,
    selectedBatchPls,
    carrierFilteredOrders,
    skuGroups,
    carrierDisplayName,
    paperSize,
    MAX_SKU_PER_LABEL,
  ]);

  // Đảm bảo previewPageIndex không vượt quá giới hạn
  React.useEffect(() => {
    if (previewPageIndex >= labelPages.length && labelPages.length > 0) {
      setPreviewPageIndex(0);
    }
  }, [labelPages.length, previewPageIndex]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleSelectAllBatchPls = () => {
    if (selectedBatchPls.size === allPickingLists.length) {
      setSelectedBatchPls(new Set());
    } else {
      setSelectedBatchPls(new Set(allPickingLists.map((p) => p.plNo)));
    }
  };

  const toggleBatchPl = (plNo: string) => {
    const next = new Set(selectedBatchPls);
    if (next.has(plNo)) {
      next.delete(plNo);
    } else {
      next.add(plNo);
    }
    setSelectedBatchPls(next);
  };

  if (!isOpen) return null;

  const currentPreviewLabel = labelPages[previewPageIndex] || labelPages[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      {/* Dynamic Print Styles for 100x150 mm vs A4 */}
      <style>{`
        @media print {
          @page {
            size: ${paperSize === '100x150' ? '100mm 150mm' : 'A4 portrait'};
            margin: ${paperSize === '100x150' ? '2mm 3mm' : '8mm'};
          }
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Ẩn mọi giao diện trừ container in */
          body * {
            visibility: hidden;
          }
          .printable-root, .printable-root * {
            visibility: visible;
          }
          .printable-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .label-page-container {
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 auto !important;
          }
        }
      `}</style>

      {/* Main Dialog Container */}
      <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        {/* Top Controls Header (Hidden in Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-white">In Phiếu Nhặt Hàng Kho</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white border border-indigo-400">
                  {paperSize === '100x150' ? 'Khổ 100×150 mm' : 'Khổ A4'}
                </span>
                <span className="text-xs text-slate-300 hidden sm:inline">
                  (Tổng {labelPages.length} tem in)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tối ưu hóa máy in nhiệt tem dán vận đơn (Xprinter, HPRT, 4×6 inch) hoặc in giấy A4
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              title="Bấm để mở hộp thoại in của trình duyệt (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay ({labelPages.length} tem)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Cấu Hình Khổ In & Chế Độ (Hidden in Print) */}
        <div className="p-3.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
          {/* Group 1: Chọn Khổ Giấy (100x150 mm vs A4) */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 px-2">Khổ Giấy:</span>
            <button
              onClick={() => setPaperSize('100x150')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                paperSize === '100x150'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Tem Nhiệt 100×150 mm (4×6")</span>
            </button>
            <button
              onClick={() => setPaperSize('a4')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                paperSize === 'a4'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Khổ A4 Văn Phòng</span>
            </button>
          </div>

          {/* Group 2: Phạm Vi In */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 px-2">Chế Độ In:</span>
            <button
              onClick={() => setPrintScope('current')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                printScope === 'current'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="Chỉ in Picking List đang chọn"
            >
              <span>List Hiện Tại</span>
              {activePickingList && (
                <span className="font-mono text-[10px] opacity-80 underline ml-0.5">
                  ({activePickingList})
                </span>
              )}
            </button>

            <button
              onClick={() => setPrintScope('all_batch')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                printScope === 'all_batch'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="In hàng loạt từng Picking List (Mỗi list là 1 tem riêng)"
            >
              <span>In Hàng Loạt Các List</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold ml-0.5">
                {selectedBatchPls.size}
              </span>
            </button>

            <button
              onClick={() => setPrintScope('aggregate')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                printScope === 'aggregate'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title="In phiếu tổng hợp gộp tất cả đơn hàng"
            >
              Tổng Hợp Gom Chung
            </button>
          </div>

          {/* Group 3: Tùy Chọn Chi Tiết */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer shadow-2xs">
              <input
                type="checkbox"
                checked={showBarcode}
                onChange={(e) => setShowBarcode(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[11px]">Mã Vạch Barcode</span>
            </label>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer shadow-2xs">
              <input
                type="checkbox"
                checked={showWarehouseArea}
                onChange={(e) => setShowWarehouseArea(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[11px]">Khu Vực Kho</span>
            </label>

            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer shadow-2xs">
              <input
                type="checkbox"
                checked={showOrderList}
                onChange={(e) => setShowOrderList(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[11px]">Kèm Mã Đơn (Order No)</span>
            </label>

            <div className="flex items-center bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
              <button
                onClick={() => setFontSize('normal')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  fontSize === 'normal' ? 'bg-slate-800 text-white' : 'text-slate-600'
                }`}
                title="Cỡ chữ tiêu chuẩn (chứa được nhiều SKU)"
              >
                Chữ Vừa
              </button>
              <button
                onClick={() => setFontSize('large')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  fontSize === 'large' ? 'bg-slate-800 text-white' : 'text-slate-600'
                }`}
                title="Cỡ chữ lớn (dễ đọc trong kho)"
              >
                Chữ To
              </button>
            </div>
          </div>
        </div>

        {/* Modal Main Area: Left selector (if batch or pick) & Right preview */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row print:overflow-visible print:block">
          {/* Sub-Sidebar: Danh sách chọn Picking List (Chỉ hiện khi ở chế độ all_batch hoặc current) */}
          {printScope !== 'aggregate' && allPickingLists.length > 1 && (
            <div className="w-full lg:w-72 bg-slate-50 border-r border-slate-200 p-3.5 overflow-y-auto max-h-[220px] lg:max-h-none shrink-0 print:hidden">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {printScope === 'all_batch' ? 'Chọn List Cần In' : 'Chọn Picking List'}
                </span>
                {printScope === 'all_batch' && (
                  <button
                    onClick={toggleSelectAllBatchPls}
                    className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    {selectedBatchPls.size === allPickingLists.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {allPickingLists.map(({ plNo, orders: plOrds }) => {
                  const isChecked = selectedBatchPls.has(plNo);
                  const isCurrentActive = activePickingList === plNo;

                  return (
                    <div
                      key={plNo}
                      onClick={() => {
                        if (printScope === 'all_batch') {
                          toggleBatchPl(plNo);
                        } else {
                          setActivePickingList(plNo);
                        }
                      }}
                      className={`p-2 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        printScope === 'all_batch'
                          ? isChecked
                            ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          : isCurrentActive
                          ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {printScope === 'all_batch' && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-indigo-600 w-3.5 h-3.5 cursor-pointer"
                          />
                        )}
                        <span className="font-mono truncate">{plNo}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          printScope === 'current' && isCurrentActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {plOrds.length}đ
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Area: Preview Workspace */}
          <div className="flex-1 bg-slate-200/90 p-4 sm:p-8 flex flex-col items-center justify-start overflow-y-auto print:bg-white print:p-0 print:block">
            {/* Header info bar inside preview */}
            <div className="w-full max-w-2xl mb-4 bg-white/95 rounded-2xl p-3 shadow-xs border border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">
                  {paperSize === '100x150' ? '🏷️ Xem Trước Tem Nhiệt (100mm × 150mm)' : '📄 Xem Trước Khổ A4'}
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-600 font-medium">
                  Trang {previewPageIndex + 1} / {labelPages.length || 1}
                </span>
              </div>

              {labelPages.length > 1 && (
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                    disabled={previewPageIndex === 0}
                    className="p-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    title="Tem trước"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-800 text-[11px]">
                    {previewPageIndex + 1}/{labelPages.length}
                  </span>
                  <button
                    onClick={() => setPreviewPageIndex((p) => Math.min(labelPages.length - 1, p + 1))}
                    disabled={previewPageIndex >= labelPages.length - 1}
                    className="p-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    title="Tem tiếp theo"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              )}
            </div>

            {/* In Hàng Loạt hoặc In Đơn: Container chứa các tem nhãn */}
            <div className="printable-root w-full flex flex-col items-center gap-8 print:gap-0 print:block">
              {labelPages.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl text-center text-slate-500 shadow-lg max-w-md">
                  <Info className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                  <p className="font-bold text-slate-800 mb-1">Không có dữ liệu nhặt hàng để in</p>
                  <p className="text-xs text-slate-500">
                    Vui lòng kiểm tra lại bộ lọc Picking List hoặc Đơn Vị Vận Chuyển.
                  </p>
                </div>
              ) : (
                labelPages.map((label, idx) => {
                  // Ở chế độ xem trước trên màn hình máy tính (screen), chỉ hiển thị tem đang được chọn (previewPageIndex)
                  // Nhưng khi in (print), CSS sẽ in tất cả các tem liên tục!
                  const isVisibleOnScreen = idx === previewPageIndex;

                  return (
                    <div
                      key={`${label.pickingListNo}_${label.pageIndex}_${idx}`}
                      className={`label-page-container ${
                        isVisibleOnScreen ? 'block' : 'hidden print:block'
                      }`}
                    >
                      {/* BẢN TEM NHÃN 100x150 MM HOẶC A4 */}
                      <div
                        style={{
                          width: paperSize === '100x150' ? '100mm' : '210mm',
                          minHeight: paperSize === '100x150' ? '148mm' : '297mm',
                          maxHeight: paperSize === '100x150' ? '150mm' : 'auto',
                          boxSizing: 'border-box',
                        }}
                        className={`bg-white text-black font-sans shadow-xl print:shadow-none border border-black/80 print:border-black overflow-hidden flex flex-col justify-between ${
                          paperSize === '100x150'
                            ? 'p-[3mm] text-[11px] leading-tight rounded-sm'
                            : 'p-[10mm] text-xs rounded-none'
                        }`}
                      >
                        {/* 1. Header Khổ In: Tiêu Đề + Mã Picking List + Barcode */}
                        <div className="border-b-2 border-black pb-1 mb-1.5 shrink-0">
                          <div className="flex items-center justify-between border-b border-black/60 pb-1">
                            <span className="font-black text-[11px] uppercase tracking-wider">
                              PHIẾU NHẶT HÀNG KHO
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-black text-white rounded-xs">
                                {label.carrierLabel}
                              </span>
                              {label.totalPages > 1 && (
                                <span className="text-[10px] font-black border border-black px-1 rounded-xs">
                                  Trang {label.pageIndex}/{label.totalPages}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Mã Picking List Rất To */}
                          <div className="mt-1 text-center">
                            <div className="text-[9px] font-bold uppercase text-neutral-600">
                              MÃ PICKING LIST (ĐỢT NHẶT)
                            </div>
                            <div className="font-mono font-black text-lg sm:text-xl tracking-tight leading-none my-0.5">
                              {label.pickingListNo}
                            </div>

                            {/* Mã Vạch Barcode Code 128 Chuẩn Sắc Nét */}
                            {showBarcode && (
                              <div className="flex justify-center my-1">
                                <BarcodeView
                                  value={label.pickingListNo}
                                  height={paperSize === '100x150' ? 26 : 38}
                                  barWidth={paperSize === '100x150' ? 1.4 : 1.8}
                                  showText={false}
                                />
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[9px] text-neutral-600 pt-0.5">
                              <span>Ngày in: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN')}</span>
                              <span>In từ Warehouse.matrix</span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Thống Kê Nhanh (KPI Gom Hàng) */}
                        <div className="grid grid-cols-3 gap-1 border border-black p-1 text-center bg-neutral-100/60 mb-1.5 shrink-0">
                          <div className="border-r border-black/40 pr-1">
                            <div className="text-[8px] uppercase font-bold text-neutral-600">Tổng Đơn</div>
                            <div className="font-black text-xs sm:text-sm">{label.ordersCount} đơn</div>
                          </div>
                          <div className="border-r border-black/40 pr-1">
                            <div className="text-[8px] uppercase font-bold text-neutral-600">Mã SKU</div>
                            <div className="font-black text-xs sm:text-sm">{label.skuCount} mã</div>
                          </div>
                          <div>
                            <div className="text-[8px] uppercase font-bold text-neutral-600">Tổng PCS</div>
                            <div className="font-black text-xs sm:text-sm text-black underline">
                              {label.totalPcs} cái
                            </div>
                          </div>
                        </div>

                        {/* Phân bổ đơn theo PCS gọn gàng */}
                        <div className="flex items-center justify-between text-[9px] font-bold border-b border-black/60 pb-1 mb-1.5 px-0.5 shrink-0">
                          <span>Phân loại:</span>
                          <span>1 PCS: <strong>{label.pcsSummary['1 PCS'] || 0}đ</strong></span>
                          <span>2 PCS: <strong>{label.pcsSummary['2 PCS'] || 0}đ</strong></span>
                          <span>Multi/MIX: <strong>{label.pcsSummary['Multi'] || 0}đ</strong></span>
                        </div>

                        {/* 3. Bảng Danh Sách SKU Cần Nhặt */}
                        <div className="flex-1 overflow-hidden">
                          <table className="w-full border-collapse border border-black text-black">
                            <thead>
                              <tr className="bg-black text-white text-[9px] font-black uppercase">
                                <th className="border border-black py-1 px-1 w-6 text-center">STT</th>
                                {showWarehouseArea && (
                                  <th className="border border-black py-1 px-1 w-14 text-center">KỆ/KV</th>
                                )}
                                <th className="border border-black py-1 px-1.5 text-left">MÃ SKU</th>
                                <th className="border border-black py-1 px-1 w-14 text-center">SL</th>
                                <th className="border border-black py-1 px-1 w-8 text-center">[✓]</th>
                              </tr>
                            </thead>
                            <tbody>
                              {label.skuList.map((item, rowIdx) => {
                                const stt =
                                  (label.pageIndex - 1) * MAX_SKU_PER_LABEL + rowIdx + 1;

                                return (
                                  <tr
                                    key={item.sku}
                                    className="border-b border-black/80 hover:bg-neutral-50"
                                  >
                                    <td className="border-r border-black p-0.5 text-center font-mono text-[9px] font-bold">
                                      {stt}
                                    </td>
                                    {showWarehouseArea && (
                                      <td className="border-r border-black p-0.5 text-center font-bold text-[9px] truncate max-w-[55px]">
                                        {item.area}
                                      </td>
                                    )}
                                    <td
                                      className={`border-r border-black p-0.5 font-mono font-black truncate max-w-[130px] ${
                                        fontSize === 'large' ? 'text-[11px]' : 'text-[10px]'
                                      }`}
                                    >
                                      {item.sku}
                                    </td>
                                    <td className="border-r border-black p-0.5 text-center font-mono font-black text-[12px] sm:text-[13px]">
                                      {item.qty}
                                    </td>
                                    <td className="p-0.5 text-center">
                                      {/* Ô tích kiểm bút chì/bi to rõ */}
                                      <div className="w-4 h-4 border-2 border-black rounded-xs mx-auto"></div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* 4. Danh Sách Order No (Nếu bật tùy chọn) */}
                        {showOrderList && (
                          <div className="mt-1 p-1 bg-neutral-50 border border-black/60 rounded-xs text-[8px] font-mono leading-tight max-h-16 overflow-hidden">
                            <div className="font-bold uppercase text-[7px] text-neutral-600 mb-0.5">
                              DANH SÁCH MÃ ĐƠN ({label.orders.length} ĐƠN):
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {label.orders.map((o) => (
                                <span key={o.id || o.orderNo} className="border border-neutral-300 px-0.5">
                                  {o.orderNo}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 5. Chân Tem & Chữ Ký Xác Nhận */}
                        {showSignatures && (
                          <div className="border-t border-black pt-1 mt-1 shrink-0">
                            <div className="grid grid-cols-2 text-center text-[9px] font-bold">
                              <div>
                                <span>Người Nhặt Hàng</span>
                                <div className="h-6"></div>
                                <span className="text-[8px] text-neutral-500 font-normal">
                                  (Ký, ghi họ tên)
                                </span>
                              </div>
                              <div>
                                <span>Người Kiểm & Gói</span>
                                <div className="h-6"></div>
                                <span className="text-[8px] text-neutral-500 font-normal">
                                  (Ký, ghi họ tên)
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Footer nhỏ định danh khổ giấy */}
                        <div className="text-[7px] text-neutral-400 text-center pt-0.5">
                          Khổ tem: 100mm × 150mm • Máy in nhiệt vận đơn
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Hướng Dẫn Cài Đặt In (Hidden in Print) */}
            <div className="w-full max-w-2xl mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 shadow-xs print:hidden">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Mẹo cài đặt khi in tem nhiệt 100×150 mm (4×6 inch):</div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                    <li>
                      Tại hộp thoại in của trình duyệt (Ctrl+P): Mục <strong>Đích (Destination)</strong> chọn máy in nhiệt của bạn (vd: Xprinter XP-420B, XP-470B, HPRT...).
                    </li>
                    <li>
                      Mục <strong>Khổ giấy (Paper size)</strong>: Chọn <strong>100×150 mm</strong> hoặc <strong>4×6 in</strong>.
                    </li>
                    <li>
                      Mục <strong>Tỷ lệ (Scale)</strong>: Chọn <strong>Vừa với trang in (Fit to printable area)</strong> hoặc <strong>100%</strong>.
                    </li>
                    <li>
                      Mục <strong>Lề (Margins)</strong>: Chọn <strong>Tối thiểu (Minimum)</strong> hoặc <strong>Không có (None)</strong>.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
