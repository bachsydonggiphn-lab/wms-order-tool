import * as XLSX from 'xlsx';
import { InventoryQueryResult, InventoryGroupSummary, WmsInventoryItem, SkuGroupsMap } from '../types';
import { DEFAULT_SKU_GROUPS } from '../utils/skuData';

const LOCAL_STORAGE_KEY_INVENTORY = 'wms_inventory_cache_v1';

export async function loadWmsInventory(params: {
  warehouse?: string;
  customerCode?: string;
  productBarcode?: string;
  skuGroups?: SkuGroupsMap;
} = {}): Promise<InventoryQueryResult> {
  const res = await fetch('/api/wms/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      warehouse: params.warehouse ?? '7',
      customerCode: params.customerCode || '',
      productBarcode: params.productBarcode || '',
      skuGroups: params.skuGroups || DEFAULT_SKU_GROUPS
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Lỗi máy chủ (${res.status}): ${errorText.slice(0, 200)}`);
  }

  const data: InventoryQueryResult = await res.json();
  if (!data.success) {
    throw new Error(data.message || 'Không thể lấy dữ liệu tồn kho từ YunWMS');
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_INVENTORY, JSON.stringify(data));
  } catch (e) {}

  return data;
}

export function getCachedInventory(): InventoryQueryResult | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_INVENTORY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function exportInventoryToExcel(
  result: InventoryQueryResult,
  selectedGroup: string = 'ALL'
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Tổng Hợp Theo Nhóm SKU
  const summaryRows = result.groups.map((g, idx) => ({
    'STT': idx + 1,
    'Nhóm SKU': g.group,
    'Số Lượng SKU': g.skuCount,
    'Tổng Khả Dụng (In Used)': g.totalInUsed,
    'Có Thể Bán (Sellable)': g.totalSellable,
    'Đang Về (In Transit)': g.totalOnWay,
    'Chờ Lên Kệ (Pending)': g.totalPending,
    'Chờ Xuất Hàng (Outbound)': g.totalOutbound,
    'Hàng Lỗi (Defective)': g.totalUnsellable,
    'Tỉ Trọng Tồn (%)': `${g.percentageOfTotal}%`
  }));

  // Dòng Tổng Cộng
  summaryRows.push({
    'STT': 'TỔNG CỘNG' as any,
    'Nhóm SKU': `${result.groups.length} Nhóm`,
    'Số Lượng SKU': result.totalSkus,
    'Tổng Khả Dụng (In Used)': result.totalInUsed,
    'Có Thể Bán (Sellable)': result.totalSellable,
    'Đang Về (In Transit)': result.totalOnWay,
    'Chờ Lên Kệ (Pending)': result.totalPending,
    'Chờ Xuất Hàng (Outbound)': result.totalOutbound,
    'Hàng Lỗi (Defective)': result.totalUnsellable,
    'Tỉ Trọng Tồn (%)': '100%'
  });

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Hop_Nhom_SKU');

  // 2. Sheet Chi Tiết Từng SKU
  const filteredItems = selectedGroup === 'ALL'
    ? result.items
    : result.items.filter(it => it.group === selectedGroup);

  const detailRows = filteredItems.map((item, idx) => ({
    'STT': idx + 1,
    'Mã SKU': item.sku,
    'Nhóm SKU': item.group,
    'Tên Sản Phẩm': item.title || item.productName,
    'Mã Khách': item.customerCode,
    'Kho Hàng': item.warehouseName,
    'Khả Dụng (In Used)': item.inUsed,
    'Có Thể Bán (Sellable)': item.sellable,
    'Đang Về (In Transit)': item.onWay,
    'Chờ Lên Kệ (Pending)': item.pending,
    'Chờ Xuất (Outbound)': item.outbound,
    'Hàng Lỗi (Defective)': item.unsellable,
    'Tạm Giữ': item.unconfirmed,
    'Cảnh Báo Tồn': item.warningQty,
    'Cập Nhật Lúc': item.updateTime
  }));

  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi_Tiet_Ton_Kho');

  const fileName = `Ton_Kho_YunWMS_${result.warehouse.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
