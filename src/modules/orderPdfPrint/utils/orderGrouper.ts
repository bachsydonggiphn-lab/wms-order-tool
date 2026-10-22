import { OrderAttachmentInfo, SkuPickingSummaryItem } from '../../../services/wmsService';
import { PrintableOrderItem } from '../types';

/**
 * Sắp xếp các đơn hàng theo từng mã SKU và tự động chèn 2 trang trắng ngăn cách
 * nếu in từ 2 mã SKU trở lên hoặc in toàn bộ.
 */
export function organizeOrdersBySkuWithSeparators(
  targetOrders: OrderAttachmentInfo[],
  skuSummaryList: SkuPickingSummaryItem[],
  selectedSkus?: Set<string>
): { printableItems: PrintableOrderItem[]; skuCount: number; validOrdersCount: number } {
  // 1. Chỉ lấy những đơn hàng thực sự có file PDF nhãn
  const validOrders = targetOrders.filter((o) => o.hasAttachment);
  if (validOrders.length === 0) {
    return { printableItems: [], skuCount: 0, validOrdersCount: 0 };
  }

  // 2. Tạo bản đồ tra cứu nhanh theo mã đơn / mã vận đơn
  const orderMap = new Map<string, OrderAttachmentInfo>();
  validOrders.forEach((o) => {
    if (o.orderNo) orderMap.set(o.orderNo.trim().toUpperCase(), o);
    if (o.trackingNo) orderMap.set(o.trackingNo.trim().toUpperCase(), o);
  });

  // 3. Gom nhóm đơn hàng theo từng SKU (theo đúng thứ tự xuất hiện của SKU trong danh sách tổng hợp)
  const skuGroups: Array<{ sku: string; orders: OrderAttachmentInfo[] }> = [];
  const assignedOrderKeys = new Set<string>();

  // Lọc và sắp xếp danh sách SKU cần in: SKU nhiều đơn / số lượng nhất xếp trước
  const targetSkus = skuSummaryList
    .filter((s) => {
      if (!selectedSkus || selectedSkus.size === 0) return true;
      return selectedSkus.has(s.sku);
    })
    .sort((a, b) => b.totalQty - a.totalQty || b.orderCount - a.orderCount || a.sku.localeCompare(b.sku));

  for (const s of targetSkus) {
    const groupOrders: OrderAttachmentInfo[] = [];
    for (const no of s.orderNos) {
      const upperNo = (no || '').trim().toUpperCase();
      if (orderMap.has(upperNo) && !assignedOrderKeys.has(upperNo)) {
        const ord = orderMap.get(upperNo)!;
        groupOrders.push(ord);
        if (ord.orderNo) assignedOrderKeys.add(ord.orderNo.trim().toUpperCase());
        if (ord.trackingNo) assignedOrderKeys.add(ord.trackingNo.trim().toUpperCase());
      }
    }
    // Sắp xếp các đơn trong SKU theo thứ tự mã đơn từ thấp đến cao (numeric ascending)
    groupOrders.sort((a, b) =>
      (a.orderNo || '').localeCompare(b.orderNo || '', undefined, { numeric: true, sensitivity: 'base' })
    );
    if (groupOrders.length > 0) {
      skuGroups.push({ sku: s.sku, orders: groupOrders });
    }
  }

  // 4. Nếu còn đơn hàng nào chưa được gom theo SKU ở trên, gom vào nhóm cuối
  const remainingOrders = validOrders
    .filter((o) => {
      const k1 = o.orderNo && assignedOrderKeys.has(o.orderNo.trim().toUpperCase());
      const k2 = o.trackingNo && assignedOrderKeys.has(o.trackingNo.trim().toUpperCase());
      return !k1 && !k2;
    })
    .sort((a, b) =>
      (a.orderNo || '').localeCompare(b.orderNo || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  if (remainingOrders.length > 0) {
    skuGroups.push({ sku: 'KHAC', orders: remainingOrders });
  }

  const skuCount = skuGroups.length;

  // 5. Nếu chỉ có 1 nhóm SKU duy nhất:
  // In liên tục tất cả đơn của SKU đó, KHÔNG chèn trang trắng ngăn cách
  if (skuCount <= 1) {
    const items = skuCount === 1 ? skuGroups[0].orders : [];
    return { printableItems: items, skuCount, validOrdersCount: items.length };
  }

  // 6. Nếu có từ 2 mã SKU trở lên hoặc in toàn bộ:
  // Sắp xếp đơn của từng SKU, chèn đúng 2 trang trắng (isSeparator: true) giữa các nhóm SKU
  const printableItems: PrintableOrderItem[] = [];
  let totalValidOrders = 0;

  for (let i = 0; i < skuGroups.length; i++) {
    if (i > 0) {
      // Đánh dấu chèn 2 trang trắng ngăn cách giữa 2 mã SKU
      printableItems.push({
        isSeparator: true,
        separatorLabel: `Ngăn cách sang SKU: ${skuGroups[i].sku}`
      });
    }
    printableItems.push(...skuGroups[i].orders);
    totalValidOrders += skuGroups[i].orders.length;
  }

  return { printableItems, skuCount, validOrdersCount: totalValidOrders };
}
