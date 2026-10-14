import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  Copy,
  Check,
  Sparkles,
  QrCode,
  Layers,
  Settings2
} from 'lucide-react';
import { WmsInventoryItem } from '../types';
import {
  SkuLabelPrintOptions,
  PAPER_SIZE_CONFIGS,
  printSkuLabelDirectly,
  openSkuLabelPrintWindow
} from '../utils/skuLabelPrint';

interface SingleSkuLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: WmsInventoryItem | null;
}

export const SingleSkuLabelModal: React.FC<SingleSkuLabelModalProps> = ({
  isOpen,
  onClose,
  item
}) => {
  const [paperSize, setPaperSize] = useState<SkuLabelPrintOptions['paperSize']>('30x50');
  const [copies, setCopies] = useState<number>(1);
  const [showTitle, setShowTitle] = useState<boolean>(false);
  const [showGroup, setShowGroup] = useState<boolean>(false);
  const [qrSvg, setQrSvg] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Sinh mã QR code dạng SVG vector nét căng bất cứ khi nào SKU thay đổi
  useEffect(() => {
    if (!item?.sku) {
      setQrSvg('');
      return;
    }

    let isSubscribed = true;
    QRCode.toString(item.sku, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((svg) => {
        if (isSubscribed) {
          setQrSvg(svg);
        }
      })
      .catch((err) => {
        console.error('Lỗi tạo QR Code:', err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [item?.sku]);

  // Reset copies khi đổi item
  useEffect(() => {
    if (isOpen) {
      setCopies(1);
    }
  }, [isOpen, item?.sku]);

  if (!isOpen || !item) return null;

  const currentSizeCfg = PAPER_SIZE_CONFIGS[paperSize];

  const handlePrint = () => {
    if (!qrSvg) return;
    printSkuLabelDirectly(item, qrSvg, {
      paperSize,
      copies,
      showTitle,
      showGroup
    });
  };

  const handleCopySku = () => {
    navigator.clipboard.writeText(item.sku);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">In Tem Nhãn SKU (Máy In Nhiệt)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Xprinter XP-D465B
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Tem mã QR và mã SKU in rõ nét, căn chuẩn khổ giấy nhiệt 30×50mm
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Info bar of SKU */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-sm font-black text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {item.sku}
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300/80">
                  {item.group}
                </span>
                <button
                  onClick={handleCopySku}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                  title="Sao chép SKU"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate" title={item.title}>
                {item.title || item.productName || 'Không có mô tả sản phẩm'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Tồn Khả Dụng</div>
              <div className="text-base font-black text-emerald-700">
                {item.inUsed.toLocaleString()} <span className="text-xs font-medium">PCS</span>
              </div>
            </div>
          </div>

          {/* Grid: Preview Left + Controls Right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Live Thermal Label Preview */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5 self-start">
                <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xem trước tem in ({currentSizeCfg.widthMm}×{currentSizeCfg.heightMm} mm):</span>
              </div>

              {/* Thermal Label Mockup Box */}
              <div
                className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-3 shadow-md flex flex-col items-center justify-center transition-all relative overflow-hidden"
                style={{
                  width: `${Math.min(220, currentSizeCfg.widthMm * 4.4)}px`,
                  minHeight: `${Math.min(280, currentSizeCfg.heightMm * 4.4)}px`
                }}
              >
                {/* QR Code Container */}
                <div
                  className="w-full flex items-center justify-center"
                  style={{ maxHeight: '68%' }}
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />

                {/* SKU Code Text */}
                <div className="font-mono text-base font-black text-black tracking-wider mt-1 text-center select-all">
                  {item.sku}
                </div>

                {/* Optional Group */}
                {showGroup && item.group && (
                  <div className="text-[10px] font-bold text-slate-700 mt-0.5 text-center truncate max-w-full">
                    {item.group}
                  </div>
                )}

                {/* Optional Title */}
                {showTitle && item.title && (
                  <div className="text-[9px] text-slate-600 mt-0.5 text-center line-clamp-2 max-w-full leading-tight">
                    {item.title}
                  </div>
                )}
              </div>

              <span className="text-[11px] text-slate-400 mt-2 text-center">
                Tỷ lệ chuẩn khớp 100% với hộp thoại in Chrome / Xprinter
              </span>
            </div>

            {/* Print Settings Form */}
            <div className="space-y-4">
              {/* Paper Size Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Khổ Giấy Máy In Nhiệt:
                </label>
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                >
                  {Object.entries(PAPER_SIZE_CONFIGS).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Number of Copies */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Số lượng tem cần in:
                  </label>
                  {item.inUsed > 0 && (
                    <button
                      type="button"
                      onClick={() => setCopies(item.inUsed)}
                      className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Bằng số tồn ({item.inUsed})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCopies((c) => Math.max(1, c - 1))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 text-sm flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCopies((c) => c + 1)}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 text-sm flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {[1, 2, 5, 10, 20].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCopies(num)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        copies === num
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {num} tem
                    </button>
                  ))}
                </div>
              </div>

              {/* Extra toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTitle}
                    onChange={(e) => setShowTitle(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>In kèm tên sản phẩm rút gọn</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGroup}
                    onChange={(e) => setShowGroup(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>In kèm tên nhóm SKU ({item.group})</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!qrSvg}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Xác Nhận In ({copies} Tem)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
