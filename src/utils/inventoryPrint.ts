import { InventoryQueryResult, InventoryGroupSummary, WmsInventoryItem } from '../types';
import { DEFAULT_AREA_ORDER } from './skuData';

export type PrintLayoutMode = 'DETAILED_TABLE' | 'COLUMN_MATRIX';

export interface InventoryPrintOptions {
  scope: 'ALL' | 'SINGLE_GROUP' | 'SELECTED_GROUPS';
  layoutMode?: PrintLayoutMode; // 'DETAILED_TABLE' (Bảng chi tiết tồn kho) | 'COLUMN_MATRIX' (Ma trận cột phân loại SKU giống Excel)
  selectedGroupName?: string;
  selectedGroupNames?: string[];
  includePhysicalCheckColumn?: boolean; // Cột ghi tay kiểm kê thực tế
  includeTransitColumns?: boolean; // Cột Đang về / Chờ xuất / Hàng lỗi
  matrixIncludeQty?: boolean; // Hiển thị kèm số lượng tồn trong ô ma trận
  orientation?: 'portrait' | 'landscape'; // Khổ giấy in dọc hay ngang
  columnsPerPage?: number; // Số cột tối đa trên 1 bảng ma trận (mặc định 10-12)
  fontSize?: 'compact' | 'normal' | 'large';
  warehouseName?: string;
  sortBy?: 'sku' | 'inUsed' | 'sellable';
}

