import { searchOrdersWithAttachments, mergeOrderPdfs } from '../src/services/wmsService.ts';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

async function main() {
  console.log('Searching 2 orders from PL72610210020...');
  const res = await searchOrdersWithAttachments({
    searchCodes: ['PL72610210020'],
    warehouse: '7'
  });
  console.log('Total found:', res.orders.length);
  const sample = res.orders.slice(0, 2);
  console.log('Sample orders:', sample.map(o => ({ orderNo: o.orderNo, trackingNo: o.trackingNo, attachmentUrl: o.attachmentUrl?.slice(0, 40) })));

  const pdfBytes = await mergeOrderPdfs(sample.map(o => ({
    orderNo: o.orderNo,
    trackingNo: o.trackingNo,
    refNo: o.refNo,
    items: o.items,
    attachmentUrl: o.attachmentUrl,
    oatId: o.oatId
  })), 'David', '12345abc', { drawPackingOverlay: true, drawPageNumbers: true });

  fs.writeFileSync('scratch/test-merged-with-page.pdf', pdfBytes);
  console.log('Saved scratch/test-merged-with-page.pdf, size:', pdfBytes.length);

  const doc = await PDFDocument.load(pdfBytes);
  console.log('Page count:', doc.getPageCount());
  for (let i = 0; i < doc.getPageCount(); i++) {
    const p = doc.getPage(i);
    console.log(`Page ${i + 1} size:`, p.getSize(), 'rotation:', p.getRotation());
  }
}

main().catch(console.error);
