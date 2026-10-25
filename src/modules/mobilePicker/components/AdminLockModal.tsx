import React, { useState } from 'react';
import { ShieldCheck, Lock, X, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AdminLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentAdminPin: string;
}

export const AdminLockModal: React.FC<AdminLockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentAdminPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.trim() === currentAdminPin.trim()) {
      setError(false);
      onSuccess();
      setPin('');
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleKeyClick = (val: string) => {
    if (pin.length < 8) {
      const nextPin = pin + val;
      setPin(nextPin);
      setError(false);
      if (nextPin === currentAdminPin) {
        onSuccess();
        setPin('');
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden transition-all duration-300 ${
          shake ? 'translate-x-2 border-red-500' : ''
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">Xác Thực Quản Trị Viên</h3>
              <p className="text-xs text-indigo-200">Khóa trung tâm điều phối & cài đặt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-slate-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          <p className="text-xs text-slate-600 text-center mb-4">
            Khu vực này dùng để cấu hình phân chia đơn nhặt hàng. Nhân viên con không có quyền chỉnh sửa.
          </p>

          {/* PIN Input Display */}
          <div className="flex justify-center items-center gap-3 mb-5">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                  pin.length > idx
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {pin.length > idx ? '●' : ''}
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-red-600 font-semibold mb-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Mật khẩu không đúng! Vui lòng thử lại.</span>
            </div>
          )}

          {/* Virtual Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto mb-4">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleKeyClick(num)}
                className="h-12 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 font-bold text-lg text-slate-800 transition-all border border-slate-200/80 shadow-2xs"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-xs text-slate-600 transition-all active:scale-95 border border-slate-200/80"
            >
              Xóa hết
            </button>
            <button
              type="button"
              onClick={() => handleKeyClick('0')}
              className="h-12 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 font-bold text-lg text-slate-800 transition-all border border-slate-200/80 shadow-2xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-12 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 font-semibold text-xs text-slate-600 transition-all active:scale-95 border border-slate-200/80"
            >
              ⌫ Xóa
            </button>
          </div>

          <div className="text-center">
            <span className="text-[11px] text-slate-400">
              Mật khẩu mặc định hệ thống: <strong className="text-indigo-600 font-mono">8888</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
