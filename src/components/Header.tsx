import { Package, Layers, Sparkles, MapPin, FileSpreadsheet, Trash2, Truck, Flame, Warehouse, Printer } from 'lucide-react';
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
  const isOrderOps =
    activeTab !== 'hot_sku_slotting' &&
    activeTab !== 'inventory_query' &&
    activeTab !== 'order_pdf_print';

  return (
    <header className="bg-white border-b border-gray-200 shrink-0 sticky top-0 z-30 shadow-xs">
      <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-2 sm:py-2.5">
        {/* Row 1: Logo + 4 Nút Tổng Master Modules + Actions */}
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

          {/* 4 NÚT TỔNG MASTER MODULES NẰM TRÊN CÙNG CẠNH LOGO - Tối ưu cuộn ngang mượt mà trên Mobile */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/90 shadow-2xs overflow-x-auto max-w-full no-scrollbar shrink-0">
            {/* 1. Vận Hành Đơn Hàng */}
            <button
              type="button"
              onClick={() => setActiveTab(lastOrderSubTab)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 ${
                isOrderOps
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm ring-2 ring-indigo-200'
                  : 'text-slate-700 hover:text-indigo-900 hover:bg-white/80'
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">1. Đơn Hàng</span>
              <span className="hidden sm:inline">1. Vận Hành Đơn Hàng</span>
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
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 ${
                activeTab === 'hot_sku_slotting'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white shadow-sm ring-2 ring-orange-200'
                  : 'text-slate-700 hover:text-orange-900 hover:bg-white/80'
              }`}
            >
              <Flame className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">2. Bán Chạy</span>
              <span className="hidden sm:inline">2. Hàng Bán Chạy & Bố Trí Kho</span>
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
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 ${
                activeTab === 'inventory_query'
                  ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white shadow-sm ring-2 ring-cyan-200'
                  : 'text-slate-700 hover:text-cyan-900 hover:bg-white/80'
              }`}
            >
              <Warehouse className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">3. Tồn Kho</span>
              <span className="hidden sm:inline">3. Tra Cứu Tồn Kho WMS</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                  activeTab === 'inventory_query' ? 'bg-white/20 text-white' : 'bg-cyan-100 text-cyan-800'
                }`}
              >
                VN02
              </span>
            </button>

            {/* 4. Tổng Hợp PDF & Nhặt Hàng (Độc Lập) */}
            <button
              type="button"
              onClick={() => setActiveTab('order_pdf_print')}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs shrink-0 ${
                activeTab === 'order_pdf_print'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-sm ring-2 ring-emerald-200'
                  : 'text-slate-700 hover:text-emerald-900 hover:bg-white/80'
              }`}
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">4. In PDF</span>
              <span className="hidden sm:inline">4. Tổng Hợp PDF & Nhặt Hàng</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                  activeTab === 'order_pdf_print' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                Tìm & In 1 Lần
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

