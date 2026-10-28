import React from 'react';
import { Warehouse, FolderTree, ClipboardList, Link2 } from 'lucide-react';
import { HotSkuSubTab } from '../types';

interface HotSkuSubTabNavProps {
  activeSubTab: HotSkuSubTab;
  onTabChange: (tab: HotSkuSubTab) => void;
  relocationTasksCount: number;
  completedTasksCount: number;
  pairedSkusCount: number;
}

export const HotSkuSubTabNav: React.FC<HotSkuSubTabNavProps> = ({
  activeSubTab,
  onTabChange,
  relocationTasksCount,
  completedTasksCount,
  pairedSkusCount,
}) => {
  return (
    <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
      <button
        onClick={() => onTabChange('map_and_table')}
        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
          activeSubTab === 'map_and_table'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 shadow-2xs'
        }`}
      >
        <Warehouse className="w-4 h-4" />
        <span>Bản Đồ Kệ Kho & Danh Sách Hạng ABC</span>
      </button>

      <button
        onClick={() => onTabChange('group_slotting')}
        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
          activeSubTab === 'group_slotting'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 shadow-2xs'
        }`}
      >
        <FolderTree className="w-4 h-4" />
        <span>Bố Trí Dãy Kệ Theo Nhóm Hàng Hóa (Category Slotting)</span>
      </button>

      <button
        onClick={() => onTabChange('relocation_tasks')}
        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap relative ${
          activeSubTab === 'relocation_tasks'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 shadow-2xs'
        }`}
      >
        <ClipboardList className="w-4 h-4" />
        <span>Nhiệm Vụ Dọn Kệ Đón Hàng Về (Action Checklist)</span>
        {relocationTasksCount > 0 && (
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeSubTab === 'relocation_tasks'
                ? 'bg-white/20 text-white'
                : 'bg-rose-100 text-rose-700'
            }`}
          >
            {completedTasksCount} / {relocationTasksCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onTabChange('paired_skus')}
        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
          activeSubTab === 'paired_skus'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'bg-white text-gray-700 hover:bg-gray-100/80 border border-gray-200 shadow-2xs'
        }`}
      >
        <Link2 className="w-4 h-4" />
        <span>Cặp Hàng Hay Xuất Kèm ({pairedSkusCount})</span>
      </button>
    </div>
  );
};
