import { WmsInventoryItem } from '../types';

export interface SkuLabelPrintOptions {
  paperSize: '30x50' | '50x30' | '40x30' | '50x50' | '75x50' | '100x150';
  copies: number;
  showTitle?: boolean;
  showGroup?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}

export const PAPER_SIZE_CONFIGS: Record<
  SkuLabelPrintOptions['paperSize'],
  { label: string; widthMm: number; heightMm: number; orientation: 'portrait' | 'landscape' }
> = {
  '30x50': { label: '30 × 50 mm (Khổ Dọc - Xprinter Chuẩn)', widthMm: 30, heightMm: 50, orientation: 'portrait' },
  '50x30': { label: '50 × 30 mm (Khổ Ngang)', widthMm: 50, heightMm: 30, orientation: 'landscape' },
  '40x30': { label: '40 × 30 mm (Tem Nhỏ)', widthMm: 40, heightMm: 30, orientation: 'landscape' },
  '50x50': { label: '50 × 50 mm (Khổ Vuông)', widthMm: 50, heightMm: 50, orientation: 'portrait' },
  '75x50': { label: '75 × 50 mm (Tem Trung)', widthMm: 75, heightMm: 50, orientation: 'landscape' },
  '100x150': { label: '100 × 150 mm (Khổ A6)', widthMm: 100, heightMm: 150, orientation: 'portrait' },
};

export function generateSkuLabelHtml(
  item: { sku: string; title?: string; group?: string },
  qrSvg: string,
  options: SkuLabelPrintOptions
): string {
  const cfg = PAPER_SIZE_CONFIGS[options.paperSize] || PAPER_SIZE_CONFIGS['30x50'];
  const copies = Math.max(1, options.copies || 1);

  // Tạo nội dung tem nhãn
  const singleLabelHtml = `
    <div class="label-page">
      <div class="label-content">
        <div class="qr-container">
          ${qrSvg}
        </div>
        <div class="sku-text">${escapeHtml(item.sku)}</div>
        ${
          options.showGroup && item.group
            ? `<div class="group-text">${escapeHtml(item.group)}</div>`
            : ''
        }
        ${
          options.showTitle && item.title
            ? `<div class="title-text">${escapeHtml(item.title)}</div>`
            : ''
        }
      </div>
    </div>
  `;

  const allPagesHtml = Array(copies).fill(singleLabelHtml).join('\n');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>In Tem SKU - ${escapeHtml(item.sku)}</title>
  <style>
    @page {
      size: ${cfg.widthMm}mm ${cfg.heightMm}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background-color: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .label-page {
      width: ${cfg.widthMm}mm;
      height: ${cfg.heightMm}mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      break-after: page;
      padding: 1.5mm 1.5mm;
      overflow: hidden;
      margin: 0 auto;
    }

    .label-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .label-content {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      overflow: hidden;
    }

    .qr-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      flex: 1 1 auto;
      max-height: ${Math.round(cfg.heightMm * 0.72)}mm;
    }

    .qr-container svg {
      width: auto;
      height: 100%;
      max-width: 95%;
      max-height: 95%;
      display: block;
      shape-rendering: crispEdges;
    }

    .sku-text {
      font-size: ${cfg.heightMm >= 50 ? '15pt' : '11.5pt'};
      font-weight: 900;
      letter-spacing: 0.5px;
      line-height: 1.15;
      margin-top: 1mm;
      color: #000000;
      word-break: break-word;
      text-transform: uppercase;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    }

    .group-text {
      font-size: 7.5pt;
      font-weight: 700;
      color: #333333;
      margin-top: 0.5mm;
      line-height: 1.1;
      max-width: 95%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .title-text {
      font-size: 6.5pt;
      color: #444444;
      line-height: 1.1;
      margin-top: 0.5mm;
      max-height: 4.5mm;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }

    @media screen {
      body {
        background-color: #f1f5f9;
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
      }
      .label-page {
        background-color: #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        border: 1px dashed #cbd5e1;
        border-radius: 4px;
      }
      .screen-toolbar {
        position: sticky;
        top: 10px;
        z-index: 100;
        background: #1e293b;
        color: #ffffff;
        padding: 10px 18px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        font-size: 13px;
        font-weight: 600;
      }
      .screen-toolbar button {
        background: #10b981;
        color: #ffffff;
        border: none;
        padding: 6px 14px;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
      }
      .screen-toolbar button:hover {
        background: #059669;
      }
    }
  </style>
</head>
<body>
  <div class="screen-toolbar" id="toolbar">
    <span>🖨️ In Tem SKU: <strong>${escapeHtml(item.sku)}</strong> (${copies} tem - ${cfg.label})</span>
    <button onclick="window.print()">In Ngay (Print)</button>
    <button onclick="window.close()" style="background: #475569;">Đóng</button>
  </div>

  ${allPagesHtml}

  <script>
    // Tự động kích hoạt hộp thoại in của trình duyệt ngay khi trang tải xong
    window.addEventListener('load', function() {
      // Ẩn thanh công cụ khi in
      setTimeout(function() {
        window.print();
      }, 300);
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function openSkuLabelPrintWindow(
  item: { sku: string; title?: string; group?: string },
  qrSvg: string,
  options: SkuLabelPrintOptions
): boolean {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Trình duyệt đang chặn cửa sổ pop-up. Vui lòng cấp quyền mở pop-up để in tem nhãn.');
    return false;
  }

  const html = generateSkuLabelHtml(item, qrSvg, options);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  try {
    printWindow.focus();
  } catch (e) {
    // Ignore
  }
  return true;
}
