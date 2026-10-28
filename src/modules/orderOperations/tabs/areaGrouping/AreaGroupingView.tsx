import React from 'react';
import { AreaGroupingViewProps } from './types';
import { useAreaGroupingData } from './hooks/useAreaGroupingData';
import { AreaGroupingHeaderBanner } from './components/AreaGroupingHeaderBanner';
import { AreaGroupingFilterTabs } from './components/AreaGroupingFilterTabs';
import { AreaGroupingMatrixTable } from './views/AreaGroupingMatrixTable';
import { AreaGroupingCardsGrid } from './views/AreaGroupingCardsGrid';

export const AreaGroupingView: React.FC<AreaGroupingViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
  searchTerm,
}) => {
  const {
    copiedKey,
    selectedAreaFilter,
    setSelectedAreaFilter,
    columnMode,
    setColumnMode,
    displayLayout,
    handleDisplayLayoutChange,
    donTheoNhom,
    dynamicAreaList,
    loaiKeys,
    activeAreas,
    maxMatrixRows,
    handleCopyAreaColumn,
    handleCopyWholeArea,
    handleCopyCell,
    getTotalOrdersInArea,
  } = useAreaGroupingData({
    orders,
    skuGroups,
    selectedPickingList,
    selectedCarrier,
    searchTerm,
  });

  return (
    <div className="space-y-6">
      {/* Banner & Controls */}
      <AreaGroupingHeaderBanner
        displayLayout={displayLayout}
        onDisplayLayoutChange={handleDisplayLayoutChange}
        columnMode={columnMode}
        onColumnModeChange={setColumnMode}
      />

      {/* Filter Area Quick Tabs */}
      <AreaGroupingFilterTabs
        totalOrders={orders.length}
        selectedAreaFilter={selectedAreaFilter}
        onSelectArea={setSelectedAreaFilter}
        dynamicAreaList={dynamicAreaList}
        getTotalOrdersInArea={getTotalOrdersInArea}
      />

      {/* Main Area Content */}
      {activeAreas.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-xs">
          Không có đơn hàng nào thuộc khu vực đã chọn.
        </div>
      ) : displayLayout === 'matrix' ? (
        <AreaGroupingMatrixTable
          activeAreas={activeAreas}
          loaiKeys={loaiKeys}
          donTheoNhom={donTheoNhom}
          maxMatrixRows={maxMatrixRows}
          copiedKey={copiedKey}
          onCopyCell={handleCopyCell}
          getTotalOrdersInArea={getTotalOrdersInArea}
        />
      ) : (
        <AreaGroupingCardsGrid
          activeAreas={activeAreas}
          donTheoNhom={donTheoNhom}
          loaiKeys={loaiKeys}
          copiedKey={copiedKey}
          onCopyAreaColumn={handleCopyAreaColumn}
          onCopyWholeArea={handleCopyWholeArea}
          onCopyCell={handleCopyCell}
          getTotalOrdersInArea={getTotalOrdersInArea}
        />
      )}
    </div>
  );
};
