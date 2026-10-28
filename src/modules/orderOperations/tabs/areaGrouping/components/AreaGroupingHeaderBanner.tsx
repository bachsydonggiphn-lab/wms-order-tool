import React from 'react';
import { Table, Grid } from 'lucide-react';
import { ColumnMode, DisplayLayout } from '../types';
import { DEFAULT_AREA_ORDER } from '../../../../../utils/skuData';

interface AreaGroupingHeaderBannerProps {
  displayLayout: DisplayLayout;
  onDisplayLayoutChange: (layout: DisplayLayout) => void;
  columnMode: ColumnMode;
  onColumnModeChange: (mode: ColumnMode) => void;
}

export const AreaGroupingHeaderBanner: React.FC<AreaGroupingHeaderBannerProps> = ({
  displayLayout,
  onDisplayLayoutChange,
  columnMode,
  onColumnModeChange,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-gray-900">Phân Nhóm Đơn Hàng Theo Khu Vực Kho</h2>
          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-medium">
            {DEFAULT_AREA_ORDER.length} Nhóm Khu Vực (YD-A → YD-HMS)
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Giao diện đồng bộ chính xác với Bảng Google Sheets thực tế (Header xanh dương, sub-headers 1 PCS, 2 PCS, 3 PCS, MIX).
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Display Layout Toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => onDisplayLayoutChange('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              displayLayout === 'matrix'
                ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Bảng Sheet Ma Trận</span>
          </button>
          <button
            onClick={() => onDisplayLayoutChange('cards')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              displayLayout === 'cards'
                ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Dạng Thẻ Khu Vực</span>
          </button>
        </div>

        {/* Columns Selector */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => onColumnModeChange('sheet4')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              columnMode === 'sheet4'
                ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="4 Cột chuẩn Google Sheet: 1 PCS, 2 PCS, 3 PCS, MIX"
          >
            4 Cột Chuẩn
          </button>
          <button
            onClick={() => onColumnModeChange('expanded8')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              columnMode === 'expanded8'
                ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            title="8 Cột mở rộng: 1 đến 7 PCS và MIX"
          >
            1-7 PCS
          </button>
        </div>
      </div>
    </div>
  );
};
