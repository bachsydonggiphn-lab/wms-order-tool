import React from 'react';
import { Boxes } from 'lucide-react';
import { MixOrderAnalysisViewProps } from './types';
import { useMixOrderAnalysis } from './hooks/useMixOrderAnalysis';
import { MixYogaFilterBar } from './components/MixYogaFilterBar';
import { MixHeaderKpiCards } from './components/MixHeaderKpiCards';
import { MixModeAndSearchToolbar } from './components/MixModeAndSearchToolbar';
import { MixByGroupTab } from './views/MixByGroupTab';
import { MixByAreaTab } from './views/MixByAreaTab';
import { MixTableTab } from './views/MixTableTab';
import { MixClusterTab } from './views/MixClusterTab';
import { MixCombosTab } from './views/MixCombosTab';
import {
  handlePrintByGroupTable,
  handlePrintByAreaTable,
  handlePrintFullMixTable,
  handlePrintMixCluster,
} from './utils/mixPrintTemplates';

export const MixOrderAnalysisView: React.FC<MixOrderAnalysisViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
}) => {
  const {
    selectedSku,
    setSelectedSku,
    searchTerm,
    setSearchTerm,
    areaFilter,
    setAreaFilter,
    sortBy,
    setSortBy,
    copiedKey,
    viewMode,
    setViewMode,
    groupingType,
    setGroupingType,
    subGroupTab,
    setSubGroupTab,
    yogaFilter,
    setYogaFilter,
    pcsFilter,
    setPcsFilter,
    mixByGroup,
    filteredPureGroupList,
    filteredCrossGroupPairs,
    filteredAllGroupSummaries,
    mixAnalysis,
    availableAreas,
    filteredSkus,
    skusGroupedByArea,
    currentSelectedSummary,
    top1Sku,
    popularPairs,
    handleCopyOrders,
  } = useMixOrderAnalysis(orders, skuGroups, selectedPickingList, selectedCarrier);

  return (
    <div className="space-y-6">
      {/* 0. Yoga Mat Exclusion Filter Bar */}
      <MixYogaFilterBar
        yogaFilter={yogaFilter}
        setYogaFilter={setYogaFilter}
        mixAnalysis={mixAnalysis}
      />

      {mixAnalysis.totalMixOrders === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-xs max-w-xl mx-auto space-y-3">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            {yogaFilter === 'exclude'
              ? 'Không có đơn MIX thông thường nào (ngoài Thảm Yoga)'
              : yogaFilter === 'only'
              ? 'Không có đơn MIX nào chứa Thảm Yoga'
              : 'Không có đơn hàng MIX nào'}
          </h3>
          <p className="text-sm text-gray-500">
            {yogaFilter === 'exclude' && (mixAnalysis.totalYogaMixOrdersCount ?? 0) > 0
              ? `Tất cả ${mixAnalysis.totalYogaMixOrdersCount} đơn MIX hiện tại đều là đơn Thảm Yoga (đã được loại trừ). Bạn có thể bấm nút "Chỉ Đơn MIX Thảm Yoga" hoặc "Tất Cả" ở trên để xem.`
              : 'Toàn bộ các đơn hàng trong danh sách hiện tại đều là đơn 1 SKU duy nhất hoặc không có đơn MIX phù hợp với bộ lọc.'}
          </p>
        </div>
      ) : (
        <>
          {/* 1. Header KPI Cards */}
          <MixHeaderKpiCards
            top1Sku={top1Sku}
            mixAnalysis={mixAnalysis}
            totalOrdersCount={orders.length}
          />

          {/* 2. Mode Tabs & Search Filter Controls */}
          <MixModeAndSearchToolbar
            viewMode={viewMode}
            setViewMode={setViewMode}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            areaFilter={areaFilter}
            setAreaFilter={setAreaFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            availableAreas={availableAreas}
            mixAnalysis={mixAnalysis}
            copiedKey={copiedKey}
            onPrintByGroupTable={() => handlePrintByGroupTable(mixByGroup, selectedPickingList)}
            onPrintByAreaTable={() => handlePrintByAreaTable(skusGroupedByArea, selectedPickingList, mixAnalysis)}
            onPrintFullMixTable={() => handlePrintFullMixTable(filteredSkus, selectedPickingList, mixAnalysis)}
            onCopyOrders={handleCopyOrders}
          />

          {/* 3. MAIN CONTENT BASED ON ACTIVE TAB */}
          {viewMode === 'by_group' && (
            <MixByGroupTab
              mixByGroup={mixByGroup}
              mixAnalysis={mixAnalysis}
              groupingType={groupingType}
              setGroupingType={setGroupingType}
              subGroupTab={subGroupTab}
              setSubGroupTab={setSubGroupTab}
              pcsFilter={pcsFilter}
              setPcsFilter={setPcsFilter}
              filteredPureGroupList={filteredPureGroupList}
              filteredCrossGroupPairs={filteredCrossGroupPairs}
              filteredAllGroupSummaries={filteredAllGroupSummaries}
              copiedKey={copiedKey}
              handleCopyOrders={handleCopyOrders}
            />
          )}

          {viewMode === 'by_area' && (
            <MixByAreaTab
              skusGroupedByArea={skusGroupedByArea}
              mixAnalysis={mixAnalysis}
              copiedKey={copiedKey}
              onPrintByAreaTable={() => handlePrintByAreaTable(skusGroupedByArea, selectedPickingList, mixAnalysis)}
              handleCopyOrders={handleCopyOrders}
              setSelectedSku={setSelectedSku}
              setViewMode={setViewMode}
            />
          )}

          {viewMode === 'table' && (
            <MixTableTab
              filteredSkus={filteredSkus}
              mixAnalysis={mixAnalysis}
              copiedKey={copiedKey}
              handleCopyOrders={handleCopyOrders}
              setSelectedSku={setSelectedSku}
              setViewMode={setViewMode}
            />
          )}

          {viewMode === 'cluster' && (
            <MixClusterTab
              filteredSkus={filteredSkus}
              mixAnalysis={mixAnalysis}
              currentSelectedSummary={currentSelectedSummary}
              selectedSku={selectedSku}
              setSelectedSku={setSelectedSku}
              copiedKey={copiedKey}
              handleCopyOrders={handleCopyOrders}
              onPrintMixCluster={(summary) => handlePrintMixCluster(summary, selectedPickingList)}
            />
          )}

          {viewMode === 'combos' && (
            <MixCombosTab popularPairs={popularPairs} />
          )}
        </>
      )}
    </div>
  );
};
