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
} from '../../../../utils/appsScriptSource';

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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs mb-2">
              1
            </div>
            <div className="font-semibold text-gray-900 mb-1">Mở Trình Soạn Thảo</div>
            <p className="text-gray-500 text-[11px]">
              Trong file Google Sheets của bạn, bấm vào menu <strong>Tiện ích mở rộng</strong> → <strong>Apps Script</strong>.
            </p>
          </div>

          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs mb-2">
              2
            </div>
            <div className="font-semibold text-gray-900 mb-1">Dán Code.gs</div>
            <p className="text-gray-500 text-[11px]">
              Xóa hết code mặc định trong file <code>Code.gs</code>, sau đó dán toàn bộ đoạn mã bên dưới vào và bấm <strong>Ctrl + S</strong> để lưu.
            </p>
          </div>

          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs mb-2">
              3
            </div>
            <div className="font-semibold text-gray-900 mb-1">Tạo Dialog.html</div>
            <p className="text-gray-500 text-[11px]">
              Bấm dấu <strong>+</strong> bên cạnh Tệp → chọn <strong>HTML</strong> → đặt tên là <code>Dialog</code> → dán nội dung tab Dialog.html vào.
            </p>
          </div>

          <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-xl">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-xs mb-2">
              4
            </div>
            <div className="font-semibold text-gray-900 mb-1">Tận Hưởng & Sử Dụng</div>
            <p className="text-gray-500 text-[11px]">
              F5 lại trang Google Sheet. Bạn sẽ thấy xuất hiện menu mới <strong>"⚡ Kho Vận Tự Động"</strong> ngay trên thanh công cụ!
            </p>
          </div>
        </div>
      </div>

      {/* Code Viewer Box */}
      <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Code Tabs */}
        <div className="px-4 py-2.5 bg-[#252526] border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedFile('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedFile === 'code'
                  ? 'bg-[#1e1e1e] text-indigo-400 font-semibold border-b-2 border-indigo-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Code.gs</span>
            </button>

            <button
              onClick={() => setSelectedFile('dialog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                selectedFile === 'dialog'
                  ? 'bg-[#1e1e1e] text-indigo-400 font-semibold border-b-2 border-indigo-500'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Dialog.html</span>
            </button>
          </div>

          <div className="text-[11px] text-gray-400 font-mono">
            {selectedFile === 'code' ? 'Google Apps Script (JavaScript)' : 'HTML / CSS'}
          </div>
        </div>

        {/* Code Pre Box */}
        <div className="p-4 max-h-[500px] overflow-y-auto">
          <pre className="font-mono text-xs text-gray-200 leading-relaxed whitespace-pre">
            <code>{activeContent}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
