import React from 'react';
import { OrderPdfBatchPrintViewProps } from './types';
import { useOrderPdfBatch } from './hooks/useOrderPdfBatch';
import { printPickingSlipWindow } from './utils/pickingSlipPrinter';

import { BatchPrintHeaderBanner } from './components/BatchPrintHeaderBanner';
import { BatchPrintInputCard } from './components/BatchPrintInputCard';
import { BatchPrintDashboardCards } from './components/BatchPrintDashboardCards';
import { SkuPickingSummaryCard } from './components/SkuPickingSummaryCard';
import { OrdersAttachmentListCard } from './components/OrdersAttachmentListCard';
import { PdfPreviewModal } from './components/PdfPreviewModal';

/**
 * Module Độc Lập: Tab 4 - Tổng Hợp PDF & Nhặt Hàng
 * Điều phối các components con độc lập, giữ nguyên logic nghiệp vụ.
 */
export const OrderPdfPrintModule: React.FC<OrderPdfBatchPrintViewProps> = ({
  orders = [],
  skuGroups = {}
}) => {
  const {
    inputMode, setInputMode,
    pickingListInput, setPickingListInput,
    inputText, setInputText,
    isSearching, searchError,
    searchResults,
    selectedSkus, orderTableFilter, setOrderTableFilter,
    isMergingPdf, mergeError, copiedSkuTable,
    drawPackingOverlay, setDrawPackingOverlay,
    previewPdfUrl, setPreviewPdfUrl, previewTitle,
    distinctPickingLists, parsedCodes,
    ordersOfSelectedSkus, totalPcsOfSelectedSkus,
    handleLoadSampleCodes, handleImportCurrentOrders,
    handleSearchPickingList, handleSearchOrderCodes,
    executeSearchWithCodes,
    handlePrintMergedPdfForOrders, handlePreviewMergedPdfForOrders, handleDownloadMergedPdf,
    toggleSelectSku, selectAllSkus, deselectAllSkus,
    handleCopySkuTable,
    handleLoadAllPreview,
    hasMorePreview
  } = useOrderPdfBatch({ orders, skuGroups });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <BatchPrintHeaderBanner
        ordersCount={orders.length}
        onLoadSampleCodes={handleLoadSampleCodes}
        onImportCurrentOrders={handleImportCurrentOrders}
      />

      {/* 2. Khung Khai Báo Đầu Vào (Picking List No. vs Dán Mã Đơn Lẻ) */}
      <BatchPrintInputCard
        inputMode={inputMode}
        setInputMode={setInputMode}
        pickingListInput={pickingListInput}
        setPickingListInput={setPickingListInput}
        inputText={inputText}
        setInputText={setInputText}
        distinctPickingLists={distinctPickingLists}
        parsedCodesCount={parsedCodes.length}
        isSearching={isSearching}
        searchError={searchError}
        onSearchPickingList={handleSearchPickingList}
        onSearchOrderCodes={handleSearchOrderCodes}
        onSelectPickingListChip={(pl) => {
          setPickingListInput(pl);
          executeSearchWithCodes([pl], pl);
        }}
      />

      {/* 3. Hiển Thị Kết Quả Tìm Kiếm */}
      {searchResults && (
        <div className="space-y-6">
          {/* Dashboard Thống Kê Nhanh */}
          <BatchPrintDashboardCards searchResults={searchResults} />

          {/* BẢNG 1: Tổng Hợp SKU Cần Lấy & In Từng SKU */}
          <SkuPickingSummaryCard
            searchResults={searchResults}
            selectedSkus={selectedSkus}
            ordersOfSelectedSkus={ordersOfSelectedSkus}
            totalPcsOfSelectedSkus={totalPcsOfSelectedSkus}
            isMergingPdf={isMergingPdf}
            onToggleSelectSku={toggleSelectSku}
            onSelectAllSkus={selectAllSkus}
            onDeselectAllSkus={deselectAllSkus}
            onCopySkuTable={handleCopySkuTable}
            onPrintPickingSlip={() => printPickingSlipWindow(searchResults)}
            onPrintOrders={handlePrintMergedPdfForOrders}
            onPreviewOrders={handlePreviewMergedPdfForOrders}
            copiedSkuTable={copiedSkuTable}
          />

          {/* BẢNG 2: Danh Sách Đơn Hàng & File PDF Nhãn */}
          <OrdersAttachmentListCard
            searchResults={searchResults}
            ordersOfSelectedSkus={ordersOfSelectedSkus}
            selectedSkus={selectedSkus}
            orderTableFilter={orderTableFilter}
            setOrderTableFilter={setOrderTableFilter}
            drawPackingOverlay={drawPackingOverlay}
            setDrawPackingOverlay={setDrawPackingOverlay}
            isMergingPdf={isMergingPdf}
            mergeError={mergeError}
            onPreviewOrders={handlePreviewMergedPdfForOrders}
            onDownloadOrdersPdf={handleDownloadMergedPdf}
            onPrintOrders={handlePrintMergedPdfForOrders}
          />
        </div>
      )}

      {/* Modal Xem Trước PDF Gộp */}
      <PdfPreviewModal
        previewPdfUrl={previewPdfUrl}
        previewTitle={previewTitle}
        isMergingPdf={isMergingPdf}
        onLoadAllPreview={hasMorePreview ? handleLoadAllPreview : undefined}
        onClose={() => {
          if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl);
          setPreviewPdfUrl(null);
        }}
      />
    </div>
  );
};
