import React from 'react';
import { RefreshCw, X } from 'lucide-react';

interface SyncShippedModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromDate: string;
  toDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  isSyncing: boolean;
  progressMsg: string;
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
  onTriggerSync,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-500" />
            <span>Kéo Bổ Sung Đơn Xuất Kho YunWMS</span>
          </h3>
          <button
            type="button"
            onClick={() => !isSyncing && onClose()}
            disabled={isSyncing}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Kéo đơn trạng thái <b>Shipped (Mã 8)</b> từ kho <b>VN02</b>. Hệ thống tự động kiểm tra trong SQL database: <b>đơn hàng hoặc ngày đã có sẵn sẽ được bỏ qua</b>, không lo bị trùng lặp.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Từ Ngày:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Đến Ngày (Để trống = Cùng ngày):</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {progressMsg && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
            <span>{progressMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onTriggerSync}
            disabled={isSyncing}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang Kéo...</span>
              </>
            ) : (
              <span>Bắt Đầu Kéo Dữ Liệu</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
