import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  FileCode,
  Sparkles,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  GOOGLE_APPS_SCRIPT_CODE,
  GOOGLE_APPS_SCRIPT_DIALOG_HTML,
} from '../../utils/appsScriptSource';

export const AppsScriptCodeView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<'code' | 'dialog'>('code');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeContent =
    selectedFile === 'code'
      ? GOOGLE_APPS_SCRIPT_CODE
      : GOOGLE_APPS_SCRIPT_DIALOG_HTML;
  const activeFilename = selectedFile === 'code' ? 'Code.gs' : 'Dialog.html';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                Mã Nguồn Google Apps Script (Code.gs)
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium">
                  Sẵn Sàng Dùng
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Dán vào Google Sheets (Tiện ích mở rộng → Apps Script) để tự động hóa toàn bộ quy trình lọc đơn kho.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleCopy(activeContent, activeFilename)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            {copied === activeFilename ? (
              <Check className="w-4 h-4 text-emerald-300" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied === activeFilename ? 'Đã sao chép!' : `Sao chép ${activeFilename}`}</span>
          </button>

          <button
            onClick={() => handleDownload(activeContent, activeFilename)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-medium border border-gray-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Tải về file</span>
          </button>
        </div>
      </div>

      {/* 4 Steps Instructions */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          4 Bước Cài Đặt Vào Google Sheets Của Bạn
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2.5">
              1
            </div>
            <h4 className="text-xs font-semibold text-gray-900 mb-1">Mở Apps Script</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Trên Google Sheets, vào menu <b>Tiện ích mở rộng (Extensions)</b> → Chọn <b>Apps Script</b>.
            </p>
          </div>

          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2.5">
              2
            </div>
            <h4 className="text-xs font-semibold text-gray-900 mb-1">Dán Code.gs</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Xóa code cũ trong file <b>Code.gs</b>, dán toàn bộ mã nguồn bên dưới vào và nhấn <b>Lưu (Ctrl+S)</b>.
            </p>
          </div>

          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2.5">
              3
            </div>
            <h4 className="text-xs font-semibold text-gray-900 mb-1">Tạo Dialog.html (tùy chọn)</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Nhấn dấu <b>+</b> bên cạnh Tệp → Chọn <b>HTML</b> → Đặt tên <b>Dialog</b> và dán code HTML vào.
            </p>
          </div>

          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mb-2.5">
              4
            </div>
            <h4 className="text-xs font-semibold text-gray-900 mb-1">Tải lại Sheet & Sử dụng</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Tải lại trang Google Sheet (F5), bạn sẽ thấy menu <b>📦 SKU</b> xuất hiện trên thanh công cụ!
            </p>
          </div>
        </div>
      </div>

      {/* Code Editor Preview Box */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Tab Selector Header */}
        <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedFile('code')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedFile === 'code'
                  ? 'bg-white text-indigo-600 shadow-2xs border border-gray-200 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Code.gs (Tập lệnh chính - 10 chức năng)</span>
            </button>

            <button
              onClick={() => setSelectedFile('dialog')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedFile === 'dialog'
                  ? 'bg-white text-indigo-600 shadow-2xs border border-gray-200 font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Dialog.html (Popup kết quả tổng hợp)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(activeContent, activeFilename)}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              {copied === activeFilename ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-gray-500" />
              )}
              <span>{copied === activeFilename ? 'Đã sao chép' : 'Sao chép mã'}</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-gray-950 text-gray-200 font-mono text-xs overflow-x-auto max-h-[560px] leading-relaxed select-all">
          <pre>{activeContent}</pre>
        </div>
      </div>
    </div>
  );
};
