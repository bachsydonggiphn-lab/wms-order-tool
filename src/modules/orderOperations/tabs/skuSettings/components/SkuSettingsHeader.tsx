import React from 'react';
import { Settings, Download, Upload, RotateCcw, Check } from 'lucide-react';

interface SkuSettingsHeaderProps {
  notification: string | null;
  onExportJson: () => void;
  onImportJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetDefault: () => void;
}

export const SkuSettingsHeader: React.FC<SkuSettingsHeaderProps> = ({
  notification,
  onExportJson,
  onImportJson,
  onResetDefault,
}) => {
  return (
    <>
      <div className="p-5 bg-gray-50/70 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-indigo-600" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Quản Lý Danh Mục SKU & Khu Vực Kho</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tùy chỉnh nhóm SKU (YD-A, YD-B, Thảm Yoga...) để phân loại tự động
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportJson}
            className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 rounded-xl text-gray-700 flex items-center gap-1.5 cursor-pointer border border-gray-200 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Sao Lưu JSON</span>
          </button>

          <label className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 rounded-xl text-gray-700 flex items-center gap-1.5 cursor-pointer border border-gray-200 shadow-2xs transition-colors">
            <Upload className="w-3.5 h-3.5 text-gray-500" />
            <span>Nạp JSON</span>
            <input type="file" accept=".json" onChange={onImportJson} className="hidden" />
          </label>

          <button
            onClick={onResetDefault}
            className="px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-700 rounded-xl flex items-center gap-1.5 cursor-pointer border border-red-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-red-600" />
            <span>Về Mặc Định</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className="mx-6 mt-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
    </>
  );
};
