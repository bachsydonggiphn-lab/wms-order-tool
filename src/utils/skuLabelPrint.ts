export interface SkuLabelPrintOptions {
  paperSize?: '30x50' | '50x30' | '30x40' | '40x30' | '50x50' | '75x50' | '100x150';
  copies: number;
  showTitle?: boolean;
  showGroup?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
}

export const PAPER_SIZE_CONFIGS: Record<
  string,
  { label: string; widthMm: number; heightMm: number; orientation: 'portrait' | 'landscape' }
> = {
  '30x50': { label: '30 × 50 mm (Khổ Dọc / Ngang - Xprinter)', widthMm: 30, heightMm: 50, orientation: 'portrait' },
  '30x40': { label: '30 × 40 mm (Khổ Dọc)', widthMm: 30, heightMm: 40, orientation: 'portrait' },
  '40x30': { label: '40 × 30 mm (Tem Nhỏ - Ngang)', widthMm: 40, heightMm: 30, orientation: 'landscape' },
  '50x30': { label: '50 × 30 mm (Khổ Ngang)', widthMm: 50, heightMm: 30, orientation: 'landscape' },
  '50x50': { label: '50 × 50 mm (Khổ Vuông)', widthMm: 50, heightMm: 50, orientation: 'portrait' },
  '75x50': { label: '75 × 50 mm (Tem Trung)', widthMm: 75, heightMm: 50, orientation: 'landscape' },
  '100x150': { label: '100 × 150 mm (Khổ A6)', widthMm: 100, heightMm: 150, orientation: 'portrait' },
};

export function generateSkuLabelHtml(
  item: { sku: string; title?: string; group?: string },
  qrSvg: string,
  options: SkuLabelPrintOptions
): string {
  const copies = Math.max(1, options.copies || 1);

  // Tạo nội dung tem nhãn - KHÔNG CÓ BẤT KỲ TOOLBAR HAY TEXT THỪA NÀO
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
  <title>Tem SKU - ${escapeHtml(item.sku)}</title>
  <style>
    @page {
      size: auto;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: hidden;
    }

    .label-page {
      width: 100vw;
      height: 100vh;
      max-width: 100vw;
      max-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      padding: 2mm 2mm;
      overflow: hidden;
      margin: 0;
      background: #ffffff;
    }

    .label-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
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
      max-height: 74vh;
      overflow: hidden;
    }

    .qr-container svg {
      width: auto;
      height: 100%;
      max-width: 90vw;
      max-height: 100%;
      display: block;
      shape-rendering: crispEdges;
    }

    .sku-text {
      font-size: clamp(14px, 5.2vw, 22px);
      font-weight: 900;
      letter-spacing: 0.6px;
      line-height: 1.15;
      margin-top: 1.5mm;
      color: #000000;
      word-break: break-word;
      text-transform: uppercase;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 96vw;
    }

    .group-text {
      font-size: 8pt;
      font-weight: 700;
      color: #333333;
      margin-top: 0.5mm;
      line-height: 1.1;
      max-width: 95vw;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .title-text {
      font-size: 7pt;
      color: #444444;
      line-height: 1.1;
      margin-top: 0.5mm;
      max-height: 4.5mm;
      overflow: hidden;
      max-width: 95vw;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    @media print {
      html, body {
        width: 100vw !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }
      .label-page {
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        border: none !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  ${allPagesHtml}

  <script>
    // Kích hoạt hộp thoại in của trình duyệt ngay khi load xong
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 250);
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

export function printSkuLabelDirectly(
  item: { sku: string; title?: string; group?: string },
  qrSvg: string,
  options: SkuLabelPrintOptions
): boolean {
  try {
    const html = generateSkuLabelHtml(item, qrSvg, options);

    let printFrame = document.getElementById('sku-thermal-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'sku-thermal-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.style.opacity = '0';
      printFrame.style.pointerEvents = 'none';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc || !printFrame.contentWindow) {
      return openSkuLabelPrintWindow(item, qrSvg, options);
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      } catch (err) {
        console.warn('Lỗi iframe print, fallback sang window.open:', err);
        openSkuLabelPrintWindow(item, qrSvg, options);
      }
    }, 200);

    return true;
  } catch (e) {
    console.error('Lỗi khi in trực tiếp bằng iframe:', e);
    return openSkuLabelPrintWindow(item, qrSvg, options);
  }
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

