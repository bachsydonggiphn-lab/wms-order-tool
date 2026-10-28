import React, { useMemo } from 'react';
import { Warehouse, FolderTree, ClipboardList, Link2 } from 'lucide-react';
import { TabErrorBoundary } from '../../components/common/TabErrorBoundary';
import { HotSkuSlottingModuleProps } from './types';
import { useHotSkuAnalytics } from './hooks/useHotSkuAnalytics';
import { useHotSkuSync } from './hooks/useHotSkuSync';
import { exportHotSkuToExcel, exportRelocationTasksToExcel } from './utils/hotSkuExcelExport';
import { exportGroupSlottingToExcel, printGroupSlottingReport } from './utils/groupSlottingPrintExport';

// Subcomponents
import { HotSkuBannerToolbar } from './components/HotSkuBannerToolbar';
import { HotSkuSummaryMetrics } from './components/HotSkuSummaryMetrics';
import { Warehouse2DSlottingMap } from './components/Warehouse2DSlottingMap';
import { HotSkuAbcTable } from './components/HotSkuAbcTable';
import { GroupSlottingSection } from './components/GroupSlottingSection';
import { RelocationTasksSection } from './components/RelocationTasksSection';
import { PairedSkusSection } from './components/PairedSkusSection';
import { SyncShippedModal } from './components/SyncShippedModal';
import { PairedSkuInfo } from '../../../sqliteDb';

