import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  X,
  CheckSquare,
  Square,
  Layers,
  FileText,
  Sliders,
  Check,
  ChevronDown,
  Warehouse,
  Boxes,
  Eye,
  HelpCircle
} from 'lucide-react';
import { InventoryQueryResult, InventoryGroupSummary } from '../types';
import { InventoryPrintOptions, openInventoryPrintWindow } from '../utils/inventoryPrint';

interface InventoryPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InventoryQueryResult | null;
  initialGroup?: string; // Nhóm được chọn sẵn nếu bấm nút "In nhóm này" từ card
}

export const InventoryPrintModal: React.FC<InventoryPrintModalProps> = ({
  isOpen,
  onClose,
  data,
  initialGroup
}) => {
  // Scope: 'ALL' (Tổng hợp) | 'SINGLE_GROUP' (Từng nhóm riêng) | 'SELECTED_GROUPS' (Nhiều nhóm tùy chọn)
  const [scope, setScope] = useState<'ALL' | 'SINGLE_GROUP' | 'SELECTED_GROUPS'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedGroupSet, setSelectedGroupSet] = useState<Set<string>>(new Set());

  // Options
  const [includePhysicalCheck, setIncludePhysicalCheck] = useState<boolean>(true);
  const [includeTransit, setIncludeTransit] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'compact' | 'normal' | 'large'>('normal');
  const [sortBy, setSortBy] = useState<'sku' | 'inUsed' | 'sellable'>('sku');

  // Preview tab or live preview
  const [activeTab, setActiveTab] = useState<'CONFIG' | 'PREVIEW'>('CONFIG');

  // Cập nhật initialGroup khi modal mở
  useEffect(() => {
    if (initialGroup && initialGroup !== 'ALL') {
      setScope('SINGLE_GROUP');
      setSelectedGroup(initialGroup);
      setSelectedGroupSet(new Set([initialGroup]));
    } else {
      setScope('ALL');
      if (data?.groups && data.groups.length > 0) {
        setSelectedGroup(data.groups[0].group);
        setSelectedGroupSet(new Set(data.groups.map(g => g.group)));
      }
    }
  }, [initialGroup, isOpen, data]);

  // Tất cả nhóm sắp xếp theo alphabet & số
  const sortedGroups = useMemo(() => {
    if (!data?.groups) return [];
    return [...data.groups].sort((a, b) =>
      a.group.localeCompare(b.group, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [data]);

  // Danh sách các nhóm sẽ được in theo cấu hình hiện tại
  const targetGroups = useMemo(() => {
    if (!data?.groups) return [];
    if (scope === 'SINGLE_GROUP') {
      return sortedGroups.filter(g => g.group === selectedGroup);
    }
    if (scope === 'SELECTED_GROUPS') {
      return sortedGroups.filter(g => selectedGroupSet.has(g.group));
    }
    return sortedGroups;
  }, [sortedGroups, scope, selectedGroup, selectedGroupSet, data]);

  // Thống kê tổng của các nhóm sẽ in
  const stats = useMemo(() => {
    const totalSkus = targetGroups.reduce((acc, g) => acc + g.items.length, 0);
    const totalInUsed = targetGroups.reduce((acc, g) => acc + g.totalInUsed, 0);
    const totalSellable = targetGroups.reduce((acc, g) => acc + g.totalSellable, 0);
    const totalOnWay = targetGroups.reduce((acc, g) => acc + g.totalOnWay, 0);
    const totalOutbound = targetGroups.reduce((acc, g) => acc + g.totalOutbound, 0);
    return { totalSkus, totalInUsed, totalSellable, totalOnWay, totalOutbound };
  }, [targetGroups]);

  if (!isOpen || !data) return null;

  const handleToggleGroupCheckbox = (groupName: string) => {
    setSelectedGroupSet(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleSelectAllGroups = () => {
    setSelectedGroupSet(new Set(sortedGroups.map(g => g.group)));
  };

  const handleDeselectAllGroups = () => {
    setSelectedGroupSet(new Set());
  };

  const handlePrint = () => {
    const options: InventoryPrintOptions = {
      scope,
      selectedGroupName: selectedGroup,
      selectedGroupNames: Array.from(selectedGroupSet),
      includePhysicalCheckColumn: includePhysicalCheck,
      includeTransitColumns: includeTransit,
      fontSize,
      sortBy
    };
    openInventoryPrintWindow(data, options);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  In Danh Sách Tồn Kho & Bảng Kê SKU
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Chuẩn A4 Kho
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                In từng nhóm riêng lẻ (Thảm Yoga, YD-A...) hoặc in tổng hợp toàn bộ kho để đi đếm kiểm kê
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>In Ngay (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body with 2 columns or preview tabs */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 space-y-5">
          {/* 1. Chọn Phạm Vi In (Print Scope) */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>1. Chọn Chế Độ In (Phân Theo Nhóm Riêng Hay Tổng Hợp)</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option A: Tổng Hợp Toàn Bộ */}
              <div
                onClick={() => setScope('ALL')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  scope === 'ALL'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-sm text-slate-900">
                      📋 In Tổng Hợp Toàn Bộ
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        scope === 'ALL' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}
                    >
                      {scope === 'ALL' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Bao gồm tất cả <strong>{sortedGroups.length} nhóm SKU</strong> và toàn bộ {data.totalSkus} mã sản phẩm trong kho.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-bold text-emerald-700">
                  Tổng {data.totalInUsed.toLocaleString()} PCS
                </div>
              </div>

              {/* Option B: In Riêng 1 Nhóm */}
              <div
                onClick={() => setScope('SINGLE_GROUP')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  scope === 'SINGLE_GROUP'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-sm text-slate-900">
                      🎯 In Từng Nhóm Riêng
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        scope === 'SINGLE_GROUP' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}
                    >
                      {scope === 'SINGLE_GROUP' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Chỉ in duy nhất 1 nhóm chỉ định (Ví dụ: Thảm Yoga, YD-P, YD-A...). Tiết kiệm giấy và phân ca làm việc.
                  </p>
                </div>

                {scope === 'SINGLE_GROUP' && (
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
                    >
                      {sortedGroups.map((g) => (
                        <option key={g.group} value={g.group}>
                          Nhóm {g.group} ({g.skuCount} SKU - {g.totalInUsed.toLocaleString()} PCS)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Option C: Tùy Chọn Nhiều Nhóm */}
              <div
                onClick={() => setScope('SELECTED_GROUPS')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  scope === 'SELECTED_GROUPS'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-sm text-slate-900">
                      ☑️ Tùy Chọn Nhiều Nhóm
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        scope === 'SELECTED_GROUPS' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}
                    >
                      {scope === 'SELECTED_GROUPS' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Tự tay tích chọn các nhóm bạn muốn in trong cùng 1 lần xuất.
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-600">
                  Đã chọn: {selectedGroupSet.size} / {sortedGroups.length} nhóm
                </div>
              </div>
            </div>

            {/* Checklist Chọn Nhóm (nếu chọn scope SELECTED_GROUPS) */}
            {scope === 'SELECTED_GROUPS' && (
              <div className="mt-4 pt-3.5 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600">
                    Tích chọn các nhóm SKU muốn in:
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={handleSelectAllGroups}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      onClick={handleDeselectAllGroups}
                      className="text-slate-500 font-bold hover:underline cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
                  {sortedGroups.map((g) => {
                    const isChecked = selectedGroupSet.has(g.group);
                    return (
                      <div
                        key={g.group}
                        onClick={() => handleToggleGroupCheckbox(g.group)}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{g.group}</span>
                        <span className="text-[10px] text-slate-400 font-normal ml-auto">
                          ({g.skuCount})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 2. Cấu Hình Bảng In & Cột Hiển Thị */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>2. Tùy Chọn Cột & Định Dạng Khổ Giấy In</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Checkbox: Cột Đếm Kiểm Kê Thực Tế */}
              <div
                onClick={() => setIncludePhysicalCheck(prev => !prev)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  includePhysicalCheck
                    ? 'bg-amber-50/50 border-amber-300 text-amber-950'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {includePhysicalCheck ? (
                  <CheckSquare className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-black">Cột "Kiểm Kê Ghi Tay"</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Thêm các cột kẻ nét đứt (Đếm thực tế, Chênh lệch, Ghi chú) để nhân viên cầm giấy đi đếm.
                  </div>
                </div>
              </div>

              {/* Checkbox: Cột Đang Về & Chờ Xuất */}
              <div
                onClick={() => setIncludeTransit(prev => !prev)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                  includeTransit
                    ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                {includeTransit ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-black">Cột "Đang Về & Chờ Xuất"</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    In thêm số lượng hàng On Way (Đang nhập), Outbound (Chờ xuất), và Hàng lỗi.
                  </div>
                </div>
              </div>

              {/* Sort By */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <div className="text-xs font-black text-slate-800 mb-1.5">Sắp Xếp SKU Khi In</div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="sku">Mã SKU (A → Z & Số tự nhiên)</option>
                  <option value="inUsed">Tồn khả dụng (Nhiều → Ít)</option>
                  <option value="sellable">Có thể bán (Nhiều → Ít)</option>
                </select>
                <div className="text-[10.5px] text-slate-400 mt-1">
                  Mặc định theo vần chữ cái & số chuẩn kho
                </div>
              </div>

              {/* Font Size */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white">
                <div className="text-xs font-black text-slate-800 mb-1.5">Cỡ Chữ Bảng In</div>
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="compact">Nhỏ gọn (Tiết kiệm trang giấy)</option>
                  <option value="normal">Chuẩn A4 (Khuyên dùng)</option>
                  <option value="large">To rõ nét (Dễ đọc khi đi kho)</option>
                </select>
                <div className="text-[10.5px] text-slate-400 mt-1">
                  Tự động co giãn theo khổ A4
                </div>
              </div>
            </div>
          </div>

          {/* 3. Tóm Tắt Bản In Sắp Xuất */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 p-4.5 rounded-2xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                  Bản In Sẵn Sàng Xuất Ra Giấy:
                </div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {scope === 'SINGLE_GROUP'
                    ? `Nhóm: ${selectedGroup}`
                    : `${targetGroups.length} nhóm SKU (${scope === 'ALL' ? 'Toàn Bộ Kho' : 'Nhóm Tùy Chọn'})`}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-3 flex-wrap">
                  <span>Tổng SKU: <strong>{stats.totalSkus}</strong> mã</span>
                  <span>•</span>
                  <span>Tồn khả dụng: <strong className="text-emerald-700">{stats.totalInUsed.toLocaleString()}</strong> PCS</span>
                  <span>•</span>
                  <span>Có thể bán: <strong className="text-indigo-700">{stats.totalSellable.toLocaleString()}</strong> PCS</span>
                  {includeTransit && stats.totalOnWay > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-700 font-bold">Đang về: +{stats.totalOnWay.toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handlePrint}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Mở Cửa Sổ In & Xuất PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:px-6 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">💡 Mẹo:</span>
            <span>Trong cửa sổ in của trình duyệt, bạn có thể chọn <strong>"Lưu dưới dạng PDF" (Save as PDF)</strong> để lưu file gửi qua Zalo/Email.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Ngay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
