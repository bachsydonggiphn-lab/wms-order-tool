import { BatchSearchResultsData } from '../types';

/**
 * Mở cửa sổ in phiếu tổng hợp lấy hàng (Picking Slip)
 */
export const printPickingSlipWindow = (searchResults: BatchSearchResultsData) => {
  if (!searchResults || searchResults.skuSummary.length === 0) return;

  const printWin = window.open('', '_blank');
  if (!printWin) {
    alert('Trình duyệt đã chặn popup in. Vui lòng cho phép popup để in phiếu.');
    return;
  }

  const rowsHtml = searchResults.skuSummary
    .map(
      (item, idx) => `
      <tr>
        <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold; font-size: 14px;">${item.sku}</td>
        <td>${item.group || '-'}</td>
        <td style="text-align: center; font-weight: 900; font-size: 16px; color: #1e3a8a;">${item.totalQty}</td>
        <td style="text-align: center; font-weight: bold;">${item.orderCount} đơn</td>
        <td style="text-align: center; border: 1px dashed #94a3b8;">[ &nbsp; ]</td>
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Phiếu Tổng Hợp Lấy Hàng (Picking List)</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 24px; color: #111; }
          h2 { text-align: center; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
          .meta { text-align: center; font-size: 12px; color: #555; margin-bottom: 20px; }
          .summary-box { display: flex; justify-content: space-around; background: #f1f5f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #334155; padding: 8px 10px; font-size: 13px; }
          th { background-color: #e2e8f0; text-align: left; font-size: 12px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h2>PHIẾU TỔNG HỢP LẤY HÀNG ĐÓNG GÓI</h2>
        <div class="meta">
          ${searchResults.currentPickingList ? `Picking List: <b>${searchResults.currentPickingList}</b> | ` : ''}
          Thời gian in: ${new Date().toLocaleString('vi-VN')} | Tổng hợp: ${searchResults.totalFound} đơn hàng
        </div>
        
        <div class="summary-box">
          <div>Tổng số đơn: <b>${searchResults.totalFound}</b></div>
          <div>Tổng số mã SKU: <b>${searchResults.skuSummary.length}</b></div>
          <div>Tổng số lượng sản phẩm: <b>${searchResults.totalPcs} PCS</b></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">STT</th>
              <th>MÃ SKU</th>
              <th>NHÓM SẢN PHẨM</th>
              <th style="width: 90px; text-align: center;">SỐ LƯỢNG</th>
              <th style="width: 70px; text-align: center;">SỐ ĐƠN</th>
              <th style="width: 50px; text-align: center;">ĐÃ LẤY</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWin.document.open();
  printWin.document.write(htmlContent);
  printWin.document.close();
};
