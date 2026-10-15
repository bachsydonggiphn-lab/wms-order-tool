import React from 'react';
import { Warehouse, Truck, Boxes, Sparkles } from 'lucide-react';
import { HotSkuAnalyticsResult } from '../../../../sqliteDb';

interface Warehouse2DSlottingMapProps {
  analytics: HotSkuAnalyticsResult | null;
  selectedZoneFilter: 'ALL' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'INBOUND';
  onSelectZoneFilter: (zone: 'ALL' | 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'INBOUND') => void;
}

export const Warehouse2DSlottingMap: React.FC<Warehouse2DSlottingMapProps> = ({
  analytics,
  selectedZoneFilter,
  onSelectZoneFilter,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-indigo-600" />
            <span>Sơ Đồ Bố Trí Kệ Kho Trực Quan 2D (Warehouse Slotting Map - VN02)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Bấm vào từng khu vực kệ để lọc danh sách SKU tương ứng. Hàng bán chạy nhất được xếp gần bàn đóng gói để tối ưu thời gian nhặt hàng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Lọc theo Khu Vực Kệ:</span>
          <button
            type="button"
            onClick={() => onSelectZoneFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              selectedZoneFilter === 'ALL'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Tất Cả
          </button>
        </div>
      </div>

      {/* Bản Đồ 2D Grid Layout */}
      <div className="p-6 bg-slate-900 rounded-2xl border border-slate-800 text-white shadow-inner relative overflow-hidden">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
          {/* Cột 1: CỬA XUẤT NHẬP & BÀN ĐÓNG GÓI */}
          <div className="md:col-span-3 flex flex-col gap-4">
            {/* Dock Cửa Xuất Hàng */}
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 text-center space-y-1">
              <div className="inline-flex p-2 rounded-lg bg-blue-500/20 text-blue-400 mb-1">
                <Truck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Cửa Xuất Nhập (Dock)</h4>
              <p className="text-[11px] text-slate-400">Tiếp nhận xe bưu tá & Xe hàng</p>
            </div>

            {/* Bàn Đóng Gói / Kiểm Hàng */}
            <div className="p-4 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-center space-y-1 flex-1 flex flex-col justify-center">
              <div className="inline-flex p-2 rounded-lg bg-indigo-500/20 text-indigo-300 mb-1 self-center">
                <Boxes className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">Bàn Đóng Gói (Packing)</h4>
              <p className="text-[11px] text-indigo-300/80">Khu vực dán mã & đóng hộp</p>
              <div className="mt-2 text-[10px] text-amber-300 font-semibold bg-amber-500/10 py-1 px-2 rounded border border-amber-500/20">
                ⚡ Cần lấy hàng nhanh nhất tại đây
              </div>
            </div>
          </div>

          {/* Cột 2: ZONE A - VÙNG VÀNG MẶT TIỀN (GOLDEN ZONE) */}
          <div
            onClick={() => onSelectZoneFilter(selectedZoneFilter === 'ZONE_A' ? 'ALL' : 'ZONE_A')}
            className={`md:col-span-3 p-5 rounded-xl border cursor-pointer transition-all ${
              selectedZoneFilter === 'ZONE_A'
                ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/50 shadow-xl'
                : 'bg-amber-950/40 border-amber-500/40 hover:bg-amber-950/60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider shadow-sm">
                Zone A - Vùng Vàng
              </span>
              <span className="text-xs font-bold text-amber-300">
                {analytics?.classACount || 0} SKUs
              </span>
            </div>
            <h3 className="font-bold text-sm text-amber-200">Kệ Mặt Tiền (Tầng 1-2)</h3>
            <p className="text-[11px] text-amber-300/70 mt-1 leading-relaxed">
              Dành cho hàng Siêu Chạy (Top 80% doanh số). Ngang tầm tay với, cách bàn đóng gói &lt; 5m.
            </p>

            {/* Incoming Reservation Banner for Zone A */}
            {(analytics?.stockoutIncomingCount || 0) > 0 && (
              <div className="mt-3 p-2.5 rounded-lg bg-orange-500/20 border border-orange-500/50 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>⭐ Đặt Chỗ Đón Hàng Về ({analytics?.stockoutIncomingCount} mã)</span>
                  </span>
                </div>
                <p className="text-[10px] text-amber-200/80 mt-0.5">
                  Đang đứt hàng, chuẩn bị sẵn ô kệ mặt tiền để khi xe bốc hàng về xếp ngay!
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {analytics?.items
                    .filter((it) => it.isStockoutWithIncoming && it.abcRank === 'A')
                    .slice(0, 4)
                    .map((it) => (
                      <span
                        key={it.sku}
                        className="px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-400/80 text-amber-300 font-mono text-[9px] font-bold"
                      >
                        {it.sku} (+{it.onWay})
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Sample Top SKUs in Zone A */}
            <div className="mt-3.5 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Top Mã Ưu Tiên:</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {analytics?.items
                  .filter((it) => it.abcRank === 'A')
                  .slice(0, 6)
                  .map((it) => (
                    <span
                      key={it.sku}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[10px] font-mono font-bold"
                    >
                      {it.sku} ({it.totalSold})
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Cột 3: ZONE B - KỆ TRUNG TÂM (MIDDLE ZONE) */}
          <div
            onClick={() => onSelectZoneFilter(selectedZoneFilter === 'ZONE_B' ? 'ALL' : 'ZONE_B')}
            className={`md:col-span-3 p-5 rounded-xl border cursor-pointer transition-all ${
              selectedZoneFilter === 'ZONE_B'
                ? 'bg-blue-950/80 border-blue-400 ring-2 ring-blue-400/50 shadow-xl'
                : 'bg-blue-950/40 border-blue-500/30 hover:bg-blue-950/60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-500 text-white uppercase tracking-wider">
                Zone B - Trung Tâm
              </span>
              <span className="text-xs font-bold text-blue-300">
                {analytics?.classBCount || 0} SKUs
              </span>
            </div>
            <h3 className="font-bold text-sm text-blue-200">Kệ Giữa Kho (Tầng 2-3)</h3>
            <p className="text-[11px] text-blue-300/70 mt-1 leading-relaxed">
              Dành cho hàng Chạy Vừa (15% doanh số). Lối đi chuẩn, lấy hàng xe đẩy 2 chiều.
            </p>

            <div className="mt-3.5 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Mã Tiêu Biểu:</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {analytics?.items
                  .filter((it) => it.abcRank === 'B')
                  .slice(0, 6)
                  .map((it) => (
                    <span
                      key={it.sku}
                      className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30 text-[10px] font-mono"
                    >
                      {it.sku}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Cột 4: ZONE C - TẦNG CAO & PHÍA SAU (STORAGE ZONE) */}
          <div
            onClick={() => onSelectZoneFilter(selectedZoneFilter === 'ZONE_C' ? 'ALL' : 'ZONE_C')}
            className={`md:col-span-3 p-5 rounded-xl border cursor-pointer transition-all ${
              selectedZoneFilter === 'ZONE_C'
                ? 'bg-slate-800 border-slate-400 ring-2 ring-slate-400/50 shadow-xl'
                : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-600 text-slate-100 uppercase tracking-wider">
                Zone C - Tầng Cao / Sâu
              </span>
              <span className="text-xs font-bold text-slate-400">
                {analytics?.classCCount || 0} SKUs
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-300">Kệ Tầng 4-5 Hoặc Cuối Kho</h3>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
              Dành cho hàng Bán Chậm hoặc Tồn kho dự trữ (5% doanh số). Tránh choán chỗ vùng mặt tiền.
            </p>

            <div className="mt-3.5 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hàng Chậm / Dự Trữ:</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {analytics?.items
                  .filter((it) => it.abcRank === 'C')
                  .slice(0, 6)
                  .map((it) => (
                    <span
                      key={it.sku}
                      className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600 text-[10px] font-mono"
                    >
                      {it.sku}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
