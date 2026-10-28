import React from 'react';
import { ShippedTrackingViewProps } from './types';
import { useShippedTrackingData } from './hooks/useShippedTrackingData';
import { ShippedProgressBar } from './components/ShippedProgressBar';
import { ShippedKpiCards } from './components/ShippedKpiCards';
import { ShippedUnscannedAgeBreakdown } from './components/ShippedUnscannedAgeBreakdown';
import { ShippedBatchToolbar } from './components/ShippedBatchToolbar';
import { ShippedTrackingTable } from './components/ShippedTrackingTable';

export const ShippedTrackingView: React.FC<ShippedTrackingViewProps> = () => {
  const data = useShippedTrackingData();

  return (
    <div className="space-y-5">
      {/* 1. Live Progress Bar Section */}
      <ShippedProgressBar
        stats={data.stats}
        isBatchChecking={data.isBatchChecking}
        checkingProgress={data.checkingProgress}
        shippedOrdersCount={data.shippedOrders.length}
      />

      {/* 2. Geometric KPI Cards */}
      <ShippedKpiCards
        stats={data.stats}
        selectedStatusFilter={data.selectedStatusFilter}
        setSelectedStatusFilter={data.setSelectedStatusFilter}
        isBatchChecking={data.isBatchChecking}
        onUpdateUnscanned={() => data.handleStartBatchTrack(true)}
      />

      {/* 3. Bóc tách đơn Chưa Scan theo ngày tuổi */}
      <ShippedUnscannedAgeBreakdown
        stats={data.stats}
        selectedStatusFilter={data.selectedStatusFilter}
        setSelectedStatusFilter={data.setSelectedStatusFilter}
      />

      {/* 4. Batch Control Buttons & Action Bar with Date Range Pickers */}
      <ShippedBatchToolbar
        isBatchChecking={data.isBatchChecking}
        filteredItems={data.filteredItems}
        handleStartBatchTrack={data.handleStartBatchTrack}
        handleStopBatchTrack={data.handleStopBatchTrack}
        selectedDateFilter={data.selectedDateFilter}
        setSelectedDateFilter={data.setSelectedDateFilter}
        stats={data.stats}
        isFetchingWms={data.isFetchingWms}
        fetchShippedFromWms={data.fetchShippedFromWms}
        lastFetchedAt={data.lastFetchedAt}
        newOrdersCount={data.newOrdersCount}
        handleClearShippedCache={data.handleClearShippedCache}
        shippedOrdersCount={data.shippedOrders.length}
        handleCopyCodes={data.handleCopyCodes}
        copySuccess={data.copySuccess}
        handleExportReport={data.handleExportReport}
        searchTerm={data.searchTerm}
        setSearchTerm={data.setSearchTerm}
        fetchError={data.fetchError}
        setFetchError={data.setFetchError}
        selectedStatusFilter={data.selectedStatusFilter}
        setSelectedStatusFilter={data.setSelectedStatusFilter}
        selectedCarrierFilter={data.selectedCarrierFilter}
        setSelectedCarrierFilter={data.setSelectedCarrierFilter}
      />

      {/* 5. Main Tracking Order Table */}
      <ShippedTrackingTable
        filteredItems={data.filteredItems}
        shippedOrdersCount={data.shippedOrders.length}
        expandedOrderKey={data.expandedOrderKey}
        setExpandedOrderKey={data.setExpandedOrderKey}
        handleSingleTrack={data.handleSingleTrack}
      />
    </div>
  );
};

export default ShippedTrackingView;
