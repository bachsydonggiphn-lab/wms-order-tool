import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('scripts/picking-study-results.json', 'utf8'));

console.log('================================================================');
console.log('=== BÁO CÁO KHOA HỌC: PHÂN TÍCH QUY LUẬT TẠO PICKING LIST 4 NGÀY ===');
console.log('================================================================');

let totalAllPls = 0;
let totalAllOrders = 0;
let totalAllQty = 0;

const daysSummary = {};
const timeSlots = {
  'Sáng sớm (08:00 - 09:59)': { pls: 0, orders: 0, qty: 0, lists: [] },
  'Trưa (10:00 - 12:29)': { pls: 0, orders: 0, qty: 0, lists: [] },
  'Đầu giờ chiều (13:30 - 15:59)': { pls: 0, orders: 0, qty: 0, lists: [] },
  'Chiều muộn (16:00 - 18:30)': { pls: 0, orders: 0, qty: 0, lists: [] },
  'Khác': { pls: 0, orders: 0, qty: 0, lists: [] },
};

const categoryPatterns = {
  '1 PCS (Số đơn = Số Qty)': { count: 0, totalOrders: 0, totalQty: 0, samples: [] },
  '2 PCS (Số Qty = 2 * Số đơn)': { count: 0, totalOrders: 0, totalQty: 0, samples: [] },
  '3 PCS (Số Qty = 3 * Số đơn)': { count: 0, totalOrders: 0, totalQty: 0, samples: [] },
  '4 PCS (Số Qty = 4 * Số đơn)': { count: 0, totalOrders: 0, totalQty: 0, samples: [] },
  '5+ PCS (Số Qty >= 5 * Số đơn)': { count: 0, totalOrders: 0, totalQty: 0, samples: [] },
  'Multi / Khác biệt Qty': { count: 0, totalOrders: 0, totalQty: 0, samples: [] },
};

const batchSizeDistribution = {
  'Rất lớn (> 200 đơn)': 0,
  'Lớn (100 - 200 đơn)': 0,
  'Vừa (50 - 99 đơn)': 0,
  'Nhỏ (20 - 49 đơn)': 0,
  'Rất nhỏ (< 20 đơn)': 0,
};

