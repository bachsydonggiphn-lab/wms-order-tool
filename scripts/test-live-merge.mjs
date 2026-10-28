import http from 'http';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

function post(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('1. First searching orders on live VPS API...');
  const searchRes = await post('http://162.4.176.249:3000/api/wms/search-order-attachments', {
    searchCodes: ['PL72610210020'],
    warehouse: '7'
  });
  console.log('Search HTTP Status:', searchRes.status);
  const searchJson = JSON.parse(searchRes.buffer.toString());
  console.log('Total orders:', searchJson.totalOrders, 'totalWithPdf:', searchJson.totalWithPdf);

  const sample = searchJson.orders.slice(0, 3);
  console.log('\n2. Calling merge-order-pdfs on live VPS with 3 sample orders:');
  const mergePayload = {
    items: sample.map(o => ({
      orderNo: o.orderNo,
      trackingNo: o.trackingNo,
      refNo: o.refNo,
      carrier: o.carrier,
      shippingMethod: o.shippingMethod,
      items: o.items,
      attachmentUrl: o.attachmentUrl,
      oatId: o.oatId
    })),
    drawPackingOverlay: true,
    drawPageNumbers: true
  };

  const mergeRes = await post('http://162.4.176.249:3000/api/wms/merge-order-pdfs', mergePayload);
  console.log('Merge HTTP Status:', mergeRes.status, 'Buffer length:', mergeRes.buffer.length);

  fs.writeFileSync('scratch/live-vps-merged.pdf', mergeRes.buffer);
  console.log('Saved scratch/live-vps-merged.pdf');

  const doc = await PDFDocument.load(mergeRes.buffer);
  console.log('Total pages in merged PDF:', doc.getPageCount());
  for (let i = 0; i < doc.getPageCount(); i++) {
    const p = doc.getPage(i);
    console.log(`Page ${i + 1} size:`, p.getSize(), 'rotation:', p.getRotation());
  }
}

main().catch(console.error);
