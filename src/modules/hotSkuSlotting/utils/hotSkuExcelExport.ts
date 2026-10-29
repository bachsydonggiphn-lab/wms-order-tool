import * as XLSX from 'xlsx';
import { HotSkuAnalysisItem, HotSkuAnalyticsResult } from '../../../../sqliteDb';

export const exportRelocationTasksToExcel = (
  analytics: HotSkuAnalyticsResult | null,
  completedTaskIds: Set<string>
) => {
  if (!analytics?.relocationTasks || analytics.relocationTasks.length === 0) {
    alert('Không có nhiệm vụ nào để xuất!');
    return;
  }

  const rows = analytics.relocationTasks.map((t, idx) => ({
    STT: idx + 1,
    'Phân Loại':
      t.actionType === 'promote_zone_a'
        ? 'ĐÔN HÀNG VỀ ZONE A'
        : t.actionType === 'demote_zone_b'
        ? 'RÚT HÀNG VỀ ZONE B/C'
        : t.actionType === 'pair_skus'
        ? 'GHÉP CẶP ĐƠN MIX'
        : 'ĐẶT CHỖ ĐÓN HÀNG VỀ',
    'Mức Độ Khẩn': (t.urgency || 'medium').toUpperCase(),
    'Mã SKU': t.sku,
    'Tên Sản Phẩm': t.productTitle || '',
    'Hành Động Yêu Cầu': t.title,
    'Vị Trí Hiện Tại': t.currentZone,
    'Vị Trí Mới / Đề Xuất': t.targetZone,
    'Lý Do Nghiệp Vụ': t.reason,
    'Sản Lượng Bán / Tiềm Năng (PCS)': t.potentialVolume,
    'Hàng Đang Về (On-way)': t.onWay ?? 0,
    'Trạng Thái Thực Hiện': completedTaskIds.has(t.id) ? 'ĐÃ HOÀN THÀNH' : 'CHƯA LÀM',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Nhiem_Vu_Doi_Ke');

  const fileName = `Checklist_Nhiem_Vu_Doi_Ke_VN02_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

export const exportHotSkuToExcel = (
  analytics: HotSkuAnalyticsResult | null,
  filteredItems: HotSkuAnalysisItem[],
  rankingMode: 'normalized' | 'actual',
  timeframe: string
) => {
  if (!analytics?.items || analytics.items.length === 0) {
    alert('Không có dữ liệu để xuất Excel');
    return;
  }

  const rows = filteredItems.map((item, idx) => ({
    STT: idx + 1,
    'Phân Hạng ABC (Đang áp dụng)': item.abcRank,
    'Điểm Slotting Priority (0-100)': item.slottingScore ?? 50,
    'Xu Hướng Bán (7d vs 30d)':
      item.trendCategory === 'viral'
        ? `🚀 BÙNG NỔ (${item.trendRatio}x)`
        : item.trendCategory === 'up'
        ? `📈 Đang tăng (${item.trendRatio}x)`
        : item.trendCategory === 'down'
        ? `📉 Thoái trào (${item.trendRatio}x)`
        : '⚖️ Ổn định',
    'Sản Lượng 7 Ngày Qua (PCS)': item.qty7d ?? 0,
    'Hạng Chuẩn Hóa (Tiềm Năng)': item.abcRankNormalized || item.abcRank,
    'Hạng Thực Tế (Đã Xuất)': item.abcRankActual || item.abcRank,
    'Mã SKU': item.sku,
    'Tên Sản Phẩm': item.productTitle || '',
    'Nhóm Hàng': item.groupName,
    'Sản Lượng Đã Bán (PCS)': item.totalSold,
    'Số Lần Ghé Kệ Nhặt (Pick Hits)': item.orderCount,
    'Số Ngày Đứt Hàng Cạn Tồn': item.stockoutDays ?? 0,
    'Số Ngày Mở Bán Thực Tế': item.effectiveSellingDays ?? analytics.daysInPeriod,
    'Vận Tốc Bán Thực Tế (PCS/Ngày)': item.adjustedVelocity ?? item.velocityDaily,
    'Sản Lượng Tiềm Năng (PCS)': item.potentialVolume ?? item.totalSold,
    'Tồn Kho Khả Dụng (WMS)': item.sellable ?? 0,
    'Hàng Đang Về (On-way)': item.onWay ?? 0,
    'Độ Phủ Hàng Về (Dự Kiến Bán Hết)':
      item.daysOfSupplyIncoming !== null && item.daysOfSupplyIncoming !== undefined
        ? `${item.daysOfSupplyIncoming} ngày`
        : 'N/A',
    'Đang Chuẩn Bị (In-Used)': item.inUsed ?? 0,
    'Dự Báo Số Ngày Hết Tồn': item.daysOfInventory !== null ? item.daysOfInventory : 'Không tính được',
    'Cặp Sản Phẩm Hay Mua Kèm':
      item.topPairedSkus?.map((p) => `${p.sku} (${p.pairCount} lần)`).join('; ') || 'Không có',
    'Trạng Thái Hàng Hóa': item.isStockoutWithIncoming
      ? '⭐ HẾT HÀNG - CÓ HÀNG VỀ (ĐẶT CHỖ ZONE A)'
      : item.stockoutWarning
      ? 'NGUY CƠ CHÁY HÀNG'
      : 'Bình thường',
    'Đề Xuất Vị Trí Kho': item.recommendedZone,
    'Chi Tiết Sắp Xếp / Đặt Chỗ': item.recommendedSlotting,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Phân Tích Bán Chạy & Kệ Kho');

  const fileName = `Phan_Tich_Slotting_VN02_${rankingMode}_${timeframe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
