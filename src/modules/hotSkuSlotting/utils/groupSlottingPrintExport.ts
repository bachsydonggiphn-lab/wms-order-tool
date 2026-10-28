import * as XLSX from 'xlsx';
import { GroupSlottingMetricItem } from '../components/GroupSlottingSection';

export const exportGroupSlottingToExcel = (
  groupSlottingMetrics: GroupSlottingMetricItem[],
  selectedSlottingGroup: string,
  onlyCurrentGroup = false
) => {
  if (!groupSlottingMetrics || groupSlottingMetrics.length === 0) {
    alert('Chưa có dữ liệu phân tích nhóm hàng để xuất Excel');
    return;
  }

  const groupsToExport =
    onlyCurrentGroup && selectedSlottingGroup !== 'ALL'
      ? groupSlottingMetrics.filter((g) => g.groupName === selectedSlottingGroup)
      : groupSlottingMetrics;

  const wb = XLSX.utils.book_new();

  // Sheet 1: Tổng Hợp Dãy Kệ Bố Trí Theo Nhóm
  const summaryRows = groupsToExport.map((g, idx) => ({
    'Thứ Tự Ưu Tiên (Xếp Bán Nhanh -> Chậm)': idx + 1,
    'Nhóm Hàng Hóa': g.groupName,
    'Dãy Kệ Quy Hoạch Đề Xuất': g.optimalAisleRecommendation.aisleCode,
    'Phân Vùng Ưu Tiên (Zone)': g.optimalAisleRecommendation.zoneTag,
    'Cự Ly Tới Bàn Đóng Gói': g.optimalAisleRecommendation.distanceLabel,
    'Khuyến Nghị Phân Tầng Kệ': g.optimalAisleRecommendation.levelRecommendation,
    'Sản Lượng Bán (PCS)': g.totalSold,
    'Tỉ Trọng Bán Toàn Kho (%)': `${g.percentageOfWarehouseSold}%`,
    'Tổng Số Mã SKU': g.skuCount,
    'Số Mã Hạng A (Hot - Nhặt Tức Thì)': g.classACount,
    'Số Mã Hạng B (Bán Đều)': g.classBCount,
    'Số Mã Hạng C (Bán Chậm)': g.classCCount,
    'Tồn Kho Hiện Tại (In-Used)': g.totalInUsed,
    'Hàng Đang Về (On-Way)': g.totalOnWay,
    'Lý Do Quy Hoạch': g.optimalAisleRecommendation.reason,
  }));
  const ws1 = XLSX.utils.json_to_sheet(summaryRows);
  ws1['!cols'] = [
    { wch: 22 },
    { wch: 18 },
    { wch: 35 },
    { wch: 18 },
    { wch: 25 },
    { wch: 42 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 55 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Tong_Hop_Nhanh_Den_Cham');

  // Sheet 2: Chi Tiết Phân Bổ Từng SKU Trong Nhóm
  const skuRows: any[] = [];
  let skuCounter = 1;
  groupsToExport.forEach((g, gIdx) => {
    g.items.forEach((it) => {
      skuRows.push({
        STT: skuCounter++,
        'Thứ Hạng Nhóm (#1 Nhanh Nhất)': gIdx + 1,
        'Nhóm Hàng': g.groupName,
        'Dãy Kệ Nhóm': g.optimalAisleRecommendation.aisleCode,
        'Phân Vùng Zone': g.optimalAisleRecommendation.zoneTag,
        'Hạng ABC': it.abcRank,
        'Mã SKU': it.sku,
        'Tên Sản Phẩm': it.productTitle || '-',
        'Vị Trí Tầng Khuyến Nghị':
          it.abcRank === 'A'
            ? '⭐ Tầng 1 - 2 (Ngang tầm ngực/thắt lưng - nhặt tức thì)'
            : it.abcRank === 'B'
            ? 'Tầng 3 (Tầm mắt - với chuẩn)'
            : 'Tầng 4 - 5 (Tầng cao nóc kệ / sát sàn)',
        'Sản Lượng Bán (PCS)': it.totalSold,
        'Số Đơn Hàng (Pick Hits)': it.orderCount,
        'Vận Tốc Bán (PCS/ngày)': it.velocityDaily,
        'Tồn Khả Dụng (In Used)': it.inUsed || 0,
        'Đang Về (On Way)': it.onWay || 0,
        'Số Ngày Đủ Bán (DOS)': it.daysOfStock === 999 ? 'Dồi dào' : (it.daysOfStock ?? '-'),
        'Độ Phủ Hàng Về':
          it.daysOfSupplyIncoming !== null && it.daysOfSupplyIncoming !== undefined
            ? `${it.daysOfSupplyIncoming} ngày`
            : 'N/A',
      });
    });
  });
  const ws2 = XLSX.utils.json_to_sheet(skuRows);
  ws2['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 16 },
    { wch: 32 },
    { wch: 14 },
    { wch: 12 },
    { wch: 22 },
    { wch: 38 },
    { wch: 45 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Chi_Tiet_SKU_Theo_Nhom');

  const fileName =
    onlyCurrentGroup && selectedSlottingGroup !== 'ALL'
      ? `Bao_Cao_Nhom_${selectedSlottingGroup}_Nhanh_Den_Cham_VN02_${new Date().toISOString().slice(0, 10)}.xlsx`
      : `Bao_Cao_Nhom_Ban_Nhanh_Den_Cham_VN02_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const printGroupSlottingReport = (
  groupSlottingMetrics: GroupSlottingMetricItem[],
  selectedSlottingGroup: string,
  onlyCurrentGroup = false
) => {
  if (!groupSlottingMetrics || groupSlottingMetrics.length === 0) {
    alert('Chưa có dữ liệu phân tích nhóm hàng để in');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đang chặn cửa sổ pop-up. Vui lòng cho phép pop-up để mở bản in.');
    return;
  }

  const groupsToPrint =
    onlyCurrentGroup && selectedSlottingGroup !== 'ALL'
      ? groupSlottingMetrics.filter((g) => g.groupName === selectedSlottingGroup)
      : groupSlottingMetrics;

  const printDate = new Date().toLocaleString('vi-VN');

  const summaryRowsHtml = groupsToPrint
    .map((g, idx) => {
      const isZoneA = g.optimalAisleRecommendation.zoneTag === 'ZONE_A';
      const isZoneB = g.optimalAisleRecommendation.zoneTag === 'ZONE_B';
      const zoneBg = isZoneA ? '#fef3c7' : isZoneB ? '#e0f2fe' : '#f1f5f9';
      const zoneColor = isZoneA ? '#92400e' : isZoneB ? '#075985' : '#475569';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; text-align: center; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">${g.groupName}</td>
          <td style="padding: 6px 8px;"><b>${g.optimalAisleRecommendation.aisleCode.split('(')[0].trim()}</b></td>
          <td style="padding: 6px 8px; text-align: center;">
            <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; background: ${zoneBg}; color: ${zoneColor}; font-weight: bold; font-size: 10px;">
              ${g.optimalAisleRecommendation.zoneTag}
            </span>
          </td>
          <td style="padding: 6px 8px; text-align: center;">${g.optimalAisleRecommendation.distanceLabel}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold;">${g.totalSold.toLocaleString()}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: bold; color: #4338ca;">${g.percentageOfWarehouseSold}%</td>
          <td style="padding: 6px 8px; text-align: center;"><b>${g.skuCount}</b> mã (A: ${g.classACount} | B: ${g.classBCount} | C: ${g.classCCount})</td>
          <td style="padding: 6px 8px; font-size: 10px; color: #334155;">${g.optimalAisleRecommendation.levelRecommendation}</td>
        </tr>
      `;
    })
    .join('');

  const groupDetailsHtml = groupsToPrint
    .map((g, idx) => {
      const isZoneA = g.optimalAisleRecommendation.zoneTag === 'ZONE_A';
      const isZoneB = g.optimalAisleRecommendation.zoneTag === 'ZONE_B';
      const headerBg = isZoneA ? '#b45309' : isZoneB ? '#1d4ed8' : '#334155';

      const skuRowsHtml = g.items
        .map((it, sIdx) => {
          const isClassA = it.abcRank === 'A';
          const isClassB = it.abcRank === 'B';
          const rankBg = isClassA ? '#fee2e2' : isClassB ? '#dbeafe' : '#f1f5f9';
          const rankColor = isClassA ? '#991b1b' : isClassB ? '#1e40af' : '#475569';
          const tierText = isClassA
            ? '⭐ Tầng 1 - 2 (Ngang tầm ngực/thắt lưng - nhặt tức thì)'
            : isClassB
            ? 'Tầng 3 (Tầm mắt - với chuẩn)'
            : 'Tầng 4 - 5 (Tầng cao nóc kệ / sát sàn)';

          return `
          <tr style="border-bottom: 1px solid #f1f5f9; font-size: 11px;">
            <td style="padding: 5px 6px; text-align: center; color: #64748b;">${sIdx + 1}</td>
            <td style="padding: 5px 6px; font-family: monospace; font-weight: bold; color: #0f172a;">${it.sku}</td>
            <td style="padding: 5px 6px; color: #334155;">${it.productTitle || '-'}</td>
            <td style="padding: 5px 6px; text-align: center;">
              <span style="display:inline-block; padding: 1px 5px; border-radius: 4px; background: ${rankBg}; color: ${rankColor}; font-weight: bold; font-size: 10px;">
                Hạng ${it.abcRank}
              </span>
            </td>
            <td style="padding: 5px 6px; font-size: 10.5px; font-weight: 500;">${tierText}</td>
            <td style="padding: 5px 6px; text-align: right; font-weight: bold;">${it.totalSold.toLocaleString()}</td>
            <td style="padding: 5px 6px; text-align: right;">${it.velocityDaily}</td>
            <td style="padding: 5px 6px; text-align: right; font-weight: bold;">${(it.inUsed || 0).toLocaleString()}</td>
            <td style="padding: 5px 6px; text-align: right; color: #059669; font-weight: bold;">${(it.onWay || 0).toLocaleString()}</td>
            <td style="padding: 5px 6px; text-align: center;">${it.daysOfStock === 999 ? 'Dồi dào' : (it.daysOfStock ?? '-')}</td>
          </tr>
        `;
        })
        .join('');

      return `
        <div style="margin-top: 20px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
          <div style="background-color: ${headerBg}; color: #ffffff; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <span style="font-size: 14px; font-weight: bold;">#${idx + 1}. NHÓM: ${g.groupName}</span>
              <span style="font-size: 12px; opacity: 0.9; margin-left: 8px;">[${g.optimalAisleRecommendation.aisleCode}]</span>
            </div>
            <div style="font-size: 12px; font-weight: 600;">
              Sản lượng: <b>${g.totalSold.toLocaleString()} PCS</b> (${g.percentageOfWarehouseSold}% kho) &bull; ${g.skuCount} mã SKU &bull; ${g.optimalAisleRecommendation.zoneTag} (${g.optimalAisleRecommendation.distanceLabel})
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 6px 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
            <div><b>Quy tắc tầng kệ:</b> <span style="color:#b45309;">Tầng 1-2: ${g.classACount} mã Hạng A (Hot)</span> &bull; <span style="color:#1d4ed8;">Tầng 3: ${g.classBCount} mã Hạng B (Đều)</span> &bull; <span style="color:#475569;">Tầng 4-5: ${g.classCCount} mã Hạng C (Lưu trữ)</span></div>
            <div>Tồn kho khả dụng: <b>${g.totalInUsed.toLocaleString()}</b> &bull; Đang về: <b style="color:#059669;">${g.totalOnWay.toLocaleString()}</b></div>
          </div>

          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #f1f5f9; font-size: 10.5px; font-weight: bold; color: #475569; border-bottom: 1px solid #cbd5e1;">
                <th style="padding: 5px 6px; width: 30px; text-align: center;">STT</th>
                <th style="padding: 5px 6px; width: 100px;">Mã SKU</th>
                <th style="padding: 5px 6px;">Tên Sản Phẩm</th>
                <th style="padding: 5px 6px; width: 65px; text-align: center;">Hạng ABC</th>
                <th style="padding: 5px 6px; width: 220px;">Vị Trí Tầng Khuyến Nghị</th>
                <th style="padding: 5px 6px; width: 75px; text-align: right;">Bán (PCS)</th>
                <th style="padding: 5px 6px; width: 65px; text-align: right;">Vận Tốc</th>
                <th style="padding: 5px 6px; width: 65px; text-align: right;">Tồn Khả Dụng</th>
                <th style="padding: 5px 6px; width: 65px; text-align: right;">Đang Về</th>
                <th style="padding: 5px 6px; width: 60px; text-align: center;">DOS (Ngày)</th>
              </tr>
            </thead>
            <tbody>
              ${skuRowsHtml}
            </tbody>
          </table>
        </div>
      `;
    })
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Bảng Quy Hoạch Bố Trí Kho Theo Nhóm Hàng (Xếp Từ Bán Nhanh Đến Bán Chậm)</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 12px;
            background-color: #fff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 14px;
          }
          .title-area h1 {
            font-size: 18px;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .title-area p {
            margin: 0;
            font-size: 11px;
            color: #475569;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #334155;
          }
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .summary-table th, .summary-table td {
            border: 1px solid #cbd5e1;
          }
          .section-title {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            background-color: #0f172a;
            color: #fff;
            padding: 6px 10px;
            border-radius: 4px;
            margin: 15px 0 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div class="title-area">
            <h1>Kế Hoạch Bố Trí Kho Theo Nhóm Hàng (Category & Family Slotting)</h1>
            <p>Kho VN02 • Danh Sách Xếp Thứ Tự Từ Nhóm Bán Nhanh Nhất Đến Chậm Nhất • Quy Hoạch Dãy Kệ & Phân Bổ Tầng Kệ 1-5</p>
          </div>
          <div class="meta-box">
            <div>Thời gian in: <b>${printDate}</b></div>
            <div>Tổng nhóm: <b>${groupsToPrint.length} nhóm</b> &bull; Đơn vị: PCS</div>
          </div>
        </div>

        <div class="section-title">PHẦN 1: BẢNG TỔNG HỢP PHÂN BỔ DÃY KỆ (XẾP THỨ TỰ BÁN NHANH &rarr; CHẬM)</div>
        <table class="summary-table">
          <thead>
            <tr style="background-color: #f1f5f9; font-size: 11px; font-weight: bold; color: #334155;">
              <th style="padding: 6px 8px; width: 35px; text-align: center;">STT</th>
              <th style="padding: 6px 8px;">Tên Nhóm Hàng Hóa</th>
              <th style="padding: 6px 8px; width: 140px;">Dãy Kệ Quy Hoạch</th>
              <th style="padding: 6px 8px; width: 75px; text-align: center;">Zone</th>
              <th style="padding: 6px 8px; width: 130px; text-align: center;">Cự Ly Tới Đóng Gói</th>
              <th style="padding: 6px 8px; width: 85px; text-align: right;">Sản Lượng</th>
              <th style="padding: 6px 8px; width: 75px; text-align: right;">Tỉ Trọng</th>
              <th style="padding: 6px 8px; width: 170px; text-align: center;">Cấu Trúc SKU</th>
              <th style="padding: 6px 8px;">Quy Tắc Bố Trí Tầng Kệ</th>
            </tr>
          </thead>
          <tbody>
            ${summaryRowsHtml}
          </tbody>
        </table>

        <div class="section-title">PHẦN 2: CHI TIẾT DANH MỤC SKU VÀ TẦNG KỆ CỦA TỪNG NHÓM HÀNG</div>
        ${groupDetailsHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
};
