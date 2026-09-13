import React, { useState } from 'react';
import {
  Layers,
  MapPin,
  Sparkles,
  Search,
  Filter,
  Download,
  Printer,
  Settings,
  TableProperties,
  ListOrdered,
  Code2,
  Boxes,
  Truck,
  CheckCircle2,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { RawOrderRow, CarrierCode } from '../types';
import { CARRIER_CONFIG } from '../utils/orderProcessor';
import { CopyCarrierOrdersModal } from './CopyCarrierOrdersModal';

export type ActiveTabType =
  | 'sku_pcs'
  | 'picking_detail'
  | 'area_group'
  | 'mix_analysis'
  | 'yoga_mat'
  | 'single_pcs'
  | 'all_table'
  | 'shipped_tracking'
  | 'sku_settings'
  | 'apps_script';

interface ToolbarProps {
  activeTab: ActiveTabType;
  setActiveTab: (tab: ActiveTabType) => void;
  pickingLists: string[];
  selectedPickingList: string;
  setSelectedPickingList: (pl: string) => void;
  selectedCarrier: CarrierCode;
  setSelectedCarrier: (carrier: CarrierCode) => void;
  carrierCounts: Record<CarrierCode, number>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onExportExcel: () => void;
  onPrintPreview: () => void;
  totalOrders: number;
  orders?: RawOrderRow[];
}

export const Toolbar: React.FC<ToolbarProps> = ({
  activeTab,
  setActiveTab,
  pickingLists = [],
  selectedPickingList = '',
  setSelectedPickingList,
  selectedCarrier = 'ALL',
  setSelectedCarrier = (_c: CarrierCode) => {},
  carrierCounts = { ALL: 0, JNT: 0, SPX: 0, GHN: 0, OTHER: 0 },
  searchTerm = '',
  setSearchTerm,
  onExportExcel,
  onPrintPreview,
  totalOrders = 0,
  orders = [],
}) => {
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [copyModalCarrier, setCopyModalCarrier] = useState<CarrierCode>('ALL');
  const [quickCopiedCarrier, setQuickCopiedCarrier] = useState<CarrierCode | null>(null);
  const [quickToastMessage, setQuickToastMessage] = useState<string | null>(null);

  const handleQuickCopyOrders = (carrierCode: CarrierCode, carrierLabel: string) => {
    if (!orders || orders.length === 0) {
      alert('Không có dữ liệu đơn hàng để sao chép.');
      return;
    }

    const list = orders.filter((o) => {
      if (selectedPickingList && o.pickingList !== selectedPickingList) return false;
      if (carrierCode === 'ALL') return true;
      return o.carrier === carrierCode;
    });

    if (list.length === 0) {
      alert(`Không có đơn hàng nào cho hãng ${carrierLabel}!`);
      return;
    }

    const text = list.map((o) => o.orderNo).filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);

    setQuickCopiedCarrier(carrierCode);
    setQuickToastMessage(`Đã copy ${list.length} mã đơn ${carrierLabel}`);
    setTimeout(() => {
      setQuickCopiedCarrier(null);
      setQuickToastMessage(null);
    }, 2200);
  };
  const tabs = [
    {
      id: 'sku_pcs' as ActiveTabType,
      label: 'Tổng hợp SKU & Gộp PCS',
      icon: Layers,
      badge: 'Cột S:T & PCS',
    },
    {
      id: 'shipped_tracking' as ActiveTabType,
      label: 'Tra Cứu Vận Đơn Shipped',
      icon: Truck,
      badge: 'E11 = 8 & Realtime',
    },
    {
      id: 'picking_detail' as ActiveTabType,
      label: 'Tổng Hợp Theo Picking List',
      icon: ListOrdered,
      badge: `${pickingLists.length} Lists`,
    },
    {
      id: 'area_group' as ActiveTabType,
      label: 'Phân nhóm Khu Vực',
      icon: MapPin,
      badge: '13 Khu Vực',
    },
    {
      id: 'mix_analysis' as ActiveTabType,
      label: 'Bóc Tách Đơn MIX',
      icon: Boxes,
      badge: 'Lấy 1 lần',
    },
    {
      id: 'yoga_mat' as ActiveTabType,
      label: 'Phân loại Thảm Yoga',
      icon: Sparkles,
      badge: 'Yoga & L46',
    },
    {
      id: 'single_pcs' as ActiveTabType,
      label: 'Phân Tách SKU & Đóng Gói PCS',
      icon: Zap,
      badge: '1, 2, 3, Đồng chất...',
    },
    {
      id: 'all_table' as ActiveTabType,
      label: 'Dữ Liệu Gốc & Tra Cứu',
      icon: TableProperties,
      badge: `${totalOrders} đơn`,
    },
    {
      id: 'sku_settings' as ActiveTabType,
      label: 'Cấu hình SKU',
      icon: Settings,
    },
    {
      id: 'apps_script' as ActiveTabType,
      label: 'Mã Google Apps Script',
      icon: Code2,
      badge: 'Code.gs',
    },
  ];

  const carrierOptions: { code: CarrierCode; label: string; prefixHint: string; colorStyle: string; activeStyle: string }[] = [
    {
      code: 'ALL',
      label: 'Tất Cả ĐVVC',
      prefixHint: 'Tất cả đơn',
      colorStyle: 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50',
      activeStyle: 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200',
    },
    {
      code: 'SPX',
      label: 'Shopee Express',
      prefixHint: 'SPX, SPXVN...',
      colorStyle: 'border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-50',
      activeStyle: 'bg-orange-600 text-white border-orange-600 shadow-xs ring-2 ring-orange-200',
    },
    {
      code: 'JNT',
      label: 'J&T Express',
      prefixHint: 'Đầu 8..., JT...',
      colorStyle: 'border-red-200 text-red-700 bg-red-50/50 hover:bg-red-50',
      activeStyle: 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-200',
    },
    {
      code: 'JT_CARGO',
      label: 'J&T Cargo',
      prefixHint: 'Đầu 530..., 53...',
      colorStyle: 'border-rose-300 text-rose-800 bg-rose-50/50 hover:bg-rose-50',
      activeStyle: 'bg-rose-700 text-white border-rose-700 shadow-xs ring-2 ring-rose-200',
    },
    {
      code: 'GHN',
      label: 'GHN',
      prefixHint: 'GY, GHN...',
      colorStyle: 'border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50',
      activeStyle: 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-200',
    },
    {
      code: 'GHN_TIKTOK',
      label: 'GHN TikTok',
      prefixHint: 'VNGH...',
      colorStyle: 'border-cyan-300 text-cyan-800 bg-cyan-50/50 hover:bg-cyan-50',
      activeStyle: 'bg-cyan-700 text-white border-cyan-700 shadow-xs ring-2 ring-cyan-200',
    },
    {
      code: 'NINJAVAN',
      label: 'Ninja Van',
      prefixHint: 'NIVN, SHP...',
      colorStyle: 'border-purple-300 text-purple-800 bg-purple-50/50 hover:bg-purple-50',
      activeStyle: 'bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-200',
    },
    {
      code: 'VIETTELPOST',
      label: 'Viettel Post',
      prefixHint: 'VTP, VT...',
      colorStyle: 'border-emerald-300 text-emerald-800 bg-emerald-50/50 hover:bg-emerald-50',
      activeStyle: 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-200',
    },
    {
      code: 'VNPOST',
      label: 'VNPost / EMS',
      prefixHint: 'EA, EB...',
      colorStyle: 'border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-50',
      activeStyle: 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-200',
    },
    {
      code: 'BEST',
      label: 'Best Express',
      prefixHint: '61..., BEST...',
      colorStyle: 'border-sky-300 text-sky-800 bg-sky-50/50 hover:bg-sky-50',
      activeStyle: 'bg-sky-600 text-white border-sky-600 shadow-xs ring-2 ring-sky-200',
    },
    {
      code: 'OTHER',
      label: 'Khác / Chưa Rõ',
      prefixHint: 'ĐVVC khác',
      colorStyle: 'border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200',
      activeStyle: 'bg-slate-700 text-white border-slate-700 shadow-xs ring-2 ring-slate-300',
    },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xs mb-6 overflow-hidden">
      {/* Top Filter and Actions Row */}
      <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Picking List Selector (Tương đương ô V1 trong Google Sheet) */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white px-2.5 py-1.5 rounded-xl border border-gray-200 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>Picking List (Ô V1):</span>
          </div>

          <select
            value={selectedPickingList}
            onChange={(e) => setSelectedPickingList(e.target.value)}
            className="text-xs font-medium bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer min-w-[200px]"
          >
            <option value="">-- Tất cả Picking Lists (Toàn bộ đơn) --</option>
            {pickingLists.map((pl) => (
              <option key={pl} value={pl}>
                {pl}
              </option>
            ))}
          </select>

          {selectedPickingList && (
            <button
              onClick={() => setSelectedPickingList('')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline px-1 cursor-pointer"
            >
              Xem tất cả
            </button>
          )}
        </div>

        {/* Search & Export Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã đơn, SKU, Tracking..."
              className="text-xs pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-56 shadow-2xs"
            />
          </div>

          {/* Export Excel Button */}
          <button
            onClick={onExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Xuất file Excel đầy đủ các sheet và màu sắc chuẩn Google Sheets"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel (.xlsx)</span>
          </button>

          {/* Print Checklist Button */}
          <button
            onClick={onPrintPreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-colors cursor-pointer"
            title="In phiếu gom hàng cho kho (Hỗ trợ khổ tem nhiệt 100×150 mm & A4)"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>In Phiếu</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded-md font-mono font-bold border border-indigo-200">
              100×150
            </span>
          </button>
        </div>
      </div>

      {/* Row 2: Chọn Đơn Vị Vận Chuyển Để Đóng Gói (J&T: 862, Shopee: SPX, GHN: GY, Khác / Tất cả) */}
      <div className="px-4 py-3 bg-indigo-50/40 border-b border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 bg-white px-2.5 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
            <Truck className="w-4 h-4 text-indigo-600" />
            <span>Đóng Gói Theo ĐVVC:</span>
          </div>

          {/* Nút mở Modal Sao Chép Đơn Theo Hãng */}
          <button
            type="button"
            onClick={() => {
              setCopyModalCarrier(selectedCarrier);
              setIsCopyModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-xl shadow-2xs transition-all cursor-pointer hover:border-indigo-300"
            title="Mở bảng sao chép mã đơn hàng hoặc tracking theo từng hãng vận chuyển"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-600" />
            <span>Copy Đơn Theo Hãng</span>
          </button>

          {quickToastMessage && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 animate-in fade-in zoom-in-95 duration-150">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{quickToastMessage}</span>
            </span>
          )}

          <span className="text-[11px] text-gray-500 hidden xl:inline">
            (Bấm icon 📋 trên từng hãng để copy nhanh mã đơn)
          </span>
        </div>

        {/* Carrier Badges Filter Group & 1-Click Copy */}
        <div className="flex items-center flex-wrap gap-2">
          {carrierOptions.map((opt) => {
            const count = carrierCounts[opt.code] || 0;
            const isSelected = selectedCarrier === opt.code;
            const isCopied = quickCopiedCarrier === opt.code;

            return (
              <div
                key={opt.code}
                className={`inline-flex items-center rounded-xl border transition-all ${
                  isSelected ? opt.activeStyle : opt.colorStyle
                }`}
              >
                {/* Nút lọc hãng */}
                <button
                  onClick={() => setSelectedCarrier(opt.code)}
                  className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  <span>{opt.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/30 text-white'
                        : 'bg-black/5 text-gray-700'
                    }`}
                  >
                    {count}
                  </span>
                  <span className="text-[10px] opacity-75 hidden xl:inline">
                    ({opt.prefixHint})
                  </span>
                </button>

                {/* Nút Copy Nhanh 1-Click trực tiếp trên từng Badge */}
                {count > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickCopyOrders(opt.code, opt.label);
                    }}
                    title={`Click để copy nhanh ${count} mã đơn của ${opt.label} (mỗi mã 1 dòng)`}
                    className={`p-1.5 mr-1 rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'hover:bg-white/20 text-white'
                        : 'hover:bg-black/10 text-gray-600'
                    }`}
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center overflow-x-auto scrollbar-none p-2 gap-1 bg-white">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Modal Sao Chép Đơn Theo Hãng Vận Chuyển */}
      {isCopyModalOpen && (
        <CopyCarrierOrdersModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          orders={orders || []}
          selectedPickingList={selectedPickingList}
          initialCarrier={copyModalCarrier}
        />
      )}
    </div>
  );
};
