import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  Users,
  Layers,
  Sparkles,
  Flame,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  ArrowRight,
  Eye,
  Activity,
  Sliders,
  Check,
  ChevronRight,
  LogOut,
  Smartphone
} from 'lucide-react';
import { PickerAccount, AdminDispatchConfig, PickingStrategyType, PickingBatch } from '../types';

interface AdminDispatchSettingsProps {
  config: AdminDispatchConfig;
  onUpdateConfig: (newConfig: AdminDispatchConfig) => void;
  accounts: PickerAccount[];
  onUpdateAccounts: (newAccounts: PickerAccount[]) => void;
  batches: PickingBatch[];
  onGenerateBatchesFromOrders: () => void;
  onExitAdminMode: () => void;
}

export const AdminDispatchSettings: React.FC<AdminDispatchSettingsProps> = ({
  config,
  onUpdateConfig,
  accounts,
  onUpdateAccounts,
  batches,
  onGenerateBatchesFromOrders,
  onExitAdminMode,
}) => {
  const [activeTab, setActiveTab] = useState<'RULES' | 'ACCOUNTS' | 'MONITOR' | 'SECURITY'>('RULES');
  const [newPin, setNewPin] = useState(config.adminPin);
  const [pinSaved, setPinSaved] = useState(false);

  // Thêm tài khoản con mới
  const handleAddAccount = () => {
    const nextIdx = accounts.length + 1;
    const newAcc: PickerAccount = {
      id: `tk${nextIdx}`,
      name: `TK ${nextIdx} - Thợ Mới`,
      pickerCode: `PICKER_${nextIdx}`,
      pin: `${nextIdx}${nextIdx}${nextIdx}${nextIdx}`,
      roleLabel: 'Nhặt Chung',
      assignedStrategy: 'ALL',
      maxOrdersPerBatch: config.defaultBatchSize,
      maxPcsPerBatch: 30,
      isActive: true,
      status: 'IDLE',
      currentBatchId: null,
      todayCompletedBatches: 0,
      todayCompletedPcs: 0,
    };
    onUpdateAccounts([...accounts, newAcc]);
  };

  const [isSyncingPickers, setIsSyncingPickers] = useState(false);

  // Đồng bộ danh sách nhân viên từ hệ thống YunWMS (Kho VN02)
  const handleSyncPickersFromWms = async () => {
    setIsSyncingPickers(true);
    try {
      const res = await fetch(`/api/wms/pickers?warehouse=${config.warehouseId || '7'}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.pickers) && data.pickers.length > 0) {
        const wmsPickers = data.pickers;
        const newAccounts: PickerAccount[] = wmsPickers.map((p: any, idx: number) => {
          const code = (p.user_code || '').trim();
          const name = (p.user_name || code).trim();
          let strategy: PickingStrategyType = 'ALL';
          let role = 'Nhặt Chung';

          if (code.toLowerCase().includes('duong') || code.toLowerCase().includes('package1')) {
            strategy = 'SINGLE_PCS';
            role = 'Chuyên Đơn 1 PCS';
          } else if (code.toLowerCase().includes('minh') || code.toLowerCase().includes('package2')) {
            strategy = 'YOGA_ONLY';
            role = 'Chuyên Thảm Yoga';
          } else if (code.toLowerCase().includes('package3') || code.toLowerCase().includes('package4')) {
            strategy = 'MIX_ONLY';
            role = 'Chuyên Đơn Mix';
          }

          return {
            id: `wms_${p.user_id}`,
            name: `${name} (${code})`,
            pickerCode: p.user_id,
            pin: String(1000 + idx),
            roleLabel: role,
            assignedStrategy: strategy,
            maxOrdersPerBatch: config.defaultBatchSize,
            maxPcsPerBatch: 30,
            isActive: true,
            status: 'IDLE' as const,
            currentBatchId: null,
            todayCompletedBatches: 0,
            todayCompletedPcs: 0,
          };
        });

        onUpdateAccounts(newAccounts);
        alert(`✅ Đã đồng bộ thành công ${newAccounts.length} nhân viên thực tế từ hệ thống YunWMS (Kho VN02)!`);
      } else {
        alert(data.message || 'Không tìm thấy danh sách nhân viên trên YunWMS');
      }
    } catch (err: any) {
      alert('Lỗi khi gọi API YunWMS: ' + err.message);
    } finally {
      setIsSyncingPickers(false);
    }
  };

  // Cập nhật từng tài khoản
  const handleAccountChange = (id: string, updates: Partial<PickerAccount>) => {
    onUpdateAccounts(
      accounts.map(acc => (acc.id === id ? { ...acc, ...updates } : acc))
    );
  };

  // Xóa tài khoản
  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      alert('Cần giữ ít nhất 1 tài khoản nhặt hàng trong hệ thống.');
      return;
    }
    if (confirm('Bạn có chắc muốn xóa tài khoản này?')) {
      onUpdateAccounts(accounts.filter(a => a.id !== id));
    }
  };

  const handleSavePin = () => {
    if (!newPin || newPin.length < 4) {
      alert('Mật khẩu quản trị cần ít nhất 4 ký tự.');
      return;
    }
    onUpdateConfig({ ...config, adminPin: newPin.trim() });
    setPinSaved(true);
    setTimeout(() => setPinSaved(false), 2000);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden animate-in fade-in duration-200">
      {/* Top Banner Quản Trị */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white">Trung Tâm Điều Phối & Quản Trị Nhặt Kho</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Admin Mode
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Cài đặt phân bổ đơn theo PCS, nhóm hàng, thảm Yoga, quản lý tài khoản con và tiến độ nhặt
            </p>
          </div>
        </div>

        {/* Nút Chuyển Sang Màn Hình Mobile Picker Cho Nhân Viên */}
        <button
          type="button"
          onClick={onExitAdminMode}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Smartphone className="w-4 h-4" />
          <span>Vào Chế Độ Nhân Viên Đi Nhặt</span>
        </button>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="px-5 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
        <button
          type="button"
          onClick={() => setActiveTab('RULES')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'RULES'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>1. Quy Tắc Phân Bổ (Rules)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ACCOUNTS')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'ACCOUNTS'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>2. Quản Lý Tài Khoản Con ({accounts.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MONITOR')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'MONITOR'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-600" />
          <span>3. Theo Dõi Năng Suất Trực Tiếp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SECURITY')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'SECURITY'
              ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/90'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-600" />
          <span>4. Bảo Mật & Mật Khẩu Admin</span>
        </button>
      </div>

      {/* TAB 1: CÀI ĐẶT QUY TẮC PHÂN BỔ ĐƠN NHẶT HÀNG */}
      {activeTab === 'RULES' && (
        <div className="p-5 sm:p-6 space-y-6">
          <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-indigo-950">Sinh Danh Sách Nhặt Hàng Tự Động Từ Đơn Hiện Có</h4>
              <p className="text-xs text-indigo-700 mt-0.5">
                Hệ thống sẽ quét toàn bộ danh sách đơn hàng đã nạp, phân bổ thành các lượt nhặt cho từng tài khoản con.
              </p>
            </div>
            <button
              type="button"
              onClick={onGenerateBatchesFromOrders}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Phân Bổ & Tạo Batch Ngay</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Setting: Tự động cấp lượt tiếp theo */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div>
                <h5 className="font-bold text-xs text-slate-800">Tự Động Cấp List Tiếp Theo (Auto-Queue)</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Khi nhân viên bấm hoàn thành phiếu nhặt, hệ thống tự động gán ngay phiếu mới vào máy.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.autoAssignNext}
                onChange={e => onUpdateConfig({ ...config, autoAssignNext: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Setting: Hiển thị tồn kho thời gian thực */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div>
                <h5 className="font-bold text-xs text-slate-800">Tra Cứu Tồn Kho WMS Thời Gian Thực</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Nhân viên bấm vào SKU sẽ xem được số lượng tồn thực tế và tồn có thể bán tại kho VN02.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.enableRealtimeInventory}
                onChange={e => onUpdateConfig({ ...config, enableRealtimeInventory: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            {/* Setting: Giới hạn số đơn mỗi lượt nhặt */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div>
                <h5 className="font-bold text-xs text-slate-800">Số Đơn Mặc Định Mỗi Lượt Nhặt (Batch Size)</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Giới hạn số đơn trong 1 phiếu để nhân viên cầm giỏ nhặt vừa sức (Khuyên dùng: 20-30 đơn).
                </p>
              </div>
              <input
                type="number"
                min="5"
                max="100"
                value={config.defaultBatchSize}
                onChange={e => onUpdateConfig({ ...config, defaultBatchSize: Number(e.target.value) || 20 })}
                className="w-20 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-center bg-white"
              />
            </div>

            {/* Setting: Tải ảnh HD */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
              <div>
                <h5 className="font-bold text-xs text-slate-800">Hiển Thị Ảnh Sản Phẩm HD</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Bấm vào SKU hiện ảnh mẫu lớn để nhân viên đối chiếu mẫu mã, chống nhặt nhầm màu/size.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.enableProductImage}
                onChange={e => onUpdateConfig({ ...config, enableProductImage: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ TÀI KHOẢN CON (PICKER ACCOUNTS) */}
      {activeTab === 'ACCOUNTS' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-slate-900">Danh Sách Tài Khoản Con Đi Lấy Hàng</h4>
              <p className="text-xs text-slate-500">Mỗi nhân viên sẽ có 1 tài khoản riêng với quy tắc nhặt chuyên môn</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSyncingPickers}
                onClick={handleSyncPickersFromWms}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-bold text-xs border border-slate-300 transition-all cursor-pointer"
                title="Lấy danh sách 30 tài khoản nhân viên thật trên YunWMS Kho VN02"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-600 ${isSyncingPickers ? 'animate-spin' : ''}`} />
                <span>{isSyncingPickers ? 'Đang Tải...' : 'Đồng Bộ Từ YunWMS VN02'}</span>
              </button>

              <button
                type="button"
                onClick={handleAddAccount}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Tài Khoản Mới</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {accounts.map((acc, index) => (
              <div
                key={acc.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Info Cột Trái */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <input
                      type="text"
                      value={acc.name}
                      onChange={e => handleAccountChange(acc.id, { name: e.target.value })}
                      className="font-bold text-sm text-slate-900 bg-transparent border-b border-dashed border-slate-300 hover:border-indigo-500 focus:outline-none focus:border-indigo-600 px-1 py-0.5"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-slate-500">
                        PIN: <strong>{acc.pin}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] text-indigo-600 font-medium">
                        Hôm nay: {acc.todayCompletedBatches} phiếu ({acc.todayCompletedPcs} PCS)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Chọn Quy Tắc Chuyên Môn (Gán Rule Cho Tài Khoản Con) */}
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Chuyên Môn Nhặt Hàng
                    </label>
                    <select
                      value={acc.assignedStrategy}
                      onChange={e => handleAccountChange(acc.id, { assignedStrategy: e.target.value as PickingStrategyType })}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                    >
                      <option value="ALL">Tất Cả Loại Đơn (Chung)</option>
                      <option value="SINGLE_PCS">Chuyên Đơn 1 PCS (Nhặt Siêu Nhanh)</option>
                      <option value="MULTI_PCS">Chuyên Đơn Nhiều PCS</option>
                      <option value="YOGA_ONLY">Chuyên Thảm Yoga & Hàng Dài</option>
                      <option value="MIX_ONLY">Chuyên Đơn Mix Chủng Loại</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Đơn/Lượt
                    </label>
                    <input
                      type="number"
                      value={acc.maxOrdersPerBatch}
                      onChange={e => handleAccountChange(acc.id, { maxOrdersPerBatch: Number(e.target.value) || 20 })}
                      className="w-16 px-2 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-center"
                    />
                  </div>

                  {/* Nút Xóa */}
                  <div className="pt-4 md:pt-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Xóa tài khoản con"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: THEO DÕI NĂNG SUẤT TRỰC TIẾP (LIVE MONITOR) */}
      {activeTab === 'MONITOR' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900">Bảng Theo Dõi Năng Suất Nhặt Hàng Trực Tiếp</h4>
            <span className="text-xs text-slate-500">Cập nhật thời gian thực</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map(acc => {
              const activeBatch = batches.find(b => b.id === acc.currentBatchId && b.status === 'IN_PROGRESS');
              return (
                <div key={acc.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-sm text-slate-900">{acc.name}</h5>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          activeBatch
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {activeBatch ? 'Đang Nhặt' : 'Rảnh Rỗi'}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Chuyên môn:</span>
                        <strong className="text-indigo-600">{acc.assignedStrategy}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Phiếu hôm nay:</span>
                        <strong className="text-slate-900">{acc.todayCompletedBatches} phiếu</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Tổng PCS đã nhặt:</span>
                        <strong className="text-emerald-600">{acc.todayCompletedPcs} PCS</strong>
                      </div>
                    </div>
                  </div>

                  {activeBatch && (
                    <div className="mt-4 pt-3 border-t border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium">Phiếu hiện tại: {activeBatch.id}</span>
                      <div className="w-full bg-slate-200 rounded-full h-2 mt-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{
                            width: `${
                              activeBatch.totalPcs > 0
                                ? Math.round((activeBatch.pickedPcs / activeBatch.totalPcs) * 100)
                                : 0
                            }%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: BẢO MẬT & ĐỔI MẬT KHẨU ADMIN */}
      {activeTab === 'SECURITY' && (
        <div className="p-5 sm:p-6 max-w-md space-y-4">
          <h4 className="font-bold text-sm text-slate-900">Thay Đổi Mật Khẩu Quản Trị Viên (Admin PIN)</h4>
          <p className="text-xs text-slate-500">
            Mật khẩu này dùng để ngăn nhân viên nhặt kho tự ý can thiệp vào cài đặt quy tắc phân bổ và chia đơn.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu mới (4-8 số hoặc chữ)</label>
              <input
                type="text"
                value={newPin}
                onChange={e => setNewPin(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSavePin}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{pinSaved ? 'Đã Lưu Thành Công!' : 'Lưu Mật Khẩu Mới'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
