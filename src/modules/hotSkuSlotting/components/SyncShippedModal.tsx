import React from 'react';
import { RefreshCw, X, ShieldCheck, Calendar } from 'lucide-react';

export interface SyncStats {
  page?: number;
  maxPages?: number;
  totalFetched?: number;
  totalInserted?: number;
  totalSkipped?: number;
}

export interface SyncShippedModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  isSyncing: boolean;
  progressMsg: string;
  progressPercent?: number;
  progressStats?: SyncStats;
  onTriggerSync: () => void;
}

export const SyncShippedModal: React.FC<SyncShippedModalProps> = ({
  isOpen,
  onClose,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  isSyncing,
  progressMsg,
  progressPercent = 0,
  progressStats,
  onTriggerSync,
}) => {
  if (!isOpen) return null;

  const setPresetDays = (days: number) => {
    if (isSyncing) return;
    const now = new Date();
    const toStr = now.toISOString().slice(0, 10);
    if (days === 0) {
      onFromDateChange(toStr);
      onToDateChange(toStr);
      return;
    }
    const fromD = new Date();
    fromD.setDate(now.getDate() - days);
    const fromStr = fromD.toISOString().slice(0, 10);
    onFromDateChange(fromStr);
    onToDateChange(toStr);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Kéo Bổ Sung Đơn Xuất Kho YunWMS
              </h3>
              <p className="text-xs text-slate-500">Kho VN02 • Trạng thái Shipped (Mã 8)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !isSyncing && onClose()}
            disabled={isSyncing}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cam kết lọc trùng tuyệt đối */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-emerald-950">Cơ Chế Lọc Trùng Tuyệt Đối (Duy Nhất 1 Data):</span>
            <p className="text-emerald-800 leading-relaxed text-[11px]">
              Hệ thống đối soát trực tiếp theo từng mã đơn (<code className="font-mono font-bold bg-emerald-100/70 px-1 rounded">order_no</code>) với database SQL. Mọi đơn hàng đã có sẽ được tự động bỏ qua, đảm bảo chỉ lưu duy nhất 1 bản ghi và không bị nhân đôi số liệu.
            </p>
          </div>
        </div>

        {/* Khung nhập ngày & Phím chọn nhanh */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Khung Thời Gian Kéo Đơn:</span>
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPresetDays(0)}
                disabled={isSyncing}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setPresetDays(3)}
                disabled={isSyncing}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                3 ngày
              </button>
              <button
                type="button"
                onClick={() => setPresetDays(7)}
                disabled={isSyncing}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                7 ngày
              </button>
              <button
                type="button"
                onClick={() => setPresetDays(30)}
                disabled={isSyncing}
                className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                30 ngày
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="block text-[11px] text-slate-500 font-medium mb-1">Từ Ngày:</span>
              <input
                type="date"
                value={fromDate}
                disabled={isSyncing}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div>
              <span className="block text-[11px] text-slate-500 font-medium mb-1">Đến Ngày (Để trống = Cùng ngày):</span>
              <input
                type="date"
                value={toDate}
                disabled={isSyncing}
                onChange={(e) => onToDateChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Thanh Tiến Độ Thời Gian Thực (% và Metrics) */}
        {(isSyncing || progressPercent > 0 || progressMsg) && (
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3.5 shadow-inner">
            {/* Thanh Bar % */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Tiến Độ Đồng Bộ:</span>
                </span>
                <span className="font-mono text-sm font-black text-amber-400">
                  {progressPercent}%
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700/60 p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 transition-all duration-300 ease-out shadow-xs"
                  style={{ width: `${Math.min(100, Math.max(progressPercent, isSyncing ? 4 : 0))}%` }}
                />
              </div>
            </div>

            {/* Bảng Chỉ Số Chi Tiết (3 Thẻ) */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="block text-[10px] text-slate-400 font-medium">Đã Quét WMS</span>
                <span className="text-xs font-black text-white font-mono">
                  {(progressStats?.totalFetched || 0).toLocaleString()}
                </span>
                {progressStats?.page && progressStats?.maxPages ? (
                  <span className="block text-[9px] text-amber-400 font-semibold">
                    Trang {progressStats.page}/{progressStats.maxPages}
                  </span>
                ) : null}
              </div>

              <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                <span className="block text-[10px] text-emerald-400 font-medium">Đơn Mới Ghi</span>
                <span className="text-xs font-black text-emerald-300 font-mono">
                  +{(progressStats?.totalInserted || 0).toLocaleString()}
                </span>
                <span className="block text-[9px] text-emerald-400/80">Lưu vào SQL</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <span className="block text-[10px] text-slate-400 font-medium">Bỏ Qua Trùng</span>
                <span className="text-xs font-black text-slate-300 font-mono">
                  {(progressStats?.totalSkipped || 0).toLocaleString()}
                </span>
                <span className="block text-[9px] text-slate-500">Giữ 1 bản ghi</span>
              </div>
            </div>

            {/* Dòng text trạng thái */}
            {progressMsg && (
              <p className="text-[11px] text-slate-300 italic text-center pt-1 leading-snug">
                {progressMsg}
              </p>
            )}
          </div>
        )}

        {/* Nút Hành Động */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-500 hover:to-orange-600 shadow-lg shadow-amber-500/25 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Đang Kéo Dữ Liệu ({progressPercent}%)...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-slate-950" />
                <span>Bắt Đầu Kéo Dữ Liệu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