for (const [date, pls] of Object.entries(rawData)) {
  let dayOrders = 0;
  let dayQty = 0;

  pls.forEach(pl => {
    totalAllPls++;
    totalAllOrders += pl.orderCount;
    totalAllQty += pl.totalQty;
    dayOrders += pl.orderCount;
    dayQty += pl.totalQty;

    // Phân loại khung giờ
    const time = (pl.createdTime || '').split(' ')[1] || '00:00:00';
    const hour = parseInt(time.split(':')[0], 10);
    const minute = parseInt(time.split(':')[1], 10);
    const timeVal = hour + minute / 60;

    let slotKey = 'Khác';
    if (timeVal >= 8.0 && timeVal < 10.0) slotKey = 'Sáng sớm (08:00 - 09:59)';
    else if (timeVal >= 10.0 && timeVal < 12.5) slotKey = 'Trưa (10:00 - 12:29)';
    else if (timeVal >= 13.5 && timeVal < 16.0) slotKey = 'Đầu giờ chiều (13:30 - 15:59)';
    else if (timeVal >= 16.0 && timeVal <= 18.5) slotKey = 'Chiều muộn (16:00 - 18:30)';

    timeSlots[slotKey].pls++;
    timeSlots[slotKey].orders += pl.orderCount;
    timeSlots[slotKey].qty += pl.totalQty;
    timeSlots[slotKey].lists.push(pl);

    // Phân loại nhóm PCS
    if (pl.orderCount === pl.totalQty) {
      categoryPatterns['1 PCS (Số đơn = Số Qty)'].count++;
      categoryPatterns['1 PCS (Số đơn = Số Qty)'].totalOrders += pl.orderCount;
      categoryPatterns['1 PCS (Số đơn = Số Qty)'].totalQty += pl.totalQty;
      if (categoryPatterns['1 PCS (Số đơn = Số Qty)'].samples.length < 3) {
        categoryPatterns['1 PCS (Số đơn = Số Qty)'].samples.push(`${pl.plCode} (${pl.orderCount}đ)`);
      }
    } else if (pl.totalQty === pl.orderCount * 2) {
      categoryPatterns['2 PCS (Số Qty = 2 * Số đơn)'].count++;
      categoryPatterns['2 PCS (Số Qty = 2 * Số đơn)'].totalOrders += pl.orderCount;
      categoryPatterns['2 PCS (Số Qty = 2 * Số đơn)'].totalQty += pl.totalQty;
      if (categoryPatterns['2 PCS (Số Qty = 2 * Số đơn)'].samples.length < 3) {
        categoryPatterns['2 PCS (Số Qty = 2 * Số đơn)'].samples.push(`${pl.plCode} (${pl.orderCount}đ=${pl.totalQty}cái)`);
      }
    } else if (pl.totalQty === pl.orderCount * 3) {
      categoryPatterns['3 PCS (Số Qty = 3 * Số đơn)'].count++;
      categoryPatterns['3 PCS (Số Qty = 3 * Số đơn)'].totalOrders += pl.orderCount;
      categoryPatterns['3 PCS (Số Qty = 3 * Số đơn)'].totalQty += pl.totalQty;
      if (categoryPatterns['3 PCS (Số Qty = 3 * Số đơn)'].samples.length < 3) {
        categoryPatterns['3 PCS (Số Qty = 3 * Số đơn)'].samples.push(`${pl.plCode} (${pl.orderCount}đ=${pl.totalQty}cái)`);
      }
    } else if (pl.totalQty === pl.orderCount * 4) {
      categoryPatterns['4 PCS (Số Qty = 4 * Số đơn)'].count++;
      categoryPatterns['4 PCS (Số Qty = 4 * Số đơn)'].totalOrders += pl.orderCount;
      categoryPatterns['4 PCS (Số Qty = 4 * Số đơn)'].totalQty += pl.totalQty;
    } else if (pl.totalQty >= pl.orderCount * 5 && pl.totalQty % pl.orderCount === 0) {
      categoryPatterns['5+ PCS (Số Qty >= 5 * Số đơn)'].count++;
      categoryPatterns['5+ PCS (Số Qty >= 5 * Số đơn)'].totalOrders += pl.orderCount;
      categoryPatterns['5+ PCS (Số Qty >= 5 * Số đơn)'].totalQty += pl.totalQty;
    } else {
      categoryPatterns['Multi / Khác biệt Qty'].count++;
      categoryPatterns['Multi / Khác biệt Qty'].totalOrders += pl.orderCount;
      categoryPatterns['Multi / Khác biệt Qty'].totalQty += pl.totalQty;
    }

    // Phân bố quy mô batch
    if (pl.orderCount > 200) batchSizeDistribution['Rất lớn (> 200 đơn)']++;
    else if (pl.orderCount >= 100) batchSizeDistribution['Lớn (100 - 200 đơn)']++;
    else if (pl.orderCount >= 50) batchSizeDistribution['Vừa (50 - 99 đơn)']++;
    else if (pl.orderCount >= 20) batchSizeDistribution['Nhỏ (20 - 49 đơn)']++;
    else batchSizeDistribution['Rất nhỏ (< 20 đơn)']++;
  });

  daysSummary[date] = {
    pls: pls.length,
    orders: dayOrders,
    qty: dayQty,
    firstCreated: pls[pls.length - 1]?.createdTime,
    lastCreated: pls[0]?.createdTime
  };
}

console.log(`\n1. TỔNG QUAN 4 NGÀY GẦN NHẤT:`);
console.log(`- Tổng số Picking List: ${totalAllPls} PL`);
console.log(`- Tổng số đơn hàng: ${totalAllOrders} đơn (~${Math.round(totalAllOrders / 4)} đơn/ngày)`);
console.log(`- Tổng số PCS: ${totalAllQty} PCS (~${Math.round(totalAllQty / 4)} PCS/ngày)`);

console.log(`\n2. CHI TIẾT TỪNG NGÀY:`);
for (const [date, s] of Object.entries(daysSummary)) {
  console.log(`  * Ngày ${date}: ${s.pls} PL | ${s.orders} đơn | ${s.qty} PCS (Bắt đầu: ${s.firstCreated} -> Kết thúc: ${s.lastCreated})`);
}

console.log(`\n3. PHÂN BỔ THEO KHUNG GIỜ TẠO LIST (TIMING WAVES):`);
for (const [slot, data] of Object.entries(timeSlots)) {
  const pct = Math.round((data.pls / totalAllPls) * 100) || 0;
  console.log(`  * ${slot}: ${data.pls} PL (${pct}%) | ${data.orders} đơn (${data.qty} PCS)`);
}

console.log(`\n4. QUY LUẬT PHÂN TÁCH ĐƠN HÀNG (PCS SEGREGATION):`);
for (const [cat, data] of Object.entries(categoryPatterns)) {
  const pctPl = Math.round((data.count / totalAllPls) * 100) || 0;
  const pctOrders = Math.round((data.totalOrders / totalAllOrders) * 100) || 0;
  console.log(`  * ${cat}: ${data.count} PL (${pctPl}%) | ${data.totalOrders} đơn (${pctOrders}% tổng đơn) | Mẫu: ${data.samples.join(', ')}`);
}

console.log(`\n5. QUY MÔ SỐ ĐƠN TRÊN MỖI PICKING LIST:`);
for (const [size, count] of Object.entries(batchSizeDistribution)) {
  const pct = Math.round((count / totalAllPls) * 100) || 0;
  console.log(`  * ${size}: ${count} PL (${pct}%)`);
}
