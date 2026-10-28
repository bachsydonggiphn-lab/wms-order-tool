import React from 'react';
import { CarrierCode } from '../../../../../types';

interface CarrierBadgeProps {
  carrier?: CarrierCode;
  carrierName?: string;
}

export const CarrierBadge: React.FC<CarrierBadgeProps> = ({ carrier, carrierName }) => {
  const c = carrier || 'OTHER';

  if (c === 'JNT') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
        J&T Express
      </span>
    );
  }
  if (c === 'SPX') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
        Shopee Express
      </span>
    );
  }
  if (c === 'SPX_INSTANT') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        SPX Hỏa Tốc
      </span>
    );
  }
  if (c === 'GHN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
        GHN
      </span>
    );
  }
  if (c === 'GHN_TIKTOK') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-300">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-600"></span>
        GHN TikTok
      </span>
    );
  }
  if (c === 'VNPOST') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        VNPost / EMS
      </span>
    );
  }
  if (c === 'JT_CARGO') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
        J&T Cargo
      </span>
    );
  }
  if (c === 'NINJAVAN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
        Ninja Van
      </span>
    );
  }
  if (c === 'VIETTELPOST') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Viettel Post
      </span>
    );
  }
  if (c === 'BEST') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-300">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
        Best Express
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
      {carrierName || 'Khác'}
    </span>
  );
};
