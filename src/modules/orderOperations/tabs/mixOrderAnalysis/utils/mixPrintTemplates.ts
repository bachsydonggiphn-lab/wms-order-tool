import { SkuInMixSummary, MixOrderByGroupResult, MixOrderAnalysisResult } from '../../../../../types';

export const formatCompactOrderList = (orderNos: string[]): string => {
  if (orderNos.length === 0) return '-';
  if (orderNos.length === 1) return orderNos[0];

  const first = orderNos[0];
  const lastDashIdx = first.lastIndexOf('-');
  if (lastDashIdx > 0) {
    const prefix = first.substring(0, lastDashIdx + 1);
    const allSharePrefix = orderNos.every((o) => o.startsWith(prefix));
    if (allSharePrefix) {
      const suffixes = orderNos.map((o) => o.substring(prefix.length));
      return `${prefix}${suffixes.join(', ')}`;
    }
  }

  return orderNos.join(', ');
};

export const handlePrintByGroupTable = (
  mixByGroup: MixOrderByGroupResult,
  selectedPickingList: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đang chặn popup. Vui lòng cho phép popup để in.');
    return;
  }

  const pureSectionsHtml = mixByGroup.pureGroupList
    .map(
      (group, idx) => `
      <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
        <div style="background-color: #047857; color: #fff; padding: 7px 12px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 13px; font-weight: bold;">
            🎯 #${idx + 1}. NHÓM SẢN PHẨM: ${group.groupName} &mdash; ${group.orderCount} Đơn MIX Thuần Nhóm (${group.totalPcs} PCS)
          </div>
          <div style="font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">
            Lấy tại 1 kệ duy nhất
          </div>
        </div>
        <div style="padding: 8px 12px; background-color: #f8fafc; font-size: 11px; border-bottom: 1px solid #e2e8f0;">
          <b>Mã SKU cần lấy:</b> ${group.skuBreakdown.map((s) => `<b>${s.sku}</b>: ${s.qty} PCS`).join(' | ')}
        </div>
        <div style="padding: 8px 12px; font-family: monospace; font-size: 10px; color: #334155; word-break: break-all;">
          <b>Danh sách mã đơn:</b> ${group.orderNos.join(', ')}
        </div>
      </div>
    `
    )
    .join('');

  const crossSectionsHtml = mixByGroup.crossGroupPairs
    .map(
      (pair, idx) => `
      <div style="margin-bottom: 16px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
        <div style="background-color: #4338ca; color: #fff; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 12.5px; font-weight: bold;">
            🔀 #${idx + 1}. CẶP NHÓM: ${pair.groupComboKey} &mdash; ${pair.orderCount} Đơn (${pair.totalPcs} PCS)
          </div>
          <div style="font-size: 10.5px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">
            Đơn chéo nhóm
          </div>
        </div>
        <div style="padding: 6px 12px; background-color: #f8fafc; font-size: 10.5px; border-bottom: 1px solid #e2e8f0;">
          <b>Các mã SKU:</b> ${pair.skuList.join(', ')}
        </div>
        <div style="padding: 6px 12px; font-family: monospace; font-size: 9.5px; color: #334155; word-break: break-all;">
          <b>Danh sách mã đơn:</b> ${pair.orderNos.join(', ')}
        </div>
      </div>
    `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bảng Bóc Tách Đơn MIX Theo Nhóm Hàng</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 15px; color: #111; font-size: 12px; }
          h1 { font-size: 16px; margin: 0 0 4px 0; color: #1e3a8a; }
          h2 { font-size: 14px; margin: 16px 0 8px 0; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 4px; }
          .header-info { margin-bottom: 14px; font-size: 11px; color: #64748b; }
          @media print {
            button { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <div>
            <h1>BẢNG BÓC TÁCH ĐƠN HÀNG MIX THEO NHÓM SẢN PHẨM</h1>
            <div class="header-info">Picking List: <b>${selectedPickingList || 'TẤT CẢ'}</b> | <b>${mixByGroup.totalPureOrders} đơn MIX cùng nhóm</b> (${mixByGroup.totalPurePcs} PCS) | <b>${mixByGroup.totalCrossOrders} đơn MIX chéo nhóm</b> (${mixByGroup.totalCrossPcs} PCS) | In lúc: ${new Date().toLocaleString('vi-VN')}</div>
          </div>
          <button onclick="window.print()" style="padding: 6px 14px; background-color: #047857; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In Bảng Này</button>
        </div>

        <h2>PHẦN 1: CÁC ĐƠN MIX THUẦN CÙNG 1 NHÓM HÀNG (${mixByGroup.totalPureOrders} ĐƠN - LẤY TẠI 1 KỆ)</h2>
        ${pureSectionsHtml || '<p style="color:#64748b; font-style:italic;">Không có đơn MIX thuần cùng nhóm</p>'}

        <h2>PHẦN 2: CÁC ĐƠN MIX CHÉO NHIỀU NHÓM HÀNG (${mixByGroup.totalCrossOrders} ĐƠN)</h2>
        ${crossSectionsHtml || '<p style="color:#64748b; font-style:italic;">Không có đơn MIX chéo nhóm</p>'}
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const handlePrintByAreaTable = (
  skusGroupedByArea: Array<{
    area: string;
    skus: SkuInMixSummary[];
    totalAreaQty: number;
    distinctOrdersCount: number;
    distinctOrderNos: string[];
  }>,
  selectedPickingList: string,
  mixAnalysis: MixOrderAnalysisResult
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đang chặn popup. Vui lòng cho phép popup để in.');
    return;
  }

  const sectionsHtml = skusGroupedByArea
    .map(
      (group) => `
      <div style="margin-bottom: 24px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1e3a8a; color: #fff; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 14px; font-weight: bold;">
            📍 KHU VỰC KỆ: ${group.area} &mdash; Tổng cộng: ${group.totalAreaQty} PCS (${group.skus.length} mã SKU, phục vụ ${group.distinctOrdersCount} đơn MIX)
          </div>
          <div style="font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">
            Nhặt 1 lượt tại khu này
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc; font-size: 11px; text-align: left;">
              <th style="width: 35px; text-align: center; padding: 6px; border-bottom: 1px solid #cbd5e1;">STT</th>
              <th style="width: 150px; padding: 6px; border-bottom: 1px solid #cbd5e1;">Mã SKU</th>
              <th style="width: 90px; text-align: center; padding: 6px; border-bottom: 1px solid #cbd5e1;">SL Cần Lấy</th>
              <th style="width: 90px; text-align: center; padding: 6px; border-bottom: 1px solid #cbd5e1;">Số Đơn Trùng</th>
              <th style="width: 180px; padding: 6px; border-bottom: 1px solid #cbd5e1;">SKU Mua Kèm</th>
              <th style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Mã Đơn Cần Cấp Hàng</th>
            </tr>
          </thead>
          <tbody>
            ${group.skus
              .map(
                (item, idx) => `
              <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                <td style="text-align: center; padding: 6px; font-weight: bold;">${idx + 1}</td>
                <td style="padding: 6px; font-family: monospace; font-weight: bold; font-size: 12px; color: #0f172a;">${item.sku}</td>
                <td style="text-align: center; padding: 6px; font-weight: bold; color: #dc2626; font-size: 13px;">${item.totalQty} PCS</td>
                <td style="text-align: center; padding: 6px; font-weight: bold; color: #2563eb;">${item.orderCount} đơn</td>
                <td style="padding: 6px; color: #475569; font-size: 10px;">
                  ${item.coOccurringSkus.slice(0, 3).map((c) => `${c.sku} (${c.totalQty})`).join(', ') || '-'}
                </td>
                <td style="padding: 6px; font-family: monospace; font-size: 9.5px; color: #334155; word-break: break-all;">
                  ${item.orders.map((o) => o.orderNo).join(', ')}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bảng Lấy Hàng Đơn MIX Gom Theo Từng Khu Vực Kệ</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 15px; color: #111; font-size: 12px; }
          h1 { font-size: 16px; margin: 0 0 4px 0; color: #1e3a8a; }
          .header-info { margin-bottom: 14px; font-size: 11px; color: #64748b; }
          @media print {
            button { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
          <div>
            <h1>BẢNG TỔNG HỢP NHẶT HÀNG ĐƠN MIX THEO TỪNG KHU VỰC KỆ (LẤY 1 LẦN)</h1>
            <div class="header-info">Picking List: <b>${selectedPickingList || 'TẤT CẢ'}</b> | Gom theo <b>${skusGroupedByArea.length} khu vực kệ</b> | Tổng cộng <b>${mixAnalysis.totalMixOrders} đơn MIX</b> (${mixAnalysis.totalMixPcs} PCS) | In lúc: ${new Date().toLocaleString('vi-VN')}</div>
          </div>
          <button onclick="window.print()" style="padding: 6px 14px; background-color: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In Bảng Theo Khu Vực</button>
        </div>

        ${sectionsHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const handlePrintFullMixTable = (
  filteredSkus: SkuInMixSummary[],
  selectedPickingList: string,
  mixAnalysis: MixOrderAnalysisResult
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đang chặn popup. Vui lòng cho phép popup để in.');
    return;
  }

  const rowsHtml = filteredSkus
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; font-size: 13px;">${item.sku}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${item.area}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #dc2626; font-size: 14px;">${item.totalQty} PCS</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #2563eb;">${item.orderCount} đơn</td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; font-size: 11px; color: #475569;">
          ${item.coOccurringSkus.slice(0, 4).map((c) => `${c.sku} (${c.totalQty})`).join(', ') || '-'}
        </td>
        <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10px; color: #334155; word-break: break-all;">
          ${item.orders.map((o) => o.orderNo).join(', ')}
        </td>
      </tr>
    `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bảng Tổng Hợp SKU Trùng Nhặt Hàng Đơn MIX</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 15px; color: #111; font-size: 12px; }
          h1 { font-size: 16px; margin: 0 0 4px 0; color: #1e3a8a; }
          .header-info { margin-bottom: 12px; font-size: 11px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background-color: #f1f5f9; padding: 8px 6px; border: 1px solid #cbd5e1; text-align: left; font-size: 11px; font-weight: bold; }
          @media print {
            button { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
          <div>
            <h1>BẢNG TỔNG HỢP SKU TRÙNG NHAU TRONG ĐƠN HÀNG MIX (LẤY 1 LẦN)</h1>
            <div class="header-info">Picking List: <b>${selectedPickingList || 'TẤT CẢ'}</b> | Tổng cộng: <b>${mixAnalysis.totalMixOrders} đơn MIX</b> (${mixAnalysis.totalMixPcs} PCS) | Ngày in: ${new Date().toLocaleString('vi-VN')}</div>
          </div>
          <button onclick="window.print()" style="padding: 6px 14px; background-color: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In Bảng Này</button>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">STT</th>
              <th style="width: 140px;">Mã SKU</th>
              <th style="width: 70px; text-align: center;">Khu Vực</th>
              <th style="width: 85px; text-align: center;">Tổng PCS Cần Lấy</th>
              <th style="width: 80px; text-align: center;">Số Đơn Trùng</th>
              <th style="width: 180px;">SKU Thường Mua Kèm</th>
              <th>Danh Sách Mã Đơn Cần Giao SKU Này</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export const handlePrintMixCluster = (
  summary: SkuInMixSummary,
  selectedPickingList: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để in.');
    return;
  }

  const orderRowsHtml = summary.orders
    .map(
      (order, idx) => `
      <tr>
        <td style="text-align:center; padding: 6px; border: 1px solid #ddd;">${idx + 1}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; font-family: monospace;">${order.orderNo}</td>
        <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${order.trackingNo || '-'}</td>
        <td style="text-align:center; padding: 6px; border: 1px solid #ddd; font-weight: bold;">${order.totalQty} PCS</td>
        <td style="padding: 6px; border: 1px solid #ddd;">
          ${order.items
            .map((it) => {
              const isPrimary = it.sku === summary.sku;
              return `<span style="display:inline-block; margin-right: 8px; padding: 2px 6px; border-radius: 4px; ${
                isPrimary
                  ? 'background-color: #fee2e2; color: #991b1b; font-weight: bold; border: 1px solid #f87171;'
                  : 'background-color: #f3f4f6; color: #374151;'
              }">${it.sku} &times; <b>${it.qty}</b></span>`;
            })
            .join(' ')}
        </td>
      </tr>
    `
    )
    .join('');

  const coSkusHtml = summary.coOccurringSkus
    .map(
      (co) => `
      <div style="display:inline-block; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; margin: 4px; background-color: #f8fafc;">
        <div style="font-weight: bold; color: #1e293b; font-size: 13px;">${co.sku}</div>
        <div style="font-size: 11px; color: #64748b;">Khu vực: <b>${co.area}</b> | Cần lấy: <b style="color:#d97706;">${co.totalQty} PCS</b> (${co.orderCount} đơn)</div>
      </div>
    `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Phiếu Nhặt Hàng Gom Đơn MIX - SKU ${summary.sku}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
          h1 { font-size: 18px; margin: 0 0 6px 0; }
          .header-box { border: 2px solid #2563eb; background-color: #eff6ff; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
          .directive-box { border: 2px dashed #dc2626; background-color: #fef2f2; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
          @media print {
            button { display: none; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
          <div>
            <h1>PHIẾU GOM NHẶT ĐƠN MIX THEO SKU TRÙNG LẶP (1-TRIP PICKING)</h1>
            <div style="font-size: 12px; color: #666;">Ngày in: ${new Date().toLocaleString('vi-VN')} | Picking List: ${selectedPickingList || 'TẤT CẢ'}</div>
          </div>
          <button onclick="window.print()" style="padding: 8px 16px; background-color: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In Phiếu Này</button>
        </div>

        <div class="directive-box">
          <div style="font-size: 14px; font-weight: bold; color: #991b1b; margin-bottom: 4px;">
            🚀 HƯỚNG DẪN LẤY HÀNG 1 LẦN:
          </div>
          <div style="font-size: 15px; color: #1e293b;">
            1. Đến khu vực <b>[${summary.area}]</b> lấy 1 lần duy nhất <b style="color: #dc2626; font-size: 18px;">${summary.totalQty} PCS</b> mã <b>${summary.sku}</b>.
          </div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">
            2. Mã này trùng lặp trong <b>${summary.orderCount} đơn hàng MIX khác nhau</b>.
          </div>
        </div>

        <div class="header-box">
          <div style="font-weight: bold; color: #1e40af; margin-bottom: 6px; font-size: 13px;">
            📦 CÁC SKU PHỤ CẦN NHẶT KÈM ĐỂ ĐÓNG GÓI ${summary.orderCount} ĐƠN TRÊN:
          </div>
          <div>
            ${coSkusHtml || '<span style="font-size: 12px; color: #64748b;">Không có SKU phụ nào</span>'}
          </div>
        </div>

        <div style="font-weight: bold; margin-top: 16px; margin-bottom: 6px; font-size: 14px;">
          📋 DANH SÁCH ${summary.orderCount} ĐƠN HÀNG CẦN ĐÓNG GÓI:
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">STT</th>
              <th style="width: 140px;">Mã Đơn (Order No)</th>
              <th style="width: 140px;">Mã Vận Đơn (Tracking No)</th>
              <th style="width: 80px; text-align: center;">Tổng PCS</th>
              <th>Chi tiết các món trong kiện (SKU & SL)</th>
            </tr>
          </thead>
          <tbody>
            ${orderRowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
};
