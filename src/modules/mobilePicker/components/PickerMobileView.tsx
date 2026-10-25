import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Package,
  Layers,
  MapPin,
  Flame,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Trophy,
  RefreshCw,
  LogOut,
  Image as ImageIcon,
  ChevronRight,
  Eye,
  Check,
  User,
} from 'lucide-react';
import { PickerAccount, PickingBatch, PickingItemDetail } from '../types';
import { SkuDetailModal } from './SkuDetailModal';

interface PickerMobileViewProps {
  accounts: PickerAccount[];
  activeAccount: PickerAccount | null;
  onSelectAccount: (acc: PickerAccount) => void;
  currentBatch: PickingBatch | null;
  onToggleItemPicked: (batchId: string, sku: string) => void;
  onCompleteBatch: (batchId: string) => void;
  onRequestAdminMode: () => void;
}

export const PickerMobileView: React.FC<PickerMobileViewProps> = ({
  accounts,
  activeAccount,
  onSelectAccount,
  currentBatch,
  onToggleItemPicked,
  onCompleteBatch,
  onRequestAdminMode,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNPICKED' | 'PICKED'>('ALL');
  const [searchSku, setSearchSku] = useState('');
  const [selectedModalItem, setSelectedModalItem] = useState<PickingItemDetail | null>(null);

  // Tính toán tiến độ nhặt
  const stats = useMemo(() => {
    if (!currentBatch || !currentBatch.items) {
      return { totalItems: 0, pickedItems: 0, totalPcs: 0, pickedPcs: 0, progressPercent: 0 };
    }
    const totalItems = currentBatch.items.length;
    const pickedItems = currentBatch.items.filter(i => i.isPicked).length;
    const totalPcs = currentBatch.items.reduce((acc, i) => acc + i.quantityNeeded, 0);
    const pickedPcs = currentBatch.items.reduce((acc, i) => acc + (i.isPicked ? i.quantityNeeded : 0), 0);
    const progressPercent = totalPcs > 0 ? Math.round((pickedPcs / totalPcs) * 100) : 0;

    return { totalItems, pickedItems, totalPcs, pickedPcs, progressPercent };
  }, [currentBatch]);

  // Lọc danh sách hiển thị
  const filteredItems = useMemo(() => {
    if (!currentBatch || !currentBatch.items) return [];
    return currentBatch.items.filter(item => {
      if (filterMode === 'UNPICKED' && item.isPicked) return false;
      if (filterMode === 'PICKED' && !item.isPicked) return false;
      if (searchSku.trim()) {
        const q = searchSku.trim().toUpperCase();
        return (
          item.sku.toUpperCase().includes(q) ||
          item.productTitle.toUpperCase().includes(q) ||
          (item.location && item.location.toUpperCase().includes(q))
        );
      }
      return true;
    });
  }, [currentBatch, filterMode, searchSku]);

  const isAllPicked = stats.totalItems > 0 && stats.pickedItems === stats.totalItems;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24">
      {/* Top Header: Chọn tài khoản nhân viên & Nút Khóa Quản Trị */}
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 flex items-center justify-between gap-3">
        {/* Dropdown hoặc Switch tài khoản con */}
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar py-0.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600">
            <User className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {accounts.map(acc => {
              const isSelected = activeAccount?.id === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => onSelectAccount(acc)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {acc.name}
                  {acc.todayCompletedBatches > 0 && (
                    <span className={`ml-1.5 text-[10px] px-1 py-0.2 rounded-full ${isSelected ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-800'}`}>
                      {acc.todayCompletedBatches}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nút Admin Settings (Có ổ khóa) */}
        <button
          type="button"
          onClick={onRequestAdminMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all shrink-0 cursor-pointer"
          title="Mở bảng điều khiển quản trị viên (yêu cầu mật khẩu)"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">Quản Trị</span>
        </button>
      </div>

      {/* Thông tin Phiếu Nhặt Hàng Đang Thực Hiện */}
      {currentBatch ? (
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-indigo-800/50">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {currentBatch.strategyLabel}
                </span>
                <span className="text-xs text-indigo-300 font-mono">
                  {currentBatch.pickingCode || currentBatch.id}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white mt-1">
                Phiếu Nhặt: {currentBatch.totalOrders} đơn hàng ({currentBatch.totalPcs} PCS)
              </h2>
            </div>

            <div className="text-right shrink-0">
              <span className="text-2xl font-black text-amber-400">{stats.progressPercent}%</span>
              <p className="text-[11px] text-indigo-200">
                {stats.pickedPcs}/{stats.totalPcs} PCS
              </p>
            </div>
          </div>

          {/* Thanh Tiến Độ Visual */}
          <div className="mt-3.5 w-full bg-white/10 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
            <div
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.progressPercent}%` }}
            />
          </div>

          {/* Sub Stats Row */}
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-indigo-200">
            <span>Tiến độ SKU: <strong>{stats.pickedItems}/{stats.totalItems}</strong></span>
            <span>Thợ nhặt: <strong className="text-white">{activeAccount?.name || 'Nhân viên'}</strong></span>
          </div>
        </div>
      ) : (
        /* Trạng thái chưa có phiếu / Hoàn thành hết */
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200/80 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Hiện Tại Chưa Có Phiếu Chờ Nhặt!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Tất cả đơn hàng theo quy tắc của bạn đã được hoàn thành hoặc Quản trị viên chưa tạo đợt mới.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onRequestAdminMode}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              Vào Cài Đặt Chia Đợt Nhặt Mới
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      {currentBatch && (
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          {/* 3 Nút Filter: Tất cả | Chưa nhặt | Đã nhặt */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất Cả ({stats.totalItems})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('UNPICKED')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'UNPICKED'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Chưa Nhặt ({stats.totalItems - stats.pickedItems})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('PICKED')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterMode === 'PICKED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Đã Xong ({stats.pickedItems})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm nhanh SKU hoặc vị trí kệ..."
              value={searchSku}
              onChange={e => setSearchSku(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs"
            />
          </div>
        </div>
      )}

      {/* DANH SÁCH MÓN HÀNG CẦN NHẶT (CARD DI ĐỘNG) */}
      {currentBatch && (
        <div className="space-y-2.5">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Không có sản phẩm nào phù hợp với bộ lọc.
            </div>
          ) : (
            filteredItems.map(item => {
              return (
                <div
                  key={item.sku}
                  className={`bg-white rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 flex items-center justify-between gap-3 shadow-2xs ${
                    item.isPicked
                      ? 'border-emerald-200 bg-emerald-50/20 opacity-75'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {/* Left: Checkbox To Dễ Bấm Bằng Ngón Tay */}
                  <button
                    type="button"
                    onClick={() => onToggleItemPicked(currentBatch.id, item.sku)}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${
                      item.isPicked
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border border-slate-300'
                    }`}
                  >
                    {item.isPicked ? <Check className="w-6 h-6 stroke-[3]" /> : <Circle className="w-6 h-6" />}
                  </button>

                  {/* Center: SKU & Thông tin vị trí kệ (Click vào để mở modal xem ảnh HD & tồn kho) */}
                  <div
                    onClick={() => setSelectedModalItem(item)}
                    className="flex-1 min-w-0 cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors break-all">
                        {item.sku}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                        {item.area}
                      </span>
                      {item.location && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 shrink-0 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-indigo-500" /> {item.location}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 truncate mt-0.5" title={item.productTitle}>
                      {item.productTitle || 'Sản phẩm tiêu chuẩn kho'}
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-indigo-600 font-medium">
                      <span className="flex items-center gap-1 group-hover:underline">
                        <ImageIcon className="w-3 h-3" /> Xem ảnh & tồn kho
                      </span>
                    </div>
                  </div>

                  {/* Right: Số lượng cần nhặt (To & Nổi bật) */}
                  <div
                    onClick={() => setSelectedModalItem(item)}
                    className="text-right shrink-0 cursor-pointer px-2 py-1 rounded-xl bg-amber-50 border border-amber-200/80"
                  >
                    <span className="text-2xl font-black text-amber-900 leading-none">
                      {item.quantityNeeded}
                    </span>
                    <p className="text-[10px] font-bold text-amber-700 uppercase">PCS</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* NÚT CỐ ĐỊNH Ở ĐÁY: HOÀN THÀNH PHIẾU NHẶT & CẤP LIST MỚI */}
      {currentBatch && (
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 hidden sm:block">
              <span>Đã nhặt: </span>
              <strong className="text-emerald-600 text-sm">{stats.pickedItems}/{stats.totalItems}</strong> SKU
            </div>

            <button
              type="button"
              disabled={!isAllPicked}
              onClick={() => onCompleteBatch(currentBatch.id)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md active:scale-98 cursor-pointer ${
                isAllPicked
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white ring-4 ring-emerald-100 animate-pulse'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isAllPicked ? '🎉 HOÀN THÀNH & LẤY LIST TIẾP THEO' : `Còn ${stats.totalItems - stats.pickedItems} món chưa nhặt`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Chi Tiết SKU Phóng To + Tồn Kho WMS */}
      <SkuDetailModal
        isOpen={Boolean(selectedModalItem)}
        onClose={() => setSelectedModalItem(null)}
        item={selectedModalItem}
        onConfirmPicked={(sku) => {
          if (currentBatch) {
            onToggleItemPicked(currentBatch.id, sku);
          }
        }}
      />
    </div>
  );
};
