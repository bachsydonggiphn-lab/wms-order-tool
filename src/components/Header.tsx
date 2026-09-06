import React from 'react';
import { Package, Layers, Sparkles, MapPin, FileSpreadsheet, Trash2, Truck } from 'lucide-react';
import { RawOrderRow, CarrierCode } from '../types';

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
      <div className="w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-xs text-white shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-semibold tracking-tight text-gray-900">
                  Warehouse<span className="text-indigo-600">.matrix</span>
                </h1>
                <span className="text-[11px] font-medium text-gray-500 px-2.5 py-0.5 bg-gray-100 rounded-full border border-gray-200">
                  Google Apps Script Engine
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Trích xuất Order No, Picking List, gộp PCS, phân nhóm 13 khu vực & ĐVVC (JNT, SPX, GHN, GHN TikTok, VNPost, Khác)
              </p>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Đơn hàng</div>
                <div className="text-xs font-bold text-gray-900 leading-tight">{orders.length}</div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Mã SKU</div>
                <div className="text-xs font-bold text-gray-900 leading-tight">{totalSkus}</div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-purple-600"></div>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Tổng PCS</div>
                <div className="text-xs font-bold text-gray-900 leading-tight">{totalPcs}</div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Picking List</div>
                <div className="text-xs font-bold text-gray-900 leading-tight">
                  {pickingLists.length}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 ml-auto md:ml-2">
              {onOpenWmsSync && (
                <button
                  onClick={onOpenWmsSync}
                  title="Kết nối trực tiếp YunWMS (czwh.wms.yunwms.com) để lấy đơn Submitted"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer ring-2 ring-indigo-500/20"
                >
                  <span className="text-amber-300">⚡</span>
                  <span>Đồng Bộ YunWMS</span>
                </button>
              )}

              <button
                onClick={onLoadSample}
                title="Tải dữ liệu mẫu thực tế của kho"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-colors shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dữ liệu mẫu</span>
              </button>

              {orders.length > 0 && (
                <button
                  onClick={onClear}
                  title="Xóa toàn bộ dữ liệu đơn hàng cũ để nạp mới"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Xóa dữ liệu</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
