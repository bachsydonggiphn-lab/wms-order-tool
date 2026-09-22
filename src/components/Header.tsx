import React from 'react';
import { Package, Layers, Sparkles, MapPin, FileSpreadsheet, Trash2, Truck } from 'lucide-react';
import { RawOrderRow, CarrierCode } from '../types';
import { GKP_LOGO_PNG_BASE64 } from '../utils/logoBase64';

interface HeaderProps {
  orders: RawOrderRow[];
  totalSkus: number;
  totalPcs: number;
  pickingLists: string[];
  carrierCounts?: Record<CarrierCode, number>;
  onLoadSample: () => void;
  onClear: () => void;
  onOpenWmsSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  orders,
  totalSkus,
  totalPcs,
  pickingLists,
  carrierCounts,
  onLoadSample,
  onClear,
  onOpenWmsSync,
}) => {
  return (
    <header className="bg-white border-b border-gray-200 shrink-0 sticky top-0 z-30 shadow-xs">
      <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-2.5 sm:py-3.5">
        {/* Row 1: Logo + Title + Actions (mobile: tất cả trên 1 hàng) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Logo */}
          <div className="h-9 sm:h-10 px-2 bg-white rounded-xl flex items-center justify-center border border-slate-200/90 shadow-2xs shrink-0 overflow-hidden">
            <img
              src={GKP_LOGO_PNG_BASE64}
              alt="Logo GKP Kho WMS"
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>

          {/* Title & subtitle */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-semibold tracking-tight text-gray-900 whitespace-nowrap">
                Warehouse<span className="text-indigo-600">.matrix</span>
              </h1>
              <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 px-2 py-0.5 bg-indigo-50 rounded-full border border-indigo-200 whitespace-nowrap">
                v2.7
              </span>
              <span className="hidden md:inline text-[11px] font-bold text-indigo-700 px-2.5 py-0.5 bg-indigo-50 rounded-full border border-indigo-200">
                Sơ Đồ Ma Trận SKU & Kho
              </span>
            </div>
            <p className="hidden sm:block text-xs text-gray-500 mt-0.5 truncate">
              Trích xuất Order No, Picking List, Tồn kho YunWMS, gộp PCS, phân nhóm 13 khu vực & ĐVVC
            </p>
          </div>

          {/* Action Buttons - luôn hiển thị, compact trên mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onOpenWmsSync && (
              <button
                onClick={onOpenWmsSync}
                title="Kết nối trực tiếp YunWMS để lấy đơn Submitted"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer"
              >
                <span className="text-amber-300">⚡</span>
                <span className="hidden sm:inline">Đồng Bộ YunWMS</span>
                <span className="sm:hidden">WMS</span>
              </button>
            )}

            <button
              onClick={onLoadSample}
              title="Tải dữ liệu mẫu"
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Dữ liệu mẫu</span>
            </button>

            {orders.length > 0 && (
              <button
                onClick={onClear}
                title="Xóa toàn bộ dữ liệu đơn hàng cũ"
                className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Xóa</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Stats Cards - hiện dưới logo trên mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 mt-2 flex-wrap">
          <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-600 shrink-0"></div>
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-tight">Đơn hàng</div>
              <div className="text-xs font-bold text-gray-900 leading-tight">{orders.length}</div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-600 shrink-0"></div>
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-tight">SKU</div>
              <div className="text-xs font-bold text-gray-900 leading-tight">{totalSkus}</div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-600 shrink-0"></div>
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-tight">PCS</div>
              <div className="text-xs font-bold text-gray-900 leading-tight">{totalPcs}</div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shrink-0"></div>
            <div>
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-tight">Lists</div>
              <div className="text-xs font-bold text-gray-900 leading-tight">{pickingLists.length}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
