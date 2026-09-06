import React from 'react';
import { AlertTriangle, Trash2, X, FileSpreadsheet, PlusCircle } from 'lucide-react';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: () => void;
  onLoadSample: () => void;
  currentOrdersCount: number;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onClose,
  onConfirmClear,
  onLoadSample,
  currentOrdersCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 bg-rose-50/80 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Xóa Dữ Liệu Đơn Hàng Cũ
              </h3>
              <p className="text-xs text-rose-700">
                Hiện có {currentOrdersCount} đơn hàng trong bộ nhớ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer border border-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs text-gray-600 leading-relaxed">
          <p>
            Bạn có chắc chắn muốn <strong>xóa toàn bộ {currentOrdersCount} đơn hàng cũ</strong> hiện tại để nạp dữ liệu mới từ Google Sheets hoặc file Excel không?
          </p>
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <div>
              Sau khi xóa, khung <strong>Nhập Dữ Liệu Đơn Hàng Kho</strong> sẽ tự động mở ra để bạn dán (Ctrl+V) hoặc tải file .xlsx mới vào xử lý ngay.
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            onClick={() => {
              onClose();
              onLoadSample();
            }}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Nạp lại Dữ liệu mẫu</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              onClick={() => {
                onConfirmClear();
                onClose();
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xác nhận xóa</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
