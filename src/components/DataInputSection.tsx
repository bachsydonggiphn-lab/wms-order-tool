import React, { useState, useRef, useEffect } from 'react';
import {
  Clipboard,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  X,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RawOrderRow, SkuGroupsMap } from '../types';
import {
  parsePastedTableData,
  parseRawOrderRows,
  parsePieceText,
  layMaOrderNo,
  layMaTrackingNo,
  layMaPickingList,
} from '../utils/orderProcessor';

interface DataInputSectionProps {
  onDataLoaded: (rows: RawOrderRow[]) => void;
  onClearData?: () => void;
  onLoadSample?: () => void;
  onOpenWmsModal?: () => void;
  skuGroups: SkuGroupsMap;
  ordersCount: number;
  forceOpen?: boolean;
}

export const DataInputSection: React.FC<DataInputSectionProps> = ({
  onDataLoaded,
  onClearData,
  onLoadSample,
  onOpenWmsModal,
  skuGroups,
  ordersCount,
  forceOpen,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(ordersCount === 0);
  const [inputMode, setInputMode] = useState<'wms_direct' | 'paste_table' | 'paste_3col' | 'upload_file'>('wms_direct');
  const [pastedText, setPastedText] = useState<string>('');
  
  // WMS Quick Sync State
  const [wmsWarehouse, setWmsWarehouse] = useState<string>('7'); // 7 = VN02
  const [wmsStatus, setWmsStatus] = useState<string>('4');       // 4 = Submitted
  const [wmsPageSize, setWmsPageSize] = useState<number>(500);
  const [wmsLoading, setWmsLoading] = useState<boolean>(false);
  const [wmsProgressText, setWmsProgressText] = useState<string>('');
  const [wmsProgressPercent, setWmsProgressPercent] = useState<number>(0);
  
  // 3 Columns mode
  const [colCText, setColCText] = useState<string>(''); // Order No / Tracking No (Cột C)
  const [colGText, setColGText] = useState<string>(''); // Piece SKU*Qty (Cột G)
  const [colRText, setColRText] = useState<string>(''); // Picking List (Cột R)

  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  // Tự động mở khung khi số lượng đơn = 0 hoặc khi có yêu cầu forceOpen
  useEffect(() => {
    if (ordersCount === 0 || forceOpen) {
      setIsOpen(true);
    }
  }, [ordersCount, forceOpen]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleWmsDirectFetch = async () => {
    setWmsLoading(true);
    setWmsProgressPercent(25);
    setWmsProgressText('Đang xác thực kết nối czwh.wms.yunwms.com...');

    try {
      setWmsProgressPercent(50);
      setWmsProgressText(`Đang gọi API nội bộ POST /order/orders/list (Kho: ${wmsWarehouse === '7' ? 'VN02' : 'VN01'}, Trạng thái: ${wmsStatus === '4' ? 'Submitted' : 'Shipped'})...`);

      const res = await fetch('/api/wms/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse: wmsWarehouse,
          status: wmsStatus,
          pageSize: wmsPageSize,
          maxPages: 0, // Kéo hết các trang
          username: 'David',
          password: '12345abc',
          skuGroups,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Lỗi kết nối máy chủ (${res.status})`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Lỗi kéo đơn từ WMS');
      }

      const ordersList: RawOrderRow[] = data.orders || [];
      setWmsProgressPercent(100);
      setWmsProgressText(`Hoàn tất! Đã kéo thành công ${ordersList.length} đơn.`);

      onDataLoaded(ordersList);
      showNotification('success', `⚡ Đã nạp thành công ${ordersList.length} đơn hàng trạng thái ${wmsStatus === '4' ? 'Submitted' : 'Shipped'} từ YunWMS!`);
      setIsOpen(false);
    } catch (err: any) {
      showNotification('error', `Lỗi kết nối YunWMS: ${err?.message || 'Không kết nối được'}`);
    } finally {
      setWmsLoading(false);
    }
  };

  const handleProcessTablePaste = () => {
    if (!pastedText.trim()) {
      showNotification('error', 'Vui lòng dán dữ liệu bảng từ Google Sheets hoặc Excel vào khung bên dưới.');
      return;
    }

    try {
      const parsed = parsePastedTableData(pastedText, skuGroups);
      if (parsed.length === 0) {
        showNotification('error', 'Không tìm thấy dòng đơn hàng hợp lệ nào trong dữ liệu dán. Vui lòng kiểm tra lại định dạng.');
        return;
      }

      onDataLoaded(parsed);
      showNotification('success', `Đã nạp và xử lý thành công ${parsed.length} dòng đơn hàng!`);
      setPastedText('');
      setIsOpen(false);
    } catch (err: any) {
      showNotification('error', `Lỗi xử lý dữ liệu: ${err?.message || 'Không rõ nguyên nhân'}`);
    }
  };

  const handleProcess3Cols = () => {
    const linesC = colCText.split(/\r?\n/).map(l => l.trim());
    const linesG = colGText.split(/\r?\n/).map(l => l.trim());
    const linesR = colRText.split(/\r?\n/).map(l => l.trim());

    const maxLen = Math.max(linesC.length, linesG.length, linesR.length);
    if (maxLen === 0 || (linesC.length === 1 && linesC[0] === '' && linesG.length === 1 && linesG[0] === '')) {
      showNotification('error', 'Vui lòng nhập ít nhất Cột C (Mã đơn) và Cột G (SKU Piece).');
      return;
    }

    const rows: Array<{ rawOrderText: string; rawPieceText: string; rawPickingText: string }> = [];
    for (let i = 0; i < maxLen; i++) {
      const rawOrder = linesC[i] || '';
      const rawPiece = linesG[i] || '';
      const rawPicking = linesR[i] || (linesR.length === 1 ? linesR[0] : ''); // nếu chỉ nhập 1 dòng picking list thì áp dụng cho tất cả

      if (rawOrder || rawPiece || rawPicking) {
        rows.push({
          rawOrderText: rawOrder,
          rawPieceText: rawPiece,
          rawPickingText: rawPicking,
        });
      }
    }

    const parsed = parseRawOrderRows(rows, skuGroups);
    if (parsed.length === 0) {
      showNotification('error', 'Không trích xuất được đơn hàng nào từ các cột đã nhập.');
      return;
    }

    onDataLoaded(parsed);
    showNotification('success', `Đã nạp và xử lý thành công ${parsed.length} dòng đơn hàng!`);
    setColCText('');
    setColGText('');
    setColRText('');
    setIsOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        
        // Convert sang Array of Array để xử lý linh hoạt
        const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!aoa || aoa.length === 0) {
          showNotification('error', 'File Excel không có dữ liệu.');
          return;
        }

        // Tự động nhận diện dòng bắt đầu có dữ liệu (bỏ qua header nếu có)
        let startRow = 0;
        if (aoa.length > 1) {
          const firstRowStr = (aoa[0] || []).map((c: any) => String(c || '').toLowerCase()).join(' ');
          if (
            firstRowStr.includes('order') ||
            firstRowStr.includes('product') ||
            firstRowStr.includes('piece') ||
            firstRowStr.includes('picking') ||
            firstRowStr.includes('warehouse') ||
            firstRowStr.includes('customer') ||
            firstRowStr.includes('no.')
          ) {
            startRow = 1;
          }
        }

        const rows: Array<{
          rawOrderText: string;
          rawPieceText: string;
          rawPickingText: string;
          orderNo?: string;
          trackingNo?: string;
          pickingList?: string;
        }> = [];

        for (let i = startRow; i < aoa.length; i++) {
          const cells = aoa[i] || [];
          if (cells.length === 0) continue;

          // 1. Tự động nhận diện ô chứa Khối Thông Tin Đơn Hàng (Order No, Tracking, RefNo, Picking List)
          let rawOrder = '';
          for (let c = 0; c < cells.length; c++) {
            const val = String(cells[c] || '');
            if (
              val.includes('Order No.') ||
              val.includes('Order No:') ||
              val.includes('Order No.：') ||
              val.includes('Public platform order') ||
              val.includes('RefNo.') ||
              val.includes('RefNo:') ||
              val.includes('RefNo.：')
            ) {
              rawOrder = val;
              break;
            }
          }
          if (!rawOrder) {
            rawOrder = String(cells[2] || cells[1] || cells[0] || '');
          }

          // 2. Tự động nhận diện ô chứa Danh Sách Hàng Hóa SKU (Product Details / Piece)
          let rawPiece = '';
          let maxItemCount = 0;
          for (let c = 0; c < cells.length; c++) {
            const val = String(cells[c] || '');
            const lower = val.toLowerCase();
            if (
              val === rawOrder ||
              lower.includes('refno') ||
              lower.includes('ref no') ||
              lower.includes('order no') ||
              lower.includes('tracking no') ||
              lower.includes('public platform') ||
              lower.includes('creation time') ||
              lower.includes('provider channel') ||
              lower.includes('logistics product') ||
              lower.includes('recipient') ||
              lower.includes('picking list no') ||
              lower.includes('number of packages')
            ) {
              continue;
            }
            const itemsFound = parsePieceText(val);
            if (itemsFound.length > maxItemCount) {
              maxItemCount = itemsFound.length;
              rawPiece = val;
            } else if (itemsFound.length > 0 && !rawPiece) {
              rawPiece = val;
            }
          }
          if (!rawPiece) {
            // Tìm ô có chứa SKU hợp lệ
            for (let c = 0; c < cells.length; c++) {
              const val = String(cells[c] || '');
              if (parsePieceText(val).length > 0) {
                rawPiece = val;
                break;
              }
            }
          }

          // 3. Tự động nhận diện ô Picking List
          let rawPicking = '';
          for (let c = 0; c < cells.length; c++) {
            const val = String(cells[c] || '');
            if (val.includes('PL') && (val.includes('Picking List') || /PL\d{6,}/.test(val))) {
              rawPicking = val;
              break;
            }
          }

          const extractedOrderNo = layMaOrderNo(rawOrder);
          const extractedTracking = layMaTrackingNo(rawOrder);
          const extractedPickingList = layMaPickingList(rawPicking) || layMaPickingList(rawOrder);
          const pieceItems = parsePieceText(rawPiece);

          if (extractedOrderNo || pieceItems.length > 0 || rawOrder.trim()) {
            rows.push({
              rawOrderText: rawOrder,
              rawPieceText: rawPiece,
              rawPickingText: rawPicking,
              orderNo: extractedOrderNo,
              trackingNo: extractedTracking,
              pickingList: extractedPickingList,
            });
          }
        }

        const parsed = parseRawOrderRows(rows, skuGroups);
        if (parsed.length === 0) {
          showNotification('error', 'Không tìm thấy dữ liệu đơn hợp lệ trong file Excel.');
          return;
        }

        onDataLoaded(parsed);
        showNotification('success', `Đã nhập thành công ${parsed.length} dòng đơn hàng từ file Excel!`);
        setIsOpen(false);
      } catch (err: any) {
        showNotification('error', `Lỗi đọc file Excel: ${err?.message || 'Không rõ nguyên nhân'}`);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden mb-6">
      {/* Header toggle bar */}
      <div className="px-5 py-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Clipboard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">
                Nhập Dữ Liệu Đơn Hàng Kho
              </h2>
              {ordersCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Đang có {ordersCount} đơn
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  Chưa có dữ liệu
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Dán trực tiếp từ Google Sheets, Excel hoặc tải file .xlsx / .csv
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          {ordersCount > 0 && onClearData && (
            <button
              onClick={onClearData}
              title="Xóa toàn bộ dữ liệu đơn hàng hiện tại để nhập mới"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Xóa đơn cũ ({ordersCount}đ)</span>
            </button>
          )}

          {ordersCount === 0 && onLoadSample && (
            <button
              onClick={onLoadSample}
              title="Tải 22 đơn hàng mẫu để kiểm tra tính năng"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>Nạp dữ liệu mẫu</span>
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all flex items-center gap-1 cursor-pointer"
          >
            {isOpen ? 'Thu gọn ▲' : 'Mở rộng ▼'}
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`px-5 py-3 text-xs font-medium flex items-center gap-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-100'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-b border-rose-100'
              : 'bg-indigo-50 text-indigo-900 border-b border-indigo-100'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {isOpen && (
        <div className="p-5 sm:p-6 bg-slate-50/50">
          {/* Sub tabs mode */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 border-b border-gray-200/80 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setInputMode('wms_direct')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  inputMode === 'wms_direct'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/30'
                    : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                }`}
              >
                <span>⚡ Kéo Đơn Trực Tiếp YunWMS</span>
                <span className="text-[10px] bg-amber-400 text-slate-900 font-extrabold px-1.5 py-0.2 rounded-full">
                  Mới
                </span>
              </button>
              <button
                onClick={() => setInputMode('paste_table')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  inputMode === 'paste_table'
                    ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-600/20'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                📋 Dán cả bảng (Google Sheets / TSV)
              </button>
              <button
                onClick={() => setInputMode('paste_3col')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  inputMode === 'paste_3col'
                    ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-600/20'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                📑 Dán theo 3 Cột (Cột C, G, R)
              </button>
              <button
                onClick={() => setInputMode('upload_file')}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  inputMode === 'upload_file'
                    ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-600/20'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                📥 Tải File Excel (.xlsx / .csv)
              </button>
            </div>

            {ordersCount > 0 && onClearData && (
              <button
                onClick={onClearData}
                className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline cursor-pointer ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa toàn bộ {ordersCount} đơn cũ để nạp mới</span>
              </button>
            )}
          </div>

          {/* Mode 0: WMS Direct Connection */}
          {inputMode === 'wms_direct' && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-blue-50/60 border border-indigo-200/90 rounded-2xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <span>Kết Nối Trực Tiếp Cổng YunWMS (czwh.wms.yunwms.com)</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Gọi API nội bộ <code className="px-1.5 py-0.5 bg-white rounded-md text-indigo-700 font-mono text-[11px] border border-indigo-100">POST /order/orders/list/page/1/pageSize/500</code> để lấy đơn tự động thay vì copy paste thủ công.
                    </p>
                  </div>
                  {onOpenWmsModal && (
                    <button
                      onClick={onOpenWmsModal}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
                    >
                      <span>Cấu hình nâng cao & Live Tracker ⚙️</span>
                    </button>
                  )}
                </div>

                {/* Bộ lọc Kho & Trạng thái đơn */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kho Hàng (E4):
                    </label>
                    <select
                      value={wmsWarehouse}
                      onChange={(e) => setWmsWarehouse(e.target.value)}
                      disabled={wmsLoading}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 shadow-2xs"
                    >
                      <option value="7">VN02 [越南胡志明仓库 - Hồ Chí Minh] (Mặc định)</option>
                      <option value="4">VN01 [VN01越南海外仓 - Hải Ngoại]</option>
                      <option value="">Tất cả kho (All)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Trạng Thái Đơn (E11):
                    </label>
                    <select
                      value={wmsStatus}
                      onChange={(e) => setWmsStatus(e.target.value)}
                      disabled={wmsLoading}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 shadow-2xs"
                    >
                      <option value="5">⭐ Shelved (E11 = 5) [Đã lên kệ / Đang nhặt hàng]</option>
                      <option value="4">Submitted. (E11 = 4) [Chờ xử lý / Đã tạo]</option>
                      <option value="8">Shipped (E11 = 8) [Đã xuất kho]</option>
                      <option value="">Tất cả trạng thái</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tốc Độ Kéo Đơn:
                    </label>
                    <select
                      value={wmsPageSize}
                      onChange={(e) => setWmsPageSize(Number(e.target.value))}
                      disabled={wmsLoading}
                      className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 shadow-2xs"
                    >
                      <option value={300}>300 đơn / lần gọi (Nhanh)</option>
                      <option value={500}>500 đơn / lần gọi (Tối ưu nhất)</option>
                      <option value={1000}>1000 đơn / lần gọi (Cực đại)</option>
                    </select>
                  </div>
                </div>

                {/* Progress bar */}
                {wmsLoading && (
                  <div className="mb-4 p-3 bg-white/90 border border-indigo-200 rounded-xl space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>{wmsProgressText}</span>
                      </span>
                      <span>{wmsProgressPercent}%</span>
                    </div>
                    <div className="w-full bg-indigo-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${wmsProgressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Nút Kéo Đơn To */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleWmsDirectFetch}
                    disabled={wmsLoading}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {wmsLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Đang Kéo Đơn Từ WMS...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-amber-300 text-sm">⚡</span>
                        <span>KÉO TOÀN BỘ ĐƠN {wmsStatus === '4' ? 'SUBMITTED' : 'WMS'} NGAY (TỰ ĐỘNG)</span>
                      </>
                    )}
                  </button>

                  <span className="text-xs text-slate-500">
                    Tài khoản liên kết: <b className="text-slate-700 font-mono">David</b> • Xác thực mã hóa Base64 tự động
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mode 1: Paste Whole Table */}
          {inputMode === 'paste_table' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <span>Dán nội dung sao chép từ Google Sheets (Cột A-R hoặc các cột liên quan):</span>
                </label>
                <div className="flex items-center gap-2">
                  {pastedText.trim() && (
                    <button
                      onClick={() => setPastedText('')}
                      className="text-[11px] text-gray-500 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Xóa trắng ô</span>
                    </button>
                  )}
                  <span className="text-[11px] text-gray-400">
                    Ctrl + A, Ctrl + C trên sheet rồi Ctrl + V vào đây
                  </span>
                </div>
              </div>

              <textarea
                ref={textAreaRef}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Ví dụ dữ liệu sao chép từ Google Sheets:\nOrder No: ORD-VN-90812\tYD-D107-1*1\tPicking List No: PL-2026-0815A\nOrder No: ORD-VN-90813\tYD-A12-1*2\nYD-K01-1*1\tPicking List No: PL-2026-0815A`}
                rows={7}
                className="w-full text-xs font-mono p-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 placeholder-gray-400 shadow-2xs"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                <div className="flex items-center text-xs text-gray-500 gap-1.5">
                  <HelpCircle className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    Hệ thống sẽ tự động quét regex trích xuất <strong>Order No</strong>, <strong>Tracking</strong>,{' '}
                    <strong>Picking List No</strong> và tính toán các dòng <strong>SKU*SL</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {pastedText.trim() && (
                    <button
                      onClick={() => setPastedText('')}
                      className="px-3.5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Xóa trắng ô
                    </button>
                  )}
                  <button
                    onClick={handleProcessTablePaste}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Xử Lý Dữ Liệu Ngay</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Paste 3 Separate Columns */}
          {inputMode === 'paste_3col' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">
                  Bạn có thể sao chép từng cột từ Google Sheet và dán vào 3 ô tương ứng dưới đây:
                </p>
                {(colCText || colGText || colRText) && (
                  <button
                    onClick={() => {
                      setColCText('');
                      setColGText('');
                      setColRText('');
                    }}
                    className="text-[11px] text-gray-500 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Xóa trắng 3 ô</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Cột C: Order / Tracking Info
                  </label>
                  <textarea
                    value={colCText}
                    onChange={(e) => setColCText(e.target.value)}
                    placeholder={`Order No: ORD-01\nOrder No: ORD-02\nOrder No: ORD-03`}
                    rows={6}
                    className="w-full text-xs font-mono p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Cột G: Piece (SKU * Số Lượng)
                  </label>
                  <textarea
                    value={colGText}
                    onChange={(e) => setColGText(e.target.value)}
                    placeholder={`YD-D107-1*1\nYD-A12-1*2\nYD-B8-1L*1`}
                    rows={6}
                    className="w-full text-xs font-mono p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-800 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Cột R: Picking List No.
                  </label>
                  <textarea
                    value={colRText}
                    onChange={(e) => setColRText(e.target.value)}
                    placeholder={`Picking List No: PL-01\nhoặc điền 1 mã chung:\nPL-2026-0815`}
                    rows={6}
                    className="w-full text-xs font-mono p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-800 shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                {(colCText || colGText || colRText) && (
                  <button
                    onClick={() => {
                      setColCText('');
                      setColGText('');
                      setColRText('');
                    }}
                    className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Xóa trắng 3 ô
                  </button>
                )}
                <button
                  onClick={handleProcess3Cols}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Xử Lý Ghép 3 Cột</span>
                </button>
              </div>
            </div>
          )}

          {/* Mode 3: Upload Excel File */}
          {inputMode === 'upload_file' && (
            <div className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-2xl p-8 text-center bg-gray-50/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-upload-input"
              />
              <label
                htmlFor="excel-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1 border border-indigo-100">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-semibold text-gray-800">
                  Nhấn để chọn hoặc kéo thả file Excel (.xlsx, .xls, .csv)
                </div>
                <p className="text-xs text-gray-500 max-w-md">
                  Hệ thống tự động nhận diện các cột Cột C (Order No), Cột G (Piece SKU), Cột R (Picking List)
                </p>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
