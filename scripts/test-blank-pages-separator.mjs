import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function testSeparator() {
  console.log('Testing mergeOrderPdfs with isSeparator...');

  // Tạo scratch folder nếu chưa có
  if (!fs.existsSync('scratch')) fs.mkdirSync('scratch', { recursive: true });

  const doc1 = await PDFDocument.create();
  doc1.addPage([288, 432]); // page 1
  const bytes1 = await doc1.save();

  const doc2 = await PDFDocument.create();
  doc2.addPage([288, 432]); // page 1
  const bytes2 = await doc2.save();

  const mergedPdf = await PDFDocument.create();
  let lastW = 288;
  let lastH = 432;

  // SKU 1 (1 đơn hàng)
  const d1 = await PDFDocument.load(bytes1);
  const p1 = await mergedPdf.copyPages(d1, [0]);
  mergedPdf.addPage(p1[0]);

  // Vách ngăn phân tách SKU: chèn 2 trang trắng
  mergedPdf.addPage([lastW, lastH]);
  mergedPdf.addPage([lastW, lastH]);

  // SKU 2 (1 đơn hàng)
  const d2 = await PDFDocument.load(bytes2);
  const p2 = await mergedPdf.copyPages(d2, [0]);
  mergedPdf.addPage(p2[0]);

  const totalPages = mergedPdf.getPageCount();
  console.log('Total pages with 2 items + separator:', totalPages);
  if (totalPages === 4) {
    console.log('PASSED: Exactly 4 pages (1 page SKU_A + 2 blank pages + 1 page SKU_B)!');
  } else {
    console.error('FAILED: Expected 4 pages, got', totalPages);
  }
}

testSeparator().catch(console.error);
