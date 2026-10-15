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
  Settings2,
  RotateCw,
  CheckCircle2
} from 'lucide-react';
import { WmsInventoryItem } from '../types';
import {
  SkuLabelPrintOptions,
  PAPER_SIZE_CONFIGS,
  resolvePaperDimensions,
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
  // Mặc định chuẩn 35x25mm (Khổ ngang - Chuẩn máy in Xprinter XP-D465B)
  const [paperSize, setPaperSize] = useState<string>('35x25');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [customWidth, setCustomWidth] = useState<number>(35);
  const [customHeight, setCustomHeight] = useState<number>(25);
  const [copies, setCopies] = useState<number>(1);
  const [showTitle, setShowTitle] = useState<boolean>(false);
  const [showGroup, setShowGroup] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrSvg, setQrSvg] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Sinh mã QR code dạng Data URL (PNG 600px cực nét, không bị sọc ngang) và SVG
  useEffect(() => {
    if (!item?.sku) {
      setQrDataUrl('');
      setQrSvg('');
      return;
    }

    let isSubscribed = true;

    // Sinh ảnh Bitmap PNG 600px nét căng, chống đứt nét trên máy in nhiệt
    QRCode.toDataURL(item.sku, {
      width: 600,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })
      .then((url) => {
        if (isSubscribed) {
          setQrDataUrl(url);
        }
      })
      .catch((err) => {
        console.error('Lỗi tạo QR DataURL:', err);
      });

    // Dự phòng thêm SVG
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
        console.error('Lỗi tạo QR SVG:', err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [item?.sku]);

  // Reset copies khi mở modal
  useEffect(() => {
    if (isOpen) {
      setCopies(1);
    }
  }, [isOpen, item?.sku]);

  // Tự động đồng bộ orientation khi chọn khổ giấy có sẵn
  const handleSelectPaperSize = (key: string) => {
    setPaperSize(key);
    if (PAPER_SIZE_CONFIGS[key] && key !== 'custom') {
      const cfg = PAPER_SIZE_CONFIGS[key];
      setOrientation(cfg.orientation);
      setCustomWidth(cfg.widthMm);
      setCustomHeight(cfg.heightMm);
    }
  };

  const handleToggleOrientation = () => {
    setOrientation(prev => (prev === 'landscape' ? 'portrait' : 'landscape'));
    // Hoán đổi width và height
    setCustomWidth(customHeight);
    setCustomHeight(customWidth);
  };

  const { widthMm, heightMm } = useMemo(() => {
    return resolvePaperDimensions({
      paperSize,
      customWidthMm: paperSize === 'custom' ? customWidth : undefined,
      customHeightMm: paperSize === 'custom' ? customHeight : undefined,
      orientation,
      copies
    });
  }, [paperSize, customWidth, customHeight, orientation, copies]);

  if (!isOpen || !item) return null;

  // In qua cửa sổ popup chuẩn trình duyệt (Khuyên dùng - không bao giờ bị lỗi khổ A4)
  const handlePrintWindow = () => {
    const codeSrc = qrDataUrl || qrSvg;
    if (!codeSrc) return;
    openSkuLabelPrintWindow(item, codeSrc, {
      paperSize,
      customWidthMm: widthMm,
      customHeightMm: heightMm,
      orientation,
      copies,
      showTitle,
      showGroup
    });
  };

  // In trực tiếp qua iframe ngầm
  const handlePrintDirect = () => {
    const codeSrc = qrDataUrl || qrSvg;
    if (!codeSrc) return;
    printSkuLabelDirectly(item, codeSrc, {
      paperSize,
      customWidthMm: widthMm,
      customHeightMm: heightMm,
      orientation,
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
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
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
                <h3 className="text-base font-black tracking-tight">In Tem Nhãn SKU Nhiệt (Chuẩn Tỷ Lệ 100%)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Xprinter XP-D465B
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Khai báo chuẩn mm theo khổ giấy thật - Không cần phải chỉnh tỷ lệ xuống 30%
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
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Info bar of SKU */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between gap-3">
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
              <p className="text-xs text-slate-500 mt-0.5 truncate" title={item.title}>
                {item.title || item.productName || 'Không có mô tả sản phẩm'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Tồn Khả Dụng</div>
              <div className="text-base font-black text-emerald-700">
                {item.inUsed.toLocaleString()} <span className="text-xs font-medium">PCS</span>
              </div>
            </div>
          </div>

          {/* Scale Tip Alert & Xprinter Instructions Banner */}
          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl text-xs text-amber-950 space-y-1.5 shadow-2xs">
            <div className="font-black flex items-center gap-1.5 text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cài đặt in máy Xprinter XP-D465B (Không bị thu nhỏ góc, không sọc đứt nét):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-0.5">
              <div className="bg-white/80 border border-amber-200/60 rounded-xl p-2">
                <span className="font-bold text-amber-900 block">1. Khổ giấy (Paper size):</span>
                <span className="text-slate-600">Trong Chrome bấm "Cài đặt khác" &rarr; chọn đúng khổ cuộn tem (<strong>{widthMm}×{heightMm} mm</strong> hoặc <strong>User</strong>).</span>
              </div>
              <div className="bg-white/80 border border-amber-200/60 rounded-xl p-2">
                <span className="font-bold text-amber-900 block">2. Tỷ lệ (Scale):</span>
                <span className="text-slate-600">Chọn <strong>"Mặc định" (100%)</strong> &mdash; tem tự động phủ trọn 100% diện tích nhãn in.</span>
              </div>
              <div className="bg-white/80 border border-amber-200/60 rounded-xl p-2">
                <span className="font-bold text-amber-900 block">3. Lề (Margins):</span>
                <span className="text-slate-600">Chọn <strong>"Không có" (None)</strong> để tem không bị lệch hay tạo khoảng trống thừa.</span>
              </div>
            </div>
          </div>

          {/* Grid: Preview Left + Controls Right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Live Thermal Label Preview */}
            <div className="flex flex-col items-center">
              <div className="text-xs font-bold text-slate-500 mb-2 flex items-center justify-between w-full">
                <span className="flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Xem trước ({widthMm} × {heightMm} mm):</span>
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {orientation === 'landscape' ? 'Khổ Ngang ↔' : 'Khổ Dọc ↕'}
                </span>
              </div>

              {/* Thermal Label Mockup Box */}
              <div
                className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-2.5 shadow-md flex flex-col items-center justify-center transition-all relative overflow-hidden"
                style={{
                  width: `${Math.min(240, Math.max(160, widthMm * 4.2))}px`,
                  height: `${Math.min(240, Math.max(130, heightMm * 4.2))}px`
                }}
              >
                {/* QR Code Container (PNG bitmap nét đặc, không bị gãy nét sọc ngang) */}
                <div
                  className="w-full flex items-center justify-center overflow-hidden"
                  style={{ height: '70%' }}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={item.sku}
                      className="max-h-full max-w-full object-contain select-none"
                      style={{
                        imageRendering: 'pixelated'
                      }}
                    />
                  ) : qrSvg ? (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  ) : (
                    <div className="text-[11px] text-slate-400">Đang tạo mã QR...</div>
                  )}
                </div>

                {/* SKU Code Text */}
                <div className="font-mono text-sm font-black text-black tracking-wider mt-0.5 text-center select-all truncate max-w-full">
                  {item.sku}
                </div>

                {/* Optional Group */}
                {showGroup && item.group && (
                  <div className="text-[9px] font-bold text-slate-700 mt-0.5 text-center truncate max-w-full">
                    {item.group}
                  </div>
                )}

                {/* Optional Title */}
                {showTitle && item.title && (
                  <div className="text-[8px] text-slate-600 mt-0.5 text-center line-clamp-1 max-w-full leading-tight">
                    {item.title}
                  </div>
                )}
              </div>

              <span className="text-[10.5px] text-slate-400 mt-2 text-center">
                Mẫu tem hiển thị chuẩn theo đúng milimet của máy in Xprinter
              </span>
            </div>

            {/* Print Settings Form */}
            <div className="space-y-3.5">
              {/* Khổ tem in nhiệt cố định 35x25mm */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    Khổ Giấy Máy In Nhiệt:
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-slate-900">{widthMm} × {heightMm} mm</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Tem Ngang ↔ Mặc Định
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 font-bold bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  Xprinter XP-D465B
                </div>
              </div>

              {/* Bố cục Ngang / Dọc toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bố Cục Tem (Orientation):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (orientation !== 'landscape') handleToggleOrientation();
                    }}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      orientation === 'landscape'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>Khổ Ngang ↔ ({Math.max(widthMm, heightMm)}×{Math.min(widthMm, heightMm)}mm)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (orientation !== 'portrait') handleToggleOrientation();
                    }}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      orientation === 'portrait'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>Khổ Dọc ↕ ({Math.min(widthMm, heightMm)}×{Math.max(widthMm, heightMm)}mm)</span>
                  </button>
                </div>
              </div>

              {/* Custom Dimensions (nếu chọn custom) */}
              {paperSize === 'custom' && (
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Chiều Rộng (mm):
                    </label>
                    <input
                      type="number"
                      min="20"
                      max="150"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Math.max(10, parseInt(e.target.value || '50', 10)))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Chiều Cao (mm):
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="150"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Math.max(10, parseInt(e.target.value || '30', 10)))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Number of Copies */}
              <div>
                <div className="flex items-center justify-between mb-1">
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
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 text-sm flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    className="flex-1 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-black text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setCopies((c) => c + 1)}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 font-black text-slate-700 text-sm flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
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
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
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
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintDirect}
              disabled={!qrDataUrl && !qrSvg}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300/80 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              title="In ngầm qua iframe nếu không muốn mở tab mới"
            >
              <span>In Nhanh (Iframe)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintWindow}
              disabled={!qrDataUrl && !qrSvg}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Xác Nhận In ({copies} Tem &bull; {widthMm}×{heightMm}mm)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
