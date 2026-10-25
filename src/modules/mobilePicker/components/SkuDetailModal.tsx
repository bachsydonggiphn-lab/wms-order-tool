import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Image as ImageIcon,
  MapPin,
  Package,
  RefreshCw,
  Check,
  AlertTriangle,
  Layers,
  Warehouse,
  Boxes,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { PickingItemDetail } from '../types';
import { getCachedInventory } from '../../../services/inventoryService';

interface SkuDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PickingItemDetail | null;
  onConfirmPicked?: (sku: string) => void;
}

interface SkuStockState {
  total: number;
  sellable: number;
  pending: number;
  onWay: number;
  unsellable: number;
  warehouseName: string;
  productTitle: string;
  updateTime: string;
  locations: string[];
  loading: boolean;
  source: 'cache' | 'live' | 'initial';
  lastChecked: string;
}

export const SkuDetailModal: React.FC<SkuDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onConfirmPicked,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingImg, setIsLoadingImg] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Helper tìm thông tin tồn kho từ cache nội bộ (0ms)
  const getInitialStock = useCallback((targetItem: PickingItemDetail | null): SkuStockState => {
    if (!targetItem) {
      return {
        total: 0,
        sellable: 0,
        pending: 0,
        onWay: 0,
        unsellable: 0,
        warehouseName: 'VN02 [Đồng Nai]',
        productTitle: '',
        updateTime: '',
        locations: [],
        loading: false,
        source: 'initial',
        lastChecked: '',
      };
    }

    try {
      const cached = getCachedInventory();
      if (cached && Array.isArray(cached.items)) {
        const cleanSku = targetItem.sku.trim().toUpperCase();
        const found = cached.items.find(
          (i: any) => (i.sku || i.productBarcode || '').trim().toUpperCase() === cleanSku
        );
        if (found) {
          return {
            total: found.inUsed ?? found.sellable ?? targetItem.inventoryOnHand ?? 0,
            sellable: found.sellable ?? 0,
            pending: found.pending ?? 0,
            onWay: found.onWay ?? 0,
            unsellable: found.unsellable ?? 0,
            warehouseName: found.warehouseName || 'VN02 [Đồng Nai]',
            productTitle: found.title || found.productName || targetItem.productTitle || targetItem.sku,
            updateTime: found.updateTime || '',
            locations: found.locations && found.locations.length > 0 ? found.locations : [targetItem.area || 'Kho VN02'],
            loading: false,
            source: 'cache',
            lastChecked: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
        }
      }
    } catch (e) {}

    return {
      total: targetItem.inventoryOnHand ?? 0,
      sellable: targetItem.inventoryAvailable ?? targetItem.inventoryOnHand ?? 0,
      pending: 0,
      onWay: 0,
      unsellable: 0,
      warehouseName: 'VN02 [Đồng Nai]',
      productTitle: targetItem.productTitle || targetItem.sku,
      updateTime: '',
      locations: targetItem.inventoryLocations ?? (targetItem.location ? [targetItem.location] : ['Khu ' + (targetItem.area || 'Chung')]),
      loading: true,
      source: 'initial',
      lastChecked: '',
    };
  }, []);

  const [stockInfo, setStockInfo] = useState<SkuStockState>(() => getInitialStock(item));

  // Tra cứu tồn kho thời gian thực từ YunWMS
  const fetchLiveInventory = useCallback(async (skuToFetch: string) => {
    if (!skuToFetch) return;
    setStockInfo(prev => ({ ...prev, loading: true }));

    try {
      const res = await fetch('/api/wms/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouse: '7',
          productBarcode: skuToFetch.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          const cleanSku = skuToFetch.trim().toUpperCase();
          const found = data.items.find(
            (i: any) => (i.sku || i.productBarcode || '').trim().toUpperCase() === cleanSku
          );
          if (found) {
            setStockInfo({
              total: found.inUsed ?? found.sellable ?? 0,
              sellable: found.sellable ?? 0,
              pending: found.pending ?? 0,
              onWay: found.onWay ?? 0,
              unsellable: found.unsellable ?? 0,
              warehouseName: found.warehouseName || 'VN02 [Đồng Nai]',
              productTitle: found.title || found.productName || item?.productTitle || cleanSku,
              updateTime: found.updateTime || '',
              locations: found.locations && found.locations.length > 0 ? found.locations : [item?.area || 'Kho VN02'],
              loading: false,
              source: 'live',
              lastChecked: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            });
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Lỗi khi tra cứu tồn kho trực tiếp:', e);
    }

    setStockInfo(prev => ({ ...prev, loading: false }));
  }, [item?.area, item?.productTitle]);

  // Tải ảnh SKU qua backend API
  const fetchImage = useCallback(async (skuToFetch: string) => {
    if (!skuToFetch) return;
    setIsLoadingImg(true);
    setImgError(false);

    try {
      const res = await fetch(`/api/wms/sku-image?sku=${encodeURIComponent(skuToFetch.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.imageUrl) {
          setImageUrl(data.imageUrl);
          setIsLoadingImg(false);
          return;
        }
      }
    } catch (e) {}

    setImageUrl(item?.productImgUrl || null);
    setIsLoadingImg(false);
  }, [item?.productImgUrl]);

  // Khi modal mở hoặc item thay đổi: Nạp ngay 0ms từ cache, đồng thời gọi live API
  useEffect(() => {
    if (!isOpen || !item) return;

    // 1. Nạp ngay tồn kho từ cache nếu có (0ms phản hồi ngay lập tức cho người dùng)
    const instantStock = getInitialStock(item);
    setStockInfo(instantStock);

    // 2. Tải ảnh SKU
    fetchImage(item.sku);

    // 3. Tải tồn kho live từ YunWMS
    fetchLiveInventory(item.sku);
  }, [isOpen, item, getInitialStock, fetchImage, fetchLiveInventory]);

  if (!isOpen || !item) return null;

  const isStockSufficient = stockInfo.total >= item.quantityNeeded;
  const isOutOfStock = stockInfo.total <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[94vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Khu: {item.area || 'Chung'}
              </span>

              {item.isPicked && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đã Nhặt
                </span>
              )}

              {/* Tag trạng thái tồn kho */}
              {isOutOfStock ? (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-400/30 flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-3 h-3" /> HẾT TỒN KHO (0 PCS)
                </span>
              ) : isStockSufficient ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Tồn Kho Đủ Nhặt
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Tồn Thấp Hơn Đơn
                </span>
              )}
            </div>

            <h2 className="text-xl font-black tracking-tight text-white mt-1 break-all font-mono">
              {item.sku}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          
          {/* ======================================================== */}
          {/* KHỐI 1: TỒN KHO THỰC TẾ (IN USED) - HIỂN THỊ NỔI BẬT NHẤT */}
          {/* ======================================================== */}
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/70 rounded-3xl p-4 sm:p-5 border-2 border-emerald-300/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-emerald-700" />
                  TỒN KHO THỰC TẾ TRONG KHO (IN USED)
                </span>
              </div>

              <button
                type="button"
                onClick={() => fetchLiveInventory(item.sku)}
                disabled={stockInfo.loading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold text-emerald-800 bg-white/80 hover:bg-white border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                title="Bấm để đồng bộ số tồn thời gian thực từ YunWMS"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${stockInfo.loading ? 'animate-spin' : ''}`} />
                <span>{stockInfo.loading ? 'Đang kiểm tra...' : 'Làm mới'}</span>
              </button>
            </div>

            {/* Số tồn to đùng, dễ nhìn */}
            <div className="flex items-baseline justify-between gap-2 mt-1">
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                  isOutOfStock ? 'text-rose-600' : 'text-emerald-900'
                }`}>
                  {stockInfo.total.toLocaleString()}
                </span>
                <span className="text-sm sm:text-base font-extrabold text-emerald-800 uppercase">
                  PCS Có Sẵn
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-emerald-800 block">
                  Cần nhặt đợt này:
                </span>
                <span className="text-lg font-black font-mono text-amber-700">
                  {item.quantityNeeded} PCS
                </span>
              </div>
            </div>

            {/* Thông báo phân tích khả năng đáp ứng */}
            <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between text-xs font-semibold text-emerald-900">
              <span className="flex items-center gap-1.5">
                {isOutOfStock ? (
                  <span className="text-rose-700 font-bold flex items-center gap-1">
                    ⚠️ Kho đã hết sạch mã SKU này! Vui lòng báo quản lý kho kiểm tra ngay.
                  </span>
                ) : isStockSufficient ? (
                  <span className="text-emerald-800 flex items-center gap-1">
                    ✅ Đủ tồn kho để nhặt (Còn dư <strong>{(stockInfo.total - item.quantityNeeded).toLocaleString()} PCS</strong> sau khi lấy).
                  </span>
                ) : (
                  <span className="text-amber-800 font-bold flex items-center gap-1">
                    ⚠️ Tồn thực tế ({stockInfo.total}) nhỏ hơn số lượng cần nhặt ({item.quantityNeeded})!
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* KHỐI 2: CHI TIẾT TRẠNG THÁI TỒN KHO YUNWMS (BẢNG CON)    */}
          {/* ======================================================== */}
          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Có thể bán */}
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Có Thể Bán
              </span>
              <span className="text-xl font-black font-mono text-blue-900 mt-0.5 block">
                {stockInfo.sellable.toLocaleString()}
              </span>
              <span className="text-[10px] text-blue-600">PCS Sellable</span>
            </div>

            {/* Chờ lên kệ */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                Chờ Lên Kệ
              </span>
              <span className="text-xl font-black font-mono text-amber-900 mt-0.5 block">
                {stockInfo.pending.toLocaleString()}
              </span>
              <span className="text-[10px] text-amber-600">PCS Pending</span>
            </div>

            {/* Hàng lỗi / Defective */}
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                Hàng Lỗi
              </span>
              <span className="text-xl font-black font-mono text-rose-900 mt-0.5 block">
                {stockInfo.unsellable.toLocaleString()}
              </span>
              <span className="text-[10px] text-rose-600">PCS Lỗi</span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* KHỐI 3: ẢNH SẢN PHẨM PHÓNG TO HD TỪ YUNWMS               */}
          {/* ======================================================== */}
          <div className="w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/80 relative flex items-center justify-center min-h-[200px] max-h-[280px]">
            {isLoadingImg ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <RefreshCw className="w-7 h-7 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold">Đang tải ảnh HD từ YunWMS...</span>
              </div>
            ) : imageUrl && !imgError ? (
              <img
                src={imageUrl}
                alt={item.sku}
                onError={() => setImgError(true)}
                className="w-full h-auto max-h-[280px] object-contain transition-transform hover:scale-105 duration-300"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-1.5">
                <ImageIcon className="w-10 h-10 stroke-[1.2]" />
                <span className="text-xs font-medium">Chưa có ảnh SKU trên hệ thống</span>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* KHỐI 4: TÊN SẢN PHẨM & MÔ TẢ ĐẦY ĐỦ                      */}
          {/* ======================================================== */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Tên & Mô tả sản phẩm (WMS)
            </span>
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {stockInfo.productTitle || item.productTitle || 'Sản phẩm tiêu chuẩn kho YunWMS'}
            </p>
          </div>

          {/* ======================================================== */}
          {/* KHỐI 5: KHO HÀNG & VỊ TRÍ KỆ LƯU TRỮ (SLOTTING)          */}
          {/* ======================================================== */}
          <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-900 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-600" />
                Kệ Lưu Kho & Vị Trí Lấy Hàng
              </span>
              <span className="text-[11px] font-bold text-indigo-700 font-mono">
                {stockInfo.warehouseName}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {stockInfo.locations.map((loc, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-white text-indigo-950 font-black text-sm shadow-2xs border border-indigo-200 flex items-center gap-1.5"
                >
                  📍 Kệ: {loc}
                </span>
              ))}
            </div>

            {/* Thông tin thời gian đồng bộ */}
            {stockInfo.lastChecked && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-indigo-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  Đồng bộ lúc: <strong>{stockInfo.lastChecked}</strong>
                </span>
                <span className="font-mono text-indigo-700">
                  {stockInfo.source === 'live' ? '⚡ Dữ liệu trực tiếp' : '💾 Dữ liệu bộ nhớ tạm'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm transition-all cursor-pointer"
          >
            Đóng
          </button>

          {onConfirmPicked && (
            <button
              type="button"
              onClick={() => {
                onConfirmPicked(item.sku);
                onClose();
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all cursor-pointer ${
                item.isPicked
                  ? 'bg-slate-700 hover:bg-slate-800'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{item.isPicked ? 'Bỏ Đánh Dấu Đã Nhặt' : 'Xác Nhận Đã Nhặt Đủ'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