export const HotSkuSlottingModule: React.FC<HotSkuSlottingModuleProps> = ({
  skuGroups = {},
  onNavigateToInventory,
  onNavigateToOrders,
}) => {
  const {
    activeSubTab,
    setActiveSubTab,
    completedTaskIds,
    toggleTaskCompleted,
    markAllTasksCompleted,
    resetAllTasks,
    timeframe,
    setTimeframe,
    customFromDate,
    setCustomFromDate,
    customToDate,
    setCustomToDate,
    selectedGroup,
    setSelectedGroup,
    selectedAbc,
    setSelectedAbc,
    selectedZoneFilter,
    setSelectedZoneFilter,
    searchTerm,
    setSearchTerm,
    rankingMode,
    setRankingMode,
    filterStockoutIncomingOnly,
    setFilterStockoutIncomingOnly,
    analytics,
    isLoading,
    errorMessage,
    fetchAnalytics,
    filteredItems,
    groupSlottingMetrics,
    displayedSlottingSkus,
    selectedSlottingGroup,
    setSelectedSlottingGroup,
    slottingGroupSearch,
    setSlottingGroupSearch,
    slottingGroupAbcFilter,
    setSlottingGroupAbcFilter,
    slottingGroupViewMode,
    setSlottingGroupViewMode,
  } = useHotSkuAnalytics();

  const {
    isSyncModalOpen,
    setIsSyncModalOpen,
    syncFromDate,
    setSyncFromDate,
    syncToDate,
    setSyncToDate,
    isSyncing,
    syncProgressMsg,
    syncPercent,
    syncStats,
    handleOpenSyncModal,
    handleTriggerSync,
  } = useHotSkuSync({
    onSyncComplete: () => fetchAnalytics(false),
  });

  // Gom các cặp mua kèm duy nhất
  const uniquePairs = useMemo(() => {
    if (!analytics?.pairedSkus) return [];
    const seen = new Set<string>();
    const list: PairedSkuInfo[] = [];

    analytics.pairedSkus.forEach((p) => {
      const key = [p.skuA, p.skuB].sort().join('___');
      if (!seen.has(key)) {
        seen.add(key);
        list.push(p);
      }
    });

    return list.sort((a, b) => b.count - a.count);
  }, [analytics]);

  return (
    <TabErrorBoundary tabName="Hàng Bán Chạy & Bố Trí Kho (ABC)" onNavigateBack={onNavigateToOrders}>
      <div className="space-y-6 animate-fade-in pb-12">
        {/* 1. HEADER SECTION (BANNER VÀ KHUNG THỜI GIAN) */}
        <HotSkuBannerToolbar
          analytics={analytics}
          isLoading={isLoading}
          onRefresh={() => fetchAnalytics(true)}
          onOpenSyncModal={handleOpenSyncModal}
          onExportExcel={() => exportHotSkuToExcel(analytics, filteredItems, rankingMode, timeframe)}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          rankingMode={rankingMode}
          setRankingMode={setRankingMode}
          customFromDate={customFromDate}
          setCustomFromDate={setCustomFromDate}
          customToDate={customToDate}
          setCustomToDate={setCustomToDate}
        />

        {/* SUB-TABS NAVIGATION BAR */}
        <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto py-1">
            <button
              onClick={() => setActiveSubTab('map_and_table')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeSubTab === 'map_and_table'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Warehouse className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sơ Đồ Kệ Kho & Bảng Phân Tích ABC</span>
              <span className="sm:hidden">Sơ Đồ & Bảng ABC</span>
            </button>

            <button
              onClick={() => setActiveSubTab('group_slotting')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeSubTab === 'group_slotting'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FolderTree className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Bố Trí Theo Nhóm Hàng</span>
              <span className="sm:hidden">Theo Nhóm Hàng</span>
              {groupSlottingMetrics.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeSubTab === 'group_slotting' ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {groupSlottingMetrics.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('relocation_tasks')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeSubTab === 'relocation_tasks'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ClipboardList className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Checklist Nhiệm Vụ Chuyển Kệ</span>
              <span className="sm:hidden">Nhiệm Vụ Kệ</span>
              {(analytics?.relocationTasks?.length || 0) > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeSubTab === 'relocation_tasks' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
                  }`}
                >
                  {analytics?.relocationTasks?.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('paired_skus')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeSubTab === 'paired_skus'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Link2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Ma Trận Cặp Mua Kèm (Đơn Mix)</span>
              <span className="sm:hidden">Cặp Mua Kèm</span>
              {uniquePairs.length > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeSubTab === 'paired_skus' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {uniquePairs.length}
                </span>
              )}
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-3 text-xs pr-2">
            <span className="text-slate-500">
              Tổng sản lượng kỳ này:{' '}
              <b className="text-slate-900 font-mono">{(analytics?.totalSoldVolume || 0).toLocaleString()}</b> pcs
            </span>
          </div>
        </div>

        {/* 2. TOP 5 KPI SUMMARY CARDS */}
        <HotSkuSummaryMetrics
          analytics={analytics}
          rankingMode={rankingMode}
          selectedAbc={selectedAbc}
          setSelectedAbc={setSelectedAbc}
          selectedZoneFilter={selectedZoneFilter}
          setSelectedZoneFilter={setSelectedZoneFilter}
          filterStockoutIncomingOnly={filterStockoutIncomingOnly}
          setFilterStockoutIncomingOnly={setFilterStockoutIncomingOnly}
        />

        {/* 3. SUBTAB 1: SƠ ĐỒ 2D & BẢNG PHÂN HẠNG ABC */}
        {activeSubTab === 'map_and_table' && (
          <div className="space-y-6">
            <Warehouse2DSlottingMap
              analytics={analytics}
              selectedZoneFilter={selectedZoneFilter}
              setSelectedZoneFilter={setSelectedZoneFilter}
              onNavigateToInventory={onNavigateToInventory}
            />

            <HotSkuAbcTable
              filteredItems={filteredItems}
              selectedZoneFilter={selectedZoneFilter}
              setSelectedZoneFilter={setSelectedZoneFilter}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedAbc={selectedAbc}
              setSelectedAbc={setSelectedAbc}
              filterStockoutIncomingOnly={filterStockoutIncomingOnly}
              setFilterStockoutIncomingOnly={setFilterStockoutIncomingOnly}
              selectedGroup={selectedGroup}
              setSelectedGroup={setSelectedGroup}
              skuGroups={skuGroups}
              rankingMode={rankingMode}
              isLoading={isLoading}
              errorMessage={errorMessage}
              stockoutIncomingCount={analytics?.stockoutIncomingCount || 0}
              onNavigateToInventory={onNavigateToInventory}
            />
          </div>
        )}

        {/* 4. SUBTAB 2: QUY HOẠCH BỐ TRÍ THEO NHÓM HÀNG */}
        {activeSubTab === 'group_slotting' && (
          <GroupSlottingSection
            groupSlottingMetrics={groupSlottingMetrics}
            analytics={analytics}
            selectedSlottingGroup={selectedSlottingGroup}
            setSelectedSlottingGroup={setSelectedSlottingGroup}
            slottingGroupViewMode={slottingGroupViewMode}
            setSlottingGroupViewMode={setSlottingGroupViewMode}
            slottingGroupSearch={slottingGroupSearch}
            setSlottingGroupSearch={setSlottingGroupSearch}
            slottingGroupAbcFilter={slottingGroupAbcFilter}
            setSlottingGroupAbcFilter={setSlottingGroupAbcFilter}
            displayedSlottingSkus={displayedSlottingSkus}
            handleExportGroupSlottingExcel={(onlyCurrentGroup) =>
              exportGroupSlottingToExcel(groupSlottingMetrics, selectedSlottingGroup, onlyCurrentGroup)
            }
            handlePrintGroupSlottingReport={(onlyCurrentGroup) =>
              printGroupSlottingReport(groupSlottingMetrics, selectedSlottingGroup, onlyCurrentGroup)
            }
            onNavigateToInventory={onNavigateToInventory}
          />
        )}

        {/* 5. SUBTAB 3: CHECKLIST NHIỆM VỤ CHUYỂN KỆ */}
        {activeSubTab === 'relocation_tasks' && (
          <RelocationTasksSection
            analytics={analytics}
            completedTaskIds={completedTaskIds}
            toggleTaskCompleted={toggleTaskCompleted}
            markAllTasksCompleted={markAllTasksCompleted}
            resetAllTasks={resetAllTasks}
            handleExportRelocationTasks={() => exportRelocationTasksToExcel(analytics, completedTaskIds)}
            onNavigateToInventory={onNavigateToInventory}
          />
        )}

        {/* 6. SUBTAB 4: MA TRẬN CẶP MUA KÈM (ĐƠN MIX) */}
        {activeSubTab === 'paired_skus' && (
          <PairedSkusSection uniquePairs={uniquePairs} onNavigateToInventory={onNavigateToInventory} />
        )}

        {/* 7. MODAL KÉO BỔ SUNG ĐƠN TỪ YUNWMS */}
        <SyncShippedModal
          isOpen={isSyncModalOpen}
          onClose={() => !isSyncing && setIsSyncModalOpen(false)}
          fromDate={syncFromDate}
          toDate={syncToDate}
          onFromDateChange={setSyncFromDate}
          onToDateChange={setSyncToDate}
          isSyncing={isSyncing}
          progressMsg={syncProgressMsg}
          progressPercent={syncPercent}
          progressStats={syncStats}
          onTriggerSync={handleTriggerSync}
        />
      </div>
    </TabErrorBoundary>
  );
};
