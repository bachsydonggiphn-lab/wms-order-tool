import React from 'react';
import { Flame, Zap } from 'lucide-react';
import { MinOrderThreshold } from '../types';

interface SkuPcsThresholdFilterBarProps {
  minOrderThreshold: MinOrderThreshold;
  setMinOrderThreshold: (val: MinOrderThreshold) => void;
  customMinOrders: number;
  setCustomMinOrders: (val: number) => void;
  globalThresholdStats: {
    under5: { skuCount: number; totalOrders: number; orderNos: string[] };
    r5_9: { skuCount: number; totalOrders: number; orderNos: string[] };
    r10_19: { skuCount: number; totalOrders: number; orderNos: string[] };
    ge20: { skuCount: number; totalOrders: number; orderNos: string[] };
    under9: { skuCount: number; totalOrders: number; orderNos: string[] };
    ge10: { skuCount: number; totalOrders: number; orderNos: string[] };
    ge5: { skuCount: number; totalOrders: number; orderNos: string[] };
  };
  copiedKey: string | null;
  handleCopyGlobalRange: (minOrders: number, maxOrders: number, labelKey: string) => void;
  isSubmittedStatus: boolean;
  handleOpenCreateWmsModal: (orderCodes: string[], batchTitle: string) => void;
}

export const SkuPcsThresholdFilterBar: React.FC<SkuPcsThresholdFilterBarProps> = ({
  minOrderThreshold,
  setMinOrderThreshold,
  customMinOrders,
  setCustomMinOrders,
  globalThresholdStats,
  copiedKey,
  handleCopyGlobalRange,
  isSubmittedStatus,
  handleOpenCreateWmsModal,
}) => {
  return (
    <div className="px-4 py-3 bg-indigo-50/40 border-b border-indigo-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
      {/* Left: Threshold Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-bold text-gray-700 flex items-center gap-1 mr-1">
          <Flame className="w-3.5 h-3.5 text-amber-500" />
          <span>Lọc lượng đơn:</span>
        </span>

        <button
          onClick={() => setMinOrderThreshold('all')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            minOrderThreshold === 'all'
              ? 'bg-indigo-600 text-white shadow-2xs font-bold'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
          }`}
        >
          Tất cả
        </button>

        <button
          onClick={() => setMinOrderThreshold('lt5')}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
            minOrderThreshold === 'lt5'
              ? 'bg-slate-700 text-white shadow-2xs font-bold'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
          }`}
          title="Các SKU có dưới 5 đơn hàng (1 - 4 đơn)"
        >
          <span>&lt; 5 đơn (Lẻ)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${minOrderThreshold === 'lt5' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {globalThresholdStats.under5.skuCount} SKU ({globalThresholdStats.under5.totalOrders}đ)
          </span>
        </button>

        <button
          onClick={() => setMinOrderThreshold('5-9')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            minOrderThreshold === '5-9'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-sky-50 text-sky-900 border border-sky-300 hover:bg-sky-100'
          }`}
          title="Các SKU có từ 5 đến 9 đơn hàng"
        >
          <span>5 - 9 đơn</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${minOrderThreshold === '5-9' ? 'bg-sky-800 text-white' : 'bg-sky-200 text-sky-900'}`}>
            {globalThresholdStats.r5_9.skuCount} SKU ({globalThresholdStats.r5_9.totalOrders}đ)
          </span>
        </button>

        <button
          onClick={() => setMinOrderThreshold('10-19')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            minOrderThreshold === '10-19'
              ? 'bg-amber-400 text-indigo-950 shadow-2xs ring-1 ring-amber-500'
              : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
          }`}
          title="Các SKU có từ 10 đến 19 đơn hàng"
        >
          <span>10 - 19 đơn</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${minOrderThreshold === '10-19' ? 'bg-indigo-950 text-amber-300' : 'bg-amber-200 text-amber-900'}`}>
            {globalThresholdStats.r10_19.skuCount} SKU ({globalThresholdStats.r10_19.totalOrders}đ)
          </span>
        </button>

        <button
          onClick={() => setMinOrderThreshold('20')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            minOrderThreshold === '20'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
          }`}
          title="Các SKU có từ 20 đơn hàng trở lên"
        >
          <span>≥ 20 đơn</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${minOrderThreshold === '20' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
            {globalThresholdStats.ge20.skuCount} SKU ({globalThresholdStats.ge20.totalOrders}đ)
          </span>
        </button>

        {/* Filter >= 5 orders (Aggregated: 5 trở lên) */}
        <button
          onClick={() => setMinOrderThreshold('ge5')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            minOrderThreshold === 'ge5'
              ? 'bg-indigo-700 text-white shadow-2xs ring-1 ring-indigo-900'
              : 'bg-indigo-50 text-indigo-900 border border-indigo-300 hover:bg-indigo-100'
          }`}
          title="Tổng hợp tất cả các SKU có từ 5 đơn trở lên (5-9, 10-19 và >=20)"
        >
          <span>≥ 5 đơn (Tổng hợp)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${minOrderThreshold === 'ge5' ? 'bg-indigo-950 text-indigo-100' : 'bg-indigo-200 text-indigo-900'}`}>
            {globalThresholdStats.ge5.skuCount} SKU ({globalThresholdStats.ge5.totalOrders}đ)
          </span>
        </button>

        {/* Custom Threshold Input */}
        <div className="inline-flex items-center gap-1 ml-1 bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
          <button
            onClick={() => setMinOrderThreshold('custom')}
            className={`px-2 py-0.5 rounded-md text-xs font-semibold cursor-pointer ${
              minOrderThreshold === 'custom' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            ≥ N đơn:
          </button>
          <input
            type="number"
            min="1"
            value={customMinOrders}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 1;
              setCustomMinOrders(val);
              setMinOrderThreshold('custom');
            }}
            className="w-12 px-1 py-0.5 text-xs text-center border border-gray-200 rounded bg-gray-50 font-bold focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Right: Quick Batch Copy & Direct WMS Picking List Creation */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* 1. Nhóm 5 - 9 đơn */}
        <div className="inline-flex items-center rounded-xl overflow-hidden border border-sky-300 shadow-2xs">
          <button
            onClick={() => handleCopyGlobalRange(5, 9, 'global_5_9')}
            disabled={globalThresholdStats.r5_9.totalOrders === 0}
            title="Sao chép toàn bộ Order No của tất cả SKU trong khoảng 5 - 9 đơn"
            className={`px-2.5 py-1.5 font-bold text-xs transition-all cursor-pointer ${
              copiedKey === 'global_5_9'
                ? 'bg-emerald-600 text-white'
                : globalThresholdStats.r5_9.totalOrders > 0
                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {copiedKey === 'global_5_9' ? '✓ Đã copy' : `Copy 5-9đ (${globalThresholdStats.r5_9.totalOrders})`}
          </button>
          {isSubmittedStatus && (
            <button
              onClick={() => {
                const ordersToSubmit = globalThresholdStats.r5_9.orderNos;
                handleOpenCreateWmsModal(ordersToSubmit, `Nhóm 5 - 9 đơn (${ordersToSubmit.length} đơn)`);
              }}
              disabled={globalThresholdStats.r5_9.totalOrders === 0}
              title="Tạo Picking List trực tiếp trên YunWMS cho các SKU 5 - 9 đơn"
              className="px-2 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-extrabold text-xs transition-all cursor-pointer border-l border-sky-500 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-3 h-3 fill-current text-amber-300" />
              <span>⚡ Tạo WMS</span>
            </button>
          )}
        </div>

        {/* 2. Nhóm 10 - 19 đơn */}
        <div className="inline-flex items-center rounded-xl overflow-hidden border border-amber-400 shadow-2xs">
          <button
            onClick={() => handleCopyGlobalRange(10, 19, 'global_10_19')}
            disabled={globalThresholdStats.r10_19.totalOrders === 0}
            title="Sao chép toàn bộ Order No của tất cả SKU trong khoảng 10 - 19 đơn"
            className={`px-2.5 py-1.5 font-black text-xs transition-all cursor-pointer ${
              copiedKey === 'global_10_19'
                ? 'bg-emerald-600 text-white'
                : globalThresholdStats.r10_19.totalOrders > 0
                ? 'bg-amber-400 hover:bg-amber-300 text-indigo-950'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {copiedKey === 'global_10_19' ? '✓ Đã copy' : `Copy 10-19đ (${globalThresholdStats.r10_19.totalOrders})`}
          </button>
          {isSubmittedStatus && (
            <button
              onClick={() => {
                const ordersToSubmit = globalThresholdStats.r10_19.orderNos;
                handleOpenCreateWmsModal(ordersToSubmit, `Nhóm 10 - 19 đơn (${ordersToSubmit.length} đơn)`);
              }}
              disabled={globalThresholdStats.r10_19.totalOrders === 0}
              title="Tạo Picking List trực tiếp trên YunWMS cho các SKU 10 - 19 đơn"
              className="px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-indigo-950 font-black text-xs transition-all cursor-pointer border-l border-amber-600 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-3 h-3 fill-current text-white" />
              <span>⚡ Tạo WMS</span>
            </button>
          )}
        </div>

        {/* 3. Nhóm >= 20 đơn */}
        <div className="inline-flex items-center rounded-xl overflow-hidden border border-emerald-400 shadow-2xs">
          <button
            onClick={() => handleCopyGlobalRange(20, Infinity, 'global_ge20')}
            disabled={globalThresholdStats.ge20.totalOrders === 0}
            title="Sao chép toàn bộ Order No của tất cả SKU có từ 20 đơn trở lên"
            className={`px-2.5 py-1.5 font-bold text-xs transition-all cursor-pointer ${
              copiedKey === 'global_ge20'
                ? 'bg-emerald-600 text-white'
                : globalThresholdStats.ge20.totalOrders > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {copiedKey === 'global_ge20' ? '✓ Đã copy' : `Copy ≥20đ (${globalThresholdStats.ge20.totalOrders})`}
          </button>
          {isSubmittedStatus && (
            <button
              onClick={() => {
                const ordersToSubmit = globalThresholdStats.ge20.orderNos;
                handleOpenCreateWmsModal(ordersToSubmit, `Nhóm ≥ 20 đơn (${ordersToSubmit.length} đơn)`);
              }}
              disabled={globalThresholdStats.ge20.totalOrders === 0}
              title="Tạo Picking List trực tiếp trên YunWMS cho các SKU ≥ 20 đơn"
              className="px-2 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs transition-all cursor-pointer border-l border-emerald-500 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-3 h-3 fill-current text-amber-300" />
              <span>⚡ Tạo WMS</span>
            </button>
          )}
        </div>

        {/* 4. Nhóm >= 5 đơn (Tổng hợp) */}
        <div className="inline-flex items-center rounded-xl overflow-hidden border border-indigo-400 shadow-2xs">
          <button
            onClick={() => handleCopyGlobalRange(5, Infinity, 'global_ge5')}
            disabled={globalThresholdStats.ge5.totalOrders === 0}
            title="Sao chép toàn bộ Order No của tất cả SKU có từ 5 đơn trở lên (Tổng hợp)"
            className={`px-2.5 py-1.5 font-bold text-xs transition-all cursor-pointer ${
              copiedKey === 'global_ge5'
                ? 'bg-emerald-600 text-white'
                : globalThresholdStats.ge5.totalOrders > 0
                ? 'bg-indigo-700 hover:bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {copiedKey === 'global_ge5' ? '✓ Đã copy' : `Copy ≥5đ Tổng (${globalThresholdStats.ge5.totalOrders})`}
          </button>
          {isSubmittedStatus && (
            <button
              onClick={() => {
                const ordersToSubmit = globalThresholdStats.ge5.orderNos;
                handleOpenCreateWmsModal(ordersToSubmit, `Nhóm ≥ 5 đơn Tổng hợp (${ordersToSubmit.length} đơn)`);
              }}
              disabled={globalThresholdStats.ge5.totalOrders === 0}
              title="Tạo Picking List trực tiếp trên YunWMS cho toàn bộ SKU từ 5 đơn trở lên"
              className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs transition-all cursor-pointer border-l border-amber-400 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-slate-950" />
              <span>⚡ Tạo List WMS</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
