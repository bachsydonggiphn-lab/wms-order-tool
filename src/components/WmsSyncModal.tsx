import React, { useState, useEffect, useRef } from 'react';
import {
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Server,
  Warehouse,
  Filter,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RawOrderRow, SkuGroupsMap } from '../types';

interface WmsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (orders: RawOrderRow[]) => void;
  skuGroups: SkuGroupsMap;
  currentOrdersCount: number;
}

export const WmsSyncModal: React.FC<WmsSyncModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  skuGroups,
  currentOrdersCount,
}) => {
  // Cấu hình kết nối WMS
  const [warehouse, setWarehouse] = useState<string>('7'); // 7 = VN02 HCM, 4 = VN01
  const [status, setStatus] = useState<string>('4');       // 4 = Submitted., 8 = Shipped
  const [pageSize, setPageSize] = useState<number>(500);   // 500 đơn / lần gọi
  const [maxPages, setMaxPages] = useState<number>(0);     // 0 = Toàn bộ các trang
  const [username, setUsername] = useState<string>('David');
  const [password, setPassword] = useState<string>('12345abc');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Trạng thái đồng bộ
  const [loading, setLoading] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [resultInfo, setResultInfo] = useState<{ total: number; fetched: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Auto Sync (Polling)
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const liveIntervalRef = useRef<any>(null);

  // Reset khi mở modal
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setProgressText('');
      setProgressPercent(0);
    }
  }, [isOpen]);

  // Quản lý Live Sync Polling
  useEffect(() => {
    if (isLiveActive) {
      liveIntervalRef.current = setInterval(() => {
        handleQuickSync(true);
      }, 30000); // 30s
    } else {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    }
    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
      }
    };
  }, [isLiveActive, warehouse, status, username, password]);

  const handleQuickSync = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setErrorMsg(null);
      setProgressPercent(15);
      setProgressText('Đang xác thực phiên làm việc với czwh.wms.yunwms.com...');
    }

    try {
      if (!isBackground) {
        setProgressPercent(35);
        setProgressText(`Đang gọi API POST /order/orders/list (Kho: ${warehouse === '7' ? 'VN02' : 'VN01'}, Trạng thái: ${status === '4' ? 'Submitted' : 'Shipped'})...`);
      }

      const res = await fetch('/api/wms/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse,
          status,
          pageSize,
          maxPages,
          username,
          password,
          skuGroups,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Lỗi máy chủ: ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Lấy dữ liệu từ WMS thất bại');
      }

      const loadedOrders: RawOrderRow[] = data.orders || [];
      setResultInfo({ total: data.totalOrders, fetched: data.returnedOrders });

      if (!isBackground) {
        setProgressPercent(100);
        setProgressText(`Thành công! Đã nạp ${loadedOrders.length} đơn hàng trạng thái ${status === '4' ? 'Submitted' : 'Shipped'}.`);
      }

      onDataLoaded(loadedOrders);

      if (!isBackground) {
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.7 },
          });
        } catch (e) {}

        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error('WMS Sync Error:', err);
      setErrorMsg(err?.message || 'Không thể kết nối đến máy chủ WMS.');
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <CloudDownload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Đồng Bộ Trực Tiếp YunWMS</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  API Nội Bộ
                </span>
              </h2>
              <p className="text-xs text-blue-100/90 font-mono">
                czwh.wms.yunwms.com (创智云仓)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung Modal */}
        <div className="p-6 space-y-5">
          {/* Thông tin kho & trạng thái */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Lựa chọn Kho */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Warehouse className="w-4 h-4 text-indigo-600" />
                <span>Kho Hàng (Tham số E4):</span>
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                disabled={loading}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7">VN02 [越南胡志明仓库 - Hồ Chí Minh] (Khuyên dùng)</option>
                <option value="4">VN01 [VN01越南海外仓 - Hải Ngoại]</option>
                <option value="">Tất cả kho (All Warehouses)</option>
              </select>
            </div>

            {/* Lựa chọn Trạng thái đơn */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-indigo-600" />
                <span>Trạng Thái Đơn (Tham số E11):</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="5">⭐ Shelved (E11 = 5) [Đã lên kệ / Đang nhặt hàng]</option>
                <option value="4">Submitted. (E11 = 4) [Đã tạo / Chờ xử lý kho]</option>
                <option value="8">Shipped (E11 = 8) [Đã xuất kho / Đang giao]</option>
                <option value="1">Order Placed (E11 = 1) [Đã đặt hàng]</option>
                <option value="">Tất cả trạng thái (All Status)</option>
              </select>
            </div>
          </div>

          {/* Tùy chọn Tốc độ & Số lượng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Số Lượng Đơn / Lần Kéo (pageSize):</span>
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                disabled={loading}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value={300}>300 đơn / trang (Nhanh)</option>
                <option value={500}>500 đơn / trang (Tiêu chuẩn tối ưu)</option>
                <option value={1000}>1000 đơn / trang (Cực đại)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Giới Hạn Trang:</span>
              </label>
              <select
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                disabled={loading}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value={0}>Kéo toàn bộ đơn (Đa luồng song song)</option>
                <option value={1}>Chỉ 1 trang đầu (Tối đa {pageSize} đơn)</option>
                <option value={2}>2 trang đầu (Tối đa {pageSize * 2} đơn)</option>
                <option value={5}>5 trang đầu (Tối đa {pageSize * 5} đơn)</option>
              </select>
            </div>
          </div>

          {/* Live WMS Tracker Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                <Activity className={`w-4 h-4 ${isLiveActive ? 'animate-pulse text-amber-300' : ''}`} />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>Chế Độ LIVE WMS Tracker</span>
                  {isLiveActive && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white animate-pulse">
                      ON • 30s
                    </span>
                  )}
                </span>
                <p className="text-[11px] text-slate-600">
                  Tự động kiểm tra và chèn đơn mới mỗi 30 giây chạy ngầm
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isLiveActive}
                onChange={(e) => setIsLiveActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Cấu hình nâng cao (Tài khoản) */}
          <div className="border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Tài khoản & Mật khẩu WMS</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Tài khoản (userName):</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Mật khẩu (userPass):</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
                <div className="col-span-2 text-[10px] text-slate-500">
                  Mật khẩu được mã hóa Base64 tự động trước khi gửi tới máy chủ YunWMS theo đúng chuẩn hệ thống.
                </div>
              </div>
            )}
          </div>

          {/* Hiển thị Tiến trình & Lỗi */}
          {loading && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-indigo-900">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>{progressText || 'Đang kết nối...'}</span>
                </span>
                <span className="font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-indigo-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Không thể kéo đơn:</span> {errorMsg}
              </div>
            </div>
          )}

          {resultInfo && !loading && !errorMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                Đã nạp thành công <b>{resultInfo.fetched}</b> / {resultInfo.total} đơn hàng từ kho {warehouse === '7' ? 'VN02' : 'VN01'}.
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Hiện có: <b>{currentOrdersCount}</b> đơn trong hệ thống</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={() => handleQuickSync(false)}
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang Kéo Đơn...</span>
                </>
              ) : (
                <>
                  <CloudDownload className="w-4 h-4" />
                  <span>Kéo Đơn {status === '5' ? 'Shelved (5)' : status === '4' ? 'Submitted (4)' : status === '8' ? 'Shipped (8)' : 'WMS'} Ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
