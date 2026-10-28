import React from 'react';

interface AllOrdersPaginationProps {
  currentPage: number;
  totalPages: number;
  totalFilteredOrders: number;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export const AllOrdersPagination: React.FC<AllOrdersPaginationProps> = ({
  currentPage,
  totalPages,
  totalFilteredOrders,
  onPrevPage,
  onNextPage,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600">
      <div>
        Trang {currentPage} / {totalPages} (Tổng {totalFilteredOrders} đơn)
      </div>

      <div className="flex items-center gap-1.5">
        <button
          disabled={currentPage === 1}
          onClick={onPrevPage}
          className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 shadow-2xs cursor-pointer"
        >
          ← Trước
        </button>
        <span className="px-2 font-semibold text-gray-900">{currentPage}</span>
        <button
          disabled={currentPage === totalPages}
          onClick={onNextPage}
          className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 shadow-2xs cursor-pointer"
        >
          Sau →
        </button>
      </div>
    </div>
  );
};
