import { useState, useEffect, useCallback } from 'react';
import { OrderAttachmentInfo } from '../../../services/wmsService';

export interface UseAutoShipOrderReturn {
  autoShipOnPrint: boolean;
  setAutoShipOnPrint: (val: boolean) => void;
  isShipping: boolean;
  lastShipResult: {
    success: boolean;
    message: string;
    shippedCount?: number;
    failedCount?: number;
    timestamp?: number;
  } | null;
  triggerBatchShip: (
    ordersToShip: OrderAttachmentInfo[],
    onSuccessCallback?: (shippedCodes: string[]) => void
  ) => Promise<{ success: boolean; message: string; count: number }>;
}

const STORAGE_KEY = 'wms_auto_ship_on_print';

/**
 * Hook quản lý tùy chọn tự động chuyển trạng thái Shipped trên YunWMS sau khi in PDF
 */
export function useAutoShipOrder(): UseAutoShipOrderReturn {
  const [autoShipOnPrint, setAutoShipState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === 'true' : false;
    } catch {
      return false;
    }
  });

  const [isShipping, setIsShipping] = useState<boolean>(false);
  const [lastShipResult, setLastShipResult] = useState<UseAutoShipOrderReturn['lastShipResult']>(null);

  const setAutoShipOnPrint = useCallback((val: boolean) => {
    setAutoShipState(val);
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const triggerBatchShip = useCallback(async (
    ordersToShip: OrderAttachmentInfo[],
    onSuccessCallback?: (shippedCodes: string[]) => void
  ) => {
    if (!ordersToShip || ordersToShip.length === 0) {
      return { success: false, message: 'Danh sách đơn rỗng', count: 0 };
    }

    // 1. Lọc bỏ các đơn đã có trạng thái Shipped (Đã xuất) từ trước để không gửi thừa gây timeout WMS
    const unShippedOrders = ordersToShip.filter(o => {
      const st = (o.status || '').toLowerCase();
      const code = (o.statusCode || '').trim();
      if (st.includes('shipped') || st.includes('đã xuất') || code === '8') {
        return false;
      }
      return true;
    });

    // Nếu tất cả đơn đã chọn đều đã Shipped rồi
    if (unShippedOrders.length === 0) {
      const resultObj = {
        success: true,
        message: `Tất cả ${ordersToShip.length} đơn đã chọn đều đã ở trạng thái Shipped (Đã xuất kho) từ trước.`,
        shippedCount: ordersToShip.length,
        failedCount: 0,
        timestamp: Date.now()
      };
      setLastShipResult(resultObj);
      if (onSuccessCallback) {
        onSuccessCallback(ordersToShip.map(p => (p.orderNo || p.refNo || '').trim()).filter(Boolean));
      }
      return { success: true, message: resultObj.message, count: ordersToShip.length };
    }

    const payloadOrders = unShippedOrders
      .map(o => ({
        orderCode: (o.orderNo || o.refNo || '').trim(),
        trackingNo: (o.trackingNo || o.attachmentFileName?.replace(/\.pdf$/i, '') || '').trim(),
        weight: '0.2'
      }))
      .filter(o => o.orderCode !== '');

    if (payloadOrders.length === 0) {
      return { success: false, message: 'Không tìm thấy mã đơn hợp lệ để ký xuất', count: 0 };
    }

    const targetWarehouse = unShippedOrders.find(o => o.warehouseId)?.warehouseId || '7';

    setIsShipping(true);
    try {
      const res = await fetch('/api/wms/batch-ship-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orders: payloadOrders,
          warehouse: targetWarehouse
        })
      });

      const data = await res.json();
      const resultObj = {
        success: Boolean(data.success),
        message: data.message || (data.success ? 'Ký xuất kho thành công' : 'Lỗi ký xuất kho'),
        shippedCount: data.shippedCount || (data.success ? payloadOrders.length : 0),
        failedCount: data.failedCount || 0,
        timestamp: Date.now()
      };

      setLastShipResult(resultObj);

      if (data.success && onSuccessCallback) {
        onSuccessCallback(payloadOrders.map(p => p.orderCode));
      }

      return {
        success: Boolean(data.success),
        message: resultObj.message,
        count: resultObj.shippedCount
      };
    } catch (err: any) {
      const errorMsg = `Lỗi mạng khi gọi API xuất kho: ${err?.message || 'Lỗi không xác định'}`;
      setLastShipResult({
        success: false,
        message: errorMsg,
        shippedCount: 0,
        failedCount: payloadOrders.length,
        timestamp: Date.now()
      });
      return { success: false, message: errorMsg, count: 0 };
    } finally {
      setIsShipping(false);
    }
  }, []);

  return {
    autoShipOnPrint,
    setAutoShipOnPrint,
    isShipping,
    lastShipResult,
    triggerBatchShip
  };
}
