import { useState, useMemo, useEffect } from 'react';
import { RawOrderRow, SkuGroupsMap } from '../../../types';
import { BatchSearchResultsData, DistinctPickingListItem } from '../types';
import { OrderAttachmentInfo } from '../../../services/wmsService';
import { usePdfMergeAction } from './usePdfMergeAction';
import { organizeOrdersBySkuWithSeparators } from '../utils/orderGrouper';
import { extractDistinctPickingLists, SAMPLE_TEST_ORDER_CODES } from '../utils/sampleDataHelper';

export interface UseOrderPdfBatchProps {
  orders?: RawOrderRow[];
  skuGroups?: SkuGroupsMap;
}

export function useOrderPdfBatch({ orders = [], skuGroups = {} }: UseOrderPdfBatchProps) {
  // 1. Quản lý trạng thái nhập liệu (Khai báo Picking List No. vs Dán mã đơn lẻ)
  const [inputMode, setInputMode] = useState<'PICKING_LIST' | 'ORDER_CODES'>('PICKING_LIST');
  const [pickingListInput, setPickingListInput] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');

  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // 2. Kết quả tìm kiếm
  const [searchResults, setSearchResults] = useState<BatchSearchResultsData | null>(null);

  // 3. Quản lý chọn SKU & bộ lọc bảng đơn hàng
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [orderTableFilter, setOrderTableFilter] = useState<'ALL' | 'SELECTED_SKUS'>('ALL');
  const [copiedSkuTable, setCopiedSkuTable] = useState<boolean>(false);
  const [separateBlankPages, setSeparateBlankPages] = useState<boolean>(true);
  const [lastPreviewTargetOrders, setLastPreviewTargetOrders] = useState<OrderAttachmentInfo[] | null>(null);

  // 4. Hook phụ trách xử lý gộp, in, xem trước và tải PDF
  const pdfMerge = usePdfMergeAction();

  // 5. Thống kê toàn bộ Picking Lists có trong tập dữ liệu đang mở
  const distinctPickingLists: DistinctPickingListItem[] = useMemo(() => {
    return extractDistinctPickingLists(orders);
  }, [orders]);

  // Tự động gợi ý Picking List đầu tiên nếu có
  useEffect(() => {
    if (distinctPickingLists.length > 0 && !pickingListInput) {
      setPickingListInput(distinctPickingLists[0].pl);
    }
  }, [distinctPickingLists]);

  // Phân tích số lượng mã đơn nhập vào ở chế độ dán mã lẻ
  const parsedCodes = useMemo(() => {
    return inputText
      .split(/[\r\n,\t\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [inputText]);

  // Tự động chọn tất cả SKU khi có kết quả mới
  useEffect(() => {
    if (searchResults && searchResults.skuSummary.length > 0) {
      setSelectedSkus(new Set(searchResults.skuSummary.map((s) => s.sku)));
    } else {
      setSelectedSkus(new Set());
    }
  }, [searchResults]);

  // Tính toán các đơn hàng và PCS của các SKU đang được chọn
  const { ordersOfSelectedSkus, totalPcsOfSelectedSkus } = useMemo(() => {
    if (!searchResults) {
      return { ordersOfSelectedSkus: [], totalPcsOfSelectedSkus: 0 };
    }
    const orderNoSet = new Set<string>();
    let pcs = 0;

    searchResults.skuSummary.forEach((s) => {
      if (selectedSkus.has(s.sku)) {
        pcs += s.totalQty;
        s.orderNos.forEach((no) => orderNoSet.add(no));
      }
    });

    const matchingOrders = searchResults.orders.filter((o) => orderNoSet.has(o.orderNo));
    return {
      ordersOfSelectedSkus: matchingOrders,
      totalPcsOfSelectedSkus: pcs,
    };
  }, [searchResults, selectedSkus]);

  // Điền mẫu thử nghiệm 11 đơn
  const handleLoadSampleCodes = () => {
    setInputMode('ORDER_CODES');
    setInputText(SAMPLE_TEST_ORDER_CODES.join('\n'));
    setSearchError(null);
  };

  // Lấy từ danh sách đơn hiện tại trong công cụ (nếu có)
  const handleImportCurrentOrders = () => {
    if (orders.length === 0) {
      alert('Chưa có đơn hàng nào trong bộ nhớ. Hãy tải đơn trước hoặc dán mã vào ô bên dưới.');
      return;
    }
    const currentCodes = orders.map((o) => o.orderNo || o.trackingNo).filter(Boolean);
    setSeparateBlankPages(false);
    setInputMode('ORDER_CODES');
    setInputText(Array.from(new Set(currentCodes)).join('\n'));
    setSearchError(null);
  };

  // Thực thi tìm kiếm đơn hàng & quét file đính kèm PDF
  const executeSearchWithCodes = async (codes: string[], plName?: string) => {
    const cleanCodes = Array.from(new Set(codes.map((c) => c.trim()).filter(Boolean)));
    if (cleanCodes.length === 0) {
      setSearchError('Vui lòng nhập hoặc chọn ít nhất một mã đơn hàng / Picking List No.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await fetch('/api/wms/search-order-attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchCodes: cleanCodes,
          warehouse: '7',
          skuGroups
        })
      });

      if (!res.ok) {
        throw new Error(`Lỗi kết nối máy chủ: HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Không thể tìm kiếm đơn hàng trên YunWMS');
      }

      setSearchResults({
        ...data,
        currentPickingList: plName || ''
      });
    } catch (err: any) {
      setSearchError(err?.message || 'Lỗi không xác định khi tìm kiếm');
    } finally {
      setIsSearching(false);
    }
  };

  // Xử lý khi bấm nút Quét Picking List -> Tự động bật cách 2 trang trắng
  const handleSearchPickingList = () => {
    const cleanPl = pickingListInput.trim();
    if (!cleanPl) {
      setSearchError('Vui lòng nhập hoặc chọn một mã Picking List No.');
      return;
    }
    setSeparateBlankPages(true);
    executeSearchWithCodes([cleanPl], cleanPl);
  };

  // Xử lý khi bấm nút Quét Danh Sách Mã Đơn Lẻ -> Tự động tắt cách trang trắng theo yêu cầu
  const handleSearchOrderCodes = () => {
    if (parsedCodes.length === 0) {
      setSearchError('Vui lòng nhập hoặc dán ít nhất một mã đơn hàng / mã vận đơn.');
      return;
    }
    setSeparateBlankPages(false);
    executeSearchWithCodes(parsedCodes);
  };

  // Thao tác chọn / bỏ chọn SKU
  const toggleSelectSku = (sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const selectAllSkus = () => {
    if (searchResults) setSelectedSkus(new Set(searchResults.skuSummary.map((s) => s.sku)));
  };
  const deselectAllSkus = () => setSelectedSkus(new Set());

  // Sao chép bảng SKU ra clipboard
  const handleCopySkuTable = () => {
    if (!searchResults || searchResults.skuSummary.length === 0) return;
    const header = 'SKU\tSỐ LƯỢNG\tSỐ ĐƠN\tNHÓM';
    const rows = searchResults.skuSummary.map(
      (item) => `${item.sku}\t${item.totalQty}\t${item.orderCount}\t${item.group || ''}`
    );
    navigator.clipboard.writeText([header, ...rows].join('\n'));
    setCopiedSkuTable(true);
    setTimeout(() => setCopiedSkuTable(false), 2000);
  };

  // Helper lấy danh sách đơn cần in đã gom SKU và phân cách (nếu không bị tắt)
  const getPrintableItems = (targetOrders: OrderAttachmentInfo[]) => {
    return organizeOrdersBySkuWithSeparators(
      targetOrders,
      searchResults?.skuSummary || [],
      selectedSkus,
      { disableSeparators: !separateBlankPages }
    ).printableItems;
  };

  // Wrapper In & Xem Trước sắp xếp theo SKU
  const handlePrintOrganizedOrders = (targetOrders: OrderAttachmentInfo[]) => {
    return pdfMerge.handlePrintMergedPdfForOrders(getPrintableItems(targetOrders));
  };

  const handlePreviewOrganizedOrders = (
    targetOrders: OrderAttachmentInfo[],
    jobTitle?: string,
    forceAll: boolean = false
  ) => {
    setLastPreviewTargetOrders(targetOrders);
    const printableItems = getPrintableItems(targetOrders);

    let previewItems = printableItems;
    let actualTitle = jobTitle || 'Xem Trước Nhãn PDF';
    const validCount = targetOrders.filter((o) => o.hasAttachment).length;

    // Nếu đơn nhiều (> 35 đơn) và chưa ép tải hết: mở nhanh 30 đơn mẫu đầu tiên (trong 2-3s)
    if (!forceAll && validCount > 35) {
      let count = 0;
      const sliced: typeof printableItems = [];
      for (const it of printableItems) {
        if ('isSeparator' in it && it.isSeparator) {
          sliced.push(it);
        } else {
          if (count < 30) {
            sliced.push(it);
            count++;
          } else {
            break;
          }
        }
      }
      previewItems = sliced;
      actualTitle = `${jobTitle || 'Xem Trước'} [30 Đơn Mẫu / ${validCount} Đơn]`;
    }

    return pdfMerge.handlePreviewMergedPdfForOrders(previewItems, actualTitle);
  };

  const handleLoadAllPreview = () => {
    if (lastPreviewTargetOrders) {
      handlePreviewOrganizedOrders(lastPreviewTargetOrders, 'Xem Trước Toàn Bộ', true);
    }
  };

  const handleDownloadOrganizedOrders = (targetOrders: OrderAttachmentInfo[], filenamePrefix?: string) => {
    return pdfMerge.handleDownloadMergedPdf(getPrintableItems(targetOrders), filenamePrefix);
  };

  const hasMorePreview = Boolean(
    lastPreviewTargetOrders &&
    lastPreviewTargetOrders.filter((o) => o.hasAttachment).length > 35 &&
    pdfMerge.previewTitle.includes('30 Đơn Mẫu')
  );

  return {
    inputMode, setInputMode,
    pickingListInput, setPickingListInput,
    inputText, setInputText,
    isSearching, searchError,
    searchResults,
    selectedSkus, orderTableFilter, setOrderTableFilter,
    copiedSkuTable,
    distinctPickingLists, parsedCodes,
    ordersOfSelectedSkus, totalPcsOfSelectedSkus,
    handleLoadSampleCodes, handleImportCurrentOrders,
    handleSearchPickingList, handleSearchOrderCodes,
    executeSearchWithCodes,
    toggleSelectSku, selectAllSkus, deselectAllSkus,
    handleCopySkuTable,
    // PDF Actions (đã sắp xếp nhóm SKU và chèn 2 trang trắng phân cách)
    isMergingPdf: pdfMerge.isMergingPdf,
    mergeError: pdfMerge.mergeError,
    drawPackingOverlay: pdfMerge.drawPackingOverlay,
    setDrawPackingOverlay: pdfMerge.setDrawPackingOverlay,
    drawPageNumbers: pdfMerge.drawPageNumbers,
    setDrawPageNumbers: pdfMerge.setDrawPageNumbers,
    pageNumberMode: pdfMerge.pageNumberMode,
    setPageNumberMode: pdfMerge.setPageNumberMode,
    separateBlankPages, setSeparateBlankPages,
    previewPdfUrl: pdfMerge.previewPdfUrl,
    setPreviewPdfUrl: pdfMerge.setPreviewPdfUrl,
    previewTitle: pdfMerge.previewTitle,
    handlePrintMergedPdfForOrders: handlePrintOrganizedOrders,
    handlePreviewMergedPdfForOrders: handlePreviewOrganizedOrders,
    handleDownloadMergedPdf: handleDownloadOrganizedOrders,
    handleLoadAllPreview,
    hasMorePreview
  };
}
