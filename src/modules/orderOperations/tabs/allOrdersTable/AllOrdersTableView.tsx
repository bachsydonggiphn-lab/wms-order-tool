import React from 'react';
import { AllOrdersTableViewProps } from './types';
import { useAllOrdersData } from './hooks/useAllOrdersData';
import { AllOrdersToolbar } from './components/AllOrdersToolbar';
import { AllOrdersTableRow } from './components/AllOrdersTableRow';
import { AllOrdersPagination } from './components/AllOrdersPagination';

export const AllOrdersTableView: React.FC<AllOrdersTableViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
  searchTerm,
}) => {
  const {
    copiedKey,
    handleCopy,
    expandedRowId,
    toggleRowExpanded,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredOrders,
    totalPages,
    displayedOrders,
  } = useAllOrdersData({
    orders,
    selectedPickingList,
    selectedCarrier,
    searchTerm,
  });

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden space-y-0">
      {/* Top Header Toolbar */}
      <AllOrdersToolbar
        totalOrdersCount={orders.length}
        filteredOrders={filteredOrders}
        selectedCarrier={selectedCarrier}
        copiedKey={copiedKey}
        handleCopy={handleCopy}
        pageSize={pageSize}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      {/* Table Content */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
            <tr>
              <th className="py-2.5 px-3.5 w-12 text-center font-normal text-gray-400">STT</th>
              <th className="py-2.5 px-3.5">Mã Đơn (Order No)</th>
              <th className="py-2.5 px-3.5">Mã Tracking</th>
              <th className="py-2.5 px-3.5">ĐVVC (Vận Chuyển)</th>
              <th className="py-2.5 px-3.5">Picking List</th>
              <th className="py-2.5 px-3.5">Chi Tiết SKU (Piece)</th>
              <th className="py-2.5 px-3.5 text-center">Tổng PCS</th>
              <th className="py-2.5 px-3.5">Khu Vực</th>
              <th className="py-2.5 px-3.5">Thời Gian Xuất Kho / Tạo</th>
              <th className="py-2.5 px-3.5 text-center">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedOrders.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-gray-400">
                  Không tìm thấy đơn hàng nào khớp với tìm kiếm hoặc bộ lọc ĐVVC.
                </td>
              </tr>
            ) : (
              displayedOrders.map((order, idx) => {
                const globalIndex = (currentPage - 1) * pageSize + idx + 1;
                const isExpanded = expandedRowId === order.id;

                return (
                  <AllOrdersTableRow
                    key={order.id}
                    order={order}
                    globalIndex={globalIndex}
                    skuGroups={skuGroups}
                    isExpanded={isExpanded}
                    copiedKey={copiedKey}
                    onCopy={handleCopy}
                    onToggleExpand={toggleRowExpanded}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      <AllOrdersPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalFilteredOrders={filteredOrders.length}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
      />
    </div>
  );
};
