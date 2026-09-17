import { InventoryQueryResult, InventoryGroupSummary, WmsInventoryItem } from '../types';

export interface InventoryPrintOptions {
  scope: 'ALL' | 'SINGLE_GROUP' | 'SELECTED_GROUPS';
  selectedGroupName?: string;
  selectedGroupNames?: string[];
  includePhysicalCheckColumn?: boolean; // Cột ghi tay kiểm kê thực tế
  includeTransitColumns?: boolean; // Cột Đang về / Chờ xuất / Hàng lỗi
  fontSize?: 'compact' | 'normal' | 'large';
  warehouseName?: string;
  sortBy?: 'sku' | 'inUsed' | 'sellable';
}

export function generateInventoryPrintHtml(
  data: InventoryQueryResult,
  options: InventoryPrintOptions
): string {
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
