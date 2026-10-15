export interface SkuLabelPrintOptions {
  paperSize?: string;
  customWidthMm?: number;
  customHeightMm?: number;
  orientation?: 'landscape' | 'portrait';
  copies: number;
  showTitle?: boolean;
  showGroup?: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  fitFullLabel?: boolean;
}

export const PAPER_SIZE_CONFIGS: Record<
  string,
  { label: string; widthMm: number; heightMm: number; orientation: 'portrait' | 'landscape'; note?: string }
> = {
  '50x30': { label: '50 × 30 mm (Tem Ngang - Dán sản phẩm / túi zip)', widthMm: 50, heightMm: 30, orientation: 'landscape', note: 'Chuẩn tem dán sản phẩm mini' },
  '100x150': { label: '100 × 150 mm (Khổ A6 - Cuộn tem vận đơn Xprinter XP-D465B)', widthMm: 100, heightMm: 150, orientation: 'portrait', note: 'Cuộn tem vận đơn phổ biến của máy XP-D465B' },
  '75x50': { label: '75 × 50 mm (Tem Trung Ngang)', widthMm: 75, heightMm: 50, orientation: 'landscape', note: 'Khổ tem trung' },
  '50x75': { label: '50 × 75 mm (Tem Trung Dọc)', widthMm: 50, heightMm: 75, orientation: 'portrait', note: 'Khổ tem trung dạng đứng' },
  '40x30': { label: '40 × 30 mm (Tem Nhỏ Ngang)', widthMm: 40, heightMm: 30, orientation: 'landscape', note: 'Tem nhỏ' },
  '30x40': { label: '30 × 40 mm (Tem Nhỏ Dọc)', widthMm: 30, heightMm: 40, orientation: 'portrait', note: 'Tem nhỏ dạng đứng' },
  '50x50': { label: '50 × 50 mm (Tem Vuông)', widthMm: 50, heightMm: 50, orientation: 'portrait', note: 'Tem vuông cân đối' },
  '35x25': { label: '35 × 25 mm (Tem Siêu Nhỏ)', widthMm: 35, heightMm: 25, orientation: 'landscape', note: 'Tem siêu nhỏ dán nhãn' },
  'custom': { label: 'Tùy Chỉnh Kích Thước (Rộng × Cao mm)', widthMm: 50, heightMm: 30, orientation: 'landscape', note: 'Tự nhập mm' },
};

export function resolvePaperDimensions(options: SkuLabelPrintOptions): {
  widthMm: number;
  heightMm: number;
  orientation: 'landscape' | 'portrait';
} {
  let widthMm = 50;
  let heightMm = 30;

  if (options.customWidthMm && options.customHeightMm && options.customWidthMm > 0 && options.customHeightMm > 0) {
    widthMm = options.customWidthMm;
    heightMm = options.customHeightMm;
  } else if (options.paperSize && PAPER_SIZE_CONFIGS[options.paperSize]) {
    widthMm = PAPER_SIZE_CONFIGS[options.paperSize].widthMm;
    heightMm = PAPER_SIZE_CONFIGS[options.paperSize].heightMm;
  }

  // Tự động xoay nếu người dùng chọn rõ orientation
  if (options.orientation === 'landscape' && widthMm < heightMm) {
    const tmp = widthMm;
    widthMm = heightMm;
    heightMm = tmp;
  } else if (options.orientation === 'portrait' && widthMm > heightMm) {
    const tmp = widthMm;
    widthMm = heightMm;
    heightMm = tmp;
  }

  const orientation = widthMm >= heightMm ? 'landscape' : 'portrait';
  return { widthMm, heightMm, orientation };
}

