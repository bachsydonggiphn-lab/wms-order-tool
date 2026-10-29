import React, { useState } from 'react';
import { Boxes } from 'lucide-react';
import { WmsInventoryItem } from '../../types';
import { exportInventoryToExcel } from '../../services/inventoryService';
import { TabErrorBoundary } from '../../components/common/TabErrorBoundary';
import { InventoryPrintModal } from '../../components/InventoryPrintModal';
import { SingleSkuLabelModal } from '../../components/SingleSkuLabelModal';
import { WmsInventoryModuleProps } from './types';
import { useWmsInventoryData } from './hooks/useWmsInventoryData';

// Subcomponents
import { InventoryHeaderBar } from './components/InventoryHeaderBar';
import { InventoryKpiCards } from './components/InventoryKpiCards';
import { InventoryFilterToolbar } from './components/InventoryFilterToolbar';
import { InventoryGroupedView } from './components/InventoryGroupedView';
import { InventoryFlatTable } from './components/InventoryFlatTable';

export const WmsInventoryModule: React.FC<WmsInventoryModuleProps> = ({
  skuGroups,
  onNavigateToSlotting,
  onNavigateToOrders,
}) => {
  const {
    data,
    loading,
    error,
    isAutoRefresh,
    setIsAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    countdown,
    isPolling,
    soundEnabled,
    setSoundEnabled,
    recentChanges,
    setRecentChanges,
    changedSkuMap,
    selectedWarehouse,
    setSelectedWarehouse,
    selectedGroup,
    setSelectedGroup,
    searchQuery,
    setSearchQuery,
    stockFilter,
    setStockFilter,
    viewMode,
    setViewMode,
    expandedGroups,
    toggleGroupExpand,
    expandAllGroups,
    collapseAllGroups,
    copiedSku,
    copiedGroup,
    handleCopySku,
    handleCopyGroupSkus,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    handleSort,
    smartSuggestions,
    filteredGroups,
    sortedTableItems,
    fetchData,
  } = useWmsInventoryData({ skuGroups });

  // Print Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printModalInitialGroup, setPrintModalInitialGroup] = useState<string>('ALL');
  const [printModalLayoutMode, setPrintModalLayoutMode] = useState<'COLUMN_MATRIX' | 'DETAILED_TABLE'>('COLUMN_MATRIX');

  const handleOpenPrintModal = (layoutMode: 'COLUMN_MATRIX' | 'DETAILED_TABLE' = 'COLUMN_MATRIX') => {
    setPrintModalInitialGroup(selectedGroup !== 'ALL' ? selectedGroup : 'ALL');
    setPrintModalLayoutMode(layoutMode);
    setIsPrintModalOpen(true);
  };

  const handleOpenPrintForGroup = (groupName: string) => {
    setPrintModalInitialGroup(groupName);
    setPrintModalLayoutMode('COLUMN_MATRIX');
    setIsPrintModalOpen(true);
  };

  // Single SKU Thermal Label Print States
  const [selectedSkuForLabel, setSelectedSkuForLabel] = useState<WmsInventoryItem | null>(null);
  const [isSkuLabelModalOpen, setIsSkuLabelModalOpen] = useState<boolean>(false);

  const handleOpenSkuLabel = (item: WmsInventoryItem) => {
    setSelectedSkuForLabel(item);
    setIsSkuLabelModalOpen(true);
  };

  return (
    <TabErrorBoundary tabName="Tồn Kho WMS" onNavigateBack={onNavigateToOrders}>
      <div className="space-y-5 animate-fade-in pb-12">
        {/* 1. Top Header Banner & Real-Time Polling Controls (Ẩn trên mobile) */}
        <div className="hidden sm:block">
          <InventoryHeaderBar
            selectedWarehouse={selectedWarehouse}
            setSelectedWarehouse={setSelectedWarehouse}
            isAutoRefresh={isAutoRefresh}
            setIsAutoRefresh={setIsAutoRefresh}
            refreshInterval={refreshInterval}
            setRefreshInterval={setRefreshInterval}
            countdown={countdown}
            isPolling={isPolling}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            recentChanges={recentChanges}
            setRecentChanges={setRecentChanges}
            loading={loading}
            data={data}
            fetchInventory={() => fetchData(selectedWarehouse)}
            onRefresh={() => fetchData(selectedWarehouse)}
            handleExport={() => data && exportInventoryToExcel(data)}
            onExportExcel={() => data && exportInventoryToExcel(data)}
            handleOpenPrintModal={(mode) => handleOpenPrintModal(mode)}
            onOpenPrintModal={(mode) => handleOpenPrintModal(mode || 'COLUMN_MATRIX')}
            onNavigateToSlotting={onNavigateToSlotting}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* 2. KPI Summary Cards (Ẩn trên mobile) */}
        <div className="hidden sm:block">
          <InventoryKpiCards data={data} />
        </div>

        {/* 3. Search Bar, Group Tabs & View Mode Switcher */}
        <InventoryFilterToolbar
          data={data}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          smartSuggestions={smartSuggestions}
          handleOpenSkuLabel={handleOpenSkuLabel}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          filteredGroups={filteredGroups}
          expandAllGroups={expandAllGroups}
          collapseAllGroups={collapseAllGroups}
          onRefresh={() => fetchData(selectedWarehouse)}
          loading={loading}
          isPolling={isPolling}
        />

        {/* 4. Content Rendering */}
        {loading && !data ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm font-bold text-slate-700">Đang kết nối và kéo tồn kho từ YunWMS...</p>
            <p className="text-xs text-slate-400 mt-1">Đang phân tích 334+ mã sản phẩm và nhóm SKU</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">Không tìm thấy sản phẩm nào phù hợp</h4>
            <p className="text-xs text-slate-400 mt-1">Thử đổi từ khóa tìm kiếm hoặc chọn nhóm SKU khác.</p>
          </div>
        ) : viewMode === 'GROUPED' ? (
          <InventoryGroupedView
            filteredGroups={filteredGroups}
            expandedGroups={expandedGroups}
            toggleGroupExpand={toggleGroupExpand}
            copiedGroup={copiedGroup}
            handleCopyGroupSkus={handleCopyGroupSkus}
            handleOpenPrintForGroup={handleOpenPrintForGroup}
            copiedSku={copiedSku}
            handleCopySku={handleCopySku}
            handleOpenSkuLabel={handleOpenSkuLabel}
            changedSkuMap={changedSkuMap}
          />
        ) : (
          <InventoryFlatTable
            sortedTableItems={sortedTableItems}
            data={data}
            handleOpenPrintModal={handleOpenPrintModal}
            sortField={sortField}
            setSortField={setSortField}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            handleSort={handleSort}
            copiedSku={copiedSku}
            handleCopySku={handleCopySku}
            handleOpenSkuLabel={handleOpenSkuLabel}
            changedSkuMap={changedSkuMap}
          />
        )}

        {/* 5. Print Modal */}
        <InventoryPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          data={data}
          initialGroup={printModalInitialGroup}
          initialLayoutMode={printModalLayoutMode}
        />

        {/* 6. Single SKU Thermal Label Print Modal */}
        <SingleSkuLabelModal
          isOpen={isSkuLabelModalOpen}
          onClose={() => {
            setIsSkuLabelModalOpen(false);
            setSelectedSkuForLabel(null);
          }}
          item={selectedSkuForLabel}
        />
      </div>
    </TabErrorBoundary>
  );
};
