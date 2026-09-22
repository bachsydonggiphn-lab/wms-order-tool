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
  HelpCircle,
  Table,
  LayoutGrid,
  Download
} from 'lucide-react';
import { InventoryQueryResult, InventoryGroupSummary } from '../types';
import {
  InventoryPrintOptions,
  PrintLayoutMode,
  openInventoryPrintWindow
} from '../utils/inventoryPrint';
import { DEFAULT_AREA_ORDER } from '../utils/skuData';
import { exportInventoryCustomExcel } from '../services/inventoryService';

interface InventoryPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InventoryQueryResult | null;
  initialGroup?: string; // Nhóm được chọn sẵn nếu bấm nút "In nhóm này" từ card
  initialLayoutMode?: PrintLayoutMode; // 'COLUMN_MATRIX' hoặc 'DETAILED_TABLE'
}

export const InventoryPrintModal: React.FC<InventoryPrintModalProps> = ({
  isOpen,
  onClose,
  data,
  initialGroup,
  initialLayoutMode = 'COLUMN_MATRIX'
}) => {
  // Layout Mode: 'COLUMN_MATRIX' (Ma trận phân loại nhóm theo cột - Giống Excel của khách) | 'DETAILED_TABLE' (Bảng chi tiết kiểm kê)
  const [layoutMode, setLayoutMode] = useState<PrintLayoutMode>(initialLayoutMode);

  // Scope: 'ALL' (Tổng hợp) | 'SINGLE_GROUP' (Từng nhóm riêng) | 'SELECTED_GROUPS' (Nhiều nhóm tùy chọn)
  const [scope, setScope] = useState<'ALL' | 'SINGLE_GROUP' | 'SELECTED_GROUPS'>('ALL');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedGroupSet, setSelectedGroupSet] = useState<Set<string>>(new Set());

  // Options for Column Matrix
  const [matrixOrientation, setMatrixOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [matrixIncludeQty, setMatrixIncludeQty] = useState<boolean>(false);

  // Options for Detailed Table
  const [includePhysicalCheck, setIncludePhysicalCheck] = useState<boolean>(true);
  const [includeTransit, setIncludeTransit] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<'compact' | 'normal' | 'large'>('normal');
  const [sortBy, setSortBy] = useState<'sku' | 'inUsed' | 'sellable'>('sku');

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
    if (initialLayoutMode) {
      setLayoutMode(initialLayoutMode);
    }
  }, [initialGroup, initialLayoutMode, isOpen, data]);

  // Tất cả nhóm sắp xếp theo thứ tự chuẩn DEFAULT_AREA_ORDER hoặc alphabet & số
  const sortedGroups = useMemo(() => {
    if (!data?.groups) return [];
    return [...data.groups].sort((a, b) => {
      const idxA = DEFAULT_AREA_ORDER.indexOf(a.group);
      const idxB = DEFAULT_AREA_ORDER.indexOf(b.group);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.group.localeCompare(b.group, undefined, { numeric: true, sensitivity: 'base' });
    });
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

  // Chuẩn bị ma trận cột xem trước (Live Matrix Preview)
  const matrixPreviewColumns = useMemo(() => {
    if (scope === 'SINGLE_GROUP' && targetGroups.length === 1) {
      const group = targetGroups[0];
      const sortedItems = [...group.items].sort((a, b) =>
        a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' })
      );
      const numCols = Math.min(5, Math.max(2, Math.ceil(sortedItems.length / 15)));
      const itemsPerCol = Math.ceil(sortedItems.length / numCols);
      const cols = [];
      for (let c = 0; c < numCols; c++) {
        const colItems = sortedItems.slice(c * itemsPerCol, (c + 1) * itemsPerCol);
        if (colItems.length > 0) {
          cols.push({
            title: `${group.group} (Cột ${c + 1})`,
            subTitle: `${colItems.length} SKU`,
            items: colItems
          });
        }
      }
      return cols;
    }

    return targetGroups.map(g => {
      const sortedItems = [...g.items].sort((a, b) =>
        a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' })
      );
      return {
        title: g.group,
        subTitle: `${g.skuCount} SKU`,
        items: sortedItems
      };
    });
  }, [targetGroups, scope]);

  const maxMatrixPreviewRows = useMemo(() => {
    return Math.max(...matrixPreviewColumns.map(c => c.items.length), 0);
  }, [matrixPreviewColumns]);

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
      layoutMode,
      selectedGroupName: selectedGroup,
      selectedGroupNames: Array.from(selectedGroupSet),
      includePhysicalCheckColumn: includePhysicalCheck,
      includeTransitColumns: includeTransit,
      matrixIncludeQty,
      orientation: matrixOrientation,
      fontSize,
      sortBy
    };
    openInventoryPrintWindow(data, options);
  };

  const handleExportExcel = () => {
    const options: InventoryPrintOptions = {
      scope,
      layoutMode,
      selectedGroupName: selectedGroup,
      selectedGroupNames: Array.from(selectedGroupSet),
      includePhysicalCheckColumn: includePhysicalCheck,
      includeTransitColumns: includeTransit,
      matrixIncludeQty,
      orientation: matrixOrientation,
      fontSize,
      sortBy
    };
    exportInventoryCustomExcel(data, options);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[94vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-emerald-500/20">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  In Bảng Phân Loại SKU & Sắp Xếp Hàng Hóa Kho
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Chuẩn Sơ Đồ Kệ Kho & A4
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                In sơ đồ ma trận các cột nhóm SKU (dán kệ/tường) hoặc bảng kê chi tiết để kiểm kê tồn kho
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer active:scale-95"
              title="Xuất file Excel (.xlsx) theo đúng tùy chọn và nhóm đã chọn"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/70 space-y-4.5">
          {/* 1. Chọn Kiểu Bản In (Layout Mode) */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
              <LayoutGrid className="w-4 h-4 text-blue-600" />
              <span>1. Chọn Định Dạng Kiểu Bản In</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Layout A: Ma Trận Phân Loại Cột SKU (Mẫu Excel dán kệ) */}
              <div
                onClick={() => setLayoutMode('COLUMN_MATRIX')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  layoutMode === 'COLUMN_MATRIX'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-sm text-blue-900 flex items-center gap-2">
                      <span>📊 Bảng Ma Trận Cột Nhóm SKU</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                        Giống mẫu Excel dán kệ
                      </span>
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        layoutMode === 'COLUMN_MATRIX' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {layoutMode === 'COLUMN_MATRIX' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Xếp các nhóm theo hàng ngang (YD-A, Thảm Yoga, YD-D, YD-G, YD-H, YD-K, YD-L...), danh sách mã SKU xếp dọc từ trên xuống dưới.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-blue-100/80 text-[11px] font-extrabold text-blue-700 flex items-center gap-1.5">
                  <span>📌 Mục đích:</span>
                  <span>Dán tại đầu kệ kho & bàn nhặt hàng để xếp hàng đúng thứ tự danh sách</span>
                </div>
              </div>

              {/* Layout B: Bảng Kê Chi Tiết Tồn Kho */}
              <div
                onClick={() => setLayoutMode('DETAILED_TABLE')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  layoutMode === 'DETAILED_TABLE'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-black text-sm text-emerald-950 flex items-center gap-2">
                      <span>📋 Bảng Kê Chi Tiết Tồn Kho</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Kiểm kê số lượng
                      </span>
                    </span>
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        layoutMode === 'DETAILED_TABLE' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
                      }`}
                    >
                      {layoutMode === 'DETAILED_TABLE' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bảng đầy đủ thông tin: Mã SKU, Tên sản phẩm, Tồn khả dụng, Bán được, Đang về, Chờ xuất và cột kẻ nét đứt để ghi tay.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-emerald-100/80 text-[11px] font-extrabold text-emerald-700 flex items-center gap-1.5">
                  <span>📌 Mục đích:</span>
                  <span>Kiểm kê tồn kho thực tế, đối soát chênh lệch và làm báo cáo quản lý</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Chọn Phạm Vi Nhóm (Print Scope) */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>2. Chọn Nhóm Hàng Hóa Cần In</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Scope A: Toàn Bộ */}
              <div
                onClick={() => setScope('ALL')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  scope === 'ALL'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900">
                      Toàn Bộ ({sortedGroups.length} nhóm)
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        scope === 'ALL' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {scope === 'ALL' && <span className="w-1 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Bao gồm toàn bộ {data.totalSkus} SKU của tất cả các nhóm trên sơ đồ.
                  </p>
                </div>
                <div className="mt-2.5 text-[10px] font-bold text-blue-700">
                  Tổng {data.totalInUsed.toLocaleString()} PCS
                </div>
              </div>

              {/* Scope B: Từng Nhóm Riêng */}
              <div
                onClick={() => setScope('SINGLE_GROUP')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  scope === 'SINGLE_GROUP'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900">
                      Từng Nhóm Riêng
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        scope === 'SINGLE_GROUP' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {scope === 'SINGLE_GROUP' && <span className="w-1 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Chỉ in 1 nhóm chỉ định (Ví dụ: Thảm Yoga, YD-A, YD-P...).
                  </p>
                </div>

                {scope === 'SINGLE_GROUP' && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100">
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs font-black text-blue-900 focus:outline-none cursor-pointer"
                    >
                      {sortedGroups.map((g) => (
                        <option key={g.group} value={g.group}>
                          Nhóm {g.group} ({g.skuCount} SKU)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Scope C: Tùy Chọn Nhiều Nhóm */}
              <div
                onClick={() => setScope('SELECTED_GROUPS')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  scope === 'SELECTED_GROUPS'
                    ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900">
                      Tùy Chọn Nhiều Nhóm
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        scope === 'SELECTED_GROUPS' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                      }`}
                    >
                      {scope === 'SELECTED_GROUPS' && <span className="w-1 rounded-full bg-white"></span>}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tự tay tích chọn các nhóm bạn muốn ghép trên cùng 1 bảng in.
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-bold text-slate-600">
                  Đã chọn: {selectedGroupSet.size} / {sortedGroups.length} nhóm
                </div>
              </div>
            </div>

            {/* Checklist Chọn Nhóm (nếu chọn scope SELECTED_GROUPS) */}
            {scope === 'SELECTED_GROUPS' && (
              <div className="mt-3.5 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600">
                    Tích chọn các cột nhóm muốn đưa vào bảng in:
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={handleSelectAllGroups}
                      className="text-blue-700 font-bold hover:underline cursor-pointer"
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

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
                  {sortedGroups.map((g) => {
                    const isChecked = selectedGroupSet.has(g.group);
                    return (
                      <div
                        key={g.group}
                        onClick={() => handleToggleGroupCheckbox(g.group)}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 border-blue-300 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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

          {/* 3. Tùy Chọn Cấu Hình Riêng Cho Từng Kiểu Bản In */}
          {layoutMode === 'COLUMN_MATRIX' ? (
            /* Cấu hình Ma Trận Cột */
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>3. Tùy Chọn Khổ Giấy In Sơ Đồ Cột Ma Trận</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Khổ giấy: Ngang / Dọc */}
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-black text-slate-800 mb-1.5">Hướng Giấy In A4</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMatrixOrientation('landscape')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        matrixOrientation === 'landscape'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      A4 Ngang (Khuyên dùng)
                    </button>
                    <button
                      onClick={() => setMatrixOrientation('portrait')}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        matrixOrientation === 'portrait'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      A4 Dọc
                    </button>
                  </div>
                  <div className="text-[10.5px] text-slate-400 mt-1">
                    In ngang giúp chứa được nhiều cột nhóm trên cùng 1 trang
                  </div>
                </div>

                {/* Checkbox: Kèm số lượng tồn kho */}
                <div
                  onClick={() => setMatrixIncludeQty(prev => !prev)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                    matrixIncludeQty
                      ? 'bg-blue-50/50 border-blue-300 text-blue-950'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {matrixIncludeQty ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="text-xs font-black">Hiển Thị Kèm Số Lượng Tồn</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Thêm số lượng tồn khả dụng cạnh mã SKU, ví dụ: <code>YD-A12-1 (66)</code>.
                    </div>
                  </div>
                </div>

                {/* Cỡ chữ */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="text-xs font-black text-slate-800 mb-1.5">Cỡ Chữ Mã SKU</div>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="compact">Nhỏ gọn (Chứa được nhiều dòng/trang)</option>
                    <option value="normal">Chuẩn vừa vặn (Khuyên dùng)</option>
                    <option value="large">To rõ nét (Dễ đọc từ xa)</option>
                  </select>
                  <div className="text-[10.5px] text-slate-400 mt-1">
                    Co giãn tự động để vừa khung giấy A4
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Cấu hình Bảng Kê Chi Tiết */
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Sliders className="w-4 h-4 text-emerald-600" />
                <span>3. Tùy Chọn Cột Bảng Kê Kiểm Kê Tồn Kho</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      Thêm cột kẻ nét đứt (Đếm thực tế, Lệch, Ghi chú) để đi đếm kho.
                    </div>
                  </div>
                </div>

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
                      In thêm On Way, Outbound và Hàng lỗi.
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="text-xs font-black text-slate-800 mb-1.5">Sắp Xếp SKU</div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="sku">Mã SKU (A → Z & Số tự nhiên)</option>
                    <option value="inUsed">Tồn khả dụng (Nhiều → Ít)</option>
                    <option value="sellable">Có thể bán (Nhiều → Ít)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white">
                  <div className="text-xs font-black text-slate-800 mb-1.5">Cỡ Chữ Bảng In</div>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="compact">Nhỏ gọn</option>
                    <option value="normal">Chuẩn A4</option>
                    <option value="large">To rõ nét</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 4. Live Preview Ma Trận Cột SKU (Trực quan như ảnh người dùng gửi) */}
          {layoutMode === 'COLUMN_MATRIX' && (
            <div className="bg-white p-4.5 rounded-2xl border border-blue-200/90 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-black text-blue-900 uppercase tracking-wider">
                    Xem Trước Sơ Đồ Cột Ma Trận ({matrixPreviewColumns.length} cột nhóm &bull; {stats.totalSkus} mã SKU)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  (Cuộn ngang để xem đủ tất cả các cột)
                </span>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto border border-blue-200 rounded-xl scrollbar-thin">
                <table className="w-full border-collapse text-center text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {matrixPreviewColumns.map(col => (
                        <th
                          key={col.title}
                          className="bg-blue-600 text-white font-black py-2 px-2.5 border border-blue-700 text-center uppercase tracking-wide min-w-[110px]"
                        >
                          <div className="text-xs font-extrabold">{col.title}</div>
                          <div className="text-[10px] font-normal opacity-85">({col.subTitle})</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: Math.min(25, maxMatrixPreviewRows) }).map((_, r) => (
                      <tr key={r} className={r % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        {matrixPreviewColumns.map(col => {
                          const item = col.items[r];
                          return (
                            <td
                              key={col.title + r}
                              className="py-1.5 px-2 border border-slate-200 font-mono text-[11px] font-bold text-slate-800 text-center whitespace-nowrap"
                            >
                              {item ? (
                                <span>
                                  {item.sku}
                                  {matrixIncludeQty && (
                                    <span className="text-[10px] text-emerald-600 font-normal ml-1">
                                      ({item.inUsed})
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-200">&bull;</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {maxMatrixPreviewRows > 25 && (
                <div className="text-center text-[10.5px] text-slate-400 mt-2 font-medium">
                  ... Còn {maxMatrixPreviewRows - 25} hàng SKU nữa phía dưới (sẽ hiển thị đầy đủ khi bấm In Ngay / Xuất PDF) ...
                </div>
              )}
            </div>
          )}

          {/* 5. Tóm Tắt Bản In */}
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/5 p-4 rounded-2xl border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm shrink-0">
                {layoutMode === 'COLUMN_MATRIX' ? <LayoutGrid className="w-5 h-5" /> : <Table className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-extrabold text-blue-900 uppercase tracking-wider">
                  Bản In Sẵn Sàng: {layoutMode === 'COLUMN_MATRIX' ? 'SƠ ĐỒ MA TRẬN CỘT SKU' : 'BẢNG KÊ CHI TIẾT TỒN KHO'}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-2.5 flex-wrap">
                  <span>Số nhóm: <strong>{targetGroups.length}</strong> nhóm</span>
                  <span>•</span>
                  <span>Tổng SKU: <strong>{stats.totalSkus}</strong> mã</span>
                  <span>•</span>
                  <span>Tồn khả dụng: <strong className="text-emerald-700">{stats.totalInUsed.toLocaleString()}</strong> PCS</span>
                  <span>•</span>
                  <span>Khổ giấy: <strong className="text-indigo-700">{matrixOrientation === 'landscape' ? 'A4 Ngang' : 'A4 Dọc'}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleExportExcel}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                title="Tải bảng tính Excel (.xlsx) theo đúng cấu hình và nhóm đã chọn"
              >
                <Download className="w-4 h-4" />
                <span>Xuất File Excel (.xlsx)</span>
              </button>
              <button
                onClick={handlePrint}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer active:scale-95"
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
            <span className="text-blue-600 font-bold">💡 Lưu ý:</span>
            <span>Bản in ma trận cột có thể dán trực tiếp lên đầu các dãy kệ hoặc bàn đóng gói để định vị hàng hóa nhanh nhất.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleExportExcel}
              className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Xuất bảng tính Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
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