export function generateInventoryPrintHtml(
  data: InventoryQueryResult,
  options: InventoryPrintOptions
): string {
  if (options.layoutMode === 'COLUMN_MATRIX') {
    return generateSkuMatrixPrintHtml(data, options);
  }

  const warehouse = options.warehouseName || (data.warehouse === '7' ? 'VN02 [Đồng Nai]' : data.warehouse === '4' ? 'VN01 [Hải Ngoại]' : `Kho #${data.warehouse || 'Tất cả'}`);
  const printTime = new Date().toLocaleString('vi-VN');

  // Lọc danh sách nhóm cần in
  let groupsToPrint: InventoryGroupSummary[] = [];

  if (options.scope === 'SINGLE_GROUP' && options.selectedGroupName) {
    groupsToPrint = data.groups.filter(g => g.group === options.selectedGroupName);
  } else if (options.scope === 'SELECTED_GROUPS' && options.selectedGroupNames && options.selectedGroupNames.length > 0) {
    const set = new Set(options.selectedGroupNames);
    groupsToPrint = data.groups.filter(g => set.has(g.group));
  } else {
    // In toàn bộ tổng hợp
    groupsToPrint = [...data.groups];
  }

  // Sắp xếp các nhóm theo thứ tự chuẩn
  groupsToPrint.sort((a, b) => {
    return a.group.localeCompare(b.group, undefined, { numeric: true, sensitivity: 'base' });
  });

  // Tính tổng số liệu cần in
  const totalSkus = groupsToPrint.reduce((s, g) => s + g.items.length, 0);
  const totalInUsed = groupsToPrint.reduce((s, g) => s + g.totalInUsed, 0);
  const totalSellable = groupsToPrint.reduce((s, g) => s + g.totalSellable, 0);
  const totalOnWay = groupsToPrint.reduce((s, g) => s + g.totalOnWay, 0);
  const totalOutbound = groupsToPrint.reduce((s, g) => s + g.totalOutbound, 0);
  const totalUnsellable = groupsToPrint.reduce((s, g) => s + g.totalUnsellable, 0);

  const isSingleGroup = options.scope === 'SINGLE_GROUP' && options.selectedGroupName;
  const titleText = isSingleGroup
    ? `BẢNG KÊ TỒN KHO & DANH SÁCH SKU - NHÓM ${options.selectedGroupName}`
    : `BÁO CÁO TỒN KHO TỔNG HỢP THEO TỪNG NHÓM SKU`;

  const fontConfig = {
    compact: { body: '11px', th: '10px', td: '10.5px', pad: '3px 6px' },
    normal: { body: '12px', th: '11px', td: '11.5px', pad: '5px 8px' },
    large: { body: '13px', th: '12px', td: '12.5px', pad: '6px 10px' },
  }[options.fontSize || 'normal'];

  // Render các nhóm
  const groupsHtml = groupsToPrint.map((group, groupIdx) => {
    // Sắp xếp SKU trong nhóm
    const items = [...group.items];
    if (options.sortBy === 'inUsed') {
      items.sort((a, b) => b.inUsed - a.inUsed);
    } else if (options.sortBy === 'sellable') {
      items.sort((a, b) => b.sellable - a.sellable);
    } else {
      items.sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }));
    }

    const rowsHtml = items.map((item, idx) => {
      const isZero = item.inUsed <= 0;
      return `
        <tr style="${isZero ? 'background-color: #fff1f2;' : (idx % 2 === 1 ? 'background-color: #f8fafc;' : '')}">
          <td style="text-align: center; color: #64748b; font-weight: bold; border: 1px solid #cbd5e1; padding: ${fontConfig.pad};">${idx + 1}</td>
          <td style="font-family: monospace; font-weight: bold; color: #0f172a; border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; white-space: nowrap;">
            <span style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; border: 1px solid #e2e8f0;">${escapeHtml(item.sku)}</span>
          </td>
          <td style="color: #334155; border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; max-width: 280px; word-break: break-word;">
            ${escapeHtml(item.title || item.productName || '-')}
          </td>
          <td style="text-align: right; font-weight: bold; font-size: ${fontConfig.body}; color: ${isZero ? '#e11d48' : '#047857'}; border: 1px solid #cbd5e1; padding: ${fontConfig.pad};">
            ${item.inUsed.toLocaleString('vi-VN')}
          </td>
          <td style="text-align: right; font-weight: 600; color: #1e40af; border: 1px solid #cbd5e1; padding: ${fontConfig.pad};">
            ${item.sellable.toLocaleString('vi-VN')}
          </td>
          ${options.includeTransitColumns ? `
            <td style="text-align: right; color: #d97706; border: 1px solid #cbd5e1; padding: ${fontConfig.pad};">
              ${item.onWay > 0 ? `+${item.onWay.toLocaleString('vi-VN')}` : '-'}
            </td>
            <td style="text-align: right; color: #7c3aed; border: 1px solid #cbd5e1; padding: ${fontConfig.pad};">
              ${item.outbound > 0 ? item.outbound.toLocaleString('vi-VN') : '-'}
            </td>
            <td style="text-align: right; color: #dc2626; border: 1px solid #cbd5e1; padding: ${fontConfig.pad};">
              ${item.unsellable > 0 ? item.unsellable.toLocaleString('vi-VN') : '-'}
            </td>
          ` : ''}
          ${options.includePhysicalCheckColumn ? `
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; background-color: #fff; width: 75px;">
              <div style="border-bottom: 1px dashed #94a3b8; height: 16px;"></div>
            </td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; background-color: #fff; width: 60px;">
              <div style="border-bottom: 1px dashed #94a3b8; height: 16px;"></div>
            </td>
            <td style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; background-color: #fff; width: 85px;">
              <div style="border-bottom: 1px dashed #94a3b8; height: 16px;"></div>
            </td>
          ` : ''}
        </tr>
      `;
    }).join('');

    return `
      <div style="margin-bottom: 22px; page-break-inside: avoid;">
        <!-- Group Sub-header -->
        <div style="background: #0f172a; color: #ffffff; padding: 7px 12px; border-radius: 6px 6px 0 0; display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="background: #10b981; color: #064e3b; padding: 1px 7px; border-radius: 4px; font-size: 11px; font-weight: 900;">#${groupIdx + 1}</span>
            <span style="font-size: 13.5px; letter-spacing: 0.3px;">NHÓM: ${escapeHtml(group.group)}</span>
            <span style="font-size: 11px; background: rgba(255,255,255,0.18); padding: 2px 8px; border-radius: 12px; font-weight: normal;">
              ${group.skuCount} mã SKU (${group.percentageOfTotal}% tổng kho)
            </span>
          </div>
          <div style="font-size: 11.5px; font-weight: normal; display: flex; gap: 14px;">
            <span>Khả dụng (In Used): <strong style="color: #34d399; font-size: 12.5px;">${group.totalInUsed.toLocaleString('vi-VN')}</strong></span>
            <span>Có thể bán: <strong style="color: #93c5fd;">${group.totalSellable.toLocaleString('vi-VN')}</strong></span>
            ${options.includeTransitColumns && group.totalOnWay > 0 ? `<span>Đang về: <strong style="color: #fbbf24;">+${group.totalOnWay.toLocaleString('vi-VN')}</strong></span>` : ''}
            ${options.includeTransitColumns && group.totalOutbound > 0 ? `<span>Chờ xuất: <strong style="color: #c084fc;">${group.totalOutbound.toLocaleString('vi-VN')}</strong></span>` : ''}
          </div>
        </div>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: ${fontConfig.td}; border: 1px solid #cbd5e1;">
          <thead>
            <tr style="background: #e2e8f0; color: #334155; font-size: ${fontConfig.th}; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 32px; text-align: center;">STT</th>
              <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 145px; text-align: left;">Mã SKU</th>
              <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; text-align: left;">Tên Sản Phẩm</th>
              <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 85px; text-align: right;">Khả Dụng</th>
              <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 85px; text-align: right;">Có Thể Bán</th>
              ${options.includeTransitColumns ? `
                <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 68px; text-align: right;">Đang Về</th>
                <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 68px; text-align: right;">Chờ Xuất</th>
                <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 65px; text-align: right;">Hàng Lỗi</th>
              ` : ''}
              ${options.includePhysicalCheckColumn ? `
                <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 75px; text-align: center; background-color: #fef3c7; color: #92400e;">Đếm Thực Tế</th>
                <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 60px; text-align: center; background-color: #fef3c7; color: #92400e;">Lệch</th>
                <th style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; width: 85px; text-align: center; background-color: #fef3c7; color: #92400e;">Ghi Chú</th>
              ` : ''}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #94a3b8;">
              <td colspan="3" style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; text-align: right; color: #0f172a;">
                TỔNG CỘNG NHÓM ${escapeHtml(group.group)}:
              </td>
              <td style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; text-align: right; color: #047857;">
                ${group.totalInUsed.toLocaleString('vi-VN')}
              </td>
              <td style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; text-align: right; color: #1e40af;">
                ${group.totalSellable.toLocaleString('vi-VN')}
              </td>
              ${options.includeTransitColumns ? `
                <td style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; text-align: right; color: #d97706;">
                  ${group.totalOnWay > 0 ? `+${group.totalOnWay.toLocaleString('vi-VN')}` : '-'}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; text-align: right; color: #7c3aed;">
                  ${group.totalOutbound > 0 ? group.totalOutbound.toLocaleString('vi-VN') : '-'}
                </td>
                <td style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; text-align: right; color: #dc2626;">
                  ${group.totalUnsellable > 0 ? group.totalUnsellable.toLocaleString('vi-VN') : '-'}
                </td>
              ` : ''}
              ${options.includePhysicalCheckColumn ? `
                <td style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; background-color: #fffbeb;"></td>
                <td style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; background-color: #fffbeb;"></td>
                <td style="border: 1px solid #cbd5e1; padding: ${fontConfig.pad}; background-color: #fffbeb;"></td>
              ` : ''}
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>${titleText} - ${warehouse}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 16px;
            font-size: ${fontConfig.body};
            line-height: 1.35;
          }
          @page {
            size: A4 portrait;
            margin: 10mm 8mm;
          }
          @media print {
            body { padding: 0; margin: 0; }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
          }
          .action-bar {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn-print {
            background-color: #059669;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            font-size: 13px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .btn-print:hover { background-color: #047857; }
          .btn-close {
            background-color: #e2e8f0;
            color: #334155;
            border: none;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <!-- Top Toolbar for quick print in popup -->
        <div class="action-bar no-print">
          <div>
            <strong style="color: #047857; font-size: 13.5px;">🖨️ XEM TRƯỚC BẢN IN TỒN KHO YUNWMS</strong>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Định dạng chuẩn A4. Nhấn nút "In Ngay" hoặc dùng phím tắt <b>Ctrl + P</b> (Cmd + P trên Mac).
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-print" onclick="window.print()">🖨️ In Ngay (Print)</button>
            <button class="btn-close" onclick="window.close()">Đóng Cửa Sổ</button>
          </div>
        </div>

        <!-- Document Header -->
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.5px;">
              HỆ THỐNG QUẢN LÝ KHO YUNWMS &bull; ${escapeHtml(warehouse)}
            </div>
            <h1 style="margin: 3px 0 4px 0; font-size: 17px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
              ${titleText}
            </h1>
            <div style="font-size: 11px; color: #475569;">
              Thời gian xuất: <b>${printTime}</b> &bull; Nguồn: <b>czwh.wms.yunwms.com</b> (Live WMS Data)
            </div>
          </div>

          <!-- Quick KPI Box -->
          <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 12px; background: #f8fafc; text-align: right; min-width: 220px;">
            <div style="font-size: 11px; color: #64748b;">
              Số nhóm in: <strong style="color: #0f172a;">${groupsToPrint.length}</strong> | Tổng SKU: <strong style="color: #0f172a;">${totalSkus}</strong>
            </div>
            <div style="font-size: 13px; font-weight: 900; color: #047857; margin-top: 2px;">
              Tồn khả dụng: ${totalInUsed.toLocaleString('vi-VN')} PCS
            </div>
            <div style="font-size: 10.5px; color: #475569;">
              Có thể bán: <b>${totalSellable.toLocaleString('vi-VN')}</b>
              ${options.includeTransitColumns && totalOnWay > 0 ? ` | Đang về: <b>+${totalOnWay.toLocaleString('vi-VN')}</b>` : ''}
              ${options.includeTransitColumns && totalOutbound > 0 ? ` | Chờ xuất: <b>${totalOutbound.toLocaleString('vi-VN')}</b>` : ''}
            </div>
          </div>
        </div>

        <!-- Content Body (Groups & Items) -->
        ${groupsHtml}

        <!-- Signatures & Footer -->
        <div style="margin-top: 25px; page-break-inside: avoid; border-top: 1px solid #e2e8f0; pt: 12px;">
          <div style="display: flex; justify-content: space-between; text-align: center; margin-top: 15px;">
            <div style="width: 200px;">
              <div style="font-weight: bold; font-size: 12px; color: #0f172a;">NGƯỜI LẬP BIỂU</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">(Ký và ghi rõ họ tên)</div>
              <div style="height: 60px;"></div>
              <div style="border-top: 1px dotted #94a3b8; width: 140px; margin: 0 auto;"></div>
            </div>

            <div style="width: 200px;">
              <div style="font-weight: bold; font-size: 12px; color: #0f172a;">NHÂN VIÊN KIỂM KÊ</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">(Ký và ghi rõ họ tên)</div>
              <div style="height: 60px;"></div>
              <div style="border-top: 1px dotted #94a3b8; width: 140px; margin: 0 auto;"></div>
            </div>

            <div style="width: 200px;">
              <div style="font-weight: bold; font-size: 12px; color: #0f172a;">THỦ KHO / QUẢN LÝ</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">(Xác nhận xuất nhập tồn)</div>
              <div style="height: 60px;"></div>
              <div style="border-top: 1px dotted #94a3b8; width: 140px; margin: 0 auto;"></div>
            </div>
          </div>

          <div style="text-align: center; font-size: 9.5px; color: #94a3b8; margin-top: 20px;">
            Công Cụ Xử Lý Đơn Hàng Kho & Tra Cứu Tồn Kho WMS &bull; In lúc: ${printTime} &bull; Trang in tài liệu nội bộ kho
          </div>
        </div>
      </body>
    </html>
  `;
}

