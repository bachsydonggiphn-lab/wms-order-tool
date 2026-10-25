import React, { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Package,
  Layers,
  MapPin,
  Search,
  Printer,
  ShieldAlert,
  Trophy,
  RefreshCw,
  Image as ImageIcon,
  Check,
  User,
  ListOrdered,
  LayoutGrid,
  FileText,
  Copy,
  X,
  ExternalLink,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import { PickerAccount, PickingBatch, PickingItemDetail } from '../types';
import { SkuDetailModal } from './SkuDetailModal';
import { BarcodeView } from '../../../components/BarcodeView';

interface PickerMobileViewProps {
  accounts: PickerAccount[];
  activeAccount: PickerAccount | null;
  onSelectAccount: (acc: PickerAccount) => void;
  batches: PickingBatch[];
  currentBatch: PickingBatch | null;
  onSelectBatch: (batchId: string) => void;
  onToggleItemPicked: (batchId: string, sku: string) => void;
  onCompleteBatch: (batchId: string) => void;
  onRequestAdminMode: () => void;
  onOpenPrintModal?: (pickingCode: string) => void;
  tab1PlCount?: number;
  onImportTab1Pls?: () => void;
}

export const PickerMobileView: React.FC<PickerMobileViewProps> = ({
  accounts,
  activeAccount,
  onSelectAccount,
  batches,
  currentBatch,
  onSelectBatch,
  onToggleItemPicked,
  onCompleteBatch,
  onRequestAdminMode,
  onOpenPrintModal,
  tab1PlCount = 0,
  onImportTab1Pls,
}) => {
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNPICKED' | 'PICKED'>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [searchSku, setSearchSku] = useState('');
  const [selectedModalItem, setSelectedModalItem] = useState<PickingItemDetail | null>(null);
  const [isOrderListModalOpen, setIsOrderListModalOpen] = useState(false);
  const [copiedOrderNos, setCopiedOrderNos] = useState(false);

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
          (item.location && item.location.toUpperCase().includes(q)) ||
          item.area.toUpperCase().includes(q)
        );
      }
      return true;
    });
  }, [currentBatch, filterMode, searchSku]);

  const isAllPicked = stats.totalItems > 0 && stats.pickedItems === stats.totalItems;

  const handleCopyOrderNos = () => {
    if (!currentBatch?.orderNos) return;
    navigator.clipboard.writeText(currentBatch.orderNos.join('\n'));
    setCopiedOrderNos(true);
    setTimeout(() => setCopiedOrderNos(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-3.5 pb-24 px-1 sm:px-0">
      {/* 1. TOP HEADER: Switch tài khoản & Nút Khóa Quản Trị */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xs border border-slate-200/80 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600">
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {accounts.map(acc => {
              const isSelected = activeAccount?.id === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => onSelectAccount(acc)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  {acc.name}
                  {acc.todayCompletedBatches > 0 && (
                    <span className={`ml-1.5 text-[10px] px-1 rounded-full ${isSelected ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-800'}`}>
                      {acc.todayCompletedBatches}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nút Admin Settings */}
        <button
          type="button"
          onClick={onRequestAdminMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-all shrink-0 cursor-pointer shadow-2xs"
          title="Mở bảng điều khiển quản trị viên (yêu cầu mật khẩu)"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span className="hidden sm:inline">Quản Trị</span>
        </button>
      </div>

      {/* 2. THANH CHỌN PICKING LIST NHANH (Học tập Tab 1) */}
      {batches.length > 0 ? (
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar shadow-2xs">
          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-1">
            <Package className="w-3.5 h-3.5 text-indigo-500" /> List:
          </span>
          <div className="flex items-center gap-1.5">
            {batches.map(b => {
              const isActive = currentBatch?.id === b.id;
              const isDone = b.status === 'COMPLETED' || (b.items.length > 0 && b.items.every(i => i.isPicked));
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectBatch(b.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <span>{b.pickingCode || b.id}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? 'bg-white/20 text-white' : isDone ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {b.totalOrders}đ
                  </span>
                  {isDone && <Check className="w-3 h-3 text-emerald-500 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      ) : tab1PlCount > 0 ? (
        /* Gợi ý nạp trực tiếp Picking List từ Tab 1 */
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border border-indigo-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Phát hiện {tab1PlCount} Picking List (PL...) từ Tab 1
              </p>
              <p className="text-[11px] text-slate-500">
                Có thể nạp ngay toàn bộ danh sách để chia cho nhân viên đi nhặt hoặc in tem.
              </p>
            </div>
          </div>
          {onImportTab1Pls && (
            <button
              type="button"
              onClick={onImportTab1Pls}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Nạp {tab1PlCount} Picking List Vào App
            </button>
          )}
        </div>
      ) : null}

      {/* 3. THẺ THÔNG TIN PHIẾU NHẶT HÀNG (Chuẩn format Tab 1) */}
      {currentBatch ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-3.5">
          {/* Header phiếu: Mã PL + Barcode + Các nút tác vụ */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {currentBatch.strategyLabel}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Thợ nhặt: <strong className="text-slate-800">{activeAccount?.name || 'Chưa gán'}</strong>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-mono mt-1">
                {currentBatch.pickingCode || currentBatch.id}
              </h2>
            </div>

            {/* Barcode Code128 + In tem */}
            <div className="flex items-center gap-2.5 flex-wrap self-end sm:self-center">
              {/* Barcode SVG */}
              <div className="hidden md:flex flex-col items-center p-1.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <BarcodeView value={currentBatch.pickingCode || currentBatch.id} height={28} barWidth={1.2} />
              </div>

              {/* Nút Xem danh sách mã đơn */}
              <button
                type="button"
                onClick={() => setIsOrderListModalOpen(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer"
                title="Xem danh sách mã đơn thuộc đợt nhặt này"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentBatch.totalOrders} đơn</span>
              </button>

              {/* Nút In Tem Nhiệt 100x150 mm (Học tập Tab 1) */}
              {onOpenPrintModal && (
                <button
                  type="button"
                  onClick={() => onOpenPrintModal(currentBatch.pickingCode || currentBatch.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-xs transition-all cursor-pointer"
                  title="In tem dán nhiệt 100x150 mm hoặc giấy A4"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In Tem (100x150)</span>
                </button>
              )}
            </div>
          </div>

          {/* 3 HỘP THỐNG KÊ CHÍNH (Học tập mẫu tem Tab 1) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="p-2.5 sm:p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100">
              <span className="text-[10px] sm:text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                TỔNG ĐƠN
              </span>
              <span className="text-lg sm:text-2xl font-black text-indigo-950 font-mono">
                {currentBatch.totalOrders}{' '}
                <span className="text-xs font-normal text-indigo-700">đơn</span>
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-amber-50/70 border border-amber-100">
              <span className="text-[10px] sm:text-xs font-bold text-amber-700 uppercase tracking-wider block">
                MÃ SKU
              </span>
              <span className="text-lg sm:text-2xl font-black text-amber-950 font-mono">
                {currentBatch.totalItems}{' '}
                <span className="text-xs font-normal text-amber-800">mã</span>
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                TỔNG PCS
              </span>
              <span className="text-lg sm:text-2xl font-black text-emerald-950 font-mono">
                {currentBatch.totalPcs}{' '}
                <span className="text-xs font-normal text-emerald-800">cái</span>
              </span>
            </div>
          </div>

          {/* Phân loại PCS (1 PCS | 2 PCS | Multi/MIX) */}
          <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 flex-wrap gap-2">
            <span className="font-bold text-slate-700">Phân loại đơn:</span>
            <div className="flex items-center gap-3 font-mono text-[11px] sm:text-xs">
              <span>
                1 PCS: <strong className="text-indigo-600">{currentBatch.pcsSummary?.['1 PCS'] ?? 0}đ</strong>
              </span>
              <span>•</span>
              <span>
                2 PCS: <strong className="text-amber-600">{currentBatch.pcsSummary?.['2 PCS'] ?? 0}đ</strong>
              </span>
              <span>•</span>
              <span>
                Multi/MIX: <strong className="text-purple-600">{currentBatch.pcsSummary?.['Multi'] ?? 0}đ</strong>
              </span>
            </div>
          </div>

          {/* Tiến độ nhặt PCS */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">
                Tiến độ: <strong className="text-emerald-600 font-mono">{stats.pickedPcs}/{stats.totalPcs} PCS</strong> ({stats.pickedItems}/{stats.totalItems} SKU)
              </span>
              <span className="text-indigo-600 font-mono text-sm">{stats.progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-indigo-500 via-amber-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${stats.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Hiện Tại Chưa Có Phiếu Chờ Nhặt!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Vui lòng nạp các Picking List từ Tab 1 hoặc vào mục Quản trị để tạo đợt nhặt mới.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {tab1PlCount > 0 && onImportTab1Pls && (
              <button
                type="button"
                onClick={onImportTab1Pls}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                Nạp {tab1PlCount} Picking List Từ Tab 1
              </button>
            )}
            <button
              type="button"
              onClick={onRequestAdminMode}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
            >
              Vào Cài Đặt Quản Trị
            </button>
          </div>
        </div>
      )}

      {/* 4. THANH CÔNG CỤ: Filter + Search + Switch Xem Dạng Bảng / Thẻ */}
      {currentBatch && (
        <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-2xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất Cả ({stats.totalItems})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('UNPICKED')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'UNPICKED' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Chưa Nhặt ({stats.totalItems - stats.pickedItems})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('PICKED')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'PICKED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Đã Xong ({stats.pickedItems})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search SKU */}
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm SKU hoặc kệ..."
                value={searchSku}
                onChange={e => setSearchSku(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs"
              />
            </div>

            {/* Chuyển đổi Dạng Bảng (Tab 1) / Dạng Thẻ (Mobile) */}
            <div className="flex items-center gap-0.5 p-1 bg-slate-200/80 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'TABLE' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem dạng Bảng (Giống Tab 1)"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('CARDS')}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'CARDS' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Xem dạng Thẻ Mobile"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. DANH SÁCH MÓN HÀNG CẦN NHẶT */}
      {currentBatch && (
        viewMode === 'TABLE' ? (
          /* DẠNG BẢNG CHUẨN TAB 1 (STT | KỆ/KV | MÃ SKU | SL | [✓]) */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 text-center w-12">STT</th>
                    <th className="py-2.5 px-3 w-28">KỆ / KV</th>
                    <th className="py-2.5 px-3">MÃ SKU & SẢN PHẨM</th>
                    <th className="py-2.5 px-3 text-center w-20">SL</th>
                    <th className="py-2.5 px-3 text-center w-14">[✓]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Không có sản phẩm nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item, idx) => {
                      return (
                        <tr
                          key={item.sku}
                          className={`transition-colors ${
                            item.isPicked
                              ? 'bg-emerald-50/40 text-slate-400'
                              : 'hover:bg-indigo-50/30'
                          }`}
                        >
                          {/* STT */}
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>

                          {/* KỆ / KV */}
                          <td className="py-2.5 px-3">
                            <span className="font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/80 text-[11px] whitespace-nowrap">
                              {item.area || 'YD-A'}
                            </span>
                          </td>

                          {/* MÃ SKU (Click mở ảnh & tồn kho) */}
                          <td className="py-2.5 px-3">
                            <div
                              onClick={() => setSelectedModalItem(item)}
                              className="cursor-pointer group inline-block"
                            >
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-mono font-extrabold group-hover:text-indigo-600 transition-colors ${
                                  item.isPicked ? 'line-through text-slate-400' : 'text-slate-900'
                                }`}>
                                  {item.sku}
                                </span>
                                <span className="text-[10px] text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                                  <ImageIcon className="w-3 h-3" /> Xem ảnh
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md mt-0.5">
                                {item.productTitle || item.sku}
                              </p>
                            </div>
                          </td>

                          {/* SỐ LƯỢNG (SL) */}
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-black text-sm sm:text-base text-amber-900 font-mono px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200/80">
                              {item.quantityNeeded}
                            </span>
                          </td>

                          {/* CHECKBOX HOÀN THÀNH */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => onToggleItemPicked(currentBatch.id, item.sku)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-transform active:scale-90 cursor-pointer ${
                                item.isPicked
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border border-slate-300'
                              }`}
                            >
                              {item.isPicked ? <Check className="w-5 h-5 stroke-[3]" /> : <Circle className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* DẠNG THẺ MOBILE (CARD DI ĐỘNG TO, DỄ BẤM KHI DI CHUYỂN) */
          <div className="space-y-2.5">
            {filteredItems.map(item => {
              return (
                <div
                  key={item.sku}
                  className={`bg-white rounded-2xl p-3 sm:p-3.5 border transition-all duration-200 flex items-center justify-between gap-3 shadow-2xs ${
                    item.isPicked ? 'border-emerald-200 bg-emerald-50/20 opacity-75' : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
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

                  <div
                    onClick={() => setSelectedModalItem(item)}
                    className="flex-1 min-w-0 cursor-pointer group"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-extrabold group-hover:text-indigo-600 transition-colors break-all ${
                        item.isPicked ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}>
                        {item.sku}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                        {item.area}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {item.productTitle || item.sku}
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-indigo-600 font-medium">
                      <span className="flex items-center gap-1 group-hover:underline">
                        <ImageIcon className="w-3 h-3" /> Xem ảnh HD & tồn kho
                      </span>
                    </div>
                  </div>

                  <div
                    onClick={() => setSelectedModalItem(item)}
                    className="text-right shrink-0 cursor-pointer px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200/80"
                  >
                    <span className="text-2xl font-black text-amber-900 leading-none font-mono">
                      {item.quantityNeeded}
                    </span>
                    <p className="text-[10px] font-bold text-amber-700 uppercase">PCS</p>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* 6. NÚT HOÀN THÀNH CỐ ĐỊNH Ở ĐÁY */}
      {currentBatch && (
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 shadow-xl">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 hidden sm:block">
              <span>Đã nhặt: </span>
              <strong className="text-emerald-600 text-sm font-mono">{stats.pickedItems}/{stats.totalItems}</strong> SKU
              <span className="mx-2">•</span>
              <strong className="text-emerald-600 text-sm font-mono">{stats.pickedPcs}/{stats.totalPcs}</strong> PCS
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
              <span>{isAllPicked ? '🎉 HOÀN THÀNH & LẤY LIST TIẾP THEO' : `Còn ${stats.totalItems - stats.pickedItems} món (${stats.totalPcs - stats.pickedPcs} PCS) chưa nhặt`}</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL XEM CHI TIẾT SKU + TỒN KHO */}
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

      {/* MODAL XEM DANH SÁCH MÃ ĐƠN HÀNG (ORDER NOS) */}
      {isOrderListModalOpen && currentBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Mã Đơn: {currentBatch.pickingCode || currentBatch.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOrderListModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Danh sách {currentBatch.orderNos?.length || 0} mã đơn hàng thuộc đợt nhặt này:
            </p>

            <div className="max-h-64 overflow-y-auto space-y-1 p-2 bg-slate-50 rounded-2xl border border-slate-200/80 font-mono text-xs">
              {currentBatch.orderNos?.map((no, i) => (
                <div key={no} className="px-2 py-1 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 text-[10px] w-6">#{i + 1}</span>
                  <span className="font-bold text-slate-800">{no}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyOrderNos}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedOrderNos ? 'Đã Sao Chép!' : 'Sao Chép Tất Cả Mã Đơn'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOrderListModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
