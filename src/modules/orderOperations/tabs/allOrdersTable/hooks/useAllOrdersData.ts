import { useState, useMemo } from 'react';
import { RawOrderRow, CarrierCode } from '../../../../../types';
import { xacDinhDonViVanChuyen } from '../../../../../utils/orderProcessor';

interface UseAllOrdersDataParams {
  orders: RawOrderRow[];
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
  searchTerm: string;
}

export const useAllOrdersData = ({
  orders,
  selectedPickingList,
  selectedCarrier = 'ALL',
  searchTerm,
}: UseAllOrdersDataParams) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (selectedPickingList && order.pickingList !== selectedPickingList) {
        return false;
      }
      if (selectedCarrier && selectedCarrier !== 'ALL') {
        const orderCarrier = xacDinhDonViVanChuyen(order.trackingNo, order.rawOrderText).carrier;
        if (selectedCarrier === 'GHN_ALL') {
          if (orderCarrier !== 'GHN' && orderCarrier !== 'GHN_TIKTOK') {
            return false;
          }
        } else if (selectedCarrier === 'SPX_ALL') {
          if (orderCarrier !== 'SPX' && orderCarrier !== 'SPX_INSTANT') {
            return false;
          }
        } else if (selectedCarrier.includes(',')) {
          const list = selectedCarrier.split(',').map((s) => s.trim());
          const match = list.some((c) => {
            if (c === 'ALL') return true;
            if (c === 'GHN_ALL') return orderCarrier === 'GHN' || orderCarrier === 'GHN_TIKTOK';
            if (c === 'SPX_ALL') return orderCarrier === 'SPX' || orderCarrier === 'SPX_INSTANT';
            return orderCarrier === c;
          });
          if (!match) return false;
        } else if (orderCarrier !== selectedCarrier) {
          return false;
        }
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchOrder = order.orderNo.toLowerCase().includes(term);
        const matchTracking = order.trackingNo.toLowerCase().includes(term);
        const matchCarrier = (order.carrierName || '').toLowerCase().includes(term);
        const matchPicking = order.pickingList.toLowerCase().includes(term);
        const matchSku = order.items.some((it) => it.sku.toLowerCase().includes(term));
        const matchRaw = order.rawOrderText.toLowerCase().includes(term);
        const matchTime =
          (order.shippedTime || '').toLowerCase().includes(term) ||
          (order.creationTime || '').toLowerCase().includes(term);
        if (!matchOrder && !matchTracking && !matchCarrier && !matchPicking && !matchSku && !matchRaw && !matchTime) {
          return false;
        }
      }
      return true;
    });
  }, [orders, selectedPickingList, selectedCarrier, searchTerm]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;

  const displayedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleRowExpanded = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  return {
    copiedKey,
    handleCopy,
    expandedRowId,
    setExpandedRowId,
    toggleRowExpanded,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    filteredOrders,
    totalPages,
    displayedOrders,
  };
};
