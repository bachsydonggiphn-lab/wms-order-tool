import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface SkuGroupItemsPanelProps {
  selectedGroup: string;
  currentSkus: string[];
  newSkuInput: string;
  onNewSkuInputChange: (val: string) => void;
  onAddSku: () => void;
  onRemoveSku: (sku: string) => void;
}

export const SkuGroupItemsPanel: React.FC<SkuGroupItemsPanelProps> = ({
  selectedGroup,
  currentSkus,
  newSkuInput,
  onNewSkuInputChange,
  onAddSku,
  onRemoveSku,
}) => {
  return (
    <div className="md:col-span-8 space-y-4">
      <div className="p-4 bg-gray-50/60 border border-gray-200 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Nhóm: <span className="text-indigo-600">{selectedGroup}</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Hiện có {currentSkus.length} mã SKU được cấu hình
            </p>
          </div>

          {/* Add SKU Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newSkuInput}
              onChange={(e) => onNewSkuInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddSku()}
              placeholder="Nhập mã SKU mới..."
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-800 w-44 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
            <button
              onClick={onAddSku}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm SKU</span>
            </button>
          </div>
        </div>

        {/* List of SKUs in group */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 max-h-[420px] overflow-y-auto">
          {currentSkus.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-400">
              Chưa có mã SKU nào trong nhóm này.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {currentSkus.map((sku) => (
                <div
                  key={sku}
                  className="p-2 bg-gray-50 hover:bg-indigo-50/40 border border-gray-200 hover:border-indigo-200 rounded-xl flex items-center justify-between group transition-colors"
                >
                  <span className="font-mono text-xs font-medium text-gray-800 truncate">
                    {sku}
                  </span>
                  <button
                    onClick={() => onRemoveSku(sku)}
                    className="text-gray-400 hover:text-red-600 p-0.5 rounded cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Xóa SKU này"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
