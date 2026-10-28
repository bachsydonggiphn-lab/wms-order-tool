import { searchOrdersWithAttachments, mergeOrderPdfs } from '../src/services/wmsService.ts';

async function test358Speed() {
  console.log('Fetching orders for PL72610210020...');
  console.time('search358');
  const res = await searchOrdersWithAttachments({
    searchCodes: ['PL72610210020'],
    warehouse: '7'
  });
  console.timeEnd('search358');
  console.log('Orders found:', res.orders.length, 'Orders with PDF:', res.totalWithPdf);

  const sampleOrders = res.orders.slice(0, 30);
  console.log('\nMerging first 30 orders with parallel pre-fetch...');
  console.time('merge30');
  const pdf30 = await mergeOrderPdfs(sampleOrders.map(o => ({
    orderNo: o.orderNo,
    trackingNo: o.trackingNo,
    refNo: o.refNo,
    items: o.items,
    attachmentUrl: o.attachmentUrl,
    oatId: o.oatId
  })));
  console.timeEnd('merge30');
  console.log('PDF 30 size:', (pdf30.length / 1024).toFixed(1), 'KB');

  console.log('\nMerging first 30 orders SECOND time (from memory cache):');
  console.time('merge30Cached');
  const pdf30Cached = await mergeOrderPdfs(sampleOrders.map(o => ({
    orderNo: o.orderNo,
    trackingNo: o.trackingNo,
    refNo: o.refNo,
    items: o.items,
    attachmentUrl: o.attachmentUrl,
    oatId: o.oatId
  })));
  console.timeEnd('merge30Cached');
  console.log('PDF 30 cached size:', (pdf30Cached.length / 1024).toFixed(1), 'KB');
}

test358Speed().catch(console.error);
