import { useState } from 'react';
import { SkuGroupsMap } from '../../../../../types';
import { DEFAULT_SKU_GROUPS } from '../../../../../utils/skuData';

interface UseSkuSettingsParams {
  skuGroups: SkuGroupsMap;
  onUpdateSkuGroups: (newGroups: SkuGroupsMap) => void;
}

export const useSkuSettings = ({ skuGroups, onUpdateSkuGroups }: UseSkuSettingsParams) => {
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

  return {
    localGroups,
    selectedGroup,
    setSelectedGroup,
    newSkuInput,
    setNewSkuInput,
    newGroupName,
    setNewGroupName,
    notification,
    groupKeys,
    currentSkus,
    handleAddSku,
    handleRemoveSku,
    handleAddGroup,
    handleRemoveGroup,
    handleAddPresetGroup,
    handleResetDefault,
    handleExportJson,
    handleImportJson,
  };
};
