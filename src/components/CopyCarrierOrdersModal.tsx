import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Truck,
  Filter,
  Layers,
  FileText,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { RawOrderRow, CarrierCode } from '../types';
import { CARRIER_CONFIG } from '../utils/orderProcessor';

interface CopyCarrierOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: RawOrderRow[];
  selectedPickingList?: string;
  initialCarrier?: CarrierCode;
}

type CopyFieldType = 'orderNo' | 'trackingNo' | 'both' | 'detailed';
type SeparatorType = 'newline' | 'comma' | 'semicolon' | 'space';

export const CopyCarrierOrdersModal: React.FC<CopyCarrierOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  selectedPickingList = '',
  initialCarrier = 'ALL',
}) => {
  const [activeCarrier, setActiveCarrier] = useState<CarrierCode>(initialCarrier);
  const [copyField, setCopyField] = useState<CopyFieldType>('orderNo');
  const [separator, setSeparator] = useState<SeparatorType>('newline');
  const [copiedMain, setCopiedMain] = useState<boolean>(false);
  const [quickCopiedKey, setQuickCopiedKey] = useState<string | null>(null);

  // Filter orders by picking list if active
  const baseOrders = useMemo(() => {
    if (!selectedPickingList) return orders;
    return orders.filter((o) => o.pickingList === selectedPickingList);
  }, [orders, selectedPickingList]);

  // Carrier groups
  const carrierMap = useMemo(() => {
    const map: Record<CarrierCode, RawOrderRow[]> = {
      ALL: baseOrders,
      JNT: [],
      SPX: [],
      GHN: [],
      GHN_TIKTOK: [],
      VNPOST: [],
      VIETTELPOST: [],
      OTHER: [],
    };

    baseOrders.forEach((o) => {
      const c = o.carrier || 'OTHER';
      if (map[c]) {
        map[c].push(o);
      } else {
        map.OTHER.push(o);
      }
    });

    return map;
  }, [baseOrders]);

  const carrierListConfig: {
    code: CarrierCode;
    label: string;
    shortName: string;
    prefixHint: string;
    activeBorder: string;
    activeBg: string;
    activeText: string;
    pillBg: string;
    pillText: string;
  }[] = [
    {
      code: 'ALL',
      label: 'Tất Cả ĐVVC',
      shortName: 'Tất Cả',
      prefixHint: 'Toàn bộ đơn',
      activeBorder: 'border-indigo-600 ring-2 ring-indigo-200',
      activeBg: 'bg-indigo-600 text-white',
      activeText: 'text-indigo-700',
      pillBg: 'bg-indigo-50',
      pillText: 'text-indigo-700',
    },
    {
      code: 'JNT',
      label: 'J&T (Cargo)',
      shortName: 'J&T',
      prefixHint: '862, 530...',
      activeBorder: 'border-red-600 ring-2 ring-red-200',
      activeBg: 'bg-red-600 text-white',
      activeText: 'text-red-700',
      pillBg: 'bg-red-50',
      pillText: 'text-red-700',
    },
    {
      code: 'SPX',
      label: 'Shopee Express',
      shortName: 'SPX',
      prefixHint: 'SPX, SPXVN...',
      activeBorder: 'border-orange-500 ring-2 ring-orange-200',
      activeBg: 'bg-orange-500 text-white',
      activeText: 'text-orange-700',
      pillBg: 'bg-orange-50',
      pillText: 'text-orange-700',
    },
    {
      code: 'GHN',
      label: 'Giao Hàng Nhanh',
      shortName: 'GHN',
      prefixHint: 'GY, GHN...',
      activeBorder: 'border-blue-600 ring-2 ring-blue-200',
      activeBg: 'bg-blue-600 text-white',
      activeText: 'text-blue-700',
      pillBg: 'bg-blue-50',
      pillText: 'text-blue-700',
    },
    {
      code: 'GHN_TIKTOK',
      label: 'GHN TikTok',
      shortName: 'GHN TikTok',
      prefixHint: 'VNGH...',
      activeBorder: 'border-cyan-600 ring-2 ring-cyan-200',
      activeBg: 'bg-cyan-600 text-white',
      activeText: 'text-cyan-800',
      pillBg: 'bg-cyan-50',
      pillText: 'text-cyan-800',
    },
    {
      code: 'VNPOST',
      label: 'VNPost / EMS',
      shortName: 'VNPost',
      prefixHint: 'EA, EB...',
      activeBorder: 'border-amber-600 ring-2 ring-amber-200',
      activeBg: 'bg-amber-600 text-white',
      activeText: 'text-amber-800',
      pillBg: 'bg-amber-50',
      pillText: 'text-amber-800',
    },
    {
      code: 'VIETTELPOST',
      label: 'Viettel Post',
      shortName: 'VTP',
      prefixHint: 'VTP, VT...',
      activeBorder: 'border-emerald-600 ring-2 ring-emerald-200',
      activeBg: 'bg-emerald-600 text-white',
      activeText: 'text-emerald-700',
      pillBg: 'bg-emerald-50',
      pillText: 'text-emerald-700',
    },
    {
      code: 'OTHER',
      label: 'Khác / Chưa Rõ',
      shortName: 'Khác',
      prefixHint: 'ĐVVC khác',
      activeBorder: 'border-slate-700 ring-2 ring-slate-200',
      activeBg: 'bg-slate-700 text-white',
      activeText: 'text-slate-700',
      pillBg: 'bg-slate-100',
      pillText: 'text-slate-700',
    },
  ];

  // Active list of orders
  const currentOrders = useMemo(() => {
    return carrierMap[activeCarrier] || [];
  }, [carrierMap, activeCarrier]);

  // Build formatted text
  const formattedText = useMemo(() => {
    if (currentOrders.length === 0) return '';

    const sepChar =
      separator === 'newline'
        ? '\n'
        : separator === 'comma'
        ? ', '
        : separator === 'semicolon'
        ? '; '
        : ' ';

    if (copyField === 'orderNo') {
      return currentOrders
        .map((o) => o.orderNo)
        .filter(Boolean)
        .join(sepChar);
    }

    if (copyField === 'trackingNo') {
      return currentOrders
        .map((o) => o.trackingNo)
        .filter(Boolean)
        .join(sepChar);
    }

    if (copyField === 'both') {
      return currentOrders
        .map((o) => `${o.orderNo}\t${o.trackingNo || ''}`)
        .join('\n');
    }

    // detailed
    return currentOrders
      .map(
        (o) =>
          `${o.orderNo}\t${o.trackingNo || ''}\t${o.carrierName || o.carrier}\t${o.totalQty} PCS\t${o.items.map((i) => `${i.sku}*${i.qty}`).join(',')}`
      )
      .join('\n');
  }, [currentOrders, copyField, separator]);

  if (!isOpen) return null;

  // Copy handler for main preview
  const handleCopyMain = () => {
    if (!formattedText) return;
    navigator.clipboard.writeText(formattedText);
    setCopiedMain(true);
    setTimeout(() => setCopiedMain(false), 2000);
  };

  // Quick 1-click copy for specific carrier
  const handleQuickCopy = (
    cCode: CarrierCode,
    field: 'orderNo' | 'trackingNo',
    label: string
  ) => {
    const list = carrierMap[cCode] || [];
    if (list.length === 0) return;

    const text =
      field === 'orderNo'
        ? list.map((o) => o.orderNo).filter(Boolean).join('\n')
        : list.map((o) => o.trackingNo).filter(Boolean).join('\n');

    navigator.clipboard.writeText(text);
    const key = `${cCode}_${field}`;
    setQuickCopiedKey(key);
    setTimeout(() => setQuickCopiedKey(null), 2000);
  };

  // Download .txt file
  const handleDownloadTxt = () => {
    if (!formattedText) return;
    const blob = new Blob([formattedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh_sach_don_${activeCarrier}_${copyField}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeCarrierInfo = carrierListConfig.find((c) => c.code === activeCarrier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50/90 via-sky-50/60 to-white border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  Sao Chép Danh Sách Đơn Hàng Theo Hãng Vận Chuyển
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full">
                  {baseOrders.length} đơn
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Chọn hãng vận chuyển để trích xuất mã đơn hoặc mã vận đơn vào Clipboard.</span>
                {selectedPickingList && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 bg-amber-100 text-amber-800 rounded-md font-mono text-[11px] font-semibold">
                    <Filter className="w-3 h-3" /> Ô V1: {selectedPickingList}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer border border-gray-200 shadow-2xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Carrier Pills Selector */}
          <div>
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>1. Chọn Hãng Vận Chuyển (ĐVVC):</span>
              <span className="text-[11px] text-gray-400 font-normal">
                Bấm để xem danh sách & tùy chỉnh
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              {carrierListConfig.map((item) => {
                const count = carrierMap[item.code]?.length || 0;
                const isSelected = activeCarrier === item.code;

                return (
                  <button
                    key={item.code}
                    onClick={() => setActiveCarrier(item.code)}
                    className={`flex flex-col items-start p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? item.activeBorder + ' bg-gray-50/80 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`text-xs font-bold truncate ${
                          isSelected ? item.activeText : 'text-gray-800'
                        }`}
                      >
                        {item.shortName}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          count > 0
                            ? isSelected
                              ? item.activeBg
                              : 'bg-gray-100 text-gray-700'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {count}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 truncate">
                      {item.prefixHint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format Config: Field & Separator */}
          <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200 space-y-3">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              2. Tùy Chọn Định Dạng Dữ Liệu Copy:
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Field Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Loại thông tin muốn copy:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCopyField('orderNo')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      copyField === 'orderNo'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Mã Đơn (Order No)</span>
                    {copyField === 'orderNo' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopyField('trackingNo')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      copyField === 'trackingNo'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Mã Tracking (Vận Đơn)</span>
                    {copyField === 'trackingNo' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopyField('both')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      copyField === 'both'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Order No + Tracking (2 cột)</span>
                    {copyField === 'both' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCopyField('detailed')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      copyField === 'detailed'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Chi Tiết Đầy Đủ (Tab)</span>
                    {copyField === 'detailed' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                </div>
              </div>

              {/* Separator Selection */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  Ký tự phân cách giữa các mã:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={copyField === 'both' || copyField === 'detailed'}
                    onClick={() => setSeparator('newline')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      copyField === 'both' || copyField === 'detailed'
                        ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                        : separator === 'newline'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Xuống dòng (\n)</span>
                    {separator === 'newline' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    disabled={copyField === 'both' || copyField === 'detailed'}
                    onClick={() => setSeparator('comma')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      copyField === 'both' || copyField === 'detailed'
                        ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                        : separator === 'comma'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Dấu phẩy (, )</span>
                    {separator === 'comma' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    disabled={copyField === 'both' || copyField === 'detailed'}
                    onClick={() => setSeparator('semicolon')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      copyField === 'both' || copyField === 'detailed'
                        ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                        : separator === 'semicolon'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Dấu chấm phẩy (; )</span>
                    {separator === 'semicolon' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>

                  <button
                    type="button"
                    disabled={copyField === 'both' || copyField === 'detailed'}
                    onClick={() => setSeparator('space')}
                    className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      copyField === 'both' || copyField === 'detailed'
                        ? 'opacity-50 cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                        : separator === 'space'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>Khoảng trắng (Space)</span>
                    {separator === 'space' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview & Action Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  3. Xem Trước Danh Sách ({currentOrders.length} đơn):
                </span>
                <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-mono">
                  {activeCarrierInfo?.label || activeCarrier}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  disabled={currentOrders.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Tải file text về máy"
                >
                  <Download className="w-3.5 h-3.5 text-gray-500" />
                  <span>Tải .txt</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyMain}
                  disabled={currentOrders.length === 0}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                    copiedMain
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {copiedMain ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Đã Sao Chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Sao Chép {currentOrders.length} Mã</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                readOnly
                value={formattedText}
                rows={7}
                placeholder="Không có đơn hàng nào khớp với lựa chọn..."
                className="w-full font-mono text-xs p-3.5 bg-gray-900 text-emerald-400 rounded-2xl border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner scrollbar-thin resize-y"
              />
              {currentOrders.length > 0 && (
                <div className="absolute bottom-3 right-3 text-[10px] text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded-md backdrop-blur-xs font-mono">
                  {currentOrders.length} mã • {formattedText.length} ký tự
                </div>
              )}
            </div>
          </div>

          {/* Quick 1-Click Action Grid for All Carriers */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>⚡ Sao Chép Nhanh 1-Click Theo Từng Hãng:</span>
              <span className="text-[11px] text-slate-500 font-normal">
                Không cần cấu hình, bấm là copy ngay (mỗi mã 1 dòng)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {carrierListConfig
                .filter((c) => c.code !== 'ALL')
                .map((item) => {
                  const count = carrierMap[item.code]?.length || 0;
                  const keyOrder = `${item.code}_orderNo`;
                  const keyTracking = `${item.code}_trackingNo`;
                  const isCopiedOrder = quickCopiedKey === keyOrder;
                  const isCopiedTracking = quickCopiedKey === keyTracking;

                  return (
                    <div
                      key={item.code}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">{item.label}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {count} đơn
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                        <button
                          type="button"
                          disabled={count === 0}
                          onClick={() => handleQuickCopy(item.code, 'orderNo', item.label)}
                          className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                            isCopiedOrder
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {isCopiedOrder ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopiedOrder ? 'Đã copy!' : 'Copy Mã Đơn'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={count === 0}
                          onClick={() => handleQuickCopy(item.code, 'trackingNo', item.label)}
                          className={`flex-1 py-1 px-2 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed ${
                            isCopiedTracking
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {isCopiedTracking ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{isCopiedTracking ? 'Đã copy!' : 'Copy Tracking'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500">
            Dữ liệu được sao chép theo danh sách đơn hàng thực tế đang xử lý.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
