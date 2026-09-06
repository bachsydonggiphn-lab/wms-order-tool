import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Copy,
  Check,
  Printer,
  Search,
  ArrowRight,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Info,
  Table,
  FileSpreadsheet,
  Zap,
  Tag,
  Split,
  FolderTree,
  CheckCircle2,
  Target,
  ExternalLink,
} from 'lucide-react';
import { RawOrderRow, SkuGroupsMap, SkuInMixSummary, CarrierCode } from '../../types';
import { xuLyPhanTichDonMix, xuLyGomDonMixTheoNhom } from '../../utils/orderProcessor';

interface MixOrderAnalysisViewProps {
  orders: RawOrderRow[];
  skuGroups: SkuGroupsMap;
  selectedPickingList: string;
  selectedCarrier?: CarrierCode;
}

export const MixOrderAnalysisView: React.FC<MixOrderAnalysisViewProps> = ({
  orders,
  skuGroups,
  selectedPickingList,
  selectedCarrier = 'ALL',
}) => {
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'area_orders' | 'orders' | 'qty' | 'sku'>('area_orders');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'by_group' | 'by_area' | 'table' | 'cluster' | 'combos'>('by_group');
  const [groupingType, setGroupingType] = useState<'model' | 'area'>('model');
  const [subGroupTab, setSubGroupTab] = useState<'pure' | 'cross' | 'all'>('pure');
  const [yogaFilter, setYogaFilter] = useState<'exclude' | 'only' | 'all'>('exclude');
  const [pcsFilter, setPcsFilter] = useState<'all' | '2' | '3' | '4' | '5' | '6' | 'ge6' | 'ge7'>('all');

  // Phân tích đơn MIX theo nhóm sản phẩm (Cùng nhóm vs Chéo nhóm)
  const mixByGroup = useMemo(() => {
    return xuLyGomDonMixTheoNhom(orders, skuGroups, groupingType, selectedPickingList, yogaFilter, selectedCarrier);
  }, [orders, skuGroups, groupingType, selectedPickingList, yogaFilter, selectedCarrier]);

  // Lọc danh sách nhóm thuần theo PCS nếu có bộ lọc
  const filteredPureGroupList = useMemo(() => {
    if (pcsFilter === 'all') return mixByGroup.pureGroupList;
    return mixByGroup.pureGroupList.filter(
      (g) => (g.ordersByPcs[pcsFilter]?.length || 0) > 0
    );
  }, [mixByGroup.pureGroupList, pcsFilter]);

  // Lọc danh sách cặp nhóm chéo theo PCS nếu có bộ lọc
  const filteredCrossGroupPairs = useMemo(() => {
    if (pcsFilter === 'all') return mixByGroup.crossGroupPairs;
    return mixByGroup.crossGroupPairs.filter(
      (c) => (c.ordersByPcs[pcsFilter]?.length || 0) > 0
    );
  }, [mixByGroup.crossGroupPairs, pcsFilter]);

  // Lọc danh sách tổng hợp theo PCS nếu có bộ lọc
  const filteredAllGroupSummaries = useMemo(() => {
    if (pcsFilter === 'all') return mixByGroup.allGroupSummaries;
    return mixByGroup.allGroupSummaries.filter(
      (s) => (s.ordersByPcs[pcsFilter]?.length || 0) > 0
    );
  }, [mixByGroup.allGroupSummaries, pcsFilter]);

  // Phân tích đơn MIX theo SKU
  const mixAnalysis = useMemo(() => {
    return xuLyPhanTichDonMix(orders, skuGroups, selectedPickingList, yogaFilter, selectedCarrier);
  }, [orders, skuGroups, selectedPickingList, yogaFilter, selectedCarrier]);

  // Lấy danh sách các khu vực có trong đơn MIX
  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    mixAnalysis.rankedSkus.forEach((s) => set.add(s.area));
    return Array.from(set).sort();
  }, [mixAnalysis]);

  // Lọc và sắp xếp SKU
  const filteredSkus = useMemo(() => {
    let list = [...mixAnalysis.rankedSkus];

    if (areaFilter !== 'ALL') {
      list = list.filter((s) => s.area === areaFilter);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toUpperCase();
      list = list.filter(
        (s) =>
          s.sku.toUpperCase().includes(q) ||
          s.area.toUpperCase().includes(q) ||
          s.orders.some((o) => o.orderNo.toUpperCase().includes(q))
      );
    }

    if (sortBy === 'area_orders') {
      // Sắp xếp theo Khu vực kệ trước (VD: YD-W, YD-D, YD-K,...) rồi trong từng khu vực xếp theo Số đơn MIX trùng nhiều nhất -> SL PCS
      list.sort((a, b) => {
        if (a.area !== b.area) return a.area.localeCompare(b.area);
        return b.orderCount - a.orderCount || b.totalQty - a.totalQty;
      });
    } else if (sortBy === 'orders') {
      list.sort((a, b) => b.orderCount - a.orderCount || b.totalQty - a.totalQty);
    } else if (sortBy === 'qty') {
      list.sort((a, b) => b.totalQty - a.totalQty || b.orderCount - a.orderCount);
    } else if (sortBy === 'sku') {
      list.sort((a, b) => a.sku.localeCompare(b.sku));
    }

    return list;
  }, [mixAnalysis, areaFilter, searchTerm, sortBy]);

  // Nhóm SKU theo từng khu vực (để đi nhặt 1 lượt trong 1 khu)
  const skusGroupedByArea = useMemo(() => {
    const groups: Record<
      string,
      {
        area: string;
        skus: SkuInMixSummary[];
        totalAreaQty: number;
        distinctOrdersCount: number;
        distinctOrderNos: string[];
      }
    > = {};

    filteredSkus.forEach((item) => {
      if (!groups[item.area]) {
        groups[item.area] = {
          area: item.area,
          skus: [],
          totalAreaQty: 0,
          distinctOrdersCount: 0,
          distinctOrderNos: [],
        };
      }
      groups[item.area].skus.push(item);
      groups[item.area].totalAreaQty += item.totalQty;
    });

    // Tính số lượng đơn hàng duy nhất trong từng khu vực
    Object.values(groups).forEach((g) => {
      const orderSet = new Set<string>();
      g.skus.forEach((s) => s.orders.forEach((o) => orderSet.add(o.orderNo)));
      g.distinctOrdersCount = orderSet.size;
      g.distinctOrderNos = Array.from(orderSet);
      // Đảm bảo trong từng khu vực các SKU luôn được xếp theo mức độ trùng nhiều đơn nhất
      g.skus.sort((a, b) => b.orderCount - a.orderCount || b.totalQty - a.totalQty);
    });

    // Sắp xếp các khu vực theo số lượng hàng hoặc số đơn nhiều nhất
    return Object.values(groups).sort((a, b) => b.totalAreaQty - a.totalAreaQty);
  }, [filteredSkus]);

  // SKU đang chọn hiện tại (mặc định là SKU top 1)
  const currentSelectedSummary: SkuInMixSummary | undefined = useMemo(() => {
    if (selectedSku) {
      const found = mixAnalysis.rankedSkus.find((s) => s.sku === selectedSku);
      if (found) return found;
    }
    return filteredSkus[0] || mixAnalysis.rankedSkus[0];
  }, [selectedSku, filteredSkus, mixAnalysis]);

  // Top 1 SKU trùng nhiều đơn MIX nhất
  const top1Sku = useMemo(() => {
    if (!mixAnalysis.rankedSkus.length) return null;
    const sorted = [...mixAnalysis.rankedSkus].sort(
      (a, b) => b.orderCount - a.orderCount || b.totalQty - a.totalQty
    );
    return sorted[0];
  }, [mixAnalysis]);

  // Format danh sách mã đơn rút gọn thông minh (VD: YD-260816-01, 02, 03, 04 hoặc STT đơn)
  const formatCompactOrderList = (orderNos: string[]): string => {
    if (orderNos.length === 0) return '-';
    if (orderNos.length === 1) return orderNos[0];

    // Kiểm tra tiền tố chung (prefix)
    const first = orderNos[0];
    const lastDashIdx = first.lastIndexOf('-');
    if (lastDashIdx > 0) {
      const prefix = first.substring(0, lastDashIdx + 1); // VD: "YD-260816-"
      const allSharePrefix = orderNos.every(o => o.startsWith(prefix));
      if (allSharePrefix) {
        const suffixes = orderNos.map(o => o.substring(prefix.length));
        return `${prefix}${suffixes.join(', ')}`;
      }
    }

    return orderNos.join(', ');
  };

  // Copy danh sách mã đơn
  const handleCopyOrders = (orderNos: string[], key: string) => {
    navigator.clipboard.writeText(orderNos.join('\n'));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // In Bảng Phân Tách Đơn MIX Theo Nhóm Hàng (Cùng Nhóm & Chéo Nhóm)
  const handlePrintByGroupTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Trình duyệt đang chặn popup. Vui lòng cho phép popup để in.');
      return;
    }

    const pureSectionsHtml = mixByGroup.pureGroupList
      .map(
        (group, idx) => `
        <div style="margin-bottom: 20px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
          <div style="background-color: #047857; color: #fff; padding: 7px 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 13px; font-weight: bold;">
              🎯 #${idx + 1}. NHÓM SẢN PHẨM: ${group.groupName} &mdash; ${group.orderCount} Đơn MIX Thuần Nhóm (${group.totalPcs} PCS)
            </div>
            <div style="font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">
              Lấy tại 1 kệ duy nhất
            </div>
          </div>
          <div style="padding: 8px 12px; background-color: #f8fafc; font-size: 11px; border-bottom: 1px solid #e2e8f0;">
            <b>Mã SKU cần lấy:</b> ${group.skuBreakdown.map((s) => `<b>${s.sku}</b>: ${s.qty} PCS`).join(' | ')}
          </div>
          <div style="padding: 8px 12px; font-family: monospace; font-size: 10px; color: #334155; word-break: break-all;">
            <b>Danh sách mã đơn:</b> ${group.orderNos.join(', ')}
          </div>
        </div>
      `
      )
      .join('');

    const crossSectionsHtml = mixByGroup.crossGroupPairs
      .map(
        (pair, idx) => `
        <div style="margin-bottom: 16px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
          <div style="background-color: #4338ca; color: #fff; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 12.5px; font-weight: bold;">
              🔀 #${idx + 1}. CẶP NHÓM: ${pair.groupComboKey} &mdash; ${pair.orderCount} Đơn (${pair.totalPcs} PCS)
            </div>
            <div style="font-size: 10.5px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">
              Đơn chéo nhóm
            </div>
          </div>
          <div style="padding: 6px 12px; background-color: #f8fafc; font-size: 10.5px; border-bottom: 1px solid #e2e8f0;">
            <b>Các mã SKU:</b> ${pair.skuList.join(', ')}
          </div>
          <div style="padding: 6px 12px; font-family: monospace; font-size: 9.5px; color: #334155; word-break: break-all;">
            <b>Danh sách mã đơn:</b> ${pair.orderNos.join(', ')}
          </div>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bảng Bóc Tách Đơn MIX Theo Nhóm Hàng</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; color: #111; font-size: 12px; }
            h1 { font-size: 16px; margin: 0 0 4px 0; color: #1e3a8a; }
            h2 { font-size: 14px; margin: 16px 0 8px 0; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 4px; }
            .header-info { margin-bottom: 14px; font-size: 11px; color: #64748b; }
            @media print {
              button { display: none; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <div>
              <h1>BẢNG BÓC TÁCH ĐƠN HÀNG MIX THEO NHÓM SẢN PHẨM</h1>
              <div class="header-info">Picking List: <b>${selectedPickingList || 'TẤT CẢ'}</b> | <b>${mixByGroup.totalPureOrders} đơn MIX cùng nhóm</b> (${mixByGroup.totalPurePcs} PCS) | <b>${mixByGroup.totalCrossOrders} đơn MIX chéo nhóm</b> (${mixByGroup.totalCrossPcs} PCS) | In lúc: ${new Date().toLocaleString('vi-VN')}</div>
            </div>
            <button onclick="window.print()" style="padding: 6px 14px; background-color: #047857; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In Bảng Này</button>
          </div>

          <h2>PHẦN 1: CÁC ĐƠN MIX THUẦN CÙNG 1 NHÓM HÀNG (${mixByGroup.totalPureOrders} ĐƠN - LẤY TẠI 1 KỆ)</h2>
          ${pureSectionsHtml || '<p style="color:#64748b; font-style:italic;">Không có đơn MIX thuần cùng nhóm</p>'}

          <h2>PHẦN 2: CÁC ĐƠN MIX CHÉO NHIỀU NHÓM HÀNG (${mixByGroup.totalCrossOrders} ĐƠN)</h2>
          ${crossSectionsHtml || '<p style="color:#64748b; font-style:italic;">Không có đơn MIX chéo nhóm</p>'}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // In Bảng Lấy Hàng MIX theo Từng Khu Vực (YD-W, YD-D, YD-K,...)
  const handlePrintByAreaTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Trình duyệt đang chặn popup. Vui lòng cho phép popup để in.');
      return;
    }

    const sectionsHtml = skusGroupedByArea
      .map(
        (group) => `
        <div style="margin-bottom: 24px; page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1e3a8a; color: #fff; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 14px; font-weight: bold;">
              📍 KHU VỰC KỆ: ${group.area} &mdash; Tổng cộng: ${group.totalAreaQty} PCS (${group.skus.length} mã SKU, phục vụ ${group.distinctOrdersCount} đơn MIX)
            </div>
            <div style="font-size: 11px; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">
              Nhặt 1 lượt tại khu này
            </div>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f8fafc; font-size: 11px; text-align: left;">
                <th style="width: 35px; text-align: center; padding: 6px; border-bottom: 1px solid #cbd5e1;">STT</th>
                <th style="width: 150px; padding: 6px; border-bottom: 1px solid #cbd5e1;">Mã SKU</th>
                <th style="width: 90px; text-align: center; padding: 6px; border-bottom: 1px solid #cbd5e1;">SL Cần Lấy</th>
                <th style="width: 90px; text-align: center; padding: 6px; border-bottom: 1px solid #cbd5e1;">Số Đơn Trùng</th>
                <th style="width: 180px; padding: 6px; border-bottom: 1px solid #cbd5e1;">SKU Mua Kèm</th>
                <th style="padding: 6px; border-bottom: 1px solid #cbd5e1;">Mã Đơn Cần Cấp Hàng</th>
              </tr>
            </thead>
            <tbody>
              ${group.skus
                .map(
                  (item, idx) => `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                  <td style="text-align: center; padding: 6px; font-weight: bold;">${idx + 1}</td>
                  <td style="padding: 6px; font-family: monospace; font-weight: bold; font-size: 12px; color: #0f172a;">${item.sku}</td>
                  <td style="text-align: center; padding: 6px; font-weight: bold; color: #dc2626; font-size: 13px;">${item.totalQty} PCS</td>
                  <td style="text-align: center; padding: 6px; font-weight: bold; color: #2563eb;">${item.orderCount} đơn</td>
                  <td style="padding: 6px; color: #475569; font-size: 10px;">
                    ${item.coOccurringSkus.slice(0, 3).map((c) => `${c.sku} (${c.totalQty})`).join(', ') || '-'}
                  </td>
                  <td style="padding: 6px; font-family: monospace; font-size: 9.5px; color: #334155; word-break: break-all;">
                    ${item.orders.map((o) => o.orderNo).join(', ')}
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bảng Lấy Hàng Đơn MIX Gom Theo Từng Khu Vực Kệ</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; color: #111; font-size: 12px; }
            h1 { font-size: 16px; margin: 0 0 4px 0; color: #1e3a8a; }
            .header-info { margin-bottom: 14px; font-size: 11px; color: #64748b; }
            @media print {
              button { display: none; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <div>
              <h1>BẢNG TỔNG HỢP NHẶT HÀNG ĐƠN MIX THEO TỪNG KHU VỰC KỆ (LẤY 1 LẦN)</h1>
              <div class="header-info">Picking List: <b>${selectedPickingList || 'TẤT CẢ'}</b> | Gom theo <b>${skusGroupedByArea.length} khu vực kệ</b> | Tổng cộng <b>${mixAnalysis.totalMixOrders} đơn MIX</b> (${mixAnalysis.totalMixPcs} PCS) | In lúc: ${new Date().toLocaleString('vi-VN')}</div>
            </div>
            <button onclick="window.print()" style="padding: 6px 14px; background-color: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In Bảng Theo Khu Vực</button>
          </div>

          ${sectionsHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // In Bảng Tổng Hợp Lấy Hàng Tất Cả SKU Trong Đơn MIX (Toàn bộ kho)
  const handlePrintFullMixTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Trình duyệt đang chặn popup. Vui lòng cho phép popup để in.');
      return;
    }

    const rowsHtml = filteredSkus
      .map(
        (item, idx) => `
        <tr>
          <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${idx + 1}</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; font-size: 13px;">${item.sku}</td>
          <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold;">${item.area}</td>
          <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #dc2626; font-size: 14px;">${item.totalQty} PCS</td>
          <td style="text-align:center; padding: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #2563eb;">${item.orderCount} đơn</td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-size: 11px; color: #475569;">
            ${item.coOccurringSkus.slice(0, 4).map(c => `${c.sku} (${c.totalQty})`).join(', ') || '-'}
          </td>
          <td style="padding: 6px; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10px; color: #334155; word-break: break-all;">
            ${item.orders.map(o => o.orderNo).join(', ')}
          </td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bảng Tổng Hợp SKU Trùng Nhặt Hàng Đơn MIX</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 15px; color: #111; font-size: 12px; }
            h1 { font-size: 16px; margin: 0 0 4px 0; color: #1e3a8a; }
            .header-info { margin-bottom: 12px; font-size: 11px; color: #64748b; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th { background-color: #f1f5f9; padding: 8px 6px; border: 1px solid #cbd5e1; text-align: left; font-size: 11px; font-weight: bold; }
            @media print {
              button { display: none; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
            <div>
              <h1>BẢNG TỔNG HỢP SKU TRÙNG NHAU TRONG ĐƠN HÀNG MIX (LẤY 1 LẦN)</h1>
              <div class="header-info">Picking List: <b>${selectedPickingList || 'TẤT CẢ'}</b> | Tổng cộng: <b>${mixAnalysis.totalMixOrders} đơn MIX</b> (${mixAnalysis.totalMixPcs} PCS) | Ngày in: ${new Date().toLocaleString('vi-VN')}</div>
            </div>
            <button onclick="window.print()" style="padding: 6px 14px; background-color: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In Bảng Này</button>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">STT</th>
                <th style="width: 140px;">Mã SKU</th>
                <th style="width: 70px; text-align: center;">Khu Vực</th>
                <th style="width: 85px; text-align: center;">Tổng PCS Cần Lấy</th>
                <th style="width: 80px; text-align: center;">Số Đơn Trùng</th>
                <th style="width: 180px;">SKU Thường Mua Kèm</th>
                <th>Danh Sách Mã Đơn Cần Giao SKU Này</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // In phiếu gom đơn MIX cho 1 SKU đang chọn
  const handlePrintMixCluster = (summary: SkuInMixSummary) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Trình duyệt đang chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để in.');
      return;
    }

    const orderRowsHtml = summary.orders
      .map(
        (order, idx) => `
        <tr>
          <td style="text-align:center; padding: 6px; border: 1px solid #ddd;">${idx + 1}</td>
          <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; font-family: monospace;">${order.orderNo}</td>
          <td style="padding: 6px; border: 1px solid #ddd; font-family: monospace;">${order.trackingNo || '-'}</td>
          <td style="text-align:center; padding: 6px; border: 1px solid #ddd; font-weight: bold;">${order.totalQty} PCS</td>
          <td style="padding: 6px; border: 1px solid #ddd;">
            ${order.items
              .map((it) => {
                const isPrimary = it.sku === summary.sku;
                return `<span style="display:inline-block; margin-right: 8px; padding: 2px 6px; border-radius: 4px; ${
                  isPrimary
                    ? 'background-color: #fee2e2; color: #991b1b; font-weight: bold; border: 1px solid #f87171;'
                    : 'background-color: #f3f4f6; color: #374151;'
                }">${it.sku} &times; <b>${it.qty}</b></span>`;
              })
              .join(' ')}
          </td>
        </tr>
      `
      )
      .join('');

    const coSkusHtml = summary.coOccurringSkus
      .map(
        (co) => `
        <div style="display:inline-block; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; margin: 4px; background-color: #f8fafc;">
          <div style="font-weight: bold; color: #1e293b; font-size: 13px;">${co.sku}</div>
          <div style="font-size: 11px; color: #64748b;">Khu vực: <b>${co.area}</b> | Cần lấy: <b style="color:#d97706;">${co.totalQty} PCS</b> (${co.orderCount} đơn)</div>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Phiếu Nhặt Hàng Gom Đơn MIX - SKU ${summary.sku}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #111; }
            h1 { font-size: 18px; margin: 0 0 6px 0; }
            .header-box { border: 2px solid #2563eb; background-color: #eff6ff; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
            .directive-box { border: 2px dashed #dc2626; background-color: #fef2f2; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th { background-color: #f1f5f9; padding: 8px; border: 1px solid #cbd5e1; text-align: left; }
            @media print {
              button { display: none; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
            <div>
              <h1>PHIẾU GOM NHẶT ĐƠN MIX THEO SKU TRÙNG LẶP (1-TRIP PICKING)</h1>
              <div style="font-size: 12px; color: #666;">Ngày in: ${new Date().toLocaleString('vi-VN')} | Picking List: ${selectedPickingList || 'TẤT CẢ'}</div>
            </div>
            <button onclick="window.print()" style="padding: 8px 16px; background-color: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In Phiếu Này</button>
          </div>

          <div class="directive-box">
            <div style="font-size: 14px; font-weight: bold; color: #991b1b; margin-bottom: 4px;">
              🚀 HƯỚNG DẪN LẤY HÀNG 1 LẦN:
            </div>
            <div style="font-size: 15px; color: #1e293b;">
              1. Đến khu vực <b>[${summary.area}]</b> lấy 1 lần duy nhất <b style="color: #dc2626; font-size: 18px;">${summary.totalQty} PCS</b> mã <b>${summary.sku}</b>.
            </div>
            <div style="font-size: 13px; color: #475569; margin-top: 4px;">
              2. Mã này trùng lặp trong <b>${summary.orderCount} đơn hàng MIX khác nhau</b>.
            </div>
          </div>

          <div class="header-box">
            <div style="font-weight: bold; color: #1e40af; margin-bottom: 6px; font-size: 13px;">
              📦 CÁC SKU PHỤ CẦN NHẶT KÈM ĐỂ ĐÓNG GÓI ${summary.orderCount} ĐƠN TRÊN:
            </div>
            <div>
              ${coSkusHtml || '<span style="font-size: 12px; color: #64748b;">Không có SKU phụ nào</span>'}
            </div>
          </div>

          <div style="font-weight: bold; margin-top: 16px; margin-bottom: 6px; font-size: 14px;">
            📋 DANH SÁCH ${summary.orderCount} ĐƠN HÀNG CẦN ĐÓNG GÓI:
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">STT</th>
                <th style="width: 140px;">Mã Đơn (Order No)</th>
                <th style="width: 140px;">Mã Vận Đơn (Tracking No)</th>
                <th style="width: 80px; text-align: center;">Tổng PCS</th>
                <th>Chi tiết các món trong kiện (SKU & SL)</th>
              </tr>
            </thead>
            <tbody>
              ${orderRowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Tính các cặp SKU thường đi cùng nhau
  const popularPairs = useMemo(() => {
    const pairMap: Record<string, { sku1: string; sku2: string; count: number; area1: string; area2: string }> = {};

    mixAnalysis.allMixOrders.forEach((order) => {
      const skus: string[] = Array.from(new Set(order.items.map((i) => i.sku)));
      for (let i = 0; i < skus.length; i++) {
        for (let j = i + 1; j < skus.length; j++) {
          const s1: string = skus[i] < skus[j] ? skus[i] : skus[j];
          const s2: string = skus[i] < skus[j] ? skus[j] : skus[i];
          const key = `${s1} <-> ${s2}`;
          if (!pairMap[key]) {
            pairMap[key] = {
              sku1: s1,
              sku2: s2,
              count: 0,
              area1: mixAnalysis.rankedSkus.find((r) => r.sku === s1)?.area || 'Khác',
              area2: mixAnalysis.rankedSkus.find((r) => r.sku === s2)?.area || 'Khác',
            };
          }
          pairMap[key].count += 1;
        }
      }
    });

    return Object.values(pairMap).sort((a, b) => b.count - a.count).slice(0, 15);
  }, [mixAnalysis]);

  return (
    <div className="space-y-6">
      {/* 0. Yoga Mat Exclusion Filter Bar */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/90 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-900">Bóc Tách & Loại Trừ Thảm Yoga</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                20 mã SKU: YD-B8, YD-B9, YD-L28, YD-L29
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Đơn Thảm Yoga có quy cách đóng gói riêng. Bóc tách loại trừ để gom các đơn MIX thông thường &amp; phụ kiện không bị lẫn lộn.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-white/95 backdrop-blur-xs rounded-xl border border-emerald-200 shadow-2xs self-start md:self-auto overflow-x-auto">
          <button
            onClick={() => setYogaFilter('exclude')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              yogaFilter === 'exclude'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Loại Trừ Thảm Yoga ({mixAnalysis.totalNonYogaMixOrdersCount ?? 0} đơn)
          </button>
          <button
            onClick={() => setYogaFilter('only')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              yogaFilter === 'only'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Chỉ Đơn MIX Thảm Yoga ({mixAnalysis.totalYogaMixOrdersCount ?? 0} đơn)
          </button>
          <button
            onClick={() => setYogaFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              yogaFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Tất Cả ({mixAnalysis.totalAllMixOrdersCount ?? 0} đơn)
          </button>
        </div>
      </div>

      {mixAnalysis.totalMixOrders === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-xs max-w-xl mx-auto space-y-3">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
            <Boxes className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            {yogaFilter === 'exclude'
              ? 'Không có đơn MIX thông thường nào (ngoài Thảm Yoga)'
              : yogaFilter === 'only'
              ? 'Không có đơn MIX nào chứa Thảm Yoga'
              : 'Không có đơn hàng MIX nào'}
          </h3>
          <p className="text-sm text-gray-500">
            {yogaFilter === 'exclude' && (mixAnalysis.totalYogaMixOrdersCount ?? 0) > 0
              ? `Tất cả ${mixAnalysis.totalYogaMixOrdersCount} đơn MIX hiện tại đều là đơn Thảm Yoga (đã được loại trừ). Bạn có thể bấm nút "Chỉ Đơn MIX Thảm Yoga" hoặc "Tất Cả" ở trên để xem.`
              : 'Toàn bộ các đơn hàng trong danh sách hiện tại đều là đơn 1 SKU duy nhất hoặc không có đơn MIX phù hợp với bộ lọc.'}
          </p>
        </div>
      ) : (
        <>
          {/* 1. Header KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card Top SKU Trùng Nhiều Đơn Nhất */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden md:col-span-2">
          <div className="absolute top-2 right-2 opacity-15">
            <TrendingUp className="w-28 h-28" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-yellow-200 fill-yellow-200" /> SKU Trùng Lặp Nhiều Nhất Giữa Các Đơn MIX
            </span>
          </div>
          {top1Sku ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black tracking-tight font-mono">{top1Sku.sku}</span>
                <span className="text-xs bg-white text-orange-700 font-bold px-2.5 py-1 rounded-lg">
                  Khu vực kệ: {top1Sku.area}
                </span>
              </div>
              <div className="flex items-center gap-4 text-amber-100 text-xs">
                <div>
                  Trùng lặp trong: <b className="text-white text-base font-bold">{top1Sku.orderCount} đơn MIX khác nhau</b>
                </div>
                <div>•</div>
                <div>
                  Tổng SL cần lấy: <b className="text-white text-base font-bold">{top1Sku.totalQty} PCS</b>
                </div>
                <div>•</div>
                <div>
                  Tỷ lệ: <b className="text-white font-bold">{((top1Sku.orderCount / mixAnalysis.totalMixOrders) * 100).toFixed(0)}%</b> đơn MIX
                </div>
              </div>
              <p className="text-[11px] text-orange-100/95 pt-1.5 border-t border-white/20 flex items-center gap-1.5">
                <span>💡 <b>Quy trình gom hàng:</b> Thay vì đi nhiều lần, nhân viên chỉ cần ra kệ <b>{top1Sku.area}</b> lấy 1 lần <b>{top1Sku.totalQty} PCS</b> là cấp đủ mã này cho <b>{top1Sku.orderCount} đơn MIX</b>!</span>
              </p>
            </div>
          ) : null}
        </div>

        {/* Card Total Mix Orders */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Đơn Hàng MIX</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-gray-800 font-mono">{mixAnalysis.totalMixOrders}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Chiếm {((mixAnalysis.totalMixOrders / (orders.length || 1)) * 100).toFixed(1)}% tổng đơn trong đợt
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${(mixAnalysis.totalMixOrders / (orders.length || 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Card Total Distinct SKUs in Mix */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Số Mã SKU Trong Đơn MIX</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 font-mono">{mixAnalysis.distinctSkusInMix} <span className="text-xs font-normal text-gray-500">Mã SKU</span></div>
            <div className="text-xs text-gray-500 mt-0.5">
              Tổng cộng <b>{mixAnalysis.totalMixPcs} PCS</b> hàng
            </div>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-2">
            <Layers className="w-3 h-3 text-emerald-600" />
            TB {(mixAnalysis.totalMixPcs / (mixAnalysis.totalMixOrders || 1)).toFixed(1)} PCS/đơn MIX
          </div>
        </div>
      </div>

      {/* 2. Mode Tabs & Search Filter Controls */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Mode switch buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto">
            <button
              onClick={() => setViewMode('by_group')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'by_group'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Target className="w-3.5 h-3.5 text-emerald-600" />
              Bóc Tách Đơn MIX Theo Nhóm Hàng (Cùng Nhóm & Chéo Nhóm)
            </button>
            <button
              onClick={() => setViewMode('by_area')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'by_area'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Gom Đơn MIX Theo Khu Vực Kệ (YD-W, YD-D...)
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Bảng Tổng Hợp SKU Trùng Lặp (Toàn Bộ Kho)
            </button>
            <button
              onClick={() => setViewMode('cluster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'cluster'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              Chi Tiết Từng SKU & Kế Hoạch Gom Hàng 1 Lần
            </button>
            <button
              onClick={() => setViewMode('combos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                viewMode === 'combos'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Top Cặp SKU Hay Mua Kèm (Combos)
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {viewMode === 'by_group' ? (
              <button
                onClick={handlePrintByGroupTable}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="In bảng bóc tách đơn MIX theo nhóm hàng cùng nhóm và chéo nhóm"
              >
                <Printer className="w-3.5 h-3.5" />
                In Bảng Theo Nhóm Hàng
              </button>
            ) : (
              <button
                onClick={handlePrintByAreaTable}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="In phiếu nhặt hàng gom theo từng khu vực kệ YD-W, YD-D..."
              >
                <Printer className="w-3.5 h-3.5" />
                In Theo Khu Vực Kệ
              </button>
            )}
            <button
              onClick={handlePrintFullMixTable}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200"
            >
              <Printer className="w-3.5 h-3.5" />
              In Bảng Tổng Toàn Kho
            </button>
            <button
              onClick={() =>
                handleCopyOrders(
                  mixAnalysis.allMixOrders.map((o) => o.orderNo),
                  'all-mix-orders'
                )
              }
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'all-mix-orders' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Đã copy {mixAnalysis.totalMixOrders} mã đơn!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Tất Cả {mixAnalysis.totalMixOrders} Mã Đơn MIX
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã SKU, nhóm hàng hoặc mã đơn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Area Filter */}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
            <option value="ALL">Tất cả khu vực ({availableAreas.length})</option>
            {availableAreas.map((a) => (
              <option key={a} value={a}>
                Khu vực {a}
              </option>
            ))}
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'area_orders' | 'orders' | 'qty' | 'sku')}
            className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
          >
            <option value="area_orders">Sắp xếp: Gom theo Khu vực kệ &rarr; Trùng nhiều đơn nhất</option>
            <option value="orders">Sắp xếp: Trùng nhiều Đơn MIX nhất trước (Toàn kho)</option>
            <option value="qty">Sắp xếp: Tổng SL PCS lấy nhiều nhất trước</option>
            <option value="sku">Sắp xếp: Theo Tên Mã SKU (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 3. MAIN CONTENT BASED ON ACTIVE TAB */}

      {/* TAB 0: BÓC TÁCH ĐƠN MIX THEO NHÓM HÀNG (CÙNG NHÓM & CHÉO NHÓM) */}
      {viewMode === 'by_group' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-emerald-800/40">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-emerald-300 uppercase flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  Bóc Tách & Gom Đơn Hàng MIX Theo Nhóm Sản Phẩm
                </span>
                <h2 className="text-xl font-black mt-1">
                  Tổng Hợp {mixByGroup.totalPureOrders} Đơn MIX Cùng Nhóm & {mixByGroup.totalCrossOrders} Đơn MIX Chéo Nhóm
                </h2>
                <p className="text-xs text-emerald-200 mt-1 max-w-2xl">
                  Hệ thống tự động lọc ra các <b>Đơn MIX thuần cùng 1 nhóm hàng</b> (nhân viên chỉ cần đứng tại 1 kệ là nhặt xong toàn bộ đơn) và tổng hợp toàn bộ các <b>Đơn MIX chéo nhóm</b>.
                </p>
              </div>

              {/* Grouping mode switcher */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-black/25 p-2 rounded-xl border border-white/10 shrink-0">
                <span className="text-[11px] font-semibold text-emerald-200 whitespace-nowrap">Quy cách gom nhóm:</span>
                <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg">
                  <button
                    onClick={() => setGroupingType('model')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      groupingType === 'model'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    Theo Dòng Model (YD-W82, YD-D107...)
                  </button>
                  <button
                    onClick={() => setGroupingType('area')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      groupingType === 'area'
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : 'text-emerald-200 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    Theo Khu Vực Kệ (YD-W, YD-D...)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PCS Breakdown & Quick Copy Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <span>Bóc Tách Số Lượng PCS Trong Đơn MIX</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                      Tổng {mixByGroup.totalMixOrders} Đơn
                    </span>
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    Bóc tách đơn hàng theo số lượng sản phẩm (2 PCS, 3 PCS, 4 PCS, 5 PCS, 6 PCS, ≥7 PCS) &mdash; Cho phép sao chép nhanh từng phân loại hoặc sao chép tổng.
                  </p>
                </div>
              </div>

              {/* Quick Batch Copy Total & Global Actions */}
              <div className="flex flex-wrap items-center gap-1.5 self-start md:self-center">
                <button
                  onClick={() =>
                    handleCopyOrders(
                      mixByGroup.allMixOrders.map((o) => o.orderNo),
                      'global-mix-all'
                    )
                  }
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'global-mix-all' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      Đã copy toàn bộ {mixByGroup.totalMixOrders} đơn MIX!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Tổng Tất Cả ({mixByGroup.totalMixOrders} Đơn MIX)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* PCS Filter Pills & Direct Copy Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Lọc & Copy PCS:
              </span>

              <button
                onClick={() => setPcsFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  pcsFilter === 'all'
                    ? 'bg-gray-900 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>Tất Cả ({mixByGroup.totalMixOrders} đơn)</span>
              </button>

              {mixByGroup.globalPcsBreakdown
                .filter((b) => b.orderCount > 0)
                .map((b) => {
                  const isSelected = pcsFilter === String(b.pcs);
                  const copyKey = `global-tier-pcs-${b.pcs}`;

                  return (
                    <div
                      key={b.pcs}
                      className={`inline-flex items-center rounded-xl border overflow-hidden shadow-2xs transition-all ${
                        isSelected
                          ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-indigo-50/70'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() =>
                          setPcsFilter(pcsFilter === String(b.pcs) ? 'all' : (String(b.pcs) as any))
                        }
                        className={`px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        title={`Bấm để lọc danh sách hiển thị chỉ gồm đơn ${b.label}`}
                      >
                        <span>{b.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                            isSelected ? 'bg-indigo-800 text-white' : 'bg-black/10 text-gray-800'
                          }`}
                        >
                          {b.orderCount} đơn
                        </span>
                      </button>

                      {/* Quick copy 1-click for this PCS tier */}
                      <button
                        onClick={() => handleCopyOrders(b.orderNos, copyKey)}
                        className={`px-2 py-1 border-l text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-700 hover:bg-indigo-800 text-white border-indigo-500'
                            : 'bg-white hover:bg-indigo-50 text-indigo-700 border-gray-200'
                        }`}
                        title={`Sao chép toàn bộ ${b.orderCount} mã đơn ${b.label}`}
                      >
                        {copiedKey === copyKey ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-300" />
                            <span>Đã copy!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-current opacity-70" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}

              {/* Combined >= 6 PCS button if both 6 and >=7 exist */}
              {(mixByGroup.globalOrdersByPcs['ge6']?.length || 0) > 0 &&
                (mixByGroup.globalOrdersByPcs['6']?.length || 0) > 0 &&
                (mixByGroup.globalOrdersByPcs['ge7']?.length || 0) > 0 && (
                  <div
                    className={`inline-flex items-center rounded-xl border overflow-hidden shadow-2xs transition-all ${
                      pcsFilter === 'ge6'
                        ? 'border-rose-400 ring-2 ring-rose-500/20 bg-rose-50'
                        : 'border-rose-200 bg-rose-50/50'
                    }`}
                  >
                    <button
                      onClick={() => setPcsFilter(pcsFilter === 'ge6' ? 'all' : 'ge6')}
                      className={`px-2.5 py-1 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        pcsFilter === 'ge6'
                          ? 'bg-rose-600 text-white'
                          : 'text-rose-900 hover:bg-rose-100'
                      }`}
                    >
                      <span>≥ 6 PCS (Tổng)</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 text-rose-900 font-bold font-mono">
                        {mixByGroup.globalOrdersByPcs['ge6']?.length || 0} đơn
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        handleCopyOrders(
                          mixByGroup.globalOrdersByPcs['ge6'] || [],
                          'global-tier-pcs-ge6'
                        )
                      }
                      className={`px-2 py-1 border-l text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                        pcsFilter === 'ge6'
                          ? 'bg-rose-700 hover:bg-rose-800 text-white border-rose-500'
                          : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                      title="Sao chép toàn bộ mã đơn có từ 6 PCS trở lên"
                    >
                      {copiedKey === 'global-tier-pcs-ge6' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-300" />
                          <span>Đã copy!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-rose-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

              {pcsFilter !== 'all' && (
                <button
                  onClick={() => setPcsFilter('all')}
                  className="px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer flex items-center gap-1 ml-auto"
                >
                  <span>&times; Xóa bộ lọc PCS (Hiển thị tất cả)</span>
                </button>
              )}
            </div>

            {pcsFilter !== 'all' && (
              <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Đang lọc hiển thị các đơn <b>{pcsFilter === 'ge6' ? '≥ 6 PCS' : pcsFilter === 'ge7' ? '≥ 7 PCS' : `${pcsFilter} PCS`}</b>: Có{' '}
                    <b>{mixByGroup.globalOrdersByPcs[pcsFilter]?.length || 0} đơn</b> phù hợp.
                  </span>
                </div>
                <button
                  onClick={() => setPcsFilter('all')}
                  className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer shrink-0"
                >
                  Xem tất cả
                </button>
              </div>
            )}
          </div>

          {/* 3 Metric Cards Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Card 1: Đơn MIX Thuần Cùng Nhóm */}
            <div
              onClick={() => setSubGroupTab('pure')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                subGroupTab === 'pure'
                  ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-white border-gray-200 hover:border-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Đơn MIX Cùng 1 Nhóm</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-emerald-700 font-mono">
                  {filteredPureGroupList.reduce((sum, g) => sum + (pcsFilter === 'all' ? g.orderCount : (g.ordersByPcs[pcsFilter]?.length || 0)), 0)}{' '}
                  <span className="text-xs font-normal text-gray-500">Đơn</span>
                  {pcsFilter !== 'all' && (
                    <span className="text-xs font-bold text-emerald-600 block">
                      (Đã lọc {pcsFilter === 'ge6' ? '≥6' : pcsFilter} PCS &bull; Gốc: {mixByGroup.totalPureOrders} đơn)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Tổng <b>{mixByGroup.totalPurePcs} PCS</b> &mdash; Chiếm{' '}
                  <b>{((mixByGroup.totalPureOrders / (mixByGroup.totalMixOrders || 1)) * 100).toFixed(1)}%</b> tổng đơn MIX
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-emerald-100 text-[11px] text-emerald-700 font-semibold flex items-center justify-between">
                <span>⭐ Nhặt siêu tốc tại 1 kệ</span>
                <span className="underline">Xem {filteredPureGroupList.length} nhóm &rarr;</span>
              </div>
            </div>

            {/* Card 2: Đơn MIX Chéo Nhiều Nhóm */}
            <div
              onClick={() => setSubGroupTab('cross')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                subGroupTab === 'cross'
                  ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white border-gray-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Đơn MIX Chéo Nhóm</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Split className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-indigo-700 font-mono">
                  {filteredCrossGroupPairs.reduce((sum, c) => sum + (pcsFilter === 'all' ? c.orderCount : (c.ordersByPcs[pcsFilter]?.length || 0)), 0)}{' '}
                  <span className="text-xs font-normal text-gray-500">Đơn</span>
                  {pcsFilter !== 'all' && (
                    <span className="text-xs font-bold text-indigo-600 block">
                      (Đã lọc {pcsFilter === 'ge6' ? '≥6' : pcsFilter} PCS &bull; Gốc: {mixByGroup.totalCrossOrders} đơn)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Tổng <b>{mixByGroup.totalCrossPcs} PCS</b> &mdash; Gồm{' '}
                  <b>{filteredCrossGroupPairs.length}</b> cặp nhóm kết hợp
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-indigo-100 text-[11px] text-indigo-700 font-semibold flex items-center justify-between">
                <span>🔀 Đơn kết hợp nhiều kệ</span>
                <span className="underline">Xem {filteredCrossGroupPairs.length} combo &rarr;</span>
              </div>
            </div>

            {/* Card 3: Bảng Tổng Hợp Chi Tiết */}
            <div
              onClick={() => setSubGroupTab('all')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                subGroupTab === 'all'
                  ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Tổng Số Nhóm Hàng</span>
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FolderTree className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-black text-blue-700 font-mono">
                  {filteredAllGroupSummaries.length}{' '}
                  <span className="text-xs font-normal text-gray-500">Nhóm</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Tổng <b>{mixAnalysis.totalMixPcs} PCS</b> ({mixAnalysis.distinctSkusInMix} SKU)
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-blue-100 text-[11px] text-blue-700 font-semibold flex items-center justify-between">
                <span>📊 Ma trận chi tiết & PCS</span>
                <span className="underline">Xem bảng tổng &rarr;</span>
              </div>
            </div>
          </div>

          {/* Sub-Tab Selector Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-2 gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSubGroupTab('pure')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  subGroupTab === 'pure'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đơn MIX Thuần Cùng Nhóm ({filteredPureGroupList.length} nhóm)
              </button>
              <button
                onClick={() => setSubGroupTab('cross')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  subGroupTab === 'cross'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                Đơn MIX Chéo Nhóm ({filteredCrossGroupPairs.length} combo)
              </button>
              <button
                onClick={() => setSubGroupTab('all')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  subGroupTab === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                Bảng Tổng Hợp Chi Tiết Toàn Bộ Nhóm ({filteredAllGroupSummaries.length})
              </button>
            </div>

            {subGroupTab === 'pure' && (
              <button
                onClick={() =>
                  handleCopyOrders(
                    filteredPureGroupList.flatMap((g) =>
                      pcsFilter === 'all' ? g.orderNos : g.ordersByPcs[pcsFilter] || []
                    ),
                    'all-pure-orders'
                  )
                }
                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                {copiedKey === 'all-pure-orders' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Đã copy mã đơn cùng nhóm!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Tất Cả Mã Đơn Cùng Nhóm
                  </>
                )}
              </button>
            )}
          </div>

          {/* SUB-TAB 1: ĐƠN MIX THUẦN CÙNG 1 NHÓM */}
          {subGroupTab === 'pure' && (
            <div className="space-y-4">
              {filteredPureGroupList.length === 0 ? (
                <div className="p-8 bg-gray-50 border border-gray-200 rounded-2xl text-center">
                  <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm font-bold text-gray-700">
                    {pcsFilter !== 'all'
                      ? `Không có đơn MIX thuần cùng nhóm nào có ${pcsFilter} PCS`
                      : 'Không tìm thấy đơn MIX thuần cùng 1 nhóm'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {pcsFilter !== 'all' ? (
                      <button
                        onClick={() => setPcsFilter('all')}
                        className="text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        Bấm vào đây để xem lại toàn bộ các mức PCS
                      </button>
                    ) : (
                      'Tất cả các đơn MIX trong đợt này đều là đơn kết hợp chéo giữa các dòng sản phẩm khác nhau.'
                    )}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPureGroupList.map((group, idx) => {
                    const targetOrderNos =
                      pcsFilter === 'all' ? group.orderNos : group.ordersByPcs[pcsFilter] || [];

                    return (
                      <div
                        key={group.groupName}
                        className="bg-white rounded-2xl border border-emerald-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
                      >
                        {/* Group Header */}
                        <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50/50 border-b border-emerald-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <div>
                              <span className="text-xs font-black text-emerald-950 font-mono">
                                NHÓM {group.groupName}
                              </span>
                              <div className="text-[10px] text-emerald-700">
                                {group.skuBreakdown.length} mã SKU trong nhóm
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-2xs">
                              {group.orderCount} Đơn MIX
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                              {group.totalPcs} PCS
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 space-y-3">
                          {/* PCS Breakdown Badges inside the group */}
                          <div className="bg-emerald-50/50 rounded-xl p-2 border border-emerald-100 space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between">
                              <span>Bóc Tách Số Lượng PCS:</span>
                              <span className="text-emerald-600 font-normal">
                                {group.pcsBreakdown.filter((b) => b.orderCount > 0).length} mức kết hợp
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {group.pcsBreakdown
                                .filter((b) => b.orderCount > 0)
                                .map((b) => (
                                  <span
                                    key={b.pcs}
                                    className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-white border border-emerald-200 text-emerald-900 shadow-2xs inline-flex items-center gap-1"
                                  >
                                    <span className="text-emerald-700">{b.label}:</span>
                                    <b className="text-gray-900 font-black">{b.orderCount} đơn</b>
                                    <span className="text-[9px] text-gray-500 font-normal">
                                      ({b.totalPcs} PCS)
                                    </span>
                                  </span>
                                ))}
                            </div>
                          </div>

                          {/* SKU Breakdown Chips */}
                          <div>
                            <div className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center justify-between mb-1.5">
                              <span>Danh sách SKU cần lấy gom:</span>
                              <span className="text-gray-400 font-normal">Nhặt 1 lượt tại kệ này</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {group.skuBreakdown.map((item) => (
                                <div
                                  key={item.sku}
                                  className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between"
                                >
                                  <span className="font-mono text-xs font-bold text-gray-800">{item.sku}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black text-rose-600">{item.qty} PCS</span>
                                    <span className="text-[10px] text-gray-400">({item.orderCount} đơn)</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Order Nos List & Quick Copy Group Buttons */}
                          <div className="pt-2 border-t border-gray-100 space-y-2">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                  Mã đơn cần cấp ({targetOrderNos.length}):
                                </span>
                                <button
                                  onClick={() =>
                                    handleCopyOrders(
                                      group.orderNos,
                                      `pure-group-${group.groupName}-total`
                                    )
                                  }
                                  className="text-[11px] text-emerald-800 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors shadow-2xs"
                                  title="Sao chép toàn bộ mã đơn của nhóm này"
                                >
                                  {copiedKey === `pure-group-${group.groupName}-total` ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                                      Đã copy {group.orderNos.length} đơn!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      Copy Tổng ({group.orderNos.length} đơn)
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Mini Quick Copy Buttons for each PCS level */}
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] text-gray-400 font-medium mr-0.5">
                                  Copy theo PCS:
                                </span>
                                {group.pcsBreakdown
                                  .filter((b) => b.orderCount > 0)
                                  .map((b) => {
                                    const copyKey = `pure-${group.groupName}-pcs-${b.pcs}`;
                                    return (
                                      <button
                                        key={b.pcs}
                                        onClick={() => handleCopyOrders(b.orderNos, copyKey)}
                                        className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 border border-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                                        title={`Copy ${b.orderCount} đơn ${b.label}`}
                                      >
                                        {copiedKey === copyKey ? (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                          <Copy className="w-3 h-3 text-gray-400" />
                                        )}
                                        <span>
                                          {b.label} ({b.orderCount}đ)
                                        </span>
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>

                            <div className="p-2 bg-gray-50 rounded-lg text-[10px] font-mono text-gray-700 max-h-16 overflow-y-auto leading-relaxed border border-gray-200/60">
                              {formatCompactOrderList(targetOrderNos)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUB-TAB 2: ĐƠN MIX CHÉO NHIỀU NHÓM (COMBOS) */}
          {subGroupTab === 'cross' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <b>Đơn MIX Chéo Nhóm:</b> Là các đơn hàng khách mua kết hợp từ 2 nhóm sản phẩm trở lên (Ví dụ: Thảm Yoga + Bình nước). Gom theo cặp nhóm giúp người nhặt hàng chuẩn bị xe gom đi theo lộ trình ngắn nhất.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredCrossGroupPairs.map((pair, idx) => {
                  const targetOrderNos =
                    pcsFilter === 'all' ? pair.orderNos : pair.ordersByPcs[pcsFilter] || [];

                  return (
                    <div
                      key={pair.groupComboKey}
                      className="bg-white rounded-2xl border border-indigo-200 shadow-2xs hover:shadow-xs transition-all overflow-hidden flex flex-col justify-between"
                    >
                      <div className="p-3 bg-gradient-to-r from-indigo-50 to-blue-50/50 border-b border-indigo-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="text-xs font-black text-indigo-950 font-mono">
                            {pair.groupComboKey}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white">
                            {pair.orderCount} Đơn
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                            {pair.totalPcs} PCS
                          </span>
                        </div>
                      </div>

                      <div className="p-3 space-y-2.5">
                        {/* PCS Breakdown for cross pair */}
                        <div className="flex flex-wrap gap-1">
                          {pair.pcsBreakdown
                            .filter((b) => b.orderCount > 0)
                            .map((b) => (
                              <span
                                key={b.pcs}
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-50 border border-indigo-200 text-indigo-800"
                              >
                                {b.label}: {b.orderCount}đ
                              </span>
                            ))}
                        </div>

                        <div className="text-[10px] text-gray-500">
                          <b>SKU liên quan:</b> {pair.skuList.join(', ')}
                        </div>

                        <div className="pt-2 border-t border-gray-100 space-y-1.5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Mã đơn ({targetOrderNos.length}):
                              </span>
                              <button
                                onClick={() =>
                                  handleCopyOrders(
                                    pair.orderNos,
                                    `cross-combo-${pair.groupComboKey}-total`
                                  )
                                }
                                className="text-[10px] text-indigo-700 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                              >
                                {copiedKey === `cross-combo-${pair.groupComboKey}-total` ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    Đã copy {pair.orderNos.length} mã!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    Copy Tổng ({pair.orderNos.length}đ)
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Mini copy by PCS for cross pair */}
                            <div className="flex flex-wrap items-center gap-1">
                              {pair.pcsBreakdown
                                .filter((b) => b.orderCount > 0)
                                .map((b) => {
                                  const copyKey = `cross-${pair.groupComboKey}-pcs-${b.pcs}`;
                                  return (
                                    <button
                                      key={b.pcs}
                                      onClick={() => handleCopyOrders(b.orderNos, copyKey)}
                                      className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 border border-gray-200 transition-colors flex items-center gap-0.5 cursor-pointer"
                                      title={`Copy ${b.orderCount} đơn ${b.label}`}
                                    >
                                      {copiedKey === copyKey ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-2.5 h-2.5 text-gray-400" />
                                      )}
                                      <span>
                                        {b.label} ({b.orderCount})
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>

                          <div className="p-1.5 bg-gray-50 rounded-lg text-[10px] font-mono text-gray-700 max-h-16 overflow-y-auto leading-relaxed border border-gray-200/60">
                            {formatCompactOrderList(targetOrderNos)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: BẢNG TỔNG HỢP TOÀN BỘ CÁC NHÓM */}
          {subGroupTab === 'all' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Bảng Thống Kê Chi Tiết Toàn Bộ Nhóm Hàng Trong Đơn MIX ({filteredAllGroupSummaries.length} Nhóm)
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Thống kê chi tiết từng nhóm hàng, bóc tách số lượng theo PCS (2đ, 3đ, 4đ, 5đ, 6đ, ≥7đ), đơn thuần 1 nhóm, đơn chéo nhóm và cho phép copy theo từng mức hoặc copy tổng.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700 text-xs uppercase font-bold border-b border-gray-200">
                      <th className="py-2.5 px-3 text-center w-12">STT</th>
                      <th className="py-2.5 px-3 min-w-[130px]">Tên Nhóm Hàng</th>
                      <th className="py-2.5 px-3 text-center">Tổng Đơn MIX</th>
                      <th className="py-2.5 px-3 min-w-[220px]">Bóc Tách Số Đơn Theo PCS</th>
                      <th className="py-2.5 px-3 text-center">Thuần 1 Nhóm (100%)</th>
                      <th className="py-2.5 px-3 text-center">Chéo Nhóm</th>
                      <th className="py-2.5 px-3 text-center">Tổng PCS</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Các Mã SKU Trực Thuộc</th>
                      <th className="py-2.5 px-3 text-center min-w-[140px]">Thao Tác Copy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredAllGroupSummaries.map((item, idx) => (
                      <tr key={item.groupName} className="hover:bg-blue-50/40 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-gray-500">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-black text-gray-900 text-sm">
                          {item.groupName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-blue-700 font-mono text-sm">
                          {item.totalOrders} đơn
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {item.pcsBreakdown
                              .filter((b) => b.orderCount > 0)
                              .map((b) => (
                                <span
                                  key={b.pcs}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border inline-flex items-center gap-0.5 ${
                                    b.pcs === 2
                                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                                      : b.pcs === 3
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : b.pcs === 4
                                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                                      : b.pcs === 5
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : 'bg-orange-50 text-orange-800 border-orange-200'
                                  }`}
                                  title={`${b.label}: ${b.orderCount} đơn (${b.totalPcs} PCS)`}
                                >
                                  <span>{b.label}:</span>
                                  <b className="text-gray-900">{b.orderCount}đ</b>
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold font-mono">
                          {item.pureOrders > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                              {item.pureOrders} đơn
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-gray-700">
                          {item.crossOrders > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold">
                              {item.crossOrders} đơn
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-black text-rose-600 font-mono text-sm">
                          {item.totalPcs} PCS
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {item.skus.map((s) => (
                              <span
                                key={s.sku}
                                className="px-1.5 py-0.5 bg-gray-100 rounded text-[11px] font-mono text-gray-700 border border-gray-200"
                              >
                                {s.sku} <b>({s.qty})</b>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() =>
                                handleCopyOrders(item.allOrderNos, `summary-group-${item.groupName}`)
                              }
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer border border-indigo-200 w-full justify-center"
                              title="Copy toàn bộ mã đơn có mặt nhóm này"
                            >
                              {copiedKey === `summary-group-${item.groupName}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Đã copy!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy Tổng ({item.allOrderNos.length}đ)
                                </>
                              )}
                            </button>

                            {/* Mini copy by PCS */}
                            <div className="flex flex-wrap items-center justify-center gap-0.5">
                              {item.pcsBreakdown
                                .filter((b) => b.orderCount > 0)
                                .map((b) => {
                                  const copyKey = `sum-${item.groupName}-pcs-${b.pcs}`;
                                  return (
                                    <button
                                      key={b.pcs}
                                      onClick={() => handleCopyOrders(b.orderNos, copyKey)}
                                      className="px-1 py-0.5 text-[9px] font-bold rounded bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-0.5 cursor-pointer"
                                      title={`Copy ${b.orderCount} đơn ${b.label}`}
                                    >
                                      {copiedKey === copyKey ? (
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                      ) : null}
                                      <span>
                                        {b.pcs}đ ({b.orderCount})
                                      </span>
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: GOM ĐƠN MIX THEO KHU VỰC KỆ (YD-W, YD-D, YD-K,...) */}
      {viewMode === 'by_area' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-blue-800/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold tracking-wider text-blue-300 uppercase flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Quy Trình Nhặt Hàng Gom Theo Từng Khu Vực Kệ (1-Trip Picking Per Area)
                </span>
                <h2 className="text-xl font-black mt-1">
                  Đã Phân Bổ Thành {skusGroupedByArea.length} Khu Vực Kệ ({mixAnalysis.totalMixOrders} Đơn MIX)
                </h2>
                <p className="text-xs text-blue-200 mt-1 max-w-2xl">
                  Nhân viên chỉ cần đến từng khu vực (VD: <b>Khu YD-W</b>), nhặt toàn bộ các mã SKU được liệt kê từ trên xuống (xếp theo số đơn trùng nhiều nhất &rarr; ít nhất) là cấp đủ hàng cho các đơn MIX liên quan!
                </p>
              </div>
              <button
                onClick={handlePrintByAreaTable}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-center shrink-0"
              >
                <Printer className="w-4 h-4" />
                In Phiếu Gom Theo Khu Vực
              </button>
            </div>
          </div>

          {/* Danh sách từng khu vực */}
          <div className="space-y-5">
            {skusGroupedByArea.map((group, groupIdx) => (
              <div
                key={group.area}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden"
              >
                {/* Header từng khu vực */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50/40 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-2xs">
                      #{groupIdx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-gray-900 font-mono">
                          KHU VỰC KỆ: <span className="text-blue-700">{group.area}</span>
                        </h3>
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-xs">
                          {group.skus.length} Mã SKU
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Cần lấy 1 lượt tổng cộng <b className="text-rose-600 font-mono font-bold text-sm">{group.totalAreaQty} PCS</b> &mdash; Phục vụ <b className="text-blue-600 font-bold">{group.distinctOrdersCount} đơn MIX</b>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyOrders(group.distinctOrderNos, `area-${group.area}`)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedKey === `area-${group.area}` ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Đã copy {group.distinctOrdersCount} mã đơn!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy {group.distinctOrdersCount} Mã Đơn Khu Này
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bảng SKU trong khu vực này (sắp xếp từ trùng nhiều nhất đến ít nhất) */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">STT</th>
                        <th className="py-2.5 px-4 w-48">Mã SKU</th>
                        <th className="py-2.5 px-3 w-36 text-center">SL Cần Lấy (PCS)</th>
                        <th className="py-2.5 px-3 w-40 text-center">Trùng Trong Đơn MIX</th>
                        <th className="py-2.5 px-4 min-w-[200px]">SKU Mua Kèm Thường Gặp</th>
                        <th className="py-2.5 px-4 min-w-[220px]">Danh Sách Mã Đơn Cần Giao</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {group.skus.map((item, idx) => (
                        <tr
                          key={item.sku}
                          className="hover:bg-blue-50/40 transition-colors"
                        >
                          <td className="py-3 px-3 text-center text-gray-400 font-mono font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 font-mono font-black text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{item.sku}</span>
                              <button
                                onClick={() => {
                                  setSelectedSku(item.sku);
                                  setViewMode('cluster');
                                }}
                                className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded cursor-pointer hover:underline font-normal"
                              >
                                Xem cụm
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-black text-base text-rose-600">
                            {item.totalQty} <span className="text-[10px] font-normal text-gray-500">PCS</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Boxes className="w-3 h-3" />
                              {item.orderCount} đơn MIX
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1">
                              {item.coOccurringSkus.slice(0, 3).map((co, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-700 border border-gray-200"
                                >
                                  {co.sku} ({co.totalQty} PCS)
                                </span>
                              ))}
                              {item.coOccurringSkus.length > 3 && (
                                <span className="text-[10px] text-gray-400 self-center">
                                  +{item.coOccurringSkus.length - 3} mã khác
                                </span>
                              )}
                              {item.coOccurringSkus.length === 0 && (
                                <span className="text-gray-400 text-[11px]">-</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-mono text-[11px] text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 truncate max-w-[240px]"
                                title={item.orders.map((o) => o.orderNo).join(', ')}
                              >
                                {formatCompactOrderList(item.orders.map((o) => o.orderNo))}
                              </span>
                              <button
                                onClick={() =>
                                  handleCopyOrders(
                                    item.orders.map((o) => o.orderNo),
                                    `area-${group.area}-${item.sku}`
                                  )
                                }
                                className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer shrink-0"
                                title={`Copy toàn bộ ${item.orderCount} mã đơn`}
                              >
                                {copiedKey === `area-${group.area}-${item.sku}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 1: BẢNG TỔNG HỢP SKU TRÙNG LẶP TRONG ĐƠN MIX (TOÀN BỘ) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden space-y-0">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Table className="w-4 h-4 text-indigo-600" />
                Bảng Tổng Hợp SKU Trùng Lặp Trong Đơn MIX ({filteredSkus.length} Mã SKU)
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Liệt kê chính xác từng mã SKU xuất hiện trùng nhau ở bao nhiêu đơn hàng MIX khác nhau để lấy 1 lần duy nhất toàn bộ số lượng.
              </p>
            </div>
            <div className="text-xs font-semibold text-gray-600 bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
              Tổng {filteredSkus.reduce((a, b) => a + b.totalQty, 0)} PCS trên {mixAnalysis.totalMixOrders} đơn MIX
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">Hạng</th>
                  <th className="py-3 px-4 w-44">Mã SKU</th>
                  <th className="py-3 px-3 w-28 text-center">Khu Vực Kệ</th>
                  <th className="py-3 px-3 w-36 text-center">Trùng Trong Đơn MIX</th>
                  <th className="py-3 px-3 w-32 text-center">Tổng SL Cần Lấy (PCS)</th>
                  <th className="py-3 px-3 w-28 text-center">Tỷ Lệ / Tổng MIX</th>
                  <th className="py-3 px-4 min-w-[200px]">Các SKU Mua Kèm Thường Gặp</th>
                  <th className="py-3 px-4 min-w-[220px]">Danh Sách Mã Đơn Hàng MIX Trùng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSkus.map((item, idx) => {
                  const percentage = ((item.orderCount / (mixAnalysis.totalMixOrders || 1)) * 100).toFixed(0);
                  const isTop3 = idx < 3;

                  return (
                    <tr
                      key={item.sku}
                      className={`hover:bg-indigo-50/50 transition-colors ${
                        isTop3 ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-xs font-bold ${
                            idx === 0
                              ? 'bg-amber-500 text-white shadow-2xs'
                              : idx === 1
                              ? 'bg-slate-400 text-white'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'text-gray-400 font-mono'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>

                      {/* SKU */}
                      <td className="py-3 px-4 font-mono font-bold text-sm text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <span>{item.sku}</span>
                          <button
                            onClick={() => {
                              setSelectedSku(item.sku);
                              setViewMode('cluster');
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-1.5 py-0.5 rounded cursor-pointer hover:underline"
                            title="Xem chi tiết gom đơn"
                          >
                            Xem cụm
                          </button>
                        </div>
                      </td>

                      {/* Area */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                          {item.area}
                        </span>
                      </td>

                      {/* Order Count (Trùng trong bao nhiêu đơn) */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          <Boxes className="w-3 h-3" />
                          {item.orderCount} đơn MIX
                        </span>
                      </td>

                      {/* Total Qty PCS */}
                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-rose-600">
                        {item.totalQty} <span className="text-[10px] font-normal text-gray-500">PCS</span>
                      </td>

                      {/* Percentage */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-xs font-bold text-gray-700">{percentage}%</span>
                          <div className="w-12 bg-gray-100 rounded-full h-1 mt-0.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Co-occurring SKUs */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.coOccurringSkus.slice(0, 3).map((co, cIdx) => (
                            <span
                              key={cIdx}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 text-gray-700 border border-gray-200"
                              title={`${co.sku} (${co.totalQty} PCS trong ${co.orderCount} đơn)`}
                            >
                              {co.sku} ({co.totalQty})
                            </span>
                          ))}
                          {item.coOccurringSkus.length > 3 && (
                            <span className="text-[10px] text-gray-400 self-center">
                              +{item.coOccurringSkus.length - 3} mã khác
                            </span>
                          )}
                          {item.coOccurringSkus.length === 0 && (
                            <span className="text-gray-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* Orders & Copy */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-[11px] text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200 truncate max-w-[240px]"
                            title={item.orders.map((o) => o.orderNo).join(', ')}
                          >
                            {formatCompactOrderList(item.orders.map((o) => o.orderNo))}
                          </span>
                          <button
                            onClick={() =>
                              handleCopyOrders(
                                item.orders.map((o) => o.orderNo),
                                `tbl-${item.sku}`
                              )
                            }
                            className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer shrink-0"
                            title={`Copy toàn bộ ${item.orderCount} mã đơn của SKU ${item.sku}`}
                          >
                            {copiedKey === `tbl-${item.sku}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CHI TIẾT TỪNG SKU & KẾ HOẠCH GOM HÀNG 1 LẦN (CLUSTER VIEW) */}
      {viewMode === 'cluster' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: SKU Ranking List (5 cols) */}
          <div className="lg:col-span-5 space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                Mã SKU Trùng Nhiều Đơn MIX Nhất ({filteredSkus.length})
              </h3>
              <span className="text-[11px] text-gray-400">Chọn 1 SKU để xem chi tiết</span>
            </div>

            <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
              {filteredSkus.map((skuItem, idx) => {
                const isSelected = currentSelectedSummary?.sku === skuItem.sku;
                const percentage = ((skuItem.orderCount / mixAnalysis.totalMixOrders) * 100).toFixed(0);

                return (
                  <div
                    key={skuItem.sku}
                    onClick={() => setSelectedSku(skuItem.sku)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                        : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                            idx === 0
                              ? 'bg-amber-500 text-white'
                              : idx === 1
                              ? 'bg-gray-400 text-white'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-mono font-bold text-sm text-gray-900 flex items-center gap-1.5">
                            <span>{skuItem.sku}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                              Khu {skuItem.area}
                            </span>
                            <span className="text-[11px] text-gray-500">
                              Trùng <b>{skuItem.orderCount}</b> đơn MIX ({percentage}%)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-base font-black text-indigo-700 font-mono">
                          {skuItem.totalQty} <span className="text-[10px] font-normal text-gray-500">PCS</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {skuItem.coOccurringSkus.length} SKU đi kèm
                        </div>
                      </div>
                    </div>

                    {/* Progress bar of order dominance */}
                    <div className="w-full bg-gray-100 rounded-full h-1 mt-2.5 overflow-hidden">
                      <div
                        className={`h-1 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-gray-300'}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {filteredSkus.length === 0 && (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200 text-xs">
                  Không tìm thấy SKU nào phù hợp với bộ lọc tìm kiếm.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Detail & 1-Trip Picking Plan (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {currentSelectedSummary ? (
              <>
                {/* 1-Trip Picking Directive Box */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-indigo-800/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider text-indigo-300 uppercase flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Kế Hoạch Gom Hàng 1 Lần Cho SKU Này (1-Trip Picking)
                      </span>
                      <h2 className="text-xl font-black font-mono mt-0.5 text-white flex items-center gap-2">
                        {currentSelectedSummary.sku}
                        <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-indigo-800 text-indigo-200 border border-indigo-700">
                          Kệ {currentSelectedSummary.area}
                        </span>
                      </h2>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          handleCopyOrders(
                            currentSelectedSummary.orders.map((o) => o.orderNo),
                            'top-copy'
                          )
                        }
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Copy toàn bộ mã đơn của cụm SKU này"
                      >
                        {copiedKey === 'top-copy' ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Đã copy {currentSelectedSummary.orderCount} đơn!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy {currentSelectedSummary.orderCount} Mã Đơn
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handlePrintMixCluster(currentSelectedSummary)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        In Phiếu Gom Cụm
                      </button>
                    </div>
                  </div>

                  {/* 2-Step Pick Strategy */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                      <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                        Bước 1: Lấy SKU Này 1 Lần
                      </span>
                      <div className="text-lg font-black text-white font-mono mt-0.5">
                        {currentSelectedSummary.totalQty} PCS
                      </div>
                      <div className="text-xs text-indigo-200 mt-0.5">
                        Tại khu vực kệ <b>{currentSelectedSummary.area}</b> để phục vụ <b>{currentSelectedSummary.orderCount} đơn hàng MIX</b>
                      </div>
                    </div>

                    <div className="bg-white/10 rounded-xl p-3 border border-white/10">
                      <span className="text-[10px] text-sky-300 font-bold uppercase tracking-wider block">
                        Bước 2: Lấy Các SKU Phụ Đi Kèm
                      </span>
                      <div className="text-lg font-black text-white font-mono mt-0.5">
                        {currentSelectedSummary.coOccurringSkus.reduce((a, b) => a + b.totalQty, 0)} PCS
                      </div>
                      <div className="text-xs text-indigo-200 mt-0.5">
                        Gồm <b>{currentSelectedSummary.coOccurringSkus.length} loại SKU khác</b> cần gom kèm về bàn đóng gói
                      </div>
                    </div>
                  </div>
                </div>

                {/* Co-occurring SKUs Tags */}
                {currentSelectedSummary.coOccurringSkus.length > 0 && (
                  <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-600" />
                        Danh Sách SKU Phụ Cần Lấy Kèm ({currentSelectedSummary.coOccurringSkus.length} Mã)
                      </h4>
                      <span className="text-[11px] text-gray-400">Được sắp xếp theo số lượng nhiều nhất</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                      {currentSelectedSummary.coOccurringSkus.map((co) => (
                        <div
                          key={co.sku}
                          className="p-2 rounded-xl bg-gray-50 border border-gray-200 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-gray-800 truncate" title={co.sku}>
                              {co.sku}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-white text-gray-600 rounded border border-gray-200">
                              {co.area}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] mt-1 pt-1 border-t border-gray-200/60">
                            <span className="text-gray-500">Cần lấy:</span>
                            <span className="font-mono font-bold text-amber-700">
                              {co.totalQty} PCS ({co.orderCount} đơn)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Associated Orders Table */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                  <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                      Chi Tiết {currentSelectedSummary.orderCount} Đơn Hàng MIX Chứa SKU Này
                    </h4>
                    <button
                      onClick={() =>
                        handleCopyOrders(
                          currentSelectedSummary.orders.map((o) => o.orderNo),
                          'table-copy'
                        )
                      }
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'table-copy' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Đã sao chép!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Sao chép tất cả mã đơn
                        </>
                      )}
                    </button>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">STT</th>
                          <th className="py-2.5 px-3">Mã Đơn (Order No)</th>
                          <th className="py-2.5 px-3">Mã Vận Đơn</th>
                          <th className="py-2.5 px-3 text-center">Tổng PCS</th>
                          <th className="py-2.5 px-3">Các Sản Phẩm Trong Đơn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {currentSelectedSummary.orders.map((order, idx) => (
                          <tr key={order.id || idx} className="hover:bg-indigo-50/40 transition-colors">
                            <td className="py-2.5 px-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                              <div className="flex items-center gap-1.5">
                                <span>{order.orderNo}</span>
                                <button
                                  onClick={() => handleCopyOrders([order.orderNo], `order-${idx}`)}
                                  className="text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                                  title="Copy mã đơn"
                                >
                                  {copiedKey === `order-${idx}` ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-gray-600">{order.trackingNo || '-'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 bg-gray-100 rounded-full font-bold text-gray-800">
                                {order.totalQty}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-wrap gap-1">
                                {order.items.map((it, itemIdx) => {
                                  const isPrimary = it.sku === currentSelectedSummary.sku;
                                  return (
                                    <span
                                      key={itemIdx}
                                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
                                        isPrimary
                                          ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                                      }`}
                                    >
                                      {it.sku} &times; <b>{it.qty}</b>
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 3: TOP CẶP SKU HAY MUA KÈM (COMBOS) */}
      {viewMode === 'combos' && (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Ma Trận Các Cặp SKU Thường Được Mua Chung Trong Đơn MIX
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Giúp nhân viên kho chuẩn bị sẵn các combo sản phẩm gần nhau để đẩy nhanh tốc độ đóng gói.
              </p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg">
              Top {popularPairs.length} Cặp SKU
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {popularPairs.map((pair, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Combo #{idx + 1}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                    {pair.count} Đơn MIX
                  </span>
                </div>

                <div className="space-y-1.5 my-1">
                  <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-gray-200">
                    <span className="font-mono text-xs font-bold text-gray-900">{pair.sku1}</span>
                    <span className="text-[10px] text-gray-500 px-1.5 bg-gray-100 rounded">Khu {pair.area1}</span>
                  </div>
                  <div className="text-center text-[10px] text-gray-400 font-bold">+ ĐI KÈM +</div>
                  <div className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-gray-200">
                    <span className="font-mono text-xs font-bold text-gray-900">{pair.sku2}</span>
                    <span className="text-[10px] text-gray-500 px-1.5 bg-gray-100 rounded">Khu {pair.area2}</span>
                  </div>
                </div>

                <div className="text-[11px] text-indigo-600 font-medium pt-2 border-t border-gray-200/70 text-right">
                  Đã ghép trong {pair.count} đơn hàng
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
