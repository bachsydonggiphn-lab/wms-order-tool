import React, { useState, useMemo } from 'react';
import { Sparkles, RefreshCw, Search, ChevronDown, ChevronUp, Clock, Truck } from 'lucide-react';
import { TodayPickingListItem } from '../types';

interface TodayPickingListsBannerProps {
  todayPickingLists: TodayPickingListItem[];
  todayTotal: number;
  isLoading: boolean;
  activePickingList: string;
  onRefresh: () => void;
  onSelectPickingList: (pl: string) => void;
}

export const TodayPickingListsBanner: React.FC<TodayPickingListsBannerProps> = ({
  todayPickingLists,
  todayTotal,
  isLoading,
  activePickingList,
  onRefresh,
  onSelectPickingList,
}) => {
  const [filterText, setFilterText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Lọc theo từ khóa tìm kiếm (mã PL hoặc carrier)
  const filteredLists = useMemo(() => {
    if (!filterText.trim()) return todayPickingLists;
    const q = filterText.toLowerCase().trim();
    return todayPickingLists.filter(
      (item) =>
        item.pl.toLowerCase().includes(q) ||
        item.carrier.toLowerCase().includes(q) ||
        item.creator.toLowerCase().includes(q)
    );
  }, [todayPickingLists, filterText]);

  // Giới hạn hiển thị ban đầu 12 thẻ nếu chưa bấm xem thêm
  const visibleLists = isExpanded ? filteredLists : filteredLists.slice(0, 12);
  const hasMore = filteredLists.length > 12;

  return (
    <div className="p-3.5 bg-gradient-to-r from-indigo-50/60 via-slate-50 to-indigo-50/40 border border-indigo-100/80 rounded-2xl">
      {/* Header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-indigo-100/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg shadow-xs shadow-indigo-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                Hôm nay có{' '}
                <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[13px] shadow-2xs">
                  {todayTotal}
                </span>{' '}
                Khai Báo Picking List No.
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Nhấp vào bất kỳ mã nào bên dưới để tự động chọn và quét in ngay lập tức
            </p>
          </div>
        </div>

        {/* Thanh công cụ: Tìm nhanh & Nút làm mới */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {todayPickingLists.length > 8 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Lọc mã PL / kênh..."
                className="pl-8 pr-2.5 py-1 text-[11px] font-mono bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-44"
              />
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới danh sách Picking List hôm nay"
            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:border-indigo-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isLoading ? 'Đang tải...' : 'Làm Mới'}</span>
          </button>
        </div>
      </div>

      {/* Danh sách thẻ Picking List hôm nay */}
      <div className="pt-3">
        {isLoading && todayPickingLists.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-16 bg-white/70 animate-pulse rounded-xl border border-slate-200/60" />
            ))}
          </div>
        ) : visibleLists.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">
            {todayPickingLists.length === 0
              ? 'Hôm nay chưa có Picking List nào được tạo trên hệ thống kho VN02.'
              : 'Không tìm thấy Picking List nào khớp với bộ lọc tìm kiếm.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {visibleLists.map((item) => {
              const isSelected = activePickingList === item.pl;
              const timeDisplay = item.createdTime ? item.createdTime.slice(11, 16) : '';
              return (
                <button
                  key={item.pl}
                  type="button"
                  onClick={() => onSelectPickingList(item.pl)}
                  className={`p-2 rounded-xl text-left transition-all cursor-pointer border relative group ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200 ring-2 ring-indigo-300 scale-[1.02]'
                      : 'bg-white hover:bg-indigo-50/50 border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  {/* Mã Picking List */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-mono font-bold tracking-tight truncate ${
                        isSelected ? 'text-white' : 'text-slate-900 group-hover:text-indigo-700'
                      }`}
                    >
                      {item.pl}
                    </span>
                    {timeDisplay && (
                      <span
                        className={`text-[10px] font-mono flex items-center gap-0.5 shrink-0 ${
                          isSelected ? 'text-indigo-200' : 'text-slate-400'
                        }`}
                      >
                        <Clock className="w-2.5 h-2.5" />
                        {timeDisplay}
                      </span>
                    )}
                  </div>

                  {/* Thống kê đơn & SP */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}
                    >
                      {item.orderCount} đơn
                    </span>

                    {item.totalQty > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-50 text-purple-700 border border-purple-100'
                        }`}
                      >
                        {item.totalQty} SP
                      </span>
                    )}
                  </div>

                  {/* Kênh vận chuyển */}
                  {item.carrier && (
                    <div
                      className={`mt-1.5 text-[10px] truncate flex items-center gap-1 ${
                        isSelected ? 'text-indigo-100' : 'text-slate-500'
                      }`}
                      title={item.carrier}
                    >
                      <Truck className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{item.carrier}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Nút Xem Tất Cả / Thu Gọn nếu có > 12 thẻ */}
        {hasMore && (
          <div className="mt-2.5 text-center">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white hover:bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200/80 cursor-pointer shadow-2xs transition-all"
            >
              <span>{isExpanded ? 'Thu gọn danh sách' : `Xem tất cả ${filteredLists.length} Picking List hôm nay`}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
