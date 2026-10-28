import React from 'react';
import { SkuSettingsViewProps } from './types';
import { useSkuSettings } from './hooks/useSkuSettings';
import { SkuSettingsHeader } from './components/SkuSettingsHeader';
import { SkuGroupsSidebar } from './components/SkuGroupsSidebar';
import { SkuGroupItemsPanel } from './components/SkuGroupItemsPanel';

export const SkuSettingsView: React.FC<SkuSettingsViewProps> = ({
  skuGroups,
  onUpdateSkuGroups,
}) => {
  const {
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
  } = useSkuSettings({ skuGroups, onUpdateSkuGroups });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden space-y-0">
      {/* Header */}
      <SkuSettingsHeader
        notification={notification}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onResetDefault={handleResetDefault}
      />

      <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column: Groups list */}
        <SkuGroupsSidebar
          groupKeys={groupKeys}
          localGroups={localGroups}
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
          onRemoveGroup={handleRemoveGroup}
          onAddPresetGroup={handleAddPresetGroup}
          newGroupName={newGroupName}
          onNewGroupNameChange={setNewGroupName}
          onAddGroup={handleAddGroup}
        />

        {/* Right column: SKUs in selected group */}
        <SkuGroupItemsPanel
          selectedGroup={selectedGroup}
          currentSkus={currentSkus}
          newSkuInput={newSkuInput}
          onNewSkuInputChange={setNewSkuInput}
          onAddSku={handleAddSku}
          onRemoveSku={handleRemoveSku}
        />
      </div>
    </div>
  );
};
