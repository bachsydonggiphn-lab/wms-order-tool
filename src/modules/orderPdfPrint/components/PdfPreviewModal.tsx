import React from 'react';
import { Printer, ExternalLink, X, FileText, RefreshCw } from 'lucide-react';

interface PdfPreviewModalProps {
  previewPdfUrl: string | null;
  previewTitle: string;
  onClose: () => void;
  onLoadAllPreview?: () => void;
  isMergingPdf?: boolean;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  previewPdfUrl,
  previewTitle,
  onClose,
  onLoadAllPreview,
  isMergingPdf = false
}) => {
  if (!previewPdfUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Printer className="w-5 h-5 text-amber-400 shrink-0" />
            <h3 className="text-sm font-bold truncate max-w-md">
              {previewTitle || 'Xem Trước File In PDF Gộp'}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onLoadAllPreview && (
              <button
                onClick={onLoadAllPreview}
                disabled={isMergingPdf}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isMergingPdf ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang Tải...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xem Toàn Bộ Đơn</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => {
                window.open(previewPdfUrl, '_blank');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Tab Mới</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-slate-200 w-full h-full p-1">
          <iframe
            src={previewPdfUrl}
            title="Bản Xem Trước PDF"
            className="w-full h-full border-0 rounded-xl bg-white shadow-inner"
          />
        </div>
      </div>
    </div>
  );
};
