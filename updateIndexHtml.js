import fs from 'fs';

const pngBase64 = fs.readFileSync('public/logo.png').toString('base64');
const dataUri = `data:image/png;base64,${pngBase64}`;

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Công Cụ Xử Lý & Phân Loại Đơn Hàng Kho (SKU / PCS / Khu Vực)</title>
    <link rel="icon" type="image/png" href="${dataUri}" />
    <link rel="shortcut icon" type="image/png" href="/logo.png?v=5" />
    <link rel="apple-touch-icon" href="/logo.png?v=5" />
    <link rel="icon" type="image/png" sizes="32x32" href="/logo.png?v=5" />
    <link rel="icon" type="image/png" sizes="16x16" href="/logo.png?v=5" />
    <meta name="description" content="Web tool xử lý tổng hợp SKU, phân loại số lượng PCS, phân nhóm khu vực kho, lọc thảm Yoga, đơn 1 PCS và in phiếu nhặt hàng chuẩn khổ tem nhiệt 100x150 mm." />
    <meta property="og:title" content="Công Cụ Xử Lý & Phân Loại Đơn Hàng Kho" />
    <meta property="og:description" content="Web tool xử lý tổng hợp SKU, phân loại số lượng PCS, phân nhóm khu vực kho, lọc thảm Yoga, đơn 1 PCS và in phiếu nhặt hàng chuẩn khổ tem nhiệt 100x150 mm." />
    <meta property="og:image" content="/logo.png" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="/logo.png" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

fs.writeFileSync('index.html', indexHtml);
console.log('Successfully updated index.html with PNG base64 favicon!');
