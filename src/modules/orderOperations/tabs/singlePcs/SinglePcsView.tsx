import React, { useState } from 'react';
import { SinglePcsViewProps } from './types';
import { useSinglePcsData } from './hooks/useSinglePcsData';
import { SinglePcsHeaderBanner } from './components/SinglePcsHeaderBanner';
import { SinglePcsSummaryKpis } from './components/SinglePcsSummaryKpis';
import { SinglePcsFilterToolbar } from './components/SinglePcsFilterToolbar';
import { SinglePcsBatchActionBar } from './components/SinglePcsBatchActionBar';
import { SinglePcsBySkuView } from './views/SinglePcsBySkuView';
import { SinglePcsByAreaView } from './views/SinglePcsByAreaView';

export const SinglePcsView: React.FC<SinglePcsViewProps> = (props) => {
  const { selectedCarrier } = props;
  const data = useSinglePcsData(props);

  const [localCopiedKey, setLocalCopiedKey] = useState<string | null>(null);

  const handleCopySingleOrder = (orderNo: string) => {
    navigator.clipboard.writeText(orderNo);
    setLocalCopiedKey(`ord_${orderNo}`);
    setTimeout(() => setLocalCopiedKey(null), 1500);
  };

  const handleCopyAllAreas = () => {
    const lines: string[] = [];
    data.activeAreas.forEach((nhom) => {
      lines.push(`=== ${nhom} (${data.don1PCSTheoNhom[nhom].length} ĐƠN) ===`);
      data.don1PCSTheoNhom[nhom].forEach((o) => lines.push(o));
      lines.push('');
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setLocalCopiedKey('all_single');
    setTimeout(() => setLocalCopiedKey(null), 2000);
  };

  const activeCopiedKey = data.copiedKey || localCopiedKey;

  return (
    <div className="space-y-5">
      {/* Header Banner & Switcher */}
      <SinglePcsHeaderBanner
        totalOrders={data.breakdownResult.totalOrders}
        totalSkus={data.breakdownResult.totalSkus}
        pcsModeLabel={data.getPcsModeLabel()}
        selectedCarrier={selectedCarrier}
        viewMode={data.viewMode}
        setViewMode={data.setViewMode}
      />

      {/* KPI Cards Summary */}
      {data.viewMode === 'by_sku' && (
        <SinglePcsSummaryKpis
          pcsModeLabel={data.getPcsModeLabel()}
          totalOrders={data.breakdownResult.totalOrders}
          totalPcs={data.breakdownResult.totalPcs}
          totalSkus={data.breakdownResult.totalSkus}
          completedSkusCount={data.completedSkus.size}
          top1Sku={data.top1Sku}
          selectedSkus={data.selectedSkus}
          onToggleSku={data.handleToggleSku}
          selectedStats={data.selectedStats}
        />
      )}

      {/* View 1: Theo từng mã SKU */}
      {data.viewMode === 'by_sku' && (
        <div className="space-y-4">
          <SinglePcsFilterToolbar
            availablePcsStats={data.availablePcsStats}
            pcsMode={data.pcsMode}
            setPcsMode={data.setPcsMode}
            customPcsInput={data.customPcsInput}
            setCustomPcsInput={data.setCustomPcsInput}
            sortMode={data.sortMode}
            setSortMode={data.setSortMode}
            selectedAreaFilter={data.selectedAreaFilter}
            setSelectedAreaFilter={data.setSelectedAreaFilter}
            dynamicAreaList={data.dynamicAreaList}
            localSearch={data.localSearch}
            setLocalSearch={data.setLocalSearch}
            filteredSkuList={data.filteredSkuList}
            handleSelectRangeOrders={data.handleSelectRangeOrders}
            handleSelectMinOrders={data.handleSelectMinOrders}
            handleSelectTopN={data.handleSelectTopN}
            handleSelectAllVisible={data.handleSelectAllVisible}
            selectedSkus={data.selectedSkus}
            setSelectedSkus={data.setSelectedSkus}
            completedSkus={data.completedSkus}
            setCompletedSkus={data.setCompletedSkus}
            hideCompleted={data.hideCompleted}
            setHideCompleted={data.setHideCompleted}
          />

          <SinglePcsBatchActionBar
            selectedStats={data.selectedStats}
            copiedKey={activeCopiedKey}
            handleCopySelectedOrders={data.handleCopySelectedOrders}
            handleExportSelectedExcel={data.handleExportSelectedExcel}
            handleMarkSelectedCompleted={data.handleMarkSelectedCompleted}
          />

          <SinglePcsBySkuView
            filteredSkuList={data.filteredSkuList}
            pcsModeLabel={data.getPcsModeLabel()}
            sortMode={data.sortMode}
            selectedSkus={data.selectedSkus}
            completedSkus={data.completedSkus}
            copiedKey={activeCopiedKey}
            handleToggleSku={data.handleToggleSku}
            handleToggleComplete={data.handleToggleComplete}
            handleCopySkuOrders={data.handleCopySkuOrders}
            onCopySingleOrder={handleCopySingleOrder}
          />
        </div>
      )}

      {/* View 2: Theo 13 khu vực kho */}
      {data.viewMode === 'by_area' && (
        <SinglePcsByAreaView
          totalSinglePcsInArea={data.totalSinglePcsInArea}
          activeAreas={data.activeAreas}
          don1PCSTheoNhom={data.don1PCSTheoNhom}
          copiedKey={activeCopiedKey}
          handleCopyArea={data.handleCopyArea}
          onCopyAllAreas={handleCopyAllAreas}
          onCopySingleOrder={handleCopySingleOrder}
        />
      )}
    </div>
  );
};

export default SinglePcsView;
