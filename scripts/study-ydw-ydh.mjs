import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('scripts/picking-study-results.json', 'utf8'));

console.log('=== PHÂN TÍCH CHUYÊN SÂU YD-W, YD-H VÀ ĐƠN >= 20 PCS (4 NGÀY QUA) ===');

let totalYdWLists = 0;
let totalYdHLists = 0;
let totalLargeQtyLists = 0;

for (const [date, pls] of Object.entries(rawData)) {
  console.log(`\n========================================`);
  console.log(`--- NGÀY ${date} ---`);
  
  pls.forEach(pl => {
    // Kiểm tra topSkus xem có YD-W hoặc YD-H không
    const topSkusStr = (pl.topSkus || []).map(s => s[0]).join(', ');
    const isYdW = topSkusStr.includes('YD-W') || (pl.plCode && pl.plCode.includes('W'));
    const isYdH = topSkusStr.includes('YD-H') || (pl.plCode && pl.plCode.includes('H'));
    const hasHighPcsPerOrder = pl.orderCount > 0 && (pl.totalQty / pl.orderCount >= 10);
    const hasHugeOrderCount = pl.orderCount >= 150;

    if (isYdW || isYdH || hasHighPcsPerOrder || hasHugeOrderCount) {
      console.log(`PL: ${pl.plCode} | Đơn: ${pl.orderCount} | Qty: ${pl.totalQty} (TB ${Math.round(pl.totalQty/pl.orderCount)} cái/đơn) | SKUs: ${topSkusStr}`);
    }
  });
}
