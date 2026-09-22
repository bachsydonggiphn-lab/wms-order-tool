import * as XLSX from 'xlsx';
import { InventoryQueryResult, InventoryGroupSummary, WmsInventoryItem, SkuGroupsMap } from '../types';
import { DEFAULT_SKU_GROUPS, DEFAULT_AREA_ORDER } from '../utils/skuData';
import { InventoryPrintOptions } from '../utils/inventoryPrint';

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

  // 2. Sheet Chi Tiết Từng SKU (sắp xếp theo vần chữ cái & số tự nhiên)
  const filteredItems = (selectedGroup === 'ALL'
    ? [...result.items]
    : result.items.filter(it => it.group === selectedGroup))
    .sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }));

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

/**
 * Xuất dữ liệu tồn kho theo đúng tùy chọn được cấu hình trong modal In Ấn / Kiểm Kê:
 * - Dạng Ma Trận Cột Nhóm SKU (Giống bảng Excel dán kệ kho)
 * - Dạng Bảng Kê Chi Tiết Tồn Kho (Có cột kiểm kê đếm tay, chênh lệch, đang về, chờ xuất)
 */
export function exportInventoryCustomExcel(
  result: InventoryQueryResult,
  options: InventoryPrintOptions
) {
  const wb = XLSX.utils.book_new();

  // 1. Xác định targetGroups
  let targetGroups: InventoryGroupSummary[] = [];
  if (options.scope === 'SINGLE_GROUP' && options.selectedGroupName) {
    targetGroups = result.groups.filter(g => g.group === options.selectedGroupName);
  } else if (options.scope === 'SELECTED_GROUPS' && options.selectedGroupNames && options.selectedGroupNames.length > 0) {
    const set = new Set(options.selectedGroupNames);
    targetGroups = result.groups.filter(g => set.has(g.group));
  } else {
    targetGroups = [...result.groups];
  }

  // Sắp xếp các nhóm theo thứ tự chuẩn
  targetGroups.sort((a, b) => {
    const idxA = DEFAULT_AREA_ORDER.indexOf(a.group);
    const idxB = DEFAULT_AREA_ORDER.indexOf(b.group);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.group.localeCompare(b.group, undefined, { numeric: true, sensitivity: 'base' });
  });

  const warehouseLabel = result.warehouse === '7' ? 'VN02_DongNai' : result.warehouse === '4' ? 'VN01_HaiNgoai' : `Kho_${result.warehouse || 'TatCa'}`;
  const dateStr = new Date().toISOString().slice(0, 10);

  if (options.layoutMode === 'COLUMN_MATRIX') {
    // ==========================================
    // 1. MA TRẬN CỘT SKU (MẪU DÁN KỆ / BÀN NHẬT)
    // ==========================================
    interface MatrixCol {
      title: string;
      items: Array<{ sku: string; inUsed: number }>;
    }

    let matrixCols: MatrixCol[] = [];

    if (options.scope === 'SINGLE_GROUP' && targetGroups.length === 1) {
      const g = targetGroups[0];
      const sortedItems = [...g.items].sort((a, b) =>
        a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' })
      );
      const numCols = Math.min(5, Math.max(2, Math.ceil(sortedItems.length / 15)));
      const itemsPerCol = Math.ceil(sortedItems.length / numCols);

      for (let c = 0; c < numCols; c++) {
        const colItems = sortedItems.slice(c * itemsPerCol, (c + 1) * itemsPerCol);
        if (colItems.length > 0) {
          matrixCols.push({
            title: `${g.group} (Cột ${c + 1} - ${colItems.length} SKU)`,
            items: colItems
          });
        }
      }
    } else {
      matrixCols = targetGroups.map(g => {
        const sortedItems = [...g.items].sort((a, b) =>
          a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' })
        );
        return {
          title: `${g.group} (${g.skuCount} SKU)`,
          items: sortedItems
        };
      });
    }

    // Header row
    const matrixAoa: any[][] = [];
    const headerRow = matrixCols.map(c => c.title);
    matrixAoa.push(headerRow);

    // Dữ liệu từng hàng
    const maxRows = Math.max(...matrixCols.map(c => c.items.length), 0);
    for (let r = 0; r < maxRows; r++) {
      const row: string[] = [];
      for (let c = 0; c < matrixCols.length; c++) {
        const item = matrixCols[c].items[r];
        if (item) {
          if (options.matrixIncludeQty) {
            row.push(`${item.sku} (${item.inUsed})`);
          } else {
            row.push(item.sku);
          }
        } else {
          row.push('');
        }
      }
      matrixAoa.push(row);
    }

    const wsMatrix = XLSX.utils.aoa_to_sheet(matrixAoa);
    wsMatrix['!cols'] = matrixCols.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, wsMatrix, 'Ma_Tran_Cot_SKU');

    // Sheet 2: Tổng hợp nhóm SKU
    const summaryRows = targetGroups.map((g, idx) => ({
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

    const totalSkus = targetGroups.reduce((acc, g) => acc + g.items.length, 0);
    const totalInUsed = targetGroups.reduce((acc, g) => acc + g.totalInUsed, 0);
    const totalSellable = targetGroups.reduce((acc, g) => acc + g.totalSellable, 0);
    const totalOnWay = targetGroups.reduce((acc, g) => acc + g.totalOnWay, 0);
    const totalPending = targetGroups.reduce((acc, g) => acc + g.totalPending, 0);
    const totalOutbound = targetGroups.reduce((acc, g) => acc + g.totalOutbound, 0);
    const totalUnsellable = targetGroups.reduce((acc, g) => acc + g.totalUnsellable, 0);

    summaryRows.push({
      'STT': 'TỔNG CỘNG' as any,
      'Nhóm SKU': `${targetGroups.length} Nhóm`,
      'Số Lượng SKU': totalSkus,
      'Tổng Khả Dụng (In Used)': totalInUsed,
      'Có Thể Bán (Sellable)': totalSellable,
      'Đang Về (In Transit)': totalOnWay,
      'Chờ Lên Kệ (Pending)': totalPending,
      'Chờ Xuất Hàng (Outbound)': totalOutbound,
      'Hàng Lỗi (Defective)': totalUnsellable,
      'Tỉ Trọng Tồn (%)': '100%'
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Hop_Nhom');

    // Sheet 3: Danh sách SKU đầy đủ
    const allTargetItems: WmsInventoryItem[] = [];
    targetGroups.forEach(g => {
      allTargetItems.push(...g.items);
    });
    allTargetItems.sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }));

    const detailRows = allTargetItems.map((item, idx) => ({
      'STT': idx + 1,
      'Mã SKU': item.sku,
      'Nhóm SKU': item.group,
      'Tên Sản Phẩm': item.title || item.productName || '-',
      'Khả Dụng (In Used)': item.inUsed,
      'Có Thể Bán (Sellable)': item.sellable,
      'Đang Về (On Way)': item.onWay,
      'Chờ Lên Kệ (Pending)': item.pending,
      'Chờ Xuất (Outbound)': item.outbound,
      'Hàng Lỗi (Defective)': item.unsellable
    }));

    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    wsDetail['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 14 },
      { wch: 32 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Chi_Tiet_SKU');

    const fileName = `Ma_Tran_Cot_SKU_${warehouseLabel}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);

  } else {
    // ==========================================
    // 2. BẢNG KÊ CHI TIẾT TỒN KHO & KIỂM KÊ THỰC TẾ
    // ==========================================
    const allItems: WmsInventoryItem[] = [];
    targetGroups.forEach(g => {
      allItems.push(...g.items);
    });

    // Sắp xếp theo lựa chọn
    if (options.sortBy === 'inUsed') {
      allItems.sort((a, b) => b.inUsed - a.inUsed);
    } else if (options.sortBy === 'sellable') {
      allItems.sort((a, b) => b.sellable - a.sellable);
    } else {
      allItems.sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }));
    }

    const detailRows = allItems.map((item, idx) => {
      const rowObj: Record<string, any> = {
        'STT': idx + 1,
        'Mã SKU': item.sku,
        'Nhóm SKU': item.group,
        'Tên Sản Phẩm': item.title || item.productName || '-',
        'Khả Dụng (In Used)': item.inUsed,
        'Có Thể Bán (Sellable)': item.sellable
      };

      if (options.includeTransitColumns) {
        rowObj['Đang Về (On Way)'] = item.onWay;
        rowObj['Chờ Lên Kệ (Pending)'] = item.pending;
        rowObj['Chờ Xuất (Outbound)'] = item.outbound;
        rowObj['Hàng Lỗi (Defective)'] = item.unsellable;
      }

      if (options.includePhysicalCheckColumn) {
        rowObj['Đếm Thực Tế (Kiểm Kê)'] = ''; // Cột để người dùng nhập/ghi tay
        rowObj['Chênh Lệch (+/-)'] = '';
        rowObj['Ghi Chú / Tình Trạng'] = '';
      }

      return rowObj;
    });

    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    wsDetail['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 14 },
      { wch: 32 },
      { wch: 16 },
      { wch: 16 },
      ...(options.includeTransitColumns ? [
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 }
      ] : []),
      ...(options.includePhysicalCheckColumn ? [
        { wch: 20 },
        { wch: 14 },
        { wch: 24 }
      ] : [])
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Bang_Ke_Chi_Tiet_Ton_Kho');

    // Sheet 2: Tổng hợp nhóm SKU
    const summaryRows = targetGroups.map((g, idx) => ({
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

    const totalSkus = targetGroups.reduce((acc, g) => acc + g.items.length, 0);
    const totalInUsed = targetGroups.reduce((acc, g) => acc + g.totalInUsed, 0);
    const totalSellable = targetGroups.reduce((acc, g) => acc + g.totalSellable, 0);
    const totalOnWay = targetGroups.reduce((acc, g) => acc + g.totalOnWay, 0);
    const totalPending = targetGroups.reduce((acc, g) => acc + g.totalPending, 0);
    const totalOutbound = targetGroups.reduce((acc, g) => acc + g.totalOutbound, 0);
    const totalUnsellable = targetGroups.reduce((acc, g) => acc + g.totalUnsellable, 0);

    summaryRows.push({
      'STT': 'TỔNG CỘNG' as any,
      'Nhóm SKU': `${targetGroups.length} Nhóm`,
      'Số Lượng SKU': totalSkus,
      'Tổng Khả Dụng (In Used)': totalInUsed,
      'Có Thể Bán (Sellable)': totalSellable,
      'Đang Về (In Transit)': totalOnWay,
      'Chờ Lên Kệ (Pending)': totalPending,
      'Chờ Xuất Hàng (Outbound)': totalOutbound,
      'Hàng Lỗi (Defective)': totalUnsellable,
      'Tỉ Trọng Tồn (%)': '100%'
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [
      { wch: 6 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 }
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Hop_Nhom_SKU');

    const fileName = `Bang_Ke_Kiem_Ke_Ton_Kho_${warehouseLabel}_${dateStr}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}

