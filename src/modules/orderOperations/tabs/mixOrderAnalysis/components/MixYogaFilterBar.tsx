import React from 'react';
import { Sparkles, CheckCircle2, Boxes } from 'lucide-react';
import { YogaFilter } from '../types';
import { MixOrderAnalysisResult } from '../../../../../types';

interface MixYogaFilterBarProps {
  yogaFilter: YogaFilter;
  setYogaFilter: (filter: YogaFilter) => void;
  mixAnalysis: MixOrderAnalysisResult;
}

export const MixYogaFilterBar: React.FC<MixYogaFilterBarProps> = ({
  yogaFilter,
  setYogaFilter,
  mixAnalysis,
}) => {
  return (
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
  );
};
