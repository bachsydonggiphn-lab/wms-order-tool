import React from 'react';
import { Box, Layers } from 'lucide-react';
import { MobileColumnTab } from '../types';

interface SkuPcsMobileToggleProps {
  mobileColumnTab: MobileColumnTab;
  setMobileColumnTab: (tab: MobileColumnTab) => void;
  skuCount: number;
}

export const SkuPcsMobileToggle: React.FC<SkuPcsMobileToggleProps> = ({
  mobileColumnTab,
  setMobileColumnTab,
  skuCount,
}) => {
  return (
    <div className="lg:hidden flex items-center bg-gray-200/90 p-1 rounded-2xl gap-1 shadow-2xs">
      <button
        onClick={() => setMobileColumnTab('pcs')}
        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          mobileColumnTab === 'pcs'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-gray-700 hover:text-gray-900'
        }`}
      >
        <Box className="w-3.5 h-3.5" />
        <span>Cột PCS (1, 2, MIX...)</span>
      </button>
      <button
        onClick={() => setMobileColumnTab('sku')}
        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          mobileColumnTab === 'sku'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-gray-700 hover:text-gray-900'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>Bảng SKU ({skuCount})</span>
      </button>
      <button
        onClick={() => setMobileColumnTab('both')}
        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          mobileColumnTab === 'both'
            ? 'bg-white text-indigo-700 shadow-xs'
            : 'text-gray-500 hover:text-gray-900'
        }`}
        title="Xem cả bảng SKU và cột PCS xếp dọc"
      >
        Cả 2
      </button>
    </div>
  );
};
