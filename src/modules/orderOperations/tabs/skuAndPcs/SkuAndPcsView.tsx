import React, { useState } from 'react';
import { SkuAndPcsViewProps } from './types';
import { useSkuAndPcsData } from './hooks/useSkuAndPcsData';
import { SkuPcsTopActionBar } from './components/SkuPcsTopActionBar';
import { SkuPcsMobileToggle } from './components/SkuPcsMobileToggle';
import { SkuSideSummaryTable } from './components/SkuSideSummaryTable';
import { SkuPcsThresholdFilterBar } from './components/SkuPcsThresholdFilterBar';
import { PcsColumnsGrid } from './components/PcsColumnsGrid';
import { SkuBatchWmsFloatingBar } from './components/SkuBatchWmsFloatingBar';
import { PcsColumnInspectModal } from './components/PcsColumnInspectModal';
import { CreateWmsPickingListModal } from '../../../../components/CreateWmsPickingListModal';

export const SkuAndPcsView: React.FC<SkuAndPcsViewProps> = (props) => {
  const {
    orders,
    searchTerm,
    onSearchChange,
    onExportExcel,
    onPrintPreview,
    onNavigateTab,
    onOpenPrintModal,
  } = props;

  const data = useSkuAndPcsData(props);

  // Helper for single order / string clipboard copy
  const [localCopiedKey, setLocalCopiedKey] = useState<string | null>(null);

  const handleCopySingleText = (text: string) => {
    navigator.clipboard.writeText(text);
    setLocalCopiedKey(text);
    setTimeout(() => setLocalCopiedKey(null), 1500);
  };

  const activeCopiedKey = data.copiedKey || localCopiedKey;

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <SkuPcsTopActionBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onExportExcel={onExportExcel}
        onPrintPreview={onPrintPreview}
        isSkuTableCollapsed={data.isSkuTableCollapsed}
        toggleSkuTableCollapsed={data.toggleSkuTableCollapsed}
        skuEntriesCount={data.skuEntries.length}
        onNavigateTab={onNavigateTab}
        handleCopySkuTable={data.handleCopySkuTable}
        copiedKey={activeCopiedKey}
      />

      {/* Mobile Toggle */}
      <SkuPcsMobileToggle
        mobileColumnTab={data.mobileColumnTab}
        setMobileColumnTab={data.setMobileColumnTab}
        skuCount={data.skuEntries.length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SkuSideSummaryTable */}
        <SkuSideSummaryTable
          isSkuTableCollapsed={data.isSkuTableCollapsed}
          toggleSkuTableCollapsed={data.toggleSkuTableCollapsed}
          mobileColumnTab={data.mobileColumnTab}
          skuEntries={data.skuEntries}
          totalSkuQty={data.totalSkuQty}
          skuSortMode={data.skuSortMode}
          setSkuSortMode={data.setSkuSortMode}
          copiedKey={activeCopiedKey}
          onCopySku={(sku) => {
            navigator.clipboard.writeText(sku);
            setLocalCopiedKey(`sku_${sku}`);
            setTimeout(() => setLocalCopiedKey(null), 1500);
          }}
        />

        {/* Right Area: Grid container */}
        <div className={`${
          data.isSkuTableCollapsed ? 'col-span-12' : 'lg:col-span-8 xl:col-span-9'
        } flex flex-col gap-0`}>
          {/* Threshold Filter Bar for SKU View Mode */}
          {data.columnViewMode === 'sku' && (
            <SkuPcsThresholdFilterBar
              minOrderThreshold={data.minOrderThreshold}
              setMinOrderThreshold={data.setMinOrderThreshold}
              customMinOrders={data.customMinOrders}
              setCustomMinOrders={data.setCustomMinOrders}
              globalThresholdStats={data.globalThresholdStats}
              copiedKey={activeCopiedKey}
              handleCopyGlobalRange={data.handleCopyGlobalRange}
              isSubmittedStatus={data.isSubmittedStatus}
              handleOpenCreateWmsModal={data.handleOpenCreateWmsModal}
            />
          )}

          {/* PCS Columns Grid */}
          <PcsColumnsGrid
            isSkuTableCollapsed={data.isSkuTableCollapsed}
            toggleSkuTableCollapsed={data.toggleSkuTableCollapsed}
            skuEntriesCount={data.skuEntries.length}
            mobileColumnTab={data.mobileColumnTab}
            columnViewMode={data.columnViewMode}
            setColumnViewMode={data.setColumnViewMode}
            pcsKeys={data.pcsKeys}
            pcsGroups={data.pcsGroups}
            columnSkuBreakdowns={data.columnSkuBreakdowns}
            minOrderThreshold={data.minOrderThreshold}
            activeThresholdNum={data.activeThresholdNum}
            isSubmittedStatus={data.isSubmittedStatus}
            selectedSkuMap={data.selectedSkuMap}
            setSelectedSkuMap={data.setSelectedSkuMap}
            handleOpenInspectColumn={data.handleOpenInspectColumn}
            handleCopyColumn={data.handleCopyColumn}
            handleOpenCreateWmsModal={data.handleOpenCreateWmsModal}
            handleCopyColumnRange={data.handleCopyColumnRange}
            copiedKey={activeCopiedKey}
            expandedSkus={data.expandedSkus}
            handleToggleExpandSku={data.handleToggleExpandSku}
            handleCopySkuInColumn={data.handleCopySkuInColumn}
            onCopySingleOrder={(orderNo) => {
              navigator.clipboard.writeText(orderNo);
              setLocalCopiedKey(`ord_${orderNo}`);
              setTimeout(() => setLocalCopiedKey(null), 1500);
            }}
            getOrderRefNo={data.getOrderRefNo}
            orderMap={data.orderMap}
          />
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <SkuBatchWmsFloatingBar
        isSubmittedStatus={data.isSubmittedStatus}
        selectedStats={data.selectedStats}
        onClearSelection={() => data.setSelectedSkuMap(new Map())}
        onCopyAllOrderNos={() => {
          navigator.clipboard.writeText(data.selectedStats.allOrderNos.join('\n'));
          setLocalCopiedKey('floating_batch_copy');
          setTimeout(() => setLocalCopiedKey(null), 2000);
        }}
        copiedKey={activeCopiedKey}
        handleOpenCreateWmsModal={data.handleOpenCreateWmsModal}
      />

      {/* Modal: Inspect Column */}
      <PcsColumnInspectModal
        inspectColumnKey={data.inspectColumnKey}
        onClose={() => data.setInspectColumnKey(null)}
        inspectColumnTitle={data.inspectColumnTitle}
        activeModalTotalOrders={data.activeModalTotalOrders}
        activeModalBreakdown={data.activeModalBreakdown}
        modalSearch={data.modalSearch}
        setModalSearch={data.setModalSearch}
        filteredModalSkus={data.filteredModalSkus}
        modalSelectedSkus={data.modalSelectedSkus}
        setModalSelectedSkus={data.setModalSelectedSkus}
        handleExportModalExcel={data.handleExportModalExcel}
        modalSelectedStats={data.modalSelectedStats}
        handleCopyModalSelectedOrders={data.handleCopyModalSelectedOrders}
        copiedKey={activeCopiedKey}
        handleCopySkuInColumn={data.handleCopySkuInColumn}
        onCopySingleOrder={(no) => {
          navigator.clipboard.writeText(no);
          setLocalCopiedKey(`modal_ord_${no}`);
          setTimeout(() => setLocalCopiedKey(null), 1500);
        }}
        handleCopyColumn={data.handleCopyColumn}
        pcsGroups={data.pcsGroups}
        isSubmittedStatus={data.isSubmittedStatus}
        handleOpenCreateWmsModal={data.handleOpenCreateWmsModal}
      />

      {/* Modal: Tạo Picking List WMS */}
      <CreateWmsPickingListModal
        isOpen={data.wmsModalState.isOpen}
        onClose={() => data.setWmsModalState((prev) => ({ ...prev, isOpen: false }))}
        batchTitle={data.wmsModalState.batchTitle}
        orderCodes={data.wmsModalState.orderCodes}
        orders={orders}
        onSuccess={data.handleWmsSuccess}
        onOpenPrintModal={onOpenPrintModal}
      />
    </div>
  );
};
export default SkuAndPcsView;
