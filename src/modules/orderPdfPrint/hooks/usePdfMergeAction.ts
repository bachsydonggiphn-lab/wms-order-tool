import { useState } from 'react';
import { OrderAttachmentInfo } from '../../../services/wmsService';
import { PrintableOrderItem } from '../types';

export function usePdfMergeAction() {
  const [isMergingPdf, setIsMergingPdf] = useState<boolean>(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [drawPackingOverlay, setDrawPackingOverlay] = useState<boolean>(true);
  const [drawPageNumbers, setDrawPageNumbers] = useState<boolean>(true);
  const [pageNumberMode, setPageNumberMode] = useState<'CONTINUOUS' | 'PER_SKU'>('CONTINUOUS');

  // Modal xem trước PDF
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  // Helper gửi yêu cầu gộp PDF lên backend
  const requestMergePdfBlob = async (targetItems: PrintableOrderItem[]) => {
    // Đếm số đơn hàng thực tế có nhãn
    const realOrders = targetItems.filter(
      (it): it is OrderAttachmentInfo => !('isSeparator' in it && it.isSeparator) && Boolean((it as OrderAttachmentInfo).hasAttachment)
    );
    if (realOrders.length === 0) {
      throw new Error('Không có đơn hàng nào có file PDF nhãn để in.');
    }

    const payloadItems = targetItems
      .filter((it) => {
        if ('isSeparator' in it && it.isSeparator) return true;
        return (it as OrderAttachmentInfo).hasAttachment;
      })
      .map((it) => {
        if ('isSeparator' in it && it.isSeparator) {
          return { isSeparator: true, separatorLabel: it.separatorLabel };
        }
        const o = it as OrderAttachmentInfo;
        return {
          orderNo: o.orderNo,
          trackingNo: o.trackingNo,
          refNo: o.refNo,
          carrier: o.carrier,
          shippingMethod: o.shippingMethod,
          items: o.items,
          attachmentUrl: o.attachmentUrl,
          oatId: o.oatId
        };
      });

    const res = await fetch('/api/wms/merge-order-pdfs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: payloadItems,
        drawPackingOverlay,
        drawPageNumbers,
        pageNumberMode
      })
    });

    if (!res.ok) {
      throw new Error(`Lỗi khi xử lý file PDF: HTTP ${res.status}`);
    }

    const blob = await res.blob();
    return { blob, ordersCount: realOrders.length };
  };

  // In Gộp PDF
  const handlePrintMergedPdfForOrders = async (targetItems: PrintableOrderItem[]) => {
    setIsMergingPdf(true);
    setMergeError(null);

    try {
      const { blob } = await requestMergePdfBlob(targetItems);
      const blobUrl = URL.createObjectURL(blob);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = blobUrl;

      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 300);
      };
    } catch (err: any) {
      setMergeError(err?.message || 'Lỗi khi in gộp PDF');
      alert(err?.message || 'Lỗi khi in gộp PDF');
    } finally {
      setIsMergingPdf(false);
    }
  };

  // Xem Trước PDF Linh Hoạt
  const handlePreviewMergedPdfForOrders = async (
    targetItems: PrintableOrderItem[],
    jobTitle: string = 'Xem Trước Nhãn PDF'
  ) => {
    setIsMergingPdf(true);
    setMergeError(null);

    try {
      const { blob, ordersCount } = await requestMergePdfBlob(targetItems);
      const blobUrl = URL.createObjectURL(blob);
      setPreviewPdfUrl(blobUrl);
      setPreviewTitle(`${jobTitle} (${ordersCount} nhãn PDF)`);
    } catch (err: any) {
      setMergeError(err?.message || 'Lỗi khi tải file xem trước');
      alert(err?.message || 'Lỗi khi tải file xem trước');
    } finally {
      setIsMergingPdf(false);
    }
  };

  // Tải xuống file PDF đã gộp
  const handleDownloadMergedPdf = async (
    targetItems: PrintableOrderItem[],
    filenamePrefix: string = 'Tong_Hop_In_Nhan'
  ) => {
    setIsMergingPdf(true);
    setMergeError(null);

    try {
      const { blob, ordersCount } = await requestMergePdfBlob(targetItems);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${filenamePrefix}_${ordersCount}_Don_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setMergeError(err?.message || 'Lỗi khi tải file PDF');
      alert(err?.message || 'Lỗi khi tải file PDF');
    } finally {
      setIsMergingPdf(false);
    }
  };

  return {
    isMergingPdf,
    mergeError,
    drawPackingOverlay,
    setDrawPackingOverlay,
    drawPageNumbers,
    setDrawPageNumbers,
    pageNumberMode,
    setPageNumberMode,
    previewPdfUrl,
    setPreviewPdfUrl,
    previewTitle,
    handlePrintMergedPdfForOrders,
    handlePreviewMergedPdfForOrders,
    handleDownloadMergedPdf
  };
}