export function generateSkuLabelHtml(
  item: { sku: string; title?: string; group?: string },
  qrCodeSrc: string, // Hỗ trợ cả Base64 Data URL (PNG) và SVG
  options: SkuLabelPrintOptions
): string {
  const copies = Math.max(1, options.copies || 1);
  const { widthMm, heightMm } = resolvePaperDimensions(options);

  // Tính toán kích thước font chữ và QR code tối ưu theo khổ tem mm
  let skuFontSizePt = Math.max(10, Math.round(heightMm * 0.38));
  if (heightMm > 80) {
    skuFontSizePt = Math.max(22, Math.round(heightMm * 0.22));
  }
  // Giảm nhẹ font size nếu mã SKU dài để tránh bị tràn lề
  const skuLen = (item.sku || '').length;
  if (skuLen > 20) {
    skuFontSizePt = Math.max(8, Math.round(skuFontSizePt * 0.7));
  } else if (skuLen > 14) {
    skuFontSizePt = Math.max(9, Math.round(skuFontSizePt * 0.85));
  }

  const isDataUrl = qrCodeSrc.startsWith('data:') || qrCodeSrc.startsWith('http');
  const qrElementHtml = isDataUrl
    ? `<img src="${qrCodeSrc}" alt="${escapeHtml(item.sku)}" class="qr-img" />`
    : `<div class="qr-svg-wrapper">${qrCodeSrc}</div>`;

  const singleLabelHtml = `
    <div class="label-page">
      <div class="label-content">
        <div class="qr-container">
          ${qrElementHtml}
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
  <title>Tem SKU - ${escapeHtml(item.sku)} (${widthMm}x${heightMm}mm)</title>
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Giao diện xem trên tab trình duyệt */
    body {
      background: #0f172a;
      padding: 65px 12px 30px 12px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .no-print {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 13px;
      z-index: 99999;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .no-print-left {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .sku-badge {
      font-family: monospace;
      font-weight: 900;
      background: #0f172a;
      color: #38bdf8;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #38bdf8/40;
    }

    .info-badge {
      color: #94a3b8;
      font-size: 12px;
      background: #0f172a;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .no-print-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-action {
      border: none;
      border-radius: 8px;
      padding: 7px 16px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .btn-print {
      background: #10b981;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);
    }
    .btn-print:hover {
      background: #059669;
    }

    .btn-close {
      background: #475569;
      color: #f1f5f9;
    }
    .btn-close:hover {
      background: #64748b;
    }

    .label-page {
      width: ${widthMm}mm;
      height: ${heightMm}mm;
      max-width: ${widthMm}mm;
      max-height: ${heightMm}mm;
      background: #ffffff;
      box-shadow: 0 8px 25px rgba(0,0,0,0.4);
      border-radius: 4px;
      margin: 12px auto;
      padding: 1.5mm 2mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      overflow: hidden;
      position: relative;
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
      box-sizing: border-box;
    }

    .qr-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      flex: 1 1 auto;
      min-height: 0;
      max-height: ${options.showTitle || options.showGroup ? '65%' : '76%'};
      overflow: hidden;
    }

    .qr-img {
      width: auto;
      height: 100%;
      max-width: 95%;
      max-height: 100%;
      object-fit: contain;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: pixelated;
      image-rendering: crisp-edges;
      display: block;
    }

    .qr-svg-wrapper {
      width: auto;
      height: 100%;
      max-width: 95%;
      max-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-svg-wrapper svg {
      width: auto;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      display: block;
      shape-rendering: crispEdges;
    }

    .sku-text {
      font-size: ${skuFontSizePt}pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      line-height: 1.15;
      margin-top: 1mm;
      color: #000000;
      text-transform: uppercase;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 98%;
      display: block;
    }

    .group-text {
      font-size: ${Math.max(7, Math.round(skuFontSizePt * 0.65))}pt;
      font-weight: 700;
      color: #222222;
      margin-top: 0.4mm;
      line-height: 1.1;
      max-width: 98%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .title-text {
      font-size: ${Math.max(6.5, Math.round(skuFontSizePt * 0.55))}pt;
      color: #333333;
      line-height: 1.1;
      margin-top: 0.4mm;
      max-height: 4mm;
      overflow: hidden;
      max-width: 98%;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    /* CSS ĐẶC TRỊ KHI IN RA MÁY IN NHIỆT (Xprinter XP-D465B, v.v.) */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      .label-page {
        width: 100vw !important;
        height: 100vh !important;
        max-width: 100vw !important;
        max-height: 100vh !important;
        margin: 0 !important;
        padding: 1.5mm 2mm !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .label-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <div class="no-print-left">
      <strong>🖨️ Xprinter XP-D465B</strong> &bull; Tem SKU: <span class="sku-badge">${escapeHtml(item.sku)}</span>
      <span class="info-badge">Khổ: ${widthMm}×${heightMm}mm &bull; ${copies} bản in</span>
    </div>
    <div class="no-print-right">
      <button onclick="window.print()" class="btn-action btn-print">🖨️ Mở Hộp Thoại In</button>
      <button onclick="window.close()" class="btn-action btn-close">✕ Đóng Tab</button>
    </div>
  </div>

  ${allPagesHtml}

  <script>
    // Tự động mở hộp thoại in sau khi tải xong trang và ảnh
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.focus();
          window.print();
        } catch (e) {
          console.error('Lỗi print:', e);
        }
      }, 350);
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
  qrCodeSrc: string,
  options: SkuLabelPrintOptions
): boolean {
  const { widthMm, heightMm } = resolvePaperDimensions(options);
  const printWindow = window.open(
    '',
    '_blank',
    `width=750,height=650,menubar=no,toolbar=no,location=no,status=no`
  );

  if (!printWindow) {
    // Popup bị chặn -> Tự động chuyển hướng sang phương thức iframe
    return printSkuLabelDirectly(item, qrCodeSrc, options);
  }

  const html = generateSkuLabelHtml(item, qrCodeSrc, options);
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  return true;
}

export function printSkuLabelDirectly(
  item: { sku: string; title?: string; group?: string },
  qrCodeSrc: string,
  options: SkuLabelPrintOptions
): boolean {
  try {
    const { widthMm, heightMm } = resolvePaperDimensions(options);
    const html = generateSkuLabelHtml(item, qrCodeSrc, options);

    let printFrame = document.getElementById('sku-thermal-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'sku-thermal-print-frame';
      document.body.appendChild(printFrame);
    }

    // Thiết lập kích thước iframe chuẩn milimet để trình duyệt tính toán đúng viewport
    printFrame.style.position = 'fixed';
    printFrame.style.left = '-9999px';
    printFrame.style.top = '-9999px';
    printFrame.style.width = `${widthMm}mm`;
    printFrame.style.height = `${heightMm}mm`;
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    printFrame.style.pointerEvents = 'none';

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc || !printFrame.contentWindow) {
      return openSkuLabelPrintWindow(item, qrCodeSrc, options);
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
        openSkuLabelPrintWindow(item, qrCodeSrc, options);
      }
    }, 300);

    return true;
  } catch (e) {
    console.error('Lỗi khi in trực tiếp bằng iframe:', e);
    return openSkuLabelPrintWindow(item, qrCodeSrc, options);
  }
}

