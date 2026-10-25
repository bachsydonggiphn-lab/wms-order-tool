import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, MapPin, Package, RefreshCw, ZoomIn, Check, AlertCircle, Layers } from 'lucide-react';
import { PickingItemDetail } from '../types';

interface SkuDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PickingItemDetail | null;
  onConfirmPicked?: (sku: string) => void;
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
  const [stockInfo, setStockInfo] = useState<{
    total: number;
    available: number;
    locations: string[];
    loading: boolean;
  }>({
    total: item?.inventoryOnHand ?? 0,
    available: item?.inventoryAvailable ?? 0,
    locations: item?.inventoryLocations ?? (item?.location ? [item.location] : ['Khu ' + (item?.area || 'Chung')]),
    loading: false,
  });

  // Tải ảnh HD & tồn kho thời gian thực khi mở modal
  useEffect(() => {
    if (!isOpen || !item) return;

    let isMounted = true;
    setIsLoadingImg(true);
    setImgError(false);

    // 1. Tải ảnh SKU qua backend API
    const fetchImage = async () => {
      try {
        const res = await fetch(`/api/wms/sku-image?sku=${encodeURIComponent(item.sku.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && data.imageUrl) {
            setImageUrl(data.imageUrl);
            setIsLoadingImg(false);
            return;
          }
        }
      } catch (e) {}
      if (isMounted) {
        setImageUrl(item.productImgUrl || null);
        setIsLoadingImg(false);
      }
    };

    // 2. Tra cứu tồn kho thời gian thực cho SKU này
    const fetchInventory = async () => {
      setStockInfo(prev => ({ ...prev, loading: true }));
      try {
        const res = await fetch('/api/wms/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            warehouse: '7',
            productBarcode: item.sku.trim(),
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.items)) {
            const found = data.items.find((i: any) => (i.productBarcode || i.sku || '').toUpperCase() === item.sku.trim().toUpperCase());
            if (found) {
              setStockInfo({
                total: found.quantityOnHand ?? found.totalQuantity ?? 0,
                available: found.availableQuantity ?? found.quantityOnHand ?? 0,
                locations: found.locations && found.locations.length > 0 ? found.locations : [found.area || item.area || 'Kho VN02'],
                loading: false,
              });
              return;
            }
          }
        }
      } catch (e) {}
      if (isMounted) {
        setStockInfo(prev => ({ ...prev, loading: false }));
      }
    };

    fetchImage();
    fetchInventory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Khu Vực: {item.area || 'Chung'}
              </span>
              {item.isPicked && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Đã Nhặt
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white mt-1 break-all">
              {item.sku}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Ảnh Sản Phẩm Phóng To */}
          <div className="w-full bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/80 relative flex items-center justify-center min-h-[220px] max-h-[300px]">
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
                className="w-full h-auto max-h-[300px] object-contain transition-transform hover:scale-105 duration-300"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-1.5">
                <ImageIcon className="w-12 h-12 stroke-[1.2]" />
                <span className="text-xs font-medium">Chưa có ảnh SKU trên hệ thống</span>
              </div>
            )}
          </div>

          {/* Tên & Mô tả sản phẩm */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tên sản phẩm</span>
            <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-snug">
              {item.productTitle || 'Sản phẩm tiêu chuẩn kho YunWMS'}
            </p>
          </div>

          {/* Grid Thống Kê Số Lượng Cần Nhặt & Tồn Kho Thực Tế */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cột 1: Cần Nhặt Trong Đợt Này */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 flex flex-col justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Cần Nhặt Lần Này</span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-amber-900">{item.quantityNeeded}</span>
                <span className="text-xs font-bold text-amber-700">PCS</span>
              </div>
              <span className="text-[11px] text-amber-700 mt-1 font-medium">
                Cho {item.orderNos.length} đơn hàng
              </span>
            </div>

            {/* Cột 2: Tồn Kho Thời Gian Thực */}
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Tồn Kho WMS</span>
                {stockInfo.loading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />}
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-emerald-900">{stockInfo.total}</span>
                <span className="text-xs font-bold text-emerald-700">PCS</span>
              </div>
              <span className="text-[11px] text-emerald-700 mt-1 font-medium">
                Có thể bán: <strong>{stockInfo.available}</strong> PCS
              </span>
            </div>
          </div>

          {/* Vị Trí Kệ Kho (Location / Slotting) */}
          <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-200/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
              <MapPin className="w-4 h-4 text-indigo-600" />
              <span>Vị Trí Kệ Lưu Kho (Slotting)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stockInfo.locations.map((loc, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-white text-indigo-900 font-bold text-sm shadow-2xs border border-indigo-200 flex items-center gap-1.5"
                >
                  📍 {loc}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm transition-all"
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
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all ${
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
