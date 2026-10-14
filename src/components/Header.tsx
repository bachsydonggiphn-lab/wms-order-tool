import React from 'react';
import { Package, Layers, Sparkles, MapPin, FileSpreadsheet, Trash2, Truck, Flame, Warehouse } from 'lucide-react';
import { RawOrderRow, CarrierCode } from '../types';
import { GKP_LOGO_PNG_BASE64 } from '../utils/logoBase64';
import { ActiveTabType } from './Toolbar';

interface HeaderProps {
  orders: RawOrderRow[];
  totalSkus: number;
  totalPcs: number;
  pickingLists: string[];
  carrierCounts?: Record<CarrierCode, number>;
  onLoadSample: () => void;
  onClear: () => void;
  onOpenWmsSync?: () => void;
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  lastOrderSubTab?: ActiveTabType;
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
  activeTab,
  setActiveTab,
  lastOrderSubTab = 'sku_pcs',
}) => {
  const isOrderOps = activeTab !== 'hot_sku_slotting' && activeTab !== 'inventory_query';

  return (
    <header className="bg-white border-b border-gray-200 shrink-0 sticky top-0 z-30 shadow-xs">
      <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-2.5">
        {/* Row 1: Logo + 3 Nút Tổng Master Modules + Actions */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
          {/* Logo & App Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="h-9 sm:h-10 px-2 bg-white rounded-xl flex items-center justify-center border border-slate-200/90 shadow-2xs shrink-0 overflow-hidden">
              <img
                src={GKP_LOGO_PNG_BASE64}
                alt="Logo GKP Kho WMS"
                className="h-7 sm:h-8 w-auto object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-gray-900 whitespace-nowrap">
                  Warehouse<span className="text-indigo-600">.matrix</span>
                </h1>
                <span className="text-[10px] font-bold text-indigo-700 px-1.5 py-0.5 bg-indigo-50 rounded-full border border-indigo-200">
                  v2.7
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-gray-500 leading-none mt-0.5">
                Kho YunWMS VN02 • Hồ Chí Minh
              </p>
            </div>
          </div>

          {/* 3 NÚT TỔNG MASTER MODULES NẰM TRÊN CÙNG CẠNH LOGO */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/90 shrink-0 shadow-2xs">
            {/* 1. Vận Hành Đơn Hàng */}
            <button
              type="button"
              onClick={() => setActiveTab(lastOrderSubTab)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                isOrderOps
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm ring-2 ring-indigo-200'
                  : 'text-slate-700 hover:text-indigo-900 hover:bg-white/80'
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>1. Vận Hành Đơn Hàng</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                  isOrderOps ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {orders.length}
              </span>
            </button>

            {/* 2. Hàng Bán Chạy & Bố Trí Kho */}
            <button
              type="button"
              onClick={() => setActiveTab('hot_sku_slotting')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                activeTab === 'hot_sku_slotting'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-sm ring-2 ring-orange-200'
                  : 'text-slate-700 hover:text-orange-900 hover:bg-white/80'
              }`}
            >
              <Flame className="w-4 h-4 shrink-0" />
              <span>2. Hàng Bán Chạy & Bố Trí Kho</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                  activeTab === 'hot_sku_slotting' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-800'
                }`}
              >
                ABC
              </span>
            </button>

            {/* 3. Tra Cứu Tồn Kho WMS */}
            <button
              type="button"
              onClick={() => setActiveTab('inventory_query')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                activeTab === 'inventory_query'
                  ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white shadow-sm ring-2 ring-cyan-200'
                  : 'text-slate-700 hover:text-cyan-900 hover:bg-white/80'
              }`}
            >
              <Warehouse className="w-4 h-4 shrink-0" />
              <span>3. Tra Cứu Tồn Kho WMS</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                  activeTab === 'inventory_query' ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-800'
                }`}
              >
                VN02
              </span>
            </button>
          </div>

          {/* Action Buttons - Chỉ hiển thị khi đang trong phân hệ 1 (Vận Hành Đơn Hàng) */}
          {isOrderOps && (
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {onOpenWmsSync && (
                <button
                  onClick={onOpenWmsSync}
                  title="Kết nối trực tiếp YunWMS để lấy đơn Submitted"
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer"
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
          )}
        </div>

        {/* Row 2: Stats Cards - Chỉ hiển thị khi đang trong phân hệ 1 (Vận Hành Đơn Hàng) */}
        {isOrderOps && (
          <div className="flex items-center gap-1.5 sm:gap-2.5 mt-2 flex-wrap">
            <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5 shadow-2xs">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-600 shrink-0"></div>
              <div>
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-tight">Đơn hàng</div>
                <div className="text-xs font-bold text-gray-900 leading-tight">{orders.length}</div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5 shadow-2xs">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-600 shrink-0"></div>
              <div>
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-tight">SKU</div>
                <div className="text-xs font-bold text-gray-900 leading-tight">{totalSkus}</div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5 shadow-2xs">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-600 shrink-0"></div>
              <div>
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-tight">PCS</div>
                <div className="text-xs font-bold text-gray-900 leading-tight">{totalPcs}</div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2.5 shadow-2xs">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500 shrink-0"></div>
              <div>
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-tight">Lists</div>
                <div className="text-xs font-bold text-gray-900 leading-tight">{pickingLists.length}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

