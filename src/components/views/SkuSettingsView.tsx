import React, { useState } from 'react';
import { Settings, Plus, Trash2, RotateCcw, Save, Download, Upload, Check, AlertCircle } from 'lucide-react';
import { SkuGroupsMap } from '../../types';
import { DEFAULT_SKU_GROUPS } from '../../utils/skuData';

interface SkuSettingsViewProps {
  skuGroups: SkuGroupsMap;
  onUpdateSkuGroups: (newGroups: SkuGroupsMap) => void;
}

export const SkuSettingsView: React.FC<SkuSettingsViewProps> = ({
  skuGroups,
  onUpdateSkuGroups,
}) => {
  const [localGroups, setLocalGroups] = useState<SkuGroupsMap>(skuGroups);
  const [selectedGroup, setSelectedGroup] = useState<string>(Object.keys(skuGroups)[0] || 'YD-A');
  const [newSkuInput, setNewSkuInput] = useState<string>('');
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [notification, setNotification] = useState<string | null>(null);

  const groupKeys = Object.keys(localGroups);
  const currentSkus = localGroups[selectedGroup] || [];

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddSku = () => {
    if (!newSkuInput.trim()) return;
    const skuToAdd = newSkuInput.trim().toUpperCase();

    if (currentSkus.includes(skuToAdd)) {
      showNotice(`Mã SKU "${skuToAdd}" đã tồn tại trong nhóm ${selectedGroup}!`);
      return;
    }

    const updated = {
      ...localGroups,
      [selectedGroup]: [...currentSkus, skuToAdd],
    };
    setLocalGroups(updated);
    onUpdateSkuGroups(updated);
    setNewSkuInput('');
    showNotice(`Đã thêm mã "${skuToAdd}" vào nhóm ${selectedGroup}!`);
  };

  const handleRemoveSku = (skuToRemove: string) => {
    const updated = {
      ...localGroups,
      [selectedGroup]: currentSkus.filter((s) => s !== skuToRemove),
    };
    setLocalGroups(updated);
    onUpdateSkuGroups(updated);
    showNotice(`Đã xóa "${skuToRemove}" khỏi nhóm ${selectedGroup}!`);
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const name = newGroupName.trim().toUpperCase();
    if (localGroups[name]) {
      showNotice(`Nhóm "${name}" đã tồn tại!`);
      return;
    }
    const updated = {
      ...localGroups,
      [name]: [],
    };
    setLocalGroups(updated);
    onUpdateSkuGroups(updated);
    setSelectedGroup(name);
    setNewGroupName('');
    showNotice(`Đã tạo nhóm kho mới: "${name}"!`);
  };

  const handleRemoveGroup = (groupName: string) => {
    if (groupName === 'Thảm Yoga') {
      showNotice('Không thể xóa nhóm đặc thù Thảm Yoga!');
      return;
    }
    if (window.confirm(`Bạn có chắc muốn xóa nhóm "${groupName}" và toàn bộ SKU bên trong?`)) {
      const updated = { ...localGroups };
      delete updated[groupName];
      setLocalGroups(updated);
      onUpdateSkuGroups(updated);
      const remaining = Object.keys(updated);
      setSelectedGroup(remaining[0] || 'YD-A');
      showNotice(`Đã xóa nhóm "${groupName}"!`);
    }
  };

  const handleAddPresetGroup = (name: string) => {
    if (localGroups[name]) {
      setSelectedGroup(name);
      showNotice(`Đang xem nhóm "${name}"`);
      return;
    }
    const updated = {
      ...localGroups,
      [name]: [],
    };
    setLocalGroups(updated);
    onUpdateSkuGroups(updated);
    setSelectedGroup(name);
    showNotice(`Đã kích hoạt nhóm "${name}"!`);
  };

  const handleResetDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục danh mục SKU về mặc định ban đầu của script?')) {
      setLocalGroups(DEFAULT_SKU_GROUPS);
      onUpdateSkuGroups(DEFAULT_SKU_GROUPS);
      setSelectedGroup('YD-A');
      showNotice('Đã khôi phục danh mục SKU về mặc định!');
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(localGroups, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SKU_GROUPS_CONFIG_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (typeof json === 'object' && json !== null) {
          setLocalGroups(json);
          onUpdateSkuGroups(json);
          showNotice('Đã nạp cấu hình SKU từ file JSON thành công!');
        }
      } catch (err) {
        showNotice('Lỗi đọc file JSON cấu hình!');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden space-y-0">
      {/* Header */}
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
            onClick={handleExportJson}
            className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 rounded-xl text-gray-700 flex items-center gap-1.5 cursor-pointer border border-gray-200 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Sao Lưu JSON</span>
          </button>

          <label className="px-3 py-1.5 text-xs font-medium bg-white hover:bg-gray-50 rounded-xl text-gray-700 flex items-center gap-1.5 cursor-pointer border border-gray-200 shadow-2xs transition-colors">
            <Upload className="w-3.5 h-3.5 text-gray-500" />
            <span>Nạp JSON</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={handleResetDefault}
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

      <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column: Groups list */}
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
                    onClick={() => setSelectedGroup(group)}
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
                          handleRemoveGroup(group);
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
                  onClick={() => handleAddPresetGroup(preset)}
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
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
              placeholder="Tên nhóm mới (AA, BB, CC, YD-M)..."
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl flex-1 text-gray-800 bg-white focus:outline-none focus:border-indigo-500 shadow-2xs uppercase"
            />
            <button
              onClick={handleAddGroup}
              className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-medium rounded-xl cursor-pointer flex items-center gap-1 shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm
            </button>
          </div>
        </div>

        {/* Right column: SKUs in selected group */}
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
                  onChange={(e) => setNewSkuInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSku()}
                  placeholder="Nhập mã SKU mới..."
                  className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl bg-white text-gray-800 w-44 focus:outline-none focus:border-indigo-500 shadow-2xs"
                />
                <button
                  onClick={handleAddSku}
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
                        onClick={() => handleRemoveSku(sku)}
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
      </div>
    </div>
  );
};
