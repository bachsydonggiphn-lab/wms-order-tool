import React from 'react';
import { ListOrdered, Search, X, RefreshCw, Boxes, AlertCircle } from 'lucide-react';
import { DistinctPickingListItem } from '../types';

interface BatchPrintInputCardProps {
  inputMode: 'PICKING_LIST' | 'ORDER_CODES';
  setInputMode: (mode: 'PICKING_LIST' | 'ORDER_CODES') => void;
  pickingListInput: string;
  setPickingListInput: (val: string) => void;
  inputText: string;
  setInputText: (val: string) => void;
  distinctPickingLists: DistinctPickingListItem[];
  parsedCodesCount: number;
  isSearching: boolean;
  searchError: string | null;
  onSearchPickingList: () => void;
  onSearchOrderCodes: () => void;
  onSelectPickingListChip: (pl: string) => void;
}

export const BatchPrintInputCard: React.FC<BatchPrintInputCardProps> = ({
  inputMode,
  setInputMode,
  pickingListInput,
  setPickingListInput,
  inputText,
  setInputText,
  distinctPickingLists,
  parsedCodesCount,
  isSearching,
  searchError,
  onSearchPickingList,
  onSearchOrderCodes,
  onSelectPickingListChip,
}) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
      {/* Tab Switcher: Khai báo Picking List vs Dán mã lẻ */}
      <div className="flex items-center gap-2 mb-4 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setInputMode('PICKING_LIST')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            inputMode === 'PICKING_LIST'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ListOrdered className="w-4 h-4 text-indigo-600" />
          <span>Khai Báo Picking List No.:</span>
          {distinctPickingLists.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-800">
              {distinctPickingLists.length} List có sẵn
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setInputMode('ORDER_CODES')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            inputMode === 'ORDER_CODES'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4 text-indigo-600" />
          <span>Dán Danh Sách Mã Đơn Lẻ</span>
          {parsedCodesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800 font-mono">
              {parsedCodesCount} mã
            </span>
          )}
        </button>
      </div>

      {/* NỘI DUNG CHẾ ĐỘ 1: KHAI BÁO PICKING LIST NO. */}
      {inputMode === 'PICKING_LIST' && (
        <div className="space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={pickingListInput}
                onChange={(e) => setPickingListInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSearchPickingList()}
                placeholder="Nhập hoặc dán mã Picking List No., ví dụ: PL72610210020, PL72608160018..."
                className="w-full text-xs font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-2xs"
              />
              {pickingListInput && (
                <button
                  type="button"
                  onClick={() => setPickingListInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onSearchPickingList}
              disabled={isSearching || !pickingListInput.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-200 disabled:opacity-50 shrink-0"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang Quét Picking List...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Quét & Tổng Hợp Picking List</span>
                </>
              )}
            </button>
          </div>

          {/* Danh sách chọn nhanh các Picking List có sẵn từ các đơn đang mở trong hệ thống */}
          {distinctPickingLists.length > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                <span>Chọn nhanh từ các đợt Picking List đang mở trong kho ({distinctPickingLists.length} list):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {distinctPickingLists.map((item) => (
                  <button
                    key={item.pl}
                    type="button"
                    onClick={() => onSelectPickingListChip(item.pl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      pickingListInput === item.pl
                        ? 'bg-indigo-600 text-white shadow-2xs ring-2 ring-indigo-200'
                        : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>{item.pl}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        pickingListInput === item.pl ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count} đơn
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* NỘI DUNG CHẾ ĐỘ 2: DÁN DANH SÁCH MÃ ĐƠN LẺ */}
      {inputMode === 'ORDER_CODES' && (
        <div className="space-y-3">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Dán danh sách mã đơn hàng vào đây (mỗi mã một dòng hoặc cách nhau bằng dấu cách)...\nVí dụ:\nYD-261020-2623\nYD-261021-2970\nYD-261021-2969\n...`}
            rows={4}
            className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-y shadow-2xs"
          />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500">
              Hỗ trợ tìm kiếm theo <b>Order No</b> (YD-...), <b>Tracking No</b> (SPX..., 862..., GYM...), hoặc <b>Mã sàn</b>.
            </span>

            <button
              type="button"
              onClick={onSearchOrderCodes}
              disabled={isSearching || parsedCodesCount === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-200 disabled:opacity-50 shrink-0"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang Quét Đơn Hàng...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Quét File Nhãn PDF ({parsedCodesCount} Đơn)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {searchError && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}
    </div>
  );
};
