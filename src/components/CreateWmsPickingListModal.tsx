import React, { useState, useEffect } from 'react';
import {
  Zap,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Printer,
  Copy,
  Check,
  UserCheck,
  Boxes,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { RawOrderRow } from '../types';

interface PickerOption {
  user_id: string;
  user_name: string;
  user_code: string;
  user_name_en?: string;
}

interface CreateWmsPickingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchTitle?: string;
  orderCodes: string[];
  orders?: RawOrderRow[];
  onSuccess?: (pickCode: string, orderCodes: string[]) => void;
  onOpenPrintModal?: (pickingCode: string, targetOrders?: RawOrderRow[]) => void;
}

const STORAGE_KEY_PICKER = 'wms_default_picker_id';
const STORAGE_KEY_PICKING_MODE = 'wms_default_picking_mode';

export const CreateWmsPickingListModal: React.FC<CreateWmsPickingListModalProps> = ({
  isOpen,
  onClose,
  batchTitle = 'Tạo List Lấy Hàng',
  orderCodes,
  orders = [],
  onSuccess,
  onOpenPrintModal,
}) => {
  const [pickers, setPickers] = useState<PickerOption[]>([]);
  const [loadingPickers, setLoadingPickers] = useState<boolean>(false);
  const [selectedPickerId, setSelectedPickerId] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_PICKER) || '1';
    } catch {
      return '1';
    }
  });
  const [pickingMode, setPickingMode] = useState<'1' | '2'>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY_PICKING_MODE) as '1' | '2') || '1';
    } catch {
      return '1';
    }
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    pickCode: string;
    successPickCode: string[];
    successCount: number;
    failCount: number;
    message?: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Tính tổng PCS và danh sách SKU duy nhất từ orders được chọn
  const filteredOrders = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const codeSet = new Set(orderCodes);
    return orders.filter(o => codeSet.has(o.orderNo));
  }, [orders, orderCodes]);

  const stats = React.useMemo(() => {
    const skuMap = new Map<string, number>();
    let totalPcs = 0;

    filteredOrders.forEach(o => {
      o.items?.forEach(it => {
        const q = it.qty || 1;
        totalPcs += q;
        skuMap.set(it.sku, (skuMap.get(it.sku) || 0) + q);
      });
    });

    const skuList = Array.from(skuMap.entries())
      .map(([sku, qty]) => ({ sku, qty }))
      .sort((a, b) => b.qty - a.qty);

    return {
      totalPcs,
      distinctSkuCount: skuMap.size,
      topSkus: skuList.slice(0, 8),
      allSkusCount: skuList.length,
    };
  }, [filteredOrders]);

  // Load danh sách Pickers khi modal mở
  useEffect(() => {
    if (!isOpen) {
      setSuccessResult(null);
      setErrorMsg(null);
      return;
    }

    setLoadingPickers(true);
    fetch('/api/wms/pickers?warehouse=7')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.pickers) && data.pickers.length > 0) {
          setPickers(data.pickers);
          // Nếu id đã lưu chưa có thì chọn thợ đầu tiên
          if (!data.pickers.some((p: PickerOption) => p.user_id === selectedPickerId)) {
            setSelectedPickerId(data.pickers[0].user_id);
          }
        }
      })
      .catch(() => {
        // Fallback pickers mặc định nếu API bị gián đoạn
        setPickers([
          { user_id: '1', user_code: 'admin', user_name: 'Quản trị viên (admin)' },
          { user_id: '4', user_code: 'admin02', user_name: 'Quản trị viên 02 (admin02)' },
        ]);
      })
      .finally(() => {
        setLoadingPickers(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePickerChange = (id: string) => {
    setSelectedPickerId(id);
    try {
      localStorage.setItem(STORAGE_KEY_PICKER, id);
    } catch {}
  };

  const handlePickingModeChange = (mode: '1' | '2') => {
    setPickingMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_PICKING_MODE, mode);
    } catch {}
  };

  const handleCopyPickCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSubmit = async () => {
    if (orderCodes.length === 0) {
      setErrorMsg('Không có mã đơn hàng nào được chọn!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const resp = await fetch('/api/wms/create-picking-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderCodes,
          pickerId: selectedPickerId,
          pickingMode,
          orderType: '1',
        }),
      });

      const data = await resp.json();

      if (data.success) {
        const pickCode =
          data.pickCode ||
          (Array.isArray(data.successPickCode) && data.successPickCode[0]) ||
          'PL-OK';

        setSuccessResult({
          pickCode,
          successPickCode: Array.isArray(data.successPickCode) ? data.successPickCode : [pickCode],
          successCount: data.successCount || orderCodes.length,
          failCount: data.failCount || 0,
          message: data.message,
        });

        if (onSuccess) {
          onSuccess(pickCode, orderCodes);
        }
      } else {
        setErrorMsg(data.message || 'Không thể tạo phiếu nhặt hàng trên YunWMS.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Lỗi mạng khi kết nối cổng YunWMS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/30">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  Tạo List Lấy Hàng Trực Tiếp WMS
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Live YunWMS
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Chuyển trạng thái đơn từ <strong>Submitted (E11=4)</strong> sang <strong>Shelved (E11=5)</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-4.5 overflow-y-auto">
          {/* Success Banner */}
          {successResult ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-emerald-950">
                    Tạo Phiếu Nhặt Hàng Thành Công!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Đã tạo thành công <strong>{successResult.successCount} đơn hàng</strong> trên hệ thống czwh.wms.yunwms.com
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-emerald-300 flex items-center justify-between gap-2 max-w-sm mx-auto shadow-2xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block text-left">
                      Mã Picking List (PL)
                    </span>
                    <span className="text-base font-black font-mono text-indigo-700">
                      {successResult.pickCode}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyPickCode(successResult.pickCode)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>

                {successResult.successPickCode.length > 1 && (
                  <div className="text-[11px] text-slate-500">
                    Gồm các mã: {successResult.successPickCode.join(', ')}
                  </div>
                )}
              </div>

              {/* Action Buttons after Success */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                {onOpenPrintModal && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        sessionStorage.removeItem('wms_cache_orders_5');
                      } catch {}
                      onOpenPrintModal(successResult.pickCode);
                      onClose();
                    }}
                    className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Tem Phiếu Nhặt (100x150 mm)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Đóng & Hoàn Tất
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Target Batch Info */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                      Đợt Chọn
                    </span>
                    <h5 className="font-bold text-sm text-slate-900 truncate">
                      {batchTitle}
                    </h5>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xl font-black font-mono text-indigo-600">
                    {orderCodes.length}
                  </span>
                  <span className="text-xs font-bold text-slate-500 ml-1">đơn</span>
                </div>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Số Đơn Hàng</span>
                  <p className="text-lg font-black text-slate-900 font-mono mt-0.5">
                    {orderCodes.length}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Số Mã SKU</span>
                  <p className="text-lg font-black text-indigo-600 font-mono mt-0.5">
                    {stats.distinctSkuCount || '---'}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Tổng PCS</span>
                  <p className="text-lg font-black text-emerald-600 font-mono mt-0.5">
                    {stats.totalPcs || '---'}
                  </p>
                </div>
              </div>

              {/* Dispatch Settings Form */}
              <div className="space-y-3.5 pt-1">
                {/* 1. Chọn Nhân Viên Nhặt (Picker) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Nhân Viên Nhặt Hàng (WMS Picker):</span>
                    </span>
                    {loadingPickers && (
                      <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Đang tải thợ...
                      </span>
                    )}
                  </label>

                  <select
                    value={selectedPickerId}
                    onChange={(e) => handlePickerChange(e.target.value)}
                    disabled={isSubmitting || loadingPickers}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  >
                    {pickers.map((p) => (
                      <option key={p.user_id} value={p.user_id}>
                        {p.user_name || p.user_code} (Mã: {p.user_code} - ID: {p.user_id})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hệ thống sẽ gắn tên người nhặt này trực tiếp vào phiếu trên WMS YunWMS.
                  </p>
                </div>

                {/* 2. Chế độ phân bổ nhặt (Picking Mode) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Chế Độ Nhặt (Picking Mode):</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePickingModeChange('1')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        pickingMode === '1'
                          ? 'bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-400 text-indigo-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Theo Từng Đơn (Mode 1)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                        Mặc định chuẩn kho, in tem và nhặt từng đơn
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePickingModeChange('2')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        pickingMode === '2'
                          ? 'bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-400 text-indigo-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-amber-600" />
                        <span>Gom Theo SKU (Mode 2)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-normal">
                        Tổng hợp SKU nhặt 1 lần rồi phân loại sau
                      </p>
                    </button>
                  </div>
                </div>

                {/* SKU Preview preview chips */}
                {stats.topSkus.length > 0 && (
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Các SKU có trong đợt này ({stats.allSkusCount} mã):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {stats.topSkus.map((s) => (
                        <span
                          key={s.sku}
                          className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-mono font-bold text-slate-800 shadow-2xs"
                        >
                          {s.sku} <span className="text-indigo-600 font-extrabold">×{s.qty}</span>
                        </span>
                      ))}
                      {stats.allSkusCount > stats.topSkus.length && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[11px] text-slate-500 font-medium">
                          +{stats.allSkusCount - stats.topSkus.length} SKU khác...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy Bỏ
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || orderCodes.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang Gửi Lệnh WMS...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-current text-amber-300" />
                      <span>Xác Nhận Tạo List ({orderCodes.length} đơn)</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
