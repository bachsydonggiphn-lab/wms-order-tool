import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { SkuGroupsMap } from '../../../../../types';

interface SkuGroupsSidebarProps {
  groupKeys: string[];
  localGroups: SkuGroupsMap;
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
  onRemoveGroup: (group: string) => void;
  onAddPresetGroup: (preset: string) => void;
  newGroupName: string;
  onNewGroupNameChange: (val: string) => void;
  onAddGroup: () => void;
}

export const SkuGroupsSidebar: React.FC<SkuGroupsSidebarProps> = ({
  groupKeys,
  localGroups,
  selectedGroup,
  onSelectGroup,
  onRemoveGroup,
  onAddPresetGroup,
  newGroupName,
  onNewGroupNameChange,
  onAddGroup,
}) => {
  return (
    <div className="md:col-span-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Danh Sách Nhóm ({groupKeys.length})
        </h3>
      </div>

      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
        {groupKeys.map((group) => {
          const count = (localGroups[group] || []).length;
          const isSelected = selectedGroup === group;

          return (
            <div
              key={group}
              className={`w-full p-2 rounded-xl text-xs font-medium flex items-center justify-between transition-all group ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100/80 border border-transparent hover:border-gray-200'
              }`}
            >
              <button
                onClick={() => onSelectGroup(group)}
                className="flex-1 text-left truncate cursor-pointer flex items-center gap-2"
              >
                <span>{group}</span>
              </button>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/70 text-gray-600'
                  }`}
                >
                  {count} SKU
                </span>
                {group !== 'Thảm Yoga' && groupKeys.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveGroup(group);
                    }}
                    className={`p-1 rounded cursor-pointer transition-opacity ${
                      isSelected
                        ? 'text-white/70 hover:text-white hover:bg-white/20'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100'
                    }`}
                    title={`Xóa nhóm ${group}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick presets buttons for AA, BB, CC */}
      <div className="pt-2">
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
          Gợi ý tạo nhanh nhóm mới:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {['AA', 'BB', 'CC', 'YD-M', 'YD-N', 'YD-T', 'YD-Z'].map((preset) => (
            <button
              key={preset}
              onClick={() => onAddPresetGroup(preset)}
              className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border ${
                localGroups[preset]
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-200 shadow-2xs'
              }`}
            >
              +{preset}
            </button>
          ))}
        </div>
      </div>

      {/* Add new group */}
      <div className="pt-3 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => onNewGroupNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddGroup()}
          placeholder="Tên nhóm mới (AA, BB, CC, YD-M)..."
          className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl flex-1 text-gray-800 bg-white focus:outline-none focus:border-indigo-500 shadow-2xs uppercase"
        />
        <button
          onClick={onAddGroup}
          className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-medium rounded-xl cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm
        </button>
      </div>
    </div>
  );
};
