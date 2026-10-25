import React, { useState, useEffect, useMemo } from 'react';
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
  Smartphone,
  Printer,
  Package,
  Clock,
  Calendar,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import {
  PickerAccount,
  AdminDispatchConfig,
  PickingStrategyType,
  PickingBatch,
  AutoScheduleTimeSlot,
  AutoDispatchLogEntry,
} from '../types';

interface AdminDispatchSettingsProps {
  config: AdminDispatchConfig;
  onUpdateConfig: (newConfig: AdminDispatchConfig) => void;
  accounts: PickerAccount[];
  onUpdateAccounts: (newAccounts: PickerAccount[]) => void;
  batches: PickingBatch[];
  onGenerateBatchesFromOrders: () => void;
  onSyncWmsPickingList?: (batchId: string) => void;
  onExitAdminMode: () => void;
  tab1PlCount?: number;
  onImportTab1Pls?: () => void;
  onOpenPrintModal?: (pickingCode: string) => void;
  onTriggerAutoDispatch?: (slotTime?: string) => Promise<{
    success: boolean;
    message: string;
    ordersCount: number;
    batchesCount: number;
  }>;
  autoDispatchLogs?: AutoDispatchLogEntry[];
  onClearLogs?: () => void;
}

export const AdminDispatchSettings: React.FC<AdminDispatchSettingsProps> = ({
  config,
  onUpdateConfig,
  accounts,
  onUpdateAccounts,
  batches,
  onGenerateBatchesFromOrders,
  onSyncWmsPickingList,
  onExitAdminMode,
  tab1PlCount = 0,
  onImportTab1Pls,
  onOpenPrintModal,
  onTriggerAutoDispatch,
  autoDispatchLogs = [],
  onClearLogs,
}) => {
  const [activeTab, setActiveTab] = useState<
    'AUTO_SCHEDULE' | 'RULES' | 'ACCOUNTS' | 'MONITOR' | 'SECURITY'
  >('AUTO_SCHEDULE');
  const [newPin, setNewPin] = useState(config.adminPin);
  const [pinSaved, setPinSaved] = useState(false);

  // State cho thêm khung giờ mới
  const [newSlotTime, setNewSlotTime] = useState('08:00');
  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [isTriggeringAuto, setIsTriggeringAuto] = useState(false);
  const [autoTriggerResult, setAutoTriggerResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Đếm ngược đến khung giờ chạy tiếp theo
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [nextRunInfo, setNextRunInfo] = useState<{
    slotTime: string;
    label: string;
    countdownStr: string;
  } | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentHhMm = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const currentSec = now.getSeconds();
      setCurrentTimeStr(`${currentHhMm}:${String(currentSec).padStart(2, '0')}`);

      const slots = config.scheduleSlots || [];
      const enabledSlots = slots.filter(s => s.enabled);
      if (enabledSlots.length === 0 || !config.enableAutoSchedule) {
        setNextRunInfo(null);
        return;
      }

      // Tìm slot gần nhất trong tương lai
      const nowTotalMin = now.getHours() * 60 + now.getMinutes() + currentSec / 60;
      let minDiff = Infinity;
      let targetSlot: AutoScheduleTimeSlot | null = null;

      enabledSlots.forEach(slot => {
        const [h, m] = slot.time.split(':').map(Number);
        const slotTotalMin = h * 60 + m;
        let diff = slotTotalMin - nowTotalMin;
        if (diff <= 0) {
          diff += 24 * 60; // Ngày hôm sau
        }
        if (diff < minDiff) {
          minDiff = diff;
          targetSlot = slot;
        }
      });

      if (targetSlot) {
        const hoursLeft = Math.floor(minDiff / 60);
        const minsLeft = Math.floor(minDiff % 60);
        const secsLeft = Math.floor((60 - currentSec) % 60);
        setNextRunInfo({
          slotTime: targetSlot.time,
          label: targetSlot.label,
          countdownStr: `${hoursLeft} giờ ${minsLeft} phút ${secsLeft} giây`,
        });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [config.scheduleSlots, config.enableAutoSchedule]);

  // Thêm khung giờ chạy tự động
  const handleAddSlot = () => {
    if (!newSlotTime) return;
    const slots = config.scheduleSlots || [];
    if (slots.some(s => s.time === newSlotTime)) {
      alert(`Khung giờ ${newSlotTime} đã có trong danh sách.`);
      return;
    }
    const newSlot: AutoScheduleTimeSlot = {
      id: `slot-${Date.now()}`,
      time: newSlotTime,
      label: newSlotLabel.trim() || `Đợt ${newSlotTime}`,
      enabled: true,
    };
    const updated = [...slots, newSlot].sort((a, b) => a.time.localeCompare(b.time));
    onUpdateConfig({ ...config, scheduleSlots: updated });
    setNewSlotLabel('');
  };

  // Bật/tắt 1 khung giờ
  const handleToggleSlot = (id: string) => {
    const slots = config.scheduleSlots || [];
    const updated = slots.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    onUpdateConfig({ ...config, scheduleSlots: updated });
  };

  // Xóa 1 khung giờ
  const handleDeleteSlot = (id: string) => {
    const slots = config.scheduleSlots || [];
    if (slots.length <= 1) {
      alert('Cần giữ ít nhất 1 khung giờ tự động trong hệ thống.');
      return;
    }
    const updated = slots.filter(s => s.id !== id);
    onUpdateConfig({ ...config, scheduleSlots: updated });
  };

  // Kích hoạt chạy thủ công ngay lập tức
  const handleRunNow = async () => {
    if (!onTriggerAutoDispatch) {
      onGenerateBatchesFromOrders();
      return;
    }
    setIsTriggeringAuto(true);
    setAutoTriggerResult(null);
    try {
      const res = await onTriggerAutoDispatch('Manual Trigger');
      setAutoTriggerResult(res);
    } catch (e: any) {
      setAutoTriggerResult({
        success: false,
        message: e?.message || 'Có lỗi xảy ra khi kích hoạt tự động.',
      });
    } finally {
      setIsTriggeringAuto(false);
    }
  };

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
          } else if (code.toLowerCase().includes('pack')) {
            strategy = 'MIX_ONLY';
            role = 'Chuyên Đơn Mix';
          }

          return {
            id: `tk${idx + 1}`,
            name: `${name} (${code})`,
            pickerCode: code,
            pin: String(1000 + idx + 1),
            roleLabel: role,
            assignedStrategy: strategy,
            maxOrdersPerBatch: config.defaultBatchSize || 20,
            maxPcsPerBatch: 30,
            isActive: true,
            status: 'IDLE',
            currentBatchId: null,
            todayCompletedBatches: 0,
            todayCompletedPcs: 0,
          };
        });
        onUpdateAccounts(newAccounts);
        alert(`Đã đồng bộ thành công ${newAccounts.length} nhân viên nhặt kho thực tế từ YunWMS!`);
      } else {
        alert('Không tìm thấy danh sách nhân viên trên YunWMS.');
      }
    } catch (e: any) {
      alert('Lỗi kết nối tới YunWMS: ' + e?.message);
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
              <h2 className="text-lg font-bold tracking-tight text-white">
                Trung Tâm Điều Phối & Quản Trị Nhặt Kho
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Admin Mode
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Tự động hóa in đơn mỗi 8:00 AM (hoặc giờ tùy chỉnh), phân bổ thông minh 1 PCS (75%), 2 PCS (14%), Multi (5%)
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
          onClick={() => setActiveTab('AUTO_SCHEDULE')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'AUTO_SCHEDULE'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>⚡ Tự Động Hóa In Đơn ({config.scheduleSlots?.filter(s => s.enabled).length || 0} Giờ)</span>
        </button>

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

      {/* ======================================================== */}
      {/* TAB 0: TỰ ĐỘNG HÓA TẠO LIST & IN ĐƠN (8:00 AM HOẶC GIỜ CÀI) */}
      {/* ======================================================== */}
      {activeTab === 'AUTO_SCHEDULE' && (
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* Header Card Giới Thiệu & Đồng Hồ Đếm Ngược */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/70 p-5 rounded-3xl border border-amber-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Flame className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base text-amber-950">
                      Tự Động Hóa Tạo List & In Đơn Theo Giờ Cài Đặt
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 border border-amber-300">
                      Học hỏi từ 16,693 đơn (4 ngày qua)
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Hệ thống tự động canh giờ trên máy local, quét đơn <strong>Submitted (E11=4)</strong>, gom thuần nhất theo 1 PCS (75%), 2 PCS (14%), Multi, chia cho các tài khoản và tự động in tem nhiệt 100x150 mm.
                  </p>
                </div>
              </div>

              {/* Toggle Bật/Tắt Tự Động Hóa */}
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-amber-200/80 shadow-2xs shrink-0 self-stretch sm:self-auto justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Trạng Thái Tự Động</span>
                  <span className={`text-[11px] font-bold ${config.enableAutoSchedule ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {config.enableAutoSchedule ? '🟢 Đang Bật Canh Giờ' : '⚪ Đã Tạm Tắt'}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={config.enableAutoSchedule}
                  onChange={e => onUpdateConfig({ ...config, enableAutoSchedule: e.target.checked })}
                  className="w-6 h-6 rounded-md text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Đồng Hồ Đếm Ngược Đến Giờ Chạy Tiếp Theo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200/70">
              <div className="p-3 bg-white/90 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Giờ máy local hiện tại</span>
                  <p className="text-lg font-black text-slate-900 font-mono mt-0.5">{currentTimeStr || '...'}</p>
                </div>
                <Clock className="w-5 h-5 text-amber-600" />
              </div>

              <div className="p-3 bg-white/90 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-700 uppercase">
                    {nextRunInfo ? `Đợt tiếp theo: ${nextRunInfo.slotTime} (${nextRunInfo.label})` : 'Chưa có khung giờ nào bật'}
                  </span>
                  <p className="text-lg font-black text-amber-900 font-mono mt-0.5">
                    {nextRunInfo ? `Còn ${nextRunInfo.countdownStr}` : 'Vui lòng bật ít nhất 1 khung giờ'}
                  </p>
                </div>
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
            </div>

            {/* Nút Kích Hoạt Chạy Ngay Bây Giờ (Thử Nghiệm) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-amber-900 font-medium">
                Muốn thử nghiệm ngay bây giờ mà không cần đợi đến giờ hẹn?
              </div>
              <button
                type="button"
                onClick={handleRunNow}
                disabled={isTriggeringAuto}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className={`w-4 h-4 ${isTriggeringAuto ? 'animate-spin' : ''}`} />
                <span>{isTriggeringAuto ? 'Đang Gom Đơn & Tạo List...' : '🚀 Kích Hoạt Chạy Ngay Bây Giờ'}</span>
              </button>
            </div>

            {/* Kết quả kích hoạt */}
            {autoTriggerResult && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between ${
                autoTriggerResult.success ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}>
                <span>{autoTriggerResult.message}</span>
                <button type="button" onClick={() => setAutoTriggerResult(null)} className="text-xs underline cursor-pointer">
                  Đóng
                </button>
              </div>
            )}
          </div>

          {/* KHỐI 1: DANH SÁCH KHUNG GIỜ DO NGƯỜI DÙNG CÀI ĐẶT */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Các Khung Giờ Chạy Tự Động Trong Ngày (Do Bạn Cài Đặt)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bạn có thể đặt giờ cố định như <strong>08:00 AM</strong> hoặc thêm bất kỳ giờ nào tùy theo ca làm của kho.
                </p>
              </div>
            </div>

            {/* Danh sách các slot */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(config.scheduleSlots || []).map((slot, idx) => (
                <div
                  key={slot.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 shadow-2xs ${
                    slot.enabled
                      ? 'bg-indigo-50/40 border-indigo-200 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-2xl font-black font-mono tracking-tight text-indigo-950 block">
                        {slot.time}
                      </span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5">
                        {slot.label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                      title="Xóa khung giờ này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-600">
                      {slot.enabled ? 'Đang hoạt động' : 'Tạm tắt'}
                    </span>
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={() => handleToggleSlot(slot.id)}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Form Thêm Khung Giờ Mới */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Chọn giờ:</span>
                <input
                  type="time"
                  value={newSlotTime}
                  onChange={e => setNewSlotTime(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs"
                />
              </div>

              <input
                type="text"
                placeholder="Tên đợt (ví dụ: Đợt 4 - Tăng ca tối 20:00)..."
                value={newSlotLabel}
                onChange={e => setNewSlotLabel(e.target.value)}
                className="flex-1 px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs w-full"
              />

              <button
                type="button"
                onClick={handleAddSlot}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Khung Giờ</span>
              </button>
            </div>
          </div>

          {/* KHỐI 2: QUY TẮC PHÂN TÁCH ĐƠN HÀNG KHI ĐẾN GIỜ (HỌC HỎI TỪ 4 NGÀY QUA) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Quy Tắc Tạo Picking List Tự Động (Đã Học Từ Dữ Liệu Thực Tế Kho)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Các thông số dưới đây được thiết lập tối ưu theo 16,693 đơn hàng thực tế mà quản lý kho đã tạo:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Cài đặt Batch 1 PCS */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 uppercase">Đơn 1 PCS (Chiếm 75%)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                    Nhặt Nhanh
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Gom toàn bộ đơn 1 món lại với nhau, sắp xếp theo thứ tự kệ kho: Thảm Yoga ➔ A ➔ B ➔ D ➔ G.
                </p>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Số đơn tối đa / 1 Picking List:
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="500"
                    value={config.batchSize1Pcs || 150}
                    onChange={e => onUpdateConfig({ ...config, batchSize1Pcs: parseInt(e.target.value, 10) || 150 })}
                    className="w-full px-3 py-1.5 rounded-xl border border-emerald-300 font-mono font-bold text-sm bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Khuyên dùng: 100 - 200 đơn</span>
                </div>
              </div>

              {/* Cài đặt Batch 2 PCS */}
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 uppercase">Đơn 2 PCS (Chiếm 14%)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                    Cùng Kệ
                  </span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Gom các đơn đúng 2 món (cùng khu vực kệ), giúp thợ chỉ cần đứng tại 1 kệ là nhặt xong.
                </p>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Số đơn tối đa / 1 Picking List:
                  </label>
                  <input
                    type="number"
                    min="20"
                    max="200"
                    value={config.batchSize2Pcs || 50}
                    onChange={e => onUpdateConfig({ ...config, batchSize2Pcs: parseInt(e.target.value, 10) || 50 })}
                    className="w-full px-3 py-1.5 rounded-xl border border-amber-300 font-mono font-bold text-sm bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Khuyên dùng: 50 - 70 đơn</span>
                </div>
              </div>

              {/* Cài đặt Batch Multi / Mix */}
              <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 uppercase">Đơn Multi / Mix (Chiếm 5%)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                    Kỹ Tính
                  </span>
                </div>
                <p className="text-[11px] text-purple-800">
                  Các đơn 3+ món hoặc mix nhiều mã khác nhau. Gom thành list nhỏ để thợ nhặt cẩn thận.
                </p>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Số đơn tối đa / 1 Picking List:
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="50"
                    value={config.batchSizeMultiPcs || 25}
                    onChange={e => onUpdateConfig({ ...config, batchSizeMultiPcs: parseInt(e.target.value, 10) || 25 })}
                    className="w-full px-3 py-1.5 rounded-xl border border-purple-300 font-mono font-bold text-sm bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Khuyên dùng: 15 - 25 đơn</span>
                </div>
              </div>
            </div>

            {/* Tùy chọn In Tem Tự Động */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">Tự Động Mở In Tem Nhiệt 100×150 mm Khi Đến Giờ</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hệ thống sẽ tự động tổng hợp và mở tem in nhặt hàng cho các Picking List vừa tạo.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={config.autoPrintThermal}
                onChange={e => onUpdateConfig({ ...config, autoPrintThermal: e.target.checked })}
                className="w-5 h-5 rounded text-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* KHỐI 3: NHẬT KÝ LỊCH SỬ CHẠY TỰ ĐỘNG HÓA */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Nhật Ký Các Đợt Chạy Tự Động Gần Nhất</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ghi nhận đầy đủ thời gian máy local tự quét đơn và số lượng list nhặt được tạo ra.
                </p>
              </div>

              {autoDispatchLogs.length > 0 && onClearLogs && (
                <button
                  type="button"
                  onClick={onClearLogs}
                  className="text-xs text-slate-400 hover:text-rose-600 underline cursor-pointer"
                >
                  Xóa lịch sử
                </button>
              )}
            </div>

            {autoDispatchLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/80">
                Chưa có lịch sử chạy tự động nào. Hệ thống sẽ ghi nhận khi đến khung giờ hẹn hoặc khi bạn bấm "Kích Hoạt Chạy Ngay Bây Giờ".
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {autoDispatchLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${
                        log.status === 'SUCCESS' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                      <div>
                        <span className="font-bold text-slate-800 font-mono">{log.timestamp}</span>
                        <span className="text-slate-400 ml-1.5">({log.slotTime})</span>
                        <p className="text-[11px] text-slate-600 mt-0.5">{log.message}</p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-[11px] shrink-0">
                      <span className="font-bold text-indigo-700">{log.batchesCreated} List</span>
                      <span className="text-slate-400 mx-1">•</span>
                      <span className="text-slate-700">{log.totalOrdersFetched} Đơn</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: CÀI ĐẶT QUY TẮC PHÂN BỔ ĐƠN NHẶT HÀNG */}
      {activeTab === 'RULES' && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Card Nạp Picking List Từ Tab 1 */}
          {tab1PlCount > 0 && onImportTab1Pls && (
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-4 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-emerald-950">
                      Phát Hiện {tab1PlCount} Picking List (PL...) Từ Tab 1
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      Khuyên Dùng
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Hệ thống sẽ nạp nguyên bản toàn bộ các mã PL WMS thực tế (như PL7261...), giữ nguyên phân loại 1 PCS / 2 PCS / Multi, và chia đều cho các tài khoản đang hoạt động.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onImportTab1Pls}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Package className="w-4 h-4" />
                <span>Nạp {tab1PlCount} Picking List Tab 1</span>
              </button>
            </div>
          )}

          <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-indigo-950">Phân Bổ Tự Động Từ Đơn Chưa Có PL</h4>
              <p className="text-xs text-indigo-700 mt-0.5">
                Hệ thống sẽ gom các đơn lẻ (Submitted E11=4) theo quy tắc 1 PCS, 2 PCS cùng kệ, hoặc Thảm Yoga để tạo các đợt mới.
              </p>
            </div>
            <button
              type="button"
              onClick={onGenerateBatchesFromOrders}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Tạo Batch Đơn Mới</span>
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
                <h5 className="font-bold text-xs text-slate-800">Xem Tồn Kho Realtime Khi Nhấn Vào SKU</h5>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cho phép người đi nhặt bấm vào SKU để xem ảnh HD và tồn kho còn bao nhiêu PCS trên YunWMS.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.enableRealtimeInventory}
                onChange={e => onUpdateConfig({ ...config, enableRealtimeInventory: e.target.checked })}
                className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUẢN LÝ TÀI KHOẢN CON ĐI NHẶT HÀNG */}
      {activeTab === 'ACCOUNTS' && (
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">Danh Sách Tài Khoản Con (Thợ Đi Nhặt)</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Mỗi tài khoản có mã PIN riêng, đăng nhập trên di động hoặc máy tính bảng để đi nhặt.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncPickersFromWms}
                disabled={isSyncingPickers}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Lấy danh sách nhân viên thực tế đang có trên hệ thống WMS kho VN02"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPickers ? 'animate-spin' : ''}`} />
                <span>{isSyncingPickers ? 'Đang Tải...' : 'Đồng Bộ Từ WMS'}</span>
              </button>
              <button
                type="button"
                onClick={handleAddAccount}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Tài Khoản</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {accounts.map(acc => (
              <div
                key={acc.id}
                className={`p-4 rounded-2xl border transition-all ${
                  acc.isActive
                    ? 'bg-white border-slate-200 shadow-2xs hover:border-indigo-300'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      ID: {acc.id}
                    </span>
                    <input
                      type="text"
                      value={acc.name}
                      onChange={e => handleAccountChange(acc.id, { name: e.target.value })}
                      className="font-bold text-sm text-slate-800 block mt-1.5 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                    title="Xóa tài khoản này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Mã Picker WMS:</span>
                    <input
                      type="text"
                      value={acc.pickerCode}
                      onChange={e => handleAccountChange(acc.id, { pickerCode: e.target.value })}
                      className="font-mono text-xs font-bold text-right text-slate-700 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-24"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Mã PIN đăng nhập:</span>
                    <input
                      type="text"
                      value={acc.pin}
                      onChange={e => handleAccountChange(acc.id, { pin: e.target.value })}
                      className="font-mono font-bold text-xs text-right text-indigo-600 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-20"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 font-medium">Chuyên môn:</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                      {acc.roleLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-600 font-semibold text-[11px]">Kích hoạt hoạt động:</span>
                    <input
                      type="checkbox"
                      checked={acc.isActive}
                      onChange={e => handleAccountChange(acc.id, { isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: THEO DÕI NĂNG SUẤT & DANH SÁCH BATCHES */}
      {activeTab === 'MONITOR' && (
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase">Tổng Số Đợt Nhặt</span>
              <p className="text-2xl font-black text-slate-900 mt-1 font-mono">{batches.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200">
              <span className="text-xs font-bold text-indigo-700 uppercase">Tổng Số PCS Cần Lấy</span>
              <p className="text-2xl font-black text-indigo-900 mt-1 font-mono">
                {batches.reduce((sum, b) => sum + b.totalPcs, 0)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-700 uppercase">Đã Hoàn Thành</span>
              <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">
                {batches.filter(b => b.status === 'COMPLETED').length} / {batches.length}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-bold text-sm text-slate-900">Danh Sách Các Đợt Nhặt Hàng (Batches)</h5>
                <p className="text-xs text-slate-500">Tạo Picking List trên WMS để chuyển đơn từ Submitted (4) sang Shelved (5)</p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-xl">
                Tổng cộng: {batches.length} đợt nhặt
              </span>
            </div>

            {batches.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500">
                Chưa có đợt nhặt nào. Vui lòng bấm "Phân Bổ & Tạo Batch Ngay" ở Tab 1 (Quy Tắc) hoặc Tab ⚡ Tự Động Hóa.
              </div>
            ) : (
              <div className="space-y-2.5">
                {batches.map(batch => (
                  <div
                    key={batch.id}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-900 font-mono">{batch.id}</span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {batch.strategyLabel}
                        </span>
                        <span className="text-xs text-slate-500">
                          Thợ: <strong className="text-slate-800">{batch.pickerName}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-600">
                        <span>Đơn: <strong>{batch.totalOrders}</strong></span>
                        <span>SKU: <strong>{batch.totalItems}</strong></span>
                        <span>Tổng PCS: <strong className="text-indigo-600">{batch.totalPcs}</strong></span>
                        <span>Đã nhặt: <strong className="text-emerald-600">{batch.pickedPcs} PCS</strong></span>
                      </div>
                    </div>

                    {/* Trạng thái WMS, In Tem & Nút gọi API tạo phiếu */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                      {onOpenPrintModal && (
                        <button
                          type="button"
                          onClick={() => onOpenPrintModal(batch.pickingCode || batch.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-2xs"
                          title="In phiếu nhặt hàng tem nhiệt 100x150 mm hoặc khổ A4"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          <span>In Tem (100x150)</span>
                        </button>
                      )}

                      {batch.pickingCode ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>WMS: {batch.pickingCode} (Shelved E11=5)</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onSyncWmsPickingList && onSyncWmsPickingList(batch.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                          title="Gửi danh sách đơn lên WMS để nhận mã PL và đổi trạng thái sang Shelved"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Tạo PL Trên WMS (E11=5)</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
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