export function generateSkuMatrixPrintHtml(
  data: InventoryQueryResult,
  options: InventoryPrintOptions
): string {
  const warehouse = options.warehouseName || (data.warehouse === '7' ? 'VN02 [Đồng Nai]' : data.warehouse === '4' ? 'VN01 [Hải Ngoại]' : `Kho #${data.warehouse || 'Tất cả'}`);
  const printTime = new Date().toLocaleString('vi-VN');
  const orientation = options.orientation || 'landscape'; // Mặc định in ngang để vừa nhiều cột
  const includeQty = !!options.matrixIncludeQty;

  // Lọc danh sách nhóm cần in
  let targetGroups: InventoryGroupSummary[] = [];

  if (options.scope === 'SINGLE_GROUP' && options.selectedGroupName) {
    targetGroups = data.groups.filter(g => g.group === options.selectedGroupName);
  } else if (options.scope === 'SELECTED_GROUPS' && options.selectedGroupNames && options.selectedGroupNames.length > 0) {
    const set = new Set(options.selectedGroupNames);
    targetGroups = data.groups.filter(g => set.has(g.group));
  } else {
    targetGroups = [...data.groups];
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

  // Chuẩn bị danh sách SKU cho từng nhóm (đã sắp xếp A-Z & số)
  interface ColumnData {
    title: string;
    subTitle?: string;
    items: Array<{ sku: string; inUsed: number }>;
  }

  let matrixColumns: ColumnData[] = [];

  // Nếu chỉ in 1 nhóm riêng lẻ: Tách nhóm này thành nhiều cột con (4-5 cột) để dàn đều trang in A4
  if (options.scope === 'SINGLE_GROUP' && targetGroups.length === 1) {
    const group = targetGroups[0];
    const sortedItems = [...group.items].sort((a, b) =>
      a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' })
    );

    const numCols = Math.min(5, Math.max(2, Math.ceil(sortedItems.length / 15)));
    const itemsPerCol = Math.ceil(sortedItems.length / numCols);

    for (let c = 0; c < numCols; c++) {
      const colItems = sortedItems.slice(c * itemsPerCol, (c + 1) * itemsPerCol);
      if (colItems.length > 0) {
        matrixColumns.push({
          title: `${group.group} (Cột ${c + 1})`,
          subTitle: `${colItems.length} SKU`,
          items: colItems
        });
      }
    }
  } else {
    // In nhiều nhóm (như ảnh người dùng gửi): Mỗi nhóm là 1 cột
    matrixColumns = targetGroups.map(g => {
      const sortedItems = [...g.items].sort((a, b) =>
        a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' })
      );
      return {
        title: g.group,
        subTitle: `${g.skuCount} SKU`,
        items: sortedItems
      };
    });
  }

  // Tìm số hàng lớn nhất giữa các cột
  const maxRows = Math.max(...matrixColumns.map(c => c.items.length), 0);
  const totalSkus = targetGroups.reduce((s, g) => s + g.items.length, 0);
  const totalInUsed = targetGroups.reduce((s, g) => s + g.totalInUsed, 0);

  // Cỡ chữ theo cấu hình
  const fontSizeConfig = {
    compact: { cell: '10px', header: '11px', pad: '3px 4px' },
    normal: { cell: '11px', header: '12px', pad: '4px 6px' },
    large: { cell: '12px', header: '13px', pad: '6px 8px' }
  }[options.fontSize || 'normal'];

  // Render các hàng
  let rowsHtml = '';
  for (let r = 0; r < maxRows; r++) {
    const isEven = r % 2 === 0;
    rowsHtml += `<tr style="${isEven ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">`;
    for (let c = 0; c < matrixColumns.length; c++) {
      const col = matrixColumns[c];
      const item = col.items[r];
      if (item) {
        rowsHtml += `
          <td style="border: 1px solid #cbd5e1; padding: ${fontSizeConfig.pad}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; font-size: ${fontSizeConfig.cell}; font-weight: 700; color: #0f172a; text-align: center; white-space: nowrap;">
            ${escapeHtml(item.sku)}
            ${includeQty ? `<span style="font-size: 9.5px; color: #047857; font-weight: normal; margin-left: 2px;">(${item.inUsed})</span>` : ''}
          </td>
        `;
      } else {
        rowsHtml += `
          <td style="border: 1px solid #e2e8f0; background-color: #fafafa; padding: ${fontSizeConfig.pad};"></td>
        `;
      }
    }
    rowsHtml += '</tr>';
  }

  const isSingle = options.scope === 'SINGLE_GROUP';
  const titleText = isSingle
    ? `SƠ ĐỒ PHÂN LOẠI & SẮP XẾP SKU - NHÓM ${options.selectedGroupName}`
    : `BẢNG MA TRẬN PHÂN LOẠI SKU THEO CÁC CỘT NHÓM HÀNG`;

  return `
    <!DOCTYPE html>
    <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>${titleText} - ${warehouse}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 14px;
            line-height: 1.3;
          }
          @page {
            size: A4 ${orientation};
            margin: 6mm 6mm;
          }
          @media print {
            body { padding: 0; margin: 0; }
            .no-print { display: none !important; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            thead { display: table-header-group; }
          }
          .action-bar {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 16px;
            margin-bottom: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn-print {
            background-color: #0284c7;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            font-size: 13px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .btn-print:hover { background-color: #0369a1; }
          .btn-close {
            background-color: #e2e8f0;
            color: #334155;
            border: none;
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <!-- Top Toolbar for quick print in popup -->
        <div class="action-bar no-print">
          <div>
            <strong style="color: #0284c7; font-size: 13.5px;">📊 XEM TRƯỚC BẢNG MA TRẬN CỘT SKU (SƠ ĐỒ SẮP XẾP KHO)</strong>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Định dạng chuẩn A4 ${orientation === 'landscape' ? 'Ngang (Landscape)' : 'Dọc (Portrait)'}. Nhấn nút "In Ngay" hoặc phím tắt <b>Ctrl + P</b>.
            </div>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn-print" onclick="window.print()">🖨️ In Ngay (Print)</button>
            <button class="btn-close" onclick="window.close()">Đóng</button>
          </div>
        </div>

        <!-- Document Header -->
        <div style="border-bottom: 2px solid #0284c7; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 10.5px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.5px;">
              HỆ THỐNG KHO VẬN YUNWMS &bull; ${escapeHtml(warehouse)} &bull; SƠ ĐỒ KHO VÀ ĐẦU KỆ
            </div>
            <h1 style="margin: 2px 0 3px 0; font-size: 16px; font-weight: 900; color: #0f172a; text-transform: uppercase;">
              ${titleText}
            </h1>
            <div style="font-size: 11px; color: #475569;">
              📌 <b>Hướng dẫn sắp xếp hàng:</b> Các nhóm xếp từ trái qua phải. Trên kệ, xếp mã hàng theo thứ tự từ trên xuống dưới danh sách.
            </div>
          </div>

          <div style="text-align: right; font-size: 11px; color: #64748b; line-height: 1.4;">
            <div>Số nhóm: <strong style="color: #0f172a;">${matrixColumns.length}</strong> | Tổng SKU: <strong style="color: #0f172a;">${totalSkus}</strong></div>
            <div>Tồn khả dụng: <strong style="color: #047857;">${totalInUsed.toLocaleString('vi-VN')} PCS</strong> &bull; In lúc: ${printTime}</div>
          </div>
        </div>

        <!-- Multi-Column Matrix Table -->
        <div style="width: 100%; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0284c7; table-layout: fixed;">
            <thead>
              <tr>
                ${matrixColumns.map(col => `
                  <th style="background-color: #0284c7; color: #ffffff; border: 1px solid #0369a1; padding: 6px 4px; font-size: ${fontSizeConfig.header}; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 0.3px;">
                    <div style="font-size: 12.5px;">${escapeHtml(col.title)}</div>
                    ${col.subTitle ? `<div style="font-size: 9.5px; font-weight: normal; opacity: 0.9; margin-top: 1px;">(${col.subTitle})</div>` : ''}
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #0284c7;">
                ${matrixColumns.map(col => `
                  <td style="border: 1px solid #cbd5e1; padding: 4px; font-size: 10px; color: #475569; text-align: center;">
                    ${col.items.length} SKU
                  </td>
                `).join('')}
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Footer Notes -->
        <div style="margin-top: 14px; font-size: 10px; color: #64748b; display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
          <div>
            <b>Lưu ý thủ kho:</b> Dán bảng này tại đầu kệ hoặc bảng tin kho để nhân viên nhặt hàng và xếp hàng kiểm soát vị trí chính xác.
          </div>
          <div>
            YunWMS Inventory Matrix &bull; In lúc: ${printTime}
          </div>
        </div>
      </body>
    </html>
  `;
}


function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function openInventoryPrintWindow(
  data: InventoryQueryResult,
  options: InventoryPrintOptions
): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đang chặn cửa sổ pop-up. Vui lòng cấp quyền mở pop-up để xem bản in.');
    return false;
  }

  const html = generateInventoryPrintHtml(data, options);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Tự động focus để người dùng có thể nhấn Ctrl + P hoặc click In ngay
  try {
    printWindow.focus();
  } catch (e) {
    // Ignore
  }
  return true;
}
