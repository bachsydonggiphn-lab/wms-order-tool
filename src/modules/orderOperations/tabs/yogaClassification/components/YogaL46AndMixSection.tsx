import React from 'react';
import { Box, Copy, Check } from 'lucide-react';

interface DonL46Item {
  orderNo: string;
  qty: number;
}

interface YogaL46AndMixSectionProps {
  donL46: DonL46Item[];
  donMix2PCSL46: string[];
  donMixKhac: string[];
  copiedKey: string | null;
  onCopyList: (key: string, list: string[]) => void;
}

export const YogaL46AndMixSection: React.FC<YogaL46AndMixSectionProps> = ({
  donL46,
  donMix2PCSL46,
  donMixKhac,
  copiedKey,
  onCopyList,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            2. Đơn Có L46 & Đơn MIX Đặc Biệt
          </h3>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Đơn có L46 */}
        <div className="bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs">
          <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Đơn có L46</span>
              </div>
              <div className="text-[10px] text-gray-400">{donL46.length} đơn</div>
            </div>
            <button
              onClick={() => onCopyList('don_l46', donL46.map((it) => it.orderNo))}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
            >
              {copiedKey === 'don_l46' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
            {donL46.length === 0 ? (
              <div className="text-[11px] text-gray-400 text-center py-4 font-sans">Trống</div>
            ) : (
              donL46.map((it, idx) => (
                <div
                  key={idx}
                  className="text-[11px] text-gray-700 flex items-center justify-between p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all"
                >
                  <span>{it.orderNo}</span>
                  <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded-md font-medium">
                    {it.qty} PCS
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MIX 2 PCS (L46) */}
        <div className="bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs">
          <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                <span>MIX 2 PCS (L46)</span>
              </div>
              <div className="text-[10px] text-gray-400">{donMix2PCSL46.length} đơn</div>
            </div>
            <button
              onClick={() => onCopyList('mix_2pcs_l46', donMix2PCSL46)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
            >
              {copiedKey === 'mix_2pcs_l46' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
            {donMix2PCSL46.length === 0 ? (
              <div className="text-[11px] text-gray-400 text-center py-4 font-sans">Trống</div>
            ) : (
              donMix2PCSL46.map((orderNo, idx) => (
                <div key={idx} className="text-[11px] text-gray-700 p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                  {orderNo}
                </div>
              ))
            )}
          </div>
        </div>

        {/* MIX Khác */}
        <div className="bg-gray-50/60 border border-gray-200 rounded-2xl flex flex-col overflow-hidden shadow-2xs">
          <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>MIX Khác</span>
              </div>
              <div className="text-[10px] text-gray-400">{donMixKhac.length} đơn</div>
            </div>
            <button
              onClick={() => onCopyList('mix_khac', donMixKhac)}
              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
            >
              {copiedKey === 'mix_khac' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-2.5 space-y-1 max-h-52 overflow-y-auto font-mono">
            {donMixKhac.length === 0 ? (
              <div className="text-[11px] text-gray-400 text-center py-4 font-sans">Trống</div>
            ) : (
              donMixKhac.map((orderNo, idx) => (
                <div key={idx} className="text-[11px] text-gray-700 p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                  {orderNo}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
