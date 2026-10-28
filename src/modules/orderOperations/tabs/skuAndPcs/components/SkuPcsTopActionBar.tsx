import React from 'react';
import {
  Search,
  Download,
  Printer,
  ChevronRight,
  ChevronLeft,
  Layers,
  Zap,
  Check,
  Copy,
} from 'lucide-react';
import { ActiveTabType } from '../../../../../components/Toolbar';

interface SkuPcsTopActionBarProps {
  searchTerm: string;
  onSearchChange?: (term: string) => void;
  onExportExcel?: () => void;
  onPrintPreview?: () => void;
  isSkuTableCollapsed: boolean;
  toggleSkuTableCollapsed: () => void;
  skuEntriesCount: number;
  onNavigateTab?: (tab: ActiveTabType) => void;
  handleCopySkuTable: () => void;
  copiedKey: string | null;
}

export const SkuPcsTopActionBar: React.FC<SkuPcsTopActionBarProps> = ({
  searchTerm,
  onSearchChange,
  onExportExcel,
  onPrintPreview,
  isSkuTableCollapsed,
  toggleSkuTableCollapsed,
  skuEntriesCount,
  onNavigateTab,
  handleCopySkuTable,
  copiedKey,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-2.5">
      {/* Cụm chức năng Trái: Tìm mã đơn, SKU... | Xuất Excel (.xlsx) | In Phiếu 100×150 */}
      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 w-full sm:w-auto">
        {onSearchChange && (
          <div className="relative flex-1 sm:flex-none min-w-[130px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm mã đơn, SKU..."
              className="text-xs pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48 md:w-56 shadow-2xs"
            />
          </div>
        )}

        {onExportExcel && (
          <button
            type="button"
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            title="Xuất file Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
            <span className="hidden sm:inline"> (.xlsx)</span>
          </button>
        )}

        {onPrintPreview && (
          <button
            type="button"
            onClick={onPrintPreview}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
            title="In phiếu gom hàng 100×150"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>In Phiếu</span>
            <span className="text-[10px] px-1.5 bg-indigo-50 text-indigo-700 rounded-md font-mono font-bold border border-indigo-200">
              100×150
            </span>
          </button>
        )}
      </div>

      {/* Cụm chức năng Phải: Hiện/Thu gọn Bảng SKU | Chế độ đóng gói chuyên sâu | Sao chép bảng SKU */}
      <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 justify-start sm:justify-end w-full sm:w-auto">
        <button
          type="button"
          onClick={toggleSkuTableCollapsed}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border shadow-2xs shrink-0 ${
            isSkuTableCollapsed
              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
              : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
          }`}
          title={isSkuTableCollapsed ? 'Mở rộng Bảng SKU (Cột S:T)' : 'Thu gọn Bảng SKU (Cột S:T) để mở rộng cột PCS'}
        >
          {isSkuTableCollapsed ? (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-600" />
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Hiện Bảng SKU ({skuEntriesCount})</span>
            </>
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <span>Thu gọn Bảng SKU</span>
            </>
          )}
        </button>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('single_pcs')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-indigo-950 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Chế độ<span className="hidden sm:inline"> đóng gói</span> chuyên sâu</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={handleCopySkuTable}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 rounded-xl text-xs font-medium text-gray-700 transition-colors cursor-pointer border border-gray-200 shadow-2xs shrink-0"
        >
          {copiedKey === 'sku_table' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
          <span>{copiedKey === 'sku_table' ? 'Đã sao chép' : 'Sao chép SKU'}</span>
        </button>
      </div>
    </div>
  );
};
